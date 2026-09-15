# QuickCourt V1 — Project Context & Memory
## 1. Current Status
- **Current Phase**: Phase 25 — Final Hackathon Polish & Submission Prep (**COMPLETE**)
- **Last Completed Phase**: Phase 25 — Final Hackathon Polish & Submission Prep
- **Milestone Audit (0–25)**: **PASSED** (Full 609/609 regression suite passed across 135 suites)
- **Backend Test Baseline**: 609 / 609 passing tests across 135 suites (`node --test`)
- **Frontend Build Status**: Production build passing (`vite build` 0 errors, 1592 modules transformed in 5.61s)
- **Status**: Ready for Final Hackathon Demonstration

---

## 2. Architecture & System Invariants
- **Frontend Stack**: React 18, Vite 5, Tailwind CSS 3, React Router DOM v6, Lucide React
- **Backend Stack**: Node.js (ESM), Express 4 REST API
- **Data Persistence**: In-Memory JavaScript Store (`backend/data/store.js`) — resets on server restart (approved V1 constraint)
- **Authentication**: Stateless JWT (`jsonwebtoken`, `bcryptjs`), 7-day expiry
- **Server Hardening**: `app.disable('x-powered-by')`, JSON body parsing limit `1mb`, standard security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`), active suspended-user session revocation (403 Forbidden).
- **Roles & RBAC**:
  - `CUSTOMER`: Venue discovery, booking requests, payments, passes, matchmaking, personal profile/trust, reviews, gamification progress.
  - `OWNER`: Venue/court management, booking approval/rejection, pass verification & check-in, owner pricing intelligence, venue review feed.
  - `ADMIN`: Platform intelligence, system telemetry, user active/suspended status management, venue verification, review & gamification telemetry.
- **Authoritative Server**: All price calculations, booking states, tokens, QR payloads, demand signals, reviews, and achievements are strictly server-authoritative.

---

## 3. Core Booking & Payment Lifecycle

```
REQUESTED ──(Owner Approve)──► APPROVED / PAYMENT_PENDING ──(Customer Pay)──► CONFIRMED / PAID ──(Owner Check-in)──► CHECKED_IN ──► COMPLETED
    │                                   │
(Reject)                          (Cancel/Expire)
    ▼                                   ▼
 REJECTED                            CANCELLED
