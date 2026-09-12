import { store } from '../data/store.js';
import { parse12HourTime } from './bookingController.js';

/**
 * Deterministically calculates customer loyalty points from actual booking history.
 *
 * Rules:
 * - CONFIRMED + actual booking end time has passed = 10 points
 * - CONFIRMED + booking has not ended (future or ongoing) = 0 points
 * - CANCELLED = 0 points
 * - Each eligible booking counts exactly once (no duplicate counting)
 * - Completion evaluated using date + endTime compared against current local datetime
 */
export function calculateBookingLoyalty(userId) {
  const userBookings = (store.bookings || []).filter((b) => b.userId === userId);
  const now = new Date();

  let totalPoints = 0;
  let eligibleBookingsCount = 0;
  let upcomingBookingsCount = 0;
  const completedBookingRewards = [];
  const seenBookingIds = new Set();

  for (const b of userBookings) {
    if (!b || !b.id || seenBookingIds.has(b.id)) continue;
    seenBookingIds.add(b.id);

    // Cancelled bookings earn 0 points regardless of date/time
    if (b.status === 'CANCELLED') {
      continue;
    }

    // Only CONFIRMED bookings can earn points
    if (b.status !== 'CONFIRMED') {
      continue;
    }

    // Determine completion using actual date + endTime
    const endHour = parse12HourTime(b.endTime);
    let isElapsed = false;

    if (b.date && endHour !== null) {
      const parts = b.date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          // If booking ends at midnight (12:00 AM -> endHour 0), it ends at start of next day
          const endDateTime = endHour === 0
            ? new Date(year, month - 1, day + 1, 0, 0, 0, 0)
            : new Date(year, month - 1, day, endHour, 0, 0, 0);

          isElapsed = now.getTime() >= endDateTime.getTime();
        }
      }
    }

    if (isElapsed) {
      totalPoints += 10;
      eligibleBookingsCount += 1;

      const venue = (store.venues || []).find((v) => v.id === b.venueId);
      const court = (store.courts || []).find((c) => c.id === b.courtId);

      completedBookingRewards.push({
        bookingId: b.id,
        venueName: venue ? venue.name : 'Unknown Venue',
        courtName: court ? court.name : 'Court',
        sport: court ? court.sport : (b.sport || 'Sports'),
        date: b.date,
        time: `${b.startTime} - ${b.endTime}`,
        pointsEarned: 10,
      });
    } else {
      upcomingBookingsCount += 1;
    }
  }

  // Sort completed booking rewards by date descending
  completedBookingRewards.sort((a, b) => (b.date > a.date ? 1 : -1));

  return {
    totalPoints,
    pointsPerBooking: 10,
    eligibleBookingsCount,
    upcomingBookingsCount,
    completedBookingRewards,
  };
}

/**
 * GET /api/loyalty/me
 * Requires: authenticate + requireRole('CUSTOMER')
 * Exposes only the authenticated customer's own calculated loyalty information.
 */
export async function getMyLoyalty(req, res, next) {
  try {
    const userId = req.user.id;
    const loyalty = calculateBookingLoyalty(userId);

    return res.status(200).json({
      status: 'ok',
      loyalty,
    });
  } catch (err) {
    next(err);
  }
}
