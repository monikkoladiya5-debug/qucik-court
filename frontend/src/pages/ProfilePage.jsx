import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import SportIcon from '../components/ui/SportIcon';
import { useAuth } from '../context/AuthContext';
import { fetchMyProfile, updateMyProfile, fetchMyLoyalty, fetchMyGamification } from '../services/api';
import {
  User,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  Mail,
  Phone,
  Image,
  ArrowRight,
  Info,
  Trophy,
  RotateCcw,
  Check,
  ChevronRight,
  Activity,
  Compass,
  Award,
  Flame,
  Layers,
  Users,
  Lock,
} from 'lucide-react';

const SPORTS_LIST = [
  'Badminton',
  'Tennis',
  'Pickleball',
  'Football',
  'Basketball',
  'Squash',
  'Cricket',
  'Table Tennis',
];

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();

  // Profile, Loyalty & Gamification Data State
  const [profile, setProfile] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formSports, setFormSports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const editorRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profRes, loyRes, gamRes] = await Promise.all([
        fetchMyProfile(),
        fetchMyLoyalty(),
        fetchMyGamification().catch(() => ({ gamification: null })),
      ]);
      setProfile(profRes.profile);
      setLoyalty(loyRes.loyalty);
      setGamification(gamRes?.gamification || null);

      // Populate form defaults
      setFormName(profRes.profile.name || '');
      setFormPhone(profRes.profile.phone || '');
      setFormAvatar(profRes.profile.avatar || '');
      setFormSports(profRes.profile.preferredSports || []);
      setAvatarError(false);
    } catch (err) {
      setError(err.message || 'Failed to load profile and loyalty information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSport = (sport) => {
    setFormSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleResetForm = () => {
    if (profile) {
      setFormName(profile.name || '');
      setFormPhone(profile.phone || '');
      setFormAvatar(profile.avatar || '');
      setFormSports(profile.preferredSports || []);
      setSaveError('');
      setSaveSuccess('');
      setAvatarError(false);
    }
  };

  const scrollToEditor = () => {
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const nameInput = document.getElementById('profile-name');
    if (nameInput) {
      nameInput.focus();
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    // Client-side validation
    const trimmedName = formName.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 60) {
      setSaveError('Name must be between 2 and 60 characters.');
      return;
    }

    const trimmedAvatar = formAvatar.trim();
    if (trimmedAvatar) {
      if (trimmedAvatar.length > 500) {
        setSaveError('Avatar URL must be 500 characters or fewer.');
        return;
      }
      try {
        const parsed = new URL(trimmedAvatar);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setSaveError('Avatar URL must begin with http:// or https://');
          return;
        }
      } catch {
        setSaveError('Please enter a valid HTTP or HTTPS avatar image URL.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        name: trimmedName,
        phone: formPhone.trim() || null,
        preferredSports: formSports,
        avatar: trimmedAvatar || null,
      };

      const res = await updateMyProfile(payload);
      setProfile(res.profile);
      setAvatarError(false);

      // Sync with global auth session
      updateUser({
        name: res.profile.name,
        phone: res.profile.phone,
        preferredSports: res.profile.preferredSports,
        avatar: res.profile.avatar,
      });

      setSaveSuccess('Your profile preferences have been saved successfully.');
      setTimeout(() => setSaveSuccess(''), 4500);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F131C] border border-[#28303F] flex items-center justify-center mb-4 shadow-qc-lime">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
          </div>
          <p className="text-white font-bold text-base mb-1">Loading Player Profile & Rewards…</p>
          <p className="text-slate-400 text-xs font-mono">Retrieving your athletic credentials and points balance</p>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-[#0F131C] border border-rose-500/30 rounded-2xl p-8 text-center max-w-md mx-auto shadow-qc-card">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white mb-1.5">Failed to load profile</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">{error}</p>
            <Button
              variant="danger"
              size="md"
              onClick={loadData}
              className="w-full"
            >
              Retry Request
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userDisplayName = profile?.name || authUser?.name || 'Customer';
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const totalPoints = loyalty?.totalPoints ?? profile?.points ?? 0;
  const eligibleCount = loyalty?.eligibleBookingsCount ?? 0;
  const upcomingCount = loyalty?.upcomingBookingsCount ?? 0;
  const rewards = loyalty?.completedBookingRewards ?? [];
  const currentAvatar = profile?.avatar;
  const activeSports = profile?.preferredSports || [];

  // Gamification metrics (Phase 21)
  const completedGames = gamification?.completedGames ?? eligibleCount;
  const verifiedCheckIns = gamification?.verifiedCheckIns ?? 0;
  const sportsPlayed = gamification?.sportsPlayed ?? [];
  const sportsCount = gamification?.sportsCount ?? sportsPlayed.length;
  const achievements = gamification?.achievements ?? [];
  const earnedCount = gamification?.earnedAchievementsCount ?? achievements.filter((a) => a.earned).length;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col relative">
      {/* Background athletic pattern overlay */}
      <div className="fixed inset-0 bg-court-pattern opacity-10 pointer-events-none" />

      <Header />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* ─── Breadcrumb & Section Header ────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#28303F]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Player Portal</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 font-medium">Profile & Rewards</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Player Identity & Rewards
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
              Manage your sports credentials, contact details, preferred games, and monitor loyalty points earned from completed matches.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
            <Button
              id="btn-edit-profile"
              variant="outline"
              size="sm"
              onClick={scrollToEditor}
            >
              Edit Preferences
            </Button>
            <Link to="/my-bookings">
              <Button variant="primary" size="sm" icon={CalendarCheck}>
                My Bookings
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── Top Identity & Loyalty Passport Strip ───────────────────────────── */}
        <section
          aria-label="Account Identity Summary"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F131C] via-[#181C24] to-[#0F131C] border border-[#28303F] p-6 sm:p-8 my-8 shadow-qc-card"
        >
          {/* Subtle athletic background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Player Identity Block */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              {currentAvatar && !avatarError ? (
                <img
                  src={currentAvatar}
                  alt={userDisplayName}
                  onError={() => setAvatarError(true)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-lime-400/50 shadow-qc-lime shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-lime-400 border-2 border-white/20 flex items-center justify-center font-black text-3xl sm:text-4xl text-slate-950 shadow-qc-lime shrink-0">
                  {userInitial}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge status="CONFIRMED" label="Active Member" size="sm" />
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#0B0F17] text-slate-400 border border-[#28303F]">
                    Customer Account
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {userDisplayName}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-lime-400" />
                    {profile?.email || authUser?.email}
                  </span>
                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-lime-400" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Loyalty Points Passport Card */}
            <div className="flex items-center gap-4 bg-[#0B0F17]/90 backdrop-blur-md px-5 py-4 rounded-xl border border-lime-400/40 shadow-qc-lime self-start lg:self-auto shrink-0 min-w-0 max-w-full">
              <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 shrink-0">
                <Trophy className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  Loyalty Balance
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white leading-none mt-1 flex items-baseline gap-1.5 font-mono">
                  <span>{totalPoints}</span>
                  <span className="text-xs font-bold text-lime-400 tracking-wider">PTS</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1 font-mono">
                  +10 pts per completed match
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── Main Two-Column Layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Player Identity + Profile Preferences (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. Playing Identity Card */}
            <Card variant="default" className="p-6 sm:p-7 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#28303F]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-lime-400" />
                    Player Identity & Sports
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your public athletic presence within the QuickCourt community.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#0B0F17] text-lime-400 border border-lime-400/30 uppercase tracking-wider">
                  Player Passport
                </span>
              </div>

              {/* Preferred Sports Badges */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-lime-400" />
                  Preferred Sports
                </div>

                {activeSports.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#28303F] text-center">
                    <p className="text-xs text-slate-400">
                      No preferred sports selected yet. Pick your sports in the preferences section below to help connect with matches and players.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {activeSports.map((sport) => (
                      <div
                        key={sport}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-white text-xs font-bold shadow-sm"
                      >
                        <SportIcon sport={sport} className="w-4 h-4 text-lime-400" />
                        <span>{sport}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                <div className="p-3.5 bg-[#0B0F17] border border-[#28303F] rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Authenticated Email
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate font-mono">
                    {profile?.email || authUser?.email}
                  </div>
                </div>

                <div className="p-3.5 bg-[#0B0F17] border border-[#28303F] rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Primary Phone
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    {profile?.phone || <span className="text-slate-500 font-normal font-sans">Not configured</span>}
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Profile Preferences & Credentials Editor */}
            <Card
              id="profile-preferences"
              ref={editorRef}
              variant="default"
              className="p-6 sm:p-8"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#28303F]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Save className="w-5 h-5 text-lime-400" />
                    Edit Profile Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update your display name, contact phone, avatar link, and favorite sports.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-reset-profile"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#28303F]"
                  title="Reset form fields to saved profile data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Discard
                </button>
              </div>

              {/* Feedback Banners */}
              {saveSuccess && (
                <div
                  role="status"
                  className="mb-5 p-4 bg-emerald-950/80 border border-emerald-500/80 rounded-xl flex items-center gap-3 text-emerald-300 text-xs font-semibold shadow-qc-mint"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div
                  role="alert"
                  className="mb-5 p-4 bg-rose-950/80 border border-rose-600/80 rounded-xl flex items-center gap-3 text-rose-300 text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name <span className="text-lime-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={60}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17] border border-[#28303F] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-lime-400 transition"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your real or preferred display name (2 to 60 characters).
                  </p>
                </div>

                {/* Email Address (Read-Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Email Address
                    </label>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Authenticated
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      disabled
                      value={profile?.email || authUser?.email || ''}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17]/50 border border-[#28303F]/60 rounded-xl text-slate-400 text-xs cursor-not-allowed font-mono"
                    />
                    <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your authenticated login email cannot be edited from this form.
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      id="profile-phone"
                      type="tel"
                      maxLength={20}
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17] border border-[#28303F] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-lime-400 transition font-mono"
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used for court check-in verification and match coordination.
                  </p>
                </div>

                {/* Avatar Image URL */}
                <div>
                  <label htmlFor="profile-avatar" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Avatar Image URL
                  </label>
                  <div className="relative">
                    <input
                      id="profile-avatar"
                      type="url"
                      maxLength={500}
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17] border border-[#28303F] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-lime-400 transition"
                    />
                    <Image className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct HTTP or HTTPS image URL (max 500 characters).
                  </p>
                </div>

                {/* Preferred Sports (Multi-Select Buttons) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Preferred Sports
                    </label>
                    <span className="text-[10px] font-mono font-semibold text-lime-400">
                      {formSports.length} Selected
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {SPORTS_LIST.map((sport) => {
                      const selected = formSports.includes(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          aria-pressed={selected}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selected
                              ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-qc-lime'
                              : 'bg-[#0B0F17] text-slate-300 border-[#28303F] hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <SportIcon sport={sport} className={`w-3.5 h-3.5 ${selected ? 'text-slate-950' : 'text-lime-400'}`} />
                          <span>{sport}</span>
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Select the sports you play to optimize court recommendations.
                  </p>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-5 border-t border-[#28303F] flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetForm}
                  >
                    Reset Changes
                  </Button>

                  <Button
                    id="btn-save-profile"
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={saving}
                    icon={Save}
                  >
                    Save Preferences
                  </Button>
                </div>
              </form>
            </Card>

          </div>

          {/* Right: Loyalty Hub & Match Rewards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 0. Athletic Progress & Badges (Phase 21 Gamification) */}
            <Card
              id="player-gamification"
              variant="default"
              className="p-6 sm:p-7 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#28303F] mb-5">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-lime-400" />
                    Your Progress
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authoritative rewards and badges earned from real court participation.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 uppercase tracking-wider">
                  {earnedCount} / {achievements.length || 6} Badges
                </span>
              </div>

              {/* 4 Compact Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <CalendarCheck className="w-3 h-3 text-lime-400" /> Games
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">{completedGames}</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Completed</div>
                </div>

                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Check-ins
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{verifiedCheckIns}</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Verified</div>
                </div>

                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-sky-400" /> Sports
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">{sportsCount}</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Played</div>
                </div>

                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" /> Badges
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{earnedCount}</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">Earned</div>
                </div>
              </div>

              {/* Achievements Badges List */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Earned & In-Progress Badges
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                  {achievements.map((ach) => {
                    return (
                      <div
                        key={ach.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          ach.earned
                            ? 'bg-[#0B0F17] border-lime-400/40 shadow-sm'
                            : 'bg-[#0B0F17]/50 border-[#28303F]/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              ach.earned
                                ? 'bg-lime-400/10 border border-lime-400/30 text-lime-400'
                                : 'bg-[#181C24] border border-[#28303F] text-slate-500'
                            }`}
                          >
                            {ach.earned ? (
                              ach.id === 'first-game' ? <Trophy className="w-3.5 h-3.5" /> :
                              ach.id === 'regular-player' ? <Flame className="w-3.5 h-3.5" /> :
                              ach.id === 'checkin-pro' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                              ach.id === 'multi-sport' ? <Layers className="w-3.5 h-3.5" /> :
                              ach.id === 'reliable-player' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                              <Users className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {ach.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {ach.description}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            ach.earned
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#181C24] text-slate-500 border border-[#28303F]'
                          }`}
                        >
                          {ach.earned ? 'Earned' : 'Locked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* 1. Loyalty Points Hero Card */}
            <Card
              id="loyalty-hub"
              variant="default"
              className="p-6 sm:p-7 relative overflow-hidden"
            >
              {/* Lime gradient accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between pb-4 border-b border-[#28303F] mb-5">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-lime-400" />
                  QuickCourt Rewards
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 uppercase tracking-wider">
                  +10 pts / match
                </span>
              </div>

              {/* Big Points Display */}
              <div className="p-5 rounded-xl bg-[#0B0F17] border border-[#28303F] mb-5 relative">
                <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400 mb-1 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  Total Earned Points
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-2 font-mono">
                  <span>{totalPoints}</span>
                  <span className="text-base font-bold text-lime-400">PTS</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rewards accrued from completed and elapsed matches on QuickCourt.
                </p>
              </div>

              {/* Real Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Completed</div>
                  <div className="text-2xl font-black text-white font-mono">{eligibleCount}</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Points awarded</div>
                </div>

                <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#28303F]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Upcoming</div>
                  <div className="text-2xl font-black text-lime-400 font-mono">{upcomingCount}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Pending match end</div>
                </div>
              </div>

              {/* Authoritative Logic Notice */}
              <div className="p-4 bg-[#0B0F17]/80 border border-[#28303F] rounded-xl flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <Info className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">How points are earned:</span> Each confirmed court booking automatically earns{' '}
                  <strong className="text-lime-400 font-mono">10 loyalty points</strong> once the scheduled match end time has passed. Future bookings earn points upon completion; cancelled bookings earn zero.
                </div>
              </div>
            </Card>

            {/* 2. Completed Booking Rewards Card */}
            <Card
              variant="default"
              className="p-6 sm:p-7"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#28303F] mb-5">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-lime-400" />
                  Completed Match Rewards
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0B0F17] text-slate-300 border border-[#28303F]">
                  {rewards.length} {rewards.length === 1 ? 'Reward' : 'Rewards'}
                </span>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-[#0B0F17] border border-[#28303F]">
                  <div className="w-12 h-12 rounded-xl bg-[#181C24] text-slate-400 flex items-center justify-center mx-auto mb-3 border border-[#28303F]">
                    <CalendarCheck className="w-6 h-6 text-slate-500" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">No completed matches yet</h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto leading-relaxed">
                    Play your scheduled matches to unlock 10 loyalty reward points for each completed session.
                  </p>
                  <Link to="/venues">
                    <Button variant="primary" size="sm" icon={ArrowRight}>
                      Book a Court
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                  {rewards.map((reward) => (
                    <div
                      key={reward.bookingId}
                      className="p-3.5 bg-[#0B0F17] hover:bg-[#181C24] border border-[#28303F] rounded-xl transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-white truncate">
                            {reward.venueName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#181C24] text-slate-300 border border-[#28303F] inline-flex items-center gap-1">
                            <SportIcon sport={reward.sport} className="w-3 h-3 text-lime-400" />
                            <span>{reward.sport}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate font-mono">
                          <span>{reward.courtName}</span>
                          <span>•</span>
                          <span>{reward.date}</span>
                          <span>•</span>
                          <span>{reward.time}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-xs font-black text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-lg border border-lime-400/30 font-mono">
                        +{reward.pointsEarned} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 3. Quick Navigation Hub Card */}
            <Card
              variant="default"
              className="p-5"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-lime-400" />
                Quick Player Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link
                  to="/my-bookings"
                  className="p-3 rounded-xl bg-[#0B0F17] hover:bg-[#181C24] border border-[#28303F] hover:border-lime-400/40 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-lime-400/10 text-lime-400 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-lime-400 transition-colors">My Bookings</div>
                      <div className="text-[10px] text-slate-400">Match passes & schedule</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  to="/players"
                  className="p-3 rounded-xl bg-[#0B0F17] hover:bg-[#181C24] border border-[#28303F] hover:border-sky-400/40 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Find Players</div>
                      <div className="text-[10px] text-slate-400">Community discovery</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </Card>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}

