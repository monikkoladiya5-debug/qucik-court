import { store, calculatePlayerGamification } from '../data/store.js';
import { isBookingElapsed } from './ownerController.js';
import { parse12HourTime } from './bookingController.js';
import { format12Hour, parseOperatingHours } from './courtController.js';
import { classifyTimeSlot } from './pricingController.js';
import {
  createNotification,
  NOTIFICATION_TYPES,
} from './notificationController.js';

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
 * Enriches with owner details, court breakdown, and verification audit metadata.
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
    verificationStatus: venue.verificationStatus || 'PENDING',
    verifiedAt: venue.verifiedAt || null,
    verifiedBy: venue.verifiedBy || null,
    verificationNote: venue.verificationNote || null,
    verificationUpdatedAt: venue.verificationUpdatedAt || null,
    isVerified: venue.verificationStatus === 'VERIFIED',
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
    paymentStatus: booking.paymentStatus || (['PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) ? 'PAID' : 'PENDING'),
    paymentMethod: booking.paymentMethod || null,
    rejectionReason: booking.rejectionReason || null,
    rejectionNote: booking.rejectionNote || null,
    rejectedAt: booking.rejectedAt || null,
    rejectedBy: booking.rejectedBy || null,
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

  // Review & rating platform metrics (Phase 20)
  const publishedReviews = (store.reviews || []).filter((r) => r.status === 'PUBLISHED');
  const totalReviews = publishedReviews.length;
  const reviewScoreSum = publishedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  const averagePlatformRating = totalReviews > 0 ? Number((reviewScoreSum / totalReviews).toFixed(1)) : 0;
  const lowRatedReviewsCount = publishedReviews.filter((r) => Number(r.rating) <= 2).length;

  // Gamification metrics (Phase 21)
  let totalAchievementsEarned = 0;
  const customerUsers = (store.users || []).filter((u) => u.role === 'CUSTOMER');
  for (const cust of customerUsers) {
    const gam = calculatePlayerGamification(cust.id);
    if (gam) {
      totalAchievementsEarned += gam.earnedAchievementsCount || 0;
    }
  }

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
      pendingCourtsCount: (store.courts || []).filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length,
      totalReviews,
      averagePlatformRating,
      lowRatedReviewsCount,
      totalAchievementsEarned,
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

/**
 * GET /api/admin/platform-intelligence (Phase 18)
 * Requires: authenticate + requireRole('ADMIN')
 *
 * Comprehensive, authoritative platform intelligence and operations telemetry.
 * Supports time-range filtering: 'today' | '7d' | '30d' | 'all' or custom 'dateFrom' & 'dateTo'.
 */
export function getPlatformIntelligence(req, res) {
  const {
    range = 'all',
    dateFrom,
    dateTo,
  } = req.query;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Validate custom date parameters if supplied
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid dateFrom format. Expected YYYY-MM-DD.',
    });
  }
  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid dateTo format. Expected YYYY-MM-DD.',
    });
  }

  // Determine date filtering window
  let startDateFilter = null;
  let endDateFilter = null;
  let daysInRange = 1;

  if (dateFrom && dateTo) {
    startDateFilter = dateFrom;
    endDateFilter = dateTo;
    const d1 = new Date(`${dateFrom}T00:00:00Z`);
    const d2 = new Date(`${dateTo}T00:00:00Z`);
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    daysInRange = Math.max(1, diffDays);
  } else if (range === 'today') {
    startDateFilter = todayStr;
    endDateFilter = todayStr;
    daysInRange = 1;
  } else if (range === '7d') {
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    startDateFilter = d7.toISOString().slice(0, 10);
    endDateFilter = todayStr;
    daysInRange = 7;
  } else if (range === '30d') {
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    startDateFilter = d30.toISOString().slice(0, 10);
    endDateFilter = todayStr;
    daysInRange = 30;
  } else {
    // 'all'
    daysInRange = 30; // standard baseline for capacity calculations
  }

  // Filter bookings according to date window
  const allBookings = store.bookings || [];
  const filteredBookings = allBookings.filter((b) => {
    if (!startDateFilter && !endDateFilter) return true;
    const bDate = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : null);
    if (!bDate) return true;
    if (startDateFilter && bDate < startDateFilter) return false;
    if (endDateFilter && bDate > endDateFilter) return false;
    return true;
  });

  // ─── A. Platform Overview ─────────────────────────────────────────
  const totalUsers = (store.users || []).length;
  const totalCustomers = (store.users || []).filter((u) => u.role === 'CUSTOMER').length;
  const totalOwners = (store.users || []).filter((u) => u.role === 'OWNER').length;
  const totalAdmins = (store.users || []).filter((u) => u.role === 'ADMIN').length;
  const suspendedUsers = (store.users || []).filter((u) => u.status === 'suspended').length;

  const totalVenues = (store.venues || []).length;
  const activeVenues = (store.venues || []).filter((v) => v.status !== 'suspended').length;

  const totalCourts = (store.courts || []).length;
  const activeCourts = (store.courts || []).filter((c) => Boolean(c.isActive)).length;
  const inactiveCourts = totalCourts - activeCourts;

  // ─── B. Booking Status Breakdown ──────────────────────────────────
  const bookingStatusCounts = {
    requested: 0,
    approved: 0,
    paymentPending: 0,
    confirmed: 0,
    paid: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
    noShow: 0,
  };

  for (const b of filteredBookings) {
    const status = b.status;
    if (status === 'REQUESTED') bookingStatusCounts.requested++;
    else if (status === 'APPROVED') bookingStatusCounts.approved++;
    else if (status === 'PAYMENT_PENDING') bookingStatusCounts.paymentPending++;
    else if (status === 'CONFIRMED') bookingStatusCounts.confirmed++;
    else if (status === 'PAID') bookingStatusCounts.paid++;
    else if (status === 'CHECKED_IN') bookingStatusCounts.checkedIn++;
    else if (status === 'COMPLETED') bookingStatusCounts.completed++;
    else if (status === 'CANCELLED') bookingStatusCounts.cancelled++;
    else if (status === 'REJECTED') bookingStatusCounts.rejected++;
    else if (status === 'NO_SHOW' || b.noShow) bookingStatusCounts.noShow++;
  }

  const activeOrConfirmedBookings = filteredBookings.filter((b) =>
    ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(b.status)
  );

  // ─── C. Payment & Revenue Overview ────────────────────────────────
  let totalBookingValue = 0; // GMV from active/confirmed/completed bookings
  let collectedBookingValue = 0; // Paid / Confirmed / Completed funds collected
  let pendingBookingValue = 0; // Uncollected / Payment pending / Requested
  let refundedValue = 0; // Cancelled / Rejected bookings value
  let failedValue = 0;

  const paymentMethodsBreakdown = {
    UPI: { count: 0, value: 0 },
    CARD: { count: 0, value: 0 },
    PAY_AT_VENUE: { count: 0, value: 0 },
    UNSPECIFIED: { count: 0, value: 0 },
  };

  for (const b of filteredBookings) {
    const val = Number(b.totalPrice || 0);
    const method = b.paymentMethod ? b.paymentMethod.toUpperCase() : 'UNSPECIFIED';
    const targetMethod = paymentMethodsBreakdown[method] || paymentMethodsBreakdown.UNSPECIFIED;

    if (['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(b.status)) {
      totalBookingValue += val;
      collectedBookingValue += val;
      targetMethod.count++;
      targetMethod.value += val;
    } else if (['REQUESTED', 'APPROVED', 'PAYMENT_PENDING'].includes(b.status)) {
      pendingBookingValue += val;
    } else if (['CANCELLED', 'REJECTED'].includes(b.status)) {
      refundedValue += val;
    }

    if (b.paymentStatus === 'FAILED') {
      failedValue += val;
    }
  }

  // ─── D. Court Utilization & Capacity ──────────────────────────────
  let totalCapacityHours = 0;
  const courtOccupiedHoursMap = new Map();
  const courtBookingCountMap = new Map();

  for (const court of store.courts || []) {
    if (!court.isActive) continue;
    const { startHour, endHour } = parseOperatingHours(court.operatingHours);
    const dailyHours = Math.max(0, endHour - startHour);
    totalCapacityHours += dailyHours * daysInRange;
    courtOccupiedHoursMap.set(court.id, 0);
    courtBookingCountMap.set(court.id, 0);
  }

  let occupiedCourtHours = 0;
  for (const b of activeOrConfirmedBookings) {
    const startH = parse12HourTime(b.startTime);
    const endH = parse12HourTime(b.endTime);
    const duration = (startH !== null && endH !== null && endH > startH) ? (endH - startH) : 1;
    occupiedCourtHours += duration;

    if (courtOccupiedHoursMap.has(b.courtId)) {
      courtOccupiedHoursMap.set(b.courtId, courtOccupiedHoursMap.get(b.courtId) + duration);
      courtBookingCountMap.set(b.courtId, courtBookingCountMap.get(b.courtId) + 1);
    }
  }

  const utilizationRate = totalCapacityHours > 0
    ? Number(Math.min(100, (occupiedCourtHours / totalCapacityHours) * 100).toFixed(1))
    : 0;

  // Busiest courts
  const venueMap = new Map((store.venues || []).map((v) => [v.id, v]));
  const busiestCourts = (store.courts || [])
    .filter((c) => Boolean(c.isActive))
    .map((c) => {
      const v = venueMap.get(c.venueId);
      const hours = courtOccupiedHoursMap.get(c.id) || 0;
      const count = courtBookingCountMap.get(c.id) || 0;
      const { startHour, endHour } = parseOperatingHours(c.operatingHours);
      const cCapacity = Math.max(1, (endHour - startHour) * daysInRange);
      const cRate = Number(Math.min(100, (hours / cCapacity) * 100).toFixed(1));

      return {
        courtId: c.id,
        courtName: c.name,
        venueId: c.venueId,
        venueName: v ? v.name : 'Venue',
        city: v ? v.city : '',
        sport: c.sport,
        occupiedHours: hours,
        bookingCount: count,
        utilizationRate: cRate,
      };
    })
    .sort((a, b) => b.occupiedHours - a.occupiedHours)
    .slice(0, 6);

  // ─── E. Sports Analytics ──────────────────────────────────────────
  const sportMetricsMap = new Map();
  for (const c of store.courts || []) {
    const sport = c.sport || 'General';
    if (!sportMetricsMap.has(sport)) {
      sportMetricsMap.set(sport, {
        sport,
        activeCourts: 0,
        bookingCount: 0,
        bookingValue: 0,
        occupiedHours: 0,
      });
    }
    if (c.isActive) {
      sportMetricsMap.get(sport).activeCourts++;
    }
  }

  for (const b of activeOrConfirmedBookings) {
    const court = (store.courts || []).find((c) => c.id === b.courtId);
    const sport = b.sport || court?.sport || 'General';
    if (!sportMetricsMap.has(sport)) {
      sportMetricsMap.set(sport, {
        sport,
        activeCourts: 0,
        bookingCount: 0,
        bookingValue: 0,
        occupiedHours: 0,
      });
    }
    const item = sportMetricsMap.get(sport);
    item.bookingCount++;
    item.bookingValue += Number(b.totalPrice || 0);
    const startH = parse12HourTime(b.startTime);
    const endH = parse12HourTime(b.endTime);
    item.occupiedHours += (startH !== null && endH !== null && endH > startH) ? (endH - startH) : 1;
  }

  const sportsAnalytics = Array.from(sportMetricsMap.values()).sort(
    (a, b) => b.bookingCount - a.bookingCount || b.bookingValue - a.bookingValue
  );

  // ─── F. Venue & City Analytics ────────────────────────────────────
  const cityMetricsMap = new Map();
  for (const v of store.venues || []) {
    const city = v.city || 'Other';
    if (!cityMetricsMap.has(city)) {
      cityMetricsMap.set(city, {
        city,
        venueCount: 0,
        courtCount: 0,
        bookingCount: 0,
        bookingValue: 0,
      });
    }
    const cm = cityMetricsMap.get(city);
    cm.venueCount++;
    const vCourts = (store.courts || []).filter((c) => c.venueId === v.id);
    cm.courtCount += vCourts.length;
  }

  for (const b of activeOrConfirmedBookings) {
    const venue = venueMap.get(b.venueId) || (store.venues || []).find((v) => v.id === b.venueId);
    const city = venue?.city || 'Other';
    if (cityMetricsMap.has(city)) {
      const cm = cityMetricsMap.get(city);
      cm.bookingCount++;
      cm.bookingValue += Number(b.totalPrice || 0);
    }
  }

  const cityAnalytics = Array.from(cityMetricsMap.values()).sort(
    (a, b) => b.bookingCount - a.bookingCount
  );

  // Top active venues
  const venueBookingMap = new Map();
  for (const b of activeOrConfirmedBookings) {
    const vId = b.venueId;
    if (!vId) continue;
    if (!venueBookingMap.has(vId)) {
      venueBookingMap.set(vId, { bookingCount: 0, bookingValue: 0 });
    }
    const item = venueBookingMap.get(vId);
    item.bookingCount++;
    item.bookingValue += Number(b.totalPrice || 0);
  }

  const topVenues = (store.venues || [])
    .map((v) => {
      const stats = venueBookingMap.get(v.id) || { bookingCount: 0, bookingValue: 0 };
      const vCourts = (store.courts || []).filter((c) => c.venueId === v.id);
      const owner = (store.users || []).find((u) => u.id === v.ownerId);

      return {
        venueId: v.id,
        venueName: v.name,
        city: v.city || '',
        ownerName: owner ? owner.name : 'Unknown Owner',
        activeCourts: vCourts.filter((c) => Boolean(c.isActive)).length,
        totalCourts: vCourts.length,
        bookingCount: stats.bookingCount,
        bookingValue: stats.bookingValue,
        rating: Number(v.rating || 0),
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount || b.bookingValue - a.bookingValue)
    .slice(0, 6);

  // ─── G. Time & Demand Analytics ───────────────────────────────────
  const hourlyDemand = [];
  for (let h = 6; h <= 23; h++) {
    const classification = classifyTimeSlot(todayStr, h, h + 1);
    hourlyDemand.push({
      hour: h,
      hourLabel: format12Hour(h),
      bookingCount: 0,
      isPeak: classification.isPeak,
    });
  }

  let peakBookingsCount = 0;
  let offPeakBookingsCount = 0;
  let weekdayBookingsCount = 0;
  let weekendBookingsCount = 0;

  for (const b of activeOrConfirmedBookings) {
    const startH = parse12HourTime(b.startTime);
    const endH = parse12HourTime(b.endTime) || (startH !== null ? startH + 1 : null);

    if (startH !== null && endH !== null) {
      for (let h = startH; h < endH && h <= 23; h++) {
        const slotEntry = hourlyDemand.find((item) => item.hour === h);
        if (slotEntry) {
          slotEntry.bookingCount++;
        }
      }
      const classification = classifyTimeSlot(b.date, startH, endH);
      if (classification.isPeak) {
        peakBookingsCount++;
      } else {
        offPeakBookingsCount++;
      }
      if (classification.isWeekend) {
        weekendBookingsCount++;
      } else {
        weekdayBookingsCount++;
      }
    }
  }

  // ─── H. Operational Health & Actionable Alerts ────────────────────
  const pendingRequests = (store.bookings || []).filter((b) => b.status === 'REQUESTED').length;
  const paymentPending = (store.bookings || []).filter((b) => b.status === 'PAYMENT_PENDING').length;
  const noShowCount = (store.bookings || []).filter((b) => b.status === 'NO_SHOW' || b.noShow).length;
  const recentCancellations = filteredBookings.filter((b) => b.status === 'CANCELLED').length;
  const upcomingCount = activeOrConfirmedBookings.filter((b) => !isBookingElapsed(b, now)).length;

  const alerts = [];
  if (pendingRequests > 0) {
    alerts.push({
      id: 'alert-pending-requests',
      level: 'warning',
      title: 'Pending Booking Requests',
      message: `${pendingRequests} reservation request${pendingRequests > 1 ? 's are' : ' is'} awaiting venue owner review and approval.`,
      count: pendingRequests,
    });
  }
  if (paymentPending > 0) {
    alerts.push({
      id: 'alert-payment-pending',
      level: 'info',
      title: 'Unpaid Approved Bookings',
      message: `${paymentPending} booking${paymentPending > 1 ? 's have' : ' has'} owner approval and await customer payment settlement.`,
      count: paymentPending,
    });
  }
  if (inactiveCourts > 0) {
    alerts.push({
      id: 'alert-inactive-courts',
      level: 'warning',
      title: 'Inactive / Maintenance Facilities',
      message: `${inactiveCourts} court${inactiveCourts > 1 ? 's are' : ' is'} currently marked inactive or undergoing maintenance.`,
      count: inactiveCourts,
    });
  }
  if (suspendedUsers > 0) {
    alerts.push({
      id: 'alert-suspended-users',
      level: 'info',
      title: 'Suspended User Accounts',
      message: `${suspendedUsers} user account${suspendedUsers > 1 ? 's are' : ' is'} currently in suspended state.`,
      count: suspendedUsers,
    });
  }

  return res.status(200).json({
    status: 'ok',
    filter: {
      range,
      startDate: startDateFilter,
      endDate: endDateFilter,
      daysInRange,
    },
    platformOverview: {
      totalUsers,
      totalCustomers,
      totalOwners,
      totalAdmins,
      suspendedUsers,
      totalVenues,
      activeVenues,
      totalCourts,
      activeCourts,
      inactiveCourts,
    },
    bookingOverview: {
      totalBookings: filteredBookings.length,
      ...bookingStatusCounts,
      activeOrConfirmedTotal: activeOrConfirmedBookings.length,
    },
    paymentOverview: {
      totalBookingValue,
      collectedBookingValue,
      pendingBookingValue,
      refundedValue,
      failedValue,
      paymentMethodsBreakdown,
    },
    courtUtilization: {
      totalCapacityHours,
      occupiedCourtHours,
      utilizationRate,
      busiestCourts,
    },
    sportsAnalytics,
    venueAndCityAnalytics: {
      cities: cityAnalytics,
      topVenues,
    },
    timeDemandAnalytics: {
      hourlyDemand,
      peakBookingsCount,
      offPeakBookingsCount,
      weekdayBookingsCount,
      weekendBookingsCount,
    },
    operationalHealth: {
      pendingRequestsCount: pendingRequests,
      paymentPendingCount: paymentPending,
      inactiveCourtsCount: inactiveCourts,
      recentCancellationsCount: recentCancellations,
      noShowCount,
      upcomingBookingsCount: upcomingCount,
      alerts,
    },
  });
}

// ─── Venue Trust & Verification Management (Phase 19) ──────────────────────────

export const VALID_VERIFICATION_TRANSITIONS = {
  PENDING: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['SUSPENDED'],
  REJECTED: ['VERIFIED'],
  SUSPENDED: ['VERIFIED'],
};

export const VALID_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];

/**
 * GET /api/admin/venues/verification
 * Requires: authenticate + requireRole('ADMIN')
 * Query: status (optional: ALL, PENDING, VERIFIED, REJECTED, SUSPENDED), search (optional)
 */
export function listVenueVerifications(req, res) {
  const { status, search } = req.query || {};

  const counts = {
    total: store.venues.length,
    pending: store.venues.filter((v) => (v.verificationStatus || 'PENDING') === 'PENDING').length,
    verified: store.venues.filter((v) => v.verificationStatus === 'VERIFIED').length,
    rejected: store.venues.filter((v) => v.verificationStatus === 'REJECTED').length,
    suspended: store.venues.filter((v) => v.verificationStatus === 'SUSPENDED').length,
  };

  let filtered = [...store.venues];

  if (status && status.toUpperCase() !== 'ALL') {
    const targetStatus = status.toUpperCase();
    if (!VALID_VERIFICATION_STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid verification status filter. Valid options: ALL, ${VALID_VERIFICATION_STATUSES.join(', ')}`,
      });
    }
    filtered = filtered.filter((v) => (v.verificationStatus || 'PENDING') === targetStatus);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((v) => {
      const owner = (store.users || []).find((u) => u.id === v.ownerId);
      const nameMatch = (v.name || '').toLowerCase().includes(q);
      const cityMatch = (v.city || '').toLowerCase().includes(q);
      const ownerNameMatch = owner && (owner.name || '').toLowerCase().includes(q);
      const ownerEmailMatch = owner && (owner.email || '').toLowerCase().includes(q);
      return nameMatch || cityMatch || ownerNameMatch || ownerEmailMatch;
    });
  }

  return res.status(200).json({
    status: 'ok',
    counts,
    venues: filtered.map(serializeAdminVenue),
  });
}

/**
 * PATCH /api/admin/venues/:venueId/verification
 * Requires: authenticate + requireRole('ADMIN')
 * Body: { status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED', note?: string, reason?: string }
 */
export function updateVenueVerification(req, res) {
  const { venueId } = req.params;
  const { status, note, reason } = req.body || {};

  const venue = store.venues.find((v) => v.id === venueId);
  if (!venue) {
    return res.status(404).json({
      status: 'error',
      message: 'Venue not found.',
    });
  }

  if (!status || typeof status !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Verification status is required.',
    });
  }

  const targetStatus = status.trim().toUpperCase();
  if (!VALID_VERIFICATION_STATUSES.includes(targetStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid verification status: '${status}'. Allowed values: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
    });
  }

  const currentStatus = venue.verificationStatus || 'PENDING';
  const allowedTransitions = VALID_VERIFICATION_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(targetStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot transition venue verification from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTransitions.length ? allowedTransitions.join(', ') : 'none'}`,
    });
  }

  const noteText = typeof note === 'string' && note.trim()
    ? note.trim()
    : (typeof reason === 'string' && reason.trim() ? reason.trim() : '');

  if (['REJECTED', 'SUSPENDED'].includes(targetStatus)) {
    if (!noteText) {
      return res.status(400).json({
        status: 'error',
        message: `A reason/note is required when setting verification status to ${targetStatus}.`,
      });
    }
    if (noteText.length > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification note must be 500 characters or fewer.',
      });
    }
  }

  const nowIso = new Date().toISOString();
  venue.verificationStatus = targetStatus;
  venue.verificationUpdatedAt = nowIso;
  venue.verifiedBy = req.user.id;

  if (targetStatus === 'VERIFIED') {
    venue.verifiedAt = nowIso;
    venue.verificationNote = noteText || 'Verified by administrator';
  } else {
    venue.verifiedAt = null;
    venue.verificationNote = noteText;
  }

  // Dispatch owner notification
  if (venue.ownerId) {
    if (targetStatus === 'VERIFIED') {
      const isRestored = ['REJECTED', 'SUSPENDED'].includes(currentStatus);
      createNotification({
        recipientUserId: venue.ownerId,
        type: isRestored ? NOTIFICATION_TYPES.VENUE_RESTORED : NOTIFICATION_TYPES.VENUE_VERIFIED,
        title: isRestored ? 'Venue Restored & Verified' : 'Venue Verified',
        message: isRestored
          ? `Your venue "${venue.name}" has been restored and verified by the QuickCourt team.`
          : `Congratulations! Your venue "${venue.name}" is now officially verified on QuickCourt.`,
        venueId: venue.id,
      });
    } else if (targetStatus === 'REJECTED') {
      createNotification({
        recipientUserId: venue.ownerId,
        type: NOTIFICATION_TYPES.VENUE_REJECTED,
        title: 'Venue Verification Rejected',
        message: `Your venue "${venue.name}" verification was rejected. Reason: ${noteText}`,
        venueId: venue.id,
      });
    } else if (targetStatus === 'SUSPENDED') {
      createNotification({
        recipientUserId: venue.ownerId,
        type: NOTIFICATION_TYPES.VENUE_SUSPENDED,
        title: 'Venue Suspended',
        message: `Your venue "${venue.name}" has been suspended. Reason: ${noteText}`,
        venueId: venue.id,
      });
    }
  }

  return res.status(200).json({
    status: 'ok',
    message: `Venue verification status updated to ${targetStatus}.`,
    venue: serializeAdminVenue(venue),
  });
}

