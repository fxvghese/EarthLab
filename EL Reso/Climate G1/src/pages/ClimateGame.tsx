import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClimateScene } from "@/components/climate/ClimateScene";
import { TempSlider } from "@/components/climate/TempSlider";
import { MetricCard } from "@/components/climate/MetricCard";
import { ImpactReport } from "@/components/climate/ImpactReport";
import { BackButton } from "@/components/GameBackButton";
import { computeClimate, TEMP_START, type ClimateState } from "@/lib/climate";
import { Waves, Flame, Wheat, Leaf } from "lucide-react";

/** Trimmed state passed to the three.js scene so it can skip re-rendering on label churn */
interface SceneInputs {
  anomaly: number;
  seaLevelCm: number;
  heatIndex: number;
  agriculture: number;
  ecosystem: number;
  iceCover: number;
}

function toSceneInputs(s: ClimateState): SceneInputs {
  return {
    anomaly: s.anomaly,
    seaLevelCm: s.seaLevelCm,
    heatIndex: s.heatIndex,
    agriculture: s.agriculture,
    ecosystem: s.ecosystem,
    iceCover: s.iceCover,
  };
}

export default function ClimateGame() {
  const [anomaly, setAnomaly] = useState(TEMP_START);
  const [touched, setTouched] = useState(false);

  const state = useMemo(() => computeClimate(anomaly), [anomaly]);
  const sceneInputs = useMemo(() => toSceneInputs(state), [state]);

  const handleChange = useCallback((v: number) => {
    setTouched(true);
    setAnomaly(v);
  }, []);

  const reset = useCallback(() => {
    setAnomaly(TEMP_START);
    setTouched(false);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#05070d]">
      {/* ambient page glow reacting to stage */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        animate={{
          background: `radial-gradient(1200px 600px at 50% -10%, ${state.stage.accent}14, transparent 70%)`,
        }}
        transition={{ duration: 1.2 }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
              Climate <span className="text-zinc-500">&amp;</span> Atmosphere
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">A tiny world that answers to your slider</p>
          </div>
          <BackButton label="Back to the main experience" />
        </header>

        {/* Big anomaly readout */}
        <div className="flex items-end justify-center gap-1 sm:gap-2">
          <span className="text-sm font-semibold text-zinc-500">Temperature anomaly</span>
          <motion.span
            key={state.anomaly.toFixed(1)}
            initial={{ opacity: 0.4, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="font-display text-5xl font-bold tabular-nums sm:text-6xl"
            style={{ color: state.stage.accent, textShadow: `0 0 40px ${state.stage.accent}55` }}
          >
            +{state.anomaly.toFixed(1)}°
          </motion.span>
          <span className="pb-1.5 text-sm font-semibold text-zinc-500">C</span>
          {!touched && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3, times: [0, 0.15, 0.8, 1], delay: 0.6 }}
              className="absolute mt-28 text-[11px] uppercase tracking-widest text-zinc-500"
            >
              drag the slider to change the world ↓
            </motion.span>
          )}
        </div>

        {/* Scene */}
        <div className="relative h-[38vh] min-h-[240px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] sm:h-[44vh]">
          <ClimateScene inputs={sceneInputs} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#05070d]/70 to-transparent" />
        </div>

        {/* Slider panel */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 pb-4 pt-5 backdrop-blur-sm sm:px-8">
          <TempSlider value={anomaly} onChange={handleChange} stage={state.stage} />
        </section>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={<Waves className="h-4 w-4" />}
            title="Sea level"
            value={`+${state.seaLevelCm.toFixed(0)}`}
            sub="cm"
            pct={Math.min(100, (state.seaLevelCm / 96) * 100)}
            color="#38bdf8"
          />
          <MetricCard
            icon={<Flame className="h-4 w-4" />}
            title="Heat"
            value={`${state.heatIndex}`}
            sub="index"
            pct={state.heatIndex}
            color="#fb923c"
          />
          <MetricCard
            icon={<Wheat className="h-4 w-4" />}
            title="Agriculture"
            value={`${state.agriculture}`}
            sub="% health"
            pct={state.agriculture}
            color={state.agriculture > 55 ? "#a3e635" : state.agriculture > 25 ? "#facc15" : "#f87171"}
          />
          <MetricCard
            icon={<Leaf className="h-4 w-4" />}
            title="Ecosystem"
            value={`${state.ecosystem}`}
            sub="% health"
            pct={state.ecosystemStress}
            invert
            color={state.ecosystem > 55 ? "#34d399" : state.ecosystem > 25 ? "#facc15" : "#f87171"}
          />
        </div>

        {/* Impact report */}
        <ImpactReport state={state} onReset={reset} />

        <footer className="pb-4 text-center text-[10px] text-zinc-700">
          climate &amp; atmosphere · simplified educational simulation
        </footer>
      </div>
    </main>
  );
}
