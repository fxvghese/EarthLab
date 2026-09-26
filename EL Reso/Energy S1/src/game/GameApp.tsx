import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EnergyBackground from "@/components/EnergyBackground";
import { BackButton } from "@/components/GameBackButton";
import { useGame } from "./useGame";
import {
  WEATHER,
  TOTAL_DAYS,
  MAX_OUTPUT,
  COAL_MAX_OUTPUT,
  BATTERY_CAPACITY,
  availability,
  type SourceId,
} from "./engine";

/* ─────────────────────────── helpers ─────────────────────────── */

const SOURCE_META: Record<
  SourceId,
  { label: string; icon: string; accent: string; dim: string; desc: string }
> = {
  solar: { label: "Solar Array", icon: "☀️", accent: "#fbbf24", dim: "#6b5a1e", desc: "Panels depend on clear sky" },
  wind: { label: "Wind Turbines", icon: "🌬️", accent: "#38bdf8", dim: "#1c4a63", desc: "Turbines need moving air" },
  hydro: { label: "Hydro Turbine", icon: "🌊", accent: "#34d399", dim: "#1d5c49", desc: "Run-of-river flow drives the turbine" },
};

function fmt(n: number): string {
  return Math.round(n).toString();
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function sign(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
}

function wxColor(w: string): string {
  if (["clear", "breezy", "river-normal"].includes(w)) return "#34d399";
  if (["cloudy", "rain", "strong-wind"].includes(w)) return "#fbbf24";
  return "#f87171";
}

function wxTag(w: string): string {
  if (["clear", "breezy", "river-normal"].includes(w)) return "FAVOURABLE";
  if (["cloudy", "rain", "strong-wind"].includes(w)) return "MIXED";
  return "HARSH";
}

/* ─────────────────────────── small components ─────────────────────────── */

function Panel({
  title,
  accent = "#27436b",
  children,
  className = "",
}: {
  title?: string;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-panel/80 backdrop-blur-sm ${className}`}
      style={{ borderColor: accent + "55" }}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          <span className="font-mono text-[10px] tracking-[0.22em] text-dim uppercase">{title}</span>
        </div>
        )}
      <div className="p-3">{children}</div>
    </div>
  );
}

function WeatherChip({ w, dim = false }: { w: keyof typeof WEATHER; dim?: boolean }) {
  const meta = WEATHER[w];
  return (
    <div className={`flex items-center gap-2 ${dim ? "opacity-60" : ""}`}>
      <span className="text-lg leading-none">{meta.icon}</span>
      <div className="leading-tight">
        <div className="text-[13px] font-medium" style={{ color: wxColor(w) }}>
          {meta.label}
        </div>
        <div className="font-mono text-[9px] tracking-[0.18em] text-faint">{wxTag(w)}</div>
      </div>
    </div>
  );
}

function Bar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-[#122034]" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ type: "spring", stiffness: 180, damping: 26 }}
        style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
      />
    </div>
  );
}

/* ─────────────────────────── main app ─────────────────────────── */

export default function GameApp() {
  const { state, spec, mix, projection, setSource, commit, reset } = useGame();

  const [justCommitted, setJustCommitted] = useState<null | { survived: boolean; day: number }>(null);
  const [ack, setAck] = useState(0);

  const avail = availability(spec.weather);
  const gameOver = state.status !== "playing";

  const warnings = useMemo(() => {
    const list: { text: string; level: "warn" | "danger" | "info" }[] = [];
    const deficit = Math.max(0, -projection.balance);
    const projectedCoal = projection.coalUsed;

    if (projection.outcome === "blackout")
      list.push({ text: "BLACKOUT IMMINENT — reserves cannot cover the shortfall", level: "danger" });
    if (deficit > 0 && projection.batteryAfter <= 1)
      list.push({ text: "Battery will be empty — no buffer left for tomorrow", level: "danger" });
    if (projection.batteryDelta < -0.5)
      list.push({ text: `Battery draining ${fmt(Math.abs(projection.batteryDelta))} MWh this cycle`, level: "warn" });
    if (projectedCoal > 0)
      list.push({ text: `Coal consumption: ${fmt(projectedCoal)} units this cycle`, level: "warn" });
    if (state.coal - projectedCoal <= 30 && state.coal > 0)
      list.push({ text: `Coal reserve critical: ${fmt(state.coal - projectedCoal)} units remain`, level: "warn" });
    if (projection.outcome === "surplus" && projection.balance > 15)
      list.push({ text: `Surplus ${fmt(projection.balance)} MWh charges the battery`, level: "info" });
    return list;
  }, [projection, state.coal]);

  const gameOverStats = useMemo(() => {
    if (!gameOver) return null;
    const days = state.log.length;
    const renewShare = state.totalGenerated > 0 ? state.totalRenewable / state.totalGenerated : 0;
    return {
      days,
      renewShare,
      coal: state.totalCoalBurned,
      blackouts: state.blackouts,
      won: state.status === "won",
    };
  }, [gameOver, state]);

  function handleCommit() {
    const day = state.day;
    const survived = projection.shortfall <= 0;
    commit();
    setJustCommitted({ survived, day });
    setAck((a) => a + 1);
  }

  function handleRestart() {
    reset();
    setJustCommitted(null);
  }

  const sliderMeta: {
    id: SourceId | "coal";
    label: string;
    icon: string;
    accent: string;
    max: number;
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
    footnote: string;
  }[] = [
    {
      id: "solar",
      ...SOURCE_META.solar,
      max: MAX_OUTPUT.solar,
      value: mix.solar,
      onChange: (v) => setSource("solar", v),
      footnote: `Sky factor ${pct(avail.solar)} · output ${fmt(mix.solar * avail.solar)} MWh`,
    },
    {
      id: "wind",
      ...SOURCE_META.wind,
      max: MAX_OUTPUT.wind,
      value: mix.wind,
      onChange: (v) => setSource("wind", v),
      footnote: `Wind factor ${pct(avail.wind)} · output ${fmt(mix.wind * avail.wind)} MWh`,
    },
    {
      id: "hydro",
      ...SOURCE_META.hydro,
      max: MAX_OUTPUT.hydro,
      value: mix.hydro,
      onChange: (v) => setSource("hydro", v),
      footnote: `River factor ${pct(avail.hydro)} · output ${fmt(mix.hydro * avail.hydro)} MWh`,
    },
    {
      id: "coal",
      label: "Coal Plant",
      icon: "🏭",
      accent: "#94a3b8",
      max: Math.min(COAL_MAX_OUTPUT, state.coal),
      value: mix.coal,
      onChange: (v) => setSource("coal", v),
      disabled: state.coal <= 0,
      footnote: `Burns reserve · ${fmt(state.coal - mix.coal)} units left after cycle`,
    },
  ];

  return (
    <div className="relative min-h-screen text-[#e6eef8]">
      <EnergyBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col gap-3 p-3 md:p-5">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton label="Back to the main experience" />
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-hydro/40 bg-hydro/10">
              <span className="text-hydro eco-flicker">⚡</span>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-wide">
                ECO-GRID <span className="text-faint">·</span>{" "}
                <span className="text-hydro">SURVIVAL SIMULATOR</span>
              </h1>
              <p className="font-mono text-[10px] tracking-[0.2em] text-faint">
                ENERGY &amp; HUMAN SYSTEMS — SETTLEMENT POWER DISPATCH
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.16em] text-faint">
            <span>
              DAY <span className="text-base font-semibold text-[#e6eef8]">{state.day}</span>/{TOTAL_DAYS}
            </span>
            <span className="h-4 w-px bg-line" />
            <span>
              COAL <span className="text-coal">{fmt(state.coal)}</span>
            </span>
            <span className="h-4 w-px bg-line" />
            <span>
              BATT <span className="text-batt">{fmt(state.battery)}</span>
            </span>
          </div>
        </header>

        {/* ── Main grid ── */}
        <main className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_290px]">
          {/* ════ LEFT SIDEBAR ════ */}
          <aside className="flex flex-col gap-3">
            <Panel title="Current Day" accent="#34d399">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-faint">CYCLE</div>
                  <div className="text-3xl font-bold text-hydro">
                    {String(state.day).padStart(2, "0")}
                    <span className="text-base text-faint">/{TOTAL_DAYS}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-faint">DEMAND</div>
                  <div className="font-mono text-xl font-semibold">{spec.demand}<span className="text-xs text-faint"> MWh</span></div>
                </div>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded bg-line">
                <motion.div
                  className="h-full bg-hydro"
                  animate={{ width: `${(state.day / TOTAL_DAYS) * 100}%` }}
                />
              </div>
            </Panel>

            <Panel title="Current Weather" accent="#38bdf8">
              <WeatherChip w={spec.weather} />
              <div className="mt-3 space-y-2">
                {(["solar", "wind", "hydro"] as SourceId[]).map((id) => {
                  const m = SOURCE_META[id];
                  const a = avail[id];
                  return (
                    <div key={id}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-dim">
                          {m.icon} {m.label}
                        </span>
                        <span className="font-mono" style={{ color: a > 0.6 ? "#34d399" : a > 0.25 ? "#fbbf24" : "#f87171" }}>
                          {pct(a)}
                        </span>
                      </div>
                      <Bar value={a} color={a > 0.6 ? "#34d399" : a > 0.25 ? "#fbbf24" : "#f87171"} height={4} />
                    </div>
                )})}
              </div>
            </Panel>

            <Panel title="Incoming Forecast" accent="#a78bfa">
              {spec.forecast ? (
                <>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.2em] text-faint">TOMORROW</div>
                  <WeatherChip w={spec.forecast} />
                  <p className="mt-2 text-[11px] leading-snug text-dim">
                    Plan storage and coal around it.
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-dim">Final cycle — no tomorrow.</p>
              )}
            </Panel>

            <Panel title="Survival Log" accent="#27436b" className="hidden lg:block">
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {state.log.length === 0 && (
                  <p className="text-[11px] text-faint">No cycles committed yet.</p>
                )}
                {state.log.map((r) => (
                  <div key={r.day} className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-faint">D{String(r.day).padStart(2, "0")}</span>
                    <span>{WEATHER[r.weather].icon}</span>
                    <span className="text-dim">{fmt(r.generated)}/{r.demand} MWh</span>
                    <span style={{ color: r.shortfall > 0 ? "#f87171" : "#34d399" }}>
                      {r.shortfall > 0 ? "FAIL" : "OK"}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>

          {/* ════ CENTER — DISPATCH ════ */}
          <section className="flex min-w-0 flex-col gap-3">
            {/* Demand vs generation strip */}
            <Panel title="Grid Demand vs Projected Supply" accent="#34d399">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-faint">DEMAND TODAY</div>
                  <div className="font-mono text-4xl font-bold leading-none">{spec.demand}</div>
                  <div className="font-mono text-[10px] text-faint">MWh · {WEATHER[spec.weather].label}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-[9px] tracking-[0.2em] text-faint">BALANCE</div>
                  <motion.div
                    key={sign(projection.balance)}
                    initial={{ scale: 0.85, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-mono text-4xl font-bold leading-none"
                    style={{ color: projection.balance >= 0 ? "#34d399" : "#f87171" }}
                  >
                    {sign(projection.balance)}
                  </motion.div>
                  <div className="font-mono text-[10px] text-faint">MWh · net</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-[0.2em] text-faint">SUPPLY</div>
                  <div className="font-mono text-4xl font-bold leading-none" style={{ color: projection.coverage >= 1 ? "#34d399" : "#fbbf24" }}>
                    {fmt(projection.total)}
                  </div>
                  <div className="font-mono text-[10px] text-faint">MWh · projected</div>
                </div>
              </div>

              {/* stacked coverage bar */}
              <div className="mt-3">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#0c1626]">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${Math.min(100, (projection.renewable / spec.demand) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 170, damping: 26 }}
                    style={{ background: "linear-gradient(90deg,#fbbf24,#38bdf8,#34d399)" }}
                  />
                  <motion.div
                    className="absolute inset-y-0 rounded-full"
                    animate={{
                      left: `${Math.min(100, (projection.renewable / spec.demand) * 100)}%`,
                      width: `${Math.min(100 - Math.min(100, (projection.renewable / spec.demand) * 100), (projection.coalUsed / spec.demand) * 100)}%`,
                    }}
                    transition={{ type: "spring", stiffness: 170, damping: 26 }}
                    style={{ background: "#64748b" }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white/80"
                    style={{ left: "100%" }}
                  />
                  <div className="absolute inset-0 border-x border-white/5" />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9px] text-faint">
                  <span>RENEWABLES + COAL vs DEMAND MARK</span>
                  <span>{pct(Math.min(1, projection.coverage))} COVERED</span>
                </div>
              </div>
            </Panel>

            {/* Sliders */}
            <Panel title="Generation Mix Controls" accent="#38bdf8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sliderMeta.map((s) => {
                  const isCoal = s.id === "coal";
                  return (
                    <div key={s.id} className="rounded-lg border border-line/70 bg-panel2/60 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[13px] font-medium">
                          <span>{s.icon}</span> {s.label}
                        </span>
                        <span className="font-mono text-sm font-semibold" style={{ color: s.accent }}>
                          {fmt(s.value)}
                          <span className="text-[10px] text-faint"> / {s.max}</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        className="eco-range w-full"
                        min={0}
                        max={s.max}
                        step={1}
                        value={s.value}
                        disabled={s.disabled}
                        onChange={(e) => s.onChange(Number(e.target.value))}
                        style={
                          {
                            "--accent": s.accent,
                            "--track": `linear-gradient(90deg, ${s.accent} ${s.max ? (s.value / s.max) * 100 : 0}%, #14243c ${(s.value / s.max) * 100}%)`,
                          } as React.CSSProperties
                        }
                      />
                      <div className="mt-0.5 flex justify-between font-mono text-[10px]">
                        <span className="text-dim">{s.footnote}</span>
                      </div>
                      {isCoal && state.coal <= 0 && (
                        <div className="mt-1 font-mono text-[10px] text-danger">RESERVE DEPLETED</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-snug text-faint">
                Sliders set committed capacity. Realized output scales with today's weather.
              </p>
            </Panel>
          </section>

          {/* ════ RIGHT COLUMN — STORAGE & STATUS ════ */}
          <aside className="flex flex-col gap-3">
            <Panel title="Battery Storage" accent="#a78bfa">
              <div className="flex items-center gap-3">
                <div className="relative h-24 w-12 overflow-hidden rounded-md border border-line bg-[#0c1626]">
                  <motion.div
                    className="absolute inset-x-0 bottom-0"
                    animate={{ height: `${(projection.batteryAfter / BATTERY_CAPACITY) * 100}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                    style={{
                      background: "linear-gradient(180deg,#a78bfa,#6d28d9)",
                      boxShadow: "0 0 18px #a78bfa55",
                    }}
                  />
                  {[25, 50, 75].map((t) => (
                    <div key={t} className="absolute inset-x-0 h-px bg-white/10" style={{ bottom: `${t}%` }} />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-2xl font-bold text-batt">
                    {fmt(projection.batteryAfter)}
                    <span className="text-xs text-faint"> / {BATTERY_CAPACITY}</span>
                  </div>
                  <div className="font-mono text-[10px] text-faint">MWh AFTER COMMIT</div>
                  <div
                    className="mt-1 font-mono text-[11px] font-semibold"
                    style={{ color: projection.batteryDelta >= 0 ? "#34d399" : "#f87171" }}
                  >
                    {projection.batteryDelta >= 0 ? "▲ charging" : "▼ draining"} {fmt(Math.abs(projection.batteryDelta))} MWh
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Coal Reserve" accent="#94a3b8">
              <div className="mb-1 flex items-end justify-between">
                <span className="font-mono text-2xl font-bold text-coal">{fmt(state.coal)}</span>
                <span className="font-mono text-[10px] text-faint">/ {fmt(180)} UNITS · FINITE</span>
              </div>
              <Bar value={state.coal / 180} color="#94a3b8" height={8} />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
                <span>THIS CYCLE −{fmt(projection.coalUsed)}</span>
                <span>NO REPLENISH</span>
              </div>
            </Panel>

            <Panel title="Projected Outcome" accent="#fbbf24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={projection.outcome}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {projection.outcome === "surplus" && (
                    <div>
                      <div className="text-[15px] font-semibold text-ok">SETTLEMENT STABLE</div>
                      <p className="mt-1 text-[12px] text-dim">
                        Demand met with {fmt(projection.balance)} MWh to spare — the surplus recharges storage.
                      </p>
                    </div>
                  )}
                  {projection.outcome === "deficit-battery" && (
                    <div>
                      <div className="text-[15px] font-semibold text-warn">DRAWING FROM BATTERY</div>
                      <p className="mt-1 text-[12px] text-dim">
                        Demand met, but the battery covers {fmt(-projection.balance)} MWh of the gap.
                      </p>
                    </div>
                  )}
                  {projection.outcome === "blackout" && (
                    <div>
                      <div className="text-[15px] font-semibold text-danger">BLACKOUT IMMINENT</div>
                      <p className="mt-1 text-[12px] text-dim">
                        {fmt(projection.shortfall)} MWh short even after the battery empties. The settlement fails.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </Panel>

            {/* Warnings */}
            <Panel title="Warnings" accent="#f87171">
              <div className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {warnings.length === 0 && (
                    <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-faint">
                      All systems nominal.
                    </motion.p>
                  )}
                  {warnings.map((w) => (
                    <motion.div
                      key={w.text}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      className="flex items-start gap-2 text-[12px] leading-snug"
                    >
                      <span style={{ color: w.level === "danger" ? "#f87171" : w.level === "warn" ? "#fbbf24" : "#34d399" }}>
                        {w.level === "danger" ? "⛔" : w.level === "warn" ? "⚠️" : "✅"}
                      </span>
                      <span className="text-dim">{w.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Panel>
          </aside>
        </main>

        {/* ── BOTTOM BAR ── */}
        <footer className="sticky bottom-3 z-20">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linebright/60 bg-panel/90 px-4 py-3 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px]">
              <span className="text-faint">
                TOTAL GEN <span className="text-[#e6eef8]">{fmt(state.totalGenerated)}</span> MWh
              </span>
              <span className="text-faint">
                RENEWABLE <span className="text-hydro">{pct(state.totalGenerated ? state.totalRenewable / state.totalGenerated : 0)}</span>
              </span>
              <span className="text-faint">
                COAL LEFT <span className="text-coal">{fmt(state.coal)}</span>
              </span>
              <span className="text-faint">
                STATUS{" "}
                <span className={state.status === "playing" ? "text-hydro" : gameOver ? "text-danger" : "text-ok"}>
                  {state.status === "playing" ? "NOMINAL" : state.status === "won" ? "SURVIVED" : "BLACKOUT"}
                </span>
              </span>
            </div>
            <motion.button
              whileHover={gameOver || projection.outcome === "blackout" ? {} : { scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCommit}
              disabled={gameOver}
              className={`relative rounded-lg px-8 py-2.5 font-mono text-[13px] font-bold tracking-[0.18em] transition-colors ${
                gameOver
                  ? "cursor-not-allowed bg-[#14243c] text-faint"
                  : projection.outcome === "blackout"
                    ? "bg-danger/90 text-[#050a13] shadow-[0_0_24px_#f8717166] hover:bg-danger"
                    : "bg-hydro/90 text-[#050a13] shadow-[0_0_24px_#34d39955] hover:bg-hydro"
              }`}
            >
              COMMIT CYCLE ▸
            </motion.button>
          </div>
        </footer>
      </div>

      {/* ── Day result toast ── */}
      <AnimatePresence>
        {justCommitted && !gameOver && (
          <motion.div
            key={ack}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-hydro/40 bg-panel2/95 px-5 py-3 text-center shadow-2xl backdrop-blur"
          >
            <div className="font-mono text-[10px] tracking-[0.2em] text-faint">DAY {justCommitted.day} COMMITTED</div>
            <div className="text-sm font-semibold text-hydro">Settlement survived the cycle</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game over / victory overlay ── */}
      <AnimatePresence>
        {gameOver && gameOverStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 grid place-items-center bg-[#020509]/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className={`w-full max-w-md rounded-2xl border p-6 text-center ${
                gameOverStats.won ? "border-hydro/50 bg-panel2" : "border-danger/50 bg-panel2"
              }`}
            >
              <div className="text-4xl">{gameOverStats.won ? "🌿" : "🔌"}</div>
              <h2 className={`mt-2 text-2xl font-bold ${gameOverStats.won ? "text-hydro" : "text-danger"}`}>
                {gameOverStats.won ? "SETTLEMENT ENDURES" : "GRID COLLAPSE"}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-dim">
                {gameOverStats.won
                  ? `All ${TOTAL_DAYS} cycles cleared. The settlement's lights stayed on through every storm, drought and fog bank.`
                  : state.lossReason}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg border border-line bg-panel p-2">
                  <div className="text-xl font-bold text-[#e6eef8]">{gameOverStats.days}</div>
                  <div className="text-faint">DAYS</div>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2">
                  <div className="text-xl font-bold text-hydro">{pct(gameOverStats.renewShare)}</div>
                  <div className="text-faint">RENEWABLE</div>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2">
                  <div className="text-xl font-bold text-coal">{fmt(gameOverStats.coal)}</div>
                  <div className="text-faint">COAL BURNED</div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRestart}
                className="mt-5 w-full rounded-lg bg-hydro py-3 font-mono text-[13px] font-bold tracking-[0.18em] text-[#050a13]"
              >
                RESTART SIMULATION ⟳
              </motion.button>
              <button
                onClick={() => window.location.assign("index.html")}
                className="mt-2 w-full rounded-lg border border-line py-2 font-mono text-[11px] tracking-[0.14em] text-dim hover:border-linebright hover:text-[#e6eef8]"
              >
                ← BACK TO BRIEFING
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
