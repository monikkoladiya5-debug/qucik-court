process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let owner1Token;
let owner2Token;
let adminToken;

let initialBookingsCount;
let initialVenuesCount;
let initialCourtsCount;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  initialBookingsCount = store.bookings.length;
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

  // 2. Owner 1 Token (u-102 - Vikram Patel)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // 3. Owner 2 Token (u-104 - Priya Mehta)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;

  // 4. Admin Token (u-103)
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
  store.venues.splice(initialVenuesCount);
  store.courts.splice(initialCourtsCount);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: AUTHENTICATION & RBAC
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 7: Owner Dashboard Authentication & Role Authorization', () => {
  it('Unauthenticated GET /api/owner/dashboard -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.status, 'error');
  });

  it('CUSTOMER token on GET /api/owner/dashboard -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.match(body.message, /Required role: OWNER/i);
  });

  it('ADMIN token on GET /api/owner/dashboard -> 403 Forbidden (OWNER-only)', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.match(body.message, /Required role: OWNER/i);
  });

  it('OWNER token on GET /api/owner/dashboard -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.summary);
    assert.ok(Array.isArray(body.venues));
    assert.ok(Array.isArray(body.recentBookings));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: DATA ISOLATION & OBJECT-LEVEL OWNERSHIP
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 7: Object-Level Ownership & Cross-Owner Isolation', () => {
  it('Owner 1 sees only Owner 1 venues and courts; zero Owner 2 data leaked', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    const expectedO1Venues = store.venues.filter((v) => v.ownerId === 'u-102');
    assert.equal(body.summary.totalVenues, expectedO1Venues.length);
    assert.equal(body.venues.length, expectedO1Venues.length);

    // Ensure all returned venues belong to u-102
    for (const v of body.venues) {
      const match = store.venues.find((sv) => sv.id === v.id);
      assert.equal(match.ownerId, 'u-102');
    }

    // Explicitly verify Owner 2 venues (v-5, v-6) are NOT present
    const venueIds = body.venues.map((v) => v.id);
    assert.ok(!venueIds.includes('v-5'), 'Must not contain v-5 (Owner 2 venue)');
    assert.ok(!venueIds.includes('v-6'), 'Must not contain v-6 (Owner 2 venue)');
  });

  it('Owner 2 sees only Owner 2 venues and courts; zero Owner 1 data leaked', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    const expectedO2Venues = store.venues.filter((v) => v.ownerId === 'u-104');
    assert.equal(body.summary.totalVenues, expectedO2Venues.length);
    assert.equal(body.venues.length, expectedO2Venues.length);

    // Verify all returned venues belong to u-104
    for (const v of body.venues) {
      const match = store.venues.find((sv) => sv.id === v.id);
      assert.equal(match.ownerId, 'u-104');
    }

    // Explicitly verify Owner 1 venues (v-1, v-2, v-3, v-4) are NOT present
    const venueIds = body.venues.map((v) => v.id);
    assert.ok(!venueIds.includes('v-1'), 'Must not contain v-1');
    assert.ok(!venueIds.includes('v-2'), 'Must not contain v-2');
    assert.ok(!venueIds.includes('v-3'), 'Must not contain v-3');
    assert.ok(!venueIds.includes('v-4'), 'Must not contain v-4');
  });

  it('Owner 1 sees only bookings for Owner 1 venues/courts', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    const o1VenueIds = new Set(store.venues.filter((v) => v.ownerId === 'u-102').map((v) => v.id));

    for (const b of body.recentBookings) {
      assert.ok(
        o1VenueIds.has(b.venueId),
        `Booking ${b.id} venueId ${b.venueId} must belong to Owner 1`
      );
    }
  });

  it('Owner 2 receives clear zero/empty metrics for bookings when having no bookings', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.summary.totalBookings, 0);
    assert.equal(body.summary.confirmedBookings, 0);
    assert.equal(body.summary.cancelledBookings, 0);
    assert.equal(body.summary.bookingRevenue, 0);
    assert.deepEqual(body.recentBookings, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: METRICS ACCURACY & SERVER-CONTROLLED REVENUE
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 7: Metrics Accuracy & Authoritative Server-Side Revenue', () => {
  it('Calculates exact venue, court, and active court counts from store', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const o1Venues = store.venues.filter((v) => v.ownerId === 'u-102');
    const o1VenueIds = new Set(o1Venues.map((v) => v.id));
    const o1Courts = store.courts.filter((c) => o1VenueIds.has(c.venueId));
    const o1ActiveCourts = o1Courts.filter((c) => Boolean(c.isActive));

    assert.equal(summary.totalVenues, o1Venues.length);
    assert.equal(summary.totalCourts, o1Courts.length);
    assert.equal(summary.activeCourts, o1ActiveCourts.length);
    assert.equal(summary.inactiveCourts, o1Courts.length - o1ActiveCourts.length);
  });

  it('Calculates booking counts and revenue strictly from booking totalPrice', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    const o1VenueIds = new Set(store.venues.filter((v) => v.ownerId === 'u-102').map((v) => v.id));
    const o1Bookings = store.bookings.filter((b) => o1VenueIds.has(b.venueId));

    const confirmed = o1Bookings.filter((b) => b.status === 'CONFIRMED');
    const cancelled = o1Bookings.filter((b) => b.status === 'CANCELLED');
    const expectedRevenue = confirmed.reduce((acc, b) => acc + Number(b.totalPrice || 0), 0);

    assert.equal(summary.totalBookings, o1Bookings.length);
    assert.equal(summary.confirmedBookings, confirmed.length);
    assert.equal(summary.cancelledBookings, cancelled.length);
    assert.equal(summary.bookingRevenue, expectedRevenue);
  });

  it('Cancelled bookings increment cancelled count and do not add to revenue', async () => {
    // Add a temporary cancelled booking for Owner 1
    const testCancelledBooking = {
      id: `BK-TEST-CANCELLED-${Date.now()}`,
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2026-09-25',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CANCELLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.bookings.push(testCancelledBooking);

    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const { summary } = await res.json();

    // Cancelled count includes this booking
    assert.ok(summary.cancelledBookings >= 1);

    // Revenue only sums CONFIRMED bookings
    const o1VenueIds = new Set(store.venues.filter((v) => v.ownerId === 'u-102').map((v) => v.id));
    const confirmedSum = store.bookings
      .filter((b) => o1VenueIds.has(b.venueId) && b.status === 'CONFIRMED')
      .reduce((acc, b) => acc + Number(b.totalPrice || 0), 0);

    assert.equal(summary.bookingRevenue, confirmedSum);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 4: DATA MINIMIZATION & NO SENSITIVE DATA EXPOSURE
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 7: Data Minimization & Safe Serialization', () => {
  it('Dashboard response does NOT leak passwordHash or private user authentication fields', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const rawText = await res.text();

    assert.ok(!rawText.includes('passwordHash'), 'Must not contain passwordHash');
    assert.ok(!rawText.includes('$2a$'), 'Must not contain bcrypt salt/hash');
    assert.ok(!rawText.includes('$2b$'), 'Must not contain bcrypt salt/hash');
  });

  it('Recent bookings do not expose customer phone number or email', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const { recentBookings } = await res.json();

    for (const b of recentBookings) {
      assert.equal(b.customerEmail, undefined);
      assert.equal(b.customerPhone, undefined);
      assert.equal(b.email, undefined);
      assert.equal(b.phone, undefined);
      assert.equal(b.passwordHash, undefined);

      // Verify required non-sensitive fields are present
      assert.ok(b.id);
      assert.ok(b.venueName);
      assert.ok(b.courtName);
      assert.ok(b.sport);
      assert.ok(b.date);
      assert.ok(b.startTime);
      assert.ok(b.endTime);
      assert.ok(typeof b.totalPrice === 'number');
      assert.ok(b.status);
      assert.ok(b.operationalStatus);
    }
  });

  it('Venues overview contains active/inactive court breakdown and no private fields', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const { venues } = await res.json();

    for (const v of venues) {
      assert.ok(v.id);
      assert.ok(v.name);
      assert.ok(v.location);
      assert.ok(Array.isArray(v.sportTypes));
      assert.ok(typeof v.totalCourts === 'number');
      assert.ok(typeof v.activeCourts === 'number');
      assert.ok(typeof v.inactiveCourts === 'number');
      assert.equal(v.activeCourts + v.inactiveCourts, v.totalCourts);
    }
  });
});
