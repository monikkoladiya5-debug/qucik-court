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

  // 8. Authoritative price calculation derived directly from court
  const pricePerHour = Number(court.pricePerHour);
  const totalPrice = pricePerHour * 1; // 1-hour booking duration

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

// ─── CANCEL: Cancel Booking ───────────────────────────────────────────────────

/**
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

  if (!isValidBookingTransition(booking.status, BOOKING_STATUS.CANCELLED)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot cancel a booking that is ${booking.status}.`,
    });
  }

  booking.status = BOOKING_STATUS.CANCELLED;

  // If already paid, mark as refunded
  if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }

  booking.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: 'Booking cancelled successfully.',
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
 * Transition: APPROVED / PAYMENT_PENDING / REQUESTED -> PAID / CONFIRMED
 * Payment Status: PENDING -> PAID
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

  // Supported source states for payment
  const payableStatuses = [
    BOOKING_STATUS.APPROVED,
    BOOKING_STATUS.PAYMENT_PENDING,
    BOOKING_STATUS.REQUESTED, // For instant demo payment if auto-approved
  ];

  if (!payableStatuses.includes(booking.status)) {
    return res.status(400).json({
      status: 'error',
      message: `Booking in '${booking.status}' status cannot receive payment. Must be '${BOOKING_STATUS.APPROVED}' or '${BOOKING_STATUS.PAYMENT_PENDING}'.`,
    });
  }

  const { paymentMethod } = req.body || {};

  booking.status = BOOKING_STATUS.CONFIRMED;
  booking.paymentStatus = PAYMENT_STATUS.PAID;
  booking.paymentMethod = paymentMethod || 'UPI';
  booking.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: 'Payment confirmed successfully.',
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
      const customerAllowed = [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.PAID, BOOKING_STATUS.CONFIRMED];
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
  if ([BOOKING_STATUS.PAID, BOOKING_STATUS.CONFIRMED].includes(booking.status) && booking.paymentStatus !== PAYMENT_STATUS.PAID) {
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

  booking.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: 'Booking status updated successfully.',
    booking: safeBooking(booking),
  });
}
