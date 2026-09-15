import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`px-6 pt-6 pb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h3 className={`text-lg font-semibold text-[#172033] tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}
