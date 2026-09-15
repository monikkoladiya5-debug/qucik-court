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
  if (filters.city) params.set('city', filters.city);
  if (filters.sport) params.set('sport', filters.sport);
  if (filters.search || filters.q) params.set('search', filters.search || filters.q);
  if (filters.indoor !== undefined && filters.indoor !== '' && filters.indoor !== null) {
    params.set('indoor', String(filters.indoor));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== '' && filters.maxPrice !== null) {
    params.set('maxPrice', String(filters.maxPrice));
  }
  if (filters.minPrice !== undefined && filters.minPrice !== '' && filters.minPrice !== null) {
    params.set('minPrice', String(filters.minPrice));
  }
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  const qs = params.toString();
  return apiRequest('GET', `/venues${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/venues/recommendations?city=&sport=&limit=
 * Returns { status, count, personalized, recommendations }
 */
export async function fetchRecommendedVenues(params = {}) {
  const qp = new URLSearchParams();
  if (params.city) qp.set('city', params.city);
  if (params.sport) qp.set('sport', params.sport);
  if (params.limit) qp.set('limit', String(params.limit));
  const qs = qp.toString();
  return apiRequest('GET', `/venues/recommendations${qs ? `?${qs}` : ''}`, null, true);
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
 * POST /api/bookings/:id/cancel  (CUSTOMER)
 * Body: { reason?: string, note?: string }
 * Returns { status, message, booking }
 */
export async function cancelBooking(id, data = {}) {
  return apiRequest('POST', `/bookings/${id}/cancel`, data, true);
}

/**
 * POST /api/bookings/:id/reschedule  (CUSTOMER)
 * Body: { date, startTime, endTime, courtId? }
 * Returns { status, message, booking }
 */
export async function rescheduleBooking(id, data) {
  return apiRequest('POST', `/bookings/${id}/reschedule`, data, true);
}

/**
 * POST /api/bookings/:id/pay  (CUSTOMER / ADMIN)
 * Body: { paymentMethod: 'UPI' | 'Card' | 'Pay at Venue' }
 * Returns { status, message, booking }
 */
export async function payBooking(id, data = {}) {
  return apiRequest('POST', `/bookings/${id}/pay`, data, true);
}

/**
 * POST /api/bookings/:id/approve  (OWNER / ADMIN)
 * Returns { status, message, booking }
 */
export async function approveBooking(id) {
  return apiRequest('POST', `/bookings/${id}/approve`, null, true);
}

/**
 * POST /api/bookings/:id/reject  (OWNER / ADMIN)
 * Returns { status, message, booking }
 */
export async function rejectBooking(id) {
  return apiRequest('POST', `/bookings/${id}/reject`, null, true);
}

/**
 * POST /api/bookings/verify  (OWNER / ADMIN)
 * Body: { token?: string, qrData?: string }
 * Returns { status, message, booking }
 */
export async function verifyBookingPass(tokenOrQr) {
  return apiRequest('POST', '/bookings/verify', { token: tokenOrQr, qrData: tokenOrQr }, true);
}

/**
 * POST /api/bookings/:id/check-in  (OWNER / ADMIN)
 * Returns { status, message, booking }
 */
export async function checkInPlayerBooking(id) {
  return apiRequest('POST', `/bookings/${id}/check-in`, null, true);
}

/**
 * PATCH /api/bookings/:id/status
 * Body: { status?: string, paymentStatus?: string, paymentMethod?: string }
 * Returns { status, message, booking }
 */
export async function updateBookingStatus(id, data) {
  return apiRequest('PATCH', `/bookings/${id}/status`, data, true);
}

// ─── Players (Task 5) ─────────────────────────────────────────────────────────

/**
 * GET /api/players?sport=&city=&date=&time=&skillLevel=&preferredTime=&availabilityStatus=&excludeSelf=&q= (CUSTOMER)
 * Returns { status, count, players }
 */
export async function fetchPlayers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.sport) params.set('sport', filters.sport);
  if (filters.city) params.set('city', filters.city);
  if (filters.date) params.set('date', filters.date);
  if (filters.time) params.set('time', filters.time);
  if (filters.timeSlot) params.set('timeSlot', filters.timeSlot);
  if (filters.skillLevel) params.set('skillLevel', filters.skillLevel);
  if (filters.preferredTime) params.set('preferredTime', filters.preferredTime);
  if (filters.availabilityStatus) params.set('availabilityStatus', filters.availabilityStatus);
  if (filters.excludeSelf) params.set('excludeSelf', filters.excludeSelf);
  if (filters.q) params.set('q', filters.q);
  const qs = params.toString();
  return apiRequest('GET', `/players${qs ? `?${qs}` : ''}`, null, true);
}

/**
 * GET /api/players/:id (CUSTOMER)
 * Returns { status, player }
 */
export async function fetchPlayer(id) {
  return apiRequest('GET', `/players/${id}`, null, true);
}

/**
 * GET /api/players/me/profile (CUSTOMER)
 * Returns { status, player }
 */
export async function fetchMyPlayerProfile() {
  return apiRequest('GET', '/players/me/profile', null, true);
}

/**
 * PUT /api/players/me/profile (CUSTOMER)
 * Body: { sport, skillLevel, city, preferredDays, preferredTime, availabilityStatus, bio }
 * Returns { status, message, player }
 */
export async function updateMyPlayerProfile(data) {
  return apiRequest('PUT', '/players/me/profile', data, true);
}

/**
 * POST /api/players/:id/invite (CUSTOMER)
 * Body: { sport, date, time, courtVenue, note }
 * Returns { status, message, invite }
 */
export async function sendMatchInvite(playerId, data) {
  return apiRequest('POST', `/players/${playerId}/invite`, data, true);
}

/**
 * GET /api/players/me/invites (CUSTOMER)
 * Returns { status, sent, received }
 */
export async function fetchMyMatchInvites() {
  return apiRequest('GET', '/players/me/invites', null, true);
}

/**
 * PATCH /api/players/invites/:id/status (CUSTOMER)
 * Body: { status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED' }
 * Returns { status, message, invite }
 */
export async function respondToMatchInvite(inviteId, status) {
  return apiRequest('PATCH', `/players/invites/${inviteId}/status`, { status }, true);
}

/**
 * GET /api/players/:id/trust (CUSTOMER)
 * Returns { status, trustSummary }
 */
export async function fetchPlayerTrust(playerId) {
  return apiRequest('GET', `/players/${playerId}/trust`, null, true);
}

/**
 * POST /api/players/:id/report (CUSTOMER)
 * Body: { reason, details }
 * Returns { status, message, reportId }
 */
export async function reportPlayer(playerId, data) {
  return apiRequest('POST', `/players/${playerId}/report`, data, true);
}

/**
 * POST /api/players/:id/block (CUSTOMER)
 * Returns { status, message, block }
 */
export async function blockPlayer(playerId) {
  return apiRequest('POST', `/players/${playerId}/block`, null, true);
}

/**
 * DELETE /api/players/:id/block (CUSTOMER)
 * Returns { status, message }
 */
export async function unblockPlayer(playerId) {
  return apiRequest('DELETE', `/players/${playerId}/block`, null, true);
}

/**
 * GET /api/players/me/blocks (CUSTOMER)
 * Returns { status, count, blocks }
 */
export async function fetchMyBlocks() {
  return apiRequest('GET', '/players/me/blocks', null, true);
}

// ─── Profile & Loyalty (Task 6) ───────────────────────────────────────────────

/**
 * GET /api/profile/me (CUSTOMER)
 * Returns { status, profile }
 */
export async function fetchMyProfile() {
  return apiRequest('GET', '/profile/me', null, true);
}

/**
 * PUT /api/profile/me (CUSTOMER)
 * Body: { name, phone, preferredSports, avatar }
 * Returns { status, message, profile }
 */
export async function updateMyProfile(data) {
  return apiRequest('PUT', '/profile/me', data, true);
}

/**
 * GET /api/loyalty/me (CUSTOMER)
 * Returns { status, loyalty: { totalPoints, pointsPerBooking, eligibleBookingsCount, upcomingBookingsCount, completedBookingRewards } }
 */
export async function fetchMyLoyalty() {
  return apiRequest('GET', '/loyalty/me', null, true);
}

// ─── Owner Dashboard (Task 7) ─────────────────────────────────────────────────

/**
 * GET /api/owner/dashboard (OWNER)
 * Returns { status, summary, venues, recentBookings }
 */
export async function fetchOwnerDashboard() {
  return apiRequest('GET', '/owner/dashboard', null, true);
}

// ─── Admin Dashboard (Task 8) ─────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard (ADMIN)
 * Returns { status, summary, users, venues, bookings, pendingVenues }
 */
export async function fetchAdminDashboard() {
  return apiRequest('GET', '/admin/dashboard', null, true);
}

/**
 * PATCH /api/admin/users/:id/status (ADMIN)
 * Body: { status: 'active' | 'suspended' }
 * Returns { status, message, user }
 */
export async function toggleUserStatusApi(userId, status) {
  return apiRequest('PATCH', `/admin/users/${userId}/status`, { status }, true);
}



