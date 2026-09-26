import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplets, Leaf, Trophy, AlertTriangle, CloudRain } from "lucide-react";
import { BackButton } from "@/components/GameBackButton";
import ForestScene from "./ForestScene";
import Palette from "./Palette";
import Intro3D from "./Intro3D";
import {
  BiomassProfile,
  WaterGauge,
  CarbonGauge,
  BalanceRing,
  ReductionBanner,
  PopulationCard,
  ResourceBars,
  AlertBanner,
  WinChecklist,
  FaunaCard,
} from "./panels";
import {
  initialState,
  tick,
  derive,
  plantAbsorb,
  SPECIES,
  SPECIES_LIST,
  canAfford,
  TARGET,
  TARGET_STABLE_SECONDS,
  STRESS_LIMIT_SECONDS,
  SEED_COST,
  SEED_WATER,
  SETTLE_COST,
  DEER_COST,
  POP_MAX,
  HERD_MAX,
  type SimState,
  type SpeciesId,
} from "./sim";
import { cn } from "@/lib/utils";

export default function GamePage({ onHome }: { onHome: () => void }) {
  const [phase, setPhase] = useState<"intro" | "playing" | "won" | "lost">("intro");
  const [leaving, setLeaving] = useState(false);
  const [state, setState] = useState<SimState>(initialState);
  const [selected, setSelected] = useState<SpeciesId>("pine");
  const [now, setNow] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const d = useMemo(() => derive(state), [state]);

  /* ------------------------------- game loop ------------------------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    lastRef.current = null;
    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (lastRef.current === null) {
        lastRef.current = t;
        return;
      }
      const dt = Math.min(0.05, (t - lastRef.current) / 1000);
      lastRef.current = t;
      const next = tick(stateRef.current, dt);
      stateRef.current = next;
      setState(next);
      setNow((n) => n + dt);
      if (next.stableFor >= TARGET_STABLE_SECONDS) setPhase("won");
      else if (next.collapsed || next.stressFor >= STRESS_LIMIT_SECONDS) setPhase("lost");
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  /* ------------------------------- actions ------------------------------- */
  const plant = useCallback(
    (xNorm: number) => {
      setState((prev) => {
        // guard inside the updater: burst clicks must not double-spend stale credits
        if (!canAfford(prev, selected)) return prev;
        return {
          ...prev,
          credits: prev.credits - SPECIES[selected].cost,
          plants: [
            ...prev.plants,
            { uid: prev.plants.reduce((m, p) => Math.max(m, p.uid), 0) + 1, species: selected, x: 0.08 + xNorm * 0.84, growth: 0.04, seedTime: nowRef.current },
          ],
        };
      });
    },
    [selected]
  );

  const nowRef = useRef(0);
  nowRef.current = now;

  /** Recruit a settler directly (bypasses the slow natural growth). */
  const settle = useCallback(() => {
    setState((prev) => {
      if (prev.credits < SETTLE_COST || prev.population >= POP_MAX) return prev;
      return { ...prev, credits: prev.credits - SETTLE_COST, population: prev.population + 1 };
    });
  }, []);

  /** Release a deer pair onto grazing land (wolves follow the herd naturally). */
  const releaseDeer = useCallback(() => {
    setState((prev) => {
      if (prev.credits < DEER_COST || prev.deer >= HERD_MAX) return prev;
      return { ...prev, credits: prev.credits - DEER_COST, deer: prev.deer + 1 };
    });
  }, []);

  const begin = () => {
    setLeaving(true);
    setTimeout(() => {
      setPhase("playing");
      setLeaving(false);
    }, 850);
  };

  const restart = () => {
    setState(initialState());
    setPhase("playing");
    setNow(0);
  };

  /** Cloudseed: spend credits to summon a rain shower and refill the reservoir. */
  const cloudseed = useCallback(() => {
    setState((prev) => {
      if (prev.credits < SEED_COST) return prev;
      return {
        ...prev,
        credits: prev.credits - SEED_COST,
        water: Math.min(1, prev.water + SEED_WATER),
        rainTimer: 2.4, // start a rain pulse now
      };
    });
  }, []);

  const rates = useMemo(
    () =>
      SPECIES_LIST.map((sp) => ({
        id: sp.id,
        rate: state.plants.filter((p) => p.species === sp.id).reduce((sum, p) => sum + plantAbsorb(p), 0),
      })),
    [state]
  );

  const raining = state.rainTimer < 2.4;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="relative flex h-full flex-col overflow-hidden bg-ink"
    >
      {/* header */}
      <header className="relative z-30 flex items-center justify-between px-5 pt-4 pb-2">
        <BackButton label="Back to the main experience" />
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-leaf-soft/80">
          <Leaf className="h-3.5 w-3.5 text-leaf" />
          Land &amp; Life
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cloudseed}
            disabled={state.credits < SEED_COST || phase !== "playing"}
            title={`Summon rain · +${Math.round(SEED_WATER * 100)}% water`}
            className="flex items-center gap-1.5 rounded-full border border-water/40 bg-water/10 px-3 py-1 text-[11px] font-semibold text-water transition-all hover:bg-water/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CloudRain className="h-3.5 w-3.5" />
            Cloudseed · {SEED_COST} cc
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-sun/30 bg-sun/10 px-3 py-1 font-mono text-xs text-sun-soft">
            <Droplets className="h-3 w-3" />
            {Math.round(state.credits)} cc
          </div>
        </div>
      </header>

      {/* ecosystem alerts (drought / overpopulation / crisis / recovery) */}
      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-5">
        <AlertBanner d={d} s={state} />
      </div>

      {/* main grid */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-3 px-5 pb-4 lg:min-h-0 lg:flex-row">
        {/* ecosystem scene */}
        <div className="relative min-h-[300px] flex-1 lg:min-h-0 max-lg:h-[46vh]">
          <ForestScene
            state={state}
            selected={phase === "playing" ? selected : null}
            now={now}
            raining={raining}
            waterPct={state.water}
            carbonPct={state.carbon}
            health={d.health}
            animalLevel={d.animalLevel}
            onPlant={plant}
          />
          {/* floating reduction HUD over scene */}
          <div className="absolute left-4 top-4 w-[280px] max-sm:w-[calc(100%-2rem)]">
            <ReductionBanner d={d} s={state} />
          </div>
        </div>

        {/* right rail */}
        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto min-h-0 lg:w-[340px] max-lg:max-h-[38vh]">
          <PopulationCard s={state} d={d} />
          <ResourceBars s={state} d={d} />
          <FaunaCard s={state} d={d} />
          <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            <div className="rounded-xl border border-line bg-ink-2/70 p-3">
              <WaterGauge s={state} d={d} />
            </div>
            <div className="rounded-xl border border-line bg-ink-2/70 p-3">
              <CarbonGauge s={state} />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink-2/70 p-3">
            <BalanceRing d={d} />
          </div>
          <div className="rounded-xl border border-line bg-ink-2/70 p-3">
            <BiomassProfile d={d} history={state.history} />
          </div>
          <div className="rounded-xl border border-line bg-ink-2/70 p-3 text-xs text-mist/70">
            <div className="flex justify-between py-0.5">
              <span>Layered structure bonus</span>
              <span className={cn("font-mono", d.layerMass[0] > 0 && d.layerMass[1] > 0 && d.layerMass[2] > 0 ? "text-leaf-soft" : "text-sun-soft")}>
                {d.layerMass[0] > 0 && d.layerMass[1] > 0 && d.layerMass[2] > 0 ? "active" : "inactive"}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Soil carbon store</span>
              <span className="font-mono">{Math.round(d.soil * 100)}%</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Wildlife activity</span>
              <span className="font-mono">{Math.round(d.animalLevel * 100)}%</span>
            </div>
          </div>
          <WinChecklist d={d} s={state} />
        </aside>
      </div>

      {/* palette */}
      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-5 pb-5">
        <Palette
          s={state}
          rates={rates}
          selected={phase === "playing" ? selected : null}
          onSelect={setSelected}
          pop={state.population}
          popMax={POP_MAX}
          deer={state.deer}
          deerMax={d.deerCapacity}
          onSettle={settle}
          onRelease={releaseDeer}
        />
      </div>

      {/* three.js intro */}
      <AnimatePresence>{phase === "intro" && <Intro3D onBegin={begin} leaving={leaving} />}</AnimatePresence>

      {/* end overlays */}
      <AnimatePresence>
        {(phase === "won" || phase === "lost") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="mx-4 max-w-md rounded-2xl border border-line bg-ink-2 p-8 text-center"
            >
              {phase === "won" ? (
                <>
                  <div className="text-4xl">🌍</div>
                  <h2 className="mt-2 text-2xl font-bold text-mist">ECOSYSTEM RESTORED</h2>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-leaf-soft/80">Land &amp; Life · stable ecosystem</p>
                  <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-x-6 gap-y-1.5 text-left text-xs">
                    <span className="text-mist/60">🌳 Forest</span>
                    <span className="text-right font-mono text-mist">{Math.round(d.biomass * 100)}%</span>
                    <span className="text-mist/60">💧 Water</span>
                    <span className="text-right font-mono text-mist">{Math.round(state.water * 100)}%</span>
                    <span className="text-mist/60">🐾 Biodiversity</span>
                    <span className="text-right font-mono text-mist">{d.biodiversity}%</span>
                    <span className="text-mist/60">👥 Population</span>
                    <span className="text-right font-mono text-mist">{state.population} / {d.capacity}</span>
                    <span className="text-mist/60">🌫 Carbon reduction</span>
                    <span className="text-right font-mono text-leaf-soft">{d.reduction.toFixed(0)}%</span>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-mist/70">
                    STABLE ECOSYSTEM — the land is successfully supporting humans, plants and wildlife.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl">🌍</div>
                  <h2 className="mt-2 text-2xl font-bold text-mist">ECOSYSTEM COLLAPSE</h2>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-red-300/80">The land could no longer support the population</p>
                  <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-x-6 gap-y-1.5 text-left text-xs">
                    <span className="text-mist/60">👥 Population</span>
                    <span className="text-right font-mono text-mist">{state.population} / {d.capacity} capacity</span>
                    <span className="text-mist/60">💧 Water</span>
                    <span className="text-right font-mono text-red-300">{Math.round(state.water * 100)}%</span>
                    <span className="text-mist/60">🌱 Food</span>
 <span className="text-right font-mono text-red-300">{Math.round(state.food * 100)}%</span>
                    <span className="text-mist/60">🐾 Biodiversity</span>
                    <span className="text-right font-mono text-red-300">{d.biodiversity}%</span>
                    <span className="text-mist/60">🌫 Carbon reduction</span>
                    <span className="text-right font-mono text-mist">{d.reduction.toFixed(0)}%</span>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-mist/70">
                    Population outstripped carrying capacity while water and food stayed critical. Next run: keep water in the safe band and
                    expand the forest before the population grows past the land's capacity.
                  </p>
                </>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={restart}
                  className="flex-1 rounded-full border border-leaf/40 bg-leaf/15 px-5 py-2.5 text-sm font-semibold text-leaf-soft transition-all hover:bg-leaf/25"
                >
                  RESTART ECOSYSTEM
                </button>
                <button onClick={onHome} className="flex-1 rounded-full border border-white/10 px-5 py-2.5 text-sm text-mist/70 transition-colors hover:bg-white/5">
                  Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
