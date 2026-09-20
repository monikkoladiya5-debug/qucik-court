import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Building2, CalendarCheck, TrendingUp,
  RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock,
  Search, Filter, MapPin, Layers, UserCheck, UserX,
  ExternalLink, ArrowRight, ShieldAlert, Sparkles, ChevronRight,
  Activity, Award, Store, Loader2, UserRound, IndianRupee,
  Shield, Check, X, CircleDot, ArrowUpRight, BarChart3,
  Flame, Zap, Trophy, Percent, Wallet, CreditCard,
  QrCode, Calendar, AlertTriangle, Star
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminDashboard,
  fetchAdminPlatformIntelligence,
  toggleUserStatusApi,
  fetchAdminVenueVerifications,
  updateVenueVerificationApi,
  fetchAdminCourtApprovals,
  updateCourtApprovalApi,
} from '../services/api';
import { formatBookingDate } from '../utils/date';

/**
 * Court Approval Status Badge
 */
function CourtApprovalStatusBadge({ status }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>APPROVED</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>REJECTED</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <Clock className="w-3.5 h-3.5 text-yellow-400" />
          <span>PENDING</span>
        </span>
      );
  }
}

/**
 * Verification Status Badge (Phase 19)
 */
function VerificationStatusBadge({ status }) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>VERIFIED</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>REJECTED</span>
        </span>
      );
    case 'SUSPENDED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>SUSPENDED</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <Clock className="w-3.5 h-3.5 text-yellow-400" />
          <span>PENDING</span>
        </span>
      );
  }
}

/**
 * Platform Governance Metric Card
 */
function MetricPanel({ title, value, subtitle, icon: Icon, accent = 'emerald', badge }) {
  const accentClasses = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    sky: {
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    lime: {
      text: 'text-lime-400',
      bg: 'bg-lime-400/10',
      border: 'border-lime-400/20',
      badge: 'bg-lime-400/10 text-lime-400 border-lime-400/20',
    },
  }[accent] || {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border ${accentClasses.border} shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentClasses.text} ${accentClasses.bg} border ${accentClasses.border}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">{value}</span>
          {badge && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${accentClasses.badge}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Operational Booking Status Badge
 */
function BookingStatusBadge({ operationalStatus, status }) {
  if (operationalStatus === 'CANCELLED' || status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancelled</span>
      </span>
    );
  }

  if (operationalStatus === 'COMPLETED' || status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Completed</span>
      </span>
    );
  }

  if (status === 'PAID' || status === 'CONFIRMED' || status === 'CHECKED_IN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-lime-400/10 text-lime-400 border border-lime-400/20">
        <CalendarCheck className="w-3.5 h-3.5" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
      <Clock className="w-3.5 h-3.5" />
      <span>{status || 'Upcoming'}</span>
    </span>
  );
}

/**
 * Role Visualization Badge
 */
function RoleBadge({ role }) {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 text-white border border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ADMIN</span>
        </span>
      );
    case 'OWNER':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Building2 className="w-3.5 h-3.5" />
          <span>OWNER</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <UserRound className="w-3.5 h-3.5" />
          <span>CUSTOMER</span>
        </span>
      );
  }
}

