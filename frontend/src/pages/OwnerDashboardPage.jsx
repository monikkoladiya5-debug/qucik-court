import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarCheck, CheckCircle2, Clock, AlertCircle,
  XCircle, TrendingUp, RefreshCw, ArrowRight, ShieldCheck,
  Layers, MapPin, Activity, Sparkles, ChevronRight,
  IndianRupee, Store, Trophy, Zap, Flame, Award,
  Check, X, Eye, Calendar, User, Filter, AlertTriangle,
  ChevronLeft, Power, Plus, Pencil, QrCode, KeyRound, Search
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import CourtFormModal from '../components/CourtFormModal';
import { useAuth } from '../context/AuthContext';
import {
  fetchOwnerDashboard,
  approveBooking,
  rejectBooking,
  createCourt,
  updateCourt,
  verifyBookingPass,
  checkInPlayerBooking,
  fetchOwnerPricingIntelligence
} from '../services/api';
import { formatBookingDate, getLocalDateString } from '../utils/date';

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
 * Parses "08:00 AM" into integer hour (0..23).
 */
function parseTimeHour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

/**
 * Formats hour integer 0..23 to "08:00 AM".
 */
function formatHour12(hour) {
  const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:00 ${period}`;
}

/**
 * Status Badge Component for Booking States
 */
function BookingStatusBadge({ status, operationalStatus }) {
  const s = status || operationalStatus || 'REQUESTED';

  if (s === 'REQUESTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
        <Clock className="w-3.5 h-3.5" />
        <span>REQUESTED</span>
      </span>
    );
  }
  if (s === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>APPROVED</span>
      </span>
    );
  }
  if (s === 'PAYMENT_PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
        <IndianRupee className="w-3.5 h-3.5" />
        <span>PAYMENT PENDING</span>
      </span>
    );
  }
  if (s === 'CONFIRMED' || s === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
        <Check className="w-3.5 h-3.5" />
        <span>CONFIRMED</span>
      </span>
    );
  }
  if (s === 'CHECKED_IN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
        <Activity className="w-3.5 h-3.5" />
        <span>CHECKED IN</span>
      </span>
    );
  }
  if (s === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>COMPLETED</span>
      </span>
    );
  }
  if (s === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
        <XCircle className="w-3.5 h-3.5" />
        <span>REJECTED</span>
      </span>
    );
  }
  if (s === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
        <XCircle className="w-3.5 h-3.5" />
        <span>CANCELLED</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
      <span>{s}</span>
    </span>
  );
}

/**
 * Metric Card for Executive KPI Strip
 */
function MetricCard({ title, value, subtitle, icon: Icon, iconColor, pulseDot, isCurrency }) {
  return (
    <div className="p-5 rounded-3xl border border-slate-800/90 bg-slate-900/90 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} bg-slate-950 border border-slate-800 shadow-inner`}>
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-black text-white tracking-tight ${isCurrency ? 'font-mono' : ''}`}>
            {value}
          </span>
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
 * Booking Details Modal
 */
function BookingDetailModal({ booking, onClose, onApprove, onReject, actionLoading }) {
  if (!booking) return null;

  const SportIcon = SPORT_ICONS[booking.sport] || Activity;
  const isPending = booking.status === 'REQUESTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                {booking.id}
              </span>
              <BookingStatusBadge status={booking.status} operationalStatus={booking.operationalStatus} />
            </div>
            <h3 className="text-lg font-black text-white mt-1">Reservation Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Player</span>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{booking.playerName || booking.customerName || 'Player'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Sport / Facility</span>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <SportIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{booking.sport}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{booking.venueName} • {booking.courtName}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Date & Time</span>
              <div className="font-bold text-slate-200">{formatBookingDate(booking.date)}</div>
              <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                {booking.startTime} - {booking.endTime} ({booking.durationHours || 1} hr{booking.durationHours > 1 ? 's' : ''})
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Financials</span>
              <div className="font-mono font-black text-white text-base">₹{booking.totalPrice}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Rate: ₹{booking.pricePerHour}/hr • Payment: {booking.paymentStatus || 'PENDING'}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Created: {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'}</span>
            {booking.paymentMethod && <span>Method: <strong className="text-slate-300">{booking.paymentMethod}</strong></span>}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Close
          </button>

          {isPending && (
            <>
              <button
                onClick={() => onReject(booking.id)}
                disabled={actionLoading === booking.id}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition disabled:opacity-50"
              >
                {actionLoading === booking.id ? 'Processing...' : 'Reject Request'}
              </button>
              <button
                onClick={() => onApprove(booking.id)}
                disabled={actionLoading === booking.id}
                className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{actionLoading === booking.id ? 'Processing...' : 'Approve Booking'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnerDashboardInner() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Selected booking for detail modal inspection
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Check-In Verification State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(null);

  // Court Add / Edit Form Modal state
  const [courtModal, setCourtModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', court: object }
  const [courtModalLoading, setCourtModalLoading] = useState(false);
  const [courtModalError, setCourtModalError] = useState(null);

  // Today's schedule date filter (defaults to local today)
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [scheduleDate, setScheduleDate] = useState(todayStr);

  // Active view tab for recent booking list
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

  // Smart Pricing & Market Intelligence state
  const [pricingIntelligence, setPricingIntelligence] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  // Current hour for real-time court occupancy calculation
  const currentHour = useMemo(() => new Date().getHours(), []);

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

    // Fetch pricing intelligence asynchronously
    try {
      setPricingLoading(true);
      setPricingError(null);
      const pRes = await fetchOwnerPricingIntelligence();
      setPricingIntelligence(pRes);
    } catch (pErr) {
      setPricingError(pErr.message || 'Unable to load pricing intelligence telemetry.');
    } finally {
      setPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle Verify Check-In Token or QR Payload
  const handleVerifyPass = async (e) => {
    if (e) e.preventDefault();
    if (!verifyInput.trim()) {
      setVerifyError('Please enter a Check-In Token or QR payload string.');
      return;
    }
    try {
      setVerifyLoading(true);
      setVerifyError(null);
      setVerifiedBooking(null);
      setCheckInSuccess(null);
      const res = await verifyBookingPass(verifyInput.trim());
      if (res?.status === 'ok' && res?.booking) {
        setVerifiedBooking(res.booking);
      } else {
        throw new Error(res?.message || 'Verification failed');
      }
    } catch (err) {
      setVerifyError(err.message || 'Invalid or unknown check-in token.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handle Owner Check-In Action
  const handleCheckIn = async (bookingId) => {
    try {
      setCheckInLoading(true);
      setVerifyError(null);
      const res = await checkInPlayerBooking(bookingId);
      if (res?.status === 'ok' && res?.booking) {
        setCheckInSuccess(`Player ${res.booking.playerName || res.booking.customerName || 'Player'} has been successfully checked in!`);
        setVerifiedBooking(res.booking);
        // Refresh live dashboard so schedule and stats update authoritatively
        await loadDashboard();
      } else {
        throw new Error(res?.message || 'Check-in failed');
      }
    } catch (err) {
      setVerifyError(err.message || 'Check-in request failed.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleClearVerify = () => {
    setVerifyInput('');
    setVerifiedBooking(null);
    setVerifyError(null);
    setCheckInSuccess(null);
  };

  // Handle Approve Action (Authoritative backend call)
  const handleApprove = async (bookingId) => {
    try {
      setActionLoading(bookingId);
      setActionFeedback(null);
      const res = await approveBooking(bookingId);
      if (res?.status === 'ok') {
        setActionFeedback({
          type: 'success',
          message: `Booking ${bookingId} approved successfully. Awaiting payment from player.`
        });
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking(null);
        }
        await loadDashboard();
      } else {
        throw new Error(res?.message || 'Approval failed');
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Failed to approve booking ${bookingId}.`
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Action (Authoritative backend call)
  const handleReject = async (bookingId) => {
    try {
      setActionLoading(bookingId);
      setActionFeedback(null);
      const res = await rejectBooking(bookingId);
      if (res?.status === 'ok') {
        setActionFeedback({
          type: 'success',
          message: `Booking ${bookingId} has been rejected.`
        });
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking(null);
        }
        await loadDashboard();
      } else {
        throw new Error(res?.message || 'Rejection failed');
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Failed to reject booking ${bookingId}.`
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Court Active/Inactive Status Toggle
  const handleToggleCourtActive = async (court) => {
    try {
      setActionLoading(`court-${court.id}`);
      setActionFeedback(null);
      const nextActiveState = !court.isActive;
      const res = await updateCourt(court.id, { isActive: nextActiveState });
      if (res?.status === 'ok') {
        setActionFeedback({
          type: 'success',
          message: `Court "${court.name}" status updated to ${nextActiveState ? 'ACTIVE' : 'OFFLINE / INACTIVE'}.`
        });
        await loadDashboard();
      } else {
        throw new Error(res?.message || 'Failed to update court status');
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Failed to update court "${court.name}".`
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Court Creation / Update
  const handleSaveCourt = async (courtData) => {
    try {
      setCourtModalLoading(true);
      setCourtModalError(null);
      if (courtModal?.mode === 'add') {
        const venueId = courtData.venueId || (venues.length > 0 ? venues[0].id : null);
        if (!venueId) throw new Error('No facility available to add court to.');
        const res = await createCourt(venueId, courtData);
        if (res?.status === 'ok') {
          setActionFeedback({
            type: 'success',
            message: `Court "${courtData.name}" created and deployed to fleet!`
          });
          setCourtModal(null);
          await loadDashboard();
        } else {
          throw new Error(res?.message || 'Failed to create court');
        }
      } else if (courtModal?.mode === 'edit') {
        const res = await updateCourt(courtModal.court.id, courtData);
        if (res?.status === 'ok') {
          setActionFeedback({
            type: 'success',
            message: `Court "${courtData.name}" specifications updated!`
          });
          setCourtModal(null);
          await loadDashboard();
        } else {
          throw new Error(res?.message || 'Failed to update court');
        }
      }
    } catch (err) {
      setCourtModalError(err.message || 'Failed to save court specifications.');
    } finally {
      setCourtModalLoading(false);
    }
  };

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
  const courts = data?.courts || [];
  const bookings = data?.recentBookings || [];

  // Filter pending requests strictly
  const pendingRequests = useMemo(() => {
    return bookings.filter((b) => b.status === 'REQUESTED');
  }, [bookings]);

  // Today's bookings
  const todaysBookings = useMemo(() => {
    return bookings.filter((b) => b.date === todayStr);
  }, [bookings, todayStr]);

  // Selected date's bookings for schedule visualization
  const scheduleBookings = useMemo(() => {
    return bookings.filter((b) => b.date === scheduleDate);
  }, [bookings, scheduleDate]);

  // Authoritative operational calculations for court fleet
  const courtOperationalStates = useMemo(() => {
    const states = new Map();

    for (const court of courts) {
      if (!court.isActive) {
        states.set(court.id, { status: 'INACTIVE', currentBooking: null });
        continue;
      }

      // Check for active booking right now
      const activeRightNow = bookings.find((b) => {
        if (b.courtId !== court.id || b.date !== todayStr) return false;
        if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
        const sH = parseTimeHour(b.startTime);
        const eH = parseTimeHour(b.endTime);
        if (sH === null || eH === null) return false;
        return currentHour >= sH && currentHour < eH;
      });

      if (activeRightNow) {
        states.set(court.id, { status: 'OCCUPIED', currentBooking: activeRightNow });
      } else {
        states.set(court.id, { status: 'AVAILABLE', currentBooking: null });
      }
    }

    return states;
  }, [courts, bookings, todayStr, currentHour]);

  // Currently occupied courts count
  const occupiedCourtsCount = useMemo(() => {
    let count = 0;
    for (const state of courtOperationalStates.values()) {
      if (state.status === 'OCCUPIED') count++;
    }
    return count;
  }, [courtOperationalStates]);

  // Available courts count
  const availableCourtsCount = useMemo(() => {
    let count = 0;
    for (const state of courtOperationalStates.values()) {
      if (state.status === 'AVAILABLE') count++;
    }
    return count;
  }, [courtOperationalStates]);

  // Filtered booking activity list
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'REQUESTED') return b.status === 'REQUESTED';
      if (activeTab === 'CONFIRMED') return b.status === 'CONFIRMED' || b.status === 'PAID';
      if (activeTab === 'COMPLETED') return b.operationalStatus === 'COMPLETED' || b.status === 'COMPLETED';
      if (activeTab === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'REJECTED';
      return true;
    });
  }, [bookings, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
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

            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
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
              Facility schedule management, pending reservation approvals, real-time court fleet occupancy, and verified revenue for{' '}
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

        {/* ─── Global Action Feedback Toast / Alert ───────────────────────────── */}
        {actionFeedback && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xl transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-bold">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs p-1 opacity-70 hover:opacity-100 transition"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Error Alert State ─────────────────────────────────────────────── */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-900/90 border border-slate-800 rounded-3xl p-5" />
              ))}
            </div>
            <div className="h-64 bg-slate-900/90 border border-slate-800 rounded-3xl" />
            <div className="h-64 bg-slate-900/90 border border-slate-800 rounded-3xl" />
          </div>
        )}

        {/* ─── Dashboard Content ─────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="space-y-8">
            
            {/* ── 1. Authoritative Operational Metrics (HUD) ──────────────────── */}
            <section aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="sr-only">Owner Business Performance Metrics</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* 1. Confirmed Booking Revenue (Hero KPI) */}
                <div className="p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Confirmed Revenue</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
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

                {/* 2. Today's Bookings */}
                <MetricCard
                  title="Today's Bookings"
                  value={todaysBookings.length}
                  subtitle={todaysBookings.length === 1 ? '1 match scheduled today' : `${todaysBookings.length} matches scheduled today`}
                  icon={Calendar}
                  iconColor="text-sky-400"
                  pulseDot={todaysBookings.length > 0}
                />

                {/* 3. Pending Approvals */}
                <MetricCard
                  title="Pending Approvals"
                  value={pendingRequests.length}
                  subtitle={pendingRequests.length === 0 ? 'All requests resolved' : 'Awaiting owner action'}
                  icon={Clock}
                  iconColor={pendingRequests.length > 0 ? 'text-amber-400' : 'text-slate-500'}
                  pulseDot={pendingRequests.length > 0}
                />

                {/* 4. Active & Available Courts */}
                <MetricCard
                  title="Available Courts"
                  value={availableCourtsCount}
                  subtitle={`Of ${courts.length} total courts`}
                  icon={Layers}
                  iconColor="text-emerald-400"
                />

                {/* 5. Occupied Courts Right Now */}
                <MetricCard
                  title="Currently Occupied"
                  value={occupiedCourtsCount}
                  subtitle={occupiedCourtsCount > 0 ? 'Courts in active match' : 'No active match right now'}
                  icon={Activity}
                  iconColor="text-indigo-400"
                />
              </div>
            </section>

            {/* ── 2. Player Check-In & Token Verification Section ────────────── */}
            <section aria-labelledby="checkin-verification-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <h2 id="checkin-verification-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    Player Check-In & Verification
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter the player's Check-In Token (e.g. <span className="font-mono text-slate-300">CHK-XXXX-YYYY-ZZZZ</span>) or paste QR payload to verify credentials and check in player upon arrival.
                  </p>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleVerifyPass} className="mt-5 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    id="input-checkin-token"
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Enter Check-In Token or paste QR payload (e.g. CHK-17BA-1DCD-FD46)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-verify-token"
                    type="submit"
                    disabled={verifyLoading || !verifyInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Search className={`w-4 h-4 stroke-[2.5] ${verifyLoading ? 'animate-spin' : ''}`} />
                    <span>{verifyLoading ? 'Verifying...' : 'Verify Pass'}</span>
                  </button>

                  {(verifiedBooking || verifyInput || verifyError || checkInSuccess) && (
                    <button
                      type="button"
                      onClick={handleClearVerify}
                      className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>

              {/* Error Feedback */}
              {verifyError && (
                <div role="alert" className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2.5 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Check-In Success Toast */}
              {checkInSuccess && (
                <div role="status" className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{checkInSuccess}</span>
                </div>
              )}

              {/* Authoritative Verified Pass Card */}
              {verifiedBooking && (
                <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                          {verifiedBooking.id}
                        </span>
                        {verifiedBooking.checkInToken && (
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            {verifiedBooking.checkInToken}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-white mt-1.5 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>{verifiedBooking.playerName || verifiedBooking.customerName || 'Player'}</span>
                      </h3>
                    </div>

                    <div>
                      <BookingStatusBadge status={verifiedBooking.status} />
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4 text-xs">
                    <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Facility & Court</span>
                      <div className="font-bold text-white text-sm">{verifiedBooking.courtName}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{verifiedBooking.venueName} • {verifiedBooking.sport}</div>
                    </div>

                    <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Date & Time</span>
                      <div className="font-bold text-slate-200">{formatBookingDate(verifiedBooking.date)}</div>
                      <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                        {verifiedBooking.startTime} - {verifiedBooking.endTime} ({verifiedBooking.durationHours || 1} hr{verifiedBooking.durationHours > 1 ? 's' : ''})
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Financial State</span>
                      <div className="font-mono font-black text-white text-sm">₹{verifiedBooking.totalPrice}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Method: <strong className="text-slate-200">{verifiedBooking.paymentMethod || 'N/A'}</strong> ({verifiedBooking.paymentStatus || 'PENDING'})
                      </div>
                    </div>
                  </div>

                  {/* Payment Alert Banner */}
                  {verifiedBooking.paymentMethod === 'Pay at Venue' && verifiedBooking.paymentStatus === 'PENDING' ? (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-bold">
                      <IndianRupee className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>PAYMENT DUE AT VENUE — Collect ₹{verifiedBooking.totalPrice} before or upon court admission.</span>
                    </div>
                  ) : verifiedBooking.paymentStatus === 'PAID' ? (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>PAID ONLINE — Reservation paid in full via {verifiedBooking.paymentMethod || 'Online'}.</span>
                    </div>
                  ) : null}

                  {/* Action Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Authoritative server verification complete.
                    </span>

                    {verifiedBooking.status === 'CONFIRMED' ? (
                      <button
                        id="btn-confirm-checkin"
                        onClick={() => handleCheckIn(verifiedBooking.id)}
                        disabled={checkInLoading}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{checkInLoading ? 'Checking In...' : 'CHECK IN PLAYER'}</span>
                      </button>
                    ) : verifiedBooking.status === 'CHECKED_IN' ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-bold font-mono">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>PLAYER CHECKED IN</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </section>

            {/* ── 3. Pending Booking Requests Section ──────────────────────────── */}
            <section aria-labelledby="pending-requests-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="pending-requests-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Pending Booking Requests
                    </h2>
                    {pendingRequests.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        {pendingRequests.length} action required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and act on incoming player booking requests across your managed facilities.
                  </p>
                </div>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No pending booking requests</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    All customer reservation requests have been processed. New requests will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingRequests.map((b) => {
                    const SportIcon = SPORT_ICONS[b.sport] || Activity;
                    const isProcessing = actionLoading === b.id;

                    return (
                      <div
                        key={b.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Row: ID & Status */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="font-mono text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                              {b.id}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              <Clock className="w-3 h-3" />
                              REQUESTED
                            </span>
                          </div>

                          {/* Player & Sport Info */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{b.playerName || b.customerName || 'Player'}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 font-medium">
                                {b.venueName} • <span className="text-slate-300">{b.courtName}</span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                              <SportIcon className="w-3 h-3 text-emerald-400" />
                              <span>{b.sport}</span>
                            </span>
                          </div>

                          {/* Date, Complete Time Interval & Duration */}
                          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/70 rounded-xl border border-slate-800/80 mb-4 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Date & Interval</span>
                              <span className="font-semibold text-slate-200 block">{formatBookingDate(b.date)}</span>
                              <span className="font-mono text-[11px] text-emerald-400 block font-semibold">
                                {b.startTime} - {b.endTime}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Duration & Amount</span>
                              <span className="font-semibold text-slate-300 block">
                                {b.durationHours || 1} hr{b.durationHours > 1 ? 's' : ''} continuous
                              </span>
                              <span className="font-mono font-black text-white text-sm block">
                                ₹{b.totalPrice}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition"
                            title="Inspect details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            id={`btn-reject-${b.id}`}
                            onClick={() => handleReject(b.id)}
                            disabled={isProcessing}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition disabled:opacity-50 text-center"
                          >
                            {isProcessing ? 'Processing...' : 'Reject'}
                          </button>

                          <button
                            id={`btn-approve-${b.id}`}
                            onClick={() => handleApprove(b.id)}
                            disabled={isProcessing}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── 3. Today's Booking Schedule Timeline ─────────────────────────── */}
            <section aria-labelledby="schedule-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <h2 id="schedule-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-emerald-400" />
                    Facility Booking Schedule & Interval Grid
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Organized by court and time. Multi-hour reservations occupy their complete interval.
                  </p>
                </div>

                {/* Date Selector */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-400">Date:</span>
                  <input
                    type="date"
                    id="input-schedule-date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {scheduleDate !== todayStr && (
                    <button
                      onClick={() => setScheduleDate(todayStr)}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-xl border border-emerald-500/20 transition"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>

              {courts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No courts registered under your account. Register venues and courts to see schedule grids.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {courts.map((court) => {
                    const SportIcon = SPORT_ICONS[court.sport] || Activity;
                    const courtBookings = scheduleBookings.filter((b) => b.courtId === court.id);
                    const venue = venues.find((v) => v.id === court.venueId);

                    return (
                      <div key={court.id} className="p-4 sm:p-5 rounded-2xl border border-slate-800/90 bg-slate-950">
                        {/* Court Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                              <SportIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-black text-white text-sm">{court.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {venue ? venue.name : 'Facility'} • <span className="text-emerald-400 font-mono">₹{court.pricePerHour}/hr</span> • {court.operatingHours || '06:00 AM - 10:00 PM'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                              court.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${court.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                              {court.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {courtBookings.length} booking{courtBookings.length === 1 ? '' : 's'} on {formatBookingDate(scheduleDate)}
                            </span>
                          </div>
                        </div>

                        {/* Court Schedule Grid / Intervals */}
                        {courtBookings.length === 0 ? (
                          <div className="py-6 px-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800/80 text-center">
                            <span className="text-xs text-slate-500">
                              No bookings scheduled on this court for {formatBookingDate(scheduleDate)}. All slots available.
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {courtBookings.map((b) => {
                              const sH = parseTimeHour(b.startTime);
                              const eH = parseTimeHour(b.endTime);
                              const duration = (sH !== null && eH !== null && eH > sH) ? (eH - sH) : 1;
                              const isMultiHour = duration > 1;

                              return (
                                <button
                                  key={b.id}
                                  onClick={() => setSelectedBooking(b)}
                                  className={`p-3.5 rounded-xl border text-left transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                    b.status === 'REQUESTED'
                                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                                      : b.status === 'APPROVED'
                                      ? 'bg-sky-500/5 border-sky-500/30 hover:border-sky-500/50'
                                      : b.status === 'PAYMENT_PENDING'
                                      ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50'
                                      : b.status === 'CONFIRMED' || b.status === 'PAID'
                                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
                                      : b.status === 'CANCELLED' || b.status === 'REJECTED'
                                      ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 opacity-70'
                                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {/* Interval Time Badge */}
                                  <div className="flex items-center justify-between gap-1 mb-1.5">
                                    <span className="font-mono text-xs font-black text-white">
                                      {b.startTime} - {b.endTime}
                                    </span>
                                    {isMultiHour && (
                                      <span className="text-[10px] font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 border border-slate-800">
                                        {duration} hrs
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-bold text-slate-200 truncate">
                                    {b.playerName || b.customerName || 'Player'}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                                    <span className="font-mono font-bold text-slate-300">₹{b.totalPrice}</span>
                                    <BookingStatusBadge status={b.status} operationalStatus={b.operationalStatus} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── 4. Court Fleet Operations & Inventory ────────────────────────── */}
            <section aria-labelledby="fleet-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
                <div>
                  <h2 id="fleet-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    Court Inventory & Maintenance Fleet ({courts.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time operational status, surface specs, tariffs, and maintenance controls across all facilities.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                  <button
                    id="btn-owner-add-court"
                    onClick={() => { setCourtModal({ mode: 'add' }); setCourtModalError(null); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded-xl shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Court</span>
                  </button>

                  <Link
                    to="/owner/venues"
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-colors"
                  >
                    <span>Facility Builder</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {courts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <p>No courts registered yet.</p>
                  <button
                    onClick={() => { setCourtModal({ mode: 'add' }); setCourtModalError(null); }}
                    className="mt-3 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition"
                  >
                    Add First Court
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courts.map((court) => {
                    const SportIcon = SPORT_ICONS[court.sport] || Activity;
                    const opState = courtOperationalStates.get(court.id) || { status: 'AVAILABLE', currentBooking: null };
                    const venue = venues.find((v) => v.id === court.venueId);
                    const isToggling = actionLoading === `court-${court.id}`;

                    return (
                      <div
                        key={court.id}
                        className={`p-5 rounded-3xl border bg-slate-950 transition flex flex-col justify-between shadow-lg ${
                          court.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-85'
                        }`}
                      >
                        <div>
                          {/* Top Status Strip */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                                <SportIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-white">{court.name}</h3>
                                <p className="text-[11px] text-slate-400">{venue?.name || 'Venue'}</p>
                              </div>
                            </div>

                            {/* Operational Status Tag */}
                            {opState.status === 'OCCUPIED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                OCCUPIED
                              </span>
                            ) : opState.status === 'INACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                INACTIVE / OFFLINE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                AVAILABLE
                              </span>
                            )}
                          </div>

                          {/* Court Specs */}
                          <div className="space-y-1.5 py-3 border-y border-slate-800/80 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Sport & Surface:</span>
                              <span className="font-semibold text-slate-200">{court.sport} ({court.courtType || 'Standard'})</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Hourly Tariff:</span>
                              <span className="font-mono font-bold text-emerald-400">₹{court.pricePerHour}/hr</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Operating Window:</span>
                              <span className="font-mono text-slate-300 text-[11px]">{court.operatingHours || '06:00 AM - 10:00 PM'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Environment:</span>
                              <span className="text-slate-300 text-[11px]">{court.indoor ? 'Indoor Hall' : 'Outdoor Complex'}</span>
                            </div>
                            {opState.status === 'OCCUPIED' && opState.currentBooking && (
                              <div className="mt-2 p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-300">
                                <strong>Active Match:</strong> {opState.currentBooking.startTime} - {opState.currentBooking.endTime} ({opState.currentBooking.playerName || 'Player'})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="pt-3.5 flex items-center justify-between gap-2 text-xs">
                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => handleToggleCourtActive(court)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition border focus:outline-none ${
                              court.isActive
                                ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                            title={court.isActive ? 'Deactivate court (take offline for maintenance)' : 'Activate court for public player bookings'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isToggling ? 'Updating...' : (court.isActive ? 'Set Inactive / Offline' : 'Activate Court')}</span>
                          </button>

                          {/* Edit Court Specs Button */}
                          <button
                            id={`btn-edit-court-${court.id}`}
                            onClick={() => { setCourtModal({ mode: 'edit', court }); setCourtModalError(null); }}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition"
                            title="Edit court specifications"
                            aria-label={`Edit ${court.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── 4.5 Smart Pricing & Market Intelligence ─────────────────────── */}
            <section aria-labelledby="smart-pricing-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs font-black uppercase tracking-wider">
                      Advisory Telemetry
                    </span>
                    <span className="text-xs font-bold text-slate-500">•</span>
                    <span className="text-xs font-medium text-slate-400">Server-Authoritative Pricing</span>
                  </div>
                  <h2 id="smart-pricing-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Smart Pricing & Market Intelligence
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deterministic market rate analysis, peak vs off-peak utilization telemetry, and non-destructive advisory recommendations for your court fleet.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Strict Isolation
                  </span>
                </div>
              </div>

              {pricingLoading && !pricingIntelligence ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Calculating Market Baseline & Demand Signals…</span>
                </div>
              ) : pricingError ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{pricingError}</span>
                </div>
              ) : !pricingIntelligence?.pricingIntelligence || pricingIntelligence.pricingIntelligence.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No active courts available to compute pricing intelligence. Add courts to your venue to view market telemetry.
                </div>
              ) : (
                <div className="space-y-6">
                  {pricingIntelligence.pricingIntelligence.map((item) => {
                    const matchedCourt = courts.find((c) => c.id === item.courtId);

                    return (
                      <div key={item.courtId} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                        {/* Court Header & Location */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800/80">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-white">{item.courtName}</h3>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                                {item.sport}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {item.venueName} • {item.city}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {matchedCourt && (
                              <button
                                onClick={() => { setCourtModal({ mode: 'edit', court: matchedCourt }); setCourtModalError(null); }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5"
                                title="Update Base Hourly Tariff"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Adjust Base Tariff</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comparative Rate Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* 1. Current Base Rate */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Current Base Rate
                            </span>
                            <div className="text-xl font-black text-white font-mono">
                              ₹{item.basePricePerHour ?? item.smartPricing?.currentBasePrice ?? item.currentBasePrice ?? 0}<span className="text-xs text-slate-400 font-sans font-normal">/hr</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block mt-1">
                              Authoritative configured rate
                            </span>
                          </div>

                          {/* 2. City Market Baseline */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              {item.city || item.marketContext?.city || 'Local'} Market Avg
                            </span>
                            <div className="text-xl font-black text-slate-200 font-mono">
                              ₹{item.marketContext?.marketAvgPrice ?? item.marketMetrics?.averagePrice ?? 0}<span className="text-xs text-slate-400 font-sans font-normal">/hr</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              Range: ₹{item.marketContext?.marketMinPrice ?? item.marketMetrics?.lowestPrice ?? 0} - ₹{item.marketContext?.marketMaxPrice ?? item.marketMetrics?.highestPrice ?? 0}
                            </span>
                          </div>

                          {/* 3. Recommended Peak Rate */}
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                              Advisory Peak Rate
                            </span>
                            <div className="text-xl font-black text-amber-300 font-mono">
                              ₹{item.smartPricing?.recommendedPeakPrice ?? item.recommendedPeakPrice ?? 0}<span className="text-xs text-amber-400/80 font-sans font-normal">/hr</span>
                            </div>
                            <span className="text-[10px] text-amber-400/90 font-medium block mt-1">
                              Evenings & Weekends
                            </span>
                          </div>

                          {/* 4. Recommended Off-Peak Rate */}
                          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                              Advisory Off-Peak Rate
                            </span>
                            <div className="text-xl font-black text-sky-300 font-mono">
                              ₹{item.smartPricing?.recommendedOffPeakPrice ?? item.recommendedOffPeakPrice ?? 0}<span className="text-xs text-sky-400/80 font-sans font-normal">/hr</span>
                            </div>
                            <span className="text-[10px] text-sky-400/90 font-medium block mt-1">
                              Daytime & Non-Peak slots
                            </span>
                          </div>
                        </div>

                        {/* Utilization & Demand Signals */}
                        {(() => {
                          const confirmed = item.metrics?.confirmedBookings ?? item.demandTelemetry?.confirmedBookings ?? 0;
                          const peakSlots = item.metrics?.peakBookingCount ?? item.demandTelemetry?.peakBookings ?? 0;
                          const offPeakSlots = item.metrics?.offPeakBookingCount ?? item.demandTelemetry?.offPeakBookings ?? 0;
                          const peakShare = confirmed > 0 ? Math.round((peakSlots / confirmed) * 100) : (item.demandTelemetry?.peakShare ?? 0);
                          const reason = item.smartPricing?.recommendationReason || item.explanation || 'Market aligned pricing.';

                          return (
                            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-4 flex-wrap">
                                <div>
                                  <span className="text-slate-400">Total Confirmed: </span>
                                  <strong className="text-white font-mono">{confirmed}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Peak Slots: </span>
                                  <strong className="text-amber-400 font-mono">{peakSlots}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Off-Peak Slots: </span>
                                  <strong className="text-sky-400 font-mono">{offPeakSlots}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Peak Share: </span>
                                  <strong className="text-emerald-400 font-mono">{peakShare}%</strong>
                                </div>
                              </div>

                              <div className="text-slate-300 text-[11px] leading-relaxed max-w-xl italic sm:text-right">
                                "{reason}"
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── 5. Booking Activity & Ledger ─────────────────────────────────── */}
            <section aria-labelledby="activity-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <h2 id="activity-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-emerald-400" />
                    All Reservation Activity & Ledger
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Search and inspect reservations placed across all your facilities.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto self-start sm:self-auto max-w-full">
                  {[
                    { key: 'ALL', label: 'All', count: summary.totalBookings },
                    { key: 'REQUESTED', label: 'Requested', count: pendingRequests.length },
                    { key: 'CONFIRMED', label: 'Confirmed', count: summary.confirmedBookings },
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
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
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
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No bookings match this filter</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {activeTab === 'ALL'
                      ? 'No reservations have been placed at your facilities yet.'
                      : `There are currently no ${activeTab.toLowerCase()} bookings on record.`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto max-w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Reference / Player</th>
                        <th className="py-3 px-3">Facility & Court</th>
                        <th className="py-3 px-3">Sport</th>
                        <th className="py-3 px-3">Date & Time Slot</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3 text-right">Status & Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredBookings.map((b) => {
                        const SportIcon = SPORT_ICONS[b.sport] || Activity;
                        const duration = b.durationHours || 1;

                        return (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 w-fit">
                                  {b.id}
                                </span>
                                <span className="font-semibold text-white text-xs truncate">
                                  {b.playerName || b.customerName || 'Player'}
                                </span>
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
                              <div className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{b.startTime} - {b.endTime}</span>
                                <span className="text-slate-500 text-[10px]">({duration} hr{duration > 1 ? 's' : ''})</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-black text-white text-sm font-mono">
                                ₹{b.totalPrice}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <BookingStatusBadge status={b.status} operationalStatus={b.operationalStatus} />
                                <button
                                  onClick={() => setSelectedBooking(b)}
                                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                                  title="Inspect booking details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* ─── Detail Modal ────────────────────────────────────────────────────── */}
      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        actionLoading={actionLoading}
      />

      {/* ─── Add / Edit Court Modal ─────────────────────────────────────────── */}
      {courtModal && (
        <CourtFormModal
          venues={venues}
          court={courtModal.mode === 'edit' ? courtModal.court : null}
          onSave={handleSaveCourt}
          onClose={() => { setCourtModal(null); setCourtModalError(null); }}
          loading={courtModalLoading}
          error={courtModalError}
        />
      )}

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
