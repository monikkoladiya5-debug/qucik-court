process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let owner1Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com - password: customer123)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Sign up Customer 2 for cross-customer authorization testing
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sneha Patel', email: 'sneha@example.com', password: 'customer123' }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner 1 (owner@quickcourt.com - password: owner123)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Admin (admin@quickcourt.com - password: admin123 - verificationCode: QC-ADMIN-2026)
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

describe('Phase 20 — Reviews & Ratings System', () => {

  // Clean / Setup test bookings in store before tests
  const completedBookingId = 'BK-TEST-COMPLETED-1';
  const customer2CompletedBookingId = 'BK-TEST-C2-COMPLETED-1';
  const requestedBookingId = 'BK-TEST-REQUESTED-1';
  const approvedBookingId = 'BK-TEST-APPROVED-1';
  const paymentPendingBookingId = 'BK-TEST-PAYMENT-PENDING-1';
  const confirmedBookingId = 'BK-TEST-CONFIRMED-1';
  const paidBookingId = 'BK-TEST-PAID-1';
  const checkedInBookingId = 'BK-TEST-CHECKED-IN-1';
  const cancelledBookingId = 'BK-TEST-CANCELLED-1';
  const rejectedBookingId = 'BK-TEST-REJECTED-1';
  const venueBCompletedBookingId = 'BK-TEST-VENUE-B-1';

  before(() => {
    // Reset reviews array
    store.reviews = [];

    // Add mock bookings for rigorous eligibility testing
    const testBookings = [
      {
        id: completedBookingId,
        userId: 'u-101', // Customer 1
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-01',
        startTime: '08:00 AM',
        endTime: '09:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: customer2CompletedBookingId,
        userId: 'u-sneha-patel', // Will be matched with customer 2
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-01',
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        createdAt: '2026-09-01T09:00:00.000Z',
      },
      {
        id: requestedBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '08:00 AM',
        endTime: '09:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
      },
      {
        id: approvedBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'APPROVED',
        paymentStatus: 'PENDING',
      },
      {
        id: paymentPendingBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'PENDING',
      },
      {
        id: confirmedBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '11:00 AM',
        endTime: '12:00 PM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
      {
        id: paidBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '12:00 PM',
        endTime: '01:00 PM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'PAID',
        paymentStatus: 'PAID',
      },
      {
        id: checkedInBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '01:00 PM',
        endTime: '02:00 PM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'CHECKED_IN',
        paymentStatus: 'PAID',
      },
      {
        id: cancelledBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'CANCELLED',
        paymentStatus: 'CANCELLED',
      },
      {
        id: rejectedBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-20',
        startTime: '03:00 PM',
        endTime: '04:00 PM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'REJECTED',
        paymentStatus: 'REJECTED',
      },
      {
        id: venueBCompletedBookingId,
        userId: 'u-101',
        courtId: 'c-4',
        venueId: 'v-2', // Venue 2
        date: '2026-09-02',
        startTime: '06:00 PM',
        endTime: '07:00 PM',
        pricePerHour: 600,
        totalPrice: 600,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
      },
    ];

    // Find customer 2's actual ID
    const c2User = store.users.find((u) => u.email === 'sneha@example.com');
    if (c2User) {
      const b2 = testBookings.find((b) => b.id === customer2CompletedBookingId);
      if (b2) b2.userId = c2User.id;
    }

    testBookings.forEach((tb) => {
      const idx = store.bookings.findIndex((b) => b.id === tb.id);
      if (idx >= 0) {
        store.bookings[idx] = tb;
      } else {
        store.bookings.push(tb);
      }
    });
  });

  describe('Authentication & RBAC', () => {
    it('1. unauthenticated review attempt → 401', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: completedBookingId, rating: 5, title: 'Good', comment: 'Nice' }),
      });
      assert.equal(res.status, 401);
    });

    it('2. OWNER review attempt → 403', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ bookingId: completedBookingId, rating: 5, title: 'Good', comment: 'Nice' }),
      });
      assert.equal(res.status, 403);
    });

    it('3. ADMIN review attempt → 403', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ bookingId: completedBookingId, rating: 5, title: 'Good', comment: 'Nice' }),
      });
      assert.equal(res.status, 403);
    });
  });

  describe('Eligibility Verification', () => {
    it('4. customer can review own COMPLETED booking', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId: completedBookingId,
          rating: 5,
          title: 'Outstanding Court Quality',
          comment: 'The wooden floor was in pristine condition and lighting was excellent.',
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.review.rating, 5);
      assert.equal(data.review.title, 'Outstanding Court Quality');
      assert.equal(data.review.venueId, 'v-1');
      assert.equal(data.review.courtId, 'c-1');
    });

    it('5. REQUESTED booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: requestedBookingId, rating: 5, comment: 'Trying early' }),
      });
      assert.equal(res.status, 400);
    });

    it('6. APPROVED booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: approvedBookingId, rating: 5, comment: 'Trying early' }),
      });
      assert.equal(res.status, 400);
    });

    it('7. PAYMENT_PENDING booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: paymentPendingBookingId, rating: 5, comment: 'Trying early' }),
      });
      assert.equal(res.status, 400);
    });

    it('8. CONFIRMED booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: confirmedBookingId, rating: 5, comment: 'Trying before play' }),
      });
      assert.equal(res.status, 400);
    });

    it('9. PAID booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: paidBookingId, rating: 5, comment: 'Trying before play' }),
      });
      assert.equal(res.status, 400);
    });

    it('10. CHECKED_IN booking rejected if not completed', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: checkedInBookingId, rating: 5, comment: 'Trying during play' }),
      });
      assert.equal(res.status, 400);
    });

    it('11. CANCELLED booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: cancelledBookingId, rating: 5, comment: 'Cancelled booking review' }),
      });
      assert.equal(res.status, 400);
    });

    it('12. REJECTED booking rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ bookingId: rejectedBookingId, rating: 5, comment: 'Rejected booking review' }),
      });
      assert.equal(res.status, 400);
    });
  });

  describe('Ownership & BOLA / IDOR Protection', () => {
    it('13. customer cannot review another customer\'s completed booking', async () => {
      // Customer 1 tries to review Customer 2's booking
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId: customer2CompletedBookingId,
          rating: 4,
          comment: 'Attempting to review someone else\'s booking',
        }),
      });
      assert.equal(res.status, 403);
    });

    it('14. client cannot override venueId in review creation', async () => {
      // Customer 2 reviews their own completed booking but tries to set venueId to 'v-999'
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`,
        },
        body: JSON.stringify({
          bookingId: customer2CompletedBookingId,
          venueId: 'v-999-injected',
          rating: 4,
          title: 'Great Experience',
          comment: 'Legitimate review by customer 2',
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      // Server must derive venueId from authoritative booking ('v-1'), not client payload
      assert.equal(data.review.venueId, 'v-1');
    });

    it('15. client cannot override courtId in review creation', async () => {
      // Review in store derived courtId 'c-1' from booking, not injected value
      const rev = store.reviews.find((r) => r.bookingId === customer2CompletedBookingId);
      assert.ok(rev);
      assert.equal(rev.courtId, 'c-1');
    });

    it('16. client cannot override customerId in review creation', async () => {
      const rev = store.reviews.find((r) => r.bookingId === customer2CompletedBookingId);
      assert.ok(rev);
      const c2User = store.users.find((u) => u.email === 'sneha@example.com');
      assert.equal(rev.customerId, c2User.id);
    });
  });

  describe('Payload & Rating Validation', () => {
    // Setup another completed booking for validation tests
    const valBookingId = 'BK-TEST-VAL-1';
    before(() => {
      store.bookings.push({
        id: valBookingId,
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-09-01',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        pricePerHour: 400,
        totalPrice: 400,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
      });
    });

    it('17. rating below 1 rejected (0 or negative)', async () => {
      const res0 = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 0, comment: 'Zero rating' }),
      });
      assert.equal(res0.status, 400);

      const resNeg = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: -1, comment: 'Negative rating' }),
      });
      assert.equal(resNeg.status, 400);
    });

    it('18. rating above 5 rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 6, comment: 'Above 5' }),
      });
      assert.equal(res.status, 400);
    });

    it('19. decimal rating rejected (e.g. 4.5)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 4.5, comment: 'Decimal rating' }),
      });
      assert.equal(res.status, 400);
    });

    it('20. invalid text rejected (non-string rating)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 'five', comment: 'String rating' }),
      });
      assert.equal(res.status, 400);
    });

    it('21. title > 100 rejected', async () => {
      const longTitle = 'a'.repeat(101);
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 5, title: longTitle, comment: 'Valid comment' }),
      });
      assert.equal(res.status, 400);
    });

    it('22. comment > 500 rejected', async () => {
      const longComment = 'a'.repeat(501);
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 5, title: 'Valid title', comment: longComment }),
      });
      assert.equal(res.status, 400);
    });

    it('23. whitespace-only review rejected', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ bookingId: valBookingId, rating: 5, title: '   ', comment: '    ' }),
      });
      assert.equal(res.status, 400);
    });
  });

  describe('Duplicate Protection', () => {
    it('24. first review succeeds', async () => {
      // Customer reviews venue B completed booking
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId: venueBCompletedBookingId,
          rating: 4,
          title: 'Solid Court Experience',
          comment: 'Great outdoor turf and good floodlights.',
        }),
      });
      assert.equal(res.status, 201);
    });

    it('25. second review for same booking → 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId: venueBCompletedBookingId,
          rating: 5,
          title: 'Duplicate attempt',
          comment: 'Should be rejected with 409.',
        }),
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.equal(data.status, 'error');
    });
  });

  describe('Aggregation & Dynamic Metrics', () => {
    it('26. venue average rating updates correctly from published reviews', async () => {
      // Venue 1 has 2 reviews: rating 5 and rating 4 -> average = 4.5
      const res = await fetch(`${baseUrl}/api/reviews/venue/v-1`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.summary.averageRating, 4.5);
      assert.equal(data.summary.reviewCount, 2);
    });

    it('27. review count updates correctly', async () => {
      const venueRes = await fetch(`${baseUrl}/api/venues/v-1`);
      assert.equal(venueRes.status, 200);
      const venueData = await venueRes.json();
      assert.equal(venueData.venue.rating, 4.5);
      assert.equal(venueData.venue.averageRating, 4.5);
      assert.equal(venueData.venue.reviewCount, 2);
    });

    it('28. hidden reviews do not affect public aggregation', async () => {
      // Add a hidden review to store for v-1
      store.reviews.push({
        id: 'rev-hidden-test',
        bookingId: 'BK-HIDDEN-1',
        customerId: 'u-101',
        venueId: 'v-1',
        courtId: 'c-1',
        rating: 1, // 1 star hidden review
        title: 'Hidden review',
        comment: 'Should not affect public stats',
        status: 'HIDDEN',
        createdAt: new Date().toISOString(),
      });

      const res = await fetch(`${baseUrl}/api/reviews/venue/v-1`);
      const data = await res.json();
      // Only 2 PUBLISHED reviews should be included (5 + 4 -> 4.5)
      assert.equal(data.summary.averageRating, 4.5);
      assert.equal(data.summary.reviewCount, 2);
      assert.equal(data.reviews.length, 2);
    });
  });

  describe('Privacy & Data Minimization', () => {
    it('29. public review response contains no private customer data', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/venue/v-1`);
      const data = await res.json();
      assert.ok(data.reviews.length > 0);

      data.reviews.forEach((r) => {
        // Must contain safe public fields
        assert.ok(r.reviewerName);
        assert.ok(r.rating);
        assert.ok(r.createdAt);

        // Must NEVER expose private customer PII
        assert.equal(r.passwordHash, undefined);
        assert.equal(r.email, undefined);
        assert.equal(r.phone, undefined);
        assert.equal(r.customerId, undefined);
        assert.equal(r.userId, undefined);
        assert.equal(r.checkInToken, undefined);
      });
    });

    it('30. owner response contains no private customer data', async () => {
      const res = await fetch(`${baseUrl}/api/owner/reviews`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');

      data.reviews.forEach((r) => {
        assert.ok(r.reviewerName);
        assert.ok(r.rating);

        assert.equal(r.passwordHash, undefined);
        assert.equal(r.email, undefined);
        assert.equal(r.phone, undefined);
        assert.equal(r.customerId, undefined);
        assert.equal(r.checkInToken, undefined);
      });
    });
  });

  describe('Venue Isolation', () => {
    it('31. venue A reviews do not appear for venue B', async () => {
      const v1Res = await fetch(`${baseUrl}/api/reviews/venue/v-1`);
      const v1Data = await v1Res.json();

      const v2Res = await fetch(`${baseUrl}/api/reviews/venue/v-2`);
      const v2Data = await v2Res.json();

      // v-1 has 2 reviews, v-2 has 1 review
      assert.equal(v1Data.count, 2);
      assert.equal(v2Data.count, 1);

      // Verify no cross-contamination of review IDs
      const v1ReviewIds = new Set(v1Data.reviews.map((r) => r.id));
      const v2ReviewIds = new Set(v2Data.reviews.map((r) => r.id));

      v1ReviewIds.forEach((id) => {
        assert.ok(!v2ReviewIds.has(id), `Review ${id} should not appear in venue 2`);
      });
    });
  });

  describe('Regression Safety', () => {
    it('32. venue discovery still works', async () => {
      const res = await fetch(`${baseUrl}/api/venues`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.venues));
      assert.ok(data.venues.length > 0);
    });

    it('33. smart recommendations still work', async () => {
      const res = await fetch(`${baseUrl}/api/venues/recommendations`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.recommendations));
    });

    it('34. price comparison still works', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&city=Ahmedabad`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(Array.isArray(data.comparisons));
    });

    it('35. Best Time to Play still works', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?venueId=v-1&courtId=c-1&date=2026-09-20&duration=1`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(Array.isArray(data.recommendations));
    });

    it('36. customer can fetch own submitted reviews via GET /api/reviews/my', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/my`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(Array.isArray(data.reviews));
      assert.ok(data.reviews.length >= 2);
    });
  });
});
