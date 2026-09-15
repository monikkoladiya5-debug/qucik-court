import crypto from 'crypto';
import { store, safeBooking } from '../data/store.js';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  VALID_BOOKING_TRANSITIONS,
  VALID_PAYMENT_TRANSITIONS,
  isBookingActive,
  isValidBookingTransition,
  isValidPaymentTransition,
} from '../config/bookingStates.js';
import {
  parseOperatingHours,
  format12Hour,
  getDeterministicStatus,
} from './courtController.js';
import {
  createNotification,
  NOTIFICATION_TYPES,
} from './notificationController.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateBookingId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `BK-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function generateCheckInToken() {
  const randHex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `CHK-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 12)}`;
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

/**
 * Checks whether an authenticated user is the owner of the venue for the booking.
 */
export function isVenueOwnerForBooking(user, booking) {
  if (!user || !booking) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'OWNER') return false;
  const venue = store.venues.find((v) => v.id === booking.venueId);
  return Boolean(venue && venue.ownerId === user.id);
}

// ─── CUSTOMER: Create Booking ─────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Requires: authenticate + requireRole('CUSTOMER')
 * Client input: { courtId, date, startTime, endTime }
 * Initial State: REQUESTED (Payment: PENDING)
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

  const venue = store.venues.find((v) => v.id === court.venueId);
  if (venue && ['REJECTED', 'SUSPENDED'].includes(venue.verificationStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Bookings cannot be made at this facility because its verification status is ${venue.verificationStatus.toLowerCase()}.`,
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

  // 4. Validate time range and multi-hour continuous duration
  const startHour = parse12HourTime(startTime);
  const endHour = parse12HourTime(endTime);

  if (startHour === null || endHour === null) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid time format. Time must be in "HH:00 AM/PM" format.',
    });
  }

  const durationHours = endHour - startHour;
  if (durationHours < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'End time must be after start time.',
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

  // 6. Base availability check: every hourly segment in [startHour, endHour) must be available
  for (let h = startHour; h < endHour; h++) {
    const baseStatus = getDeterministicStatus(court, date, h);
    if (baseStatus === 'UNAVAILABLE') {
      return res.status(400).json({
        status: 'error',
        message: `The time slot ${format12Hour(h)} - ${format12Hour(h + 1)} is unavailable on the facility schedule.`,
      });
    }
  }

  // 7. Server-side conflict check: detect active overlapping bookings
  const hasConflict = store.bookings.some((b) => {
    if (b.courtId !== court.id || b.date !== date || !isBookingActive(b.status)) {
      return false;
    }
    const bStart = parse12HourTime(b.startTime);
    const bEnd = parse12HourTime(b.endTime);
    if (bStart === null || bEnd === null) return false;
    return startHour < bEnd && endHour > bStart;
  });

  if (hasConflict) {
    return res.status(409).json({
      status: 'error',
      message: 'The requested time slot has already been booked. Please choose another slot.',
    });
  }

  // 8. Authoritative price calculation derived directly from court rate and duration
  const pricePerHour = Number(court.pricePerHour);
  const totalPrice = pricePerHour * durationHours;

  const nowIso = now.toISOString();

  // 9. Construct booking — starts strictly as REQUESTED, paymentStatus PENDING
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
    status: BOOKING_STATUS.REQUESTED,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentMethod: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.bookings.push(newBooking);

  // Phase 15: Create transactional notifications for Customer and Venue Owner
  createNotification({
    recipientUserId: newBooking.userId,
    type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
    title: 'Booking Request Submitted',
    message: `Your booking request for ${court.name} on ${newBooking.date} (${newBooking.startTime} - ${newBooking.endTime}) is submitted.`,
    bookingId: newBooking.id,
    venueId: newBooking.venueId,
  });

  if (venue && venue.ownerId) {
    createNotification({
      recipientUserId: venue.ownerId,
      type: NOTIFICATION_TYPES.NEW_BOOKING_REQUEST,
      title: 'New Booking Request',
      message: `New booking request #${newBooking.id} received for ${court.name} on ${newBooking.date} (${newBooking.startTime} - ${newBooking.endTime}).`,
      bookingId: newBooking.id,
      venueId: newBooking.venueId,
    });
  }

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

