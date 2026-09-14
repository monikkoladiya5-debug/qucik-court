import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, Star, Clock,
  X, Loader2, AlertCircle, Building2, ChevronRight,
  ShieldCheck, Compass, Check, Activity
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SportIcon from '../components/ui/SportIcon';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { fetchVenues, fetchVenueMeta } from '../services/api';

// ─── Venue Marketplace Card ───────────────────────────────────────────────────

function VenueCard({ venue }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/venues/${venue.id}`}
      className="group flex flex-col bg-[#0F131C] rounded-2xl border border-[#28303F] hover:border-lime-400/50 hover:shadow-xl transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-lime-400"
      aria-label={`View details and book courts at ${venue.name}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] bg-[#0B0F17] overflow-hidden">
        {!imgErr && venue.imageUrl ? (
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-[#0B0F17]">
            <Building2 className="w-14 h-14" />
          </div>
        )}

        {/* Facility Type Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md border ${
              venue.indoor
                ? 'bg-[#0B0F17]/90 text-lime-400 border-lime-400/30'
                : 'bg-[#0B0F17]/90 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {venue.indoor ? 'Indoor Arena' : 'Outdoor Turf'}
          </span>
        </div>

        {/* Rating & Court Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {venue.courtCount > 0 && (
            <span className="bg-[#0B0F17]/90 backdrop-blur-md text-slate-300 border border-[#28303F] text-[11px] font-semibold px-2 py-1 rounded-lg shadow-sm">
              {venue.courtCount} Courts
            </span>
          )}
          {venue.rating > 0 && (
            <div className="flex items-center gap-1 bg-[#0B0F17]/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-[#28303F] shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-mono">{venue.rating.toFixed(1)}</span>
              {venue.reviewCount > 0 && (
                <span className="text-slate-400 font-normal text-[11px]">({venue.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom subtle gradient */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0F131C] via-[#0F131C]/30 to-transparent pointer-events-none" />
      </div>

      {/* Card Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Title & City */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h2 className="font-extrabold text-white text-base leading-snug group-hover:text-lime-400 transition-colors line-clamp-1">
              {venue.name}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#181C24] text-slate-300 border border-[#28303F] flex-shrink-0">
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
            {venue.sportTypes?.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border bg-[#181C24] text-slate-300 border-[#28303F]"
              >
                <SportIcon sport={s} className="w-3 h-3 text-lime-400" aria-hidden="true" />
                <span>{s}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Card Footer: Hours, Rate & Book Action */}
        <div className="pt-3.5 border-t border-[#28303F] flex flex-wrap items-center justify-between gap-y-2 mt-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[130px]">{venue.openingHours}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-medium text-slate-400 mr-1">from</span>
              <span className="text-base font-black text-lime-400 font-mono">₹{venue.pricePerHour}</span>
              <span className="text-xs font-medium text-slate-400 font-sans">/hr</span>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lime-400 group-hover:bg-lime-300 text-slate-950 text-xs font-bold transition-colors shadow-qc-lime">
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
    <div className="bg-[#0F131C] rounded-2xl border border-[#28303F] overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[16/10] bg-[#181C24]" />
      <div className="p-5 space-y-3.5">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-[#181C24] rounded-lg w-2/3" />
          <div className="h-4 bg-[#181C24] rounded w-16" />
        </div>
        <div className="h-3.5 bg-[#181C24] rounded w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 bg-[#181C24] rounded-lg w-20" />
          <div className="h-6 bg-[#181C24] rounded-lg w-20" />
        </div>
        <div className="pt-3.5 border-t border-[#28303F] flex justify-between items-center">
          <div className="h-4 bg-[#181C24] rounded w-24" />
          <div className="h-6 bg-[#181C24] rounded-lg w-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Main VenuesPage Marketplace Component ───────────────────────────────────

export default function VenuesPage() {
  const [searchParams] = useSearchParams();

  // Filter state initialized from URL query params if present
  const [search, setSearch]         = useState(() => searchParams.get('search') || searchParams.get('q') || '');
  const [city, setCity]             = useState(() => searchParams.get('city') || '');
  const [sport, setSport]           = useState(() => searchParams.get('sport') || '');
  const [indoor, setIndoor]         = useState(() => searchParams.get('indoor') || '');
  const [maxPrice, setMaxPrice]     = useState(() => searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy]         = useState(() => searchParams.get('sortBy') || '');
  const [showFilters, setShowFilters] = useState(() => Boolean(searchParams.get('city') || searchParams.get('indoor') || searchParams.get('maxPrice')));

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
      if (maxPrice !== '') filters.maxPrice = maxPrice;
      if (sortBy)         filters.sortBy = sortBy;

      const data = await fetchVenues(filters);
      setVenues(data.venues || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch venues right now. Please check server connection.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [search, city, sport, indoor, maxPrice, sortBy]);

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
    setMaxPrice('');
    setSortBy('');
  }

  const hasFilters = Boolean(search.trim() || city || sport || indoor !== '' || maxPrice !== '' || sortBy);
  const activeFilterCount = [search.trim(), city, sport, indoor !== '' ? '1' : '', maxPrice ? '1' : '', sortBy ? '1' : ''].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 relative font-sans selection:bg-lime-400 selection:text-slate-950">
      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Marketplace Compact Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5 text-lime-400" />
            <span>Court Marketplace</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-medium">Explore Facilities</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Find & Compare Courts
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl">
                Explore verified sports venues across India, compare hourly rates and court amenities, and reserve your playtime.
              </p>
            </div>
            
            {/* Trust / Verified Badge */}
            <div className="hidden sm:inline-flex items-center gap-2 self-start md:self-auto py-2 px-3.5 rounded-xl bg-[#0F131C] border border-[#28303F] text-xs text-slate-300 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-lime-400" />
              <span>100% Verified Facilities</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Control Bar */}
        <section
          aria-label="Venue search and filter controls"
          className="bg-[#0F131C] border border-[#28303F] rounded-2xl p-4 sm:p-5 shadow-xl mb-6 space-y-3.5"
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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
              >
                <option value="">All Types</option>
                <option value="true">Indoor Arena</option>
                <option value="false">Outdoor Turf</option>
              </select>
            </div>

            {/* Filter Drawer Toggle Button (Mobile & Advanced filters) */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-lime-400 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                  : 'bg-[#0B0F17] text-slate-300 border-[#28303F] hover:bg-[#181C24]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-lime-400 text-xs font-black flex items-center justify-center">
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
                  ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                  : 'bg-[#0B0F17] text-slate-400 border border-[#28303F] hover:bg-[#181C24] hover:text-slate-200'
              }`}
            >
              All Sports
            </button>
            {meta.sports?.map((s) => {
              const isSelected = sport === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(isSelected ? '' : s)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition-all ${
                    isSelected
                      ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                      : 'bg-[#0B0F17] text-slate-300 border-[#28303F] hover:border-slate-700 hover:bg-[#181C24]'
                  }`}
                >
                  <SportIcon sport={s} className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{s}</span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Chips & Reset Bar */}
          {hasFilters && (
            <div className="pt-2 border-t border-[#28303F] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium mr-1">Active:</span>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <span>Search: "{search}"</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {city && (
                  <button
                    type="button"
                    onClick={() => setCity('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <span>City: {city}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {sport && (
                  <button
                    type="button"
                    onClick={() => setSport('')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <SportIcon sport={sport} className="w-3 h-3 text-lime-400" aria-hidden="true" />
                    <span>Sport: {sport}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {indoor !== '' && (
                  <button
                    type="button"
                    onClick={() => setIndoor('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <span>{indoor === 'true' ? 'Indoor Arena' : 'Outdoor Turf'}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {maxPrice !== '' && (
                  <button
                    type="button"
                    onClick={() => setMaxPrice('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <span>Max Price: ₹{maxPrice}/hr</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
                {sortBy && (
                  <button
                    type="button"
                    onClick={() => setSortBy('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181C24] text-slate-200 hover:bg-slate-800 border border-[#28303F] text-[11px]"
                  >
                    <span>Sort: {sortBy.replace('_', ' ')}</span>
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
            className="mb-6 p-5 bg-[#0F131C] rounded-2xl border border-[#28303F] shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#28303F]">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* City Select */}
              <div>
                <label htmlFor="filter-city" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Select City
                </label>
                <select
                  id="filter-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
                >
                  <option value="">All Facilities</option>
                  <option value="true">Indoor Arena Only</option>
                  <option value="false">Outdoor Turf Only</option>
                </select>
              </div>

              {/* Max Budget Filter */}
              <div>
                <label htmlFor="filter-max-price" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Max Budget
                </label>
                <select
                  id="filter-max-price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
                >
                  <option value="">Any Price</option>
                  <option value="400">Under ₹400 / hr</option>
                  <option value="500">Under ₹500 / hr</option>
                  <option value="600">Under ₹600 / hr</option>
                  <option value="800">Under ₹800 / hr</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label htmlFor="filter-sort-by" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Sort Results
                </label>
                <select
                  id="filter-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors"
                >
                  <option value="">Default Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Highest Rated</option>
                  <option value="courts_desc">Most Courts</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary Bar */}
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#28303F] text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-black">{venues.length}</strong> verified {venues.length === 1 ? 'facility' : 'facilities'}
              {hasFilters && ' matching your criteria'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">Live Availability</span>
          </div>
        </div>

        {/* Venue Results Section */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#0F131C] rounded-2xl border border-rose-500/30 text-center" role="alert">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Unable to Load Venues</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{error}</p>
            <Button
              variant="primary"
              size="md"
              onClick={load}
            >
              Retry Search
            </Button>
          </div>
        ) : loading ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-5">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
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
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#0F131C] rounded-2xl border border-[#28303F] text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#181C24] text-slate-400 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">No Matching Venues Found</h2>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              {hasFilters
                ? "We couldn't find any sports facilities matching your active filters. Try clearing some criteria or searching for another sport or location."
                : 'No sports facilities are currently available in this area.'}
            </p>
            {hasFilters && (
              <Button
                variant="primary"
                size="md"
                onClick={clearFilters}
              >
                Clear All Filters
              </Button>
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

