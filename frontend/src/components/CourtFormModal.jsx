import React, { useState, useEffect } from 'react';
import {
  X, AlertCircle, Layers, Trophy, Zap, Sparkles, Award,
  Flame, ShieldCheck, Activity, Check, IndianRupee
} from 'lucide-react';

const ALL_SPORTS = ['Badminton', 'Tennis', 'Football', 'Basketball', 'Pickleball', 'Cricket', 'Squash', 'Table Tennis'];

export default function CourtFormModal({
  venue,
  venues = [],
  court = null,
  onSave,
  onClose,
  loading = false,
  error = null
}) {
  const isEdit = Boolean(court);
  
  // Selected venue (either passed directly or picked from list)
  const [selectedVenueId, setSelectedVenueId] = useState(
    venue?.id || court?.venueId || (venues.length > 0 ? venues[0].id : '')
  );

  const activeVenue = venue || venues.find((v) => v.id === selectedVenueId) || venues[0] || null;

  // Safely extract sports offered at the venue
  const availableSports = (Array.isArray(activeVenue?.sportTypes) && activeVenue.sportTypes.length > 0)
    ? activeVenue.sportTypes
    : (typeof activeVenue?.sportTypes === 'string'
        ? activeVenue.sportTypes.split(',').map((s) => s.trim()).filter(Boolean)
        : (activeVenue?.sport ? [activeVenue.sport] : ALL_SPORTS));

  const [form, setForm] = useState({
    name: court?.name || '',
    sport: court?.sport || (availableSports[0] || 'Badminton'),
    courtType: court?.courtType || 'Synthetic Mat',
    pricePerHour: court?.pricePerHour !== undefined ? String(court.pricePerHour) : String(activeVenue?.pricePerHour || 400),
    operatingHours: court?.operatingHours || activeVenue?.openingHours || '06:00 AM - 10:00 PM',
    indoor: court?.indoor !== undefined ? Boolean(court.indoor) : (activeVenue?.indoor !== undefined ? Boolean(activeVenue.indoor) : true),
    isActive: court?.isActive !== undefined ? Boolean(court.isActive) : true,
  });

  const [validationError, setValidationError] = useState('');

  // Update sport when venue changes if currently selected sport isn't available
  useEffect(() => {
    if (availableSports.length > 0 && !availableSports.includes(form.sport)) {
      setForm((f) => ({ ...f, sport: availableSports[0] }));
    }
  }, [availableSports, form.sport]);

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !loading && onClose) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);


  function handleSubmit(e) {
    e.preventDefault();
    setValidationError('');

    if (!form.name.trim()) {
      setValidationError('Court name is required.');
      return;
    }
    if (form.name.trim().length > 100) {
      setValidationError('Court name cannot exceed 100 characters.');
      return;
    }
    if (!form.sport || !form.sport.trim()) {
      setValidationError('Sport type is required.');
      return;
    }
    const price = Number(form.pricePerHour);
    if (isNaN(price) || price <= 0) {
      setValidationError('Price per hour must be a valid positive number (₹).');
      return;
    }
    if (!selectedVenueId) {
      setValidationError('Please select a facility for this court.');
      return;
    }

    onSave({
      venueId: selectedVenueId,
      name: form.name.trim(),
      sport: form.sport.trim(),
      courtType: form.courtType.trim() || 'Standard',
      pricePerHour: price,
      operatingHours: form.operatingHours.trim() || activeVenue?.openingHours || '06:00 AM - 10:00 PM',
      indoor: Boolean(form.indoor),
      isActive: Boolean(form.isActive),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-modal-title"
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div>
            <h2 id="court-modal-title" className="text-lg font-black text-white">
              {isEdit ? `Edit Court — ${court?.name || 'Court'}` : 'Configure New Court Unit'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Update surface specifications, rates, and active operational status.' : `Add a playable court unit to ${activeVenue?.name || 'your facility'}.`}
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

        {(validationError || error) && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Venue Selection (if creating and multiple venues available) */}
          {!isEdit && venues.length > 1 && !venue && (
            <div>
              <label htmlFor="cf-venue" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Sports Complex <span className="text-emerald-400">*</span>
              </label>
              <select
                id="cf-venue"
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.location || v.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Court Name */}
          <div>
            <label htmlFor="cf-name" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Court / Pitch Identifier <span className="text-emerald-400">*</span>
            </label>
            <input
              id="cf-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (validationError) setValidationError('');
              }}
              required
              placeholder="e.g. Badminton Court 1, Pitch A, Center Court"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
            />
          </div>

          {/* Sport & Surface Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-sport" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Sport Type <span className="text-emerald-400">*</span>
              </label>
              <select
                id="cf-sport"
                value={form.sport}
                onChange={(e) => {
                  setForm((f) => ({ ...f, sport: e.target.value }));
                  if (validationError) setValidationError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-semibold"
              >
                {availableSports.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cf-type" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Surface Specification
              </label>
              <input
                id="cf-type"
                type="text"
                value={form.courtType}
                onChange={(e) => setForm((f) => ({ ...f, courtType: e.target.value }))}
                placeholder="e.g. Synthetic Mat, Teakwood, Clay, Turf"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
            </div>
          </div>

          {/* Rate & Operating Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-price" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Hourly Tariff (₹) <span className="text-emerald-400">*</span>
              </label>
              <input
                id="cf-price"
                type="number"
                min="1"
                value={form.pricePerHour}
                onChange={(e) => {
                  setForm((f) => ({ ...f, pricePerHour: e.target.value }));
                  if (validationError) setValidationError('');
                }}
                required
                placeholder="400"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
              />
            </div>

            <div>
              <label htmlFor="cf-hours" className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Operating Window
              </label>
              <input
                id="cf-hours"
                type="text"
                value={form.operatingHours}
                onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
                placeholder="06:00 AM - 10:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-950 font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Toggles: Indoor & Active State */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-300">
              <span>Indoor Facility Unit</span>
              <input
                type="checkbox"
                checked={form.indoor}
                onChange={(e) => setForm((f) => ({ ...f, indoor: e.target.checked }))}
                className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-400"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-300 pt-2 border-t border-slate-800/80">
              <div>
                <span>Active for Public Bookings</span>
                <p className="text-[10px] text-slate-500 font-normal">When deactivated, court is offline and will not accept player reservations.</p>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-400"
              />
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              id="btn-submit-court-form"
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'Saving Court...' : (isEdit ? 'Update Court Specifications' : 'Deploy Court to Fleet')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
