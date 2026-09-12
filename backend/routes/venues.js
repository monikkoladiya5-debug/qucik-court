import { Router } from 'express';
import {
  listVenues,
  getVenue,
  listCities,
  listSports,
  listMyVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  adminListAllVenues,
} from '../controllers/venueController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

import { createCourt } from '../controllers/courtController.js';

const router = Router();

// ── All static paths MUST come before /:id to avoid param capture ─────────────

// Public meta
router.get('/meta/cities',  listCities);
router.get('/meta/sports',  listSports);

// Owner: list own venues (static "my" segment — must precede /:id)
router.get('/my/venues',    authenticate, requireRole('OWNER'), listMyVenues);

// Admin: list all venues (static "admin" segment — must precede /:id)
router.get('/admin/all',    authenticate, requireRole('ADMIN'), adminListAllVenues);

// Public: list + search venues
router.get('/',             listVenues);

// Public: venue detail  (/:id last among GETs)
router.get('/:id',          getVenue);

// Owner: create venue
router.post('/',            authenticate, requireRole('OWNER'), createVenue);

// Owner: update / delete own venue
router.put('/:id',          authenticate, requireRole('OWNER'), updateVenue);
router.delete('/:id',       authenticate, requireRole('OWNER'), deleteVenue);

// Owner: create court for venue
router.post('/:venueId/courts', authenticate, requireRole('OWNER'), createCourt);

export default router;
