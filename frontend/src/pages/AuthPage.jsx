import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity, User, Building2, ShieldCheck, Eye, EyeOff,
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, Sparkles,
  KeyRound, Mail, Lock, Check, ArrowRight, Trophy, Clock,
  CalendarCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginCustomer, signupCustomer, loginOwner, loginAdmin } from '../services/api';

// ─── Role Cards Configuration ─────────────────────────────────────────────────

const ROLE_CONFIG = [
  {
    id: 'CUSTOMER',
    badge: 'Player Access',
    title: 'Player / Customer',
    subtitle: 'Court Discovery & Booking',
    description: 'Find verified sports arenas, check real-time hourly slot availability, reserve courts instantly, and discover match partners.',
    icon: Trophy,
    accentBorder: 'border-emerald-500/30 hover:border-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    buttonClass: 'bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 font-black shadow-qc-lime',
    actionText: 'Enter Player Portal',
    demoText: 'user@quickcourt.com / customer123',
  },
  {
    id: 'OWNER',
    badge: 'Facility Workspace',
    title: 'Venue Owner',
    subtitle: 'Facility & Court Operations',
    description: 'Register sports facilities, configure court specs, manage real-time availability schedules, and monitor facility revenue.',
    icon: Building2,
    accentBorder: 'border-indigo-500/30 hover:border-indigo-400',
    accentBg: 'bg-indigo-500/10',
    accentText: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black shadow-md',
    actionText: 'Enter Owner Portal',
    demoText: 'owner@quickcourt.com / owner123',
  },
  {
    id: 'ADMIN',
    badge: 'Platform Control',
    title: 'Platform Administrator',
    subtitle: 'Governance & Telemetry',
    description: 'Platform oversight, user account moderation, venue verification, court approvals, and system-wide intelligence.',
    icon: ShieldCheck,
    accentBorder: 'border-slate-700 hover:border-slate-500',
    accentBg: 'bg-slate-800',
    accentText: 'text-slate-300',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    buttonClass: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-black border border-slate-700 shadow-md',
    actionText: 'Enter Admin Center',
    demoText: 'admin@quickcourt.com / admin123 (QC-ADMIN-2026)',
  },
];

// ─── Shared Form Controls ─────────────────────────────────────────────────────

