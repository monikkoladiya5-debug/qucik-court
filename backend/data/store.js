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
    {
      id: 'c-1',
      venueId: 'v-1',
      name: 'Badminton Court 1',
      sport: 'Badminton',
      courtType: 'Synthetic Mat',
      indoor: true,
      pricePerHour: 400,
      operatingHours: '06:00 AM - 11:00 PM',
      isActive: true, // active courts can be viewed; booking is Task 4
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    },
    {
      id: 'c-2',
      venueId: 'v-1',
      name: 'Badminton Court 2',
      sport: 'Badminton',
      courtType: 'Wooden Floor',
      indoor: true,
      pricePerHour: 450,
      operatingHours: '06:00 AM - 11:00 PM',
      isActive: true,
      createdAt: '2026-01-15T08:30:00.000Z',
      updatedAt: '2026-01-15T08:30:00.000Z',
    },
    {
      id: 'c-3',
      venueId: 'v-1',
      name: 'Pickleball Court 1',
      sport: 'Pickleball',
      courtType: 'Hard Court',
      indoor: true,
      pricePerHour: 350,
      operatingHours: '06:00 AM - 11:00 PM',
      isActive: true,
      createdAt: '2026-01-16T09:00:00.000Z',
      updatedAt: '2026-01-16T09:00:00.000Z',
    },
    {
      id: 'c-4',
      venueId: 'v-2',
      name: 'Tennis Court 1',
      sport: 'Tennis',
      courtType: 'Clay',
      indoor: false,
      pricePerHour: 600,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2026-02-06T10:00:00.000Z',
      updatedAt: '2026-02-06T10:00:00.000Z',
    },
    {
      id: 'c-5',
      venueId: 'v-2',
      name: 'Football Turf 1',
      sport: 'Football',
      courtType: 'Artificial Turf',
      indoor: false,
      pricePerHour: 1200,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2026-02-06T10:30:00.000Z',
      updatedAt: '2026-02-06T10:30:00.000Z',
    },
    {
      id: 'c-6',
      venueId: 'v-3',
      name: 'Badminton Court 1',
      sport: 'Badminton',
      courtType: 'Wooden Floor',
      indoor: true,
      pricePerHour: 350,
      operatingHours: '05:00 AM - 11:30 PM',
      isActive: true,
      createdAt: '2026-01-21T07:00:00.000Z',
      updatedAt: '2026-01-21T07:00:00.000Z',
    },
    {
      id: 'c-7',
      venueId: 'v-3',
      name: 'Basketball Court 1',
      sport: 'Basketball',
      courtType: 'Hardwood',
      indoor: true,
      pricePerHour: 500,
      operatingHours: '05:00 AM - 11:30 PM',
      isActive: true,
      createdAt: '2026-01-21T07:30:00.000Z',
      updatedAt: '2026-01-21T07:30:00.000Z',
    },
    {
      id: 'c-8',
      venueId: 'v-4',
      name: 'Badminton Court 1',
      sport: 'Badminton',
      courtType: 'BWF Pro Synthetic',
      indoor: true,
      pricePerHour: 500,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2025-11-16T08:00:00.000Z',
      updatedAt: '2025-11-16T08:00:00.000Z',
    },
    {
      id: 'c-9',
      venueId: 'v-4',
      name: 'Badminton Court 2',
      sport: 'Badminton',
      courtType: 'BWF Pro Synthetic',
      indoor: true,
      pricePerHour: 500,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2025-11-16T08:30:00.000Z',
      updatedAt: '2025-11-16T08:30:00.000Z',
    },
    {
      id: 'c-10',
      venueId: 'v-5',
      name: 'Tennis Court 1',
      sport: 'Tennis',
      courtType: 'Hard Court',
      indoor: false,
      pricePerHour: 700,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2026-03-02T09:00:00.000Z',
      updatedAt: '2026-03-02T09:00:00.000Z',
    },
    {
      id: 'c-11',
      venueId: 'v-5',
      name: 'Cricket Turf 1',
      sport: 'Cricket',
      courtType: 'AstroTurf',
      indoor: false,
      pricePerHour: 1000,
      operatingHours: '06:00 AM - 10:00 PM',
      isActive: true,
      createdAt: '2026-03-02T09:30:00.000Z',
      updatedAt: '2026-03-02T09:30:00.000Z',
    },
    {
      id: 'c-12',
      venueId: 'v-6',
      name: 'Badminton Court 1',
      sport: 'Badminton',
      courtType: 'Synthetic Mat',
      indoor: true,
      pricePerHour: 550,
      operatingHours: '06:00 AM - 09:00 PM',
      isActive: true,
      createdAt: '2026-04-13T08:00:00.000Z',
      updatedAt: '2026-04-13T08:00:00.000Z',
    },
    {
      id: 'c-13',
      venueId: 'v-6',
      name: 'Squash Court 1',
      sport: 'Squash',
      courtType: 'Glass Back',
      indoor: true,
      pricePerHour: 600,
      operatingHours: '06:00 AM - 09:00 PM',
      isActive: true,
      createdAt: '2026-04-13T08:30:00.000Z',
      updatedAt: '2026-04-13T08:30:00.000Z',
    },
  ],

  bookings: [
    {
      id: 'BK-80066572',
      userId: 'u-101',
      courtId: 'c-1',
      venueId: 'v-1',
      date: '2026-09-20',
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      pricePerHour: 400,
      totalPrice: 400,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      checkInToken: 'CHK-8006-6572-91A2',
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    },
    {
      id: 'BK-80066573',
      userId: 'u-101',
      courtId: 'c-4',
      venueId: 'v-2',
      date: '2026-09-22',
      startTime: '07:00 PM',
      endTime: '08:00 PM',
      pricePerHour: 600,
      totalPrice: 600,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'Card',
      checkInToken: 'CHK-8006-6573-44F1',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
  ],

  players: [
    {
      id: 'p-1',
      userId: null,
      name: 'Smeet Badminton Fan',
      sport: 'Badminton',
      skillLevel: 'Intermediate',
      city: 'Ahmedabad',
      distance: '5 km away',
      preferredDays: 'Weekdays',
      preferredTime: 'Evenings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Recreational badminton player looking for doubles practice partners in Ahmedabad.',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'p-2',
      userId: null,
      name: 'Karan Tennis Pro',
      sport: 'Tennis',
      skillLevel: 'Advanced',
      city: 'Ahmedabad',
      distance: '8 km away',
      preferredDays: 'Weekends',
      preferredTime: 'Mornings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Experienced tennis player seeking competitive singles and sparring sessions.',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-08-10T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'p-3',
      userId: 'u-101',
      name: 'Rahul Sharma',
      sport: 'Badminton',
      skillLevel: 'Intermediate',
      city: 'Ahmedabad',
      distance: '2 km away',
      preferredDays: 'Weekdays',
      preferredTime: 'Evenings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Badminton and tennis enthusiast looking for friendly evening matches.',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'p-4',
      userId: null,
      name: 'Anita Desai',
      sport: 'Pickleball',
      skillLevel: 'Beginner',
      city: 'Ahmedabad',
      distance: '3 km away',
      preferredDays: 'Weekends',
      preferredTime: 'Mornings',
      availabilityStatus: 'AVAILABLE',
      bio: 'New to pickleball and looking for casual doubles games and practice.',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
    },
    {
      id: 'p-5',
      userId: null,
      name: 'Rohan Joshi',
      sport: 'Football',
      skillLevel: 'Advanced',
      city: 'Mumbai',
      distance: '6 km away',
      preferredDays: 'Weekends',
      preferredTime: 'Evenings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Weekend football player looking for 5-a-side competitive matches.',
      imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-09-06T10:00:00.000Z',
      updatedAt: '2026-09-06T10:00:00.000Z',
    },
    {
      id: 'p-6',
      userId: null,
      name: 'Pooja Verma',
      sport: 'Squash',
      skillLevel: 'Intermediate',
      city: 'Pune',
      distance: '4 km away',
      preferredDays: 'Weekdays',
      preferredTime: 'Mornings',
      availabilityStatus: 'AVAILABLE',
      bio: 'Regular squash player looking for morning practice partners.',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-09-07T10:00:00.000Z',
      updatedAt: '2026-09-07T10:00:00.000Z',
    },
    {
      id: 'p-7',
      userId: null,
      name: 'Vikram Shah',
      sport: 'Tennis',
      skillLevel: 'Intermediate',
      city: 'Ahmedabad',
      distance: '7 km away',
      preferredDays: 'Weekdays',
      preferredTime: 'Afternoons',
      availabilityStatus: 'AVAILABLE',
      bio: 'Looking for weekday afternoon singles rallying sessions.',
      imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-09-08T10:00:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
    },
  ],

  matchInvites: [
    {
      id: 'inv-1',
      senderId: 'u-101',
      senderName: 'Rahul Sharma',
      receiverPlayerId: 'p-1',
      receiverName: 'Smeet Badminton Fan',
      sport: 'Badminton',
      date: '2026-09-28',
      startTime: '07:00 PM',
      endTime: '08:00 PM',
      venueName: 'Game Arena',
      message: 'Hey Smeet, up for a doubles match next Monday?',
      status: 'PENDING',
      createdAt: '2026-09-14T12:00:00.000Z',
    },
  ],

  playerReports: [],

  playerBlocks: [],

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

/**
 * Returns a safe public court object.
 */
export function safeCourt(court) {
  if (!court) return null;
  return {
    id: court.id,
    venueId: court.venueId,
    name: court.name,
    sport: court.sport,
    courtType: court.courtType,
    indoor: Boolean(court.indoor),
    pricePerHour: Number(court.pricePerHour),
    operatingHours: court.operatingHours,
    isActive: Boolean(court.isActive),
    createdAt: court.createdAt,
    updatedAt: court.updatedAt,
  };
}

/**
 * Returns a safe customer booking object with enriched venue/court metadata.
 */
export function safeBooking(booking) {
  if (!booking) return null;
  const court = store.courts.find((c) => c.id === booking.courtId);
  const venue = store.venues.find((v) => v.id === (booking.venueId || court?.venueId));

  const isConfirmed = ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(booking.status);

  let durationHours = 1;
  if (booking.startTime && booking.endTime) {
    const matchStart = booking.startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const matchEnd = booking.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (matchStart && matchEnd) {
      let sH = parseInt(matchStart[1], 10);
      if (matchStart[3].toUpperCase() === 'PM' && sH !== 12) sH += 12;
      if (matchStart[3].toUpperCase() === 'AM' && sH === 12) sH = 0;
      let eH = parseInt(matchEnd[1], 10);
      if (matchEnd[3].toUpperCase() === 'PM' && eH !== 12) eH += 12;
      if (matchEnd[3].toUpperCase() === 'AM' && eH === 12) eH = 0;
      if (eH > sH) durationHours = eH - sH;
    }
  }

  return {
    id: booking.id,
    userId: booking.userId,
    courtId: booking.courtId,
    venueId: booking.venueId || court?.venueId || null,
    courtName: court ? court.name : (booking.courtName || 'Court'),
    sport: court ? court.sport : (booking.sport || 'Sports'),
    venueName: venue ? venue.name : (booking.venueName || 'Venue'),
    venueLocation: venue ? venue.location : '',
    venueCity: venue ? venue.city : '',
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationHours,
    pricePerHour: Number(booking.pricePerHour || court?.pricePerHour || 0),
    totalPrice: Number(booking.totalPrice || 0),
    status: booking.status,
    paymentStatus: booking.paymentStatus || 'PENDING',
    ...(booking.paymentMethod ? { paymentMethod: booking.paymentMethod } : {}),
    ...(booking.cancellationReason ? { cancellationReason: booking.cancellationReason } : {}),
    ...(booking.cancellationNote ? { cancellationNote: booking.cancellationNote } : {}),
    ...(booking.cancelledAt ? { cancelledAt: booking.cancelledAt } : {}),
    ...(isConfirmed && booking.checkInToken ? { checkInToken: booking.checkInToken } : {}),
    ...(booking.checkedInAt ? { checkedInAt: booking.checkedInAt } : {}),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

/**
 * Computes deterministic player trust and activity statistics from real booking & check-in records.
 */
export function calculatePlayerTrust(player) {
  if (!player) return null;

  const bookings = player.userId && store.bookings
    ? store.bookings.filter((b) => b.userId === player.userId)
    : [];

  const completedGames = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CHECKED_IN').length;
  const checkIns = bookings.filter((b) => b.status === 'CHECKED_IN' || Boolean(b.checkedInAt) || b.status === 'COMPLETED').length;
  const cancellations = bookings.filter((b) => b.status === 'CANCELLED').length;
  const totalBookings = bookings.length;

  // No-shows: confirmed bookings that passed scheduled end time without check-in
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  const noShows = bookings.filter((b) => {
    if (b.status !== 'CONFIRMED' && b.status !== 'PAID') return false;
    if (b.checkedInAt || b.status === 'CHECKED_IN' || b.status === 'COMPLETED') return false;
    if (!b.date || !b.endTime) return false;

    if (b.date < todayStr) return true;
    if (b.date === todayStr) {
      const matchEnd = b.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (matchEnd) {
        let eH = parseInt(matchEnd[1], 10);
        if (matchEnd[3]?.toUpperCase() === 'PM' && eH !== 12) eH += 12;
        if (matchEnd[3]?.toUpperCase() === 'AM' && eH === 12) eH = 0;
        if (eH <= currentHour) return true;
      }
    }
    return false;
  }).length;

  let trustLabel = 'Limited History';
  if (completedGames >= 5 || checkIns >= 5) {
    trustLabel = 'Reliable Player';
  } else if (completedGames >= 1 || checkIns >= 1) {
    trustLabel = 'Active Player';
  } else if (totalBookings > 0) {
    trustLabel = 'New Player';
  } else {
    trustLabel = 'Limited History';
  }

  return {
    trustLabel,
    totalBookings,
    completedGames,
    checkIns,
    cancellations,
    noShows,
    memberSince: player.createdAt || null,
  };
}

/**
 * Returns a safe customer-facing player object.
 * Strips passwordHash, email, phone, age, and internal IDs per data minimization rules.
 */
export function safePlayer(player, currentUserId = null) {
  if (!player) return null;

  const trustSummary = calculatePlayerTrust(player);

  let isBlocked = false;
  if (currentUserId && store.playerBlocks) {
    isBlocked = store.playerBlocks.some(
      (b) =>
        b.blockerId === currentUserId &&
        (b.targetPlayerId === player.id || (player.userId && b.targetUserId === player.userId))
    );
  }

  return {
    id: player.id,
    name: player.name,
    sport: player.sport,
    skillLevel: player.skillLevel,
    city: player.city || 'Ahmedabad',
    preferredDays: player.preferredDays || 'Flexible',
    preferredTime: player.preferredTime || 'Flexible',
    availabilityStatus: player.availabilityStatus || 'AVAILABLE',
    bio: player.bio || '',
    distance: player.distance || '',
    imageUrl: player.imageUrl || null,
    trustSummary,
    isBlocked,
    ...(player.matchScore !== undefined ? { matchScore: player.matchScore } : {}),
    ...(player.matchReasons ? { matchReasons: player.matchReasons } : {}),
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

