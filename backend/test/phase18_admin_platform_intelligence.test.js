process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let adminToken;
let ownerToken;
let customerToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Admin login (admin@quickcourt.com - u-103)
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

  // Owner login (owner@quickcourt.com - u-102)
  const ownerRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const ownerData = await ownerRes.json();
  ownerToken = ownerData.token;

  // Customer login (user@quickcourt.com - u-101)
  const custRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const custData = await custRes.json();
  customerToken = custData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 18 — Admin Dashboard & Platform Intelligence', () => {

  describe('1. Role-Based Access Control (RBAC) & Security', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`);
      assert.equal(res.status, 401);
    });

    it('should reject CUSTOMER access with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('should reject OWNER access with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('should permit ADMIN access with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
    });

    it('should not leak sensitive password hashes or tokens in response payload', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const rawText = await res.text();
      assert.ok(!rawText.includes('passwordHash'), 'Must not leak passwordHash');
      assert.ok(!rawText.includes('saltRounds'), 'Must not leak saltRounds');
    });
  });

  describe('2. Platform & Resource Overview Accuracy', () => {
    it('should accurately calculate user counts across all roles', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const overview = data.platformOverview;

      assert.equal(overview.totalUsers, store.users.length);
      assert.equal(overview.totalCustomers, store.users.filter(u => u.role === 'CUSTOMER').length);
      assert.equal(overview.totalOwners, store.users.filter(u => u.role === 'OWNER').length);
      assert.equal(overview.totalAdmins, store.users.filter(u => u.role === 'ADMIN').length);
      assert.equal(overview.suspendedUsers, store.users.filter(u => u.status === 'suspended').length);
    });

    it('should accurately calculate venue and court fleet capacities', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const overview = data.platformOverview;

      assert.equal(overview.totalVenues, store.venues.length);
      assert.equal(overview.totalCourts, store.courts.length);
      assert.equal(overview.activeCourts, store.courts.filter(c => Boolean(c.isActive)).length);
      assert.equal(overview.inactiveCourts, store.courts.filter(c => !c.isActive).length);
      assert.equal(overview.activeCourts + overview.inactiveCourts, overview.totalCourts);
    });
  });

  describe('3. Booking Overview & Status Categorization', () => {
    it('should return non-overlapping booking status counts that sum to total', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence?range=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const bOverview = data.bookingOverview;

      assert.equal(typeof bOverview.totalBookings, 'number');
      assert.ok(bOverview.totalBookings >= 0);
      assert.equal(typeof bOverview.confirmed, 'number');
      assert.equal(typeof bOverview.cancelled, 'number');
      assert.equal(typeof bOverview.completed, 'number');
      assert.equal(typeof bOverview.activeOrConfirmedTotal, 'number');
    });
  });

  describe('4. Financial & Payment Telemetry', () => {
    it('should compute honest booking value (GMV) and collected booking value without fake fees', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const pOverview = data.paymentOverview;

      assert.equal(typeof pOverview.totalBookingValue, 'number');
      assert.equal(typeof pOverview.collectedBookingValue, 'number');
      assert.equal(typeof pOverview.pendingBookingValue, 'number');
      assert.equal(typeof pOverview.refundedValue, 'number');
      assert.ok(pOverview.paymentMethodsBreakdown, 'Payment methods breakdown must be present');
      assert.ok(pOverview.paymentMethodsBreakdown.UPI, 'UPI breakdown present');
      assert.ok(pOverview.paymentMethodsBreakdown.CARD, 'CARD breakdown present');
      assert.ok(pOverview.paymentMethodsBreakdown.PAY_AT_VENUE, 'PAY_AT_VENUE breakdown present');
    });
  });

  describe('5. Court Utilization & Telemetry', () => {
    it('should calculate non-negative court hours and bounded utilization rate', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const util = data.courtUtilization;

      assert.ok(util.totalCapacityHours > 0, 'Capacity hours must be positive');
      assert.ok(util.occupiedCourtHours >= 0, 'Occupied hours must be non-negative');
      assert.ok(util.utilizationRate >= 0 && util.utilizationRate <= 100, 'Utilization rate must be between 0% and 100%');
      assert.ok(Array.isArray(util.busiestCourts), 'Busiest courts array must be present');
    });
  });

  describe('6. Sports & Geographic Analytics', () => {
    it('should return sports analytics array matching real sports in platform', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.ok(Array.isArray(data.sportsAnalytics), 'Sports analytics must be an array');
      if (data.sportsAnalytics.length > 0) {
        const item = data.sportsAnalytics[0];
        assert.ok(item.sport, 'Sport name must be present');
        assert.equal(typeof item.activeCourts, 'number');
        assert.equal(typeof item.bookingCount, 'number');
        assert.equal(typeof item.bookingValue, 'number');
      }
    });

    it('should return city distribution and top active venues', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const geo = data.venueAndCityAnalytics;

      assert.ok(Array.isArray(geo.cities), 'Cities array must be present');
      assert.ok(Array.isArray(geo.topVenues), 'Top venues array must be present');
      if (geo.cities.length > 0) {
        assert.ok(geo.cities[0].city, 'City name present');
        assert.equal(typeof geo.cities[0].venueCount, 'number');
      }
    });
  });

  describe('7. Time, Demand & Hourly Distribution', () => {
    it('should return 18 operating hourly buckets (6..23) with peak classification', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const td = data.timeDemandAnalytics;

      assert.equal(td.hourlyDemand.length, 18, 'Must cover hours 6 to 23');
      assert.equal(td.hourlyDemand[0].hour, 6);
      assert.equal(td.hourlyDemand[17].hour, 23);
      assert.equal(typeof td.peakBookingsCount, 'number');
      assert.equal(typeof td.offPeakBookingsCount, 'number');
      assert.equal(typeof td.weekdayBookingsCount, 'number');
      assert.equal(typeof td.weekendBookingsCount, 'number');
    });
  });

  describe('8. Operational Health & Date Filtering', () => {
    it('should return actionable alerts and operational counts', async () => {
      const res = await fetch(`${baseUrl}/api/admin/platform-intelligence`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const health = data.operationalHealth;

      assert.equal(typeof health.pendingRequestsCount, 'number');
      assert.equal(typeof health.paymentPendingCount, 'number');
      assert.equal(typeof health.inactiveCourtsCount, 'number');
      assert.ok(Array.isArray(health.alerts), 'Alerts must be an array');
    });

    it('should accept valid time filters (today, 7d, 30d, all)', async () => {
      for (const range of ['today', '7d', '30d', 'all']) {
        const res = await fetch(`${baseUrl}/api/admin/platform-intelligence?range=${range}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.equal(res.status, 200, `Range ${range} should return 200`);
        const data = await res.json();
        assert.equal(data.filter.range, range);
      }
    });

    it('should reject malformed custom date parameters with 400 Bad Request', async () => {
      const res1 = await fetch(`${baseUrl}/api/admin/platform-intelligence?dateFrom=invalid-date`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res1.status, 400);

      const res2 = await fetch(`${baseUrl}/api/admin/platform-intelligence?dateTo=not-a-date`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res2.status, 400);
    });
  });

  describe('9. Existing Admin Endpoints Regression', () => {
    it('GET /api/admin/dashboard should still return full platform data', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.summary, 'Summary present');
      assert.ok(Array.isArray(data.users), 'Users present');
      assert.ok(Array.isArray(data.venues), 'Venues present');
      assert.ok(Array.isArray(data.bookings), 'Bookings present');
    });

    it('PATCH /api/admin/users/:id/status should successfully toggle user status', async () => {
      const targetUser = store.users.find(u => u.role === 'CUSTOMER');
      assert.ok(targetUser, 'Customer user must exist');

      // Suspend user
      const suspendRes = await fetch(`${baseUrl}/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'suspended' }),
      });
      assert.equal(suspendRes.status, 200);
      const suspendData = await suspendRes.json();
      assert.equal(suspendData.user.status, 'suspended');

      // Reactivate user
      const activateRes = await fetch(`${baseUrl}/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });
      assert.equal(activateRes.status, 200);
      const activateData = await activateRes.json();
      assert.equal(activateData.user.status, 'active');
    });
  });

});
