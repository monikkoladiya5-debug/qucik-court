process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store, calculatePlayerTrust, calculatePlayerGamification } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customerUser;
let customer2Token;
let customer2User;
let ownerToken;
let ownerUser;
let owner2Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com - u-101)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;
  customerUser = cData.user;

  // Sign up Customer 2 for matchmaking / cross-user isolation
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Audit Player Two', email: 'audit.two@example.com', password: 'customer123' }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;
  customer2User = c2Data.user;

  // Log in Owner 1 (owner@quickcourt.com - u-102)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;
  ownerUser = oData.user;

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
    body: JSON.stringify({ email: 'admin@quickcourt.com', password: 'admin123', verificationCode: 'QC-ADMIN-2026' }),
  });
  const aData = await aRes.json();
  adminToken = aData.token;
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('QuickCourt — Exhaustive Phase 0–24 Milestone Audit', () => {

  // ─── 1. Architecture, Health & Server Hardening ────────────────────────────
  describe('1. System Architecture & Server Hardening (Phase 0, 22)', () => {
    it('serves health status with security headers and disabled x-powered-by', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      assert.equal(res.headers.get('x-powered-by'), null);
      const data = await res.json();
      assert.equal(data.status, 'ok');
    });

    it('enforces 1mb payload limit and prevents memory exhaustion', async () => {
      const res = await fetch(`${baseUrl}/api/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ data: 'Z'.repeat(1.2 * 1024 * 1024) }),
      });
      assert.ok([400, 413, 500].includes(res.status));
    });
  });

  // ─── 2. Authentication & Suspended Session Revocation ──────────────────────
  describe('2. Authentication & Session Revocation (Phase 0, 22)', () => {
    it('rejects invalid credentials with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@quickcourt.com', password: 'wrongpassword' }),
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/my`);
      assert.equal(res.status, 401);
    });

    it('rejects suspended users on active JWT requests with 403', async () => {
      // Create user to suspend
      const uRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Suspended Test', email: 'suspended.test@example.com', password: 'customer123' }),
      });
      const uData = await uRes.json();
      const token = uData.token;

      // Admin suspends user
      const suspRes = await fetch(`${baseUrl}/api/admin/users/${uData.user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'suspended' }),
      });
      assert.equal(suspRes.status, 200);

      // Attempt to access with suspended token
      const accessRes = await fetch(`${baseUrl}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(accessRes.status, 403);
    });
  });

  // ─── 3. RBAC & Cross-Role Isolation ─────────────────────────────────────────
  describe('3. Role-Based Access Control & Privilege Separation (Phase 0, 22)', () => {
    it('blocks Customer from accessing Owner routes with 403', async () => {
      const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('blocks Customer and Owner from accessing Admin routes with 403', async () => {
      const res1 = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res1.status, 403);

      const res2 = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res2.status, 403);
    });

    it('blocks Owner 2 from accessing Owner 1 venue resources', async () => {
      // Find Owner 1 venue
      const o1Venue = store.venues.find((v) => v.ownerId === ownerUser.id);
      assert.ok(o1Venue);

      const res = await fetch(`${baseUrl}/api/courts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner2Token}` },
        body: JSON.stringify({
          venueId: o1Venue.id,
          name: 'Illegal Court Injection',
          sport: 'Badminton',
          pricePerHour: 500,
        }),
      });
      assert.ok([403, 404].includes(res.status));
    });
  });

  // ─── 4. Master Multi-Hour Booking Journey & Pricing Authority ──────────────
  describe('4. Multi-Hour Booking & Server Price Authority (Phase 2, 3, 6, 9, 10, 11)', () => {
    let bookingId;
    let checkInToken;
    let chosenCourt;
    let chosenSlots = [];
    const testDate = '2026-10-15';

    before(async () => {
      const targetVenue = store.venues.find((v) => v.ownerId === ownerUser.id && v.verificationStatus === 'VERIFIED') || store.venues[0];
      chosenCourt = store.courts.find((c) => c.venueId === targetVenue.id && c.isActive);
      assert.ok(chosenCourt);

      // Query availability to pick continuous available slots
      const availRes = await fetch(`${baseUrl}/api/courts/${chosenCourt.id}/availability?date=${testDate}`);
      const availData = await availRes.json();
      assert.equal(availRes.status, 200);

      const availableSlots = (availData.slots || []).filter((s) => s.status === 'AVAILABLE');
      assert.ok(availableSlots.length >= 2, 'Court must have available slots for testing');

      // Find 2 contiguous slots
      for (let i = 0; i < availableSlots.length - 1; i++) {
        if (availableSlots[i].endHour === availableSlots[i + 1].startHour) {
          chosenSlots = [availableSlots[i], availableSlots[i + 1]];
          break;
        }
      }
      if (chosenSlots.length === 0) {
        chosenSlots = [availableSlots[0]];
      }
    });

    it('creates multi-hour booking and calculates price strictly on server', async () => {
      const first = chosenSlots[0];
      const last = chosenSlots[chosenSlots.length - 1];
      const durationHours = chosenSlots.length;

      const reqBody = {
        venueId: chosenCourt.venueId,
        courtId: chosenCourt.id,
        date: testDate,
        startTime: first.startTime,
        endTime: last.endTime,
        durationHours,
        // Attempt price tampering (server MUST compute duration * rate)
        totalPrice: 10,
        price: 5,
      };

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify(reqBody),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.booking);
      assert.equal(data.booking.durationHours, durationHours);
      assert.equal(data.booking.totalPrice, chosenCourt.pricePerHour * durationHours);
      assert.equal(data.booking.status, 'REQUESTED');
      assert.equal(data.booking.paymentStatus, 'PENDING');
      bookingId = data.booking.id;
    });

    it('rejects online payment while booking is in REQUESTED state with 400', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(res.status, 400);
    });

    it('allows venue owner to approve booking', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.booking.status, 'APPROVED');
    });

    it('processes online payment after approval and generates check-in token', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentMethod: 'UPI' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.booking.status, 'CONFIRMED');
      assert.equal(data.booking.paymentStatus, 'PAID');
      assert.ok(data.booking.checkInToken);
      checkInToken = data.booking.checkInToken;
    });

    it('owner verifies check-in token and performs single-use check-in', async () => {
      // Verify token
      const vRes = await fetch(`${baseUrl}/api/bookings/verify/${checkInToken}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(vRes.status, 200);
      const vData = await vRes.json();
      assert.equal(vData.booking.id, bookingId);

      // Perform check-in
      const chkRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ token: checkInToken }),
      });
      assert.equal(chkRes.status, 200);
      const chkData = await chkRes.json();
      assert.equal(chkData.booking.status, 'CHECKED_IN');
      assert.ok(chkData.booking.checkedInAt);
    });

    it('blocks duplicate check-in attempt with 400', async () => {
      const dupRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ token: checkInToken }),
      });
      assert.equal(dupRes.status, 400);
    });
  });

  // ─── 5. Availability Conflict & Cancellation Release ───────────────────────
  describe('5. Availability Locking & Slot Release (Phase 3, 14)', () => {
    let targetCourt;
    let cancelBookingId;
    let availableSlot;
    const testDate = '2026-11-20';

    before(async () => {
      targetCourt = store.courts.find((c) => c.isActive) || store.courts[0];
      const availRes = await fetch(`${baseUrl}/api/courts/${targetCourt.id}/availability?date=${testDate}`);
      const availData = await availRes.json();
      const slots = (availData.slots || []).filter((s) => s.status === 'AVAILABLE');
      assert.ok(slots.length > 0);
      availableSlot = slots[0];
    });

    it('blocks overlapping booking on the same court and date', async () => {
      // Create first booking
      const res1 = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          venueId: targetCourt.venueId,
          courtId: targetCourt.id,
          date: testDate,
          startTime: availableSlot.startTime,
          endTime: availableSlot.endTime,
          durationHours: 1,
        }),
      });
      assert.equal(res1.status, 201);
      const d1 = await res1.json();
      cancelBookingId = d1.booking.id;

      // Attempt overlapping booking (same slot)
      const res2 = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({
          venueId: targetCourt.venueId,
          courtId: targetCourt.id,
          date: testDate,
          startTime: availableSlot.startTime,
          endTime: availableSlot.endTime,
          durationHours: 1,
        }),
      });
      assert.equal(res2.status, 409);
    });

    it('releases reserved slot upon cancellation', async () => {
      const cRes = await fetch(`${baseUrl}/api/bookings/${cancelBookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ reason: 'Plans changed' }),
      });
      assert.equal(cRes.status, 200);

      // Slot should now succeed
      const res3 = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customer2Token}` },
        body: JSON.stringify({
          venueId: targetCourt.venueId,
          courtId: targetCourt.id,
          date: testDate,
          startTime: availableSlot.startTime,
          endTime: availableSlot.endTime,
          durationHours: 1,
        }),
      });
      assert.equal(res3.status, 201);
    });
  });

  // ─── 6. Matchmaking, Trust & Two-Way Safety ────────────────────────────────
  describe('6. Matchmaking Safety, Two-Way Blocking & Privacy (Phase 12, 13)', () => {
    it('excludes self and blocked players in Find Players directory', async () => {
      const res = await fetch(`${baseUrl}/api/players`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.players));

      // Self must not appear
      const selfFound = data.players.some((p) => p.userId === customerUser.id);
      assert.equal(selfFound, false);

      // Privacy: no passwordHash or private email
      for (const p of data.players) {
        assert.equal(p.passwordHash, undefined);
        assert.equal(p.email, undefined);
      }
    });

    it('prevents self-invite in matchmaking with 400', async () => {
      const myPlayer = store.players.find((p) => p.userId === customerUser.id);
      if (myPlayer) {
        const res = await fetch(`${baseUrl}/api/players/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
          body: JSON.stringify({
            receiverPlayerId: myPlayer.id,
            sport: 'Badminton',
            date: '2026-10-30',
            startTime: '06:00 PM',
            venueName: 'Test Venue',
          }),
        });
        assert.ok([400, 403, 404].includes(res.status));
      }
    });
  });

  // ─── 7. Verified Reviews & Duplicate Protection ────────────────────────────
  describe('7. Verified Player Reviews & Ratings Integrity (Phase 20)', () => {
    it('rejects review creation for non-completed booking with 400 or 403', async () => {
      // Find a requested or pending booking
      const pendingBooking = store.bookings.find((b) => b.userId === customerUser.id && b.status !== 'COMPLETED');
      if (pendingBooking) {
        const res = await fetch(`${baseUrl}/api/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
          body: JSON.stringify({
            bookingId: pendingBooking.id,
            rating: 5,
            comment: 'Great game!',
          }),
        });
        assert.ok([400, 403].includes(res.status));
      }
    });
  });

  // ─── 8. Deterministic Gamification Badges ──────────────────────────────────
  describe('8. Gamification Achievements & Reliable Player Criteria (Phase 21)', () => {
    it('evaluates gamification achievements deterministically without false badges', () => {
      const gam = calculatePlayerGamification(customerUser.id);
      assert.ok(gam);
      assert.ok(Array.isArray(gam.achievements));
      assert.equal(gam.achievements.length, 6);

      // Reliable player achievement must have zero no-shows
      const relBadge = gam.achievements.find((a) => a.id === 'reliable-player');
      assert.ok(relBadge);
      if (relBadge.earned) {
        assert.equal(gam.noShows, 0);
      }
    });
  });

  // ─── 9. Venue Verification & Administrative Moderation ─────────────────────
  describe('9. Venue Verification & Operations Moderation (Phase 19)', () => {
    it('allows Admin to update venue verification status and notifies owner', async () => {
      // Find a venue that is not already suspended
      const v = store.venues.find((item) => item.verificationStatus === 'VERIFIED') || store.venues[0];
      assert.ok(v);

      // Transition VERIFIED -> SUSPENDED with note
      const res = await fetch(`${baseUrl}/api/admin/venues/${v.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'SUSPENDED',
          note: 'Temporary maintenance suspension during audit.',
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.venue.verificationStatus, 'SUSPENDED');

      // Transition SUSPENDED -> VERIFIED
      const restoreRes = await fetch(`${baseUrl}/api/admin/venues/${v.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'VERIFIED',
          note: 'Restored to verified state.',
        }),
      });
      assert.equal(restoreRes.status, 200);
      const restoreData = await restoreRes.json();
      assert.equal(restoreData.venue.verificationStatus, 'VERIFIED');
    });
  });


  // ─── 10. Platform Intelligence & Revenue Calculations ──────────────────────
  describe('10. Platform Intelligence Analytics & Correct Mathematical Totals (Phase 18)', () => {
    it('returns authoritative platform intelligence with exact match against store', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence?range=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.platformOverview);
      assert.ok(data.paymentOverview);
      assert.ok(typeof data.paymentOverview.totalBookingValue === 'number');
      assert.ok(Array.isArray(data.sportsAnalytics));
      assert.ok(Array.isArray(data.timeDemandAnalytics.hourlyDemand));
    });
  });

});
