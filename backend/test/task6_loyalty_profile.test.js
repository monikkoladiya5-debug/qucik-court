process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let ownerToken;
let adminToken;

// Capture baseline bookings count for test cleanup
let initialBookingsCount;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  initialBookingsCount = store.bookings.length;

  // 1. Log in Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customerToken = c1Data.token;

  // 2. Sign up Customer 2 for cross-customer isolation tests
  const c2Email = `cust2_${Date.now()}@test.com`;
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Customer',
      email: c2Email,
      password: 'password123',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // 3. Log in Owner (owner@quickcourt.com)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;

  // 4. Log in Admin (admin@quickcourt.com)
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
  // Clean up any test-added bookings
  store.bookings.splice(initialBookingsCount);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: CUSTOMER PROFILE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 6: Profile API Security, Whitelisting & Validation', () => {
  it('Unauthenticated GET /api/profile/me -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Owner GET /api/profile/me -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Admin GET /api/profile/me -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Customer can read own profile -> 200 with safe attributes and dynamic points', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.profile);
    assert.equal(data.profile.email, 'user@quickcourt.com');
    assert.equal(data.profile.role, 'CUSTOMER');
    // Response safety: passwordHash must never be exposed
    assert.equal(data.profile.passwordHash, undefined);
    // Initial loyalty points dynamically calculated (demo customer has 0 completed bookings)
    assert.equal(data.profile.points, 0);
    assert.equal(data.profile.eligibleBookingsCount, 0);
  });

  it('Customer can update allowed fields (name, phone, preferredSports, avatar) -> 200', async () => {
    const updatePayload = {
      name: 'Rahul Sharma Updated',
      phone: '+91 99887 76655',
      preferredSports: ['Tennis', 'Badminton', 'Pickleball'],
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    };

    const res = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(updatePayload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.profile.name, 'Rahul Sharma Updated');
    assert.equal(data.profile.phone, '+91 99887 76655');
    assert.deepEqual(data.profile.preferredSports, ['Tennis', 'Badminton', 'Pickleball']);
    assert.equal(data.profile.avatar, updatePayload.avatar);
    assert.equal(data.profile.passwordHash, undefined);
  });

  it('Privileged and internal fields (role, id, passwordHash, status, points) cannot be changed', async () => {
    const exploitPayload = {
      role: 'ADMIN',
      id: 'u-999',
      userId: 'u-999',
      status: 'banned',
      points: 50000,
      passwordHash: 'injected_hash',
      name: 'Rahul Sharma Secure',
    };

    const res = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(exploitPayload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.profile.role, 'CUSTOMER', 'Role must remain CUSTOMER');
    assert.equal(data.profile.id, 'u-101', 'User ID must remain u-101');
    assert.equal(data.profile.status, 'active', 'Status must remain active');
    assert.equal(data.profile.points, 0, 'Points must remain calculated value (0), ignoring client 50000');
    assert.equal(data.profile.passwordHash, undefined);
  });

  it('Updating customer profile does NOT modify player profile in store.players', async () => {
    // Before update: inspect p-3 (Rahul Sharma)
    const p3Before = store.players.find((p) => p.id === 'p-3');
    assert.ok(p3Before);
    const originalPlayerBio = p3Before.bio;
    const originalPlayerSkill = p3Before.skillLevel;

    // Update customer profile
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        name: 'Rahul Sharma Completely Distinct',
        preferredSports: ['Cricket'],
      }),
    });
    assert.equal(res.status, 200);

    // Verify p-3 in store.players remains untouched
    const p3After = store.players.find((p) => p.id === 'p-3');
    assert.equal(p3After.bio, originalPlayerBio, 'Player bio must not change');
    assert.equal(p3After.skillLevel, originalPlayerSkill, 'Player skillLevel must not change');
    assert.equal(p3After.sport, 'Badminton', 'Player sport must not be overwritten by preferredSports');
  });

  it('Invalid profile values return 400 Bad Request', async () => {
    // Empty / short name
    const r1 = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: ' ' }),
    });
    assert.equal(r1.status, 400);

    // Name too long (>60 chars)
    const r2 = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'A'.repeat(65) }),
    });
    assert.equal(r2.status, 400);

    // Invalid avatar protocol (e.g. javascript: or ftp:)
    const r3 = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ avatar: 'javascript:alert(1)' }),
    });
    assert.equal(r3.status, 400);

    // Invalid avatar URL format
    const r4 = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ avatar: 'not_a_valid_url' }),
    });
    assert.equal(r4.status, 400);

    // Non-string phone
    const r5 = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ phone: 12345 }),
    });
    assert.equal(r5.status, 400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: LOYALTY POINTS CALCULATION & ISOLATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 6: Loyalty Points Calculation & Security', () => {
  it('Unauthenticated GET /api/loyalty/me -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`);
    assert.equal(res.status, 401);
  });

  it('Owner GET /api/loyalty/me -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('Admin GET /api/loyalty/me -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('Initial customer with only future bookings receives 0 points and 0 eligible bookings', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.loyalty.totalPoints, 0);
    assert.equal(data.loyalty.pointsPerBooking, 10);
    assert.equal(data.loyalty.eligibleBookingsCount, 0);
    assert.equal(data.loyalty.upcomingBookingsCount, 2); // BK-80066572 and BK-80066573
    assert.deepEqual(data.loyalty.completedBookingRewards, []);
  });

  it('Completed CONFIRMED booking whose actual end time has passed earns exactly 10 points', async () => {
    // Inject a controlled past confirmed booking for Customer 2
    const testPastBooking = {
      id: `BK-TEST-${Date.now()}-1`,
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2026-01-15', // Definitely in the past
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CONFIRMED',
      createdAt: '2026-01-14T10:00:00.000Z',
      updatedAt: '2026-01-14T10:00:00.000Z',
    };
    store.bookings.push(testPastBooking);

    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.loyalty.totalPoints, 10);
    assert.equal(data.loyalty.eligibleBookingsCount, 1);
    assert.equal(data.loyalty.completedBookingRewards.length, 1);
    assert.equal(data.loyalty.completedBookingRewards[0].bookingId, testPastBooking.id);
    assert.equal(data.loyalty.completedBookingRewards[0].pointsEarned, 10);
    assert.equal(data.loyalty.completedBookingRewards[0].venueName, 'Game Arena');
  });

  it('Future CONFIRMED booking earns 0 points', async () => {
    // Injected booking in the year 2028
    const testFutureBooking = {
      id: `BK-TEST-${Date.now()}-2`,
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2028-12-31',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CONFIRMED',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    };
    store.bookings.push(testFutureBooking);

    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    // Points still 10 (from the previous 1 past booking); future booking adds 0
    assert.equal(data.loyalty.totalPoints, 10);
    assert.equal(data.loyalty.eligibleBookingsCount, 1);
  });

  it('CANCELLED booking earns 0 points even if its date/time is in the past', async () => {
    const testCancelledPastBooking = {
      id: `BK-TEST-${Date.now()}-3`,
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2026-01-10',
      startTime: '02:00 PM',
      endTime: '03:00 PM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CANCELLED',
      createdAt: '2026-01-09T10:00:00.000Z',
      updatedAt: '2026-01-09T10:00:00.000Z',
    };
    store.bookings.push(testCancelledPastBooking);

    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    // Cancelled booking must not earn points
    assert.equal(data.loyalty.totalPoints, 10);
    assert.equal(data.loyalty.eligibleBookingsCount, 1);
  });

  it('Booking whose end time has not passed on the current day earns 0 points', async () => {
    const now = new Date();
    // Calculate a booking time 4 hours in the future; if this crosses midnight, advance the date accordingly
    const futureTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const bookingDateStr = `${futureTime.getFullYear()}-${String(futureTime.getMonth() + 1).padStart(2, '0')}-${String(futureTime.getDate()).padStart(2, '0')}`;

    const futureHour = futureTime.getHours();
    const endFutureHour = (futureHour + 1) % 24;
    const formatHour = (h) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const disp = h % 12 === 0 ? 12 : h % 12;
      return `${String(disp).padStart(2, '0')}:00 ${period}`;
    };

    const testTodayOngoingBooking = {
      id: `BK-TEST-${Date.now()}-4`,
      userId: 'u-101',
      courtId: 'c-2',
      venueId: 'v-1',
      date: bookingDateStr,
      startTime: formatHour(futureHour),
      endTime: formatHour(endFutureHour),
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CONFIRMED',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    store.bookings.push(testTodayOngoingBooking);

    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    // Points still 10; today's future slot contributes 0 points
    assert.equal(data.loyalty.totalPoints, 10);
    assert.equal(data.loyalty.eligibleBookingsCount, 1);
  });

  it('Multiple eligible bookings earn 10 points each without duplicate counting', async () => {
    // Add two more distinct completed bookings
    const pastBooking2 = {
      id: `BK-TEST-${Date.now()}-5`,
      userId: 'u-101',
      courtId: 'c-2',
      venueId: 'v-1',
      date: '2026-02-01',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CONFIRMED',
      createdAt: '2026-01-31T10:00:00.000Z',
      updatedAt: '2026-01-31T10:00:00.000Z',
    };
    const pastBooking3 = {
      id: `BK-TEST-${Date.now()}-6`,
      userId: 'u-101',
      courtId: 'c-4',
      venueId: 'v-2',
      date: '2026-02-15',
      startTime: '04:00 PM',
      endTime: '05:00 PM',
      pricePerHour: 600,
      totalPrice: 600,
      status: 'CONFIRMED',
      createdAt: '2026-02-14T10:00:00.000Z',
      updatedAt: '2026-02-14T10:00:00.000Z',
    };
    store.bookings.push(pastBooking2, pastBooking3);

    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    // Total eligible: 1 + 2 = 3 bookings -> exactly 30 points
    assert.equal(data.loyalty.totalPoints, 30);
    assert.equal(data.loyalty.eligibleBookingsCount, 3);
    assert.equal(data.loyalty.completedBookingRewards.length, 3);
    
    // Check no duplicate IDs in rewards array
    const rewardIds = data.loyalty.completedBookingRewards.map((r) => r.bookingId);
    const uniqueIds = new Set(rewardIds);
    assert.equal(uniqueIds.size, rewardIds.length, 'No duplicate bookings may be counted');
  });

  it('Cross-customer isolation: Customer cannot access another customer bookings or points', async () => {
    // Customer 2 has no past bookings
    const res2 = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    // Customer 2 must see 0 points despite Customer 1 having 30 points
    assert.equal(data2.loyalty.totalPoints, 0);
    assert.equal(data2.loyalty.eligibleBookingsCount, 0);
    assert.deepEqual(data2.loyalty.completedBookingRewards, []);

    // Also verify Customer 2 profile shows 0 points
    const profRes2 = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    const profData2 = await profRes2.json();
    assert.equal(profData2.profile.points, 0);
  });
});
