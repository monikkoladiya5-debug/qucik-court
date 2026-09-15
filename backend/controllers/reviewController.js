import { store, safeReview } from '../data/store.js';

/**
 * Validates integer rating between 1 and 5.
 */
function isValidRating(rating) {
  if (typeof rating !== 'number') return false;
  if (!Number.isInteger(rating)) return false;
  return rating >= 1 && rating <= 5;
}

/**
 * POST /api/reviews
 * Requires: authenticate + requireRole('CUSTOMER')
 * Body: { bookingId, rating, title?, comment? }
 */
export function createReview(req, res) {
  const { bookingId, rating, title, comment } = req.body || {};

  // 1. Validate booking ID input
  if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid bookingId is required.',
    });
  }

  // 2. Locate booking in store
  const booking = store.bookings.find((b) => b.id === bookingId.trim());
  if (!booking) {
    return res.status(404).json({
      status: 'error',
      message: 'Booking not found.',
    });
  }

  // 3. Ownership check: Must belong to logged-in customer (BOLA / IDOR protection)
  if (booking.userId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to review another player\'s booking.',
    });
  }

  // 4. Eligibility check: Booking must be in COMPLETED state
  if (booking.status !== 'COMPLETED') {
    return res.status(400).json({
      status: 'error',
      message: `Only completed bookings can be reviewed. Current status is ${booking.status}.`,
    });
  }

  // 5. Duplicate protection: Exactly one review per booking
  const existingReview = (store.reviews || []).find((r) => r.bookingId === booking.id);
  if (existingReview) {
    return res.status(409).json({
      status: 'error',
      message: 'This booking has already been reviewed.',
    });
  }

  // 6. Rating validation: Integer 1 to 5 only
  if (!isValidRating(rating)) {
    return res.status(400).json({
      status: 'error',
      message: 'Rating must be an integer between 1 and 5.',
    });
  }

  // 7. Text validation
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

  if (trimmedTitle.length > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Review title cannot exceed 100 characters.',
    });
  }

  if (trimmedComment.length > 500) {
    return res.status(400).json({
      status: 'error',
      message: 'Review comment cannot exceed 500 characters.',
    });
  }

  if (!trimmedTitle && !trimmedComment) {
    return res.status(400).json({
      status: 'error',
      message: 'Review must contain at least a title or a comment.',
    });
  }

  // 8. Derive ownership & venue/court from authoritative booking data
  const now = new Date().toISOString();
  const newReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    bookingId: booking.id,
    customerId: req.user.id,
    venueId: booking.venueId,
    courtId: booking.courtId,
    rating,
    title: trimmedTitle,
    comment: trimmedComment,
    status: 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };

  if (!store.reviews) {
    store.reviews = [];
  }
  store.reviews.push(newReview);

  return res.status(201).json({
    status: 'ok',
    message: 'Review submitted successfully.',
    review: safeReview(newReview, 'CUSTOMER'),
  });
}

/**
 * GET /api/reviews/venue/:venueId
 * Public endpoint: Returns all published reviews for a venue with authoritative summary metrics.
 */
export function getVenueReviews(req, res) {
  const { venueId } = req.params;
  const venue = store.venues.find((v) => v.id === venueId);

  if (!venue) {
    return res.status(404).json({
      status: 'error',
      message: 'Venue not found.',
    });
  }

  const published = (store.reviews || [])
    .filter((r) => r.venueId === venueId && r.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;

  published.forEach((r) => {
    if (distribution[r.rating] !== undefined) {
      distribution[r.rating] += 1;
    }
    ratingSum += Number(r.rating || 0);
  });

  const count = published.length;
  const averageRating = count > 0 ? Number((ratingSum / count).toFixed(1)) : Number(venue.rating || 0);

  return res.status(200).json({
    status: 'ok',
    venueId,
    summary: {
      averageRating,
      reviewCount: count > 0 ? count : Number(venue.reviewCount || 0),
      distribution,
    },
    count,
    reviews: published.map((r) => safeReview(r, 'PUBLIC')),
  });
}

/**
 * GET /api/reviews/my
 * Requires: authenticate + requireRole('CUSTOMER')
 * Returns all reviews submitted by the logged-in customer.
 */
export function getMyReviews(req, res) {
  const myReviews = (store.reviews || [])
    .filter((r) => r.customerId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.status(200).json({
    status: 'ok',
    count: myReviews.length,
    reviews: myReviews.map((r) => safeReview(r, 'CUSTOMER')),
  });
}

/**
 * GET /api/owner/reviews
 * Requires: authenticate + requireRole('OWNER')
 * Returns all reviews for venues belonging to the logged-in owner.
 */
export function getOwnerReviews(req, res) {
  const ownerVenues = store.venues.filter((v) => v.ownerId === req.user.id);
  const ownerVenueIds = new Set(ownerVenues.map((v) => v.id));

  const ownerReviews = (store.reviews || [])
    .filter((r) => ownerVenueIds.has(r.venueId) && r.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalReviews = ownerReviews.length;
  const totalScore = ownerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;

  return res.status(200).json({
    status: 'ok',
    count: totalReviews,
    summary: {
      totalReviews,
      averageRating,
    },
    reviews: ownerReviews.map((r) => safeReview(r, 'OWNER')),
  });
}
