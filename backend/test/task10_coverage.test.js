process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let ownerToken;
let owner2Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customerToken = c1Data.token;

  // Sign up Customer 2 for cross-tenant / IDOR tests
  const c2Email = `cust2_${Date.now()}@quickcourt.com`;
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Customer',
      email: c2Email,
      password: 'customer123',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner 1 (owner@quickcourt.com - u-102)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  ownerToken = o1Data.token;

  // Log in Owner 2 (owner2@quickcourt.com - u-104)
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

// ─── SUITE 1: AUTHENTICATION EDGE CASES ──────────────────────────────────────

describe('Task 10: Authentication Edge Cases', () => {
  it('Missing Authorization header on protected endpoint returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Malformed Authorization header (Basic scheme) returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Empty Bearer token returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer ' },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Malformed/corrupted JWT returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt.token' },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Tampered JWT signed with wrong secret returns 401', async () => {
    const bogusToken = jwt.sign({ sub: 'u-101', role: 'CUSTOMER' }, 'wrong-secret-key');
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${bogusToken}` },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Valid JWT referencing non-existent user id returns 401', async () => {
    const orphanToken = jwt.sign({ sub: 'u-ghost-nonexistent', role: 'CUSTOMER' }, AUTH_CONFIG.jwtSecret);
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${orphanToken}` },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Customer login with wrong password returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@quickcourt.com', password: 'incorrectPassword' }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Customer login with non-existent email returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody_exists@quickcourt.com', password: 'customer123' }),
    });
    assert.equal(res.status, 401);
  });

  it('Customer login with missing email or password returns 400', async () => {
    const res1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@quickcourt.com' }),
    });
    assert.equal(res1.status, 400);

    const res2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'customer123' }),
    });
    assert.equal(res2.status, 400);
  });

  it('Owner login with incorrect password returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/owner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'wrongPassword' }),
    });
    assert.equal(res.status, 401);
  });

  it('Owner login with customer account returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/auth/owner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /not registered as a venue owner/i);
  });

  it('Admin login with invalid verification code returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quickcourt.com',
        password: 'admin123',
        verificationCode: 'WRONG-CODE',
      }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.message, /verification code/i);
  });

  it('Admin login with missing verification code returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quickcourt.com',
        password: 'admin123',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Suspended user account is rejected on login with 403', async () => {
    const testUser = store.users.find((u) => u.id === 'u-101');
    const prevStatus = testUser.status;
    testUser.status = 'suspended';

    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /deactivated/i);
    } finally {
      testUser.status = prevStatus;
    }
  });
});

// ─── SUITE 2: RBAC REGRESSION COVERAGE ACROSS ROLES ──────────────────────────

describe('Task 10: RBAC Regression Coverage Across Roles', () => {
  it('CUSTOMER cannot access Owner Dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('CUSTOMER cannot access Admin Dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('CUSTOMER cannot access Owner-only venue management -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/venues/my/venues`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('CUSTOMER cannot access Owner-only court management -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/courts/my/courts`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('CUSTOMER cannot toggle user status -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u-101/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert.equal(res.status, 403);
  });

  it('OWNER cannot access Admin Dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('OWNER cannot access Customer Profile endpoint -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('OWNER cannot access Customer Loyalty endpoint -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('OWNER cannot access Players directory -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('OWNER cannot access Player Profile endpoint -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/profile`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('ADMIN cannot access Owner Dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('ADMIN cannot access Customer Profile endpoint -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('ADMIN cannot access Customer Loyalty endpoint -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
  });
});

// ─── SUITE 3: OBJECT-LEVEL AUTHORIZATION & CROSS-TENANT ISOLATION ────────────

describe('Task 10: Object-Level Authorization & Cross-Tenant Isolation', () => {
  it('Owner 2 cannot edit Owner 1 venue -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Cross-Tenant Hijack' }),
    });
    assert.equal(res.status, 403);
  });

  it('Owner 2 cannot delete Owner 1 venue -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Owner 2 cannot create a court under Owner 1 venue -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Unauthorized Court',
        sport: 'Badminton',
        pricePerHour: 400,
      }),
    });
    assert.equal(res.status, 403);
  });

  it('Owner 2 cannot edit Owner 1 court -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Court Takeover' }),
    });
    assert.equal(res.status, 403);
  });

  it('Owner 2 cannot delete Owner 1 court -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer 2 cannot view Customer 1 private booking -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/BK-80066572`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer 2 cannot cancel Customer 1 private booking -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/BK-80066572`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 403);
  });
});

