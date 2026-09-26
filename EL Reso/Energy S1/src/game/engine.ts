// ─────────────────────────────────────────────────────────────────────────────
// ECO-GRID survival simulator — game engine
// A simplified, educational model. Values are believable relative units, not
// real electrical-grid numbers (demand/generation are "megawatt-hours/day").
// ─────────────────────────────────────────────────────────────────────────────

export type SourceId = "solar" | "wind" | "hydro";

export type WeatherKind =
  | "clear"
  | "cloudy"
  | "rain"
  | "storm"
  | "calm"
  | "breezy"
  | "strong-wind"
  | "drought"
  | "river-normal"
  | "fog";

export interface WeatherEvent {
  kind: WeatherKind;
  label: string;
  icon: string;
  /** Sky condition affecting solar */
  sky: "clear" | "cloudy" | "rain" | "storm" | "fog";
  /** Wind condition affecting turbines */
  wind: "calm" | "breezy" | "strong" | "storm-gusts";
  /** River condition affecting hydro */
  river: "normal" | "low" | "flood";
}

export const WEATHER: Record<WeatherKind, WeatherEvent> = {
  clear: {
    kind: "clear",
    label: "Clear Skies",
    icon: "☀️",
    sky: "clear",
    wind: "breezy",
    river: "normal",
  },
  cloudy: {
    kind: "cloudy",
    label: "Cloud Cover",
    icon: "⛅",
    sky: "cloudy",
    wind: "breezy",
    river: "normal",
  },
  rain: {
    kind: "rain",
    label: "Rainfall",
    icon: "🌧️",
    sky: "rain",
    wind: "breezy",
    river: "normal",
  },
  storm: {
    kind: "storm",
    label: "Storm Front",
    icon: "⛈️",
    sky: "storm",
    wind: "storm-gusts",
    river: "flood",
  },
  calm: {
    kind: "calm",
    label: "Calm High Pressure",
    icon: "🍃",
    sky: "clear",
    wind: "calm",
    river: "normal",
  },
  breezy: {
    kind: "breezy",
    label: "Breezy",
    icon: "🌬️",
    sky: "clear",
    wind: "breezy",
    river: "normal",
  },
  "strong-wind": {
    kind: "strong-wind",
    label: "Strong Wind",
    icon: "💨",
    sky: "cloudy",
    wind: "strong",
    river: "normal",
  },
  drought: {
    kind: "drought",
    label: "Drought",
    icon: "🏜️",
    sky: "clear",
    wind: "calm",
    river: "low",
  },
  "river-normal": {
    kind: "river-normal",
    label: "River Swell",
    icon: "🌊",
    sky: "cloudy",
    wind: "breezy",
    river: "normal",
  },
  fog: {
    kind: "fog",
    label: "Dense Fog",
    icon: "🌫️",
    sky: "fog",
    wind: "calm",
    river: "normal",
  },
};

export const TOTAL_DAYS = 12;

export interface DaySpec {
  /** Weather that is active when the player plans the day */
  weather: WeatherKind;
  /** Tomorrow's weather, shown as forecast (null on the final day) */
  forecast: WeatherKind | null;
  /** Settlement demand for the day (MWh) */
  demand: number;
}

// Hand-authored difficulty curve: demand climbs, later days stack harsh
// conditions. Interleaved between days 5+ are "wildcard" pairs so weather
// becomes less predictable.
const DAY_SPECS: DaySpec[] = [
  { weather: "clear", forecast: "cloudy", demand: 60 },
  { weather: "cloudy", forecast: "breezy", demand: 64 },
  { weather: "breezy", forecast: "calm", demand: 68 },
  { weather: "calm", forecast: "rain", demand: 72 },
  { weather: "rain", forecast: "storm", demand: 78 },
  { weather: "storm", forecast: "drought", demand: 84 },
  { weather: "drought", forecast: "strong-wind", demand: 92 },
  { weather: "strong-wind", forecast: "fog", demand: 100 },
  { weather: "fog", forecast: "clear", demand: 110 },
  { weather: "clear", forecast: "drought", demand: 118 },
  { weather: "drought", forecast: "storm", demand: 128 },
  { weather: "storm", forecast: null, demand: 138 },
];

// A second hidden wildcard table — from day 7, one day in three is rerolled
// from this table to make late-game weather less memorizable.
const WILDCARD: WeatherKind[] = ["storm", "drought", "fog", "strong-wind", "calm"];

export function buildSchedule(seed: number): DaySpec[] {
  // Deterministic pseudo-random generator so a given run is internally
  // consistent (forecast always matches tomorrow) but varies across restarts.
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };

  const schedule: DaySpec[] = DAY_SPECS.map((d) => ({ ...d }));
  for (let i = 6; i < schedule.length - 1; i++) {
    if (rand() < 0.45) {
      schedule[i].weather = WILDCARD[Math.floor(rand() * WILDCARD.length)];
      schedule[i - 1].forecast = schedule[i].weather;
    }
  }
  return schedule;
}

export function weatherFactor(kind: WeatherKind, source: SourceId): number {
  const w = WEATHER[kind];
  switch (source) {
    case "solar":
      switch (w.sky) {
        case "clear":
          return 1.0;
        case "fog":
          return 0.25;
        case "cloudy":
          return 0.5;
        case "rain":
          return 0.3;
        case "storm":
          return 0.1;
      }
      break;
    case "wind":
      switch (w.wind) {
        case "calm":
          return 0.2;
        case "breezy":
          return 0.7;
        case "strong":
          return 1.2;
        case "storm-gusts":
          return 1.0;
      }
      break;
    case "hydro":
      switch (w.river) {
        case "normal":
          return 1.0;
        case "low":
          return 0.15;
        case "flood":
          return 1.1;
      }
      break;
  }
  return 0;
}

