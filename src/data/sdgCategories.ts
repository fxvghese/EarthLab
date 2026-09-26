/**
 * Category metadata for the SDG introduction screens.
 *
 * Pure data — the ecosystem scene and the intro overlay both read from it.
 * Text is intentionally short and high-school friendly; SDG blurbs come
 * straight from the curriculum wording, games point at the existing builds
 * (served at /games/<slug>/ by the dev server and the production copy step).
 */
import type { EcosystemKind } from './ecosystem'

/** The four environmental categories behind the ecosystem elements. */
export type CategoryId = 'land' | 'climate' | 'water' | 'energy'

/** Ecosystem element that opens each category (see data/ecosystem.ts). */
export const CATEGORY_KIND: Record<CategoryId, EcosystemKind> = {
  land: 'tree',
  climate: 'cloud',
  water: 'fish',
  energy: 'solar',
}

/** Inverse lookup: ecosystem element → its category. */
export const CATEGORY_BY_KIND: Record<EcosystemKind, CategoryId> = {
  tree: 'land',
  cloud: 'climate',
  fish: 'water',
  solar: 'energy',
}

/** Category display name by id (used for aria labels and headings). */
export const CATEGORY_NAME: Record<CategoryId, string> = {
  land: 'Land',
  climate: 'Climate',
  water: 'Water',
  energy: 'Energy & Future',
}

/**
 * When the ocean game's Back button navigates to /#water-games, the main
 * experience opens the Water category overlay directly on its game-selection
 * stage (skipping the SDG replay).
 */
export const CATEGORY_HASH: Partial<Record<CategoryId, string>> = {
  water: 'water-games',
}

export interface SdgEntry {
  /** Official UN SDG number. */
  id: number
  /** One short explanation, high-school friendly. */
  blurb: string
}

export type GameArtKind = 'land' | 'climate' | 'ocean' | 'energy'

export interface CategoryGame {
  title: string
  desc: string
  /** Existing game route — the game itself is untouched. */
  href: string
  art: GameArtKind
}

export interface CategoryDef {
  id: CategoryId
  /** Scene viewBox centre of the matching element, used to focus the art. */
  kind: EcosystemKind
  name: string
  /** One line: what the student is about to explore. */
  focus: string
  sdgs: SdgEntry[]
  games: CategoryGame[]
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  land: {
    id: 'land',
    kind: 'tree',
    name: 'Land',
    focus: 'Soil, agriculture, forests, biodiversity, and food.',
    sdgs: [
      { id: 2, blurb: 'Sustainable agriculture and healthy food systems help support food security.' },
      { id: 12, blurb: 'Responsible use of resources helps reduce waste and environmental impact.' },
      { id: 15, blurb: 'Protecting forests, soil, and terrestrial ecosystems helps maintain healthy land environments.' },
    ],
    games: [
      {
        title: 'Land & Life',
        desc: 'Forest & carbon simulator — grow a forest, watch carbon and habitat respond.',
        href: '/games/land/#/play',
        art: 'land',
      },
    ],
  },
  climate: {
    id: 'climate',
    kind: 'cloud',
    name: 'Climate',
    focus: 'Weather, climate, atmosphere, and environmental change.',
    sdgs: [
      { id: 3, blurb: 'Environmental and climate conditions can affect human health and well-being.' },
      { id: 11, blurb: 'Understanding environmental conditions helps communities become more resilient and sustainable.' },
      { id: 13, blurb: 'Understanding climate change and its impacts supports informed climate action.' },
    ],
    games: [
      {
        title: 'Climate & Atmosphere',
        desc: 'One slider, one living world — raise the temperature and watch the planet respond.',
        href: '/games/climate/',
        art: 'climate',
      },
    ],
  },
  water: {
    id: 'water',
    kind: 'fish',
    name: 'Water',
    focus: 'Freshwater, rivers, oceans, marine ecosystems, and water resources.',
    sdgs: [
      { id: 6, blurb: 'Protecting and managing water resources is essential for clean and accessible water.' },
      { id: 14, blurb: 'Healthy oceans and aquatic ecosystems are essential for marine life and the planet.' },
    ],
    games: [
      {
        title: 'easy buye: Ocean Salvage',
        desc: 'Program a fleet of underwater robots to intercept drifting plastic in real currents.',
        href: '/games/ocean/',
        art: 'ocean',
      },
    ],
  },
  energy: {
    id: 'energy',
    kind: 'solar',
    name: 'Energy & Future',
    focus: 'Energy, technology, infrastructure, cities, and sustainable development.',
    sdgs: [
      { id: 7, blurb: 'Access to reliable and sustainable energy is essential for a sustainable future.' },
      { id: 9, blurb: 'Innovation and sustainable infrastructure support long-term development.' },
      { id: 11, blurb: 'Sustainable energy and infrastructure can help create more resilient communities.' },
      { id: 12, blurb: 'Using resources and energy responsibly helps reduce environmental impact.' },
    ],
    games: [
      {
        title: 'ECO-GRID',
        desc: 'Energy & human systems — keep an island community powered with clean choices.',
        href: '/games/energy/',
        art: 'energy',
      },
    ],
  },
}
