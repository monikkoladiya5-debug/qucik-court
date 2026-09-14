import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/auth.js';
import { store, safeVenue } from '../data/store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `v-${Date.now()}`;
}

/** Returns only active venues for the public listing */
function publicVenues() {
  return store.venues.filter((v) => v.status === 'active');
}

/**
 * Extracts authenticated user if valid Bearer JWT is present, else returns null.
 */
export function extractOptionalUser(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret);
    const user = store.users.find((u) => u.id === decoded.sub);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

/**
 * Deterministic scoring algorithm using only real available backend signals.
 */
export function scoreVenueForUser(venue, user = null, userBookings = [], preferredCity = null) {
  let score = 0;
  const tags = [];
  let primaryReason = null;

  const userPreferredSports = user?.preferredSports || [];
  const playerProfile = user ? store.players.find((p) => p.userId === user.id) : null;
  const allUserSports = new Set([
    ...userPreferredSports.map((s) => s.toLowerCase()),
    ...(playerProfile?.sport ? [playerProfile.sport.toLowerCase()] : []),
  ]);

  // Booking history sports and venueIds
  const bookedSports = new Set();
  const bookedVenueIds = new Set();
  let latestCity = preferredCity || null;

  for (const b of userBookings) {
    if (b.venueId) bookedVenueIds.add(b.venueId);
    if (b.venueCity && !latestCity) latestCity = b.venueCity;
    const court = store.courts.find((c) => c.id === b.courtId);
    if (court?.sport) bookedSports.add(court.sport.toLowerCase());
    if (b.sport) bookedSports.add(b.sport.toLowerCase());
  }

  // 1. Direct Sport Preference Match (+40 pts)
  const matchingPreferred = (venue.sportTypes || []).filter((s) => allUserSports.has(s.toLowerCase()));
  if (matchingPreferred.length > 0) {
    score += 40;
    tags.push(`Plays ${matchingPreferred.join(', ')}`);
    if (!primaryReason) {
      primaryReason = `Matches your sport preference (${matchingPreferred[0]})`;
    }
  }

  // 2. Booking History Sport Match (+25 pts)
  const matchingHistory = (venue.sportTypes || []).filter((s) => bookedSports.has(s.toLowerCase()));
  if (matchingHistory.length > 0) {
    score += 25;
    if (!tags.some((t) => t.includes(matchingHistory[0]))) {
      tags.push(`Past Sport: ${matchingHistory[0]}`);
    }
    if (!primaryReason) {
      primaryReason = `Based on your recent ${matchingHistory[0]} bookings`;
    }
  }

  // 3. Venue Familiarity / Previously Booked (+15 pts)
  if (bookedVenueIds.has(venue.id)) {
    score += 15;
    tags.push('Previously Booked');
    if (!primaryReason) {
      primaryReason = 'You have booked courts here before';
    }
  }

  // 4. City / Geographic Relevance (+20 pts)
  if (latestCity && venue.city.toLowerCase() === latestCity.toLowerCase()) {
    score += 20;
    tags.push(`In ${venue.city}`);
    if (!primaryReason && matchingPreferred.length === 0) {
      primaryReason = `Popular in ${venue.city}`;
    }
  }

  // 5. Rating & Quality Signal (+0 to +25 pts)
  const rating = Number(venue.rating || 0);
  const ratingScore = Math.min(25, (rating / 5.0) * 25);
  score += ratingScore;
  if (rating >= 4.5) {
    tags.push(`${rating} ★ Top Rated`);
    if (!primaryReason) {
      primaryReason = `${rating} ★ High Quality Facility in ${venue.city}`;
    }
  }

  // 6. Review Count / Activity (+0 to +10 pts)
  const reviews = Number(venue.reviewCount || 0);
  const reviewScore = Math.min(10, reviews / 40);
  score += reviewScore;

  // 7. Value / Competitive Hourly Rate (+0 to +10 pts)
  const price = Number(venue.pricePerHour || 0);
  if (price > 0 && price <= 450) {
    score += 10;
    tags.push('Great Value Rate');
  } else if (price > 0 && price <= 600) {
    score += 5;
  }

  // Default explanation if none assigned
  if (!primaryReason) {
    primaryReason = `${venue.rating || 4.5} ★ Verified Facility in ${venue.city}`;
  }

  return {
    score: Math.round(score * 10) / 10,
    primaryReason,
    tags: tags.slice(0, 3),
  };
}

