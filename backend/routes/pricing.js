import { Router } from 'express';
import { compareCourtPrices, getBestTimeToPlay } from '../controllers/pricingController.js';

const router = Router();

// Public / Customer: Compare court prices by sport, location, duration, and time slot
router.get('/compare', compareCourtPrices);

// Public / Customer: Best Time to Play advisory analysis
router.get('/best-times', getBestTimeToPlay);

export default router;
