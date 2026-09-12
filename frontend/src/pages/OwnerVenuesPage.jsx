import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Building2, MapPin, Clock,
  Loader2, AlertCircle, CheckCircle2, X, Save,
  ExternalLink, ShieldCheck, Sparkles, Layers,
  ChevronRight, Power, Check, IndianRupee,
  Trophy, Zap, Flame, Award, Activity, ArrowLeft,
  ArrowRight, Navigation, FileText, Image as ImageIcon,
  HelpCircle, Eye
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  fetchMyVenues, createVenue, updateVenue, deleteVenue,
  fetchCourts, createCourt, updateCourt, deleteCourt
} from '../services/api';

const ALL_SPORTS = ['Badminton', 'Tennis', 'Football', 'Basketball', 'Pickleball', 'Cricket', 'Squash'];

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

const POPULAR_AMENITIES = [
  'Parking',
  'Changing Rooms',
  'Floodlights',
  'Drinking Water',
  'Air Conditioning',
  'Locker Rooms',
  'Cafeteria',
  'First Aid',
  'Pro Shop',
  'Seating Gallery',
  'Shower',
  'Equipment Rental',
];

// ─── Reusable Form Input Field ────────────────────────────────────────────────

function FormField({ id, label, type = 'text', value, onChange, required, placeholder, helper, ariaDescribedBy }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
        {label} {required && <span className="text-emerald-400" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy || (helper ? `${id}-helper` : undefined)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/90 text-sm text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />
      {helper && <p id={`${id}-helper`} className="text-[11px] text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  name: '', description: '', address: '', city: '', location: '',
  sportTypes: ['Badminton'], pricePerHour: '500', courtCount: '2', indoor: true,
  amenities: 'Parking, Changing Rooms, Drinking Water',
  openingHours: '06:00 AM - 10:00 PM', imageUrl: '',
};

// ─── O4: Guided Venue Creation Workspace (Sports Facility Builder) ────────────

const WIZARD_STEPS = [
  { id: 1, key: 'identity', stepNum: '01', title: 'Identity', label: 'Facility Identity', icon: Building2, desc: 'Name, visual branding, and overview' },
  { id: 2, key: 'location', stepNum: '02', title: 'Location', label: 'Location & Access', icon: MapPin, desc: 'City, neighborhood, and street address' },
  { id: 3, key: 'operations', stepNum: '03', title: 'Operations', label: 'Pricing & Capacity', icon: Layers, desc: 'Courts, hourly rates, and sports' },
  { id: 4, key: 'details', stepNum: '04', title: 'Details', label: 'Facility Amenities', icon: Sparkles, desc: 'Player conveniences and amenities' },
  { id: 5, key: 'review', stepNum: '05', title: 'Review', label: 'Review & Register', icon: ShieldCheck, desc: 'Verify specifications and publish' },
];

const STEP_GUIDANCE = {
  1: {
    tip: 'Choose a recognizable name that players in your city will remember. A high-quality cover photo significantly increases player booking rates.',
    highlights: ['Unique facility name', 'Clear description of court flooring', 'HTTPS cover photo URL'],
  },
  2: {
    tip: 'Accurate neighborhood and city details make your venue discoverable to players searching in their immediate area.',
    highlights: ['Specific city name', 'Prominent locality/neighborhood', 'Complete street address for navigation'],
  },
  3: {
    tip: 'Set transparent hourly rates and configure the sports hosted at your complex. You can add individual court specifications later in Facility Operations.',
    highlights: ['Competitive hourly tariff in ₹', 'Total playable courts', 'Select all hosted sports'],
  },
  4: {
    tip: 'Conveniences like floodlights, changing rooms, and parking are top filters used by competitive and casual players.',
    highlights: ['Essential amenities list', 'Click suggestion chips to add', 'Comma-separated format preserved'],
  },
  5: {
    tip: 'Verify your facility details before publishing to QuickCourt. You can edit court units or update venue specifications at any time.',
    highlights: ['Authoritative single-action registration', 'Instant activation on your portfolio', 'Manage courts after launch'],
  },
};

function VenueCreationWizard({ onSubmit, onCancel, loading, serverError }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stepError, setStepError] = useState('');
  const [imgErr, setImgErr] = useState(false);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    if (stepError) setStepError('');
    if (key === 'imageUrl') setImgErr(false);
  }

  function toggleSport(s) {
    set('sportTypes', form.sportTypes.includes(s)
      ? form.sportTypes.filter((x) => x !== s)
      : [...form.sportTypes, s]);
  }

  function toggleAmenityChip(amenity) {
    const current = typeof form.amenities === 'string'
      ? form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
      : (form.amenities || []);
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    set('amenities', updated.join(', '));
  }

  function validateStep(step) {
    if (step === 1) {
      if (!form.name.trim()) {
        return 'Please enter a venue or complex name.';
      }
    }
    if (step === 2) {
      if (!form.city.trim()) {
        return 'City is required.';
      }
      if (!form.location.trim()) {
        return 'Area / Neighborhood is required so players can locate your facility.';
      }
    }
    if (step === 3) {
      const price = Number(form.pricePerHour);
      const courts = Number(form.courtCount);
      if (!price || price <= 0) {
        return 'Please enter a valid hourly rate greater than 0.';
      }
      if (!courts || courts < 1) {
        return 'Please enter at least 1 available court.';
      }
      if (!form.sportTypes || form.sportTypes.length === 0) {
        return 'Please select at least one sport offered at your facility.';
      }
    }
    return '';
  }

  function handleNext() {
    const err = validateStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setCurrentStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStepError('');
    if (currentStep === 1) {
      onCancel();
    } else {
      setCurrentStep((s) => Math.max(1, s - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function jumpToStep(targetStep) {
    // Only allow jump to targetStep if previous steps are valid
    for (let s = 1; s < targetStep; s++) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setCurrentStep(s);
        return;
      }
    }
    setStepError('');
    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();

    // Final comprehensive validation
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setCurrentStep(s);
        return;
      }
    }

    setStepError('');
    onSubmit({
      ...form,
      pricePerHour: Number(form.pricePerHour) || 0,
      courtCount: Number(form.courtCount) || 1,
      amenities: typeof form.amenities === 'string'
        ? form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : form.amenities,
    });
  }

  const amenitiesList = typeof form.amenities === 'string'
    ? form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
    : (form.amenities || []);

  const guidance = STEP_GUIDANCE[currentStep] || STEP_GUIDANCE[1];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* ─── Creation Onboarding Header ─────────────────────────────────────── */}
      <div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
          <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <Link to="/owner/dashboard" className="hover:text-emerald-400 transition-colors">Host Console</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <button type="button" onClick={onCancel} className="hover:text-emerald-400 transition-colors">My Venues</button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-emerald-400 font-bold">Register Facility</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sports Facility Builder</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Bring Your Facility to QuickCourt
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              Add the details players need to discover, explore, and book your sports venue.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition self-start md:self-auto shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Venues</span>
          </button>
        </div>
      </div>

      {/* ─── Mobile Horizontal Progress Tracker (< 1024px) ─────────────────── */}
      <div className="block lg:hidden bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
          <span>Step {currentStep} of 5: <strong className="text-emerald-400">{WIZARD_STEPS[currentStep - 1].label}</strong></span>
          <span className="font-mono text-[11px] text-slate-500">{Math.round((currentStep / 5) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-3 gap-1 overflow-x-auto pb-1">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => jumpToStep(step.id)}
                className={`flex-1 min-w-[50px] py-1.5 px-2 rounded-lg text-center text-[10px] font-bold transition-all ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isCompleted
                    ? 'bg-slate-800/80 text-slate-300'
                    : 'text-slate-600'
                }`}
              >
                {step.stepNum} {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Error Alert Banners ────────────────────────────────────────────── */}
      {(stepError || serverError) && (
        <div role="alert" className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <span>{stepError || serverError}</span>
        </div>
      )}

      {/* ─── Two-Column Wizard Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── LEFT COLUMN: Wizard Progress & Contextual Guidance (Desktop) ── */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
          {/* Progress Tracker Card */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-white">Creation Progress</span>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Step {currentStep} / 5
              </span>
            </div>

            <nav aria-label="Creation Wizard Steps" className="space-y-4">
              {WIZARD_STEPS.map((step, idx) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const StepIcon = step.icon;

                return (
                  <div key={step.id} className="relative">
                    {/* Progress Connector Line */}
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div
                        className={`absolute left-5 top-10 w-0.5 h-7 -ml-[1px] transition-colors ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                        aria-hidden="true"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => jumpToStep(step.id)}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`w-full flex items-start gap-3.5 p-2.5 rounded-2xl text-left transition-all ${
                        isCurrent
                          ? 'bg-slate-950 border border-emerald-500/30 shadow-md shadow-emerald-500/5'
                          : 'hover:bg-slate-950/60'
                      }`}
                    >
                      {/* Step Circle Badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 text-slate-950'
                            : isCurrent
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400 ring-2 ring-emerald-500/20'
                            : 'bg-slate-950 text-slate-600 border border-slate-800'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.stepNum}
                      </div>

                      <div className="min-w-0 pt-0.5">
                        <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {step.desc}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Contextual Guidance Card */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step Guidance</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {guidance.tip}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Focus Points:</span>
              <ul className="space-y-1">
                {guidance.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* ─── RIGHT COLUMN: Current Form Step Card ─────────────────────────── */}
        <main className="lg:col-span-8">
          <form onSubmit={handleSubmit} noValidate className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8">
            
            {/* ═════════ STEP 1: VENUE IDENTITY ═════════ */}
            <div className={currentStep === 1 ? 'block space-y-6' : 'hidden'}>
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 01 of 05</span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                  Facility Identity
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Establish the public identity of your sports complex. This is how players will recognize your venue.
                </p>
              </div>

              <div className="space-y-5">
                <FormField
                  id="vf-name"
                  label="Venue / Complex Name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  placeholder="e.g. Apex Sports Arena"
                  helper="Use the official, recognizable commercial name of your facility."
                />

                {/* Cover Image Input + Live Visual Preview */}
                <div className="space-y-2">
                  <FormField
                    id="vf-img"
                    label="Cover Image URL (Direct HTTPS)"
                    value={form.imageUrl}
                    onChange={(e) => set('imageUrl', e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1526232761682-d26e03ac148e..."
                    helper="Provide a direct link to an image of your facility courts."
                  />

                  {/* Live Image Preview Card */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        Live Cover Preview
                      </span>
                      <span className="text-[10px] text-slate-500">How your card appears to players</span>
                    </div>

                    <div className="h-40 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
                      {form.imageUrl && !imgErr ? (
                        <img
                          src={form.imageUrl}
                          alt="Venue preview"
                          className="w-full h-full object-cover"
                          onError={() => setImgErr(true)}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-1" />
                          <p className="text-xs font-bold text-slate-500">
                            {imgErr ? 'Could not load image from URL. Check link.' : 'No image URL entered yet.'}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            A high quality court image will display here once specified.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="vf-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Facility Overview & Description
                  </label>
                  <textarea
                    id="vf-desc"
                    rows={4}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe your sports facility, court flooring types (synthetic, wooden, turf), coaching facilities, equipment rental, and booking policies…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/90 text-sm text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Helpful descriptions give players confidence about court quality and rules.
                  </p>
                </div>
              </div>
            </div>

            {/* ═════════ STEP 2: LOCATION & ACCESS ═════════ */}
            <div className={currentStep === 2 ? 'block space-y-6' : 'hidden'}>
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 02 of 05</span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                  Location & Access
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Specify geographic and navigation details so players can locate and travel to your facility.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="vf-city"
                    label="City"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    required
                    placeholder="e.g. Ahmedabad, Mumbai, Bengaluru"
                    helper="Primary city where your facility is situated."
                  />
                  <FormField
                    id="vf-loc"
                    label="Area / Neighborhood"
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    required
                    placeholder="e.g. Bodakdev, SG Highway, Indiranagar"
                    helper="Specific locality used for neighborhood searches."
                  />
                </div>

                <FormField
                  id="vf-address"
                  label="Full Street Address"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="e.g. Plot 102, Sports Complex Road, Opp. Central Park"
                  helper="Detailed street address displayed to confirmed bookers for directions."
                />

                {/* Location Summary Callout */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Player Search Indexing</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Players on the marketplace filter venues by city and neighborhood. Ensure your area is recognizable to local athletes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════ STEP 3: OPERATIONS & PRICING ═════════ */}
            <div className={currentStep === 3 ? 'block space-y-6' : 'hidden'}>
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 03 of 05</span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-emerald-400" />
                  Operations & Pricing
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure capacity, base hourly rate, opening schedule, and sports available at your complex.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    id="vf-price"
                    label="Hourly Tariff (₹)"
                    type="number"
                    value={form.pricePerHour}
                    onChange={(e) => set('pricePerHour', e.target.value)}
                    required
                    placeholder="e.g. 500"
                    helper="Standard hourly rate per court slot."
                  />
                  <FormField
                    id="vf-courts"
                    label="Total Court Fleet"
                    type="number"
                    value={form.courtCount}
                    onChange={(e) => set('courtCount', e.target.value)}
                    required
                    placeholder="e.g. 4"
                    helper="Total playable court units."
                  />
                  <FormField
                    id="vf-hours"
                    label="Operating Hours"
                    value={form.openingHours}
                    onChange={(e) => set('openingHours', e.target.value)}
                    placeholder="06:00 AM - 10:00 PM"
                    helper="Daily complex operating hours."
                  />
                </div>

                {/* Sports Offered Selection */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Sports Hosted at this Facility <span className="text-emerald-400" aria-hidden="true">*</span>
                    </p>
                    <span className="text-[11px] text-slate-500">Select all that apply</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5" role="group" aria-label="Select sports offered">
                    {ALL_SPORTS.map((sport) => {
                      const isSelected = form.sportTypes.includes(sport);
                      const SportIcon = SPORT_ICONS[sport] || Activity;
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          aria-pressed={isSelected}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <SportIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                          <span>{sport}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  {form.sportTypes.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      Please select at least one sport to proceed.
                    </p>
                  )}
                </div>

                {/* Indoor / Outdoor Switch */}
                <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.indoor}
                    onClick={() => set('indoor', !form.indoor)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      form.indoor ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.indoor ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <label
                    className="text-xs font-bold text-slate-200 cursor-pointer select-none"
                    onClick={() => set('indoor', !form.indoor)}
                  >
                    {form.indoor ? 'Indoor Facility (Covered / Climate Controlled)' : 'Outdoor Facility (Open-Air Sports Complex)'}
                  </label>
                </div>
              </div>
            </div>

            {/* ═════════ STEP 4: FACILITY DETAILS & AMENITIES ═════════ */}
            <div className={currentStep === 4 ? 'block space-y-6' : 'hidden'}>
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 04 of 05</span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                  Facility Amenities
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Highlight key conveniences players expect when visiting your venue.
                </p>
              </div>

              <div className="space-y-5">
                {/* Comma-separated Input */}
                <FormField
                  id="vf-amenities"
                  label="Configured Amenities (comma-separated list)"
                  value={form.amenities}
                  onChange={(e) => set('amenities', e.target.value)}
                  placeholder="e.g. Parking, Changing Rooms, Floodlights, Drinking Water"
                  helper="You can type custom amenities or click the quick tags below."
                />

                {/* Suggestion Chips */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Click to Add / Remove Popular Amenities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_AMENITIES.map((amenity) => {
                      const isIncluded = amenitiesList.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenityChip(amenity)}
                          aria-pressed={isIncluded}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isIncluded
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <Plus className={`w-3 h-3 ${isIncluded ? 'rotate-45 text-emerald-400' : 'text-slate-500'}`} />
                          <span>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Amenities Preview Pills */}
                {amenitiesList.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Active Facility Feature Tags ({amenitiesList.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {amenitiesList.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          <span>{a}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═════════ STEP 5: REVIEW & REGISTER ═════════ */}
            <div className={currentStep === 5 ? 'block space-y-6' : 'hidden'}>
              <div className="pb-4 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 05 of 05</span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  Review & Publish Facility
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Confirm your facility configuration below. Click "Register Venue" to launch your facility on QuickCourt.
                </p>
              </div>

              {/* Comprehensive Review Card */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
                {/* Visual Header Banner */}
                <div className="h-36 w-full bg-slate-900 relative overflow-hidden border-b border-slate-800">
                  {form.imageUrl && !imgErr ? (
                    <img
                      src={form.imageUrl}
                      alt={form.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-court-pattern-dark">
                      <Building2 className="w-10 h-10 text-slate-700 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Facility Listing Preview</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready for Launch
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700">
                      {form.indoor ? 'Indoor Facility' : 'Outdoor Complex'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-slate-950/90 backdrop-blur-md text-emerald-400 border border-emerald-500/30 font-mono shadow-md">
                      ₹{form.pricePerHour || 0}<span className="text-[10px] text-slate-400 font-sans">/hr</span>
                    </span>
                  </div>
                </div>

                {/* Review Body */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Title & Location */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">{form.name || 'Untitled Venue'}</h3>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{form.location ? `${form.location}, ${form.city}` : form.city || 'No location set'}</span>
                      </p>
                      {form.address && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{form.address}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => jumpToStep(1)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition shrink-0"
                    >
                      Edit Identity
                    </button>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Court Fleet</span>
                      <span className="font-bold text-slate-200 mt-0.5 block">{form.courtCount} Playing Courts</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tariff</span>
                      <span className="font-mono font-bold text-emerald-400 mt-0.5 block">₹{form.pricePerHour} / hour</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Schedule</span>
                      <span className="font-bold text-slate-200 mt-0.5 block truncate">{form.openingHours}</span>
                    </div>
                  </div>

                  {/* Sports Offered */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Configured Sports:</span>
                      <button
                        type="button"
                        onClick={() => jumpToStep(3)}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        Edit Sports
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.sportTypes.map((sport) => {
                        const SportIcon = SPORT_ICONS[sport] || Activity;
                        return (
                          <span
                            key={sport}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-slate-200 border border-slate-800"
                          >
                            <SportIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{sport}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amenities:</span>
                      <button
                        type="button"
                        onClick={() => jumpToStep(4)}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        Edit Amenities
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {amenitiesList.length > 0 ? (
                        amenitiesList.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{a}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No amenities specified.</span>
                      )}
                    </div>
                  </div>

                  {/* Description preview */}
                  {form.description && (
                    <div className="pt-3 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Facility Description:</span>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {form.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Form Navigation Footer ─────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{currentStep === 1 ? 'Cancel & Return' : 'Back'}</span>
              </button>

              <div className="flex items-center gap-3">
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="btn-submit-venue"
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-7 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Register Venue</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

// ─── Venue Edit Form (for updating existing portfolio assets) ─────────────────

function VenueEditForm({ initial, onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(initial);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleSport(s) {
    set('sportTypes', form.sportTypes.includes(s)
      ? form.sportTypes.filter((x) => x !== s)
      : [...form.sportTypes, s]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      pricePerHour: Number(form.pricePerHour) || 0,
      courtCount: Number(form.courtCount) || 1,
      amenities: typeof form.amenities === 'string'
        ? form.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : form.amenities,
    });
  }

  const amenitiesStr = typeof form.amenities === 'string'
    ? form.amenities
    : (form.amenities || []).join(', ');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Facility Identity */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Facility Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="vf-name"
            label="Venue / Complex Name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            placeholder="e.g. Apex Sports Arena"
          />
          <FormField
            id="vf-city"
            label="City"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            required
            placeholder="e.g. Mumbai, Bengaluru"
          />
          <FormField
            id="vf-loc"
            label="Area / Neighborhood"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            required
            placeholder="e.g. Indiranagar, Bengaluru"
          />
          <FormField
            id="vf-address"
            label="Full Street Address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="e.g. Plot 42, 100 Feet Road"
          />
        </div>
      </div>

      {/* Capacity & Rates */}
      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Capacity & Rates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            id="vf-price"
            label="Hourly Rate (₹)"
            type="number"
            value={form.pricePerHour}
            onChange={(e) => set('pricePerHour', e.target.value)}
            required
            placeholder="e.g. 500"
          />
          <FormField
            id="vf-courts"
            label="Total Available Courts"
            type="number"
            value={form.courtCount}
            onChange={(e) => set('courtCount', e.target.value)}
            required
            placeholder="e.g. 4"
          />
          <FormField
            id="vf-hours"
            label="Operating Hours"
            value={form.openingHours}
            onChange={(e) => set('openingHours', e.target.value)}
            placeholder="06:00 AM - 10:00 PM"
          />
        </div>
      </div>

      {/* Sports Offered */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Sports Offered <span className="text-emerald-400" aria-hidden="true">*</span>
          </p>
          <span className="text-[11px] text-slate-400">Click to toggle sports</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select sports offered">
          {ALL_SPORTS.map((sport) => {
            const isSelected = form.sportTypes?.includes(sport);
            const SportIcon = SPORT_ICONS[sport] || Activity;
            return (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <SportIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{sport}</span>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indoor Switch & Amenities */}
      <div className="pt-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            role="switch"
            aria-checked={form.indoor}
            onClick={() => set('indoor', !form.indoor)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              form.indoor ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.indoor ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <label
            className="text-xs font-bold text-slate-200 cursor-pointer select-none"
            onClick={() => set('indoor', !form.indoor)}
          >
            {form.indoor ? 'Indoor Facility (Covered / Climate Controlled)' : 'Outdoor Facility (Open-Air Sports Complex)'}
          </label>
        </div>

        <FormField
          id="vf-amenities"
          label="Amenities (comma-separated list)"
          value={amenitiesStr}
          onChange={(e) => set('amenities', e.target.value)}
          placeholder="e.g. Parking, Changing Room, Floodlights, Cafeteria"
        />

        <FormField
          id="vf-img"
          label="Cover Image URL"
          value={form.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://images.unsplash.com/photo-..."
        />

        <div>
          <label htmlFor="vf-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Venue Description
          </label>
          <textarea
            id="vf-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Highlight court surface, coaching, and booking policies…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/90 text-sm text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-5 border-t border-slate-800">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Court Form Modal (Add / Edit) ───────────────────────────────────────────

function CourtFormModal({ venue, court, onSave, onClose, loading, error }) {
  const isEdit = Boolean(court);
  const [form, setForm] = useState({
    name: court?.name || '',
    sport: court?.sport || venue.sportTypes[0] || 'Badminton',
    courtType: court?.courtType || 'Synthetic Mat',
    pricePerHour: court ? String(court.pricePerHour) : String(venue.pricePerHour || 400),
    operatingHours: court?.operatingHours || venue.openingHours || '06:00 AM - 10:00 PM',
    indoor: court !== undefined ? Boolean(court.indoor) : Boolean(venue.indoor),
    isActive: court !== undefined ? Boolean(court.isActive) : true,
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      pricePerHour: Number(form.pricePerHour) || 0,
      indoor: Boolean(form.indoor),
      isActive: Boolean(form.isActive),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-modal-title"
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div>
            <h2 id="court-modal-title" className="text-lg font-black text-white">
              {isEdit ? `Edit — ${court.name}` : `Add Court to ${venue.name}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure court surface specifications, operating hours, and hourly rate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="cf-name"
            label="Court / Pitch Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Badminton Court 1"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-sport" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Sport <span className="text-emerald-400">*</span>
              </label>
              <select
                id="cf-sport"
                value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/90 text-sm text-white bg-slate-950 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                {venue.sportTypes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <FormField
              id="cf-type"
              label="Court Surface Type"
              value={form.courtType}
              onChange={(e) => setForm((f) => ({ ...f, courtType: e.target.value }))}
              placeholder="e.g. Wooden, Synthetic, Clay"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="cf-price"
              label="Rate (₹ / hr)"
              type="number"
              value={form.pricePerHour}
              onChange={(e) => setForm((f) => ({ ...f, pricePerHour: e.target.value }))}
              required
              placeholder="400"
            />

            <FormField
              id="cf-hours"
              label="Operating Hours"
              value={form.operatingHours}
              onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
              placeholder="06:00 AM - 10:00 PM"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={form.indoor}
                onChange={(e) => setForm((f) => ({ ...f, indoor: e.target.checked }))}
                className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-950 focus:ring-emerald-500"
              />
              <span>Indoor Court</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-950 focus:ring-emerald-500"
              />
              <span>Active for Public Bookings</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Court Changes' : 'Create Court'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Court Deletion Confirmation Modal ────────────────────────────────────────

function CourtDeleteModal({ court, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-court-title"
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-7 max-w-md w-full text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 id="delete-court-title" className="text-lg font-black text-white mb-1.5">
          Permanently Delete Court?
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Are you sure you want to delete <strong className="text-white font-semibold">{court.name}</strong>? This action will permanently remove the court from this facility and cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, Delete Court'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Venue Deletion Confirmation Modal ────────────────────────────────────────

function DeleteModal({ venue, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-7 max-w-md w-full text-slate-100 animate-in zoom-in-95">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 id="delete-title" className="text-lg font-black text-white mb-1.5">
          Permanently Delete Facility?
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Are you sure you want to delete <strong className="text-white font-semibold">{venue.name}</strong>? This will permanently remove the venue and all associated court configurations from QuickCourt. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, Delete Venue'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── O2: Venue Portfolio Card Component ───────────────────────────────────────

function VenuePortfolioCard({ venue, onEdit, onDelete, onOperateFacility }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <article className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group">
      <div>
        {/* Cover Image Banner */}
        <div className="h-44 w-full bg-slate-950 relative overflow-hidden border-b border-slate-800">
          {!imgErr && venue.imageUrl ? (
            <img
              src={venue.imageUrl}
              alt={venue.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-court-pattern-dark">
              <Building2 className="w-12 h-12 text-slate-700 mb-1" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Facility Asset</span>
            </div>
          )}

          {/* Overlaid Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase backdrop-blur-md border shadow-sm ${
              venue.status === 'active'
                ? 'bg-slate-950/80 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-950/80 text-amber-400 border-amber-500/30'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {venue.status || 'ACTIVE'}
            </span>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700 shadow-sm">
              {venue.indoor ? 'Indoor Facility' : 'Outdoor Facility'}
            </span>
          </div>

          {/* Overlaid Rate Pill */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-slate-950/90 backdrop-blur-md text-emerald-400 border border-emerald-500/30 font-mono shadow-md">
              ₹{venue.pricePerHour}<span className="text-[10px] text-slate-400 font-sans">/hr</span>
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
              {venue.name}
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{venue.location || venue.city}</span>
            </p>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Capacity
              </div>
              <div className="text-xs font-black text-slate-200 mt-0.5">
                {venue.courtCount} {venue.courtCount === 1 ? 'Court' : 'Courts'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Schedule
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate mt-0.5">
                {venue.openingHours || '06:00 AM - 10:00 PM'}
              </div>
            </div>
          </div>

          {/* Sports Badges */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Configured Sports
            </div>
            <div className="flex flex-wrap gap-1.5">
              {venue.sportTypes?.map((sport) => {
                const SportIcon = SPORT_ICONS[sport] || Activity;
                return (
                  <span
                    key={sport}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    <SportIcon className="w-3 h-3 text-emerald-400" />
                    <span>{sport}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => onOperateFacility(venue)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
          title={`Operate courts and facility configuration for ${venue.name}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Operate Facility</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/venues/${venue.id}`}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
            title="Preview public venue listing"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Preview</span>
          </Link>

          <button
            onClick={() => onEdit(venue)}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-300 hover:text-emerald-400 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
            aria-label={`Edit ${venue.name}`}
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            onClick={() => onDelete(venue)}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-slate-800 transition-colors"
            aria-label={`Delete ${venue.name}`}
            title="Delete venue"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── O3: Dedicated Facility Operations Workspace ──────────────────────────────

function FacilityOperationsView({ venue, onBack, onVenueUpdated }) {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeForm, setActiveForm] = useState(null); // null | 'add' | courtObject
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [courtToDelete, setCourtToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadCourts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourts({ venueId: venue.id });
      setCourts(data.courts || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve court telemetry.');
    } finally {
      setLoading(false);
    }
  }, [venue.id]);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }

  async function handleToggleActive(court) {
    try {
      await updateCourt(court.id, { isActive: !court.isActive });
      await loadCourts();
      if (onVenueUpdated) onVenueUpdated();
      flash(`Court "${court.name}" status updated to ${!court.isActive ? 'Active (Live)' : 'Inactive (Offline)'}.`);
    } catch (err) {
      flash(err.message || 'Failed to toggle court operational status.');
    }
  }

  async function handleSaveCourt(data) {
    setFormLoading(true);
    setFormError(null);
    try {
      if (activeForm === 'add') {
        await createCourt(venue.id, data);
        flash('Court created and deployed to facility fleet!');
      } else {
        await updateCourt(activeForm.id, data);
        flash('Court specifications updated successfully!');
      }
      await loadCourts();
      if (onVenueUpdated) onVenueUpdated();
      setActiveForm(null);
    } catch (err) {
      setFormError(err.message || 'Failed to save court specifications.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    try {
      await deleteCourt(courtToDelete.id);
      await loadCourts();
      if (onVenueUpdated) onVenueUpdated();
      setCourtToDelete(null);
      flash('Court was decommissioned and permanently deleted.');
    } catch (err) {
      setCourtToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  const activeCourtsCount = courts.filter((c) => c.isActive).length;
  const inactiveCourtsCount = courts.length - activeCourtsCount;

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. Facility Command Header */}
      <div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
          <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <Link to="/owner/dashboard" className="hover:text-emerald-400 transition-colors">Host Console</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <button onClick={onBack} className="hover:text-emerald-400 transition-colors">My Venues</button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-emerald-400 font-bold">Facility Operations</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Facility Operations Control Room
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {venue.location || venue.city}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {venue.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              Manage court availability, surface configurations, hourly tariffs, and real-time operational status for this facility.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
            <button
              id="btn-back-to-portfolio"
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portfolio</span>
            </button>

            <Link
              to={`/venues/${venue.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition"
              title="Preview public venue page"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Public Preview</span>
            </Link>

            <button
              id="btn-add-court"
              type="button"
              onClick={() => { setActiveForm('add'); setFormError(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Plus className="w-4 h-4" />
              <span>Add Court</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert Banner */}
      {toastMsg && (
        <div role="status" className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. Facility Operational Status Strip */}
      <section aria-label="Facility Operational Status" className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Court Fleet</p>
          <p className="text-2xl font-black text-white mt-1">{courts.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Configured units</p>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Bookable</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activeCourtsCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Live on marketplace</p>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Offline / Inactive</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{inactiveCourtsCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Deactivated courts</p>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operating Schedule</p>
          <p className="text-sm font-bold text-slate-200 mt-2 truncate flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{venue.openingHours || '06:00 AM - 10:00 PM'}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{venue.indoor ? 'Indoor Facility' : 'Outdoor Complex'}</p>
        </div>
      </section>

      {/* 3. Court Fleet Workspace Grid */}
      <section aria-labelledby="court-fleet-heading" className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
          <div>
            <h2 id="court-fleet-heading" className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Court Fleet Inventory ({courts.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status, surface specifications, and booking tariffs for each court unit in {venue.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setActiveForm('add'); setFormError(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Court</span>
          </button>
        </div>

        {/* Loading / Error / Empty / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Court Fleet Telemetry…</p>
          </div>
        ) : error ? (
          <div role="alert" className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {error}
          </div>
        ) : courts.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-slate-950 border border-slate-800">
            <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Courts Configured For This Facility</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
              Add court units with sport type, surface material, and hourly rates to allow customers to book court slots at {venue.name}.
            </p>
            <button
              type="button"
              onClick={() => { setActiveForm('add'); setFormError(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Court</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courts.map((court) => {
              const SportIcon = SPORT_ICONS[court.sport] || Activity;
              return (
                <div
                  key={court.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between bg-slate-950 shadow-lg ${
                    court.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-85'
                  }`}
                >
                  <div>
                    {/* Court Header: Name & Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-black text-white">{court.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {court.id}</p>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        court.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${court.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {court.isActive ? 'Active' : 'Offline'}
                      </span>
                    </div>

                    {/* Sport and Specs */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-slate-200 border border-slate-800">
                        <SportIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{court.sport}</span>
                      </span>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                        {court.courtType || 'Synthetic'}
                      </span>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                        {court.indoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </div>

                    {/* Operational Details Strip */}
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Hourly Tariff:</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">₹{court.pricePerHour}/hr</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Hours:</span>
                        <span className="text-slate-300 font-medium truncate">{court.operatingHours || '06:00 AM - 10:00 PM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={court.isActive}
                      onClick={() => handleToggleActive(court)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        court.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
                      }`}
                      title={court.isActive ? 'Deactivate court from public booking' : 'Activate court for public booking'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{court.isActive ? 'Active' : 'Offline'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setActiveForm(court); setFormError(null); }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors"
                        aria-label={`Edit ${court.name}`}
                        title="Edit specifications"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCourtToDelete(court)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-slate-800 transition-colors"
                        aria-label={`Delete ${court.name}`}
                        title="Permanently remove court"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Form Modal */}
      {activeForm && (
        <CourtFormModal
          venue={venue}
          court={activeForm === 'add' ? null : activeForm}
          onSave={handleSaveCourt}
          onClose={() => { setActiveForm(null); setFormError(null); }}
          loading={formLoading}
          error={formError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {courtToDelete && (
        <CourtDeleteModal
          court={courtToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setCourtToDelete(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

// ─── Owner Venues Core View ───────────────────────────────────────────────────

function OwnerVenuesInner() {
  const [venues, setVenues]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [pageError, setPageError]           = useState(null);
  const [mode, setMode]                     = useState('list'); // 'list' | 'create' | 'edit' | 'facility'
  const [operatingFacility, setOperatingFacility] = useState(null);
  const [editTarget, setEditTarget]         = useState(null);
  const [formLoading, setFormLoading]       = useState(false);
  const [formError, setFormError]           = useState(null);
  const [toDelete, setToDelete]             = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [successMsg, setSuccessMsg]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchMyVenues();
      setVenues(data.venues || []);
      if (operatingFacility) {
        const refreshed = (data.venues || []).find((v) => v.id === operatingFacility.id);
        if (refreshed) setOperatingFacility(refreshed);
      }
    } catch (err) {
      setPageError(err.message || 'Unable to retrieve your venues.');
    } finally {
      setLoading(false);
    }
  }, [operatingFacility]);

  useEffect(() => {
    load();
  }, []);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  async function handleCreate(data) {
    setFormLoading(true);
    setFormError(null);
    try {
      await createVenue(data);
      await load();
      setMode('list');
      flash('Venue published successfully!');
    } catch (err) {
      setFormError(err.message || 'Failed to create venue.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(data) {
    setFormLoading(true);
    setFormError(null);
    try {
      await updateVenue(editTarget.id, data);
      await load();
      setMode('list');
      setEditTarget(null);
      flash('Venue specifications updated successfully!');
    } catch (err) {
      setFormError(err.message || 'Failed to update venue.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await deleteVenue(toDelete.id);
      await load();
      setToDelete(null);
      flash('Venue was successfully deleted.');
    } catch (err) {
      setToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(venue) {
    setEditTarget(venue);
    setFormError(null);
    setMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startFacilityOperations(venue) {
    setOperatingFacility(venue);
    setMode('facility');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const editInitial = editTarget ? {
    ...editTarget,
    amenities: (editTarget.amenities || []).join(', '),
    pricePerHour: String(editTarget.pricePerHour),
    courtCount: String(editTarget.courtCount),
  } : EMPTY_FORM;

  // Calculate real owner summary stats
  const totalCourts = venues.reduce((acc, v) => acc + (Number(v.courtCount) || 1), 0);
  const activeVenuesCount = venues.filter((v) => v.status === 'active' || !v.status).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Success Global Alert */}
        {successMsg && mode !== 'facility' && mode !== 'create' && (
          <div role="status" className="flex items-center gap-2.5 mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ─── Mode O3: Dedicated Facility Operations Workspace ──────────────── */}
        {mode === 'facility' && operatingFacility ? (
          <FacilityOperationsView
            venue={operatingFacility}
            onBack={() => { setMode('list'); setOperatingFacility(null); }}
            onVenueUpdated={load}
          />
        ) : mode === 'create' ? (
          /* ─── Mode O4: Dedicated Guided Venue Creation Workspace ────────── */
          <VenueCreationWizard
            onSubmit={handleCreate}
            onCancel={() => { setMode('list'); setFormError(null); }}
            loading={formLoading}
            serverError={formError}
          />
        ) : (
          <>
            {/* ─── Mode O2: Venue Portfolio Header & Management Controls ───────── */}
            <div className="mb-8">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
                <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                <Link to="/owner/dashboard" className="hover:text-emerald-400 transition-colors">Host Console</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-emerald-400 font-bold">My Venues</span>
              </nav>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Venue Portfolio Workspace</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    My Managed Venues
                  </h1>
                  <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                    Review your registered sports complexes, manage court specifications, set hourly rates, and toggle availability.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  {mode === 'list' && (
                    <button
                      id="btn-register-new-venue"
                      type="button"
                      onClick={() => { setMode('create'); setFormError(null); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register New Venue</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Compact Portfolio Summary HUD */}
              {mode === 'list' && !loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-6">
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Managed Facilities</p>
                    <p className="text-2xl font-black text-white mt-1">{venues.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Active business assets</p>
                  </div>

                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Courts Fleet</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{totalCourts}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Configured playing units</p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Listing Status</p>
                    <p className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {activeVenuesCount} Approved & Searchable
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Live on player marketplace</p>
                  </div>
                </div>
              )}
            </div>

            {/* Edit Form Card */}
            {mode === 'edit' && (
              <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 mb-8 animate-in fade-in">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      Update — {editTarget?.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Modify facility specifications, hourly rates, and sports options.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('list'); setEditTarget(null); setFormError(null); }}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                    aria-label="Close form"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <VenueEditForm
                  initial={editInitial}
                  onSubmit={handleUpdate}
                  onCancel={() => { setMode('list'); setEditTarget(null); setFormError(null); }}
                  loading={formLoading}
                  error={formError}
                />
              </div>
            )}

            {/* List of Portfolio Venues */}
            {mode === 'list' && (
              loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3">Loading your venue portfolio…</p>
                </div>
              ) : pageError ? (
                <div className="flex flex-col items-center py-12 px-4 bg-slate-900 rounded-3xl border border-rose-500/20 text-center" role="alert">
                  <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                  <h2 className="text-base font-bold text-white mb-1">Failed to Load Venues</h2>
                  <p className="text-sm text-rose-300 mb-4">{pageError}</p>
                  <button
                    onClick={load}
                    className="px-5 py-2.5 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl hover:bg-emerald-400 transition"
                  >
                    Try Again
                  </button>
                </div>
              ) : venues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl text-center">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-1.5">No Venues Registered Yet</h2>
                  <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                    Add your first sports facility to begin receiving player bookings and court reservations on QuickCourt.
                  </p>
                  <button
                    onClick={() => { setMode('create'); setFormError(null); }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Your First Venue</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    <span>Active Facility Listings ({venues.length})</span>
                    <span>Actions</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.map((venue) => (
                      <VenuePortfolioCard
                        key={venue.id}
                        venue={venue}
                        onEdit={startEdit}
                        onDelete={setToDelete}
                        onOperateFacility={startFacilityOperations}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Delete Venue Confirmation Modal */}
      {toDelete && (
        <DeleteModal
          venue={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

export default function OwnerVenuesPage() {
  return (
    <ProtectedRoute allowedRoles={['OWNER']}>
      <OwnerVenuesInner />
    </ProtectedRoute>
  );
}
