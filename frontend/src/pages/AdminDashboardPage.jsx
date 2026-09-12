import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Building2, CalendarCheck, TrendingUp,
  RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock,
  Search, Filter, MapPin, Layers, UserCheck, UserX,
  ExternalLink, ArrowRight, ShieldAlert, Sparkles, ChevronRight,
  Activity, Award, Store
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { fetchAdminDashboard, toggleUserStatusApi } from '../services/api';

/**
 * Metric Card Component
 */
function MetricCard({ title, value, subtitle, icon: Icon, colorClass, bgClass, borderClass, badge }) {
  return (
    <div className={`p-5 rounded-2xl border ${borderClass} ${bgClass} shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClass} bg-white shadow-2xs border border-slate-100`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</span>
          {badge && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Status Badge Component
 */
function BookingStatusBadge({ operationalStatus, status }) {
  if (operationalStatus === 'CANCELLED' || status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 text-rose-500" />
        <span>Cancelled</span>
      </span>
    );
  }

  if (operationalStatus === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Completed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
      <Clock className="w-3.5 h-3.5 text-sky-500" />
      <span>Upcoming</span>
    </span>
  );
}

/**
 * Role Badge Component
 */
function RoleBadge({ role }) {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-900 text-white">
          <ShieldCheck className="w-3 h-3" />
          <span>ADMIN</span>
        </span>
      );
    case 'OWNER':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Building2 className="w-3 h-3 text-emerald-600" />
          <span>OWNER</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Users className="w-3 h-3 text-indigo-500" />
          <span>CUSTOMER</span>
        </span>
      );
  }
}

