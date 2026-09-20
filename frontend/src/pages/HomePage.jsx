import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, ArrowRight, ShieldCheck,
  Clock, Users, Trophy, ChevronRight, CheckCircle2,
  Activity, ArrowUpRight, Sparkles, Flame, Compass
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Card, { CardContent } from '../components/ui/Card';
import SportIcon from '../components/ui/SportIcon';
import { fetchVenues, fetchVenueMeta, fetchRecommendedVenues } from '../services/api';

// Curated sport categories mapped strictly to real backend metadata
const SPORT_CATEGORIES = [
  { name: 'Badminton', subtitle: 'BWF-Grade Courts', color: 'text-lime-400', border: 'hover:border-lime-400/50' },
  { name: 'Cricket', subtitle: 'Box & Turf Nets', color: 'text-emerald-400', border: 'hover:border-emerald-400/50' },
  { name: 'Football', subtitle: 'FIFA-Grade Turfs', color: 'text-sky-400', border: 'hover:border-sky-400/50' },
  { name: 'Tennis', subtitle: 'Synthetic & Clay', color: 'text-amber-400', border: 'hover:border-amber-400/50' },
  { name: 'Basketball', subtitle: 'Hardwood & Acrylic', color: 'text-orange-400', border: 'hover:border-orange-400/50' },
  { name: 'Pickleball', subtitle: 'Dedicated Courts', color: 'text-purple-400', border: 'hover:border-purple-400/50' },
  { name: 'Squash', subtitle: 'Glass-Back Courts', color: 'text-teal-400', border: 'hover:border-teal-400/50' },
];

