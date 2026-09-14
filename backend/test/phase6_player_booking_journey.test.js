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

describe('Phase 6: Complete Player Booking Journey Tests', () => {
const customerUser = store.users.find((u) => u.id === 'u-101');
const otherCustomer = { id: 'u-other-cust', email: 'other@qc.com', role: 'CUSTOMER', status: 'active' };
if (!store.users.some((u) => u.id === 'u-other-cust')) {
  store.users.push(otherCustomer);
}
const ownerUser = store.users.find((u) => u.id === 'u-102'); // Owner of v-1, v-3, v-4

const customerToken = makeToken(customerUser);
const otherCustomerToken = makeToken(otherCustomer);
const ownerToken = makeToken(ownerUser);

let createdBookingId;
const testDate = '2028-10-15'; // Far future date to prevent collision with today's slots

  it('Step 1: Player submits booking request -> creates booking in REQUESTED state with PENDING payment', async () => {
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
        endTime: '11:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.booking?.id);
    assert.equal(data.booking.status, BOOKING_STATUS.REQUESTED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);
    assert.equal(data.booking.pricePerHour, 400);
    assert.equal(data.booking.totalPrice, 400);

    createdBookingId = data.booking.id;
  });

  it('Step 2: 409 Conflict: Another player trying to request the exact same slot is blocked', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 'error');
    assert.ok(data.message.includes('already been booked'));
  });

  it('Step 3: Ownership check: Other customer cannot view or cancel this booking (403)', async () => {
    const viewRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
      headers: { Authorization: `Bearer ${otherCustomerToken}` },
    });
    assert.equal(viewRes.status, 403);

    const cancelRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherCustomerToken}` },
    });
    assert.equal(cancelRes.status, 403);
  });

  it('Step 4: Owner reviews and approves booking -> transitions to APPROVED state', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, BOOKING_STATUS.APPROVED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);
  });

  it('Step 5A: Online Payment (UPI) confirms booking and marks payment as PAID', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, BOOKING_STATUS.CONFIRMED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PAID);
    assert.equal(data.booking.paymentMethod, 'UPI');
  });

  it('Step 5B: Cancellation of a PAID booking updates status to CANCELLED and paymentStatus to REFUNDED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, BOOKING_STATUS.CANCELLED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.REFUNDED);
  });

  it('Step 6: "Pay at Venue" flow sets booking to CONFIRMED while keeping paymentStatus as PENDING', async () => {
    // Fetch available slots for c-1
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
    const availData = await availRes.json();
    const availableSlot = availData.slots.find((s) => s.status === 'AVAILABLE');
    assert.ok(availableSlot, 'Must find an available slot on test date');

    // Create new request
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: availableSlot.startTime,
        endTime: availableSlot.endTime,
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const venueBookingId = createData.booking.id;

    // Approve
    const approveRes = await fetch(`${baseUrl}/api/bookings/${venueBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(approveRes.status, 200);

    // Pay with Pay at Venue
    const payRes = await fetch(`${baseUrl}/api/bookings/${venueBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'Pay at Venue' }),
    });

    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.equal(payData.status, 'ok');
    assert.equal(payData.booking.status, BOOKING_STATUS.CONFIRMED);
    assert.equal(payData.booking.paymentStatus, PAYMENT_STATUS.PENDING);
    assert.equal(payData.booking.paymentMethod, 'Pay at Venue');
  });

  it('Step 7: Owner Rejection flow transitions REQUESTED -> REJECTED', async () => {
    // Fetch available slots for c-1
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
    const availData = await availRes.json();
    const availableSlot = availData.slots.find((s) => s.status === 'AVAILABLE');
    assert.ok(availableSlot, 'Must find an available slot on test date');

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: availableSlot.startTime,
        endTime: availableSlot.endTime,
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    const rejBookingId = createData.booking.id;

    // Reject
    const rejRes = await fetch(`${baseUrl}/api/bookings/${rejBookingId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(rejRes.status, 200);
    const rejData = await rejRes.json();
    assert.equal(rejData.status, 'ok');
    assert.equal(rejData.booking.status, BOOKING_STATUS.REJECTED);
  });
});
