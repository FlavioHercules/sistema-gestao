interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "sky" | "emerald" | "amber" | "violet" | "rose";
  hint?: string;
}

const accents: Record<string, string> = {
  sky: "bg-[#E8F0FA] text-[#00469F] ring-[#00469F]/15",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
  rose: "bg-[#FFEAEA] text-[#CC0000] ring-[#CC0000]/15",
};

export function StatCard({ label, value, icon, accent = "sky", hint }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] text-[#64748B]">{label}</p>
          <p className="mt-2 text-[2rem] font-bold leading-none tracking-[-0.02em] text-[#003575]">{value}</p>
          {hint && <p className="mt-2 text-xs leading-5 text-[#64748B]">{hint}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ring-1 ${accents[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