// ─── GET: Single Booking Details ──────────────────────────────────────────────

/**
 * GET /api/bookings/:id
 * Requires: authenticate
 * Object-level ownership check: Customer sees own booking, Owner sees venue's booking, Admin sees any.
 */
export function getBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership verification
  const isCustomer = req.user.role === 'CUSTOMER' && booking.userId === req.user.id;
  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isCustomer && !isOwner && !isAdmin) {
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

export const ALLOWED_CANCELLATION_REASONS = [
  'Plans changed',
  'Schedule conflict',
  'Found another time',
  'Venue issue',
  'Other',
];

// ─── CANCEL: Cancel Booking ───────────────────────────────────────────────────

/**
 * POST /api/bookings/:id/cancel
 * DELETE /api/bookings/:id
 * Requires: authenticate
 * Object-level ownership check: Customer can cancel own booking, Owner can cancel venue's booking, Admin can cancel any.
 */
export function cancelBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership verification
  const isCustomer = req.user.role === 'CUSTOMER' && booking.userId === req.user.id;
  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isCustomer && !isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to cancel this booking.',
    });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking has already been cancelled.',
    });
  }

  if ([BOOKING_STATUS.REJECTED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CHECKED_IN].includes(booking.status)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot cancel a booking that is ${booking.status}.`,
    });
  }

  if (!isValidBookingTransition(booking.status, BOOKING_STATUS.CANCELLED)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot cancel a booking that is ${booking.status}.`,
    });
  }

  // Validate cancellation reason if provided
  const { reason, note } = req.body || {};
  let validatedReason = 'Plans changed';
  if (reason !== undefined && reason !== null && reason !== '') {
    if (typeof reason !== 'string' || !ALLOWED_CANCELLATION_REASONS.includes(reason.trim())) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid cancellation reason. Allowed reasons: ${ALLOWED_CANCELLATION_REASONS.join(', ')}`,
      });
    }
    validatedReason = reason.trim();
  }

  // Validate optional note
  let validatedNote = null;
  if (note !== undefined && note !== null && note !== '') {
    if (typeof note !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Cancellation note must be a string.',
      });
    }
    if (note.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'Cancellation note must be 200 characters or fewer.',
      });
    }
    validatedNote = note.trim();
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = validatedReason;
  if (validatedNote) {
    booking.cancellationNote = validatedNote;
  }
  booking.cancelledAt = new Date().toISOString();

  // If already paid online, mark as REFUNDED. If Pay at Venue / PENDING, remain PENDING.
  if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }

  booking.updatedAt = new Date().toISOString();

  // Phase 15: Cancellation Notifications
  const court = store.courts.find((c) => c.id === booking.courtId);
  const venue = store.venues.find((v) => v.id === (booking.venueId || court?.venueId));
  const courtName = court?.name || 'court';

  if (isCustomer) {
    createNotification({
      recipientUserId: booking.userId,
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: `Your booking #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) was cancelled.`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });
    if (venue && venue.ownerId) {
      createNotification({
        recipientUserId: venue.ownerId,
        type: NOTIFICATION_TYPES.CUSTOMER_CANCELLED,
        title: 'Booking Cancelled by Customer',
        message: `Booking #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) was cancelled by the customer.`,
        bookingId: booking.id,
        venueId: booking.venueId,
      });
    }
  } else {
    createNotification({
      recipientUserId: booking.userId,
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title: 'Booking Cancelled by Venue',
      message: `Your booking #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) was cancelled by the venue operator.`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Booking cancelled successfully.',
    booking: safeBooking(booking),
  });
}

// ─── RESCHEDULE: Reschedule Booking ───────────────────────────────────────────

