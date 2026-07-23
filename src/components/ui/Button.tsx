import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary:
    "bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20 focus-visible:ring-sky-400",
  secondary:
    "bg-slate-700 text-slate-100 hover:bg-slate-600 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white focus-visible:ring-slate-400",
  danger:
    "bg-rose-500/90 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20 focus-visible:ring-rose-400",
  outline:
    "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800/70 hover:border-slate-600 focus-visible:ring-slate-400",
};

const sizes: Record<string, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
