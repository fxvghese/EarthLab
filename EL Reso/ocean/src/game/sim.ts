import type { Auv, AuvState, DeployedProgram, GarbageItem, GameStats } from './types'
import { AUV_DEFAULTS, WORLD, WASTE_TYPES } from './types'
import { MISSIONS, sampleCurrent, spawnGarbage, type MissionDef } from './currents'
import { runProgramTick, setSampler, startProgram, VMError } from './runtime'

export interface CollectFx {
  x: number
  z: number
  t: number
}

export type Phase = 'briefing' | 'running' | 'paused' | 'complete' | 'failed'

export interface LogLine {
  t: number
  text: string
  kind: 'info' | 'success' | 'warn' | 'error'
}

export interface SimSnapshot {
  time: number
  timeLeft: number
  collected: number
  total: number
  plastic: number
  totalPlastic: number
  phase: Phase
  auvs: Auv[]
  logs: LogLine[]
  stats: GameStats
  fx: CollectFx[]
  obstacleHits: number
}

export interface SimCallbacks {
  onMissionEnd: (success: boolean, reason: string, stats: GameStats, remaining: number) => void
  onLog: (line: LogLine) => void
}

const BASE = { x: 0, z: 0 }

function makeAuv(id: number, battery: number): Auv {
  const a = id * 1.9
  return {
    id,
    name: `AUV-${String(id + 1).padStart(2, '0')}`,
    pos: { x: Math.cos(a) * 5, z: Math.sin(a) * 5 },
    vel: { x: 0, z: 0 },
    heading: Math.random() * Math.PI * 2,
    battery,
    capacity: AUV_DEFAULTS.capacity,
    load: 0,
    detectionRadius: AUV_DEFAULTS.detectionRadius,
    state: 'idle',
    collectedCount: 0,
    loadPlastic: 0,
    program: null,
    rt: null,
    action: null,
    actionQueue: [],
    waypoints: [],
    waypointIdx: 0,
    avoidTurn: 1,
    collectCooldown: 0,
    lastMsg: '',
    totalPlastic: 0,
  }
}

export class Simulation {
  mission: MissionDef
  garbage: GarbageItem[] = []
  auvs: Auv[] = []
  time = 0
  phase: Phase = 'briefing'
  simSpeed = 1
  logs: LogLine[] = []
  stats: GameStats = { collectedCount: 0, collectedPlastic: 0, totalPlastic: 0, areaCleanedKm2: 0, batteryUsed: 0 }
  fx: CollectFx[] = []
  obstacleHits = 0
  private nextId = 1
  private cb: SimCallbacks
  private nextProgVersion = 1

  constructor(missionId: number, cb: SimCallbacks) {
    this.mission = MISSIONS[missionId] ?? MISSIONS[0]
    this.cb = cb
    this.reset()
  }

  reset() {
    this.time = 0
    this.phase = 'briefing'
    this.logs = []
    this.fx = []
    this.obstacleHits = 0
    this.nextId = 1
    this.garbage = spawnGarbage(this.mission.garbageCount, 1)
    this.nextId = this.garbage.length + 1
    this.auvs = []
    for (let i = 0; i < this.mission.fleetSize; i++) {
      this.auvs.push(makeAuv(i, this.mission.battery))
      setSampler(this.auvs[i], (x, z) => {
        const c = sampleCurrent(this.mission.currents, x, z, this.time, this.mission.currentFalloff)
        const a = Math.atan2(c.vz, c.vx)
        return { angle: a, strength: Math.hypot(c.vx, c.vz) }
      })
    }
    const tp = this.garbage.reduce((s, g) => s + g.plastic, 0)
    this.stats = { collectedCount: 0, collectedPlastic: 0, totalPlastic: tp, areaCleanedKm2: 0, batteryUsed: 0 }
    this.log(`mission "${this.mission.name}" loaded — ${this.garbage.length} debris objects, ${this.auvs.length} AUV${this.auvs.length > 1 ? 's' : ''} ready`, 'info')
  }

  log(text: string, kind: LogLine['kind'] = 'info') {
    this.logs.push({ t: this.time, text, kind })
    if (this.logs.length > 120) this.logs.shift()
    this.cb.onLog({ t: this.time, text, kind })
  }

