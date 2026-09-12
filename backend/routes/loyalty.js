import { Router } from 'express';
import { getMyLoyalty } from '../controllers/loyaltyController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Loyalty endpoints require authentication and CUSTOMER role
router.use(authenticate, requireRole('CUSTOMER'));

router.get('/me', getMyLoyalty);

export default router;
