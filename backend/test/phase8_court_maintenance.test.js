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
let initialBookingsCount;
let initialCourtsCount;
let venue1Id;
let court1Id;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  initialBookingsCount = store.bookings.length;
  initialCourtsCount = store.courts.length;

  // 1. Customer Token (u-101 - Rahul Sharma)
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

  // Identify Venue 1 belonging to Owner 1 (u-102)
  const owner1Venue = store.venues.find((v) => v.ownerId === 'u-102');
  venue1Id = owner1Venue ? owner1Venue.id : 'v-1';

  // Identify Court 1 belonging to Venue 1
  const venue1Court = store.courts.find((c) => c.venueId === venue1Id);
  court1Id = venue1Court ? venue1Court.id : 'c-101';
});

after(async () => {
  store.bookings.splice(initialBookingsCount);
  store.courts.splice(initialCourtsCount);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 8: Court Inventory & Maintenance Management', () => {
  let createdCourtId;

  it('1. Owner can add a valid new court unit to their venue', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venue1Id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        name: 'Phase 8 Court Alpha',
        sport: 'Badminton',
        courtType: 'Synthetic Pro',
        pricePerHour: 850,
        indoor: true,
        operatingHours: '06:00 AM - 10:00 PM',
        isActive: true,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.status, 'ok');
    assert.equal(body.court.name, 'Phase 8 Court Alpha');
    assert.equal(body.court.venueId, venue1Id);
    assert.equal(body.court.pricePerHour, 850);
    assert.equal(body.court.isActive, true);
    createdCourtId = body.court.id;
  });

  it('2. Rejects court creation when sport type is incompatible with venue', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venue1Id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        name: 'Incompatible Sport Court',
        sport: 'WaterPolo',
        pricePerHour: 1000,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.status, 'error');
  });

  it('3. Rejects court creation with invalid pricing or missing name', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venue1Id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        name: '',
        sport: 'Badminton',
        pricePerHour: -50,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.status, 'error');
  });

  it('4. Owner can edit court properties (name, hourly rate, surface)', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        name: 'Phase 8 Court Alpha (Upgraded)',
        pricePerHour: 950,
        courtType: 'Wooden Parquet',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.court.name, 'Phase 8 Court Alpha (Upgraded)');
    assert.equal(body.court.pricePerHour, 950);
    assert.equal(body.court.courtType, 'Wooden Parquet');
  });

  it('5. Owner can deactivate a court (taking it offline / under maintenance)', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        isActive: false,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.court.isActive, false);
  });

  it('6. Player availability shows all slots as UNAVAILABLE for inactive/maintenance court', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}/availability?date=2026-09-20`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.courtId, createdCourtId);
    assert.ok(body.slots.length > 0);

    const availableSlots = body.slots.filter((s) => s.status === 'AVAILABLE');
    assert.equal(availableSlots.length, 0);
  });

  it('7. Server-side booking creation is rejected for inactive/maintenance court (1-hour & 2-hour)', async () => {
    // 1-hour booking attempt
    const res1 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: createdCourtId,
        date: '2026-09-20',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
      }),
    });

    const body1 = await res1.json();
    assert.equal(res1.status, 400);
    assert.equal(body1.status, 'error');

    // 2-hour continuous booking attempt
    const res2 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: createdCourtId,
        date: '2026-09-20',
        startTime: '02:00 PM',
        endTime: '04:00 PM',
      }),
    });

    const body2 = await res2.json();
    assert.equal(res2.status, 400);
    assert.equal(body2.status, 'error');
  });

  it('8. Existing active bookings are safely preserved when a court is taken offline for maintenance', async () => {
    // First reactivate court
    await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ isActive: true }),
    });

    // Query availability to pick valid slots
    const availRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}/availability?date=2026-09-25`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    // Create booking while active
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: createdCourtId,
        date: '2026-09-25',
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });

    const bookBody = await bookRes.json();
    assert.equal(bookRes.status, 201);
    assert.equal(bookBody.status, 'ok');
    const bookingId = bookBody.booking.id;

    // Now owner deactivates court for maintenance (ensure Content-Type is set)
    const deactRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(deactRes.status, 200);

    // Verify existing booking is NOT deleted and remains valid in customer records
    const checkRes = await fetch(`${baseUrl}/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const checkBody = await checkRes.json();
    assert.equal(checkRes.status, 200);
    assert.equal(checkBody.booking.id, bookingId);
    assert.ok(['REQUESTED', 'CONFIRMED', 'APPROVED'].includes(checkBody.booking.status));
  });

  it('9. Owner Isolation: Owner 2 cannot edit, toggle, or delete Owner 1 courts', async () => {
    // Edit attempt by Owner 2
    const editRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner2Token}`,
      },
      body: JSON.stringify({ name: 'Tampered Court Name' }),
    });
    assert.equal(editRes.status, 403);

    // Toggle attempt by Owner 2
    const toggleRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner2Token}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(toggleRes.status, 403);

    // Delete attempt by Owner 2
    const delRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(delRes.status, 403);
  });

  it('10. Owner Dashboard reflects accurate active/inactive counts and fleet status', async () => {
    // Fetch owner 1 dashboard
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.courts));

    const fleetUnit = body.courts.find((c) => c.id === createdCourtId);
    assert.ok(fleetUnit);
    assert.equal(fleetUnit.isActive, false);
    assert.ok(body.summary.inactiveCourts >= 1);
  });

  it('11. Owner can reactivate court back to active state', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ isActive: true }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.court.isActive, true);

    // Check dashboard again
    const dashRes = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const dashBody = await dashRes.json();
    const fleetUnit = dashBody.courts.find((c) => c.id === createdCourtId);
    assert.ok(fleetUnit);
    assert.equal(fleetUnit.isActive, true);
  });
});
