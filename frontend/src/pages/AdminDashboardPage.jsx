import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Building2, CalendarCheck, TrendingUp,
  RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock,
  Search, Filter, MapPin, Layers, UserCheck, UserX,
  ExternalLink, ArrowRight, ShieldAlert, Sparkles, ChevronRight,
  Activity, Award, Store, Loader2, UserRound, IndianRupee,
  Shield, Check, X, CircleDot, ArrowUpRight
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { fetchAdminDashboard, toggleUserStatusApi } from '../services/api';
import { formatBookingDate } from '../utils/date';

/**
 * Platform Governance Metric Card
 */
function MetricPanel({ title, value, subtitle, icon: Icon, accent = 'emerald', badge }) {
  const accentClasses = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    sky: {
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
  }[accent] || {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border ${accentClasses.border} shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentClasses.text} ${accentClasses.bg} border ${accentClasses.border}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">{value}</span>
          {badge && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${accentClasses.badge}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Operational Booking Status Badge
 */
function BookingStatusBadge({ operationalStatus, status }) {
  if (operationalStatus === 'CANCELLED' || status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancelled</span>
      </span>
    );
  }

  if (operationalStatus === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Completed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
      <Clock className="w-3.5 h-3.5" />
      <span>Upcoming</span>
    </span>
  );
}

/**
 * Role Visualization Badge
 */
function RoleBadge({ role }) {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 text-white border border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ADMIN</span>
        </span>
      );
    case 'OWNER':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Building2 className="w-3.5 h-3.5" />
          <span>OWNER</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <UserRound className="w-3.5 h-3.5" />
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

  // Active Main Navigation Tab: 'OVERVIEW' | 'USERS' | 'VENUES' | 'BOOKINGS'
  const [mainTab, setMainTab] = useState('OVERVIEW');

  // Bookings sub-filter: 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  const [bookingFilter, setBookingFilter] = useState('ALL');

  // Search queries for tables
  const [userSearch, setUserSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Confirmation modal state for user status actions
  const [userToToggle, setUserToToggle] = useState(null);
  const [statusModalError, setStatusModalError] = useState(null);

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

  // Keyboard Escape listener to dismiss status modal safely
  useEffect(() => {
    if (!userToToggle) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !statusUpdatingId) {
        setUserToToggle(null);
        setStatusModalError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userToToggle, statusUpdatingId]);

  // Open status modal for user
  const handleRequestToggleStatus = (user) => {
    if (user.id === currentAdmin?.id) {
      setFeedback({
        type: 'error',
        message: 'Administrators cannot change their own account status.',
      });
      return;
    }
    setStatusModalError(null);
    setUserToToggle(user);
  };

  // Close status modal safely
  const handleCloseStatusModal = () => {
    if (statusUpdatingId) return;
    setUserToToggle(null);
    setStatusModalError(null);
  };

  // Confirm status toggle action
  const handleConfirmUserStatusToggle = async () => {
    if (!userToToggle) return;
    const user = userToToggle;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';

    try {
      setStatusUpdatingId(user.id);
      setStatusModalError(null);
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
        message: `User "${user.name}" status successfully updated to ${newStatus.toUpperCase()}.`,
      });
      setUserToToggle(null);
    } catch (err) {
      setStatusModalError(err.message || 'Failed to update user status.');
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

  const suspendedUsersCount = users.filter((u) => u.status === 'suspended').length;

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ─── 1. Admin Command Header ────────────────────────────────────────── */}
        <div className="mb-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
            <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-400">System Oversight</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-emerald-400 font-bold">Platform Control Center</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-white shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Platform Governance Control Center</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  System Operational
                </span>
                {currentAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                    Overseer: {currentAdmin.email}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Platform Control Center
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl font-normal">
                Monitor platform activity, user accounts, sports facilities, and authoritative operational metrics.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Refresh platform telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Telemetry</span>
              </button>

              <Link
                to="/venues"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <span>Public Marketplace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Feedback Alert ─────────────────────────────────────────────────── */}
        {feedback && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 p-1 transition"
              aria-label="Dismiss feedback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Error Alert with Retry ─────────────────────────────────────────── */}
        {error && (
          <div role="alert" className="mb-8 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3.5 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Failed to retrieve platform telemetry</h3>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
              <button
                type="button"
                onClick={loadDashboard}
                className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-sm"
              >
                Retry Telemetry Fetch
              </button>
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ───────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading admin dashboard telemetry">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="h-4 bg-slate-800 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-800 rounded-md w-3/4" />
                </div>
              ))}
            </div>
            <div className="h-80 bg-slate-900/90 border border-slate-800 rounded-3xl" />
          </div>
        )}

        {/* ─── Dashboard Content ──────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="space-y-8 animate-in fade-in">
            
            {/* ─── 2. Platform Core Overview Telemetry ────────────────────────── */}
            <section aria-label="Platform Core Telemetry">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricPanel
                  title="Platform Accounts"
                  value={summary.totalUsers}
                  subtitle={`${summary.totalCustomers} Customers • ${summary.totalOwners} Hosts • ${summary.totalAdmins} Admins`}
                  icon={Users}
                  accent="indigo"
                />

                <MetricPanel
                  title="Sports Facilities"
                  value={summary.totalVenues}
                  subtitle={`${summary.totalCourts} Total Courts (${summary.activeCourts} active)`}
                  icon={Building2}
                  accent="emerald"
                />

                <MetricPanel
                  title="Booking Volume"
                  value={summary.totalBookings}
                  subtitle={`${summary.confirmedBookings} confirmed (${summary.upcomingBookings} upcoming)`}
                  icon={CalendarCheck}
                  accent="sky"
                />

                <MetricPanel
                  title="Confirmed Revenue"
                  value={`₹${summary.bookingRevenue.toLocaleString('en-IN')}`}
                  subtitle="Authoritative confirmed reservations"
                  icon={IndianRupee}
                  accent="emerald"
                />
              </div>

              {/* Secondary Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Courts</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">{summary.activeCourts}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{summary.inactiveCourts} offline</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Schedule</p>
                    <p className="text-xl font-black text-sky-400 mt-0.5 font-mono">{summary.upcomingBookings}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Slots scheduled</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</p>
                    <p className="text-xl font-black text-indigo-400 mt-0.5 font-mono">{summary.completedBookings}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Elapsed reservations</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled Bookings</p>
                    <p className="text-xl font-black text-rose-400 mt-0.5 font-mono">{summary.cancelledBookings}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">₹0 revenue impact</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ─── 3. Governance Queue / Needs Attention ───────────────────────── */}
            <section aria-labelledby="governance-heading">
              <h2 id="governance-heading" className="sr-only">Governance Queue</h2>

              {pendingVenues.length > 0 ? (
                <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xl text-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">
                          Governance Priority: Pending Facility Submissions ({pendingVenues.length})
                        </h3>
                        <p className="text-xs text-amber-300/80 mt-0.5">
                          Registered facilities awaiting administrative inspection prior to full marketplace activation.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Awaiting Verification
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingVenues.map((pv) => (
                      <div key={pv.id} className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/20 text-xs flex justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-white text-sm">{pv.name}</p>
                          <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{pv.location}</span>
                            <span>•</span>
                            <span>Host: {pv.ownerName}</span>
                          </p>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                          SUBMITTED: {pv.submittedOn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Platform Governance Queue Clear</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        All registered sports complexes and facility submissions are verified and operational.
                      </p>
                    </div>
                  </div>
                  {suspendedUsersCount > 0 && (
                    <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shrink-0">
                      {suspendedUsersCount} Suspended Account{suspendedUsersCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* ─── 4. Main Section Control Panel ──────────────────────────────── */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              
              {/* Navigation Segmented Tab Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Admin Control Tabs">
                  {[
                    { key: 'OVERVIEW', label: 'Platform Overview', count: null },
                    { key: 'USERS', label: 'User Directory', count: users.length },
                    { key: 'VENUES', label: 'Venues & Courts', count: venues.length },
                    { key: 'BOOKINGS', label: 'Bookings Ledger', count: bookings.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={mainTab === tab.key}
                      type="button"
                      onClick={() => setMainTab(tab.key)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        mainTab === tab.key
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          mainTab === tab.key ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── TAB 1: PLATFORM OVERVIEW ─────────────────────────────────── */}
              {mainTab === 'OVERVIEW' && (
                <div className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Distribution Telemetry */}
                    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Account Distribution by Role</span>
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-slate-300">Customers / Players</span>
                            <span className="font-mono font-bold text-white">{summary.totalCustomers}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${(summary.totalCustomers / (summary.totalUsers || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-slate-300">Venue Hosts / Owners</span>
                            <span className="font-mono font-bold text-white">{summary.totalOwners}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${(summary.totalOwners / (summary.totalUsers || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-slate-300">Platform Administrators</span>
                            <span className="font-mono font-bold text-white">{summary.totalAdmins}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all duration-500"
                              style={{ width: `${(summary.totalAdmins / (summary.totalUsers || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Telemetry Summary */}
                    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>Platform Operational Metrics</span>
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 font-medium">Court Availability</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {summary.activeCourts} Active / {summary.totalCourts} Total
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 font-medium">Total Booking Reservations</span>
                          <span className="font-mono font-bold text-white">{summary.totalBookings} Total Bookings</span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 font-medium">Confirmed Revenue Volume</span>
                          <span className="font-mono font-bold text-emerald-400">₹{summary.bookingRevenue.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 2: USERS DIRECTORY ───────────────────────────────────── */}
              {mainTab === 'USERS' && (
                <div className="pt-5 space-y-4">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter by name, email, or role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">User Account</th>
                          <th scope="col" className="py-3 px-4">Role</th>
                          <th scope="col" className="py-3 px-4">Platform Status</th>
                          <th scope="col" className="py-3 px-4">Account Attributes</th>
                          <th scope="col" className="py-3 px-4 text-right">Administrative Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-500">
                              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto mb-2">
                                <Users className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-xs text-slate-300">No matching user accounts</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">No registered users matched your search criteria.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelf = u.id === currentAdmin?.id;
                            const isActive = u.status === 'active';
                            return (
                              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span>{u.name}</span>
                                    {isSelf && (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <RoleBadge role={u.role} />
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                                      isActive
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                    {(u.status || 'active').toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  {u.role === 'CUSTOMER' && (
                                    <span className="text-slate-300 font-medium">
                                      {u.points || 0} Loyalty Points
                                    </span>
                                  )}
                                  {u.role === 'OWNER' && (
                                    <span className="text-slate-300 font-medium truncate max-w-[220px] block">
                                      {u.businessName || u.venueLocation || 'Sports Facility Host'}
                                    </span>
                                  )}
                                  {u.role === 'ADMIN' && (
                                    <span className="text-slate-500 italic">Platform System Overseer</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {isSelf ? (
                                    <span className="text-[11px] text-slate-500 italic">Self-Protected</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRequestToggleStatus(u)}
                                      disabled={statusUpdatingId === u.id}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition focus:outline-none focus:ring-2 ${
                                        isActive
                                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 focus:ring-rose-400'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 focus:ring-emerald-400'
                                      }`}
                                    >
                                      {statusUpdatingId === u.id
                                        ? 'Updating…'
                                        : isActive
                                        ? 'Suspend Account'
                                        : 'Reactivate Account'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: VENUES & COURTS ──────────────────────────────────── */}
              {mainTab === 'VENUES' && (
                <div className="pt-5 space-y-4">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search venues by name, city, owner, or sport..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Venues Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">Facility & Locality</th>
                          <th scope="col" className="py-3 px-4">Host / Owner</th>
                          <th scope="col" className="py-3 px-4">Supported Sports</th>
                          <th scope="col" className="py-3 px-4">Court Fleet</th>
                          <th scope="col" className="py-3 px-4">Hourly Tariff</th>
                          <th scope="col" className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {filteredVenues.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-500">
                              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto mb-2">
                                <Building2 className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-xs text-slate-300">No facilities found</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">No sports venues matched your filter parameters.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredVenues.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white text-sm">{v.name}</div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>{v.location || v.city}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-200">{v.ownerName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{v.ownerEmail}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {v.sportTypes?.map((s) => (
                                    <span key={s} className="px-2 py-0.5 bg-slate-950 text-slate-300 border border-slate-800 rounded-md text-[10px] font-semibold">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-white">
                                  {v.activeCourts} / {v.totalCourts} Active
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-black text-emerald-400 text-sm">₹{v.pricePerHour}/hr</span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Link
                                  to={`/venues/${v.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs font-bold transition"
                                  title="Inspect public venue page"
                                >
                                  <span>View</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB 4: BOOKINGS LEDGER ───────────────────────────────────── */}
              {mainTab === 'BOOKINGS' && (
                <div className="pt-5 space-y-4">
                  {/* Status Sub-Filters */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto self-start">
                    {[
                      { key: 'ALL', label: 'All Bookings', count: bookings.length },
                      { key: 'UPCOMING', label: 'Upcoming', count: summary.upcomingBookings },
                      { key: 'COMPLETED', label: 'Completed', count: summary.completedBookings },
                      { key: 'CANCELLED', label: 'Cancelled', count: summary.cancelledBookings },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setBookingFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          bookingFilter === tab.key
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          bookingFilter === tab.key ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Bookings Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">Booking Ref</th>
                          <th scope="col" className="py-3 px-4">Customer</th>
                          <th scope="col" className="py-3 px-4">Facility & Court</th>
                          <th scope="col" className="py-3 px-4">Scheduled Slot</th>
                          <th scope="col" className="py-3 px-4">Amount</th>
                          <th scope="col" className="py-3 px-4 text-right">Lifecycle Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-500">
                              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto mb-2">
                                <CalendarCheck className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-xs text-slate-300">No booking records found</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                No records match the {bookingFilter === 'ALL' ? 'current' : bookingFilter.toLowerCase()} criteria.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-950 border border-slate-800 px-2 py-1 rounded-md">
                                  {b.id}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{b.customerName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{b.customerEmail}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{b.venueName}</div>
                                <div className="text-[11px] text-slate-400">{b.courtName} ({b.sport})</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-200">{formatBookingDate(b.date)}</div>
                                <div className="text-[11px] text-slate-400">{b.startTime} - {b.endTime}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-black text-emerald-400 text-sm">
                                  ₹{b.totalPrice}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <BookingStatusBadge operationalStatus={b.operationalStatus} status={b.status} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 5. Accessible Status Confirmation Modal ──────────────────────── */}
        {userToToggle && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            aria-describedby="status-modal-desc"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseStatusModal();
              }
            }}
          >
            <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                    userToToggle.status === 'active'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {userToToggle.status === 'active' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <UserCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="status-modal-title" className="text-base font-black text-white">
                    {userToToggle.status === 'active' ? 'Suspend User Account?' : 'Reactivate User Account?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {userToToggle.status === 'active'
                      ? 'Platform account suspension review'
                      : 'Platform account reactivation review'}
                  </p>
                </div>
              </div>

              <div id="status-modal-desc" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Target User:</span>
                  <span className="font-bold text-white">{userToToggle.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Email:</span>
                  <span className="font-mono text-slate-300">{userToToggle.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Role:</span>
                  <RoleBadge role={userToToggle.role} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-semibold text-slate-400">New Target Status:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      userToToggle.status === 'active'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${userToToggle.status === 'active' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    {userToToggle.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {userToToggle.status === 'active'
                  ? 'Marking this account as SUSPENDED will immediately restrict active user privileges across QuickCourt.'
                  : 'Marking this account as ACTIVE will restore standard platform privileges for this account.'}
              </p>

              {statusModalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{statusModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={statusUpdatingId === userToToggle.id}
                  onClick={handleCloseStatusModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={statusUpdatingId === userToToggle.id}
                  onClick={handleConfirmUserStatusToggle}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    userToToggle.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'
                  }`}
                >
                  {statusUpdatingId === userToToggle.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Status…</span>
                    </>
                  ) : (
                    <span>
                      {userToToggle.status === 'active' ? 'Confirm Suspension' : 'Confirm Reactivation'}
                    </span>
                  )}
                </button>
              </div>
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
