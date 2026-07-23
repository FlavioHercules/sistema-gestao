import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-medium text-slate-300">{label}</span>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </span>
        )}
        <input
          className={`w-full h-11 rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 text-slate-100 placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 ${
            icon ? "pl-10" : ""
          } ${error ? "border-rose-500/60" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="block mt-1 text-xs text-rose-400">{error}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className = "", children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-medium text-slate-300">{label}</span>
      )}
      <select
        className={`w-full h-11 rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 text-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 ${
          error ? "border-rose-500/60" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block mt-1 text-xs text-rose-400">{error}</span>}
    </label>
  );
}
