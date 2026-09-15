import { store, safeCourt } from '../data/store.js';
import { isBookingActive } from '../config/bookingStates.js';
import { parse12HourTime } from './bookingController.js';
import { format12Hour, parseOperatingHours, getDeterministicStatus } from './courtController.js';

/**
 * Deterministically classifies a time slot into PEAK or OFF_PEAK.
 * Peak periods:
 * - Weekday evenings (17:00 / 05:00 PM to 22:00 / 10:00 PM)
 * - Weekend morning & evening slots (07:00 AM to 11:00 AM, and 16:00 / 04:00 PM to 22:00 / 10:00 PM)
 * Off-Peak periods:
 * - All other operating hours (weekday daytime, late night).
 */
export function classifyTimeSlot(dateStr, startHour, endHour) {
  let isWeekend = false;
  if (dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (!isNaN(d.getTime())) {
      const day = d.getUTCDay(); // 0 = Sun, 6 = Sat
      isWeekend = day === 0 || day === 6;
    }
  }

  const s = typeof startHour === 'number' ? startHour : 18;
  const e = typeof endHour === 'number' ? endHour : s + 1;

  let isPeak = false;
  if (isWeekend) {
    // Weekend peak: 7-11 AM and 16-22 (4 PM - 10 PM)
    if ((s >= 7 && s < 11) || (s >= 16 && s < 22)) {
      isPeak = true;
    }
  } else {
    // Weekday peak: 17-22 (5 PM - 10 PM)
    if (s >= 17 && s < 22) {
      isPeak = true;
    }
  }

  return {
    tier: isPeak ? 'PEAK' : 'OFF_PEAK',
    label: isPeak ? 'Peak Hours' : 'Off-Peak Hours',
    description: isPeak
      ? 'High demand time slot with maximum court activity'
      : 'Lower demand daytime / standard slot with great value',
    isPeak,
    isWeekend,
  };
}

/**
 * Checks if a specific continuous time slot [startH, endH) on a given date is available on a court.
 */
function isSlotAvailableOnCourt(court, dateStr, startH, endH) {
  if (!court.isActive) return false;
  const { startHour: courtStart, endHour: courtEnd } = parseOperatingHours(court.operatingHours);
  if (startH < courtStart || endH > courtEnd) return false;

  for (let h = startH; h < endH; h++) {
    if (getDeterministicStatus(court, dateStr, h) === 'UNAVAILABLE') {
      return false;
    }
  }

  const isBooked = (store.bookings || []).some((b) => {
    if (b.courtId !== court.id || b.date !== dateStr || !isBookingActive(b.status)) {
      return false;
    }
    const bStart = parse12HourTime(b.startTime);
    const bEnd = parse12HourTime(b.endTime);
    if (bStart === null || bEnd === null) return false;
    return startH < bEnd && endH > bStart;
  });

  return !isBooked;
}

// ─── CUSTOMER / PUBLIC: Compare Court Prices ──────────────────────────────────

/**
 * GET /api/pricing/compare
 * Query parameters:
 *   - sport (optional): e.g. "Badminton", "Tennis", "Pickleball"
 *   - city (optional): e.g. "Ahmedabad", "Mumbai"
 *   - location (optional): area substring match
 *   - date (optional, YYYY-MM-DD): default today or future date
 *   - startTime (optional, "HH:00 AM/PM"): e.g. "06:00 PM"
 *   - duration (optional, integer 1..6): default 1
 *   - indoor (optional, 'true' | 'false')
 *   - sortBy (optional, 'price_asc' | 'price_desc' | 'rating_desc' | 'best_value'): default 'price_asc'
 */
