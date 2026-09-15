import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import SportIcon from '../components/ui/SportIcon';
import { fetchMyBookings, cancelBooking, payBooking, rescheduleBooking } from '../services/api';
import { getLocalDateString } from '../utils/date';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Ticket,
  ChevronRight,
  Search,
  X,
  Check,
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  History,
  XCircle,
  CreditCard,
  Wallet,
  Coins,
  Info,
  QrCode,
  KeyRound,
  Copy,
  RefreshCw,
} from 'lucide-react';

const CANCELLATION_REASONS = [
  'Plans changed',
  'Schedule conflict',
  'Found another time',
  'Venue issue',
  'Other',
];

const STANDARD_SLOTS_12H = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

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
  const [activeTab, setActiveTab] = useState('UPCOMING'); // 'UPCOMING' | 'NEEDS_PAYMENT' | 'PAST' | 'CANCELLED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Plans changed');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Rescheduling state
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('08:00 AM');
  const [rescheduleEnd, setRescheduleEnd] = useState('09:00 AM');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);

  // Payment Modal state
  const [payingBooking, setPayingBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Card' | 'Pay at Venue'
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState(null);

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
        if (payingBooking && !payLoading) setPayingBooking(null);
        if (cancellingBooking && !cancelLoading) {
          setCancellingBooking(null);
          setCancelError(null);
        }
        if (reschedulingBooking && !rescheduleLoading) {
          setReschedulingBooking(null);
          setRescheduleError(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPass, payingBooking, payLoading, cancellingBooking, cancelLoading, reschedulingBooking, rescheduleLoading]);

  // Cancel Handler
  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      const res = await cancelBooking(cancellingBooking.id, {
        reason: cancelReason,
        note: cancelNote,
      });
      const updated = res.booking || {
        ...cancellingBooking,
        status: 'CANCELLED',
        paymentStatus: cancellingBooking.paymentStatus === 'PAID' ? 'REFUNDED' : cancellingBooking.paymentStatus,
      };
      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBooking.id ? { ...b, ...updated } : b))
      );
      if (selectedPass?.id === cancellingBooking.id) {
        setSelectedPass((prev) => (prev ? { ...prev, ...updated } : null));
      }
      setCancellingBooking(null);
      setSuccessMsg(`Reservation #${updated.id} has been cancelled (${cancelReason}).`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reschedule Modal Helper
  const openRescheduleModal = (booking) => {
    setReschedulingBooking(booking);
    setRescheduleDate(booking.date || getLocalDateString());
    setRescheduleStart(booking.startTime || '08:00 AM');
    setRescheduleEnd(booking.endTime || '09:00 AM');
    setRescheduleError(null);
  };

  // Reschedule Handler
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!reschedulingBooking) return;

    try {
      setRescheduleLoading(true);
      setRescheduleError(null);

      const res = await rescheduleBooking(reschedulingBooking.id, {
        date: rescheduleDate,
        startTime: rescheduleStart,
        endTime: rescheduleEnd,
      });

      const updated = res.booking;
      setBookings((prev) =>
        prev.map((b) => (b.id === reschedulingBooking.id ? { ...b, ...updated } : b))
      );
      if (selectedPass?.id === reschedulingBooking.id) {
        setSelectedPass({ ...selectedPass, ...updated });
      }
      setReschedulingBooking(null);
      setSuccessMsg(`Reservation #${updated.id} rescheduled to ${formatBookingDate(updated.date)} (${updated.startTime} - ${updated.endTime}).`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule booking. Please check for scheduling conflicts.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Payment Handler
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payingBooking) return;
    try {
      setPayLoading(true);
      setPayError(null);
      const res = await payBooking(payingBooking.id, { paymentMethod });
      const updated = res.booking;
      setBookings((prev) =>
        prev.map((b) => (b.id === payingBooking.id ? { ...b, ...updated } : b))
      );
      if (selectedPass?.id === payingBooking.id) {
        setSelectedPass({ ...selectedPass, ...updated });
      }
      setPayingBooking(null);
      setSuccessMsg(
        paymentMethod === 'Pay at Venue'
          ? `Booking #${updated.id} confirmed! Payment is scheduled at venue reception.`
          : `Payment successful! Booking #${updated.id} is confirmed.`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setPayError(err.message || 'Failed to process demo payment.');
    } finally {
      setPayLoading(false);
    }
  };


  // Categorize bookings
  const categorized = useMemo(() => {
    const upcoming = [];
    const needsPayment = [];
    const past = [];
    const cancelled = [];

    bookings.forEach((b) => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        cancelled.push(b);
      } else if (isBookingPast(b) || b.status === 'COMPLETED') {
        past.push(b);
      } else {
        upcoming.push(b);
        if (b.status === 'APPROVED' || b.status === 'PAYMENT_PENDING') {
          needsPayment.push(b);
        }
      }
    });

    upcoming.sort((a, b) => getBookingTimestamp(a) - getBookingTimestamp(b));
    needsPayment.sort((a, b) => getBookingTimestamp(a) - getBookingTimestamp(b));
    past.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
    cancelled.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

    return { upcoming, needsPayment, past, cancelled };
  }, [bookings]);

  const upcomingCount = categorized.upcoming.length;
  const needsPaymentCount = categorized.needsPayment.length;
  const pastCount = categorized.past.length;
  const cancelledCount = categorized.cancelled.length;
  const totalCount = bookings.length;

  // Active filtered list
  const filteredBookings = useMemo(() => {
    let list = [];
    if (activeTab === 'UPCOMING') list = categorized.upcoming;
    else if (activeTab === 'NEEDS_PAYMENT') list = categorized.needsPayment;
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
  const nextMatch = categorized.upcoming.find((b) => b.status === 'CONFIRMED' || b.status === 'PAID') || categorized.upcoming[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 relative">
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#28303F]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
              <Ticket className="w-3.5 h-3.5 text-lime-400" />
              <span>Player Portal</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">My Bookings</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Court Bookings & Match Passes
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
              Track your reservation requests, complete pending payments, and manage your match schedule.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <Link to="/venues">
              <Button variant="primary" size="md" icon={ArrowRight}>
                Book a Court
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {successMsg && (
          <div
            role="status"
            className="mt-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-qc-mint"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="p-1 text-emerald-400 hover:text-emerald-200 rounded-lg"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview Stats Strip */}
        <section aria-label="Bookings overview summary" className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card variant="default" className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Bookings</span>
              <div className="w-7 h-7 rounded-lg bg-lime-400/10 text-lime-400 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white font-mono">{upcomingCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Scheduled reservations</p>
          </Card>

          <Card variant="default" className={`p-4 sm:p-5 ${needsPaymentCount > 0 ? 'border-amber-400/60 bg-amber-950/20' : ''}`}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Payment Due</span>
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{needsPaymentCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Approved, awaiting payment</p>
          </Card>

          <Card variant="default" className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white font-mono">{pastCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Past sessions played</p>
          </Card>

          <Card variant="default" className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Lifetime</span>
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <History className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white font-mono">{totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">All booking requests</p>
          </Card>
        </section>

        {/* Spotlight Next Upcoming Game (If active upcoming exists) */}
        {!loading && nextMatch && activeTab !== 'PAST' && activeTab !== 'CANCELLED' && (
          <section aria-label="Next upcoming match spotlight" className="mt-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0F131C] to-[#181C24] border border-lime-400/40 p-6 sm:p-7 shadow-qc-card backdrop-blur-md">
              <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-qc-lime">
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      Next Game
                    </span>
                    {getRelativeDayLabel(nextMatch.date) && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#181C24] text-lime-400 border border-lime-400/30 text-xs font-bold font-mono">
                        {getRelativeDayLabel(nextMatch.date)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono px-2 py-0.5 rounded bg-[#0B0F17] border border-[#28303F]">
                      #{nextMatch.id}
                    </span>
                    <Badge status={nextMatch.status} />
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {nextMatch.venueName}
                    </h2>
                    <p className="text-sm font-bold text-lime-400 mt-0.5 flex items-center gap-1.5">
                      <SportIcon sport={nextMatch.sport} className="w-4 h-4 text-lime-400" />
                      <span>{nextMatch.courtName}</span>
                      {nextMatch.sport && <span className="text-slate-400">• {nextMatch.sport}</span>}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-lime-400" />
                      <span className="font-semibold font-mono">{formatBookingDate(nextMatch.date)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-lime-400" />
                      <span className="font-semibold font-mono">{nextMatch.startTime} - {nextMatch.endTime}</span>
                    </div>

                    {nextMatch.venueLocation && (
                      <div className="flex items-center gap-1.5 text-slate-400 hidden sm:flex">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="truncate max-w-[240px]">{nextMatch.venueLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#28303F] flex-wrap">
                  <div className="mr-4 text-left lg:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rate</span>
                    <span className="text-2xl font-black text-lime-400 font-mono">₹{nextMatch.totalPrice}</span>
                  </div>

                  {(nextMatch.status === 'APPROVED' || nextMatch.status === 'PAYMENT_PENDING') && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CreditCard}
                      onClick={() => {
                        setPayingBooking(nextMatch);
                        setPayError(null);
                      }}
                    >
                      Pay Now
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPass(nextMatch)}
                  >
                    View Match Pass
                  </Button>

                  {nextMatch.venueId && (
                    <Link to={`/venues/${nextMatch.venueId}`}>
                      <Button variant="secondary" size="sm" icon={ChevronRight}>
                        Venue Info
                      </Button>
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
            <div className="inline-flex p-1 bg-[#0F131C] border border-[#28303F] rounded-xl max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                aria-pressed={activeTab === 'UPCOMING'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'UPCOMING'
                    ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Upcoming</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'UPCOMING' ? 'bg-slate-950 text-lime-400' : 'bg-[#181C24] text-slate-400'
                }`}>
                  {upcomingCount}
                </span>
              </button>

              {needsPaymentCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('NEEDS_PAYMENT')}
                  aria-pressed={activeTab === 'NEEDS_PAYMENT'}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'NEEDS_PAYMENT'
                      ? 'bg-amber-400 text-slate-950 shadow-qc-amber'
                      : 'text-amber-400 hover:bg-amber-400/10'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Needs Payment</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeTab === 'NEEDS_PAYMENT' ? 'bg-slate-950 text-amber-400' : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    {needsPaymentCount}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('PAST')}
                aria-pressed={activeTab === 'PAST'}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'PAST'
                    ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Past Games</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'PAST' ? 'bg-slate-950 text-lime-400' : 'bg-[#181C24] text-slate-400'
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
                    ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Cancelled</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'CANCELLED' ? 'bg-slate-950 text-lime-400' : 'bg-[#181C24] text-slate-400'
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
                    ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>All</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'ALL' ? 'bg-slate-950 text-lime-400' : 'bg-[#181C24] text-slate-400'
                }`}>
                  {totalCount}
                </span>
              </button>
            </div>

            {/* In-page Search */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venue or sport…"
                aria-label="Filter your bookings"
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#0F131C] border border-[#28303F] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 transition-colors"
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

        {/* Bookings List */}
        <section aria-label="Bookings list" className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Retrieving Court Reservations…
              </p>
            </div>
          ) : error ? (
            <div className="p-8 bg-[#0F131C] rounded-2xl border border-rose-500/30 text-center max-w-lg mx-auto shadow-qc-card" role="alert">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Unable to Load Bookings</h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
              <Button variant="primary" size="sm" onClick={loadBookings}>
                Retry Request
              </Button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 sm:p-16 bg-[#0F131C]/60 rounded-2xl border border-[#28303F] text-center max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#181C24] text-lime-400 flex items-center justify-center mx-auto mb-4 border border-[#28303F]">
                <Calendar className="w-8 h-8 stroke-[1.5]" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5">
                {searchQuery
                  ? 'No Matching Bookings'
                  : activeTab === 'NEEDS_PAYMENT'
                    ? 'No Payments Due'
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
                  : activeTab === 'NEEDS_PAYMENT'
                    ? 'All your approved bookings have been paid and confirmed.'
                    : activeTab === 'UPCOMING'
                      ? 'You currently have zero active court holds. Find an open slot and get ready to play.'
                      : activeTab === 'PAST'
                        ? 'Completed court sessions and match archives will appear here after playtime ends.'
                        : activeTab === 'CANCELLED'
                          ? 'All your current bookings remain active and confirmed.'
                          : "You haven't reserved any sports courts yet. Explore verified facilities in your area."}
              </p>

              {searchQuery ? (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Search Filter
                </Button>
              ) : (
                <Link to="/venues">
                  <Button variant="primary" size="md" icon={ArrowRight}>
                    Explore Open Courts
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const isConfirmed = b.status === 'CONFIRMED' || b.status === 'PAID';
                const isRequested = b.status === 'REQUESTED';
                const isApproved = b.status === 'APPROVED' || b.status === 'PAYMENT_PENDING';
                const isPast = isBookingPast(b) || b.status === 'COMPLETED';
                const isCancelled = b.status === 'CANCELLED' || b.status === 'REJECTED';
                const isUpcoming = !isPast && !isCancelled;
                const dayLabel = getRelativeDayLabel(b.date);

                // Lifecycle descriptive label
                let statusLabel = b.status;
                if (isRequested) statusLabel = 'Waiting for Approval';
                else if (isApproved) statusLabel = 'Payment Required';
                else if (isConfirmed) statusLabel = 'Booking Confirmed';
                else if (b.status === 'REJECTED') statusLabel = 'Request Rejected';
                else if (b.status === 'CANCELLED') statusLabel = 'Cancelled';
                else if (isPast) statusLabel = 'Completed';

                return (
                  <article
                    key={b.id}
                    className={`rounded-xl border transition-all relative overflow-hidden backdrop-blur-md ${
                      isApproved
                        ? 'bg-[#181C24] border-amber-400/50 hover:shadow-qc-amber'
                        : isUpcoming
                          ? 'bg-[#181C24] border-[#28303F] hover:border-lime-400/50 hover:shadow-qc-card'
                          : 'bg-[#0F131C] border-[#28303F]'
                    }`}
                  >
                    {/* Top status accent bar */}
                    <div className={`h-1 w-full ${
                      isApproved
                        ? 'bg-amber-400'
                        : isConfirmed
                          ? 'bg-emerald-500'
                          : isRequested
                            ? 'bg-yellow-500/70'
                            : isCancelled
                              ? 'bg-rose-500/50'
                              : 'bg-slate-700'
                    }`} />

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Left Column */}
                        <div className="space-y-2.5 min-w-0">
                          {/* Badges strip */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0B0F17] text-slate-400 border border-[#28303F]">
                              #{b.id}
                            </span>

                            {/* Status badge */}
                            <Badge status={b.status} label={statusLabel} />

                            {/* Payment Status Pill */}
                            {b.paymentStatus === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>PAID ({b.paymentMethod || 'UPI'})</span>
                              </span>
                            ) : b.paymentMethod === 'Pay at Venue' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-500/50">
                                <Building2 className="w-3 h-3 text-sky-400" />
                                <span>Pay at Venue</span>
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50">
                                <CreditCard className="w-3 h-3 text-amber-400" />
                                <span>Payment Due</span>
                              </span>
                            ) : null}

                            {/* Relative Day Indicator */}
                            {dayLabel && isUpcoming && (
                              <span className="px-2 py-0.5 rounded-md bg-lime-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                                {dayLabel}
                              </span>
                            )}

                            {/* Sport Badge */}
                            {b.sport && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0F131C] text-slate-300 border border-[#28303F]">
                                <SportIcon sport={b.sport} className="w-3.5 h-3.5 text-lime-400" />
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
                                  className="hover:text-lime-400 transition-colors inline-flex items-center gap-1.5 group"
                                >
                                  <span>{b.venueName}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-lime-400 transition-colors" />
                                </Link>
                              ) : (
                                b.venueName
                              )}
                            </h2>
                            <p className="text-xs font-semibold text-lime-400 mt-0.5">
                              {b.courtName}
                            </p>
                          </div>

                          {/* Schedule & Location Details */}
                          <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-300 flex-wrap pt-1 font-mono">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-lime-400" />
                              <span>{formatBookingDate(b.date)}</span>
                            </span>

                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-lime-400" />
                              <span>{b.startTime} - {b.endTime}</span>
                            </span>

                            {b.venueLocation && (
                              <span className="flex items-center gap-1.5 text-slate-400 hidden sm:inline-flex font-sans">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate max-w-[200px]">{b.venueLocation}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Financial & Action Controls */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#28303F] flex-wrap">
                          <div className="text-left lg:text-right mr-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Rate
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-lime-400 font-mono">
                              ₹{b.totalPrice}
                            </span>
                          </div>

                          {/* Action 1: Pay & Confirm if APPROVED */}
                          {isApproved && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CreditCard}
                              onClick={() => {
                                setPayingBooking(b);
                                setPayError(null);
                              }}
                            >
                              Pay Now
                            </Button>
                          )}


                          {/* Action 2: Reschedule (if upcoming and cancellable/reschedulable) */}
                          {isUpcoming && !isCancelled && b.status !== 'CHECKED_IN' && b.status !== 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={RefreshCw}
                              onClick={() => openRescheduleModal(b)}
                            >
                              Reschedule
                            </Button>
                          )}

                          {/* Action 3: View Match Pass */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPass(b)}
                          >
                            Match Pass
                          </Button>

                          {/* Action 4: Cancel (if uncompleted and not already cancelled) */}
                          {isUpcoming && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingBooking(b);
                                setCancelReason('Plans changed');
                                setCancelNote('');
                                setCancelError(null);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-800/60 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                              <span>Cancel</span>
                            </button>
                          )}
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

      {/* ─── Match Pass Modal ────────────────────────────────────── */}
      {selectedPass && (() => {
        const isConfirmed = ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'].includes(selectedPass.status);
        const qrPayload = JSON.stringify({
          bid: selectedPass.id,
          token: selectedPass.checkInToken || '',
          venue: selectedPass.venueName,
          court: selectedPass.courtName,
          date: selectedPass.date,
          time: `${selectedPass.startTime} - ${selectedPass.endTime}`
        });

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pass-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPass(null);
            }}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative my-4 sm:my-8 text-slate-100">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-[#28303F]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center border border-lime-400/20 shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 id="pass-modal-title" className="text-base font-black text-white truncate">
                        QuickCourt Match Pass
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono break-all">
                        Booking ID: <span className="text-lime-400 font-bold">#{selectedPass.id}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPass(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors shrink-0 ml-2"
                    aria-label="Close pass dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* QR Code & Check-In Token Presentation for Confirmed Bookings */}
                {isConfirmed ? (
                  <div className="space-y-3">
                    {/* QR Code Card */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] text-center">
                      <div className="p-3 bg-white rounded-xl shadow-lg inline-block border-2 border-slate-700">
                        <QRCodeSVG
                          value={qrPayload}
                          size={150}
                          level="M"
                          includeMargin={false}
                          className="w-[140px] h-[140px] sm:w-[150px] sm:h-[150px]"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 mt-2.5 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-lime-400" />
                        Scan at Facility Check-In
                      </span>
                    </div>

                    {/* Check-In Token Banner */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Check-In Token</span>
                      </div>
                      <div className="text-lg font-black font-mono tracking-widest text-emerald-300 select-all">
                        {selectedPass.checkInToken || 'CHK-AUTHORIZING'}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Present this verification token or QR pass to the venue operator upon arrival
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Notice when booking is not yet confirmed */
                  <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-800/50 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mx-auto">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Pass Pending Confirmation
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {selectedPass.status === 'REQUESTED'
                        ? 'Your reservation request is currently awaiting venue approval. An official check-in pass and QR code will be issued once approved and confirmed.'
                        : selectedPass.status === 'APPROVED' || selectedPass.status === 'PAYMENT_PENDING'
                          ? 'This reservation is approved! Please complete payment to issue your official digital check-in pass.'
                          : 'This booking is currently inactive and does not have an active check-in pass.'}
                    </p>
                  </div>
                )}

                {/* Pass Ticket Body */}
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Venue & Location
                    </span>
                    <p className="text-sm font-black text-white mt-0.5 break-words">
                      {selectedPass.venueName}
                    </p>
                    {selectedPass.venueLocation && (
                      <p className="text-xs text-slate-400 flex items-start gap-1 mt-0.5 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
                        <span className="break-words">{selectedPass.venueLocation}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[#28303F]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Playing Court
                      </span>
                      <p className="text-xs font-bold text-white mt-0.5 break-words">{selectedPass.courtName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Sport Type
                      </span>
                      <p className="text-xs font-bold text-lime-400 mt-0.5 flex items-center gap-1">
                        <SportIcon sport={selectedPass.sport} className="w-3.5 h-3.5 text-lime-400" />
                        <span>{selectedPass.sport || 'Sports'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[#28303F]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Date
                      </span>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">{formatBookingDate(selectedPass.date)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Complete Time Interval
                      </span>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">{selectedPass.startTime} - {selectedPass.endTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#28303F]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Booking Rate
                    </span>
                    <span className="text-sm font-black text-lime-400 font-mono">
                      ₹{selectedPass.totalPrice}
                    </span>
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#181C24] border border-[#28303F]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300">Booking Status</span>
                    </div>
                    <Badge status={selectedPass.status} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#181C24] border border-[#28303F]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300">Payment Details</span>
                    </div>
                    <span className="text-xs font-bold text-white font-mono text-right">
                      {selectedPass.paymentStatus === 'PAID'
                        ? `PAID (${selectedPass.paymentMethod || 'UPI'})`
                        : selectedPass.paymentMethod === 'Pay at Venue'
                          ? 'PENDING — Pay at Venue'
                          : 'PENDING'}
                    </span>
                  </div>

                  {selectedPass.paymentMethod === 'Pay at Venue' && selectedPass.paymentStatus === 'PENDING' && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Payment of ₹{selectedPass.totalPrice} is scheduled at facility reception upon arrival.</span>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                  {(selectedPass.status === 'APPROVED' || selectedPass.status === 'PAYMENT_PENDING') && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CreditCard}
                      onClick={() => {
                        setPayingBooking(selectedPass);
                        setPayError(null);
                        setSelectedPass(null);
                      }}
                    >
                      Pay Now
                    </Button>
                  )}

                  {selectedPass.venueId && (
                    <Link to={`/venues/${selectedPass.venueId}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full">
                        Venue Details
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPass(null)}
                    className="w-full sm:w-auto"
                  >
                    Close Pass
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Demo Payment Dialog ────────────────────────────────────────── */}
      {payingBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !payLoading) setPayingBooking(null);
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-4 sm:my-8">
              <div className="flex items-center justify-between pb-3 border-b border-[#28303F]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-lime-400" />
                  <h3 id="pay-dialog-title" className="text-base font-black text-white">
                    Complete Booking Payment
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !payLoading && setPayingBooking(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181C24]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {payError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium" role="alert">
                  {payError}
                </div>
              )}

              {/* Booking Summary */}
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue & Court:</span>
                  <span className="font-bold text-white text-right">{payingBooking.venueName} • {payingBooking.courtName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="font-mono text-slate-200">{formatBookingDate(payingBooking.date)} ({payingBooking.startTime} - {payingBooking.endTime})</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#28303F] items-baseline">
                  <span className="text-slate-400 font-bold">Total Due:</span>
                  <span className="text-lg font-black text-lime-400 font-mono">₹{payingBooking.totalPrice}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Select Payment Method
                </label>

                {/* Option 1: UPI */}
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-lime-400/10 border-lime-400 text-white'
                    : 'bg-[#0B0F17] border-[#28303F] text-slate-300 hover:border-slate-600'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMethod"
                      value="UPI"
                      checked={paymentMethod === 'UPI'}
                      onChange={() => setPaymentMethod('UPI')}
                      className="accent-lime-400"
                    />
                    <div>
                      <span className="text-xs font-bold block">UPI (Instant Demo)</span>
                      <span className="text-[10px] text-slate-400">Google Pay, PhonePe, Paytm, BHIM</span>
                    </div>
                  </div>
                  <Wallet className="w-4 h-4 text-lime-400" />
                </label>

                {/* Option 2: Card */}
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'Card'
                    ? 'bg-lime-400/10 border-lime-400 text-white'
                    : 'bg-[#0B0F17] border-[#28303F] text-slate-300 hover:border-slate-600'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMethod"
                      value="Card"
                      checked={paymentMethod === 'Card'}
                      onChange={() => setPaymentMethod('Card')}
                      className="accent-lime-400"
                    />
                    <div>
                      <span className="text-xs font-bold block">Credit / Debit Card (Demo)</span>
                      <span className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</span>
                    </div>
                  </div>
                  <CreditCard className="w-4 h-4 text-sky-400" />
                </label>

                {/* Option 3: Pay at Venue */}
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'Pay at Venue'
                    ? 'bg-lime-400/10 border-lime-400 text-white'
                    : 'bg-[#0B0F17] border-[#28303F] text-slate-300 hover:border-slate-600'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMethod"
                      value="Pay at Venue"
                      checked={paymentMethod === 'Pay at Venue'}
                      onChange={() => setPaymentMethod('Pay at Venue')}
                      className="accent-lime-400"
                    />
                    <div>
                      <span className="text-xs font-bold block">Pay at Venue</span>
                      <span className="text-[10px] text-slate-400">Settled at facility reception upon arrival</span>
                    </div>
                  </div>
                  <Building2 className="w-4 h-4 text-amber-400" />
                </label>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F] text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  {paymentMethod === 'Pay at Venue'
                    ? 'Slot will be confirmed immediately. Payment status remains PENDING until settled at check-in.'
                    : 'Instant demo confirmation. Payment status will be marked as PAID and booking CONFIRMED.'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={payLoading}
                  onClick={() => setPayingBooking(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={payLoading}
                  onClick={handlePaymentSubmit}
                  icon={ArrowRight}
                >
                  {paymentMethod === 'Pay at Venue' ? 'Confirm Reservation' : `Pay ₹${payingBooking.totalPrice}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reschedule Dialog (Phase 14) ───────────────────────────────── */}
      {reschedulingBooking && (() => {
        const startH = parseTimeTo24(rescheduleStart).hours;
        const endH = parseTimeTo24(rescheduleEnd).hours;
        const dur = (endH > startH) ? (endH - startH) : 1;
        const courtRate = reschedulingBooking.pricePerHour || 400;
        const estTotal = courtRate * dur;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-dialog-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !rescheduleLoading) {
                setReschedulingBooking(null);
                setRescheduleError(null);
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-4 sm:my-8 text-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-[#28303F]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-lime-400/10 text-lime-400 flex items-center justify-center border border-lime-400/20">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 id="reschedule-dialog-title" className="text-base font-black text-white">
                        Reschedule Reservation
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Booking ID: <span className="text-lime-400 font-bold">#{reschedulingBooking.id}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !rescheduleLoading && setReschedulingBooking(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181C24]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {rescheduleError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium" role="alert">
                    {rescheduleError}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Venue & Court:</span>
                    <span className="font-bold text-white text-right">{reschedulingBooking.venueName} • {reschedulingBooking.courtName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Slot:</span>
                    <span className="font-mono text-slate-200">{formatBookingDate(reschedulingBooking.date)} ({reschedulingBooking.startTime} - {reschedulingBooking.endTime})</span>
                  </div>
                </div>

                <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      New Booking Date
                    </label>
                    <input
                      type="date"
                      min={getLocalDateString()}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-white focus:outline-none focus:border-lime-400 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Start Time
                      </label>
                      <select
                        value={rescheduleStart}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setRescheduleStart(newStart);
                          const sIdx = STANDARD_SLOTS_12H.indexOf(newStart);
                          if (sIdx !== -1 && sIdx < STANDARD_SLOTS_12H.length - 1) {
                            setRescheduleEnd(STANDARD_SLOTS_12H[sIdx + 1]);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-white focus:outline-none focus:border-lime-400 font-mono"
                      >
                        {STANDARD_SLOTS_12H.slice(0, -1).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        End Time
                      </label>
                      <select
                        value={rescheduleEnd}
                        onChange={(e) => setRescheduleEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-white focus:outline-none focus:border-lime-400 font-mono"
                      >
                        {STANDARD_SLOTS_12H.filter((s) => {
                          const sIdx = STANDARD_SLOTS_12H.indexOf(rescheduleStart);
                          const eIdx = STANDARD_SLOTS_12H.indexOf(s);
                          return eIdx > sIdx;
                        }).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-lime-400/5 border border-lime-400/20 text-xs flex items-center justify-between font-mono">
                    <span className="text-slate-300">Continuous Duration: <strong className="text-lime-400">{dur} hr{dur > 1 ? 's' : ''}</strong></span>
                    <span className="text-slate-300">New Authoritative Price: <strong className="text-lime-400 font-black text-sm">₹{estTotal}</strong></span>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rescheduleLoading}
                      onClick={() => setReschedulingBooking(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={rescheduleLoading}
                      icon={RefreshCw}
                    >
                      Confirm Reschedule
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Cancellation Dialog (Phase 14) ─────────────────────────────── */}
      {cancellingBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
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
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-4 sm:my-8 text-slate-100">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
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
                  <strong className="text-lime-400 font-mono">{formatBookingDate(cancellingBooking.date)}</strong> from{' '}
                  <strong className="text-white font-mono">{cancellingBooking.startTime} to {cancellingBooking.endTime}</strong>?
                </p>
              </div>

              {/* Cancellation Reason Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-white focus:outline-none focus:border-lime-400"
                >
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Optional Note */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Optional Note
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">{cancelNote.length}/200</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Additional context (optional)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 resize-none"
                />
              </div>

              {/* Refund Policy Note */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F] text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
                <span>
                  {cancellingBooking.paymentStatus === 'PAID'
                    ? 'Paid online: Full booking amount will be marked as REFUNDED and complete interval released to court availability.'
                    : 'Pay at Venue: Slot hold will be cancelled and complete interval released to facility availability.'}
                </span>
              </div>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium" role="alert">
                  {cancelError}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelLoading}
                  onClick={() => {
                    setCancellingBooking(null);
                    setCancelError(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Keep Booking
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={cancelLoading}
                  onClick={handleCancelConfirm}
                  className="w-full sm:w-auto"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
