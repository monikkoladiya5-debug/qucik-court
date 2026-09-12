import { Router } from 'express';
import { getAdminDashboard, toggleUserStatus } from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Admin Dashboard: full platform metrics and data collections
router.get('/dashboard', getAdminDashboard);

// User Status Management: toggle between active and suspended
router.patch('/users/:id/status', toggleUserStatus);

export default router;
