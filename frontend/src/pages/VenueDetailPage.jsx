import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Clock, Building2, ChevronLeft,
  CheckCircle2, Users, Loader2, AlertCircle, ArrowRight,
  ShieldCheck, Wifi, Coffee, Car, Droplets, Zap, Dumbbell,
  Lock, Calendar, Check, Ban, Layers, Info, CalendarCheck, X,
  Activity, Sparkles
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SportIcon from '../components/ui/SportIcon';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { fetchVenue, fetchCourts, fetchCourtAvailability, createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatBookingDate, getLocalDateString } from '../utils/date';

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
      className="fixed inset-0 z-50 bg-[#0B0F17]/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-[#0F131C] border border-[#28303F] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 my-4 sm:my-8 relative">
          {receipt ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center mx-auto shadow-qc-lime">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Court Slot Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your court reservation has been authoritatively placed and locked on the live schedule.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#28303F] text-left space-y-2.5 text-xs">
                <div className="flex justify-between gap-2 flex-wrap pb-2.5 border-b border-[#28303F]">
                  <span className="text-slate-400 shrink-0">Booking Reference:</span>
                  <span className="font-mono font-bold text-lime-400 break-all text-right min-w-0">{receipt.id}</span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Venue:</span>
                  <strong className="text-white text-right min-w-0 break-words">{venue.name}</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Court:</span>
                  <strong className="text-white text-right min-w-0 break-words">{court.name} ({court.sport})</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Date:</span>
                  <strong className="text-white text-right min-w-0">{formatBookingDate(date)}</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Time:</span>
                  <strong className="text-lime-400 font-mono text-right min-w-0">{slot.startTime} - {slot.endTime}</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap pt-2.5 border-t border-[#28303F] items-baseline">
                  <span className="text-slate-400 shrink-0">Total Payable:</span>
                  <strong className="text-lg text-lime-400 font-black font-mono">₹{receipt.totalPrice}</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                <Link
                  to="/my-bookings"
                  className="w-full sm:w-auto px-5 py-2.5 bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 text-xs font-bold rounded-xl text-center transition-all shadow-qc-lime"
                >
                  Go to My Bookings
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#181C24] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors border border-[#28303F]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-[#28303F]">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-lime-400" />
                  <h3 id="booking-modal-title" className="text-base font-black text-white">
                    Review & Confirm Reservation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181C24] transition-colors"
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

              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#28303F] space-y-2.5 text-xs">
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Venue:</span>
                  <strong className="text-white text-right min-w-0 break-words">{venue.name}</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Court:</span>
                  <strong className="text-white text-right min-w-0 break-words">{court.name} ({court.sport})</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Surface / Type:</span>
                  <span className="text-slate-300 text-right min-w-0">{court.courtType} • {court.indoor ? 'Indoor Arena' : 'Outdoor Turf'}</span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Date:</span>
                  <strong className="text-white text-right min-w-0">{formatBookingDate(date)}</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400 shrink-0">Time Slot:</span>
                  <strong className="text-lime-400 font-mono text-right min-w-0">{slot.startTime} to {slot.endTime} (1 hr)</strong>
                </div>
                <div className="flex justify-between gap-2 flex-wrap pt-2.5 border-t border-[#28303F] items-baseline">
                  <span className="text-slate-300 font-bold shrink-0">Total Payable:</span>
                  <span className="text-xl font-black text-lime-400 font-mono">₹{court.pricePerHour}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
                <span>
                  Authoritative court reservation. Confirmed bookings lock your time slot on the live schedule. In QuickCourt V1, payment is settled directly at venue check-in.
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-[#181C24] hover:bg-slate-800 border border-[#28303F] rounded-xl transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-lime-400 hover:bg-lime-300 active:bg-lime-500 rounded-xl shadow-qc-lime transition-all disabled:opacity-60"
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
    </div>
  );
}

