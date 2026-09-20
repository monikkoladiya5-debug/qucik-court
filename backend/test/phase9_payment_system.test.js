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

  // 1. Customer 1 Token (u-101 - Rahul Sharma)
  const cust1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@quickcourt.com', password: 'customer123' }),
  });
  const cust1Data = await cust1Res.json();
  customer1Token = cust1Data.token;

  // 2. Customer 2 Token (signup a fresh customer)
  const cust2Res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pooja Verma',
      email: `pooja.verma.${Date.now()}@quickcourt.com`,
      password: 'customer123',
    }),
  });
  const cust2Data = await cust2Res.json();
  customer2Token = cust2Data.token;

  // 3. Owner 1 Token (u-102 - Vikram Patel)
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

  // Create a dedicated active court with full 06:00 AM - 10:00 PM operating hours for clear multi-hour booking tests
  const cRes = await fetch(`${baseUrl}/api/venues/${venueId}/courts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${owner1Token}`,
    },
    body: JSON.stringify({
      name: 'Phase 9 Multi-Hour Test Court',
      sport: 'Badminton',
      courtType: 'Pro Synthetic',
      pricePerHour: 500,
      indoor: true,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
    }),
  });
  const cData = await cRes.json();
  courtId = cData.court.id;
  const courtInStore = store.courts.find((c) => c.id === courtId);
  if (courtInStore) courtInStore.approvalStatus = 'APPROVED';
});

after(async () => {
  store.bookings.splice(initialBookingsCount);
  store.courts.splice(initialCourtsCount);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 9: Payment System & State Transition Rules', () => {
  let bookingId1;
  let bookingDate = '2026-10-10';

  it('1. Rejects payment on a booking currently in REQUESTED status', async () => {
    // Check court availability to pick a valid starting slot
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${bookingDate}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    // Create new booking (starts in REQUESTED)
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        courtId,
        date: bookingDate,
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
      }),
    });

    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    bookingId1 = createData.booking.id;
    assert.equal(createData.booking.status, 'REQUESTED');
    assert.equal(createData.booking.paymentStatus, 'PENDING');

    // Attempt payment while still REQUESTED
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
    assert.equal(payRes.status, 400);
    assert.equal(payData.status, 'error');
  });

  it('2. Owner approves booking -> transitions REQUESTED to APPROVED', async () => {
    const appRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner1Token}`,
      },
    });

    const appData = await appRes.json();
    assert.equal(appRes.status, 200);
    assert.equal(appData.booking.status, 'APPROVED');
    assert.equal(appData.booking.paymentStatus, 'PENDING');
  });

  it('3. Can transition APPROVED -> PAYMENT_PENDING via status update endpoint', async () => {
    const transRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        status: 'PAYMENT_PENDING',
      }),
    });

    const transData = await transRes.json();
    assert.equal(transRes.status, 200);
    assert.equal(transData.booking.status, 'PAYMENT_PENDING');
  });

  it('4. Rejects invalid payment methods (e.g. BITCOIN, CHEQUE)', async () => {
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'BITCOIN',
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 400);
    assert.equal(payData.status, 'error');
  });

  it('5. Rejects payment attempts by another customer (BOLA / Ownership isolation)', async () => {
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer2Token}`, // Customer 2 trying to pay Customer 1's booking
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 403);
    assert.equal(payData.status, 'error');
  });

  it('6. Failed simulated payment does NOT mark booking as PAID or CONFIRMED', async () => {
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
        simulateFailure: true,
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 400);
    assert.equal(payData.status, 'error');
    assert.equal(payData.booking.paymentStatus, 'FAILED');
    assert.notEqual(payData.booking.status, 'CONFIRMED');
  });

  it('7. Valid UPI payment transitions booking to CONFIRMED and paymentStatus to PAID', async () => {
    // Reset booking back to APPROVED for retry
    await fetch(`${baseUrl}/api/bookings/${bookingId1}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner1Token}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        paymentStatus: 'PENDING',
      }),
    });

    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
        amount: 1, // Client attempt to override amount should be ignored
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 200);
    assert.equal(payData.status, 'ok');
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.equal(payData.booking.paymentMethod, 'UPI');
    // Authoritative amount remains untouched
    assert.ok(payData.booking.totalPrice > 1);
  });

  it('8. Rejects duplicate payment attempts on already paid bookings', async () => {
    const dupRes = await fetch(`${baseUrl}/api/bookings/${bookingId1}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
      }),
    });

    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 400);
    assert.equal(dupData.status, 'error');
  });

  it('9. Valid Card payment transitions booking to CONFIRMED and paymentStatus to PAID', async () => {
    const date2 = '2026-10-11';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date2}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    // Create new booking for card test
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
    const cardBookingId = createData.booking.id;

    // Approve booking
    await fetch(`${baseUrl}/api/bookings/${cardBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    // Pay with Card
    const payRes = await fetch(`${baseUrl}/api/bookings/${cardBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'Card',
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.equal(payData.booking.paymentMethod, 'Card');
  });

  it('10. Pay at Venue transitions booking to CONFIRMED with paymentStatus PENDING', async () => {
    const date3 = '2026-10-12';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date3}`);
    const availData = await availRes.json();
    const freeSlot = availData.slots.find((s) => s.status === 'AVAILABLE') || availData.slots[0];

    // Create new booking for pay at venue
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
    const venueBookingId = createData.booking.id;

    // Approve booking
    await fetch(`${baseUrl}/api/bookings/${venueBookingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    // Pay with Pay at Venue
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
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PENDING');
    assert.equal(payData.booking.paymentMethod, 'Pay at Venue');
  });

  it('11. Multi-Hour Booking: 2-hour continuous booking payment calculates exact server rate (2x)', async () => {
    const date4 = '2026-10-13';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date4}`);
    const availData = await availRes.json();
    
    // Find 2 consecutive available slots
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

    // Create 2-hour booking
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
    const bookingId2Hour = createData.booking.id;
    assert.equal(createData.booking.totalPrice, createData.booking.pricePerHour * 2);

    // Approve booking
    await fetch(`${baseUrl}/api/bookings/${bookingId2Hour}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    // Pay booking
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId2Hour}/pay`, {
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
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.equal(payData.booking.totalPrice, createData.booking.pricePerHour * 2);
  });

  it('12. Multi-Hour Booking: 3-hour continuous booking payment calculates exact server rate (3x)', async () => {
    const date5 = '2026-10-14';
    const availRes = await fetch(`${baseUrl}/api/courts/${courtId}/availability?date=${date5}`);
    const availData = await availRes.json();
    
    // Find 3 consecutive available slots
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

    // Create 3-hour booking
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
    const bookingId3Hour = createData.booking.id;
    assert.equal(createData.booking.totalPrice, createData.booking.pricePerHour * 3);

    // Approve booking
    await fetch(`${baseUrl}/api/bookings/${bookingId3Hour}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner1Token}` },
    });

    // Pay booking
    const payRes = await fetch(`${baseUrl}/api/bookings/${bookingId3Hour}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer1Token}`,
      },
      body: JSON.stringify({
        paymentMethod: 'Card',
      }),
    });

    const payData = await payRes.json();
    assert.equal(payRes.status, 200);
    assert.equal(payData.booking.status, 'CONFIRMED');
    assert.equal(payData.booking.paymentStatus, 'PAID');
    assert.equal(payData.booking.totalPrice, createData.booking.pricePerHour * 3);
  });
});
