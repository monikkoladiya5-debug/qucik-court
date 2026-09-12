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

let initialBookingsCount;
let initialUsersCount;
let initialVenuesCount;
let initialCourtsCount;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  initialBookingsCount = store.bookings.length;
  initialUsersCount = store.users.length;
  initialVenuesCount = store.venues.length;
  initialCourtsCount = store.courts.length;

  // 1. Customer Token (u-101)
  const custRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const custData = await custRes.json();
  customerToken = custData.token;

  // 2. Owner Token (u-102)
  const ownerRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const ownerData = await ownerRes.json();
  ownerToken = ownerData.token;

  // 3. Admin Token (u-103)
  const adminRes = await fetch(`${baseUrl}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@quickcourt.com',
      password: 'admin123',
      verificationCode: 'QC-ADMIN-2026',
    }),
  });
  const adminData = await adminRes.json();
  adminToken = adminData.token;
});

after(async () => {
  store.bookings.splice(initialBookingsCount);
  store.users.splice(initialUsersCount);
  store.venues.splice(initialVenuesCount);
  store.courts.splice(initialCourtsCount);

  // Reset demo user status if modified
  const demoUser = store.users.find((u) => u.id === 'u-101');
  if (demoUser) demoUser.status = 'active';

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: AUTHENTICATION & RBAC
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 8: Admin Dashboard Authentication & Role Authorization', () => {
  it('Unauthenticated GET /api/admin/dashboard -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.status, 'error');
  });

  it('CUSTOMER token on GET /api/admin/dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.match(body.message, /Required role: ADMIN/i);
  });

  it('OWNER token on GET /api/admin/dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.match(body.message, /Required role: ADMIN/i);
  });

  it('ADMIN token on GET /api/admin/dashboard -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.summary);
    assert.ok(Array.isArray(body.users));
    assert.ok(Array.isArray(body.venues));
    assert.ok(Array.isArray(body.bookings));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: METRICS & SERVER-CONTROLLED REVENUE
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 8: Admin Platform Metrics & Revenue Calculations', () => {
  it('Calculates exact user counts across all roles', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const customers = store.users.filter((u) => u.role === 'CUSTOMER');
    const owners = store.users.filter((u) => u.role === 'OWNER');
    const admins = store.users.filter((u) => u.role === 'ADMIN');

    assert.equal(summary.totalUsers, store.users.length);
    assert.equal(summary.totalCustomers, customers.length);
    assert.equal(summary.totalOwners, owners.length);
    assert.equal(summary.totalAdmins, admins.length);
  });

  it('Calculates exact venue and court metrics', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const activeCourts = store.courts.filter((c) => Boolean(c.isActive)).length;

    assert.equal(summary.totalVenues, store.venues.length);
    assert.equal(summary.totalCourts, store.courts.length);
    assert.equal(summary.activeCourts, activeCourts);
    assert.equal(summary.inactiveCourts, store.courts.length - activeCourts);
  });

  it('Revenue is authoritatively calculated strictly from CONFIRMED bookings; CANCELLED contribute ₹0', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const confirmed = store.bookings.filter((b) => b.status === 'CONFIRMED');
    const cancelled = store.bookings.filter((b) => b.status === 'CANCELLED');
    const expectedRevenue = confirmed.reduce((acc, b) => acc + Number(b.totalPrice || 0), 0);

    assert.equal(summary.totalBookings, store.bookings.length);
    assert.equal(summary.confirmedBookings, confirmed.length);
    assert.equal(summary.cancelledBookings, cancelled.length);
    assert.equal(summary.bookingRevenue, expectedRevenue);
  });

  it('Adding a cancelled booking increments cancelled count without adding to revenue', async () => {
    const testCancelled = {
      id: `BK-ADMIN-TEST-CANC-${Date.now()}`,
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2026-09-30',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CANCELLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.bookings.push(testCancelled);

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const confirmedSum = store.bookings
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((acc, b) => acc + Number(b.totalPrice || 0), 0);

    assert.equal(summary.bookingRevenue, confirmedSum);
    assert.ok(summary.cancelledBookings >= 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: DATA MINIMIZATION & NO SENSITIVE DATA EXPOSURE
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 8: Data Minimization & Safe Serialization', () => {
  it('Dashboard response does NOT leak passwordHash anywhere in the payload', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const rawText = await res.text();

    assert.ok(!rawText.includes('passwordHash'), 'Must not contain passwordHash');
    assert.ok(!rawText.includes('$2a$'), 'Must not contain bcrypt salt/hash');
    assert.ok(!rawText.includes('$2b$'), 'Must not contain bcrypt salt/hash');
  });

  it('Users list returns safe public profiles with required attributes', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { users } = await res.json();

    assert.equal(users.length, store.users.length);
    for (const u of users) {
      assert.ok(u.id);
      assert.ok(u.name);
      assert.ok(u.email);
      assert.ok(u.role);
      assert.ok(u.status);
      assert.equal(u.passwordHash, undefined);
    }
  });

  it('Venues list enriches owner name and email safely', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { venues } = await res.json();

    assert.equal(venues.length, store.venues.length);
    for (const v of venues) {
      assert.ok(v.id);
      assert.ok(v.name);
      assert.ok(v.ownerName);
      assert.ok(typeof v.totalCourts === 'number');
      assert.ok(typeof v.activeCourts === 'number');
    }
  });

  it('Bookings list enriches customer name, court name, and operational status safely', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { bookings } = await res.json();

    for (const b of bookings) {
      assert.ok(b.id);
      assert.ok(b.customerName);
      assert.ok(b.venueName);
      assert.ok(b.courtName);
      assert.ok(b.date);
      assert.ok(b.startTime);
      assert.ok(b.endTime);
      assert.ok(typeof b.totalPrice === 'number');
      assert.ok(b.status);
      assert.ok(['UPCOMING', 'COMPLETED', 'CANCELLED'].includes(b.operationalStatus));
      assert.equal(b.passwordHash, undefined);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 4: ADMIN MANAGEMENT CONTROLS (PATCH /api/admin/users/:id/status)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 8: Admin User Status Management', () => {
  it('Unauthenticated PATCH /api/admin/users/:id/status -> 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 401);
  });

  it('CUSTOMER token on PATCH /api/admin/users/:id/status -> 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 403);
  });

  it('OWNER token on PATCH /api/admin/users/:id/status -> 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 403);
  });

  it('Non-existent user on PATCH /api/admin/users/:id/status -> 404', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-999999/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 404);
  });

  it('Admin suspending themselves -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-103/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /cannot change their own account status/i);
  });

  it('Invalid status value on PATCH /api/admin/users/:id/status -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'banned_permanently' }),
    });
    assert.equal(res.status, 400);
  });

  it('Admin can toggle customer status from active to suspended and back', async () => {
    // 1. Suspend u-101
    const res1 = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.status, 'ok');
    assert.equal(body1.user.status, 'suspended');

    const inStoreUser = store.users.find((u) => u.id === 'u-101');
    assert.equal(inStoreUser.status, 'suspended');

    // 2. Reactivate u-101
    const res2 = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.status, 'ok');
    assert.equal(body2.user.status, 'active');
    assert.equal(inStoreUser.status, 'active');
  });

  it('PATCH /api/admin/users/:id/status ignores role and privileged field manipulation attempts', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'active',
        role: 'ADMIN',
        email: 'hacked@admin.com',
        points: 99999,
        password: 'newpassword',
      }),
    });
    assert.equal(res.status, 200);
    const targetUser = store.users.find((u) => u.id === 'u-101');

    assert.equal(targetUser.role, 'CUSTOMER');
    assert.equal(targetUser.email, 'user@quickcourt.com');
  });
});
