import { Router } from 'express';
import {
  createReview,
  getVenueReviews,
  getMyReviews,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Submit a new review for a completed booking (CUSTOMER only)
router.post('/', authenticate, requireRole('CUSTOMER'), createReview);

// Public venue review listing and summary
router.get('/venue/:venueId', getVenueReviews);

// Customer's own submitted reviews (CUSTOMER only)
router.get('/my', authenticate, requireRole('CUSTOMER'), getMyReviews);

export default router;
