process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { calculatePlayerTrust } from '../data/store.js';
import { getDeterministicStatus, format12Hour, parseOperatingHours } from '../controllers/courtController.js';

let server;
let baseUrl;
let customer1Token;
let customer2Token;
let ownerToken;

function findAvailableSlot(court, date, duration = 1, startSearch = 6) {
  const { startHour: cStart, endHour: cEnd } = parseOperatingHours(court.operatingHours);
  for (let s = Math.max(cStart, startSearch); s <= cEnd - duration; s++) {
    let allOk = true;
    for (let h = s; h < s + duration; h++) {
      if (getDeterministicStatus(court, date, h) === 'UNAVAILABLE') {
        allOk = false;
        break;
      }
    }
    if (allOk) {
      return { startTime: format12Hour(s), endTime: format12Hour(s + duration), startH: s, endH: s + duration };
    }
  }
  return null;
}

function findAvailableSlotWithDate(court, duration = 1, baseDate = '2029-07-02') {
  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(`${baseDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    const slot = findAvailableSlot(court, dateStr, duration, 6);
    if (slot) {
      return { ...slot, date: dateStr };
    }
  }
  return null;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // 1. Log in Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customer1Token = c1Data.token;

  // 2. Sign up Customer 2 for isolation testing
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Sharma',
      email: `rohan_p14_${Date.now()}@quickcourt.com`,
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // 3. Log in Owner
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

describe('Phase 14: Booking Cancellation Subsystem', () => {
  let testBookingId;
  let paidBookingId;
  let venuePayBookingId;

  const testCourt = store.courts.find((c) => c.id === 'c-1');

  it('1. Customer can create and cancel their booking with valid reason -> 200 OK', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 2, '2029-07-02');
    assert.ok(slot, 'Must find available 2-hour slot');

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    testBookingId = createData.booking.id;

    // Cancel booking with controlled reason & note
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${testBookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        reason: 'Schedule conflict',
        note: 'Have a work meeting at that hour.',
      }),
    });

    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.status, 'ok');
    assert.equal(cancelData.booking.status, 'CANCELLED');
    assert.equal(cancelData.booking.cancellationReason, 'Schedule conflict');
  });

  it('2. Rejects unauthorized cancellation by a different customer -> 403 Forbidden', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 1, '2029-07-03');
    assert.ok(slot);

    // Create booking as Customer 1
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);

    // Customer 2 attempts to cancel
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });

    assert.equal(cancelRes.status, 403);
  });

  it('3. Rejects cancellation of an already cancelled booking -> 400 Bad Request', async () => {
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${testBookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });

    assert.equal(cancelRes.status, 400);
    const data = await cancelRes.json();
    assert.ok(data.message.includes('already been cancelled'));
  });

  it('4. Rejects invalid cancellation reason -> 400 Bad Request', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 1, '2029-07-04');
    assert.ok(slot);

    // Create a new booking
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);

    const cancelRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Invalid Custom Reason Not in Allowed List' }),
    });

    assert.equal(cancelRes.status, 400);
    const data = await cancelRes.json();
    assert.ok(data.message.includes('Invalid cancellation reason'));
  });

  it('5. Paid online booking cancellation transitions to CANCELLED + REFUNDED', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 2, '2029-07-05');
    assert.ok(slot);

    // Create booking
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);
    paidBookingId = booking.id;

    // Owner approves
    await fetch(`${baseUrl}/api/bookings/${paidBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    // Customer pays online via UPI
    await fetch(`${baseUrl}/api/bookings/${paidBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });

    // Customer cancels
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${paidBookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Found another time' }),
    });

    assert.equal(cancelRes.status, 200);
    const { booking: updatedBooking } = await cancelRes.json();
    assert.equal(updatedBooking.status, 'CANCELLED');
    assert.equal(updatedBooking.paymentStatus, 'REFUNDED');
  });

  it('6. Pay at Venue booking cancellation transitions to CANCELLED + PENDING', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 1, '2029-07-06');
    assert.ok(slot);

    // Create booking
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);
    venuePayBookingId = booking.id;

    // Owner approves
    await fetch(`${baseUrl}/api/bookings/${venuePayBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    // Customer confirms with Pay at Venue
    await fetch(`${baseUrl}/api/bookings/${venuePayBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'Pay at Venue' }),
    });

    // Customer cancels
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${venuePayBookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });

    assert.equal(cancelRes.status, 200);
    const { booking: updatedBooking } = await cancelRes.json();
    assert.equal(updatedBooking.status, 'CANCELLED');
    assert.equal(updatedBooking.paymentStatus, 'PENDING');
  });

  it('7. Multi-hour cancellation releases COMPLETE interval back to court availability', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 3, '2029-07-07');
    assert.ok(slot);

    // Create 3-hour booking
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);

    // Verify Customer 2 cannot book an overlapping slot (middle hour)
    const middleStart = format12Hour(slot.startH + 1);
    const middleEnd = format12Hour(slot.startH + 2);
    const conflictRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: middleStart,
        endTime: middleEnd,
      }),
    });
    assert.equal(conflictRes.status, 409);

    // Cancel the 3-hour booking
    await fetch(`${baseUrl}/api/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Venue issue' }),
    });

    // Verify Customer 2 can now book the full released interval
    const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(rebookRes.status, 201);
  });

  it('8. Cancelled booking token / QR pass cannot check in or verify -> 400 Bad Request', async () => {
    assert.ok(paidBookingId);
    // Try to check in the cancelled booking
    const checkInRes = await fetch(`${baseUrl}/api/bookings/${paidBookingId}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(checkInRes.status, 400);
    const data = await checkInRes.json();
    assert.ok(data.message.includes('cancelled'));
  });

  it('9. Rejects cancellation of CHECKED_IN or COMPLETED bookings -> 400 Bad Request', async () => {
    const b = store.bookings.find((b) => b.id === 'BK-80066572');
    assert.ok(b);
    b.status = 'CHECKED_IN';

    const cancelRes = await fetch(`${baseUrl}/api/bookings/BK-80066572/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });

    assert.equal(cancelRes.status, 400);
    const data = await cancelRes.json();
    assert.ok(data.message.includes('Cannot cancel'));

    // Reset status
    b.status = 'CONFIRMED';
  });
});