/**
 * POST /api/bookings/:id/reschedule
 * PATCH /api/bookings/:id/reschedule
 * Requires: authenticate (CUSTOMER who owns the booking or ADMIN)
 * Input: { date, startTime, endTime, courtId? }
 */
export function rescheduleBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership verification
  const isCustomer = req.user.role === 'CUSTOMER' && booking.userId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isCustomer && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to reschedule this booking.',
    });
  }

  // Non-reschedulable states
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CHECKED_IN].includes(booking.status)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot reschedule a booking that is ${booking.status}.`,
    });
  }

  const { courtId, date, startTime, endTime } = req.body || {};

  // Target court
  const targetCourtId = (courtId && typeof courtId === 'string' && courtId.trim()) ? courtId.trim() : booking.courtId;
  const court = store.courts.find((c) => c.id === targetCourtId);
  if (!court) {
    return res.status(404).json({ status: 'error', message: 'Target court not found.' });
  }

  if (!court.isActive) {
    return res.status(400).json({
      status: 'error',
      message: 'This court is currently inactive and cannot be booked.',
    });
  }

  const targetVenue = store.venues.find((v) => v.id === court.venueId);
  if (targetVenue && ['REJECTED', 'SUSPENDED'].includes(targetVenue.verificationStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot reschedule booking to this facility because its verification status is ${targetVenue.verificationStatus.toLowerCase()}.`,
    });
  }

  // Date validation
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

  // Past date protection
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date < todayStr) {
    return res.status(400).json({
      status: 'error',
      message: 'Bookings cannot be rescheduled to past dates.',
    });
  }

  // Time format & multi-hour continuous duration
  const startHour = parse12HourTime(startTime);
  const endHour = parse12HourTime(endTime);

  if (startHour === null || endHour === null) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid time format. Time must be in "HH:00 AM/PM" format.',
    });
  }

  const durationHours = endHour - startHour;
  if (durationHours < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'End time must be after start time.',
    });
  }

  const currentHour = now.getHours();
  if ((date === todayStr || date === localDateStr) && startHour <= currentHour) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot reschedule to a time slot that has already passed.',
    });
  }

  // Operating hours validation
  const { startHour: courtStart, endHour: courtEnd } = parseOperatingHours(court.operatingHours);
  if (startHour < courtStart || endHour > courtEnd) {
    return res.status(400).json({
      status: 'error',
      message: `Requested slot is outside operating hours (${court.operatingHours}).`,
    });
  }

  // Deterministic schedule check for every hourly segment
  for (let h = startHour; h < endHour; h++) {
    const baseStatus = getDeterministicStatus(court, date, h);
    if (baseStatus === 'UNAVAILABLE') {
      return res.status(400).json({
        status: 'error',
        message: `The time slot ${format12Hour(h)} - ${format12Hour(h + 1)} is unavailable on the facility schedule.`,
      });
    }
  }

  // Conflict check: exclude the current booking being rescheduled from its own conflict check
  const hasConflict = store.bookings.some((b) => {
    if (b.id === booking.id) return false;
    if (b.courtId !== court.id || b.date !== date || !isBookingActive(b.status)) {
      return false;
    }
    const bStart = parse12HourTime(b.startTime);
    const bEnd = parse12HourTime(b.endTime);
    if (bStart === null || bEnd === null) return false;
    return startHour < bEnd && endHour > bStart;
  });

  if (hasConflict) {
    return res.status(409).json({
      status: 'error',
      message: 'The requested time slot has already been booked. Please choose another slot.',
    });
  }

  // Recalculate authoritative price derived directly from court rate and duration
  const pricePerHour = Number(court.pricePerHour);
  const totalPrice = pricePerHour * durationHours;

  // Update booking record while preserving immutable ID and token
  booking.courtId = court.id;
  booking.venueId = court.venueId;
  booking.date = date;
  booking.startTime = format12Hour(startHour);
  booking.endTime = format12Hour(endHour);
  booking.pricePerHour = pricePerHour;
  booking.totalPrice = totalPrice;
  booking.updatedAt = new Date().toISOString();

  // Phase 15: Reschedule Notifications
  const venue = store.venues.find((v) => v.id === (booking.venueId || court.venueId));
  createNotification({
    recipientUserId: booking.userId,
    type: NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
    title: 'Booking Rescheduled',
    message: `Your booking #${booking.id} is now scheduled for ${court.name} on ${booking.date} (${booking.startTime} - ${booking.endTime}, ${durationHours} hr).`,
    bookingId: booking.id,
    venueId: booking.venueId,
  });

  if (venue && venue.ownerId) {
    createNotification({
      recipientUserId: venue.ownerId,
      type: NOTIFICATION_TYPES.CUSTOMER_RESCHEDULED,
      title: 'Booking Rescheduled',
      message: `Booking #${booking.id} was rescheduled to ${court.name} on ${booking.date} (${booking.startTime} - ${booking.endTime}, ${durationHours} hr).`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Booking rescheduled successfully.',
    booking: safeBooking(booking),
  });
}

