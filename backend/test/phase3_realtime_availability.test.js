process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../config/bookingStates.js';

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

  // Customer 1
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customerToken = c1Data.token;

  // Customer 2
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'P3 Customer Two',
      email: 'p3_cust2@example.com',
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Owner 1
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  ownerToken = o1Data.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 3: Real-Time Court & Slot Availability Source of Truth', () => {
  const targetDate = '2026-12-20';
  let targetSlot;
  let nextSlot;
  let activeBookingId;

  it('Fetches backend availability for a court and date', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${targetDate}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.courtId, 'c-1');
    assert.equal(data.date, targetDate);
    assert.ok(Array.isArray(data.slots));

    // Find two contiguous slots
    const availableSlots = data.slots.filter((s) => s.status === 'AVAILABLE');
    assert.ok(availableSlots.length >= 2, 'Expected at least 2 available slots');
    targetSlot = availableSlots[0];
    
    // Find next consecutive slot if exists
    const targetIdx = data.slots.findIndex((s) => s.startTime === targetSlot.startTime);
    if (targetIdx < data.slots.length - 1) {
      nextSlot = data.slots[targetIdx + 1];
    }
  });

  it('Active booking in REQUESTED status immediately marks slot as UNAVAILABLE in real-time', async () => {
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: targetDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookData = await bookRes.json();
    activeBookingId = bookData.booking.id;

    // Immediately fetch availability again
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${targetDate}`);
    const availData = await availRes.json();
    const updatedSlot = availData.slots.find((s) => s.startTime === targetSlot.startTime);
    assert.ok(updatedSlot);
    assert.equal(updatedSlot.status, 'UNAVAILABLE');
  });

  it('Back-to-back adjacent slot remains AVAILABLE and can be booked', async () => {
    if (nextSlot && nextSlot.status === 'AVAILABLE') {
      const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${targetDate}`);
      const availData = await availRes.json();
      const updatedNext = availData.slots.find((s) => s.startTime === nextSlot.startTime);
      assert.ok(updatedNext);
      assert.equal(updatedNext.status, 'AVAILABLE');

      // Customer 2 books the adjacent next slot (back-to-back)
      const bookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: targetDate,
          startTime: nextSlot.startTime,
          endTime: nextSlot.endTime,
        }),
      });
      assert.equal(bookRes.status, 201);
    }
  });

  it('Different court on same venue & date remains independently available', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-2/availability?date=${targetDate}`);
    assert.equal(availRes.status, 200);
    const availData = await availRes.json();
    assert.equal(availData.courtId, 'c-2');
    assert.ok(Array.isArray(availData.slots));
  });

  it('Different date on same court remains independently available', async () => {
    const diffDate = '2026-12-21';
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${diffDate}`);
    assert.equal(availRes.status, 200);
    const availData = await availRes.json();
    assert.equal(availData.date, diffDate);
  });

  it('Attempting to book an already active slot fails with 409 Conflict (Backend authority)', async () => {
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: targetDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      }),
    });
    assert.equal(bookRes.status, 409);
    const bookData = await bookRes.json();
    assert.equal(bookData.status, 'error');
    assert.match(bookData.message, /already been booked/i);
  });

  it('Terminal state (CANCELLED) immediately releases slot back to AVAILABLE', async () => {
    // Cancel the active booking
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${activeBookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(cancelRes.status, 200);

    // Fetch availability again
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${targetDate}`);
    const availData = await availRes.json();
    const releasedSlot = availData.slots.find((s) => s.startTime === targetSlot.startTime);
    assert.ok(releasedSlot);
    assert.equal(releasedSlot.status, 'AVAILABLE');

    // Customer 2 can now successfully book the released slot
    const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: targetDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      }),
    });
    assert.equal(rebookRes.status, 201);
  });

  it('Inactive court returns UNAVAILABLE slots and rejects booking attempts with 400', async () => {
    const court = store.courts.find((c) => c.id === 'c-3');
    court.isActive = false;

    // Check availability
    const availRes = await fetch(`${baseUrl}/api/courts/c-3/availability?date=2026-12-25`);
    const availData = await availRes.json();
    const allUnavailable = availData.slots.every((s) => s.status === 'UNAVAILABLE');
    assert.ok(allUnavailable, 'All slots on inactive court must be UNAVAILABLE');

    // Booking attempt fails
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-3',
        date: '2026-12-25',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(bookRes.status, 400);
    const bookData = await bookRes.json();
    assert.match(bookData.message, /inactive/i);

    // Restore court
    court.isActive = true;
  });
});