export default function HomePage() {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Metadata from backend API
  const [cities, setCities] = useState([]);
  const [sports, setSports] = useState([]);

  // Smart Recommendations from backend API
  const [recommendations, setRecommendations] = useState([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(true);

  // Featured venues from backend API
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venuesError, setVenuesError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [metaRes, venuesRes, recsRes] = await Promise.all([
          fetchVenueMeta().catch(() => ({ cities: [], sports: [] })),
          fetchVenues().catch((err) => ({ status: 'error', message: err.message, venues: [] })),
          fetchRecommendedVenues({ limit: 4 }).catch(() => ({ status: 'ok', recommendations: [], personalized: false }))
        ]);

        if (!isMounted) return;

        if (metaRes?.cities) setCities(metaRes.cities);
        if (metaRes?.sports) setSports(metaRes.sports);

        if (recsRes?.recommendations && Array.isArray(recsRes.recommendations)) {
          setRecommendations(recsRes.recommendations);
          setIsPersonalized(Boolean(recsRes.personalized));
        }

        if (venuesRes?.status === 'ok' && Array.isArray(venuesRes.venues)) {
          // Select top active venues sorted by rating
          const top = venuesRes.venues
            .filter((v) => v.status === 'active')
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3);
          setFeaturedVenues(top);
        } else if (venuesRes?.status === 'success' && Array.isArray(venuesRes.venues)) {
          const top = venuesRes.venues
            .filter((v) => v.status === 'active')
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3);
          setFeaturedVenues(top);
        }
      } catch (err) {
        if (isMounted) setVenuesError(err.message || 'Failed to load facilities');
      } finally {
        if (isMounted) {
          setLoadingVenues(false);
          setLoadingRecs(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (selectedSport) params.set('sport', selectedSport);
    if (selectedCity) params.set('city', selectedCity);
    const qs = params.toString();
    navigate(`/venues${qs ? `?${qs}` : ''}`);
  }

  function handleCategoryClick(sportName) {
    navigate(`/venues?sport=${encodeURIComponent(sportName)}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 font-sans selection:bg-lime-400 selection:text-slate-950">
      {/* 1. Kinetic Obsidian Navigation */}
      <Header />

      <main className="flex-1">
        {/* 2. Hero Section — Athletic Kinetic Obsidian Visual Anchor */}
        <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 bg-[#0B0F17]">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime-400/5 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

              {/* Left Column: Headline, Value Prop & Quick CTAs */}
              <div className="lg:col-span-7 text-left">
                {/* Real-time platform badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F131C] border border-[#28303F] text-lime-400 text-xs font-semibold tracking-wide mb-6">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span>Real-Time Slot Engine • Instant Booking</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-white">
                  Find a Court.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-teal-300">
                    Check Availability.
                  </span>{' '}
                  Play Tonight.
                </h1>

                <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-xl leading-relaxed font-normal">
                  QuickCourt connects sports enthusiasts with verified indoor arenas, floodlit turfs, and premium courts across India. Reserve live slots with instant confirmation.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 mb-10">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/venues')}
                    icon={Search}
                  >
                    Find Your Court
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate('/players')}
                    icon={Users}
                  >
                    Find Players
                  </Button>
                </div>

                {/* Platform Guarantees Micro-Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#28303F] pt-6 max-w-lg">
                  <div>
                    <span className="text-xs font-bold text-white block">0 Double-Bookings</span>
                    <span className="text-[11px] text-slate-400">Conflict-locked slots</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Transparent Pricing</span>
                    <span className="text-[11px] text-slate-400">Exact ₹ rates, no hidden fees</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">+10 Loyalty Points</span>
                    <span className="text-[11px] text-slate-400">Per completed match</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Quick-Search Panel */}
              <div className="lg:col-span-5">
                <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl p-6 sm:p-7 shadow-2xl relative">
                  {/* Subtle top accent highlight */}
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />

                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
                        <Activity className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        Quick Court Search
                      </h2>
                    </div>
                    <Badge variant="lime" dot>
                      Live Venues
                    </Badge>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="space-y-4">
                    {/* Location / Keyword Search */}
                    <Input
                      label="Venue or Area"
                      id="hero-search-query"
                      type="text"
                      icon={MapPin}
                      placeholder="e.g. Bodakdev, Smash Club, Satellite..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Sport Discipline Dropdown */}
                    <div>
                      <label htmlFor="hero-sport-select" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Sport Discipline
                      </label>
                      <select
                        id="hero-sport-select"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#28303F] rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
                      >
                        <option value="">All Sports (Badminton, Cricket, Football...)</option>
                        {sports.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* City Dropdown */}
                    <div>
                      <label htmlFor="hero-city-select" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        City
                      </label>
                      <select
                        id="hero-city-select"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#28303F] rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
                      >
                        <option value="">All Cities (Ahmedabad, Mumbai, Pune...)</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Submit Action Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full mt-2"
                      icon={ArrowRight}
                    >
                      Find Available Courts
                    </Button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. Sports Categories — Grid with SportIcon */}
        <section className="py-14 bg-[#0F131C] border-y border-[#28303F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-1 block">
                  Disciplines
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Browse by Sport
                </h2>
              </div>
              <Link
                to="/venues"
                className="mt-3 md:mt-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-lime-400 hover:text-lime-300 transition-colors"
              >
                <span>View all facilities</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
              {SPORT_CATEGORIES.map((sport) => (
                <button
                  key={sport.name}
                  type="button"
                  onClick={() => handleCategoryClick(sport.name)}
                  className={`group text-left p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] ${sport.border} transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-lime-400 hover:shadow-lg`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#181C24] border border-[#28303F] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-white">
                    <SportIcon sport={sport.name} className={`w-5 h-5 ${sport.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm group-hover:text-lime-400 transition-colors">
                      {sport.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {sport.subtitle}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3.5. Smart Recommendations Section */}
        {(!loadingRecs || recommendations.length > 0) && (
          <section className="py-16 lg:py-20 bg-[#0B0F17] border-b border-[#28303F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isPersonalized ? 'Personalized Picks' : 'Smart Discovery'}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {isPersonalized ? 'Recommended for You' : 'Top Recommended Facilities'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {isPersonalized
                      ? 'Tailored based on your preferred sports, previous bookings, and top facility ratings.'
                      : 'Highly-rated facilities and popular venues curated from verified player ratings.'}
                  </p>
                </div>
                <Link
                  to="/venues"
                  className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F131C] border border-[#28303F] text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                >
                  <span>Explore All Venues</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {loadingRecs ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="bg-[#0F131C] rounded-2xl border border-[#28303F] p-4 animate-pulse">
                      <div className="aspect-[16/10] bg-[#181C24] rounded-xl mb-4" />
                      <div className="h-5 bg-[#181C24] rounded w-3/4 mb-2" />
                      <div className="h-4 bg-[#181C24] rounded w-1/2 mb-4" />
                      <div className="h-9 bg-[#181C24] rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0F131C] border border-[#28303F] text-center text-slate-400 text-sm">
                  <p>Discover live facilities in your city and book your first match.</p>
                  <Link to="/venues" className="mt-3 inline-block font-bold text-lime-400 hover:underline">
                    Browse All Courts
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendations.map((venue) => (
                    <div
                      key={venue.id}
                      className="group bg-[#0F131C] rounded-2xl border border-[#28303F] hover:border-lime-400/50 overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        {/* Cover Image & Badges */}
                        <div className="relative aspect-[16/10] bg-[#0B0F17] overflow-hidden">
                          {venue.imageUrl ? (
                            <img
                              src={venue.imageUrl}
                              alt={venue.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-[#0B0F17]">
                              <SportIcon sport={venue.sportTypes?.[0] || 'default'} className="w-12 h-12 text-slate-700" />
                            </div>
                          )}

                          {/* Indoor / Outdoor Badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${venue.indoor
                                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              }`}>
                              {venue.indoor ? 'Indoor' : 'Outdoor'}
                            </span>
                          </div>

                          {/* Rating Badge */}
                          {venue.rating > 0 && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#0B0F17]/90 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg border border-[#28303F]">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-mono text-xs">{venue.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-4 sm:p-5">
                          {/* Recommendation reason banner */}
                          {venue.recommendationReason && (
                            <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[11px] font-medium leading-tight flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-lime-400" />
                              <span className="line-clamp-2">{venue.recommendationReason}</span>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug group-hover:text-lime-400 transition-colors line-clamp-1">
                              {venue.name}
                            </h3>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#181C24] text-slate-300 border border-[#28303F] shrink-0">
                              {venue.city}
                            </span>
                          </div>

                          <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{venue.location || venue.address}</span>
                          </p>

                          {/* Match Tags */}
                          {venue.matchTags && venue.matchTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {venue.matchTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#181C24] text-slate-300 border border-[#28303F]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sports Pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {venue.sportTypes?.slice(0, 2).map((sport) => (
                              <span
                                key={sport}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#181C24] text-slate-300 border border-[#28303F]"
                              >
                                <SportIcon sport={sport} className="w-3 h-3 text-lime-400" />
                                <span>{sport}</span>
                              </span>
                            ))}
                            {venue.sportTypes?.length > 2 && (
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5">
                                +{venue.sportTypes.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Price + Book Action */}
                      <div className="p-4 sm:p-5 pt-3 border-t border-[#28303F] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                            Starts at
                          </span>
                          <div className="text-white font-black text-sm sm:text-base font-mono">
                            ₹{venue.pricePerHour}
                            <span className="text-xs font-normal text-slate-400 font-sans"> / hr</span>
                          </div>
                        </div>

                        <Link
                          to={`/venues/${venue.id}`}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 font-bold text-xs shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                        >
                          <span>Book</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Featured Facilities — Real Verified Venues */}
        <section className="py-16 lg:py-20 bg-[#0F131C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-1 block">
                  Top Rated
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Featured Facilities
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Tournament-ready sports arenas verified for court quality, floodlighting, and amenities.
                </p>
              </div>
              <Link
                to="/venues"
                className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F131C] border border-[#28303F] text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all"
              >
                <span>Browse Directory</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingVenues ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-[#0F131C] rounded-2xl border border-[#28303F] p-4 animate-pulse">
                    <div className="aspect-[16/10] bg-[#181C24] rounded-xl mb-4" />
                    <div className="h-5 bg-[#181C24] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-[#181C24] rounded w-1/2 mb-4" />
                    <div className="h-9 bg-[#181C24] rounded-xl" />
                  </div>
                ))}
              </div>
            ) : venuesError ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-amber-300 text-sm text-center">
                <p>Could not load featured facilities. Please explore all venues directly.</p>
                <Link to="/venues" className="mt-3 inline-block font-bold text-lime-400 hover:underline">
                  Go to Venues Directory
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="group bg-[#0F131C] rounded-2xl border border-[#28303F] hover:border-lime-400/50 overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      {/* Venue Cover Image */}
                      <div className="relative aspect-[16/10] bg-[#0B0F17] overflow-hidden">
                        {venue.imageUrl ? (
                          <img
                            src={venue.imageUrl}
                            alt={venue.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 bg-[#0B0F17]">
                            <SportIcon sport={venue.sportTypes?.[0] || 'default'} className="w-12 h-12 text-slate-700" />
                          </div>
                        )}

                        {/* Indoor / Outdoor Badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${venue.indoor
                              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            }`}>
                            {venue.indoor ? 'Indoor Arena' : 'Outdoor Turf'}
                          </span>
                        </div>

                        {/* Verified Rating */}
                        {venue.rating > 0 && (
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#0B0F17]/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-[#28303F]">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-mono">{venue.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Venue Info Details */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-extrabold text-white text-base leading-snug group-hover:text-lime-400 transition-colors line-clamp-1">
                            {venue.name}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#181C24] text-slate-300 border border-[#28303F] flex-shrink-0">
                            {venue.city}
                          </span>
                        </div>

                        <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-3.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{venue.location || venue.address}</span>
                        </p>

                        {/* Sport Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {venue.sportTypes?.map((sport) => (
                            <span
                              key={sport}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#181C24] text-slate-300 border border-[#28303F]"
                            >
                              <SportIcon sport={sport} className="w-3 h-3 text-lime-400" />
                              <span>{sport}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Price & Direct Book Action */}
                    <div className="px-5 pb-5 pt-3 border-t border-[#28303F] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                          Starts at
                        </span>
                        <div className="text-white font-black text-base font-mono">
                          ₹{venue.pricePerHour}
                          <span className="text-xs font-normal text-slate-400 font-sans"> / hr</span>
                        </div>
                      </div>

                      <Link
                        to={`/venues/${venue.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 font-bold text-xs shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                      >
                        <span>Book Court</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. How QuickCourt Works — 3-Step Booking Journey */}
        <section className="py-16 lg:py-20 bg-[#0F131C] border-y border-[#28303F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-1 block">
                Seamless Experience
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                How QuickCourt Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                From finding an open court to stepping on the turf in three simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Step 1 */}
              <div className="p-7 rounded-2xl bg-[#0B0F17] border border-[#28303F] flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 font-black text-lg flex items-center justify-center mb-5 shadow-qc-lime">
                  1
                </div>
                <h3 className="font-extrabold text-white text-base sm:text-lg mb-2">
                  Pick Sport & Facility
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Filter verified venues across badminton, cricket, and football by location, indoor/outdoor preferences, and transparent ₹ pricing.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-7 rounded-2xl bg-[#0B0F17] border border-[#28303F] flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center mb-5 shadow-qc-emerald">
                  2
                </div>
                <h3 className="font-extrabold text-white text-base sm:text-lg mb-2">
                  Select Live Slot
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Check deterministic real-time court availability. Choose your exact hourly slot with authoritative double-booking conflict locking.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-7 rounded-2xl bg-[#0B0F17] border border-[#28303F] flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#181C24] border border-[#28303F] text-lime-400 font-black text-lg flex items-center justify-center mb-5">
                  3
                </div>
                <h3 className="font-extrabold text-white text-base sm:text-lg mb-2">
                  Instant Confirmation & Play
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Your slot reservation is approved and locked. Complete payment securely, earn loyalty reward points, and show up ready to play.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Community & Player Matchmaking Banner */}
        <section className="py-16 lg:py-20 bg-[#0B0F17]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-[#0F131C] via-[#181C24] to-[#0F131C] rounded-2xl border border-[#28303F] p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  <Users className="w-3.5 h-3.5" />
                  <span>Player Community</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
                  Need a Partner for Today&apos;s Match?
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  Connect with badminton, tennis, and box cricket players in your area. Discover partners by sport & skill level, coordinate matches, and build your local sports network.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                    <span>Skill-based discovery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                    <span>Preferred sports matching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 flex-shrink-0" />
                    <span>Direct match coordination</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/players')}
                >
                  Explore Players Directory
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/profile')}
                >
                  Update My Profile
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Platform Guarantees & Capabilities */}
        <section className="py-16 lg:py-20 bg-[#0F131C] border-t border-[#28303F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-1 block">
                Platform Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Built for High Performance
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                A purpose-built booking platform engineered for speed, authoritative slot locking, and zero confusion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#28303F]">
                <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">
                  Live Slot Availability
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time court availability prevents double bookings with authoritative slot conflict checks.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#28303F]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">
                  Instant Verification
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your court reservation is locked in immediately with transparent ₹ pricing and no hidden fees.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#28303F]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">
                  Loyalty Points Engine
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Earn +10 loyalty reward points on every completed match. Track your points dynamically on your profile.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#28303F]">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Star className="w-5 h-5 fill-purple-400/30" />
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">
                  Verified Player Reviews
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authentic ratings and verified reviews from players who completed matches at each facility.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final Customer CTA */}
        <section className="py-16 lg:py-20 bg-[#0B0F17] text-white text-center border-t border-[#28303F]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Ready to Hit the Court?
            </h2>
            <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              Explore badminton courts, box cricket turfs, and football arenas ready for your next game.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/venues')}
                icon={Search}
              >
                Browse All Venues
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/players')}
                icon={Users}
              >
                Find Match Players
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Professional Footer */}
      <Footer />
    </div>
  );
}

