import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  value: string;
  pct: number;
  color: string;
  sub?: string;
  /** when true, a HIGHER percentage is worse (progress bar drains toward the color) */
  invert?: boolean;
}

const spring = { type: "spring", stiffness: 120, damping: 20 } as const;

export function MetricCard({ icon, title, value, pct, color, sub, invert }: Props) {
  // invert: the bar empties as things get worse, so the filled part = 100 - pct
  const fill = invert ? 100 - pct : pct;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex items-center gap-2">
        <span className="transition-transform duration-200 group-hover:scale-110" style={{ color }}>
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{title}</span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-1.5">
        <motion.span
          key={value}
          initial={{ opacity: 0.35, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="font-display text-xl font-bold tabular-nums text-zinc-50"
        >
          {value}
        </motion.span>
        {sub && <span className="text-[11px] font-medium text-zinc-500">{sub}</span>}
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
          animate={{ width: `${Math.max(2, Math.min(100, fill))}%` }}
          transition={spring}
        />
      </div>
    </div>
  );
}
