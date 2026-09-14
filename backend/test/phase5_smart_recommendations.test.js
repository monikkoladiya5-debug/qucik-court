process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';
import { scoreVenueForUser } from '../controllers/venueController.js';

let server;
let baseUrl;

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    AUTH_CONFIG.jwtSecret,
    { expiresIn: '1h' }
  );
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 5: Smart Recommendations — Scoring Unit Tests', () => {
  const sampleVenue = {
    id: 'v-test-1',
    name: 'Apex Sports Arena',
    city: 'Ahmedabad',
    sportTypes: ['Badminton', 'Pickleball'],
    rating: 4.8,
    reviewCount: 30,
    pricePerHour: 400,
    indoor: true,
    status: 'active',
  };

  it('Scores high for user whose preferred sports match venue (+40 pts)', () => {
    const user = { id: 'u-pref', preferredSports: ['Badminton'] };
    const result = scoreVenueForUser(sampleVenue, user, [], 'Ahmedabad');

    assert.ok(result.score >= 40);
    assert.ok(result.primaryReason.includes('Badminton'));
    assert.ok(result.tags.some((t) => t.includes('Badminton')));
  });

  it('Scores bonus for user with past bookings in same sport (+25 pts)', () => {
    const user = { id: 'u-hist', preferredSports: [] };
    const bookings = [{ id: 'b-1', venueId: 'other-v', sport: 'Badminton' }];
    const result = scoreVenueForUser(sampleVenue, user, bookings);

    assert.ok(result.score > 25);
    assert.ok(result.primaryReason.includes('Badminton') || result.tags.some((t) => t.includes('Badminton')));
  });

  it('Scores bonus for previously booked venue familiarity (+15 pts)', () => {
    const user = { id: 'u-repeat', preferredSports: [] };
    const bookings = [{ id: 'b-2', venueId: 'v-test-1', sport: 'Pickleball' }];
    const result = scoreVenueForUser(sampleVenue, user, bookings);

    assert.ok(result.tags.includes('Previously Booked'));
  });

  it('Scores quality and rating signal (+24 pts for 4.8 rating)', () => {
    const result = scoreVenueForUser(sampleVenue, null, [], 'Ahmedabad');
    assert.ok(result.score > 20);
    assert.ok(result.tags.some((t) => t.includes('Top Rated')));
  });

  it('Calculates score deterministically with multiple combined signals', () => {
    const user = { id: 'u-multi', preferredSports: ['Badminton'] };
    const bookings = [{ id: 'b-3', venueId: 'v-test-1', venueCity: 'Ahmedabad', sport: 'Badminton' }];

    const run1 = scoreVenueForUser(sampleVenue, user, bookings, 'Ahmedabad');
    const run2 = scoreVenueForUser(sampleVenue, user, bookings, 'Ahmedabad');

    assert.equal(run1.score, run2.score);
    assert.equal(run1.primaryReason, run2.primaryReason);
    assert.deepEqual(run1.tags, run2.tags);
  });

  it('Gracefully falls back to rating and value score for guest / new user with no preferences', () => {
    const result = scoreVenueForUser(sampleVenue, null, []);
    assert.ok(result.score > 0);
    assert.ok(result.primaryReason.length > 0);
    assert.ok(Array.isArray(result.tags));
  });
});

describe('Phase 5: Smart Recommendations — API Endpoints', () => {
  it('GET /api/venues/recommendations (unauthenticated) returns top verified venues', async () => {
    const res = await fetch(`${baseUrl}/api/venues/recommendations`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    assert.equal(data.personalized, false);
    assert.ok(data.recommendations.length > 0);
    assert.ok(data.recommendations.length <= 4);

    // Verify recommendations have valid structure and score
    for (const v of data.recommendations) {
      assert.ok(v.id);
      assert.ok(v.name);
      assert.ok(typeof v.matchScore === 'number');
      assert.ok(v.recommendationReason);
      assert.ok(Array.isArray(v.matchTags));
    }
  });

  it('GET /api/venues/recommendations (authenticated user) returns personalized recommendations', async () => {
    const customer = store.users.find((u) => u.id === 'u-101'); // preferredSports: ['Badminton', 'Tennis']
    assert.ok(customer);
    const token = makeToken(customer);

    const res = await fetch(`${baseUrl}/api/venues/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    assert.equal(data.personalized, true);
    assert.ok(data.recommendations.length > 0);

    // Top recommended venue should match Badminton or Tennis
    const top = data.recommendations[0];
    const matchesPreferred = top.sportTypes.some((s) => customer.preferredSports.includes(s));
    assert.ok(matchesPreferred);
  });

  it('GET /api/venues/recommendations?city=Mumbai filters candidates by city', async () => {
    const res = await fetch(`${baseUrl}/api/venues/recommendations?city=Mumbai`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    for (const v of data.recommendations) {
      assert.equal(v.city, 'Mumbai');
    }
  });

  it('GET /api/venues/recommendations?sport=Badminton filters candidates by sport', async () => {
    const res = await fetch(`${baseUrl}/api/venues/recommendations?sport=Badminton`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    for (const v of data.recommendations) {
      assert.ok(v.sportTypes.includes('Badminton'));
    }
  });

  it('GET /api/venues/recommendations?limit=2 limits the result count', async () => {
    const res = await fetch(`${baseUrl}/api/venues/recommendations?limit=2`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    assert.equal(data.recommendations.length, 2);
  });

  it('Recommendations are sorted descending by matchScore', async () => {
    const res = await fetch(`${baseUrl}/api/venues/recommendations?limit=6`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'ok');
    for (let i = 0; i < data.recommendations.length - 1; i++) {
      assert.ok(data.recommendations[i].matchScore >= data.recommendations[i + 1].matchScore);
    }
  });
});
