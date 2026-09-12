import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarCheck, CheckCircle2, Clock, AlertCircle,
  XCircle, TrendingUp, RefreshCw, ArrowRight, ShieldCheck,
  Layers, MapPin, Activity, Sparkles, ChevronRight,
  IndianRupee, Store, Trophy, Zap, Flame, Award
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { fetchOwnerDashboard } from '../services/api';
import { formatBookingDate } from '../utils/date';

const SPORT_ICONS = {
  Badminton: Trophy,
  Tennis: Zap,
  Pickleball: Sparkles,
  Football: Award,
  Basketball: Flame,
  Squash: Layers,
  Cricket: ShieldCheck,
  'Table Tennis': Activity,
};

/**
 * Metric Card Component for Owner Command Center
 */
function MetricCard({ title, value, subtitle, icon: Icon, iconColor, pulseDot }) {
  return (
    <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} bg-slate-950 border border-slate-800 shadow-inner`}>
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</span>
          {pulseDot && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Status Badge Component for Booking Operational State
 */
function StatusBadge({ operationalStatus, status }) {
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

  // Default: Upcoming / Confirmed
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
      <Clock className="w-3.5 h-3.5" />
      <span>Upcoming</span>
    </span>
  );
}

function OwnerDashboardInner() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOwnerDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load owner dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = data?.summary || {
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
  };

  const venues = data?.venues || [];
  const bookings = data?.recentBookings || [];

  // Filter bookings based on active operational tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UPCOMING') return b.operationalStatus === 'UPCOMING';
    if (activeTab === 'COMPLETED') return b.operationalStatus === 'COMPLETED';
    if (activeTab === 'CANCELLED') return b.operationalStatus === 'CANCELLED' || b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ─── Top Header & Console Identity ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
              <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-slate-400">Host Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-emerald-400 font-bold">Command Center</span>
            </nav>

            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Business Operations
              </span>
              {user?.venueLocation && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {user.venueLocation}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Owner Operations Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              Real-time facility telemetry, court availability schedules, confirmed match revenues, and customer reservations for{' '}
              <span className="text-slate-200 font-semibold">{user?.businessName || user?.name || 'your sports enterprise'}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <button
              id="btn-owner-refresh"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              title="Reload dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>

            <Link
              id="btn-owner-manage-venues"
              to="/owner/venues"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Venues</span>
            </Link>
          </div>
        </div>

        {/* ─── Error Alert State with Retry ──────────────────────────────────── */}
        {error && (
          <div role="alert" className="mb-8 p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3.5 shadow-xl">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Failed to load dashboard metrics</h3>
              <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ──────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div className="h-4 bg-slate-800 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-800 rounded-md w-3/4" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-900/90 border border-slate-800 rounded-2xl p-4" />
              ))}
            </div>
            <div className="h-64 bg-slate-900/90 border border-slate-800 rounded-3xl" />
          </div>
        )}

        {/* ─── Dashboard Content ─────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="space-y-8">
            
            {/* ── 1. Executive Business Snapshot (KPI HUD) ────────────────────── */}
            <section aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="sr-only">Owner Business Performance Metrics</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Confirmed Booking Revenue (Hero KPI) */}
                <div className="p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Confirmed Revenue</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ₹{summary.bookingRevenue.toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <p className="text-[11px] text-slate-400 font-medium">
                        {summary.confirmedBookings} confirmed bookings
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Total Venues */}
                <MetricCard
                  title="Managed Facilities"
                  value={summary.totalVenues}
                  subtitle={summary.totalVenues === 1 ? '1 registered complex' : `${summary.totalVenues} registered complexes`}
                  icon={Building2}
                  iconColor="text-emerald-400"
                />

                {/* 3. Managed Courts & Active Status */}
                <MetricCard
                  title="Managed Courts"
                  value={summary.totalCourts}
                  subtitle={`${summary.activeCourts} active • ${summary.inactiveCourts} inactive`}
                  icon={Layers}
                  iconColor="text-sky-400"
                  pulseDot={summary.activeCourts > 0}
                />

                {/* 4. Total Bookings */}
                <MetricCard
                  title="Total Reservations"
                  value={summary.totalBookings}
                  subtitle={`${summary.confirmedBookings} confirmed • ${summary.cancelledBookings} cancelled`}
                  icon={CalendarCheck}
                  iconColor="text-indigo-400"
                />
              </div>

              {/* Secondary Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
                    <p className="text-xl font-black text-sky-400 mt-0.5">{summary.upcomingBookings}</p>
                    <p className="text-[10px] text-slate-500">Scheduled matches</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">{summary.completedBookings}</p>
                    <p className="text-[10px] text-slate-500">Played matches</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
                    <p className="text-xl font-black text-rose-400 mt-0.5">{summary.cancelledBookings}</p>
                    <p className="text-[10px] text-slate-500">Zero revenue impact</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Courts</p>
                    <p className="text-xl font-black text-indigo-400 mt-0.5">{summary.activeCourts}</p>
                    <p className="text-[10px] text-slate-500">Of {summary.totalCourts} operational</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2. Recent Booking Activity & Operational Log ─────────────────── */}
            <section aria-labelledby="activity-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <h2 id="activity-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-emerald-400" />
                    Booking Activity & Operational Schedule
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time reservation telemetry across your facility venues and courts.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto self-start sm:self-auto max-w-full">
                  {[
                    { key: 'ALL', label: 'All', count: summary.totalBookings },
                    { key: 'UPCOMING', label: 'Upcoming', count: summary.upcomingBookings },
                    { key: 'COMPLETED', label: 'Completed', count: summary.completedBookings },
                    { key: 'CANCELLED', label: 'Cancelled', count: summary.cancelledBookings },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      aria-pressed={activeTab === tab.key}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        activeTab === tab.key
                          ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeTab === tab.key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-950 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bookings Table / List */}
              {filteredBookings.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-7 h-7 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No bookings match this filter</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    {activeTab === 'ALL'
                      ? 'No reservations have been placed at your facilities yet. Verified customer bookings will populate this live ledger.'
                      : `There are currently no ${activeTab.toLowerCase()} bookings on record.`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto max-w-full">
                  <table className="w-full text-left border-collapse min-w-[660px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Reference</th>
                        <th className="py-3 px-3">Facility / Court</th>
                        <th className="py-3 px-3">Sport</th>
                        <th className="py-3 px-3">Date & Slot</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3 text-right">Operational Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredBookings.map((b) => {
                        const SportIcon = SPORT_ICONS[b.sport] || Activity;
                        const customerEmail = b.customerEmail || b.userEmail || b.email || b.customer?.email;
                        const customerName = b.customerName || b.userName || b.customer?.name;
                        return (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 w-fit">
                                  {b.id}
                                </span>
                                {(customerName || customerEmail) && (
                                  <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-[200px] mt-0.5">
                                    {customerName && (
                                      <span className="font-semibold text-white text-[11px] truncate" title={customerName}>
                                        {customerName}
                                      </span>
                                    )}
                                    {customerEmail && (
                                      <span
                                        className="table-email-cell text-[11px] text-slate-400 font-mono truncate hover:text-slate-200 transition-colors cursor-help block"
                                        title={customerEmail}
                                        aria-label={`Customer email: ${customerEmail}`}
                                      >
                                        {customerEmail}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white">{b.venueName}</div>
                              <div className="text-[11px] text-slate-400 font-medium">{b.courtName}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                                <SportIcon className="w-3 h-3 text-emerald-400" />
                                <span>{b.sport}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-slate-200">{formatBookingDate(b.date)}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {b.startTime} - {b.endTime}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-black text-white text-sm font-mono">
                                ₹{b.totalPrice}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <StatusBadge operationalStatus={b.operationalStatus} status={b.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── 3. Managed Facilities & Court Fleet ─────────────────────────── */}
            <section aria-labelledby="facilities-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
                <div>
                  <h2 id="facilities-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    Managed Facilities & Court Fleet
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operational breakdown of sports venues, active court capacity, and hourly tariffs.
                  </p>
                </div>

                <Link
                  to="/owner/venues"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-colors self-start sm:self-auto"
                >
                  <span>Facility Management</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {venues.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <Store className="w-7 h-7 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No venues registered yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4 leading-relaxed">
                    Register your first sports venue to configure courts, set availability slots, and start accepting player bookings.
                  </p>
                  <Link
                    to="/owner/venues"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition shadow-md shadow-emerald-500/20"
                  >
                    <span>Register New Venue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="p-5 rounded-3xl border border-slate-800 bg-slate-950 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-base font-black text-white">{venue.name}</h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{venue.location || venue.city}</span>
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {venue.status ? venue.status.toUpperCase() : 'ACTIVE'}
                          </span>
                        </div>

                        {/* Sports badges with Lucide icons */}
                        <div className="flex flex-wrap gap-1.5 my-3.5">
                          {venue.sportTypes?.map((sport) => {
                            const SportIcon = SPORT_ICONS[sport] || Activity;
                            return (
                              <span
                                key={sport}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800"
                              >
                                <SportIcon className="w-3 h-3 text-emerald-400" />
                                <span>{sport}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Venue specs footer */}
                      <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Courts</span>
                            <span className="font-bold text-slate-200">
                              {venue.totalCourts} ({venue.activeCourts} active)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Rate</span>
                            <span className="font-bold text-emerald-400 font-mono">₹{venue.pricePerHour}/hr</span>
                          </div>
                        </div>

                        <Link
                          to="/owner/venues"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Open facility settings"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── 4. Quick Business Actions Shortcuts Bar ─────────────────────── */}
            <section aria-label="Quick Actions" className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Facility Operations Command</div>
                  <div className="text-[11px] text-slate-400">Quick shortcuts to your venue portfolio and marketplace presence</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Link
                  to="/owner/venues"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
                >
                  Manage Venues & Courts
                </Link>
                <Link
                  to="/venues"
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition border border-emerald-500/30"
                >
                  Marketplace View
                </Link>
              </div>
            </section>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['OWNER']}>
      <OwnerDashboardInner />
    </ProtectedRoute>
  );
}
