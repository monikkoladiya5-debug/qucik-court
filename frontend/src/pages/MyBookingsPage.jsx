import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchMyBookings, cancelBooking } from '../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  XCircle,
  Info,
  ShieldCheck,
} from 'lucide-react';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'CANCELLED'

  // Cancellation state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMyBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      setError(err.message || 'Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      const res = await cancelBooking(cancellingBooking.id);
      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBooking.id ? { ...b, status: 'CANCELLED' } : b))
      );
      setCancellingBooking(null);
      setCancelSuccessMsg(`Booking ${res.booking.id} has been cancelled successfully.`);
      setTimeout(() => setCancelSuccessMsg(''), 5000);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'CONFIRMED') return b.status === 'CONFIRMED';
    if (filter === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="w-6 h-6 text-indigo-600" />
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Court Bookings
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Manage your confirmed court reservations, schedule details, and booking cancellations.
            </p>
          </div>

          <Link
            to="/venues"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <span>Book Another Court</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Global Feedback Banner */}
        {cancelSuccessMsg && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{cancelSuccessMsg}</span>
          </div>
        )}

        {/* Filter Tabs & Stats Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('CONFIRMED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'CONFIRMED'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Confirmed ({bookings.filter((b) => b.status === 'CONFIRMED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('CANCELLED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'CANCELLED'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancelled ({bookings.filter((b) => b.status === 'CANCELLED').length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> total bookings
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Retrieving Your Reservations…
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 p-8 bg-white rounded-3xl border border-red-200 shadow-card text-center max-w-lg mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Unable to Load Bookings</h3>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={loadBookings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="mt-8 p-12 bg-white rounded-3xl border border-slate-200 text-center max-w-lg mx-auto shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Bookings Found</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {filter === 'ALL'
                ? "You haven't reserved any court time slots yet. Explore venues to find an open court."
                : `You currently have zero ${filter.toLowerCase()} court bookings.`}
            </p>
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Browse Sports Venues</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredBookings.map((b) => {
              const isConfirmed = b.status === 'CONFIRMED';
              return (
                <div
                  key={b.id}
                  className={`p-5 sm:p-6 rounded-2xl border bg-white shadow-card transition-all ${
                    isConfirmed
                      ? 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
                      : 'border-slate-200/80 bg-slate-50/50 opacity-80'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Venue & Court Information */}
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {b.id}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {isConfirmed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmed
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Cancelled
                            </>
                          )}
                        </span>

                        {b.sport && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {b.sport}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                          {b.venueName}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                          {b.courtName}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <strong>{b.date}</strong>
                        </span>

                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{b.startTime} - {b.endTime}</span>
                        </span>

                        {b.venueLocation && (
                          <span className="flex items-center gap-1 text-slate-400 hidden sm:inline-flex">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{b.venueLocation}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Financial & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Total Rate (1 Hr)
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                          ₹{b.totalPrice}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {b.venueId && (
                          <Link
                            to={`/venues/${b.venueId}`}
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors"
                            title="View venue facility specifications"
                          >
                            <Building2 className="w-4 h-4" />
                          </Link>
                        )}

                        {isConfirmed && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingBooking(b);
                              setCancelError(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                          >
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Cancellation Confirmation Dialog */}
      {cancellingBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 id="cancel-title" className="text-base font-black text-slate-900">
                Cancel Court Reservation?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to cancel your booking for{' '}
                <strong>{cancellingBooking.courtName}</strong> on{' '}
                <strong>{cancellingBooking.date}</strong> at{' '}
                <strong>{cancellingBooking.startTime}</strong>?
              </p>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => {
                  setCancellingBooking(null);
                  setCancelError(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {cancelLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling…</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
