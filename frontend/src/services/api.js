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
