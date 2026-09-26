/**
 * EarthLab simulation core — deliberately simple, transparent physics-ish
 * heuristics for a hackathon educational demo. Nothing here is a climate
 * model: it produces plausible, explainable *relative* outcomes that start
 * from the NASA observational baseline.
 *
 * The player edits `PlayerActions`; `simulate()` returns the simulated world
 * plus per-factor contributions used by the explanation generator.
 */

import type { NasaRegion } from '../data/fallback'
import { ndviToPercent } from '../data/nasa'

export interface PlayerActions {
  /** −100…+100, percentage-point style shift of vegetation coverage. */
  vegetationDelta: number
  /** −100…+100, relative shift of urban development. */
  urbanDelta: number
  /** Player-chosen dominant surface treatment. */
  surface: SurfaceChoice
}

export type SurfaceChoice = 'statusQuo' | 'vegetated' | 'concrete' | 'asphalt' | 'reflective'

export const SURFACES: { id: SurfaceChoice; label: string; hint: string }[] = [
  { id: 'statusQuo', label: 'Keep current mix', hint: 'Leave surfaces as observed by NASA' },
  { id: 'vegetated', label: 'Green surfaces', hint: 'Parks, green roofs, urban forest' },
  { id: 'concrete', label: 'Concrete', hint: 'Standard grey development' },
  { id: 'asphalt', label: 'Asphalt', hint: 'Dark roads and parking' },
  { id: 'reflective', label: 'Reflective / cool', hint: 'High-albedo roofs and pavements' },
]

export interface SimulatedOutcome {
  /** Simulated daytime land surface temperature, °C. */
  lstC: number
  /** Simulated vegetation coverage, %. */
  vegetationPct: number
  /** Simulated urban fraction, 0–1. */
  urbanFraction: number
  /** Simulated environmental health, 0–100. */
  envHealth: number
  /** Simulated urban-heat-island intensity, °C above rural surroundings. */
  uhiIntensity: number
  /** Simulated overall climate impact score, −100…+100 (positive = good). */
  climateImpact: number
  /** Per-factor temperature contributions, °C (for the explanation). */
  factors: { label: string; dT: number; note: string }[]
}

export interface Baseline {
  lstC: number
  ndvi: number
  vegetationPct: number
  urbanFraction: number
  surfaceMix: NasaRegion['surfaceMix']
  envHealth: number
  uhiIntensity: number
  climateImpact: number
}

/** Derive the pre-game baseline numbers from the NASA record. */
export function deriveBaseline(region: NasaRegion): Baseline {
  const vegetationPct = ndviToPercent(region.nasa.ndvi)
  const urbanFraction = region.nasa.urbanFraction
  // Transparent baseline UHI heuristic: urbanisation raises heat stress.
  const uhiIntensity = Math.round((urbanFraction * 4.2 + (1 - vegetationPct / 100) * 1.3) * 10) / 10
  const envHealth = Math.round(
    Math.min(100, Math.max(0, vegetationPct * 0.72 + (1 - urbanFraction) * 28 - urbanFraction * 6)),
  )
  // Baseline impact is 0 by definition — the reference point.
  return { lstC: region.nasa.lstDayC, ndvi: region.nasa.ndvi, vegetationPct, urbanFraction, surfaceMix: { ...region.surfaceMix }, envHealth, uhiIntensity, climateImpact: 0 }
}

/**
 * Run the simulation: NASA baseline + player actions → simulated outcome.
 */
export function simulate(baseline: Baseline, actions: PlayerActions): SimulatedOutcome {
  const factors: SimulatedOutcome['factors'] = []

  // ---- 1. Vegetation -------------------------------------------------
  // Vegetation cools through evapotranspiration and shading.
  const vegShift = actions.vegetationDelta / 100 // −1…+1
  const newVegPct = Math.min(100, Math.max(0, baseline.vegetationPct + vegShift * 55))
  const vegDelta = newVegPct - baseline.vegetationPct
  const dTveg = -vegDelta * 0.055 // each +10% vegetation ≈ −0.55 °C
  if (Math.abs(dTveg) > 0.05) {
    factors.push({
      label: 'Vegetation change',
      dT: dTveg,
      note: `${vegDelta >= 0 ? '+' : ''}${Math.round(vegDelta)}% simulated vegetation coverage`,
    })
  }

  // ---- 2. Urban development -------------------------------------------
  const urbanShift = actions.urbanDelta / 100
  const newUrban = Math.min(0.95, Math.max(0.01, baseline.urbanFraction + urbanShift * 0.45))
  const urbanDelta = newUrban - baseline.urbanFraction
  const dTurban = urbanDelta * 5.5 // each +10 pts urban ≈ +0.55 °C
  if (Math.abs(dTurban) > 0.05) {
    factors.push({
      label: 'Urban development',
      dT: dTurban,
      note: `${urbanDelta >= 0 ? '+' : ''}${Math.round(urbanDelta * 100)} pts simulated urban share`,
    })
  }

  // ---- 3. Surface treatment -------------------------------------------
  let dTsurface = 0
  switch (actions.surface) {
    case 'vegetated': dTsurface = -1.6; break
    case 'reflective': dTsurface = -1.2; break
    case 'concrete': dTsurface = 0.9; break
    case 'asphalt': dTsurface = 1.8; break
    case 'statusQuo': dTsurface = 0; break
  }
  if (Math.abs(dTsurface) > 0.01) {
    const label = SURFACES.find((s) => s.id === actions.surface)!.label.toLowerCase()
    factors.push({ label: 'Surface treatment', dT: dTsurface, note: `${label} surfaces` })
  }

  // ---- 4. Climate moderation (hot regions feel more from vegetation) --
  const aridityBoost = baseline.lstC > 45 ? 1.18 : baseline.lstC > 38 ? 1.08 : 1
  const totalDT = (dTveg + dTurban + dTsurface) * aridityBoost
  if (aridityBoost > 1.01) {
    factors.push({ label: 'Regional sensitivity', dT: totalDT - (dTveg + dTurban + dTsurface), note: 'hot regions amplify surface change' })
  }

  const lstC = Math.round((baseline.lstC + totalDT) * 10) / 10
  const uhiIntensity = Math.round(Math.max(0, (newUrban * 4.2 + (1 - newVegPct / 100) * 1.3)) * 10) / 10

  // ---- 5. Health & impact ---------------------------------------------
  const healthFromVeg = newVegPct * 0.72
  const healthFromUrban = (1 - newUrban) * 28 - newUrban * 6
  const surfaceHealth = actions.surface === 'vegetated' ? 6 : actions.surface === 'reflective' ? 3 : actions.surface === 'statusQuo' ? 0 : -5
  const envHealth = Math.round(Math.min(100, Math.max(0, healthFromVeg + healthFromUrban + surfaceHealth)))

  // Climate impact: temperature improvement + greening, − degradation.
  const climateImpact = Math.round(
    Math.max(-100, Math.min(100, (-(lstC - baseline.lstC)) * 14 + vegDelta * 0.5 + (envHealth - baseline.envHealth) * 0.35)),
  )

  return {
    lstC,
    vegetationPct: Math.round(newVegPct),
    urbanFraction: Math.round(newUrban * 100) / 100,
    envHealth,
    uhiIntensity,
    climateImpact,
    factors,
  }
}

