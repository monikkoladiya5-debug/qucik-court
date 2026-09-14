import React from 'react';

/**
 * QuickCourt Reusable Button Component
 * Supports variants: 'primary', 'secondary', 'outline', 'ghost', 'danger'
 * Supports sizes: 'sm', 'md', 'lg'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 shadow-qc-lime',
    secondary: 'bg-emerald-700 text-white hover:bg-emerald-600',
    outline: 'bg-transparent text-slate-200 border border-[#28303F] hover:border-lime-400/60 hover:text-lime-400 hover:bg-lime-400/5',
    ghost: 'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
}
