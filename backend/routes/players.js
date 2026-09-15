import { Router } from 'express';
import {
  listPlayers,
  getPlayer,
  getMyProfile,
  updateMyProfile,
  sendMatchInvite,
  getMyInvites,
  respondToInvite,
  getPlayerTrust,
  reportPlayer,
  blockPlayer,
  unblockPlayer,
  getMyBlocks,
  getMyGamification,
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

// Customer: get personal gamification and achievements summary (Phase 21)
router.get('/me/gamification', getMyGamification);

// Customer: get sent and received match invites
router.get('/me/invites', getMyInvites);

// Customer: get list of blocked players
router.get('/me/blocks', getMyBlocks);

// Customer: update match invite status (ACCEPTED, DECLINED, CANCELLED)
router.patch('/invites/:id/status', respondToInvite);

// Customer: list and discover players with matchmaking and trust algorithm
router.get('/', listPlayers);

// Customer: get player trust summary
router.get('/:id/trust', getPlayerTrust);

// Customer: report player for safety violation
router.post('/:id/report', reportPlayer);

// Customer: block a player
router.post('/:id/block', blockPlayer);

// Customer: unblock a player
router.delete('/:id/block', unblockPlayer);
router.post('/:id/unblock', unblockPlayer);

// Customer: send a match invite to a player
router.post('/:id/invite', sendMatchInvite);

// Customer: get specific player public profile
router.get('/:id', getPlayer);

export default router;
