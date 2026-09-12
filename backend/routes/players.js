import { Router } from 'express';
import {
  listPlayers,
  getPlayer,
  getMyProfile,
  updateMyProfile,
} from '../controllers/playerController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// All player endpoints are CUSTOMER-only and require authentication
router.use(authenticate, requireRole('CUSTOMER'));

// ── Static routes must precede dynamic /:id ───────────────────────────────────

// Customer: get own player discovery profile
router.get('/me/profile', getMyProfile);

// Customer: update own player discovery profile
router.put('/me/profile', updateMyProfile);

// Customer: list and discover players (?sport=&skillLevel=&preferredTime=&availabilityStatus=&q=)
router.get('/', listPlayers);

// Customer: get specific player public profile
router.get('/:id', getPlayer);

export default router;
