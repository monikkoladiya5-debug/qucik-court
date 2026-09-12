import { store, safeUser } from '../data/store.js';
import { calculateBookingLoyalty } from './loyaltyController.js';

function isValidAvatarUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return true; // Allow clearing avatar
  if (trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GET /api/profile/me
 * Requires: authenticate + requireRole('CUSTOMER')
 * Returns safe profile including dynamically calculated loyalty points.
 */
export async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User profile not found.' });
    }

    const loyalty = calculateBookingLoyalty(user.id);

    return res.status(200).json({
      status: 'ok',
      profile: {
        ...safeUser(user),
        points: loyalty.totalPoints,
        eligibleBookingsCount: loyalty.eligibleBookingsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile/me
 * Requires: authenticate + requireRole('CUSTOMER')
 * Whitelisted fields: name, phone, preferredSports, avatar.
 * Privileged fields (id, userId, role, passwordHash, status, points) cannot be modified.
 * Does NOT modify player profiles (Task 5 players remain separate).
 */
export async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User profile not found.' });
    }

    const { name, phone, preferredSports, avatar } = req.body || {};

    // Validate and update name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
        return res.status(400).json({
          status: 'error',
          message: 'Name must be between 2 and 60 characters.',
        });
      }
      user.name = name.trim();
    }

    // Validate and update phone if provided
    if (phone !== undefined) {
      if (phone !== null && typeof phone !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Phone must be a valid string.',
        });
      }
      const trimmedPhone = phone ? phone.trim() : '';
      if (trimmedPhone.length > 20) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number must be at most 20 characters.',
        });
      }
      user.phone = trimmedPhone || null;
    }

    // Validate and update preferredSports if provided
    if (preferredSports !== undefined) {
      if (
        !Array.isArray(preferredSports) ||
        preferredSports.length > 10 ||
        !preferredSports.every((s) => typeof s === 'string' && s.trim().length > 0)
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Preferred sports must be an array of up to 10 non-empty strings.',
        });
      }
      user.preferredSports = preferredSports.map((s) => s.trim());
    }

    // Validate and update avatar if provided
    if (avatar !== undefined) {
      if (avatar !== null && !isValidAvatarUrl(avatar)) {
        return res.status(400).json({
          status: 'error',
          message: 'Avatar must be a valid HTTP or HTTPS URL under 500 characters.',
        });
      }
      user.avatar = (typeof avatar === 'string' && avatar.trim().length > 0) ? avatar.trim() : null;
    }

    // Dynamic loyalty calculation (never client-provided points)
    const loyalty = calculateBookingLoyalty(user.id);

    return res.status(200).json({
      status: 'ok',
      message: 'Profile updated successfully.',
      profile: {
        ...safeUser(user),
        points: loyalty.totalPoints,
        eligibleBookingsCount: loyalty.eligibleBookingsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
