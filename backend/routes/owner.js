import { Router } from 'express';
import { getOwnerDashboard } from '../controllers/ownerController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Owner Dashboard: strictly authenticated and OWNER-only
router.get('/dashboard', authenticate, requireRole('OWNER'), getOwnerDashboard);

export default router;
