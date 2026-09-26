import { describe, it, expect } from "bun:test";
import {
  buildSchedule,
  projectDay,
  commitDay,
  initialState,
  weatherFactor,
  WEATHER,
  TOTAL_DAYS,
  BATTERY_CAPACITY,
  START_COAL,
  type PlannedMix,
} from "./engine";

const mix = (solar: number, wind: number, hydro: number, coal: number): PlannedMix => ({
  solar,
  wind,
  hydro,
  coal,
});

describe("weather model", () => {
  it("gives clear skies full solar", () => {
    expect(weatherFactor("clear", "solar")).toBe(1.0);
  });
  it("halves solar under cloud", () => {
    expect(weatherFactor("cloudy", "solar")).toBe(0.5);
  });
  it("nearly kills solar in a storm", () => {
    expect(weatherFactor("storm", "solar")).toBeLessThanOrEqual(0.1);
  });
  it("boosts wind when strong, cuts it when calm", () => {
    expect(weatherFactor("strong-wind", "wind")).toBeGreaterThan(1.0);
    expect(weatherFactor("calm", "wind")).toBeLessThan(0.3);
  });
  it("drought cuts hydro to nearly nothing", () => {
    expect(weatherFactor("drought", "hydro")).toBeLessThan(0.2);
  });
  it("every weather kind has full metadata", () => {
    for (const key of Object.keys(WEATHER) as (keyof typeof WEATHER)[]) {
      expect(WEATHER[key].label.length).toBeGreaterThan(0);
      expect(WEATHER[key].icon.length).toBeGreaterThan(0);
    }
  });
});

describe("schedule", () => {
  it("has TOTAL_DAYS entries with forecasts chained correctly", () => {
    const s = buildSchedule(42);
    expect(s.length).toBe(TOTAL_DAYS);
    for (let i = 0; i < s.length - 1; i++) {
      expect(s[i].forecast).toBe(s[i + 1].weather);
    }
    expect(s[s.length - 1].forecast).toBeNull();
  });
  it("demand strictly increases (difficulty curve)", () => {
    const s = buildSchedule(7);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].demand).toBeGreaterThan(s[i - 1].demand);
    }
  });
  it("forecast always matches tomorrow even after wildcard rerolls", () => {
    for (const seed of [1, 99, 12345, 987654321]) {
      const s = buildSchedule(seed);
      for (let i = 0; i < s.length - 1; i++) {
        expect(s[i].forecast).toBe(s[i + 1].weather);
      }
    }
  });
});

describe("projection", () => {
  it("scales slider capacity by weather", () => {
    // 40 solar at 50% = 20
    const p = projectDay(mix(40, 0, 0, 0), "cloudy", 40, START_COAL, 60);
    expect(p.renewable).toBeCloseTo(20, 5);
  });
  it("charges battery on surplus up to capacity", () => {
    const p = projectDay(mix(55, 50, 45, 0), "clear", 40, START_COAL, 60);
    expect(p.balance).toBeGreaterThan(0);
    expect(p.batteryAfter).toBe(BATTERY_CAPACITY);
    expect(p.outcome).toBe("surplus");
  });
  it("drains battery on deficit and blacks out when insufficient", () => {
    const deficit = projectDay(mix(0, 0, 0, 0), "clear", 40, START_COAL, 60);
    expect(deficit.batteryAfter).toBe(0);
    expect(deficit.shortfall).toBe(20);
    expect(deficit.outcome).toBe("blackout");

    const covered = projectDay(mix(0, 0, 0, 0), "clear", 70, START_COAL, 60);
    expect(covered.outcome).toBe("deficit-battery");
    expect(covered.shortfall).toBe(0);
    expect(covered.batteryAfter).toBe(10);
  });
  it("never burns more coal than remains", () => {
    const p = projectDay(mix(0, 0, 0, 40), "clear", 40, 25, 60);
    expect(p.coalUsed).toBe(25);
  });
});

describe("commit flow", () => {
  it("loses the run when a blackout occurs", () => {
    const s0 = initialState();
    const out = commitDay(s0, buildSchedule(3), mix(0, 0, 0, 0));
    expect(out.survived).toBe(false);
    expect(out.state.status).toBe("lost");
    expect(out.state.lossReason).toContain("Blackout");
  });
  it("deducts coal and stores surplus across days", () => {
    const s0 = initialState();
    const out = commitDay(s0, buildSchedule(3), mix(55, 50, 45, 0));
    expect(out.survived).toBe(true);
    expect(out.state.day).toBe(2);
    expect(out.state.battery).toBe(BATTERY_CAPACITY);
    expect(out.state.coal).toBe(START_COAL);
    expect(out.state.totalGenerated).toBeGreaterThan(0);
  });
  it("is winnable with weather-aware play (battery kept full, coal rationed)", () => {
    let s = initialState();
    const sched = buildSchedule(11);
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const spec = sched[d - 1];
      // Strategy: fill the battery on every cycle, prefer renewables, and only
      // burn coal for the exact gap renewables cannot cover.
      const fs = weatherFactor(spec.weather, "solar");
      const fw = weatherFactor(spec.weather, "wind");
      const fh = weatherFactor(spec.weather, "hydro");
      const eff = [
        Math.min(55 * fs, 55),
        Math.min(50 * fw, 50),
        Math.min(45 * fh, 45),
      ];
      const effSum = eff[0] + eff[1] + eff[2];
      const need = spec.demand + (BATTERY_CAPACITY - s.battery);
      let solar: number, wind: number, hydro: number, coal: number;
      if (effSum >= need) {
        solar = eff[0] ? (55 * need) / effSum / (fs || 1) : 0;
        wind = eff[1] ? (50 * need) / effSum / (fw || 1) : 0;
        hydro = eff[2] ? (45 * need) / effSum / (fh || 1) : 0;
        coal = 0;
      } else {
        solar = 55;
        wind = 50;
        hydro = 45;
        coal = Math.min(40, need - effSum);
      }
      const out = commitDay(s, sched, mix(solar, wind, hydro, coal));
      expect(out.survived).toBe(true);
      s = out.state;
    }
    expect(s.status).toBe("won");
    expect(s.coal).toBeGreaterThan(0); // strategy must not exhaust the reserve
  });
});
