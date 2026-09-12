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

  // Sign up Customer 2 for multi-user isolation tests
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Customer',
      email: 'player2_cust@example.com',
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Log in Owner (owner@quickcourt.com - u-201)
  const oRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const oData = await oRes.json();
  ownerToken = oData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Task 5: Players API Security & Role Authorization', () => {
  it('Unauthenticated GET /api/players -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/players`);
    assert.equal(res.status, 401);
  });

  it('Owner token GET /api/players -> 403 Forbidden (CUSTOMER-only)', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer token GET /api/players -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(Array.isArray(data.players));
    assert.ok(data.players.length >= 3);
  });
});

describe('Task 5: Data Minimization & Safe Serialization', () => {
  it('Player listing strips sensitive/prohibited fields (no passwordHash, email, phone, age, userId)', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();

    for (const player of players) {
      assert.equal(player.passwordHash, undefined, 'Must not expose passwordHash');
      assert.equal(player.email, undefined, 'Must not expose email');
      assert.equal(player.phone, undefined, 'Must not expose phone');
      assert.equal(player.age, undefined, 'Must not expose age (data minimization)');
      assert.equal(player.userId, undefined, 'Must not expose internal userId in discovery');

      // Required public discovery fields
      assert.ok(player.id, 'Must have id');
      assert.ok(player.name, 'Must have name');
      assert.ok(player.sport, 'Must have sport string');
      assert.ok(player.skillLevel, 'Must have skillLevel');
      assert.ok(player.preferredTime, 'Must have preferredTime');
      assert.ok(player.preferredDays, 'Must have preferredDays');
      assert.ok(player.availabilityStatus, 'Must have availabilityStatus');
    }
  });

  it('Unlinked discovery demo players (p-1, p-2) exist and are returned safely', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    const p1 = players.find((p) => p.id === 'p-1');
    const p2 = players.find((p) => p.id === 'p-2');

    assert.ok(p1, 'p-1 should exist in discovery list');
    assert.ok(p2, 'p-2 should exist in discovery list');
    assert.equal(p1.age, undefined);
    assert.equal(p2.age, undefined);
  });
});

describe('Task 5: Player Discovery Filtering & Search', () => {
  it('Filter by sport (case-insensitive)', async () => {
    const res = await fetch(`${baseUrl}/api/players?sport=Badminton`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.sport.toLowerCase(), 'badminton');
    });
  });

  it('Filter by skillLevel', async () => {
    const res = await fetch(`${baseUrl}/api/players?skillLevel=Intermediate`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.skillLevel, 'Intermediate');
    });
  });

  it('Filter by preferredTime period', async () => {
    const res = await fetch(`${baseUrl}/api/players?preferredTime=Evenings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.preferredTime, 'Evenings');
    });
  });

  it('Filter by availabilityStatus (AVAILABLE)', async () => {
    const res = await fetch(`${baseUrl}/api/players?availabilityStatus=AVAILABLE`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.availabilityStatus, 'AVAILABLE');
    });
  });

  it('Search by text query across name, sport, bio', async () => {
    const res = await fetch(`${baseUrl}/api/players?q=Rahul`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.ok(players.length >= 1);
    assert.equal(players[0].name, 'Rahul Sharma');
  });

  it('Search returns empty array when no matches found', async () => {
    const res = await fetch(`${baseUrl}/api/players?q=NonExistentPlayerXYZ123`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const { players } = await res.json();
    assert.equal(players.length, 0);
  });
});

describe('Task 5: Individual Player Detail (GET /api/players/:id)', () => {
  it('GET /api/players/:id returns safe public player object', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-1`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const { player } = await res.json();
    assert.equal(player.id, 'p-1');
    assert.equal(player.name, 'Smeet Badminton Fan');
    assert.equal(player.passwordHash, undefined);
    assert.equal(player.email, undefined);
    assert.equal(player.phone, undefined);
    assert.equal(player.age, undefined);
  });

  it('GET /api/players/:id with unknown ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/players/unknown-999`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 404);
  });
});

