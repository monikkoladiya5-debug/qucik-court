import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Building2, MapPin, Clock,
  Loader2, AlertCircle, CheckCircle2, X, Save,
  ExternalLink, ShieldCheck, Sparkles, Layers, DollarSign,
  ChevronRight, Power, Check
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  fetchMyVenues, createVenue, updateVenue, deleteVenue,
  fetchCourts, createCourt, updateCourt, deleteCourt
} from '../services/api';

const ALL_SPORTS = ['Badminton', 'Tennis', 'Football', 'Basketball', 'Pickleball', 'Cricket', 'Squash'];

// ─── Reusable Form Input Field ────────────────────────────────────────────────

function FormField({ id, label, type = 'text', value, onChange, required, placeholder, helper }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
      />
      {helper && <p className="text-[11px] text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}

// ─── Venue Form (Create / Edit) ───────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', description: '', address: '', city: '', location: '',
  sportTypes: [], pricePerHour: '', courtCount: '', indoor: true,
  amenities: '', openingHours: '06:00 AM - 10:00 PM', imageUrl: '',
};

function VenueForm({ initial = EMPTY_FORM, onSubmit, onCancel, loading, error, isEdit }) {
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
        <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Facility Details */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Facility Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="vf-name"
            label="Venue / Complex Name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            placeholder="e.g. Apex Sports Hub"
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

      {/* Operational Specs */}
      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Capacity & Rates</h3>
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

      {/* Sports Offered Selection */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-700">
            Sports Offered <span className="text-red-500" aria-hidden="true">*</span>
          </p>
          <span className="text-[11px] text-slate-400">Click to toggle sports</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select sports offered">
          {ALL_SPORTS.map((sport) => {
            const isSelected = form.sportTypes.includes(sport);
            return (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                {isSelected ? `✓ ${sport}` : `+ ${sport}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indoor / Outdoor Toggle & Amenities */}
      <div className="pt-2 border-t border-slate-100 space-y-4">
        {/* Indoor Switch */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <button
            type="button"
            role="switch"
            aria-checked={form.indoor}
            onClick={() => set('indoor', !form.indoor)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              form.indoor ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.indoor ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <label
            className="text-xs font-bold text-slate-800 cursor-pointer select-none"
            onClick={() => set('indoor', !form.indoor)}
          >
            {form.indoor ? 'Indoor Facility (Air Conditioned / Covered)' : 'Outdoor Facility (Open Air Court)'}
          </label>
        </div>

        {/* Amenities Input */}
        <FormField
          id="vf-amenities"
          label="Amenities (comma-separated list)"
          value={amenitiesStr}
          onChange={(e) => set('amenities', e.target.value)}
          placeholder="e.g. Parking, Changing Room, Floodlights, Cafeteria, Drinking Water"
          helper="Helps players filter venues by essential conveniences"
        />

        {/* Image URL */}
        <FormField
          id="vf-img"
          label="Cover Image URL"
          value={form.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://images.unsplash.com/..."
          helper="Provide a direct URL to a high-resolution photo of your courts"
        />

        {/* Description */}
        <div>
          <label htmlFor="vf-desc" className="block text-xs font-bold text-slate-700 mb-1.5">
            Venue Description
          </label>
          <textarea
            id="vf-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Highlight court surface type (wooden, clay, synthetic), coaching facilities, and booking policies…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Publish Venue'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Court Management Form Modal (Add / Edit) ─────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 max-w-lg w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h2 id="court-modal-title" className="text-lg font-black text-slate-900">
              {isEdit ? `Edit — ${court.name}` : `Add Court to ${venue.name}`}
            </h2>
            <p className="text-xs text-slate-500">
              Configure surface specifications and hourly rate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
              <label htmlFor="cf-sport" className="block text-xs font-bold text-slate-700 mb-1.5">
                Sport <span className="text-red-500">*</span>
              </label>
              <select
                id="cf-sport"
                value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.indoor}
                onChange={(e) => setForm((f) => ({ ...f, indoor: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Indoor Court</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Active for Public Viewing</span>
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Court Changes' : 'Create Court'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Accessible Court Deletion Confirmation Modal ─────────────────────────────

function CourtDeleteModal({ court, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-court-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 max-w-md w-full animate-in zoom-in-95">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 id="delete-court-title" className="text-lg font-black text-slate-900 mb-1.5">
          Permanently Delete Court?
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Are you sure you want to delete <strong className="text-slate-800">{court.name}</strong>? This action will permanently remove the court from this venue and cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, Delete Court'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Venue Courts Management Modal ────────────────────────────────────────────

function VenueCourtsModal({ venue, onClose, onCourtsUpdated }) {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeForm, setActiveForm] = useState(null); // null | 'add' | courtObject
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [courtToDelete, setCourtToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadVenueCourts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourts({ venueId: venue.id });
      setCourts(data.courts || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve court configurations.');
    } finally {
      setLoading(false);
    }
  }, [venue.id]);

  useEffect(() => {
    loadVenueCourts();
  }, [loadVenueCourts]);

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function handleToggleActive(court) {
    try {
      await updateCourt(court.id, { isActive: !court.isActive });
      await loadVenueCourts();
      if (onCourtsUpdated) onCourtsUpdated();
      flash(`Court "${court.name}" set to ${!court.isActive ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      flash(err.message || 'Failed to update court status.');
    }
  }

  async function handleSaveCourt(data) {
    setFormLoading(true);
    setFormError(null);
    try {
      if (activeForm === 'add') {
        await createCourt(venue.id, data);
        flash('Court created successfully!');
      } else {
        await updateCourt(activeForm.id, data);
        flash('Court specifications updated successfully!');
      }
      await loadVenueCourts();
      if (onCourtsUpdated) onCourtsUpdated();
      setActiveForm(null);
    } catch (err) {
      setFormError(err.message || 'Failed to save court.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    try {
      await deleteCourt(courtToDelete.id);
      await loadVenueCourts();
      if (onCourtsUpdated) onCourtsUpdated();
      setCourtToDelete(null);
      flash('Court deleted successfully.');
    } catch (err) {
      setCourtToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-courts-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-w-3xl w-full animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 id="manage-courts-title" className="text-xl font-black text-slate-900">
                Courts — {venue.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Add, edit, activate/deactivate, or remove courts for this facility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveForm('add'); setFormError(null); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Court</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMsg && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Courts List */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading Courts…</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
              {error}
            </div>
          ) : courts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">No Courts Configured Yet</h3>
              <p className="text-xs text-slate-500 mb-4">
                Add courts to allow players to discover sports facilities at this venue.
              </p>
              <button
                type="button"
                onClick={() => { setActiveForm('add'); setFormError(null); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Court</span>
              </button>
            </div>
          ) : (
            courts.map((court) => (
              <div
                key={court.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-100 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{court.name}</h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {court.sport}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {court.courtType}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {court.indoor ? 'Indoor' : 'Outdoor'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <strong className="text-slate-900">₹{court.pricePerHour}</strong>/hr • {court.operatingHours}
                  </p>
                </div>

                {/* Actions: Toggle Active, Edit, Delete */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(court)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      court.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={court.isActive ? 'Click to deactivate' : 'Click to activate'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{court.isActive ? 'Active' : 'Inactive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveForm(court); setFormError(null); }}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                    aria-label={`Edit ${court.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourtToDelete(court)}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                    aria-label={`Delete ${court.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>{courts.length} {courts.length === 1 ? 'court' : 'courts'} listed</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>

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

// ─── Venue Row Card ───────────────────────────────────────────────────────────

function VenueCardRow({ venue, onEdit, onDelete, onManageCourts }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Thumbnail & Basic Information */}
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/80">
          {!imgErr && venue.imageUrl ? (
            <img
              src={venue.imageUrl}
              alt={venue.name}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Building2 className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-extrabold text-slate-900 truncate">{venue.name}</h2>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
              venue.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {venue.status || 'active'}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {venue.indoor ? 'Indoor' : 'Outdoor'}
            </span>
          </div>

          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{venue.location || venue.city}</span>
          </p>

          <p className="text-xs text-slate-600 font-medium pt-0.5">
            <strong className="text-slate-900">₹{venue.pricePerHour}</strong>/hr • {venue.courtCount} courts • {venue.sportTypes?.join(', ')}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0 flex-wrap">
        <button
          onClick={() => onManageCourts(venue)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
          title={`Manage courts for ${venue.name}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Courts</span>
        </button>

        <Link
          to={`/venues/${venue.id}`}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/80 rounded-xl border border-slate-200 transition-colors"
          title="View public venue page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </Link>

        <button
          onClick={() => onEdit(venue)}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors"
          aria-label={`Edit ${venue.name}`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onDelete(venue)}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-100 rounded-xl border border-red-200/80 transition-colors"
          aria-label={`Delete ${venue.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── Accessible Deletion Confirmation Modal ───────────────────────────────────

function DeleteModal({ venue, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 max-w-md w-full animate-in zoom-in-95">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h2 id="delete-title" className="text-lg font-black text-slate-900 mb-1.5">
          Permanently Delete Venue?
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Are you sure you want to delete <strong className="text-slate-800">{venue.name}</strong>? This will remove all associated court configurations from QuickCourt. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, Delete Venue'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Owner Venues Core View ───────────────────────────────────────────────────

function OwnerVenuesInner() {
  const [venues, setVenues]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState(null);
  const [mode, setMode]             = useState('list');   // 'list' | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]   = useState(null);
  const [toDelete, setToDelete]     = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [manageCourtsVenue, setManageCourtsVenue] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchMyVenues();
      setVenues(data.venues || []);
    } catch (err) {
      setPageError(err.message || 'Unable to retrieve your venues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const editInitial = editTarget ? {
    ...editTarget,
    amenities: (editTarget.amenities || []).join(', '),
    pricePerHour: String(editTarget.pricePerHour),
    courtCount: String(editTarget.courtCount),
  } : EMPTY_FORM;

  // Calculate owner summary stats
  const totalCourts = venues.reduce((acc, v) => acc + (Number(v.courtCount) || 1), 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Page Header & Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Venue Owner Dashboard</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facility Management</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage court availability, update sports amenities, and track facility listings.
              </p>
            </div>

            {mode === 'list' && (
              <button
                type="button"
                onClick={() => { setMode('create'); setFormError(null); }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Venue</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {mode === 'list' && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Facilities</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{venues.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Courts Managed</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{totalCourts}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Public Status</p>
                <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All Approved & Searchable
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="flex items-center gap-2.5 mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create / Edit Form Card */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 mb-8 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {mode === 'create' ? 'Register New Sports Venue' : `Update — ${editTarget?.name}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fill in standard information to display your sports complex to players.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMode('list'); setEditTarget(null); setFormError(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <VenueForm
              initial={mode === 'edit' ? editInitial : EMPTY_FORM}
              onSubmit={mode === 'create' ? handleCreate : handleUpdate}
              onCancel={() => { setMode('list'); setEditTarget(null); setFormError(null); }}
              loading={formLoading}
              error={formError}
              isEdit={mode === 'edit'}
            />
          </div>
        )}

        {/* List of Venues */}
        {mode === 'list' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-3">Loading your venues…</p>
            </div>
          ) : pageError ? (
            <div className="flex flex-col items-center py-12 px-4 bg-white rounded-2xl border border-red-200 text-center" role="alert">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <h2 className="text-base font-bold text-slate-900 mb-1">Failed to Load Venues</h2>
              <p className="text-sm text-slate-500 mb-4">{pageError}</p>
              <button
                onClick={load}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                Try Again
              </button>
            </div>
          ) : venues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-3xl border border-slate-200 shadow-card text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">No Venues Registered Yet</h2>
              <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                Add your first sports facility to begin receiving player bookings and court discovery.
              </p>
              <button
                onClick={() => { setMode('create'); setFormError(null); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register Your First Venue</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                <span>Active Listings ({venues.length})</span>
                <span>Actions</span>
              </div>
              {venues.map((venue) => (
                <VenueCardRow
                  key={venue.id}
                  venue={venue}
                  onEdit={startEdit}
                  onDelete={setToDelete}
                  onManageCourts={setManageCourtsVenue}
                />
              ))}
            </div>
          )
        )}
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      {toDelete && (
        <DeleteModal
          venue={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deleteLoading}
        />
      )}

      {/* Manage Courts Modal */}
      {manageCourtsVenue && (
        <VenueCourtsModal
          venue={manageCourtsVenue}
          onClose={() => setManageCourtsVenue(null)}
          onCourtsUpdated={load}
        />
      )}
    </div>
  );
}

export default function OwnerVenuesPage() {
  return (
    <ProtectedRoute role="OWNER">
      <OwnerVenuesInner />
    </ProtectedRoute>
  );
}
