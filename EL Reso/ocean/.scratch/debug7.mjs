import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

const code = `void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  }
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: () => {} })
sim.deploy(compile(code).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
let lastC = 0
for (let i = 0; i <= 9000; i++) {
  sim.step(dt)
  const c = sim.garbage.filter(g => g.collected).length
  if (c !== lastC) { lastC = c }
  if (i % 1500 === 0) {
    const a = auv.action
    console.log(`t=${(i*dt).toFixed(0)} collected=${c} act=${a ? a.kind+':'+(a.interceptId??'')+' rem='+a.remaining.toFixed(1) : 'none'} state=${auv.state} pos=(${auv.pos.x.toFixed(0)},${auv.pos.z.toFixed(0)}) waiting=${auv.rt.waiting} frames=${auv.rt.frames.length} resume=${auv.rt.resume} finished=${auv.rt.finished}`)
  }
}
