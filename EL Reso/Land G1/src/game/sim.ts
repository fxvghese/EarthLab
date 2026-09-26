import { clamp } from "@/lib/utils";

/** Trees — two families with different growth speed and carbon absorption. */
export type SpeciesId = "oak" | "pine";

export interface Species {
  id: SpeciesId;
  name: string;
  /** canopy layer this species occupies: 0 = emergent, 1 = canopy, 2 = understory, 3 = forest floor */
  layer: 0 | 1 | 2 | 3;
  /** share of final carbon rate absorbed by the roots / soil */
  rootShare: number;
  /** carbon absorbed per second at full growth (relative units) */
  absorb: number;
  /** water consumed per second at full growth */
  thirst: number;
  /** growth per second (0..1 scale) */
  growth: number;
  /** planting cost */
  cost: number;
  /** trunk/canopy colors */
  color: string;
  trunkColor: string;
  desc: string;
}

export const SPECIES: Record<SpeciesId, Species> = {
  oak: {
    id: "oak",
    name: "Oak",
    layer: 0,
    rootShare: 0.34,
    absorb: 0.9,
    thirst: 0.16,
    growth: 0.028,
    cost: 24,
    color: "#f97316",
    trunkColor: "#8a5a33",
    desc: "Emergent giant · slow · deep roots",
  },
  pine: {
    id: "pine",
    name: "Pine",
    layer: 1,
    rootShare: 0.28,
    absorb: 0.62,
    thirst: 0.1,
    growth: 0.05,
    cost: 14,
    color: "#10b981",
    trunkColor: "#6b4f36",
    desc: "Canopy conifer · fast, thirsty",
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export interface Plant {
  uid: number;
  species: SpeciesId;
  x: number; // 0..1 across the land strip
  growth: number; // 0..1
  seedTime: number; // sim seconds when planted
}

export type Phase = "intro" | "playing" | "won" | "lost";

export interface SimState {
  plants: Plant[];
  water: number; // 0..1 reservoir
  carbon: number; // atmospheric carbon, 0..1 where 1 = starting crisis level
  credits: number;
  time: number; // sim seconds
  rainTimer: number;
  stableFor: number; // seconds the full win-gate has been held
  history: { t: number; carbon: number; bio: number }[];
  collapsed: boolean;
  /* --- population & resources --- */
  population: number; // humans living on the land
  food: number; // 0..1 vegetation-based food stock
  popTimer: number; // countdown to the next population change
  stressFor: number; // seconds spent in critical ecosystem stress
  /* --- fauna: herbivores & predators --- */
  deer: number; // herbivore herd size
  wolves: number; // predator pack size
  herdTimer: number; // countdown to the next herd change
  packTimer: number; // countdown to the next pack change
}

/* ------------------------------ tuning constants ------------------------------ */

export const TARGET = 30; // % carbon reduction required to win
export const TARGET_STABLE_SECONDS = 20; // the full win-gate must hold this long
export const WIN_BALANCE = 80; // ecosystem balance required
export const WIN_WATER = 0.6; // water stability required
export const WIN_BIO = 60; // biodiversity % required
export const WIN_FOOD = 0.35; // food must stay above critical level
export const STRESS_LIMIT_SECONDS = 25; // sustained critical stress → collapse
export const POP_MAX = 14;
export const POP_INTERVAL = 12; // sim seconds between population changes
export const SEED_COST = 15; // cloudseed price in carbon credits
export const SEED_WATER = 0.28; // water added per cloudseed
export const SETTLE_COST = 20; // recruit a new settler directly
export const DEER_COST = 18; // release a deer pair onto the land
export const HERD_MAX = 10; // max deer the land can hold
export const HERD_INTERVAL = 9; // sim seconds between herd changes
export const PACK_MAX = 4; // max wolves the land can hold
export const PACK_INTERVAL = 14; // sim seconds between pack changes
const DEER_EAT = 0.0011; // food grazed per deer per second
const WOLF_KILL = 0.09; // deer killed per wolf per second when hunting
const RAIN_INTERVAL = 11;
const FOOD_REGROW = 0.05; // food regenerated per second at full biomass
const FOOD_EAT = 0.0035; // food eaten per person per second
const HUMAN_WATER = 0.0018; // water drawn per person per second

export const initialState = (): SimState => ({
  plants: [],
  water: 0.62,
  carbon: 1,
  credits: 150,
  time: 0,
  rainTimer: RAIN_INTERVAL,
  stableFor: 0,
  history: [{ t: 0, carbon: 1, bio: 0 }],
  collapsed: false,
  population: 2,
  food: 0.35,
  popTimer: POP_INTERVAL,
  stressFor: 0,
  deer: 0,
  wolves: 0,
  herdTimer: HERD_INTERVAL,
  packTimer: PACK_INTERVAL,
});

/** per-species absorbed carbon per second for a plant at its current growth */
export const plantAbsorb = (p: Plant) => SPECIES[p.species].absorb * p.growth;
export const plantThirst = (p: Plant) => SPECIES[p.species].thirst * (0.35 + 0.65 * p.growth);
export const plantRoot = (p: Plant) => SPECIES[p.species].rootShare * p.growth;

export interface Alerts {
  drought: boolean;
  overpop: boolean;
  bioCollapse: boolean;
  depletion: boolean;
  crisis: boolean;
  critical: boolean;
  recovering: boolean;
  overbrowse: boolean; // deer herd exceeding the land's grazing capacity
  wolvesArrived: boolean;
}

export interface Derived {
  /** total ecosystem carbon absorption per second (gross, before moisture penalty) */
  absorbRaw: number;
  /** absorption after water stress + population pressure */
  absorb: number;
  thirst: number;
  root: number;
  biomass: number; // 0..~1
  layerMass: [number, number, number, number]; // emergent, canopy, understory, floor
  soil: number; // 0..1 — locked carbon in roots & humus
  moisture: "arid" | "dry" | "fair" | "humid" | "flooded";
  balance: number; // 0..100 ecosystem health
  reduction: number; // 0..100 %
  stability: number; // seconds the win-gate has been held
  diversity: number; // distinct species
  /* --- population & resources --- */
  capacity: number; // dynamic carrying capacity (people)
  biodiversity: number; // 0..100 index
  animalLevel: number; // 0..1 wildlife abundance
  health: number; // 0..1 visual vegetation health
  pressure: number; // 0..1 overpopulation pressure
  alerts: Alerts;
  winReady: boolean; // every win condition currently met
  /* --- fauna --- */
  deerCapacity: number; // grazing capacity for herbivores
  wolfCapacity: number; // pack size the prey base can sustain
}

export const derive = (s: SimState): Derived => {
  const layerMass: [number, number, number, number] = [0, 0, 0, 0];
  let absorbRaw = 0;
  let thirst = 0;
  let root = 0;
  let biomass = 0;
  for (const p of s.plants) {
    const sp = SPECIES[p.species];
    layerMass[sp.layer] += p.growth;
    absorbRaw += plantAbsorb(p);
    thirst += plantThirst(p);
    root += plantRoot(p);
    biomass += p.growth * (sp.layer === 0 ? 0.34 : sp.layer === 1 ? 0.24 : sp.layer === 2 ? 0.15 : 0.08);
  }
  biomass = clamp(biomass, 0, 1.15);

  const diversity = new Set(s.plants.map((p) => p.species)).size;
  const divScore = clamp(diversity / 4, 0, 1);

  const drought = s.water < 0.2 ? clamp(0.25 + s.water * 2.5, 0.25, 0.75) : 1;
  const flood = s.water > 0.9 ? 0.8 : 1;

  /* ------------------------- dynamic carrying capacity ------------------------- */
  const capacity = clamp(
    Math.round(2 + Math.min(biomass, 1) * 6 + s.water * 3 + divScore * 2 + clamp(s.deer / 6, 0, 1)),
    0,
    15
  );
  const overpop = s.population > capacity;
  const pressure = clamp((s.population - capacity) / Math.max(3, capacity), 0, 1);

  const absorb = absorbRaw * Math.min(drought, flood) * (1 - pressure * 0.35);
  const soil = clamp(root * 6, 0, 1);

  const reduction = clamp((1 - s.carbon) * 100, 0, 100);

  const waterScore = 1 - Math.abs(s.water - 0.55) * 1.7;
  const layerScore =
    layerMass[0] > 0.05 && layerMass[1] > 0.05 && layerMass[2] > 0.05
      ? 1
      : layerMass[1] > 0.05 && layerMass[2] > 0.05
        ? 0.75
        : 0.4;
  const carbonScore = clamp(1 - s.carbon, 0, 1);

  const balance = Math.round(
    clamp(waterScore * 0.3 + layerScore * 0.3 + divScore * 0.15 + carbonScore * 0.25, 0, 1) * 100
  );

  const moisture: Derived["moisture"] =
    s.water < 0.2 ? "arid" : s.water < 0.4 ? "dry" : s.water < 0.75 ? "fair" : s.water < 0.9 ? "humid" : "flooded";

  /* --------------------------- biodiversity & wildlife -------------------------- */
  // living biodiversity index: flora diversity + structure + soil + resident fauna
  const faunaScore = clamp(Math.min(s.deer, 5) / 5, 0, 1) * 0.13 + clamp(Math.min(s.wolves, 2) / 2, 0, 1) * 0.12;
  const biodiversity = Math.round(
    clamp(divScore * 0.3 + Math.min(biomass, 1) * 0.25 + soil * 0.2 + faunaScore, 0, 1) * 100
  );
  const animalLevel = clamp(
    (balance / 100) * (0.4 + 0.6 * divScore) * clamp(biomass * 1.8, 0, 1) * (1 - pressure * 0.6) * (s.water < 0.15 ? 0.5 : 1),
    0,
    1
  );

  /* ------------------------------ visual vegetation ----------------------------- */
  const health = clamp(
    0.3 * waterScore + 0.4 * clamp(biomass * 1.3, 0, 1) + 0.15 * divScore + 0.15 * (1 - pressure),
    0.05,
    1
  );

  /* --------------------------------- fauna --------------------------------- */
  // deer need grazing ground (canopy + emergent canopy shelter), water, and grass
  const deerCapacity = clamp(
    Math.round(clamp(layerMass[1] * 1.6 + layerMass[0] * 0.7, 0, 4) + s.water * 3 + Math.min(biomass, 1) * 3),
    0,
    HERD_MAX
  );
  // wolves follow the prey base: they need a thriving herd to sustain a pack
  const wolfCapacity = clamp(Math.round(deerCapacity / 3.5), 0, PACK_MAX);

  /* --------------------------------- alerts --------------------------------- */
  const bioCollapse = diversity < 2 && biomass > 0.3;
  const overbrowse = s.deer > deerCapacity;
  const depletion = s.water < 0.2 && s.food < 0.2;
  const crisis = overpop && (s.water < 0.25 || s.food < 0.25);
  const critical = s.stressFor > 0;
  const recovering =
    !overpop &&
    !critical &&
    balance >= 50 &&
    s.water >= 0.45 &&
    s.food >= 0.45 &&
    diversity >= 3 &&
    s.population > 0;

  const stability = clamp(s.stableFor, 0, TARGET_STABLE_SECONDS);
  const winReady =
    reduction >= TARGET &&
    balance >= WIN_BALANCE &&
    s.water >= WIN_WATER &&
    biodiversity >= WIN_BIO &&
    !overpop &&
    s.food >= WIN_FOOD;

  return {
    absorbRaw,
    absorb,
    thirst,
    root,
    biomass: Math.min(biomass, 1),
    layerMass,
    soil,
    moisture,
    balance,
    reduction,
    stability,
    diversity,
    capacity,
    biodiversity,
    animalLevel,
    health,
    pressure,
    alerts: {
      drought: s.water < 0.2,
      overpop,
      bioCollapse,
      depletion,
      crisis,
      critical,
      recovering,
      overbrowse,
      wolvesArrived: s.wolves > 0,
    },
    winReady,
    deerCapacity,
    wolfCapacity,
  };
};

const RAINFALL = 0.34;
const EVAP_BASE = 0.014;

/** Advance the simulation by dt seconds. Mutates a shallow-cloned state. */
export function tick(prev: SimState, dt: number): SimState {
  if (prev.collapsed) return prev;
  const s: SimState = {
    ...prev,
    plants: prev.plants.map((p) => ({ ...p })),
    history: prev.history,
  };
  s.time += dt;

  // rainfall pulses
  s.rainTimer -= dt;
  const raining = s.rainTimer < 2.4;
  if (s.rainTimer <= 0) s.rainTimer = RAIN_INTERVAL + Math.random() * 3;

  const d0 = derive(s); // capacity/pressure BEFORE this step's growth
  const waterFactor = clamp(0.25 + s.water * 1.5, 0.25, 1.15);

  // plants grow; growth depends on water and slows under population pressure
  for (const p of s.plants) {
    const sp = SPECIES[p.species];
    let rate = sp.growth * waterFactor;
    if (d0.alerts.drought) rate *= 0.5; // drought slows growth
    if (d0.pressure > 0) rate *= 1 - d0.pressure * 0.5; // overpopulation slows growth
    p.growth = clamp(p.growth + rate * dt, 0, 1);
  }

  const d = derive(s);

  // food: regenerated by vegetation, eaten by humans
  const foodProd = Math.min(biomassOf(d) * FOOD_REGROW, 0.06) * waterFactor * dt;
  const foodEaten = s.population * FOOD_EAT * dt * (1 + d.pressure * 0.8);
  s.food = clamp(s.food + foodProd - foodEaten, 0, 1);

  // water: plant consumption + human consumption + evaporation (+ rain)
  const consumption = d.thirst * dt * 0.08;
  const humanDraw = s.population * HUMAN_WATER * dt * (1 + d.pressure * 0.8);
  const evap = (EVAP_BASE + s.plants.length * 0.0011) * dt;
  const rain = (raining ? RAINFALL : 0) * dt;
  s.water = clamp(s.water + rain - consumption - humanDraw - evap, 0, 1);

  // drought withers plants
  if (s.water <= 0.02) {
    for (const p of s.plants) p.growth = clamp(p.growth - 0.055 * dt, 0, 1);
  }
  // overpopulation degrades biomass (land pressure)
  if (d.pressure > 0) {
    for (const p of s.plants) p.growth = clamp(p.growth - d.pressure * 0.03 * dt, 0, 1);
    s.food = clamp(s.food - d.pressure * 0.004 * dt, 0, 1);
  }

  /* ---------------------- fauna: herbivores & predators ---------------------- */
  // deer graze: they eat the same vegetation-food pool humans do
  const grazed = s.deer * DEER_EAT * dt * (1 + d.pressure * 0.5);
  s.food = clamp(s.food - grazed, 0, 1);
  // overbrowsing stunts the forest floor layer (seedlings get eaten)
  if (d.alerts.overbrowse) {
    for (const p of s.plants) {
      if (SPECIES[p.species].layer >= 2) p.growth = clamp(p.growth - 0.02 * dt, 0, 1);
    }
  }
  // wolves cull the herd — this is the natural check that keeps deer from
  // stripping the land. Hunting yield feeds the human food pool a little.
  if (s.wolves > 0 && s.deer > 0) {
    const killed = Math.min(s.deer, s.wolves * WOLF_KILL * dt);
    s.deer = Math.max(0, s.deer - Math.floor(killed) - (Math.random() < killed % 1 ? 1 : 0));
    s.food = clamp(s.food + killed * 0.004, 0, 1); // carcasses → scavengers & soil
  }

  /* ------------------------- population dynamics ------------------------- */
  const dPost = derive(s);
  const canGrow =
    s.population < dPost.capacity &&
    s.population < POP_MAX &&
    s.food > 0.5 &&
    s.water > 0.4 &&
    dPost.balance >= 55;
  const mustShrink = s.food < 0.1 || s.water < 0.08 || dPost.balance < 22;

  if (canGrow) {
    s.popTimer -= dt;
    if (s.popTimer <= 0) {
      s.population += 1; // gradual: 2 → 3 → 4 …
      s.popTimer = POP_INTERVAL;
    }
  } else if (mustShrink && s.population > 0) {
    s.popTimer -= dt;
    if (s.popTimer <= 0) {
      s.population -= 1; // people leave degraded land gradually
      s.popTimer = 8;
    }
  } else {
    // population holds steady; timer drifts back toward the next growth window
    s.popTimer = Math.min(s.popTimer + dt * 0.5, POP_INTERVAL);
  }

  /* ------------------------- fauna population dynamics ------------------------- */
  const dFauna = derive(s);
  const herdCanGrow =
    s.deer < dFauna.deerCapacity &&
    dFauna.biomass > 0.18 &&
    s.food > 0.4 &&
    s.water > 0.3;
  const herdMustShrink = s.deer > dFauna.deerCapacity || s.food < 0.12 || s.water < 0.1 || dFauna.biomass < 0.08;

  if (herdCanGrow && s.deer < HERD_MAX) {
    s.herdTimer -= dt;
    if (s.herdTimer <= 0) {
      s.deer += 1; // fawns arrive gradually
      s.herdTimer = HERD_INTERVAL;
    }
  } else if (herdMustShrink && s.deer > 0) {
    s.herdTimer -= dt;
    if (s.herdTimer <= 0) {
      s.deer -= 1; // grazing failure or predation
      s.herdTimer = 6;
    }
  } else {
    s.herdTimer = Math.min(s.herdTimer + dt * 0.5, HERD_INTERVAL);
  }

  // wolves only settle once the herd is thriving, and leave when it starves
  const packCanGrow = s.wolves < Math.min(dFauna.wolfCapacity, Math.floor(s.deer / 2)) && s.deer >= 3;
  const packMustShrink = s.wolves > 0 && (s.deer < 2 || s.food < 0.08 || dFauna.biomass < 0.06);
  if (packCanGrow && s.wolves < PACK_MAX) {
    s.packTimer -= dt;
    if (s.packTimer <= 0) {
      s.wolves += 1;
      s.packTimer = PACK_INTERVAL;
    }
  } else if (packMustShrink) {
    s.packTimer -= dt;
    if (s.packTimer <= 0) {
      s.wolves -= 1;
      s.packTimer = 7;
    }
  } else {
    s.packTimer = Math.min(s.packTimer + dt * 0.5, PACK_INTERVAL);
  }

  /* ------------------------- critical stress / collapse ------------------------ */
  const criticalNow = s.population > dPost.capacity && (s.water < 0.2 || s.food < 0.2) && dPost.balance < 30;
  if (criticalNow) s.stressFor += dt;
  else s.stressFor = Math.max(0, s.stressFor - dt * 1.5);

  /* ------------------------------- win gate -------------------------------- */
  const dWin = derive(s);
  const faunaThriving = s.deer >= 2 && s.wolves >= 1; // a complete food web
  if (dWin.winReady && faunaThriving && dWin.absorb > 0.052) s.stableFor += dt;
  else s.stableFor = 0;

  // history sampling (~2 samples / sim-second)
  const nd = derive(s);
  const last = s.history[s.history.length - 1];
  if (!last || s.time - last.t > 0.5) {
    s.history = [...s.history.slice(-160), { t: s.time, carbon: s.carbon, bio: nd.biomass }];
  }

  // collapse: everything died of drought
  if (s.plants.length > 0 && s.plants.every((p) => p.growth <= 0.001) && dWin.absorbRaw < 0.02) {
    s.collapsed = true;
  }

  return s;
}

const biomassOf = (d: Derived) => d.biomass;

export const canAfford = (s: SimState, id: SpeciesId) => s.credits >= SPECIES[id].cost;
export const totalBiomass = (s: SimState) => derive(s).biomass;
