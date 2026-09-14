import { store } from '../data/store.js';
import { isBookingElapsed } from './ownerController.js';

/**
 * Safely serializes a user for admin visibility.
 * Strips passwordHash and private auth secrets.
 */
export function serializeAdminUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    status: user.status || 'active',
    points: typeof user.points === 'number' ? user.points : 0,
    preferredSports: Array.isArray(user.preferredSports) ? user.preferredSports : [],
    businessName: user.businessName || null,
    venueLocation: user.venueLocation || null,
  };
}

/**
 * Safely serializes a venue for admin reporting.
 * Enriches with owner details and court breakdown.
 */
export function serializeAdminVenue(venue) {
  if (!venue) return null;
  const owner = (store.users || []).find((u) => u.id === venue.ownerId);
  const courts = (store.courts || []).filter((c) => c.venueId === venue.id);
  const activeCourts = courts.filter((c) => Boolean(c.isActive)).length;

  return {
    id: venue.id,
    name: venue.name,
    ownerId: venue.ownerId,
    ownerName: owner ? owner.name : 'Unknown Owner',
    ownerEmail: owner ? owner.email : '',
    city: venue.city || '',
    location: venue.location || '',
    address: venue.address || '',
    sportTypes: Array.isArray(venue.sportTypes) ? venue.sportTypes : [],
    status: venue.status || 'active',
    totalCourts: courts.length,
    activeCourts,
    inactiveCourts: courts.length - activeCourts,
    pricePerHour: Number(venue.pricePerHour || 0),
    rating: Number(venue.rating || 0),
    reviewCount: Number(venue.reviewCount || 0),
    indoor: Boolean(venue.indoor),
    openingHours: venue.openingHours || '',
    createdAt: venue.createdAt || null,
  };
}

/**
 * Safely serializes a booking for admin auditing.
 * Enriches with customer identity, facility name, court name, and operational status.
 */
export function serializeAdminBooking(booking, now = new Date()) {
  if (!booking) return null;
  const customer = (store.users || []).find((u) => u.id === booking.userId);
  const court = (store.courts || []).find((c) => c.id === booking.courtId);
  const venue = (store.venues || []).find((v) => v.id === (booking.venueId || court?.venueId));

  const isElapsed = isBookingElapsed(booking, now);
  let operationalStatus = 'UPCOMING';
  if (booking.status === 'CANCELLED') {
    operationalStatus = 'CANCELLED';
  } else if (isElapsed) {
    operationalStatus = 'COMPLETED';
  }

  return {
    id: booking.id,
    userId: booking.userId,
    customerName: customer ? customer.name : 'Customer',
    customerEmail: customer ? customer.email : '',
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
 * GET /api/admin/dashboard
 * Requires: authenticate + requireRole('ADMIN')
 *
 * Derives admin identity exclusively from JWT.
 * Returns authoritative platform-wide summary metrics, user accounts,
 * venues, court capacities, bookings, and revenue.
 */
export function getAdminDashboard(req, res) {
  const now = new Date();

  // 1. Calculate platform-wide user metrics
  const totalUsers = store.users.length;
  const totalCustomers = store.users.filter((u) => u.role === 'CUSTOMER').length;
  const totalOwners = store.users.filter((u) => u.role === 'OWNER').length;
  const totalAdmins = store.users.filter((u) => u.role === 'ADMIN').length;

  // 2. Calculate venue and court metrics
  const totalVenues = store.venues.length;
  const totalCourts = store.courts.length;
  const activeCourts = store.courts.filter((c) => Boolean(c.isActive)).length;
  const inactiveCourts = totalCourts - activeCourts;

  // 3. Calculate booking metrics and revenue
  const totalBookings = store.bookings.length;
  let confirmedBookings = 0;
  let cancelledBookings = 0;
  let completedBookings = 0;
  let upcomingBookings = 0;
  let bookingRevenue = 0;

  for (const b of store.bookings) {
    if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
      cancelledBookings += 1;
    } else if (['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(b.status)) {
      confirmedBookings += 1;
      bookingRevenue += Number(b.totalPrice || 0);

      if (b.status === 'COMPLETED' || isBookingElapsed(b, now)) {
        completedBookings += 1;
      } else {
        upcomingBookings += 1;
      }
    } else if (['REQUESTED', 'APPROVED', 'PAYMENT_PENDING'].includes(b.status)) {
      upcomingBookings += 1;
    }
  }

  // 4. Safely serialize data collections
  const users = store.users.map(serializeAdminUser);
  const venues = store.venues.map(serializeAdminVenue);

  const sortedBookings = [...store.bookings].sort((a, b) => {
    const timeA = new Date(a.createdAt || `${a.date}T00:00:00Z`).getTime();
    const timeB = new Date(b.createdAt || `${b.date}T00:00:00Z`).getTime();
    return timeB - timeA;
  });
  const bookings = sortedBookings.map((b) => serializeAdminBooking(b, now));

  const pendingVenues = Array.isArray(store.pendingVenues) ? store.pendingVenues : [];

  return res.status(200).json({
    status: 'ok',
    summary: {
      totalUsers,
      totalCustomers,
      totalOwners,
      totalAdmins,
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
      pendingVenuesCount: pendingVenues.length,
    },
    users,
    venues,
    bookings,
    pendingVenues,
  });
}

/**
 * PATCH /api/admin/users/:id/status
 * Requires: authenticate + requireRole('ADMIN')
 * Body: { status: 'active' | 'suspended' }
 *
 * Minimal administrative status toggle:
 * - Validates target user exists
 * - Prevents admin from suspending themselves
 * - Does not modify role, password, email, or other fields
 */
export function toggleUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  const targetUser = store.users.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ status: 'error', message: 'User not found.' });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Administrators cannot change their own account status.',
    });
  }

  const allowedStatuses = ['active', 'suspended'];
  const newStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}.`,
    });
  }

  // Update status only
  targetUser.status = newStatus;

  return res.status(200).json({
    status: 'ok',
    message: `User status updated to ${newStatus}.`,
    user: serializeAdminUser(targetUser),
  });
}
