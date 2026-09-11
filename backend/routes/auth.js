import { Router } from 'express';
import {
  customerSignup,
  customerLogin,
  ownerAuth,
  adminLogin,
  getMe,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// ── Public auth endpoints ──────────────────────────────────────────────────────
router.post('/signup',       customerSignup);
router.post('/login',        customerLogin);
router.post('/owner-login',  ownerAuth);
router.post('/admin-login',  adminLogin);

// ── Protected: current user ────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);

export default router;
