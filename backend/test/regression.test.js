process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';

let server;
let baseUrl;
let customerToken;
let ownerToken;
let owner2Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in customer
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Log in owner
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;

  // Log in owner 2
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;

  // Log in admin
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

describe('Task 0 Regression: Health & System Endpoints', () => {
  it('GET /api/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.systemHealth.serverStatus, 'healthy');
  });

  it('GET /api/summary returns correct store counters', async () => {
    const res = await fetch(`${baseUrl}/api/summary`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.usersCount > 0);
    assert.ok(data.venuesCount > 0);
    assert.ok(data.courtsCount > 0);
  });
});

describe('Task 1 Regression: Auth & RBAC', () => {
  it('POST /api/auth/signup - creates new customer', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Player',
        email: `player_${Date.now()}@example.com`,
        password: 'password123',
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.token);
    assert.equal(data.user.role, 'CUSTOMER');
    assert.equal(data.user.passwordHash, undefined); // No hash leak
  });

  it('POST /api/auth/login - invalid credentials returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@quickcourt.com', password: 'wrongpassword' }),
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/auth/me - returns authenticated user info', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.role, 'CUSTOMER');
    assert.equal(data.user.passwordHash, undefined);
  });

  it('RBAC: Customer cannot access owner-only endpoint -> 403', async () => {
    const res = await fetch(`${baseUrl}/api/rbac/owner-only`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('RBAC: Owner can access owner-only endpoint -> 200', async () => {
    const res = await fetch(`${baseUrl}/api/rbac/owner-only`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
  });

  it('RBAC: Unauthenticated request to protected endpoint -> 401', async () => {
    const res = await fetch(`${baseUrl}/api/rbac/customer-only`);
    assert.equal(res.status, 401);
  });
});

describe('Task 2 Regression: Venues & Owner Management', () => {
  let createdVenueId;

  it('GET /api/venues - returns active venues list', async () => {
    const res = await fetch(`${baseUrl}/api/venues`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.venues.length > 0);
  });

  it('GET /api/venues/meta/cities & sports', async () => {
    const citiesRes = await fetch(`${baseUrl}/api/venues/meta/cities`);
    assert.equal(citiesRes.status, 200);
    const citiesData = await citiesRes.json();
    assert.ok(citiesData.cities.includes('Ahmedabad'));

    const sportsRes = await fetch(`${baseUrl}/api/venues/meta/sports`);
    assert.equal(sportsRes.status, 200);
    const sportsData = await sportsRes.json();
    assert.ok(sportsData.sports.includes('Badminton'));
  });

  it('GET /api/venues/:id - returns active venue detail', async () => {
    const res = await fetch(`${baseUrl}/api/venues/v-1`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.venue.id, 'v-1');
  });

  it('GET /api/venues/my/venues - owner gets own venues', async () => {
    const res = await fetch(`${baseUrl}/api/venues/my/venues`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.venues.every((v) => v.ownerId === 'u-102'));
  });

  it('POST /api/venues - owner creates new venue', async () => {
    const res = await fetch(`${baseUrl}/api/venues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Thunderbolt Arena',
        description: 'New sports complex',
        city: 'Ahmedabad',
        sportTypes: ['Badminton', 'Tennis'],
        pricePerHour: 450,
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.venue.name, 'Thunderbolt Arena');
    assert.equal(data.venue.ownerId, 'u-102');
    createdVenueId = data.venue.id;
  });

  it('PUT /api/venues/:id - cross-owner edit -> 403', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${createdVenueId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${owner2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    assert.equal(res.status, 403);
  });

  it('DELETE /api/venues/:id - owner deletes own venue', async () => {
    const res = await fetch(`${baseUrl}/api/venues/${createdVenueId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
  });
});
