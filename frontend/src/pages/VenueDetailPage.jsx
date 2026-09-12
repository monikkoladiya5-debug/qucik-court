import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Star, Clock, Building2, ChevronLeft,
  CheckCircle2, Users, Loader2, AlertCircle, ArrowRight,
  ShieldCheck, Wifi, Coffee, Car, Droplets, Zap, Dumbbell,
  Lock, SunMedium, Calendar, CalendarDays, Check, Ban,
  Layers, Sparkles, Info, CalendarCheck
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenue, fetchCourts, fetchCourtAvailability, createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SPORT_CONFIG = {
  Badminton: { emoji: '🏸', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Tennis:    { emoji: '🎾', bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200'   },
  Football:  { emoji: '⚽', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  Basketball:{ emoji: '🏀', bg: 'bg-orange-50',  text: 'text-orange-800',  border: 'border-orange-200'  },
  Pickleball:{ emoji: '🏓', bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  Cricket:   { emoji: '🏏', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  Squash:    { emoji: '🎱', bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  default:   { emoji: '🏟️', bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200'   },
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
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
        {receipt ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Court Slot Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your reservation has been placed and confirmed on the live system.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-bold text-indigo-700">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Venue:</span>
                <strong className="text-slate-900">{venue.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Court:</span>
                <strong className="text-slate-900">{court.name} ({court.sport})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <strong className="text-slate-900">{date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <strong className="text-slate-900">{slot.startTime} - {slot.endTime}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Authoritative Total:</span>
                <strong className="text-base text-slate-900 font-black">₹{receipt.totalPrice}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <Link
                to="/my-bookings"
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl text-center transition-colors shadow-xs"
              >
                Go to My Bookings
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <h3 id="booking-modal-title" className="text-base font-black text-slate-900">
                  Review & Confirm Reservation
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Venue:</span>
                <strong className="text-slate-900 text-right">{venue.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Court:</span>
                <strong className="text-slate-900">{court.name} ({court.sport})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Surface / Type:</span>
                <span className="text-slate-700">{court.courtType} • {court.indoor ? 'Indoor' : 'Outdoor'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <strong className="text-slate-900">{date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time Slot:</span>
                <strong className="text-indigo-700">{slot.startTime} to {slot.endTime} (1 hr)</strong>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-200 items-baseline">
                <span className="text-slate-700 font-bold">Total Payable:</span>
                <span className="text-xl font-black text-slate-900">₹{court.pricePerHour}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                Real-time court reservation (Task 4). You can inspect and cancel confirmed bookings anytime from your My Bookings dashboard.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
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

export default function VenueDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgErr, setImgErr] = useState(false);

  // Task 3 & 4: Courts, Availability & Booking State
  const [courts, setCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState(null);

  // Task 4: Slot selection & Booking Modal state
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link to="/venues" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Venues Directory
          </Link>
          {venue?.city && (
            <>
              <span className="text-slate-300">/</span>
              <span>{venue.city}</span>
            </>
          )}
          {venue?.name && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold truncate max-w-[200px]">{venue.name}</span>
            </>
          )}
        </nav>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Venue Specifications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-card text-center max-w-lg mx-auto" role="alert">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Venue Unavailable</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{error}</p>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Browse Available Venues
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : venue ? (
          <div className="space-y-8">
            
            {/* Cinematic Hero Cover Section */}
            <div className="relative rounded-3xl overflow-hidden aspect-[21/9] min-h-[260px] max-h-[420px] bg-slate-900 shadow-lg">
              {!imgErr && venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover object-center brightness-90"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800">
                  <Building2 className="w-20 h-20" />
                </div>
              )}

              {/* Gradient Backdrop Overlay for High Contrast Text */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Floating Hero Content */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                        venue.indoor
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {venue.indoor ? 'Indoor Arena' : 'Outdoor Court'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                        {venue.city}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Facility
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                      {venue.name}
                    </h1>

                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200">
                      <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{venue.location || venue.address}</span>
                    </p>
                  </div>

                  {/* Rating Block */}
                  {venue.rating > 0 && (
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-1 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 flex-shrink-0 w-fit">
                      <div className="flex items-center gap-1.5 text-white">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-xl font-black">{venue.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[11px] text-slate-300 font-medium">
                        {venue.reviewCount} customer reviews
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2-Column Content Grid: Left Details & Right Sticky Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Left Column: Comprehensive Specifications */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* About Venue */}
                {venue.description && (
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card">
                    <h2 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      About this Sports Complex
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {venue.description}
                    </p>
                  </div>
                )}

                {/* Sports Offered */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card">
                  <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                    <SunMedium className="w-4 h-4 text-indigo-600" />
                    Available Sports & Courts
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {venue.sportTypes?.map((s) => {
                      const style = getSportStyle(s);
                      return (
                        <div
                          key={s}
                          className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors"
                        >
                          <span className="text-2xl">{style.emoji}</span>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{s}</p>
                            <p className="text-[11px] text-slate-500">Standard specifications</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Task 3: Courts & Availability Viewer ───────────────────────── */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card space-y-6">
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-base font-extrabold text-slate-900">Courts & Playing Surfaces</h2>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {courts.length} {courts.length === 1 ? 'Court' : 'Courts'} Configured
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Select a court below to inspect specifications and view live operating availability.
                    </p>
                  </div>

                  {courtsLoading ? (
                    <div className="flex items-center justify-center py-8 space-x-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Loading Courts…</span>
                    </div>
                  ) : courts.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-medium text-slate-500">No courts listed for this venue yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {courts.map((c) => {
                        const isSelected = selectedCourt?.id === c.id;
                        const sportStyle = getSportStyle(c.sport);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCourt(c)}
                            className={`text-left p-4 rounded-xl border transition-all relative ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${sportStyle.bg} ${sportStyle.text} border ${sportStyle.border}`}>
                                <span>{sportStyle.emoji}</span>
                                <span>{c.sport}</span>
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                ₹{c.pricePerHour}<span className="text-[10px] text-slate-400 font-medium">/hr</span>
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 leading-snug truncate mb-1">
                              {c.name}
                            </h3>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-medium text-slate-600">{c.courtType}</span>
                              <span>•</span>
                              <span>{c.indoor ? 'Indoor' : 'Outdoor'}</span>
                              <span>•</span>
                              <span className={c.isActive ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-semibold'}>
                                {c.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px] font-bold text-indigo-700">
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Viewing Schedule
                                </span>
                                <span className="text-[10px] text-indigo-500 uppercase tracking-wide">Selected</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Slot Availability Grid for Selected Court ───────────────── */}
                  {selectedCourt && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Schedule for {selectedCourt.name}
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Operating Hours: <strong className="text-slate-700">{selectedCourt.operatingHours}</strong>
                          </p>
                        </div>

                        {/* Date Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(todayStr)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                              selectedDate === todayStr
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDate(tomorrowStr)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                              selectedDate === tomorrowStr
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              aria-label="Select Date for Availability"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Task 3 Informational Banner */}
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs">
                        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <p className="font-bold">Court Availability Viewer (Task 3)</p>
                          <p className="text-[11px] text-indigo-700/90 mt-0.5">
                            Slots shown reflect live facility operating schedules for <strong>{selectedDate}</strong>.
                            Court slot booking & checkout will activate in Task 4.
                          </p>
                        </div>
                      </div>

                      {/* Slots Display */}
                      {availLoading ? (
                        <div className="flex items-center justify-center py-10 space-x-2 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-wider">Loading Schedule…</span>
                        </div>
                      ) : availError ? (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                          {availError}
                        </div>
                      ) : availability?.slots?.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                            <span>Daily Time Slots ({availability.slots.length})</span>
                            <div className="flex items-center gap-3 lowercase text-slate-500 font-semibold">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                Available
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                                Unavailable
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {availability.slots.map((slot) => {
                              const isAvail = slot.status === 'AVAILABLE';
                              const isSelected = selectedSlot?.id === slot.id;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isAvail}
                                  onClick={() => {
                                    if (!isAvail) return;
                                    setSelectedSlot(isSelected ? null : slot);
                                  }}
                                  className={`p-2.5 rounded-xl border text-center transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40'
                                      : isAvail
                                      ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer shadow-2xs'
                                      : 'bg-slate-100/70 border-slate-200/60 text-slate-400 cursor-not-allowed opacity-75'
                                  }`}
                                >
                                  <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                    {slot.startTime}
                                  </p>
                                  <p className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    to {slot.endTime}
                                  </p>
                                  <div className="mt-1.5">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-indigo-700 shadow-2xs">
                                        <Check className="w-2.5 h-2.5" />
                                        Selected
                                      </span>
                                    ) : isAvail ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                                        <Check className="w-2.5 h-2.5" />
                                        Available
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-500">
                                        <Ban className="w-2.5 h-2.5" />
                                        Unavailable
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Slot Feedback Pill */}
                          {selectedSlot && (
                            <div className="mt-3.5 flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span>
                                  Selected: <strong>{selectedSlot.startTime} to {selectedSlot.endTime}</strong> on {selectedCourt.name}
                                </span>
                              </div>
                              <span className="font-black text-slate-900">₹{selectedCourt.pricePerHour}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          No operating slots scheduled for this date.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Amenities Grid */}
                {venue.amenities?.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card">
                    <h2 className="text-base font-extrabold text-slate-900 mb-4">
                      Facility Amenities
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {venue.amenities.map((item) => {
                        const Icon = getAmenityIcon(item);
                        return (
                          <div
                            key={item}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Location & Address Details */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card">
                  <h2 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Location & Directions
                  </h2>
                  <p className="text-sm text-slate-700 font-medium mb-2">
                    {venue.address || venue.location}
                  </p>
                  <p className="text-xs text-slate-500">
                    City: <strong className="text-slate-800">{venue.city}</strong>
                  </p>
                </div>
              </div>

              {/* Right Column: Sticky Booking & Information Sidebar */}
              <div className="space-y-4 lg:sticky lg:top-24">
                
                {/* Pricing & Fast Specs Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
                  <div className="flex items-baseline justify-between pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {selectedCourt ? selectedCourt.name : 'Starting Rate'}
                      </p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-black text-slate-900">
                          ₹{selectedCourt ? selectedCourt.pricePerHour : venue.pricePerHour}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ hour</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      Available Today
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-600 py-1">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Operating Hours
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedCourt ? selectedCourt.operatingHours : venue.openingHours}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 py-1">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        Available Courts
                      </span>
                      <span className="font-bold text-slate-900">{courts.length || venue.courtCount} Courts</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 py-1">
                      <span className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Instant Confirmation
                      </span>
                      <span className="font-bold text-emerald-600">Enabled</span>
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
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <span>Book Slot ({selectedSlot.startTime})</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-200 text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed"
                          >
                            <span>Select an Available Slot</span>
                          </button>
                        )}
                        <p className="text-[11px] text-center text-slate-500 font-medium">
                          {selectedSlot
                            ? `Selected: ${selectedSlot.startTime} to ${selectedSlot.endTime} (1 hr)`
                            : 'Click any green "Available" slot above to proceed'}
                        </p>
                      </div>
                    ) : !isAuthenticated ? (
                      <div className="space-y-2.5">
                        <Link
                          to="/auth"
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          Sign In to Book Court
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-[11px] text-center text-slate-500">
                          New player? Free registration takes 30 seconds.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <p className="text-xs font-semibold text-slate-600">
                          Viewing as <span className="text-indigo-600 uppercase font-bold">{role}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust & Guarantee Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-emerald-50/60 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    QuickCourt Guarantee
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    100% verified venue owner, transparent on-site amenities, and standard playing surface dimensions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />

      {/* Task 4: Booking Confirmation Modal */}
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