export function compareCourtPrices(req, res) {
  const {
    sport,
    city,
    location,
    date,
    startTime,
    duration = 1,
    indoor,
    sortBy = 'price_asc',
  } = req.query;

  const durationHours = Math.max(1, Math.min(6, parseInt(duration, 10) || 1));
  const parsedStartHour = startTime ? parse12HourTime(String(startTime)) : null;
  const parsedEndHour = parsedStartHour !== null ? parsedStartHour + durationHours : null;

  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  // Filter active courts
  let candidateCourts = (store.courts || []).filter((c) => Boolean(c.isActive));

  // Sport filter
  if (sport && typeof sport === 'string' && sport.trim()) {
    const sTerm = sport.trim().toLowerCase();
    candidateCourts = candidateCourts.filter(
      (c) => c.sport && c.sport.toLowerCase() === sTerm
    );
  }

  // Indoor filter on court
  if (indoor !== undefined && indoor !== '') {
    const wantIndoor = indoor === 'true';
    candidateCourts = candidateCourts.filter((c) => Boolean(c.indoor) === wantIndoor);
  }

  // Venue map for location/city & rating lookups
  const venueMap = new Map((store.venues || []).map((v) => [v.id, v]));

  // City & location filter on venue
  if (city && typeof city === 'string' && city.trim()) {
    const cTerm = city.trim().toLowerCase();
    candidateCourts = candidateCourts.filter((c) => {
      const v = venueMap.get(c.venueId);
      return v && v.city && v.city.toLowerCase() === cTerm;
    });
  }

  if (location && typeof location === 'string' && location.trim()) {
    const lTerm = location.trim().toLowerCase();
    candidateCourts = candidateCourts.filter((c) => {
      const v = venueMap.get(c.venueId);
      return (
        v &&
        ((v.location && v.location.toLowerCase().includes(lTerm)) ||
          (v.address && v.address.toLowerCase().includes(lTerm)))
      );
    });
  }

  if (candidateCourts.length === 0) {
    return res.status(200).json({
      status: 'ok',
      count: 0,
      durationHours,
      date: validDate,
      startTime: parsedStartHour !== null ? format12Hour(parsedStartHour) : null,
      endTime: parsedEndHour !== null ? format12Hour(parsedEndHour) : null,
      summary: {
        minPricePerHour: 0,
        maxPricePerHour: 0,
        avgPricePerHour: 0,
        bestPriceCourtId: null,
        bestValueCourtId: null,
      },
      comparisons: [],
    });
  }

  // Calculate market price baseline for the candidate set
  const allPrices = candidateCourts.map((c) => Number(c.pricePerHour || 0));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);

  // Classify time slot tier if time provided
  const slotClassification = parsedStartHour !== null
    ? classifyTimeSlot(validDate, parsedStartHour, parsedEndHour)
    : null;

  // Build comparison items
  const items = candidateCourts.map((court) => {
    const venue = venueMap.get(court.venueId) || null;
    const pricePerHour = Number(court.pricePerHour || 0);
    const totalPrice = pricePerHour * durationHours;
    const rating = venue ? Number(venue.rating || 0) : 0;
    const reviewCount = venue ? Number(venue.reviewCount || 0) : 0;

    let isAvailable = true;
    if (validDate && parsedStartHour !== null && parsedEndHour !== null) {
      isAvailable = isSlotAvailableOnCourt(court, validDate, parsedStartHour, parsedEndHour);
    }

    // Best price flag: matching minimum hourly rate in candidate set
    const isBestPrice = pricePerHour === minPrice;

    // Value quotient calculation (balance between rating & price):
    // Standardizes rating (1-5) divided by price index
    const priceRatio = pricePerHour / (avgPrice || 1);
    const valueScore = rating > 0 ? Number((rating / priceRatio).toFixed(2)) : Number((3 / priceRatio).toFixed(2));

    const priceDiffFromAvg = pricePerHour - avgPrice;

    return {
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      courtType: court.courtType || 'Standard',
      indoor: Boolean(court.indoor),
      operatingHours: court.operatingHours,
      pricePerHour,
      durationHours,
      totalPrice,
      priceDiffFromAvg,
      valueScore,
      isBestPrice,
      isBestValue: false, // Calculated after sorting
      isAvailable,
      pricingTier: slotClassification ? slotClassification.tier : (pricePerHour >= avgPrice ? 'STANDARD' : 'VALUE'),
      tierLabel: slotClassification ? slotClassification.label : null,
      venue: venue
        ? {
            id: venue.id,
            name: venue.name,
            location: venue.location || '',
            city: venue.city || '',
            address: venue.address || '',
            rating,
            reviewCount,
            indoor: Boolean(venue.indoor),
            imageUrl: venue.imageUrl || null,
            amenities: venue.amenities || [],
          }
        : null,
    };
  });

  // Determine Best Value court (highest valueScore with rating >= 4.0 or highest overall)
  const sortedByValue = [...items].sort((a, b) => b.valueScore - a.valueScore);
  const bestValueItem = sortedByValue[0];
  if (bestValueItem) {
    const target = items.find((i) => i.courtId === bestValueItem.courtId);
    if (target) target.isBestValue = true;
  }

  // Sort results according to sortBy parameter
  if (sortBy === 'price_desc') {
    items.sort((a, b) => b.totalPrice - a.totalPrice);
  } else if (sortBy === 'rating_desc') {
    items.sort((a, b) => (b.venue?.rating || 0) - (a.venue?.rating || 0));
  } else if (sortBy === 'best_value') {
    items.sort((a, b) => b.valueScore - a.valueScore);
  } else {
    // default price_asc
    items.sort((a, b) => a.totalPrice - b.totalPrice);
  }

  return res.status(200).json({
    status: 'ok',
    count: items.length,
    durationHours,
    date: validDate,
    startTime: parsedStartHour !== null ? format12Hour(parsedStartHour) : null,
    endTime: parsedEndHour !== null ? format12Hour(parsedEndHour) : null,
    pricingTier: slotClassification ? slotClassification.tier : null,
    summary: {
      minPricePerHour: minPrice,
      maxPricePerHour: maxPrice,
      avgPricePerHour: avgPrice,
      bestPriceCourtId: items.find((i) => i.isBestPrice)?.courtId || null,
      bestValueCourtId: bestValueItem?.courtId || null,
    },
    comparisons: items,
  });
}