describe('Phase 14: Booking Rescheduling Subsystem', () => {
  let reschedBookingId;
  const testCourt = store.courts.find((c) => c.id === 'c-1');

  it('1. Reschedules 1-hour booking to a new valid date/time -> 200 OK with same ID & recalculated price', async () => {
    const slot1 = findAvailableSlotWithDate(testCourt, 1, '2029-07-08');
    assert.ok(slot1);

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot1.date,
        startTime: slot1.startTime,
        endTime: slot1.endTime,
      }),
    });
    const { booking } = await createRes.json();
    assert.ok(booking);
    reschedBookingId = booking.id;
    assert.equal(booking.totalPrice, 400);

    const slot2 = findAvailableSlot(testCourt, slot1.date, 1, slot1.endH) || findAvailableSlotWithDate(testCourt, 1, '2029-07-09');
    assert.ok(slot2);

    // Reschedule to slot2
    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        date: slot2.date || slot1.date,
        startTime: slot2.startTime,
        endTime: slot2.endTime,
      }),
    });

    assert.equal(reschedRes.status, 200);
    const reschedData = await reschedRes.json();
    assert.equal(reschedData.booking.id, reschedBookingId, 'Must preserve Booking ID');
    assert.equal(reschedData.booking.startTime, slot2.startTime);
    assert.equal(reschedData.booking.endTime, slot2.endTime);
    assert.equal(reschedData.booking.totalPrice, 400);
  });

  it('2. Reschedules 1-hour booking to continuous 3-hour booking -> 200 OK with 3x rate', async () => {
    const slot3 = findAvailableSlotWithDate(testCourt, 3, '2029-07-10');
    assert.ok(slot3);

    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        date: slot3.date,
        startTime: slot3.startTime,
        endTime: slot3.endTime,
      }),
    });

    assert.equal(reschedRes.status, 200);
    const reschedData = await reschedRes.json();
    assert.equal(reschedData.booking.id, reschedBookingId);
    assert.equal(reschedData.booking.durationHours, 3);
    assert.equal(reschedData.booking.totalPrice, 1200, '400 * 3 = 1200');
  });

  it('3. Rescheduling excludes the booking from its own conflict check', async () => {
    const b = store.bookings.find((bk) => bk.id === reschedBookingId);

    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
      }),
    });

    assert.equal(reschedRes.status, 200);
    const reschedData = await reschedRes.json();
    assert.equal(reschedData.booking.id, reschedBookingId);
  });

  it('4. Rejects rescheduling to an active conflicting slot occupied by another customer -> 409 Conflict', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 2, '2029-07-15');
    assert.ok(slot);

    // Customer 2 books this 2-hour slot
    await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });

    // Customer 1 tries to reschedule into the same slot
    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });

    assert.equal(reschedRes.status, 409);
    const data = await reschedRes.json();
    assert.ok(data.message.includes('already been booked'));
  });

  it('5. Allows back-to-back rescheduling directly adjacent to existing booking', async () => {
    const slot = findAvailableSlotWithDate(testCourt, 2, '2029-07-18');
    assert.ok(slot);

    // Customer 2 books first slot
    await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });

    // Customer 1 reschedules to adjacent slot starting immediately at slot.endTime
    const adjSlot = findAvailableSlot(testCourt, slot.date, 1, slot.endH);
    if (adjSlot && adjSlot.startH === slot.endH) {
      const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer1Token}`,
        },
        body: JSON.stringify({
          date: slot.date,
          startTime: adjSlot.startTime,
          endTime: adjSlot.endTime,
        }),
      });

      assert.equal(reschedRes.status, 200);
      const reschedData = await reschedRes.json();
      assert.equal(reschedData.booking.startTime, adjSlot.startTime);
    }
  });

  it('6. Rejects rescheduling outside operating hours -> 400 Bad Request', async () => {
    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        date: '2029-07-20',
        startTime: '11:00 PM',
        endTime: '12:00 AM',
      }),
    });

    assert.equal(reschedRes.status, 400);
    const data = await reschedRes.json();
    assert.ok(data.message.includes('outside operating hours') || data.message.includes('End time must be after start time'));
  });

  it('7. Rejects unauthorized rescheduling of another customer booking -> 403 Forbidden', async () => {
    const reschedRes = await fetch(`${baseUrl}/api/bookings/${reschedBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        date: '2029-07-25',
        startTime: '08:00 AM',
        endTime: '09:00 AM',
      }),
    });

    assert.equal(reschedRes.status, 403);
  });
});

