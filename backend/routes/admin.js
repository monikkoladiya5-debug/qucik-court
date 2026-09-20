import { Router } from 'express';
import {
  getAdminDashboard,
  toggleUserStatus,
  getPlatformIntelligence,
  listVenueVerifications,
  updateVenueVerification,
  listCourtApprovals,
  updateCourtApproval,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Admin Dashboard: full platform metrics and data collections
router.get('/dashboard', getAdminDashboard);

// Platform Intelligence: detailed analytics, utilization, telemetry & operational health (Phase 18)
router.get('/platform-intelligence', getPlatformIntelligence);

// Venue Trust & Verification Management (Phase 19)
router.get('/venues/verification', listVenueVerifications);
router.patch('/venues/:venueId/verification', updateVenueVerification);

// Court Approval & Moderation Management
router.get('/courts/approval', listCourtApprovals);
router.patch('/courts/:courtId/approval', updateCourtApproval);

// User Status Management: toggle between active and suspended
router.patch('/users/:id/status', toggleUserStatus);

export default router;

