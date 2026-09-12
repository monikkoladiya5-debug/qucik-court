import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// ── Static routes must precede dynamic /:id ───────────────────────────────────

// Customer: list my bookings
router.get('/my', requireRole('CUSTOMER'), getMyBookings);

// Customer: create new booking
router.post('/', requireRole('CUSTOMER'), createBooking);

// Customer: get single booking detail
router.get('/:id', requireRole('CUSTOMER'), getBooking);

// Customer: cancel booking
router.delete('/:id', requireRole('CUSTOMER'), cancelBooking);

export default router;
