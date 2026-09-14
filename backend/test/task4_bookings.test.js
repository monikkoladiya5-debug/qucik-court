process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let ownerToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customerToken = c1Data.token;

  // Sign up Customer 2 for IDOR cross-customer tests
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Customer',
      email: 'customer2@example.com',
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner (owner@quickcourt.com - u-201)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Task 4: Booking Authentication & Role Authorization', () => {
  it('Unauthenticated POST /api/bookings -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId: 'c-1', date: '2026-10-15', startTime: '10:00 AM', endTime: '11:00 AM' }),
    });
    assert.equal(res.status, 401);
  });

  it('Unauthenticated GET /api/bookings/my -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/my`);
    assert.equal(res.status, 401);
  });

  it('Unauthenticated GET /api/bookings/:id -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/BK-80066572`);
    assert.equal(res.status, 401);
  });

  it('Owner role POST /api/bookings -> 403 Forbidden (Only CUSTOMER role can book)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ courtId: 'c-1', date: '2026-10-15', startTime: '10:00 AM', endTime: '11:00 AM' }),
    });
    assert.equal(res.status, 403);
  });

  it('Owner role GET /api/bookings/:id -> 403 Forbidden (Only CUSTOMER role can access booking lookup)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/BK-80066572`, {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.equal(res.status, 403);
  });
});

describe('Task 4: Booking Input & Business Rule Validation', () => {
  it('Rejects non-existent court -> 404', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-nonexistent-999',
        date: '2026-10-15',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 404);
  });

  it('Rejects inactive court -> 400', async () => {
    // Temporarily set c-1 inactive
    const court = store.courts.find((c) => c.id === 'c-1');
    court.isActive = false;

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-15',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);

    // Restore
    court.isActive = true;
  });

  it('Rejects malformed date -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: 'invalid-date',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Rejects past date -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2020-01-01',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Rejects past time slot on current date -> 400', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const currentHour = new Date().getHours();
    if (currentHour > 0) {
      const pastHour = Math.max(0, currentHour - 1);
      const period = pastHour >= 12 && pastHour < 24 ? 'PM' : 'AM';
      let h1 = pastHour % 12;
      if (h1 === 0) h1 = 12;
      const startTime = `${String(h1).padStart(2, '0')}:00 ${period}`;
      const nextH = (pastHour + 1) % 24;
      const nextPeriod = nextH >= 12 && nextH < 24 ? 'PM' : 'AM';
      let h2 = nextH % 12;
      if (h2 === 0) h2 = 12;
      const endTime = `${String(h2).padStart(2, '0')}:00 ${nextPeriod}`;

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: today,
          startTime,
          endTime,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /already passed|facility schedule/i);
    }
  });

  it('Rejects invalid time duration (not 1 hour) -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-15',
        startTime: '10:00 AM',
        endTime: '12:00 PM', // 2 hours
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Rejects slot outside operating hours -> 400', async () => {
    // c-1 hours: 06:00 AM - 11:00 PM
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-15',
        startTime: '03:00 AM',
        endTime: '04:00 AM',
      }),
    });
    assert.equal(res.status, 400);
  });
});

describe('Task 4: Price & Property Protection', () => {
  it('Server ignores client-supplied price and calculates authoritative court price', async () => {
    // Find an available slot for c-1 on 2026-11-20
    const court = store.courts.find((c) => c.id === 'c-1');
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-11-20`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE');
    assert.ok(freeSlot, 'Expected at least one free slot');

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-11-20',
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
        // Tampered parameters
        pricePerHour: 1,
        totalPrice: 1,
        id: 'BK-HACKED',
        userId: 'u-hacked',
        status: 'COMPLETED',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    // Authoritative court price must be applied
    assert.equal(data.booking.pricePerHour, court.pricePerHour);
    assert.equal(data.booking.totalPrice, court.pricePerHour);
    assert.notEqual(data.booking.id, 'BK-HACKED');
    assert.equal(data.booking.status, 'REQUESTED');
    assert.equal(data.booking.paymentStatus, 'PENDING');
    assert.notEqual(data.booking.userId, 'u-hacked');
  });
});

describe('Task 4: Server-Side Conflict Detection & Availability Integration', () => {
  const testDate = '2026-11-25';
  let targetSlot;

  it('First valid booking succeeds', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-2/availability?date=${testDate}`);
    const availData = await availRes.json();
    targetSlot = availData.slots.find((s) => s.status === 'AVAILABLE');
    assert.ok(targetSlot);

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-2',
        date: testDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.booking.status, 'REQUESTED');
    assert.equal(data.booking.paymentStatus, 'PENDING');
  });

  it('Second overlapping booking on same court/date/time fails with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: 'c-2',
        date: testDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 'error');
    assert.match(data.message, /already been booked/i);
  });

  it('Availability endpoint reflects the newly booked slot as UNAVAILABLE', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-2/availability?date=${testDate}`);
    const availData = await availRes.json();
    const bookedSlot = availData.slots.find((s) => s.startTime === targetSlot.startTime);
    assert.ok(bookedSlot);
    assert.equal(bookedSlot.status, 'UNAVAILABLE');
  });
});

describe('Task 4: Ownership & Cross-Customer Protection (IDOR)', () => {
  let customer1BookingId;

  before(async () => {
    // Create a booking for Customer 1
    const court = store.courts.find((c) => c.id === 'c-3');
    const availRes = await fetch(`${baseUrl}/api/courts/c-3/availability?date=2026-11-28`);
    const availData = await availRes.json();
    const slot = availData.slots.find((s) => s.status === 'AVAILABLE');

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-3',
        date: '2026-11-28',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const data = await res.json();
    customer1BookingId = data.booking.id;
  });

  it('Customer 1 can view own booking detail -> 200 (no sensitive fields exposed)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.id, customer1BookingId);
    assert.equal(data.booking.userId, 'u-101');
    assert.equal(data.booking.passwordHash, undefined);
    assert.equal(data.booking.paymentMethod, undefined);
    assert.ok(data.booking.venueName);
    assert.ok(data.booking.courtName);
  });

  it('Customer 2 cannot view Customer 1 private booking -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer 2 cannot cancel Customer 1 booking -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer 1 can view own booking list from /api/bookings/my', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.count > 0);
    const hasBooking = data.bookings.some((b) => b.id === customer1BookingId);
    assert.ok(hasBooking);
  });

  it('Customer 1 can cancel own booking -> 200 OK and status is CANCELLED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.status, 'CANCELLED');
  });

  it('Cancelling an already cancelled booking -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 400);
  });
});
