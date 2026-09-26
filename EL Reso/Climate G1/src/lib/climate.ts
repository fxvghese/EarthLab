/**
 * Simplified climate model.
 *
 * This is an educational visualization, NOT a scientifically precise climate model.
 * Every value is a relative, hand-tuned index chosen to communicate the
 * cause-and-effect relationship between global temperature anomaly and
 * environmental systems. Do not read these numbers as real-world projections.
 */

export const TEMP_MIN = 0;
export const TEMP_MAX = 5;
export const TEMP_START = 0.2;

export type StageId = "stable" | "elevated" | "severe" | "critical";

export interface StageMeta {
  id: StageId;
  label: string;
  blurb: string;
  accent: string;
}

export const STAGES: Record<StageId, StageMeta> = {
  stable: { id: "stable", label: "Stable", blurb: "Within a safe margin", accent: "#34d399" },
  elevated: { id: "elevated", label: "Elevated", blurb: "Noticeable stress is showing", accent: "#fbbf24" },
  severe: { id: "severe", label: "Severe", blurb: "Serious impacts underway", accent: "#fb923c" },
  critical: { id: "critical", label: "Critical", blurb: "Runaway consequences", accent: "#f87171" },
};

export function stageFor(anomaly: number): StageMeta {
  if (anomaly < 1) return STAGES.stable;
  if (anomaly < 2) return STAGES.elevated;
  if (anomaly < 3.5) return STAGES.severe;
  return STAGES.critical;
}

export interface ClimateState {
  /** Global temperature anomaly in °C vs. a pre-industrial-style baseline */
  anomaly: number;
  /** Relative heat intensity, 0–100 */
  heatIndex: number;
  /** Relative sea-level rise in cm vs. baseline coast */
  seaLevelCm: number;
  /** Agricultural productivity, 0–100 % of baseline */
  agriculture: number;
  /** Ecosystem health, 0–100 % */
  ecosystem: number;
  /** Ecosystem stress, 0–100 % (inverse of health) */
  ecosystemStress: number;
  /** Remaining polar ice / snow cover, 0–100 % of baseline */
  iceCover: number;
  stage: StageMeta;
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function computeClimate(anomaly: number): ClimateState {
  const a = Math.max(0, anomaly);
  return {
    anomaly: a,
    heatIndex: Math.round(100 * (1 - Math.exp(-a / 1.8))),
    seaLevelCm: 12 * Math.pow(a, 1.35),
    agriculture: Math.round(clamp(100 - (8 * Math.pow(a, 1.4) + 3 * a))),
    ecosystem: Math.round(clamp(100 - (7.5 * Math.pow(a, 1.45) + 2.5 * a))),
    ecosystemStress: 0, // filled right below
    iceCover: Math.round(clamp(100 - 14 * Math.pow(a, 1.3))),
    stage: stageFor(a),
  };
}

/* ---------------------------- Impact summary ---------------------------- */

export interface ImpactLine {
  key: "sea" | "heat" | "agri" | "eco";
  text: string;
}

const SEA_TEXT: Record<StageId, string> = {
  stable: "Coastlines sit within their historical range.",
  elevated: "Nuisance flooding hits low-lying coastal streets.",
  severe: "Coastal neighbourhoods flood regularly; beaches vanish.",
  critical: "Major coastline loss — whole towns stand underwater.",
};

const HEAT_TEXT: Record<StageId, string> = {
  stable: "Temperatures hover near the baseline.",
  elevated: "Heatwaves arrive earlier and bite harder.",
  severe: "Dangerous heat becomes a season of its own.",
  critical: "Extreme heat renders large regions barely liveable.",
};

const AGRI_TEXT: Record<StageId, string> = {
  stable: "Harvests are steady and reliable.",
  elevated: "Yields slip during hot, dry growing seasons.",
  severe: "Crop failures spread across breadbasket regions.",
  critical: "Agriculture is collapsing across most regions.",
};

const ECO_TEXT: Record<StageId, string> = {
  stable: "Ecosystems remain resilient and diverse.",
  elevated: "Species ranges shift; corals start to bleach.",
  severe: "Habitats degrade faster than species can adapt.",
  critical: "Mass die-offs — ecosystems are unravelling.",
};

export function impactLines(state: ClimateState): ImpactLine[] {
  const s = state.stage.id;
  return [
    { key: "sea", text: SEA_TEXT[s] },
    { key: "heat", text: HEAT_TEXT[s] },
    { key: "agri", text: AGRI_TEXT[s] },
    { key: "eco", text: ECO_TEXT[s] },
  ];
}
