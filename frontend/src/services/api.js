const API_BASE = '/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  try {
    const raw = localStorage.getItem('qc_auth');
    if (!raw) return null;
    return JSON.parse(raw)?.token ?? null;
  } catch {
    return null;
  }
}

async function apiRequest(method, path, body = null, requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function fetchHealth() {
  try {
    return await apiRequest('GET', '/health');
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchSummary() {
  try {
    return await apiRequest('GET', '/summary');
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Returns { status, token, user }
 */
export async function signupCustomer({ name, email, password }) {
  return apiRequest('POST', '/auth/signup', { name, email, password });
}

/**
 * POST /api/auth/login
 * Returns { status, token, user }
 */
export async function loginCustomer({ email, password }) {
  return apiRequest('POST', '/auth/login', { email, password });
}

/**
 * POST /api/auth/owner-login
 * Returns { status, token, user }
 */
export async function loginOwner({ email, password, name, businessName, venueLocation }) {
  return apiRequest('POST', '/auth/owner-login', { email, password, name, businessName, venueLocation });
}

/**
 * POST /api/auth/admin-login
 * Returns { status, token, user }
 */
export async function loginAdmin({ email, password, verificationCode }) {
  return apiRequest('POST', '/auth/admin-login', { email, password, verificationCode });
}

/**
 * GET /api/auth/me
 * Returns { status, user }
 */
export async function fetchMe() {
  return apiRequest('GET', '/auth/me', null, true);
}

// ─── Venues ───────────────────────────────────────────────────────────────────

/**
 * GET /api/venues?city=&sport=&search=&indoor=
 * Returns { status, count, venues }
 */
export async function fetchVenues(filters = {}) {
  const params = new URLSearchParams();
  if (filters.city)   params.set('city',   filters.city);
  if (filters.sport)  params.set('sport',  filters.sport);
  if (filters.search) params.set('search', filters.search);
  if (filters.indoor !== undefined) params.set('indoor', String(filters.indoor));
  const qs = params.toString();
  return apiRequest('GET', `/venues${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/venues/:id
 * Returns { status, venue }
 */
export async function fetchVenue(id) {
  return apiRequest('GET', `/venues/${id}`);
}

/**
 * GET /api/venues/meta/cities  →  { cities }
 * GET /api/venues/meta/sports  →  { sports }
 */
export async function fetchVenueMeta() {
  const [cities, sports] = await Promise.all([
    apiRequest('GET', '/venues/meta/cities'),
    apiRequest('GET', '/venues/meta/sports'),
  ]);
  return { cities: cities.cities, sports: sports.sports };
}

/**
 * GET /api/venues/my/venues  (OWNER)
 */
export async function fetchMyVenues() {
  return apiRequest('GET', '/venues/my/venues', null, true);
}

/**
 * POST /api/venues  (OWNER)
 */
export async function createVenue(data) {
  return apiRequest('POST', '/venues', data, true);
}

/**
 * PUT /api/venues/:id  (OWNER)
 */
export async function updateVenue(id, data) {
  return apiRequest('PUT', `/venues/${id}`, data, true);
}

/**
 * DELETE /api/venues/:id  (OWNER)
 */
export async function deleteVenue(id) {
  return apiRequest('DELETE', `/venues/${id}`, null, true);
}

// ─── Courts ───────────────────────────────────────────────────────────────────

/**
 * GET /api/courts?venueId=&sport=&isActive=
 * Returns { status, count, courts }
 */
export async function fetchCourts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.venueId) params.set('venueId', filters.venueId);
  if (filters.sport)   params.set('sport', filters.sport);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString();
  return apiRequest('GET', `/courts${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/courts/:id
 * Returns { status, court }
 */
export async function fetchCourt(id) {
  return apiRequest('GET', `/courts/${id}`);
}

/**
 * GET /api/courts/my/courts  (OWNER)
 * Returns { status, count, courts }
 */
export async function fetchMyCourts() {
  return apiRequest('GET', '/courts/my/courts', null, true);
}

/**
 * POST /api/venues/:venueId/courts  (OWNER)
 * Returns { status, court }
 */
export async function createCourt(venueId, data) {
  return apiRequest('POST', `/venues/${venueId}/courts`, data, true);
}

/**
 * PUT /api/courts/:id  (OWNER)
 * Returns { status, court }
 */
export async function updateCourt(id, data) {
  return apiRequest('PUT', `/courts/${id}`, data, true);
}

/**
 * DELETE /api/courts/:id  (OWNER)
 * Returns { status, message }
 */
export async function deleteCourt(id) {
  return apiRequest('DELETE', `/courts/${id}`, null, true);
}

/**
 * GET /api/courts/:id/availability?date=YYYY-MM-DD
 * Returns { status, courtId, courtName, sport, date, operatingHours, slots }
 */
export async function fetchCourtAvailability(courtId, date) {
  return apiRequest('GET', `/courts/${courtId}/availability?date=${encodeURIComponent(date)}`);
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

/**
 * POST /api/bookings  (CUSTOMER)
 * Body: { courtId, date, startTime, endTime }
 * Returns { status, booking }
 */
export async function createBooking(data) {
  return apiRequest('POST', '/bookings', data, true);
}

/**
 * GET /api/bookings/my  (CUSTOMER)
 * Returns { status, count, bookings }
 */
export async function fetchMyBookings() {
  return apiRequest('GET', '/bookings/my', null, true);
}

/**
 * GET /api/bookings/:id
 * Returns { status, booking }
 */
export async function fetchBooking(id) {
  return apiRequest('GET', `/bookings/${id}`, null, true);
}

/**
 * DELETE /api/bookings/:id  (CUSTOMER)
 * Returns { status, message, booking }
 */
export async function cancelBooking(id) {
  return apiRequest('DELETE', `/bookings/${id}`, null, true);
}


