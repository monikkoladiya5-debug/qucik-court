// QuickCourt In-Memory JavaScript Data Store
// Note: Data resets when the Express server restarts.
// Roles are stored uppercase: CUSTOMER | OWNER | ADMIN

import bcrypt from 'bcryptjs';
import { AUTH_CONFIG } from '../config/auth.js';

const { saltRounds, ROLES } = AUTH_CONFIG;

// Pre-hash demo passwords synchronously at startup (one-time cost, acceptable for dev)
const customerHash  = bcrypt.hashSync('customer123', saltRounds);
const ownerHash     = bcrypt.hashSync(AUTH_CONFIG.ownerPassword, saltRounds);
const owner2Hash    = bcrypt.hashSync('owner2pass', saltRounds);
const adminHash     = bcrypt.hashSync(AUTH_CONFIG.adminPassword, saltRounds);

export const store = {
  users: [
    {
      id: 'u-101',
      name: 'Rahul Sharma',
      email: 'user@quickcourt.com',
      phone: '+91 98765 43210',
      role: ROLES.CUSTOMER,
      status: 'active',
      points: 240,
      preferredSports: ['Badminton', 'Tennis'],
      passwordHash: customerHash,
    },
    {
      id: 'u-102',
      name: 'Vikram Patel',
      email: AUTH_CONFIG.ownerEmail,
      phone: '+91 98123 45678',
      role: ROLES.OWNER,
      status: 'active',
      businessName: 'Vertex Sports Complex',
      venueLocation: 'Vastrapur, Ahmedabad, Gujarat',
      passwordHash: ownerHash,
    },
    {
      // Second owner — used for cross-owner RBAC verification
      id: 'u-104',
      name: 'Priya Mehta',
      email: 'owner2@quickcourt.com',
      phone: '+91 97654 32109',
      role: ROLES.OWNER,
      status: 'active',
      businessName: 'Mumbai Sports Hub',
      venueLocation: 'Andheri, Mumbai',
      passwordHash: owner2Hash,
    },
    {
      id: 'u-103',
      name: 'Platform Administrator',
      email: AUTH_CONFIG.adminEmail,
      phone: '+91 99999 00000',
      role: ROLES.ADMIN,
      status: 'active',
      passwordHash: adminHash,
    },
  ],

  venues: [
    {
      id: 'v-1',
      name: 'Game Arena',
      description: 'Premium multi-sport facility in the heart of Bodakdev featuring professional-grade courts, climate-controlled halls, and top-tier equipment for a world-class playing experience.',
      location: 'Bodakdev, Ahmedabad, Gujarat',
      address: 'Plot 42, Bodakdev Circle, Ahmedabad - 380054',
      city: 'Ahmedabad',
      sportTypes: ['Badminton', 'Pickleball'],
      rating: 4.5,
      reviewCount: 204,
      courtCount: 10,
      pricePerHour: 400,
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
      indoor: true,
      amenities: ['Parking', 'Locker Room', 'Washroom', 'Equipment', 'Cafeteria'],
      openingHours: '06:00 AM - 11:00 PM',
      status: 'active',
      ownerId: 'u-102',
      createdAt: '2026-01-10',
    },
    {
      id: 'v-2',
      name: 'PlayZone',
      description: 'Outdoor sports complex offering floodlit courts for evening play. Perfect for tennis and football enthusiasts who prefer open-air matches with excellent facilities.',
      location: 'Vastrapur, Ahmedabad, Gujarat',
      address: 'Vastrapur Lake Road, Near Ahmedabad University, Ahmedabad - 380015',
      city: 'Ahmedabad',
      sportTypes: ['Tennis', 'Football'],
      rating: 4.3,
      reviewCount: 156,
      courtCount: 8,
      pricePerHour: 600,
      imageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
      indoor: false,
      amenities: ['Parking', 'Floodlights', 'Cafeteria', 'Locker Room'],
      openingHours: '06:00 AM - 10:00 PM',
      status: 'active',
      ownerId: 'u-102',
      createdAt: '2026-02-05',
    },
    {
      id: 'v-3',
      name: 'Smash Sports Club',
      description: 'Air-conditioned indoor sports club specialising in badminton and basketball. Wooden-floored courts maintained to tournament standards with experienced coaching staff available.',
      location: 'Gota, Ahmedabad, Gujarat',
      address: '15 Gota Cross Roads, Near Nirma University, Ahmedabad - 382481',
      city: 'Ahmedabad',
      sportTypes: ['Badminton', 'Basketball'],
      rating: 4.6,
      reviewCount: 312,
      courtCount: 6,
      pricePerHour: 350,
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      indoor: true,
      amenities: ['Parking', 'Air Conditioned', 'Washroom', 'Equipment'],
      openingHours: '05:00 AM - 11:30 PM',
      status: 'active',
      ownerId: 'u-102',
      createdAt: '2026-01-20',
    },
    {
      id: 'v-4',
      name: 'Ace Badminton Club',
      description: 'Ahmedabad\'s highest-rated dedicated badminton facility. Features 7 professional courts with BWF-approved flooring, a pro shop, and a coaching academy for all skill levels.',
      location: 'Satellite, Ahmedabad, Gujarat',
      address: 'SG Highway Service Road, Satellite, Ahmedabad - 380015',
      city: 'Ahmedabad',
      sportTypes: ['Badminton'],
      rating: 4.8,
      reviewCount: 420,
      courtCount: 7,
      pricePerHour: 500,
      imageUrl: 'https://images.unsplash.com/photo-1511067007398-7e4b90aab4bc?auto=format&fit=crop&w=800&q=80',
      indoor: true,
      amenities: ['Parking', 'Locker Room', 'Washroom', 'Pro Shop'],
      openingHours: '06:00 AM - 10:00 PM',
      status: 'active',
      ownerId: 'u-102',
      createdAt: '2025-11-15',
    },
    {
      id: 'v-5',
      name: 'Mumbai Sports Hub',
      description: 'Western Mumbai\'s premier multi-sport destination. Sprawling facility with courts for tennis, football, and cricket across both indoor and outdoor areas. Corporate packages available.',
      location: 'Andheri West, Mumbai, Maharashtra',
      address: '8 Versova Road, Andheri West, Mumbai - 400058',
      city: 'Mumbai',
      sportTypes: ['Tennis', 'Football', 'Cricket'],
      rating: 4.4,
      reviewCount: 289,
      courtCount: 12,
      pricePerHour: 700,
      imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
      indoor: false,
      amenities: ['Parking', 'Floodlights', 'Cafeteria', 'Washroom', 'Equipment'],
      openingHours: '06:00 AM - 10:00 PM',
      status: 'active',
      ownerId: 'u-104',
      createdAt: '2026-03-01',
    },
    {
      id: 'v-6',
      name: 'Koregaon Racquet Club',
      description: 'Pune\'s exclusive racquet sports club featuring squash and badminton courts with a members-only lounge, coaching academies, and regular tournaments for all age groups.',
      location: 'Koregaon Park, Pune, Maharashtra',
      address: 'Lane 7, Koregaon Park, Pune - 411001',
      city: 'Pune',
      sportTypes: ['Badminton', 'Squash'],
      rating: 4.7,
      reviewCount: 178,
      courtCount: 8,
      pricePerHour: 550,
      imageUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=800&q=80',
      indoor: true,
      amenities: ['Parking', 'Air Conditioned', 'Locker Room', 'Cafeteria', 'Pro Shop'],
      openingHours: '06:00 AM - 09:00 PM',
      status: 'active',
      ownerId: 'u-104',
      createdAt: '2026-04-12',
    },
  ],

  pendingVenues: [
    {
      id: 'pv-1',
      name: 'Vertex Badminton Hub',
      location: 'Maninagar, Ahmedabad',
      sports: ['Badminton'],
      submittedOn: '2026-09-10',
      ownerName: 'Michael Brown',
      status: 'pending',
    },
    {
      id: 'pv-2',
      name: 'Green Haven Sports',
      location: 'SG Highway, Ahmedabad',
      sports: ['Tennis', 'Football'],
      submittedOn: '2026-09-09',
      ownerName: 'Jane Smith',
      status: 'pending',
    },
  ],

  courts: [
    { id: 'c-1', venueId: 'v-1', name: 'Court-1 Standard', type: 'Standard', pricePerHour: 400, available: true },
    { id: 'c-2', venueId: 'v-1', name: 'Court-2 Premium', type: 'Premium Synthetic', pricePerHour: 500, available: true },
    { id: 'c-3', venueId: 'v-2', name: 'Tennis Court A', type: 'Clay', pricePerHour: 600, available: true },
    { id: 'c-4', venueId: 'v-3', name: 'Badminton Court 1', type: 'Wooden Floor', pricePerHour: 350, available: true },
  ],

  bookings: [
    {
      id: 'BK-80066572',
      userId: 'u-101',
      userName: 'Rahul Sharma',
      venueId: 'v-1',
      venueName: 'Game Arena, Bodakdev',
      courtName: 'Court-1 Standard',
      date: '2026-09-20',
      timeSlot: '08:00 AM - 09:00 AM',
      amount: 400,
      status: 'confirmed',
      paymentMethod: 'UPI',
      createdAt: '2026-09-11',
    },
    {
      id: 'BK-80066573',
      userId: 'u-101',
      userName: 'Rahul Sharma',
      venueId: 'v-2',
      venueName: 'PlayZone, Vastrapur',
      courtName: 'Tennis Court A',
      date: '2026-09-22',
      timeSlot: '07:00 PM - 08:00 PM',
      amount: 600,
      status: 'confirmed',
      paymentMethod: 'Card',
      createdAt: '2026-09-10',
    },
  ],

  players: [
    {
      id: 'p-1',
      name: 'Smeet Badminton Fan',
      sport: 'Badminton',
      skillLevel: 'Intermediate',
      age: 24,
      distance: '5 km away',
      preferredDays: 'Weekdays',
      preferredTime: 'Evenings',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'p-2',
      name: 'Karan Tennis Pro',
      sport: 'Tennis',
      skillLevel: 'Advanced',
      age: 28,
      distance: '8 km away',
      preferredDays: 'Weekends',
      preferredTime: 'Mornings',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
  ],

  staff: [
    { id: 's-1', name: 'James Hall', role: 'Manager', shift: 'Morning', task: 'Court maintenance check', available: true },
    { id: 's-2', name: 'Ethna Clark', role: 'Supervisor', shift: 'Evening', task: 'Booking desk manager', available: true },
    { id: 's-3', name: 'Mia Scott', role: 'Court Host', shift: 'Morning', task: 'Player coordination', available: true },
  ],

  notifications: [
    { id: 'n-1', title: 'Booking Confirmed', message: 'Your booking for Game Arena is confirmed for Sep 20.', date: '2026-09-11', read: false },
    { id: 'n-2', title: 'Welcome to QuickCourt', message: 'Explore local courts and match up with players!', date: '2026-09-10', read: true },
  ],

  systemHealth: {
    serverStatus: 'healthy',
    dataProcessing: 'healthy',
    apiHealth: 'healthy',
    uptime: '99.98%',
    lastChecked: new Date().toISOString(),
  },
};

/**
 * Returns a safe public user object — never includes passwordHash.
 */
export function safeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Returns a safe public venue object — strips internal-only fields if any.
 * Currently venues have no private fields, but this helper keeps the pattern consistent.
 */
export function safeVenue(venue) {
  return venue;
}
