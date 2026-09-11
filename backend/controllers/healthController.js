import { store } from '../data/store.js';

/**
 * GET /api/health
 * Returns server health status from the in-memory store.
 */
export function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'QuickCourt Backend API is running healthy',
    timestamp: new Date().toISOString(),
    systemHealth: store.systemHealth,
  });
}