function AdminDashboardInner() {
  const { user: currentAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Active Main View Tab: 'OVERVIEW' | 'USERS' | 'VENUES' | 'BOOKINGS'
  const [mainTab, setMainTab] = useState('OVERVIEW');

  // Bookings sub-filter: 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  const [bookingFilter, setBookingFilter] = useState('ALL');

  // Search queries for tables
  const [userSearch, setUserSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle user status toggle
  const handleToggleUserStatus = async (user) => {
    if (user.id === currentAdmin?.id) {
      alert('Administrators cannot change their own account status.');
      return;
    }

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = `Are you sure you want to mark user "${user.name}" (${user.email}) as ${newStatus.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setStatusUpdatingId(user.id);
      setFeedback(null);
      const res = await toggleUserStatusApi(user.id, newStatus);
      
      // Update local state smoothly
      setData((prev) => {
        if (!prev) return prev;
        const updatedUsers = prev.users.map((u) => (u.id === user.id ? res.user : u));
        return { ...prev, users: updatedUsers };
      });

      setFeedback({
        type: 'success',
        message: `User ${user.name} status successfully changed to ${newStatus.toUpperCase()}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update user status.',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const summary = data?.summary || {
    totalUsers: 0,
    totalCustomers: 0,
    totalOwners: 0,
    totalAdmins: 0,
    totalVenues: 0,
    totalCourts: 0,
    activeCourts: 0,
    inactiveCourts: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    upcomingBookings: 0,
    bookingRevenue: 0,
    pendingVenuesCount: 0,
  };

  const users = data?.users || [];
  const venues = data?.venues || [];
  const bookings = data?.bookings || [];
  const pendingVenues = data?.pendingVenues || [];

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.businessName?.toLowerCase().includes(q)
    );
  });

  // Filtered venues
  const filteredVenues = venues.filter((v) => {
    if (!venueSearch.trim()) return true;
    const q = venueSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.ownerName?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.sportTypes?.some((s) => s.toLowerCase().includes(q))
    );
  });

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'UPCOMING') return b.operationalStatus === 'UPCOMING';
    if (bookingFilter === 'COMPLETED') return b.operationalStatus === 'COMPLETED';
    if (bookingFilter === 'CANCELLED') return b.operationalStatus === 'CANCELLED' || b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-indigo-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-2.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Administrator Oversight</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-mono">ROLE: ADMIN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Admin Platform Console
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Platform-wide telemetry, verified facilities, customer booking records, and user management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Refresh platform telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/venues"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span>Explore Venues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 p-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert with Retry */}
        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold">Failed to load admin telemetry</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                Retry Telemetry Fetch
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !data && (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-200 rounded-md w-3/4" />
                </div>
              ))}
            </div>
            <div className="h-72 bg-white border border-slate-200 rounded-2xl" />
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && data && (
          <div className="space-y-8">
            {/* ── Core Metric Cards ────────────────────────────────────────── */}
            <section aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="sr-only">Platform Core Metrics</h2>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <MetricCard
                  title="Total Accounts"
                  value={summary.totalUsers}
                  subtitle={`${summary.totalCustomers} Customers • ${summary.totalOwners} Owners • ${summary.totalAdmins} Admins`}
                  icon={Users}
                  colorClass="text-indigo-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                />

                <MetricCard
                  title="Sports Venues"
                  value={summary.totalVenues}
                  subtitle={`${summary.totalCourts} Total Courts (${summary.activeCourts} active)`}
                  icon={Building2}
                  colorClass="text-emerald-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                />

                <MetricCard
                  title="Platform Bookings"
                  value={summary.totalBookings}
                  subtitle={`${summary.confirmedBookings} confirmed (${summary.upcomingBookings} upcoming)`}
                  icon={CalendarCheck}
                  colorClass="text-sky-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                />

                <MetricCard
                  title="Platform Revenue"
                  value={`₹${summary.bookingRevenue.toLocaleString('en-IN')}`}
                  subtitle="Confirmed booking volume"
                  icon={TrendingUp}
                  colorClass="text-emerald-700"
                  bgClass="bg-gradient-to-br from-emerald-50/50 to-white"
                  borderClass="border-emerald-200/80"
                />
              </div>

              {/* Secondary Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Courts</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">{summary.activeCourts}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Bookings</p>
                    <p className="text-lg font-black text-sky-700 mt-0.5">{summary.upcomingBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Bookings</p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">{summary.completedBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled Bookings</p>
                    <p className="text-lg font-black text-rose-700 mt-0.5">{summary.cancelledBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Main Section Tabs ────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-7">
              {/* Navigation Tabs Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {[
                    { key: 'OVERVIEW', label: 'Overview', count: null },
                    { key: 'USERS', label: 'User Directory', count: users.length },
                    { key: 'VENUES', label: 'Venues & Courts', count: venues.length },
                    { key: 'BOOKINGS', label: 'Bookings & Ledger', count: bookings.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMainTab(tab.key)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        mainTab === tab.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          mainTab === tab.key ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TAB 1: OVERVIEW ────────────────────────────────────────── */}
              {mainTab === 'OVERVIEW' && (
                <div className="pt-6 space-y-6">
                  {/* Pending Venues Section */}
                  {pendingVenues.length > 0 && (
                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-900">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-amber-700" />
                          <h3 className="text-sm font-bold text-amber-900">
                            Pending Facility Submissions ({pendingVenues.length})
                          </h3>
                        </div>
                        <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                          Awaiting Review
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {pendingVenues.map((pv) => (
                          <div key={pv.id} className="p-3.5 bg-white rounded-xl border border-amber-200/70 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-900">{pv.name}</p>
                              <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{pv.location}</span>
                                <span>•</span>
                                <span>Host: {pv.ownerName}</span>
                              </p>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                              SUBMITTED: {pv.submittedOn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* User Distribution Card */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                        Account Distribution
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">Customers / Players</span>
                          <span className="font-bold text-slate-900">{summary.totalCustomers}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${(summary.totalCustomers / (summary.totalUsers || 1)) * 100}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2">
                          <span className="font-medium text-slate-600">Venue Hosts / Owners</span>
                          <span className="font-bold text-slate-900">{summary.totalOwners}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(summary.totalOwners / (summary.totalUsers || 1)) * 100}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2">
                          <span className="font-medium text-slate-600">Platform Administrators</span>
                          <span className="font-bold text-slate-900">{summary.totalAdmins}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${(summary.totalAdmins / (summary.totalUsers || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Court Breakdown */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                        Facility & Booking Status
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between p-2.5 rounded-lg bg-white border border-slate-200/70">
                          <span className="text-slate-600 font-medium">Court Active Availability Rate</span>
                          <span className="font-bold text-emerald-700">
                            {summary.totalCourts > 0 ? Math.round((summary.activeCourts / summary.totalCourts) * 100) : 0}%
                          </span>
                        </div>

                        <div className="flex justify-between p-2.5 rounded-lg bg-white border border-slate-200/70">
                          <span className="text-slate-600 font-medium">Total Booking Volume</span>
                          <span className="font-bold text-slate-900">{summary.totalBookings}</span>
                        </div>

                        <div className="flex justify-between p-2.5 rounded-lg bg-white border border-slate-200/70">
                          <span className="text-slate-600 font-medium">Average Order Value</span>
                          <span className="font-bold text-indigo-700">
                            ₹{summary.confirmedBookings > 0 ? Math.round(summary.bookingRevenue / summary.confirmedBookings) : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: USERS DIRECTORY ─────────────────────────────────── */}
              {mainTab === 'USERS' && (
                <div className="pt-5 space-y-4">
                  {/* Search bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">User</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Details / Points</th>
                          <th className="py-3 px-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredUsers.map((u) => {
                          const isSelf = u.id === currentAdmin?.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">{u.email}</div>
                              </td>
                              <td className="py-3.5 px-3">
                                <RoleBadge role={u.role} />
                              </td>
                              <td className="py-3.5 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    u.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {(u.status || 'active').toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                {u.role === 'CUSTOMER' && (
                                  <span className="text-slate-700 font-medium">
                                    {u.points} Loyalty Points
                                  </span>
                                )}
                                {u.role === 'OWNER' && (
                                  <span className="text-slate-700 font-medium truncate max-w-[200px] block">
                                    {u.businessName || u.venueLocation || 'Venue Host'}
                                  </span>
                                )}
                                {u.role === 'ADMIN' && (
                                  <span className="text-slate-400 italic">Platform Administrator</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {isSelf ? (
                                  <span className="text-[11px] text-slate-400 italic">Self-Protected</span>
                                ) : (
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    disabled={statusUpdatingId === u.id}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 ${
                                      u.status === 'active'
                                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 focus:ring-rose-400'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 focus:ring-emerald-400'
                                    }`}
                                  >
                                    {statusUpdatingId === u.id
                                      ? 'Updating...'
                                      : u.status === 'active'
                                      ? 'Suspend'
                                      : 'Reactivate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 3: VENUES ──────────────────────────────────────────── */}
              {mainTab === 'VENUES' && (
                <div className="pt-5 space-y-4">
                  {/* Search bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search venues by name, city, owner, or sport..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Venue Name & City</th>
                          <th className="py-3 px-3">Owner / Host</th>
                          <th className="py-3 px-3">Sports Supported</th>
                          <th className="py-3 px-3">Courts (Active/Total)</th>
                          <th className="py-3 px-3">Rate / Hour</th>
                          <th className="py-3 px-3 text-right">Public Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredVenues.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900">{v.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{v.location || v.city}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-slate-800">{v.ownerName}</div>
                              <div className="text-[11px] text-slate-500">{v.ownerEmail}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {v.sportTypes?.map((s) => (
                                  <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-slate-900">
                                {v.activeCourts} / {v.totalCourts} Active
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-emerald-700">₹{v.pricePerHour}/hr</span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {(v.status || 'ACTIVE').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 4: BOOKINGS ────────────────────────────────────────── */}
              {mainTab === 'BOOKINGS' && (
                <div className="pt-5 space-y-4">
                  {/* Status sub-tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto self-start">
                    {[
                      { key: 'ALL', label: 'All Bookings', count: bookings.length },
                      { key: 'UPCOMING', label: 'Upcoming', count: summary.upcomingBookings },
                      { key: 'COMPLETED', label: 'Completed', count: summary.completedBookings },
                      { key: 'CANCELLED', label: 'Cancelled', count: summary.cancelledBookings },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setBookingFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          bookingFilter === tab.key
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          bookingFilter === tab.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-500'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Booking ID</th>
                          <th className="py-3 px-3">Customer</th>
                          <th className="py-3 px-3">Venue & Court</th>
                          <th className="py-3 px-3">Date & Slot</th>
                          <th className="py-3 px-3">Amount</th>
                          <th className="py-3 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-3">
                              <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                                {b.id}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900">{b.customerName}</div>
                              <div className="text-[11px] text-slate-500">{b.customerEmail}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900">{b.venueName}</div>
                              <div className="text-[11px] text-slate-500">{b.courtName} ({b.sport})</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-slate-800">{b.date}</div>
                              <div className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-black text-slate-900 text-sm">
                                ₹{b.totalPrice}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <BookingStatusBadge operationalStatus={b.operationalStatus} status={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminDashboardInner />
    </ProtectedRoute>
  );
}
