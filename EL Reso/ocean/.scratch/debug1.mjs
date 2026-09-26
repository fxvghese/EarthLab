import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')

let endResult = null
const sim = new Simulation(0, { onMissionEnd: (s, r) => { endResult = { s, r } }, onLog: () => {} })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const res = compile(sim.mission.starterCode)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
sim.deploy(res.program, [0])
sim.begin()

const auv = sim.auvs[0]
const dt = 1 / 30
let lastAction = 'none'
let actionFrames = 0
for (let i = 0; i < 60 * 30; i++) {
  sim.step(dt)
  const ak = auv.action ? auv.action.kind + (auv.action.interceptId !== undefined ? ':' + auv.action.interceptId : '') : 'none'
  if (ak !== lastAction) {
    console.log(`t=${sim.time.toFixed(1)} action=${ak} pos=(${auv.pos.x.toFixed(1)},${auv.pos.z.toFixed(1)}) rem=${auv.action ? auv.action.remaining.toFixed(2) : '-'}`)
    lastAction = ak
  }
  if (i > 60 * 20) break
}
console.log('collected:', sim.garbage.filter(g => g.collected).length, '/ 26')
console.log('nearest uncollected dist:', (() => {
  let best = 1e9
  for (const g of sim.garbage) { if (g.collected) continue; const d = Math.hypot(auv.pos.x-g.pos.x, auv.pos.z-g.pos.z); if (d < best) best = d }
  return best.toFixed(1)
})())
