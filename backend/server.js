import express from 'express';
import cors from 'cors';

import healthRouter  from './routes/health.js';
import authRouter    from './routes/auth.js';
import rbacRouter    from './routes/rbac.js';
import venueRouter   from './routes/venues.js';
import { errorHandler } from './middleware/errorHandler.js';
import { store } from './data/store.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth',   authRouter);
app.use('/api/rbac',   rbacRouter);
app.use('/api/venues', venueRouter);

// ─── Summary stats (foundation convenience endpoint) ──────────────────────────
app.get('/api/summary', (req, res) => {
  res.status(200).json({
    usersCount: store.users.length,
    venuesCount: store.venues.length,
    bookingsCount: store.bookings.length,
    playersCount: store.players.length,
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.path}` });
});

// ─── Centralised error handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[QuickCourt Backend] Server listening on http://localhost:${PORT}`);
});
