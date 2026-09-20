import { store } from '../data/store.js';

/**
 * Server-controlled transactional notification types.
 */
export const NOTIFICATION_TYPES = {
  // Customer notifications
  BOOKING_REQUESTED: 'BOOKING_REQUESTED',
  BOOKING_APPROVED: 'BOOKING_APPROVED',
  BOOKING_REJECTED: 'BOOKING_REJECTED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_RESCHEDULED: 'BOOKING_RESCHEDULED',
  CHECK_IN_COMPLETED: 'CHECK_IN_COMPLETED',
  BOOKING_NO_SHOW: 'BOOKING_NO_SHOW',

  // Owner notifications
  NEW_BOOKING_REQUEST: 'NEW_BOOKING_REQUEST',
  CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
  CUSTOMER_RESCHEDULED: 'CUSTOMER_RESCHEDULED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  VENUE_VERIFIED: 'VENUE_VERIFIED',
  VENUE_REJECTED: 'VENUE_REJECTED',
  VENUE_SUSPENDED: 'VENUE_SUSPENDED',
  VENUE_RESTORED: 'VENUE_RESTORED',
  COURT_APPROVED: 'COURT_APPROVED',
  COURT_REJECTED: 'COURT_REJECTED',

  // Admin notifications
  NEW_COURT_REQUEST: 'NEW_COURT_REQUEST',
};

/**
 * Safely serializes a notification object for client consumption.
 * Ensures no private PII or credentials leak.
 */
export function safeNotification(n) {
  if (!n) return null;
  return {
    id: n.id,
    recipientUserId: n.recipientUserId,
    type: n.type,
    title: n.title,
    message: n.message,
    bookingId: n.bookingId || null,
    venueId: n.venueId || null,
    courtId: n.courtId || null,
    readAt: n.readAt || null,
    isRead: Boolean(n.readAt),
    createdAt: n.createdAt,
  };
}

/**
 * Creates an authoritative transactional notification in the store.
 * Prevents rapid accidental duplicate creation.
 */
export function createNotification({ recipientUserId, type, title, message, bookingId = null, venueId = null, courtId = null }) {
  if (!recipientUserId || !type || !title || !message) {
    return null;
  }

  if (!store.notifications) {
    store.notifications = [];
  }

  // Idempotency / Duplicate protection:
  // 1. For state-changing booking events, prevent creating the exact same notification type for the same booking
  const existing = store.notifications.find((n) => {
    if (bookingId && n.bookingId === bookingId && n.type === type && n.recipientUserId === recipientUserId) {
      return true;
    }
    if (courtId && n.courtId === courtId && n.type === type && n.recipientUserId === recipientUserId) {
      return true;
    }
    return false;
  });

  if (existing) {
    return existing;
  }

  const now = new Date();
  const newNotification = {
    id: `notif-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 9000)}`,
    recipientUserId,
    type,
    title,
    message,
    bookingId,
    venueId,
    courtId,
    readAt: null,
    createdAt: now.toISOString(),
  };

  store.notifications.push(newNotification);
  return newNotification;
}

/**
 * Deterministically checks past confirmed bookings without check-in for no-shows
 * and generates BOOKING_NO_SHOW notifications if not already created.
 */
export function syncNoShowNotifications(userId) {
  if (!store.bookings || !Array.isArray(store.bookings)) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  const userBookings = userId
    ? store.bookings.filter((b) => b.userId === userId)
    : store.bookings;

  for (const b of userBookings) {
    if (b.status !== 'CONFIRMED' && b.status !== 'PAID') continue;
    if (b.checkedInAt || b.status === 'CHECKED_IN' || b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'REJECTED') {
      continue;
    }
    if (!b.date || !b.endTime) continue;

    let isPast = false;
    if (b.date < todayStr) {
      isPast = true;
    } else if (b.date === todayStr) {
      const matchEnd = b.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchEnd) {
        let eH = parseInt(matchEnd[1], 10);
        if (matchEnd[3]?.toUpperCase() === 'PM' && eH !== 12) eH += 12;
        if (matchEnd[3]?.toUpperCase() === 'AM' && eH === 12) eH = 0;
        if (eH <= currentHour) isPast = true;
      }
    }

    if (isPast) {
      const court = (store.courts || []).find((c) => c.id === b.courtId);
      const courtName = court ? court.name : 'Court';
      createNotification({
        recipientUserId: b.userId,
        type: NOTIFICATION_TYPES.BOOKING_NO_SHOW,
        title: 'Booking Marked as No-Show',
        message: `Your booking #${b.id} for ${courtName} on ${b.date} (${b.startTime} - ${b.endTime}) was classified as a no-show because no check-in occurred.`,
        bookingId: b.id,
        venueId: b.venueId,
      });
    }
  }
}

// ─── GET /api/notifications ───────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Requires: authenticate
 * Returns all notifications for the authenticated user (newest first).
 */
export function getMyNotifications(req, res) {
  const userId = req.user.id;
  syncNoShowNotifications(userId);

  const userNotifications = (store.notifications || [])
    .filter((n) => n.recipientUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = userNotifications.filter((n) => !n.readAt).length;

  return res.status(200).json({
    status: 'ok',
    count: userNotifications.length,
    unreadCount,
    notifications: userNotifications.map(safeNotification),
  });
}

// ─── GET /api/notifications/unread-count ──────────────────────────────────────

/**
 * GET /api/notifications/unread-count
 * Requires: authenticate
 * Returns unread count for the authenticated user.
 */
export function getUnreadCount(req, res) {
  const userId = req.user.id;
  syncNoShowNotifications(userId);

  const unreadCount = (store.notifications || []).filter(
    (n) => n.recipientUserId === userId && !n.readAt
  ).length;

  return res.status(200).json({
    status: 'ok',
    unreadCount,
  });
}

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────

/**
 * PATCH /api/notifications/:id/read
 * Requires: authenticate
 * Marks a single notification as read if owned by the user.
 */
export function markNotificationAsRead(req, res) {
  const { id } = req.params;
  const notification = (store.notifications || []).find((n) => n.id === id);

  if (!notification) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found.',
    });
  }

  // Strict ownership check (BOLA protection)
  if (notification.recipientUserId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to access this notification.',
    });
  }

  if (!notification.readAt) {
    notification.readAt = new Date().toISOString();
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Notification marked as read.',
    notification: safeNotification(notification),
  });
}

// ─── POST /api/notifications/read-all ─────────────────────────────────────────

/**
 * POST /api/notifications/read-all
 * Requires: authenticate
 * Marks all notifications for the authenticated user as read.
 */
export function markAllNotificationsAsRead(req, res) {
  const userId = req.user.id;
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const n of store.notifications || []) {
    if (n.recipientUserId === userId && !n.readAt) {
      n.readAt = nowIso;
      updatedCount++;
    }
  }

  return res.status(200).json({
    status: 'ok',
    message: 'All notifications marked as read.',
    updatedCount,
  });
}
