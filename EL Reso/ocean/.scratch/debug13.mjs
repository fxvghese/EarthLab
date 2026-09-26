import { build } from 'esbuild'
await build({ entryPoints: ['src/game/runtime.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/runtime.test.mjs', external: ['three'], logLevel: 'silent' })
await build({ entryPoints: ['src/game/interpreter.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/interpreter.test.mjs', external: ['three'], logLevel: 'silent' })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

const code = `void update() {
  goToTrash();
  log("after goToTrash");
  collect();
  log("after collect");
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
const garbage = [{ id: 7, pos: { x: 6, z: 0 }, kind: 'bottle' }]
let simTime = 0
const dt = 1/30
let logs = []

for (let i = 0; i <= 500; i++) {
  const host = {
    auv, simTime,
    garbage: garbage.filter(g => !g.collectedFlag),
    base: { x: 0, z: 0 },
    msg: (s) => logs.push(`i=${i} ${s}`),
    collect: () => false,
  }
  rt.runProgramTick(auv, host, dt)
  simTime += dt
  if (auv.action) {
    if (auv.action.target) {
      const t = auv.action.target
      const dx = t.x - auv.pos.x, dz = t.z - auv.pos.z
      const d = Math.hypot(dx, dz)
      const step = 6 * dt
      if (d < step) { auv.pos.x = t.x; auv.pos.z = t.z }
      else { auv.pos.x += dx/d*step; auv.pos.z += dz/d*step }
    }
    auv.action.remaining -= dt
    if (auv.action.remaining <= 0) auv.action = null
  }
}
console.log(logs.slice(0, 12))
console.log('final act:', auv.action && auv.action.kind, 'frames:', auv.rt.frames.length, 'resume:', auv.rt.resume)
