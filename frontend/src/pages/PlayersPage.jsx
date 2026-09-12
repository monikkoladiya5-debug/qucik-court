import React, { useState, useEffect, useCallback } from 'react';
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
  Users, Search, Filter, Sparkles, UserCheck, Clock,
  Calendar, Award, MapPin, CheckCircle2, AlertCircle,
  X, Edit3, Shield, RefreshCw, Compass, Trophy
} from 'lucide-react';

const SPORTS_OPTIONS = ['All', 'Badminton', 'Tennis', 'Pickleball', 'Football', 'Basketball', 'Squash'];
const SKILL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const TIME_OPTIONS = ['All', 'Mornings', 'Afternoons', 'Evenings', 'Flexible'];
const STATUS_OPTIONS = ['All', 'AVAILABLE', 'BUSY'];

const SKILL_BADGE_STYLES = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Advanced: 'bg-purple-50 text-purple-700 border-purple-200',
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
      setError(err.message || 'Unable to fetch players. Please try again.');
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1">
        {/* ── Hero & Profile Banner ────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-indigo-950/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>COMMUNITY DISCOVERY</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                  Find Players & Sparring Partners
                </h1>
                <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Connect with fellow sports enthusiasts in your city. Filter by sport, skill level, and preferred play schedule to discover local partners.
                </p>
              </div>

              {/* My Profile Quick Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 sm:w-80 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    My Player Profile
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      myProfile?.availabilityStatus === 'AVAILABLE'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {myProfile?.availabilityStatus || 'AVAILABLE'}
                  </span>
                </div>

                <div className="text-sm font-bold text-white mb-1">
                  {myProfile?.name || user?.name || 'Customer Player'}
                </div>
                <div className="text-xs text-indigo-200 mb-3 flex items-center gap-2">
                  <span>{myProfile?.sport || 'Badminton'}</span>
                  <span>•</span>
                  <span>{myProfile?.skillLevel || 'Intermediate'}</span>
                  <span>•</span>
                  <span>{myProfile?.preferredTime || 'Evenings'}</span>
                </div>

                <button
                  id="btn-edit-my-profile"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update My Playing Preferences</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filters & Search Section ─────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-5 space-y-4">
            
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="input-player-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, sport, or bio..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Sport Filter */}
              <div>
                <label htmlFor="filter-sport" className="block text-xs font-bold text-slate-600 mb-1">
                  Sport
                </label>
                <select
                  id="filter-sport"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  {SPORTS_OPTIONS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport === 'All' ? 'All Sports' : sport}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Level Filter */}
              <div>
                <label htmlFor="filter-skill" className="block text-xs font-bold text-slate-600 mb-1">
                  Skill Level
                </label>
                <select
                  id="filter-skill"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  {SKILL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === 'All' ? 'All Skill Levels' : lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Time Filter */}
              <div>
                <label htmlFor="filter-time" className="block text-xs font-bold text-slate-600 mb-1">
                  Preferred Time
                </label>
                <select
                  id="filter-time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time === 'All' ? 'Any Time Period' : time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div>
                <label htmlFor="filter-status" className="block text-xs font-bold text-slate-600 mb-1">
                  Availability
                </label>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="BUSY">Busy</option>
                </select>
              </div>
            </div>

            {/* Active filter summary & reset */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing filtered results
                </span>
                <button
                  id="btn-clear-player-filters"
                  onClick={handleClearFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Player Grid Section ─────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header & count */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Discoverable Players
              </h2>
              <p className="text-xs text-slate-500">
                {players.length} {players.length === 1 ? 'player found' : 'players found'}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-8 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm max-w-md mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">Failed to Load Players</h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={loadPlayers}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && players.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No Players Found</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No active players match your selected filters. Try broadening your sport, skill, or time period criteria.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
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

                return (
                  <div
                    key={player.id}
                    className={`bg-white rounded-2xl border p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative ${
                      isOwnProfile ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200/90'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        {player.imageUrl ? (
                          <img
                            src={player.imageUrl}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white font-black text-base flex items-center justify-center shadow-2xs">
                            {player.name ? player.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{player.name}</h3>
                            {isOwnProfile && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                                You
                              </span>
                            )}
                          </div>
                          {player.distance && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{player.distance}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Availability status badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          player.availabilityStatus === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            player.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {player.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Busy'}
                      </span>
                    </div>

                    {/* Sports & Skill tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                        {player.sport}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          SKILL_BADGE_STYLES[player.skillLevel] || 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {player.skillLevel}
                      </span>
                    </div>

                    {/* Bio snippet */}
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed italic">
                      {player.bio ? `"${player.bio}"` : 'Active player on QuickCourt looking for matches.'}
                    </p>

                    {/* Preferred play timing */}
                    <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs text-slate-600 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Days:
                        </span>
                        <span className="font-semibold text-slate-700">{player.preferredDays}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time Period:
                        </span>
                        <span className="font-semibold text-slate-700">{player.preferredTime}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      id={`btn-view-player-${player.id}`}
                      onClick={() => handleOpenDetail(player)}
                      className="w-full py-2 px-4 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-indigo-600 text-white flex items-center justify-center gap-1.5"
                    >
                      <span>View Player Profile</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Player Detail Modal ───────────────────────────────────────────── */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {selectedPlayer.imageUrl ? (
                  <img
                    src={selectedPlayer.imageUrl}
                    alt={selectedPlayer.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white font-black text-lg flex items-center justify-center">
                    {selectedPlayer.name ? selectedPlayer.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedPlayer.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600">{selectedPlayer.sport}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-600">{selectedPlayer.skillLevel}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Availability status */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Player Status</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedPlayer.availabilityStatus === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
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
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                  <div className="text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Preferred Days</span>
                  </div>
                  <div className="font-bold text-slate-900">{selectedPlayer.preferredDays}</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                  <div className="text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Preferred Time</span>
                  </div>
                  <div className="font-bold text-slate-900">{selectedPlayer.preferredTime}</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedPlayer.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  About & Play Style
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedPlayer.bio}
                </div>
              </div>
            )}

            {/* Safe Community Notice */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Connect on the court — coordinate matches by booking any court session together at your nearest QuickCourt facility.
              </p>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Edit My Player Profile Modal ─────────────────────────────────── */}
      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditProfileOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Player Profile</h3>
                  <p className="text-xs text-slate-500">Configure how you appear to other players</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Name (Read-only) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Player Name (Linked to Account)
                </label>
                <input
                  type="text"
                  value={myProfile?.name || user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-medium cursor-not-allowed"
                />
              </div>

              {/* Primary Sport */}
              <div>
                <label htmlFor="form-sport" className="block font-bold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Skill Level */}
              <div>
                <label htmlFor="form-skill" className="block font-bold text-slate-700 mb-1">
                  Skill Level *
                </label>
                <select
                  id="form-skill"
                  value={formSkill}
                  onChange={(e) => setFormSkill(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Timing Preferences Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-days" className="block font-bold text-slate-700 mb-1">
                    Preferred Days *
                  </label>
                  <select
                    id="form-days"
                    value={formDays}
                    onChange={(e) => setFormDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  >
                    <option value="Weekdays">Weekdays</option>
                    <option value="Weekends">Weekends</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form-time" className="block font-bold text-slate-700 mb-1">
                    Preferred Time Period *
                  </label>
                  <select
                    id="form-time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
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
                <label htmlFor="form-status" className="block font-bold text-slate-700 mb-1">
                  Availability Status *
                </label>
                <select
                  id="form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="AVAILABLE">AVAILABLE (Open to match invites)</option>
                  <option value="BUSY">BUSY (Not taking match invites)</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="form-bio" className="font-bold text-slate-700">
                    Playing Bio (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {profileSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
