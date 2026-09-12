import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchMyBookings, cancelBooking } from '../services/api';
import { getLocalDateString } from '../utils/date';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  XCircle,
  ShieldCheck,
  Trophy,
  Zap,
  Award,
  Flame,
  Sparkles,
  Layers,
  Activity,
  Ticket,
  ChevronRight,
  Search,
  X,
  Check,
  AlertTriangle,
  CalendarDays,
  ExternalLink
} from 'lucide-react';

const SPORT_CONFIG = {
  Badminton:  { icon: Trophy,      bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  Tennis:     { icon: Zap,         bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/20' },
  Football:   { icon: Award,       bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/20' },
  Basketball: { icon: Flame,       bg: 'bg-orange-500/10',  text: 'text-orange-300',  border: 'border-orange-200' },
  Pickleball: { icon: Sparkles,    bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/20' },
  Cricket:    { icon: ShieldCheck, bg: 'bg-red-500/10',     text: 'text-red-300',     border: 'border-red-500/20' },
  Squash:     { icon: Layers,      bg: 'bg-teal-500/10',    text: 'text-teal-300',    border: 'border-teal-500/20' },
  default:    { icon: Activity,    bg: 'bg-slate-800',      text: 'text-slate-300',   border: 'border-slate-700' },
};

function getSportStyle(sport) {
  return SPORT_CONFIG[sport] || SPORT_CONFIG.default;
}

function parseTimeTo24(timeStr) {
  if (!timeStr) return { hours: 23, minutes: 59 };
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hours: 23, minutes: 59 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;
  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function getBookingTimestamp(booking, useEndTime = false) {
  if (!booking?.date) return 0;
  const timeStr = (useEndTime ? booking.endTime : booking.startTime) || '00:00';
  const { hours, minutes } = parseTimeTo24(timeStr);
  const [y, m, d] = booking.date.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, hours, minutes, 0).getTime();
}

function isBookingPast(booking) {
  if (!booking?.date) return false;
  const timeStr = booking.endTime || booking.startTime || '23:59';
  const { hours, minutes } = parseTimeTo24(timeStr);
  const [y, m, d] = booking.date.split('-').map(Number);
  if (!y || !m || !d) return false;
  const bookingEnd = new Date(y, m - 1, d, hours, minutes, 0);
  return bookingEnd < new Date();
}

function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getRelativeDayLabel(dateStr) {
  if (!dateStr) return null;
  const todayStr = getLocalDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return null;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('UPCOMING'); // 'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // Selected Booking Details Pass Modal
  const [selectedPass, setSelectedPass] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMyBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      setError(err.message || 'Failed to load your bookings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Keyboard Escape listener to dismiss open dialogs
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (selectedPass) setSelectedPass(null);
        if (cancellingBooking && !cancelLoading) {
          setCancellingBooking(null);
          setCancelError(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPass, cancellingBooking, cancelLoading]);

  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      const res = await cancelBooking(cancellingBooking.id);
      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBooking.id ? { ...b, status: 'CANCELLED' } : b))
      );
      if (selectedPass?.id === cancellingBooking.id) {
        setSelectedPass((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }
      setCancellingBooking(null);
      setCancelSuccessMsg(`Reservation ${res.booking.id} has been cancelled successfully.`);
      setTimeout(() => setCancelSuccessMsg(''), 5000);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Categorize bookings
  const categorized = useMemo(() => {
    const upcoming = [];
    const past = [];
    const cancelled = [];

    bookings.forEach((b) => {
      if (b.status === 'CANCELLED') {
        cancelled.push(b);
      } else if (isBookingPast(b)) {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });

    // Sort upcoming closest-date first
    upcoming.sort((a, b) => getBookingTimestamp(a) - getBookingTimestamp(b));

    // Sort past most-recent first
    past.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

    // Sort cancelled most-recent first
    cancelled.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

    return { upcoming, past, cancelled };
  }, [bookings]);

  // Derived real metrics
  const upcomingCount = categorized.upcoming.length;
  const pastCount = categorized.past.length;
  const cancelledCount = categorized.cancelled.length;
  const totalCount = bookings.length;
  const pointsEarned = pastCount * 10; // +10 points per completed eligible booking

  // Active filtered list
  const filteredBookings = useMemo(() => {
    let list = [];
    if (activeTab === 'UPCOMING') list = categorized.upcoming;
    else if (activeTab === 'PAST') list = categorized.past;
    else if (activeTab === 'CANCELLED') list = categorized.cancelled;
    else list = bookings;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.venueName?.toLowerCase().includes(q) ||
          b.courtName?.toLowerCase().includes(q) ||
          b.sport?.toLowerCase().includes(q) ||
          b.venueLocation?.toLowerCase().includes(q) ||
          b.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, categorized, bookings, searchQuery]);

  // Earliest upcoming booking spotlight
  const nextMatch = categorized.upcoming.length > 0 ? categorized.upcoming[0] : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <Ticket className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personal Management</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">Court Schedule</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              My Court Bookings
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
              Review your reserved match times, access venue directions, and manage upcoming court schedules.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <span>Book Another Court</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {cancelSuccessMsg && (
          <div
            role="status"
            className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{cancelSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setCancelSuccessMsg('')}
              className="p-1 text-emerald-400 hover:text-emerald-200 rounded-lg"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview Stats Strip - 100% Real Data Driven */}
        <section aria-label="Bookings overview summary" className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Upcoming</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{upcomingCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Confirmed future games</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{pastCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Past sessions played</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Loyalty Pts</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-400">{pointsEarned}</p>
            <p className="text-[11px] text-slate-400 mt-1">+10 pts per game</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total History</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Reservations logged</p>
          </div>
        </section>

        {/* Spotlight Next Upcoming Game (If active upcoming exists) */}
        {!loading && nextMatch && activeTab !== 'PAST' && activeTab !== 'CANCELLED' && (
          <section aria-label="Next upcoming match spotlight" className="mt-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900 border border-emerald-500/30 p-6 sm:p-7 shadow-xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      Next Game
                    </span>
                    {getRelativeDayLabel(nextMatch.date) && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        {getRelativeDayLabel(nextMatch.date)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      #{nextMatch.id}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {nextMatch.venueName}
                    </h2>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      {nextMatch.courtName} {nextMatch.sport ? `• ${nextMatch.sport}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">{formatBookingDate(nextMatch.date)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">{nextMatch.startTime} - {nextMatch.endTime}</span>
                    </div>

                    {nextMatch.venueLocation && (
                      <div className="flex items-center gap-1.5 text-slate-400 hidden sm:flex">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="truncate max-w-[240px]">{nextMatch.venueLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800 flex-wrap">
                  <div className="mr-4 text-left lg:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rate</span>
                    <span className="text-2xl font-black text-emerald-400">₹{nextMatch.totalPrice}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPass(nextMatch)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    View Match Pass
                  </button>

                  {nextMatch.venueId && (
                    <Link
                      to={`/venues/${nextMatch.venueId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                    >
                      <span>Venue Directions</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filter Navigation & Search Bar */}
        <section aria-label="Bookings filters" className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Segmented Filter Tabs */}
            <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                aria-pressed={activeTab === 'UPCOMING'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'UPCOMING'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Upcoming</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'UPCOMING' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {upcomingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PAST')}
                aria-pressed={activeTab === 'PAST'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'PAST'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Past Games</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'PAST' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pastCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CANCELLED')}
                aria-pressed={activeTab === 'CANCELLED'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'CANCELLED'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Cancelled</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'CANCELLED' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cancelledCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                aria-pressed={activeTab === 'ALL'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>All</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'ALL' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {totalCount}
                </span>
              </button>
            </div>

            {/* In-page Filter Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venue or sport…"
                aria-label="Filter your bookings"
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear filter search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Content Section: List, Loading, Empty, or Error */}
        <section aria-label="Bookings list" className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Retrieving Court Reservations…
              </p>
            </div>
          ) : error ? (
            <div className="p-8 bg-slate-900/90 rounded-3xl border border-rose-500/30 text-center max-w-lg mx-auto shadow-xl" role="alert">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Unable to Load Bookings</h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={loadBookings}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Retry Request
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 sm:p-16 bg-slate-900/60 rounded-3xl border border-slate-800 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <Calendar className="w-8 h-8 stroke-[1.5]" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1.5">
                {searchQuery
                  ? 'No Matching Bookings'
                  : activeTab === 'UPCOMING'
                  ? 'No Upcoming Games Scheduled'
                  : activeTab === 'PAST'
                  ? 'No Past Match Records'
                  : activeTab === 'CANCELLED'
                  ? 'No Cancelled Reservations'
                  : 'No Bookings Found'}
              </h3>

              <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
                {searchQuery
                  ? `No reservations match "${searchQuery}". Try clearing your search.`
                  : activeTab === 'UPCOMING'
                  ? 'You currently have zero active court holds. Find an open slot and get ready to play.'
                  : activeTab === 'PAST'
                  ? 'Completed court sessions and match archives will appear here after playtime ends.'
                  : activeTab === 'CANCELLED'
                  ? 'All your current bookings remain active and confirmed.'
                  : "You haven't reserved any sports courts yet. Explore verified facilities in your area."}
              </p>

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                >
                  Clear Search Filter
                </button>
              ) : (
                <Link
                  to="/venues"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <span>Explore Open Courts</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const isConfirmed = b.status === 'CONFIRMED';
                const isPast = isBookingPast(b);
                const isUpcoming = isConfirmed && !isPast;
                const sportStyle = getSportStyle(b.sport);
                const SportIcon = sportStyle.icon;
                const dayLabel = getRelativeDayLabel(b.date);

                return (
                  <article
                    key={b.id}
                    className={`rounded-2xl border transition-all relative overflow-hidden backdrop-blur-md ${
                      isUpcoming
                        ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5'
                        : isConfirmed
                        ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                        : 'bg-slate-950/60 border-slate-800/50 opacity-75'
                    }`}
                  >
                    {/* Top status indicator bar */}
                    <div className={`h-1 w-full ${
                      isUpcoming
                        ? 'bg-emerald-500'
                        : isConfirmed
                        ? 'bg-slate-700'
                        : 'bg-rose-500/40'
                    }`} />

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        
                        {/* Left Info Column */}
                        <div className="space-y-2.5 min-w-0">
                          {/* Badges strip */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                              #{b.id}
                            </span>

                            {/* Status badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isUpcoming
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : isConfirmed
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {isUpcoming ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Confirmed • Upcoming</span>
                                </>
                              ) : isConfirmed ? (
                                <>
                                  <Check className="w-3 h-3 text-slate-400" />
                                  <span>Completed</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>Cancelled</span>
                                </>
                              )}
                            </span>

                            {/* Relative Day Indicator */}
                            {dayLabel && isUpcoming && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[11px] font-black uppercase">
                                {dayLabel}
                              </span>
                            )}

                            {/* Sport Badge */}
                            {b.sport && (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${sportStyle.bg} ${sportStyle.text} ${sportStyle.border}`}>
                                <SportIcon className="w-3 h-3" aria-hidden="true" />
                                <span>{b.sport}</span>
                              </span>
                            )}
                          </div>

                          {/* Venue & Court Headline */}
                          <div>
                            <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                              {b.venueId ? (
                                <Link
                                  to={`/venues/${b.venueId}`}
                                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 group"
                                >
                                  <span>{b.venueName}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                </Link>
                              ) : (
                                b.venueName
                              )}
                            </h2>
                            <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                              {b.courtName}
                            </p>
                          </div>

                          {/* Schedule & Location Details */}
                          <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-300 flex-wrap pt-1">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{formatBookingDate(b.date)}</span>
                            </span>

                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{b.startTime} - {b.endTime} (1 hr)</span>
                            </span>

                            {b.venueLocation && (
                              <span className="flex items-center gap-1.5 text-slate-400 hidden sm:inline-flex">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate max-w-[200px]">{b.venueLocation}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Financial & Action Controls */}
                        <div className="flex items-center justify-between lg:justify-end gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                          <div className="text-left lg:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Total Rate
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-400">
                              ₹{b.totalPrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* View Pass / Details Modal */}
                            <button
                              type="button"
                              onClick={() => setSelectedPass(b)}
                              className="px-3 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            >
                              Match Pass
                            </button>

                            {/* Venue Facility Link */}
                            {b.venueId && (
                              <Link
                                to={`/venues/${b.venueId}`}
                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
                                title="View venue facility specifications"
                                aria-label={`View venue details for ${b.venueName}`}
                              >
                                <Building2 className="w-4 h-4" />
                              </Link>
                            )}

                            {/* Cancellation Button (Preserved existing flow) */}
                            {isConfirmed && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingBooking(b);
                                  setCancelError(null);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                              >
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* ─── Match Pass / Booking Details Modal ────────────────────────────────────── */}
      {selectedPass && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pass-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPass(null);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pass-modal-title" className="text-base font-black text-white">
                    QuickCourt Match Pass
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Ref: #{selectedPass.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close pass dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pass Ticket Body */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Venue & Location
                </span>
                <p className="text-sm font-black text-white mt-0.5">
                  {selectedPass.venueName}
                </p>
                {selectedPass.venueLocation && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{selectedPass.venueLocation}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Playing Court
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">{selectedPass.courtName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Sport Type
                  </span>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">{selectedPass.sport || 'Sports'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Date
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">{formatBookingDate(selectedPass.date)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Slot Time
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">{selectedPass.startTime} - {selectedPass.endTime}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rate Paid
                </span>
                <span className="text-sm font-black text-emerald-400">
                  ₹{selectedPass.totalPrice}
                </span>
              </div>
            </div>

            {/* Trust & Check-in instructions */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Present this digital pass or your booking reference at venue reception upon arrival.</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {selectedPass.venueId && (
                <Link
                  to={`/venues/${selectedPass.venueId}`}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                >
                  View Venue Page
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancellation Confirmation Dialog (Preserved existing flow) ────────── */}
      {cancellingBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !cancelLoading) {
              setCancellingBooking(null);
              setCancelError(null);
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 id="cancel-dialog-title" className="text-base font-black text-white">
                Cancel Court Reservation?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to cancel your reservation for{' '}
                <strong className="text-white">{cancellingBooking.courtName}</strong> at{' '}
                <strong className="text-white">{cancellingBooking.venueName}</strong> on{' '}
                <strong className="text-emerald-400">{formatBookingDate(cancellingBooking.date)}</strong> from{' '}
                <strong className="text-white">{cancellingBooking.startTime} to {cancellingBooking.endTime}</strong>?
              </p>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium" role="alert">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => {
                  setCancellingBooking(null);
                  setCancelError(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-rose-500 hover:bg-rose-400 rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-rose-500/20"
              >
                {cancelLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling…</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
