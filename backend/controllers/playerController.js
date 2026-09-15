import { store, safePlayer, calculatePlayerTrust } from '../data/store.js';

const VALID_SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const VALID_PREFERRED_DAYS = ['Weekdays', 'Weekends', 'Flexible'];
const VALID_PREFERRED_TIMES = ['Mornings', 'Afternoons', 'Evenings', 'Flexible'];
const VALID_AVAILABILITY = ['AVAILABLE', 'BUSY'];
const VALID_INVITE_STATUSES = ['ACCEPTED', 'DECLINED', 'CANCELLED'];
const VALID_REPORT_REASONS = [
  'inappropriate behavior',
  'harassment',
  'spam',
  'fake profile',
  'unsafe behavior',
  'other',
];

function generatePlayerId() {
  const rand = Math.floor(100 + Math.random() * 900);
  return `p-${Date.now().toString(36)}-${rand}`;
}

function generateInviteId() {
  const rand = Math.floor(100 + Math.random() * 900);
  return `inv-${Date.now().toString(36)}-${rand}`;
}

function generateReportId() {
  const rand = Math.floor(100 + Math.random() * 900);
  return `rep-${Date.now().toString(36)}-${rand}`;
}

function generateBlockId() {
  const rand = Math.floor(100 + Math.random() * 900);
  return `blk-${Date.now().toString(36)}-${rand}`;
}

/**
 * Helper: determine day type (Weekdays or Weekends) from a date string (YYYY-MM-DD)
 */
function getDayTypeFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6 ? 'Weekends' : 'Weekdays';
}

/**
 * Helper: map time string or period to standardized time slot
 */
function normalizeTimeSlot(timeStr) {
  if (!timeStr) return null;
  const lower = timeStr.toLowerCase().trim();
  if (lower === 'mornings' || lower === 'morning') return 'Mornings';
  if (lower === 'afternoons' || lower === 'afternoon') return 'Afternoons';
  if (lower === 'evenings' || lower === 'evening' || lower === 'night') return 'Evenings';
  if (lower === 'flexible' || lower === 'any') return 'Flexible';

  // Check 12-hour or 24-hour format: e.g. "07:00 AM", "18:00"
  const match12 = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const meridian = match12[3] ? match12[3].toUpperCase() : null;
    if (meridian === 'PM' && hour !== 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    if (hour < 12) return 'Mornings';
    if (hour < 17) return 'Afternoons';
    return 'Evenings';
  }
  return null;
}

/**
 * Helper: check if a user has a real booking schedule conflict on date/time
 */
function hasBookingConflict(userId, dateStr, timeStr) {
  if (!userId || !dateStr || !store.bookings) return false;
  const userBookings = store.bookings.filter(
    (b) =>
      b.userId === userId &&
      b.date === dateStr &&
      ['CONFIRMED', 'PAID', 'CHECKED_IN'].includes(b.status)
  );
  if (userBookings.length === 0) return false;

  if (!timeStr) return true; // Busy on that date

  const targetSlot = normalizeTimeSlot(timeStr);
  if (!targetSlot || targetSlot === 'Flexible') return userBookings.length > 0;

  return userBookings.some((b) => {
    const bSlot = normalizeTimeSlot(b.startTime);
    return bSlot === targetSlot;
  });
}

/**
 * Helper: check if a blocked relationship exists between caller and target player
 */
function isBlockedRelationship(callerUserId, targetPlayer) {
  if (!callerUserId || !targetPlayer || !store.playerBlocks) return false;
  const myPlayer = store.players.find((p) => p.userId === callerUserId);

  return store.playerBlocks.some((b) => {
    // 1. Caller has blocked target
    const callerBlockedTarget =
      b.blockerId === callerUserId &&
      (b.targetPlayerId === targetPlayer.id || (targetPlayer.userId && b.targetUserId === targetPlayer.userId));

    // 2. Target has blocked caller
    const targetBlockedCaller =
      targetPlayer.userId &&
      b.blockerId === targetPlayer.userId &&
      (b.targetUserId === callerUserId || (myPlayer && b.targetPlayerId === myPlayer.id));

    return callerBlockedTarget || targetBlockedCaller;
  });
}

// ─── CUSTOMER: List & Match Discoverable Players ──────────────────────────────

/**
 * GET /api/players
 * Query parameters:
 *   - sport
 *   - city
 *   - date (YYYY-MM-DD)
 *   - time / timeSlot
 *   - skillLevel
 *   - preferredTime
 *   - availabilityStatus
 *   - excludeSelf (true/false)
 *   - q (search term)
 */
