process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { parseSmartSearchQuery } from '../controllers/venueController.js';

let server;
let baseUrl;

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

describe('Phase 4: Smart Search Parser Unit Tests', () => {
  const cities = ['Ahmedabad', 'Mumbai', 'Pune', 'Delhi'];
  const sports = ['Badminton', 'Tennis', 'Football', 'Basketball', 'Squash', 'Cricket', 'Pickleball'];

  it('Parses natural query: "badminton courts in Mumbai"', () => {
    const res = parseSmartSearchQuery('badminton courts in Mumbai', cities, sports);
    assert.equal(res.extractedSport, 'Badminton');
    assert.equal(res.extractedCity, 'Mumbai');
    assert.equal(res.keywords.length, 0);
  });

  it('Parses natural query: "indoor badminton under ₹500"', () => {
    const res = parseSmartSearchQuery('indoor badminton under ₹500', cities, sports);
    assert.equal(res.extractedIndoor, true);
    assert.equal(res.extractedSport, 'Badminton');
    assert.equal(res.extractedMaxPrice, 500);
  });

  it('Parses natural query: "football turf in Delhi"', () => {
    const res = parseSmartSearchQuery('football turf in Delhi', cities, sports);
    assert.equal(res.extractedSport, 'Football');
    assert.equal(res.extractedCity, 'Delhi');
  });

  it('Parses natural query: "tennis near Andheri"', () => {
    const res = parseSmartSearchQuery('tennis near Andheri', cities, sports);
    assert.equal(res.extractedSport, 'Tennis');
    assert.ok(res.keywords.includes('andheri'));
  });

  it('Handles case-insensitivity: "INDOOR FOOTBALL UNDER 600"', () => {
    const res = parseSmartSearchQuery('INDOOR FOOTBALL UNDER 600', cities, sports);
    assert.equal(res.extractedIndoor, true);
    assert.equal(res.extractedSport, 'Football');
    assert.equal(res.extractedMaxPrice, 600);
  });

  it('Handles empty or undefined query string', () => {
    const res = parseSmartSearchQuery('', cities, sports);
    assert.equal(res.extractedSport, null);
    assert.equal(res.extractedCity, null);
    assert.equal(res.keywords.length, 0);
  });
});

describe('Phase 4: Venue API Smart Search & Filter Endpoints', () => {
  it('GET /api/venues with empty query returns all active venues', async () => {
    const res = await fetch(`${baseUrl}/api/venues`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.count, store.venues.filter((v) => v.status === 'active').length);
  });

  it('Smart Search: "tennis courts in Mumbai" finds Mumbai Sports Hub', async () => {
    const res = await fetch(`${baseUrl}/api/venues?search=${encodeURIComponent('tennis courts in Mumbai')}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count >= 1);
    const venue = data.venues.find((v) => v.city === 'Mumbai');
    assert.ok(venue);
    assert.ok(venue.sportTypes.includes('Tennis'));
  });

  it('Smart Search: "badminton courts in Pune" finds Koregaon Racquet Club', async () => {
    const res = await fetch(`${baseUrl}/api/venues?search=${encodeURIComponent('badminton courts in Pune')}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count >= 1);
    const venue = data.venues.find((v) => v.city === 'Pune');
    assert.ok(venue);
    assert.ok(venue.sportTypes.includes('Badminton'));
  });

  it('Smart Search: "indoor badminton under ₹500" filters by indoor + sport + maxPrice', async () => {
    const res = await fetch(`${baseUrl}/api/venues?search=${encodeURIComponent('indoor badminton under ₹500')}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count >= 1);
    for (const v of data.venues) {
      assert.equal(v.indoor, true);
      assert.ok(v.sportTypes.includes('Badminton'));
      assert.ok(v.pricePerHour <= 500);
    }
  });

  it('Smart Search: "tennis near Andheri" matches venue by local area and sport', async () => {
    const res = await fetch(`${baseUrl}/api/venues?search=${encodeURIComponent('tennis near Andheri')}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count >= 1);
    const msh = data.venues.find((v) => v.name.includes('Mumbai Sports Hub'));
    assert.ok(msh);
  });

  it('Structured Filters: Combining city=Ahmedabad & sport=Badminton & indoor=true', async () => {
    const res = await fetch(`${baseUrl}/api/venues?city=Ahmedabad&sport=Badminton&indoor=true`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count > 0);
    for (const v of data.venues) {
      assert.equal(v.city, 'Ahmedabad');
      assert.ok(v.sportTypes.includes('Badminton'));
      assert.equal(v.indoor, true);
    }
  });

  it('Structured Filters: maxPrice=400 returns only venues <= ₹400', async () => {
    const res = await fetch(`${baseUrl}/api/venues?maxPrice=400`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.count > 0);
    for (const v of data.venues) {
      assert.ok(v.pricePerHour <= 400);
    }
  });

  it('Sorting: sortBy=price_asc sorts results ascending by price', async () => {
    const res = await fetch(`${baseUrl}/api/venues?sortBy=price_asc`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.venues.length >= 2);
    for (let i = 0; i < data.venues.length - 1; i++) {
      assert.ok(data.venues[i].pricePerHour <= data.venues[i + 1].pricePerHour);
    }
  });

  it('Unsupported/non-existent search returns clean empty results (0 matches)', async () => {
    const res = await fetch(`${baseUrl}/api/venues?search=nonexistentvenuesport99999`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.count, 0);
    assert.deepEqual(data.venues, []);
  });
});
