import { motion } from "framer-motion";
import { Users, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPECIES_LIST, type SimState, type SpeciesId } from "./sim";
import { CursorCard, CursorCardSpot } from "@/components/ui/cursor-card";

export interface PaletteProps {
  s: SimState;
  /** live carbon rate for the two tree families */
  rates: { id: SpeciesId; rate: number }[];
  selected: SpeciesId | null;
  onSelect: (id: SpeciesId) => void;
  /** population & herd sizes, for the action cards */
  pop: number;
  popMax: number;
  deer: number;
  deerMax: number;
  /** actions: recruit a settler / release wildlife */
  onSettle: () => void;
  onRelease: () => void;
}

/** Palette: 2 tree families (plant by clicking the land) + 2 action categories
 *  (people & wildlife). Uses the shadcn cursor-card for hover glow. */
export default function Palette({
  s,
  rates,
  selected,
  onSelect,
  pop,
  popMax,
  deer,
  deerMax,
  onSettle,
  onRelease,
}: PaletteProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {/* tree families — select, then click the land to plant */}
      {SPECIES_LIST.map((sp) => {
        const rate = rates.find((r) => r.id === sp.id)?.rate ?? 0;
        const afford = s.credits >= sp.cost;
        const isSel = selected === sp.id;
        return (
          <CursorCard
            key={sp.id}
            glowColor="52, 211, 153"
            spotOpacity={0.14}
            onClick={() => onSelect(sp.id)}
            className={cn("cursor-pointer px-2.5 py-2.5", isSel && "border-leaf/60 bg-leaf/10", !afford && "opacity-45")}
          >
            <CursorCardSpot />
            <div className="relative z-10 flex items-center gap-2.5">
              <span
                className="h-6 w-6 shrink-0 rounded-md border border-white/10"
                style={{ background: `linear-gradient(135deg, ${sp.color}, ${sp.color}55)` }}
              />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-mist">{sp.name}</div>
                <div className="font-mono text-[9px] text-mist/55">
                  <span className="text-sun-soft">-{sp.cost}</span> · +{rate.toFixed(2)}/s
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-2 h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: sp.color }}
                animate={{ width: `${Math.min(100, rate * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </CursorCard>
        );
      })}

      {/* people — recruit a settler to the valley */}
      <CursorCard
        glowColor="96, 165, 250"
        spotOpacity={0.14}
        onClick={onSettle}
        className={cn("cursor-pointer px-2.5 py-2.5", s.credits < 20 && "opacity-45")}
      >
        <CursorCardSpot />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-sky-400/70 to-sky-400/25">
            <Users className="h-3.5 w-3.5 text-sky-100" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-mist">Settlers</div>
            <div className="font-mono text-[9px] text-mist/55">
              <span className="text-sun-soft">-20</span> · {pop}/{popMax} joined
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-sky-400"
            animate={{ width: `${Math.min(100, (pop / Math.max(1, popMax)) * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </CursorCard>

      {/* wildlife — release deer (wolves follow the herd on their own) */}
      <CursorCard
        glowColor="251, 191, 36"
        spotOpacity={0.14}
        onClick={onRelease}
        className={cn("cursor-pointer px-2.5 py-2.5", s.credits < 18 && "opacity-45")}
      >
        <CursorCardSpot />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-amber-300/70 to-amber-300/25">
            <PawPrint className="h-3.5 w-3.5 text-amber-100" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-mist">Wildlife</div>
            <div className="font-mono text-[9px] text-mist/55">
              <span className="text-sun-soft">-18</span> · {deer}/{deerMax} roaming
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-amber-300"
            animate={{ width: `${Math.min(100, (deer / Math.max(1, deerMax)) * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </CursorCard>
    </div>
  );
}