// ─── OWNER / ADMIN: Approve Booking ───────────────────────────────────────────

/**
 * POST /api/bookings/:id/approve
 * Requires: authenticate (OWNER of venue or ADMIN)
 * Transition: REQUESTED -> APPROVED
 */
export function approveBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to approve bookings for this venue.',
    });
  }

  if (!isValidBookingTransition(booking.status, BOOKING_STATUS.APPROVED)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot approve a booking currently in '${booking.status}' status. Only '${BOOKING_STATUS.REQUESTED}' bookings can be approved.`,
    });
  }

  booking.status = BOOKING_STATUS.APPROVED;
  booking.updatedAt = new Date().toISOString();

  // Phase 15: Approval & Payment Required Notifications
  const court = store.courts.find((c) => c.id === booking.courtId);
  const courtName = court?.name || 'court';

  createNotification({
    recipientUserId: booking.userId,
    type: NOTIFICATION_TYPES.BOOKING_APPROVED,
    title: 'Booking Request Approved',
    message: `Your booking request #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) was approved.`,
    bookingId: booking.id,
    venueId: booking.venueId,
  });

  createNotification({
    recipientUserId: booking.userId,
    type: NOTIFICATION_TYPES.PAYMENT_REQUIRED,
    title: 'Payment Required',
    message: `Payment of $${booking.totalPrice} is required to confirm booking #${booking.id}.`,
    bookingId: booking.id,
    venueId: booking.venueId,
  });

  return res.status(200).json({
    status: 'ok',
    message: 'Booking approved successfully. Awaiting payment.',
    booking: safeBooking(booking),
  });
}

// ─── OWNER / ADMIN: Reject Booking ────────────────────────────────────────────

/**
 * POST /api/bookings/:id/reject
 * Requires: authenticate (OWNER of venue or ADMIN)
 * Transition: REQUESTED -> REJECTED
 */
export function rejectBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to reject bookings for this venue.',
    });
  }

  if (!isValidBookingTransition(booking.status, BOOKING_STATUS.REJECTED)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot reject a booking currently in '${booking.status}' status.`,
    });
  }

  booking.status = BOOKING_STATUS.REJECTED;
  booking.updatedAt = new Date().toISOString();

  // Phase 15: Rejection Notification
  const court = store.courts.find((c) => c.id === booking.courtId);
  const courtName = court?.name || 'court';

  createNotification({
    recipientUserId: booking.userId,
    type: NOTIFICATION_TYPES.BOOKING_REJECTED,
    title: 'Booking Request Rejected',
    message: `Your booking request #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) was rejected by the venue.`,
    bookingId: booking.id,
    venueId: booking.venueId,
  });

  return res.status(200).json({
    status: 'ok',
    message: 'Booking rejected.',
    booking: safeBooking(booking),
  });
}

// ─── CUSTOMER / ADMIN: Pay for Booking ────────────────────────────────────────

