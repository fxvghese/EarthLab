# Energy & Human Systems — ECO-GRID Survival Simulator

A standalone eco-grid survival game built with **Vite 5 + React 18 + TypeScript + Tailwind CSS v4**,
with **three.js** (ambient energy-grid backdrop), **framer-motion** (UI animation) and the shadcn
registry **cursor-card** component (landing-page hover preview).

Keep a small human settlement powered for **12 days** by dispatching solar, wind and hydro through
changing weather, rationing a strictly finite coal reserve, and managing battery storage.

## Run it

```bash
bun install   # or npm install / pnpm install
bun run dev   # or npm run dev
```

- `/` — landing page with a launch button (and a cursor-card hover preview) that redirects to the game
- `/game.html` — the game itself

```bash
bun run build   # typecheck + production build (outputs to dist/)
bun test        # engine unit tests (bun:test)
```

## How to play

1. Each day shows the demand (MWh), current weather and tomorrow's forecast.
2. Move the **generation sliders** — they set committed capacity; realized output scales with the
   day's weather (cloud kills solar, calm kills wind, drought kills hydro…).
3. Cover the gap with the **coal plant** — the reserve is finite and never replenishes.
4. Surplus charges the **battery**; shortfalls drain it; an empty battery during a shortfall means
   **blackout** and the run ends.
5. Press **COMMIT CYCLE** to resolve the day. Survive all 12 to win.

Demand climbs every day, weather gets harsher, and from day 7 wildcard weather makes the forecast
less predictable. This is an educational simulation with believable relative values — not a real
electrical-grid model.

## Layout

```
index.html          landing entry          game.html           game entry
src/landing/        landing page           src/game/           game engine + UI
src/components/     EnergyBackground (three.js), ui/cursor-card (shadcn registry)
src/index.css       Tailwind v4 theme + slider styling
```
