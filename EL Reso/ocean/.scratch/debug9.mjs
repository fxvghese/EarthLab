// probe the host pipeline directly: is garbage visible to sensors?
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

// log what the sensors see every update
const code = `void update() {
  log(detectTrash());
  moveTo(0, 30);
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: (l) => { if (l.t < 12) console.log('t=' + (l.t).toFixed(1), 'detectTrash =', l.text) } })
sim.deploy(compile(code).program, [0])
sim.begin()
const dt = 1/30
for (let i = 0; i < 12*30; i++) sim.step(dt)
// also check raw distances
const auv = sim.auvs[0]
let near = []
for (const g of sim.garbage) { const d = Math.hypot(auv.pos.x-g.pos.x, auv.pos.z-g.pos.z); if (d < 30) near.push(d.toFixed(1)) }
console.log('auv at', auv.pos.x.toFixed(1), auv.pos.z.toFixed(1), '— trash within 30u:', near.length)
