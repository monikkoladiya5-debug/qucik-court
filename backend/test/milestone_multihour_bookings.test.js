process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../config/bookingStates.js';

let server;
let baseUrl;

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    AUTH_CONFIG.jwtSecret,
    { expiresIn: '1h' }
  );
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Milestone Correction: Multi-Hour Consecutive Court Bookings', () => {
  const customerUser = store.users.find((u) => u.id === 'u-101');
  const otherCustomer = { id: 'u-cust-multi', email: 'multi@qc.com', role: 'CUSTOMER', status: 'active' };
  if (!store.users.some((u) => u.id === 'u-cust-multi')) {
    store.users.push(otherCustomer);
  }
  const customerToken = makeToken(customerUser);
  const otherCustomerToken = makeToken(otherCustomer);

  const testCourt = store.courts.find((c) => c.id === 'c-1');
  const pricePerHour = Number(testCourt.pricePerHour);
  // On 2029-07-02, court c-1 schedule has hours 6 through 13 available (06:00 AM - 02:00 PM)
  const testDate = '2029-07-02';

  it('1. 1-hour single booking still works properly', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '06:00 AM',
        endTime: '07:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.startTime, '06:00 AM');
    assert.equal(data.booking.endTime, '07:00 AM');
    assert.equal(data.booking.totalPrice, pricePerHour * 1);
    assert.equal(data.booking.status, BOOKING_STATUS.REQUESTED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);
  });

  it('2. 2-hour consecutive booking creates exactly ONE booking record with duration x hourly rate', async () => {
    const initialBookingCount = store.bookings.length;

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '07:00 AM',
        endTime: '09:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.startTime, '07:00 AM');
    assert.equal(data.booking.endTime, '09:00 AM');
    assert.equal(data.booking.pricePerHour, pricePerHour);
    assert.equal(data.booking.totalPrice, pricePerHour * 2);
    assert.equal(data.booking.status, BOOKING_STATUS.REQUESTED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);

    // Verify exactly ONE booking was appended to store
    assert.equal(store.bookings.length, initialBookingCount + 1);
  });

  it('3. 3-hour consecutive booking works and calculates 3x hourly rate', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.startTime, '09:00 AM');
    assert.equal(data.booking.endTime, '12:00 PM');
    assert.equal(data.booking.totalPrice, pricePerHour * 3);
  });

  it('4. Availability endpoint reflects all hours of a multi-hour booking as UNAVAILABLE', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
    assert.equal(res.status, 200);
    const data = await res.json();

    // 1-hour booking at 06:00 AM - 07:00 AM
    const slot6am = data.slots.find((s) => s.startTime === '06:00 AM');
    assert.equal(slot6am.status, 'UNAVAILABLE');

    // 2-hour booking at 07:00 AM - 09:00 AM (07:00 - 09:00)
    const slot7am = data.slots.find((s) => s.startTime === '07:00 AM');
    const slot8am = data.slots.find((s) => s.startTime === '08:00 AM');
    assert.equal(slot7am.status, 'UNAVAILABLE');
    assert.equal(slot8am.status, 'UNAVAILABLE');

    // 3-hour booking at 09:00 AM - 12:00 PM (09:00 - 12:00)
    const slot9am = data.slots.find((s) => s.startTime === '09:00 AM');
    const slot10am = data.slots.find((s) => s.startTime === '10:00 AM');
    const slot11am = data.slots.find((s) => s.startTime === '11:00 AM');
    assert.equal(slot9am.status, 'UNAVAILABLE');
    assert.equal(slot10am.status, 'UNAVAILABLE');
    assert.equal(slot11am.status, 'UNAVAILABLE');

    // 12:00 PM slot was not booked and is still AVAILABLE
    const slot12pm = data.slots.find((s) => s.startTime === '12:00 PM');
    assert.equal(slot12pm.status, 'AVAILABLE');
  });

  it('5. Partially overlapping multi-hour booking is rejected with 409 Conflict', async () => {
    // 07:00 AM - 09:00 AM is already booked. Requesting 08:00 AM - 10:00 AM overlaps at 8-9 AM.
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '08:00 AM',
        endTime: '10:00 AM',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('6. Existing middle-hour booking blocks a larger requested interval with 409 Conflict', async () => {
    // 07:00 AM - 09:00 AM is booked. Requesting 06:00 AM - 10:00 AM encapsulates the booking.
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '06:00 AM',
        endTime: '10:00 AM',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('7. Exact back-to-back multi-hour bookings are allowed without conflict', async () => {
    // 09:00 AM - 12:00 PM is booked. Booking 12:00 PM - 02:00 PM directly after it succeeds.
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '12:00 PM',
        endTime: '02:00 PM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.booking.startTime, '12:00 PM');
    assert.equal(data.booking.endTime, '02:00 PM');
    assert.equal(data.booking.totalPrice, pricePerHour * 2);
  });

  it('8. Different court remains available for same date and time range', async () => {
    // c-1 is booked 09:00 AM - 12:00 PM. c-2 should be bookable for 09:00 AM - 11:00 AM on the same date.
    const court2 = store.courts.find((c) => c.id === 'c-2');
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-2',
        date: testDate,
        startTime: '09:00 AM',
        endTime: '11:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.booking.courtId, 'c-2');
    assert.equal(data.booking.startTime, '09:00 AM');
    assert.equal(data.booking.endTime, '11:00 AM');
    assert.equal(data.booking.totalPrice, Number(court2.pricePerHour) * 2);
  });

  it('9. Different date remains available for same court and time range', async () => {
    const nextDate = '2029-07-06'; // hours 6..13 are also available on 2029-07-06
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: nextDate,
        startTime: '07:00 AM',
        endTime: '09:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.booking.date, nextDate);
    assert.equal(data.booking.startTime, '07:00 AM');
    assert.equal(data.booking.endTime, '09:00 AM');
  });

  it('10. Invalid intervals (end time before start time or equal) are rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '10:00 AM',
        endTime: '09:00 AM',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });
});