/**
 * POST /api/bookings/:id/pay
 * Requires: authenticate (CUSTOMER who owns the booking or ADMIN)
 * Transition: APPROVED / PAYMENT_PENDING -> CONFIRMED
 * Payment Status: PENDING -> PAID (or PENDING if Pay at Venue)
 */
export function payBooking(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  const isCustomer = req.user.role === 'CUSTOMER' && booking.userId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isCustomer && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to pay for this booking.',
    });
  }

  // Duplicate payment check
  if (booking.paymentStatus === PAYMENT_STATUS.PAID && booking.status === BOOKING_STATUS.CONFIRMED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking has already been paid and confirmed.',
    });
  }

  // Only APPROVED or PAYMENT_PENDING bookings can be paid
  const payableStatuses = [
    BOOKING_STATUS.APPROVED,
    BOOKING_STATUS.PAYMENT_PENDING,
  ];

  if (!payableStatuses.includes(booking.status)) {
    if (booking.status === BOOKING_STATUS.REQUESTED) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking is currently REQUESTED and must be approved before payment.',
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `Booking in '${booking.status}' status cannot receive payment. Must be '${BOOKING_STATUS.APPROVED}' or '${BOOKING_STATUS.PAYMENT_PENDING}'.`,
    });
  }

  const { paymentMethod, simulateFailure, paymentResult } = req.body || {};

  // Validate payment method against supported methods
  const validMethods = ['UPI', 'CARD', 'PAY_AT_VENUE', 'Pay at Venue', 'Card', 'upi', 'card', 'pay_at_venue'];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payment method. Supported methods: UPI, Card, Pay at Venue.',
    });
  }

  let normalizedMethod = 'UPI';
  const pmLower = paymentMethod.toLowerCase();
  if (pmLower === 'card') {
    normalizedMethod = 'Card';
  } else if (pmLower === 'pay_at_venue' || paymentMethod === 'Pay at Venue') {
    normalizedMethod = 'Pay at Venue';
  } else if (pmLower === 'upi') {
    normalizedMethod = 'UPI';
  }

  // Handle simulated payment failure
  if (simulateFailure === true || paymentResult === 'FAILED') {
    booking.paymentStatus = PAYMENT_STATUS.FAILED;
    booking.paymentMethod = normalizedMethod;
    booking.updatedAt = new Date().toISOString();

    return res.status(400).json({
      status: 'error',
      message: 'Simulated payment processing failed. Please retry.',
      booking: safeBooking(booking),
    });
  }

  const isPayAtVenue = normalizedMethod === 'Pay at Venue';

  booking.status = BOOKING_STATUS.CONFIRMED;
  booking.paymentStatus = isPayAtVenue ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PAID;
  booking.paymentMethod = normalizedMethod;
  if (!booking.checkInToken) {
    booking.checkInToken = generateCheckInToken();
  }
  booking.updatedAt = new Date().toISOString();

  // Phase 15: Payment & Confirmation Notifications
  const court = store.courts.find((c) => c.id === booking.courtId);
  const venue = store.venues.find((v) => v.id === (booking.venueId || court?.venueId));
  const courtName = court?.name || 'court';

  if (!isPayAtVenue) {
    // Online Payment Success
    createNotification({
      recipientUserId: booking.userId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: `Payment of $${booking.totalPrice} for booking #${booking.id} (${courtName}) was successful.`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });

    createNotification({
      recipientUserId: booking.userId,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message: `Your booking #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed.`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });

    if (venue && venue.ownerId) {
      createNotification({
        recipientUserId: venue.ownerId,
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        title: 'Payment Received',
        message: `Payment of $${booking.totalPrice} received for booking #${booking.id} (${courtName}).`,
        bookingId: booking.id,
        venueId: booking.venueId,
      });
    }
  } else {
    // Pay at Venue: Confirmed without false payment success notification
    createNotification({
      recipientUserId: booking.userId,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed (Pay at Venue)',
      message: `Your booking #${booking.id} for ${courtName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed. Payment is due at the venue.`,
      bookingId: booking.id,
      venueId: booking.venueId,
    });
  }

  return res.status(200).json({
    status: 'ok',
    message: isPayAtVenue
      ? 'Booking confirmed. Payment is due at the venue upon arrival.'
      : 'Payment processed successfully.',
    booking: safeBooking(booking),
  });
}