// ─── SUITE 4: BOOKING VALIDATION & BUSINESS BOUNDARY HARDENING ────────────────

describe('Task 10: Booking Validation & Business Boundary Hardening', () => {
  it('Booking with non-existent court ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-nonexistent-999',
        date: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 404);
  });

  it('Booking with missing courtId returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Booking with inactive court returns 400', async () => {
    const court = store.courts.find((c) => c.id === 'c-2');
    const prevActive = court.isActive;
    court.isActive = false;

    try {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courtId: 'c-2',
          date: '2026-11-20',
          startTime: '10:00 AM',
          endTime: '11:00 AM',
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /inactive/i);
    } finally {
      court.isActive = prevActive;
    }
  });

  it('Booking with malformed date format returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '20-11-2026',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /YYYY-MM-DD/i);
  });

  it('Booking with invalid calendar date (e.g. Feb 31) returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2027-02-31',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /calendar date/i);
  });

  it('Booking for a past date returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2020-01-01',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /past/i);
  });

  it('Booking with non-hourly minutes (e.g. 10:15 AM) returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-11-20',
        startTime: '10:15 AM',
        endTime: '11:15 AM',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Booking with multi-hour duration (> 1 hr) returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /1-hour/i);
  });

  it('Booking with inverted hours (end before start) returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-11-20',
        startTime: '11:00 AM',
        endTime: '10:00 AM',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('Booking outside court operating hours returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: '2026-11-20',
        startTime: '04:00 AM',
        endTime: '05:00 AM',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /outside operating hours/i);
  });

  it('Server calculates authoritative price ignoring client-injected pricing', async () => {
    const court = store.courts.find((c) => c.id === 'c-1');
    const expectedPrice = Number(court.pricePerHour);

    const testDate = '2026-12-15';

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        totalPrice: 1, // Client attempts to pay 1 rupee
      }),
    });

    if (res.status === 201) {
      const data = await res.json();
      assert.equal(data.booking.totalPrice, expectedPrice);
      assert.notEqual(data.booking.totalPrice, 1);
    } else {
      assert.ok(res.status === 400 || res.status === 409);
    }
  });

  it('Cancelling non-existent booking returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/BK-nonexistent-9999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('Cancelling an already cancelled booking returns 400', async () => {
    let cancelledBooking = store.bookings.find((b) => b.status === 'CANCELLED' && b.userId === 'u-101');
    if (!cancelledBooking) {
      cancelledBooking = {
        id: `BK-TEST-CANCELLED-${Date.now()}`,
        courtId: 'c-1',
        venueId: 'v-1',
        userId: 'u-101',
        date: '2026-11-25',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        totalPrice: 400,
        status: 'CANCELLED',
        createdAt: new Date().toISOString(),
      };
      store.bookings.push(cancelledBooking);
    }

    const res = await fetch(`${baseUrl}/api/bookings/${cancelledBooking.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /already been cancelled/i);
  });
});

// ─── SUITE 5: VENUE & COURT INTEGRITY & AVAILABILITY CHECKS ─────────────────

describe('Task 10: Venue & Court Integrity & Availability Checks', () => {
  it('GET /api/venues/:id with non-existent ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-ghost-999`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('GET /api/courts/:id with non-existent ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-ghost-999`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('Court availability endpoint requires date parameter -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /date/i);
  });

  it('Court availability endpoint rejects malformed date parameter -> 400', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=not-a-valid-date`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /YYYY-MM-DD/i);
  });

  it('Court availability for non-existent court returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-ghost-999/availability?date=2026-11-20`);
    assert.equal(res.status, 404);
  });

  it('Inactive court returns UNAVAILABLE for all slots', async () => {
    const court = store.courts.find((c) => c.id === 'c-3');
    const prevActive = court.isActive;
    court.isActive = false;

    try {
      const res = await fetch(`${baseUrl}/api/courts/c-3/availability?date=2026-11-20`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.ok(data.slots.length > 0);
      assert.ok(data.slots.every((s) => s.status === 'UNAVAILABLE'));
    } finally {
      court.isActive = prevActive;
    }
  });
});
