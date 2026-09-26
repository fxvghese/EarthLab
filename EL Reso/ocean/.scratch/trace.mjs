import { build } from 'esbuild'
await build({ entryPoints: ['src/game/runtime.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/runtime.test.mjs', external: ['three'], logLevel: 'silent' })
await build({ entryPoints: ['src/game/interpreter.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/interpreter.test.mjs', external: ['three'], logLevel: 'silent' })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

function mockAuv(id = 0) {
  return { id, name: `AUV-0${id + 1}`, pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, heading: 0,
    battery: 100, capacity: 24, load: 0, detectionRadius: 11, state: 'idle', collectedCount: 0,
    loadPlastic: 0, program: null, rt: null, action: null, actionQueue: [], waypoints: [],
    waypointIdx: 0, avoidTurn: 1, collectCooldown: 0, lastMsg: '', totalPlastic: 0 }
}

// simplest possible: update calls patrol which does two moveTo
const code = `void patrol() {
  moveTo(20, 20);
  moveTo(-20, -20);
}

void update() {
  patrol();
}`

const res = compile(code)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
const auv = mockAuv()
rt.startProgram(auv, res.program)
let simTime = 0

for (let i = 0; i < 900; i++) {
  const host = { auv, simTime, garbage: [], base: { x: 0, z: 0 }, msg: (s) => console.log('LOG', s), collect: () => false }
  rt.runProgramTick(auv, host, 1 / 30)
  simTime += 1 / 30
  if (auv.action) {
    if (auv.action.target) {
      const t = auv.action.target
      const dx = t.x - auv.pos.x, dz = t.z - auv.pos.z
      const d = Math.hypot(dx, dz)
      const step = 6 / 30
      if (d < step) { auv.pos.x = t.x; auv.pos.z = t.z } else { auv.pos.x += dx / d * step; auv.pos.z += dz / d * step }
    }
    auv.action.remaining -= 1 / 30
    if (auv.action.remaining <= 0) auv.action = null
  }
  if (i % 150 === 0) console.log(i, 'pos', auv.pos.x.toFixed(1), auv.pos.z.toFixed(1), 'action', auv.action && auv.action.kind, 'frames', auv.rt.frames.length, 'waiting', auv.rt.waiting)
}
console.log('final', auv.pos.x.toFixed(1), auv.pos.z.toFixed(1))
