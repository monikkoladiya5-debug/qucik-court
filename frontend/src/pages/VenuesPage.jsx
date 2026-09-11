import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock,
  X, Loader2, AlertCircle, Building2, ChevronRight,
  ShieldCheck, Compass, Check
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenues, fetchVenueMeta } from '../services/api';

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

function getSportStyle(sport) {
  return SPORT_CONFIG[sport] || SPORT_CONFIG.default;
}

// ─── Venue Card ───────────────────────────────────────────────────────────────

function VenueCard({ venue }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/venues/${venue.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card hover:shadow-card-hover hover:border-indigo-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-label={`View details for ${venue.name}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {!imgErr && venue.imageUrl ? (
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
            <Building2 className="w-14 h-14" />
          </div>
        )}

        {/* Indoor / Outdoor Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs backdrop-blur-md ${
            venue.indoor
              ? 'bg-indigo-600/90 text-white'
              : 'bg-emerald-600/90 text-white'
          }`}>
            {venue.indoor ? 'Indoor Arena' : 'Outdoor Court'}
          </span>
        </div>

        {/* Rating Badge */}
        {venue.rating > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{venue.rating.toFixed(1)}</span>
            {venue.reviewCount > 0 && (
              <span className="text-slate-300 font-normal text-[11px]">({venue.reviewCount})</span>
            )}
          </div>
        )}

        {/* Bottom subtle gradient */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Card Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Title & City */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
              {venue.name}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
              {venue.city}
            </span>
          </div>

          {/* Location text */}
          <p className="flex items-center gap-1.5 text-xs text-slate-500 mb-3.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{venue.location || venue.address}</span>
          </p>

          {/* Sports Pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {venue.sportTypes?.map((s) => {
              const style = getSportStyle(s);
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                >
                  <span>{style.emoji}</span>
                  <span>{s}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Card Footer: Hours, Rate & View Details Action */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[120px]">{venue.openingHours}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-base font-black text-slate-900">₹{venue.pricePerHour}</span>
              <span className="text-xs font-medium text-slate-400">/hr</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Card with Shimmer ───────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card animate-pulse">
      <div className="aspect-[16/10] bg-slate-200 skeleton-shimmer" />
      <div className="p-5 space-y-3.5">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-slate-200 skeleton-shimmer rounded-lg w-2/3" />
          <div className="h-4 bg-slate-200 skeleton-shimmer rounded w-16" />
        </div>
        <div className="h-3.5 bg-slate-200 skeleton-shimmer rounded w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 bg-slate-200 skeleton-shimmer rounded-lg w-20" />
          <div className="h-6 bg-slate-200 skeleton-shimmer rounded-lg w-20" />
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-between">
          <div className="h-4 bg-slate-200 skeleton-shimmer rounded w-24" />
          <div className="h-5 bg-slate-200 skeleton-shimmer rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Main VenuesPage Component ────────────────────────────────────────────────

export default function VenuesPage() {
  const [searchParams] = useSearchParams();

  // Filter state initialized from URL query params if present (e.g. from homepage category click)
  const [search, setSearch]         = useState(() => searchParams.get('search') || '');
  const [city, setCity]             = useState(() => searchParams.get('city') || '');
  const [sport, setSport]           = useState(() => searchParams.get('sport') || '');
  const [indoor, setIndoor]         = useState(() => searchParams.get('indoor') || '');
  const [showFilters, setShowFilters] = useState(() => Boolean(searchParams.get('city') || searchParams.get('indoor')));

  const [venues, setVenues]         = useState([]);
  const [meta, setMeta]             = useState({ cities: [], sports: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Fetch metadata once on mount
  useEffect(() => {
    fetchVenueMeta()
      .then((m) => setMeta(m))
      .catch(() => {});
  }, []);

  // Main loader function
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
      setError(err.message || 'Unable to fetch venues right now. Please check server connection.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [search, city, sport, indoor]);

  // Debounced search trigger (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function clearFilters() {
    setSearch('');
    setCity('');
    setSport('');
    setIndoor('');
  }

  const hasFilters = Boolean(search.trim() || city || sport || indoor !== '');
  const activeFilterCount = [search.trim(), city, sport, indoor !== '' ? '1' : ''].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Page Hero Header */}
        <div className="mb-8 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Live Court Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Find Your Perfect Court
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Search verified venues across sports, check amenities, and explore indoor and outdoor sports facilities in your city.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-card mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="venue-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by venue name, location, or sport…"
                aria-label="Search venues"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search text"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-indigo-700 text-xs font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick 1-Click Sport Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSport('')}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                sport === ''
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Sports
            </button>
            {meta.sports?.map((s) => {
              const isSelected = sport === s;
              const style = getSportStyle(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(isSelected ? '' : s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{style.emoji}</span>
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Detailed Filter Drawer */}
        {showFilters && (
          <div
            id="filter-panel"
            className="mb-6 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Refine Search Results</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City Select */}
              <div>
                <label htmlFor="filter-city" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select City
                </label>
                <select
                  id="filter-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="">All Cities</option>
                  {meta.cities?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sport Select */}
              <div>
                <label htmlFor="filter-sport-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sport Type
                </label>
                <select
                  id="filter-sport-select"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="">All Sports</option>
                  {meta.sports?.map((s) => (
                    <option key={s} value={s}>{getSportStyle(s).emoji} {s}</option>
                  ))}
                </select>
              </div>

              {/* Indoor / Outdoor Select */}
              <div>
                <label htmlFor="filter-venue-type" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Facility Type
                </label>
                <select
                  id="filter-venue-type"
                  value={indoor}
                  onChange={(e) => setIndoor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="">All Facilities (Indoor & Outdoor)</option>
                  <option value="true">Indoor Arena Only</option>
                  <option value="false">Outdoor Court Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Venue Results Section */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-red-200 shadow-sm text-center" role="alert">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to Load Venues</h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Retry Search
            </button>
          </div>
        ) : loading ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-5">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Scanning sports venues…
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-slate-200 shadow-card text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">No Matching Venues Found</h2>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              {hasFilters
                ? "We couldn't find any venues matching your active filters. Try clearing some criteria or searching for another sport."
                : 'No sports facilities are registered in this area yet.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results Counter Bar */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-5">
              <span>
                Showing <strong className="text-slate-900 font-extrabold">{venues.length}</strong> venue{venues.length !== 1 ? 's' : ''}
                {hasFilters && ' matching your criteria'}
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Venues Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
