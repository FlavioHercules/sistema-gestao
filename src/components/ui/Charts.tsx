interface BarChartProps {
  data: { label: string; value: number; max?: number }[];
  color?: string;
  height?: number;
}

/** Lightweight CSS bar chart — no external charting library. */
export function BarChart({ data, color = "bg-sky-500", height = 180 }: BarChartProps) {
  const max = Math.max(10, ...data.map((d) => d.max ?? d.value));

  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max(0, Math.min(100, (d.value / max) * 100));
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[42px] rounded-t-md ${color} transition-all duration-500`}
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${d.value.toFixed(1)}`}
              />
            </div>
            <span className="text-[11px] text-slate-400 text-center truncate w-full">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface DonutProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ segments, size = 160 }: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(30 41 59)"
          strokeWidth="14"
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
            />
          );
          offset += len;
          return el;
        })}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: 22, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: 11 }}
        >
          total
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={`h-3 w-3 rounded-sm ${s.color}`} />
            <span className="text-slate-300">{s.label}</span>
            <span className="ml-auto font-semibold text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