describe('Phase 14: No-Show Protection & Player Trust Classification', () => {
  it('1. Confirmed future booking is not classified as no-show', () => {
    const player = { id: 'p-test-1', userId: 'u-ns-1', createdAt: '2026-01-01' };
    store.bookings.push({
      id: 'BK-NS-FUTURE',
      userId: 'u-ns-1',
      courtId: 'c-1',
      date: '2026-12-30',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });

    const trust = calculatePlayerTrust(player);
    assert.equal(trust.noShows, 0);

    // Clean up
    store.bookings = store.bookings.filter((b) => b.id !== 'BK-NS-FUTURE');
  });

  it('2. Confirmed past booking without check-in is deterministically counted as no-show', () => {
    const player = { id: 'p-test-2', userId: 'u-ns-2', createdAt: '2026-01-01' };
    store.bookings.push({
      id: 'BK-NS-PAST',
      userId: 'u-ns-2',
      courtId: 'c-1',
      date: '2026-01-10',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      checkedInAt: null,
    });

    const trust = calculatePlayerTrust(player);
    assert.equal(trust.noShows, 1);

    // Clean up
    store.bookings = store.bookings.filter((b) => b.id !== 'BK-NS-PAST');
  });

  it('3. Checked-in past booking is NOT counted as no-show', () => {
    const player = { id: 'p-test-3', userId: 'u-ns-3', createdAt: '2026-01-01' };
    store.bookings.push({
      id: 'BK-NS-CHECKEDIN',
      userId: 'u-ns-3',
      courtId: 'c-1',
      date: '2026-01-10',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      status: 'CHECKED_IN',
      paymentStatus: 'PAID',
      checkedInAt: '2026-01-10T08:05:00Z',
    });

    const trust = calculatePlayerTrust(player);
    assert.equal(trust.noShows, 0);
    assert.equal(trust.checkIns, 1);

    // Clean up
    store.bookings = store.bookings.filter((b) => b.id !== 'BK-NS-CHECKEDIN');
  });

  it('4. Normal cancelled booking is NOT counted as no-show', () => {
    const player = { id: 'p-test-4', userId: 'u-ns-4', createdAt: '2026-01-01' };
    store.bookings.push({
      id: 'BK-NS-CANCELLED',
      userId: 'u-ns-4',
      courtId: 'c-1',
      date: '2026-01-10',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      cancellationReason: 'Plans changed',
    });

    const trust = calculatePlayerTrust(player);
    assert.equal(trust.noShows, 0);
    assert.equal(trust.cancellations, 1);

    // Clean up
    store.bookings = store.bookings.filter((b) => b.id !== 'BK-NS-CANCELLED');
  });

  it('5. Pending requested or rejected booking is NOT counted as no-show', () => {
    const player = { id: 'p-test-5', userId: 'u-ns-5', createdAt: '2026-01-01' };
    store.bookings.push(
      {
        id: 'BK-NS-REQ',
        userId: 'u-ns-5',
        courtId: 'c-1',
        date: '2026-01-10',
        startTime: '08:00 AM',
        endTime: '09:00 AM',
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
      },
      {
        id: 'BK-NS-REJ',
        userId: 'u-ns-5',
        courtId: 'c-1',
        date: '2026-01-10',
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        status: 'REJECTED',
        paymentStatus: 'PENDING',
      }
    );

    const trust = calculatePlayerTrust(player);
    assert.equal(trust.noShows, 0);

    // Clean up
    store.bookings = store.bookings.filter((b) => b.id !== 'BK-NS-REQ' && b.id !== 'BK-NS-REJ');
  });
});
