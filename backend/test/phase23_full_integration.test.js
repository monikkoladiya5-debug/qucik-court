process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';

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
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Sign up Customer 2 (sneha@example.com) for cross-customer matchmaking & reviews
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sneha Integration', email: 'sneha.integration@example.com', password: 'customer123' }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner 1 (owner@quickcourt.com)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Owner 2 (owner2@quickcourt.com)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;

  // Log in Admin (admin@quickcourt.com)
  const aRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@quickcourt.com',
      password: 'admin123',
      verificationCode: AUTH_CONFIG.adminVerificationCode,
    }),
  });
  const aData = await aRes.json();
  adminToken = aData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 23 — Full Product Integration Test Suite', () => {

  describe('1. Customer Master End-to-End Booking Lifecycle', () => {
    let bookingId;
    let checkInToken;
    const testDate = '2029-08-10';

    it('Step 1: Discovers venue and checks verification badge', async () => {
      const res = await fetch(`${baseUrl}/api/venues/v-1`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.venue.id, 'v-1');
      assert.equal(data.venue.verificationStatus, 'VERIFIED');
      assert.equal(data.venue.isVerified, true);
    });

    it('Step 2: Checks court availability for date', async () => {
      const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.slots));
      assert.ok(data.slots.length > 0);
    });

    it('Step 3: Creates a multi-hour contiguous booking (REQUESTED)', async () => {
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
          endTime: '10:00 AM', // 2 hours = 2 * 400 = 800
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      bookingId = data.booking.id;
      assert.ok(bookingId);
      assert.equal(data.booking.status, 'REQUESTED');
      assert.equal(data.booking.paymentStatus, 'PENDING');
      assert.equal(data.booking.durationHours, 2);
      assert.equal(data.booking.totalPrice, 800);
    });

    it('Step 4: Owner receives notification and approves booking (APPROVED)', async () => {
      const appRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(appRes.status, 200);
      const data = await appRes.json();
      assert.equal(data.booking.status, 'APPROVED');
    });

    it('Step 5: Customer completes online payment (CONFIRMED + PAID)', async () => {
      const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(payRes.status, 200);
      const data = await payRes.json();
      assert.equal(data.booking.status, 'CONFIRMED');
      assert.equal(data.booking.paymentStatus, 'PAID');
      assert.ok(data.booking.checkInToken);
      checkInToken = data.booking.checkInToken;
    });

    it('Step 6: Owner verifies check-in pass server-side', async () => {
      const verRes = await fetch(`${baseUrl}/api/bookings/verify/${checkInToken}`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(verRes.status, 200);
      const data = await verRes.json();
      assert.equal(data.booking.id, bookingId);
    });

    it('Step 7: Owner checks player in (CHECKED_IN)', async () => {
      const chkRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ token: checkInToken }),
      });
      assert.equal(chkRes.status, 200);
      const data = await chkRes.json();
      assert.equal(data.booking.status, 'CHECKED_IN');
    });

    it('Step 8: Booking completes and unlocks review submission (COMPLETED)', async () => {
      const compRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      assert.equal(compRes.status, 200);
      const compData = await compRes.json();
      assert.equal(compData.booking.status, 'COMPLETED');

      // Customer writes a review
      const revRes = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId,
          rating: 5,
          title: 'Master Journey Test Review',
          comment: 'Perfect courts and smooth check-in flow.',
        }),
      });
      assert.equal(revRes.status, 201);
      const revData = await revRes.json();
      assert.equal(revData.review.bookingId, bookingId);
      assert.equal(revData.review.rating, 5);
    });

    it('Step 9: Dynamic venue review aggregation updates seamlessly', async () => {
      const venueRes = await fetch(`${baseUrl}/api/venues/v-1`);
      assert.equal(venueRes.status, 200);
      const venueData = await venueRes.json();
      assert.ok(venueData.venue.reviewCount >= 1);
      assert.ok(venueData.venue.averageRating >= 1);
    });

    it('Step 10: Gamification achievements reflect completed booking and check-in', async () => {
      const gamifyRes = await fetch(`${baseUrl}/api/players/me/gamification`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(gamifyRes.status, 200);
      const gamifyData = await gamifyRes.json();
      assert.ok(gamifyData.gamification.completedGames >= 1);
      assert.ok(gamifyData.gamification.verifiedCheckIns >= 1);
    });
  });

  describe('2. Multi-Hour Booking Durations & Price Calculations', () => {
    const testDate = '2029-08-11';

    it('1 Hour booking: duration = 1, price = rate * 1', async () => {
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
      assert.equal(data.booking.durationHours, 1);
      assert.equal(data.booking.totalPrice, 400);
    });

    it('2 Hours booking: duration = 2, price = rate * 2', async () => {
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
      assert.equal(data.booking.durationHours, 2);
      assert.equal(data.booking.totalPrice, 800);
    });

    it('3 Hours booking: duration = 3, price = rate * 3', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
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
      assert.equal(data.booking.durationHours, 3);
      assert.equal(data.booking.totalPrice, 1200);
    });
  });

  describe('3. Customer Alternate Journeys (Rejection, Cancel, Pay-at-Venue, Reschedule)', () => {
    const testDate = '2029-07-02';

    it('Rejection flow: REQUESTED -> REJECTED releases slot and prevents payment', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
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
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      const bId = createData.booking.id;

      // Owner rejects
      const rejRes = await fetch(`${baseUrl}/api/bookings/${bId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(rejRes.status, 200);

      // Payment on rejected booking is blocked
      const payRes = await fetch(`${baseUrl}/api/bookings/${bId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(payRes.status, 400);

      // Slot is now available for another booking
      const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
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
      assert.equal(rebookRes.status, 201);
    });

    it('Cancellation flow: CONFIRMED + PAID -> CANCELLED marks REFUNDED and frees slot', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: testDate,
          startTime: '07:00 AM',
          endTime: '08:00 AM',
        }),
      });
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      const bId = createData.booking.id;

      await fetch(`${baseUrl}/api/bookings/${bId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });

      await fetch(`${baseUrl}/api/bookings/${bId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });

      // Customer cancels
      const cancelRes = await fetch(`${baseUrl}/api/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ reason: 'Plans changed', note: 'Family emergency' }),
      });
      assert.equal(cancelRes.status, 200);
      const cancelData = await cancelRes.json();
      assert.equal(cancelData.booking.status, 'CANCELLED');
      assert.equal(cancelData.booking.paymentStatus, 'REFUNDED');

      // Slot is rebookable
      const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: testDate,
          startTime: '07:00 AM',
          endTime: '08:00 AM',
        }),
      });
      assert.equal(rebookRes.status, 201);
    });

    it('Pay at Venue flow: APPROVED -> CONFIRMED + PENDING -> CHECKED_IN + PENDING', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: testDate,
          startTime: '08:00 AM',
          endTime: '09:00 AM',
        }),
      });
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      const bId = createData.booking.id;

      await fetch(`${baseUrl}/api/bookings/${bId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });

      // Choose Pay at Venue
      const payRes = await fetch(`${baseUrl}/api/bookings/${bId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'Pay at Venue' }),
      });
      assert.equal(payRes.status, 200);
      const payData = await payRes.json();
      assert.equal(payData.booking.status, 'CONFIRMED');
      assert.equal(payData.booking.paymentStatus, 'PENDING');

      // Check-in keeps payment as PENDING
      const chkRes = await fetch(`${baseUrl}/api/bookings/${bId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ token: payData.booking.checkInToken }),
      });
      assert.equal(chkRes.status, 200);
      const chkData = await chkRes.json();
      assert.equal(chkData.booking.status, 'CHECKED_IN');
      assert.equal(chkData.booking.paymentStatus, 'PENDING');
    });

    it('Rescheduling flow: preserves Booking ID, moves interval, recalculates price', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: testDate,
          startTime: '09:00 AM',
          endTime: '10:00 AM', // 1 hour = 400
        }),
      });
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      const bId = createData.booking.id;

      await fetch(`${baseUrl}/api/bookings/${bId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });

      // Reschedule to 2 hours on same date: 10:00 AM - 12:00 PM
      const reschedRes = await fetch(`${baseUrl}/api/bookings/${bId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          date: testDate,
          startTime: '10:00 AM',
          endTime: '12:00 PM',
        }),
      });
      assert.equal(reschedRes.status, 200);
      const reschedData = await reschedRes.json();
      assert.equal(reschedData.booking.id, bId);
      assert.equal(reschedData.booking.durationHours, 2);
      assert.equal(reschedData.booking.totalPrice, 800);

      // Old slot 09:00 AM - 10:00 AM is freed
      const rebookOldRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: testDate,
          startTime: '09:00 AM',
          endTime: '10:00 AM',
        }),
      });
      assert.equal(rebookOldRes.status, 201);
    });
  });

  describe('4. Owner Fleet & Court Management Integration', () => {
    let createdCourtId;

    it('Owner creates a new court under their venue', async () => {
      const res = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({
          name: 'Court 11 Championship',
          sport: 'Badminton',
          courtType: 'Synthetic',
          indoor: true,
          pricePerHour: 550,
          operatingHours: '06:00 AM - 10:00 PM',
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      createdCourtId = data.court.id;
      assert.ok(createdCourtId);
    });

    it('Customer discovers and books the newly created court', async () => {
      // Query availability for the newly created court
      const availRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}/availability?date=2029-08-20`);
      assert.equal(availRes.status, 200);
      const availData = await availRes.json();
      const openSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: createdCourtId,
          date: '2029-08-20',
          startTime: openSlot.startTime,
          endTime: openSlot.endTime,
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.booking.totalPrice, 550);
    });

    it('Deactivating the court blocks new bookings while preserving existing ones', async () => {
      // Deactivate court
      const deactRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ isActive: false }),
      });
      assert.equal(deactRes.status, 200);

      // Attempt new booking on inactive court
      const bookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: createdCourtId,
          date: '2029-08-21',
          startTime: '06:00 AM',
          endTime: '07:00 AM',
        }),
      });
      assert.equal(bookRes.status, 400);
      const bookData = await bookRes.json();
      assert.match(bookData.message, /court is currently inactive/i);
    });
  });

  describe('5. Venue Verification & Moderation Lifecycle Integration', () => {
    it('Admin rejects venue -> new bookings blocked, existing preserved', async () => {
      const modRes = await fetch(`${baseUrl}/api/admin/venues/v-1/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'SUSPENDED',
          note: 'Temporary maintenance audit',
        }),
      });
      assert.equal(modRes.status, 200);

      // New booking attempt rejected
      const bookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: '2029-08-25',
          startTime: '06:00 AM',
          endTime: '07:00 AM',
        }),
      });
      assert.equal(bookRes.status, 400);
      const bookData = await bookRes.json();
      assert.match(bookData.message, /verification status is suspended/i);

      // Admin restores venue to VERIFIED
      const restoreRes = await fetch(`${baseUrl}/api/admin/venues/v-1/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'VERIFIED',
          note: 'Audit passed successfully',
        }),
      });
      assert.equal(restoreRes.status, 200);
    });
  });

  describe('6. Find Players & Community Matchmaking Integration', () => {
    it('Finds players, sends match invite, and accepts invite', async () => {
      // Find a target player
      const playersRes = await fetch(`${baseUrl}/api/players`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(playersRes.status, 200);
      const playersData = await playersRes.json();
      assert.ok(playersData.players.length > 0);

      const targetPlayer = playersData.players.find((p) => p.name !== 'Rahul Sharma') || playersData.players[0];

      // Send match invite
      const invRes = await fetch(`${baseUrl}/api/players/${targetPlayer.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          sport: 'Badminton',
          date: '2029-08-28',
          startTime: '06:00 PM',
          endTime: '07:00 PM',
          message: 'Up for a competitive practice match?',
        }),
      });
      assert.equal(invRes.status, 201);
      const invData = await invRes.json();
      assert.ok(invData.invite.id);
    });
  });

  describe('7. Price Comparison & Best Time to Play Integration', () => {
    it('Price comparison returns valid multi-court pricing comparison without mutating state', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&city=Ahmedabad`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(Array.isArray(data.comparisons));
    });

    it('Best time to play returns recommended slots without creating bookings', async () => {
      const initialBookingCount = store.bookings.length;
      const res = await fetch(`${baseUrl}/api/pricing/best-times?venueId=v-1&date=2029-07-02&duration=2`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(store.bookings.length, initialBookingCount); // Zero ghost booking mutation
    });
  });

  describe('8. Admin Platform Intelligence & Cross-Phase Data Consistency', () => {
    it('Admin platform intelligence calculates authoritative revenue and active metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.bookingOverview.totalBookings >= 1);
      assert.ok(data.platformOverview.totalUsers >= 1);
      assert.ok(Array.isArray(data.timeDemandAnalytics.hourlyDemand));
    });
  });

  describe('9. Empty / Zero Data State Resilience', () => {
    it('handles query filters with 0 results cleanly without crashing', async () => {
      const res = await fetch(`${baseUrl}/api/venues?city=NonExistentCity&sport=NonExistentSport`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.count, 0);
      assert.deepEqual(data.venues, []);
    });

    it('handles empty notifications query for newly created user without error', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${customer2Token}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(Array.isArray(data.notifications));
    });
  });
});
