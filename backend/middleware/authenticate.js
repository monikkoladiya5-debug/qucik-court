import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/auth.js';
import { store } from '../data/store.js';

/**
 * authenticate — verifies the Bearer JWT on every protected request.
 * Attaches `req.user` (safe user object) on success.
 * Returns 401 if no/invalid/expired token.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret);

    // Verify user still exists in store (handles deleted/deactivated accounts)
    const user = store.users.find((u) => u.id === decoded.sub);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found. Please log in again.' });
    }

    // Active session revocation for suspended accounts
    if (user.status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'Account is suspended. Please contact support.' });
    }

    // Attach safe user to request — never attach passwordHash downstream
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ status: 'error', message: 'Invalid authentication token.' });
  }
}
