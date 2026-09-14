import React from 'react';

/**
 * QuickCourt Reusable Status Badge Component
 * Handles booking states: REQUESTED, APPROVED, PAYMENT_PENDING, PAID, CONFIRMED, CHECKED_IN, COMPLETED, REJECTED, CANCELLED
 * Handles court states: AVAILABLE, BOOKED, MAINTENANCE, BLOCKED
 */
export default function Badge({ status, label, className = '', size = 'md' }) {
  const normStatus = (status || '').toUpperCase().trim();

  const statusConfig = {
    // Booking States
    REQUESTED: {
      text: 'Requested',
      style: 'bg-amber-950/80 text-amber-300 border-amber-500/80',
      dot: 'bg-amber-400',
    },
    APPROVED: {
      text: 'Approved',
      style: 'bg-sky-950/80 text-sky-300 border-sky-500/80',
      dot: 'bg-sky-400',
    },
    PAYMENT_PENDING: {
      text: 'Payment Pending',
      style: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/80',
      dot: 'bg-yellow-400',
    },
    PAID: {
      text: 'Paid / Confirmed',
      style: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80',
      dot: 'bg-emerald-400',
    },
    CONFIRMED: {
      text: 'Confirmed',
      style: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80',
      dot: 'bg-emerald-400',
    },
    'PAID / CONFIRMED': {
      text: 'Paid / Confirmed',
      style: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80',
      dot: 'bg-emerald-400',
    },
    CHECKED_IN: {
      text: 'Checked In',
      style: 'bg-emerald-900/90 text-emerald-200 border-emerald-400',
      dot: 'bg-emerald-300',
    },
    COMPLETED: {
      text: 'Completed',
      style: 'bg-slate-800 text-slate-300 border-slate-600',
      dot: 'bg-slate-400',
    },
    REJECTED: {
      text: 'Rejected',
      style: 'bg-rose-950/80 text-rose-300 border-rose-600/80',
      dot: 'bg-rose-400',
    },
    CANCELLED: {
      text: 'Cancelled',
      style: 'bg-rose-950/50 text-rose-400 border-rose-800/50',
      dot: 'bg-rose-500',
    },
    // Court States
    AVAILABLE: {
      text: 'Available',
      style: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
      dot: 'bg-emerald-400',
    },
    SELECTED: {
      text: 'Selected',
      style: 'bg-lime-950/60 text-lime-300 border-lime-400/80',
      dot: 'bg-lime-400',
    },
    BOOKED: {
      text: 'Booked',
      style: 'bg-slate-900 text-slate-400 border-slate-700/60',
      dot: 'bg-slate-500',
    },
    MAINTENANCE: {
      text: 'Maintenance',
      style: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
      dot: 'bg-amber-400',
    },
    BLOCKED: {
      text: 'Blocked',
      style: 'bg-slate-900 text-slate-400 border-slate-700/60',
      dot: 'bg-slate-500',
    },
  };

  const config = statusConfig[normStatus] || {
    text: normStatus || 'Status',
    style: 'bg-slate-900 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border uppercase tracking-wider ${sizeStyles[size] || sizeStyles.md} ${config.style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label || config.text}
    </span>
  );
}
