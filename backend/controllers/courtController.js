import { store, safeCourt } from '../data/store.js';
import { isBookingActive } from '../config/bookingStates.js';
import { parse12HourTime } from './bookingController.js';
import {
  createNotification,
  NOTIFICATION_TYPES,
} from './notificationController.js';

export const SUPPORTED_SPORTS = [
  'Badminton',
  'Tennis',
  'Football',
  'Basketball',
  'Pickleball',
  'Cricket',
  'Squash',
  'Table Tennis',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCourtId() {
  return `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Parses operating hours string like "06:00 AM - 10:00 PM" into { startHour, endHour }.
 * Defaults to 6..22 (06:00 AM to 10:00 PM) if invalid.
 */
function parseOperatingHours(hoursStr) {
  const defaultRange = { startHour: 6, endHour: 22 };
  if (!hoursStr || typeof hoursStr !== 'string') return defaultRange;

  const parts = hoursStr.split('-').map((s) => s.trim());
  if (parts.length !== 2) return defaultRange;

  function to24Hour(timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  }

  const startHour = to24Hour(parts[0]);
  const endHour = to24Hour(parts[1]);

  if (startHour === null || endHour === null || startHour >= endHour) {
    return defaultRange;
  }
  return { startHour, endHour };
}

function format12Hour(hour) {
  const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  const hh = String(h).padStart(2, '0');
  return `${hh}:00 ${period}`;
}

/**
 * Deterministically generates slot status without any booking or reservation mutation.
 * Active courts have a mix of AVAILABLE and UNAVAILABLE slots. Inactive courts are all UNAVAILABLE.
 */
function getDeterministicStatus(court, dateStr, hour) {
  if (!court.isActive) return 'UNAVAILABLE';

  let hash = hour;
  for (let i = 0; i < court.id.length; i++) {
    hash = (hash * 31 + court.id.charCodeAt(i)) % 10007;
  }
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % 10007;
  }
  return hash % 4 === 0 ? 'UNAVAILABLE' : 'AVAILABLE';
}

// ─── PUBLIC: List Courts ──────────────────────────────────────────────────────

/**
 * GET /api/courts
 * Query filters:
 *   - venueId
 *   - sport
 *   - isActive ('true' | 'false')
 * Public discovery only returns APPROVED courts.
 */
export function listCourts(req, res) {
  let results = store.courts.filter((c) => (c.approvalStatus || 'APPROVED') === 'APPROVED');

  const { venueId, sport, isActive } = req.query;

  if (venueId) {
    results = results.filter((c) => c.venueId === venueId);
  }

  if (sport) {
    const sTerm = sport.toLowerCase();
    results = results.filter((c) => c.sport && c.sport.toLowerCase() === sTerm);
  }

  if (isActive !== undefined) {
    const wantActive = isActive === 'true';
    results = results.filter((c) => Boolean(c.isActive) === wantActive);
  }

  return res.status(200).json({
    status: 'ok',
    count: results.length,
    courts: results.map(safeCourt),
  });
}

// ─── PUBLIC: Get Court Detail ─────────────────────────────────────────────────

/**
 * GET /api/courts/:id
 * Returns court and associated venue summary.
 * Public discovery only allows viewing APPROVED courts.
 */
export function getCourt(req, res) {
  const court = store.courts.find((c) => c.id === req.params.id);

  if (!court || (court.approvalStatus && court.approvalStatus !== 'APPROVED')) {
    return res.status(404).json({ status: 'error', message: 'Court not found.' });
  }

  const venue = store.venues.find((v) => v.id === court.venueId);

  const venueSummary = venue
    ? {
        id: venue.id,
        name: venue.name,
        location: venue.location,
        city: venue.city,
        openingHours: venue.openingHours,
        indoor: venue.indoor,
      }
    : null;

  return res.status(200).json({
    status: 'ok',
    court: {
      ...safeCourt(court),
      venue: venueSummary,
    },
  });
}

// ─── OWNER: List My Courts ────────────────────────────────────────────────────

/**
 * GET /api/courts/my/courts
 * Requires: authenticate + requireRole('OWNER')
 */
export function listMyCourts(req, res) {
  const myVenues = store.venues.filter((v) => v.ownerId === req.user.id);
  const myVenueIds = new Set(myVenues.map((v) => v.id));

  const myCourts = store.courts.filter((c) => myVenueIds.has(c.venueId));

  return res.status(200).json({
    status: 'ok',
    count: myCourts.length,
    courts: myCourts.map(safeCourt),
  });
}

// ─── OWNER: Create Court Under Venue ──────────────────────────────────────────

/**
 * POST /api/venues/:venueId/courts
 * Requires: authenticate + requireRole('OWNER')
 */
export function createCourt(req, res) {
  const { venueId } = req.params;

  const venue = store.venues.find((v) => v.id === venueId);
  if (!venue) {
    return res.status(404).json({ status: 'error', message: 'Venue not found.' });
  }

  // Cross-owner verification: authenticated owner must own this venue
  if (venue.ownerId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to add courts to this venue.',
    });
  }

  const { name, sport, courtType, indoor, pricePerHour, operatingHours, isActive } = req.body || {};

  // Validation: required fields and types
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ status: 'error', message: 'Court name is required.' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ status: 'error', message: 'Court name cannot exceed 100 characters.' });
  }

  if (!sport || typeof sport !== 'string' || !sport.trim()) {
    return res.status(400).json({ status: 'error', message: 'Sport is required.' });
  }

  const normalizedSport = SUPPORTED_SPORTS.find(
    (s) => s.toLowerCase() === sport.trim().toLowerCase()
  );
  if (!normalizedSport) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid sport "${sport.trim()}". Supported sports: ${SUPPORTED_SPORTS.join(', ')}.`,
    });
  }

  // Verify sport is compatible with venue
  const venueSports = Array.isArray(venue.sportTypes)
    ? venue.sportTypes
    : (typeof venue.sportTypes === 'string' ? venue.sportTypes.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const isCompatible = venueSports.length === 0 || venueSports.some(
    (s) => s.toLowerCase() === normalizedSport.toLowerCase()
  );
  if (!isCompatible) {
    return res.status(400).json({
      status: 'error',
      message: `Sport "${sport.trim()}" is not offered at this venue. Offered sports: ${venueSports.join(', ')}.`,
    });
  }

  const numericPrice = Number(pricePerHour);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Price per hour must be a positive number.',
    });
  }

  const now = new Date().toISOString();

  // Create court entity with explicit pending admin approval status
  const newCourt = {
    id: generateCourtId(),
    venueId: venue.id,
    name: name.trim(),
    sport: normalizedSport,
    courtType: (typeof courtType === 'string' && courtType.trim()) || 'Standard',
    indoor: indoor !== undefined ? Boolean(indoor) : Boolean(venue.indoor),
    pricePerHour: numericPrice,
    operatingHours: (typeof operatingHours === 'string' && operatingHours.trim()) || venue.openingHours,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    approvalStatus: 'PENDING',
    approvedAt: null,
    approvedBy: null,
    approvalNote: 'Pending administrator approval',
    approvalUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  store.courts.push(newCourt);

  // Sync courtCount on venue (counting only approved courts)
  venue.courtCount = store.courts.filter((c) => c.venueId === venue.id && (c.approvalStatus || 'APPROVED') === 'APPROVED').length;

  // Authoritatively derive Admin users and dispatch notification
  const adminUsers = (store.users || []).filter(
    (u) => (u.role || '').toUpperCase() === 'ADMIN'
  );
  if (adminUsers.length > 0) {
    const ownerUser = (store.users || []).find((u) => u.id === req.user.id);
    const ownerName = ownerUser ? ownerUser.name : 'Facility Owner';
    adminUsers.forEach((adminUser) => {
      createNotification({
        recipientUserId: adminUser.id,
        type: NOTIFICATION_TYPES.NEW_COURT_REQUEST,
        title: 'New Court Approval Request',
        message: `Owner ${ownerName} requested approval for a new court "${newCourt.name}" (${newCourt.sport}, ₹${newCourt.pricePerHour}/hr) at venue "${venue.name}".`,
        venueId: venue.id,
        courtId: newCourt.id,
      });
    });
  }

  return res.status(201).json({
    status: 'ok',
    message: 'Court submitted for administrator approval.',
    court: safeCourt(newCourt),
  });
}