// ─── PUBLIC: Smart Recommendations ───────────────────────────────────────────

/**
 * GET /api/venues/recommendations
 * Optional Authentication (uses JWT if present)
 * Query: ?city=&sport=&limit=
 */
export function getRecommendedVenues(req, res) {
  const user = extractOptionalUser(req);
  const userBookings = user ? (store.bookings || []).filter((b) => b.userId === user.id) : [];

  const { city, sport, limit = 4 } = req.query;
  let candidates = publicVenues();

  if (city) {
    candidates = candidates.filter((v) => v.city.toLowerCase() === city.toLowerCase());
  }
  if (sport) {
    candidates = candidates.filter((v) =>
      v.sportTypes.some((s) => s.toLowerCase() === sport.toLowerCase())
    );
  }

  const scored = candidates.map((v) => {
    const { score, primaryReason, tags } = scoreVenueForUser(v, user, userBookings, city);
    return {
      ...safeVenue(v),
      matchScore: score,
      recommendationReason: primaryReason,
      matchTags: tags,
    };
  });

  // Sort descending by matchScore
  scored.sort((a, b) => b.matchScore - a.matchScore);

  const finalLimit = Math.max(1, Math.min(20, Number(limit) || 4));
  const results = scored.slice(0, finalLimit);

  const hasPersonalSignals = Boolean(
    user && ((user.preferredSports && user.preferredSports.length > 0) || userBookings.length > 0)
  );

  return res.status(200).json({
    status: 'ok',
    count: results.length,
    personalized: hasPersonalSignals,
    recommendations: results,
  });
}

/**
 * Natural language / Smart Search parser for QuickCourt discovery.
 * Extracts: sport, city, indoor/outdoor, minPrice, maxPrice, and residual keywords.
 */
