process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../config/bookingStates.js';

let server;
let baseUrl;
let customerToken;
let customer2Token;
let ownerToken;
let owner2Token;
let adminToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Customer 1 (user@quickcourt.com - u-101)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const c1Data = await c1Res.json();
  customerToken = c1Data.token;

  // Customer 2 (signup)
  const c2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Customer',
      email: 'p2_cust2@example.com',
      password: 'password123',
      role: 'CUSTOMER',
    }),
  });
  const c2Data = await c2Res.json();
  customer2Token = c2Data.token;

  // Owner 1 (owner@quickcourt.com - u-102 owns v-1, v-2, etc.)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  ownerToken = o1Data.token;

  // Owner 2 (owner2@quickcourt.com - u-104)
  const o2Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner2@quickcourt.com', password: 'owner2pass' }),
  });
  const o2Data = await o2Res.json();
  owner2Token = o2Data.token;

  // Admin (admin@quickcourt.com - u-103)
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

describe('Phase 2: Booking Lifecycle & Initial State Foundation', () => {
  let createdBookingId;
  const testDate = '2026-12-10';

  it('New booking creation starts strictly in REQUESTED status with PENDING payment status', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '09:00 AM',
        endTime: '10:00 AM',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.booking.status, BOOKING_STATUS.REQUESTED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);
    assert.equal(data.booking.totalPrice, 400); // Server-side price for c-1
    createdBookingId = data.booking.id;
  });

  it('Booking in REQUESTED status holds the slot and prevents conflict (409)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '09:00 AM',
        endTime: '10:00 AM',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.match(data.message, /already been booked/i);
  });

  it('Court availability endpoint shows the requested slot as UNAVAILABLE', async () => {
    const res = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
    const data = await res.json();
    const slot = data.slots.find((s) => s.startTime === '09:00 AM');
    assert.ok(slot);
    assert.equal(slot.status, 'UNAVAILABLE');
  });

  it('Non-owner cannot approve the booking (403 Forbidden)', async () => {
    // Owner 2 does not own venue v-1
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner2Token}` },
    });
    assert.equal(res.status, 403);
  });

  it('Customer cannot approve their own booking (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('Venue Owner approves booking -> transitions REQUESTED to APPROVED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.status, BOOKING_STATUS.APPROVED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PENDING);
  });

  it('Customer processes demo payment -> transitions APPROVED to CONFIRMED / PAID', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.status, BOOKING_STATUS.CONFIRMED);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PAID);
    assert.equal(data.booking.paymentMethod, 'UPI');
  });

  it('Venue Owner can check-in confirmed booking -> transitions to CHECKED_IN', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status: BOOKING_STATUS.CHECKED_IN }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.status, BOOKING_STATUS.CHECKED_IN);
    assert.equal(data.booking.paymentStatus, PAYMENT_STATUS.PAID);
  });

  it('Venue Owner completes checked-in booking -> transitions to COMPLETED', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status: BOOKING_STATUS.COMPLETED }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.booking.status, BOOKING_STATUS.COMPLETED);
  });

  it('Rejects invalid transition from terminal COMPLETED state -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: BOOKING_STATUS.REQUESTED }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /invalid state transition/i);
  });
});

describe('Phase 2: Alternative Rejection & Cancellation Flows', () => {
  const testDate = '2026-12-15';
  let rejectBookingId;
  let cancelBookingId;

  it('Owner rejects requested booking -> transitions to REJECTED', async () => {
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '11:00 AM',
        endTime: '12:00 PM',
      }),
    });
    const createData = await createRes.json();
    rejectBookingId = createData.booking.id;

    const rejectRes = await fetch(`${baseUrl}/api/bookings/${rejectBookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'COURT_UNAVAILABLE' }),
    });

    assert.equal(rejectRes.status, 200);
    const data = await rejectRes.json();
    assert.equal(data.booking.status, BOOKING_STATUS.REJECTED);
  });

  it('Rejected booking frees slot for other players', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/c-1/availability?date=${testDate}`);
    const availData = await availRes.json();
    const slot = availData.slots.find((s) => s.startTime === '11:00 AM');
    assert.ok(slot);
    assert.equal(slot.status, 'AVAILABLE');

    // Customer 2 can now book the same slot
    const bookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '11:00 AM',
        endTime: '12:00 PM',
      }),
    });
    assert.equal(bookRes.status, 201);
  });

  it('Cancelling a paid booking marks paymentStatus as REFUNDED', async () => {
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        courtId: 'c-1',
        date: testDate,
        startTime: '02:00 PM',
        endTime: '03:00 PM',
      }),
    });
    const createData = await createRes.json();
    cancelBookingId = createData.booking.id;

    // Approve & Pay
    await fetch(`${baseUrl}/api/bookings/${cancelBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    await fetch(`${baseUrl}/api/bookings/${cancelBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ paymentMethod: 'Card' }),
    });

    // Customer cancels
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${cancelBookingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.booking.status, BOOKING_STATUS.CANCELLED);
    assert.equal(cancelData.booking.paymentStatus, PAYMENT_STATUS.REFUNDED);
  });
});
