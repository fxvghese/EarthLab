import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

const good = `void sweep() {
  moveTo(-12, -12);
  moveTo(12, 12);
}
void update() {
  if (battery() < 20) { returnToBase(); }
  else if (detectTrash()) { goToTrash(); collect(); }
  else { sweep(); }
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: () => {} })
sim.deploy(compile(good).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
let lastKey = ''
for (let i = 0; i <= 3000; i++) {
  sim.step(dt)
  const a = auv.action
  const key = a ? a.kind + ':' + (a.interceptId ?? '') : 'none'
  if (key !== lastKey) {
    console.log(`t=${(i*dt).toFixed(1)} act=${key} rem=${a?a.remaining.toFixed(1):'-'} state=${auv.state} bat=${auv.battery.toFixed(0)} collected=${sim.garbage.filter(g=>g.collected).length}`)
    lastKey = key
  }
}
