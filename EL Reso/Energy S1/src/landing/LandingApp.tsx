import { motion } from "framer-motion";
import EnergyBackground from "@/components/EnergyBackground";
import CursorCard from "@/components/ui/cursor-card";

const PREVIEW_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240">
  <rect width="480" height="240" fill="#0a1322"/>
  <rect x="16" y="16" width="140" height="208" rx="10" fill="#0d1a2e" stroke="#1b2c47"/>
  <rect x="168" y="16" width="200" height="120" rx="10" fill="#0d1a2e" stroke="#1b2c47"/>
  <rect x="168" y="144" width="200" height="80" rx="10" fill="#0d1a2e" stroke="#1b2c47"/>
  <rect x="380" y="16" width="84" height="208" rx="10" fill="#0d1a2e" stroke="#1b2c47"/>
  <circle cx="36" cy="40" r="3" fill="#34d399"/>
  <circle cx="36" cy="60" r="3" fill="#38bdf8"/>
  <circle cx="36" cy="80" r="3" fill="#a78bfa"/>
  <rect x="28" y="100" width="116" height="10" rx="5" fill="#1b2c47"/>
  <rect x="28" y="118" width="90" height="10" rx="5" fill="#1b2c47"/>
  <rect x="28" y="136" width="104" height="10" rx="5" fill="#1b2c47"/>
  <rect x="180" y="30" width="60" height="8" rx="4" fill="#27436b"/>
  <rect x="180" y="48" width="176" height="6" rx="3" fill="#34d399"/>
  <rect x="180" y="62" width="140" height="6" rx="3" fill="#38bdf8"/>
  <rect x="180" y="76" width="100" height="6" rx="3" fill="#fbbf24"/>
  <rect x="180" y="98" width="52" height="22" rx="6" fill="#34d399"/>
  <rect x="380" y="30" width="60" height="60" rx="6" fill="#1b2c47"/>
  <rect x="386" y="150" width="72" height="40" rx="6" fill="#2b1b4d"/>
</svg>`);

export default function LandingApp() {
  function launch() {
    window.location.assign("game.html");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <EnergyBackground />

      <div className="relative z-10 w-full max-w-xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-hydro/40 bg-hydro/10 text-2xl eco-flicker">
            ⚡
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Energy &amp; Human Systems
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-dim">
            An eco-grid survival simulator. Dispatch solar, wind and hydro through changing
            weather, ration a finite coal reserve, and keep the settlement powered for 12 days.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-7 flex flex-col items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={launch}
            className="rounded-xl bg-hydro px-10 py-3.5 font-mono text-[14px] font-bold tracking-[0.2em] text-[#050a13] shadow-[0_0_36px_#34d39955] hover:bg-hydro/90"
          >
            INITIALIZE GRID ▸
          </motion.button>

          <p className="font-mono text-[11px] tracking-[0.14em] text-faint">
            or hover{" "}
            <CursorCard
              image={PREVIEW_IMG}
              description="ECO-GRID dispatch console: weather-aware generation sliders, battery storage and a finite coal reserve across 12 survival cycles."
              href="game.html"
            >
              here
            </CursorCard>{" "}
            for a preview of the console
          </p>

          <div className="mt-4 grid w-full grid-cols-3 gap-2 font-mono text-[10px] text-faint">
            <div className="rounded-lg border border-line bg-panel/70 px-2 py-2">
              ☀️ WEATHER-DRIVEN OUTPUT
            </div>
            <div className="rounded-lg border border-line bg-panel/70 px-2 py-2">
              🔋 STORAGE MANAGEMENT
            </div>
            <div className="rounded-lg border border-line bg-panel/70 px-2 py-2">
              🏭 FINITE COAL RESERVE
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 font-mono text-[10px] tracking-[0.16em] text-faint/70"
        >
          EDUCATIONAL SIMULATION — SIMPLIFIED ENERGY MODEL, NOT A REAL GRID
        </motion.p>
      </div>
    </div>
  );
}
