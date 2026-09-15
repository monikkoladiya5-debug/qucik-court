process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { store } from '../data/store.js';

let server;
let baseUrl;
let customer1Token;
let customer2Token;
let owner1Token;
let initialBookingsCount;
let initialCourtsCount;
let venueId;
let courtId;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  initialBookingsCount = store.bookings.length;
  initialCourtsCount = store.courts.length;

  // 1. Customer 1 Token (u-101)
  const cust1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cust1Data = await cust1Res.json();
  customer1Token = cust1Data.token;

  // 2. Customer 2 Token
  const cust2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Joshi',
      email: `rohan.joshi.${Date.now()}@quickcourt.com`,
      password: 'customer123',
    }),
  });
  const cust2Data = await cust2Res.json();
  customer2Token = cust2Data.token;

  // 3. Owner 1 Token (u-102)
  const o1Res = await fetch(`${baseUrl}/api/auth/owner-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@quickcourt.com', password: 'owner123' }),
  });
  const o1Data = await o1Res.json();
  owner1Token = o1Data.token;

  // Target Venue & Court
  const ownerVenue = store.venues.find((v) => v.ownerId === 'u-102');
  venueId = ownerVenue ? ownerVenue.id : 'v-1';

  const cRes = await fetch(`${baseUrl}/api/venues/${venueId}/courts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      name: 'Phase 10 Booking Pass Test Court',
      sport: 'Badminton',
      courtType: 'Pro Mat',
      pricePerHour: 450,
      indoor: true,
      operatingHours: '06:00 AM - 11:00 PM',
      isActive: true,
    }),
  });
  const cData = await cRes.json();
  courtId = cData.court.id;
});

