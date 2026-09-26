// THE critical test: garbage ARRAY vs the goToTrash suspend timing.
// goToTrash is an EXPR statement → evalExpr → callBuiltin → THROW.
// stepStmt('expr') line: evalExpr(auv, host, st.expr, fr) throws SuspendSignal.
// BUT for goToTrash with NO trash in range, it returns 0 WITHOUT suspending.
// Test exactly that: no trash in range at start.
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/runtime.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/runtime.test.mjs', external: ['three'], logLevel: 'silent' })
await build({ entryPoints: ['src/game/interpreter.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/interpreter.test.mjs', external: ['three'], logLevel: 'silent' })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

const code = `void update() {
  goToTrash();
  log("got here");
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
let logs = []
const dt = 1/30
// NO garbage at all — goToTrash returns 0
for (let i = 0; i < 100; i++) {
  const host = { auv, simTime, garbage: [], base: { x: 0, z: 0 }, msg: (s) => logs.push(`i=${i} ${s}`), collect: () => false }
  rt.runProgramTick(auv, host, dt)
  simTime += dt
}
console.log('with NO trash:', logs.length, 'logs (expected ~1/tick = 100):', logs.slice(0, 3), '...')