export function parseSmartSearchQuery(rawQuery, knownCities = [], knownSports = []) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      rawQuery: '',
      extractedSport: null,
      extractedCity: null,
      extractedIndoor: null,
      extractedMinPrice: null,
      extractedMaxPrice: null,
      keywords: [],
    };
  }

  let text = rawQuery.trim().toLowerCase();

  let extractedSport = null;
  let extractedCity = null;
  let extractedIndoor = null;
  let extractedMinPrice = null;
  let extractedMaxPrice = null;

  // 1. Price extraction
  const underMatch = text.match(/(?:under|below|less\s+than|cheaper\s+than|<=\s*|<\s*)\s*₹?\s*(\d+)/i);
  if (underMatch) {
    extractedMaxPrice = Number(underMatch[1]);
    text = text.replace(underMatch[0], ' ');
  }

  const aboveMatch = text.match(/(?:above|over|more\s+than|>=\s*|>\s*)\s*₹?\s*(\d+)/i);
  if (aboveMatch) {
    extractedMinPrice = Number(aboveMatch[1]);
    text = text.replace(aboveMatch[0], ' ');
  }

  const rangeMatch = text.match(/₹?\s*(\d+)\s*(?:-|to)\s*₹?\s*(\d+)/i);
  if (rangeMatch) {
    extractedMinPrice = Number(rangeMatch[1]);
    extractedMaxPrice = Number(rangeMatch[2]);
    text = text.replace(rangeMatch[0], ' ');
  }

  const priceTagMatch = text.match(/(?:₹\s*(\d+)|(\d+)\s*(?:rs|rupees|inr))/i);
  if (priceTagMatch && extractedMaxPrice === null) {
    const val = Number(priceTagMatch[1] || priceTagMatch[2]);
    extractedMaxPrice = val;
    text = text.replace(priceTagMatch[0], ' ');
  }

  // 2. Indoor / Outdoor extraction
  if (/\b(?:indoor|ac|air\s*conditioned|covered)\b/i.test(text)) {
    extractedIndoor = true;
    text = text.replace(/\b(?:indoor|ac|air\s*conditioned|covered)\b/gi, ' ');
  } else if (/\b(?:outdoor|open\s*air|floodlit|floodlights)\b/i.test(text)) {
    extractedIndoor = false;
    text = text.replace(/\b(?:outdoor|open\s*air|floodlit|floodlights)\b/gi, ' ');
  }

  // 3. Sport extraction
  const defaultSports = ['Badminton', 'Tennis', 'Pickleball', 'Football', 'Basketball', 'Squash', 'Cricket', 'Table Tennis'];
  const sportList = [...new Set([...knownSports, ...defaultSports])];

  for (const sport of sportList) {
    const regex = new RegExp(`\\b${sport.toLowerCase()}\\b`, 'i');
    if (regex.test(text)) {
      extractedSport = sport;
      text = text.replace(regex, ' ');
      break;
    }
  }

  // 4. City extraction
  const defaultCities = ['Ahmedabad', 'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata'];
  const cityList = [...new Set([...knownCities, ...defaultCities])];

  for (const city of cityList) {
    const regex = new RegExp(`\\b${city.toLowerCase()}\\b`, 'i');
    if (regex.test(text)) {
      extractedCity = city;
      text = text.replace(regex, ' ');
      break;
    }
  }

  // 5. Clean stop words / noise words
  const stopWords = new Set([
    'in', 'at', 'near', 'around', 'by', 'for', 'with', 'and', 'the', 'a', 'an',
    'to', 'of', 'on', 'courts', 'court', 'turfs', 'turf', 'grounds', 'ground',
    'arenas', 'arena', 'clubs', 'club', 'hub', 'facility', 'facilities',
    'places', 'place', 'under', 'below', 'above', 'over', 'price', 'pricing',
    'per', 'hour', 'hr', 'rs', 'rupees', 'inr', 'sports', 'sport', 'play',
    'playing', 'book', 'booking', 'find', 'looking', 'best', 'top', 'near me',
    'available', 'good'
  ]);

  const rawTokens = text.split(/[\s,+/|#-]+/).map((t) => t.trim()).filter(Boolean);
  const keywords = rawTokens.filter((token) => !stopWords.has(token) && token.length > 1);

  return {
    rawQuery,
    extractedSport,
    extractedCity,
    extractedIndoor,
    extractedMinPrice,
    extractedMaxPrice,
    keywords,
  };
}

// ─── PUBLIC: List venues (Smart Search + Structured Filters) ──────────────────

/**
 * GET /api/venues
 * Query params: ?city=&sport=&search=&q=&indoor=&maxPrice=&minPrice=&sortBy=
 * No authentication required.
 */
export function listVenues(req, res) {
  let results = publicVenues();

  const { city, sport, search, q, indoor, maxPrice, minPrice, sortBy } = req.query;
  const searchQuery = (search || q || '').trim();

  const allCities = [...new Set(results.map((v) => v.city))];
  const allSports = [...new Set(results.flatMap((v) => v.sportTypes))];

  // Parse Smart Search from search / q
  const smart = parseSmartSearchQuery(searchQuery, allCities, allSports);

  // 1. City filter: explicit query param takes priority, else extracted
  const effectiveCity = city || smart.extractedCity;
  if (effectiveCity) {
    results = results.filter(
      (v) => v.city.toLowerCase() === effectiveCity.toLowerCase()
    );
  }

  // 2. Sport filter: explicit query param takes priority, else extracted
  const effectiveSport = sport || smart.extractedSport;
  if (effectiveSport) {
    results = results.filter((v) =>
      v.sportTypes.some((s) => s.toLowerCase() === effectiveSport.toLowerCase())
    );
  }

  // 3. Indoor/Outdoor filter: explicit query param takes priority, else extracted
  let effectiveIndoor = undefined;
  if (indoor !== undefined && indoor !== '') {
    effectiveIndoor = indoor === 'true' || indoor === true;
  } else if (smart.extractedIndoor !== null) {
    effectiveIndoor = smart.extractedIndoor;
  }

  if (effectiveIndoor !== undefined) {
    results = results.filter((v) => v.indoor === effectiveIndoor);
  }

  // 4. Price filters
  const effectiveMaxPrice = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : smart.extractedMaxPrice;
  if (effectiveMaxPrice !== null && !isNaN(effectiveMaxPrice)) {
    results = results.filter((v) => Number(v.pricePerHour) <= effectiveMaxPrice);
  }

  const effectiveMinPrice = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : smart.extractedMinPrice;
  if (effectiveMinPrice !== null && !isNaN(effectiveMinPrice)) {
    results = results.filter((v) => Number(v.pricePerHour) >= effectiveMinPrice);
  }

  // 5. Residual text keywords matching
  if (smart.keywords.length > 0) {
    results = results.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const location = (v.location || '').toLowerCase();
      const address = (v.address || '').toLowerCase();
      const description = (v.description || '').toLowerCase();
      const sports = (v.sportTypes || []).map((s) => s.toLowerCase()).join(' ');
      const amenities = (v.amenities || []).map((a) => a.toLowerCase()).join(' ');
      const searchableText = `${name} ${location} ${address} ${description} ${sports} ${amenities}`;

      // Every keyword must match somewhere in the venue's searchable text
      return smart.keywords.every((kw) => searchableText.includes(kw));
    });
  } else if (searchQuery && !smart.extractedCity && !smart.extractedSport && smart.extractedIndoor === null && smart.extractedMaxPrice === null && smart.extractedMinPrice === null) {
    // Fallback: If no smart tokens were extracted, do standard broad substring matching
    const term = searchQuery.toLowerCase();
    results = results.filter((v) =>
      v.name.toLowerCase().includes(term) ||
      v.location.toLowerCase().includes(term) ||
      v.city.toLowerCase().includes(term) ||
      (v.description && v.description.toLowerCase().includes(term))
    );
  }

  // 6. Optional Sorting
  if (sortBy === 'price_asc') {
    results.sort((a, b) => Number(a.pricePerHour) - Number(b.pricePerHour));
  } else if (sortBy === 'price_desc') {
    results.sort((a, b) => Number(b.pricePerHour) - Number(a.pricePerHour));
  } else if (sortBy === 'rating_desc') {
    results.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  } else if (sortBy === 'courts_desc') {
    results.sort((a, b) => Number(b.courtCount || 0) - Number(a.courtCount || 0));
  }

  return res.status(200).json({
    status: 'ok',
    count: results.length,
    venues: results.map(safeVenue),
  });
}

