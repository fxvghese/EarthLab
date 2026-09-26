# EarthLab · SDGs in the Classroom

An interactive educational web experience that takes students on a journey around Planet Earth and through the 17 United Nations Sustainable Development Goals — finishing on a small island where every object opens a hands-on activity.

---

## The Experience

### 1 · The Journey (Home)
A scroll-driven flight through space and around the night side of Earth. As you travel, each of the **17 Sustainable Development Goals** appears in turn — from *No Poverty* to *Partnerships for the Goals* — with a short, student-friendly message.

### 2 · The Island Finale
The journey ends on a moonlit tropical island at night. Nothing here is decoration: **every object is a doorway** to an activity.

| Click… | To open… |
|---|---|
|  **The Moon** | **EarthLab: Climate Control** |
|  **A Tree** | **Land & Life** — Forest & Carbon Simulator |
|  **A Solar Panel** | **ECO-GRID** — Energy & Human Systems |
|  **A Cloud** | **Climate & Atmosphere** |
|  **A Fish** | **easy buye: Ocean Salvage** |

### 3 · EarthLab: Climate Control
A region-management climate simulation. Choose a real region — every one starts from **genuine NASA satellite observations** (land surface temperature and vegetation indices) — then take control:

- Add or remove **vegetation**
- Grow or shrink **urban development**
- Pick a **surface treatment** (vegetated, reflective, concrete, asphalt…)

Run the simulation and compare the outcome against the fixed NASA baseline: surface temperature, urban heat, vegetation cover and environmental health, plus an explanation of *why* the numbers moved and which SDGs your decisions touched.

### 4 · The Island Games
- **Land & Life — Forest & Carbon Simulator** · Grow and manage a forest, watch carbon storage and habitat respond. *(Goal 15 — Life on Land)*
- **ECO-GRID — Energy & Human Systems** · Keep the lights on for an island community using clean energy choices. *(Goal 7 — Affordable and Clean Energy)*
- **Climate & Atmosphere** · Drag the temperature and watch the atmosphere, ice and sea respond. *(Goal 13 — Climate Action)*
- **easy buye: Ocean Salvage** · Program a fleet of autonomous underwater vehicles to intercept drifting plastic across five missions. *(Goal 14 — Life Below Water)*

---

## How It Connects

```
Intro Journey → 17 SDGs → Island Finale → EarthLab + 4 mini-games
     (scroll)      (learn)    (discover)      (play & experiment)
```

## A Note on the Numbers

NASA satellite data provides every starting point, so each region begins from honest, comparable measurements. Everything that happens after you press "simulate" is an **educational estimate** — the games are teaching tools, not predictions.

## Project Layout

```
├── index.html        → the intro journey (home page)
├── earthlab.html     → EarthLab: Climate Control
└── EL Reso/          → the four island mini-games
    ├── Land G1/      → Land & Life
    ├── Energy S1/    → ECO-GRID
    ├── Climate G1/   → Climate & Atmosphere
    └── ocean/        → easy buye: Ocean Salvage
```
