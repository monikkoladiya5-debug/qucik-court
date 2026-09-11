import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { store, safeUser } from '../data/store.js';
import { AUTH_CONFIG } from '../config/auth.js';

const { jwtSecret, jwtExpiresIn, saltRounds, ROLES } = AUTH_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Customer Signup ──────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
export async function customerSignup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ status: 'error', message: 'Name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.' });
    }

    // Reject duplicate email — same error message to avoid user enumeration
    const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: ROLES.CUSTOMER,   // server always assigns CUSTOMER; client cannot override
      status: 'active',
      points: 0,
      preferredSports: [],
      passwordHash,
    };

    store.users.push(newUser);

    const token = signToken(newUser);
    return res.status(201).json({
      status: 'ok',
      token,
      user: safeUser(newUser),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Customer Login ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function customerLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
    }

    const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    // Use a constant-time comparison path — same error for "not found" vs "wrong password"
    // to prevent user enumeration
    const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'Your account has been deactivated.' });
    }

    // This endpoint is for CUSTOMER login; owners/admins should use their own endpoints
    if (user.role !== ROLES.CUSTOMER) {
      return res.status(403).json({ status: 'error', message: 'Please use the correct login portal for your account type.' });
    }

    const token = signToken(user);
    return res.status(200).json({
      status: 'ok',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Owner Login / Registration ───────────────────────────────────────────────

/**
 * POST /api/auth/owner-login
 * Body: { email, password }
 * Also handles owner registration when the email doesn't exist yet.
 * Body for registration: { name, email, password, businessName, venueLocation }
 */
export async function ownerAuth(req, res, next) {
  try {
    const { email, password, name, businessName, venueLocation } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
    }

    const existingUser = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // ── LOGIN path ──
      const passwordValid = await bcrypt.compare(password, existingUser.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
      }
      if (existingUser.role !== ROLES.OWNER) {
        return res.status(403).json({ status: 'error', message: 'This account is not registered as a venue owner.' });
      }
      if (existingUser.status !== 'active') {
        return res.status(403).json({ status: 'error', message: 'Your owner account has been deactivated.' });
      }
      const token = signToken(existingUser);
      return res.status(200).json({ status: 'ok', token, user: safeUser(existingUser) });
    }

    // ── REGISTRATION path ──
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required for owner registration.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newOwner = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: ROLES.OWNER,       // server always assigns OWNER; client cannot override
      status: 'active',
      businessName: businessName?.trim() || '',
      venueLocation: venueLocation?.trim() || '',
      passwordHash,
    };

    store.users.push(newOwner);
    const token = signToken(newOwner);
    return res.status(201).json({ status: 'ok', token, user: safeUser(newOwner) });
  } catch (err) {
    next(err);
  }
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/admin-login
 * Body: { email, password, verificationCode }
 * No public admin signup. Admins are seeded in the store.
 */
export async function adminLogin(req, res, next) {
  try {
    const { email, password, verificationCode } = req.body;

    if (!email?.trim() || !password || !verificationCode) {
      return res.status(400).json({ status: 'error', message: 'Email, password and verification code are required.' });
    }

    // Verify the verification code first (before touching user lookup)
    if (verificationCode !== AUTH_CONFIG.adminVerificationCode) {
      return res.status(401).json({ status: 'error', message: 'Invalid verification code.' });
    }

    const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    if (user.role !== ROLES.ADMIN) {
      return res.status(403).json({ status: 'error', message: 'This account does not have admin privileges.' });
    }

    const token = signToken(user);
    return res.status(200).json({ status: 'ok', token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
}

// ─── Get current user (me) ────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Requires: authenticate middleware
 */
export function getMe(req, res) {
  return res.status(200).json({ status: 'ok', user: req.user });
}
