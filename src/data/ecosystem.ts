/**
 * The ecosystem finale — interactive elements.
 *
 * Exactly 3 trees, 3 fish, 3 clouds and 2 solar panel arrays. The objects
 * themselves are the buttons: each is drawn inside the scene artwork and
 * wrapped in the `CursorCard` hover component. Counts are part of the
 * experience contract — never add or remove entries.
 */

export type EcosystemKind = 'tree' | 'fish' | 'cloud' | 'solar'

export interface EcosystemElement {
  /** Stable id used as React key and for selection state. */
  id: string
  kind: EcosystemKind
  /** Semantic name shown in the info panel title. */
  label: string
  /** One-liner shown in the cursor-following hover card. */
  hover: string
  /** Kicker line in the click info panel (ties the object to a goal). */
  kicker: string
  /** 1–2 sentence sustainability story shown on click. */
  info: string
  /** Scene coordinates in the 160×90 viewBox; positions the artwork. */
  x: number
  y: number
  /** Artwork scale multiplier. */
  scale: number
  /** Animation phase offset so objects never move in lockstep. */
  phase: number
}

export const ECOSYSTEM_TREES: EcosystemElement[] = [
  {
    id: 'tree-1',
    kind: 'tree',
    label: 'Great Takamaka',
    hover: 'Old-growth shoreline tree — the island’s carbon keeper.',
    kicker: 'Life on Land',
    info: 'One mature tropical tree breathes for a whole classroom: it stores carbon, shelters birds and insects, and its roots hold the hillside together. Protecting forests is Goal 15: Life on Land.',
    x: 17,
    y: 44.6,
    scale: 1.25,
    phase: 0,
  },
  {
    id: 'tree-2',
    kind: 'tree',
    label: 'Strangler Fig',
    hover: 'A canopy architect — its fruit feeds the forest night.',
    kicker: 'Life on Land',
    info: 'Fig trees feed more wildlife than any other plant in the tropics. A single fig can keep an entire food web alive through the dry season — that is why rangers call them the “pantry trees”.',
    x: 34,
    y: 40.2,
    scale: 1,
    phase: 2.1,
  },
  {
    id: 'tree-3',
    kind: 'tree',
    label: 'Coastal Pindle',
    hover: 'Young palm holding the beach line against the tide.',
    kicker: 'Life on Land',
    info: 'Coastal trees are living sea walls: they blunt storm waves, trap sand, and keep the freshwater lens beneath the island from turning salty. Young palms are planted every year to keep that shield strong.',
    x: 8.6,
    y: 47.4,
    scale: 0.82,
    phase: 4.2,
  },
]

export const ECOSYSTEM_FISH: EcosystemElement[] = [
  {
    id: 'fish-1',
    kind: 'fish',
    label: 'Parrotfish',
    hover: 'Sand-maker — coral grazers build the beaches above.',
    kicker: 'Life Below Water',
    info: 'Parrotfish nibble algae off coral and exhale fine white sand — much of every tropical beach is ground-up coral made by fish like this one. Healthy reefs need healthy grazers: Goal 14, Life Below Water.',
    x: 130,
    y: 74.5,
    scale: 1.1,
    phase: 0,
  },
  {
    id: 'fish-2',
    kind: 'fish',
    label: 'Blue Tang',
    hover: 'Reef gardener, keeping algae from smothering coral.',
    kicker: 'Life Below Water',
    info: 'Blue tangs graze the algae that would otherwise smother coral polyps. Without these gardeners, reefs turn dark and silent. Cleaner water means more fish — and more fish means a healthier ocean.',
    x: 119,
    y: 79.5,
    scale: 0.85,
    phase: 1.7,
  },
  {
    id: 'fish-3',
    kind: 'fish',
    label: 'Lanternfish',
    hover: 'Midnight migrant that carries carbon into the deep.',
    kicker: 'Life Below Water',
    info: 'Every night lanternfish rise to feed near the surface and sink again by dawn, hauling carbon down into the deep ocean in their bodies. The largest migration on Earth happens quietly, every single night.',
    x: 144,
    y: 81,
    scale: 0.7,
    phase: 3.4,
  },
]

export const ECOSYSTEM_CLOUDS: EcosystemElement[] = [
  {
    id: 'cloud-1',
    kind: 'cloud',
    label: 'Night Stratus',
    hover: 'A slow river of moisture above the island.',
    kicker: 'Climate Action',
    info: 'Clouds are the sky’s thermostat: low clouds reflect sunlight away, high clouds hold warmth in. Watching them helps scientists read a changing climate — Goal 13, Climate Action.',
    x: 114,
    y: 27,
    scale: 1.15,
    phase: 0,
  },
  {
    id: 'cloud-2',
    kind: 'cloud',
    label: 'Moon Veil',
    hover: 'Threading across the moon — Earth’s heat blanket at work.',
    kicker: 'Climate Action',
    info: 'Cloud cover is a blanket: on cloudy nights the island stays warmer because clouds trap the day’s heat. More moisture in a warming sky means thicker, longer-lasting blankets.',
    x: 134,
    y: 24,
    scale: 0.8,
    phase: 2.6,
  },
  {
    id: 'cloud-3',
    kind: 'cloud',
    label: 'Trade-wind Puff',
    hover: 'Riding the trade winds that cool the shoreline.',
    kicker: 'Climate Action',
    info: 'Trade winds carry rain to the hillside and cool the shallows where coral grows. When ocean temperatures shift, these winds wander — and weather patterns far beyond this island shift with them.',
    x: 60,
    y: 21,
    scale: 0.95,
    phase: 5.1,
  },
]

export const ECOSYSTEM_SOLARS: EcosystemElement[] = [
  {
    id: 'solar-1',
    kind: 'solar',
    label: 'Ridge Array',
    hover: 'Moonlit panels that drink sunlight by day.',
    kicker: 'Affordable and Clean Energy',
    info: 'These panels power the ranger station and classroom lights — no fuel, no fumes, no fuel shipments across the ocean. Clean energy on islands means independence from imported diesel: Goal 7.',
    x: 24,
    y: 45.7,
    scale: 1.15,
    phase: 0,
  },
  {
    id: 'solar-2',
    kind: 'solar',
    label: 'Shore Array',
    hover: 'Tilted to catch the equatorial sun all year round.',
    kicker: 'Affordable and Clean Energy',
    info: 'Tilted at the island’s latitude, each array harvests sunlight even on hazy days. Every kilowatt-hour from the sun is one less burned from fossil fuels — the quiet work of Goal 7, Affordable and Clean Energy.',
    x: 45,
    y: 46.2,
    scale: 0.95,
    phase: 1.2,
  },
]
