import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

// unconditional goToTrash+collect
const code = `void update() {
  goToTrash();
  collect();
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: (l) => { if (l.kind !== 'info') console.log('LOG', l.text) } })
sim.deploy(compile(code).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
let lastC = 0
for (let i = 0; i <= 6000; i++) {
  sim.step(dt)
  const c = sim.garbage.filter(g => g.collected).length
  if (c !== lastC) { console.log(`t=${sim.time.toFixed(0)} collected=${c} bat=${auv.battery.toFixed(0)}`); lastC = c }
  if (i === 3000) console.log(`midpoint t=100: pos=(${auv.pos.x.toFixed(0)},${auv.pos.z.toFixed(0)}) collected=${c}`)
}
console.log('final:', lastC, '/ 26')
