process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import { store, safePlayer, safeVenue } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';
import { parse12HourTime } from '../controllers/bookingController.js';

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

  // Sign up Customer 2 for cross-customer BOLA testing
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sneha BOLA Test', email: 'sneha.bola@example.com', password: 'customer123' }),
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

  // Owner 2 login (owner2@quickcourt.com - owner2pass)
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
      verificationCode: 'QC-ADMIN-2026',
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

describe('Phase 22 — Security, BOLA/IDOR & Edge-Case Pass (End-to-End)', () => {

  describe('1. Server Hardening & Security Headers', () => {
    it('disables X-Powered-By and includes standard security headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-powered-by'), null);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      assert.equal(res.headers.get('x-xss-protection'), '0');
    });
  });

  describe('2. Authentication & Session Invalidation', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/my`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.status, 'error');
      assert.match(data.message, /Authentication required/i);
    });

    it('rejects malformed Bearer tokens with 401', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/my`, {
        headers: { Authorization: 'Bearer malformed.jwt.token' },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /Invalid authentication token/i);
    });

    it('rejects expired tokens with 401 Session expired', async () => {
      const expiredToken = jwt.sign(
        { sub: 'u-101', role: 'CUSTOMER', email: 'user@quickcourt.com' },
        AUTH_CONFIG.jwtSecret,
        { expiresIn: '-1s' }
      );
      const res = await fetch(`${baseUrl}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /Session expired/i);
    });

    it('rejects suspended users with active valid token (403 Forbidden)', async () => {
      // Create a temporary suspended user
      const tempUser = {
        id: 'u-suspended-test',
        name: 'Suspended User',
        email: 'suspended@example.com',
        role: 'CUSTOMER',
        status: 'suspended',
      };
      store.users.push(tempUser);

      const token = jwt.sign(
        { sub: tempUser.id, role: tempUser.role, email: tempUser.email },
        AUTH_CONFIG.jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Account is suspended/i);
    });
  });

  describe('3. Role-Based Access Control (RBAC)', () => {
    it('customer cannot access owner endpoints (403)', async () => {
      const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Required role: OWNER/i);
    });

    it('customer cannot access admin endpoints (403)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Required role: ADMIN/i);
    });

    it('owner cannot access admin endpoints (403)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Required role: ADMIN/i);
    });
  });

  describe('4. BOLA / IDOR Protection (Cross-User & Cross-Owner Isolation)', () => {
    let customer1BookingId;

    it('sets up a booking for Customer 1', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: '2026-11-25',
          startTime: '07:00 AM',
          endTime: '08:00 AM',
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      customer1BookingId = data.booking.id;
      assert.ok(customer1BookingId);
    });

    it('Customer 2 cannot cancel Customer 1 booking (403 BOLA protection)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${customer1BookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customer2Token}`,
        },
        body: JSON.stringify({ reason: 'Plans changed' }),
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /not authorized/i);
    });

    it('Owner 2 cannot update Owner 1 venue (403)', async () => {
      const res = await fetch(`${baseUrl}/api/venues/v-1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner2Token}`,
        },
        body: JSON.stringify({ name: 'Tampered Venue Name' }),
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /not authorized/i);
    });

    it('Owner 2 cannot delete Owner 1 venue (403)', async () => {
      const res = await fetch(`${baseUrl}/api/venues/v-1`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${owner2Token}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /not authorized/i);
    });

    it('Customer 2 cannot mark Customer 1 notification as read (403)', async () => {
      // Fetch a notification belonging to user 1
      const notifRes = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const notifData = await notifRes.json();
      if (notifData.notifications && notifData.notifications.length > 0) {
        const targetNotifId = notifData.notifications[0].id;
        const res = await fetch(`${baseUrl}/api/notifications/${targetNotifId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${customer2Token}` },
        });
        assert.equal(res.status, 403);
      }
    });
  });

  describe('5. Booking State Machine & Invariant Hardening', () => {
    let approvedBookingId;

    it('creates and approves a booking for testing valid payments', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: '2026-11-26',
          startTime: '08:00 AM',
          endTime: '09:00 AM',
        }),
      });
      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      approvedBookingId = createData.booking.id;

      // Attempting to pay while still REQUESTED must fail (400)
      const payReqRes = await fetch(`${baseUrl}/api/bookings/${approvedBookingId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(payReqRes.status, 400);

      // Approve booking as Owner
      const appRes = await fetch(`${baseUrl}/api/bookings/${approvedBookingId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(appRes.status, 200);

      // Now paying succeeds
      const payAppRes = await fetch(`${baseUrl}/api/bookings/${approvedBookingId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(payAppRes.status, 200);
      const payData = await payAppRes.json();
      assert.equal(payData.booking.status, 'CONFIRMED');
      assert.equal(payData.booking.paymentStatus, 'PAID');
    });

    it('cannot check-in an unapproved/cancelled booking', async () => {
      const booking = {
        id: 'bk-cnl-chk-test',
        userId: 'u-101',
        courtId: 'c-1',
        venueId: 'v-1',
        date: '2026-11-26',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        status: 'CANCELLED',
        checkInToken: 'CHK-CNL-TEST-999',
        totalPrice: 400,
      };
      store.bookings.push(booking);

      const res = await fetch(`${baseUrl}/api/bookings/verify/CHK-CNL-TEST-999`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /cancelled/i);
    });

    it('cannot review a booking that is not COMPLETED (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          bookingId: approvedBookingId, // is CONFIRMED, not COMPLETED
          rating: 5,
          comment: 'Premature review attempt',
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Only completed bookings can be reviewed/i);
    });
  });

  describe('6. Multi-Hour Booking, Conflicts & Price Authority', () => {
    it('calculates server price authoritatively ignoring client tampered price', async () => {
      const v = store.venues.find((venue) => venue.id === 'v-1');
      if (v) v.verificationStatus = 'VERIFIED';

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: '2029-07-02',
          startTime: '08:00 AM',
          endTime: '11:00 AM', // 3 hours = 3 * 400 = 1200
          price: 50,
          totalPrice: 50,
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.booking.durationHours, 3);
      assert.equal(data.booking.totalPrice, 1200);
      assert.notEqual(data.booking.totalPrice, 50);
    });

    it('rejects overlapping booking requests on the same court on the same date (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: 'c-1',
          date: '2029-07-02',
          startTime: '09:00 AM', // Overlaps [08:00 AM, 11:00 AM]
          endTime: '10:00 AM',
        }),
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /already been booked/i);
    });
  });

  describe('7. Venue Verification Security', () => {
    it('owner update cannot bypass verificationStatus via PUT /api/venues/:id', async () => {
      const venue = store.venues.find((v) => v.id === 'v-1');
      venue.verificationStatus = 'PENDING';

      const res = await fetch(`${baseUrl}/api/venues/v-1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({
          verificationStatus: 'VERIFIED',
          isVerified: true,
        }),
      });
      assert.equal(res.status, 200);
      assert.equal(venue.verificationStatus, 'PENDING');
      venue.verificationStatus = 'VERIFIED'; // restore
    });

    it('admin suspension requires verification note', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/v-1/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'SUSPENDED' }), // Missing note
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /note is required/i);
    });
  });

  describe('8. Player Community & Matchmaking Safety', () => {
    it('disallows self match-invites (400)', async () => {
      const player = store.players.find((p) => p.userId === 'u-101') || store.players[0];
      const res = await fetch(`${baseUrl}/api/players/${player.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          sport: 'Badminton',
          date: '2026-11-28',
          startTime: '06:00 PM',
          endTime: '07:00 PM',
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /cannot send a match invite to yourself/i);
    });
  });

  describe('9. Data Privacy & Sanitization', () => {
    it('public player serialization never leaks user email or phone', () => {
      const player = store.players[0];
      const serialized = safePlayer(player, 'u-101');
      assert.equal(serialized.passwordHash, undefined);
      assert.equal(serialized.email, undefined);
      assert.equal(serialized.phone, undefined);
    });

    it('customer venue serialization never leaks internal admin notes', () => {
      const venue = store.venues.find((v) => v.id === 'v-1');
      const safeV = safeVenue(venue, 'CUSTOMER');
      assert.equal(safeV.verifiedBy, undefined);
      assert.equal(safeV.verificationNote, undefined);
    });
  });

  describe('10. Helper & Utility Edge-Case Bounds', () => {
    it('parses valid hourly times and returns null for invalid formats', () => {
      assert.equal(parse12HourTime('06:00 AM'), 6);
      assert.equal(parse12HourTime('12:00 PM'), 12);
      assert.equal(parse12HourTime('09:00 PM'), 21);
      assert.equal(parse12HourTime('12:00 AM'), 0);
      assert.equal(parse12HourTime('06:15 AM'), null);
      assert.equal(parse12HourTime('bad-string'), null);
      assert.equal(parse12HourTime(null), null);
    });
  });
});
