process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let ownerToken;
let otherOwnerToken;
let adminToken;
let customerUser;
let ownerUser;
let otherOwnerUser;
let adminUser;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Customer Login
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;
  customerUser = cData.user;

  // Primary Owner Login
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;
  ownerUser = oData.user;

  // Secondary Owner Login
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  otherOwnerToken = o2Data.token;
  otherOwnerUser = o2Data.user;

  // Admin Login
  const aRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@quickcourt.com',
      password: 'admin123',
      verificationCode: 'QC-ADMIN-2026',
    }),
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('PART A: Owner Court Creation → Admin Approval Workflow', () => {
  let createdCourtId;
  let rejectedCourtId;

  it('1. Owner creates court and receives 201 with pending message', async () => {
    const venue = store.venues.find((v) => v.ownerId === ownerUser.id);
    assert.ok(venue, 'Venue exists for owner');

    const res = await fetch(`${baseUrl}/api/venues/${venue.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Championship Court Alpha',
        sport: 'Badminton',
        pricePerHour: 750,
        courtType: 'Synthetic Wooden',
        indoor: true,
        operatingHours: '06:00 AM - 10:00 PM',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.court);
    assert.match(body.message, /administrator approval/i);
    createdCourtId = body.court.id;
  });

  it('2. Court starts with approvalStatus = PENDING, approvedAt = null, approvedBy = null', async () => {
    const court = store.courts.find((c) => c.id === createdCourtId);
    assert.ok(court, 'Court exists in store');
    assert.equal(court.approvalStatus, 'PENDING');
    assert.equal(court.approvedAt, null);
    assert.equal(court.approvedBy, null);
    assert.equal(court.approvalNote, 'Pending administrator approval');
    assert.ok(court.approvalUpdatedAt);
  });

  it('3. Admin receives NEW_COURT_REQUEST transactional notification', async () => {
    const notifications = store.notifications.filter(
      (n) => (n.recipientUserId === adminUser.id || n.userId === adminUser.id) && n.type === 'NEW_COURT_REQUEST'
    );
    assert.ok(notifications.length > 0, 'Admin received NEW_COURT_REQUEST');
    const latest = notifications[notifications.length - 1];
    assert.equal(latest.courtId, createdCourtId);
    assert.match(latest.message, /Championship Court Alpha/);
  });

  it('4. Admin sees court in GET /api/admin/courts/approval queue with filter=PENDING', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/approval?status=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.courts));
    const target = body.courts.find((c) => c.id === createdCourtId);
    assert.ok(target, 'Created court is in pending approval list');
  });

  it('5. Admin sees owner, venue, court name, sport, rate, and specification details', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/approval?status=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    const target = body.courts.find((c) => c.id === createdCourtId);
    assert.ok(target);
    assert.equal(target.name, 'Championship Court Alpha');
    assert.equal(target.sport, 'Badminton');
    assert.equal(target.pricePerHour, 750);
    assert.equal(target.courtType, 'Synthetic Wooden');
    assert.equal(target.indoor, true);
    assert.ok(target.venueName);
    assert.ok(target.ownerName);
    assert.ok(target.ownerEmail);
  });

  it('6. Customer cannot discover pending court via public listing, getCourt, availability, or create booking', async () => {
    // 6a. Listing
    const listRes = await fetch(`${baseUrl}/api/courts`);
    const listBody = await listRes.json();
    const foundInList = listBody.courts?.find((c) => c.id === createdCourtId);
    assert.equal(foundInList, undefined, 'Pending court not visible in public court list');

    // 6b. Single Court
    const getRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`);
    assert.equal(getRes.status, 404, 'Direct fetch of pending court returns 404');

    // 6c. Availability
    const availRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}/availability?date=2026-10-01`);
    assert.equal(availRes.status, 404, 'Availability for pending court returns 404');

    // 6d. Booking
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: createdCourtId,
        date: '2026-10-01',
        startTime: '07:00 AM',
        endTime: '08:00 AM',
      }),
    });
    assert.equal(bookRes.status, 400, 'Customer cannot book pending court');
    const bookBody = await bookRes.json();
    assert.match(bookBody.message, /not currently approved|active|pending administrator approval/i);
  });

  it('7. Admin approves court via PATCH /api/admin/courts/:courtId/approval', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/${createdCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        approvalStatus: 'APPROVED',
        approvalNote: 'Verified facility dimensions and surface quality',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.court.approvalStatus, 'APPROVED');
  });

  it('8. Court becomes APPROVED with server-recorded approvedAt and approvedBy metadata', async () => {
    const court = store.courts.find((c) => c.id === createdCourtId);
    assert.ok(court);
    assert.equal(court.approvalStatus, 'APPROVED');
    assert.ok(court.approvedAt);
    assert.equal(court.approvedBy, adminUser.id);
    assert.equal(court.approvalNote, 'Verified facility dimensions and surface quality');
  });

  it('9. Customer can discover, view availability, and book the approved court', async () => {
    // Discovery
    const listRes = await fetch(`${baseUrl}/api/courts`);
    const listBody = await listRes.json();
    const found = listBody.courts?.find((c) => c.id === createdCourtId);
    assert.ok(found, 'Approved court discovered in public listing');

    // Availability
    const availRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}/availability?date=2026-10-01`);
    assert.equal(availRes.status, 200);
    const availData = await availRes.json();
    const slot = availData.slots?.find((s) => s.status === 'AVAILABLE') || { startTime: '07:00 AM', endTime: '08:00 AM' };

    // Book
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: createdCourtId,
        date: '2026-10-01',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
  });

  it('10. Owner receives COURT_APPROVED transactional notification', async () => {
    const notifs = store.notifications.filter(
      (n) => (n.recipientUserId === ownerUser.id || n.userId === ownerUser.id) && n.type === 'COURT_APPROVED'
    );
    assert.ok(notifs.length > 0, 'Owner received COURT_APPROVED notification');
    const latest = notifs[notifs.length - 1];
    assert.equal(latest.courtId, createdCourtId);
    assert.match(latest.message, /approved/i);
  });

  it('11. Admin rejects another court with a required note (reject without note returns 400)', async () => {
    // Create a 2nd court
    const venue = store.venues.find((v) => v.ownerId === ownerUser.id);
    const validSport = (Array.isArray(venue.sportTypes) && venue.sportTypes[0]) || 'Badminton';
    const cRes = await fetch(`${baseUrl}/api/venues/${venue.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Defective Court Beta',
        sport: validSport,
        pricePerHour: 900,
      }),
    });
    const cBody = await cRes.json();
    rejectedCourtId = cBody.court?.id;
    assert.ok(rejectedCourtId, 'Court creation succeeded');

    // Try reject without note -> 400
    const failRes = await fetch(`${baseUrl}/api/admin/courts/${rejectedCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        approvalStatus: 'REJECTED',
        approvalNote: '   ',
      }),
    });
    assert.equal(failRes.status, 400, 'Rejection without note returns 400');

    // Reject with valid note -> 200
    const okRes = await fetch(`${baseUrl}/api/admin/courts/${rejectedCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        approvalStatus: 'REJECTED',
        approvalNote: 'Surface safety standards not met. Please re-apply after resurfacing.',
      }),
    });
    assert.equal(okRes.status, 200);
    const okBody = await okRes.json();
    assert.equal(okBody.court.approvalStatus, 'REJECTED');
    assert.equal(okBody.court.approvalNote, 'Surface safety standards not met. Please re-apply after resurfacing.');
  });

  it('12. Rejected court remains unavailable to customers', async () => {
    const getRes = await fetch(`${baseUrl}/api/courts/${rejectedCourtId}`);
    assert.equal(getRes.status, 404, 'Rejected court is not publicly accessible');

    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: rejectedCourtId,
        date: '2026-10-01',
        startTime: '08:00 AM',
        endTime: '09:00 AM',
      }),
    });
    assert.equal(bookRes.status, 400);
  });

  it('13. Owner receives COURT_REJECTED notification with rejection note', async () => {
    const notifs = store.notifications.filter(
      (n) => (n.recipientUserId === ownerUser.id || n.userId === ownerUser.id) && n.type === 'COURT_REJECTED'
    );
    assert.ok(notifs.length > 0, 'Owner received COURT_REJECTED notification');
    const latest = notifs[notifs.length - 1];
    assert.equal(latest.courtId, rejectedCourtId);
    assert.match(latest.message, /Surface safety standards/);
  });

  it('14. Customer and Owner receive 403 on Admin court approval endpoints', async () => {
    // Customer
    const cRes = await fetch(`${baseUrl}/api/admin/courts/approval`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(cRes.status, 403);

    // Owner
    const oRes = await fetch(`${baseUrl}/api/admin/courts/approval`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(oRes.status, 403);

    // Owner cannot patch approval
    const patchRes = await fetch(`${baseUrl}/api/admin/courts/${createdCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ approvalStatus: 'APPROVED' }),
    });
    assert.equal(patchRes.status, 403);
  });

  it('15. Legacy/seeded courts and Venue approval workflows continue working seamlessly', async () => {
    // Legacy courts without explicit status are treated as APPROVED
    const seededCourt = store.courts[0];
    const getRes = await fetch(`${baseUrl}/api/courts/${seededCourt.id}`);
    assert.equal(getRes.status, 200);

    // Venue verification endpoint still functional
    const vRes = await fetch(`${baseUrl}/api/admin/venues/verification`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(vRes.status, 200);
  });

  it('16. State Transition: APPROVED -> APPROVED returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/${createdCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        note: 'Re-approving already approved court',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Cannot transition court approval from 'APPROVED' to 'APPROVED'/i);
  });

  it('17. State Transition: REJECTED -> REJECTED returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/${rejectedCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'REJECTED',
        note: 'Re-rejecting already rejected court',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Cannot transition court approval from 'REJECTED' to 'REJECTED'/i);
  });

  it('18. State Transition: APPROVED -> REJECTED succeeds with valid moderation note', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/${createdCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'REJECTED',
        note: 'Emergency maintenance required after roof leak.',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.court.approvalStatus, 'REJECTED');
    assert.equal(body.court.isActive, false);

    // Court is now unbookable
    const getRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`);
    assert.equal(getRes.status, 404);
  });

  it('19. State Transition: REJECTED -> APPROVED succeeds and reactivates court', async () => {
    const res = await fetch(`${baseUrl}/api/admin/courts/${createdCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        note: 'Roof repaired and verified by facility inspection.',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.court.approvalStatus, 'APPROVED');
    assert.equal(body.court.isActive, true);

    // Court is discoverable again
    const getRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`);
    assert.equal(getRes.status, 200);
  });
});

describe('PART B: Owner Booking Rejection Must Have a Valid Reason', () => {
  let pendingBookingId;
  let testCourt;

  async function getAvailableSlot(courtId, date) {
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date}`);
    const availData = await availRes.json();
    const slot = availData.slots?.find((s) => s.status === 'AVAILABLE');
    if (!slot) {
      throw new Error(`No available slot found for court ${courtId} on ${date}`);
    }
    return slot;
  }

  before(async () => {
    // Ensure we have an approved, active court belonging to ownerUser
    testCourt = store.courts.find((c) => {
      const v = store.venues.find((ven) => ven.id === c.venueId);
      return v && v.ownerId === ownerUser.id && (c.approvalStatus === 'APPROVED' || !c.approvalStatus) && c.isActive !== false;
    });
    assert.ok(testCourt, 'Approved, active court exists for owner');
  });

  it('1. Owner receives a pending booking request', async () => {
    const slot = await getAvailableSlot(testCourt.id, '2026-11-15');
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: '2026-11-15',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookData = await bookRes.json();
    pendingBookingId = bookData.booking.id;
    assert.equal(bookData.booking.status, 'REQUESTED');
  });

  it('2. Owner cannot reject booking without a reason (returns 400)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /rejection reason is required/i);
  });

  it('3. Invalid rejection reason is rejected by backend (returns 400)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'NOT_A_REAL_REASON' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /invalid rejection reason/i);
  });

  it('3b. Rejection with reason OTHER requires note and note > 200 chars is blocked', async () => {
    // OTHER without note
    const noNoteRes = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'OTHER' }),
    });
    assert.equal(noNoteRes.status, 400);
    const noNoteBody = await noNoteRes.json();
    assert.match(noNoteBody.message, /short explanation is required/i);

    // Note exceeding 200 chars
    const longNoteRes = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE', note: 'x'.repeat(201) }),
    });
    assert.equal(longNoteRes.status, 400);
    const longNoteBody = await longNoteRes.json();
    assert.match(longNoteBody.message, /200 characters/i);
  });

  it('3c. Rejection with reason OTHER and valid explanation note succeeds', async () => {
    // Create a temporary booking to test OTHER with valid note
    const slot = await getAvailableSlot(testCourt.id, '2026-11-20');
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: '2026-11-20',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const { booking: tempBooking } = await bookRes.json();

    const okOtherRes = await fetch(`${baseUrl}/api/bookings/${tempBooking.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        reason: 'OTHER',
        note: 'Special corporate event booked exclusively at this venue.',
      }),
    });
    assert.equal(okOtherRes.status, 200);
    const okOtherBody = await okOtherRes.json();
    assert.equal(okOtherBody.booking.status, 'REJECTED');
    assert.equal(okOtherBody.booking.rejectionReason, 'OTHER');
    assert.equal(okOtherBody.booking.rejectionNote, 'Special corporate event booked exclusively at this venue.');
  });

  it('4. Valid reason successfully rejects booking', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        reason: 'SCHEDULE_CONFLICT',
        note: 'The court is reserved for an inter-club league tournament.',
        rejectedBy: 'fake-injected-user-id',
        rejectedAt: '2000-01-01T00:00:00.000Z',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.booking.status, 'REJECTED');
    assert.equal(body.booking.rejectionReason, 'SCHEDULE_CONFLICT');
    assert.equal(body.booking.rejectionNote, 'The court is reserved for an inter-club league tournament.');
  });

  it('5. rejectionReason is stored in booking record', async () => {
    const b = store.bookings.find((item) => item.id === pendingBookingId);
    assert.ok(b);
    assert.equal(b.rejectionReason, 'SCHEDULE_CONFLICT');
  });

  it('6. rejectionNote is stored in booking record', async () => {
    const b = store.bookings.find((item) => item.id === pendingBookingId);
    assert.ok(b);
    assert.equal(b.rejectionNote, 'The court is reserved for an inter-club league tournament.');
  });

  it('7. rejectedBy is derived from authenticated owner (spoofed ID is ignored) and rejectedAt is server-generated', async () => {
    const b = store.bookings.find((item) => item.id === pendingBookingId);
    assert.ok(b);
    assert.equal(b.rejectedBy, ownerUser.id);
    assert.notEqual(b.rejectedBy, 'fake-injected-user-id');
    assert.ok(b.rejectedAt);
    assert.notEqual(b.rejectedAt, '2000-01-01T00:00:00.000Z');
  });

  it('8. Customer receives BOOKING_REJECTED notification', async () => {
    const notifs = store.notifications.filter(
      (n) => (n.recipientUserId === customerUser.id || n.userId === customerUser.id) && n.type === 'BOOKING_REJECTED'
    );
    assert.ok(notifs.length > 0, 'Customer received BOOKING_REJECTED notification');
  });

  it('9. Customer notification contains the human-readable rejection reason and note', async () => {
    const notifs = store.notifications.filter(
      (n) => (n.recipientUserId === customerUser.id || n.userId === customerUser.id) && n.type === 'BOOKING_REJECTED'
    );
    const latest = notifs[notifs.length - 1];
    assert.match(latest.message, /Schedule conflict/i);
    assert.match(latest.message, /inter-club league tournament/i);
  });

  it('10. Customer booking details endpoint returns rejectionReason, rejectionNote, and rejectedAt', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const b = body.bookings.find((item) => item.id === pendingBookingId);
    assert.ok(b);
    assert.equal(b.status, 'REJECTED');
    assert.equal(b.rejectionReason, 'SCHEDULE_CONFLICT');
    assert.equal(b.rejectionNote, 'The court is reserved for an inter-club league tournament.');
    assert.ok(b.rejectedAt);
  });

  it('11. Admin can see rejection reason and audit metadata in operational booking data', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const b = body.bookings.find((item) => item.id === pendingBookingId);
    assert.ok(b);
    assert.equal(b.status, 'REJECTED');
    assert.equal(b.rejectionReason, 'SCHEDULE_CONFLICT');
    assert.equal(b.rejectionNote, 'The court is reserved for an inter-club league tournament.');
    assert.equal(b.rejectedBy, ownerUser.id);
    assert.ok(b.rejectedAt);
  });

  it('12. Another owner cannot reject the booking (isolation / 403)', async () => {
    // Create new booking for owner 1
    const slot = await getAvailableSlot(testCourt.id, '2026-11-16');
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: '2026-11-16',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookData = await bookRes.json();
    const testBid = bookData.booking.id;

    // Owner 2 attempts to reject owner 1's booking
    const res = await fetch(`${baseUrl}/api/bookings/${testBid}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherOwnerToken}`,
      },
      body: JSON.stringify({ reason: 'VENUE_CLOSURE' }),
    });
    assert.equal(res.status, 403);
  });

  it('13. Customer cannot reject or manipulate rejection fields (403)', async () => {
    // Create a new booking
    const slot = await getAvailableSlot(testCourt.id, '2026-11-17');
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: '2026-11-17',
        startTime: slot.startTime,
        endTime: slot.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookData = await bookRes.json();
    const testBid = bookData.booking.id;

    // Customer attempts to call reject endpoint
    const res = await fetch(`${baseUrl}/api/bookings/${testBid}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });
    assert.equal(res.status, 403);
  });

  it('14. Rejected booking remains terminal state (cannot be approved/paid/checked-in)', async () => {
    // Owner tries to approve rejected booking
    const appRes = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(appRes.status, 400);

    // Customer tries to pay rejected booking
    const payRes = await fetch(`${baseUrl}/api/bookings/${pendingBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });
    assert.equal(payRes.status, 400);
  });

  it('15. Existing approval, payment, cancellation, and rescheduling flows regress cleanly', async () => {
    // 15a. Booking creation & approval
    const slot1 = await getAvailableSlot(testCourt.id, '2026-11-18');
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: testCourt.id,
        date: '2026-11-18',
        startTime: slot1.startTime,
        endTime: slot1.endTime,
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookData = await bookRes.json();
    const bId = bookData.booking.id;

    // Owner approves
    const appRes = await fetch(`${baseUrl}/api/bookings/${bId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(appRes.status, 200);

    // Customer pays
    const payRes = await fetch(`${baseUrl}/api/bookings/${bId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });
    assert.equal(payRes.status, 200);

    // Customer reschedules
    const slot2 = await getAvailableSlot(testCourt.id, '2026-11-19');
    const reschedRes = await fetch(`${baseUrl}/api/bookings/${bId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        date: '2026-11-19',
        startTime: slot2.startTime,
        endTime: slot2.endTime,
      }),
    });
    assert.equal(reschedRes.status, 200);

    // Customer cancels
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Plans changed' }),
    });
    assert.equal(cancelRes.status, 200);
  });
});
