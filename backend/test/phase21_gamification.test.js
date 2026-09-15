process.env.NODE_ENV = 'test';

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store, calculatePlayerGamification, calculatePlayerTrust } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let owner1Token;
let adminToken;
let customerUser;
let customer2User;

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
  customerUser = cData.user;

  // Sign up Customer 2 for clean test state
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tanvi Shah', email: 'tanvi.gamification@example.com', password: 'customer123' }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;
  customer2User = c2Data.user;

  // Log in Owner 1
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Admin
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

describe('Phase 21: Limited Gamification Tests', () => {

  // ── Authentication & RBAC ───────────────────────────────────────────────────

  it('1. unauthenticated request to /api/players/me/gamification returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`);
    assert.equal(res.status, 401);
  });

  it('2. authenticated CUSTOMER can access /api/players/me/gamification', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.gamification);
    assert.ok(Array.isArray(body.gamification.achievements));
  });

  it('3. OWNER role is rejected with 403 on /api/players/me/gamification', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('4. ADMIN role is rejected with 403 on /api/players/me/gamification', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
  });

  // ── Achievement Calculations ────────────────────────────────────────────────

  it('5. first completed booking earns First Game badge', async () => {
    const testUserId = `u-test-first-game-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'First Gamer', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-TEST-1-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      venueId: 'v-1',
      status: 'COMPLETED',
      date: '2026-09-01',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 1);
    const firstGameAch = gam.achievements.find((a) => a.id === 'first-game');
    assert.ok(firstGameAch);
    assert.equal(firstGameAch.earned, true);
  });

  it('6. fewer than 5 completed bookings does not earn Regular Player', async () => {
    const testUserId = `u-test-reg-4-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Four Gamer', role: 'CUSTOMER' });
    for (let i = 0; i < 4; i++) {
      store.bookings.push({
        id: `BK-TEST-4-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        venueId: 'v-1',
        status: 'COMPLETED',
        date: '2026-09-01',
      });
    }

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 4);
    const regAch = gam.achievements.find((a) => a.id === 'regular-player');
    assert.ok(regAch);
    assert.equal(regAch.earned, false);
  });

  it('7. 5 completed bookings earns Regular Player', async () => {
    const testUserId = `u-test-reg-5-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Five Gamer', role: 'CUSTOMER' });
    for (let i = 0; i < 5; i++) {
      store.bookings.push({
        id: `BK-TEST-5-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        venueId: 'v-1',
        status: 'COMPLETED',
        date: '2026-09-01',
      });
    }

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 5);
    const regAch = gam.achievements.find((a) => a.id === 'regular-player');
    assert.ok(regAch);
    assert.equal(regAch.earned, true);
  });

  it('8. verified check-ins are correctly calculated from checkedInAt and CHECKED_IN/COMPLETED states', async () => {
    const testUserId = `u-test-checkin-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'CheckIn User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-CHK-1-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'CHECKED_IN',
      checkedInAt: '2026-09-01T08:05:00.000Z',
    });
    store.bookings.push({
      id: `BK-CHK-2-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'COMPLETED',
      checkedInAt: '2026-09-02T08:05:00.000Z',
    });
    store.bookings.push({
      id: `BK-CHK-3-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'CONFIRMED', // Not checked in
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.verifiedCheckIns, 2);
  });

  it('9. 5 verified check-ins earns Check-in Pro badge', async () => {
    const testUserId = `u-test-checkin-5-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Checkin Pro User', role: 'CUSTOMER' });
    for (let i = 0; i < 5; i++) {
      store.bookings.push({
        id: `BK-PRO-CHK-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        status: 'CHECKED_IN',
        checkedInAt: `2026-09-0${i + 1}T08:00:00.000Z`,
      });
    }

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.verifiedCheckIns, 5);
    const proAch = gam.achievements.find((a) => a.id === 'checkin-pro');
    assert.ok(proAch);
    assert.equal(proAch.earned, true);
  });

  it('10. 3 distinct completed sports earns Multi-Sport badge', async () => {
    const testUserId = `u-test-multisport-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Tri Athlete', role: 'CUSTOMER' });
    // Court 1 = Badminton, Court 4 = Tennis, Court 5 = Football
    store.bookings.push({
      id: `BK-MS-1-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1', // Badminton
      status: 'COMPLETED',
    });
    store.bookings.push({
      id: `BK-MS-2-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-4', // Tennis
      status: 'COMPLETED',
    });
    store.bookings.push({
      id: `BK-MS-3-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-5', // Football
      status: 'COMPLETED',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.sportsCount, 3);
    assert.ok(gam.sportsPlayed.includes('Badminton'));
    assert.ok(gam.sportsPlayed.includes('Tennis'));
    assert.ok(gam.sportsPlayed.includes('Football'));
    const msAch = gam.achievements.find((a) => a.id === 'multi-sport');
    assert.ok(msAch);
    assert.equal(msAch.earned, true);
  });

  it('11. fewer than 3 distinct sports does not earn Multi-Sport badge', async () => {
    const testUserId = `u-test-twosport-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Duo Athlete', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-DS-1-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1', // Badminton
      status: 'COMPLETED',
    });
    store.bookings.push({
      id: `BK-DS-2-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-2', // Badminton
      status: 'COMPLETED',
    });
    store.bookings.push({
      id: `BK-DS-3-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-4', // Tennis
      status: 'COMPLETED',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.sportsCount, 2);
    const msAch = gam.achievements.find((a) => a.id === 'multi-sport');
    assert.ok(msAch);
    assert.equal(msAch.earned, false);
  });

  it('12. reliable player criteria uses authoritative trust/check-in data and zero no-shows (earned only when genuinely reliable with 5+ games)', async () => {
    const testUserId = `u-test-reliable-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Reliable User', role: 'CUSTOMER' });
    for (let i = 0; i < 5; i++) {
      store.bookings.push({
        id: `BK-REL-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        status: 'COMPLETED',
        date: `2026-09-0${i + 1}`,
      });
    }

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 5);
    assert.equal(gam.noShows, 0);
    assert.equal(gam.reliabilityScore, 'Reliable Player');
    const relAch = gam.achievements.find((a) => a.id === 'reliable-player');
    assert.ok(relAch);
    assert.equal(relAch.earned, true);
  });

  it('12b. player with insufficient history (e.g. 1 completed game) does NOT earn Reliable Player badge', async () => {
    const testUserId = `u-test-insuff-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Insufficient History User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-INSUFF-1-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'COMPLETED',
      date: '2026-09-01',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 1);
    assert.equal(gam.noShows, 0);
    assert.equal(gam.reliabilityScore, 'Active Player'); // Insufficient history for Reliable Player label
    const relAch = gam.achievements.find((a) => a.id === 'reliable-player');
    assert.ok(relAch);
    assert.equal(relAch.earned, false);
  });

  it('13. no-show behavior prevents earning Reliable Player badge even with 5+ completed games', async () => {
    const testUserId = `u-test-noshow-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'No Show User', role: 'CUSTOMER' });
    // 5 completed games
    for (let i = 0; i < 5; i++) {
      store.bookings.push({
        id: `BK-NS-COMP-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        status: 'COMPLETED',
        date: `2026-08-0${i + 1}`,
      });
    }
    // 1 past confirmed booking with no check-in -> no-show
    store.bookings.push({
      id: `BK-NS-2-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'CONFIRMED',
      date: '2026-01-01', // past date
      endTime: '09:00 AM',
      checkedInAt: null,
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 5);
    assert.ok(gam.noShows > 0);
    const relAch = gam.achievements.find((a) => a.id === 'reliable-player');
    assert.ok(relAch);
    assert.equal(relAch.earned, false);
  });

  // ── Integrity & Non-Completed Booking Tests ─────────────────────────────────

  it('14. cancelled bookings do not count towards completed games or badges', async () => {
    const testUserId = `u-test-cancelled-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Cancelled User', role: 'CUSTOMER' });
    for (let i = 0; i < 5; i++) {
      store.bookings.push({
        id: `BK-CANC-${i}-${Date.now()}`,
        userId: testUserId,
        courtId: 'c-1',
        status: 'CANCELLED',
      });
    }

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 0);
    const firstGame = gam.achievements.find((a) => a.id === 'first-game');
    assert.equal(firstGame.earned, false);
  });

  it('15. rejected bookings do not count towards completed games or badges', async () => {
    const testUserId = `u-test-rejected-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Rejected User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-REJ-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'REJECTED',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 0);
  });

  it('16. requested bookings do not count towards completed games or badges', async () => {
    const testUserId = `u-test-requested-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Requested User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-REQ-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'REQUESTED',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 0);
  });

  it('17. payment-pending bookings do not count towards completed games or badges', async () => {
    const testUserId = `u-test-paypend-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Payment Pending User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-PP-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'PAYMENT_PENDING',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 0);
  });

  it('18. uncompleted active bookings (CONFIRMED/PAID without check-in/completion) do not count towards completed games', async () => {
    const testUserId = `u-test-uncompleted-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Active User', role: 'CUSTOMER' });
    store.bookings.push({
      id: `BK-CONF-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'CONFIRMED',
      date: '2026-12-31',
    });
    store.bookings.push({
      id: `BK-PAID-${Date.now()}`,
      userId: testUserId,
      courtId: 'c-1',
      status: 'PAID',
      date: '2026-12-31',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.completedGames, 0);
  });

  // ── Privacy & Data Minimization ─────────────────────────────────────────────

  it('19. gamification response contains no email', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const body = await res.json();
    assert.equal(body.gamification.email, undefined);
    const jsonString = JSON.stringify(body);
    assert.equal(jsonString.includes(customerUser.email), false);
  });

  it('20. gamification response contains no phone', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const body = await res.json();
    assert.equal(body.gamification.phone, undefined);
  });

  it('21. gamification response contains no passwordHash', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const body = await res.json();
    assert.equal(body.gamification.passwordHash, undefined);
    const jsonString = JSON.stringify(body);
    assert.equal(jsonString.includes('passwordHash'), false);
  });

  it('22. gamification response contains no internal user ID', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const body = await res.json();
    assert.equal(body.gamification.userId, undefined);
  });

  it('23. gamification response contains no booking token', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const jsonString = JSON.stringify(await res.json());
    assert.equal(jsonString.includes('checkInToken'), false);
    assert.equal(jsonString.includes('CHK-'), false);
  });

  it('24. gamification response contains no payment information', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/gamification`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const jsonString = JSON.stringify(await res.json());
    assert.equal(jsonString.includes('paymentMethod'), false);
    assert.equal(jsonString.includes('paymentStatus'), false);
  });

  // ── Regressions & Cross-Phase Integrations ──────────────────────────────────

  it('25. Find Players discovery endpoint still works and includes safe badges', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.players));
    assert.ok(body.players.length > 0);
    const sample = body.players[0];
    assert.ok(sample.id);
    assert.ok(sample.name);
    assert.ok(sample.trustSummary);
    // Badges array should exist on player discovery
    assert.ok(Array.isArray(sample.badges));
  });

  it('26. player trust calculation and label assignment still works', async () => {
    const player = store.players[0];
    const res = await fetch(`${baseUrl}/api/players/${player.id}/trust`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.trustSummary);
    assert.ok(body.trustSummary.trustLabel);
  });

  it('27. player blocks and self-exclusion still work', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/blocks`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.blocks));
  });

  it('28. booking lifecycle and multi-hour availability still work', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-09-30`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.slots));
  });

  it('29. Phase 20 reviews and rating aggregation still work', async () => {
    const res = await fetch(`${baseUrl}/api/reviews/venue/v-1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.summary);
    assert.equal(typeof body.summary.averageRating, 'number');
    assert.equal(typeof body.summary.reviewCount, 'number');
  });

  it('30. Phase 19 venue trust and verification still work', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.venue.id, 'v-1');
    assert.ok(body.venue.isVerified !== undefined);
  });

  it('31. Admin dashboard includes totalAchievementsEarned metric', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.summary.totalAchievementsEarned, 'number');
  });

  it('32. Match Player badge is earned when user has accepted match invites', async () => {
    const testUserId = `u-test-matchplayer-${Date.now()}`;
    store.users.push({ id: testUserId, name: 'Matchmaker User', role: 'CUSTOMER' });
    if (!store.matchInvites) store.matchInvites = [];
    store.matchInvites.push({
      id: `inv-test-${Date.now()}`,
      senderId: testUserId,
      receiverPlayerId: 'p-1',
      status: 'ACCEPTED',
    });

    const gam = calculatePlayerGamification(testUserId);
    assert.equal(gam.acceptedMatchInvites, 1);
    const matchAch = gam.achievements.find((a) => a.id === 'match-player');
    assert.ok(matchAch);
    assert.equal(matchAch.earned, true);
  });
});