// ─── PUBLIC: Get venue detail ─────────────────────────────────────────────────

/**
 * GET /api/venues/:id
 * No authentication required.
 */
export function getVenue(req, res) {
  const venue = store.venues.find(
    (v) => v.id === req.params.id && v.status === 'active'
  );

  if (!venue) {
    return res.status(404).json({ status: 'error', message: 'Venue not found.' });
  }

  return res.status(200).json({ status: 'ok', venue: safeVenue(venue) });
}

// ─── PUBLIC: List distinct cities ────────────────────────────────────────────

/**
 * GET /api/venues/meta/cities
 */
export function listCities(req, res) {
  const cities = [...new Set(publicVenues().map((v) => v.city))].sort();
  return res.status(200).json({ status: 'ok', cities });
}

// ─── PUBLIC: List distinct sports ────────────────────────────────────────────

/**
 * GET /api/venues/meta/sports
 */
export function listSports(req, res) {
  const all = publicVenues().flatMap((v) => v.sportTypes);
  const sports = [...new Set(all)].sort();
  return res.status(200).json({ status: 'ok', sports });
}

// ─── OWNER: List my venues ────────────────────────────────────────────────────

/**
 * GET /api/venues/my/venues
 * Requires: authenticate + requireRole('OWNER')
 */
