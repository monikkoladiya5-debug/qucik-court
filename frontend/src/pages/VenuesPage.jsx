import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock,
  X, Loader2, AlertCircle, Building2, ChevronRight,
  ShieldCheck, Compass, Check, Trophy, Zap, Award,
  Flame, Sparkles, Layers, Activity
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchVenues, fetchVenueMeta } from '../services/api';

const SPORT_CONFIG = {
  Badminton:  { icon: Trophy,      bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  Tennis:     { icon: Zap,         bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/20' },
  Football:   { icon: Award,       bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/20' },
  Basketball: { icon: Flame,       bg: 'bg-orange-500/10',  text: 'text-orange-300',  border: 'border-orange-500/20' },
  Pickleball: { icon: Sparkles,    bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/20' },
  Cricket:    { icon: ShieldCheck, bg: 'bg-red-500/10',     text: 'text-red-300',     border: 'border-red-500/20' },
  Squash:     { icon: Layers,      bg: 'bg-teal-500/10',    text: 'text-teal-300',    border: 'border-teal-500/20' },
  default:    { icon: Activity,    bg: 'bg-slate-800',      text: 'text-slate-300',   border: 'border-slate-700' },
};

function getSportStyle(sport) {
  return SPORT_CONFIG[sport] || SPORT_CONFIG.default;
}

// ─── Venue Marketplace Card ───────────────────────────────────────────────────

function VenueCard({ venue }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/venues/${venue.id}`}
      className="group flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-400"
      aria-label={`View details and book courts at ${venue.name}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
        {!imgErr && venue.imageUrl ? (
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-950">
            <Building2 className="w-14 h-14" />
          </div>
        )}

        {/* Facility Type Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md border ${
              venue.indoor
                ? 'bg-slate-950/85 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-950/85 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {venue.indoor ? 'Indoor Arena' : 'Outdoor Court'}
          </span>
        </div>

        {/* Rating & Court Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {venue.courtCount > 0 && (
            <span className="bg-slate-950/85 backdrop-blur-md text-slate-300 border border-slate-800 text-[11px] font-semibold px-2 py-1 rounded-lg shadow-sm">
              {venue.courtCount} Courts
            </span>
          )}
          {venue.rating > 0 && (
            <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-800 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{venue.rating.toFixed(1)}</span>
              {venue.reviewCount > 0 && (
                <span className="text-slate-400 font-normal text-[11px]">({venue.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom subtle gradient */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />
      </div>

      {/* Card Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Title & City */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h2 className="font-extrabold text-white text-base leading-snug group-hover:text-emerald-400 transition-colors line-clamp-1">
              {venue.name}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 flex-shrink-0">
              {venue.city}
            </span>
          </div>

          {/* Location text */}
          <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{venue.location || venue.address}</span>
          </p>

          {/* Sports Pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {venue.sportTypes?.map((s) => {
              const style = getSportStyle(s);
              const SportIcon = style.icon;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                >
                  <SportIcon className="w-3 h-3" aria-hidden="true" />
                  <span>{s}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Card Footer: Hours, Rate & Book Action */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-y-2 mt-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[130px]">{venue.openingHours}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-medium text-slate-400 mr-1">from</span>
              <span className="text-base font-black text-emerald-400">₹{venue.pricePerHour}</span>
              <span className="text-xs font-medium text-slate-400">/hr</span>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-sm shadow-emerald-500/20">
              Book Court <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Card for Loading State ─────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[16/10] bg-slate-800/80" />
      <div className="p-5 space-y-3.5">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-slate-800 rounded-lg w-2/3" />
          <div className="h-4 bg-slate-800 rounded w-16" />
        </div>
        <div className="h-3.5 bg-slate-800/80 rounded w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 bg-slate-800 rounded-lg w-20" />
          <div className="h-6 bg-slate-800 rounded-lg w-20" />
        </div>
        <div className="pt-3.5 border-t border-slate-800 flex justify-between items-center">
          <div className="h-4 bg-slate-800 rounded w-24" />
          <div className="h-6 bg-slate-800 rounded-lg w-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Main VenuesPage Marketplace Component ───────────────────────────────────

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Marketplace Compact Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Court Marketplace</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-medium">Explore Facilities</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Find & Compare Courts
              </h1>
              <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
                Explore verified sports venues, compare hourly rates and court amenities, and reserve your playtime.
              </p>
            </div>
            
            {/* Trust / Verified Badge */}
            <div className="hidden sm:inline-flex items-center gap-2 self-start md:self-auto py-2 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Verified Facilities</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Control Bar */}
        <section
          aria-label="Venue search and filter controls"
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md mb-6 space-y-3.5"
        >
          {/* Main Controls Row */}
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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search text"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City Dropdown (Desktop / Tablet inline) */}
            <div className="hidden sm:block min-w-[140px]">
              <label htmlFor="filter-city-inline" className="sr-only">Filter by city</label>
              <select
                id="filter-city-inline"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
              >
                <option value="">All Cities</option>
                {meta.cities?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Facility Type Dropdown (Desktop / Tablet inline) */}
            <div className="hidden md:block min-w-[160px]">
              <label htmlFor="filter-indoor-inline" className="sr-only">Filter by facility type</label>
              <select
                id="filter-indoor-inline"
                value={indoor}
                onChange={(e) => setIndoor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
              >
                <option value="">All Types</option>
                <option value="true">Indoor Arena</option>
                <option value="false">Outdoor Court</option>
              </select>
            </div>

            {/* Filter Drawer Toggle Button (Mobile & Advanced filters) */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 text-xs font-black flex items-center justify-center">
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
              aria-pressed={sport === ''}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                sport === ''
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              All Sports
            </button>
            {meta.sports?.map((s) => {
              const isSelected = sport === s;
              const style = getSportStyle(s);
              const SportIcon = style.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(isSelected ? '' : s)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <SportIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{s}</span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Chips & Reset Bar */}
          {hasFilters && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium mr-1">Active:</span>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  >
                    <span>Search: "{search}"</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {city && (
                  <button
                    type="button"
                    onClick={() => setCity('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  >
                    <span>City: {city}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {sport && (() => {
                  const SportIcon = getSportStyle(sport).icon;
                  return (
                    <button
                      type="button"
                      onClick={() => setSport('')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-[11px]"
                    >
                      <SportIcon className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      <span>Sport: {sport}</span>
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  );
                })()}
                {indoor !== '' && (
                  <button
                    type="button"
                    onClick={() => setIndoor('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  >
                    <span>{indoor === 'true' ? 'Indoor Arena' : 'Outdoor Court'}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Collapsible Detailed Filter Drawer */}
        {showFilters && (
          <div
            id="filter-panel"
            className="mb-6 p-5 bg-slate-900/95 rounded-2xl border border-slate-800 shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Refine Search Results</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City Select */}
              <div>
                <label htmlFor="filter-city" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Select City
                </label>
                <select
                  id="filter-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  <option value="">All Cities</option>
                  {meta.cities?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sport Select */}
              <div>
                <label htmlFor="filter-sport-select" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Sport Type
                </label>
                <select
                  id="filter-sport-select"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  <option value="">All Sports</option>
                  {meta.sports?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Indoor / Outdoor Select */}
              <div>
                <label htmlFor="filter-venue-type" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Facility Type
                </label>
                <select
                  id="filter-venue-type"
                  value={indoor}
                  onChange={(e) => setIndoor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  <option value="">All Facilities (Indoor & Outdoor)</option>
                  <option value="true">Indoor Arena Only</option>
                  <option value="false">Outdoor Court Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary Bar */}
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-800/80 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-black">{venues.length}</strong> verified {venues.length === 1 ? 'facility' : 'facilities'}
              {hasFilters && ' matching your criteria'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">Live Availability</span>
          </div>
        </div>

        {/* Venue Results Section */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/90 rounded-2xl border border-rose-500/30 text-center" role="alert">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Unable to Load Venues</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Retry Search
            </button>
          </div>
        ) : loading ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-5">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
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
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">No Matching Venues Found</h2>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              {hasFilters
                ? "We couldn't find any sports facilities matching your active filters. Try clearing some criteria or searching for another sport or location."
                : 'No sports facilities are currently available in this area.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

