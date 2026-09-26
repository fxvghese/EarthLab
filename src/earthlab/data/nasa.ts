/**
 * NASA data layer.
 *
 * Loads the locally bundled, NASA-derived baseline dataset
 * (`nasa-regions.json`). The file is small and travels in the bundle, so
 * gameplay never depends on a live NASA API — the hackathon demo keeps
 * working fully offline. If the import ever failed (e.g. the file was
 * replaced by a fetch-based pipeline), the loader falls back to an embedded
 * verbatim copy of the same data rather than inventing values.
 *
 * Everything NASA in this game is *observational baseline*; all simulated
 * values live in `../game/simulation.ts` and are labeled "simulated".
 */

import rawRegions from './nasa-regions.json'
import { NasaRegionRecord, type NasaRegion } from './fallback'

export interface RegionMeta {
  meta: {
    datasetTemperature: DatasetInfo
    datasetVegetation: DatasetInfo
    preprocessing: string
    disclaimer: string
  }
  regions: NasaRegion[]
}

export interface DatasetInfo {
  name: string
  program: string
  measurement: string
  resolution: string
  baselinePeriod: string
  accessNote: string
}

export interface RegionBundle {
  meta: RegionMeta['meta']
  regions: NasaRegion[]
  /** True when the embedded fallback copy was used. */
  usedFallback: boolean
}

/** Primary path: statically imported (bundled) JSON — works offline. */
function loadBundled(): RegionMeta {
  return rawRegions as unknown as RegionMeta
}

export function loadNasaDataset(): RegionBundle {
  try {
    const meta = loadBundled()
    if (!meta?.regions?.length) throw new Error('empty dataset')
    return { meta: meta.meta, regions: meta.regions, usedFallback: false }
  } catch {
    return { meta: NasaRegionRecord.meta, regions: NasaRegionRecord.regions, usedFallback: true }
  }
}

// ---------------------------------------------------------------------
// Unit helpers (NASA products use Kelvin; the UI speaks °C)
// ---------------------------------------------------------------------

export const kelvinToC = (k: number): number => Math.round((k - 273.15) * 10) / 10

/** NDVI for dense tropical forest ≈ 0.8+, bare soil/rock ≈ 0.0–0.1. */
export const ndviToPercent = (ndvi: number): number => Math.round(Math.min(1, Math.max(0, (ndvi + 0.1) / 0.9)) * 100)

// ---------------------------------------------------------------------
// Baseline derivation: NASA observations → simulation starting point
// ---------------------------------------------------------------------

/**
 * Derive the playable baseline from the NASA record.
 * These are the values the simulation starts from and is compared against —
 * NASA data is the gameplay input, not a decorative stat card.
 */
export function deriveBaseline(region: NasaRegion): {
  lstC: number
  ndvi: number
  vegetationPct: number
  urbanFraction: number
  surfaceMix: NasaRegion['surfaceMix']
  envHealth: number
} {
  const vegetationPct = ndviToPercent(region.nasa.ndvi)
  const urbanFraction = region.nasa.urbanFraction

  // Environmental health (0–100): a simple, transparent blend of the two
  // NASA observations, penalised slightly by urbanisation.
  const envHealth = Math.round(
    Math.min(100, vegetationPct * 0.72 + (1 - urbanFraction) * 28 - urbanFraction * 6),
  )

  return {
    lstC: region.nasa.lstDayC,
    ndvi: region.nasa.ndvi,
    vegetationPct,
    urbanFraction,
    surfaceMix: { ...region.surfaceMix },
    envHealth,
  }
}
