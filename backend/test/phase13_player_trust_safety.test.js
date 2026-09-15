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

  // 2. Sign up Customer 2 for matchmaking & block/report isolation
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kavita Roy',
      email: `kavita_p13_${Date.now()}@quickcourt.com`,
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

describe('Phase 13: Player Trust & Activity Calculations', () => {
  it('GET /api/players/:id/trust returns deterministic activity and qualitative trust label', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-3/trust`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const { status, trustSummary } = await res.json();
    assert.equal(status, 'ok');
    assert.ok(trustSummary);
    assert.ok(['Reliable Player', 'Active Player', 'New Player', 'Limited History'].includes(trustSummary.trustLabel));
    assert.equal(typeof trustSummary.completedGames, 'number');
    assert.equal(typeof trustSummary.checkIns, 'number');
    assert.equal(typeof trustSummary.cancellations, 'number');
    assert.equal(typeof trustSummary.noShows, 'number');
    assert.equal(trustSummary.isBlocked, false);
  });

  it('New unlinked demo player returns "Limited History"', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-4/trust`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const { trustSummary } = await res.json();
    assert.equal(trustSummary.trustLabel, 'Limited History');
    assert.equal(trustSummary.completedGames, 0);
  });

  it('Player with confirmed but uncompleted bookings has "New Player" status', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-3/trust`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { trustSummary } = await res.json();
    assert.equal(trustSummary.trustLabel, 'New Player');
    assert.ok(trustSummary.totalBookings >= 1);
    assert.equal(trustSummary.completedGames, 0);
  });

  it('Player with checked-in or completed bookings achieves "Active Player" status', async () => {
    // Complete one booking for u-101
    const b = store.bookings.find((b) => b.userId === 'u-101');
    assert.ok(b);
    const prevStatus = b.status;
    b.status = 'CHECKED_IN';
    b.checkedInAt = new Date().toISOString();

    const res = await fetch(`${baseUrl}/api/players/p-3/trust`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { trustSummary } = await res.json();
    assert.equal(trustSummary.trustLabel, 'Active Player');
    assert.ok(trustSummary.completedGames >= 1);
    assert.ok(trustSummary.checkIns >= 1);

    // Revert status
    b.status = prevStatus;
  });

  it('GET /api/players/:id/trust for non-existent player returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/players/non-existent-999/trust`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 404);
  });
});

describe('Phase 13: Player Reporting Subsystem', () => {
  it('Authenticated customer can report another player with valid reason -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-1/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        reason: 'inappropriate behavior',
        details: 'Player did not show up and was verbally rude.',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.reportId);
  });

  it('Rejects reporting self -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-3/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        reason: 'spam',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('own player profile'));
  });

  it('Rejects invalid report reason -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-1/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        reason: 'invalid_reason_xyz',
      }),
    });

    assert.equal(res.status, 400);
  });

  it('Rejects duplicate pending report for the same player -> 409 Conflict', async () => {
    // Customer 1 already reported p-1 above
    const res = await fetch(`${baseUrl}/api/players/p-1/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        reason: 'spam',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.ok(data.message.includes('already submitted'));
  });

  it('Reports are NOT leaked in public player listing (Privacy preservation)', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    for (const p of players) {
      assert.equal(p.reports, undefined, 'Must not expose report arrays');
      assert.equal(p.reportHistory, undefined, 'Must not expose private moderation data');
    }
  });
});

describe('Phase 13: Player Blocking Subsystem & Matchmaking Integration', () => {
  it('Customer 1 can block player p-5 -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-5/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
  });

  it('Rejects self-blocking -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-3/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
    });

    assert.equal(res.status, 400);
  });

  it('Rejects duplicate blocking -> 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-5/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
    });

    assert.equal(res.status, 409);
  });

  it('Blocked player p-5 is excluded from Customer 1 discovery results', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await res.json();
    const p5Record = players.find((p) => p.id === 'p-5');
    assert.equal(p5Record, undefined, 'Blocked player p-5 must not appear in discovery');
  });

  it('Customer 2 (unblocked) still sees player p-5 in discovery results', async () => {
    const res = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    const { players } = await res.json();
    const p5Record = players.find((p) => p.id === 'p-5');
    assert.ok(p5Record, 'Unblocked player p-5 must appear for Customer 2');
  });

  it('Cannot send a match invite to a blocked player -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-5/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        sport: 'Football',
        date: '2026-09-30',
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.message.includes('blocked player'));
  });

  it('GET /api/players/me/blocks returns list of blocked players for Customer 1', async () => {
    const res = await fetch(`${baseUrl}/api/players/me/blocks`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(res.status, 200);
    const { blocks } = await res.json();
    assert.ok(Array.isArray(blocks));
    assert.ok(blocks.some((b) => b.playerId === 'p-5'));
  });

  it('Customer 2 cannot unblock Customer 1 block -> 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/players/p-5/block`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customer2Token}` },
    });
    assert.equal(res.status, 404);
  });

  it('Customer 1 unblocks player p-5 -> 200 OK and restores discovery eligibility', async () => {
    const unblockRes = await fetch(`${baseUrl}/api/players/p-5/block`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    assert.equal(unblockRes.status, 200);

    // Verify p-5 reappears in discovery for Customer 1
    const listRes = await fetch(`${baseUrl}/api/players`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const { players } = await listRes.json();
    const p5Record = players.find((p) => p.id === 'p-5');
    assert.ok(p5Record, 'Player p-5 must reappear in discovery after unblocking');
  });
});