function AdminDashboardInner() {
  const { user: currentAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Phase 18 Platform Intelligence Telemetry
  const [intelligence, setIntelligence] = useState(null);
  const [intelLoading, setIntelLoading] = useState(true);
  const [intelError, setIntelError] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'today' | '7d' | '30d' | 'all'

  // Phase 19 Venue Trust & Verification State
  const [verificationData, setVerificationData] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [verificationSearch, setVerificationSearch] = useState('');

  // Verification Action Modal: { venue, targetStatus: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' }
  const [verificationActionTarget, setVerificationActionTarget] = useState(null);
  const [verificationReason, setVerificationReason] = useState('');
  const [verificationModalError, setVerificationModalError] = useState(null);
  const [verificationUpdating, setVerificationUpdating] = useState(false);

  // Court Approval State
  const [courtApprovals, setCourtApprovals] = useState([]);
  const [courtApprovalLoading, setCourtApprovalLoading] = useState(false);
  const [courtApprovalError, setCourtApprovalError] = useState(null);
  const [courtApprovalFilter, setCourtApprovalFilter] = useState('ALL');
  const [courtApprovalSearch, setCourtApprovalSearch] = useState('');
  const [courtActionTarget, setCourtActionTarget] = useState(null); // { court, targetStatus: 'APPROVED' | 'REJECTED' }
  const [courtActionNote, setCourtActionNote] = useState('');
  const [courtActionModalError, setCourtActionModalError] = useState(null);
  const [courtActionUpdating, setCourtActionUpdating] = useState(false);

  // Active Main Navigation Tab: 'OVERVIEW' | 'USERS' | 'VERIFICATION' | 'COURTS' | 'VENUES' | 'BOOKINGS'
  const [mainTab, setMainTab] = useState('OVERVIEW');

  // Bookings sub-filter: 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  const [bookingFilter, setBookingFilter] = useState('ALL');

  // Search queries for tables
  const [userSearch, setUserSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Confirmation modal state for user status actions
  const [userToToggle, setUserToToggle] = useState(null);
  const [statusModalError, setStatusModalError] = useState(null);

  // Load Dashboard collections (users, venues, bookings)
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Platform Intelligence telemetry for the selected time range
  const loadIntelligence = useCallback(async (range) => {
    try {
      setIntelLoading(true);
      setIntelError(null);
      const res = await fetchAdminPlatformIntelligence({ range });
      setIntelligence(res);
    } catch (err) {
      setIntelError(err.message || 'Failed to load platform intelligence analytics.');
    } finally {
      setIntelLoading(false);
    }
  }, []);

  // Load Venue Verification Queue (Phase 19)
  const loadVerifications = useCallback(async (filter, search) => {
    try {
      setVerificationLoading(true);
      setVerificationError(null);
      const res = await fetchAdminVenueVerifications({ status: filter, search });
      setVerificationData(res);
    } catch (err) {
      setVerificationError(err.message || 'Failed to load venue verification queue.');
    } finally {
      setVerificationLoading(false);
    }
  }, []);

  // Load Court Approvals Queue
  const loadCourtApprovals = useCallback(async (filter, search) => {
    try {
      setCourtApprovalLoading(true);
      setCourtApprovalError(null);
      const res = await fetchAdminCourtApprovals({
        status: filter === 'ALL' ? undefined : filter,
        search: search.trim() || undefined,
      });
      setCourtApprovals(res?.courts || []);
    } catch (err) {
      setCourtApprovalError(err.message || 'Failed to load court approvals queue.');
    } finally {
      setCourtApprovalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadIntelligence(timeRange);
  }, [loadIntelligence, timeRange]);

  useEffect(() => {
    loadVerifications(verificationFilter, verificationSearch);
  }, [loadVerifications, verificationFilter, verificationSearch]);

  useEffect(() => {
    loadCourtApprovals(courtApprovalFilter, courtApprovalSearch);
  }, [loadCourtApprovals, courtApprovalFilter, courtApprovalSearch]);

  // Keyboard Escape listener to dismiss modals safely
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (userToToggle && !statusUpdatingId) {
          setUserToToggle(null);
          setStatusModalError(null);
        }
        if (verificationActionTarget && !verificationUpdating) {
          setVerificationActionTarget(null);
          setVerificationReason('');
          setVerificationModalError(null);
        }
        if (courtActionTarget && !courtActionUpdating) {
          setCourtActionTarget(null);
          setCourtActionNote('');
          setCourtActionModalError(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userToToggle, statusUpdatingId, verificationActionTarget, verificationUpdating, courtActionTarget, courtActionUpdating]);

  // Open court action modal
  const handleOpenCourtActionModal = (court, targetStatus) => {
    setCourtActionTarget({ court, targetStatus });
    setCourtActionNote('');
    setCourtActionModalError(null);
  };

  // Close court action modal
  const handleCloseCourtActionModal = () => {
    if (courtActionUpdating) return;
    setCourtActionTarget(null);
    setCourtActionNote('');
    setCourtActionModalError(null);
  };

  // Execute court approval status update
  const handleConfirmCourtAction = async () => {
    if (!courtActionTarget) return;
    const { court, targetStatus } = courtActionTarget;

    if (targetStatus === 'REJECTED' && !courtActionNote.trim()) {
      setCourtActionModalError('A clear rejection note is required when declining a court request.');
      return;
    }

    try {
      setCourtActionUpdating(true);
      setCourtActionModalError(null);
      const res = await updateCourtApprovalApi(court.id, {
        approvalStatus: targetStatus,
        approvalNote: courtActionNote.trim() || undefined,
      });

      if (res?.status === 'ok') {
        setFeedback({
          type: 'success',
          message: `Court "${court.name}" approval status updated to ${targetStatus}.`,
        });
        setCourtActionTarget(null);
        setCourtActionNote('');
        await loadCourtApprovals(courtApprovalFilter, courtApprovalSearch);
        await loadDashboard();
      } else {
        throw new Error(res?.message || 'Failed to update court approval');
      }
    } catch (err) {
      setCourtActionModalError(err.message || 'Failed to update court approval.');
    } finally {
      setCourtActionUpdating(false);
    }
  };

  // Open verification modal
  const handleOpenVerificationModal = (venue, targetStatus) => {
    setVerificationActionTarget({ venue, targetStatus });
    setVerificationReason('');
    setVerificationModalError(null);
  };

  // Close verification modal
  const handleCloseVerificationModal = () => {
    if (verificationUpdating) return;
    setVerificationActionTarget(null);
    setVerificationReason('');
    setVerificationModalError(null);
  };

  // Execute verification status update
  const handleConfirmVerificationAction = async () => {
    if (!verificationActionTarget) return;
    const { venue, targetStatus } = verificationActionTarget;

    if (['REJECTED', 'SUSPENDED'].includes(targetStatus) && !verificationReason.trim()) {
      setVerificationModalError(`A clear reason/note is required to set status to ${targetStatus}.`);
      return;
    }

    try {
      setVerificationUpdating(true);
      setVerificationModalError(null);
      const res = await updateVenueVerificationApi(venue.id, {
        status: targetStatus,
        note: verificationReason.trim(),
        reason: verificationReason.trim(),
      });

      // Update local verification state
      setVerificationData((prev) => {
        if (!prev) return prev;
        const updatedVenues = prev.venues.map((v) => (v.id === venue.id ? res.venue : v));
        const counts = {
          total: updatedVenues.length,
          pending: updatedVenues.filter((v) => (v.verificationStatus || 'PENDING') === 'PENDING').length,
          verified: updatedVenues.filter((v) => v.verificationStatus === 'VERIFIED').length,
          rejected: updatedVenues.filter((v) => v.verificationStatus === 'REJECTED').length,
          suspended: updatedVenues.filter((v) => v.verificationStatus === 'SUSPENDED').length,
        };
        return { ...prev, counts, venues: updatedVenues };
      });

      // Update main dashboard venues list
      setData((prev) => {
        if (!prev) return prev;
        const updatedVenues = (prev.venues || []).map((v) => (v.id === venue.id ? res.venue : v));
        return { ...prev, venues: updatedVenues };
      });

      setFeedback({
        type: 'success',
        message: `Facility "${venue.name}" verification status updated to ${targetStatus}.`,
      });
      setVerificationActionTarget(null);
      setVerificationReason('');
    } catch (err) {
      setVerificationModalError(err.message || 'Failed to update venue verification status.');
    } finally {
      setVerificationUpdating(false);
    }
  };

  // Open status modal for user
  const handleRequestToggleStatus = (user) => {
    if (user.id === currentAdmin?.id) {
      setFeedback({
        type: 'error',
        message: 'Administrators cannot change their own account status.',
      });
      return;
    }
    setStatusModalError(null);
    setUserToToggle(user);
  };

  // Close status modal safely
  const handleCloseStatusModal = () => {
    if (statusUpdatingId) return;
    setUserToToggle(null);
    setStatusModalError(null);
  };

  // Confirm status toggle action
  const handleConfirmUserStatusToggle = async () => {
    if (!userToToggle) return;
    const user = userToToggle;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';

    try {
      setStatusUpdatingId(user.id);
      setStatusModalError(null);
      setFeedback(null);
      const res = await toggleUserStatusApi(user.id, newStatus);
      
      // Update local state smoothly
      setData((prev) => {
        if (!prev) return prev;
        const updatedUsers = prev.users.map((u) => (u.id === user.id ? res.user : u));
        return { ...prev, users: updatedUsers };
      });

      // Refresh intelligence to keep counters in sync
      loadIntelligence(timeRange);

      setFeedback({
        type: 'success',
        message: `User "${user.name}" status successfully updated to ${newStatus.toUpperCase()}.`,
      });
      setUserToToggle(null);
    } catch (err) {
      setStatusModalError(err.message || 'Failed to update user status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const summary = data?.summary || {
    totalUsers: 0,
    totalCustomers: 0,
    totalOwners: 0,
    totalAdmins: 0,
    totalVenues: 0,
    totalCourts: 0,
    activeCourts: 0,
    inactiveCourts: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    upcomingBookings: 0,
    bookingRevenue: 0,
    pendingVenuesCount: 0,
  };

  const users = data?.users || [];
  const venues = data?.venues || [];
  const bookings = data?.bookings || [];
  const pendingVenues = data?.pendingVenues || [];

  const verificationVenues = verificationData?.venues || [];
  const verificationCounts = verificationData?.counts || {
    total: venues.length,
    pending: venues.filter((v) => (v.verificationStatus || 'PENDING') === 'PENDING').length,
    verified: venues.filter((v) => v.verificationStatus === 'VERIFIED').length,
    rejected: venues.filter((v) => v.verificationStatus === 'REJECTED').length,
    suspended: venues.filter((v) => v.verificationStatus === 'SUSPENDED').length,
  };

  const suspendedUsersCount = users.filter((u) => u.status === 'suspended').length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.businessName?.toLowerCase().includes(q)
    );
  });

  // Filtered venues
  const filteredVenues = venues.filter((v) => {
    if (!venueSearch.trim()) return true;
    const q = venueSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.ownerName?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.sportTypes?.some((s) => s.toLowerCase().includes(q))
    );
  });

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'UPCOMING') return b.operationalStatus === 'UPCOMING';
    if (bookingFilter === 'COMPLETED') return b.operationalStatus === 'COMPLETED';
    if (bookingFilter === 'CANCELLED') return b.operationalStatus === 'CANCELLED' || b.status === 'CANCELLED';
    return true;
  });

  // Extract intelligence subsections safely
  const pOverview = intelligence?.platformOverview || summary;
  const bOverview = intelligence?.bookingOverview || {};
  const payOverview = intelligence?.paymentOverview || {};
  const utilOverview = intelligence?.courtUtilization || {};
  const sportsAnalytics = intelligence?.sportsAnalytics || [];
  const geoAnalytics = intelligence?.venueAndCityAnalytics || { cities: [], topVenues: [] };
  const timeDemand = intelligence?.timeDemandAnalytics || { hourlyDemand: [] };
  const healthOverview = intelligence?.operationalHealth || { alerts: [] };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {/* ─── 1. Admin Command Header ────────────────────────────────────────── */}
        <div className="mb-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
            <Link to="/" className="hover:text-emerald-400 transition-colors">QuickCourt</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-400">System Oversight</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-emerald-400 font-bold">Platform Intelligence & Control Center</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-white shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Platform Intelligence (Phase 18)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  System Telemetry Active
                </span>
                {currentAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 min-w-0">
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">Admin: {currentAdmin.email}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Admin Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-normal">
                Real-time operational analytics, fleet utilization, financial velocity, and sports telemetry.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
              {/* Date Filter Bar */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-sm">
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setTimeRange(btn.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      timeRange === btn.id
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  loadDashboard();
                  loadIntelligence(timeRange);
                }}
                disabled={loading || intelLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Refresh platform telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading || intelLoading ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Feedback Alert ─────────────────────────────────────────────────── */}
        {feedback && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 p-1 transition"
              aria-label="Dismiss feedback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Operational Health & Urgent Alerts ───────────────────────────────── */}
        {healthOverview.alerts && healthOverview.alerts.length > 0 && (
          <section aria-label="Operational Health Alerts" className="mb-6 space-y-2">
            {healthOverview.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-md ${
                  alert.level === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : alert.level === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <div>
                    <strong className="text-white">{alert.title}: </strong>
                    <span>{alert.message}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-950 border border-slate-800 text-white shrink-0">
                  {alert.count} Pending
                </span>
              </div>
            ))}
          </section>
        )}

        {/* ─── Error Alert with Retry ─────────────────────────────────────────── */}
        {(error || intelError) && (
          <div role="alert" className="mb-8 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3.5 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Failed to retrieve platform telemetry</h3>
              <p className="text-xs text-rose-300 mt-0.5">{error || intelError}</p>
              <button
                type="button"
                onClick={() => {
                  loadDashboard();
                  loadIntelligence(timeRange);
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-sm"
              >
                Retry Telemetry Fetch
              </button>
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ───────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading admin dashboard telemetry">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="h-4 bg-slate-800 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-800 rounded-md w-3/4" />
                </div>
              ))}
            </div>
            <div className="h-80 bg-slate-900/90 border border-slate-800 rounded-3xl" />
          </div>
        )}

        {/* ─── Dashboard Content ──────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="space-y-8 animate-in fade-in">
            
            {/* ─── 2. Platform Core Overview Telemetry ────────────────────────── */}
            <section aria-label="Platform Core Telemetry">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricPanel
                  title="Platform Accounts"
                  value={pOverview.totalUsers || summary.totalUsers}
                  subtitle={`${pOverview.totalCustomers ?? summary.totalCustomers} Players • ${pOverview.totalOwners ?? summary.totalOwners} Hosts • ${pOverview.totalAdmins ?? summary.totalAdmins} Admins`}
                  icon={Users}
                  accent="indigo"
                />

                <MetricPanel
                  title="Sports Facilities"
                  value={pOverview.totalVenues || summary.totalVenues}
                  subtitle={`${pOverview.totalCourts ?? summary.totalCourts} Total Courts (${pOverview.activeCourts ?? summary.activeCourts} active)`}
                  icon={Building2}
                  accent="emerald"
                />

                <MetricPanel
                  title="Booking Volume"
                  value={bOverview.totalBookings ?? summary.totalBookings}
                  subtitle={`${bOverview.confirmed ?? summary.confirmedBookings} Confirmed • ${bOverview.completed ?? summary.completedBookings} Completed`}
                  icon={CalendarCheck}
                  accent="sky"
                />

                <MetricPanel
                  title="Booking Value (GMV)"
                  value={`₹${(payOverview.totalBookingValue ?? summary.bookingRevenue).toLocaleString('en-IN')}`}
                  subtitle={`₹${(payOverview.collectedBookingValue ?? summary.bookingRevenue).toLocaleString('en-IN')} Collected`}
                  icon={IndianRupee}
                  accent="lime"
                />
              </div>

              {/* Secondary Fleet Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Utilization</p>
                    <p className="text-xl font-black text-lime-400 mt-0.5 font-mono">
                      {utilOverview.utilizationRate !== undefined ? `${utilOverview.utilizationRate}%` : '0%'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {utilOverview.occupiedCourtHours || 0} / {utilOverview.totalCapacityHours || 0} hrs
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Settlement</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                      ₹{(payOverview.pendingBookingValue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{bOverview.paymentPending || 0} slots awaiting payment</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Playing Courts</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                      {pOverview.activeCourts ?? summary.activeCourts}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{pOverview.inactiveCourts ?? summary.inactiveCourts} maintenance</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled / Refund</p>
                    <p className="text-xl font-black text-rose-400 mt-0.5 font-mono">
                      {bOverview.cancelled ?? summary.cancelledBookings}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">₹{(payOverview.refundedValue || 0).toLocaleString('en-IN')} refunded</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Review & Quality Ratings Telemetry Strip (Phase 20) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Customer Reviews</p>
                    <p className="text-xl font-black text-white mt-0.5 font-mono">
                      {summary.totalReviews ?? 0}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Authoritative published reviews</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform Average Rating</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5 font-mono flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 inline" />
                      {summary.averagePlatformRating ? summary.averagePlatformRating.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Across all facilities</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low-Rated Feedback (1–2★)</p>
                    <p className="text-xl font-black text-rose-400 mt-0.5 font-mono">
                      {summary.lowRatedReviewsCount ?? 0}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Reviews requiring quality review</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ─── 3. Main Section Control Panel ──────────────────────────────── */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl p-5 sm:p-7">
              
              {/* Navigation Segmented Tab Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Admin Control Tabs">
                  {[
                    { key: 'OVERVIEW', label: 'Platform Intelligence', count: null },
                    { key: 'USERS', label: 'User Directory', count: users.length },
                    {
                      key: 'VERIFICATION',
                      label: 'Venue Verification',
                      count: verificationData?.counts?.pending ?? 0,
                      isAlert: (verificationData?.counts?.pending ?? 0) > 0,
                    },
                    {
                      key: 'COURTS',
                      label: 'Court Approvals',
                      count: courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length,
                      isAlert: courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length > 0,
                    },
                    { key: 'VENUES', label: 'Venues & Courts', count: venues.length },
                    { key: 'BOOKINGS', label: 'Bookings Ledger', count: bookings.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={mainTab === tab.key}
                      type="button"
                      onClick={() => setMainTab(tab.key)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        mainTab === tab.key
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          mainTab === tab.key
                            ? 'bg-slate-950 text-emerald-400'
                            : tab.isAlert
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── TAB 1: PLATFORM INTELLIGENCE (PHASE 18) ──────────────────── */}
              {mainTab === 'OVERVIEW' && (
                <div className="pt-6 space-y-8">
                  
                  {/* Grid 1: Booking Status Matrix & Payment Methods */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Booking Lifecycle Breakdown */}
                    <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-sky-400" />
                          <span>Booking Lifecycle State Distribution</span>
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          Range: {timeRange.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Requested</span>
                          <span className="text-lg font-black text-amber-400 font-mono">{bOverview.requested || 0}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Approved</span>
                          <span className="text-lg font-black text-sky-400 font-mono">{bOverview.approved || 0}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Payment Pending</span>
                          <span className="text-lg font-black text-yellow-400 font-mono">{bOverview.paymentPending || 0}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Confirmed & Paid</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">{(bOverview.confirmed || 0) + (bOverview.paid || 0)}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Checked In</span>
                          <span className="text-lg font-black text-lime-400 font-mono">{bOverview.checkedIn || 0}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Completed</span>
                          <span className="text-lg font-black text-indigo-400 font-mono">{bOverview.completed || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Settlement & Payment Methods */}
                    <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span>Payment Settlement Channels</span>
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          100% Direct
                        </span>
                      </div>

                      <div className="space-y-3">
                        {payOverview.paymentMethodsBreakdown && [
                          { label: 'UPI / Instant Pay', key: 'UPI', color: 'bg-emerald-400' },
                          { label: 'Card / NetBanking', key: 'CARD', color: 'bg-sky-400' },
                          { label: 'Pay at Venue', key: 'PAY_AT_VENUE', color: 'bg-amber-400' },
                        ].map((pm) => {
                          const item = payOverview.paymentMethodsBreakdown[pm.key] || { count: 0, value: 0 };
                          const totalVal = payOverview.collectedBookingValue || 1;
                          const pct = Math.round((item.value / totalVal) * 100) || 0;

                          return (
                            <div key={pm.key} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-300">{pm.label}</span>
                                <span className="font-mono font-bold text-white">₹{item.value.toLocaleString('en-IN')} ({item.count})</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${pm.color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Court Fleet Utilization Leaderboard & Hourly Demand */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Busiest Courts Leaderboard */}
                    <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>Court Fleet Utilization Index</span>
                        </h3>
                        <span className="text-[11px] font-mono text-lime-400 font-bold">
                          {utilOverview.utilizationRate || 0}% Overall
                        </span>
                      </div>

                      {utilOverview.busiestCourts && utilOverview.busiestCourts.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                                <th className="pb-2">Court / Facility</th>
                                <th className="pb-2">Sport</th>
                                <th className="pb-2 text-right">Occupied</th>
                                <th className="pb-2 text-right">Utilization</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {utilOverview.busiestCourts.map((c) => (
                                <tr key={c.courtId} className="hover:bg-slate-900/50">
                                  <td className="py-2.5">
                                    <p className="font-bold text-white">{c.courtName}</p>
                                    <p className="text-[11px] text-slate-400">{c.venueName} • {c.city}</p>
                                  </td>
                                  <td className="py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                                      {c.sport}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-bold text-white">
                                    {c.occupiedHours} hrs
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-bold text-lime-400">
                                    {c.utilizationRate}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-500">
                          No court bookings recorded in this time range.
                        </div>
                      )}
                    </div>

                    {/* Hourly Demand Histogram Bar Chart */}
                    <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-400" />
                          <span>Hourly Booking Demand (6 AM - 11 PM)</span>
                        </h3>
                      </div>

                      {timeDemand.hourlyDemand && timeDemand.hourlyDemand.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-end gap-1 h-32 pt-4 px-1 bg-slate-900/60 rounded-xl border border-slate-800">
                            {timeDemand.hourlyDemand.map((hd) => {
                              const maxDemand = Math.max(...timeDemand.hourlyDemand.map((i) => i.bookingCount), 1);
                              const heightPct = Math.max(8, (hd.bookingCount / maxDemand) * 100);

                              return (
                                <div key={hd.hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                  <div
                                    className={`w-full rounded-t transition-all ${
                                      hd.bookingCount > 0
                                        ? hd.isPeak
                                          ? 'bg-amber-400 hover:bg-amber-300'
                                          : 'bg-emerald-400 hover:bg-emerald-300'
                                        : 'bg-slate-800/60'
                                    }`}
                                    style={{ height: `${heightPct}%` }}
                                    title={`${hd.hourLabel}: ${hd.bookingCount} bookings (${hd.isPeak ? 'Peak' : 'Off-Peak'})`}
                                  />
                                  <span className="text-[8px] font-mono text-slate-500 mt-1 truncate">
                                    {hd.hour % 3 === 0 ? `${hd.hour}` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                              <span>Peak Demand: <strong className="text-white font-mono">{timeDemand.peakBookingsCount || 0}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                              <span>Off-Peak: <strong className="text-white font-mono">{timeDemand.offPeakBookingsCount || 0}</strong></span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-500">
                          Demand telemetry available once reservations are placed.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid 3: Sports Telemetry & Geographic Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sports Analytics */}
                    <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-lime-400" />
                          <span>Sports Category Telemetry</span>
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {sportsAnalytics.map((sp) => (
                          <div key={sp.sport} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-white text-sm">{sp.sport}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                                {sp.activeCourts} Courts
                              </span>
                            </div>
                            <div className="flex items-center gap-4 font-mono">
                              <span className="text-slate-300">{sp.bookingCount} Bookings</span>
                              <span className="font-bold text-emerald-400">₹{sp.bookingValue.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Geographic & Top Venues */}
                    <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span>City & Facility Footprint</span>
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {geoAnalytics.cities?.map((c) => (
                          <div key={c.city} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-white text-sm">{c.city}</span>
                              <p className="text-[11px] text-slate-400 mt-0.5">{c.venueCount} Venues • {c.courtCount} Courts</p>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-bold text-white">{c.bookingCount} Bookings</span>
                              <p className="text-emerald-400 font-bold">₹{c.bookingValue.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ─── TAB 2: USERS DIRECTORY ───────────────────────────────────── */}
              {mainTab === 'USERS' && (
                <div className="pt-5 space-y-4">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter by name, email, or role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">User Account</th>
                          <th scope="col" className="py-3 px-4">Role</th>
                          <th scope="col" className="py-3 px-4">Platform Status</th>
                          <th scope="col" className="py-3 px-4">Account Attributes</th>
                          <th scope="col" className="py-3 px-4 text-right">Administrative Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-500">
                              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto mb-2">
                                <Users className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-xs text-slate-300">No matching user accounts</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">No registered users matched your search criteria.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelf = u.id === currentAdmin?.id;
                            const isActive = u.status === 'active';
                            return (
                              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span>{u.name}</span>
                                    {isSelf && (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                                  {u.phone && <div className="text-slate-500 font-mono text-[10px]">{u.phone}</div>}
                                </td>
                                <td className="py-3.5 px-4">
                                  <RoleBadge role={u.role} />
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                      isActive
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                    {u.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-400">
                                  {u.role === 'OWNER' && (
                                    <div>
                                      <p className="font-semibold text-slate-200">{u.businessName || 'Business Partner'}</p>
                                      {u.venueLocation && <p className="text-[11px] text-slate-500">{u.venueLocation}</p>}
                                    </div>
                                  )}
                                  {u.role === 'CUSTOMER' && (
                                    <div>
                                      <span className="font-mono text-emerald-400 font-bold">{u.points || 0} pts</span>
                                      {u.preferredSports?.length > 0 && (
                                        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                          {u.preferredSports.join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {u.role === 'ADMIN' && (
                                    <span className="text-slate-500 italic">Full System Access</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {isSelf ? (
                                    <span className="text-[11px] text-slate-500 italic">Protected</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRequestToggleStatus(u)}
                                      disabled={statusUpdatingId === u.id}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                                        isActive
                                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      }`}
                                    >
                                      {statusUpdatingId === u.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : isActive ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5" />
                                          <span>Suspend</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5" />
                                          <span>Reactivate</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB 2.5: VENUE TRUST & VERIFICATION (PHASE 19) ───────────── */}
              {mainTab === 'VERIFICATION' && (
                <div className="pt-5 space-y-6">
                  {/* Status Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Pending Review</span>
                        <Clock className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {verificationCounts.pending}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Awaiting admin review</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Verified Venues</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {verificationCounts.verified}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Active & trusted</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Rejected Venues</span>
                        <XCircle className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {verificationCounts.rejected}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Application declined</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Suspended Venues</span>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {verificationCounts.suspended}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Operations paused</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setVerificationFilter(f)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                            verificationFilter === f
                              ? 'bg-slate-800 text-white border border-slate-700 font-black'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {f === 'ALL' ? 'All Venues' : f}
                          {f === 'PENDING' && verificationCounts.pending > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400 font-mono">
                              {verificationCounts.pending}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search venue, owner, city..."
                        value={verificationSearch}
                        onChange={(e) => setVerificationSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Verification Queue Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">Venue & Facility</th>
                          <th scope="col" className="py-3 px-4">Host / Owner</th>
                          <th scope="col" className="py-3 px-4">City / Region</th>
                          <th scope="col" className="py-3 px-4">Sports & Courts</th>
                          <th scope="col" className="py-3 px-4">Verification Status</th>
                          <th scope="col" className="py-3 px-4">Audit Note / Date</th>
                          <th scope="col" className="py-3 px-4 text-right">Moderation Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {verificationVenues.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-500">
                              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto mb-2">
                                <ShieldCheck className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-xs text-slate-300">No facilities found in this verification filter</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">Try selecting another filter tab or clearing the search box.</p>
                            </td>
                          </tr>
                        ) : (
                          verificationVenues.map((v) => {
                            const vStatus = v.verificationStatus || 'PENDING';
                            return (
                              <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span>{v.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">({v.id})</span>
                                  </div>
                                  <div className="text-slate-400 text-[11px] truncate max-w-[200px]">
                                    {v.location || v.address || 'Address not specified'}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-200">{v.ownerName}</div>
                                  <div className="text-slate-400 font-mono text-[11px]">{v.ownerEmail}</div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300 font-medium">
                                  {v.city || 'N/A'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono text-emerald-400 font-bold">{v.activeCourts} / {v.totalCourts} Courts</div>
                                  <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                    {v.sportTypes?.join(', ') || 'Various'}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <VerificationStatusBadge status={vStatus} />
                                </td>
                                <td className="py-3.5 px-4 text-slate-400 max-w-[180px]">
                                  {v.verifiedAt && (
                                    <div className="text-[10px] text-emerald-400/80 font-mono">
                                      Verified: {new Date(v.verifiedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                  {v.verificationNote ? (
                                    <div className="text-[11px] text-slate-300 truncate" title={v.verificationNote}>
                                      {v.verificationNote}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">No notes</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {vStatus === 'PENDING' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenVerificationModal(v, 'VERIFIED')}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1"
                                          title="Verify this venue"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Verify</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenVerificationModal(v, 'REJECTED')}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1"
                                          title="Reject this venue"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    )}
                                    {vStatus === 'VERIFIED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVerificationModal(v, 'SUSPENDED')}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition flex items-center gap-1"
                                        title="Suspend this venue"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Suspend</span>
                                      </button>
                                    )}
                                    {(vStatus === 'REJECTED' || vStatus === 'SUSPENDED') && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVerificationModal(v, 'VERIFIED')}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1"
                                        title="Restore and verify this venue"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Restore</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB 2.8: COURT APPROVAL MODERATION ───────────── */}
              {mainTab === 'COURTS' && (
                <div className="pt-5 space-y-6">
                  {/* Status Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Pending Review</span>
                        <Clock className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Awaiting moderation</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Approved Courts</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'APPROVED').length}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Active & discoverable</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Rejected Courts</span>
                        <XCircle className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {courtApprovals.filter((c) => c.approvalStatus === 'REJECTED').length}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Moderation declined</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
                        <Layers className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {courtApprovals.length}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">All court applications</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setCourtApprovalFilter(f)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                            courtApprovalFilter === f
                              ? 'bg-slate-800 text-white border border-slate-700 font-black'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {f === 'ALL' ? 'All Courts' : f}
                          {f === 'PENDING' && courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400 font-mono">
                              {courtApprovals.filter((c) => (c.approvalStatus || 'APPROVED') === 'PENDING').length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search court, sport, venue, owner..."
                        value={courtApprovalSearch}
                        onChange={(e) => setCourtApprovalSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Court Approvals Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Court & Sport</th>
                          <th className="py-3 px-4">Venue & City</th>
                          <th className="py-3 px-4">Owner / Host</th>
                          <th className="py-3 px-4">Specifications</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Moderation Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {courtApprovalLoading ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                              <p>Loading court moderation requests…</p>
                            </td>
                          </tr>
                        ) : courtApprovals.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-500">
                              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                              <p className="font-bold text-xs text-slate-300">No courts matching criteria</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">All court creation requests have been processed.</p>
                            </td>
                          </tr>
                        ) : (
                          courtApprovals.map((court) => {
                            const cStatus = court.approvalStatus || 'APPROVED';
                            return (
                              <tr key={court.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span>{court.name}</span>
                                    <span className="font-mono text-[10px] text-slate-500 font-normal">#{court.id}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <span className="font-semibold text-emerald-400">{court.sport}</span>
                                    <span>•</span>
                                    <span>{court.courtType || 'Standard'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-bold text-slate-200">{court.venueName || 'Venue'}</p>
                                  <p className="text-[11px] text-slate-400">{court.venueLocation || court.venueCity || 'Location N/A'}</p>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-bold text-white">{court.ownerName || 'Owner'}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{court.ownerEmail || 'N/A'}</p>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="font-mono font-bold text-emerald-400">₹{court.pricePerHour}/hr</div>
                                    <div className="text-slate-400">{court.indoor ? 'Indoor' : 'Outdoor'} • {court.operatingHours || '06:00 AM - 10:00 PM'}</div>
                                    {court.approvalNote && (
                                      <div className="text-[10px] text-slate-400 italic truncate max-w-xs" title={court.approvalNote}>
                                        Note: {court.approvalNote}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <CourtApprovalStatusBadge status={cStatus} />
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {cStatus === 'PENDING' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCourtActionModal(court, 'APPROVED')}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1"
                                          title="Approve and activate this court"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Approve</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCourtActionModal(court, 'REJECTED')}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1"
                                          title="Reject this court request"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    )}
                                    {cStatus === 'APPROVED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCourtActionModal(court, 'REJECTED')}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1"
                                        title="Revoke and reject this court"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    )}
                                    {cStatus === 'REJECTED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCourtActionModal(court, 'APPROVED')}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1"
                                        title="Approve and activate this court"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: VENUES & COURTS ───────────────────────────────────── */}
              {mainTab === 'VENUES' && (
                <div className="pt-5 space-y-4">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter by facility name, host, or city..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Venues Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredVenues.length === 0 ? (
                      <div className="col-span-2 py-12 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                        <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                        <p className="font-bold text-xs text-slate-300">No matching sports facilities</p>
                      </div>
                    ) : (
                      filteredVenues.map((v) => (
                        <div key={v.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-black text-white text-base">{v.name}</h4>
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{v.location || v.city}</span>
                              </p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {v.activeCourts} Active Courts
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                            <div className="p-2 rounded-xl bg-slate-900">
                              <span className="text-[10px] text-slate-500 block uppercase">Total Courts</span>
                              <span className="font-mono font-bold text-white">{v.totalCourts}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-900">
                              <span className="text-[10px] text-slate-500 block uppercase">Base Rate</span>
                              <span className="font-mono font-bold text-emerald-400">₹{v.pricePerHour}/hr</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-900">
                              <span className="text-[10px] text-slate-500 block uppercase">Rating</span>
                              <span className="font-mono font-bold text-amber-400">{v.rating > 0 ? `${v.rating} ★` : 'New'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Host: <strong className="text-slate-200">{v.ownerName}</strong> ({v.ownerEmail})</span>
                            <Link
                              to={`/venues/${v.id}`}
                              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                            >
                              <span>View Public</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 4: BOOKINGS LEDGER ───────────────────────────────────── */}
              {mainTab === 'BOOKINGS' && (
                <div className="pt-5 space-y-4">
                  {/* Sub-filter Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBookingFilter(f)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                          bookingFilter === f
                            ? 'bg-slate-800 text-white border border-slate-700 font-black'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Bookings Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Booking ID</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Facility & Court</th>
                          <th className="py-3 px-4">Schedule</th>
                          <th className="py-3 px-4 text-right">Value</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-xs bg-slate-900/60">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-500">
                              <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                              <p className="font-bold text-xs text-slate-300">No matching bookings</p>
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                                #{b.id}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-white">{b.customerName}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{b.customerEmail}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-200">{b.venueName}</p>
                                <p className="text-[11px] text-slate-400">{b.courtName} • {b.sport}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-mono text-white">{formatBookingDate(b.date)}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{b.startTime} - {b.endTime}</p>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-white">
                                ₹{b.totalPrice}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <BookingStatusBadge operationalStatus={b.operationalStatus} status={b.status} />
                                {b.status === 'REJECTED' && (
                                  <div className="mt-1.5 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-left space-y-0.5">
                                    <div><strong>Reason:</strong> {b.rejectionReason}</div>
                                    {b.rejectionNote && <div><strong>Note:</strong> "{b.rejectionNote}"</div>}
                                    {b.rejectedAt && <div className="text-[10px] text-slate-400 font-mono">Time: {new Date(b.rejectedAt).toLocaleString()}</div>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ─── 5. Accessible Status Confirmation Modal ──────────────────────── */}
        {userToToggle && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            aria-describedby="status-modal-desc"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseStatusModal();
              }
            }}
          >
            <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                    userToToggle.status === 'active'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {userToToggle.status === 'active' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <UserCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="status-modal-title" className="text-base font-black text-white">
                    {userToToggle.status === 'active' ? 'Suspend User Account?' : 'Reactivate User Account?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {userToToggle.status === 'active'
                      ? 'Platform account suspension review'
                      : 'Platform account reactivation review'}
                  </p>
                </div>
              </div>

              <div id="status-modal-desc" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Target User:</span>
                  <span className="font-bold text-white">{userToToggle.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Email:</span>
                  <span className="font-mono text-slate-300">{userToToggle.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Role:</span>
                  <RoleBadge role={userToToggle.role} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-semibold text-slate-400">New Target Status:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      userToToggle.status === 'active'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${userToToggle.status === 'active' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    {userToToggle.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {userToToggle.status === 'active'
                  ? 'Marking this account as SUSPENDED will immediately restrict active user privileges across QuickCourt.'
                  : 'Marking this account as ACTIVE will restore standard platform privileges for this account.'}
              </p>

              {statusModalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{statusModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={statusUpdatingId === userToToggle.id}
                  onClick={handleCloseStatusModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={statusUpdatingId === userToToggle.id}
                  onClick={handleConfirmUserStatusToggle}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    userToToggle.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'
                  }`}
                >
                  {statusUpdatingId === userToToggle.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Status…</span>
                    </>
                  ) : (
                    <span>
                      {userToToggle.status === 'active' ? 'Confirm Suspension' : 'Confirm Reactivation'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 6. Accessible Venue Verification Action Modal (Phase 19) ───────── */}
        {verificationActionTarget && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-modal-title"
            aria-describedby="verification-modal-desc"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseVerificationModal();
              }
            }}
          >
            <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                    verificationActionTarget.targetStatus === 'VERIFIED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : verificationActionTarget.targetStatus === 'REJECTED'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}
                >
                  {verificationActionTarget.targetStatus === 'VERIFIED' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : verificationActionTarget.targetStatus === 'REJECTED' ? (
                    <XCircle className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="verification-modal-title" className="text-base font-black text-white">
                    {verificationActionTarget.targetStatus === 'VERIFIED'
                      ? (['REJECTED', 'SUSPENDED'].includes(verificationActionTarget.venue.verificationStatus)
                          ? 'Restore & Verify Facility?'
                          : 'Verify Sports Facility?')
                      : verificationActionTarget.targetStatus === 'REJECTED'
                      ? 'Reject Venue Verification?'
                      : 'Suspend Sports Facility?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {verificationActionTarget.targetStatus === 'VERIFIED'
                      ? 'Grant authoritative verified badge to this facility'
                      : verificationActionTarget.targetStatus === 'REJECTED'
                      ? 'Decline venue verification application'
                      : 'Temporarily suspend venue operations and customer bookings'}
                  </p>
                </div>
              </div>

              <div id="verification-modal-desc" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Venue / Facility:</span>
                  <span className="font-bold text-white">{verificationActionTarget.venue.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Location:</span>
                  <span className="text-slate-300">{verificationActionTarget.venue.location || verificationActionTarget.venue.city}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Host / Owner:</span>
                  <span className="text-slate-300">{verificationActionTarget.venue.ownerName} ({verificationActionTarget.venue.ownerEmail})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Current Status:</span>
                  <VerificationStatusBadge status={verificationActionTarget.venue.verificationStatus || 'PENDING'} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-semibold text-slate-400">Target State:</span>
                  <VerificationStatusBadge status={verificationActionTarget.targetStatus} />
                </div>
              </div>

              {/* Moderation Reason / Note Field */}
              <div className="space-y-1.5">
                <label htmlFor="verification-reason-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {['REJECTED', 'SUSPENDED'].includes(verificationActionTarget.targetStatus) ? (
                    <>Reason / Note <span className="text-rose-400">*</span></>
                  ) : (
                    <>Audit Note <span className="text-slate-500 font-normal">(Optional)</span></>
                  )}
                </label>
                <textarea
                  id="verification-reason-input"
                  rows={3}
                  value={verificationReason}
                  onChange={(e) => {
                    setVerificationReason(e.target.value);
                    if (verificationModalError) setVerificationModalError(null);
                  }}
                  maxLength={500}
                  placeholder={
                    verificationActionTarget.targetStatus === 'VERIFIED'
                      ? 'Optional verification notes (e.g. Facility verified via physical inspection)...'
                      : verificationActionTarget.targetStatus === 'REJECTED'
                      ? 'Explain why this venue is rejected (e.g. Incomplete address, unverified contact)...'
                      : 'Explain why this venue is suspended (e.g. Facility under maintenance / policy violation)...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>
                    {['REJECTED', 'SUSPENDED'].includes(verificationActionTarget.targetStatus)
                      ? 'Note will be visible to the facility owner.'
                      : 'Recorded in authoritative admin verification audit logs.'}
                  </span>
                  <span>{verificationReason.length}/500</span>
                </div>
              </div>

              {verificationModalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{verificationModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={verificationUpdating}
                  onClick={handleCloseVerificationModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={verificationUpdating}
                  onClick={handleConfirmVerificationAction}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    verificationActionTarget.targetStatus === 'VERIFIED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'
                      : verificationActionTarget.targetStatus === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500'
                      : 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500'
                  }`}
                >
                  {verificationUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Verification…</span>
                    </>
                  ) : (
                    <span>
                      {verificationActionTarget.targetStatus === 'VERIFIED'
                        ? 'Confirm Verification'
                        : verificationActionTarget.targetStatus === 'REJECTED'
                        ? 'Confirm Rejection'
                        : 'Confirm Suspension'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ─── 7. Court Approval Action Modal ─────────────────────────────── */}
        {courtActionTarget && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="court-modal-title"
            aria-describedby="court-modal-desc"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseCourtActionModal();
              }
            }}
          >
            <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                    courtActionTarget.targetStatus === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {courtActionTarget.targetStatus === 'APPROVED' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="court-modal-title" className="text-base font-black text-white">
                    {courtActionTarget.targetStatus === 'APPROVED'
                      ? 'Approve Court Request?'
                      : 'Reject Court Request?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {courtActionTarget.targetStatus === 'APPROVED'
                      ? 'Make court active, discoverable, and available for player bookings'
                      : 'Decline court request and require moderation feedback'}
                  </p>
                </div>
              </div>

              <div id="court-modal-desc" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Court Name:</span>
                  <span className="font-bold text-white">{courtActionTarget.court.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Venue & Facility:</span>
                  <span className="text-slate-300">{courtActionTarget.court.venueName || 'Venue'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Sport & Surface:</span>
                  <span className="text-slate-300">{courtActionTarget.court.sport} ({courtActionTarget.court.courtType || 'Standard'})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Rate:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{courtActionTarget.court.pricePerHour}/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Owner:</span>
                  <span className="text-slate-300">{courtActionTarget.court.ownerName} ({courtActionTarget.court.ownerEmail})</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-semibold text-slate-400">Target State:</span>
                  <CourtApprovalStatusBadge status={courtActionTarget.targetStatus} />
                </div>
              </div>

              {/* Moderation Note Field */}
              <div className="space-y-1.5">
                <label htmlFor="court-action-note-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {courtActionTarget.targetStatus === 'REJECTED' ? (
                    <>Rejection Note <span className="text-rose-400">*</span></>
                  ) : (
                    <>Approval / Audit Note <span className="text-slate-500 font-normal">(Optional)</span></>
                  )}
                </label>
                <textarea
                  id="court-action-note-input"
                  rows={3}
                  value={courtActionNote}
                  onChange={(e) => {
                    setCourtActionNote(e.target.value);
                    if (courtActionModalError) setCourtActionModalError(null);
                  }}
                  maxLength={500}
                  placeholder={
                    courtActionTarget.targetStatus === 'APPROVED'
                      ? 'Optional approval note (e.g. Court specifications verified)...'
                      : 'Explain why this court request was rejected (e.g. Incomplete surface details, rate outside venue bounds)...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Note will be notified and visible to the facility owner.</span>
                  <span>{courtActionNote.length}/500</span>
                </div>
              </div>

              {courtActionModalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{courtActionModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={courtActionUpdating}
                  onClick={handleCloseCourtActionModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={courtActionUpdating}
                  onClick={handleConfirmCourtAction}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    courtActionTarget.targetStatus === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500'
                  }`}
                >
                  {courtActionUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <span>
                      {courtActionTarget.targetStatus === 'APPROVED'
                        ? 'Confirm Approval'
                        : 'Confirm Rejection'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminDashboardInner />
    </ProtectedRoute>
  );
}