// ─── ROLE-CHECKED: Update Booking Status & Payment Status ─────────────────────

/**
 * PATCH /api/bookings/:id/status
 * Requires: authenticate
 * Validates role-appropriate state transitions.
 * Body: { status?: BOOKING_STATUS, paymentStatus?: PAYMENT_STATUS, paymentMethod?: string }
 */
export function updateBookingStatus(req, res) {
  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  const { status: targetStatus, paymentStatus: targetPaymentStatus, paymentMethod } = req.body || {};

  if (!targetStatus && !targetPaymentStatus) {
    return res.status(400).json({
      status: 'error',
      message: 'At least one of status or paymentStatus is required.',
    });
  }

  const isCustomer = req.user.role === 'CUSTOMER' && booking.userId === req.user.id;
  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isCustomer && !isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to update this booking.',
    });
  }

  // 1. Validate Target Booking Status Transition (if provided)
  if (targetStatus) {
    if (!Object.values(BOOKING_STATUS).includes(targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid booking status '${targetStatus}'. Allowed: ${Object.values(BOOKING_STATUS).join(', ')}`,
      });
    }

    if (!isValidBookingTransition(booking.status, targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid state transition from '${booking.status}' to '${targetStatus}'.`,
      });
    }

    // Role-specific transition permissions
    if (isCustomer) {
      const customerAllowed = [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.PAID, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PAYMENT_PENDING];
      if (!customerAllowed.includes(targetStatus)) {
        return res.status(403).json({
          status: 'error',
          message: `Customer cannot transition booking to '${targetStatus}'.`,
        });
      }
    }

    if (isOwner && !isAdmin) {
      const ownerAllowed = [
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.PAYMENT_PENDING,
        BOOKING_STATUS.REJECTED,
        BOOKING_STATUS.PAYMENT_FAILED,
        BOOKING_STATUS.PAYMENT_EXPIRED,
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.CANCELLED,
      ];
      if (!ownerAllowed.includes(targetStatus)) {
        return res.status(403).json({
          status: 'error',
          message: `Venue partner cannot transition booking to '${targetStatus}'.`,
        });
      }
    }

    booking.status = targetStatus;
  }

  // 2. Validate Target Payment Status Transition (if provided)
  if (targetPaymentStatus) {
    if (!Object.values(PAYMENT_STATUS).includes(targetPaymentStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid payment status '${targetPaymentStatus}'. Allowed: ${Object.values(PAYMENT_STATUS).join(', ')}`,
      });
    }

    if (!isValidPaymentTransition(booking.paymentStatus || PAYMENT_STATUS.PENDING, targetPaymentStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid payment status transition from '${booking.paymentStatus || PAYMENT_STATUS.PENDING}' to '${targetPaymentStatus}'.`,
      });
    }

    if (isCustomer && targetPaymentStatus !== PAYMENT_STATUS.PAID) {
      return res.status(403).json({
        status: 'error',
        message: 'Customer cannot arbitrarily set payment status.',
      });
    }

    booking.paymentStatus = targetPaymentStatus;
  }

  // 3. Auto-sync payment state for certain booking state shifts
  const isPayAtVenue = (paymentMethod || booking.paymentMethod) === 'Pay at Venue' || (paymentMethod || booking.paymentMethod) === 'PAY_AT_VENUE';
  if ([BOOKING_STATUS.PAID, BOOKING_STATUS.CONFIRMED].includes(booking.status) && booking.paymentStatus !== PAYMENT_STATUS.PAID && !isPayAtVenue) {
    booking.paymentStatus = PAYMENT_STATUS.PAID;
  }

  if (booking.status === BOOKING_STATUS.PAYMENT_FAILED && booking.paymentStatus !== PAYMENT_STATUS.FAILED) {
    booking.paymentStatus = PAYMENT_STATUS.FAILED;
  }

  if (booking.status === BOOKING_STATUS.CANCELLED && booking.paymentStatus === PAYMENT_STATUS.PAID) {
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }

  if (paymentMethod) {
    booking.paymentMethod = paymentMethod;
  }

  if ([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PAID, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.COMPLETED].includes(booking.status) && !booking.checkInToken) {
    booking.checkInToken = generateCheckInToken();
  }

  booking.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: 'Booking status updated successfully.',
    booking: safeBooking(booking),
  });
}

