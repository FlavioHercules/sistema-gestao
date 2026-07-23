import { AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatBadge({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  const display =
    value === null ? "—" : value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  const color =
    value === null
      ? "text-slate-400 bg-slate-800/60"
      : value >= 7
        ? "text-emerald-300 bg-emerald-500/15"
        : value >= 5
          ? "text-amber-300 bg-amber-500/15"
          : "text-rose-300 bg-rose-500/15";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
      {display} · {label}
    </span>
  );
}
