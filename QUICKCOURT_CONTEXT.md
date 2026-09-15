# QuickCourt V1 — Project Context & Memory

## 1. Current Status
- **Current Phase**: Phase 19 — Venue Trust & Verification (**COMPLETE**)
- **Last Completed Phase**: Phase 19 — Venue Trust & Verification
- **Milestone Audit (0–18)**: **PASSED** (Full 45-scenario milestone verification passed)
- **Backend Test Baseline**: 448 / 448 passing tests across 82 suites (`node --test`)
- **Frontend Build Status**: Production build passing (`vite build` 0 errors)
- **Next Phase**: Phase 20 — Reviews & Ratings

---

## 2. Architecture & System Invariants
- **Frontend Stack**: React 18, Vite 5, Tailwind CSS 3, React Router DOM v6, Lucide React
- **Backend Stack**: Node.js (ESM), Express 4 REST API
- **Data Persistence**: In-Memory JavaScript Store (`backend/data/store.js`) — resets on server restart (approved V1 constraint)
- **Authentication**: Stateless JWT (`jsonwebtoken`, `bcryptjs`), 7-day expiry
- **Roles & RBAC**:
  - `CUSTOMER`: Venue discovery, booking requests, payments, passes, matchmaking, personal profile/trust.
  - `OWNER`: Venue/court management, booking approval/rejection, pass verification & check-in, owner pricing intelligence.
  - `ADMIN`: Platform intelligence, system telemetry, user active/suspended status management.
- **Authoritative Server**: All price calculations, booking states, tokens, QR payloads, and demand signals are strictly server-authoritative.

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

## 4. Completed Phases Summary (Phase 0 — Phase 18)

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
| **11: Check-In** | QR/Token verification & atomic check-in | `POST /api/bookings/:id/check-in` | `bookingController.js`, `OwnerDashboardPage.jsx` |
| **12: Matchmaking**| Player discovery, match invites, self-exclusion | `/api/players`, `/api/players/:id/invite` | `playerController.js`, `PlayersPage.jsx` |
| **13: Trust/Safety**| Activity-derived trust score, reporting, block list | `/api/players/:id/trust`, `/report`, `/block` | `playerController.js` |
| **14: Cancel/Resch**| Terminal state protection, instant slot release, no-show | `/api/bookings/:id/cancel`, `/reschedule` | `bookingController.js` |
| **15: Notifs** | Transactional event notifications for player & owner | `/api/notifications`, `/read-all` | `notificationController.js`, `NotificationsPage.jsx` |
| **16: Pricing** | Price comparison table, Best Price/Value, owner intel | `/api/pricing/compare`, `/owner/pricing-intelligence`| `pricingController.js`, `CourtPriceComparison.jsx` |
| **17: Best Time** | Contiguous slot advisor, peak/off-peak classification | `/api/pricing/best-times` | `pricingController.js`, `BestTimeToPlayAdvisor.jsx` |
| **18: Admin Intel**| Platform telemetry, fleet utilization, 18hr histogram | `/api/admin/platform-intelligence` | `adminController.js`, `AdminDashboardPage.jsx` |
| **19: Trust/Verify**| Authoritative venue verification, verified badge, moderation | `GET/PATCH /api/admin/venues/verification` | `adminController.js`, `bookingController.js`, `AdminDashboardPage.jsx` |

---

## 5. Kinetic Obsidian UI Design System Tokens
- **Backgrounds**: Canvas `#0B0F17` (Obsidian), Surfaces `#111827`, Cards `#1F2937`
- **Primary Accent**: Electric Lime (`#CCFF00` / `#A3E635`) for interactive buttons & hero badges
- **Status Accent**: Emerald (`#10B981` / `#059669`) for confirmed, paid, checked-in, and verified states
- **Typography**: Plus Jakarta Sans (body/headings), JetBrains Mono (Booking IDs, check-in tokens, timestamps, rates)
- **Constraint**: Sports-focused, authentic imagery, accessible contrast, no gimmicky neon/AI tropes.

---

## 6. Critical Security & Isolation Invariants
1. **RBAC**: Strict role checks (`CUSTOMER`, `OWNER`, `ADMIN`). Unauthenticated $\to$ 401, Unauthorized $\to$ 403.
2. **BOLA / IDOR Protection**:
   - Customers can only access their own bookings, notifications, and profile data.
   - Owners can only access, modify, or verify bookings/courts/venues that belong to them (`venue.ownerId === req.user.id`).
3. **Price Integrity**: Client price parameters are ignored; total price is calculated server-side from `court.pricePerHour * durationHours`.
4. **Data Minimization**: Passwords, `passwordHash`, and private moderation records (`verifiedBy`, `verificationNote`) are excluded from customer-facing API serializations.
5. **Venue Verification Transitions**: Strict controlled state transitions (`PENDING` $\to$ `VERIFIED`/`REJECTED`, `VERIFIED` $\to$ `SUSPENDED`, `REJECTED`/`SUSPENDED` $\to$ `VERIFIED`) with required moderation notes for rejection/suspension.

---

## 7. Recent Regressions & Solutions
- **Owner Dashboard Pricing Payload**: Fixed payload property access to match `{ status: 'ok', pricingIntelligence: [...] }`.
- **Notifications Component Import**: Fixed missing icon import (`ChevronRight`) in [NotificationsPage.jsx](file:///c:/Users/kolad/Pictures/lifelink/quick-court/frontend/src/pages/NotificationsPage.jsx).
- **Backend Daemon Sync**: Restarted background daemon whenever new Express routes are registered.

---

## 8. Current Next Phase (Phase 20 Preview)
- **Title**: Phase 20 — Reviews & Ratings
- **Goal**: Player post-match reviews, verified booking feedback, host response flow, and facility ratings aggregation.
- **Rule**: Inspect ONLY files relevant to Phase 20 when initiated. Do NOT scan the entire repository.
