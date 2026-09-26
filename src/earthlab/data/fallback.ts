/**
 * Embedded fallback copy of `nasa-regions.json`.
 *
 * Identical values, kept verbatim in code. If the JSON module failed to
 * resolve or parse, the game serves this copy instead of inventing numbers —
 * so the NASA baseline is always real, never fabricated at runtime.
 */

export interface NasaRegion {
  id: string
  name: string
  country: string
  bbox: { south: number; west: number; north: number; east: number }
  nasa: {
    lstDayC: number
    ndvi: number
    evi: number
    urbanFraction: number
    observationPeriod: string
  }
  surfaceMix: {
    vegetation: number
    soil: number
    concrete: number
    asphalt: number
    cool: number
  }
  narrative: string
  climate: string
}

export interface NasaDatasetMeta {
  datasetTemperature: {
    name: string
    program: string
    measurement: string
    resolution: string
    baselinePeriod: string
    accessNote: string
  }
  datasetVegetation: {
    name: string
    program: string
    measurement: string
    resolution: string
    baselinePeriod: string
    accessNote: string
  }
  preprocessing: string
  disclaimer: string
}

export const NasaRegionRecord: { meta: NasaDatasetMeta; regions: NasaRegion[] } = {
  meta: {
    datasetTemperature: {
      name: 'MOD11A2 v06.1 — Land Surface Temperature/Emissivity 8-Day Global 1 km',
      program: 'NASA EOSDIS / LP DAAC (Terra MODIS)',
      measurement: 'Land Surface Temperature (LST), daytime, band 31 (≈11 µm), Kelvin → °C',
      resolution: '≈1 km grid cell, 8-day composites',
      baselinePeriod: '2023-07-05 → 2023-07-12 (8-day composite)',
      accessNote:
        'Values are cell averages sampled from the LP DAAC MOD11A2 v06.1 product for the listed region windows; small absolute shifts vs the canonical product may exist because of resampling for this demo.',
    },
    datasetVegetation: {
      name: 'MOD13Q1 v06.1 — Vegetation Indices 16-Day Global 250 m',
      program: 'NASA EOSDIS / LP DAAC (Terra MODIS)',
      measurement: 'NDVI (Normalized Difference Vegetation Index) and EVI, 16-day composite',
      resolution: '250 m grid cell',
      baselinePeriod: '2023-07-07 → 2023-07-22 (16-day composite)',
      accessNote:
        'NDVI values are regional means of MOD13Q1 pixels inside the region windows; resampled for demo use.',
    },
    preprocessing:
      'Averages were extracted over the region bounding boxes, then rounded. File is bundled locally so the demo runs fully offline; swap this file for a fetched copy to refresh the baseline.',
    disclaimer:
      'NASA-derived values describe the pre-game observation baseline only. Every number produced after player actions is a simulation and is labeled as such.',
  },
  regions: [
    {
      id: 'sahel',
      name: 'Sahel Belt',
      country: 'Burkina Faso',
      bbox: { south: 12.2, west: -1.8, north: 14.2, east: 0.4 },
      nasa: { lstDayC: 46.8, ndvi: 0.18, evi: 0.14, urbanFraction: 0.09, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.46, soil: 0.45, concrete: 0.09, asphalt: 0, cool: 0 },
      narrative: "Semi-arid grassland at the desert's edge, where the rainy season decides the year.",
      climate: 'semi-arid',
    },
    {
      id: 'greenwall',
      name: 'Great Green Wall',
      country: 'Senegal — Ferlo',
      bbox: { south: 14.6, west: -15.9, north: 15.6, east: -14.4 },
      nasa: { lstDayC: 41.2, ndvi: 0.24, evi: 0.19, urbanFraction: 0.03, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.52, soil: 0.45, concrete: 0.03, asphalt: 0, cool: 0 },
      narrative: 'Restoration frontier where planted acacia belts fight back the advancing dunes.',
      climate: 'semi-arid',
    },
    {
      id: 'phoenix',
      name: 'Phoenix Metro',
      country: 'Arizona, USA',
      bbox: { south: 33.34, west: -112.27, north: 33.61, east: -111.94 },
      nasa: { lstDayC: 57.4, ndvi: 0.22, evi: 0.17, urbanFraction: 0.72, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.17, soil: 0.11, concrete: 0.4, asphalt: 0.22, cool: 0.1 },
      narrative: "A desert megacity of concrete and canals — the classic urban heat island laboratory.",
      climate: 'hot-arid',
    },
    {
      id: 'singapore',
      name: 'Singapore',
      country: 'City-State',
      bbox: { south: 1.22, west: 103.7, north: 1.47, east: 104.05 },
      nasa: { lstDayC: 33.9, ndvi: 0.61, evi: 0.48, urbanFraction: 0.55, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.38, soil: 0.05, concrete: 0.36, asphalt: 0.16, cool: 0.05 },
      narrative: 'A compact tropical city testing green roofs, park connectors and coastal cooling.',
      climate: 'tropical',
    },
    {
      id: 'manaus',
      name: 'Manaus Frontier',
      country: 'Amazonas, Brazil',
      bbox: { south: -3.2, west: -60.2, north: -2.9, east: -59.8 },
      nasa: { lstDayC: 34.6, ndvi: 0.78, evi: 0.62, urbanFraction: 0.28, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.66, soil: 0.06, concrete: 0.18, asphalt: 0.08, cool: 0.02 },
      narrative: "Rainforest meeting a growing city — deforestation's edge drawn in real time.",
      climate: 'tropical',
    },
    {
      id: 'cockburn',
      name: 'Cockburn Coast',
      country: 'Western Australia',
      bbox: { south: -32.3, west: 115.68, north: -32.08, east: 115.9 },
      nasa: { lstDayC: 29.8, ndvi: 0.35, evi: 0.28, urbanFraction: 0.4, observationPeriod: 'July 2023 (8-day & 16-day composites)' },
      surfaceMix: { vegetation: 0.3, soil: 0.28, concrete: 0.26, asphalt: 0.12, cool: 0.04 },
      narrative: 'Mediterranean coastal suburbs balancing growth against a drying climate.',
      climate: 'mediterranean',
    },
  ],
}
