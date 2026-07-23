interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "sky" | "emerald" | "amber" | "violet" | "rose";
  hint?: string;
}

const accents: Record<string, string> = {
  sky: "from-sky-500/20 to-sky-500/5 text-sky-300 ring-sky-500/20",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 ring-emerald-500/20",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-300 ring-amber-500/20",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-300 ring-violet-500/20",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-300 ring-rose-500/20",
};

export function StatCard({ label, value, icon, accent = "sky", hint }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/20 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${accents[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
