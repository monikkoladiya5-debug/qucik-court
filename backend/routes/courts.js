import { Router } from 'express';
import {
  listCourts,
  getCourt,
  listMyCourts,
  updateCourt,
  deleteCourt,
  getCourtAvailability,
} from '../controllers/courtController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// ── Static routes must precede dynamic /:id parameter ─────────────────────────

// Owner: list courts belonging to venues owned by authenticated owner
router.get('/my/courts',            authenticate, requireRole('OWNER'), listMyCourts);

// Public: list + filter courts (?venueId=...&sport=...&isActive=...)
router.get('/',                     listCourts);

// Public: court availability (read-only)
router.get('/:id/availability',     getCourtAvailability);

// Public: court detail
router.get('/:id',                  getCourt);

// Owner: update court
router.put('/:id',                  authenticate, requireRole('OWNER'), updateCourt);

// Owner: delete court
router.delete('/:id',               authenticate, requireRole('OWNER'), deleteCourt);

export default router;
