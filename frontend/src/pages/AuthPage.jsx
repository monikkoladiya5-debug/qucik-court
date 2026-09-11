import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, User, Building2, ShieldCheck, Eye, EyeOff,
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, Sparkles,
  KeyRound, Mail, Lock, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginCustomer, signupCustomer, loginOwner, loginAdmin } from '../services/api';

// ─── Role Cards Configuration ─────────────────────────────────────────────────

const ROLE_CARDS = [
  {
    id: 'CUSTOMER',
    label: 'Player / Customer',
    tagline: 'Book Courts & Play',
    description: 'Find sports courts near you, join sessions, and explore premier athletic arenas.',
    icon: User,
    accent: 'indigo',
    border: 'border-indigo-200 hover:border-indigo-400',
    iconBg: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-50/40',
    demoHint: 'user@quickcourt.com / customer123',
  },
  {
    id: 'OWNER',
    label: 'Venue Owner',
    tagline: 'Manage Facilities',
    description: 'List your sports facilities, configure court specs, and oversee public availability.',
    icon: Building2,
    accent: 'emerald',
    border: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-50/40',
    demoHint: 'owner@quickcourt.com / owner123',
  },
  {
    id: 'ADMIN',
    label: 'Platform Admin',
    tagline: 'System Oversight',
    description: 'Access system telemetry, venue verification, and administrative settings.',
    icon: ShieldCheck,
    accent: 'slate',
    border: 'border-slate-300 hover:border-slate-500',
    iconBg: 'bg-slate-800',
    hoverBg: 'hover:bg-slate-50',
    demoHint: 'admin@quickcourt.com / admin123 (QC-ADMIN-2026)',
  },
];

// ─── Shared Form Controls ─────────────────────────────────────────────────────

function FormInput({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete, icon: Icon }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
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
          className={`w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
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
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
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
          className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-indigo-600 rounded-md"
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
    <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, children, variant = 'indigo' }) {
  const bgClass =
    variant === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
      : variant === 'slate'
      ? 'bg-slate-900 hover:bg-slate-800 active:bg-black shadow-slate-200'
      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200';

  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${bgClass}`}
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
      {/* Tab Switcher */}
      <div className="flex rounded-xl border border-slate-200 p-1 gap-1 bg-slate-100/80" role="tablist">
        {['login', 'signup'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none ${
              tab === t
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
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

      <SubmitButton loading={loading} variant="indigo">
        {tab === 'login' ? 'Sign In as Player' : 'Complete Registration'}
      </SubmitButton>

      {tab === 'login' && (
        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex items-center justify-between text-xs">
          <div className="text-slate-600">
            <span className="font-bold text-indigo-700">Demo Player: </span>
            <span className="font-mono text-[11px]">user@quickcourt.com</span>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
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
      <div className="flex rounded-xl border border-slate-200 p-1 gap-1 bg-slate-100/80" role="tablist">
        {['login', 'register'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none ${
              tab === t
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
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
            label="Facility / Club Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Apex Sports Club"
            icon={Building2}
          />
          <FormInput
            id="o-loc"
            label="City / Area"
            value={venueLocation}
            onChange={(e) => setVenueLocation(e.target.value)}
            placeholder="Koramangala, Bengaluru"
          />
        </div>
      )}

      <SubmitButton loading={loading} variant="emerald">
        {tab === 'login' ? 'Sign In to Owner Portal' : 'Register Facility'}
      </SubmitButton>

      {tab === 'login' && (
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/80 flex items-center justify-between text-xs">
          <div className="text-slate-600">
            <span className="font-bold text-emerald-700">Demo Owner: </span>
            <span className="font-mono text-[11px]">owner@quickcourt.com</span>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="text-[11px] font-bold text-emerald-700 hover:underline"
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
      setLocalError(err.message || 'Admin authentication failed. Check code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
        <ShieldCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <span>Restricted administrative security clearance required.</span>
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

      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
        <div className="text-slate-600">
          <span className="font-bold text-slate-900">Demo Admin: </span>
          <span className="font-mono text-[11px]">QC-ADMIN-2026</span>
        </div>
        <button
          type="button"
          onClick={fillDemo}
          className="text-[11px] font-bold text-slate-800 hover:underline"
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
      navigate('/', { replace: true });
    }, 700);
  }

  // ── Step 1: Role Selection Screen ───────────────────────────────────────────
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 bg-mesh-gradient">
        {/* QuickCourt Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-3xl font-black tracking-tight text-slate-900">
            Quick<span className="text-indigo-600">Court</span>
          </span>
        </div>

        <div className="text-center max-w-md mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sign In to QuickCourt
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose your account role to access your personalized sports interface.
          </p>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedRole(card.id)}
                className={`group flex flex-col items-start p-6 rounded-3xl border-2 text-left bg-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-card hover:shadow-card-hover ${card.border} ${card.hoverBg}`}
                aria-label={`Sign in as ${card.label}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${card.iconBg} text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-extrabold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                    {card.label}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    {card.tagline}
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Back Link to Home */}
        <button
          onClick={() => navigate('/')}
          className="mt-8 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
        >
          ← Return to QuickCourt Homepage
        </button>
      </div>
    );
  }

  // ── Step 2: Form Screen for Selected Role ───────────────────────────────────
  const activeCard = ROLE_CARDS.find((c) => c.id === selectedRole);
  const Icon = activeCard.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 bg-mesh-gradient">
      <div className="w-full max-w-md">
        
        {/* Back to Role Selection */}
        <button
          onClick={() => setSelectedRole(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-6 transition-colors focus:outline-none"
          aria-label="Back to role selection"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Choose Different Role</span>
        </button>

        {/* Form Container Card */}
        <div className="bg-white rounded-3xl shadow-card hover:shadow-card-hover border border-slate-200 p-7 sm:p-8 transition-all">
          
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
            <div className={`w-12 h-12 rounded-2xl ${activeCard.iconBg} text-white flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{activeCard.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{activeCard.tagline}</p>
            </div>
          </div>

          {/* Success Flash State */}
          {success ? (
            <div className="flex flex-col items-center gap-3 py-10 text-emerald-600 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Authenticated!</h3>
                <p className="text-xs text-slate-500 mt-1">Directing to your QuickCourt space…</p>
              </div>
            </div>
          ) : (
            <>
              {selectedRole === 'CUSTOMER' && <CustomerForm onSuccess={handleSuccess} />}
              {selectedRole === 'OWNER'    && <OwnerForm onSuccess={handleSuccess} />}
              {selectedRole === 'ADMIN'    && <AdminForm onSuccess={handleSuccess} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
