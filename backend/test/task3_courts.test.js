process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let ownerToken;
let owner2Token;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in customer (Rahul Sharma)
  const custRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const custData = await custRes.json();
  customerToken = custData.token;

  // Log in owner 1 (Vikram Patel)
  const ownerRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const ownerData = await ownerRes.json();
  ownerToken = ownerData.token;

  // Log in owner 2 (Priya Mehta - owns v-5 and v-6)
  const owner2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const owner2Data = await owner2Res.json();
  owner2Token = owner2Data.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Task 3: Court Management & Security', () => {
  let createdCourtId;

  it('GET /api/courts - public court listing returns courts', async () => {
    const res = await fetch(`${baseUrl}/api/courts`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(Array.isArray(data.courts));
    assert.ok(data.courts.length > 0);
  });

  it('GET /api/courts with filters (venueId, sport)', async () => {
    const res = await fetch(`${baseUrl}/api/courts?venueId=v-1&sport=Badminton`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.courts.every((c) => c.venueId === 'v-1' && c.sport === 'Badminton'));
  });

  it('GET /api/courts/:id - public court detail with venue summary', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.court.id, 'c-1');
    assert.ok(data.court.venue);
    assert.equal(data.court.venue.id, 'v-1');
  });

  it('GET /api/courts/:id - non-existent court returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-99999`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.status, 'error');
  });

  it('GET /api/courts/my/courts - owner receives only own courts', async () => {
    const res = await fetch(`${baseUrl}/api/courts/my/courts`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    // Owner 1 owns v-1, v-2, v-3, v-4
    const ownerVenues = ['v-1', 'v-2', 'v-3', 'v-4'];
    assert.ok(data.courts.every((c) => ownerVenues.includes(c.venueId)));
  });

  it('POST /api/venues/:venueId/courts - owner creates court under own venue', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Badminton Court 3 VIP',
        sport: 'Badminton',
        courtType: 'Synthetic Mat',
        indoor: true,
        pricePerHour: 550,
        operatingHours: '06:00 AM - 11:00 PM',
        // Attempt privileged injection
        id: 'hacked-id',
        ownerId: 'u-104',
        createdAt: '1970-01-01',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.court.name, 'Badminton Court 3 VIP');
    assert.equal(data.court.venueId, 'v-1');
    assert.notEqual(data.court.id, 'hacked-id'); // ID injection blocked
    assert.notEqual(data.court.createdAt, '1970-01-01'); // Timestamp injection blocked
    createdCourtId = data.court.id;
  });

  it('PUT /api/courts/:id - owner edits own court', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Badminton Court 3 Ultra VIP',
        pricePerHour: 600,
        // Attempt privileged tampering
        id: 'tampered-id',
        venueId: 'v-5',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.court.name, 'Badminton Court 3 Ultra VIP');
    assert.equal(data.court.pricePerHour, 600);
    assert.equal(data.court.id, createdCourtId);
    assert.equal(data.court.venueId, 'v-1'); // Venue ID change blocked
  });

  it('SECURITY: Cross-owner modification -> 403 Forbidden', async () => {
    // Owner 2 tries to edit Owner 1's court
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Malicious Name Update' }),
    });

    assert.equal(res.status, 403);
  });

  it('SECURITY: Cross-owner deletion -> 403 Forbidden', async () => {
    // Owner 2 tries to delete Owner 1's court
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });

    assert.equal(res.status, 403);
  });

  it('SECURITY: Cross-owner court creation -> 403 Forbidden', async () => {
    // Owner 2 tries to create a court under Owner 1's venue (v-1)
    const res = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Hacked Court',
        sport: 'Badminton',
        pricePerHour: 500,
      }),
    });

    assert.equal(res.status, 403);
  });

  it('SECURITY: Customer attempts court creation -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Customer Created Court',
        sport: 'Badminton',
        pricePerHour: 400,
      }),
    });

    assert.equal(res.status, 403);
  });

  it('SECURITY: Customer attempts court modification/deletion -> 403 Forbidden', async () => {
    const putRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Customer Edit' }),
    });
    assert.equal(putRes.status, 403);

    const delRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(delRes.status, 403);
  });

  it('SECURITY: Unauthenticated protected court endpoints -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/courts/my/courts`);
    assert.equal(res.status, 401);

    const postRes = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Anon' }),
    });
    assert.equal(postRes.status, 401);
  });

  it('VALIDATION: Invalid court data rejected (empty name, negative price, invalid sport)', async () => {
    // Empty name
    const res1 = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '', sport: 'Badminton', pricePerHour: 400 }),
    });
    assert.equal(res1.status, 400);

    // Negative price
    const res2 = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test', sport: 'Badminton', pricePerHour: -10 }),
    });
    assert.equal(res2.status, 400);

    // Sport not offered at venue
    const res3 = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test', sport: 'Cricket', pricePerHour: 500 }),
    });
    assert.equal(res3.status, 400);

    // Empty body gracefully handled with 400 Bad Request
    const res4 = await fetch(`${baseUrl}/api/venues/v-1/courts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(res4.status, 400);
  });

  it('DELETE /api/courts/:id - owner deletes own court', async () => {
    const res = await fetch(`${baseUrl}/api/courts/${createdCourtId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);

    // Verify deleted
    const checkRes = await fetch(`${baseUrl}/api/courts/${createdCourtId}`);
    assert.equal(checkRes.status, 404);
  });
});

describe('Task 3: Availability Engine (Read-Only)', () => {
  it('GET /api/courts/:id/availability - valid date returns AVAILABLE / UNAVAILABLE slots', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-09-20`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.courtId, 'c-1');
    assert.equal(data.date, '2026-09-20');
    assert.ok(Array.isArray(data.slots));
    assert.ok(data.slots.length > 0);

    // Verify slots have correct properties and statuses
    data.slots.forEach((s) => {
      assert.ok(s.id);
      assert.ok(s.startTime);
      assert.ok(s.endTime);
      assert.ok(['AVAILABLE', 'UNAVAILABLE'].includes(s.status));
    });
  });

  it('GET /api/courts/:id/availability - missing date returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability`);
    assert.equal(res.status, 400);
  });

  it('GET /api/courts/:id/availability - malformed date returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=not-a-date`);
    assert.equal(res.status, 400);
  });

  it('GET /api/courts/:id/availability - non-existent court returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-99999/availability?date=2026-09-20`);
    assert.equal(res.status, 404);
  });

  it('READ-ONLY CHECK: Availability endpoint does NOT mutate bookings or store', async () => {
    const initialBookingsCount = store.bookings.length;
    const initialCourtsCount = store.courts.length;

    await fetch(`${baseUrl}/api/courts/c-1/availability?date=2026-09-20`);
    await fetch(`${baseUrl}/api/courts/c-2/availability?date=2026-09-21`);

    assert.equal(store.bookings.length, initialBookingsCount);
    assert.equal(store.courts.length, initialCourtsCount);
  });
});