```

- **Payment Methods**: `UPI`, `CARD`, `PAY_AT_VENUE`
- **Payment States**: `PENDING`, `PAID`, `FAILED`, `REFUNDED`
- **Payment Transitions**:
  - Online (`UPI`/`CARD`): `APPROVED` $\to$ `PAYMENT_PENDING` $\to$ `CONFIRMED` + `PAID`
  - Pay at Venue: `APPROVED` $\to$ `CONFIRMED` + `PENDING`
  - Cancellation of Paid Booking: Transitions to `CANCELLED` + `REFUNDED`
  - Cancellation of Pay at Venue: Transitions to `CANCELLED` + `PENDING` (no false online refund)

---

## 4. Completed Phases Summary (Phase 0 — Phase 25)

| Phase | Core Features & Business Rules | Primary Endpoints | Key Files |
|---|---|---|---|
| **0: Freeze** | Architectural lock: React + Node + In-Memory store | `/api/health` | `store.js`, `server.js` |
| **1: UI/UX** | Kinetic Obsidian theme (#0B0F17 canvas, Lime, Emerald) | N/A | `index.css`, `tailwind.config.js` |
| **2: Lifecycle** | Booking state machine, transition validator | `/api/bookings` | `bookingStates.js`, `bookingController.js` |
| **3: Availability**| Multi-hour deterministic hourly availability slots | `/api/courts/:id/availability` | `courtController.js` |
| **4: Search** | NLP Smart Search parser (sport, city, indoor, pricing) | `/api/venues` | `venueController.js`, `VenuesPage.jsx` |
| **5: Recs** | Deterministic score based on sports, history, city | `/api/venues/recommendations` | `venueController.js` |
| **6: Booking** | Contiguous slot picker, price = duration * rate | `POST /api/bookings` | `VenueDetailPage.jsx`, `bookingController.js` |
| **7: Owner Ops** | Isolated venue/court metrics, schedule view | `/api/owner/dashboard` | `ownerController.js`, `OwnerDashboardPage.jsx` |
| **8: Courts** | Court CRUD, maintenance toggle disables slots | `/api/courts` | `courtController.js`, `OwnerVenuesPage.jsx` |
| **9: Payments** | Idempotent payment processing (UPI, Card, Venue) | `POST /api/bookings/:id/pay` | `bookingController.js`, `paymentModal.jsx` |
| **10: Pass & QR** | Server-generated Booking ID, check-in token, QR pass | `GET /api/bookings/:id` | `bookingController.js`, `MyBookingsPage.jsx` |
| **11: Check-in** | Single-use check-in verification, duplicate lock | `POST /api/bookings/:id/check-in` | `bookingController.js`, `OwnerDashboardPage.jsx` |
| **12: Matchmaking**| Find Players directory, skill/sport filters, invites | `/api/players` | `playerController.js`, `PlayersPage.jsx` |
| **13: Trust** | Trust badge, two-way blocking, report violations | `/api/players/:id/trust` | `playerController.js`, `store.js` |
| **14: Cancel/Resched**| Cancellation reasons, refund states, slot release | `/api/bookings/:id/cancel` | `bookingController.js`, `MyBookingsPage.jsx` |
| **15: Notifs** | Transactional event notifications, unread sync | `/api/notifications` | `notificationController.js`, `NotificationsPage.jsx` |
| **16: Pricing** | Smart pricing advisory, market comparison | `/api/pricing/advisory` | `pricingController.js`, `OwnerPricingPage.jsx` |
| **17: Best Time** | Best time to play recommendations, demand radar | `/api/pricing/best-time` | `pricingController.js`, `VenueDetailPage.jsx` |
| **18: Platform Intel**| Admin analytics, revenue telemetry, health radar | `/api/admin/platform-intelligence` | `adminController.js`, `AdminDashboardPage.jsx` |
| **19: Venue Trust** | Partner verification, admin moderation, badges | `/api/admin/venues/:id/verification`| `adminController.js`, `VenueCard.jsx` |
| **20: Reviews** | Verified player reviews, 1-5 integer ratings, dynamic average & count, duplicate protection | `POST /api/reviews`, `GET /api/reviews/venue/:id` | `reviewController.js`, `reviews.js`, `VenueDetailPage.jsx` |
| **21: Gamification**| Deterministic sports achievements, check-in milestones, multi-sport badges, match invites | `GET /api/players/me/gamification` | `store.js`, `playerController.js`, `ProfilePage.jsx` |
| **22: Security & Edge-Cases**| Full security hardening, BOLA/IDOR audit, suspended user revocation, header security, price authority | `/api/*` | `server.js`, `authenticate.js`, `venueController.js`, `phase22_security_edgecases.test.js` |
| **23: Full Integration**| Cross-phase end-to-end user journeys, master customer/owner/admin flows, multi-hour bookings, pass/check-in/reviews consistency | `/api/*` | `phase23_full_integration.test.js`, `verify_phase23_runtime.mjs` |
| **24: Responsive & Accessibility QA**| Viewport responsiveness (320px–1920px), Escape/focus modal trap management, prefers-reduced-motion, mobile drawer, touch targets | `/api/*`, CSS | `index.css`, `CourtFormModal.jsx`, `OwnerVenuesPage.jsx`, `phase24_responsive_accessibility.test.js` |
| **25: Final Hackathon Polish**| Final UI & UX polish, demo flow clarity, loading/empty/error states, end-to-end demo reliability | Full Stack | `phase25_final_polish.test.js`, `milestone_0_24_master_e2e.mjs` |

---

## 5. Kinetic Obsidian UI Design System Tokens
- **Backgrounds**: Canvas `#0B0F17` (Obsidian), Surfaces `#111827`, Cards `#1F2937`
- **Primary Accent**: Electric Lime (`#CCFF00` / `#A3E635`) for interactive buttons & hero badges
- **Status Accent**: Emerald (`#10B981` / `#059669`) for confirmed, paid, checked-in, and verified states
- **Rating & Badges Accent**: Amber (`#FBBF24` / `#F59E0B`) for star ratings, badges, breakdown distribution bars, and score tags
- **Typography**: Plus Jakarta Sans (body/headings), JetBrains Mono (Booking IDs, check-in tokens, timestamps, rates)
- **Constraint**: Sports-focused, authentic imagery, accessible contrast, no gimmicky neon/AI tropes, no casino/gambling mechanics.

---

## 6. Critical Security & Isolation Invariants
1. **RBAC & Privilege Separation**:
   - Strict role checks (`CUSTOMER`, `OWNER`, `ADMIN`).
   - Unauthenticated requests return `401 Unauthorized`.
   - Authenticated wrong role returns `403 Forbidden`.
   - Suspended user tokens return `403 Forbidden` immediately on active requests.
2. **BOLA / IDOR Protection**:
   - Customers can only access their own bookings, notifications, reviews, and profile/gamification data.
   - Customers can only review their own `COMPLETED` bookings (403 if attempting to review another player's booking).
   - Server strictly derives `customerId`, `venueId`, and `courtId` from authoritative booking records (client payload cannot inject or override).
   - Owners can only access, modify, or verify bookings/courts/venues/reviews that belong to their facilities (`venue.ownerId === req.user.id`).
3. **Price Authority & Booking Integrity**:
   - Total price is authoritatively computed by the server: `hourlyRate * durationHours`. Client-submitted `price`, `totalPrice`, or `hourlyRate` values are completely ignored.
   - Slot conflicts are strictly rejected with `409 Conflict`.
   - Inactive courts and suspended/rejected venues reject booking creation with `400 Bad Request`.
4. **Payment State Machine & Idempotency**:
   - Payment cannot occur before owner approval (`REQUESTED` state rejected with 400).
   - Payment cannot occur after cancellation or completion.
   - Pay at Venue yields `status: CONFIRMED, paymentStatus: PENDING` without false payment receipts.
   - Online payment yields `status: CONFIRMED, paymentStatus: PAID`.
5. **Check-In Token & QR Security**:
   - Check-in tokens are generated server-side using cryptographic randomness (`CHK-XXXX-XXXX-XXXX`).
   - Cancelled or unapproved bookings reject check-in verification with 400.
   - Check-in is single-use; duplicate check-in attempts return 400.
6. **Data Minimization & Privacy**:
   - Zero exposure of `passwordHash`, user phone numbers, or private emails in public player listings, review feeds, or venue cards.
   - Admin internal notes and `verifiedBy` IDs are stripped in public customer venue serializers.
7. **Server Hardening**:
   - `x-powered-by` header disabled to prevent fingerprinting.
   - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0` headers set on all responses.
   - Body parser limit restricted to `1mb` to prevent memory starvation DoS.

---

## 7. Architecture Limitations (In-Memory JavaScript Store)
- **Restart Persistence**: Data resets when the Node.js process restarts (V1 approved hackathon constraint).
- **Multi-Process Consistency**: In-memory conflict checks are authoritative for a single Node.js event-loop process, but do not provide distributed locking or transactions across a multi-process cluster.
- **Production Concurrency**: In-memory arrays are synchronous and race-free on single Node.js event loop, but would require transactional ACID database (PostgreSQL/Redis) for distributed production deployments.

---

## 8. Final Status
- QuickCourt V1 is complete through Phase 25 (Final Hackathon Polish).
- All 609 regression tests passing.
- Frontend production build passing with zero errors.


