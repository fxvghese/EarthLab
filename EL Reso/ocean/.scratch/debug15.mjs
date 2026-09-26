// trace raw VM state each tick: does the statement cursor advance after suspend?
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/runtime.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/runtime.test.mjs', external: ['three'], logLevel: 'silent' })
await build({ entryPoints: ['src/game/interpreter.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/interpreter.test.mjs', external: ['three'], logLevel: 'silent' })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

const code = `void update() {
  moveTo(20, 0);
  moveTo(-20, 0);
}`
const res = compile(code)
const auv = {
  id: 0, name: 'T', pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, heading: 0,
  battery: 100, capacity: 24, load: 0, detectionRadius: 11, state: 'idle',
  collectedCount: 0, loadPlastic: 0, program: null, rt: null, action: null,
  actionQueue: [], waypoints: [], waypointIdx: 0, avoidTurn: 1, collectCooldown: 0,
  lastMsg: '', totalPlastic: 0,
}
rt.startProgram(auv, res.program)
let simTime = 0
const dt = 1/30
for (let i = 0; i <= 500; i++) {
  const host = { auv, simTime, garbage: [], base: { x: 0, z: 0 }, msg: () => {}, collect: () => false }
  rt.runProgramTick(auv, host, dt)
  simTime += dt
  if (auv.action && auv.action.target) {
    const t = auv.action.target
    const dx = t.x - auv.pos.x, dz = t.z - auv.pos.z
    const d = Math.hypot(dx, dz)
    const step = 6 * dt
    if (d < step) { auv.pos.x = t.x; auv.pos.z = t.z } else { auv.pos.x += dx/d*step; auv.pos.z += dz/d*step }
  }
  if (auv.action) {
    auv.action.remaining -= dt
    if (auv.action.remaining <= 0) {
      const fr = auv.rt.frames[0]
      const cur = fr && fr.cursors[fr.cursors.length - 1]
      console.log(`i=${i} ACTION DONE -> frames=${auv.rt.frames.length} resume=${auv.rt.resume} cursor.ip=${cur ? cur.ip : 'n/a'}`)
      auv.action = null
    }
  }
  if (i < 8 || i === 210 || i === 211 || i === 212) {
    const fr = auv.rt.frames[0]
    const cur = fr && fr.cursors[fr.cursors.length - 1]
    console.log(`i=${i} pos=${auv.pos.x.toFixed(1)} act=${auv.action?auv.action.kind:'none'} frames=${auv.rt.frames.length} resume=${auv.rt.resume} waiting=${auv.rt.waiting} ip=${cur?cur.ip:'-'}`)
  }
}