  deploy(program: DeployedProgram, targets: number[]) {
    let n = 0
    for (const id of targets) {
      const auv = this.auvs.find((a) => a.id === id)
      if (!auv) continue
      startProgram(auv, program)
      auv.program = { ...program, version: this.nextProgVersion++ }
      auv.rt!.version = auv.program.version
      n++
    }
    if (n > 0) this.log(`deployed program v${this.nextProgVersion - 1} to ${n} AUV${n > 1 ? 's' : ''}`, 'success')
    else this.log('no AUV selected — select targets in the fleet panel first', 'warn')
  }

  begin() {
    if (this.phase === 'briefing') this.phase = 'running'
  }

  step(dtRaw: number) {
    if (this.phase !== 'running') return
    const dt = Math.min(dtRaw, 0.1) * this.simSpeed
    this.time += dt

    /* currents + garbage physics */
    const cf = this.mission.currentFalloff
    for (const g of this.garbage) {
      if (g.collected) continue
      const c = sampleCurrent(this.mission.currents, g.pos.x, g.pos.z, this.time, cf)
      const drift = Math.sin(this.time * 0.4 + g.driftPhase) * 0.12
      g.vel.x = c.vx + drift
      g.vel.z = c.vz + Math.cos(this.time * 0.3 + g.driftPhase) * 0.12
      g.pos.x += g.vel.x * dt
      g.pos.z += g.vel.z * dt
      g.rot += g.rotSpeed * dt
      // soft world bounds
      const r = Math.hypot(g.pos.x, g.pos.z)
      const maxR = WORLD.HALF - 2
      if (r > maxR) {
        g.pos.x *= maxR / r
        g.pos.z *= maxR / r
      }
    }

    /* AUVs */
    for (const auv of this.auvs) {
      this.stepAuv(auv, dt)
    }

    /* fx decay */
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].t += dt
      if (this.fx[i].t > 1.2) this.fx.splice(i, 1)
    }

    /* mission end checks */
    const total = this.garbage.length
    const collected = this.garbage.filter((g) => g.collected).length
    const pct = total ? collected / total : 1
    const alive = this.auvs.some((a) => a.battery > 1)
    if (pct >= this.mission.targetPct) {
      this.phase = 'complete'
      this.cb.onMissionEnd(true, 'cleanup target reached', this.stats, this.mission.timeLimit - this.time)
    } else if (this.time >= this.mission.timeLimit) {
      this.phase = 'failed'
      this.cb.onMissionEnd(false, 'time expired', this.stats, 0)
    } else if (!alive) {
      this.phase = 'failed'
      this.cb.onMissionEnd(false, 'entire fleet out of power', this.stats, 0)
    }

    // area cleaned estimate (simulation value)
    const sweep = (Math.PI * AUV_DEFAULTS.detectionRadius ** 2) * this.stats.collectedCount
    this.stats.areaCleanedKm2 = Math.min((this.mission.garbageCount * 3.2) / 100, sweep / 1000)
  }

  private stepAuv(auv: Auv, dt: number) {
    const dead = auv.battery <= 0

    /* battery model */
    const speed = Math.hypot(auv.vel.x, auv.vel.z)
    let drain = speed > 0.4 ? AUV_DEFAULTS.drainMove : AUV_DEFAULTS.drainIdle
    if (auv.state === 'collecting') drain += AUV_DEFAULTS.drainCollect
    if (!dead && auv.program) {
      auv.battery = Math.max(0, auv.battery - drain * dt)
      this.stats.batteryUsed += drain * dt
    }

    /* recharging at base */
    const distBase = Math.hypot(auv.pos.x - BASE.x, auv.pos.z - BASE.z)
    if (distBase < 6 && auv.battery < 100 && (auv.state === 'recharge' || dead)) {
      auv.battery = Math.min(100, auv.battery + AUV_DEFAULTS.rechargeRate * dt)
      auv.state = 'recharge'
      auv.action = null
      if (auv.battery >= 99.5) {
        auv.state = 'idle'
        auv.rt!.waiting = false
        this.log(`${auv.name} recharged — back on station`, 'success')
      }
      return
    }
    if (dead) {
      auv.state = 'lowbattery'
      return
    }

    /* unload at base */
    if (distBase < 6 && auv.load > 0) {
      this.stats.collectedCount += auv.collectedCount
      this.stats.collectedPlastic += auv.loadPlastic
      auv.collectedCount = 0
      auv.load = 0
      auv.loadPlastic = 0
    }

    /* execute the active action FIRST so blocking commands progress
       even while the program is suspended behind them */
    if (auv.action) {
      this.runAction(auv, dt)
    }

    /* run the player's program (skipped internally while action != null) */
    if (auv.program && auv.rt) {
      try {
        runProgramTick(auv, {
          auv,
          simTime: this.time,
          garbage: this.garbage.filter((g) => !g.collected),
          base: BASE,
          msg: (s) => this.log(`${auv.name} ▸ ${s}`, 'info'),
          collect: (a, targetId) => this.tryCollect(a, targetId),
        }, dt)
      } catch (e) {
        if (e instanceof VMError) {
          this.log(`${auv.name} runtime error — line ${e.ce.line}: ${e.ce.message}${e.ce.hint ? `\n  hint: ${e.ce.hint}` : ''}`, 'error')
          auv.rt.finished = true
          auv.state = 'idle'
          auv.action = null
        } else throw e
      }
    }

    /* apply current push to the AUV */
    if (auv.state !== 'recharge') {
      const c = sampleCurrent(this.mission.currents, auv.pos.x, auv.pos.z, this.time, this.mission.currentFalloff)
      auv.pos.x += c.vx * dt * 0.35
      auv.pos.z += c.vz * dt * 0.35
    }

    /* obstacle repulsion for mission 5 */
    for (const ob of this.mission.obstacles) {
      const dx = auv.pos.x - ob.x
      const dz = auv.pos.z - ob.z
      const d = Math.hypot(dx, dz)
      const min = ob.r + AUV_DEFAULTS.radius
      if (d < min) {
        auv.pos.x = ob.x + (dx / (d || 1)) * min
        auv.pos.z = ob.z + (dz / (d || 1)) * min
        this.obstacleHits++
      } else if (d < min + 4) {
        // gentle push-away so patrols visibly flow around wrecks
        auv.pos.x += (dx / d) * dt * 2.2
        auv.pos.z += (dz / d) * dt * 2.2
      }
    }

    /* world bounds */
    const r = Math.hypot(auv.pos.x, auv.pos.z)
    const maxR = WORLD.HALF - 1.5
    if (r > maxR) {
      auv.pos.x *= maxR / r
      auv.pos.z *= maxR / r
    }

    /* state label for low battery */
    if (auv.battery < 25 && auv.state !== 'recharge' && auv.state !== 'return') {
      auv.state = 'lowbattery'
    }
  }

  private runAction(auv: Auv, dt: number) {
    const act = auv.action!
    const speed = AUV_DEFAULTS.maxSpeed * (auv.actionQueue.length && auv.actionQueue[auv.actionQueue.length - 1].kind === 'setSpeed' ? auv.actionQueue[auv.actionQueue.length - 1].args[0] : 1) * (auv.battery < 20 ? 0.55 : 1)

    // live target tracking for interception
    if (act.interceptId !== undefined) {
      const t = this.garbage.find((g) => g.id === act.interceptId && !g.collected)
      if (t) act.target = { x: t.pos.x, z: t.pos.z }
      else {
        // target gone: someone else got it or it left range — end the action
        auv.action = null
        return
      }
    }

    let tx = act.target?.x ?? auv.pos.x
    let tz = act.target?.z ?? auv.pos.z
    if (act.kind === 'returnToBase') {
      tx = BASE.x; tz = BASE.z
    }

    const dx = tx - auv.pos.x
    const dz = tz - auv.pos.z
    const d = Math.hypot(dx, dz)

    if (act.kind === 'collect' || act.kind === 'collectNearest') {
      // collectNearest moves first, then grabs
      if (act.kind === 'collectNearest' && d > AUV_DEFAULTS.collectRange) {
        this.steer(auv, tx, tz, speed, dt)
        auv.state = 'intercept'
        act.remaining -= dt
        if (act.remaining <= 0) auv.action = null
        return
      }
      // stationary collect
      auv.state = 'collecting'
      const got = this.tryCollect(auv, act.interceptId ?? this.nearestInCollectRange(auv))
      act.remaining -= dt
      if (act.remaining <= 0) {
        auv.action = null
        if (!got) auv.collectCooldown = 0.5
      }
      return
    }

    if (act.kind === 'scan') {
      auv.state = 'patrol'
      act.remaining -= dt
      if (act.remaining <= 0) auv.action = null
      return
    }
    if (act.kind === 'wait') {
      auv.state = 'idle'
      act.remaining -= dt
      if (act.remaining <= 0) auv.action = null
      return
    }
    if (act.kind === 'setSpeed') {
      auv.action = null
      return
    }

    /* movement actions */
    const arrive = d < (act.kind === 'returnToBase' ? 5.5 : act.interceptId !== undefined ? AUV_DEFAULTS.collectRange : 0.9)
    if (arrive) {
      auv.action = null
      // intercepting actions grab the target on contact
      if (act.interceptId !== undefined) this.tryCollect(auv, act.interceptId)
      return
    }
    auv.state = act.kind === 'returnToBase'
      ? 'return'
      : act.interceptId !== undefined
        ? 'intercept'
        : 'patrol'
    this.steer(auv, tx, tz, speed, dt)
    act.remaining -= dt
    if (act.remaining <= 0) auv.action = null // timed out
  }

  private steer(auv: Auv, tx: number, tz: number, speed: number, dt: number) {
    const dx = tx - auv.pos.x
    const dz = tz - auv.pos.z
    const d = Math.hypot(dx, dz) || 1
    const desiredVx = (dx / d) * speed
    const desiredVz = (dz / d) * speed
    const acc = AUV_DEFAULTS.accel
    auv.vel.x += Math.max(-acc * dt, Math.min(acc * dt, desiredVx - auv.vel.x))
    auv.vel.z += Math.max(-acc * dt, Math.min(acc * dt, desiredVz - auv.vel.z))
    auv.pos.x += auv.vel.x * dt
    auv.pos.z += auv.vel.z * dt
    if (speed > 0.1) auv.heading = Math.atan2(auv.vel.z, auv.vel.x)
  }

  private nearestInCollectRange(auv: Auv): number {
    let best = -1
    let bestD = AUV_DEFAULTS.collectRange
    for (const g of this.garbage) {
      if (g.collected) continue
      const d = Math.hypot(auv.pos.x - g.pos.x, auv.pos.z - g.pos.z)
      if (d < bestD) { bestD = d; best = g.id }
    }
    return best
  }

  private tryCollect(auv: Auv, targetId: number): boolean {
    if (auv.load >= auv.capacity) return false
    const id = targetId >= 0 ? targetId : this.nearestInCollectRange(auv)
    if (id < 0) return false
    const g = this.garbage.find((x) => x.id === id)
    if (!g || g.collected) return false
    const d = Math.hypot(auv.pos.x - g.pos.x, auv.pos.z - g.pos.z)
    if (d > AUV_DEFAULTS.collectRange * 1.6) return false
    g.collected = true
    g.collectedAt = { x: g.pos.x, z: g.pos.z }
    g.collectedBy = auv.id
    auv.collectedCount++
    auv.load += 1
    auv.loadPlastic += g.plastic
    auv.totalPlastic += g.plastic
    auv.collectCooldown = 0.55
    this.fx.push({ x: g.pos.x, z: g.pos.z, t: 0 })
    return true
  }

  collectFx(): CollectFx[] {
    return this.fx
  }

  snapshot(): SimSnapshot {
    const collected = this.garbage.filter((g) => g.collected).length
    return {
      time: this.time,
      timeLeft: Math.max(0, this.mission.timeLimit - this.time),
      collected,
      total: this.garbage.length,
      plastic: this.stats.collectedPlastic + this.auvs.reduce((s, a) => s + a.loadPlastic, 0),
      totalPlastic: this.stats.totalPlastic,
      phase: this.phase,
      auvs: this.auvs,
      logs: this.logs,
      stats: this.stats,
      fx: this.fx,
      obstacleHits: this.obstacleHits,
    }
  }
}

export { BASE }
export { WASTE_TYPES }
export type { AuvState }