// ─── Court Approval & Moderation Management ──────────────────────────────────

export const VALID_COURT_APPROVAL_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['REJECTED'],
  REJECTED: ['APPROVED'],
};

export const VALID_COURT_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * Safely serializes a court for admin auditing & moderation.
 * Enriches with venue summary and owner details.
 */
export function serializeAdminCourt(court) {
  if (!court) return null;
  const venue = (store.venues || []).find((v) => v.id === court.venueId);
  const owner = venue ? (store.users || []).find((u) => u.id === venue.ownerId) : null;

  return {
    id: court.id,
    venueId: court.venueId,
    venueName: venue ? venue.name : 'Unknown Facility',
    venueLocation: venue ? (venue.location || venue.city || '') : '',
    venueCity: venue ? (venue.city || '') : '',
    ownerId: venue ? venue.ownerId : null,
    ownerName: owner ? owner.name : 'Unknown Owner',
    ownerEmail: owner ? owner.email : '',
    name: court.name,
    sport: court.sport,
    courtType: court.courtType || 'Standard',
    indoor: Boolean(court.indoor),
    pricePerHour: Number(court.pricePerHour),
    operatingHours: court.operatingHours,
    isActive: Boolean(court.isActive),
    approvalStatus: court.approvalStatus || 'APPROVED',
    approvedAt: court.approvedAt || null,
    approvedBy: court.approvedBy || null,
    approvalNote: court.approvalNote || null,
    approvalUpdatedAt: court.approvalUpdatedAt || null,
    createdAt: court.createdAt,
    updatedAt: court.updatedAt,
  };
}

