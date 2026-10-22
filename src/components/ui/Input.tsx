import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, labelClassName = "", error, icon, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className={`block mb-1.5 text-sm font-medium text-[#172033] ${labelClassName}`}>{label}</span>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            {icon}
          </span>
        )}
        <input
          className={`w-full h-11 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[#172033] placeholder:text-[#64748B] transition-all focus:outline-none focus:ring-2 focus:ring-[#00469F]/20 focus:border-[#00469F] ${
            icon ? "pl-10" : ""
          } ${error ? "border-rose-500/60" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="block mt-1 text-xs text-[#CC0000]">{error}</span>}
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
        <span className="block mb-1.5 text-sm font-medium text-[#172033]">{label}</span>
      )}
      <select
        className={`w-full h-11 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[#172033] transition-all focus:outline-none focus:ring-2 focus:ring-[#00469F]/20 focus:border-[#00469F] ${
          error ? "border-rose-500/60" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block mt-1 text-xs text-[#CC0000]">{error}</span>}
    </label>
  );
}