export function listPlayers(req, res) {
  let candidates = [...store.players];

  const {
    sport,
    city,
    date,
    time,
    timeSlot,
    skillLevel,
    preferredTime,
    availabilityStatus,
    excludeSelf,
    q,
  } = req.query;

  // 1. Filter out self if requested
  if (excludeSelf === 'true' && req.user?.id) {
    candidates = candidates.filter((p) => p.userId !== req.user.id);
  }

  // 2. Filter out any players with active block relationships (two-way)
  if (req.user?.id) {
    candidates = candidates.filter((p) => !isBlockedRelationship(req.user.id, p));
  }

  // 3. Strict / Direct Filters if provided
  if (sport) {
    const sTerm = sport.toLowerCase().trim();
    candidates = candidates.filter((p) => p.sport && p.sport.toLowerCase() === sTerm);
  }

  if (city) {
    const cTerm = city.toLowerCase().trim();
    candidates = candidates.filter((p) => (p.city || 'Ahmedabad').toLowerCase().includes(cTerm));
  }

  if (skillLevel) {
    const levelTerm = skillLevel.toLowerCase().trim();
    candidates = candidates.filter((p) => p.skillLevel && p.skillLevel.toLowerCase() === levelTerm);
  }

  if (preferredTime) {
    const timeTerm = preferredTime.toLowerCase().trim();
    candidates = candidates.filter(
      (p) => (p.preferredTime && p.preferredTime.toLowerCase() === timeTerm) || p.preferredTime === 'Flexible'
    );
  }

  if (availabilityStatus) {
    const statusTerm = availabilityStatus.toUpperCase().trim();
    candidates = candidates.filter((p) => p.availabilityStatus === statusTerm);
  }

  if (q) {
    const qTerm = q.toLowerCase().trim();
    candidates = candidates.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(qTerm)) ||
        (p.sport && p.sport.toLowerCase().includes(qTerm)) ||
        (p.city && p.city.toLowerCase().includes(qTerm)) ||
        (p.bio && p.bio.toLowerCase().includes(qTerm))
    );
  }

  // 4. Deterministic Match Scoring & Ranking
  const targetDateDayType = date ? getDayTypeFromDate(date) : null;
  const targetTimeSlot = normalizeTimeSlot(time || timeSlot);
  const targetCity = city ? city.trim().toLowerCase() : null;

  const currentCustomer = req.user?.id
    ? store.users.find((u) => u.id === req.user.id)
    : null;
  const currentCustomerPlayer = req.user?.id
    ? store.players.find((p) => p.userId === req.user.id)
    : null;

  const scoredPlayers = candidates.map((player) => {
    let score = 50; // Base score
    const matchReasons = [];

    // Sport compatibility
    if (sport && player.sport && player.sport.toLowerCase() === sport.toLowerCase().trim()) {
      score += 20;
      matchReasons.push(`Plays ${player.sport}`);
    } else if (currentCustomer?.preferredSports?.includes(player.sport)) {
      score += 15;
      matchReasons.push(`Shares preferred sport (${player.sport})`);
    }

    // Date / Day compatibility
    if (targetDateDayType) {
      if (player.preferredDays === 'Flexible') {
        score += 10;
        matchReasons.push('Flexible on play days');
      } else if (player.preferredDays === targetDateDayType) {
        score += 15;
        matchReasons.push(`Available on ${targetDateDayType}`);
      } else {
        score -= 10;
      }
    }

    // Time slot compatibility
    if (targetTimeSlot) {
      if (player.preferredTime === 'Flexible') {
        score += 10;
        matchReasons.push('Flexible timing');
      } else if (player.preferredTime === targetTimeSlot) {
        score += 15;
        matchReasons.push(`Prefers ${targetTimeSlot} matches`);
      } else {
        score -= 10;
      }
    }

    // Real Court Booking Conflict Check
    const hasConflict = date && player.userId ? hasBookingConflict(player.userId, date, time || timeSlot) : false;
    if (hasConflict) {
      score -= 30;
      matchReasons.push('Has existing court booking at this time');
    }

    // City compatibility
    if (targetCity) {
      if ((player.city || 'Ahmedabad').toLowerCase() === targetCity) {
        score += 10;
        matchReasons.push(`Based in ${player.city || 'Ahmedabad'}`);
      }
    } else if (currentCustomerPlayer?.city && player.city === currentCustomerPlayer.city) {
      score += 5;
      matchReasons.push(`Same city (${player.city})`);
    }

    // Skill level compatibility
    if (currentCustomerPlayer?.skillLevel) {
      if (player.skillLevel === currentCustomerPlayer.skillLevel) {
        score += 10;
        matchReasons.push(`Matching ${player.skillLevel} skill level`);
      } else {
        score += 3;
      }
    }

    // Availability status penalty
    if (player.availabilityStatus === 'BUSY') {
      score -= 25;
    }

    // Clamp score between 20% and 98%
    const finalScore = Math.max(20, Math.min(98, score));

    return {
      ...player,
      matchScore: finalScore,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['Open to community sparring'],
    };
  });

  // Sort by match score descending
  scoredPlayers.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  return res.status(200).json({
    status: 'ok',
    count: scoredPlayers.length,
    players: scoredPlayers.map((p) => safePlayer(p, req.user?.id)),
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
    player: safePlayer(player, req.user?.id),
  });
}

