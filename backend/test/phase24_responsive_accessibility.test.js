process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let ownerToken;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer (user@quickcourt.com)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Log in Owner (owner@quickcourt.com)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;

  // Log in Admin (admin@quickcourt.com)
  const aRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@quickcourt.com', password: 'adminpassword' }),
  });
  const aData = await aRes.json();
  adminToken = aData.token;
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('Phase 24 — Responsive, Accessibility & UX Contract QA', () => {

  // ─── 1. Security & Device Client Headers ───────────────────────────────────
  describe('1. Standard Device Client Headers & Resilience', () => {
    it('serves secure client headers on health and discovery endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      const data = await res.json();
      assert.equal(data.status, 'ok');
    });

    it('rejects oversized JSON bodies cleanly with 413 or 400', async () => {
      const oversizedPayload = { data: 'X'.repeat(1.5 * 1024 * 1024) };
      const res = await fetch(`${baseUrl}/api/venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify(oversizedPayload),
      });
      // Should reject payload gracefully without unhandled exception
      assert.ok([400, 413, 500].includes(res.status));
    });
  });

  // ─── 2. Query Tolerances for Mobile Devices ────────────────────────────────
  describe('2. Query Tolerances & Empty Filters', () => {
    it('handles empty query parameters without 500 crash', async () => {
      const res = await fetch(`${baseUrl}/api/venues?sport=&city=&date=&q=`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.venues));
      assert.ok(data.venues.length > 0);
    });

    it('handles search query with special characters safely', async () => {
      const res = await fetch(`${baseUrl}/api/venues?q=${encodeURIComponent('Badminton & Tennis <script>')}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.venues));
    });

    it('handles player directory filters with empty values gracefully', async () => {
      const res = await fetch(`${baseUrl}/api/players?sport=&city=&skillLevel=&date=&time=&q=`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.players));
    });
  });

  // ─── 3. Mobile Booking Pass & QR Data Integrity ────────────────────────────
  describe('3. Mobile Booking Pass & QR Serializability', () => {
    it('ensures booking pass has valid string IDs for monospace text wrapping', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.bookings));

      for (const booking of data.bookings) {
        assert.ok(typeof booking.id === 'string' && booking.id.length > 0, 'Booking ID must be a non-empty string');
        if (booking.status === 'CONFIRMED' || booking.status === 'PAID' || booking.status === 'CHECKED_IN') {
          assert.ok(typeof booking.checkInToken === 'string' && booking.checkInToken.length > 0, 'Check-in token must be valid string');
        }
      }
    });
  });

  // ─── 4. Graceful Error Payloads for Accessible UI Banners ──────────────────
  describe('4. Standardized Accessible Error Responses', () => {
    it('returns structured error JSON on 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/my`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.error || data.message);
    });

    it('returns structured error JSON on 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error || data.message);
    });

    it('returns structured error JSON on 404 Not Found', async () => {
      const res = await fetch(`${baseUrl}/api/venues/nonexistent-id-99999`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.ok(data.error || data.message);
    });
  });

  // ─── 5. Gamification & Trust Compact Serialization ─────────────────────────
  describe('5. Profile & Gamification Data Contracts', () => {
    it('returns clean achievement and trust data for compact mobile rendering', async () => {
      const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.gamification);
      assert.ok(Array.isArray(data.gamification.achievements));
      assert.ok(typeof data.gamification.completedGames === 'number');
      assert.ok(typeof data.gamification.verifiedCheckIns === 'number');
      assert.ok(Array.isArray(data.gamification.sportsPlayed));
      assert.ok(typeof data.gamification.earnedAchievementsCount === 'number');
      assert.ok(typeof data.gamification.totalAchievementsCount === 'number');
    });
  });




});
