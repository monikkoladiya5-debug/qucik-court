process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { SUPPORTED_SPORTS } from '../controllers/courtController.js';

let server;
let baseUrl;
let ownerToken;
let customerToken;
let adminToken;
let venueV1;
let venueV2;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Owner (owner@quickcourt.com - u-102 owns v-1, v-2, v-3, v-4)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;

  // Log in Customer (user@quickcourt.com)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Log in Admin (admin@quickcourt.com)
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

  // Identify owner's test venues
  venueV1 = store.venues.find((v) => v.id === 'v-1'); // Badminton, Pickleball
  venueV2 = store.venues.find((v) => v.id === 'v-2'); // Tennis, Football
  assert.ok(venueV1, 'Venue v-1 must exist');
  assert.ok(venueV2, 'Venue v-2 must exist');
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Focused Regression: Owner Add Court Sport Selection & Customer Discovery', () => {
  let tennisCourtId;
  let footballCourtId;

  it('1-2. Supported sports list is defined, complete, and contains all application sports', () => {
    const expectedSports = [
      'Badminton',
      'Tennis',
      'Football',
      'Basketball',
      'Pickleball',
      'Cricket',
      'Squash',
      'Table Tennis',
    ];
    for (const s of expectedSports) {
      assert.ok(SUPPORTED_SPORTS.includes(s), `SUPPORTED_SPORTS must include ${s}`);
    }
  });

  it('3-5. Owner creates a court with Tennis -> stored as Tennis, NOT silently Badminton', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venueV2.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Center Court Tennis A',
        sport: 'Tennis',
        courtType: 'Clay',
        indoor: false,
        pricePerHour: 750,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    tennisCourtId = data.court.id;

    // Server stores Tennis and does NOT default to Badminton
    assert.equal(data.court.sport, 'Tennis', 'Court sport must be Tennis');
    assert.notEqual(data.court.sport, 'Badminton');

    // Stored in in-memory store
    const stored = store.courts.find((c) => c.id === tennisCourtId);
    assert.ok(stored);
    assert.equal(stored.sport, 'Tennis');
    assert.equal(stored.name, 'Center Court Tennis A');

    // Admin approves court
    await fetch(`${baseUrl}/api/admin/courts/${tennisCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
  });

  it('6-7. Owner creates another court with Football -> stored as Football', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venueV2.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Turf 1 Arena',
        sport: 'Football',
        courtType: 'FIFA Artificial Turf',
        indoor: false,
        pricePerHour: 1200,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    footballCourtId = data.court.id;

    assert.equal(data.court.sport, 'Football', 'Court sport must be Football');
    assert.notEqual(data.court.sport, 'Badminton');

    const stored = store.courts.find((c) => c.id === footballCourtId);
    assert.ok(stored);
    assert.equal(stored.sport, 'Football');
    assert.equal(stored.name, 'Turf 1 Arena');

    // Admin approves court
    await fetch(`${baseUrl}/api/admin/courts/${footballCourtId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
  });

  it('8. Edit Tennis court -> selected sport remains Tennis and can be updated', async () => {
    // 1. Fetch court details
    const getRes = await fetch(`${baseUrl}/api/courts/${tennisCourtId}`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.court.sport, 'Tennis', 'Fetched court must have sport Tennis');

    // 2. Update court surface while preserving/confirming Tennis sport
    const updateRes = await fetch(`${baseUrl}/api/courts/${tennisCourtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Center Court Tennis A (Renovated)',
        sport: 'Tennis',
        courtType: 'Hard Court (DecoTurf)',
      }),
    });

    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.court.sport, 'Tennis');
    assert.equal(updateData.court.courtType, 'Hard Court (DecoTurf)');
  });

  it('9. Customer sport filtering recognizes the correct sport', async () => {
    // Filter venues by Tennis
    const tennisRes = await fetch(`${baseUrl}/api/venues?sport=Tennis`);
    assert.equal(tennisRes.status, 200);
    const tennisData = await tennisRes.json();
    assert.ok(
      tennisData.venues.some((v) => v.id === venueV2.id),
      'Customer search for Tennis must find the venue'
    );

    // Filter courts by sport=Football
    const footballCourtsRes = await fetch(`${baseUrl}/api/courts?venueId=${venueV2.id}&sport=Football`);
    assert.equal(footballCourtsRes.status, 200);
    const footballCourtsData = await footballCourtsRes.json();
    assert.ok(footballCourtsData.courts.some((c) => c.id === footballCourtId));
    assert.ok(footballCourtsData.courts.every((c) => c.sport === 'Football'));

    // Filter courts by sport=Tennis
    const tennisCourtsRes = await fetch(`${baseUrl}/api/courts?venueId=${venueV2.id}&sport=Tennis`);
    assert.equal(tennisCourtsRes.status, 200);
    const tennisCourtsData = await tennisCourtsRes.json();
    assert.ok(tennisCourtsData.courts.some((c) => c.id === tennisCourtId));
    assert.ok(tennisCourtsData.courts.every((c) => c.sport === 'Tennis'));
  });

  it('10. Invalid unsupported sport is strictly rejected by the backend -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venueV2.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Curling Sheet 1',
        sport: 'Curling', // Unsupported sport
        pricePerHour: 500,
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Invalid sport') || data.message.includes('Supported sports'));
  });

  it('11. Existing Badminton court behavior still works flawlessly', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${venueV1.id}/courts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Badminton Premier Court 1',
        sport: 'Badminton',
        courtType: 'Wooden Parquet',
        pricePerHour: 400,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.court.sport, 'Badminton');
    assert.equal(data.court.name, 'Badminton Premier Court 1');
  });
});
