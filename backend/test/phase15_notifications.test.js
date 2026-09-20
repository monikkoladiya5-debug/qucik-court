process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import {
  NOTIFICATION_TYPES,
  createNotification,
  safeNotification,
  syncNoShowNotifications,
} from '../controllers/notificationController.js';
import { getDeterministicStatus, format12Hour, parseOperatingHours } from '../controllers/courtController.js';

let server;
let baseUrl;
let customer1Token;
let customer2Token;
let customer2UserId;
let ownerToken;
let otherOwnerToken;

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

function findAvailableSlotWithDate(court, duration = 1, baseDate = '2029-08-01') {
  for (let offset = 0; offset < 40; offset++) {
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

  // Sign up Customer 2 for isolation testing
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'P15 Test Customer',
      email: `customer_p15_${Date.now()}@quickcourt.com`,
      password: 'customer123',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;
  customer2UserId = c2Data.user.id;

  // Log in Venue 1 Owner (owner@quickcourt.com - u-102)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;

  // Log in Second Owner (owner2@quickcourt.com - u-104)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  otherOwnerToken = o2Data.token;
});

after(() => {
  if (server) server.close();
});

// ==============================================================================
// SECTION 1: NOTIFICATION DATA MODEL & SANITIZATION
// ==============================================================================
describe('Phase 15: Notification Data Model & Sanitization', () => {
  it('1. Correctly creates notification with required fields and defaults', () => {
    const notif = createNotification({
      recipientUserId: 'u-101',
      type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
      title: 'Booking Request Submitted',
      message: 'Your booking request is received.',
      bookingId: 'BK-TEST-1',
      venueId: 'v-1',
    });

    assert.ok(notif);
    assert.ok(notif.id.startsWith('notif-'));
    assert.equal(notif.recipientUserId, 'u-101');
    assert.equal(notif.type, 'BOOKING_REQUESTED');
    assert.equal(notif.title, 'Booking Request Submitted');
    assert.equal(notif.message, 'Your booking request is received.');
    assert.equal(notif.bookingId, 'BK-TEST-1');
    assert.equal(notif.venueId, 'v-1');
    assert.equal(notif.readAt, null);
    assert.ok(notif.createdAt);
  });

  it('2. safeNotification sanitizes internal secrets and formats isRead flag', () => {
    const raw = {
      id: 'notif-123',
      recipientUserId: 'u-101',
      type: 'BOOKING_CONFIRMED',
      title: 'Confirmed',
      message: 'Your slot is ready',
      bookingId: 'BK-123',
      venueId: 'v-1',
      readAt: null,
      createdAt: new Date().toISOString(),
      passwordHash: 'secret123',
      jwtSecret: 'supersecret',
    };

    const safe = safeNotification(raw);
    assert.equal(safe.id, 'notif-123');
    assert.equal(safe.recipientUserId, 'u-101');
    assert.equal(safe.type, 'BOOKING_CONFIRMED');
    assert.equal(safe.isRead, false);
    assert.equal(safe.passwordHash, undefined);
    assert.equal(safe.jwtSecret, undefined);
  });

  it('3. Duplicate creation protection prevents duplicate alerts for same booking event', () => {
    const n1 = createNotification({
      recipientUserId: 'u-dup-test',
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message: 'Your booking is confirmed.',
      bookingId: 'BK-DUP-1',
      venueId: 'v-1',
    });

    const n2 = createNotification({
      recipientUserId: 'u-dup-test',
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message: 'Your booking is confirmed.',
      bookingId: 'BK-DUP-1',
      venueId: 'v-1',
    });

    assert.equal(n1.id, n2.id);
  });
});

