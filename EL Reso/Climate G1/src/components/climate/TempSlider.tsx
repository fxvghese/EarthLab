import { motion } from "framer-motion";
import { TEMP_MAX, TEMP_MIN, TEMP_START, type StageMeta } from "@/lib/climate";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  stage: StageMeta;
}

const TICKS = [0, 1, 2, 3, 4, 5];

/**
 * The primary interaction: a large, fully custom-styled temperature slider.
 * Uses a native range input underneath so keyboard / touch work for free.
 */
export function TempSlider({ value, onChange, stage }: Props) {
  const pct = ((value - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100;

  return (
    <div className="select-none">
      <div className="relative pt-1">
        {/* Tick marks + labels */}
        <div className="pointer-events-none absolute inset-x-0 top-1 h-10">
          {TICKS.map((t) => {
            const left = (t / TEMP_MAX) * 100;
            const active = value >= t - 0.05 && t > 0;
            return (
              <div key={t} className="absolute -translate-x-1/2 text-center" style={{ left: `${left}%` }}>
                <div
                  className={cn(
                    "mx-auto h-2.5 w-px rounded transition-colors duration-300",
                    active ? "bg-white/50" : "bg-white/15"
                  )}
                />
                <div
                  className={cn(
                    "mt-1 font-mono text-[10px] transition-colors duration-300",
                    active ? "text-zinc-300" : "text-zinc-600"
                  )}
                >
                  {t === 0 ? "0°" : `+${t}°`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live value marker riding the thumb */}
        <motion.div
          className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2"
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div
            className="rounded-lg border px-2.5 py-1 font-display text-sm font-bold tabular-nums shadow-lg"
            style={{
              borderColor: `${stage.accent}55`,
              backgroundColor: "#0b0e17",
              color: stage.accent,
              boxShadow: `0 4px 24px ${stage.accent}33, 0 2px 8px rgba(0,0,0,0.6)`,
            }}
          >
            +{value.toFixed(1)}°C
          </div>
        </motion.div>

        <input
          type="range"
          min={TEMP_MIN}
          max={TEMP_MAX}
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Global temperature increase"
          className="climate-range relative z-20 mt-7"
          style={
            {
              "--fill-pct": `${pct}%`,
              "--fill-color": stage.accent,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="mt-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <span>baseline 0°</span>
        <motion.span
          key={stage.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-semibold normal-case tracking-normal"
          style={{ color: stage.accent }}
        >
          {stage.label} — {stage.blurb}
        </motion.span>
        <span>+5° worst case</span>
      </div>

      <p className="mt-1 text-center text-[10px] text-zinc-700">
        starting point: +{TEMP_START.toFixed(1)}° anomaly · drag the slider
      </p>
    </div>
  );
}
