import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarCheck, CheckCircle2, Clock, AlertCircle,
  XCircle, TrendingUp, RefreshCw, ArrowRight, ShieldCheck,
  Layers, MapPin, Activity, Sparkles, Filter, ExternalLink,
  ChevronRight, IndianRupee, Store
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { fetchOwnerDashboard } from '../services/api';
import { formatBookingDate } from '../utils/date';

/**
 * Metric Card Component
 */
function MetricCard({ title, value, subtitle, icon: Icon, colorClass, bgClass, borderClass, pulseDot }) {
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
          {pulseDot && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
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
function StatusBadge({ operationalStatus, status }) {
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

  // Default: Upcoming / Confirmed
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
      <Clock className="w-3.5 h-3.5 text-sky-500" />
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
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Top Header & Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Host Console</span>
              <span className="text-emerald-300">•</span>
              <span>Live Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Owner Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl font-normal">
              Monitor your sports facilities, court availability schedules, real booking revenue, and player reservations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Reload dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/owner/venues"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Venues</span>
            </Link>
          </div>
        </div>

        {/* Error State with Retry */}
        {error && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold">Failed to load dashboard metrics</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !data && (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-200 rounded-md w-3/4" />
                </div>
              ))}
            </div>
            <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && data && (
          <div className="space-y-10">
            {/* ── Summary Metric Cards Grid ──────────────────────────────── */}
            <section aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="sr-only">Owner Business Metrics</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Total Venues */}
                <MetricCard
                  title="Total Venues"
                  value={summary.totalVenues}
                  subtitle={summary.totalVenues === 1 ? '1 registered location' : `${summary.totalVenues} registered locations`}
                  icon={Building2}
                  colorClass="text-emerald-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                />

                {/* Total Courts */}
                <MetricCard
                  title="Managed Courts"
                  value={summary.totalCourts}
                  subtitle={`${summary.activeCourts} active / ${summary.inactiveCourts} inactive`}
                  icon={Layers}
                  colorClass="text-sky-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                  pulseDot={summary.activeCourts > 0}
                />

                {/* Total Bookings */}
                <MetricCard
                  title="Total Bookings"
                  value={summary.totalBookings}
                  subtitle={`${summary.confirmedBookings} confirmed (${summary.upcomingBookings} upcoming)`}
                  icon={CalendarCheck}
                  colorClass="text-indigo-700"
                  bgClass="bg-white"
                  borderClass="border-slate-200/80"
                />

                {/* Booking Revenue */}
                <MetricCard
                  title="Booking Revenue"
                  value={`₹${summary.bookingRevenue.toLocaleString('en-IN')}`}
                  subtitle="Derived from confirmed reservations"
                  icon={TrendingUp}
                  colorClass="text-emerald-700"
                  bgClass="bg-gradient-to-br from-emerald-50/50 to-white"
                  borderClass="border-emerald-200/80"
                />
              </div>

              {/* Secondary Status Metrics Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
                    <p className="text-lg font-black text-sky-700 mt-0.5">{summary.upcomingBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">{summary.completedBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
                    <p className="text-lg font-black text-rose-700 mt-0.5">{summary.cancelledBookings}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Courts</p>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">{summary.activeCourts}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Recent Booking Activity ──────────────────────────────────── */}
            <section aria-labelledby="activity-heading" className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 id="activity-heading" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Booking Activity & Schedule
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real player reservations across your sports venues and courts.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto self-start sm:self-auto">
                  {[
                    { key: 'ALL', label: 'All', count: summary.totalBookings },
                    { key: 'UPCOMING', label: 'Upcoming', count: summary.upcomingBookings },
                    { key: 'COMPLETED', label: 'Completed', count: summary.completedBookings },
                    { key: 'CANCELLED', label: 'Cancelled', count: summary.cancelledBookings },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        activeTab === tab.key
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeTab === tab.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/60 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bookings List / Table */}
              {filteredBookings.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No bookings match this filter</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {activeTab === 'ALL'
                      ? 'No bookings have been made at your facilities yet. Share your venue links with players to get bookings!'
                      : `You have no ${activeTab.toLowerCase()} bookings at this time.`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Booking ID</th>
                        <th className="py-3 px-3">Facility / Court</th>
                        <th className="py-3 px-3">Sport</th>
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
                            <div className="font-bold text-slate-900">{b.venueName}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{b.courtName}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {b.sport}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800">{formatBookingDate(b.date)}</div>
                            <div className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-black text-slate-900 text-sm">
                              ₹{b.totalPrice}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <StatusBadge operationalStatus={b.operationalStatus} status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Owner Venues & Courts Overview ───────────────────────────── */}
            <section aria-labelledby="facilities-heading" className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
                <div>
                  <h2 id="facilities-heading" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Your Managed Facilities
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Overview of sports complexes, court capacity, and active availability.
                  </p>
                </div>

                <Link
                  to="/owner/venues"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors self-start sm:self-auto"
                >
                  <span>Facility Management</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {venues.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Store className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No venues registered yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Register your first facility to list courts, accept reservations, and track revenues on QuickCourt.
                  </p>
                  <Link
                    to="/owner/venues"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
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
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-base font-black text-slate-900">{venue.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{venue.location || venue.city}</span>
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {venue.status ? venue.status.toUpperCase() : 'ACTIVE'}
                          </span>
                        </div>

                        {/* Sports badges */}
                        <div className="flex flex-wrap gap-1.5 my-3">
                          {venue.sportTypes?.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Venue specs footer */}
                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Courts</span>
                            <span className="font-bold text-slate-800">
                              {venue.totalCourts} ({venue.activeCourts} active)
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Hourly Rate</span>
                            <span className="font-bold text-emerald-700">₹{venue.pricePerHour}/hr</span>
                          </div>
                        </div>

                        <Link
                          to="/owner/venues"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
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
