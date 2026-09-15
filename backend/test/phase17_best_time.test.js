process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let ownerToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Customer login
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Owner login
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

describe('Phase 17 — Best Time to Play Advisory Engine', () => {

  describe('GET /api/pricing/best-times — Core Advisory Recommendations', () => {
    it('should return structured recommendations with summary for a valid date and duration', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Badminton&city=Ahmedabad&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.durationHours, 1);
      assert.ok(typeof data.totalAnalyzed === 'number');
      assert.ok(data.summary);
      assert.ok(typeof data.summary.bestTimesCount === 'number');
      assert.ok(typeof data.summary.goodTimesCount === 'number');
      assert.ok(typeof data.summary.popularTimesCount === 'number');
      assert.ok(Array.isArray(data.recommendations));
      assert.ok(data.recommendations.length > 0);

      // Verify recommendation item fields
      const first = data.recommendations[0];
      assert.ok(first.courtId);
      assert.ok(first.courtName);
      assert.ok(first.venueId);
      assert.ok(first.startTime);
      assert.ok(first.endTime);
      assert.strictEqual(first.durationHours, 1);
      assert.ok(first.pricePerHour > 0);
      assert.strictEqual(first.totalPrice, first.pricePerHour * 1);
      assert.ok(['BEST_TIME', 'GOOD_TIME', 'POPULAR_TIME', 'LIMITED_AVAILABILITY', 'UNAVAILABLE'].includes(first.category));
      assert.ok(typeof first.score === 'number');
      assert.ok(Array.isArray(first.reasons));
      assert.ok(first.reasons.length > 0);
    });

    it('should calculate multi-hour continuous slots accurately for duration=2 and duration=3', async () => {
      for (const dur of [2, 3]) {
        const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Badminton&city=Ahmedabad&duration=${dur}`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        assert.strictEqual(data.durationHours, dur);
        for (const rec of data.recommendations) {
          assert.strictEqual(rec.durationHours, dur);
          assert.strictEqual(rec.totalPrice, rec.pricePerHour * dur);
          assert.strictEqual(rec.endHour - rec.startHour, dur);
        }
      }
    });

    it('should prioritize BEST_TIME and GOOD_TIME with higher scores above LIMITED_AVAILABILITY and UNAVAILABLE', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Badminton&city=Ahmedabad&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      const availableRecs = data.recommendations.filter(r => r.isAvailable);
      const unavailableRecs = data.recommendations.filter(r => !r.isAvailable);

      if (availableRecs.length > 0 && unavailableRecs.length > 0) {
        assert.ok(availableRecs[0].score > unavailableRecs[0].score);
        assert.strictEqual(unavailableRecs[0].category, 'UNAVAILABLE');
      }
    });

    it('should classify peak vs off-peak slots accurately within recommendations', async () => {
      // Future date: 2029-08-01 (Wednesday)
      const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Badminton&date=2029-08-01&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      for (const rec of data.recommendations) {
        if (rec.startHour >= 17 && rec.startHour < 22) {
          assert.strictEqual(rec.isPeak, true);
          assert.strictEqual(rec.periodType, 'PEAK');
        } else {
          assert.strictEqual(rec.isPeak, false);
          assert.strictEqual(rec.periodType, 'OFF_PEAK');
        }
      }
    });
  });

  describe('Court Status, Maintenance & Occupancy Filtering', () => {
    it('should exclude inactive / maintenance courts from recommendation analysis', async () => {
      // Find an active court and temporarily deactivate it
      const activeCourt = store.courts.find(c => c.isActive);
      assert.ok(activeCourt);

      const courtId = activeCourt.id;
      const prevActive = activeCourt.isActive;
      activeCourt.isActive = false;

      const res = await fetch(`${baseUrl}/api/pricing/best-times?courtId=${courtId}&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.totalAnalyzed, 0);
      assert.strictEqual(data.recommendations.length, 0);

      // Restore active status
      activeCourt.isActive = prevActive;
    });

    it('should mark booked or overlapping intervals as UNAVAILABLE', async () => {
      const court = store.courts.find(c => c.isActive);
      assert.ok(court);

      // Create a test booking on 2029-09-20 from 06:00 PM to 07:00 PM
      const testDate = '2029-09-20';
      const bookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: court.id,
          date: testDate,
          startTime: '06:00 PM',
          endTime: '07:00 PM',
        }),
      });
      assert.strictEqual(bookRes.status, 201);

      // Query best times for this court on that date
      const res = await fetch(`${baseUrl}/api/pricing/best-times?courtId=${court.id}&date=${testDate}&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      const bookedSlotRec = data.recommendations.find(r => r.startTime === '06:00 PM');
      assert.ok(bookedSlotRec, 'Booked slot should be evaluated in recommendations');
      assert.strictEqual(bookedSlotRec.isAvailable, false);
      assert.strictEqual(bookedSlotRec.category, 'UNAVAILABLE');
    });
  });

  describe('Input Validation & Edge Cases', () => {
    it('should return 400 Bad Request when date is in the past', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?date=2020-01-01&duration=1`);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.status, 'error');
      assert.ok(data.message.toLowerCase().includes('past'));
    });

    it('should return 400 Bad Request when date format is invalid', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?date=not-a-date&duration=1`);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.status, 'error');
      assert.ok(data.message.toLowerCase().includes('date format'));
    });

    it('should return 400 Bad Request when duration is <= 0 or > 6', async () => {
      const resZero = await fetch(`${baseUrl}/api/pricing/best-times?duration=0`);
      assert.strictEqual(resZero.status, 400);

      const resHigh = await fetch(`${baseUrl}/api/pricing/best-times?duration=10`);
      assert.strictEqual(resHigh.status, 400);
    });

    it('should return empty recommendations gracefully when sport has no courts', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Polo`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.totalAnalyzed, 0);
      assert.strictEqual(data.recommendations.length, 0);
    });

    it('should not leak sensitive user password hashes or auth tokens in the response', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/best-times?sport=Badminton&city=Ahmedabad&duration=1`);
      const body = await res.text();
      assert.ok(!body.includes('passwordHash'));
      assert.ok(!body.includes('customer123'));
      assert.ok(!body.includes('owner123'));
    });
  });
});
