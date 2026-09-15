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
  updateMyPlayerProfile,
  sendMatchInvite,
  fetchMyMatchInvites,
  respondToMatchInvite,
  reportPlayer,
  blockPlayer,
  unblockPlayer,
  fetchMyBlocks,
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
  Send,
  Sparkles,
  Inbox,
  Check,
  Ban,
  Radio,
  ExternalLink,
  ShieldAlert,
  UserX,
  Flag,
  Award,
} from 'lucide-react';

const SPORTS_OPTIONS = ['All', 'Badminton', 'Tennis', 'Pickleball', 'Football', 'Basketball', 'Squash'];
const CITIES_OPTIONS = ['All Cities', 'Ahmedabad', 'Mumbai', 'Pune', 'Bengaluru', 'Delhi'];
const SKILL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const TIME_OPTIONS = ['All', 'Mornings', 'Afternoons', 'Evenings', 'Flexible'];

const REPORT_REASONS = [
  { value: 'inappropriate behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment / Abusive Conduct' },
  { value: 'spam', label: 'Spam / Commercial Solicitation' },
  { value: 'fake profile', label: 'Fake Profile / Misleading Identity' },
  { value: 'unsafe behavior', label: 'Unsafe Court Behavior' },
  { value: 'other', label: 'Other Issue' },
];