// ==============================================================================
// SECTION 2: BOOKING LIFECYCLE EVENT GENERATION
// ==============================================================================
describe('Phase 15: Booking Lifecycle Event Generation', () => {
  let activeCourt;
  let testBookingId;

  before(() => {
    activeCourt = store.courts.find((c) => c.venueId === 'v-1' && c.isActive);
    assert.ok(activeCourt, 'Must have an active court in v-1');
  });

  it('1. Booking request creation triggers Customer BOOKING_REQUESTED and Owner NEW_BOOKING_REQUEST', async () => {
    const slot = findAvailableSlotWithDate(activeCourt, 1, '2029-08-05');
    assert.ok(slot);

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: activeCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    testBookingId = data.booking.id;

    // Verify Customer notification
    const customerNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.BOOKING_REQUESTED
    );
    assert.ok(customerNotif, 'Customer must receive BOOKING_REQUESTED');
    assert.ok(customerNotif.title.includes('Request'));

    // Verify Owner notification (u-102 is owner of v-1)
    const ownerNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-102' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.NEW_BOOKING_REQUEST
    );
    assert.ok(ownerNotif, 'Venue Owner must receive NEW_BOOKING_REQUEST');
  });

  it('2. Owner approval triggers Customer BOOKING_APPROVED and PAYMENT_REQUIRED notifications', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);

    const approvedNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.BOOKING_APPROVED
    );
    assert.ok(approvedNotif, 'Customer must receive BOOKING_APPROVED');

    const payReqNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.PAYMENT_REQUIRED
    );
    assert.ok(payReqNotif, 'Customer must receive PAYMENT_REQUIRED');
  });

  it('3. Simulated payment failure does NOT generate payment success or confirmation notifications', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'Card',
        simulateFailure: true,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);

    const falseSuccess = store.notifications.find(
      (n) => n.bookingId === testBookingId && (n.type === NOTIFICATION_TYPES.PAYMENT_SUCCESS || n.type === NOTIFICATION_TYPES.BOOKING_CONFIRMED)
    );
    assert.equal(falseSuccess, undefined, 'Must not generate success notifications on failed payment');
  });

  it('4. Online payment success triggers Customer PAYMENT_SUCCESS, BOOKING_CONFIRMED, and Owner PAYMENT_RECEIVED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);

    const custPayNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.PAYMENT_SUCCESS
    );
    assert.ok(custPayNotif, 'Customer must receive PAYMENT_SUCCESS');

    const custConfirmNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.BOOKING_CONFIRMED
    );
    assert.ok(custConfirmNotif, 'Customer must receive BOOKING_CONFIRMED');

    const ownerPayNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-102' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.PAYMENT_RECEIVED
    );
    assert.ok(ownerPayNotif, 'Owner must receive PAYMENT_RECEIVED');
  });

  it('5. Reschedule triggers Customer BOOKING_RESCHEDULED and Owner NEW_BOOKING_REQUEST', async () => {
    const newSlot = findAvailableSlotWithDate(activeCourt, 1, '2029-08-10');
    assert.ok(newSlot);

    const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: activeCourt.id,
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);

    const custResched = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.BOOKING_RESCHEDULED
    );
    assert.ok(custResched, 'Customer must receive BOOKING_RESCHEDULED');
    assert.ok(custResched.message.includes(newSlot.date));

    const ownerResched = store.notifications.find(
      (n) => n.recipientUserId === 'u-102' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.NEW_BOOKING_REQUEST
    );
    assert.ok(ownerResched, 'Owner must receive NEW_BOOKING_REQUEST');
  });

  it('6. Check-in triggers Customer CHECK_IN_COMPLETED notification', async () => {
    // Owner approves the rescheduled booking
    await fetch(`${baseUrl}/api/bookings/${testBookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    // Customer confirms payment
    await fetch(`${baseUrl}/api/bookings/${testBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
      }),
    });

    const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);

    const checkInNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === testBookingId && n.type === NOTIFICATION_TYPES.CHECK_IN_COMPLETED
    );
    assert.ok(checkInNotif, 'Customer must receive CHECK_IN_COMPLETED');
  });

  it('7. Owner rejection triggers Customer BOOKING_REJECTED notification', async () => {
    const slot = findAvailableSlotWithDate(activeCourt, 1, '2029-08-15');
    assert.ok(slot);

    // Create a new booking request
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: activeCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const createData = await createRes.json();
    const rejectBookingId = createData.booking.id;

    // Reject it
    const rejRes = await fetch(`${baseUrl}/api/bookings/${rejectBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });
    assert.equal(rejRes.status, 200);

    const rejNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === rejectBookingId && n.type === NOTIFICATION_TYPES.BOOKING_REJECTED
    );
    assert.ok(rejNotif, 'Customer must receive BOOKING_REJECTED');
  });

  it('8. Customer cancellation triggers Customer BOOKING_CANCELLED and Owner CUSTOMER_CANCELLED', async () => {
    const slot = findAvailableSlotWithDate(activeCourt, 1, '2029-08-20');
    assert.ok(slot);

    // Create booking
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: activeCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const bId = (await createRes.json()).booking.id;

    // Cancel booking
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });
    assert.equal(cancelRes.status, 200);

    const custCancel = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === bId && n.type === NOTIFICATION_TYPES.BOOKING_CANCELLED
    );
    assert.ok(custCancel, 'Customer must receive BOOKING_CANCELLED');

    const ownerCancel = store.notifications.find(
      (n) => n.recipientUserId === 'u-102' && n.bookingId === bId && n.type === NOTIFICATION_TYPES.CUSTOMER_CANCELLED
    );
    assert.ok(ownerCancel, 'Owner must receive CUSTOMER_CANCELLED');
  });

  it('9. Pay at Venue confirmation does NOT emit a false payment success notification', async () => {
    const slot = findAvailableSlotWithDate(activeCourt, 1, '2029-08-25');
    assert.ok(slot);

    // Create & Approve
    const cRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId: activeCourt.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    const pavId = (await cRes.json()).booking.id;

    await fetch(`${baseUrl}/api/bookings/${pavId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    // Pay at Venue
    const payRes = await fetch(`${baseUrl}/api/bookings/${pavId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'Pay at Venue' }),
    });
    assert.equal(payRes.status, 200);

    const confirmNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === pavId && n.type === NOTIFICATION_TYPES.BOOKING_CONFIRMED
    );
    assert.ok(confirmNotif, 'Customer must receive confirmation');

    const falsePayNotif = store.notifications.find(
      (n) => n.bookingId === pavId && n.type === NOTIFICATION_TYPES.PAYMENT_SUCCESS
    );
    assert.equal(falsePayNotif, undefined, 'Must not emit false payment success for Pay at Venue');
  });

  it('10. Valid past confirmed booking without check-in creates BOOKING_NO_SHOW notification', () => {
    // Inject past confirmed booking without check-in for u-101
    const pastBooking = {
      id: 'BK-NOSHOW-TEST-1',
      userId: 'u-101',
      courtId: activeCourt.id,
      venueId: activeCourt.venueId,
      date: '2024-01-10',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      pricePerHour: 50,
      totalPrice: 50,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      checkedInAt: null,
      createdAt: '2024-01-09T10:00:00.000Z',
      updatedAt: '2024-01-09T10:00:00.000Z',
    };
    store.bookings.push(pastBooking);

    syncNoShowNotifications('u-101');

    const noShowNotif = store.notifications.find(
      (n) => n.recipientUserId === 'u-101' && n.bookingId === 'BK-NOSHOW-TEST-1' && n.type === NOTIFICATION_TYPES.BOOKING_NO_SHOW
    );
    assert.ok(noShowNotif, 'Customer must receive BOOKING_NO_SHOW for past unchecked booking');
    assert.ok(noShowNotif.title.includes('No-Show'));
  });
});

// ==============================================================================
// SECTION 3: API ENDPOINTS, READ/UNREAD & SECURITY (BOLA/IDOR)
// ==============================================================================
describe('Phase 15: API Endpoints, Read/Unread & BOLA/IDOR Security', () => {
  it('1. GET /api/notifications rejects unauthenticated request (401)', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(res.status, 401);
  });

  it('2. GET /api/notifications returns only notifications belonging to authenticated user', async () => {
    const res1 = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.ok(Array.isArray(data1.notifications));
    for (const n of data1.notifications) {
      assert.equal(n.recipientUserId, 'u-101', 'Customer 1 must only see u-101 notifications');
    }

    const res2 = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    for (const n of data2.notifications) {
      assert.equal(n.recipientUserId, customer2UserId, 'Customer 2 must only see their own notifications');
    }
  });

  it('3. GET /api/notifications/unread-count returns accurate unread count', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(typeof data.unreadCount, 'number');
    assert.ok(data.unreadCount >= 0);
  });

  it('4. PATCH /api/notifications/:id/read marks notification as read and decrements unread count', async () => {
    // Find an unread notification for customer 1
    const unread = store.notifications.find((n) => n.recipientUserId === 'u-101' && !n.readAt);
    assert.ok(unread, 'Need at least one unread notification for u-101');

    const countBeforeRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const countBefore = (await countBeforeRes.json()).unreadCount;

    const readRes = await fetch(`${baseUrl}/api/notifications/${unread.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const readData = await readRes.json();
    assert.equal(readRes.status, 200);
    assert.equal(readData.notification.isRead, true);
    assert.ok(readData.notification.readAt);

    const countAfterRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const countAfter = (await countAfterRes.json()).unreadCount;
    assert.equal(countAfter, countBefore - 1);
  });

  it('5. Customer 2 cannot mark Customer 1 notification as read (403 BOLA/IDOR protection)', async () => {
    const cust1Notif = store.notifications.find((n) => n.recipientUserId === 'u-101');
    assert.ok(cust1Notif);

    const res = await fetch(`${baseUrl}/api/notifications/${cust1Notif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customer2Token}` },
    });

    assert.equal(res.status, 403, 'Cross-user mark-as-read must return 403 Forbidden');
  });

  it('6. POST /api/notifications/read-all marks all notifications for calling user only', async () => {
    // Create an unread notification for Customer 2
    createNotification({
      recipientUserId: customer2UserId,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Customer 2 Update',
      message: 'Exclusive to customer 2',
      bookingId: 'BK-C2-TEST',
      venueId: 'v-1',
    });

    // Customer 1 marks all read
    const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(readAllRes.status, 200);

    // Customer 1 unread count is now 0
    const c1Count = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal((await c1Count.json()).unreadCount, 0);

    // Customer 2 unread notification remains untouched
    const c2Notif = store.notifications.find((n) => n.bookingId === 'BK-C2-TEST');
    assert.ok(c2Notif);
    assert.equal(c2Notif.readAt, null, "Customer 1's mark-all-read must not touch Customer 2's notifications");
  });

  it('7. Owner isolation: Owner 2 cannot view or modify Owner 1 notifications', async () => {
    // Owner 1 notifications (u-102)
    const o1Notifs = store.notifications.filter((n) => n.recipientUserId === 'u-102');
    assert.ok(o1Notifs.length > 0);

    // Owner 2 (u-104) tries to read Owner 1 notification
    const res = await fetch(`${baseUrl}/api/notifications/${o1Notifs[0].id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherOwnerToken}` },
    });
    assert.equal(res.status, 403, 'Owner 2 must not be able to mark Owner 1 notification read');
  });
});
