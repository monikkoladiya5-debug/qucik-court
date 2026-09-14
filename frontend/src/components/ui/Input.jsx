import React, { forwardRef } from 'react';

/**
 * QuickCourt Form Input Primitive
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    className = '',
    containerClassName = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-500 pointer-events-none flex items-center">
            <Icon className="w-4 h-4" strokeWidth={1.5} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full bg-[#0F131C] border ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-[#28303F] focus:border-lime-400 focus:ring-lime-400'
          } text-slate-100 placeholder-slate-500 text-sm rounded-lg py-2.5 ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } focus:outline-none focus:ring-1 transition-all ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-rose-400 font-medium mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

/**
 * QuickCourt Select Dropdown Primitive
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = '',
    containerClassName = '',
    id,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full bg-[#0F131C] border ${
          error ? 'border-rose-500' : 'border-[#28303F] focus:border-lime-400 focus:ring-lime-400'
        } text-slate-100 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all ${className}`}
        {...props}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0F131C] text-slate-100">
              {opt.label}
            </option>
          ))}
      </select>
      {error ? (
        <p className="text-xs text-rose-400 font-medium mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
