import { AnimatePresence, motion } from "framer-motion";
import { impactLines, type ClimateState } from "@/lib/climate";

interface Props {
  state: ClimateState;
  onReset: () => void;
}

const KEY_LABEL: Record<string, string> = {
  sea: "Sea level",
  heat: "Heat",
  agri: "Agriculture",
  eco: "Ecosystems",
};

/**
 * Final "climate impact" summary — recomputed live from the selected
 * temperature, so it doubles as a narrative readout of the current world.
 */
export function ImpactReport({ state, onReset }: Props) {
  const lines = impactLines(state);
  const headline = `At +${state.anomaly.toFixed(1)}°C`;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: state.stage.accent }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: state.stage.accent }} />
          </span>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-zinc-300">
            Climate impact report
          </h2>
        </div>
        <button
          onClick={onReset}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-all duration-150 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95"
        >
          Reset ⟲
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={headline}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="mt-2.5 font-display text-2xl font-bold"
          style={{ color: state.stage.accent }}
        >
          {headline} — {state.stage.label.toLowerCase()} world
        </motion.p>
      </AnimatePresence>

      <ul className="mt-3 space-y-2.5">
        {lines.map((line) => (
          <motion.li
            key={line.key}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-2.5 text-[13px] leading-snug text-zinc-400"
          >
            <span className="mt-px w-[86px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {KEY_LABEL[line.key]}
            </span>
            <span>{line.text}</span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-4 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-zinc-600">
        Educational visualization with simplified relative values — it shows cause and effect, not
        precise projections.
      </p>
    </section>
  );
}
