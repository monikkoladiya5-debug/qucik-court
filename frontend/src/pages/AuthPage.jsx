import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, User, Building2, ShieldCheck, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginCustomer, signupCustomer, loginOwner, loginAdmin } from '../services/api';

// ─── Role cards shown on entry ────────────────────────────────────────────────

const ROLE_CARDS = [
  {
    id: 'CUSTOMER',
    label: 'Player / Customer',
    description: 'Book sports courts, find players, track loyalty points.',
    icon: User,
    color: 'purple',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-600',
    hover: 'hover:border-purple-400 hover:bg-purple-50/80',
  },
  {
    id: 'OWNER',
    label: 'Venue Owner',
    description: 'Manage your sports complex, courts and bookings.',
    icon: Building2,
    color: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-600',
    hover: 'hover:border-emerald-400 hover:bg-emerald-50/80',
  },
  {
    id: 'ADMIN',
    label: 'Platform Admin',
    description: 'Administer the QuickCourt platform and venues.',
    icon: ShieldCheck,
    color: 'slate',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-700',
    hover: 'hover:border-slate-400 hover:bg-slate-100/80',
  },
];

// ─── Shared input + password field components ─────────────────────────────────

function FormInput({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm
                   placeholder:text-slate-400 bg-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-shadow"
      />
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, required, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 text-slate-900 text-sm
                     placeholder:text-slate-400 bg-white
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     transition-shadow"
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-purple-600"
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
    <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      <span className="mt-0.5 flex-shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                 bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                 text-white text-sm font-semibold
                 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                 disabled:opacity-60 disabled:cursor-not-allowed
                 transition-colors"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ─── Customer form (login + signup tabs) ──────────────────────────────────────

function CustomerForm({ onSuccess, onError }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

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
      setLocalError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-xl border border-slate-200 p-1 gap-1 bg-slate-50" role="tablist">
        {['login', 'signup'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500
              ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <ErrorBanner message={localError} />

      {tab === 'signup' && (
        <FormInput id="c-name" label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" required autoComplete="name" />
      )}
      <FormInput id="c-email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
      <PasswordInput id="c-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />

      <SubmitButton loading={loading}>
        {tab === 'login' ? 'Sign In' : 'Create Account'}
      </SubmitButton>

      {tab === 'login' && (
        <p className="text-center text-xs text-slate-500">
          Demo: <span className="font-mono">user@quickcourt.com</span> / <span className="font-mono">customer123</span>
        </p>
      )}
    </form>
  );
}

// ─── Owner form (login + register tabs) ───────────────────────────────────────

function OwnerForm({ onSuccess }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      const data = await loginOwner({ email, password, name, businessName, venueLocation });
      onSuccess(data.token, data.user);
    } catch (err) {
      setLocalError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex rounded-xl border border-slate-200 p-1 gap-1 bg-slate-50" role="tablist">
        {['login', 'register'].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setLocalError(''); }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500
              ${tab === t ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'login' ? 'Owner Login' : 'Register Venue'}
          </button>
        ))}
      </div>

      <ErrorBanner message={localError} />

      {tab === 'register' && (
        <FormInput id="o-name" label="Your Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vikram Patel" required autoComplete="name" />
      )}
      <FormInput id="o-email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@yourvenue.com" required autoComplete="email" />
      <PasswordInput id="o-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
      {tab === 'register' && (
        <>
          <FormInput id="o-biz" label="Business / Venue Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Smash Sports Club" autoComplete="organization" />
          <FormInput id="o-loc" label="Venue Location" value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)} placeholder="Bodakdev, Ahmedabad" autoComplete="street-address" />
        </>
      )}

      <SubmitButton loading={loading}>
        {tab === 'login' ? 'Owner Sign In' : 'Register as Owner'}
      </SubmitButton>

      {tab === 'login' && (
        <p className="text-center text-xs text-slate-500">
          Demo: <span className="font-mono">owner@quickcourt.com</span> / <span className="font-mono">owner123</span>
        </p>
      )}
    </form>
  );
}

// ─── Admin form ───────────────────────────────────────────────────────────────

function AdminForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    try {
      const data = await loginAdmin({ email, password, verificationCode });
      onSuccess(data.token, data.user);
    } catch (err) {
      setLocalError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
        <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>Admin access is restricted. A valid verification code is required.</span>
      </div>

      <ErrorBanner message={localError} />

      <FormInput id="a-email" label="Admin Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@quickcourt.com" required autoComplete="email" />
      <PasswordInput id="a-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <FormInput
        id="a-code"
        label="Verification Code"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        placeholder="QC-XXXX-XXXX"
        required
        autoComplete="off"
      />

      <SubmitButton loading={loading}>Verify & Sign In</SubmitButton>
    </form>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────

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
    }, 800);
  }

  // ── Role selection screen ──────────────────────────────────────────────────
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <Activity className="w-7 h-7" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            Quick<span className="text-purple-600">Court</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Welcome back</h1>
        <p className="text-slate-500 mb-8 text-center">Select your account type to continue</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedRole(card.id)}
                className={`group flex flex-col items-start p-6 rounded-2xl border-2 text-left
                            bg-white transition-all duration-200 cursor-pointer
                            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                            ${card.border} ${card.hover} shadow-sm hover:shadow-md`}
                aria-label={`Sign in as ${card.label}`}
              >
                <div className={`w-12 h-12 rounded-xl ${card.iconBg} text-white flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-base font-semibold text-slate-900 mb-1">{card.label}</span>
                <span className="text-sm text-slate-500 leading-relaxed">{card.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Auth form screen ───────────────────────────────────────────────────────
  const card = ROLE_CARDS.find((c) => c.id === selectedRole);
  const Icon = card.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => setSelectedRole(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 mb-6 transition-colors focus:outline-none focus:text-purple-600"
          aria-label="Back to role selection"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} text-white flex items-center justify-center shadow-sm`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{card.label}</h2>
              <p className="text-xs text-slate-500">{card.description}</p>
            </div>
          </div>

          {/* Success flash */}
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-emerald-600">
              <CheckCircle2 className="w-12 h-12" />
              <p className="font-semibold text-lg">Signed in successfully!</p>
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