// ─── OWNER: Pricing Intelligence & Smart Pricing Recommendations ──────────────

/**
 * GET /api/owner/pricing-intelligence
 * Requires: authenticate + requireRole('OWNER')
 *
 * Provides server-authoritative, deterministic pricing intelligence for
 * courts belonging to the authenticated venue owner:
 * - Current base price
 * - Peak vs Off-Peak rates & slots
 * - Demand & booking utilization statistics
 * - City / Sport market price baseline
 * - Advisory pricing recommendations & transparent explanations
 *
 * Strict Server-Side Isolation:
 * - Only includes venues where venue.ownerId === req.user.id
 */
export function getOwnerPricingIntelligence(req, res) {
  const ownerId = req.user.id;

  // 1. Fetch only venues owned by authenticated owner
  const myVenues = (store.venues || []).filter((v) => v.ownerId === ownerId);
  const myVenueIds = new Set(myVenues.map((v) => v.id));

  // 2. Fetch only courts belonging to this owner's venues
  const myCourts = (store.courts || []).filter((c) => myVenueIds.has(c.venueId));

  if (myCourts.length === 0) {
    return res.status(200).json({
      status: 'ok',
      count: 0,
      pricingIntelligence: [],
    });
  }

  const venueMap = new Map(myVenues.map((v) => [v.id, v]));

  // Calculate market baselines per sport/city across the platform
  const marketMap = new Map();
  for (const c of store.courts || []) {
    if (!c.isActive) continue;
    const v = (store.venues || []).find((ven) => ven.id === c.venueId);
    const key = `${c.sport || 'General'}_${v?.city || 'General'}`.toLowerCase();
    if (!marketMap.has(key)) {
      marketMap.set(key, []);
    }
    marketMap.get(key).push(Number(c.pricePerHour || 0));
  }

  const intelligence = myCourts.map((court) => {
    const venue = venueMap.get(court.venueId);
    const basePrice = Number(court.pricePerHour || 0);

    // Bookings for this court
    const courtBookings = (store.bookings || []).filter((b) => b.courtId === court.id);
    const confirmedBookings = courtBookings.filter((b) =>
      ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(b.status)
    );

    // Peak vs Off-peak bookings distribution
    let peakBookingCount = 0;
    let offPeakBookingCount = 0;

    for (const b of confirmedBookings) {
      const startH = parse12HourTime(b.startTime);
      const endH = parse12HourTime(b.endTime);
      const classification = classifyTimeSlot(b.date, startH, endH);
      if (classification.isPeak) {
        peakBookingCount++;
      } else {
        offPeakBookingCount++;
      }
    }

    // Market baseline
    const marketKey = `${court.sport || 'General'}_${venue?.city || 'General'}`.toLowerCase();
    const marketPrices = marketMap.get(marketKey) || [basePrice];
    const marketMin = Math.min(...marketPrices);
    const marketMax = Math.max(...marketPrices);
    const marketAvg = Math.round(marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length);

    // Deterministic Smart Pricing Recommendations (Advisory Only):
    // 1. Off-peak: if offPeak bookings are low, suggest a competitive discount (~10-15% lower rounded to ₹50)
    // 2. Peak: if peak demand is high, suggest a 10-20% peak rate increase rounded to ₹50
    const suggestedOffPeak = Math.max(200, Math.round((basePrice * 0.85) / 50) * 50);
    const suggestedPeak = Math.round((basePrice * 1.15) / 50) * 50;

    let recommendationReason = '';
    if (basePrice < marketAvg) {
      recommendationReason = `Your base rate of ₹${basePrice}/hr is ₹${marketAvg - basePrice} below the ${venue?.city || 'city'} market average (₹${marketAvg}/hr). High opportunity for peak rate optimization up to ₹${suggestedPeak}/hr.`;
    } else if (basePrice > marketAvg) {
      recommendationReason = `Your rate is ₹${basePrice - marketAvg} above the market average (₹${marketAvg}/hr). Consider an off-peak rate of ₹${suggestedOffPeak}/hr to capture daytime traffic.`;
    } else {
      recommendationReason = `Your rate of ₹${basePrice}/hr is well-aligned with the market average. Recommended ₹${suggestedPeak}/hr for evening peak and ₹${suggestedOffPeak}/hr for daytime slots.`;
    }

    return {
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      venueId: court.venueId,
      venueName: venue?.name || 'Venue',
      city: venue?.city || '',
      basePricePerHour: basePrice,
      isActive: Boolean(court.isActive),
      metrics: {
        totalBookings: courtBookings.length,
        confirmedBookings: confirmedBookings.length,
        peakBookingCount,
        offPeakBookingCount,
      },
      marketContext: {
        sport: court.sport,
        city: venue?.city || '',
        marketMinPrice: marketMin,
        marketMaxPrice: marketMax,
        marketAvgPrice: marketAvg,
      },
      smartPricing: {
        currentBasePrice: basePrice,
        recommendedOffPeakPrice: suggestedOffPeak,
        recommendedPeakPrice: suggestedPeak,
        peakHoursDescription: 'Weekdays 05:00 PM - 10:00 PM, Weekends 07:00 AM - 11:00 AM & 04:00 PM - 10:00 PM',
        offPeakHoursDescription: 'Weekday Daytime 06:00 AM - 04:00 PM',
        recommendationReason,
      },
    };
  });

  return res.status(200).json({
    status: 'ok',
    count: intelligence.length,
    pricingIntelligence: intelligence,
  });
}

