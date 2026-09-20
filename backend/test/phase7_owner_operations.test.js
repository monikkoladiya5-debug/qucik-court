process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customerToken;
let owner1Token;
let owner2Token;
let initialBookingsCount;
let initialCourtsCount;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  initialBookingsCount = store.bookings.length;
  initialCourtsCount = store.courts.length;

  // 1. Customer Token (u-101 - Rahul Sharma)
  const custRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const custData = await custRes.json();
  customerToken = custData.token;

  // 2. Owner 1 Token (u-102 - Vikram Patel)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // 3. Owner 2 Token (u-104 - Priya Mehta)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;
});

after(async () => {
  store.bookings.splice(initialBookingsCount);
  store.courts.splice(initialCourtsCount);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 7: Owner Operations Dashboard & Lifecycle', () => {
  let created1HrBookingId;
  let created2HrBookingId;
  const testDate = '2029-07-02';

  it('Customer creates a 1-hour booking and a 2-hour multi-hour booking at Owner 1 venue', async () => {
    // 1-hour booking: 06:00 AM - 07:00 AM on court c-1
    const res1 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '06:00 AM',
        endTime: '07:00 AM',
      }),
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.status, 'ok');
    assert.equal(data1.booking.status, 'REQUESTED');
    created1HrBookingId = data1.booking.id;

    // 2-hour continuous multi-hour booking: 07:00 AM - 09:00 AM on court c-1
    const res2 = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '07:00 AM',
        endTime: '09:00 AM',
      }),
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.equal(data2.status, 'ok');
    assert.equal(data2.booking.status, 'REQUESTED');
    assert.equal(data2.booking.totalPrice, data2.booking.pricePerHour * 2);
    created2HrBookingId = data2.booking.id;
  });

  it('Owner 1 Dashboard receives serialized pending requests with player info and continuous duration', async () => {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');

    // Verify 1-hour booking
    const b1 = body.recentBookings.find((b) => b.id === created1HrBookingId);
    assert.ok(b1, '1-hour booking should be in owner dashboard');
    assert.equal(b1.status, 'REQUESTED');
    assert.equal(b1.durationHours, 1);
    assert.equal(b1.playerName, 'Rahul Sharma');
    assert.equal(b1.startTime, '06:00 AM');
    assert.equal(b1.endTime, '07:00 AM');

    // Verify 2-hour multi-hour booking is represented as ONE continuous booking
    const b2 = body.recentBookings.find((b) => b.id === created2HrBookingId);
    assert.ok(b2, '2-hour booking should be in owner dashboard');
    assert.equal(b2.status, 'REQUESTED');
    assert.equal(b2.durationHours, 2);
    assert.equal(b2.playerName, 'Rahul Sharma');
    assert.equal(b2.startTime, '07:00 AM');
    assert.equal(b2.endTime, '09:00 AM');

    // Courts fleet array is populated
    assert.ok(Array.isArray(body.courts));
    assert.ok(body.courts.length > 0);
  });

  it('Cross-Owner Protection: Owner 2 CANNOT approve or reject Owner 1 booking -> 403 Forbidden', async () => {
    // Owner 2 tries to approve Owner 1's booking
    const approveRes = await fetch(`${baseUrl}/api/bookings/${created1HrBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(approveRes.status, 403);
    const approveData = await approveRes.json();
    assert.equal(approveData.status, 'error');

    // Owner 2 tries to reject Owner 1's booking
    const rejectRes = await fetch(`${baseUrl}/api/bookings/${created1HrBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner2Token}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });
    assert.equal(rejectRes.status, 403);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.status, 'error');
  });

  it('Owner 1 approves the 1-hour booking -> transitions to APPROVED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${created1HrBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, 'APPROVED');

    // Verify state in owner dashboard
    const dashRes = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const dashData = await dashRes.json();
    const updatedB1 = dashData.recentBookings.find((b) => b.id === created1HrBookingId);
    assert.equal(updatedB1.status, 'APPROVED');
  });

  it('Owner 1 rejects the 2-hour booking -> transitions to REJECTED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${created2HrBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, 'REJECTED');

    // Verify state in owner dashboard
    const dashRes = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const dashData = await dashRes.json();
    const updatedB2 = dashData.recentBookings.find((b) => b.id === created2HrBookingId);
    assert.equal(updatedB2.status, 'REJECTED');
  });

  it('Owner 1 can update court active status using PUT /api/courts/:id', async () => {
    // Toggle c-1 active state to false
    const toggleRes = await fetch(`${baseUrl}/api/courts/c-1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(toggleRes.status, 200);
    const toggleData = await toggleRes.json();
    assert.equal(toggleData.court.isActive, false);

    // Revert back to true
    const revertRes = await fetch(`${baseUrl}/api/courts/c-1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(revertRes.status, 200);
    const revertData = await revertRes.json();
    assert.equal(revertData.court.isActive, true);
  });
});