// ─── Main VenueDetailPage Component ──────────────────────────────────────────

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 relative font-sans selection:bg-lime-400 selection:text-slate-950">
      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 flex-wrap">
          <Link to="/venues" className="hover:text-lime-400 transition-colors flex items-center gap-1">
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
            <Loader2 className="w-10 h-10 animate-spin text-lime-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Venue Specifications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#0F131C] rounded-3xl border border-[#28303F] shadow-xl text-center max-w-lg mx-auto" role="alert">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Venue Unavailable</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">{error}</p>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/venues')}
              icon={ArrowRight}
            >
              Browse Available Venues
            </Button>
          </div>
        ) : venue ? (
          <div className="space-y-8">
            
            {/* SECTION 1 — Cinematic Venue Hero Section */}
            <section
              aria-label="Venue overview and banner"
              className="relative rounded-3xl overflow-hidden aspect-[21/8] sm:aspect-[24/8] min-h-[220px] max-h-[340px] bg-[#0F131C] shadow-xl border border-[#28303F]"
            >
              {!imgErr && venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover object-center brightness-90"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 bg-[#0F131C]">
                  <Building2 className="w-20 h-20" />
                </div>
              )}

              {/* Gradient Backdrop Overlay for High Contrast Text */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/60 to-transparent" />

              {/* Floating Hero Content */}
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${
                        venue.indoor
                          ? 'bg-[#0B0F17]/85 text-lime-400 border-lime-400/30'
                          : 'bg-[#0B0F17]/85 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {venue.indoor ? 'Indoor Arena' : 'Outdoor Turf'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#0B0F17]/80 backdrop-blur-md text-slate-200 text-xs font-bold border border-[#28303F]">
                        {venue.city}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-lime-400/10 backdrop-blur-md text-lime-400 text-xs font-bold border border-lime-400/20 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Facility
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                      {venue.name}
                    </h1>

                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                      <MapPin className="w-4 h-4 text-lime-400 flex-shrink-0" />
                      <span>{venue.location || venue.address}</span>
                    </p>
                  </div>

                  {/* Rating Block */}
                  {venue.rating > 0 && (
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-1 bg-[#0B0F17]/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#28303F] flex-shrink-0 w-fit">
                      <div className="flex items-center gap-1.5 text-white">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-lg sm:text-xl font-black font-mono">{venue.rating.toFixed(1)}</span>
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
                  className="bg-[#0F131C] rounded-2xl p-5 sm:p-6 border border-[#28303F] shadow-xl space-y-5"
                >
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs font-black uppercase">
                          Step 1
                        </span>
                        <h2 className="text-base font-black text-white flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-lime-400" />
                          Select Playing Court
                        </h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-[#181C24] px-2.5 py-1 rounded-full border border-[#28303F]">
                        {courts.length} {courts.length === 1 ? 'Court' : 'Courts'} Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Choose which court or playing surface you want to reserve.
                    </p>
                  </div>

                  {courtsLoading ? (
                    <div className="flex items-center justify-center py-8 space-x-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                      <span className="text-xs font-bold uppercase tracking-wider">Loading Courts…</span>
                    </div>
                  ) : courts.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#0B0F17] border border-[#28303F] text-center">
                      <p className="text-xs font-medium text-slate-400">No courts listed for this venue yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {courts.map((c) => {
                        const isSelected = selectedCourt?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCourt(c)}
                            aria-pressed={isSelected}
                            aria-label={`${c.name}, ${c.sport}, ₹${c.pricePerHour} per hour, ${c.indoor ? 'Indoor' : 'Outdoor'}, ${isSelected ? 'Selected' : 'Click to select'}`}
                            className={`text-left p-4 rounded-xl border transition-all relative ${
                              isSelected
                                ? 'border-lime-400 bg-lime-400/10 ring-2 ring-lime-400/30 shadow-qc-lime'
                                : 'border-[#28303F] bg-[#0B0F17] hover:bg-[#181C24] hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#181C24] text-slate-200 border border-[#28303F]">
                                <SportIcon sport={c.sport} className="w-3 h-3 text-lime-400" aria-hidden="true" />
                                <span>{c.sport}</span>
                              </span>
                              <span className={`text-xs font-black font-mono ${isSelected ? 'text-lime-400' : 'text-white'}`}>
                                ₹{c.pricePerHour}<span className="text-[10px] text-slate-400 font-sans font-medium">/hr</span>
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-white leading-snug truncate mb-1">
                              {c.name}
                            </h3>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              <span className="font-medium text-slate-300">{c.courtType}</span>
                              <span>•</span>
                              <span>{c.indoor ? 'Indoor Arena' : 'Outdoor Turf'}</span>
                              <span>•</span>
                              <span className={c.isActive ? 'text-lime-400 font-semibold' : 'text-slate-500 font-semibold'}>
                                {c.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-lime-400/20 flex items-center justify-between text-[11px] font-bold text-lime-400">
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
                    className="bg-[#0F131C] rounded-2xl p-5 sm:p-6 border border-[#28303F] shadow-xl space-y-6"
                  >
                    {/* Date Selector Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs font-black uppercase">
                          Step 2
                        </span>
                        <h2 className="text-base font-black text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-lime-400" />
                          Choose Date & View Operating Hours
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400">
                        Select your preferred playing date to inspect real-time slot availability on {selectedCourt.name}.
                      </p>
                    </div>

                    {/* Date Control Deck */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F17] p-4 rounded-xl border border-[#28303F]">
                      <div>
                        <span className="text-xs font-bold text-slate-300">Court Operating Window:</span>
                        <p className="text-xs text-lime-400 font-semibold font-mono mt-0.5">
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
                              ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                              : 'bg-[#181C24] text-slate-300 border-[#28303F] hover:bg-slate-800'
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
                              ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                              : 'bg-[#181C24] text-slate-300 border-[#28303F] hover:bg-slate-800'
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
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-[#181C24] border border-[#28303F] rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400"
                            aria-label="Select Date for Availability"
                          />
                        </div>
                      </div>
                    </div>

                    {/* STEP 3: Slot Grid */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs font-black uppercase">
                            Step 3
                          </span>
                          <h3 className="text-sm font-extrabold text-white">
                            Select Available Time Slot
                          </h3>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block shadow-qc-lime" />
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
                          <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
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
                                  className={`p-3 rounded-xl border text-center transition-all min-w-0 ${
                                    isSelected
                                      ? 'bg-lime-400 border-lime-400 text-slate-950 shadow-qc-lime ring-2 ring-lime-400 scale-[1.02]'
                                      : isAvail
                                      ? 'bg-[#0B0F17] border-lime-400/30 text-lime-400 hover:border-lime-400 hover:bg-lime-400/10 cursor-pointer shadow-xs'
                                      : 'bg-[#0B0F17]/40 border-[#28303F]/60 text-slate-600 cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <p className={`text-xs font-bold font-mono ${isSelected ? 'text-slate-950' : isAvail ? 'text-white' : 'text-slate-500'}`}>
                                    {slot.startTime}
                                  </p>
                                  <p className={`text-[10px] font-mono ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                    to {slot.endTime}
                                  </p>
                                  <div className="mt-1.5">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-950 text-lime-400">
                                        <Check className="w-2.5 h-2.5" />
                                        Selected
                                      </span>
                                    ) : isAvail ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                                        Available
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#181C24] text-slate-500">
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
                            <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                                <span>
                                  Active Slot: <strong>{selectedSlot.startTime} to {selectedSlot.endTime}</strong> on {selectedCourt.name}
                                </span>
                              </div>
                              <span className="font-black text-white font-mono">₹{selectedCourt.pricePerHour}</span>
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
                  <section aria-label="Venue description" className="bg-[#0F131C] rounded-2xl p-5 sm:p-6 border border-[#28303F] shadow-sm">
                    <h2 className="text-base font-black text-white mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-lime-400" />
                      About this Sports Complex
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {venue.description}
                    </p>
                  </section>
                )}

                {/* Amenities Grid */}
                {venue.amenities?.length > 0 && (
                  <section aria-label="Facility amenities" className="bg-[#0F131C] rounded-2xl p-5 sm:p-6 border border-[#28303F] shadow-sm">
                    <h2 className="text-base font-black text-white mb-4">
                      Facility Amenities
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {venue.amenities.map((item) => {
                        const Icon = getAmenityIcon(item);
                        return (
                          <div
                            key={item}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs font-semibold text-slate-200"
                          >
                            <div className="w-7 h-7 rounded-lg bg-lime-400/10 text-lime-400 flex items-center justify-center flex-shrink-0 border border-lime-400/20">
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
                <section aria-label="Location and address" className="bg-[#0F131C] rounded-2xl p-5 sm:p-6 border border-[#28303F] shadow-sm">
                  <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-lime-400" />
                    Location & Directions
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium mb-1.5">
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
                <div className="bg-[#0F131C] rounded-2xl p-6 border border-[#28303F] shadow-2xl space-y-5">
                  <div className="flex items-baseline justify-between pb-4 border-b border-[#28303F]">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Live Booking Summary
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-lime-400 font-mono">
                          ₹{selectedCourt ? selectedCourt.pricePerHour : venue.pricePerHour}
                        </span>
                        <span className="text-xs text-slate-400 font-medium font-sans">/ hour</span>
                      </div>
                    </div>
                    <Badge variant="lime" dot>
                      Authoritative Rate
                    </Badge>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-[#28303F]/60">
                      <span>Venue</span>
                      <strong className="text-white text-right truncate max-w-[170px]">{venue.name}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-[#28303F]/60">
                      <span>Selected Court</span>
                      <strong className={selectedCourt ? 'text-white' : 'text-slate-500'}>
                        {selectedCourt ? selectedCourt.name : 'None selected'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-[#28303F]/60">
                      <span>Date</span>
                      <strong className="text-white">{formatBookingDate(selectedDate)}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1 border-b border-[#28303F]/60">
                      <span>Time Slot</span>
                      <strong className={selectedSlot ? 'text-lime-400 font-mono' : 'text-slate-500'}>
                        {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'No slot chosen'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 py-1">
                      <span>Instant Booking</span>
                      <span className="font-bold text-lime-400 flex items-center gap-1">
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
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 font-black text-sm rounded-xl shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                          >
                            <span>Confirm & Book Slot ({selectedSlot.startTime})</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#181C24] text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed border border-[#28303F]"
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
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm rounded-xl shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400 text-center"
                        >
                          Sign In to Book Court
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </Link>
                        <p className="text-[11px] text-center text-slate-400">
                          New player? Free registration takes 30 seconds.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#0B0F17] rounded-xl border border-[#28303F] text-center">
                        <p className="text-xs font-semibold text-slate-400">
                          Viewing as <span className="text-lime-400 uppercase font-bold">{role}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trust & Guarantee Banner */}
                <div className="p-4 rounded-2xl bg-[#0F131C] border border-[#28303F] text-xs text-slate-300 space-y-1.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-lime-400" />
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
              <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-t border-[#28303F] p-3 sm:p-4 shadow-2xl animate-in slide-in-from-bottom-2">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                      {selectedCourt?.name} • {selectedSlot.startTime}
                    </span>
                    <span className="text-base font-black text-lime-400 font-mono">
                      ₹{selectedCourt?.pricePerHour}
                    </span>
                  </div>

                  {isAuthenticated && role === 'CUSTOMER' ? (
                    <button
                      type="button"
                      onClick={() => setBookingModalOpen(true)}
                      className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs rounded-xl shadow-qc-lime flex items-center gap-1.5"
                    >
                      <span>Book Slot</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  ) : !isAuthenticated ? (
                    <Link
                      to="/auth"
                      className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs rounded-xl shadow-qc-lime flex items-center gap-1.5"
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


