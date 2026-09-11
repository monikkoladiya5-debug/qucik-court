import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Star, Clock, Building2, ChevronLeft,
  CheckCircle2, Users, Loader2, AlertCircle, ArrowRight,
  ShieldCheck, Wifi, Coffee, Car, Droplets, Zap, Dumbbell,
  Lock, SunMedium
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenue } from '../services/api';
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

export default function VenueDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchVenue(id)
      .then((data) => setVenue(data.venue))
      .catch((err) => setError(err.message || 'The requested venue could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

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
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Starting Rate</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-black text-slate-900">₹{venue.pricePerHour}</span>
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
                      <span className="font-bold text-slate-900">{venue.openingHours}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 py-1">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        Total Courts
                      </span>
                      <span className="font-bold text-slate-900">{venue.courtCount} Courts</span>
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
                        <button
                          type="button"
                          disabled
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600/70 text-white font-bold text-sm rounded-xl cursor-not-allowed shadow-xs"
                          title="Court slot booking engine activates in Task 3"
                        >
                          Book a Court Slot
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-[11px] text-center text-slate-400 font-medium">
                          Court scheduling & availability slots unlock in Task 3
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
    </div>
  );
}
