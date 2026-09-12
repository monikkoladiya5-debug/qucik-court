import { store, safeVenue } from '../data/store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `v-${Date.now()}`;
}

/** Returns only active venues for the public listing */
function publicVenues() {
  return store.venues.filter((v) => v.status === 'active');
}

// ─── PUBLIC: List venues (search + filter) ────────────────────────────────────

/**
 * GET /api/venues
 * Query: ?city=Ahmedabad&sport=Badminton&search=arena&indoor=true
 * No authentication required.
 */
export function listVenues(req, res) {
  let results = publicVenues();

  const { city, sport, search, indoor } = req.query;

  if (city) {
    results = results.filter(
      (v) => v.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (sport) {
    results = results.filter((v) =>
      v.sportTypes.some((s) => s.toLowerCase() === sport.toLowerCase())
    );
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        v.location.toLowerCase().includes(term) ||
        v.city.toLowerCase().includes(term) ||
        (v.description && v.description.toLowerCase().includes(term))
    );
  }

  if (indoor !== undefined) {
    const wantIndoor = indoor === 'true';
    results = results.filter((v) => v.indoor === wantIndoor);
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
    ownerId: req.user.id, // always from JWT — never trust client
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

  // Clean up associated courts to maintain referential integrity
  store.courts = store.courts.filter((c) => c.venueId !== venue.id);

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
