import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import SportIcon from '../components/ui/SportIcon';
import { useAuth } from '../context/AuthContext';
import {
  fetchPlayers,
  fetchPlayer,
  fetchMyPlayerProfile,
  updateMyPlayerProfile
} from '../services/api';
import {
  Users,
  Search,
  UserCheck,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const SPORTS_OPTIONS = ['All', 'Badminton', 'Tennis', 'Pickleball', 'Football', 'Basketball', 'Squash'];
const SKILL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const TIME_OPTIONS = ['All', 'Mornings', 'Afternoons', 'Evenings', 'Flexible'];

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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* ── Community Header ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#28303F]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5 text-lime-400" />
              <span>Community Discovery</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">Local Matchmaking</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Find Players & Sparring Partners
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Connect with players who share your sports interests. Filter by sport, skill level, and play schedule to set up your next match.
            </p>
          </div>

          {/* My Player Profile Mini-Card */}
          <Card variant="elevated" className="w-full lg:min-w-[320px] lg:max-w-sm p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1.5 font-mono">
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Playing Status</span>
              </span>
              <Badge
                status={myProfile?.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : 'BUSY'}
                size="sm"
              />
            </div>

            <div className="text-sm font-black text-white">
              {myProfile?.name || user?.name || 'Player Profile'}
            </div>

            <div className="text-xs text-slate-400 mt-0.5 mb-3 flex items-center gap-2 flex-wrap font-mono">
              <span className="text-lime-400 font-semibold">{myProfile?.sport || 'Badminton'}</span>
              <span>•</span>
              <span>{myProfile?.skillLevel || 'Intermediate'}</span>
              <span>•</span>
              <span>{myProfile?.preferredTime || 'Evenings'}</span>
            </div>

            <Button
              id="btn-edit-my-profile"
              variant="outline"
              size="sm"
              icon={Edit3}
              onClick={() => setIsEditProfileOpen(true)}
              className="w-full"
            >
              Update Playing Preferences
            </Button>
          </Card>
        </div>

        {/* ── Player Discovery Filters Area ───────────────────────────────── */}
        <section aria-label="Player discovery filters" className="mt-8 space-y-4">
          <Card variant="default" className="p-4 sm:p-5 space-y-4">

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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 transition-all"
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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              {SPORTS_OPTIONS.map((sport) => {
                const isSelected = selectedSport === sport;

                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setSelectedSport(sport)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                        : 'bg-[#0B0F17] text-slate-400 border-[#28303F] hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {sport !== 'All' && <SportIcon sport={sport} className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{sport === 'All' ? 'All Sports' : sport}</span>
                  </button>
                );
              })}
            </div>

            {/* Secondary Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#28303F]">

              {/* Sport Dropdown */}
              <div>
                <label htmlFor="filter-sport" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Sport Type
                </label>
                <select
                  id="filter-sport"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors"
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
                <label htmlFor="filter-skill" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Skill Level
                </label>
                <select
                  id="filter-skill"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors"
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
                <label htmlFor="filter-time" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Preferred Time
                </label>
                <select
                  id="filter-time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors"
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
                <label htmlFor="filter-status" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Player Availability
                </label>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors"
                >
                  <option value="All">All Statuses</option>
                  <option value="AVAILABLE">Available to Play</option>
                  <option value="BUSY">Currently Busy</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips & Reset Bar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-[#28303F] text-xs">
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
          </Card>
        </section>

        {/* ── Player Results Area ─────────────────────────────────────────── */}
        <section aria-label="Discoverable players" className="mt-8">

          {/* Header & count */}
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#28303F] text-xs font-medium text-slate-400">
            <div>
              Showing <strong className="text-white font-black font-mono">{players.length}</strong> active player{players.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' matching criteria'}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-slate-300 font-semibold font-mono text-[11px] uppercase tracking-wider">Live Matchmaking</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#0F131C] rounded-2xl p-6 border border-[#28303F] animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#181C24]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-[#181C24] rounded w-2/3" />
                      <div className="h-3 bg-[#181C24] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-[#0B0F17] rounded-xl" />
                  <div className="h-8 bg-[#181C24] rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <Card variant="default" className="p-8 text-center border-rose-500/30 max-w-md mx-auto" role="alert">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-white mb-1">Failed to Load Players</h2>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
              <Button
                variant="danger"
                size="sm"
                onClick={loadPlayers}
                className="w-full"
              >
                Try Again
              </Button>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && players.length === 0 && (
            <Card variant="default" className="p-12 sm:p-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#181C24] text-lime-400 flex items-center justify-center mx-auto border border-[#28303F]">
                <Users className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">No Players Found</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  No active players match your selected filters. Try broadening your sport, skill, or time period criteria.
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          )}

          {/* Player Cards Grid */}
          {!loading && !error && players.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => {
                const isOwnProfile = myProfile && (player.id === myProfile.id || player.name === user?.name);

                return (
                  <article
                    key={player.id}
                    className={`bg-[#0F131C] rounded-2xl border p-6 shadow-qc-card hover:border-lime-400/50 transition-all flex flex-col justify-between relative backdrop-blur-md ${
                      isOwnProfile
                        ? 'border-lime-400/50 ring-1 ring-lime-400/30'
                        : 'border-[#28303F]'
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
                              className="w-12 h-12 rounded-full object-cover border border-[#28303F] shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-lime-400 text-slate-950 font-black text-base flex items-center justify-center shadow-qc-lime">
                              {player.name ? player.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-base leading-snug">{player.name}</h3>
                              {isOwnProfile && (
                                <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-lime-400 text-slate-950">
                                  You
                                </span>
                              )}
                            </div>
                            {player.distance && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span>{player.distance}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Availability status badge */}
                        <Badge
                          status={player.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : 'BUSY'}
                          size="sm"
                        />
                      </div>

                      {/* Sports & Skill tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {player.sport && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#181C24] text-slate-200 border border-[#28303F]">
                            <SportIcon sport={player.sport} className="w-3.5 h-3.5 text-lime-400" aria-hidden="true" />
                            <span>{player.sport}</span>
                          </span>
                        )}

                        {player.skillLevel && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#181C24] text-slate-300 border border-[#28303F]">
                            {player.skillLevel}
                          </span>
                        )}
                      </div>

                      {/* Bio snippet */}
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed italic">
                        {player.bio ? `"${player.bio}"` : 'Active player on QuickCourt looking for matches.'}
                      </p>

                      {/* Preferred play timing */}
                      <div className="bg-[#0B0F17] rounded-xl p-3 mb-4 space-y-1.5 text-xs border border-[#28303F] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-lime-400" />
                            <span>Preferred Days:</span>
                          </span>
                          <span className="font-semibold text-slate-200">{player.preferredDays || 'Flexible'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-lime-400" />
                            <span>Time Period:</span>
                          </span>
                          <span className="font-semibold text-slate-200">{player.preferredTime || 'Flexible'}</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      id={`btn-view-player-${player.id}`}
                      variant="outline"
                      size="sm"
                      icon={ChevronRight}
                      onClick={() => handleOpenDetail(player)}
                      className="w-full"
                    >
                      View Player Profile
                    </Button>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlayer(null);
          }}
        >
          <div className="bg-[#0F131C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#28303F] space-y-5 relative my-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {selectedPlayer.imageUrl ? (
                  <img
                    src={selectedPlayer.imageUrl}
                    alt={selectedPlayer.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-lime-400/40"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-lime-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-qc-lime">
                    {selectedPlayer.name ? selectedPlayer.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div>
                  <h3 id="player-detail-title" className="text-lg font-black text-white">
                    {selectedPlayer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-xs font-bold text-lime-400">{selectedPlayer.sport}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-semibold text-slate-300">{selectedPlayer.skillLevel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close player details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Availability status */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs">
              <span className="text-slate-400 font-medium">Availability Status</span>
              <Badge
                status={selectedPlayer.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : 'BUSY'}
                size="sm"
              />
            </div>

            {/* Playing Schedule Preferences */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Playing Preferences
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F]">
                  <div className="text-slate-400 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-lime-400" />
                    <span>Preferred Days</span>
                  </div>
                  <div className="font-bold text-white">{selectedPlayer.preferredDays || 'Flexible'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F]">
                  <div className="text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-lime-400" />
                    <span>Preferred Time</span>
                  </div>
                  <div className="font-bold text-white">{selectedPlayer.preferredTime || 'Flexible'}</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedPlayer.bio && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  About & Play Style
                </h4>
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-xs text-slate-300 leading-relaxed">
                  {selectedPlayer.bio}
                </div>
              </div>
            )}

            {/* Safe Community Notice */}
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Connect on the court &mdash; coordinate matches by booking a court session together at your nearest QuickCourt facility.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Link to="/venues">
                <Button variant="outline" size="sm" icon={ExternalLink}>
                  Browse Venues
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedPlayer(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit My Player Profile Modal ─────────────────────────────────── */}
      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !profileSaving) setIsEditProfileOpen(false);
          }}
        >
          <div className="bg-[#0F131C] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#28303F] space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-[#28303F] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center border border-lime-400/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="edit-profile-title" className="text-base font-black text-white">
                    Update Player Preferences
                  </h3>
                  <p className="text-xs text-slate-400">Configure how you appear to other local players</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close edit profile dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-xs text-emerald-300 flex items-center gap-2 shadow-qc-mint" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-xs text-rose-300 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Name (Read-only) */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Player Name (Linked to Account)
                </label>
                <input
                  type="text"
                  value={myProfile?.name || user?.name || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17]/50 border border-[#28303F]/60 text-slate-400 font-medium cursor-not-allowed font-mono"
                />
              </div>

              {/* Primary Sport */}
              <div>
                <label htmlFor="form-sport" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Primary Sport <span className="text-lime-400">*</span>
                </label>
                <input
                  id="form-sport"
                  type="text"
                  required
                  maxLength={50}
                  value={formSport}
                  onChange={(e) => setFormSport(e.target.value)}
                  placeholder="e.g. Badminton, Tennis, Pickleball"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 font-medium transition"
                />
              </div>

              {/* Skill Level */}
              <div>
                <label htmlFor="form-skill" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Skill Level <span className="text-lime-400">*</span>
                </label>
                <select
                  id="form-skill"
                  value={formSkill}
                  onChange={(e) => setFormSkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Timing Preferences Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-days" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                    Preferred Days <span className="text-lime-400">*</span>
                  </label>
                  <select
                    id="form-days"
                    value={formDays}
                    onChange={(e) => setFormDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form-time" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                    Preferred Time Period <span className="text-lime-400">*</span>
                  </label>
                  <select
                    id="form-time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
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
                <label htmlFor="form-status" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Availability Status <span className="text-lime-400">*</span>
                </label>
                <select
                  id="form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                >
                  <option value="AVAILABLE">AVAILABLE (Open to match invites)</option>
                  <option value="BUSY">BUSY (Not taking match invites)</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="form-bio" className="font-bold uppercase tracking-wider text-[10px] text-slate-300">
                    Playing Bio (Optional)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 font-normal transition"
                />
              </div>

              <div className="pt-3 border-t border-[#28303F] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={profileSaving}
                  icon={SaveIconPlaceholder}
                >
                  Save Preferences
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIconPlaceholder(props) {
  return <RefreshCw {...props} />;
}

