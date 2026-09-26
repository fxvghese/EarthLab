import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PlantVisual, Critters, Humans, Deer, Wolves } from "./plants";
import { SPECIES_LIST, SPECIES, type SimState } from "./sim";
interface Props {
  state: SimState;
  selected: string | null;
  now: number;
  raining: boolean;
  waterPct: number;
  carbonPct: number;
  /** 0..1 vegetation health — drives withering visuals */
  health?: number;
  /** 0..1 wildlife abundance — birds/butterflies thin out as it falls */
  animalLevel?: number;
  onPlant: (xNorm: number) => void;
}

const W = 1000;
const BASE_H = 520; // design height at 1.92:1
const MIN_H = 420;
const MAX_H = 780;
const LAND_STRIP = 132; // soil band height below the horizon
const WATER_W = 190;

const Layers = {
  skyTop: "#0a1410",
  skyMid: "#10241c",
  skyLow: "#143026",
  farHills: "#132a21",
  midHills: "#16311f",
  soil: "#221a12",
  soilLight: "#2e2417",
  water: "#0b3a4d",
};

/** Depth-sorted plants: taller species render behind. */
const depth = (species: string) => (species === "oak" ? 0 : 1);

/** grass strip tint: lush green when healthy, dusty tan under stress */
const grassColor = (health: number) => {
  const t = Math.min(1, Math.max(0, (0.65 - health) / 0.5)); // 0 lush → 1 parched
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = mix(0x1c, 0x6b); const g = mix(0x46, 0x5a); const b2 = mix(0x2b, 0x3a);
  return `rgb(${r}, ${g}, ${b2})`;
};