// ─── OWNER / ADMIN: Verify Booking by Check-In Token or QR ───────────────────

/**
 * GET  /api/bookings/verify/:token
 * POST /api/bookings/verify
 * Requires: authenticate (OWNER of venue or ADMIN)
 * Verifies a player's check-in pass server-side using token or QR payload.
 */
export function verifyBookingByToken(req, res) {
  // Role check: Only OWNER or ADMIN allowed
  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Owner or Admin role required for verification.',
    });
  }

  let rawToken = req.params?.token || req.query?.token || req.body?.token || req.body?.qrData || req.body?.qrPayload;

  if (!rawToken || typeof rawToken !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Check-in token or QR payload is required.',
    });
  }

  rawToken = rawToken.trim();

  // Handle JSON QR payload if provided
  let lookupToken = rawToken;
  let lookupBookingId = null;

  if (rawToken.startsWith('{') && rawToken.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawToken);
      if (parsed.tok) lookupToken = String(parsed.tok).trim();
      else if (parsed.token) lookupToken = String(parsed.token).trim();
      if (parsed.bId) lookupBookingId = String(parsed.bId).trim();
    } catch {
      // treat as raw token string
    }
  }

  if (!lookupToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed or invalid check-in token.',
    });
  }

  // 1. Locate booking in store
  let booking = store.bookings.find((b) => b.checkInToken && b.checkInToken.toUpperCase() === lookupToken.toUpperCase());

  // Fallback: If passed a booking ID directly or encoded in QR
  if (!booking && (lookupBookingId || lookupToken.startsWith('BK-'))) {
    const idToTry = lookupBookingId || lookupToken;
    booking = store.bookings.find((b) => b.id === idToTry);
  }

  if (!booking) {
    return res.status(404).json({
      status: 'error',
      message: 'Invalid or unknown check-in token. Booking not found.',
    });
  }

  // 2. Ownership / Tenant Isolation check
  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to verify bookings for this venue.',
    });
  }

  // 3. State validations
  if (booking.status === BOOKING_STATUS.CHECKED_IN) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking has already been checked in.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking is already completed.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking has been cancelled.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status === BOOKING_STATUS.REJECTED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking was rejected.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status === BOOKING_STATUS.REQUESTED) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking is still pending approval and has not been confirmed.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status === BOOKING_STATUS.APPROVED || booking.status === BOOKING_STATUS.PAYMENT_PENDING) {
    return res.status(400).json({
      status: 'error',
      message: 'This booking is awaiting payment and has not been confirmed.',
      booking: safeBooking(booking),
    });
  }

  if (booking.status !== BOOKING_STATUS.CONFIRMED && booking.status !== BOOKING_STATUS.PAID) {
    return res.status(400).json({
      status: 'error',
      message: `Booking in '${booking.status}' status is not eligible for check-in.`,
      booking: safeBooking(booking),
    });
  }

  // 4. Enrich authoritative response
  const court = store.courts.find((c) => c.id === booking.courtId);
  const venue = store.venues.find((v) => v.id === (booking.venueId || court?.venueId));
  const customer = (store.users || []).find((u) => u.id === booking.userId);

  const startH = parse12HourTime(booking.startTime);
  const endH = parse12HourTime(booking.endTime);
  const durationHours = (startH !== null && endH !== null && endH > startH) ? (endH - startH) : 1;

  return res.status(200).json({
    status: 'ok',
    message: 'Booking verified successfully.',
    booking: {
      ...safeBooking(booking),
      customerName: customer ? customer.name : (booking.userName || 'Player'),
      playerName: customer ? customer.name : (booking.userName || 'Player'),
      venueName: venue ? venue.name : (booking.venueName || 'Venue'),
      courtName: court ? court.name : (booking.courtName || 'Court'),
      sport: court ? court.sport : (booking.sport || 'Sports'),
      durationHours,
    },
  });
}

