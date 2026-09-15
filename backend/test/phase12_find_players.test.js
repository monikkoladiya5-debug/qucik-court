process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customer1Token;
let customer2Token;
let ownerToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // 1. Log in Customer 1 (user@quickcourt.com - u-101 / p-3)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customer1Token = c1Data.token;

  // 2. Sign up Customer 2 for matchmaking & invite isolation
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ananya Sharma',
      email: 'ananya_p12@quickcourt.com',
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // 3. Log in Owner
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

describe('Phase 12: Player Discovery & RBAC Security', () => {
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

  it('Customer token GET /api/players -> 200 OK with safe discoverable players', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(Array.isArray(data.players));
    assert.ok(data.players.length >= 4);
  });
});

describe('Phase 12: Privacy & Data Minimization', () => {
  it('Strips private account fields (no passwordHash, email, phone, age, userId)', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();

    for (const player of players) {
      assert.equal(player.passwordHash, undefined, 'Must not leak passwordHash');
      assert.equal(player.email, undefined, 'Must not leak email');
      assert.equal(player.phone, undefined, 'Must not leak phone');
      assert.equal(player.age, undefined, 'Must not leak age');
      assert.equal(player.userId, undefined, 'Must not expose internal userId in public list');

      // Check required public discovery fields
      assert.ok(player.id, 'Must have player ID');
      assert.ok(player.name, 'Must have player name');
      assert.ok(player.sport, 'Must have sport');
      assert.ok(player.city, 'Must have broad city/area');
      assert.ok(player.skillLevel, 'Must have skillLevel');
      assert.ok(player.availabilityStatus, 'Must have availabilityStatus');
    }
  });
});

describe('Phase 12: Real Matchmaking Filters & Availability Logic', () => {
  it('Filters by Sport accurately (e.g., Pickleball)', async () => {
    const res = await fetch(`${baseUrl}/api/players?sport=Pickleball`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.sport.toLowerCase(), 'pickleball');
    });
  });

  it('Filters by City / Broad area (e.g., Mumbai)', async () => {
    const res = await fetch(`${baseUrl}/api/players?city=Mumbai`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    players.forEach((p) => {
      assert.equal(p.city.toLowerCase(), 'mumbai');
    });
  });

  it('Calculates deterministic match scores and highlights reasons', async () => {
    const res = await fetch(`${baseUrl}/api/players?sport=Badminton&city=Ahmedabad`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);

    const topMatch = players[0];
    assert.ok(topMatch.matchScore >= 50, 'Top match score should be >= 50%');
    assert.ok(Array.isArray(topMatch.matchReasons), 'Must include match reasons');
    assert.ok(topMatch.matchReasons.length > 0);

    // Verify results are sorted by matchScore descending
    for (let i = 0; i < players.length - 1; i++) {
      assert.ok(players[i].matchScore >= players[i + 1].matchScore, 'Players must be sorted descending by matchScore');
    }
  });

  it('Handles Date-based day-type matching (Weekend vs Weekday)', async () => {
    // 2026-09-20 is a Sunday (Weekend)
    const resWeekend = await fetch(`${baseUrl}/api/players?date=2026-09-20`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players: weekendPlayers } = await resWeekend.json();
    assert.ok(weekendPlayers.length > 0);
    const topWeekend = weekendPlayers[0];
    assert.ok(topWeekend.matchReasons.some((r) => r.includes('Weekends') || r.includes('Flexible')));
  });

  it('Handles Time slot matching (Mornings / Evenings)', async () => {
    const res = await fetch(`${baseUrl}/api/players?time=07:00%20AM`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    assert.ok(players.length > 0);
    // Morning matching players score higher
    const topPlayer = players[0];
    assert.ok(topPlayer.matchReasons.some((r) => r.includes('Mornings') || r.includes('timing') || r.includes('Flexible')));
  });

  it('Returns empty array with no matches when impossible query provided', async () => {
    const res = await fetch(`${baseUrl}/api/players?sport=Curling&city=Atlantis`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players, count } = await res.json();
    assert.equal(count, 0);
    assert.equal(players.length, 0);
  });

  it('Self-Exclusion: GET /api/players?excludeSelf=true excludes authenticated customer own player record (p-3)', async () => {
    const res = await fetch(`${baseUrl}/api/players?excludeSelf=true`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const { players } = await res.json();
    assert.ok(players.length > 0);
    const selfRecord = players.find((p) => p.id === 'p-3' || p.name === 'Rahul Sharma');
    assert.equal(selfRecord, undefined, 'Own player record p-3 must never appear when excludeSelf=true');
  });

  it('Self-Exclusion: GET /api/players?excludeSelf=false allows customer own player record to be discoverable', async () => {
    const res = await fetch(`${baseUrl}/api/players?excludeSelf=false`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const { players } = await res.json();
    assert.ok(players.length > 0);
    const selfRecord = players.find((p) => p.id === 'p-3');
    assert.ok(selfRecord, 'Own player record p-3 is present when excludeSelf=false');
  });
});

describe('Phase 12: Match Request / Invite Flow & Constraints', () => {
  it('Rejects sending match invite to self -> 400 Bad Request', async () => {
    // Customer 1 owns profile p-3
    const res = await fetch(`${baseUrl}/api/players/p-3/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        date: '2026-09-25',
        time: '06:00 PM',
        courtVenue: 'Vertex Complex',
        note: 'Self invite test',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.status, 'error');
    assert.ok(data.message.includes('yourself'));
  });

  it('Customer 1 sends a valid match invite to player p-1 -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        date: '2026-09-26',
        time: '07:00 PM',
        courtVenue: 'Vertex Sports Complex',
        note: 'Let us play a singles badminton match!',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.invite.id);
    assert.equal(data.invite.status, 'PENDING');
    assert.equal(data.invite.targetPlayerId, 'p-1');
  });

  it('Rejects duplicate pending match invite for same player on same date -> 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        sport: 'Badminton',
        date: '2026-09-26',
        time: '07:00 PM',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 'error');
    assert.ok(data.message.includes('already exists'));
  });

  it('GET /api/players/me/invites returns sent invites for Customer 1', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/invites`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(Array.isArray(data.sent));
    assert.ok(data.sent.some((i) => i.targetPlayerId === 'p-1' && i.date === '2026-09-26'));
  });

  it('Sender can cancel their pending match invite -> 200 OK', async () => {
    // Find the invite sent above
    const listRes = await fetch(`${baseUrl}/api/players/me/invites`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { sent } = await listRes.json();
    const invite = sent.find((i) => i.targetPlayerId === 'p-1' && i.status === 'PENDING');
    assert.ok(invite, 'Pending invite should exist');

    const cancelRes = await fetch(`${baseUrl}/api/players/invites/${invite.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.invite.status, 'CANCELLED');
  });

  it('Rejects unauthorized user from cancelling another user invite -> 403 Forbidden', async () => {
    // Customer 1 sends a new invite to p-2
    const createRes = await fetch(`${baseUrl}/api/players/p-2/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        sport: 'Tennis',
        date: '2026-09-28',
      }),
    });
    const { invite } = await createRes.json();

    // Customer 2 tries to cancel Customer 1's invite
    const tamperRes = await fetch(`${baseUrl}/api/players/invites/${invite.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    assert.equal(tamperRes.status, 403);
  });
});