export const MAX_OUTPUT: Record<SourceId, number> = {
  solar: 55,
  wind: 50,
  hydro: 45,
};
export const COAL_MAX_OUTPUT = 40;
export const BATTERY_CAPACITY = 80;

export const START_COAL = 180; // total coal energy reserve for the whole run
export const WIN_DAY = TOTAL_DAYS; // survive through day 12

export interface PlannedMix {
  solar: number;
  wind: number;
  hydro: number;
  coal: number;
}

export interface DayProjection {
  renewable: number;
  total: number;
  balance: number; // + surplus, − deficit
  coverage: number; // 0..1.2 share of demand met
  batteryDelta: number; // + charge, − drain
  batteryAfter: number;
  coalUsed: number;
  shortfall: number; // energy missing after battery
  outcome: "surplus" | "deficit-battery" | "blackout";
}

export interface GameState {
  day: number; // 1-based
  battery: number;
  coal: number;
  totalGenerated: number;
  totalRenewable: number;
  totalCoalBurned: number;
  blackouts: number;
  log: DayResult[];
  status: "playing" | "won" | "lost";
  lossReason: string | null;
}

export interface DayResult {
  day: number;
  weather: WeatherKind;
  demand: number;
  generated: number;
  renewable: number;
  coalUsed: number;
  batteryStart: number;
  batteryEnd: number;
  shortfall: number;
}

export function initialState(): GameState {
  return {
    day: 1,
    battery: 40,
    coal: START_COAL,
    totalGenerated: 0,
    totalRenewable: 0,
    totalCoalBurned: 0,
    blackouts: 0,
    log: [],
    status: "playing",
    lossReason: null,
  };
}

export function projectDay(
  mix: PlannedMix,
  weather: WeatherKind,
  battery: number,
  coal: number,
  demand: number
): DayProjection {
  const f = (s: SourceId) => weatherFactor(weather, s);

  // Sliders are a *capacity commitment*; realized output scales with weather.
  const solar = Math.min(mix.solar * f("solar"), MAX_OUTPUT.solar);
  const wind = Math.min(mix.wind * f("wind"), MAX_OUTPUT.wind);
  const hydro = Math.min(mix.hydro * f("hydro"), MAX_OUTPUT.hydro);
  const renewable = solar + wind + hydro;

  const coalPlanned = Math.min(mix.coal, coal, COAL_MAX_OUTPUT);
  const coalUsed = coalPlanned > 0 ? coalPlanned : 0;

  const total = renewable + coalUsed;
  const balance = total - demand;
  const coverage = total / demand;

  const batteryDelta =
    balance >= 0 ? Math.min(balance, BATTERY_CAPACITY - battery) : Math.max(balance, -battery);

  const batteryAfter = battery + batteryDelta;
  const shortfall = Math.max(0, -balance - battery);

  let outcome: DayProjection["outcome"];
  if (shortfall > 0) outcome = "blackout";
  else if (balance >= 0) outcome = "surplus";
  else outcome = "deficit-battery";

  return {
    renewable,
    total,
    balance,
    coverage,
    batteryDelta,
    batteryAfter,
    coalUsed,
    shortfall,
    outcome,
  };
}

export interface CommitOutcome {
  state: GameState;
  survived: boolean;
  result: DayResult;
}

export function commitDay(
  state: GameState,
  schedule: DaySpec[],
  mix: PlannedMix
): CommitOutcome {
  const spec = schedule[state.day - 1];
  const weather = spec.weather;
  const demand = spec.demand;

  const proj = projectDay(mix, weather, state.battery, state.coal, demand);

  const solar = Math.min(mix.solar * weatherFactor(weather, "solar"), MAX_OUTPUT.solar);
  const wind = Math.min(mix.wind * weatherFactor(weather, "wind"), MAX_OUTPUT.wind);
  const hydro = Math.min(mix.hydro * weatherFactor(weather, "hydro"), MAX_OUTPUT.hydro);
  const renewable = solar + wind + hydro;

  const batteryEnd = Math.max(0, Math.min(BATTERY_CAPACITY, proj.batteryAfter));
  const generated = renewable + proj.coalUsed;

  const result: DayResult = {
    day: state.day,
    weather,
    demand,
    generated,
    renewable,
    coalUsed: proj.coalUsed,
    batteryStart: state.battery,
    batteryEnd,
    shortfall: proj.shortfall,
  };

  const next: GameState = {
    ...state,
    battery: batteryEnd,
    coal: state.coal - proj.coalUsed,
    totalGenerated: state.totalGenerated + generated,
    totalRenewable: state.totalRenewable + renewable,
    totalCoalBurned: state.totalCoalBurned + proj.coalUsed,
    blackouts: state.blackouts + (proj.shortfall > 0 ? 1 : 0),
    log: [...state.log, result],
  };

  if (proj.shortfall > 0) {
    next.status = "lost";
    next.lossReason =
      weather === "drought"
        ? "Blackout during drought — river flow failed and reserves ran dry."
        : `Blackout on day ${state.day}: demand ${demand} MWh exceeded generation plus stored energy.`;
    return { state: next, survived: false, result };
  }

  if (state.day >= TOTAL_DAYS) {
    next.status = "won";
    next.lossReason = null;
    return { state: next, survived: true, result };
  }

  next.day = state.day + 1;
  return { state: next, survived: true, result };
}

export function availability(weather: WeatherKind): Record<SourceId, number> {
  return {
    solar: weatherFactor(weather, "solar"),
    wind: weatherFactor(weather, "wind"),
    hydro: weatherFactor(weather, "hydro"),
  };
}