export default function ForestScene({ state, selected, now, raining, waterPct, carbonPct, health = 1, animalLevel = 1, onPlant }: Props) {
  const viewRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Responsive stage: the viewBox height tracks the container's aspect ratio so
     the full 1000-unit width — water on the left, settlement on the right — is
     always visible, whatever the screen ratio. No cropping, no letterboxing. */
  const [vbH, setVbH] = useState(BASE_H);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const aspect = r.width / r.height;
        setVbH(Math.min(MAX_H, Math.max(MIN_H, Math.round(W / aspect))));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = vbH;
  const LAND_Y = vbH - LAND_STRIP;

  const sorted = useMemo(() => [...state.plants].sort((a, b) => depth(a.species) - depth(b.species)), [state.plants]);
  const critterLevel = state.plants.reduce((n, p) => n + Math.round(p.growth * 2), 0);

  const handleClick = (e: React.MouseEvent) => {
    if (!selected) return;
    const svg = viewRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xNorm = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onPlant(xNorm);
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl border border-line bg-ink-2">
      <svg
        ref={viewRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax meet"
        className={`h-full w-full ${selected ? "cursor-crosshair" : ""}`}
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={Layers.skyTop} />
            <stop offset="55%" stopColor={Layers.skyMid} />
            <stop offset="100%" stopColor={Layers.skyLow} />
            <animate attributeName="stop-color" values={`${Layers.skyLow};${Layers.skyMid};${Layers.skyLow}`} dur="14s" repeatCount="indefinite" />
          </linearGradient>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={Layers.soilLight} />
            <stop offset="100%" stopColor={Layers.soil} />
            <animate attributeName="stop-color" values={`${Layers.soil};${Layers.soilLight};${Layers.soil}`} dur="14s" repeatCount="indefinite" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor={Layers.water} />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pointerGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* sky */}
        <rect x={0} y={0} width={W} height={LAND_Y} fill="url(#sky)" />

        {/* sun + haze — dims as carbon rises */}
        <g opacity={0.85 - carbonPct * 0.5}>
          <circle cx={836} cy={92} r={44} fill="#f59e0b" opacity={0.85} />
          <circle cx={836} cy={92} r={130} fill="url(#sunGlow)" />
        </g>
        <rect x={0} y={0} width={W} height={LAND_Y} fill="#5a6b5e" opacity={carbonPct * 0.2} />

        {/* smog tint above horizon */}
        <rect x={0} y={LAND_Y - 120} width={W} height={120} fill="#78716c" opacity={carbonPct * 0.28} />

        {/* far hills */}
        <path d={`M0 ${LAND_Y - 96} Q 160 ${LAND_Y - 176} 330 ${LAND_Y - 92} T 700 ${LAND_Y - 98} T 1000 ${LAND_Y - 84} L1000 ${LAND_Y} L0 ${LAND_Y} Z`} fill={Layers.farHills} />
        {/* mid hills */}
        <path d={`M0 ${LAND_Y - 54} Q 200 ${LAND_Y - 124} 420 ${LAND_Y - 50} T 1000 ${LAND_Y - 60} L1000 ${LAND_Y} L0 ${LAND_Y} Z`} fill={Layers.midHills} />

        {/* land — grass tint dries out as vegetation health falls */}
        <rect x={0} y={LAND_Y} width={W} height={H - LAND_Y} fill="url(#soilGrad)" />
        <rect x={0} y={LAND_Y} width={W} height={16} fill={grassColor(health)} opacity={0.55} />
        {/* soil carbon band — grows with soil store */}
        <rect x={0} y={LAND_Y} width={W} height={10} fill="#4d3d24" opacity={0.75} />

        {/* water body (left) */}
        <rect x={0} y={LAND_Y - waterPct * 120} width={WATER_W} height={waterPct * 120 + 24} fill="url(#waterGrad)" rx={6} />
        <motion.rect
          x={0}
          y={LAND_Y - waterPct * 120}
          width={WATER_W}
          height={4}
          fill="#7dd3fc"
          opacity={0.6}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ambient plants in mid hills (visual only) */}
        <g opacity={0.5}>
          {[
            [560, 30],
            [620, 44],
            [700, 36],
            [770, 52],
            [860, 40],
            [930, 30],
          ].map(([x, s], i) => (
            <path key={i} d={`M${x} ${LAND_Y - 52} l0 ${-s} m0 2 l-7 6 m7 -6 l7 6`} stroke="#1f4d38" strokeWidth={3} strokeLinecap="round" />
          ))}
        </g>

        {/* plants */}
        <g>
          {sorted.map((p) => (
            <g key={p.uid} transform={`translate(${p.x * (W - 60) + 40} ${LAND_Y + 6})`}>
              <PlantVisual species={p.species} growth={p.growth} seedTime={p.seedTime} now={now} health={health} />
            </g>
          ))}
        </g>

        {/* wildlife — birds & butterflies respond to ecosystem health */}
        <g transform={`translate(0 ${LAND_Y + 6})`}>
          <Critters active={critterLevel} animalLevel={animalLevel} now={now} />
        </g>

        {/* herbivore herd — grazes the meadow band */}
        <g transform={`translate(0 ${LAND_Y + 4})`}>
          <Deer herd={state.deer} now={now} />
        </g>

        {/* predator pack — prowls the treeline once prey sustains them */}
        <g transform={`translate(0 ${LAND_Y + 5})`}>
          <Wolves pack={state.wolves} now={now} />
        </g>

        {/* humans — walk the settled east side of the valley */}
        <g transform={`translate(0 ${LAND_Y + 2})`}>
          <Humans population={state.population} now={now} />
        </g>

        {/* rain */}
        {raining && (
          <g opacity={0.5}>
            {Array.from({ length: 42 }).map((_, i) => (
              <motion.line
                key={i}
                x1={((i * 137) % W) + (i % 5)}
                y1={-10}
                x2={((i * 137) % W) - 6}
                y2={14}
                stroke="#7dd3fc"
                strokeWidth={1.4}
                animate={{ y: [0, LAND_Y + 30], opacity: [0, 0.7, 0] }}
                transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, delay: (i % 9) * 0.13, ease: "linear" }}
              />
            ))}
          </g>
        )}
        {/* carbon haze overlay */}
        <rect x={0} y={0} width={W} height={H} fill="#0a1410" opacity={0.12 + carbonPct * 0.3} />
      </svg>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-leaf/30 bg-ink/80 px-4 py-1.5 text-xs text-leaf-soft backdrop-blur"
        >
          Click land to plant ·          {SPECIES[selected as keyof typeof SPECIES]?.name ?? selected}
        </motion.div>
      )}
    </div>
  );
}