// ─── CUSTOMER: Get Player Trust & Activity Summary ────────────────────────────

/**
 * GET /api/players/:id/trust
 */
export function getPlayerTrust(req, res) {
  const player = store.players.find((p) => p.id === req.params.id);
  if (!player) {
    return res.status(404).json({ status: 'error', message: 'Player not found.' });
  }

  const trustSummary = calculatePlayerTrust(player);

  let isBlocked = false;
  if (req.user?.id && store.playerBlocks) {
    isBlocked = store.playerBlocks.some(
      (b) =>
        b.blockerId === req.user.id &&
        (b.targetPlayerId === player.id || (player.userId && b.targetUserId === player.userId))
    );
  }

  return res.status(200).json({
    status: 'ok',
    trustSummary: {
      ...trustSummary,
      isBlocked,
    },
  });
}

// ─── CUSTOMER: Report Player ──────────────────────────────────────────────────

/**
 * POST /api/players/:id/report
 * Body: { reason, details }
 */
export function reportPlayer(req, res) {
  const targetPlayer = store.players.find((p) => p.id === req.params.id);
  if (!targetPlayer) {
    return res.status(404).json({ status: 'error', message: 'Target player not found.' });
  }

  // Prevent self-reporting
  if (targetPlayer.userId && targetPlayer.userId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot report your own player profile.',
    });
  }

  const { reason, details } = req.body || {};

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Report reason is required.',
    });
  }

  const cleanReason = reason.trim().toLowerCase();
  const isValidReason = VALID_REPORT_REASONS.some(
    (r) => cleanReason === r || cleanReason === r.replace(/\s+/g, '_') || cleanReason === r.replace(/\s+/g, '-')
  );

  if (!isValidReason) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid report reason. Must be one of: ${VALID_REPORT_REASONS.join(', ')}.`,
    });
  }

  if (details !== undefined && typeof details === 'string' && details.trim().length > 500) {
    return res.status(400).json({
      status: 'error',
      message: 'Report details cannot exceed 500 characters.',
    });
  }

  if (!store.playerReports) store.playerReports = [];

  // Duplicate report spam prevention
  const existingPending = store.playerReports.find(
    (r) =>
      r.reporterId === req.user.id &&
      r.targetPlayerId === targetPlayer.id &&
      r.status === 'PENDING'
  );

  if (existingPending) {
    return res.status(409).json({
      status: 'error',
      message: 'You have already submitted a pending report for this player.',
    });
  }

  const now = new Date().toISOString();
  const report = {
    id: generateReportId(),
    reporterId: req.user.id,
    reporterName: req.user.name,
    targetPlayerId: targetPlayer.id,
    targetPlayerName: targetPlayer.name,
    targetUserId: targetPlayer.userId || null,
    reason: cleanReason,
    details: details && typeof details === 'string' ? details.trim() : '',
    status: 'PENDING',
    createdAt: now,
  };

  store.playerReports.push(report);

  return res.status(201).json({
    status: 'ok',
    message: 'Report submitted successfully. Our safety team will review it.',
    reportId: report.id,
  });
}

// ─── CUSTOMER: Block Player ───────────────────────────────────────────────────

/**
 * POST /api/players/:id/block
 */
export function blockPlayer(req, res) {
  const targetPlayer = store.players.find((p) => p.id === req.params.id);
  if (!targetPlayer) {
    return res.status(404).json({ status: 'error', message: 'Target player not found.' });
  }

  // Prevent self-block
  if (targetPlayer.userId && targetPlayer.userId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot block your own player profile.',
    });
  }

  if (!store.playerBlocks) store.playerBlocks = [];

  const existingBlock = store.playerBlocks.find(
    (b) =>
      b.blockerId === req.user.id &&
      (b.targetPlayerId === targetPlayer.id || (targetPlayer.userId && b.targetUserId === targetPlayer.userId))
  );

  if (existingBlock) {
    return res.status(409).json({
      status: 'error',
      message: 'Player is already blocked.',
    });
  }

  const now = new Date().toISOString();
  const block = {
    id: generateBlockId(),
    blockerId: req.user.id,
    targetPlayerId: targetPlayer.id,
    targetPlayerName: targetPlayer.name,
    targetUserId: targetPlayer.userId || null,
    createdAt: now,
  };

  store.playerBlocks.push(block);

  return res.status(201).json({
    status: 'ok',
    message: `Player ${targetPlayer.name} has been blocked.`,
    block,
  });
}

// ─── CUSTOMER: Unblock Player ─────────────────────────────────────────────────

/**
 * DELETE /api/players/:id/block
 */
export function unblockPlayer(req, res) {
  if (!store.playerBlocks) store.playerBlocks = [];

  const targetPlayer = store.players.find((p) => p.id === req.params.id);
  const targetId = req.params.id;

  const blockIndex = store.playerBlocks.findIndex(
    (b) =>
      b.blockerId === req.user.id &&
      (b.targetPlayerId === targetId ||
        b.id === targetId ||
        (targetPlayer && (b.targetPlayerId === targetPlayer.id || (targetPlayer.userId && b.targetUserId === targetPlayer.userId))))
  );

  if (blockIndex === -1) {
    return res.status(404).json({
      status: 'error',
      message: 'No active block found for this player.',
    });
  }

  const [removedBlock] = store.playerBlocks.splice(blockIndex, 1);

  return res.status(200).json({
    status: 'ok',
    message: 'Player unblocked successfully.',
    unblockedId: removedBlock.targetPlayerId,
  });
}

// ─── CUSTOMER: Get My Blocked Players ─────────────────────────────────────────

/**
 * GET /api/players/me/blocks
 */
export function getMyBlocks(req, res) {
  if (!store.playerBlocks) store.playerBlocks = [];

  const myBlocks = store.playerBlocks.filter((b) => b.blockerId === req.user.id);

  const blockedPlayers = myBlocks.map((b) => {
    const player = store.players.find((p) => p.id === b.targetPlayerId);
    return {
      blockId: b.id,
      playerId: b.targetPlayerId,
      name: player ? player.name : b.targetPlayerName || 'Blocked Player',
      sport: player ? player.sport : 'Sports',
      city: player ? player.city : 'Ahmedabad',
      blockedAt: b.createdAt,
    };
  });

  return res.status(200).json({
    status: 'ok',
    count: blockedPlayers.length,
    blocks: blockedPlayers,
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
        city: 'Ahmedabad',
        preferredDays: 'Weekdays',
        preferredTime: 'Evenings',
        availabilityStatus: 'AVAILABLE',
        bio: '',
        imageUrl: null,
        trustSummary: {
          trustLabel: 'Limited History',
          totalBookings: 0,
          completedGames: 0,
          checkIns: 0,
          cancellations: 0,
          noShows: 0,
          memberSince: null,
        },
      },
    });
  }

  return res.status(200).json({
    status: 'ok',
    player: safePlayer(player, req.user.id),
  });
}

// ─── CUSTOMER: Update Own Player Profile ──────────────────────────────────────

/**
 * PUT /api/players/me/profile
 * Whitelist: { sport, skillLevel, city, preferredDays, preferredTime, availabilityStatus, bio }
 */
export function updateMyProfile(req, res) {
  const { sport, skillLevel, city, preferredDays, preferredTime, availabilityStatus, bio } = req.body || {};

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
    player.city = typeof city === 'string' && city.trim() ? city.trim() : (player.city || 'Ahmedabad');
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
      city: typeof city === 'string' && city.trim() ? city.trim() : 'Ahmedabad',
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
    player: safePlayer(player, req.user.id),
  });
}

// ─── CUSTOMER: Send Match Request / Invite ────────────────────────────────────

/**
 * POST /api/players/:id/invite
 * Body: { sport, date, time, courtVenue, note }
 */
export function sendMatchInvite(req, res) {
  const targetPlayer = store.players.find((p) => p.id === req.params.id);
  if (!targetPlayer) {
    return res.status(404).json({ status: 'error', message: 'Target player not found.' });
  }

  // Prevent self-invite
  if (targetPlayer.userId && targetPlayer.userId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot send a match invite to yourself.',
    });
  }

  // Check block relationship
  if (isBlockedRelationship(req.user.id, targetPlayer)) {
    return res.status(403).json({
      status: 'error',
      message: 'Cannot send match invite to a blocked player.',
    });
  }

  const { sport, date, time, courtVenue, note } = req.body || {};

  if (!sport || typeof sport !== 'string' || !sport.trim()) {
    return res.status(400).json({ status: 'error', message: 'Sport is required for match invite.' });
  }

  if (!date || typeof date !== 'string' || !date.trim()) {
    return res.status(400).json({ status: 'error', message: 'Date is required for match invite.' });
  }

  // Validate date format YYYY-MM-DD
  const dateObj = new Date(date.trim());
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ status: 'error', message: 'Valid date is required (YYYY-MM-DD).' });
  }

  const cleanSport = sport.trim();
  const cleanDate = date.trim();
  const cleanTime = time && typeof time === 'string' ? time.trim() : 'Flexible';
  const cleanVenue = courtVenue && typeof courtVenue === 'string' ? courtVenue.trim() : 'TBD';
  const cleanNote = note && typeof note === 'string' ? note.trim().slice(0, 200) : '';

  // Duplicate invite prevention
  if (!store.matchInvites) store.matchInvites = [];
  const existingPending = store.matchInvites.find(
    (inv) =>
      inv.senderId === req.user.id &&
      inv.targetPlayerId === targetPlayer.id &&
      inv.date === cleanDate &&
      inv.sport.toLowerCase() === cleanSport.toLowerCase() &&
      inv.status === 'PENDING'
  );

  if (existingPending) {
    return res.status(409).json({
      status: 'error',
      message: 'A pending match invite already exists for this player on this date.',
    });
  }

  const now = new Date().toISOString();
  const newInvite = {
    id: generateInviteId(),
    senderId: req.user.id,
    senderName: req.user.name,
    targetPlayerId: targetPlayer.id,
    targetPlayerName: targetPlayer.name,
    targetUserId: targetPlayer.userId || null,
    sport: cleanSport,
    date: cleanDate,
    time: cleanTime,
    courtVenue: cleanVenue,
    note: cleanNote,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  store.matchInvites.push(newInvite);

  return res.status(201).json({
    status: 'ok',
    message: 'Match invite sent successfully.',
    invite: newInvite,
  });
}

// ─── CUSTOMER: Get Match Invites ──────────────────────────────────────────────

/**
 * GET /api/players/me/invites
 */
export function getMyInvites(req, res) {
  if (!store.matchInvites) store.matchInvites = [];

  const myPlayer = store.players.find((p) => p.userId === req.user.id);
  const myPlayerId = myPlayer ? myPlayer.id : null;

  const sent = store.matchInvites.filter((inv) => inv.senderId === req.user.id);
  const received = store.matchInvites.filter(
    (inv) => (inv.targetUserId && inv.targetUserId === req.user.id) || (myPlayerId && inv.targetPlayerId === myPlayerId)
  );

  return res.status(200).json({
    status: 'ok',
    sent,
    received,
  });
}

// ─── CUSTOMER: Respond to / Update Match Invite Status ────────────────────────

/**
 * PATCH /api/players/invites/:id/status
 * Body: { status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED' }
 */
export function respondToInvite(req, res) {
  if (!store.matchInvites) store.matchInvites = [];

  const invite = store.matchInvites.find((inv) => inv.id === req.params.id);
  if (!invite) {
    return res.status(404).json({ status: 'error', message: 'Match invite not found.' });
  }

  const { status } = req.body || {};
  if (!status || !VALID_INVITE_STATUSES.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Status must be one of: ${VALID_INVITE_STATUSES.join(', ')}.`,
    });
  }

  const myPlayer = store.players.find((p) => p.userId === req.user.id);
  const isSender = invite.senderId === req.user.id;
  const isRecipient =
    (invite.targetUserId && invite.targetUserId === req.user.id) ||
    (myPlayer && invite.targetPlayerId === myPlayer.id);

  if (status === 'CANCELLED') {
    if (!isSender) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the sender can cancel a match invite.',
      });
    }
  } else if (status === 'ACCEPTED' || status === 'DECLINED') {
    if (!isRecipient) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the recipient can accept or decline a match invite.',
      });
    }
  }

  invite.status = status;
  invite.updatedAt = new Date().toISOString();

  return res.status(200).json({
    status: 'ok',
    message: `Match invite ${status.toLowerCase()} successfully.`,
    invite,
  });
}
