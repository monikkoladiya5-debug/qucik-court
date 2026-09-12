import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Star, Clock, Building2, ChevronLeft,
  CheckCircle2, Users, Loader2, AlertCircle, ArrowRight,
  ShieldCheck, Wifi, Coffee, Car, Droplets, Zap, Dumbbell,
  Lock, SunMedium, Calendar, Check, Ban,
  Layers, Info, CalendarCheck, X, Trophy, Award,
  Flame, Sparkles, Activity
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenue, fetchCourts, fetchCourtAvailability, createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatBookingDate, getLocalDateString } from '../utils/date';

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

function getSportStyle(s) {
  return SPORT_CONFIG[s] || SPORT_CONFIG.default;
}

// Map amenity keywords to intuitive Lucide icons
function getAmenityIcon(amenity) {
  const a = amenity.toLowerCase();
  if (a.includes('park')) return Car;
  if (a.includes('wifi') || a.includes('internet')) return Wifi;
  if (a.includes('cafe') || a.includes('canteen') || a.includes('food')) return Coffee;
  if (a.includes('water') || a.includes('drink')) return Droplets;
  if (a.includes('light') || a.includes('flood')) return Zap;
  if (a.includes('gym') || a.includes('fitness') || a.includes('equip')) return Dumbbell;
  if (a.includes('lock') || a.includes('changing') || a.includes('shower')) return Lock;
  return CheckCircle2;
}

