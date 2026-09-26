import type { GarbageItem } from './types'
import { WORLD } from './types'

export interface CurrentZone {
  cx: number
  cz: number
  radius: number
  angle: number
  strength: number
}

export interface MissionDef {
  id: number
  name: string
  brief: string
  garbageCount: number
  timeLimit: number
  fleetSize: number
  battery: number
  targetPct: number
  currents: CurrentZone[]
  /** fraction of world radius where current influence fades */
  currentFalloff: number
  obstacles: { x: number; z: number; r: number }[]
  starterCode: string
  tips: string[]
}

/* ───────────────────────── starter code per mission ───────────────────────── */

const M1_CODE = `// MISSION 1 — patrol the patch and sweep it clean
// Move to each corner to cover the whole area.

float patrolX[4] = { 20, 20, -20, -20 };
float patrolZ[4] = { 20, -20, -20, 20 };

void patrol() {
  for (int i = 0; i < 4; i++) {
    moveTo(patrolX[i], patrolZ[i]);
  }
}

void update() {
  if (detectTrash()) {
    goToTrash();
  } else {
    patrol();
  }
}
`

const M2_CODE = `// MISSION 2 — the patch drifts with the current.
// keep chasing the nearest trash and collect it.

void patrol() {
  moveTo(-25, 25);
  moveTo(25, 25);
  moveTo(25, -25);
  moveTo(-25, -25);
}

void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`

const M3_CODE = `// MISSION 3 — currents flip over time. watch the arrows!
// when the battery runs low, return to base to recharge.

void patrol() {
  moveTo(-30, 30);
  moveTo(30, 30);
  moveTo(30, -30);
  moveTo(-30, -30);
}

void update() {
  if (battery() < 25) {
    returnToBase();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`

const M4_CODE = `// MISSION 4 — the great garbage patch. several current
// zones push waste around. patrol near the strongest
// current edges where trash accumulates.

void patrol() {
  moveTo(-38, 38);
  moveTo(0, 42);
  moveTo(38, 38);
  moveTo(38, -38);
  moveTo(0, -42);
  moveTo(-38, -38);
}

void update() {
  if (battery() < 30) {
    returnToBase();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`

const M5_CODE = `// MISSION 5 — deep ocean recovery. obstacles everywhere,
// brutal currents, and a long way from base.
// avoidObstacle() lets the AUV dodge rocks on its way.

void patrol() {
  moveTo(-40, 0);
  moveTo(0, 40);
  moveTo(40, 0);
  moveTo(0, -40);
}

void update() {
  if (battery() < 40) {
    returnToBase();
  } else if (nearBase() && loadWeight() >= 20) {
    collect();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`

