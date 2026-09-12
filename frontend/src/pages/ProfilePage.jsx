import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { fetchMyProfile, updateMyProfile, fetchMyLoyalty } from '../services/api';
import {
  User,
  Sparkles,
  Award,
  CalendarCheck,
  Clock,
  MapPin,
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
  Zap,
  Flame,
  Layers,
  Activity,
  Edit3,
  RotateCcw,
  Check,
  Calendar,
  ChevronRight,
  ExternalLink,
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

const SPORT_ICONS = {
  Badminton: Trophy,
  Tennis: Zap,
  Pickleball: Sparkles,
  Football: Award,
  Basketball: Flame,
  Squash: Layers,
  Cricket: ShieldCheck,
  'Table Tennis': Activity,
};

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();

  // Profile & Loyalty Data State
  const [profile, setProfile] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
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
      const [profRes, loyRes] = await Promise.all([
        fetchMyProfile(),
        fetchMyLoyalty(),
      ]);
      setProfile(profRes.profile);
      setLoyalty(loyRes.loyalty);

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

      setSaveSuccess('Your profile has been saved successfully.');
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <p className="text-slate-300 font-semibold text-base mb-1">Loading your profile & loyalty rewards...</p>
          <p className="text-slate-500 text-xs">Retrieving your athletic credentials and points balance</p>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center max-w-md mx-auto shadow-2xl shadow-red-950/40">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white mb-1.5">Failed to load profile</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">{error}</p>
            <button
              onClick={loadData}
              className="w-full py-3 px-5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-red-600/30"
            >
              Retry
            </button>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ─── Breadcrumb & Section Header ────────────────────────────────────── */}
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
            <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400">Player Hub</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400">Profile & Points</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Personal Sports Account & Rewards
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                My Profile & Loyalty Hub
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Manage your personal player identity, contact details, preferred sports, and track loyalty points earned from completed court bookings.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              <button
                id="btn-edit-profile"
                type="button"
                onClick={scrollToEditor}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white text-xs font-bold transition shadow-sm"
              >
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Edit Preferences
              </button>
              <Link
                to="/my-bookings"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition"
              >
                <CalendarCheck className="w-4 h-4" />
                My Bookings
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Top Identity & Loyalty Passport Strip ───────────────────────────── */}
        <section
          aria-label="Account Identity Summary"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-8 mb-8 shadow-2xl"
        >
          {/* Subtle athletic background glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-court-pattern-dark pointer-events-none opacity-40" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Player Identity Block */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              {currentAvatar && !avatarError ? (
                <img
                  src={currentAvatar}
                  alt={userDisplayName}
                  onError={() => setAvatarError(true)}
                  className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-950/50 shrink-0"
                />
              ) : (
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 border-2 border-white/20 flex items-center justify-center font-black text-3xl sm:text-4xl text-slate-950 shadow-lg shadow-emerald-950/50 shrink-0">
                  {userInitial}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active Member
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    Customer Account
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {userDisplayName}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {profile?.email || authUser?.email}
                  </span>
                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Loyalty Points Passport Card */}
            <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md px-6 py-5 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-950/20 self-start lg:self-auto shrink-0">
              <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
                <Trophy className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Loyalty Balance
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white leading-none mt-1 flex items-baseline gap-1.5">
                  <span>{totalPoints}</span>
                  <span className="text-sm font-bold text-amber-300/80">points</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
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
            <section
              aria-label="Playing Identity Card"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Player Identity & Sports
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your public athletic presence within the QuickCourt community.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Player Passport
                </span>
              </div>

              {/* Preferred Sports Badges */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Preferred Sports
                </div>

                {activeSports.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                    <p className="text-xs text-slate-400">
                      No preferred sports selected yet. Pick your sports in the preferences section below to help connect with matches and players.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {activeSports.map((sport) => {
                      const SportIcon = SPORT_ICONS[sport] || Activity;
                      return (
                        <div
                          key={sport}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-white text-xs font-bold shadow-sm"
                        >
                          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <SportIcon className="w-3 h-3" />
                          </div>
                          <span>{sport}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Authenticated Email
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {profile?.email || authUser?.email}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Primary Phone
                  </div>
                  <div className="text-xs font-bold text-slate-200">
                    {profile?.phone || <span className="text-slate-500 font-normal">Not configured</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Profile Preferences & Credentials Editor */}
            <section
              id="profile-preferences"
              ref={editorRef}
              aria-label="Edit Profile & Preferences"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-emerald-400" />
                    Edit Profile & Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update your display name, contact phone, avatar link, and favorite sports.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-reset-profile"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition py-1 px-2 rounded-lg hover:bg-slate-800"
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
                  className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div
                  role="alert"
                  className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="font-semibold">{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name <span className="text-emerald-400">*</span>
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
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
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Read-only
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      disabled
                      value={profile?.email || authUser?.email || ''}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your email is your authenticated QuickCourt account credential and cannot be changed here.
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used for match coordination, notifications, and venue updates.
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                    <Image className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must be a direct HTTP or HTTPS image URL (max 500 characters).
                  </p>
                </div>

                {/* Preferred Sports (Multi-Select Buttons) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Preferred Sports
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {formSports.length} Selected
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {SPORTS_LIST.map((sport) => {
                      const selected = formSports.includes(sport);
                      const SportIcon = SPORT_ICONS[sport] || Activity;
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          aria-pressed={selected}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <SportIcon className={`w-3.5 h-3.5 ${selected ? 'text-slate-950' : 'text-slate-400'}`} />
                          <span>{sport}</span>
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Click to toggle the sports you enjoy playing or booking.
                  </p>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-5 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    Reset Form
                  </button>

                  <button
                    id="btn-save-profile"
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-sm shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

          </div>

          {/* Right: Loyalty Hub & Match Rewards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Loyalty Points Hero Card */}
            <section
              id="loyalty-hub"
              aria-label="Loyalty Points Overview"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden"
            >
              {/* Gold gradient accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Loyalty Points
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  +10 pts / match
                </span>
              </div>

              {/* Big Points Display */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 border border-amber-500/20 mb-5 relative">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400/80 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Total Earned Points
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                  <span>{totalPoints}</span>
                  <span className="text-base font-bold text-amber-400">PTS</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rewards accrued from completed and elapsed matches on QuickCourt.
                </p>
              </div>

              {/* Real Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Completed Matches</div>
                  <div className="text-2xl font-black text-white">{eligibleCount}</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Points awarded</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Upcoming Matches</div>
                  <div className="text-2xl font-black text-emerald-400">{upcomingCount}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Pending match end</div>
                </div>
              </div>

              {/* Verified V1 Logic Notice */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">How points are earned:</span> Each confirmed court booking automatically earns{' '}
                  <strong className="text-emerald-400">10 loyalty points</strong> once the scheduled match end time has passed. Future bookings earn points upon completion; cancelled bookings earn zero.
                </div>
              </div>
            </section>

            {/* 2. Completed Booking Rewards Card */}
            <section
              aria-label="Completed Match Rewards"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  Completed Match Rewards
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {rewards.length} {rewards.length === 1 ? 'Reward' : 'Rewards'}
                </span>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-6 h-6 text-slate-500" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">No completed matches yet</h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto leading-relaxed">
                    Play your scheduled matches to unlock 10 loyalty reward points for each completed game.
                  </p>
                  <Link
                    to="/venues"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-sm"
                  >
                    Book a Court <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {rewards.map((reward) => {
                    const SportIcon = SPORT_ICONS[reward.sport] || Activity;
                    return (
                      <div
                        key={reward.bookingId}
                        className="p-3.5 bg-slate-950 hover:bg-slate-950/80 border border-slate-800 rounded-2xl transition flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white truncate">
                              {reward.venueName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                              <SportIcon className="w-2.5 h-2.5" />
                              {reward.sport}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate">
                            <span>{reward.courtName}</span>
                            <span>•</span>
                            <span>{reward.date}</span>
                            <span>•</span>
                            <span>{reward.time}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                          +{reward.pointsEarned} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Quick Navigation Hub Card */}
            <section
              aria-label="Quick Hub Links"
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                Quick Player Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link
                  to="/my-bookings"
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">My Bookings</div>
                      <div className="text-[10px] text-slate-400">Match passes & schedule</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  to="/players"
                  className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Find Players</div>
                      <div className="text-[10px] text-slate-400">Community discovery</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </section>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
