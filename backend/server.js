import express from 'express';
import cors from 'cors';
import { store } from './data/store.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'QuickCourt Backend API is running healthy',
    timestamp: new Date().toISOString(),
    systemHealth: store.systemHealth
  });
});

// Basic summary stats endpoint for foundation check
app.get('/api/summary', (req, res) => {
  res.status(200).json({
    usersCount: store.users.length,
    venuesCount: store.venues.length,
    bookingsCount: store.bookings.length,
    playersCount: store.players.length
  });
});

app.listen(PORT, () => {
  console.log(`[QuickCourt Backend] Server listening on http://localhost:${PORT}`);
});