/* ───────────────────────────── missions ───────────────────────────── */

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    name: 'Training Grounds',
    brief:
      'Calm water. A small patch of plastic bottles drifted into the bay. Perfect conditions to test a patrol program on a single AUV.',
    garbageCount: 26,
    timeLimit: 300,
    fleetSize: 1,
    battery: 100,
    targetPct: 0.72,
    currentFalloff: 0.5,
    currents: [
      { cx: -18, cz: 10, radius: 40, angle: Math.PI / 2 + 0.25, strength: 0.35 },
      { cx: 20, cz: -14, radius: 38, angle: -Math.PI / 2 - 0.2, strength: 0.3 },
    ],
    obstacles: [],
    starterCode: M1_CODE,
    tips: [
      'press DEPLOY CODE to send the program to the AUV',
      'the AUV only collects when you call collect() within range',
      'use goToTrash() — it combines detection, navigation and collection',
    ],
  },
  {
    id: 2,
    name: 'Drifting Plastic',
    brief:
      'A tidal stream is pushing a wide plastic slick south-west. Two AUVs share one program — split their patrol routes or they will all chase the same trash.',
    garbageCount: 55,
    timeLimit: 300,
    fleetSize: 2,
    battery: 100,
    targetPct: 0.75,
    currentFalloff: 0.45,
    currents: [
      { cx: -10, cz: 22, radius: 52, angle: Math.PI * 0.78, strength: 0.9 },
      { cx: 24, cz: -6, radius: 40, angle: Math.PI * 0.62, strength: 0.6 },
    ],
    obstacles: [],
    starterCode: M2_CODE,
    tips: [
      'currents push garbage — aim up-current of the patch',
      'detectTrash() has a limited radius, patrol wider',
      'loadWeight() tells you how full the AUV is',
    ],
  },
  {
    id: 3,
    name: 'Current Trap',
    brief:
      'Converging currents spin the patch in circles. Intercepting here means fighting drift, and the fleet burns battery fast. Recharge at base or lose vehicles.',
    garbageCount: 70,
    timeLimit: 300,
    fleetSize: 3,
    battery: 100,
    targetPct: 0.7,
    currentFalloff: 0.42,
    currents: [
      { cx: 0, cz: 0, radius: 34, angle: 0, strength: 1.15 },
      { cx: -34, cz: 26, radius: 34, angle: Math.PI * 0.9, strength: 0.85 },
      { cx: 34, cz: -26, radius: 34, angle: Math.PI * 0.35, strength: 0.85 },
    ],
    obstacles: [],
    starterCode: M3_CODE,
    tips: [
      'battery() below 25 means it is time to returnToBase()',
      'idle AUVs still drain a little power',
      'followCurrent() rides the flow to save energy',
    ],
  },
  {
    id: 4,
    name: 'The Great Garbage Patch',
    brief:
      'Five current gyres herd waste into rotating rafts across the whole sector. Four AUVs, one shared program, a hard deadline. Efficiency decides the mission.',
    garbageCount: 110,
    timeLimit: 300,
    fleetSize: 4,
    battery: 100,
    targetPct: 0.65,
    currentFalloff: 0.4,
    currents: [
      { cx: -32, cz: 32, radius: 30, angle: Math.PI * 0.75, strength: 1.0 },
      { cx: 34, cz: 30, radius: 30, angle: Math.PI * 0.25, strength: 0.8 },
      { cx: 0, cz: 0, radius: 36, angle: Math.PI * 1.5, strength: 1.2 },
      { cx: -36, cz: -30, radius: 30, angle: Math.PI * 1.2, strength: 0.8 },
      { cx: 34, cz: -34, radius: 30, angle: Math.PI * 1.75, strength: 1.0 },
    ],
    obstacles: [],
    starterCode: M4_CODE,
    tips: [
      'guard the gyre edges — trash accumulates there',
      'with 4 AUVs one shared program can collide: stagger waypoints with the AUV index',
      'the clock is the real enemy: every second of idle is wasted coverage',
    ],
  },
  {
    id: 5,
    name: 'Deep Ocean Recovery',
    brief:
      'The final site: a deep trench current swirl, submerged container wrecks blocking paths, and half-charged batteries. Only sharp, efficient logic finishes this cleanup.',
    garbageCount: 120,
    timeLimit: 330,
    fleetSize: 4,
    battery: 70,
    targetPct: 0.6,
    currentFalloff: 0.38,
    currents: [
      { cx: -26, cz: 20, radius: 30, angle: Math.PI * 0.8, strength: 1.3 },
      { cx: 28, cz: 24, radius: 28, angle: Math.PI * 0.15, strength: 1.1 },
      { cx: 0, cz: -4, radius: 34, angle: Math.PI * 1.4, strength: 1.35 },
      { cx: -30, cz: -34, radius: 26, angle: Math.PI * 1.1, strength: 0.9 },
      { cx: 32, cz: -30, radius: 26, angle: Math.PI * 1.9, strength: 0.9 },
    ],
    obstacles: [
      { x: -14, z: -10, r: 4.2 },
      { x: 16, z: 12, r: 5.0 },
      { x: 30, z: -6, r: 3.6 },
      { x: -8, z: 26, r: 3.4 },
      { x: -30, z: 2, r: 3.2 },
      { x: 6, z: -30, r: 4.4 },
    ],
    starterCode: M5_CODE,
    tips: [
      'avoidObstacle() steers around the wrecks before they collide',
      '70% starting battery — plan recharge cycles into the route',
      'avoid fighting the swirl: cross it on the calm edges',
    ],
  },
]

/* ───────────────────────── current field sampling ───────────────────────── */

export function sampleCurrent(zones: CurrentZone[], x: number, z: number, t: number, falloff: number) {
  let vx = 0
  let vz = 0
  for (const zone of zones) {
    const dx = x - zone.cx
    const dz = z - zone.cz
    const d = Math.hypot(dx, dz)
    if (d > zone.radius) continue
    const fall = 1 - d / zone.radius
    const w = Math.pow(fall, falloff * 2)
    // slow rotation of the field so currents breathe over time
    const a = zone.angle + Math.sin(t * 0.05 + zone.cx * 0.05) * 0.12
    vx += Math.cos(a) * zone.strength * w
    vz += Math.sin(a) * zone.strength * w
  }
  return { vx, vz }
}

export function spawnGarbage(count: number, idBase: number): GarbageItem[] {
  const items: GarbageItem[] = []
  const kinds: GarbageItem['kind'][] = ['bottle', 'bottle', 'bag', 'container', 'net', 'misc']
  const maxR = WORLD.HALF - WORLD.MARGIN - 4
  for (let i = 0; i < count; i++) {
    // garbage patches cluster: ~65% in a dense core band, rest spread wide
    const a = Math.random() * Math.PI * 2
    let r: number
    if (Math.random() < 0.65) {
      // dense core band 10–22u from centre (low variance for fair missions)
      r = 10 + Math.random() * 12
    } else {
      r = 20 + Math.pow(Math.random(), 0.7) * (maxR - 20)
    }
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    items.push({
      id: idBase + i,
      kind,
      pos: { x: Math.cos(a) * r, z: Math.sin(a) * r },
      vel: { x: 0, z: 0 },
      zone: -1,
      driftPhase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.8,
      plastic: kind === 'container' ? 4 : kind === 'net' ? 3 : kind === 'bag' ? 2 : 1,
      collected: false,
      collectedAt: null,
      collectedBy: -1,
    })
  }
  return items
}
