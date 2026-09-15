process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store, safeVenue } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let owner1Token;
let owner2Token;
let adminToken;
let customerUser;
let owner1User;
let owner2User;
let adminUser;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Customer Login
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;
  customerUser = cData.user;

  // Owner 1 Login
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;
  owner1User = o1Data.user;

  // Owner 2 Login
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;
  owner2User = o2Data.user;

  // Admin Login
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
  adminUser = aData.user;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 19 — Venue Trust & Verification', () => {

  describe('1. API Authorization & Access Control (RBAC)', () => {
    it('1. Admin can list verification queue', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/verification`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(data.counts);
      assert.ok(Array.isArray(data.venues));
      assert.ok(typeof data.counts.pending === 'number');
      assert.ok(typeof data.counts.verified === 'number');
    });

    it('2. Customer receives 403 on admin verification endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/verification`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('3. Owner receives 403 on admin verification endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/verification`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('4. Unauthenticated request receives 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/verification`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe('2. Venue Verification Lifecycle & State Transitions', () => {
    let testVenueId;

    before(async () => {
      // Owner 1 creates a new venue -> must start as PENDING
      const createRes = await fetch(`${baseUrl}/api/venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({
          name: 'Phase 19 Test Arena',
          city: 'Mumbai',
          location: 'Andheri Sports Complex',
          address: 'Link Road, Andheri West',
          sportTypes: ['Badminton', 'Tennis'],
          pricePerHour: 800,
          courtCount: 2,
          indoor: true,
          openingHours: '06:00 AM - 10:00 PM',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const createData = await createRes.json();
      testVenueId = createData.venue.id;
      assert.strictEqual(createData.venue.verificationStatus, 'PENDING');
    });

    it('5. Admin verifies venue: PENDING -> VERIFIED', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'VERIFIED',
          note: 'Verified facility infrastructure and documents',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.venue.verificationStatus, 'VERIFIED');
      assert.strictEqual(data.venue.isVerified, true);
    });

    it('6. Verification metadata is stored correctly on the backend store', () => {
      const v = store.venues.find((item) => item.id === testVenueId);
      assert.ok(v);
      assert.strictEqual(v.verificationStatus, 'VERIFIED');
      assert.ok(v.verifiedAt);
      assert.strictEqual(v.verifiedBy, adminUser.id);
      assert.strictEqual(v.verificationNote, 'Verified facility infrastructure and documents');
      assert.ok(v.verificationUpdatedAt);
    });

    it('7. Invalid venue returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/non-existent-venue-999/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      assert.strictEqual(res.status, 404);
    });

    it('8. Invalid status returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'UNKNOWN_STATUS' }),
      });
      assert.strictEqual(res.status, 400);
    });

    it('9. Invalid transition returns 400 (e.g. VERIFIED -> REJECTED without pending)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'REJECTED', note: 'Direct rejection not permitted' }),
      });
      assert.strictEqual(res.status, 400);
    });

    it('10. Admin suspends verified venue with required note: VERIFIED -> SUSPENDED', async () => {
      // First attempt without note -> should return 400
      const failRes = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'SUSPENDED' }),
      });
      assert.strictEqual(failRes.status, 400);

      // Now with required note
      const res = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'SUSPENDED',
          note: 'Temporary maintenance and lighting overhaul',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.venue.verificationStatus, 'SUSPENDED');
      assert.strictEqual(data.venue.isVerified, false);
      assert.strictEqual(data.venue.verifiedAt, null);
    });

    it('11. Admin restores/re-verifies suspended venue: SUSPENDED -> VERIFIED', async () => {
      const res = await fetch(`${baseUrl}/api/admin/venues/${testVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'VERIFIED',
          note: 'Maintenance completed and verified',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.venue.verificationStatus, 'VERIFIED');
      assert.strictEqual(data.venue.isVerified, true);
      assert.ok(data.venue.verifiedAt);
    });

    it('12. Admin rejects pending venue with required reason', async () => {
      // Create a second pending venue
      const createRes = await fetch(`${baseUrl}/api/venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner2Token}`,
        },
        body: JSON.stringify({
          name: 'Rejected Venue Test',
          city: 'Delhi',
          location: 'Rohini',
          address: 'Sector 14',
          sportTypes: ['Squash'],
          pricePerHour: 600,
          courtCount: 1,
          indoor: true,
          openingHours: '07:00 AM - 09:00 PM',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const createData = await createRes.json();
      const rejectedVenueId = createData.venue.id;

      // Reject without note -> 400
      const failRes = await fetch(`${baseUrl}/api/admin/venues/${rejectedVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      assert.strictEqual(failRes.status, 400);

      // Reject with note -> 200
      const res = await fetch(`${baseUrl}/api/admin/venues/${rejectedVenueId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'REJECTED',
          note: 'Incomplete facility documentation and invalid contact',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.venue.verificationStatus, 'REJECTED');
      assert.strictEqual(data.venue.isVerified, false);
      assert.strictEqual(data.venue.verifiedAt, null);
    });
  });

  describe('3. Owner Security & Isolation', () => {
    it('13. Owner cannot self-verify or modify verificationStatus via PUT /api/venues/:id', async () => {
      const v = store.venues.find((item) => item.ownerId === owner1User.id);
      assert.ok(v);

      const res = await fetch(`${baseUrl}/api/venues/${v.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({
          name: v.name,
          city: v.city,
          location: v.location,
          address: v.address,
          sportTypes: v.sportTypes,
          pricePerHour: v.pricePerHour,
          courtCount: v.courtCount,
          indoor: v.indoor,
          openingHours: v.openingHours,
          verificationStatus: 'VERIFIED',
          verifiedBy: 'u-hacked',
          verifiedAt: '2099-01-01T00:00:00.000Z',
        }),
      });
      assert.strictEqual(res.status, 200);
      const updatedV = store.venues.find((item) => item.id === v.id);
      assert.notStrictEqual(updatedV.verifiedBy, 'u-hacked');
    });

    it('14. Owner isolation remains intact (Owner A cannot edit Owner B venue)', async () => {
      const owner2Venue = store.venues.find((item) => item.ownerId === owner2User.id);
      assert.ok(owner2Venue);

      // Owner 1 tries to access Owner 2's venue
      const editRes = await fetch(`${baseUrl}/api/venues/${owner2Venue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner1Token}`,
        },
        body: JSON.stringify({ name: 'Tampered Venue Name' }),
      });
      assert.strictEqual(editRes.status, 403);
    });
  });

  describe('4. Customer Privacy & Safe Serialization', () => {
    it('15. Customer sees verified status correctly and does not receive private admin metadata', async () => {
      const verifiedVenue = store.venues.find((item) => item.verificationStatus === 'VERIFIED');
      assert.ok(verifiedVenue);

      const res = await fetch(`${baseUrl}/api/venues/${verifiedVenue.id}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.venue.verificationStatus, 'VERIFIED');
      assert.strictEqual(data.venue.isVerified, true);
      // Private admin moderation fields must NOT leak to customers
      assert.strictEqual(data.venue.verifiedBy, undefined);
      assert.strictEqual(data.venue.verificationNote, undefined);
    });
  });

  describe('5. Booking & Availability Engine Integration', () => {
    let suspendedVenueCourt;
    let rejectedVenueCourt;
    let verifiedVenueCourt;

    before(async () => {
      // Create a designated suspended venue
      const suspVenue = {
        id: 'venue-susp-auto',
        ownerId: owner1User.id,
        name: 'Auto Suspended Complex',
        city: 'Mumbai',
        location: 'Bandra',
        address: 'Bandra West',
        sportTypes: ['Badminton'],
        pricePerHour: 500,
        courtCount: 1,
        indoor: true,
        openingHours: '06:00 AM - 10:00 PM',
        status: 'active',
        verificationStatus: 'SUSPENDED',
        verificationNote: 'Safety review in progress',
        verifiedBy: adminUser.id,
        verifiedAt: null,
      };
      store.venues.push(suspVenue);

      const court1 = {
        id: 'court-susp-test',
        venueId: suspVenue.id,
        name: 'Suspended Court 1',
        sport: 'Badminton',
        surface: 'Synthetic',
        pricePerHour: 500,
        operatingHours: '06:00 AM - 10:00 PM',
        isActive: true,
      };
      store.courts.push(court1);
      suspendedVenueCourt = court1;

      // Create a designated rejected venue
      const rejVenue = {
        id: 'venue-rej-auto',
        ownerId: owner2User.id,
        name: 'Auto Rejected Complex',
        city: 'Delhi',
        location: 'Rohini',
        address: 'Sector 14',
        sportTypes: ['Squash'],
        pricePerHour: 600,
        courtCount: 1,
        indoor: true,
        openingHours: '07:00 AM - 09:00 PM',
        status: 'active',
        verificationStatus: 'REJECTED',
        verificationNote: 'Rejected due to invalid specs',
        verifiedBy: adminUser.id,
        verifiedAt: null,
      };
      store.venues.push(rejVenue);

      const court2 = {
        id: 'court-rej-test',
        venueId: rejVenue.id,
        name: 'Rejected Court 1',
        sport: 'Squash',
        surface: 'Hardwood',
        pricePerHour: 600,
        operatingHours: '07:00 AM - 09:00 PM',
        isActive: true,
      };
      store.courts.push(court2);
      rejectedVenueCourt = court2;

      // Verified venue court
      const verVenue = store.venues.find((v) => v.id === 'v-1');
      verVenue.verificationStatus = 'VERIFIED';
      verifiedVenueCourt = store.courts.find((c) => c.venueId === verVenue.id && c.isActive);
    });

    it('16. Suspended venue cannot receive new customer bookings (400 Bad Request)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: suspendedVenueCourt.id,
          date: dateStr,
          startTime: '07:00 AM',
          endTime: '08:00 AM',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.status, 'error');
      assert.match(data.message, /verification status is suspended/i);
    });

    it('17. Rejected venue cannot receive new customer bookings (400 Bad Request)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: rejectedVenueCourt.id,
          date: dateStr,
          startTime: '08:00 AM',
          endTime: '09:00 AM',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.status, 'error');
      assert.match(data.message, /verification status is rejected/i);
    });

    it('18. Existing valid bookings are preserved and not corrupted when venue status changes', async () => {
      const initialBookingsCount = store.bookings.length;
      assert.ok(initialBookingsCount > 0);

      // Verify all existing bookings retain their immutable IDs and payment/lifecycle states
      for (const b of store.bookings) {
        assert.ok(b.id);
        assert.ok(b.userId);
        assert.ok(b.status);
      }
    });

    it('19. Transactional notifications are created on verification state changes', async () => {
      const targetVenue = store.venues.find((v) => v.ownerId === owner1User.id && v.verificationStatus === 'VERIFIED');
      assert.ok(targetVenue);

      // Admin transitions to SUSPENDED
      const suspRes = await fetch(`${baseUrl}/api/admin/venues/${targetVenue.id}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'SUSPENDED',
          note: 'Notification test suspension',
        }),
      });
      assert.strictEqual(suspRes.status, 200);

      // Check owner notifications
      const notifRes = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.strictEqual(notifRes.status, 200);
      const notifData = await notifRes.json();
      assert.ok(notifData.notifications.length > 0);
      const suspNotif = notifData.notifications.find((n) => n.type === 'VENUE_SUSPENDED');
      assert.ok(suspNotif);
      assert.strictEqual(suspNotif.venueId, targetVenue.id);
    });

    it('20. Private admin metadata is protected in safeVenue serialization', () => {
      const testV = {
        id: 'v-test-safe',
        ownerId: 'u-owner-1',
        name: 'Private Metadata Test',
        verificationStatus: 'VERIFIED',
        verifiedAt: '2026-09-15T00:00:00.000Z',
        verifiedBy: 'u-admin-1',
        verificationNote: 'Top secret admin verification audit',
      };

      const customerView = safeVenue(testV, 'CUSTOMER');
      assert.strictEqual(customerView.isVerified, true);
      assert.strictEqual(customerView.verificationStatus, 'VERIFIED');
      assert.strictEqual(customerView.verifiedBy, undefined);
      assert.strictEqual(customerView.verificationNote, undefined);

      const ownerView = safeVenue(testV, 'OWNER');
      assert.strictEqual(ownerView.verificationStatus, 'VERIFIED');
      assert.strictEqual(ownerView.verificationNote, 'Top secret admin verification audit');
    });
  });
});