// ─── Booking Confirmation Dialog ──────────────────────────────────────────────
function BookingModal({ venue, court, slot, date, onClose, onBookingSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await createBooking({
        courtId: court.id,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      setReceipt(res.booking);
      onBookingSuccess(res.booking);
    } catch (err) {
      setError(err.message || 'Failed to complete booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 my-8">
        {receipt ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Court Slot Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your reservation has been authoritatively placed and confirmed on the live system.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5 text-xs">
              <div className="flex justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">Booking Reference:</span>
                <span className="font-mono font-bold text-emerald-400">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Venue:</span>
                <strong className="text-white">{venue.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Court:</span>
                <strong className="text-white">{court.name} ({court.sport})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <strong className="text-white">{formatBookingDate(date)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <strong className="text-emerald-400">{slot.startTime} - {slot.endTime}</strong>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-800 items-baseline">
                <span className="text-slate-400">Authoritative Total:</span>
                <strong className="text-lg text-emerald-400 font-black">₹{receipt.totalPrice}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <Link
                to="/my-bookings"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl text-center transition-colors shadow-sm"
              >
                Go to My Bookings
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors border border-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-400" />
                <h3 id="booking-modal-title" className="text-base font-black text-white">
                  Review & Confirm Reservation
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Venue:</span>
                <strong className="text-white text-right">{venue.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Court:</span>
                <strong className="text-white">{court.name} ({court.sport})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Surface / Type:</span>
                <span className="text-slate-300">{court.courtType} • {court.indoor ? 'Indoor Arena' : 'Outdoor Court'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <strong className="text-white">{formatBookingDate(date)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Slot:</span>
                <strong className="text-emerald-400">{slot.startTime} to {slot.endTime} (1 hr)</strong>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-800 items-baseline">
                <span className="text-slate-300 font-bold">Total Payable:</span>
                <span className="text-xl font-black text-emerald-400">₹{court.pricePerHour}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Real-time court reservation. Confirmed bookings are instantly recorded and can be inspected anytime from your My Bookings portal.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-sm transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main VenueDetailPage Component ──────────────────────────────────────────

export default function VenueDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgErr, setImgErr] = useState(false);

  // Courts, Availability & Booking State
  const [courts, setCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState(null);

  // Slot selection & Booking Modal state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchVenue(id)
      .then((data) => setVenue(data.venue))
      .catch((err) => setError(err.message || 'The requested venue could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load courts for this venue
  useEffect(() => {
    if (!id) return;
    setCourtsLoading(true);
    fetchCourts({ venueId: id })
      .then((data) => {
        const list = data.courts || [];
        setCourts(list);
        if (list.length > 0) {
          setSelectedCourt(list[0]);
        } else {
          setSelectedCourt(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load courts:', err);
      })
      .finally(() => setCourtsLoading(false));
  }, [id]);

  // Load availability when selected court or date changes
  const loadAvailability = (courtId, date) => {
    if (!courtId || !date) {
      setAvailability(null);
      return;
    }
    setAvailLoading(true);
    setAvailError(null);
    fetchCourtAvailability(courtId, date)
      .then((data) => {
        setAvailability(data);
      })
      .catch((err) => {
        setAvailError(err.message || 'Unable to load court availability.');
      })
      .finally(() => setAvailLoading(false));
  };

  useEffect(() => {
    setSelectedSlot(null);
    if (selectedCourt?.id && selectedDate) {
      loadAvailability(selectedCourt.id, selectedDate);
    } else {
      setAvailability(null);
    }
  }, [selectedCourt?.id, selectedDate]);

  const todayStr = getLocalDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowDate);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative">
      {/* Subtle athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 flex-wrap">
          <Link to="/venues" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Venues Directory
          </Link>
          {venue?.city && (
            <>
              <span className="text-slate-600">/</span>
              <span>{venue.city}</span>
            </>
          )}
          {venue?.name && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold truncate max-w-[200px]">{venue.name}</span>
            </>
          )}
        </nav>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Venue Specifications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto" role="alert">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Venue Unavailable</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">{error}</p>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Browse Available Venues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : venue ? (
          <div className="space-y-8">
            
            {/* SECTION 1 — Cinematic Venue Hero Section */}
            <section
              aria-label="Venue overview and banner"
              className="relative rounded-3xl overflow-hidden aspect-[21/8] sm:aspect-[24/8] min-h-[220px] max-h-[340px] bg-slate-900 shadow-xl border border-slate-800"
            >
              {!imgErr && venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover object-center brightness-90"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900">
                  <Building2 className="w-20 h-20" />
                </div>
              )}

              {/* Gradient Backdrop Overlay for High Contrast Text */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              {/* Floating Hero Content */}
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${
                        venue.indoor
                          ? 'bg-slate-950/85 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-950/85 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {venue.indoor ? 'Indoor Arena' : 'Outdoor Court'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-bold border border-slate-800">
                        {venue.city}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 backdrop-blur-md text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Facility
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                      {venue.name}
                    </h1>

                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                      <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{venue.location || venue.address}</span>
                    </p>
                  </div>

                  {/* Rating Block */}
                  {venue.rating > 0 && (
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-1 bg-slate-950/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 flex-shrink-0 w-fit">
                      <div className="flex items-center gap-1.5 text-white">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-lg sm:text-xl font-black">{venue.rating.toFixed(1)}</span>
                      </div>
                      {venue.reviewCount > 0 && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {venue.reviewCount} verified reviews
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2-Column Content Grid: Left Booking Workspace & Right Live Summary Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Interactive Booking Workspace */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* ── STEP 1: Court Selection ───────────────────────────────────── */}
                <section
                  aria-label="Court selection"
                  className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-5"
                >
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase">
                          Step 1
                        </span>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-400" />
                          Select Playing Court
                        </h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                        {courts.length} {courts.length === 1 ? 'Court' : 'Courts'} Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Choose which court or playing surface you want to reserve.
                    </p>
                  </div>

                  {courtsLoading ? (
                    <div className="flex items-center justify-center py-8 space-x-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider">Loading Courts…</span>
                    </div>
                  ) : courts.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <p className="text-xs font-medium text-slate-400">No courts listed for this venue yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {courts.map((c) => {
                        const isSelected = selectedCourt?.id === c.id;
                        const sportStyle = getSportStyle(c.sport);
                        const SportIcon = sportStyle.icon;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCourt(c)}
                            aria-pressed={isSelected}
                            aria-label={`${c.name}, ${c.sport}, ₹${c.pricePerHour} per hour, ${c.indoor ? 'Indoor' : 'Outdoor'}, ${isSelected ? 'Selected' : 'Click to select'}`}
                            className={`text-left p-4 rounded-xl border transition-all relative ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-md'
                                : 'border-slate-800 bg-slate-950/70 hover:bg-slate-900 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${sportStyle.bg} ${sportStyle.text} border ${sportStyle.border}`}>
                                <SportIcon className="w-3 h-3" aria-hidden="true" />
                                <span>{c.sport}</span>
                              </span>
                              <span className={`text-xs font-black ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                                ₹{c.pricePerHour}<span className="text-[10px] text-slate-400 font-medium">/hr</span>
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-white leading-snug truncate mb-1">
                              {c.name}
                            </h3>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              <span className="font-medium text-slate-300">{c.courtType}</span>
                              <span>•</span>
                              <span>{c.indoor ? 'Indoor' : 'Outdoor'}</span>
                              <span>•</span>
                              <span className={c.isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500 font-semibold'}>
                                {c.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Selected Court
                                </span>
                                <span className="text-[10px] uppercase tracking-wide">Active</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── STEP 2 & 3: Date & Time-Slot Workspace ─────────────────────── */}
                {selectedCourt && (
                  <section
                    aria-label="Court schedule and slot selection"
                    className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-6"
                  >
                    {/* Date Selector Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase">
                          Step 2
                        </span>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          Choose Date & View Operating Hours
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400">
                        Select your preferred playing date to inspect real-time slot availability on {selectedCourt.name}.
                      </p>
                    </div>

                    {/* Date Control Deck */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-300">Court Operating Window:</span>
                        <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                          {selectedCourt?.operatingHours || venue?.openingHours || 'Operating hours unavailable'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(todayStr)}
                          aria-pressed={selectedDate === todayStr}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            selectedDate === todayStr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(tomorrowStr)}
                          aria-pressed={selectedDate === tomorrowStr}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            selectedDate === tomorrowStr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Tomorrow
                        </button>
                        <div className="relative">
                          <input
                            type="date"
                            id="custom-avail-date"
                            value={selectedDate}
                            min={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            aria-label="Select Date for Availability"
                          />
                        </div>
                      </div>
                    </div>

                    {/* STEP 3: Slot Grid */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase">
                            Step 3
                          </span>
                          <h3 className="text-sm font-extrabold text-white">
                            Select Available Time Slot
                          </h3>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-xs shadow-emerald-400/50" />
                            Available
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                            Booked / Past
                          </span>
                        </div>
                      </div>

                      {availLoading ? (
                        <div className="flex items-center justify-center py-10 space-x-2 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-wider">Loading Schedule…</span>
                        </div>
                      ) : availError ? (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs" role="alert">
                          {availError}
                        </div>
                      ) : availability?.slots?.length > 0 ? (
                        <div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {availability.slots.map((slot) => {
                              const isAvail = slot.status === 'AVAILABLE';
                              const isSelected = selectedSlot?.id === slot.id;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isAvail}
                                  aria-pressed={isSelected}
                                  aria-label={`${slot.startTime} to ${slot.endTime}, ${isAvail ? (isSelected ? 'Selected slot' : 'Available slot') : 'Slot booked or unavailable'}`}
                                  onClick={() => {
                                    if (!isAvail) return;
                                    setSelectedSlot(isSelected ? null : slot);
                                  }}
                                  className={`p-3 rounded-xl border text-center transition-all ${
                                    isSelected
                                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400 scale-[1.02]'
                                      : isAvail
                                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-xs'
                                      : 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <p className={`text-xs font-bold ${isSelected ? 'text-slate-950' : isAvail ? 'text-white' : 'text-slate-500'}`}>
                                    {slot.startTime}
                                  </p>
                                  <p className={`text-[10px] ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                    to {slot.endTime}
                                  </p>
                                  <div className="mt-1.5">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-950 text-emerald-400">
                                        <Check className="w-2.5 h-2.5" />
                                        Selected
                                      </span>
                                    ) : isAvail ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                        Available
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-slate-500">
                                        <Ban className="w-2.5 h-2.5" />
                                        Unavailable
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Slot Feedback Banner */}
                          {selectedSlot && (
                            <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span>
                                  Active Slot: <strong>{selectedSlot.startTime} to {selectedSlot.endTime}</strong> on {selectedCourt.name}
                                </span>
                              </div>
                              <span className="font-black text-white">₹{selectedCourt.pricePerHour}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-4 text-center">
                          No operating slots scheduled for this date.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Venue Description & Details */}
                {venue.description && (
                  <section aria-label="Venue description" className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm">
                    <h2 className="text-base font-extrabold text-white mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      About this Sports Complex
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {venue.description}
                    </p>
                  </section>
                )}

                {/* Amenities Grid */}
                {venue.amenities?.length > 0 && (
                  <section aria-label="Facility amenities" className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm">
                    <h2 className="text-base font-extrabold text-white mb-4">
                      Facility Amenities
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {venue.amenities.map((item) => {
                        const Icon = getAmenityIcon(item);
                        return (
                          <div
                            key={item}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Location & Address Details */}
                <section aria-label="Location and address" className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm">
                  <h2 className="text-base font-extrabold text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Location & Directions
                  </h2>
                  <p className="text-sm text-slate-200 font-medium mb-1.5">
                    {venue.address || venue.location}
                  </p>
                  <p className="text-xs text-slate-400">
                    City: <strong className="text-slate-200">{venue.city}</strong>
                  </p>
                </section>
              </div>

              {/* Right Column: Sticky Live Booking Summary Deck */}
              <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                
                {/* Live Booking Summary Card */}
                <div className="bg-slate-900/95 rounded-2xl p-6 border border-slate-800 shadow-2xl backdrop-blur-md space-y-5">
                  <div className="flex items-baseline justify-between pb-4 border-b border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Live Booking Summary
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-emerald-400">
                          ₹{selectedCourt ? selectedCourt.pricePerHour : venue.pricePerHour}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/ hour</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      Authoritative Rate
                    </span>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                      <span>Venue</span>
                      <strong className="text-white text-right truncate max-w-[170px]">{venue.name}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                      <span>Selected Court</span>
                      <strong className={selectedCourt ? 'text-white' : 'text-slate-500'}>
                        {selectedCourt ? selectedCourt.name : 'None selected'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                      <span>Date</span>
                      <strong className="text-white">{formatBookingDate(selectedDate)}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                      <span>Time Slot</span>
                      <strong className={selectedSlot ? 'text-emerald-400' : 'text-slate-500'}>
                        {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'No slot chosen'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1">
                      <span>Instant Booking</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Enabled
                      </span>
                    </div>
                  </div>

                  {/* Call to Action Box */}
                  <div className="pt-2">
                    {isAuthenticated && role === 'CUSTOMER' ? (
                      <div className="space-y-2.5">
                        {selectedSlot ? (
                          <button
                            type="button"
                            onClick={() => setBookingModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          >
                            <span>Confirm & Book Slot ({selectedSlot.startTime})</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-800 text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed"
                          >
                            <span>Select an Available Slot</span>
                          </button>
                        )}
                        <p className="text-[11px] text-center text-slate-400 font-medium">
                          {selectedSlot
                            ? `Selected: ${selectedSlot.startTime} to ${selectedSlot.endTime} (1 hr)`
                            : 'Click any green "Available" slot above to proceed'}
                        </p>
                      </div>
                    ) : !isAuthenticated ? (
                      <div className="space-y-2.5">
                        <Link
                          to="/auth"
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          Sign In to Book Court
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </Link>
                        <p className="text-[11px] text-center text-slate-400">
                          New player? Free registration takes 30 seconds.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                        <p className="text-xs font-semibold text-slate-400">
                          Viewing as <span className="text-indigo-400 uppercase font-bold">{role}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust & Guarantee Banner */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    QuickCourt Booking Guarantee
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    100% verified venue owner, guaranteed court hold upon confirmation, transparent on-site amenities, and authoritative pricing.
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Sticky Booking Action Bar */}
            {selectedSlot && (
              <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 shadow-2xl animate-in slide-in-from-bottom-2">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                      {selectedCourt?.name} • {selectedSlot.startTime}
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      ₹{selectedCourt?.pricePerHour}
                    </span>
                  </div>

                  {isAuthenticated && role === 'CUSTOMER' ? (
                    <button
                      type="button"
                      onClick={() => setBookingModalOpen(true)}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <span>Book Slot</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  ) : !isAuthenticated ? (
                    <Link
                      to="/auth"
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <span>Sign In to Book</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">{role}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <Footer />

      {/* Booking Confirmation Modal */}
      {bookingModalOpen && selectedSlot && selectedCourt && (
        <BookingModal
          venue={venue}
          court={selectedCourt}
          slot={selectedSlot}
          date={selectedDate}
          onClose={() => setBookingModalOpen(false)}
          onBookingSuccess={() => {
            setSelectedSlot(null);
            loadAvailability(selectedCourt.id, selectedDate);
          }}
        />
      )}
    </div>
  );
}

