/**
 * requireRole — role-based authorization middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, requireRole('ADMIN'), handler)
 *   router.get('/owner-only', authenticate, requireRole('OWNER'), handler)
 *   router.get('/multi',      authenticate, requireRole('ADMIN', 'OWNER'), handler)
 *
 * Must run AFTER `authenticate` (which sets req.user).
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Shouldn't happen if authenticate ran first, but guard anyway
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }

    next();
  };
}
