import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  rescheduleBooking,
  approveBooking,
  rejectBooking,
  payBooking,
  updateBookingStatus,
  verifyBookingByToken,
  checkInBooking,
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// ── Static / Special routes must precede dynamic /:id ──────────────────────────

// Owner of venue or Admin: verify check-in token / QR
router.get('/verify/:token', verifyBookingByToken);
router.post('/verify', verifyBookingByToken);

// Customer: list my bookings
router.get('/my', requireRole('CUSTOMER'), getMyBookings);

// Customer: create new booking (starts in REQUESTED with PENDING payment)
router.post('/', requireRole('CUSTOMER'), createBooking);

// Customer: single booking detail (ownership checked)
router.get('/:id', requireRole('CUSTOMER'), getBooking);

// Customer: cancel booking (ownership checked)
router.post('/:id/cancel', requireRole('CUSTOMER'), cancelBooking);
router.patch('/:id/cancel', requireRole('CUSTOMER'), cancelBooking);
router.delete('/:id', requireRole('CUSTOMER'), cancelBooking);

// Customer: reschedule booking (ownership checked)
router.post('/:id/reschedule', requireRole('CUSTOMER'), rescheduleBooking);
router.patch('/:id/reschedule', requireRole('CUSTOMER'), rescheduleBooking);

// Owner of venue or Admin: check-in player
router.post('/:id/check-in', checkInBooking);

// Owner of venue or Admin: approve booking
router.post('/:id/approve', approveBooking);
router.patch('/:id/approve', approveBooking);

// Owner of venue or Admin: reject booking
router.post('/:id/reject', rejectBooking);
router.patch('/:id/reject', rejectBooking);

// Customer or Admin: demo pay for booking
router.post('/:id/pay', payBooking);

// Role-checked status & payment transition endpoint
router.patch('/:id/status', updateBookingStatus);

export default router;

