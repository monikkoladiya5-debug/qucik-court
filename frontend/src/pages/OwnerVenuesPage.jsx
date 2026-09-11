import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Building2, MapPin, Clock,
  Loader2, AlertCircle, CheckCircle2, X, Save,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { fetchMyVenues, createVenue, updateVenue, deleteVenue } from '../services/api';

// ─── ALL_SPORTS list ──────────────────────────────────────────────────────────
const ALL_SPORTS = ['Badminton', 'Tennis', 'Football', 'Basketball', 'Pickleball', 'Cricket', 'Squash'];

// ─── Reusable form field components ──────────────────────────────────────────

function Field({ id, label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
      />
    </div>
  );
}

// ─── Venue form (create / edit) ───────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', description: '', address: '', city: '', location: '',
  sportTypes: [], pricePerHour: '', courtCount: '', indoor: true,
  amenities: '', openingHours: '06:00 AM - 10:00 PM', imageUrl: '',
};

function VenueForm({ initial = EMPTY_FORM, onSubmit, onCancel, loading, error }) {
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="vf-name"    label="Venue Name"   value={form.name}         onChange={(e) => set('name', e.target.value)}         required placeholder="Smash Sports Club" />
        <Field id="vf-city"    label="City"          value={form.city}         onChange={(e) => set('city', e.target.value)}         required placeholder="Ahmedabad" />
        <Field id="vf-address" label="Address"       value={form.address}      onChange={(e) => set('address', e.target.value)}      placeholder="Plot 12, MG Road" />
        <Field id="vf-loc"     label="Location"      value={form.location}     onChange={(e) => set('location', e.target.value)}     placeholder="Bodakdev, Ahmedabad" />
        <Field id="vf-price"   label="Price / hr (₹)" type="number" value={form.pricePerHour} onChange={(e) => set('pricePerHour', e.target.value)} required placeholder="400" />
        <Field id="vf-courts"  label="No. of Courts" type="number" value={form.courtCount}    onChange={(e) => set('courtCount', e.target.value)}    required placeholder="4" />
        <Field id="vf-hours"   label="Opening Hours" value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} placeholder="06:00 AM - 10:00 PM" />
        <Field id="vf-img"     label="Image URL"     value={form.imageUrl}     onChange={(e) => set('imageUrl', e.target.value)}     placeholder="https://..." />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="vf-desc" className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
        <textarea
          id="vf-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe your venue…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white resize-none
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Sports */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Sports Offered <span className="text-red-500" aria-hidden>*</span></p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select sports">
          {ALL_SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSport(s)}
              aria-pressed={form.sportTypes.includes(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500
                          ${form.sportTypes.includes(s)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Indoor */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.indoor}
          onClick={() => set('indoor', !form.indoor)}
          className={`w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500
                      ${form.indoor ? 'bg-purple-600' : 'bg-slate-200'}`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1
                            ${form.indoor ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
        <label className="text-sm text-slate-700 font-medium cursor-pointer" onClick={() => set('indoor', !form.indoor)}>
          {form.indoor ? 'Indoor venue' : 'Outdoor venue'}
        </label>
      </div>

      {/* Amenities */}
      <Field
        id="vf-amenities"
        label="Amenities (comma-separated)"
        value={amenitiesStr}
        onChange={(e) => set('amenities', e.target.value)}
        placeholder="Parking, Washroom, Cafeteria"
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl
                     disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Venue
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Venue row card ───────────────────────────────────────────────────────────

function VenueRow({ venue, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      {/* Thumb */}
      <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
        <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/venues/${venue.id}`} className="font-semibold text-slate-900 hover:text-purple-700 transition-colors focus:outline-none">
            {venue.name}
          </Link>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${venue.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {venue.status}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
          <MapPin className="w-3 h-3" />{venue.location}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {venue.sportTypes.join(' · ')} · {venue.courtCount} court{venue.courtCount !== 1 ? 's' : ''} · ₹{venue.pricePerHour}/hr
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(venue)}
          aria-label={`Edit ${venue.name}`}
          className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(venue)}
          aria-label={`Delete ${venue.name}`}
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ venue, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Confirm deletion">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full">
        <Trash2 className="w-10 h-10 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Delete Venue</h2>
        <p className="text-sm text-slate-500 mb-5">
          Are you sure you want to delete <span className="font-semibold text-slate-700">{venue.name}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl
                       disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function OwnerVenuesInner() {
  const [venues, setVenues]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pageError, setPageError] = useState(null);
  const [mode, setMode]         = useState('list');   // 'list' | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]   = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchMyVenues();
      setVenues(data.venues || []);
    } catch (err) {
      setPageError(err.message || 'Failed to load your venues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function handleCreate(data) {
    setFormLoading(true);
    setFormError(null);
    try {
      await createVenue(data);
      await load();
      setMode('list');
      flash('Venue created successfully!');
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
      flash('Venue updated successfully!');
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
      flash('Venue deleted.');
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
  }

  // Build initial form for edit
  const editInitial = editTarget ? {
    ...editTarget,
    amenities: (editTarget.amenities || []).join(', '),
    pricePerHour: String(editTarget.pricePerHour),
    courtCount: String(editTarget.courtCount),
  } : EMPTY_FORM;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Venues</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your sports facilities</p>
          </div>
          {mode === 'list' && (
            <button
              onClick={() => { setMode('create'); setFormError(null); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl
                         transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <Plus className="w-4 h-4" />
              Add Venue
            </button>
          )}
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Create/Edit form */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {mode === 'create' ? 'Add a New Venue' : `Edit — ${editTarget?.name}`}
            </h2>
            <VenueForm
              initial={mode === 'edit' ? editInitial : EMPTY_FORM}
              onSubmit={mode === 'create' ? handleCreate : handleUpdate}
              onCancel={() => { setMode('list'); setEditTarget(null); setFormError(null); }}
              loading={formLoading}
              error={formError}
            />
          </div>
        )}

        {/* List */}
        {mode === 'list' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : pageError ? (
            <div className="flex flex-col items-center py-12 text-center" role="alert">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-slate-700 font-semibold mb-1">Failed to load venues</p>
              <p className="text-sm text-slate-500 mb-3">{pageError}</p>
              <button onClick={load} className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors">
                Retry
              </button>
            </div>
          ) : venues.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Building2 className="w-14 h-14 text-slate-200 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-1">No venues yet</p>
              <p className="text-sm text-slate-400 mb-4">Add your first sports venue to get started.</p>
              <button
                onClick={() => { setMode('create'); setFormError(null); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Venue
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {venues.map((v) => (
                <VenueRow
                  key={v.id}
                  venue={v}
                  onEdit={startEdit}
                  onDelete={setToDelete}
                />
              ))}
            </div>
          )
        )}
      </main>
      <Footer />

      {/* Delete modal */}
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
    <ProtectedRoute role="OWNER">
      <OwnerVenuesInner />
    </ProtectedRoute>
  );
}
