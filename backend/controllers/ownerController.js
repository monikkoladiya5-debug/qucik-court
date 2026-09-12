import { store } from '../data/store.js';
import { parse12HourTime } from './bookingController.js';

/**
 * Determines whether a booking's scheduled end time has elapsed.
 * Follows the reliable datetime logic established in Task 6.
 */
export function isBookingElapsed(booking, now = new Date()) {
  if (!booking || !booking.date || !booking.endTime) return false;

  const endHour = parse12HourTime(booking.endTime);
  if (endHour === null) return false;

  const parts = booking.date.split('-');
  if (parts.length !== 3) return false;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  // If booking ends at midnight (12:00 AM -> endHour 0), it ends at the start of the next day
  const endDateTime = endHour === 0
    ? new Date(year, month - 1, day + 1, 0, 0, 0, 0)
    : new Date(year, month - 1, day, endHour, 0, 0, 0);

  return now.getTime() >= endDateTime.getTime();
}

/**
 * Safely serializes an owner venue for dashboard reporting.
 * Excludes any private system fields and includes aggregated court statistics.
 */
function serializeDashboardVenue(venue, venueCourts) {
  const activeCourts = venueCourts.filter((c) => Boolean(c.isActive)).length;
  const inactiveCourts = venueCourts.length - activeCourts;

  return {
    id: venue.id,
    name: venue.name,
    location: venue.location || '',
    city: venue.city || '',
    address: venue.address || '',
    sportTypes: Array.isArray(venue.sportTypes) ? venue.sportTypes : [],
    pricePerHour: Number(venue.pricePerHour || 0),
    rating: Number(venue.rating || 0),
    reviewCount: Number(venue.reviewCount || 0),
    indoor: Boolean(venue.indoor),
    openingHours: venue.openingHours || '',
    status: venue.status || 'active',
    totalCourts: venueCourts.length,
    activeCourts,
    inactiveCourts,
    createdAt: venue.createdAt || null,
  };
}

/**
 * Safely serializes a booking for the owner dashboard.
 * Strips customer PII (passwords, emails, phone numbers, auth tokens).
 */
function serializeDashboardBooking(booking, venue, court, now) {
  const isElapsed = isBookingElapsed(booking, now);
  let operationalStatus = 'UPCOMING';

  if (booking.status === 'CANCELLED') {
    operationalStatus = 'CANCELLED';
  } else if (isElapsed) {
    operationalStatus = 'COMPLETED';
  }

  return {
    id: booking.id,
    venueId: booking.venueId || (court ? court.venueId : null),
    venueName: venue ? venue.name : (booking.venueName || 'Venue'),
    courtId: booking.courtId,
    courtName: court ? court.name : (booking.courtName || 'Court'),
    sport: court ? court.sport : (booking.sport || 'Sports'),
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    pricePerHour: Number(booking.pricePerHour || (court ? court.pricePerHour : 0)),
    totalPrice: Number(booking.totalPrice || 0),
    status: booking.status,
    operationalStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

/**
 * GET /api/owner/dashboard
 * Requires: authenticate + requireRole('OWNER')
 *
 * Strict Server-Side Ownership:
 * - Identifies owner exclusively from authenticated JWT (req.user.id).
 * - Queries store for venues where ownerId === req.user.id.
 * - Queries courts belonging to those venues.
 * - Queries bookings matching those courts/venues.
 * - Calculates authoritative metrics and booking revenue from server-controlled totalPrice.
 * - Returns sanitized, minimal data structure.
 */
export function getOwnerDashboard(req, res) {
  const ownerId = req.user.id;
  const now = new Date();

  // 1. Fetch only venues owned by authenticated owner
  const myVenues = (store.venues || []).filter((v) => v.ownerId === ownerId);
  const myVenueIds = new Set(myVenues.map((v) => v.id));

  // 2. Fetch only courts belonging to this owner's venues
  const myCourts = (store.courts || []).filter((c) => myVenueIds.has(c.venueId));
  const myCourtIds = new Set(myCourts.map((c) => c.id));

  // 3. Fetch only bookings belonging to this owner's courts/venues
  const myBookings = (store.bookings || []).filter(
    (b) => myVenueIds.has(b.venueId) || myCourtIds.has(b.courtId)
  );

  // 4. Calculate metrics
  const totalVenues = myVenues.length;
  const totalCourts = myCourts.length;
  const activeCourts = myCourts.filter((c) => Boolean(c.isActive)).length;
  const inactiveCourts = totalCourts - activeCourts;

  const totalBookings = myBookings.length;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let completedBookings = 0;
  let upcomingBookings = 0;
  let bookingRevenue = 0;

  for (const b of myBookings) {
    if (b.status === 'CANCELLED') {
      cancelledBookings += 1;
    } else if (b.status === 'CONFIRMED') {
      confirmedBookings += 1;
      bookingRevenue += Number(b.totalPrice || 0);

      if (isBookingElapsed(b, now)) {
        completedBookings += 1;
      } else {
        upcomingBookings += 1;
      }
    }
  }

  // 5. Serialize venues with court counts
  const serializedVenues = myVenues.map((v) => {
    const venueCourts = myCourts.filter((c) => c.venueId === v.id);
    return serializeDashboardVenue(v, venueCourts);
  });

  // 6. Serialize bookings (sorted latest first)
  const sortedBookings = [...myBookings].sort((a, b) => {
    const timeA = new Date(a.createdAt || `${a.date}T00:00:00Z`).getTime();
    const timeB = new Date(b.createdAt || `${b.date}T00:00:00Z`).getTime();
    return timeB - timeA;
  });

  const venueMap = new Map(myVenues.map((v) => [v.id, v]));
  const courtMap = new Map(myCourts.map((c) => [c.id, c]));

  const serializedBookings = sortedBookings.map((b) => {
    const venue = venueMap.get(b.venueId) || (courtMap.get(b.courtId) ? venueMap.get(courtMap.get(b.courtId).venueId) : null);
    const court = courtMap.get(b.courtId);
    return serializeDashboardBooking(b, venue, court, now);
  });

  return res.status(200).json({
    status: 'ok',
    summary: {
      totalVenues,
      totalCourts,
      activeCourts,
      inactiveCourts,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
      upcomingBookings,
      bookingRevenue,
    },
    venues: serializedVenues,
    recentBookings: serializedBookings,
  });
}
