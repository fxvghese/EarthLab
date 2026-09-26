export const WORLD = {
  SIZE: 100,
  HALF: 50,
  MARGIN: 3,
  DEPTH: 46,
}

export const AUV_DEFAULTS = {
  maxSpeed: 6.5,
  accel: 9,
  battery: 100,
  drainMove: 0.14,
  drainIdle: 0.03,
  drainCollect: 0.12,
  rechargeRate: 9,
  detectionRadius: 15,
  collectRange: 1.7,
  capacity: 24,
  radius: 0.8,
}

export type WasteKind = 'bottle' | 'bag' | 'container' | 'net' | 'misc'

export const WASTE_TYPES = [
  { kind: 'bottle' as WasteKind, label: 'Plastic bottle', plastic: 1 },
  { kind: 'bag' as WasteKind, label: 'Plastic bag', plastic: 2 },
  { kind: 'container' as WasteKind, label: 'Container drum', plastic: 4 },
  { kind: 'net' as WasteKind, label: 'Fishing net', plastic: 3 },
  { kind: 'misc' as WasteKind, label: 'Debris', plastic: 1 },
]

export interface GarbageItem {
  id: number
  kind: WasteKind
  pos: { x: number; z: number }
  vel: { x: number; z: number }
  zone: number
  driftPhase: number
  rot: number
  rotSpeed: number
  plastic: number
  collected: boolean
  collectedAt: { x: number; z: number } | null
  collectedBy: number
}

export type AuvState =
  | 'idle'
  | 'patrol'
  | 'intercept'
  | 'collecting'
  | 'return'
  | 'recharge'
  | 'lowbattery'

export interface Action {
  kind:
    | 'moveTo'
    | 'move'
    | 'scan'
    | 'collect'
    | 'returnToBase'
    | 'followCurrent'
    | 'avoidObstacle'
    | 'collectNearest'
    | 'wait'
    | 'setSpeed'
    | 'none'
  args: number[]
  /** runtime seconds the action still needs */
  remaining: number
  duration: number
  target?: { x: number; z: number }
  /** for move(direction) */
  direction?: number
  /** live-track this garbage id while the action runs (interception) */
  interceptId?: number
}

/** vm state produced by runtime.ts — structural shape (avoiding circular import) */
export interface AuvRuntime {
  [key: string]: unknown
}

export interface Auv {
  id: number
  name: string
  pos: { x: number; z: number }
  vel: { x: number; z: number }
  heading: number
  battery: number
  capacity: number
  load: number
  detectionRadius: number
  state: AuvState
  collectedCount: number
  /** units of plastic collected on the current load */
  loadPlastic: number
  program: DeployedProgram | null
  rt: AuvRuntime | null
  action: Action | null
  actionQueue: Action[]
  waypoints: { x: number; z: number }[]
  waypointIdx: number
  avoidTurn: number
  collectCooldown: number
  lastMsg: string
  totalPlastic: number
}

export interface DeployedProgram {
  source: string
  fns: Map<string, import('./interpreter').FnDecl>
  version: number
}

export interface CodeError {
  line: number
  col: number
  message: string
  hint?: string
}

export interface GameStats {
  collectedCount: number
  collectedPlastic: number
  totalPlastic: number
  areaCleanedKm2: number
  batteryUsed: number
}