export default function PlayersPage() {
  const { user } = useAuth();

  // ─── Active Tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'invites' | 'blocks'

  // ─── Discovery State ────────────────────────────────────────────────────────
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [inviteModalPlayer, setInviteModalPlayer] = useState(null);
  const [reportModalPlayer, setReportModalPlayer] = useState(null);

  // Invite Form State
  const [inviteSport, setInviteSport] = useState('Badminton');
  const [inviteDate, setInviteDate] = useState('');
  const [inviteTime, setInviteTime] = useState('06:00 PM');
  const [inviteVenue, setInviteVenue] = useState('Vertex Sports Complex');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  // Report Form State
  const [reportReason, setReportReason] = useState('inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportError, setReportError] = useState(null);

  // Match Invites Subsystem State
  const [myInvites, setMyInvites] = useState({ sent: [], received: [] });
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteActionLoading, setInviteActionLoading] = useState(null);

  // Blocks State
  const [myBlocks, setMyBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [safetyActionMsg, setSafetyActionMsg] = useState(null);

  // Profile Form State
  const [myProfile, setMyProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [formSport, setFormSport] = useState('Badminton');
  const [formSkill, setFormSkill] = useState('Intermediate');
  const [formCity, setFormCity] = useState('Ahmedabad');
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
      if (selectedCity !== 'All Cities') filters.city = selectedCity;
      if (selectedDate) filters.date = selectedDate;
      if (selectedTime !== 'All') filters.time = selectedTime;
      if (selectedSkill !== 'All') filters.skillLevel = selectedSkill;
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
  }, [selectedSport, selectedCity, selectedDate, selectedTime, selectedSkill, selectedStatus, searchQuery]);

  // ─── Fetch Own Profile ──────────────────────────────────────────────────────
  const loadMyProfile = useCallback(async () => {
    try {
      const data = await fetchMyPlayerProfile();
      if (data.player) {
        setMyProfile(data.player);
        setFormSport(data.player.sport || 'Badminton');
        setFormSkill(data.player.skillLevel || 'Intermediate');
        setFormCity(data.player.city || 'Ahmedabad');
        setFormDays(data.player.preferredDays || 'Weekdays');
        setFormTime(data.player.preferredTime || 'Evenings');
        setFormStatus(data.player.availabilityStatus || 'AVAILABLE');
        setFormBio(data.player.bio || '');
      }
    } catch (err) {
      console.warn('Could not load own profile:', err);
    }
  }, []);

  // ─── Fetch Invites ──────────────────────────────────────────────────────────
  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const data = await fetchMyMatchInvites();
      setMyInvites({
        sent: data.sent || [],
        received: data.received || [],
      });
    } catch (err) {
      console.warn('Could not load invites:', err);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  // ─── Fetch Blocked Players ──────────────────────────────────────────────────
  const loadBlocks = useCallback(async () => {
    setBlocksLoading(true);
    try {
      const data = await fetchMyBlocks();
      setMyBlocks(data.blocks || []);
    } catch (err) {
      console.warn('Could not load blocks:', err);
    } finally {
      setBlocksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    loadMyProfile();
    loadInvites();
    loadBlocks();
  }, [loadMyProfile, loadInvites, loadBlocks]);

  // Keyboard Escape listener to dismiss open dialogs
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (selectedPlayer) setSelectedPlayer(null);
        if (inviteModalPlayer && !inviteSending) setInviteModalPlayer(null);
        if (reportModalPlayer && !reportSending) setReportModalPlayer(null);
        if (isEditProfileOpen && !profileSaving) setIsEditProfileOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayer, inviteModalPlayer, inviteSending, reportModalPlayer, reportSending, isEditProfileOpen, profileSaving]);

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

  // ─── Open Send Invite Modal ─────────────────────────────────────────────────
  function handleOpenInviteModal(player) {
    setInviteModalPlayer(player);
    setInviteSport(player.sport || 'Badminton');
    setInviteDate(selectedDate || new Date().toISOString().split('T')[0]);
    setInviteTime('06:00 PM');
    setInviteVenue('Vertex Sports Complex');
    setInviteNote(`Hi ${player.name}, let's play a match on QuickCourt!`);
    setInviteSuccess(null);
    setInviteError(null);
  }

  // ─── Send Match Invite ──────────────────────────────────────────────────────
  async function handleSendInvite(e) {
    e.preventDefault();
    if (!inviteModalPlayer) return;

    setInviteSending(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const payload = {
        sport: inviteSport,
        date: inviteDate,
        time: inviteTime,
        courtVenue: inviteVenue,
        note: inviteNote,
      };
      await sendMatchInvite(inviteModalPlayer.id, payload);
      setInviteSuccess(`Match invite sent to ${inviteModalPlayer.name}!`);
      loadInvites();
      setTimeout(() => {
        setInviteModalPlayer(null);
        setInviteSuccess(null);
      }, 1500);
    } catch (err) {
      setInviteError(err.message || 'Failed to send match invite.');
    } finally {
      setInviteSending(false);
    }
  }

  // ─── Open Report Modal ──────────────────────────────────────────────────────
  function handleOpenReportModal(player) {
    setReportModalPlayer(player);
    setReportReason('inappropriate behavior');
    setReportDetails('');
    setReportSuccess(null);
    setReportError(null);
  }

  // ─── Submit Report ──────────────────────────────────────────────────────────
  async function handleSendReport(e) {
    e.preventDefault();
    if (!reportModalPlayer) return;

    setReportSending(true);
    setReportError(null);
    setReportSuccess(null);

    try {
      await reportPlayer(reportModalPlayer.id, {
        reason: reportReason,
        details: reportDetails,
      });
      setReportSuccess(`Report submitted for ${reportModalPlayer.name}. Thank you for keeping QuickCourt safe.`);
      setTimeout(() => {
        setReportModalPlayer(null);
        setReportSuccess(null);
      }, 1800);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report.');
    } finally {
      setReportSending(false);
    }
  }

  // ─── Block Player ───────────────────────────────────────────────────────────
  async function handleBlock(player) {
    if (!window.confirm(`Are you sure you want to block ${player.name}? They will no longer appear in matchmaking or be able to send invites.`)) {
      return;
    }
    try {
      await blockPlayer(player.id);
      setSafetyActionMsg(`Blocked ${player.name}.`);
      if (selectedPlayer?.id === player.id) setSelectedPlayer(null);
      await loadPlayers();
      await loadBlocks();
      setTimeout(() => setSafetyActionMsg(null), 3000);
    } catch (err) {
      alert(err.message || 'Failed to block player.');
    }
  }

  // ─── Unblock Player ─────────────────────────────────────────────────────────
  async function handleUnblock(playerId, playerName) {
    try {
      await unblockPlayer(playerId);
      setSafetyActionMsg(`Unblocked ${playerName || 'player'}.`);
      await loadBlocks();
      await loadPlayers();
      setTimeout(() => setSafetyActionMsg(null), 3000);
    } catch (err) {
      alert(err.message || 'Failed to unblock player.');
    }
  }

  // ─── Respond to Invite ──────────────────────────────────────────────────────
  async function handleInviteAction(inviteId, status) {
    setInviteActionLoading(inviteId);
    try {
      await respondToMatchInvite(inviteId, status);
      await loadInvites();
    } catch (err) {
      console.error('Failed to update invite status:', err);
    } finally {
      setInviteActionLoading(null);
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
        city: formCity.trim(),
        preferredDays: formDays,
        preferredTime: formTime,
        availabilityStatus: formStatus,
        bio: formBio.trim(),
      };

      const res = await updateMyPlayerProfile(payload);
      setProfileSuccess('Your player discovery profile has been updated!');
      setMyProfile(res.player);

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
    setSelectedCity('All Cities');
    setSelectedDate('');
    setSelectedTime('All');
    setSelectedSkill('All');
    setSelectedStatus('All');
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSport !== 'All' ||
    selectedCity !== 'All Cities' ||
    selectedDate !== '' ||
    selectedTime !== 'All' ||
    selectedSkill !== 'All' ||
    selectedStatus !== 'All';

  const pendingInvitesCount = myInvites.received.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Action toast banner */}
        {safetyActionMsg && (
          <div className="mb-4 p-3 rounded-xl bg-lime-400/20 border border-lime-400/40 text-xs text-lime-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
            <span>{safetyActionMsg}</span>
          </div>
        )}

        {/* ── Community Header ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#28303F]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5 text-lime-400" />
              <span>Community Discovery</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">Matchmaking & Trust</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Find Players & Match Safety
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Discover compatible local players with deterministic matchmaking, verified check-in activity, and platform safety controls.
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
              <span>{myProfile?.city || 'Ahmedabad'}</span>
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

        {/* ── Main Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 sm:gap-4 mt-6 border-b border-[#28303F] pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'discover'
                ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Discover Players</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-900/40 text-current font-mono">
              {players.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-match-invites"
            onClick={() => {
              setActiveTab('invites');
              loadInvites();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all relative ${
              activeTab === 'invites'
                ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>My Match Invites</span>
            {pendingInvitesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-black animate-pulse">
                {pendingInvitesCount} New
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-safety-blocks"
            onClick={() => {
              setActiveTab('blocks');
              loadBlocks();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'blocks'
                ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Safety & Blocked ({myBlocks.length})</span>
          </button>
        </div>

        {/* ── TAB 1: DISCOVER PLAYERS ─────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <>
            {/* ── Player Discovery Filters Area ───────────────────────────────── */}
            <section aria-label="Player discovery filters" className="mt-6 space-y-4">
              <Card variant="default" className="p-4 sm:p-5 space-y-4">

                {/* Search Input Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                  <input
                    id="input-player-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players by name, sport, area, or bio keywords…"
                    aria-label="Search players by name, sport, area, or bio keywords"
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

                {/* Secondary Matchmaking Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[#28303F]">

                  {/* Sport Dropdown */}
                  <div>
                    <label htmlFor="filter-sport" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Sport
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

                  {/* City Dropdown */}
                  <div>
                    <label htmlFor="filter-city" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      City / Area
                    </label>
                    <select
                      id="filter-city"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors"
                    >
                      {CITIES_OPTIONS.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Match Date Picker */}
                  <div>
                    <label htmlFor="filter-date" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Match Date
                    </label>
                    <input
                      id="filter-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:border-lime-400 transition-colors font-mono"
                    />
                  </div>

                  {/* Preferred Time Dropdown */}
                  <div>
                    <label htmlFor="filter-time" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Time Slot
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
                </div>

                {/* Active Filter Chips & Reset Bar */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#28303F] text-xs">
                    <span className="text-slate-400 font-medium">
                      Showing filtered matchmaking results
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
                  Showing <strong className="text-white font-black font-mono">{players.length}</strong> matched player{players.length !== 1 ? 's' : ''}
                  {hasActiveFilters && ' matching criteria'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-slate-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
                    Trust & Activity Engine
                  </span>
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

              {/* Empty / No-Match State */}
              {!loading && !error && players.length === 0 && (
                <Card variant="default" className="p-12 sm:p-16 text-center max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#181C24] text-lime-400 flex items-center justify-center mx-auto border border-[#28303F]">
                    <Users className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">No Players Found</h2>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      No players found for this time. Try another time, sport, or area.
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
                    const trust = player.trustSummary;

                    return (
                      <article
                        key={player.id}
                        className={`bg-[#0F131C] rounded-2xl border p-5 sm:p-6 shadow-qc-card hover:border-lime-400/50 transition-all flex flex-col justify-between relative backdrop-blur-md ${
                          isOwnProfile
                            ? 'border-lime-400/50 ring-1 ring-lime-400/30'
                            : 'border-[#28303F]'
                        }`}
                      >
                        {/* Top Identity Block */}
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
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
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                                  <MapPin className="w-3 h-3 text-lime-400" />
                                  <span>{player.city || 'Ahmedabad'}</span>
                                  {player.distance && <span>• {player.distance}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Availability status badge */}
                            <Badge
                              status={player.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : 'BUSY'}
                              size="sm"
                            />
                          </div>

                          {/* Deterministic Trust / Activity Summary Badge */}
                          {trust && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#181C24] border border-[#28303F] mb-3 text-xs">
                              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 font-mono">
                                <Award className="w-3.5 h-3.5 text-lime-400" />
                                <span>{trust.trustLabel}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {trust.completedGames > 0
                                  ? `${trust.completedGames} games • ${trust.checkIns} check-ins`
                                  : 'New to QuickCourt'}
                              </span>
                            </div>
                          )}

                          {/* Match Score Badge */}
                          {player.matchScore !== undefined && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-lime-400/10 border border-lime-400/20 mb-3">
                              <span className="text-[11px] font-bold text-lime-400 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                <span>Deterministic Match</span>
                              </span>
                              <span className="text-xs font-black font-mono text-lime-400">
                                {player.matchScore}% Match
                              </span>
                            </div>
                          )}

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

                          {/* Match Highlight Reasons */}
                          {player.matchReasons && player.matchReasons.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1">
                              {player.matchReasons.map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#181C24] text-slate-300 border border-[#28303F]/80"
                                >
                                  ✓ {reason}
                                </span>
                              ))}
                            </div>
                          )}

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

                        {/* Action Buttons & Safety Controls */}
                        <div className="space-y-2 pt-2 border-t border-[#28303F]">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              id={`btn-view-player-${player.id}`}
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(player)}
                              className="w-full text-xs"
                            >
                              Details
                            </Button>

                            {!isOwnProfile ? (
                              <Button
                                id={`btn-invite-player-${player.id}`}
                                variant="primary"
                                size="sm"
                                icon={Send}
                                disabled={player.availabilityStatus === 'BUSY'}
                                onClick={() => handleOpenInviteModal(player)}
                                className="w-full text-xs"
                              >
                                {player.availabilityStatus === 'BUSY' ? 'Busy' : 'Invite'}
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={Edit3}
                                onClick={() => setIsEditProfileOpen(true)}
                                className="w-full text-xs"
                              >
                                Edit
                              </Button>
                            )}
                          </div>

                          {!isOwnProfile && (
                            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                              <button
                                type="button"
                                onClick={() => handleOpenReportModal(player)}
                                className="hover:text-rose-400 transition-colors flex items-center gap-1"
                              >
                                <Flag className="w-3 h-3" />
                                <span>Report</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBlock(player)}
                                className="hover:text-rose-400 transition-colors flex items-center gap-1"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Block</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── TAB 2: MY MATCH INVITES ─────────────────────────────────────── */}
        {activeTab === 'invites' && (
          <section aria-label="Match invites overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Received Invites */}
              <Card variant="default" className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#28303F] pb-3">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-lime-400" />
                    <h2 className="text-base font-bold text-white">Received Invites</h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {myInvites.received.length} total
                  </span>
                </div>

                {invitesLoading && (
                  <div className="p-6 text-center text-xs text-slate-400">Loading invites...</div>
                )}

                {!invitesLoading && myInvites.received.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No received match invites yet.</p>
                  </div>
                )}

                {!invitesLoading && myInvites.received.length > 0 && (
                  <div className="space-y-3">
                    {myInvites.received.map((invite) => (
                      <div
                        key={invite.id}
                        className="p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white">{invite.senderName}</div>
                            <div className="text-[11px] text-lime-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>{invite.sport}</span>
                              <span>•</span>
                              <span>{invite.date}</span>
                              <span>•</span>
                              <span>{invite.time}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              invite.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : invite.status === 'DECLINED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                            }`}
                          >
                            {invite.status}
                          </span>
                        </div>

                        {invite.note && (
                          <p className="text-xs text-slate-300 italic bg-[#181C24] p-2.5 rounded-lg">
                            "{invite.note}"
                          </p>
                        )}

                        {invite.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Ban}
                              loading={inviteActionLoading === invite.id}
                              onClick={() => handleInviteAction(invite.id, 'DECLINED')}
                              className="text-xs px-3 py-1.5"
                            >
                              Decline
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Check}
                              loading={inviteActionLoading === invite.id}
                              onClick={() => handleInviteAction(invite.id, 'ACCEPTED')}
                              className="text-xs px-3 py-1.5"
                            >
                              Accept Match
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Sent Invites */}
              <Card variant="default" className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#28303F] pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-lime-400" />
                    <h2 className="text-base font-bold text-white">Sent Invites</h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {myInvites.sent.length} total
                  </span>
                </div>

                {invitesLoading && (
                  <div className="p-6 text-center text-xs text-slate-400">Loading invites...</div>
                )}

                {!invitesLoading && myInvites.sent.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                    <Send className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>You haven't sent any match invites yet. Find players above to invite them!</p>
                  </div>
                )}

                {!invitesLoading && myInvites.sent.length > 0 && (
                  <div className="space-y-3">
                    {myInvites.sent.map((invite) => (
                      <div
                        key={invite.id}
                        className="p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white">To: {invite.targetPlayerName}</div>
                            <div className="text-[11px] text-lime-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>{invite.sport}</span>
                              <span>•</span>
                              <span>{invite.date}</span>
                              <span>•</span>
                              <span>{invite.time}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              invite.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : invite.status === 'DECLINED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : invite.status === 'CANCELLED'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                            }`}
                          >
                            {invite.status}
                          </span>
                        </div>

                        {invite.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              loading={inviteActionLoading === invite.id}
                              onClick={() => handleInviteAction(invite.id, 'CANCELLED')}
                              className="text-xs text-rose-400 border-rose-500/30 hover:border-rose-500 px-3 py-1.5"
                            >
                              Cancel Request
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {/* ── TAB 3: SAFETY & BLOCKED PLAYERS ─────────────────────────────── */}
        {activeTab === 'blocks' && (
          <section aria-label="Safety & Blocked players" className="mt-6 space-y-6">
            <Card variant="default" className="p-5 sm:p-6 space-y-4 max-w-2xl">
              <div className="flex items-center justify-between border-b border-[#28303F] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h2 className="text-base font-bold text-white">Blocked Players</h2>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {myBlocks.length} blocked
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Blocked players cannot see your profile in matchmaking results or send you match invites.
              </p>

              {blocksLoading && (
                <div className="p-6 text-center text-xs text-slate-400">Loading blocked list...</div>
              )}

              {!blocksLoading && myBlocks.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p>You have not blocked any players.</p>
                </div>
              )}

              {!blocksLoading && myBlocks.length > 0 && (
                <div className="space-y-3">
                  {myBlocks.map((b) => (
                    <div
                      key={b.blockId}
                      className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{b.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {b.sport} • {b.city}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblock(b.playerId, b.name)}
                        className="text-xs"
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        )}
      </main>

      <Footer />

      {/* ── Report Player Modal ──────────────────────────────────────────── */}
      {reportModalPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !reportSending) setReportModalPlayer(null);
          }}
        >
          <div className="bg-[#0F131C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#28303F] space-y-5 relative my-4">
            <div className="flex items-start justify-between border-b border-[#28303F] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-400/10 text-rose-400 flex items-center justify-center border border-rose-400/20">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="report-modal-title" className="text-base font-black text-white">
                    Report Player
                  </h3>
                  <p className="text-xs text-slate-400">Reporting {reportModalPlayer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModalPlayer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close report dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-xs text-emerald-300 flex items-center gap-2 shadow-qc-mint" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            )}

            {reportError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-xs text-rose-300 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <form onSubmit={handleSendReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Reason for Report <span className="text-rose-400">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-rose-400 font-medium transition"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context on what happened..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-rose-400 font-normal transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-[#28303F] text-[11px] text-slate-400 leading-relaxed">
                Reports are confidential and reviewed by the QuickCourt moderation team.
              </div>

              <div className="pt-3 border-t border-[#28303F] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReportModalPlayer(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  loading={reportSending}
                  icon={Flag}
                >
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Match Invite Modal ───────────────────────────────────────────── */}
      {inviteModalPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !inviteSending) setInviteModalPlayer(null);
          }}
        >
          <div className="bg-[#0F131C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#28303F] space-y-5 relative my-4">
            <div className="flex items-start justify-between border-b border-[#28303F] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center border border-lime-400/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="invite-modal-title" className="text-base font-black text-white">
                    Send Match Request
                  </h3>
                  <p className="text-xs text-slate-400">Invite {inviteModalPlayer.name} to play</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalPlayer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close match invite dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-xs text-emerald-300 flex items-center gap-2 shadow-qc-mint" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-xs text-rose-300 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Sport <span className="text-lime-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteSport}
                  onChange={(e) => setInviteSport(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                    Match Date <span className="text-lime-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={inviteDate}
                    onChange={(e) => setInviteDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-mono transition"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                    Time Slot / Hour
                  </label>
                  <input
                    type="text"
                    value={inviteTime}
                    onChange={(e) => setInviteTime(e.target.value)}
                    placeholder="e.g. 06:00 PM or Evenings"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Preferred Venue / Court
                </label>
                <input
                  type="text"
                  value={inviteVenue}
                  onChange={(e) => setInviteVenue(e.target.value)}
                  placeholder="e.g. Vertex Sports Complex"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-medium transition"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                  Optional Note / Message
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Add a short sparring note..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 focus:outline-none focus:border-lime-400 font-normal transition"
                />
              </div>

              <div className="pt-3 border-t border-[#28303F] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteModalPlayer(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={inviteSending}
                  icon={Send}
                >
                  Send Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            {/* Trust & Activity Summary Card */}
            {selectedPlayer.trustSummary && (
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lime-400 flex items-center gap-1.5 font-mono">
                    <Award className="w-4 h-4" />
                    <span>{selectedPlayer.trustSummary.trustLabel}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Activity Record</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#28303F]/60 text-center font-mono">
                  <div>
                    <div className="text-xs font-black text-white">{selectedPlayer.trustSummary.completedGames}</div>
                    <div className="text-[10px] text-slate-400">Completed</div>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{selectedPlayer.trustSummary.checkIns}</div>
                    <div className="text-[10px] text-slate-400">Check-Ins</div>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{selectedPlayer.trustSummary.cancellations}</div>
                    <div className="text-[10px] text-slate-400">Cancelled</div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability & Location */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F]">
                <div className="text-slate-400 mb-1">Status</div>
                <Badge
                  status={selectedPlayer.availabilityStatus === 'AVAILABLE' ? 'AVAILABLE' : 'BUSY'}
                  size="sm"
                />
              </div>
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#28303F]">
                <div className="text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-lime-400" />
                  <span>City / Area</span>
                </div>
                <div className="font-bold text-white font-mono">{selectedPlayer.city || 'Ahmedabad'}</div>
              </div>
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

            {/* Safety Actions inside Detail */}
            {selectedPlayer.name !== user?.name && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-[#28303F] text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenReportModal(selectedPlayer)}
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 font-medium transition"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Player</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBlock(selectedPlayer)}
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 font-medium transition"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Block Player</span>
                </button>
              </div>
            )}

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

              {/* Primary Sport & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label htmlFor="form-city" className="block font-bold uppercase tracking-wider text-[10px] text-slate-300 mb-1">
                    City / Area <span className="text-lime-400">*</span>
                  </label>
                  <input
                    id="form-city"
                    type="text"
                    required
                    maxLength={50}
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Ahmedabad, Mumbai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-400 font-medium transition"
                  />
                </div>
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
