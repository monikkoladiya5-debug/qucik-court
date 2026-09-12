import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  fetchPlayers,
  fetchPlayer,
  fetchMyPlayerProfile,
  updateMyPlayerProfile
} from '../services/api';
import {
  Users, Search, UserCheck, Clock,
  Calendar, MapPin, CheckCircle2, AlertCircle,
  X, Edit3, ShieldCheck, RefreshCw, Trophy,
  Zap, Award, Flame, Sparkles, Layers, Activity,
  ChevronRight, ExternalLink, SlidersHorizontal, Check
} from 'lucide-react';

const SPORTS_OPTIONS = ['All', 'Badminton', 'Tennis', 'Pickleball', 'Football', 'Basketball', 'Squash'];
const SKILL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const TIME_OPTIONS = ['All', 'Mornings', 'Afternoons', 'Evenings', 'Flexible'];
const STATUS_OPTIONS = ['All', 'AVAILABLE', 'BUSY'];

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

function getSportStyle(sport) {
  return SPORT_CONFIG[sport] || SPORT_CONFIG.default;
}

const SKILL_BADGE_STYLES = {
  Beginner: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Intermediate: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  Advanced: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
};

export default function PlayersPage() {
  const { user } = useAuth();

  // ─── Discovery State ────────────────────────────────────────────────────────
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [selectedTime, setSelectedTime] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Profile Form State
  const [myProfile, setMyProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [formSport, setFormSport] = useState('Badminton');
  const [formSkill, setFormSkill] = useState('Intermediate');
  const [formDays, setFormDays] = useState('Weekdays');
  const [formTime, setFormTime] = useState('Evenings');
  const [formStatus, setFormStatus] = useState('AVAILABLE');
  const [formBio, setFormBio] = useState('');

  // ─── Fetch Players ──────────────────────────────────────────────────────────
  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedSport !== 'All') filters.sport = selectedSport;
      if (selectedSkill !== 'All') filters.skillLevel = selectedSkill;
      if (selectedTime !== 'All') filters.preferredTime = selectedTime;
      if (selectedStatus !== 'All') filters.availabilityStatus = selectedStatus;
      if (searchQuery.trim()) filters.q = searchQuery.trim();

      const data = await fetchPlayers(filters);
      setPlayers(data.players || []);
    } catch (err) {
      console.error('Failed to load players:', err);
      setError(err.message || 'Unable to fetch players. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedSport, selectedSkill, selectedTime, selectedStatus, searchQuery]);

  // ─── Fetch Own Profile ──────────────────────────────────────────────────────
  const loadMyProfile = useCallback(async () => {
    try {
      const data = await fetchMyPlayerProfile();
      if (data.player) {
        setMyProfile(data.player);
        setFormSport(data.player.sport || 'Badminton');
        setFormSkill(data.player.skillLevel || 'Intermediate');
        setFormDays(data.player.preferredDays || 'Weekdays');
        setFormTime(data.player.preferredTime || 'Evenings');
        setFormStatus(data.player.availabilityStatus || 'AVAILABLE');
        setFormBio(data.player.bio || '');
      }
    } catch (err) {
      console.warn('Could not load own profile:', err);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  // Keyboard Escape listener to dismiss open dialogs
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (selectedPlayer) setSelectedPlayer(null);
        if (isEditProfileOpen && !profileSaving) setIsEditProfileOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayer, isEditProfileOpen, profileSaving]);

  // ─── Open Player Detail ─────────────────────────────────────────────────────
  async function handleOpenDetail(player) {
    setSelectedPlayer(player);
    setDetailLoading(true);
    try {
      const data = await fetchPlayer(player.id);
      if (data.player) {
        setSelectedPlayer(data.player);
      }
    } catch (err) {
      console.warn('Failed to load full detail, using preview:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  // ─── Handle Profile Update ──────────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload = {
        sport: formSport.trim(),
        skillLevel: formSkill,
        preferredDays: formDays,
        preferredTime: formTime,
        availabilityStatus: formStatus,
        bio: formBio.trim(),
      };

      const res = await updateMyPlayerProfile(payload);
      setProfileSuccess('Your player discovery profile has been updated!');
      setMyProfile(res.player);

      // Refresh list to show updated values
      loadPlayers();

      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSuccess(null);
      }, 1200);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile. Check your inputs.');
    } finally {
      setProfileSaving(false);
    }
  }

  function handleClearFilters() {
    setSearchQuery('');
    setSelectedSport('All');
    setSelectedSkill('All');
    setSelectedTime('All');
    setSelectedStatus('All');
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSport !== 'All' ||
    selectedSkill !== 'All' ||
    selectedTime !== 'All' ||
    selectedStatus !== 'All';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* ── Community Header ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Community Discovery</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">Local Matchmaking</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Find Players & Sparring Partners
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Meet players who share your sports interests. Filter by sport, skill level, and play schedule to set up your next match.
            </p>
          </div>

          {/* My Player Profile Mini-Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 sm:min-w-[320px] shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Playing Status</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  myProfile?.availabilityStatus === 'AVAILABLE'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    myProfile?.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                {myProfile?.availabilityStatus || 'AVAILABLE'}
              </span>
            </div>

            <div className="text-sm font-black text-white">
              {myProfile?.name || user?.name || 'Player Profile'}
            </div>
            
            <div className="text-xs text-slate-400 mt-0.5 mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-emerald-400 font-semibold">{myProfile?.sport || 'Badminton'}</span>
              <span>•</span>
              <span>{myProfile?.skillLevel || 'Intermediate'}</span>
              <span>•</span>
              <span>{myProfile?.preferredTime || 'Evenings'}</span>
            </div>

            <button
              id="btn-edit-my-profile"
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold transition-colors border border-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Update Playing Preferences</span>
            </button>
          </div>
        </div>

        {/* ── Player Discovery Filters Area ───────────────────────────────── */}
        <section aria-label="Player discovery filters" className="mt-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
            
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                id="input-player-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, sport, or bio keywords…"
                aria-label="Search players by name, sport, or bio keywords"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear player search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick 1-Click Sport Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              {SPORTS_OPTIONS.map((sport) => {
                const isSelected = selectedSport === sport;
                const style = getSportStyle(sport);
                const SportIcon = style.icon;

                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setSelectedSport(sport)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {sport !== 'All' && <SportIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{sport === 'All' ? 'All Sports' : sport}</span>
                  </button>
                );
              })}
            </div>

            {/* Secondary Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-800/80">
              
              {/* Sport Dropdown */}
              <div>
                <label htmlFor="filter-sport" className="block text-xs font-bold text-slate-400 mb-1">
                  Sport Type
                </label>
                <select
                  id="filter-sport"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  {SPORTS_OPTIONS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport === 'All' ? 'All Sports' : sport}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Level Dropdown */}
              <div>
                <label htmlFor="filter-skill" className="block text-xs font-bold text-slate-400 mb-1">
                  Skill Level
                </label>
                <select
                  id="filter-skill"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  {SKILL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === 'All' ? 'All Skill Levels' : lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Time Dropdown */}
              <div>
                <label htmlFor="filter-time" className="block text-xs font-bold text-slate-400 mb-1">
                  Preferred Time
                </label>
                <select
                  id="filter-time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time === 'All' ? 'Any Play Period' : time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Dropdown */}
              <div>
                <label htmlFor="filter-status" className="block text-xs font-bold text-slate-400 mb-1">
                  Player Availability
                </label>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  <option value="All">All Statuses</option>
                  <option value="AVAILABLE">Available to Play</option>
                  <option value="BUSY">Currently Busy</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips & Reset Bar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium">
                  Showing filtered community results
                </span>
                <button
                  id="btn-clear-player-filters"
                  type="button"
                  onClick={handleClearFilters}
                  className="text-rose-400 hover:text-rose-300 font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Player Results Area ─────────────────────────────────────────── */}
        <section aria-label="Discoverable players" className="mt-8">
          
          {/* Header & count */}
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-800/80 text-xs font-medium text-slate-400">
            <div>
              Showing <strong className="text-white font-black">{players.length}</strong> active player{players.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' matching criteria'}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">Live Community</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-800 rounded w-2/3" />
                      <div className="h-3 bg-slate-800 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-slate-950/80 rounded-xl" />
                  <div className="h-8 bg-slate-800 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8 text-center bg-slate-900/90 rounded-3xl border border-rose-500/30 shadow-xl max-w-md mx-auto" role="alert">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-white mb-1">Failed to Load Players</h2>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={loadPlayers}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && players.length === 0 && (
            <div className="p-12 sm:p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                <Users className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">No Players Found</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  No active players match your selected filters. Try broadening your sport, skill, or time period criteria.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Player Cards Grid */}
          {!loading && !error && players.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => {
                const isOwnProfile = myProfile && (player.id === myProfile.id || player.name === user?.name);
                const sportStyle = getSportStyle(player.sport);
                const SportIcon = sportStyle.icon;

                return (
                  <article
                    key={player.id}
                    className={`bg-slate-900/90 rounded-2xl border p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between relative backdrop-blur-md ${
                      isOwnProfile
                        ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 hover:border-emerald-500/30'
                    }`}
                  >
                    {/* Top Identity Block */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {player.imageUrl ? (
                            <img
                              src={player.imageUrl}
                              alt={player.name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 text-slate-950 font-black text-base flex items-center justify-center shadow-sm">
                              {player.name ? player.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-base leading-snug">{player.name}</h3>
                              {isOwnProfile && (
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            {player.distance && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span>{player.distance}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Availability status badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            player.availabilityStatus === 'AVAILABLE'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              player.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                          {player.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Busy'}
                        </span>
                      </div>

                      {/* Sports & Skill tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {player.sport && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${sportStyle.bg} ${sportStyle.text} ${sportStyle.border}`}>
                            <SportIcon className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{player.sport}</span>
                          </span>
                        )}

                        {player.skillLevel && (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              SKILL_BADGE_STYLES[player.skillLevel] || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {player.skillLevel}
                          </span>
                        )}
                      </div>

                      {/* Bio snippet */}
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed italic">
                        {player.bio ? `"${player.bio}"` : 'Active player on QuickCourt looking for matches.'}
                      </p>

                      {/* Preferred play timing */}
                      <div className="bg-slate-950/80 rounded-xl p-3 mb-4 space-y-1.5 text-xs border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Preferred Days:</span>
                          </span>
                          <span className="font-semibold text-slate-200">{player.preferredDays || 'Flexible'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Time Period:</span>
                          </span>
                          <span className="font-semibold text-slate-200">{player.preferredTime || 'Flexible'}</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      id={`btn-view-player-${player.id}`}
                      type="button"
                      onClick={() => handleOpenDetail(player)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-emerald-500 flex items-center justify-center gap-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <span>View Player Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* ── Player Detail Modal ───────────────────────────────────────────── */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlayer(null);
          }}
        >
          <div
            className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-800 space-y-5 relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {selectedPlayer.imageUrl ? (
                  <img
                    src={selectedPlayer.imageUrl}
                    alt={selectedPlayer.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 text-slate-950 font-black text-lg flex items-center justify-center">
                    {selectedPlayer.name ? selectedPlayer.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div>
                  <h3 id="player-detail-title" className="text-lg font-black text-white">
                    {selectedPlayer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-emerald-400">{selectedPlayer.sport}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-semibold text-slate-300">{selectedPlayer.skillLevel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close player details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Availability status */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Availability Status</span>
              <span
                className={`font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] border ${
                  selectedPlayer.availabilityStatus === 'AVAILABLE'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {selectedPlayer.availabilityStatus === 'AVAILABLE' ? 'Available to Play' : 'Currently Busy'}
              </span>
            </div>

            {/* Playing Schedule Preferences */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Playing Preferences
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Preferred Days</span>
                  </div>
                  <div className="font-bold text-white">{selectedPlayer.preferredDays || 'Flexible'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Preferred Time</span>
                  </div>
                  <div className="font-bold text-white">{selectedPlayer.preferredTime || 'Flexible'}</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedPlayer.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  About & Play Style
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {selectedPlayer.bio}
                </div>
              </div>
            )}

            {/* Safe Community Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Connect on the court &mdash; coordinate matches by booking a court session together at your nearest QuickCourt facility.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Link
                to="/venues"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                <span>Browse Venues</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit My Player Profile Modal ─────────────────────────────────── */}
      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !profileSaving) setIsEditProfileOpen(false);
          }}
        >
          <div
            className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="edit-profile-title" className="text-base font-black text-white">
                    Update Player Profile
                  </h3>
                  <p className="text-xs text-slate-400">Configure how you appear to other local players</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close edit profile dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Name (Read-only) */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Player Name (Linked to Account)
                </label>
                <input
                  type="text"
                  value={myProfile?.name || user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-medium cursor-not-allowed"
                />
              </div>

              {/* Primary Sport */}
              <div>
                <label htmlFor="form-sport" className="block font-bold text-slate-300 mb-1">
                  Primary Sport *
                </label>
                <input
                  id="form-sport"
                  type="text"
                  required
                  maxLength={50}
                  value={formSport}
                  onChange={(e) => setFormSport(e.target.value)}
                  placeholder="e.g. Badminton, Tennis, Pickleball"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                />
              </div>

              {/* Skill Level */}
              <div>
                <label htmlFor="form-skill" className="block font-bold text-slate-300 mb-1">
                  Skill Level *
                </label>
                <select
                  id="form-skill"
                  value={formSkill}
                  onChange={(e) => setFormSkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Timing Preferences Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-days" className="block font-bold text-slate-300 mb-1">
                    Preferred Days *
                  </label>
                  <select
                    id="form-days"
                    value={formDays}
                    onChange={(e) => setFormDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form-time" className="block font-bold text-slate-300 mb-1">
                    Preferred Time Period *
                  </label>
                  <select
                    id="form-time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                  >
                    <option value="Mornings">Mornings</option>
                    <option value="Afternoons">Afternoons</option>
                    <option value="Evenings">Evenings</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>

              {/* Availability Status */}
              <div>
                <label htmlFor="form-status" className="block font-bold text-slate-300 mb-1">
                  Availability Status *
                </label>
                <select
                  id="form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                >
                  <option value="AVAILABLE">AVAILABLE (Open to match invites)</option>
                  <option value="BUSY">BUSY (Not taking match invites)</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="form-bio" className="font-bold text-slate-300">
                    Playing Bio (Optional)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formBio.length} / 300
                  </span>
                </div>
                <textarea
                  id="form-bio"
                  rows={3}
                  maxLength={300}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Share your playing style, frequency, or sparring preferences..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-normal"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {profileSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