describe('Task 5: Customer Profile Management (GET & PUT /api/players/me/profile)', () => {
  it('GET /api/players/me/profile returns demo customer profile (p-3)', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 200);
    const { player } = await res.json();
    assert.equal(player.name, 'Rahul Sharma');
    assert.equal(player.id, 'p-3');
    assert.equal(player.email, undefined);
    assert.equal(player.passwordHash, undefined);
    assert.equal(player.age, undefined);
  });

  it('GET /api/players/me/profile for newly registered customer returns isolated default profile', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/profile`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 200);
    const { player } = await res.json();
    assert.equal(player.name, 'Second Customer');
    assert.notEqual(player.id, 'p-3');
    assert.notEqual(player.id, 'p-1');
  });

  it('PUT /api/players/me/profile updates customer profile fields successfully', async () => {
    const updatePayload = {
      sport: 'Badminton',
      bio: 'Tournament badminton enthusiast looking for weekend sparring partners.',
      skillLevel: 'Advanced',
      preferredTime: 'Mornings',
      preferredDays: 'Weekends',
      availabilityStatus: 'AVAILABLE',
    };

    const res = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const { player } = await res.json();
    assert.equal(player.sport, 'Badminton');
    assert.equal(player.bio, updatePayload.bio);
    assert.equal(player.skillLevel, 'Advanced');
    assert.equal(player.preferredTime, 'Mornings');
    assert.equal(player.preferredDays, 'Weekends');
    assert.equal(player.availabilityStatus, 'AVAILABLE');
    assert.ok(player.updatedAt);
  });

  it('PUT /api/players/me/profile rejects invalid controlled field values', async () => {
    // Invalid skillLevel
    const res1 = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        skillLevel: 'Grandmaster',
        preferredDays: 'Weekdays',
        preferredTime: 'Evenings',
        availabilityStatus: 'AVAILABLE',
      }),
    });
    assert.equal(res1.status, 400);

    // Invalid preferredTime
    const res2 = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        skillLevel: 'Intermediate',
        preferredDays: 'Weekdays',
        preferredTime: 'Midnight',
        availabilityStatus: 'AVAILABLE',
      }),
    });
    assert.equal(res2.status, 400);

    // Invalid preferredDays
    const res3 = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        skillLevel: 'Intermediate',
        preferredDays: 'Everyday',
        preferredTime: 'Evenings',
        availabilityStatus: 'AVAILABLE',
      }),
    });
    assert.equal(res3.status, 400);

    // Invalid availabilityStatus
    const res4 = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        skillLevel: 'Intermediate',
        preferredDays: 'Weekdays',
        preferredTime: 'Evenings',
        availabilityStatus: 'OFFLINE',
      }),
    });
    assert.equal(res4.status, 400);
  });

  it('PUT /api/players/me/profile ignores injection of protected fields (id, userId, role, email, passwordHash, age)', async () => {
    const maliciousPayload = {
      id: 'p-1', // Attempt to hijack unlinked demo player
      userId: 'u-999',
      role: 'ADMIN',
      email: 'hacked@example.com',
      passwordHash: 'injected_hash',
      age: 99,
      isAdmin: true,
      sport: 'Tennis',
      skillLevel: 'Intermediate',
      preferredDays: 'Weekdays',
      preferredTime: 'Evenings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Legitimate bio update',
    };

    const res = await fetch(`${baseUrl}/api/players/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(maliciousPayload),
    });

    assert.equal(res.status, 200);
    const { player } = await res.json();
    assert.equal(player.id, 'p-3', 'Customer 1 profile ID must remain p-3');
    assert.equal(player.userId, undefined, 'userId must not be returned');
    assert.equal(player.age, undefined, 'age must not be accepted or returned');
    assert.equal(player.bio, 'Legitimate bio update');

    // Confirm unlinked p-1 was not corrupted
    const p1InStore = store.players.find((p) => p.id === 'p-1');
    assert.equal(p1InStore.name, 'Smeet Badminton Fan', 'p-1 must retain its original name');
    assert.equal(p1InStore.userId, null, 'p-1 must remain unlinked');
  });
});
