import type { SpeciesId } from "./sim";

/** matches ForestScene's world width so agents spread across the full valley */
const WORLD_W = 1000;

interface PlantVisualProps {
  species: SpeciesId;
  growth: number; // 0..1
  seedTime: number;
  now: number;
  /** 0..1 vegetation health — below ~0.45 plants visibly wither */
  health?: number;
}

const ease = (g: number) => Math.pow(g, 0.8);

/** Deterministic per-plant wobble seed from x position */
const wob = (seed: number, t: number) => Math.sin(t * 1.4 + seed * 12.9) * 1.4;

export function PlantVisual({ species, growth, seedTime, now, health = 1 }: PlantVisualProps) {
  const age = now - seedTime;
  const sproutT = Math.min(1, age / 0.55); // sprout pop-in
  const g = ease(growth);
  const sway = growth > 0.15 ? wob(seedTime, now) : 0;
  // stress: plants lose saturation, wilt and sway less when unhealthy
  const stress = clamp01(1 - health / 0.55); // 0 below health 0.55, →1 at health 0
  const wilt = stress * (0.85 + 0.3 * ((seedTime * 7) % 1)); // deterministic per-plant

  if (species === "oak") {
    const h = 26 + g * 118;
    const r = 10 + g * 26;
    return (
      <g transform={`translate(${sway * 0.4} ${0})`}>
        <rect x={-2.6} y={-h} width={5.2} height={h} rx={2.4} fill={mix("#8a5a33", "#9a8a5a", stress * 0.5)} style={{ transform: `scaleY(${sproutT})`, transformOrigin: "bottom" }} />
        <circle cx={0} cy={-h - r * 0.55} r={r} fill={mix("#f97316", "#b45309", stress * 0.7)} opacity={0.95 * (1 - wilt * 0.25)} style={{ transform: `scale(${sproutT})`, transformOrigin: `0px ${-h - r * 0.55}px` }} />
        <circle cx={-r * 0.62} cy={-h - r * 0.2} r={r * 0.62} fill={mix("#fb923c", "#92400e", stress * 0.7)} opacity={0.9 * (1 - wilt * 0.25)} style={{ transform: `scale(${sproutT})` }} />
        <circle cx={r * 0.6} cy={-h - r * 0.32} r={r * 0.58} fill={mix("#ea580c", "#78350f", stress * 0.7)} opacity={0.9 * (1 - wilt * 0.25)} style={{ transform: `scale(${sproutT})` }} />
      </g>
    );
  }
  if (species === "pine") {
    const h = 20 + g * 92;
    return (
      <g transform={`translate(${sway * 0.5} 0)`}>
        <rect x={-2} y={-h * 0.55} width={4} height={h * 0.55} rx={2} fill={mix("#6b4f36", "#8a7a52", stress * 0.5)} style={{ transform: `scaleY(${sproutT})`, transformOrigin: "bottom" }} />
        {[
          [0.55, 15],
          [0.78, 12.4],
          [1, 9.4],
        ].map(([f, w], i) => {
          const y = -h * f;
          const s = sproutT * (0.55 + 0.45 * growth);
          return <path key={i} d={`M0 ${y} L${-w} ${y + w * 0.9} L${w} ${y + w * 0.9} Z`} fill={mix(i === 2 ? "#34d399" : "#10b981", "#a16207", stress * 0.65)} style={{ transform: `scale(${s})`, transformOrigin: `0px ${y}px` }} />;
        })}
        <path d={`M0 ${-h} L${-8} ${-h + 9} L${8} ${-h + 9} Z`} fill={mix("#6ee7b7", "#a16207", stress * 0.65)} style={{ transform: `scale(${sproutT})`, transformOrigin: `0px ${-h}px` }} />
      </g>
    );
  }
  // unreachable with the oak|pine union — kept for exhaustiveness
  return null;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** simple hex color mix toward a stress-brown */
function mix(a: string, b: string, t: number) {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Wildlife layer: birds/bees/butterflies/bugs whose abundance responds to
 * animalLevel (0..1). Below 0.12 the wildlife has left the scene entirely.
 */
export function Critters({ active, animalLevel = 1, now }: { active: number; animalLevel?: number; now: number }) {
  if (animalLevel < 0.12) return null;
  const want = Math.min(6, Math.floor((active - 4) / 5) + 1 + Math.floor(animalLevel * 4));
  const n = Math.max(1, Math.min(want, Math.round(want * clamp01(animalLevel * 1.4))));
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const kind = i % 3;
        const speed = [16, 22, 28][kind] + i * 2;
        const x = ((now * speed) / 60 + i * 0.23) % 1;
        const yBase = [26, 16, 9][kind];
        const bob = Math.sin(now * 2 + i * 2.1) * [3, 2, 1][kind];
        const y = yBase + bob;
        const flip = Math.cos((now * speed) / 60 + i * 0.23) > 0 ? 1 : -1;
        const color = kind === 0 ? "#93c5fd" : kind === 1 ? "#fde68a" : "#fca5a5";
        const opacity = 0.55 + 0.4 * clamp01(animalLevel);
        if (kind === 0) {
          // bird: two flapping wing arcs
          const flap = Math.sin(now * 9 + i * 3) * 2.4;
          return (
            <g key={i} transform={`translate(${x * WORLD_W} ${-y}) scale(${flip * 1.7} 1.7)`} opacity={opacity}>
              <path d={`M0 0 Q 3 ${-3 - flap} 6 0`} stroke={color} strokeWidth={1.1} fill="none" strokeLinecap="round" />
              <path d={`M0 0 Q -3 ${-3 - flap} -6 0`} stroke={color} strokeWidth={1.1} fill="none" strokeLinecap="round" />
            </g>
          );
        }
        if (kind === 1) {
          // bee: tiny dot with dash trail
          return (
            <g key={i} transform={`translate(${x * WORLD_W} ${-y}) scale(1.7)`} opacity={opacity}>
              <circle r={1.15} fill={color} />
              <path d="M-1.4 -1.2 L-3.4 -2.6" stroke={color} strokeWidth={0.7} strokeLinecap="round" />
            </g>
          );
        }
        // butterfly: two wing dots
        const wf = Math.sin(now * 7 + i) * 0.6;
        return (
          <g key={i} transform={`translate(${x * WORLD_W} ${-y}) scale(${flip * 1.7} 1.7)`} opacity={opacity}>
            <ellipse cx={-1.4} cy={-0.6 + wf * 0.4} rx={1.6} ry={1.1} fill={color} opacity={0.85} />
            <ellipse cx={1.4} cy={-0.6 - wf * 0.4} rx={1.6} ry={1.1} fill={color} opacity={0.85} />
            <rect x={-0.4} y={-1.6} width={0.8} height={2.4} rx={0.4} fill="#78716c" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Herbivore herd — low-poly deer that graze the meadow band. Abundance follows
 * the herd size; they wander slowly and flip direction as they walk.
 */
export function Deer({ herd, now }: { herd: number; now: number }) {
  const n = Math.min(herd, 10);
  if (n <= 0) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 1.6 + (i % 3) * 0.4;
        const phase = (now * speed) / 60 + i * 0.41;
        const x = 0.18 + ((phase + i * 0.07) % 1) * 0.66; // roam 18%..84% of the land
        const px = x * WORLD_W;
        const step = Math.sin(phase * Math.PI * 5) * 1.1;
        const y = 16 + (i % 3) * 7;
        const flip = Math.cos(phase) > 0 ? 1 : -1;
        const body = i % 2 ? "#c8a27a" : "#b08d63";
        const graze = Math.sin(now * 0.7 + i * 2.4) > 0.86; // occasionally dips head
        const headY = graze ? -4.2 : -6.4;
        return (
          <g key={i} transform={`translate(${px} ${-y}) scale(${flip * 2.2} 2.2)`} opacity={0.94}>
            {/* legs */}
            <path
              d={`M-2.2 0 L${-2.2 + step * 0.4} -3.6 M2.2 0 L${2.2 - step * 0.4} -3.6`}
              stroke="#7a6244"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            {/* body */}
            <ellipse cx={0} cy={-4.6} rx={3.4} ry={2.1} fill={body} />
            {/* neck + head */}
            <path d={`M2.6 -5.4 L4.4 ${headY}`} stroke={body} strokeWidth={1.7} strokeLinecap="round" />
            <circle cx={4.7} cy={headY} r={1.15} fill={body} />
            {/* ear + tail */}
            <path d={`M4.2 ${headY - 0.9} L4.9 ${headY - 2}`} stroke={body} strokeWidth={0.8} strokeLinecap="round" />
            <path d="M-3.2 -5.4 L-4.4 -6.4" stroke={body} strokeWidth={0.9} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Predator pack — low-poly wolves prowling the treeline. Only appear once the
 * herd can sustain them; they move faster than the deer.
 */
export function Wolves({ pack, now }: { pack: number; now: number }) {
  const n = Math.min(pack, 4);
  if (n <= 0) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 3.4 + (i % 3) * 0.6;
        const phase = (now * speed) / 60 + i * 0.53;
        const x = 0.22 + ((phase + i * 0.13) % 1) * 0.7; // prowl 22%..92% — clear of the water
        const px = x * WORLD_W;
        const step = Math.sin(phase * Math.PI * 7) * 1.3;
        const y = 22 + (i % 2) * 6;
        const flip = Math.cos(phase) > 0 ? 1 : -1;
        const body = "#8f8a84";
        return (
          <g key={i} transform={`translate(${px} ${-y}) scale(${flip * 2.2} 2.2)`} opacity={0.95}>
            {/* legs */}
            <path
              d={`M-2 0 L${-2 + step * 0.5} -3 M2 0 L${2 - step * 0.5} -3`}
              stroke="#5b5651"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            {/* body */}
            <ellipse cx={0} cy={-3.9} rx={3.1} ry={1.7} fill={body} />
            {/* head + snout */}
            <circle cx={3} cy={-4.9} r={1.2} fill={body} />
            <path d={`M3.8 -5 L5.1 -4.6`} stroke={body} strokeWidth={1} strokeLinecap="round" />
            {/* ears + bushy tail */}
            <path d={`M2.4 -5.8 L2.1 -7 M3.5 -5.9 L3.6 -7.2`} stroke={body} strokeWidth={0.8} strokeLinecap="round" />
            <path d={`M-2.9 -4.4 C -4.4 -4.8 -4.8 -6.2 -4.2 -7`} stroke={body} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

/** Low-poly style human figures that walk near the settlement area. */
export function Humans({ population, now }: { population: number; now: number }) {
  const n = Math.min(population, 10);
  if (n <= 0) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 2.2 + (i % 4) * 0.55;
        const phase = now * speed / 60 + i * 0.37;
        const x = 0.62 + ((phase + i * 0.11) % 1) * 0.33; // stroll between 62%..95% of land
        const px = x * WORLD_W;
        const step = Math.sin(phase * Math.PI * 6) * 1.2;
        const px2 = px + step * 0.6;
        const y = 10 + (i % 3) * 6;
        const flip = Math.cos(phase) > 0 ? 1 : -1;
        const stressColor = "#fbbf24";
        const calm = "#e7e5e4";
        return (
          <g key={i} transform={`translate(${px2} ${-y}) scale(${flip * 2.4} 2.4)`} opacity={0.92}>
            {/* legs */}
            <path d={`M0 0 L${-step * 0.5} ${-3.4} M0 0 L${step * 0.5} ${-3.4}`} stroke="#57534e" strokeWidth={1} strokeLinecap="round" />
            {/* body */}
            <rect x={-1.2} y={-7.4} width={2.4} height={4.2} rx={1} fill={i % 3 === 0 ? stressColor : calm} />
            {/* head */}
            <circle cx={0} cy={-8.8} r={1.5} fill="#d6cfc2" />
          </g>
        );
      })}
    </g>
  );
}