// ---------------------------------------------------------------------
// Explanation generator — plain language, honest labeling
// ---------------------------------------------------------------------

export function explainOutcome(baseline: Baseline, sim: SimulatedOutcome): string {
  const dT = sim.lstC - baseline.lstC
  const parts: string[] = []

  if (sim.factors.length === 0) {
    return 'No changes were made, so the simulated result matches the NASA baseline almost exactly.'
  }

  const vegFactor = sim.factors.find((f) => f.label === 'Vegetation change')
  const urbanFactor = sim.factors.find((f) => f.label === 'Urban development')
  const surfaceFactor = sim.factors.find((f) => f.label === 'Surface treatment')

  if (vegFactor && vegFactor.dT < -0.1) {
    parts.push('more vegetation increased the simulated vegetation coverage and cooled the surface through shading and evapotranspiration')
  } else if (vegFactor && vegFactor.dT > 0.1) {
    parts.push('removing vegetation reduced shading and moisture, so the simulated surface heated up')
  }
  if (urbanFactor && urbanFactor.dT > 0.1) {
    parts.push('expanding urban development added heat-retaining structures, strengthening the simulated urban heat island')
  } else if (urbanFactor && urbanFactor.dT < -0.1) {
    parts.push('reducing urban density freed land for cooler surfaces and weakened the simulated heat island')
  }
  if (surfaceFactor) {
    if (surfaceFactor.dT < 0) parts.push('switching to cooler, greener or more reflective surfaces reflected more sunlight')
    if (surfaceFactor.dT > 0) parts.push('darker artificial surfaces absorbed more sunlight and stored heat')
  }

  if (parts.length === 0) return 'The simulated changes roughly balanced out against the NASA baseline.'
  return `Because ${parts.join(', and ')}, the simulated temperature moved ${Math.abs(dT).toFixed(1)} °C ${dT <= 0 ? 'below' : 'above'} the NASA baseline. Simulated values are educational estimates, not NASA predictions.`
}

// ---------------------------------------------------------------------
// SDG connections
// ---------------------------------------------------------------------

export interface SdgLink {
  goal: number
  title: string
  relevance: string
}

export function sdgConnections(baseline: Baseline, sim: SimulatedOutcome): SdgLink[] {
  const dT = sim.lstC - baseline.lstC
  const vegUp = sim.vegetationPct - baseline.vegetationPct
  const urbanUp = sim.urbanFraction - baseline.urbanFraction

  return [
    {
      goal: 13,
      title: 'Climate Action',
      relevance:
        dT < -0.2
          ? `Simulated surface temperature fell ${Math.abs(dT).toFixed(1)} °C below the NASA baseline — cooler surfaces absorb less heat and ease local climate stress.`
          : dT > 0.2
            ? `Simulated surface temperature rose ${dT.toFixed(1)} °C above the NASA baseline — a reminder of how development choices warm a region.`
            : 'The simulated temperature stayed near the observed baseline — stability can be a climate choice too.',
    },
    {
      goal: 11,
      title: 'Sustainable Cities and Communities',
      relevance:
        urbanUp > 0.02 && sim.uhiIntensity > baseline.uhiIntensity + 0.2
          ? `Simulated urban heat island intensity grew to ${sim.uhiIntensity.toFixed(1)} °C — greener city design keeps neighbourhoods liveable.`
          : vegUp > 1
            ? `Simulated vegetation coverage rose to ${sim.vegetationPct}% — greener cities mean cooler streets, cleaner air and better public health.`
            : 'Balanced development and green space keep cities resilient as they grow.',
    },
    {
      goal: 15,
      title: 'Life on Land',
      relevance:
        vegUp > 1
          ? `Simulated vegetation gained ${Math.round(vegUp)}% of coverage — restoring land supports biodiversity and soil stability.`
          : vegUp < -1
            ? `Simulated vegetation fell ${Math.round(-vegUp)}% — land degradation shows up fast in the simulation.`
            : 'Land cover held steady in the simulation.',
    },
  ]
}
