import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type Derived,
  type SimState,
  TARGET,
  TARGET_STABLE_SECONDS,
  WIN_BALANCE,
  WIN_WATER,
  WIN_BIO,
  WIN_FOOD,
  STRESS_LIMIT_SECONDS,
} from "./sim";

/* ---------------------------------- biomass profile ---------------------------------- */

const LAYERS: { key: 0 | 1 | 2 | 3; label: string; color: string }[] = [
  { key:0, label: "Emergent", color: "#f97316" },
  { key:1, label: "Canopy", color: "#10b981" },
];

export function BiomassProfile({ d, history }: { d: Derived; history: SimState["history"] }) {
  const w = 300;
  const h = 120;
  const maxLayer = Math.max(0.32, ...d.layerMass);

  // historical stacked layers, scaled by how the total biomass evolved
  const n = history.length;
  const xOf = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const yOf = (v: number) => h - (v / maxLayer) * (h - 8);

  let running = new Array(n).fill(0);
  const paths = LAYERS.map(({ key, color }) => {
    const pts = history.map((pt, i) => {
      const share = d.biomass > 0 ? pt.bio / d.biomass : 0;
      return running[i] + d.layerMass[key] * share;
    });
    running = pts;
    let path = `M0 ${h}`;
    pts.forEach((v, i) => {
      path += ` L${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`;
    });
    path += ` L${w} ${h} Z`;
    return { path, color };
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-mist/60">Forest structure · biomass profile</span>
        <div className="flex gap-2.5">
          {LAYERS.map((l) => (
            <span key={l.key} className="flex items-center gap-1 text-[9px] text-mist/70">
              <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full" preserveAspectRatio="none">
        <rect x={0} y={0} width={w} height={h} fill="#0b1712" rx={8} />
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="#86efac" strokeOpacity={0.07} />
        ))}
        {paths.map((p, i) => (
          <motion.path
            key={i}
            d={p.path}
            fill={p.color}
            fillOpacity={0.5}
            stroke={p.color}
            strokeOpacity={0.9}
            strokeWidth={1}
            initial={false}
            transition={{ duration: 0.4 }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ------------------------- population / resources ------------------------- */

export function PopulationCard({ s, d }: { s: SimState; d: Derived }) {
  const over = d.alerts.overpop;
  return (
    <div className="rounded-xl border border-line bg-ink-2/70 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-mist/60">Population</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={cn("font-mono text-2xl font-bold", over ? "text-red-400" : "text-mist")}>{s.population}</span>
            <span className="font-mono text-sm text-mist/50">/ {d.capacity}</span>
          </div>
        </div>
        {/* little people pictogram */}
        <div className="flex max-w-[120px] flex-wrap-reverse justify-end gap-1">
          {Array.from({ length: Math.max(d.capacity, s.population) }).slice(0, 12).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className={cn("h-2 w-1.5 rounded-t-full", i < s.population ? (over ? "bg-red-400" : "bg-leaf-soft") : "bg-white/10")}
            />
          ))}
        </div>
      </div>
      <div className="mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className={cn("h-full rounded-full", over ? "bg-red-400" : "bg-leaf-soft")}
            animate={{ width: `${Math.min(100, (s.population / Math.max(1, Math.max(d.capacity, s.population))) * 100)}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-mist/50">
          <span>carrying capacity {d.capacity}</span>
          {over ? <span className="font-medium text-red-400">overpopulated</span> : <span>food {Math.round(s.food * 100)}%</span>}
        </div>
      </div>
    </div>
  );
}

export function ResourceBars({ s, d }: { s: SimState; d: Derived }) {
  const rows: { label: string; value: number; color: string; low: boolean }[] = [
    { label: "Water", value: s.water, color: "#38bdf8", low: s.water < 0.2 },
    { label: "Food", value: s.food, color: "#a3e635", low: s.food < 0.2 },
    { label: "Biomass", value: d.biomass, color: "#34d399", low: d.biomass < 0.2 },
    { label: "Biodiversity", value: d.biodiversity / 100, color: "#fbbf24", low: d.biodiversity < 30 },
  ];
  return (
    <div className="rounded-xl border border-line bg-ink-2/70 p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-mist/60">Resources</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-20 text-[10px] text-mist/70">{r.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.low ? "#f87171" : r.color }}
                animate={{ width: `${Math.round(r.value * 100)}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 18 }}
              />
            </div>
            <span className={cn("w-8 text-right font-mono text-[10px]", r.low ? "text-red-400" : "text-mist/70")}>
              {Math.round(r.value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- fauna card ---------------------------------- */

export function FaunaCard({ s, d }: { s: SimState; d: Derived }) {
  const row = (
    label: string,
    n: number,
    cap: number,
    color: string,
    icon: string,
    over: boolean
  ) => (
    <div className="flex items-center gap-2">
      <span className="w-4 text-center text-[11px]">{icon}</span>
      <span className="w-14 text-[10px] text-mist/70">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={cn("h-full rounded-full", over ? "bg-red-400" : color)}
          animate={{ width: `${Math.min(100, (n / Math.max(1, cap)) * 100)}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
      </div>
      <span className={cn("w-8 text-right font-mono text-[10px]", over ? "text-red-400" : "text-mist/70")}>
        {n}/{cap}
      </span>
    </div>
  );
  return (
    <div className="rounded-xl border border-line bg-ink-2/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-mist/60">Wildlife</span>
        <span className="text-[9px] text-mist/45">herd feeds wolves</span>
      </div>
      <div className="space-y-2">
        {row("Deer", s.deer, d.deerCapacity, "bg-amber-300", "🦌", d.alerts.overbrowse)}
        {row("Wolves", s.wolves, Math.max(1, d.wolfCapacity), "bg-slate-300", "🐺", false)}
      </div>
      <div className="mt-2 text-[9px] leading-relaxed text-mist/45">
        {s.wolves === 0 && s.deer === 0
          ? "Grow the forest — herbivores arrive once grazing grounds thrive."
          : s.wolves === 0
            ? `A herd needs ${Math.max(1, Math.ceil(d.deerCapacity / 3.5) * 2 - s.deer) >= 3 ? "more prey" : "a stable herd"} before predators settle.`
            : "Predators cull the herd — that protects the seedlings."}
      </div>
    </div>
  );
}

/* ---------------------------------- alerts ---------------------------------- */

const ALERT_STYLE: Record<string, string> = {
  drought: "border-sun/50 bg-sun/15 text-sun-soft",
  overpop: "border-red-400/50 bg-red-400/10 text-red-300",
  bioCollapse: "border-red-400/50 bg-red-400/10 text-red-300",
  depletion: "border-red-400/60 bg-red-400/15 text-red-300",
  crisis: "border-red-400/60 bg-red-400/15 text-red-300",
  critical: "border-red-400 bg-red-400/20 text-red-200",
  recovering: "border-leaf/50 bg-leaf/15 text-leaf-soft",
  overbrowse: "border-sun/50 bg-sun/15 text-sun-soft",
  wolvesArrived: "border-leaf/50 bg-leaf/15 text-leaf-soft",
};

export function AlertBanner({ d, s }: { d: Derived; s: SimState }) {
  const a = d.alerts;
  const alert = a.critical
    ? { key: "critical", icon: "⚠", text: `CRITICAL ECOSYSTEM STRESS · collapse in ${Math.max(0, STRESS_LIMIT_SECONDS - s.stressFor).toFixed(0)}s` }
    : a.depletion
      ? { key: "depletion", icon: "🌍", text: "RESOURCE DEPLETION · the land cannot support the population" }
      : a.crisis
        ? { key: "crisis", icon: "⚠", text: "RESOURCE CRISIS · consumption is too high" }
        : a.bioCollapse
          ? { key: "bioCollapse", icon: "🐾", text: "BIODIVERSITY COLLAPSE · the food web is unstable" }
          : a.overbrowse
            ? { key: "overbrowse", icon: "🦌", text: `OVERBROWSING · herd (${s.deer}) exceeds grazing capacity (${d.deerCapacity})` }
            : a.overpop
              ? { key: "overpop", icon: "👥", text: `OVERPOPULATION · ${s.population} people vs sustainable ${d.capacity}` }
              : a.drought
                ? { key: "drought", icon: "☀", text: "DROUGHT · growth slowed · capacity falling" }
                : a.recovering
                  ? { key: "recovering", icon: "✓", text: "ECOSYSTEM RECOVERING · capacity increasing…" }
                  : a.wolvesArrived
                    ? { key: "wolvesArrived", icon: "🐺", text: "PREDATORS ARRIVED · the herd is now kept in check" }
                    : null;
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.key}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold tracking-wide", ALERT_STYLE[alert.key])}>
            <span>{alert.icon}</span>
            <span className="uppercase">{alert.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------- win checklist ------------------------------- */

export function WinChecklist({ d, s }: { d: Derived; s: SimState }) {
  const checks: { ok: boolean; label: string }[] = [
    { ok: d.reduction >= TARGET, label: `Carbon reduction ≥ ${TARGET}%` },
    { ok: d.balance >= WIN_BALANCE, label: `Ecosystem balance ≥ ${WIN_BALANCE}` },
    { ok: s.water >= WIN_WATER, label: `Water stability ≥ ${Math.round(WIN_WATER * 100)}%` },
    { ok: d.biodiversity >= WIN_BIO, label: `Biodiversity ≥ ${WIN_BIO}%` },
    { ok: !d.alerts.overpop, label: "Population below capacity" },
    { ok: s.food >= WIN_FOOD, label: `Food above ${Math.round(WIN_FOOD * 100)}%` },
    { ok: s.deer >= 2, label: "Herbivores thriving (2+)" },
    { ok: s.wolves >= 1, label: "Predators present (1+)" },
  ];
  const holding = d.reduction >= TARGET && d.stability > 0;
  return (
    <div className="rounded-xl border border-line bg-ink-2/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-mist/60">Stability gate</span>
        {holding && (
          <span className="font-mono text-[10px] text-leaf-soft">
            holding {d.stability.toFixed(0)}/{TARGET_STABLE_SECONDS}s
          </span>
        )}
      </div>
      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[10px]">
            <span className={cn("font-mono", c.ok ? "text-leaf" : "text-mist/30")}>{c.ok ? "✓" : "○"}</span>
            <span className={c.ok ? "text-mist/80" : "text-mist/40"}>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div className="h-full rounded-full bg-leaf" animate={{ width: `${(d.stability / TARGET_STABLE_SECONDS) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

/* ---------------------------------- gauges ---------------------------------- */

function Gauge({
  label,
  value, // 0..1
  display,
  color,
  danger,
  icon,
}: {
  label: string;
  value: number;
  display: string;
  color: string;
  danger?: boolean;
  icon: ReactNode;
}) {
  const R = 34;
  const C = Math.PI * R; // half circle
  return (
    <div className="flex items-center gap-3">
      <svg width="88" height="52" viewBox="0 0 88 52">
        <path d={`M10 46 A ${R} ${R} 0 0 1 78 46`} fill="none" stroke="#1d3a2e" strokeWidth="7" strokeLinecap="round" />
        <motion.path
          d={`M10 46 A ${R} ${R} 0 0 1 78 46`}
          fill="none"
          stroke={danger ? "#f87171" : color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
        <text x="44" y="44" textAnchor="middle" className="fill-mist font-mono" fontSize="15" fontWeight="600">
          {display}
        </text>
      </svg>
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-mist/60">
          {icon}
          {label}
        </div>
        {danger && <div className="mt-0.5 text-[10px] font-medium text-red-400">stress · absorption impaired</div>}
      </div>
    </div>
  );
}

export function WaterGauge({ s, d }: { s: SimState; d: Derived }) {
  const danger = s.water < 0.22 || s.water > 0.92;
  return (
    <Gauge
      label={`Water · ${d.moisture}`}
      value={s.water}
      display={`${Math.round(s.water * 100)}%`}
      color="#38bdf8"
      danger={danger}
      icon={<span className="inline-block h-1.5 w-1.5 rounded-full bg-water" />}
    />
  );
}

export function CarbonGauge({ s }: { s: SimState }) {
  return (
    <Gauge
      label="Atmospheric carbon"
      value={s.carbon}
      display={`${Math.round(s.carbon * 100)}`}
      color="#f59e0b"
      danger={s.carbon > 0.8}
      icon={<span className="inline-block h-1.5 w-1.5 rounded-full bg-sun" />}
    />
  );
}

/* ---------------------------------- balance ring ---------------------------------- */

export function BalanceRing({ d }: { d: Derived }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const hue = d.balance / 100;
  const color = d.balance > 70 ? "#34d399" : d.balance > 45 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-3">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={R} fill="none" stroke="#1d3a2e" strokeWidth="6" />
        <motion.circle
          cx="38"
          cy="38"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - hue) }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
          transform="rotate(-90 38 38)"
        />
        <text x="38" y="43" textAnchor="middle" className="fill-mist font-mono" fontSize="17" fontWeight="700">
          {d.balance}
        </text>
      </svg>
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-mist/60">Ecosystem balance</div>
        <div className="mt-0.5 text-xs text-mist/80">
          {d.balance > 70 ? "Thriving" : d.balance > 45 ? "Developing" : "Fragile"} · {d.diversity} species · soil {Math.round(d.soil * 100)}%
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- reduction readout ---------------------------------- */

export function ReductionBanner({ d, s }: { d: Derived; s: SimState }) {
  const pct = d.reduction;
  const atTarget = pct >= TARGET;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink-2/70 px-4 py-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-mist/60">Carbon reduction</div>
        <div className="flex items-baseline gap-2">
          <motion.span
            key={Math.round(pct)}
            initial={{ opacity: 0.4, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("font-mono text-3xl font-bold", atTarget ? "text-leaf text-glow-leaf" : "text-sun text-glow-sun")}
          >
            {pct.toFixed(1)}%
          </motion.span>
          <span className="text-[10px] text-mist/50">target {TARGET}%</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className={cn("h-full rounded-full", atTarget ? "bg-leaf" : "bg-gradient-to-r from-sun to-leaf")}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 18 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-mist/50">
          <span>absorbing {d.absorb.toFixed(2)}/s</span>
          {atTarget ? (
            <span className="text-leaf-soft">
              hold {Math.max(0, TARGET_STABLE_SECONDS - d.stability).toFixed(1)}s to stabilize…
            </span>
          ) : (
            <span>biomass {Math.round(d.biomass * 100)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
