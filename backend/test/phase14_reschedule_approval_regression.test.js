process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { NOTIFICATION_TYPES } from '../controllers/notificationController.js';
import { getDeterministicStatus, format12Hour, parseOperatingHours } from '../controllers/courtController.js';

let server;
let baseUrl;
let customer1Token;
let customer2Token;
let owner1Token;
let owner2Token;

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

function findAvailableSlotWithDate(court, duration = 1, baseDate = '2029-09-01') {
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

  // Log in Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customer1Token = c1Data.token;

  // Sign up Customer 2
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Reschedule Tester 2',
      email: `resched_c2_${Date.now()}@quickcourt.com`,
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner 1 (owner@quickcourt.com - u-102 owns v-1)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Owner 2 (owner2@quickcourt.com - u-104)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Focused Regression: Rescheduling Owner Approval Lifecycle', () => {
  const testCourt = store.courts.find((c) => c.venueId === 'v-1' && c.isActive);
  let bookingId;
  let slot1;
  let slot2;

  it('Step 1: Customer creates and confirms a booking (REQUESTED -> APPROVED -> CONFIRMED/PAID)', async () => {
    slot1 = findAvailableSlotWithDate(testCourt, 1, '2029-09-10');
    assert.ok(slot1, 'Must find initial available slot');

    // 1. Create booking (REQUESTED)
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
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    bookingId = createData.booking.id;
    assert.equal(createData.booking.status, 'REQUESTED');

    // 2. Owner approves (APPROVED)
    const approveRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
    });
    assert.equal(approveRes.status, 200);

    // 3. Customer pays (CONFIRMED + PAID)
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });
    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
  });

  it('Step 2-5: Customer reschedules confirmed booking -> SAME ID, status becomes REQUESTED', async () => {
    slot2 = findAvailableSlot(testCourt, slot1.date, 2, slot1.endH) || findAvailableSlotWithDate(testCourt, 2, '2029-09-12');
    assert.ok(slot2, 'Must find new available 2-hour slot');

    const reschedRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: slot2.date || slot1.date,
        startTime: slot2.startTime,
        endTime: slot2.endTime,
      }),
    });

    assert.equal(reschedRes.status, 200);
    const reschedData = await reschedRes.json();

    // 4. The SAME Booking ID remains
    assert.equal(reschedData.booking.id, bookingId, 'Booking ID must be preserved');
    // 5. Booking status becomes REQUESTED
    assert.equal(reschedData.booking.status, 'REQUESTED', 'Rescheduled booking must return to REQUESTED status');
    assert.equal(reschedData.booking.durationHours, 2);
    assert.equal(reschedData.booking.totalPrice, Number(testCourt.pricePerHour) * 2);
    // Check-in token is not exposed in REQUESTED state
    assert.equal(reschedData.booking.checkInToken, undefined, 'Check-in token must be hidden in REQUESTED state');
  });

  it('Step 6: Owner receives NEW_BOOKING_REQUEST notification for the reschedule', () => {
    const ownerNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-102' && n.bookingId === bookingId && n.type === NOTIFICATION_TYPES.NEW_BOOKING_REQUEST
    );
    assert.ok(ownerNotif, 'Venue owner must receive NEW_BOOKING_REQUEST notification on reschedule');
    assert.ok(ownerNotif.message.includes(bookingId), 'Notification must reference booking ID');
  });

  it('Step 7: Owner pending requests include the rescheduled booking', async () => {
    const dashRes = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    const pendingBooking = dashData.recentBookings.find((b) => b.id === bookingId);
    assert.ok(pendingBooking, 'Rescheduled booking must appear in owner dashboard recent bookings');
    assert.equal(pendingBooking.status, 'REQUESTED', 'Must have status REQUESTED in owner dashboard');
  });

  it('Step 8: Owner can approve the rescheduled booking through existing approval endpoint', async () => {
    const approveRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.booking.status, 'APPROVED');
  });

  it('Step 9: Customer completes payment and booking reaches CONFIRMED state with server-authoritative price', async () => {
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'Card' }),
    });
    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.equal(payData.booking.totalPrice, Number(testCourt.pricePerHour) * 2, 'Authoritative price preserved');
    assert.ok(payData.booking.checkInToken, 'Check-in token available once confirmed');
  });

  it('Step 10: Owner isolation remains strictly intact', async () => {
    // Owner 2 cannot view or approve Owner 1's booking
    const o2DashRes = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    const o2DashData = await o2DashRes.json();
    const leaked = o2DashData.recentBookings.find((b) => b.id === bookingId);
    assert.equal(leaked, undefined, 'Owner 2 must not see Owner 1 booking');

    const o2ApproveRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner2Token}`,
      },
    });
    assert.equal(o2ApproveRes.status, 403, 'Owner 2 must be forbidden from approving Owner 1 booking');
  });

  it('Step 11: Invalid/conflicting reschedule is rejected with 409 Conflict', async () => {
    // Customer 2 books a slot
    const conflictSlot = findAvailableSlotWithDate(testCourt, 1, '2029-09-20');
    assert.ok(conflictSlot);

    const c2BookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: conflictSlot.date,
        startTime: conflictSlot.startTime,
        endTime: conflictSlot.endTime,
      }),
    });
    assert.equal(c2BookRes.status, 201);

    // Customer 1 tries to reschedule into Customer 2's occupied slot
    const conflictReschedRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: conflictSlot.date,
        startTime: conflictSlot.startTime,
        endTime: conflictSlot.endTime,
      }),
    });

    assert.equal(conflictReschedRes.status, 409, 'Must return 409 Conflict for overlapping slot');
    const conflictData = await conflictReschedRes.json();
    assert.ok(conflictData.message.includes('already been booked'));
  });
});
