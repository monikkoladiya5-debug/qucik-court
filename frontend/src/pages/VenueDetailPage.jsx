import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Star, Clock, Building2, ChevronLeft,
  CheckCircle2, Users, Loader2, AlertCircle, ArrowRight,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenue } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SPORT_EMOJI = {
  Badminton: '🏸', Tennis: '🎾', Football: '⚽', Basketball: '🏀',
  Pickleball: '🏓', Cricket: '🏏', Squash: '🎱', default: '🏟️',
};

function getSportEmoji(s) { return SPORT_EMOJI[s] || SPORT_EMOJI.default; }

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
      .catch((err) => setError(err.message || 'Venue not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          to="/venues"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 mb-6 transition-colors focus:outline-none focus:text-purple-600"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Venues
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-lg font-semibold text-slate-800 mb-1">Venue unavailable</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <Link
              to="/venues"
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Browse all venues
            </Link>
          </div>
        ) : venue ? (
          <div className="space-y-8">
            {/* Cover image */}
            <div className="relative rounded-2xl overflow-hidden h-64 md:h-80 bg-slate-200 shadow-sm">
              {!imgErr ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgErr(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Building2 className="w-24 h-24" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              {/* Overlaid title */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2
                                      ${venue.indoor ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {venue.indoor ? 'Indoor' : 'Outdoor'}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white">{venue.name}</h1>
                    <p className="flex items-center gap-1 text-sm text-white/80 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {venue.location}
                    </p>
                  </div>
                  {venue.rating > 0 && (
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-white font-bold text-lg">{venue.rating}</span>
                      </div>
                      <span className="text-white/60 text-xs mt-1">{venue.reviewCount} reviews</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: details */}
              <div className="md:col-span-2 space-y-6">
                {/* Description */}
                {venue.description && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-3">About this venue</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{venue.description}</p>
                  </div>
                )}

                {/* Sports */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 mb-3">Sports Available</h2>
                  <div className="flex flex-wrap gap-2">
                    {venue.sportTypes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-sm font-medium text-purple-700"
                      >
                        <span>{getSportEmoji(s)}</span>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                {venue.amenities?.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-3">Amenities</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {venue.amenities.map((a) => (
                        <div key={a} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: sidebar info + CTA */}
              <div className="space-y-4">
                {/* Quick info card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Price per hour</p>
                      <p className="text-2xl font-extrabold text-purple-700">₹{venue.pricePerHour}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{venue.openingHours}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{venue.courtCount} court{venue.courtCount !== 1 ? 's' : ''} available</span>
                      </div>
                      {venue.address && (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>{venue.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                {isAuthenticated && role === 'CUSTOMER' ? (
                  <div className="bg-purple-600 rounded-2xl p-5 text-white text-center shadow-lg shadow-purple-200">
                    <p className="text-sm font-semibold mb-3">Ready to play?</p>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl text-white text-sm font-semibold cursor-not-allowed"
                      title="Booking coming in a future task"
                    >
                      Book a Court
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-white/60 mt-2">Booking available in the next release</p>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center shadow-sm">
                    <p className="text-sm text-slate-600 mb-3">Sign in to book this venue</p>
                    <Link
                      to="/auth"
                      className="block w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