// ─── CUSTOMER / PUBLIC: Best Time to Play Advisory Engine (Phase 17) ──────────

/**
 * GET /api/pricing/best-times
 * Query parameters:
 *   - date (required / optional, default today YYYY-MM-DD): playing date
 *   - duration (optional, integer 1..6): continuous playing duration (default 1)
 *   - venueId (optional): filter by venue
 *   - courtId (optional): filter by court
 *   - sport (optional): filter by sport
 *   - city (optional): filter by city
 *   - indoor (optional, 'true' | 'false')
 */
export function getBestTimeToPlay(req, res) {
  const {
    date,
    duration = 1,
    venueId,
    courtId,
    sport,
    city,
    indoor,
  } = req.query;

  // 1. Date validation
  const todayStr = new Date().toISOString().slice(0, 10);
  const targetDate = date ? String(date).trim() : todayStr;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date format: date must be provided in YYYY-MM-DD format.',
    });
  }

  // Reject past dates strictly
  if (targetDate < todayStr) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date: past dates cannot be analyzed for court availability.',
    });
  }

  // 2. Duration validation
  const parsedDuration = parseInt(duration, 10);
  if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 6) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid duration: duration must be an integer between 1 and 6 hours.',
    });
  }

  const durationHours = parsedDuration;

  // 3. Filter active candidate courts
  let candidateCourts = (store.courts || []).filter((c) => Boolean(c.isActive));

  if (courtId) {
    candidateCourts = candidateCourts.filter((c) => c.id === courtId);
  }

  if (venueId) {
    candidateCourts = candidateCourts.filter((c) => c.venueId === venueId);
  }

  if (sport) {
    candidateCourts = candidateCourts.filter(
      (c) => (c.sport || '').toLowerCase() === sport.toLowerCase()
    );
  }

  if (indoor !== undefined && indoor !== '') {
    const isIndoor = indoor === 'true';
    candidateCourts = candidateCourts.filter((c) => Boolean(c.indoor) === isIndoor);
  }

  // Build venue map
  const venueMap = new Map((store.venues || []).map((v) => [v.id, v]));

  if (city) {
    candidateCourts = candidateCourts.filter((c) => {
      const v = venueMap.get(c.venueId);
      return (v?.city || '').toLowerCase() === city.toLowerCase();
    });
  }

  if (candidateCourts.length === 0) {
    return res.status(200).json({
      status: 'ok',
      date: targetDate,
      durationHours,
      totalAnalyzed: 0,
      summary: {
        bestTimesCount: 0,
        goodTimesCount: 0,
        popularTimesCount: 0,
        unavailableCount: 0,
      },
      recommendations: [],
    });
  }

  const recommendations = [];

  for (const court of candidateCourts) {
    const venue = venueMap.get(court.venueId);
    const { startHour: courtStart, endHour: courtEnd } = parseOperatingHours(court.operatingHours);

    for (let s = courtStart; s <= courtEnd - durationHours; s++) {
      const endH = s + durationHours;
      const startTimeStr = format12Hour(s);
      const endTimeStr = format12Hour(endH);

      // Check continuous slot availability
      const isAvailable = isSlotAvailableOnCourt(court, targetDate, s, endH);

      // Classify period (Peak vs Off-Peak)
      const slotClassification = classifyTimeSlot(targetDate, s, endH);
      const isPeak = Boolean(slotClassification.isPeak);

      // Determine booking demand signal from active platform reservations
      const overlappingBookings = (store.bookings || []).filter((b) => {
        if (b.courtId !== court.id || !isBookingActive(b.status)) return false;
        if (b.date !== targetDate) return false;
        const bS = parse12HourTime(b.startTime);
        const bE = parse12HourTime(b.endTime);
        if (bS === null || bE === null) return false;
        return s < bE && endH > bS;
      });

      let demandLevel = 'LOW_DEMAND';
      let demandLabel = 'Low booking activity';
      if (overlappingBookings.length === 1) {
        demandLevel = 'MODERATE_DEMAND';
        demandLabel = 'Moderate player demand';
      } else if (overlappingBookings.length >= 2) {
        demandLevel = 'HIGH_DEMAND';
        demandLabel = 'High player demand';
      }

      // Categorize and score
      let category = 'UNAVAILABLE';
      let badgeLabel = 'Unavailable';
      let score = 0;
      let reasons = [];

      if (!isAvailable) {
        category = 'UNAVAILABLE';
        badgeLabel = 'Unavailable';
        score = 0;
        reasons = ['Slot is already booked or unavailable for the requested duration'];
      } else if (!isPeak && demandLevel === 'LOW_DEMAND') {
        category = 'BEST_TIME';
        badgeLabel = 'Best Time';
        score = 95;
        reasons = [
          `Full ${durationHours}-hour continuous availability`,
          'Low court demand & quiet playing atmosphere',
          'Off-peak operating window',
        ];
      } else if (!isPeak && demandLevel === 'MODERATE_DEMAND') {
        category = 'GOOD_TIME';
        badgeLabel = 'Good Time';
        score = 85;
        reasons = [
          `Full ${durationHours}-hour continuous availability`,
          'Moderate player activity',
          'Off-peak daytime slot',
        ];
      } else if (isPeak && demandLevel === 'LOW_DEMAND') {
        category = 'GOOD_TIME';
        badgeLabel = 'Good Time';
        score = 80;
        reasons = [
          `Full ${durationHours}-hour continuous availability`,
          'Prime peak hours with open court slot',
        ];
      } else if (isPeak && demandLevel === 'MODERATE_DEMAND') {
        category = 'POPULAR_TIME';
        badgeLabel = 'Popular Time';
        score = 70;
        reasons = [
          'Prime evening hours with high player demand',
          'Limited availability remaining',
        ];
      } else {
        category = 'LIMITED_AVAILABILITY';
        badgeLabel = 'Limited Availability';
        score = 60;
        reasons = [
          'Slot currently available',
          'High booking demand on adjacent intervals',
        ];
      }

      const pricePerHour = Number(court.pricePerHour || 0);
      const totalPrice = pricePerHour * durationHours;

      recommendations.push({
        courtId: court.id,
        courtName: court.name,
        sport: court.sport,
        venueId: court.venueId,
        venueName: venue?.name || 'Venue',
        city: venue?.city || '',
        location: venue?.location || '',
        startTime: startTimeStr,
        endTime: endTimeStr,
        startHour: s,
        endHour: endH,
        durationHours,
        pricePerHour,
        totalPrice,
        isAvailable,
        isPeak,
        periodType: slotClassification.tier,
        periodLabel: slotClassification.label,
        demandLevel,
        demandLabel,
        category,
        badgeLabel,
        score,
        reasons,
      });
    }
  }

  // Sort recommendations: available first, highest score first, then earliest start hour
  recommendations.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.startHour - b.startHour;
  });

  const bestTimesCount = recommendations.filter((r) => r.category === 'BEST_TIME').length;
  const goodTimesCount = recommendations.filter((r) => r.category === 'GOOD_TIME').length;
  const popularTimesCount = recommendations.filter((r) => r.category === 'POPULAR_TIME').length;
  const unavailableCount = recommendations.filter((r) => r.category === 'UNAVAILABLE').length;

  return res.status(200).json({
    status: 'ok',
    date: targetDate,
    durationHours,
    totalAnalyzed: recommendations.length,
    summary: {
      bestTimesCount,
      goodTimesCount,
      popularTimesCount,
      unavailableCount,
    },
    recommendations,
  });
}

