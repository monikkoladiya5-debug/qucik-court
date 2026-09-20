import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;

let customerToken;
let customer2Token;
let owner1Token;
let owner2Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  // Log in Customer 1 (user@quickcourt.com - u-101)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Sign up Customer 2 for cross-customer isolation
  const c2Email = `cust2_${Date.now()}@quickcourt.com`;
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sneha Rao', email: c2Email, password: 'password123' }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner 1 (owner@quickcourt.com - u-102, owns v-1, v-2, v-3, v-4)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Owner 2 (owner2@quickcourt.com - u-104, owns v-5, v-6)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;

  // Log in Admin (admin@quickcourt.com - u-103)
  const aRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@quickcourt.com', password: 'admin123', verificationCode: 'QC-ADMIN-2026' }),
  });
  const aData = await aRes.json();
  adminToken = aData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper to create and confirm a booking
async function createConfirmedBooking({ courtId = 'c-1', date = '2026-10-15', duration = 1, paymentMethod = 'UPI' } = {}) {
  // Query availability to pick free continuous consecutive slot sequence
  const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date}`);
  const availData = await availRes.json();
  const slots = availData.slots;

  let chosenSlots = null;
  for (let i = 0; i <= slots.length - duration; i++) {
    const slice = slots.slice(i, i + duration);
    if (slice.every((s) => s.status === 'AVAILABLE')) {
      chosenSlots = slice;
      break;
    }
  }

  assert.ok(chosenSlots, `Could not find ${duration} consecutive available slots on ${date}`);

  const startTime = chosenSlots[0].startTime;
  const endTime = chosenSlots[chosenSlots.length - 1].endTime;

  // 1. Create booking (REQUESTED)
  const createRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ courtId, date, startTime, endTime }),
  });
  const createData = await createRes.json();
  assert.equal(createRes.status, 201, `Failed to create booking: ${JSON.stringify(createData)}`);
  const booking = createData.booking;

  // 2. Owner approves booking (APPROVED)
  const approveRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
  });
  const approveData = await approveRes.json();
  assert.equal(approveRes.status, 200, `Failed to approve booking: ${JSON.stringify(approveData)}`);

  // 3. Customer pays (CONFIRMED)
  const payRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ paymentMethod }),
  });
  const payData = await payRes.json();
  assert.equal(payRes.status, 200, `Failed to pay booking: ${JSON.stringify(payData)}`);

  return payData.booking;
}

describe('Phase 11: Owner Verification & Check-In', () => {

  it('1. Owner can verify their own confirmed booking using Check-In Token', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-01' });
    assert.ok(booking.checkInToken, 'Check-In Token must exist on confirmed booking');

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/${booking.checkInToken}`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const verifyData = await verifyRes.json();

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyData.status, 'ok');
    assert.equal(verifyData.booking.id, booking.id);
    assert.equal(verifyData.booking.checkInToken, booking.checkInToken);
    assert.equal(verifyData.booking.status, 'CONFIRMED');
    assert.ok(verifyData.booking.customerName, 'Must include player name');
    assert.ok(verifyData.booking.courtName, 'Must include court name');
  });

  it('2. Owner can check in their own confirmed booking via POST /api/bookings/:id/check-in', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-02' });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInData.status, 'ok');
    assert.equal(checkInData.booking.status, 'CHECKED_IN');
    assert.ok(checkInData.booking.checkedInAt, 'Must record checkedInAt timestamp');
  });

  it('3. Authoritative state transition: CONFIRMED -> CHECKED_IN is reflected across API endpoints', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-03' });

    // Check in
    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 200);

    // Fetch as customer -> status must be CHECKED_IN
    const custFetch = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const custData = await custFetch.json();
    assert.equal(custData.booking.status, 'CHECKED_IN');
  });

  it('4. Customer cannot access owner verification endpoint (403 Forbidden)', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-04' });

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/${booking.checkInToken}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(verifyRes.status, 403);

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(checkInRes.status, 403);
  });

  it('5. Unauthenticated verification and check-in requests are rejected (401 Unauthorized)', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-05' });

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/${booking.checkInToken}`);
    assert.equal(verifyRes.status, 401);

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
    });
    assert.equal(checkInRes.status, 401);
  });

  it('6. Cross-Owner Isolation: Owner 2 cannot verify Owner 1 venue booking (403 Forbidden)', async () => {
    const booking = await createConfirmedBooking({ courtId: 'c-1', date: '2026-10-06' }); // c-1 belongs to Owner 1

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/${booking.checkInToken}`, {
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(verifyRes.status, 403);
  });

  it('7. Cross-Owner Isolation: Owner 2 cannot check in Owner 1 venue booking (403 Forbidden)', async () => {
    const booking = await createConfirmedBooking({ courtId: 'c-1', date: '2026-10-07' });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(checkInRes.status, 403);
  });

  it('8. Invalid/Unknown token is rejected with 404 Not Found', async () => {
    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/CHK-9999-9999-9999`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(verifyRes.status, 404);
  });

  it('9. Malformed / Empty token is rejected with 400 Bad Request', async () => {
    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ token: '' }),
    });
    assert.equal(verifyRes.status, 400);
  });

  it('10. REQUESTED booking cannot be verified or checked in (400 Bad Request)', async () => {
    // Create requested booking directly
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-10-08`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE');

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-08',
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });
    const booking = (await createRes.json()).booking;

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 400);
  });

  it('11. APPROVED / PAYMENT_PENDING booking cannot be checked in (400 Bad Request)', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-10-09`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE');

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-09',
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });
    const booking = (await createRes.json()).booking;

    // Approve booking
    await fetch(`${baseUrl}/api/bookings/${booking.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 400);
  });

  it('12. REJECTED booking cannot be checked in (400 Bad Request)', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-10-10`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE');

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-10-10',
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });
    const booking = (await createRes.json()).booking;

    // Reject booking
    await fetch(`${baseUrl}/api/bookings/${booking.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 400);
  });

  it('13. CANCELLED booking cannot be checked in (400 Bad Request)', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-11' });

    // Cancel booking
    await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 400);
  });

  it('14. Already CHECKED_IN booking cannot be checked in twice (400 Bad Request)', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-12' });

    // First check-in -> 200 OK
    const firstCheckIn = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(firstCheckIn.status, 200);

    // Second check-in -> 400 Bad Request
    const secondCheckIn = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(secondCheckIn.status, 400);
  });

  it('15. COMPLETED booking cannot be checked in (400 Bad Request)', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-13' });

    // Check in and complete
    await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    await fetch(`${baseUrl}/api/bookings/${booking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(checkInRes.status, 400);
  });

  it('16. Pay at Venue booking preserves PENDING payment status upon CHECKED_IN', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-14', paymentMethod: 'Pay at Venue' });
    assert.equal(booking.status, 'CONFIRMED');
    assert.equal(booking.paymentStatus, 'PENDING');

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInData.booking.status, 'CHECKED_IN');
    assert.equal(checkInData.booking.paymentStatus, 'PENDING', 'Pay at Venue must remain PENDING at check-in');
    assert.equal(checkInData.booking.paymentMethod, 'Pay at Venue');
  });

  it('17. Online booking preserves PAID payment status upon CHECKED_IN', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-15', paymentMethod: 'UPI' });
    assert.equal(booking.status, 'CONFIRMED');
    assert.equal(booking.paymentStatus, 'PAID');

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInData.booking.status, 'CHECKED_IN');
    assert.equal(checkInData.booking.paymentStatus, 'PAID');
  });

  it('18. Multi-Hour (2-Hour) booking check-in preserves single ID, token, and full interval', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-16', duration: 2 });
    assert.equal(booking.durationHours, 2);

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInData.booking.id, booking.id);
    assert.equal(checkInData.booking.checkInToken, booking.checkInToken);
    assert.equal(checkInData.booking.durationHours, 2);
    assert.equal(checkInData.booking.startTime, booking.startTime);
    assert.equal(checkInData.booking.endTime, booking.endTime);
  });

  it('19. Multi-Hour (3-Hour) booking check-in preserves single ID, token, and full interval', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-17', duration: 3 });
    assert.equal(booking.durationHours, 3);

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInRes.status, 200);
    assert.equal(checkInData.booking.id, booking.id);
    assert.equal(checkInData.booking.durationHours, 3);
  });

  it('20. QR payload fields cannot be spoofed: Server fetches authoritative booking from backend', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-18' });

    // Client crafts spoofed QR JSON with fake courtId and fake price
    const spoofedQrJson = JSON.stringify({
      tok: booking.checkInToken,
      bId: booking.id,
      cId: 'FAKE_COURT_SPOOF',
      totalPrice: 1, // Fake price
    });

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ qrData: spoofedQrJson }),
    });
    const verifyData = await verifyRes.json();

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyData.booking.courtId, booking.courtId, 'Must return authoritative backend courtId');
    assert.equal(verifyData.booking.totalPrice, booking.totalPrice, 'Must return authoritative backend totalPrice');
  });

  it('21. Booking ID and Check-In Token remain identical and stable after check-in', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-19' });
    const originalId = booking.id;
    const originalToken = booking.checkInToken;

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const checkInData = await checkInRes.json();

    assert.equal(checkInData.booking.id, originalId);
    assert.equal(checkInData.booking.checkInToken, originalToken);
  });

  it('22. Admin has global verification and check-in access across all venues', async () => {
    const booking = await createConfirmedBooking({ date: '2026-10-20' });

    const verifyRes = await fetch(`${baseUrl}/api/bookings/verify/${booking.checkInToken}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(verifyRes.status, 200);

    const checkInRes = await fetch(`${baseUrl}/api/bookings/${booking.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(checkInRes.status, 200);
  });

});
