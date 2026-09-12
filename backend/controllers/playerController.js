import { store, safePlayer } from '../data/store.js';

const VALID_SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const VALID_PREFERRED_DAYS = ['Weekdays', 'Weekends', 'Flexible'];
const VALID_PREFERRED_TIMES = ['Mornings', 'Afternoons', 'Evenings', 'Flexible'];
const VALID_AVAILABILITY = ['AVAILABLE', 'BUSY'];

function generatePlayerId() {
  const rand = Math.floor(100 + Math.random() * 900);
  return `p-${Date.now().toString(36)}-${rand}`;
}

// ─── CUSTOMER: List Discoverable Players ──────────────────────────────────────

/**
 * GET /api/players
 * Query parameters:
 *   - sport
 *   - skillLevel
 *   - preferredTime
 *   - availabilityStatus
 *   - q (search term)
 */
export function listPlayers(req, res) {
  let results = store.players;

  const { sport, skillLevel, preferredTime, availabilityStatus, q } = req.query;

  if (sport) {
    const sTerm = sport.toLowerCase().trim();
    results = results.filter((p) => p.sport && p.sport.toLowerCase() === sTerm);
  }

  if (skillLevel) {
    const levelTerm = skillLevel.toLowerCase().trim();
    results = results.filter((p) => p.skillLevel && p.skillLevel.toLowerCase() === levelTerm);
  }

  if (preferredTime) {
    const timeTerm = preferredTime.toLowerCase().trim();
    results = results.filter((p) => p.preferredTime && p.preferredTime.toLowerCase() === timeTerm);
  }

  if (availabilityStatus) {
    const statusTerm = availabilityStatus.toUpperCase().trim();
    results = results.filter((p) => p.availabilityStatus === statusTerm);
  }

  if (q) {
    const qTerm = q.toLowerCase().trim();
    results = results.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(qTerm)) ||
        (p.sport && p.sport.toLowerCase().includes(qTerm)) ||
        (p.bio && p.bio.toLowerCase().includes(qTerm))
    );
  }

  return res.status(200).json({
    status: 'ok',
    count: results.length,
    players: results.map(safePlayer),
  });
}

// ─── CUSTOMER: Get Player Detail ──────────────────────────────────────────────

/**
 * GET /api/players/:id
 */
export function getPlayer(req, res) {
  const player = store.players.find((p) => p.id === req.params.id);
  if (!player) {
    return res.status(404).json({ status: 'error', message: 'Player not found.' });
  }

  return res.status(200).json({
    status: 'ok',
    player: safePlayer(player),
  });
}

// ─── CUSTOMER: Get Own Player Profile ─────────────────────────────────────────

/**
 * GET /api/players/me/profile
 */
export function getMyProfile(req, res) {
  const player = store.players.find((p) => p.userId === req.user.id);
  if (!player) {
    return res.status(200).json({
      status: 'ok',
      player: {
        id: null,
        name: req.user.name,
        sport: (req.user.preferredSports && req.user.preferredSports[0]) || 'Badminton',
        skillLevel: 'Intermediate',
        preferredDays: 'Weekdays',
        preferredTime: 'Evenings',
        availabilityStatus: 'AVAILABLE',
        bio: '',
        imageUrl: null,
      },
    });
  }

  return res.status(200).json({
    status: 'ok',
    player: safePlayer(player),
  });
}

// ─── CUSTOMER: Update Own Player Profile ──────────────────────────────────────

/**
 * PUT /api/players/me/profile
 * Whitelist: { sport, skillLevel, preferredDays, preferredTime, availabilityStatus, bio }
 */
export function updateMyProfile(req, res) {
  const { sport, skillLevel, preferredDays, preferredTime, availabilityStatus, bio } = req.body || {};

  // 1. Validate sport
  if (!sport || typeof sport !== 'string' || !sport.trim()) {
    return res.status(400).json({ status: 'error', message: 'Sport is required.' });
  }
  if (sport.trim().length > 50) {
    return res.status(400).json({ status: 'error', message: 'Sport cannot exceed 50 characters.' });
  }

  // 2. Validate skillLevel
  if (!skillLevel || !VALID_SKILL_LEVELS.includes(skillLevel)) {
    return res.status(400).json({
      status: 'error',
      message: `Skill level must be one of: ${VALID_SKILL_LEVELS.join(', ')}.`,
    });
  }

  // 3. Validate preferredDays
  if (!preferredDays || !VALID_PREFERRED_DAYS.includes(preferredDays)) {
    return res.status(400).json({
      status: 'error',
      message: `Preferred days must be one of: ${VALID_PREFERRED_DAYS.join(', ')}.`,
    });
  }

  // 4. Validate preferredTime
  if (!preferredTime || !VALID_PREFERRED_TIMES.includes(preferredTime)) {
    return res.status(400).json({
      status: 'error',
      message: `Preferred time must be one of: ${VALID_PREFERRED_TIMES.join(', ')}.`,
    });
  }

  // 5. Validate availabilityStatus
  if (!availabilityStatus || !VALID_AVAILABILITY.includes(availabilityStatus)) {
    return res.status(400).json({
      status: 'error',
      message: `Availability status must be one of: ${VALID_AVAILABILITY.join(', ')}.`,
    });
  }

  // 6. Validate bio
  if (bio !== undefined && typeof bio === 'string' && bio.trim().length > 300) {
    return res.status(400).json({ status: 'error', message: 'Bio cannot exceed 300 characters.' });
  }

  const now = new Date().toISOString();
  let player = store.players.find((p) => p.userId === req.user.id);

  if (player) {
    player.sport = sport.trim();
    player.skillLevel = skillLevel;
    player.preferredDays = preferredDays;
    player.preferredTime = preferredTime;
    player.availabilityStatus = availabilityStatus;
    player.bio = typeof bio === 'string' ? bio.trim() : player.bio;
    player.updatedAt = now;
  } else {
    player = {
      id: generatePlayerId(),
      userId: req.user.id,
      name: req.user.name,
      sport: sport.trim(),
      skillLevel,
      preferredDays,
      preferredTime,
      availabilityStatus,
      bio: typeof bio === 'string' ? bio.trim() : '',
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    store.players.push(player);
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Player profile updated successfully.',
    player: safePlayer(player),
  });
}