export function listMyVenues(req, res) {
  const myVenues = store.venues.filter((v) => v.ownerId === req.user.id);
  return res.status(200).json({
    status: 'ok',
    count: myVenues.length,
    venues: myVenues.map(safeVenue),
  });
}

// ─── OWNER: Create venue ──────────────────────────────────────────────────────

/**
 * POST /api/venues
 * Requires: authenticate + requireRole('OWNER')
 * Body: { name, description, address, city, location, sportTypes, pricePerHour,
 *         courtCount, indoor, amenities, openingHours, imageUrl }
 */
export function createVenue(req, res) {
  const {
    name, description, address, city, location,
    sportTypes, pricePerHour, courtCount,
    indoor, amenities, openingHours, imageUrl,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Venue name is required.' });
  }
  if (!city?.trim()) {
    return res.status(400).json({ status: 'error', message: 'City is required.' });
  }
  if (!Array.isArray(sportTypes) || sportTypes.length === 0) {
    return res.status(400).json({ status: 'error', message: 'At least one sport type is required.' });
  }

  const newVenue = {
    id: generateId(),
    name: name.trim(),
    description: description?.trim() || '',
    address: address?.trim() || '',
    location: location?.trim() || `${city.trim()}, India`,
    city: city.trim(),
    sportTypes,
    pricePerHour: Number(pricePerHour) || 0,
    courtCount: Number(courtCount) || 1,
    indoor: Boolean(indoor),
    amenities: Array.isArray(amenities) ? amenities : [],
    openingHours: openingHours?.trim() || '06:00 AM - 10:00 PM',
    imageUrl: imageUrl?.trim() || 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=800&q=80',
    rating: 0,
    reviewCount: 0,
    status: 'active',
    ownerId: req.user.id,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  store.venues.push(newVenue);

  return res.status(201).json({ status: 'ok', venue: safeVenue(newVenue) });
}

// ─── OWNER: Update own venue ──────────────────────────────────────────────────

/**
 * PUT /api/venues/:id
 * Requires: authenticate + requireRole('OWNER')
 * Owner may only update their own venue.
 */
export function updateVenue(req, res) {
  const venue = store.venues.find((v) => v.id === req.params.id);

  if (!venue) {
    return res.status(404).json({ status: 'error', message: 'Venue not found.' });
  }

  // Ownership check — cannot modify another owner's venue
  if (venue.ownerId !== req.user.id) {
    return res.status(403).json({ status: 'error', message: 'You are not authorized to modify this venue.' });
  }

  const allowed = [
    'name', 'description', 'address', 'location', 'city',
    'sportTypes', 'pricePerHour', 'courtCount', 'indoor',
    'amenities', 'openingHours', 'imageUrl',
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      venue[key] = req.body[key];
    }
  });

  return res.status(200).json({ status: 'ok', venue: safeVenue(venue) });
}

// ─── OWNER: Delete own venue ──────────────────────────────────────────────────

/**
 * DELETE /api/venues/:id
 * Requires: authenticate + requireRole('OWNER')
 * Owner may only delete their own venue.
 */
export function deleteVenue(req, res) {
  const idx = store.venues.findIndex((v) => v.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Venue not found.' });
  }

  const venue = store.venues[idx];

  if (venue.ownerId !== req.user.id) {
    return res.status(403).json({ status: 'error', message: 'You are not authorized to delete this venue.' });
  }

  store.venues.splice(idx, 1);

  // Clean up associated courts and bookings to maintain referential integrity
  store.courts = store.courts.filter((c) => c.venueId !== venue.id);
  store.bookings = store.bookings.filter((b) => b.venueId !== venue.id);

  return res.status(200).json({ status: 'ok', message: 'Venue deleted.' });
}

// ─── ADMIN: List all venues (including inactive) ──────────────────────────────

/**
 * GET /api/venues/admin/all
 * Requires: authenticate + requireRole('ADMIN')
 */
export function adminListAllVenues(req, res) {
  return res.status(200).json({
    status: 'ok',
    count: store.venues.length,
    venues: store.venues.map(safeVenue),
  });
}
