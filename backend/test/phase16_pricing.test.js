process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { classifyTimeSlot } from '../controllers/pricingController.js';

let server;
let baseUrl;
let customerToken;
let owner1Token;
let owner2Token;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Log in Customer 1 (user@quickcourt.com - password: customer123)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cData = await cRes.json();
  customerToken = cData.token;

  // Log in Owner 1 (owner@quickcourt.com - password: owner123)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Log in Owner 2 (owner2@quickcourt.com - password: owner2pass)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 16 — Price Comparison & Smart Pricing', () => {

  describe('Deterministic Peak vs Off-Peak Slot Classification', () => {
    it('should classify weekday evenings (17:00-22:00) as PEAK', () => {
      // 2029-08-01 is Wednesday (Weekday)
      const res = classifyTimeSlot('2029-08-01', 18, 19);
      assert.strictEqual(res.isPeak, true);
      assert.strictEqual(res.tier, 'PEAK');
      assert.strictEqual(res.isWeekend, false);
    });

    it('should classify weekday daytimes (08:00-16:00) as OFF_PEAK', () => {
      // 2029-08-01 is Wednesday
      const res = classifyTimeSlot('2029-08-01', 10, 11);
      assert.strictEqual(res.isPeak, false);
      assert.strictEqual(res.tier, 'OFF_PEAK');
      assert.strictEqual(res.isWeekend, false);
    });

    it('should classify weekend mornings (07:00-11:00) as PEAK', () => {
      // 2029-08-04 is Saturday (Weekend)
      const res = classifyTimeSlot('2029-08-04', 8, 9);
      assert.strictEqual(res.isPeak, true);
      assert.strictEqual(res.tier, 'PEAK');
      assert.strictEqual(res.isWeekend, true);
    });

    it('should classify weekend afternoons (12:00-15:00) as OFF_PEAK', () => {
      // 2029-08-04 is Saturday
      const res = classifyTimeSlot('2029-08-04', 13, 14);
      assert.strictEqual(res.isPeak, false);
      assert.strictEqual(res.tier, 'OFF_PEAK');
      assert.strictEqual(res.isWeekend, true);
    });
  });

  describe('GET /api/pricing/compare (Customer Transparent Price Comparison)', () => {
    it('should return comparison list with market summary for valid query', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&city=Ahmedabad&duration=1`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.durationHours, 1);
      assert.ok(Array.isArray(data.comparisons));
      assert.ok(data.comparisons.length > 0);

      // Verify market summary metrics
      assert.ok(data.summary);
      assert.ok(data.summary.minPricePerHour > 0);
      assert.ok(data.summary.maxPricePerHour >= data.summary.minPricePerHour);
      assert.ok(data.summary.avgPricePerHour > 0);

      // Check Best Price badge assignment
      const minPrice = Math.min(...data.comparisons.map(c => c.pricePerHour));
      for (const item of data.comparisons) {
        if (item.pricePerHour === minPrice) {
          assert.strictEqual(item.isBestPrice, true);
        }
        assert.strictEqual(item.totalPrice, item.pricePerHour * 1);
      }
    });

    it('should calculate multi-hour total price correctly for duration=3', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&city=Ahmedabad&duration=3`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.durationHours, 3);
      for (const item of data.comparisons) {
        assert.strictEqual(item.totalPrice, item.pricePerHour * 3);
      }
    });

    it('should tag peak pricingTier when date and timeSlot are provided', async () => {
      // Weekday evening (Peak)
      const resPeak = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&date=2029-08-01&startTime=06:00%20PM`);
      assert.strictEqual(resPeak.status, 200);
      const dataPeak = await resPeak.json();
      assert.strictEqual(dataPeak.pricingTier, 'PEAK');

      // Weekday morning (Off-Peak)
      const resOff = await fetch(`${baseUrl}/api/pricing/compare?sport=Badminton&date=2029-08-01&startTime=09:00%20AM`);
      assert.strictEqual(resOff.status, 200);
      const dataOff = await resOff.json();
      assert.strictEqual(dataOff.pricingTier, 'OFF_PEAK');
    });

    it('should return empty comparison list gracefully if sport has no active venues', async () => {
      const res = await fetch(`${baseUrl}/api/pricing/compare?sport=Polo&city=Ahmedabad`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.comparisons.length, 0);
      assert.strictEqual(data.summary.minPricePerHour, 0);
    });
  });

  describe('GET /api/owner/pricing-intelligence (Owner Market & Demand Telemetry)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/owner/pricing-intelligence`);
      assert.strictEqual(res.status, 401);
    });

    it('should reject CUSTOMER role with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/owner/pricing-intelligence`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('should return strict isolated telemetry for Owner 1', async () => {
      const res = await fetch(`${baseUrl}/api/owner/pricing-intelligence`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.status, 'ok');
      assert.ok(Array.isArray(data.pricingIntelligence));
      assert.ok(data.pricingIntelligence.length > 0);

      // Verify Owner 1 courts only
      const owner1Venues = store.venues.filter(v => v.ownerId === 'u-102').map(v => v.id);
      for (const item of data.pricingIntelligence) {
        assert.ok(owner1Venues.includes(item.venueId), `Court ${item.courtId} does not belong to Owner 1`);
        assert.ok(item.basePricePerHour > 0);
        assert.ok(item.marketContext.marketAvgPrice > 0);
        assert.ok(item.smartPricing.recommendedPeakPrice > 0);
        assert.ok(item.smartPricing.recommendedOffPeakPrice > 0);
        assert.ok(item.metrics);
        assert.ok(typeof item.metrics.confirmedBookings === 'number');
        assert.ok(typeof item.smartPricing.recommendationReason === 'string');
      }
    });

    it('should isolate Owner 2 from Owner 1 telemetry (BOLA/IDOR protection)', async () => {
      const res2 = await fetch(`${baseUrl}/api/owner/pricing-intelligence`, {
        headers: { Authorization: `Bearer ${owner2Token}` },
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();

      const owner2Venues = store.venues.filter(v => v.ownerId === 'u-104').map(v => v.id);
      for (const item of data2.pricingIntelligence) {
        assert.ok(owner2Venues.includes(item.venueId), `Court ${item.courtId} does not belong to Owner 2`);
      }
    });
  });

  describe('Server-Authoritative Pricing Integrity', () => {
    it('should compute booking totalPrice strictly on the server regardless of client body payload', async () => {
      const court = store.courts.find(c => c.isActive);
      assert.ok(court, 'Need active court');

      // Attempt to tamper with totalPrice (sending 1 rupee)
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          courtId: court.id,
          date: '2029-08-15',
          startTime: '08:00 AM',
          endTime: '10:00 AM',
          totalPrice: 1, // Malicious override attempt
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      
      // Expected server calculation: 2 hours * pricePerHour
      const expectedTotal = court.pricePerHour * 2;
      assert.strictEqual(data.booking.totalPrice, expectedTotal);
      assert.strictEqual(data.booking.durationHours, 2);
    });

    it('should verify that smart pricing recommendations are purely advisory and do not mutate base court rates', async () => {
      const court = store.courts[0];
      const initialPrice = court.pricePerHour;

      // Request pricing intelligence multiple times
      await fetch(`${baseUrl}/api/owner/pricing-intelligence`, {
        headers: { Authorization: `Bearer ${owner1Token}` },
      });

      // Verify the court in store was never modified
      const courtAfter = store.courts.find(c => c.id === court.id);
      assert.strictEqual(courtAfter.pricePerHour, initialPrice);
    });
  });
});
