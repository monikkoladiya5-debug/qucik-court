import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  ArrowRight,
  Info,
  Trophy,
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
      // Sync with global auth session
      updateUser({
        name: res.profile.name,
        phone: res.profile.phone,
        preferredSports: res.profile.preferredSports,
        avatar: res.profile.avatar,
      });

      setSaveSuccess('Your profile has been saved successfully.');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Loading your profile & loyalty rewards...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-900 mb-1">Failed to load profile</h2>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition"
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ─── Hero Banner ──────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={userDisplayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-400/50 shadow-md"
                  onError={(e) => {
                    // Fallback to initial badge if image link fails
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 border-2 border-white/20 flex items-center justify-center font-black text-2xl sm:text-3xl text-white shadow-inner ${
                  profile?.avatar ? 'hidden' : 'flex'
                }`}
              >
                {userInitial}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Customer Account
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active Member
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{userDisplayName}</h1>
                <p className="text-indigo-200/80 text-sm font-medium mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email || authUser?.email}
                </p>
              </div>
            </div>

            {/* Loyalty Points Pill */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/15 self-start md:self-auto">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Loyalty Points
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5">
                  {totalPoints} <span className="text-sm font-semibold text-indigo-200">pts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Main Grid: Profile Form + Loyalty Rewards ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Customer Profile Settings (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Account Details
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    Manage your personal profile and sport preferences.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="font-semibold">{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Email Address
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Read-only
                    </span>
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={profile?.email || authUser?.email || ''}
                    className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your email is your authenticated identity and cannot be edited directly.
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Avatar URL */}
                <div>
                  <label htmlFor="profile-avatar" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Avatar Image URL
                  </label>
                  <div className="relative">
                    <input
                      id="profile-avatar"
                      type="url"
                      maxLength={500}
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                    <Image className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct image link with HTTPS protocol (e.g. from Unsplash or secure cloud host).
                  </p>
                </div>

                {/* Preferred Sports (Multi-Select Pills) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Preferred Sports
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS_LIST.map((sport) => {
                      const selected = formSports.includes(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            selected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {sport}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Submit */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-sm shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Loyalty & Completed Booking Rewards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Loyalty Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Loyalty Points
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  +10 pts / match
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Completed Matches</div>
                  <div className="text-2xl font-black text-slate-900">{eligibleCount}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Upcoming Matches</div>
                  <div className="text-2xl font-black text-indigo-600">{upcomingCount}</div>
                </div>
              </div>

              {/* Reward Rules Notice */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3 text-xs text-indigo-950 leading-relaxed">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">How points are earned:</span> Each confirmed court booking earns{' '}
                  <strong className="text-indigo-900">10 loyalty points</strong> automatically once the scheduled match end time has elapsed. Cancelled bookings do not earn points.
                </div>
              </div>
            </div>

            {/* Completed Booking Rewards Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  Completed Booking Rewards
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {rewards.length} {rewards.length === 1 ? 'Reward' : 'Rewards'}
                </span>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No completed matches yet</h4>
                  <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto leading-normal">
                    Play your upcoming scheduled matches to earn 10 reward points per completed game.
                  </p>
                  <Link
                    to="/venues"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Book a Court <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {rewards.map((reward) => (
                    <div
                      key={reward.bookingId}
                      className="p-3.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 rounded-2xl transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {reward.venueName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200/70 text-slate-700">
                            {reward.sport}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
                          <span>{reward.courtName}</span>
                          <span>•</span>
                          <span>{reward.date}</span>
                          <span>•</span>
                          <span>{reward.time}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                        +{reward.pointsEarned} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