/**
 * GET /api/admin/courts/approval
 * Requires: authenticate + requireRole('ADMIN')
 * Query: status (optional: ALL, PENDING, APPROVED, REJECTED), search (optional)
 */
export function listCourtApprovals(req, res) {
  const { status, search } = req.query || {};

  const allCourts = store.courts || [];
  const counts = {
    total: allCourts.length,
    pending: allCourts.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length,
    approved: allCourts.filter((c) => (c.approvalStatus || 'APPROVED') === 'APPROVED').length,
    rejected: allCourts.filter((c) => c.approvalStatus === 'REJECTED').length,
  };

  let filtered = [...allCourts];

  if (status && status.toUpperCase() !== 'ALL') {
    const targetStatus = status.toUpperCase();
    if (!VALID_COURT_APPROVAL_STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid court approval status filter. Valid options: ALL, ${VALID_COURT_APPROVAL_STATUSES.join(', ')}`,
      });
    }
    filtered = filtered.filter((c) => (c.approvalStatus || 'APPROVED') === targetStatus);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((c) => {
      const venue = (store.venues || []).find((v) => v.id === c.venueId);
      const owner = venue ? (store.users || []).find((u) => u.id === venue.ownerId) : null;
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const sportMatch = (c.sport || '').toLowerCase().includes(q);
      const venueMatch = venue && (venue.name || '').toLowerCase().includes(q);
      const cityMatch = venue && (venue.city || '').toLowerCase().includes(q);
      const ownerMatch = owner && ((owner.name || '').toLowerCase().includes(q) || (owner.email || '').toLowerCase().includes(q));
      return nameMatch || sportMatch || venueMatch || cityMatch || ownerMatch;
    });
  }

  return res.status(200).json({
    status: 'ok',
    counts,
    courts: filtered.map(serializeAdminCourt),
  });
}

/**
 * PATCH /api/admin/courts/:courtId/approval
 * Requires: authenticate + requireRole('ADMIN')
 * Body: { status: 'APPROVED' | 'REJECTED', note?: string, reason?: string }
 */
export function updateCourtApproval(req, res) {
  const { courtId } = req.params;
  const rawStatus = req.body?.status || req.body?.approvalStatus;
  const rawNote = req.body?.note || req.body?.approvalNote || req.body?.reason;

  const court = (store.courts || []).find((c) => c.id === courtId);
  if (!court) {
    return res.status(404).json({
      status: 'error',
      message: 'Court not found.',
    });
  }

  if (!rawStatus || typeof rawStatus !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Approval status is required.',
    });
  }

  const targetStatus = rawStatus.trim().toUpperCase();
  if (!VALID_COURT_APPROVAL_STATUSES.includes(targetStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid approval status: '${rawStatus}'. Allowed values: ${VALID_COURT_APPROVAL_STATUSES.join(', ')}`,
    });
  }

  const currentStatus = court.approvalStatus || 'APPROVED';
  const allowedTransitions = VALID_COURT_APPROVAL_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(targetStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot transition court approval from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTransitions.length ? allowedTransitions.join(', ') : 'none'}`,
    });
  }

  const noteText = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : '';

  if (targetStatus === 'REJECTED' && !noteText) {
    return res.status(400).json({
      status: 'error',
      message: 'A reason/note is required when rejecting a court request.',
    });
  }

  if (noteText.length > 500) {
    return res.status(400).json({
      status: 'error',
      message: 'Approval note must be 500 characters or fewer.',
    });
  }

  const nowIso = new Date().toISOString();
  court.approvalStatus = targetStatus;
  court.approvalUpdatedAt = nowIso;
  court.approvedBy = req.user.id;

  if (targetStatus === 'APPROVED') {
    court.approvedAt = nowIso;
    court.approvalNote = noteText || 'Approved by administrator';
    court.isActive = true;
  } else {
    court.approvedAt = null;
    court.approvalNote = noteText;
    court.isActive = false;
  }

  const venue = (store.venues || []).find((v) => v.id === court.venueId);
  if (venue) {
    // Sync active/approved count on venue
    venue.courtCount = (store.courts || []).filter((c) => c.venueId === venue.id && (c.approvalStatus || 'APPROVED') === 'APPROVED').length;

    // Dispatch owner notification
    if (venue.ownerId) {
      if (targetStatus === 'APPROVED') {
        createNotification({
          recipientUserId: venue.ownerId,
          type: NOTIFICATION_TYPES.COURT_APPROVED,
          title: 'Court Request Approved',
          message: `Your court "${court.name}" at venue "${venue.name}" has been approved by the QuickCourt team and is now active for bookings.`,
          venueId: venue.id,
          courtId: court.id,
        });
      } else if (targetStatus === 'REJECTED') {
        createNotification({
          recipientUserId: venue.ownerId,
          type: NOTIFICATION_TYPES.COURT_REJECTED,
          title: 'Court Request Rejected',
          message: `Your court "${court.name}" at venue "${venue.name}" was rejected. Reason: ${noteText}`,
          venueId: venue.id,
          courtId: court.id,
        });
      }
    }
  }

  return res.status(200).json({
    status: 'ok',
    message: `Court approval status updated to ${targetStatus}.`,
    court: serializeAdminCourt(court),
  });
}



