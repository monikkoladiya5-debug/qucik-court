import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock, Users,
  Wifi, X, Loader2, AlertCircle, Building2, ChevronRight,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenues, fetchVenueMeta } from '../services/api';

// ─── Sport icon mapping ───────────────────────────────────────────────────────

const SPORT_EMOJI = {
  Badminton: '🏸',
  Tennis: '🎾',
  Football: '⚽',
  Basketball: '🏀',
  Pickleball: '🏓',
  Cricket: '🏏',
  Squash: '🎱',
  default: '🏟️',
};

function getSportEmoji(sport) {
  return SPORT_EMOJI[sport] || SPORT_EMOJI.default;
}

// ─── VenueCard ────────────────────────────────────────────────────────────────

function VenueCard({ venue }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/venues/${venue.id}`}
      className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm
                 hover:shadow-md hover:border-purple-200 transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      aria-label={`View details for ${venue.name}`}
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {!imgErr ? (
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Building2 className="w-16 h-16" />
          </div>
        )}
        {/* Indoor badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${venue.indoor ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
          {venue.indoor ? 'Indoor' : 'Outdoor'}
        </span>
        {/* Rating */}
        {venue.rating > 0 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {venue.rating}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-purple-700 transition-colors">
            {venue.name}
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 flex-shrink-0 mt-0.5 transition-colors" />
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{venue.location}</span>
        </div>

        {/* Sports */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {venue.sportTypes.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              <span>{getSportEmoji(s)}</span>
              {s}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {venue.openingHours}
          </span>
          <span className="font-semibold text-purple-700 text-sm">
            ₹{venue.pricePerHour}<span className="font-normal text-slate-400">/hr</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-slate-200 rounded-full w-20" />
          <div className="h-5 bg-slate-200 rounded-full w-16" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-2/3" />
      </div>
    </div>
  );
}

// ─── VenuesPage ───────────────────────────────────────────────────────────────

export default function VenuesPage() {
  const [venues, setVenues]     = useState([]);
  const [meta, setMeta]         = useState({ cities: [], sports: [] });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Filters
  const [search, setSearch]     = useState('');
  const [city, setCity]         = useState('');
  const [sport, setSport]       = useState('');
  const [indoor, setIndoor]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load metadata once
  useEffect(() => {
    fetchVenueMeta()
      .then((m) => setMeta(m))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (city)           filters.city   = city;
      if (sport)          filters.sport  = sport;
      if (indoor !== '')  filters.indoor = indoor === 'true';
      const data = await fetchVenues(filters);
      setVenues(data.venues || []);
    } catch (err) {
      setError(err.message || 'Failed to load venues. Please try again.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [search, city, sport, indoor]);

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 350);
    return () => clearTimeout(t);
  }, [load]);

  function clearFilters() {
    setSearch('');
    setCity('');
    setSport('');
    setIndoor('');
  }

  const hasFilters = search || city || sport || indoor !== '';
  const activeFilterCount = [search, city, sport, indoor !== '' ? '1' : ''].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Browse Venues</h1>
          <p className="mt-1 text-slate-500">Find and book the best sports courts near you.</p>
        </div>

        {/* Search + filter bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              id="venue-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search venues, cities, sports…"
              aria-label="Search venues"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="filter-panel"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        focus:outline-none focus:ring-2 focus:ring-purple-500
                        ${showFilters || activeFilterCount > 0
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-purple-700 text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div id="filter-panel" className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label htmlFor="filter-city" className="block text-xs font-semibold text-slate-600 mb-1.5">City</label>
                <select
                  id="filter-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All cities</option>
                  {meta.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Sport */}
              <div>
                <label htmlFor="filter-sport" className="block text-xs font-semibold text-slate-600 mb-1.5">Sport</label>
                <select
                  id="filter-sport"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All sports</option>
                  {meta.sports.map((s) => <option key={s} value={s}>{getSportEmoji(s)} {s}</option>)}
                </select>
              </div>

              {/* Indoor/Outdoor */}
              <div>
                <label htmlFor="filter-indoor" className="block text-xs font-semibold text-slate-600 mb-1.5">Venue Type</label>
                <select
                  id="filter-indoor"
                  value={indoor}
                  onChange={(e) => setIndoor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All types</option>
                  <option value="true">Indoor</option>
                  <option value="false">Outdoor</option>
                </select>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors focus:outline-none"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-lg font-semibold text-slate-800 mb-1">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <>
            <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading venues…
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-14 h-14 text-slate-200 mb-4" />
            <p className="text-lg font-semibold text-slate-700 mb-1">No venues found</p>
            <p className="text-sm text-slate-400 mb-4">
              {hasFilters ? 'Try adjusting or clearing your filters.' : 'No venues are available right now.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {venues.length} venue{venues.length !== 1 ? 's' : ''} found
              {hasFilters ? ' matching your filters' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
