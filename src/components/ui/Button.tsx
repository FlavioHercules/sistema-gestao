import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary:
    "bg-[#00469F] text-white hover:bg-[#003575] focus-visible:ring-[#00469F]",
  secondary:
    "bg-[#E8F0FA] text-[#003575] hover:bg-[#d5e4f7] focus-visible:ring-[#00469F]",
  ghost:
    "bg-transparent text-[#00469F] hover:bg-[#E8F0FA] hover:text-[#003575] focus-visible:ring-[#00469F]",
  danger:
    "bg-[#FF0000] text-white hover:bg-[#CC0000] focus-visible:ring-[#FF0000]",
  outline:
    "border border-[#E2E8F0] bg-white text-[#172033] hover:bg-[#E8F0FA] hover:border-[#00469F] focus-visible:ring-[#00469F]",
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
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