// ─── OWNER / ADMIN: Check In Booking ──────────────────────────────────────────

/**
 * POST /api/bookings/:id/check-in
 * Requires: authenticate (OWNER of venue or ADMIN)
 * Transitions: CONFIRMED / PAID -> CHECKED_IN
 */
export function checkInBooking(req, res) {
  // Role check: Only OWNER or ADMIN allowed
  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Owner or Admin role required to check in bookings.',
    });
  }

  const booking = store.bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Booking not found.' });
  }

  // Ownership / Tenant Isolation check
  const isOwner = isVenueOwnerForBooking(req.user, booking);
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to check in bookings for this venue.',
    });
  }

  // State checks
  if (booking.status === BOOKING_STATUS.CHECKED_IN) {
    return res.status(400).json({
      status: 'error',
      message: 'Booking is already checked in.',
    });
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return res.status(400).json({
      status: 'error',
      message: 'Booking is already completed.',
    });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot check in a cancelled booking.',
    });
  }

  if (booking.status === BOOKING_STATUS.REJECTED) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot check in a rejected booking.',
    });
  }

  if (booking.status === BOOKING_STATUS.REQUESTED) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot check in a pending requested booking.',
    });
  }

  if (booking.status === BOOKING_STATUS.APPROVED || booking.status === BOOKING_STATUS.PAYMENT_PENDING) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot check in an unconfirmed booking.',
    });
  }

  if (booking.status !== BOOKING_STATUS.CONFIRMED && booking.status !== BOOKING_STATUS.PAID) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot check in booking in '${booking.status}' status.`,
    });
  }

  // State transition: CONFIRMED -> CHECKED_IN
  booking.status = BOOKING_STATUS.CHECKED_IN;
  booking.checkedInAt = new Date().toISOString();
  booking.updatedAt = new Date().toISOString();

  // Note: Pay at Venue bookings remain paymentStatus PENDING. Paid online remain PAID.
  const court = store.courts.find((c) => c.id === booking.courtId);
  const venue = store.venues.find((v) => v.id === (booking.venueId || court?.venueId));
  const customer = (store.users || []).find((u) => u.id === booking.userId);

  const startH = parse12HourTime(booking.startTime);
  const endH = parse12HourTime(booking.endTime);
  const durationHours = (startH !== null && endH !== null && endH > startH) ? (endH - startH) : 1;

  // Phase 15: Check-in Notification
  createNotification({
    recipientUserId: booking.userId,
    type: NOTIFICATION_TYPES.CHECK_IN_COMPLETED,
    title: 'Check-In Completed',
    message: `Your check-in for booking #${booking.id} at ${venue?.name || 'Venue'} (${court?.name || 'Court'}) has been recorded. Enjoy your game!`,
    bookingId: booking.id,
    venueId: booking.venueId,
  });

  return res.status(200).json({
    status: 'ok',
    message: 'Player successfully checked in.',
    booking: {
      ...safeBooking(booking),
      customerName: customer ? customer.name : (booking.userName || 'Player'),
      playerName: customer ? customer.name : (booking.userName || 'Player'),
      venueName: venue ? venue.name : (booking.venueName || 'Venue'),
      courtName: court ? court.name : (booking.courtName || 'Court'),
      sport: court ? court.sport : (booking.sport || 'Sports'),
      durationHours,
    },
  });
}

