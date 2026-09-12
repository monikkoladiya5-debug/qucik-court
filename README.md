# QuickCourt V1 — Sports Court Booking Platform

A full-stack sports court discovery, reservation, and facility management platform built for players, venue owners, and platform administrators. Built with **React 18 + Vite + Tailwind CSS** on the frontend, and **Node.js + Express** with an **in-memory data store** on the backend.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Getting Started (Local Development)](#getting-started-local-development)
   - [1. Backend Setup](#1-backend-setup)
   - [2. Frontend Setup](#2-frontend-setup)
7. [Environment & Configuration](#environment--configuration)
8. [Demo Credentials & User Roles](#demo-credentials--user-roles)
9. [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
10. [Comprehensive V1 Feature Guide](#comprehensive-v1-feature-guide)
    - [Customer Experience](#customer-experience)
    - [Venue & Court Management](#venue--court-management)
    - [Booking Engine](#booking-engine)
    - [Player Community & Profiles](#player-community--profiles)
    - [Dynamic Loyalty Points](#dynamic-loyalty-points)
    - [Owner Analytics Dashboard](#owner-analytics-dashboard)
    - [Admin Telemetry Dashboard](#admin-telemetry-dashboard)
    - [UX Hardening & Accessibility](#ux-hardening--accessibility)
11. [Security & Data Integrity](#security--data-integrity)
12. [Automated Testing](#automated-testing)
13. [Production Build](#production-build)
14. [Important V1 Operational Details & Limitations](#important-v1-operational-details--limitations)

---

## Platform Overview

QuickCourt connects athletes and sports enthusiasts with top-tier athletic facilities (badminton courts, tennis clubs, football turfs, basketball courts, and pickleball arenas) across their city.

The platform provides dedicated, role-tailored experiences:
- **Customers / Players**: Discover venues, check real-time court availability, book hourly slots, track booking history, manage profiles, connect with local players, and earn loyalty points.
- **Venue Owners**: List sports venues, configure courts and operating hours, toggle court active/inactive status, manage reservations, and inspect facility metrics and revenue in an isolated analytics dashboard.
- **Platform Administrators**: Supervise system telemetry, monitor platform-wide metrics (users, venues, courts, bookings, revenue), review facilities, and manage user account active/suspended statuses with privileged-field protection and accessible dialogs.

---

## Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 18 (`react`, `react-dom`) | Modern component-based UI with hooks and Context API |
| **Build & Tooling** | Vite 5 | High-performance build tool, HMR, and development server |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer | Athletic modern aesthetic, glassmorphism, responsive utilities |
| **Icons** | Lucide React | Lightweight, consistent SVG icon set |
| **Client Routing** | React Router DOM v6 | Single-page client routing with protected route boundaries |
| **Backend Framework** | Node.js (v18+ / v20+ / v22+), Express 4 | Modular RESTful API routing, centralized error handling |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` | Stateless bearer token auth with bcrypt password hashing |
| **Data Storage** | In-Memory JavaScript Data Store | Fast in-memory state with comprehensive pre-seeded entities |
| **Test Runner** | Node.js Native Test Runner (`node --test`) | Zero-dependency, blazing fast automated test suite |

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│             React 18 + Tailwind CSS (SPA)             │
│                 http://localhost:5173                  │
└───────────────────────────┬────────────────────────────┘
                            │ (Proxied /api requests)
                            ▼
┌────────────────────────────────────────────────────────┐
│                Express REST API Server                 │
│                 http://localhost:4000                  │
│                                                        │
│  ├── /api/auth       (Customer, Owner, Admin auth)     │
│  ├── /api/venues     (Public discovery & Owner CRUD)   │
│  ├── /api/courts     (Court specs & date availability) │
│  ├── /api/bookings   (Authoritative booking engine)    │
│  ├── /api/players    (Player directory & profiles)     │
│  ├── /api/profile    (Customer profile management)     │
│  ├── /api/loyalty    (Dynamic loyalty points calculation)
│  ├── /api/owner      (Owner dashboard & metrics)       │
│  ├── /api/admin      (Admin dashboard & user status)   │
│  ├── /api/health     (System health telemetry)         │
│  └── /api/summary    (Platform summary stats)          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            In-Memory JavaScript Store                  │
│  (Users, Venues, Courts, Bookings, Players, Profiles)  │
│  * Note: Data intentionally resets on server restart   │
└────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
quick-court/
├── backend/
│   ├── config/
│   │   └── auth.js             # Auth secrets, expiry, roles, and demo configs
│   ├── controllers/            # Route business logic handlers
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── courtController.js
│   │   ├── loyaltyController.js
│   │   ├── ownerController.js
│   │   ├── playerController.js
│   │   ├── profileController.js
│   │   └── venueController.js
│   ├── data/
│   │   ├── seed.js             # Seed data structures
│   │   └── store.js            # In-memory database store & password hashing
│   ├── middleware/             # Shared Express middlewares
│   │   ├── auth.js             # JWT verification & user attachment
│   │   ├── errorHandler.js     # Centralized error formatting
│   │   └── rbac.js             # Role-based authorization middleware
│   ├── routes/                 # Express route definitions
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── courts.js
│   │   ├── health.js
│   │   ├── loyalty.js
│   │   ├── owner.js
│   │   ├── players.js
│   │   ├── profile.js
│   │   ├── rbac.js
│   │   └── venues.js
│   ├── test/                   # Automated backend test suites (180 tests)
│   │   ├── regression.test.js
│   │   ├── task3_courts.test.js
│   │   ├── task4_bookings.test.js
│   │   ├── task5_players.test.js
│   │   ├── task6_loyalty_profile.test.js
│   │   ├── task7_owner_dashboard.test.js
│   │   ├── task8_admin_dashboard.test.js
│   │   └── task10_coverage.test.js
│   ├── package.json
│   └── server.js               # Backend entry point
│
├── frontend/
│   ├── dist/                   # Production build output
│   ├── src/
│   │   ├── components/         # Reusable UI components (Header, Footer, ProtectedRoute, etc.)
│   │   ├── context/            # React AuthContext provider
│   │   ├── data/               # Static frontend seeds & references
│   │   ├── pages/              # Application views
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── MyBookingsPage.jsx
│   │   │   ├── OwnerDashboardPage.jsx
│   │   │   ├── OwnerVenuesPage.jsx
│   │   │   ├── PlayersPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── VenueDetailPage.jsx
│   │   │   └── VenuesPage.jsx
│   │   ├── services/
│   │   │   └── api.js          # Client API abstraction & request helper
│   │   ├── utils/
│   │   │   └── date.js         # Timezone-safe date formatting utilities
│   │   ├── App.jsx             # Top-level router & navigation setup
│   │   ├── index.css           # Tailwind base styles
│   │   └── main.jsx            # React root mount
│   ├── index.html              # HTML shell
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js          # Vite config with /api proxy to localhost:4000
│
├── .gitignore
└── README.md                   # This documentation
```

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or later (tested on Node.js v20 and v22)
- **npm**: `v9.0.0` or later (included with modern Node.js distributions)

Check your versions:
```bash
node -v
npm -v
```

---

## Getting Started (Local Development)

Running QuickCourt locally requires starting both the backend API server and the frontend Vite development server.

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
npm install
npm start
```

For automatic server reload during backend development:
```bash
npm run dev
```

- **Backend API URL**: `http://localhost:4000`
- **Health Check Endpoint**: `http://localhost:4000/api/health`
- **Telemetry Summary**: `http://localhost:4000/api/summary`

### 2. Frontend Setup

In a second terminal window, navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

- **Frontend Dev URL**: `http://localhost:5173`

The Vite development server is pre-configured with a reverse proxy (`/api` requests are forwarded to `http://localhost:4000`), preventing CORS issues during local development.

---

## Environment & Configuration

All environment variables have sensible defaults for instant local development out-of-the-box. If desired, you can configure them via environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `4000` | Port on which the Express backend listens |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for Cross-Origin Resource Sharing |
| `JWT_SECRET` | `qc-dev-secret-2026-change-in-prod` | Secret key used to sign and verify JSON Web Tokens |

---

## Demo Credentials & User Roles

QuickCourt comes pre-seeded with authorized accounts for every role:

| Role | Name | Email | Password | Verification Code |
|---|---|---|---|---|
| **CUSTOMER** | Rahul Sharma | `user@quickcourt.com` | `customer123` | *N/A* |
| **OWNER (Primary)** | Vikram Patel | `owner@quickcourt.com` | `owner123` | *N/A* |
| **OWNER (Secondary)** | Priya Mehta | `owner2@quickcourt.com` | `owner2pass` | *N/A* |
| **ADMIN** | Platform Administrator | `admin@quickcourt.com` | `admin123` | `QC-ADMIN-2026` |

> **Note for Admin Login**: To log in as an administrator, enter `admin@quickcourt.com`, `admin123`, and the required Admin Verification Code: **`QC-ADMIN-2026`**.

---

## Role-Based Access Control (RBAC) Matrix

QuickCourt enforces role boundaries at two levels:
1. **Authoritative Backend Middleware**: `authenticateToken` validates the JWT bearer token, and `requireRole(...)` verifies role permissions before executing any endpoint.
2. **Client-Side Protected Routes**: `ProtectedRoute` checks the authenticated user's role in `AuthContext` and blocks unauthorized UI access.

| Resource / Action | Public / Guest | Customer | Owner | Admin |
|---|:---:|:---:|:---:|:---:|
| Browse Venues & Courts | ✅ | ✅ | ✅ | ✅ |
| Check Court Availability by Date | ✅ | ✅ | ✅ | ✅ |
| Book a Court Slot | ❌ | ✅ | ❌ | ❌ |
| View Own Bookings (`/my-bookings`) | ❌ | ✅ | ❌ | ❌ |
| Cancel Own Booking | ❌ | ✅ | ❌ | ❌ |
| Player Community Directory (`/players`) | ❌ | ✅ | ❌ | ❌ |
| Customer Profile & Loyalty (`/profile`) | ❌ | ✅ | ❌ | ❌ |
| Manage Venues & Courts (`/owner/venues`)| ❌ | ❌ | ✅ (Own Only)| ❌ |
| Owner Analytics Dashboard (`/owner/dashboard`)| ❌ | ❌ | ✅ (Own Only)| ❌ |
| Admin Platform Dashboard (`/admin/dashboard`)| ❌ | ❌ | ❌ | ✅ |
| Toggle User Status (Active / Suspended) | ❌ | ❌ | ❌ | ✅ |

---

## Comprehensive V1 Feature Guide

### Customer Experience
- **Athletic Discovery**: High-contrast, dynamic sports hero showcase on the home page with live venue cards and platform telemetry.
- **Venue Search & Filtering**: Filter venues by sport (Badminton, Tennis, Football, Basketball, Pickleball), city, indoor vs. outdoor, or keyword search.
- **Venue Details**: High-resolution image galleries, court specifications, pricing per hour, amenities (parking, showers, lighting), operating hours, and location information.
- **Court Availability Inspector**: Interactive date picker allowing customers to check hourly slot availability for any future date.

### Venue & Court Management
- **Facility CRUD**: Authenticated facility owners can create new venues, modify venue details, update court specifications, and remove venues.
- **Court Configuration**: Set sport category, surface type, hourly rate (₹), operating hours, and toggle courts between `active` and `inactive` states.
- **Tenant Isolation**: Strict BOLA (Broken Object Level Authorization) controls ensure that Owner 1 can never modify, view private telemetry of, or delete venues/courts owned by Owner 2.

### Booking Engine
- **Server-Authoritative Pricing**: Total booking prices are computed strictly on the backend (`pricePerHour × duration`). Any client-side price tampering is ignored.
- **Conflict Prevention**: Overlap detection prevents double-booking the same court on the same date and time slot.
- **Operating Hours Validation**: Slots outside court operating hours (or across midnight boundaries) are rejected.
- **Past-Date Rejection**: Validates that reservations cannot be scheduled for past dates or elapsed hours.
- **Inactive Court Safeguard**: Bookings on courts flagged as `inactive` are strictly rejected.
- **Cancellation Flow**: Customers can cancel their own confirmed reservations. Repeated cancellations or cancellation of other users' bookings are strictly forbidden.

### Player Community & Profiles
- **Player Directory**: Authenticated customers can browse nearby players, search by skill level (Beginner, Intermediate, Advanced, Pro), and filter by preferred sports.
- **Profile Customization**: Update display name/name, phone number, preferred sports, and avatar URL. Protected fields such as ID, email, role, and loyalty points remain read-only and server-protected.
- **Data Minimization**: Private authentication details (password hashes, tokens) are stripped from public player responses.

### Dynamic Loyalty Points
- **Automated Calculation**: Real-time server-side point accrual:
  - **+10 points** awarded for every completed/confirmed booking.
  - **0 points** awarded for cancelled bookings.
- **Tier Progression**: Dynamic tier classification based on total accumulated points:
  - **Bronze**: 0 – 99 points
  - **Silver**: 100 – 249 points
  - **Gold**: 250 – 499 points
  - **Platinum**: 500+ points
- **History Ledger**: Chronological transaction history tracking point accruals and booking associations.

### Owner Analytics Dashboard
- **Dedicated Facility Telemetry**: Live dashboard at `/owner/dashboard` summarizing total venues, total courts, active courts, total bookings, confirmed vs. cancelled counts, and gross revenue.
- **Strict Revenue Derivation**: Revenue is authoritatively calculated strictly from `CONFIRMED` bookings; cancelled bookings contribute ₹0.
- **Cross-Owner Isolation**: Strict filtering guarantees Owner 1 sees only Owner 1's facilities and revenues; Owner 2 sees only their own metrics.
- **Operational Filtering**: Filter bookings by status (All, Confirmed, Cancelled) and inspect court operational health.

### Admin Telemetry Dashboard
- **Platform Overview**: System-wide dashboard at `/admin/dashboard` reporting aggregate metrics across all venues, courts, users, bookings, and platform revenue.
- **User Directory & Moderation**: View all registered users with role badges, loyalty points, and account status (`active` / `suspended`).
- **User Status Toggle**: Easily activate or suspend user accounts with strict safeguards:
  - Admins cannot suspend their own account.
  - Role, password, email, and points cannot be modified via status toggle.
- **Venue Inspection**: Inspect all registered venues across the platform including facility owner contacts.

### UX Hardening & Accessibility
- **Accessible Status Confirmation Modal**: Replaced native `window.confirm()` with a custom, accessible dialog component featuring `role="dialog"`, `aria-modal="true"`, keyboard-accessible interactions, Escape-key dismissal, semantic dialog attributes, focus-visible states, and backdrop dismissal.
- **Timezone-Safe Date Formatting**: Implemented `formatBookingDate` to parse `YYYY-MM-DD` strings directly, avoiding browser UTC midnight shift bugs across negative timezone offsets.
- **State Feedback**: Polished loading skeletons, informative empty states, descriptive error alerts, and disabled states during async operations to prevent double submissions.

---

## Security & Data Integrity

1. **Authoritative Backend Security**: The client UI provides a user-friendly layer; all access control and validation are authoritatively enforced on the backend Express routes.
2. **Data Minimization**: User password hashes (`passwordHash`) and verification codes are explicitly stripped from all public and dashboard serialization responses.
3. **Price Tampering Protection**: Client-provided `totalPrice` fields are discarded; prices are calculated from the verified court's `pricePerHour`.
4. **BOLA / Multi-Tenant Isolation**: Owner data queries and mutations enforce `ownerId === req.user.id`. Customers can only query or cancel their own bookings.
5. **Admin Self-Protection**: Platform administrators cannot suspend their own active accounts.

---

## Automated Testing

QuickCourt V1 features a comprehensive automated backend regression suite with **180 tests across 30 test suites**, verifying every core system module.

### Test Suites Overview

| Test Suite | Focus Area |
|---|---|
| `regression.test.js` | Foundation endpoints, health checks, JWT token issuance, and basic RBAC |
| `task3_courts.test.js` | Court creation, retrieval, active status, operating hours, and date availability |
| `task4_bookings.test.js` | Booking creation, price calculation, conflict prevention, and cancellations |
| `task5_players.test.js` | Player directory, public profiles, and profile updates |
| `task6_loyalty_profile.test.js` | Customer profile management, dynamic loyalty points, and tier progression |
| `task7_owner_dashboard.test.js` | Owner metrics, authoritative revenue, and cross-owner data isolation |
| `task8_admin_dashboard.test.js` | Admin telemetry, platform metrics, and user status management |
| `task10_coverage.test.js` | Deep edge cases: auth error paths, RBAC boundaries, price tampering, and validation |

### Running the Test Suite

Navigate to the `backend` directory and run:

```bash
cd backend
npm test
```

Expected output:
```
# tests 180
# suites 30
# pass 180
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

---

## Production Build

To verify and compile the frontend production bundle:

```bash
cd frontend
npm run build
```

Expected result:
- **Build tool**: Vite v5.x
- **Output directory**: `frontend/dist/`
- **Output files**: Minified HTML, CSS bundle, and JS bundle with zero build errors or warnings.

To preview the production build locally:
```bash
npm run preview
```
Starts the local preview server at `http://localhost:4173`.

---

## Important V1 Operational Details & Limitations

The following architectural decisions are intentional specifications for QuickCourt V1:

1. **In-Memory Storage Reset**: QuickCourt V1 uses an in-memory JavaScript data store (`backend/data/store.js`). Any modifications, new bookings, or new venues are held in process memory and **reset to the default seed state whenever the backend Express server restarts**.
2. **Mock Payment Engine**: Booking confirmations are processed synchronously without connecting to a live banking or card payment gateway. Payment statuses default to `CONFIRMED` upon successful slot reservation.
3. **Deterministic Admin Verification**: Platform admin authentication uses a pre-configured verification code (`QC-ADMIN-2026`) rather than external SMS or TOTP authenticators.
4. **Single-Node Architecture**: The in-memory data store operates within a single Node.js process and does not synchronize state across multi-process clusters.

---

## License

This project is developed as part of the QuickCourt platform development program. All rights reserved.