import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';
import OwnerVenuesPage from './pages/OwnerVenuesPage';
import { fetchHealth, fetchSummary } from './services/api';
import { Server, CheckCircle2, ShieldCheck, Database, User, Building2, ArrowRight } from 'lucide-react';

// ─── Home page ────────────────────────────────────────────────────────────────

function HomePage() {
  const { isAuthenticated, user, role } = useAuth();
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [hData, sData] = await Promise.all([fetchHealth(), fetchSummary()]);
      setHealth(hData);
      setSummary(sData);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Welcome banner when authenticated */}
        {isAuthenticated && user && (
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Welcome back, {user.name}!</p>
              <p className="text-sm text-slate-500">Signed in as <span className="font-medium text-purple-600">{role}</span></p>
            </div>
            {role === 'OWNER' && (
              <Link
                to="/owner/venues"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                My Venues <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span>TASK 2 — Venues</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Quick<span className="text-purple-600">Court</span> Platform
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Find and book the best sports courts near you.
          </p>
          <div className="mt-6">
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Browse Venues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Express API Server</h3>
            <p className="text-sm text-slate-500 mb-4">Node.js Express backend on port 4000.</p>
            <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              {loading ? 'Checking...' : health?.status === 'ok' ? 'Connected & Healthy' : 'Disconnected'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">In-Memory Data Store</h3>
            <p className="text-sm text-slate-500 mb-4">Pre-seeded with demo venues, courts, bookings.</p>
            <div className="text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
              {loading ? 'Loading...' : `${summary?.venuesCount ?? 0} Venues | ${summary?.usersCount ?? 0} Users | ${summary?.bookingsCount ?? 0} Bookings`}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">JWT Auth & RBAC</h3>
            <p className="text-sm text-slate-500 mb-4">bcrypt hashing, signed tokens, role middleware.</p>
            <div className="flex space-x-2 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1"><User className="w-3 h-3" />Customer</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1"><Building2 className="w-3 h-3" />Owner</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Admin</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Placeholder admin stub ───────────────────────────────────────────────────

function AdminDashboardStub() {
  return (
    <ProtectedRoute role="ADMIN">
      <div className="min-h-screen flex flex-col bg-slate-50"><Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-12">
            <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Dashboard</h2>
            <p className="text-slate-500">Coming in a future task.</p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/auth"          element={<AuthPage />} />
          <Route path="/venues"        element={<VenuesPage />} />
          <Route path="/venues/:id"    element={<VenueDetailPage />} />
          <Route path="/owner/venues"  element={<OwnerVenuesPage />} />
          <Route path="/admin"         element={<AdminDashboardStub />} />
          {/* Catch-all → home */}
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
