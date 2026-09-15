import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  CalendarCheck,
  IndianRupee,
  DollarSign,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

function formatNotificationTime(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'BOOKING_REQUESTED':
    case 'NEW_BOOKING_REQUEST':
      return <Clock className="w-4 h-4 text-amber-400" />;
    case 'BOOKING_APPROVED':
      return <CheckCircle2 className="w-4 h-4 text-sky-400" />;
    case 'PAYMENT_REQUIRED':
      return <IndianRupee className="w-4 h-4 text-yellow-400" />;
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_RECEIVED':
      return <IndianRupee className="w-4 h-4 text-emerald-400" />;
    case 'BOOKING_CONFIRMED':
      return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
    case 'BOOKING_CANCELLED':
    case 'CUSTOMER_CANCELLED':
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case 'BOOKING_RESCHEDULED':
    case 'CUSTOMER_RESCHEDULED':
      return <RefreshCw className="w-4 h-4 text-lime-400" />;
    case 'CHECK_IN_COMPLETED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'BOOKING_NO_SHOW':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'BOOKING_REJECTED':
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    default:
      return <Bell className="w-4 h-4 text-lime-400" />;
  }
}

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkOneRead = async (id, e) => {
    if (e) e.stopPropagation();
    setMarkingId(id);
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || nowIso }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      handleMarkOneRead(item.id);
    }
    // Navigate to context if booking related
    if (role === 'OWNER') {
      navigate('/owner/dashboard');
    } else if (role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else {
      navigate('/my-bookings');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#28303F]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
                <Bell className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-lime-400 text-slate-950">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Authoritative updates on your booking, payment, and match activities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadNotifications()}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-[#181C24] hover:bg-[#202734] border border-[#28303F] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-lime-400' : ''}`} />
            </button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll || loading}
                className="text-xs border-[#28303F] hover:border-lime-400/40 text-slate-300 hover:text-white"
              >
                <Check className="w-3.5 h-3.5 mr-1 text-lime-400" />
                <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              filter === 'ALL'
                ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                : 'bg-[#181C24] text-slate-300 hover:text-white border border-[#28303F]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
              filter === 'UNREAD'
                ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                : 'bg-[#181C24] text-slate-300 hover:text-white border border-[#28303F]'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'UNREAD' ? 'bg-slate-950 text-lime-400' : 'bg-lime-400 text-slate-950'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-lime-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-300">Loading notifications...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center bg-rose-950/20 border-rose-800/40">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Failed to load updates</h3>
            <p className="text-xs text-rose-300/80 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadNotifications()}>
              Try Again
            </Button>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center bg-[#181C24]/50 border-[#28303F]">
            <div className="w-12 h-12 rounded-full bg-[#181C24] border border-[#28303F] text-slate-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-lime-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">You're all caught up.</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Important booking updates will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => {
              const isUnread = !item.isRead;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  className={`group relative flex items-start justify-between gap-4 p-4 rounded-xl transition-all cursor-pointer border ${
                    isUnread
                      ? 'bg-[#181C24] border-lime-400/30 hover:border-lime-400/60 shadow-md'
                      : 'bg-[#12161F]/60 border-[#28303F]/60 hover:border-[#28303F] hover:bg-[#181C24]/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Notification Type Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isUnread
                          ? 'bg-[#0B0F17] border-lime-400/40 shadow-sm'
                          : 'bg-[#181C24] border-[#28303F]'
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-bold tracking-tight ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                          {item.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-lime-400 shrink-0" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatNotificationTime(item.createdAt)}
                        </span>
                        {item.bookingId && (
                          <span className="font-mono text-slate-400">
                            #{item.bookingId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkOneRead(item.id, e)}
                        disabled={markingId === item.id}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-[#0B0F17] hover:bg-[#202734] border border-[#28303F] hover:border-lime-400/30 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-lime-400"
                        title="Mark as read"
                      >
                        {markingId === item.id ? 'Marking...' : 'Mark read'}
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-lime-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