// ─── OWNER: Update Court ──────────────────────────────────────────────────────

/**
 * PUT /api/courts/:id
 * Requires: authenticate + requireRole('OWNER')
 */
export function updateCourt(req, res) {
  const court = store.courts.find((c) => c.id === req.params.id);
  if (!court) {
    return res.status(404).json({ status: 'error', message: 'Court not found.' });
  }

  const venue = store.venues.find((v) => v.id === court.venueId);
  if (!venue || venue.ownerId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to modify this court.',
    });
  }

  const { name, sport, courtType, indoor, pricePerHour, operatingHours, isActive } = req.body || {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Court name cannot be empty.' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ status: 'error', message: 'Court name cannot exceed 100 characters.' });
    }
    court.name = name.trim();
  }

  if (sport !== undefined) {
    if (typeof sport !== 'string' || !sport.trim()) {
      return res.status(400).json({ status: 'error', message: 'Sport cannot be empty.' });
    }
    const normalizedSport = SUPPORTED_SPORTS.find(
      (s) => s.toLowerCase() === sport.trim().toLowerCase()
    );
    if (!normalizedSport) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid sport "${sport.trim()}". Supported sports: ${SUPPORTED_SPORTS.join(', ')}.`,
      });
    }
    const venueSports = Array.isArray(venue.sportTypes)
      ? venue.sportTypes
      : (typeof venue.sportTypes === 'string' ? venue.sportTypes.split(',').map((s) => s.trim()).filter(Boolean) : []);
    const isCompatible = venueSports.length === 0 || venueSports.some(
      (s) => s.toLowerCase() === normalizedSport.toLowerCase()
    );
    if (!isCompatible) {
      return res.status(400).json({
        status: 'error',
        message: `Sport "${sport.trim()}" is not offered at this venue. Offered sports: ${venueSports.join(', ')}.`,
      });
    }
    court.sport = normalizedSport;
  }

  if (courtType !== undefined) {
    if (typeof courtType === 'string' && courtType.trim()) {
      court.courtType = courtType.trim();
    }
  }

  if (indoor !== undefined) {
    court.indoor = Boolean(indoor);
  }

  if (pricePerHour !== undefined) {
    const numericPrice = Number(pricePerHour);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ status: 'error', message: 'Price per hour must be a positive number.' });
    }
    court.pricePerHour = numericPrice;
  }

  if (operatingHours !== undefined) {
    if (typeof operatingHours === 'string' && operatingHours.trim()) {
      court.operatingHours = operatingHours.trim();
    }
  }

  if (isActive !== undefined) {
    court.isActive = Boolean(isActive);
  }

  court.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    court: safeCourt(court),
  });
}

// ─── OWNER: Delete Court ──────────────────────────────────────────────────────

/**
 * DELETE /api/courts/:id
 * Requires: authenticate + requireRole('OWNER')
 */
export function deleteCourt(req, res) {
  const idx = store.courts.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Court not found.' });
  }

  const court = store.courts[idx];
  const venue = store.venues.find((v) => v.id === court.venueId);

  if (!venue || venue.ownerId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to delete this court.',
    });
  }

  store.courts.splice(idx, 1);

  // Sync courtCount on venue (counting only approved courts)
  venue.courtCount = store.courts.filter((c) => c.venueId === venue.id && (c.approvalStatus || 'APPROVED') === 'APPROVED').length;

  // Clean up associated bookings to maintain referential integrity
  store.bookings = store.bookings.filter((b) => b.courtId !== court.id);

  return res.status(200).json({
    status: 'ok',
    message: 'Court deleted successfully.',
  });
}

// ─── PUBLIC: Court Availability (Pure Read-Only) ──────────────────────────────

/**
 * GET /api/courts/:id/availability?date=YYYY-MM-DD
 * Calculates availability from operating hours and active bookings.
 * Does NOT mutate store data.
 * Public endpoint: requires court to be approved.
 */
export function getCourtAvailability(req, res) {
  const court = store.courts.find((c) => c.id === req.params.id);
  if (!court || (court.approvalStatus && court.approvalStatus !== 'APPROVED')) {
    return res.status(404).json({ status: 'error', message: 'Court not found.' });
  }

  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Date query parameter is required in YYYY-MM-DD format.',
    });
  }

  // Validate format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date format. Please use YYYY-MM-DD.',
    });
  }

  // Validate calendar date
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid calendar date.',
    });
  }

  const { startHour, endHour } = parseOperatingHours(court.operatingHours);

  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    const startTime = format12Hour(h);
    const endTime = format12Hour(h + 1);
    let status = getDeterministicStatus(court, date, h);

    // If an active booking overlaps with this 1-hour slot [h, h+1), slot is UNAVAILABLE
    const isBooked = store.bookings.some((b) => {
      if (b.courtId !== court.id || b.date !== date || !isBookingActive(b.status)) {
        return false;
      }
      if (b.startTime === startTime) return true;
      const bStart = parse12HourTime(b.startTime);
      const bEnd = parse12HourTime(b.endTime);
      if (bStart === null || bEnd === null) return false;
      return h < bEnd && (h + 1) > bStart;
    });

    if (isBooked) {
      status = 'UNAVAILABLE';
    }

    slots.push({
      id: `slot-${String(h).padStart(2, '0')}`,
      startTime,
      endTime,
      status, // 'AVAILABLE' | 'UNAVAILABLE'
    });
  }

  return res.status(200).json({
    status: 'ok',
    courtId: court.id,
    courtName: court.name,
    sport: court.sport,
    date,
    operatingHours: court.operatingHours,
    slots,
  });
}

export { parseOperatingHours, format12Hour, getDeterministicStatus };