function FormInput({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete, icon: Icon }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
        {label} {required && <span className="text-rose-400" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full py-3 rounded-xl border border-slate-800 text-sm text-white bg-slate-900/90 placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          }`}
        />
      </div>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, required, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
        {label} {required && <span className="text-rose-400" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-800 text-sm text-white bg-slate-900/90 placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:text-emerald-400 rounded-md"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, children, variant = 'emerald' }) {
  const bgClass =
    variant === 'emerald'
      ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold shadow-emerald-500/20'
      : variant === 'indigo'
      ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold shadow-indigo-600/20'
      : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-extrabold shadow-slate-800/20';

  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs sm:text-sm tracking-wide shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed ${bgClass}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      <span>{children}</span>
    </button>
  );
}

// ─── Customer Form Component ──────────────────────────────────────────────────

function CustomerForm({ onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  function fillDemo() {
    setEmail('user@quickcourt.com');
    setPassword('customer123');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      let data;
      if (tab === 'login') {
        data = await loginCustomer({ email, password });
      } else {
        data = await signupCustomer({ name, email, password });
      }
      onSuccess(data.token, data.user);
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl border border-slate-800 p-1 gap-1 bg-slate-950" role="tablist">
        {['login', 'signup'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none ${
              tab === t
                ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'login' ? 'Player Sign In' : 'Create Player Account'}
          </button>
        ))}
      </div>

      <ErrorBanner message={localError} />

      {tab === 'signup' && (
        <FormInput
          id="c-name"
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          required
          autoComplete="name"
          icon={User}
        />
      )}

      <FormInput
        id="c-email"
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        required
        autoComplete="email"
        icon={Mail}
      />

      <PasswordInput
        id="c-password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
      />

      <SubmitButton loading={loading} variant="emerald">
        {tab === 'login' ? 'Sign In as Player' : 'Complete Player Registration'}
      </SubmitButton>

      {tab === 'login' && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="font-bold text-emerald-400">Demo Player: </span>
            <span className="font-mono text-[11px] text-slate-300">user@quickcourt.com</span>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
          >
            Auto-fill
          </button>
        </div>
      )}
    </form>
  );
}

// ─── Owner Form Component ─────────────────────────────────────────────────────

function OwnerForm({ onSuccess }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  function fillDemo() {
    setEmail('owner@quickcourt.com');
    setPassword('owner123');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      const data = await loginOwner({ email, password, name, businessName, venueLocation });
      onSuccess(data.token, data.user);
    } catch (err) {
      setLocalError(err.message || 'Owner authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex rounded-xl border border-slate-800 p-1 gap-1 bg-slate-950" role="tablist">
        {['login', 'register'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none ${
              tab === t
                ? 'bg-slate-900 text-indigo-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'login' ? 'Owner Sign In' : 'Register Sports Venue'}
          </button>
        ))}
      </div>

      <ErrorBanner message={localError} />

      {tab === 'register' && (
        <FormInput
          id="o-name"
          label="Owner Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Vikram Patel"
          required
          autoComplete="name"
          icon={User}
        />
      )}

      <FormInput
        id="o-email"
        label="Business Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="owner@sportsclub.com"
        required
        autoComplete="email"
        icon={Mail}
      />

      <PasswordInput
        id="o-password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
      />

      {tab === 'register' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormInput
            id="o-biz"
            label="Facility Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Apex Sports Complex"
            icon={Building2}
          />
          <FormInput
            id="o-loc"
            label="City / Area"
            value={venueLocation}
            onChange={(e) => setVenueLocation(e.target.value)}
            placeholder="Bodakdev, Ahmedabad"
          />
        </div>
      )}

      <SubmitButton loading={loading} variant="indigo">
        {tab === 'login' ? 'Sign In to Owner Portal' : 'Register Sports Facility'}
      </SubmitButton>

      {tab === 'login' && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="font-bold text-indigo-400">Demo Owner: </span>
            <span className="font-mono text-[11px] text-slate-300">owner@quickcourt.com</span>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20"
          >
            Auto-fill
          </button>
        </div>
      )}
    </form>
  );
}

// ─── Admin Form Component ─────────────────────────────────────────────────────

function AdminForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  function fillDemo() {
    setEmail('admin@quickcourt.com');
    setPassword('admin123');
    setVerificationCode('QC-ADMIN-2026');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      const data = await loginAdmin({ email, password, verificationCode });
      onSuccess(data.token, data.user);
    } catch (err) {
      setLocalError(err.message || 'Admin authentication failed. Check credentials and code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
        <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span>Restricted administrative clearance required.</span>
      </div>

      <ErrorBanner message={localError} />

      <FormInput
        id="a-email"
        label="Admin Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@quickcourt.com"
        required
        autoComplete="email"
        icon={Mail}
      />

      <PasswordInput
        id="a-password"
        label="Admin Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <FormInput
        id="a-code"
        label="Security Verification Code"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        placeholder="QC-XXXX-XXXX"
        required
        autoComplete="off"
        icon={KeyRound}
      />

      <SubmitButton loading={loading} variant="slate">
        Authenticate Administrator
      </SubmitButton>

      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-400">
          <span className="font-bold text-slate-200">Demo Code: </span>
          <span className="font-mono text-[11px] text-slate-300">QC-ADMIN-2026</span>
        </div>
        <button
          type="button"
          onClick={fillDemo}
          className="text-[11px] font-bold text-slate-300 hover:text-white hover:underline px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
        >
          Auto-fill
        </button>
      </div>
    </form>
  );
}

// ─── Main Auth Page ───────────────────────────────────────────────────────────

export default function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null); // null | 'CUSTOMER' | 'OWNER' | 'ADMIN'
  const [success, setSuccess] = useState(false);

  function handleSuccess(token, user) {
    login(token, user);
    setSuccess(true);
    setTimeout(() => {
      if (user?.role === 'OWNER') {
        navigate('/owner/dashboard', { replace: true });
      } else if (user?.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }, 700);
  }

  // ── Step 1: Role Selection Screen ───────────────────────────────────────────
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-12 relative overflow-hidden font-['Inter',sans-serif]">
        {/* Subtle athletic court background markings */}
        <div className="absolute inset-0 bg-court-pattern opacity-15 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
          {/* QuickCourt Brand Header */}
          <Link
            to="/"
            className="flex items-center gap-2.5 mb-8 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg py-1 px-1 transition-opacity hover:opacity-90"
            aria-label="QuickCourt Home"
          >
            <div className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center text-slate-950 shadow-qc-lime">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex items-center tracking-tight leading-none">
              <span className="text-2xl font-black text-white">
                Quick<span className="text-lime-400">Court</span>
              </span>
            </div>
          </Link>

          {/* Title & Prompt */}
          <div className="text-center max-w-xl mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome to QuickCourt
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Select your access portal to proceed. Choose player sign-in for court booking, or workspace portals for venue operations and platform administration.
            </p>
          </div>

          {/* Balanced 3-Card Access Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full">
            {ROLE_CONFIG.map((roleCard) => {
              const Icon = roleCard.icon;
              return (
                <div
                  key={roleCard.id}
                  onClick={() => setSelectedRole(roleCard.id)}
                  className={`group relative p-6 sm:p-7 rounded-3xl bg-slate-900/90 border ${roleCard.accentBorder} transition-all duration-200 cursor-pointer shadow-xl hover:shadow-2xl flex flex-col justify-between backdrop-blur-md`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${roleCard.badgeClass}`}>
                        {roleCard.badge}
                      </span>
                      <div className={`w-10 h-10 rounded-2xl ${roleCard.accentBg} ${roleCard.accentText} border ${roleCard.accentBorder} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h2 className="text-xl font-extrabold text-white group-hover:text-white transition-colors mb-1.5">
                      {roleCard.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed min-h-[44px]">
                      {roleCard.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-3">
                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {roleCard.demoText.split(' / ')[0]}
                    </div>
                    <button
                      type="button"
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:translate-x-0.5 ${roleCard.buttonClass}`}
                    >
                      <span>{roleCard.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back link to Home */}
          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-md py-1 px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to QuickCourt Homepage</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Step 2: Form Screen for Selected Role ───────────────────────────────────
  const activeRole = ROLE_CONFIG.find((c) => c.id === selectedRole) || ROLE_CONFIG[0];
  const Icon = activeRole.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-10 relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background accents */}
      <div className="absolute inset-0 bg-court-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-4xl mx-auto">
        {/* Navigation Bar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedRole(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg py-1 px-2"
            aria-label="Back to role selection"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Account Type</span>
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>QuickCourt Home</span>
          </Link>
        </div>

        {/* Split Authentication Card Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* Left Hero Sidebar: Role Context & Value Anchor */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-7 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
                  <Activity className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-lg font-black text-white">Quick<span className="text-emerald-400">Court</span></span>
              </div>

              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-3 ${activeRole.badgeClass}`}>
                {activeRole.badge}
              </span>

              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                {activeRole.title}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-8">
                {activeRole.description}
              </p>

              {/* Dynamic Feature Checklist based on Role */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                {selectedRole === 'CUSTOMER' && (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Live court availability & instant booking</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Zero double-booking conflict locking</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>+10 loyalty points on every game</span>
                    </div>
                  </>
                )}

                {selectedRole === 'OWNER' && (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>Configure venue courts & hourly rates</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>Live court occupancy & bookings overview</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>Strict cross-owner facility isolation</span>
                    </div>
                  </>
                )}

                {selectedRole === 'ADMIN' && (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span>Authoritative platform metrics & telemetry</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span>User account status management (active/suspended)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span>2FA verification clearance protection</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Support Indicator */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
              <span>QuickCourt V1 Secure Authentication Engine</span>
            </div>
          </div>

          {/* Right Main Area: Interactive Forms */}
          <div className="lg:col-span-7 p-7 sm:p-9 bg-slate-900/60">
            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-xl text-white">Authentication Successful!</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  Redirecting to your QuickCourt space now…
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    {selectedRole === 'CUSTOMER' ? 'Player Account' : selectedRole === 'OWNER' ? 'Owner Portal' : 'Administrator Clearance'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your authorized credentials below to continue.
                  </p>
                </div>

                {selectedRole === 'CUSTOMER' && <CustomerForm onSuccess={handleSuccess} />}
                {selectedRole === 'OWNER'    && <OwnerForm onSuccess={handleSuccess} />}
                {selectedRole === 'ADMIN'    && <AdminForm onSuccess={handleSuccess} />}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
