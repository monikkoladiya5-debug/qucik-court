/**
 * QuickCourt Booking & Payment State Machine Configuration
 * Phase 2 V1 Foundation
 */

export const BOOKING_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

/**
 * Valid state transition matrix for booking lifecycle:
 *
 * Primary Path:
 * REQUESTED -> APPROVED -> PAYMENT_PENDING -> PAID / CONFIRMED -> CHECKED_IN -> COMPLETED
 *
 * Alternative Paths:
 * REQUESTED -> REJECTED | CANCELLED
 * APPROVED -> PAYMENT_PENDING | PAID | CONFIRMED | PAYMENT_FAILED | PAYMENT_EXPIRED | CANCELLED
 * PAYMENT_PENDING -> PAID | CONFIRMED | PAYMENT_FAILED | PAYMENT_EXPIRED | CANCELLED
 * PAID -> CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED
 * CONFIRMED -> CHECKED_IN | COMPLETED | CANCELLED
 * CHECKED_IN -> COMPLETED | CANCELLED
 */
export const VALID_BOOKING_TRANSITIONS = {
  [BOOKING_STATUS.REQUESTED]: [
    BOOKING_STATUS.APPROVED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.APPROVED]: [
    BOOKING_STATUS.PAYMENT_PENDING,
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.PAYMENT_FAILED,
    BOOKING_STATUS.PAYMENT_EXPIRED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PAYMENT_PENDING]: [
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.PAYMENT_FAILED,
    BOOKING_STATUS.PAYMENT_EXPIRED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PAID]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.CHECKED_IN,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.CHECKED_IN,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CHECKED_IN]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.REJECTED]: [],
  [BOOKING_STATUS.PAYMENT_FAILED]: [],
  [BOOKING_STATUS.PAYMENT_EXPIRED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
};

/**
 * Valid transitions for payment status:
 * PENDING -> PAID | FAILED
 * PAID -> REFUNDED
 * FAILED -> PENDING | PAID
 * REFUNDED -> []
 */
export const VALID_PAYMENT_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID],
  [PAYMENT_STATUS.REFUNDED]: [],
};

/**
 * Statuses that actively occupy a court slot and block overlapping bookings.
 */
export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.PAYMENT_PENDING,
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
];

/**
 * Helper to validate booking state transition.
 */
export function isValidBookingTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  if (currentStatus === nextStatus) return true; // Idempotent same-state
  const allowed = VALID_BOOKING_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Helper to validate payment state transition.
 */
export function isValidPaymentTransition(currentPaymentStatus, nextPaymentStatus) {
  if (!currentPaymentStatus || !nextPaymentStatus) return false;
  if (currentPaymentStatus === nextPaymentStatus) return true;
  const allowed = VALID_PAYMENT_TRANSITIONS[currentPaymentStatus] || [];
  return allowed.includes(nextPaymentStatus);
}

/**
 * Checks if a booking status actively blocks court availability.
 */
export function isBookingActive(status) {
  return ACTIVE_BOOKING_STATUSES.includes(status);
}
