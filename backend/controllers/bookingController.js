import { store, safeBooking } from '../data/store.js';
import {
  parseOperatingHours,
  format12Hour,
  getDeterministicStatus,
} from './courtController.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateBookingId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `BK-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

/**
 * Parses time string like "08:00 AM" into integer hour 0..23.
 * Enforces hourly alignment (minutes === 0).
 */
export function parse12HourTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes !== 0) return null;
  if (hour < 1 || hour > 12) return null;

  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

// ─── CUSTOMER: Create Booking ─────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Requires: authenticate + requireRole('CUSTOMER')
 * Client input: { courtId, date, startTime, endTime }
 * All privileged/financial attributes derived server-side.
 */
export function createBooking(req, res) {
  const { courtId, date, startTime, endTime } = req.body || {};

  // 1. Validate courtId
  if (!courtId || typeof courtId !== 'string' || !courtId.trim()) {
    return res.status(400).json({ status: 'error', message: 'Court ID is required.' });
  }

  const court = store.courts.find((c) => c.id === courtId.trim());
  if (!court) {
    return res.status(404).json({ status: 'error', message: 'Court not found.' });
  }

  if (!court.isActive) {
    return res.status(400).json({
      status: 'error',
      message: 'This court is currently inactive and cannot be booked.',
    });
  }

  // 2. Validate date (format and calendar validity)
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Date is required in YYYY-MM-DD format.' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ status: 'error', message: 'Invalid calendar date.' });
  }

  // 3. Past-date protection
  const todayStr = new Date().toISOString().slice(0, 10);
  if (date < todayStr) {
    return res.status(400).json({
      status: 'error',
      message: 'Bookings cannot be made for past dates.',
    });
  }

  // 4. Validate time range and 1-hour slot duration
  const startHour = parse12HourTime(startTime);
  const endHour = parse12HourTime(endTime);

  if (startHour === null || endHour === null) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid time format. Time must be in "HH:00 AM/PM" format.',
    });
  }

  if (startHour >= endHour || endHour - startHour !== 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Bookings must be for exactly a 1-hour time slot.',
    });
  }

  // Disallow booking time slots that have already passed earlier today
  const now = new Date();
  const currentHour = now.getHours();
  const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if ((date === todayStr || date === localDateStr) && startHour <= currentHour) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot book a time slot that has already passed.',
    });
  }

  // 5. Operating hours validation
  const { startHour: courtStart, endHour: courtEnd } = parseOperatingHours(court.operatingHours);
  if (startHour < courtStart || endHour > courtEnd) {
    return res.status(400).json({
      status: 'error',
      message: `Requested slot is outside operating hours (${court.operatingHours}).`,
    });
  }

  // 6. Base availability check (active operating schedule)
  const baseStatus = getDeterministicStatus(court, date, startHour);
  if (baseStatus === 'UNAVAILABLE') {
    return res.status(400).json({
      status: 'error',
      message: 'The requested time slot is unavailable on the facility schedule.',
    });
  }

  // 7. Server-side conflict check: detect overlapping confirmed bookings
  const hasConflict = store.bookings.some((b) => {
    if (b.courtId !== court.id || b.date !== date || b.status !== 'CONFIRMED') {
      return false;
    }
    const bStart = parse12HourTime(b.startTime);
    const bEnd = parse12HourTime(b.endTime);
    if (bStart === null || bEnd === null) return false;
    // Two intervals [startHour, endHour) and [bStart, bEnd) overlap if startHour < bEnd && endHour > bStart
    return startHour < bEnd && endHour > bStart;
  });

  if (hasConflict) {
    return res.status(409).json({
      status: 'error',
      message: 'The requested time slot has already been booked. Please choose another slot.',
    });
  }

  // 8. Authoritative price calculation derived directly from court
  const pricePerHour = Number(court.pricePerHour);
  const totalPrice = pricePerHour * 1; // 1-hour booking duration

  const nowIso = now.toISOString();

  // 9. Construct booking — client cannot override id, userId, venueId, price, status, or timestamps
  const newBooking = {
    id: generateBookingId(),
    userId: req.user.id,
    courtId: court.id,
    venueId: court.venueId,
    date,
    startTime: format12Hour(startHour),
    endTime: format12Hour(endHour),
    pricePerHour,
    totalPrice,
    status: 'CONFIRMED',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.bookings.push(newBooking);

  return res.status(201).json({
    status: 'ok',
    booking: safeBooking(newBooking),
  });
}

// ─── CUSTOMER: List My Bookings ───────────────────────────────────────────────

/**
 * GET /api/bookings/my
 * Requires: authenticate + requireRole('CUSTOMER')
 * Returns only the authenticated customer's bookings.
 */
export function getMyBookings(req, res) {
  const myBookings = store.bookings
    .filter((b) => b.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({
    status: 'ok',
    count: myBookings.length,
    bookings: myBookings.map(safeBooking),
  });
}

// ─── CUSTOMER: Get Booking Details ────────────────────────────────────────────

/**
 * GET /api/bookings/:id
 * Requires: authenticate + requireRole('CUSTOMER')
 * Enforces object-level ownership check: Customer can only view their own booking.
 */
export function getBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership verification: Customer can only view their own booking
  if (booking.userId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to view this booking.',
    });
  }

  return res.status(200).json({
    status: 'ok',
    booking: safeBooking(booking),
  });
}

// ─── CUSTOMER: Cancel Booking ─────────────────────────────────────────────────

/**
 * DELETE /api/bookings/:id
 * Requires: authenticate + requireRole('CUSTOMER')
 * Object-level ownership check: Customer can only cancel their own booking.
 */
export function cancelBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership verification
  if (booking.userId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to cancel this booking.',
    });
  }

  if (booking.status === 'CANCELLED') {
    return res.status(400).json({
      status: 'error',
      message: 'This booking has already been cancelled.',
    });
  }

  booking.status = 'CANCELLED';
  booking.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: 'Booking cancelled successfully.',
    booking: safeBooking(booking),
  });
}
