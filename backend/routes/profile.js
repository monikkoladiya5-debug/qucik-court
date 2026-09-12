import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/profileController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Profile endpoints require authentication and CUSTOMER role
router.use(authenticate, requireRole('CUSTOMER'));

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);

export default router;
