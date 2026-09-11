import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

/**
 * These minimal endpoints exist solely to verify the RBAC middleware chain.
 * They do not expose real business data.
 *
 * GET /api/rbac/customer-only  → CUSTOMER only
 * GET /api/rbac/owner-only     → OWNER only
 * GET /api/rbac/admin-only     → ADMIN only
 * GET /api/rbac/owner-or-admin → OWNER or ADMIN
 */

router.get(
  '/customer-only',
  authenticate,
  requireRole('CUSTOMER'),
  (req, res) => res.json({ status: 'ok', message: `Hello Customer, ${req.user.name}` })
);

router.get(
  '/owner-only',
  authenticate,
  requireRole('OWNER'),
  (req, res) => res.json({ status: 'ok', message: `Hello Owner, ${req.user.name}` })
);

router.get(
  '/admin-only',
  authenticate,
  requireRole('ADMIN'),
  (req, res) => res.json({ status: 'ok', message: `Hello Admin, ${req.user.name}` })
);

router.get(
  '/owner-or-admin',
  authenticate,
  requireRole('OWNER', 'ADMIN'),
  (req, res) => res.json({ status: 'ok', message: `Hello ${req.user.role}, ${req.user.name}` })
);

export default router;
