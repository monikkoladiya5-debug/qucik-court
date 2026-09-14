import React from 'react';

/**
 * QuickCourt Container Card Primitive
 * Supports variants: 'default', 'elevated', 'interactive', 'accent', 'emerald'
 */
export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: 'bg-[#181C24] border border-[#28303F]',
    elevated: 'bg-[#1E2430] border border-[#28303F] shadow-qc-card',
    interactive: 'bg-[#181C24] border border-[#28303F] hover:border-lime-400/50 hover:bg-[#1E2430] cursor-pointer transition-all',
    accent: 'bg-[#181C24] border-2 border-lime-400/80 shadow-qc-lime',
    emerald: 'bg-[#181C24] border border-emerald-500/50 shadow-qc-mint',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`mb-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`font-bold text-white text-base ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={`text-xs text-slate-400 mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`mt-4 pt-3 border-t border-[#28303F] flex items-center justify-between ${className}`}>{children}</div>;
}

