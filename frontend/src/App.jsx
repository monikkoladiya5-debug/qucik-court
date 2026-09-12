import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';
import OwnerVenuesPage from './pages/OwnerVenuesPage';
import MyBookingsPage from './pages/MyBookingsPage';
import PlayersPage from './pages/PlayersPage';
import { fetchHealth, fetchSummary } from './services/api';
import {
  Activity, CheckCircle2, ShieldCheck, Database, Server,
  User, Building2, ArrowRight, Sparkles, MapPin, Star,
  Trophy, Zap, Clock
} from 'lucide-react';

// ─── Sports Hero Feature Pills ────────────────────────────────────────────────
const SPORT_PILLS = [
  { label: 'Badminton', emoji: '🏸', courts: 'Indoor Synthetic' },
  { label: 'Tennis', emoji: '🎾', courts: 'Hard & Clay' },
  { label: 'Football', emoji: '⚽', courts: 'FIFA Turf' },
  { label: 'Basketball', emoji: '🏀', courts: 'Hardwood & Acrylic' },
  { label: 'Pickleball', emoji: '🏓', courts: 'Pro Standard' },
];

// ─── Homepage ─────────────────────────────────────────────────────────────────
function HomePage() {
  const { isAuthenticated, user, role } = useAuth();
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [hData, sData] = await Promise.all([fetchHealth(), fetchSummary()]);
        if (mounted) {
          setHealth(hData);
          setSummary(sData);
        }
      } catch (err) {
        console.warn('System telemetry fetch issue:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Header />

      <main className="flex-1">
        {/* ── Top Athletic Hero Section ─────────────────────────────────── */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/80">
          {/* Ambient Lighting / Glow Effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-indigo-500/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
          <div className="absolute -top-32 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-48 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Authenticated Welcome Banner */}
            {isAuthenticated && user && (
              <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/30 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Welcome back, {user.name}!</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {role}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {role === 'OWNER'
                        ? 'Manage your sports facilities and view live public listings.'
                        : 'Explore sports venues and discover available game courts.'}
                    </p>
                  </div>
                </div>

                {role === 'OWNER' && (
                  <Link
                    to="/owner/venues"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                  >
                    <span>Manage My Venues</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Hero Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines & CTAs */}
              <div className="lg:col-span-7 text-center lg:text-left">
                {/* Athletic Tagline */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-emerald-400 mb-6 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-slate-300">QuickCourt V1 Live</span>
                  <span className="text-slate-500">•</span>
                  <span>Instant Discovery & Host Access</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
                  Find Your Game.{' '}
                  <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                    Book Your Court.
                  </span>
                </h1>

                <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed mb-8">
                  Connect instantly with top-tier badminton courts, tennis clubs, football turfs, and multi-sport complexes in your city.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                  <Link
                    to="/venues"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <span>Explore Venues</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to={isAuthenticated && role === 'OWNER' ? '/owner/venues' : '/auth'}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>List Your Venue</span>
                  </Link>
                </div>

                {/* Sports Pill Scroller */}
                <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                  {SPORT_PILLS.map((sp) => (
                    <div
                      key={sp.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300"
                    >
                      <span>{sp.emoji}</span>
                      <span className="font-semibold text-slate-200">{sp.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Hero Sports Card Deck (21st.dev style composition) */}
              <div className="lg:col-span-5 relative">
                {/* Main Floating Glass Venue Showcase */}
                <div className="relative mx-auto max-w-sm sm:max-w-md rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/95 p-5 border border-slate-700 shadow-2xl backdrop-blur-xl">
                  {/* Visual Stadium Header */}
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-800 mb-4 border border-slate-700/80">
                    <img
                      src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80"
                      alt="Apex Sports Arena"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    
                    {/* Live Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Verified Venue</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <div>
                        <div className="text-xs font-medium text-slate-300">Downtown Sports District</div>
                        <div className="text-base font-bold">Apex Badminton & Tennis Club</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Venue Meta Row */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-700/60 text-xs text-slate-300 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Central City Hub</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>4.9 (Top Rated)</span>
                    </div>
                  </div>

                  {/* Sport Tags & CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
                        Badminton
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                        Tennis
                      </span>
                    </div>
                    <Link
                      to="/venues"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group"
                    >
                      <span>View Live Venues</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Floating Micro Card 1: Live Speed Indicator */}
                <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl shadow-xl backdrop-blur-md items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Instant Search</div>
                    <div className="text-[11px] text-slate-400">Zero-lag multi-sport filter</div>
                  </div>
                </div>

                {/* Floating Micro Card 2: Facilities */}
                <div className="hidden sm:flex absolute -top-4 -right-4 bg-slate-800/90 border border-slate-700 p-3 rounded-2xl shadow-xl backdrop-blur-md items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    Pro Court Standards
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── System Status & Architectural Summary Section ─────────────── */}
        <section className="py-16 bg-slate-950/60 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-2">
                Production-Ready Foundation
              </h2>
              <p className="text-2xl sm:text-3xl font-black text-white">
                Platform Architecture & Health
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Built on Express, React, Vite, and role-based security boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: API Status */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Express API Service</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Fast RESTful backend proxy on port 4000 with CORS and health telemetry.
                </p>
                <div className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                  {loading ? 'Verifying status...' : health?.status === 'ok' ? 'API Online & Healthy' : 'Telemetry Offline'}
                </div>
              </div>

              {/* Card 2: Data Store */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">In-Memory Data Store</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Pre-seeded with real sports venues, authorized users, and location metadata.
                </p>
                <div className="text-xs text-slate-300 font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  {loading
                    ? 'Loading metrics...'
                    : `${summary?.venuesCount ?? 0} Venues • ${summary?.usersCount ?? 0} Users • ${summary?.bookingsCount ?? 0} Bookings`}
                </div>
              </div>

              {/* Card 3: RBAC */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">JWT & RBAC Security</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Multi-role access enforcement for Players, Facility Owners, and Platform Admins.
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    Player
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    Owner
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 text-xs font-bold border border-slate-600">
                    Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Call to Action Banner ──────────────────────────────────────── */}
        <section className="py-14 bg-gradient-to-b from-slate-950 to-slate-900 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Ready to hit the court?
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
              Browse venues across sports, check amenities, and explore locations in real time.
            </p>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Explore All Venues Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Admin Dashboard Stub ─────────────────────────────────────────────────────
function AdminDashboardStub() {
  return (
    <ProtectedRoute role="ADMIN">
      <div className="min-h-screen flex flex-col bg-slate-900 text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-slate-800/80 border border-slate-700 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Admin Dashboard</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Platform administration and system oversight. Role access confirmed as ADMIN.
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs mb-6">
              <div className="flex justify-between text-slate-400">
                <span>Security Token:</span>
                <span className="font-mono text-emerald-400 font-bold">ACTIVE (JWT)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Admin Clearance:</span>
                <span className="text-indigo-300 font-semibold">ALL_FACILITIES</span>
              </div>
            </div>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              <span>View All Venues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

// ─── App Root with Router & Auth Provider ─────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/auth"          element={<AuthPage />} />
          <Route path="/venues"        element={<VenuesPage />} />
          <Route path="/venues/:id"    element={<VenueDetailPage />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/players"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <PlayersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/owner/venues"  element={<OwnerVenuesPage />} />
          <Route path="/admin"         element={<AdminDashboardStub />} />
          {/* Catch-all route redirects to home */}
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