after(async () => {
  store.bookings.splice(initialBookingsCount);
  store.courts.splice(initialCourtsCount);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 10: Booking ID + Check-In Token + Digital Pass', () => {
  let bookingId1;
  let initialToken;
  const date1 = '2026-11-10';

  it('1. Server generates unique stable Booking ID upon creation; client cannot override it', async () => {
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date1}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: date1,
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
        id: 'CLIENT-SUPPLIED-FAKE-ID', // should be ignored
        checkInToken: 'CLIENT-FAKE-TOKEN', // should be ignored
      }),
    });

    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    bookingId1 = createData.booking.id;

    assert.notEqual(bookingId1, 'CLIENT-SUPPLIED-FAKE-ID');
    assert.match(bookingId1, /^BK-/);
    assert.equal(createData.booking.status, 'REQUESTED');
    // REQUESTED booking does not expose checkInToken
    assert.equal(createData.booking.checkInToken, undefined);
  });

  it('2. REQUESTED booking does not expose check-in token', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${bookingId1}`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.booking.status, 'REQUESTED');
    assert.equal(data.booking.checkInToken, undefined);
  });

  it('3. Booking ID remains unchanged after owner approval', async () => {
    const appRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const appData = await appRes.json();

    assert.equal(appRes.status, 200);
    assert.equal(appData.booking.id, bookingId1);
    assert.equal(appData.booking.status, 'APPROVED');
    assert.equal(appData.booking.checkInToken, undefined);
  });

  it('4. Confirmed online payment generates server-side check-in token and preserves Booking ID', async () => {
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
      }),
    });
    const payData = await payRes.json();

    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.id, bookingId1);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.ok(payData.booking.checkInToken);
    assert.match(payData.booking.checkInToken, /^CHK-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);

    initialToken = payData.booking.checkInToken;
  });

  it('5. Check-In Token remains stable on subsequent fetches', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${bookingId1}`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.booking.id, bookingId1);
    assert.equal(data.booking.checkInToken, initialToken);
  });

  it('6. BOLA / Tenant Isolation: Customer 2 cannot access Customer 1 booking pass', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${bookingId1}`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });

    assert.equal(res.status, 403);
  });

  it('7. Pay at Venue confirmed booking receives check-in token with PENDING payment status', async () => {
    const date2 = '2026-11-11';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date2}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: date2,
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });
    const createData = await createRes.json();
    const venueBookingId = createData.booking.id;

    await fetch(`${baseUrl}/api/bookings/${venueBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    const payRes = await fetch(`${baseUrl}/api/bookings/${venueBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'Pay at Venue',
      }),
    });
    const payData = await payRes.json();

    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.id, venueBookingId);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PENDING');
    assert.equal(payData.booking.paymentMethod, 'Pay at Venue');
    assert.ok(payData.booking.checkInToken);
    assert.match(payData.booking.checkInToken, /^CHK-/);
  });

  it('8. REJECTED booking does not expose a check-in token', async () => {
    const date3 = '2026-11-12';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date3}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: date3,
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });
    const createData = await createRes.json();
    const rejectBookingId = createData.booking.id;

    await fetch(`${baseUrl}/api/bookings/${rejectBookingId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    const checkRes = await fetch(`${baseUrl}/api/bookings/${rejectBookingId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const checkData = await checkRes.json();

    assert.equal(checkRes.status, 200);
    assert.equal(checkData.booking.status, 'REJECTED');
    assert.equal(checkData.booking.checkInToken, undefined);
  });

  it('9. Multi-Hour (2-Hour) booking has single stable Booking ID, single check-in token, and full interval', async () => {
    const date4 = '2026-11-13';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date4}`);
    const availData = await availRes.json();
    
    let startSlot, endSlot;
    for (let i = 0; i < availData.slots.length - 1; i++) {
      if (availData.slots[i].status === 'AVAILABLE' && availData.slots[i + 1].status === 'AVAILABLE') {
        startSlot = availData.slots[i];
        endSlot = availData.slots[i + 1];
        break;
      }
    }
    if (!startSlot) {
      startSlot = availData.slots[0];
      endSlot = availData.slots[1];
    }

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: date4,
        startTime: startSlot.startTime,
        endTime: endSlot.endTime,
      }),
    });
    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    const multi2Id = createData.booking.id;
    assert.equal(createData.booking.totalPrice, 450 * 2);

    await fetch(`${baseUrl}/api/bookings/${multi2Id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    const payRes = await fetch(`${baseUrl}/api/bookings/${multi2Id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'Card' }),
    });
    const payData = await payRes.json();

    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.id, multi2Id);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.startTime, startSlot.startTime);
    assert.equal(payData.booking.endTime, endSlot.endTime);
    assert.ok(payData.booking.checkInToken);
  });

  it('10. Multi-Hour (3-Hour) booking has single stable Booking ID, single check-in token, and full interval', async () => {
    const date5 = '2026-11-14';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date5}`);
    const availData = await availRes.json();
    
    let startSlot, endSlot;
    for (let i = 0; i < availData.slots.length - 2; i++) {
      if (
        availData.slots[i].status === 'AVAILABLE' &&
        availData.slots[i + 1].status === 'AVAILABLE' &&
        availData.slots[i + 2].status === 'AVAILABLE'
      ) {
        startSlot = availData.slots[i];
        endSlot = availData.slots[i + 2];
        break;
      }
    }
    if (!startSlot) {
      startSlot = availData.slots[0];
      endSlot = availData.slots[2];
    }

    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: date5,
        startTime: startSlot.startTime,
        endTime: endSlot.endTime,
      }),
    });
    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    const multi3Id = createData.booking.id;
    assert.equal(createData.booking.totalPrice, 450 * 3);

    await fetch(`${baseUrl}/api/bookings/${multi3Id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    const payRes = await fetch(`${baseUrl}/api/bookings/${multi3Id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({ paymentMethod: 'UPI' }),
    });
    const payData = await payRes.json();

    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.id, multi3Id);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.startTime, startSlot.startTime);
    assert.equal(payData.booking.endTime, endSlot.endTime);
    assert.ok(payData.booking.checkInToken);
  });
});
