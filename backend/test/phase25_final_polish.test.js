process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customerUser;
let ownerToken;
let ownerUser;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;
  customerUser = cData.user;

  // Log in Owner
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;
  ownerUser = oData.user;

  // Log in Admin
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

describe('QuickCourt — Phase 25 Final Hackathon Demo & Polish QA', () => {

  // ─── 1. Complete Customer Demo Journey ─────────────────────────────────────
  describe('1. Customer Demo Journey: Discovery -> Booking -> Pass -> Review', () => {
    let createdBookingId;
    let checkInToken;

    it('discovers venues via NLP smart search and fetches recommendations', async () => {
      const sRes = await fetch(`${baseUrl}/api/venues?sport=Badminton&city=Ahmedabad`);
      assert.equal(sRes.status, 200);
      const sData = await sRes.json();
      assert.ok(Array.isArray(sData.venues));
      assert.ok(sData.venues.length > 0);

      const rRes = await fetch(`${baseUrl}/api/venues/recommendations`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(rRes.status, 200);
      const rData = await rRes.json();
      assert.ok(Array.isArray(rData.recommendations));
    });

    it('submits contiguous slot booking and sets status to REQUESTED', async () => {
      const v = store.venues.find((item) => item.ownerId === ownerUser.id && item.verificationStatus === 'VERIFIED') || store.venues[0];
      const court = store.courts.find((c) => c.venueId === v.id && c.isActive);
      assert.ok(court);

      const testDate = '2026-11-25';
      const availRes = await fetch(`${baseUrl}/api/courts/${court.id}/availability?date=${testDate}`);
      const availData = await availRes.json();
      const slots = (availData.slots || []).filter((s) => s.status === 'AVAILABLE');
      assert.ok(slots.length > 0);
      const first = slots[0];

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          venueId: v.id,
          courtId: court.id,
          date: testDate,
          startTime: first.startTime,
          endTime: first.endTime,
          durationHours: 1,
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.booking.status, 'REQUESTED');
      assert.equal(data.booking.paymentStatus, 'PENDING');
      createdBookingId = data.booking.id;
    });

    it('owner approves request -> status transitions to APPROVED', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.booking.status, 'APPROVED');
    });

    it('customer completes payment -> transitions to CONFIRMED + PAID with checkInToken', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/pay`, {
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

    it('owner verifies pass and completes check-in -> transitions to CHECKED_IN', async () => {
      const vRes = await fetch(`${baseUrl}/api/bookings/verify/${checkInToken}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(vRes.status, 200);

      const cRes = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ token: checkInToken }),
      });
      assert.equal(cRes.status, 200);
      const cData = await cRes.json();
      assert.equal(cData.booking.status, 'CHECKED_IN');
      assert.ok(cData.booking.checkedInAt);
    });
  });

  // ─── 2. Owner Demo Flow Clarity ────────────────────────────────────────────
  describe('2. Owner Demo Flow: Dashboard -> Fleet -> Pricing -> Moderation', () => {
    it('fetches isolated owner dashboard with active metrics and schedule', async () => {
      const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.venues));
      assert.ok(Array.isArray(data.courts));
      assert.ok(Array.isArray(data.recentBookings));
    });

    it('fetches owner pricing intelligence with market comparison', async () => {
      const res = await fetch(`${baseUrl}/api/owner/pricing-intelligence`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.pricingIntelligence || data.venues);
    });
  });

  // ─── 3. Admin Demo Flow & Platform Intelligence ────────────────────────────
  describe('3. Admin Demo Flow: Telemetry -> Verification -> User Controls', () => {
    it('returns complete platform intelligence without missing metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence?range=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.platformOverview.totalVenues >= 1);
      assert.ok(data.paymentOverview.totalBookingValue >= 0);
      assert.ok(Array.isArray(data.sportsAnalytics));
    });

    it('allows Admin to verify venue trust status with audit note', async () => {
      const venue = store.venues.find((item) => item.verificationStatus === 'VERIFIED') || store.venues[0];
      const res = await fetch(`${baseUrl}/api/admin/venues/${venue.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'SUSPENDED',
          note: 'Passed Phase 25 demo audit review.',
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.venue.verificationStatus, 'SUSPENDED');

      // Restore back to VERIFIED
      const restoreRes = await fetch(`${baseUrl}/api/admin/venues/${venue.id}/verification`, {
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


});
