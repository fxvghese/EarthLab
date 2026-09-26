import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

const code = `void update() {
  goToTrash();
  collect();
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: () => {} })
sim.deploy(compile(code).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
let lastKey = ''
for (let i = 0; i <= 900; i++) {
  sim.step(dt)
  const a = auv.action
  const key = a ? a.kind + ':' + (a.interceptId ?? '') + ':' + a.remaining.toFixed(1) : 'none'
  if (key !== lastKey) {
    console.log(`t=${sim.time.toFixed(2)} act=${key} state=${auv.state} pos=(${auv.pos.x.toFixed(1)},${auv.pos.z.toFixed(1)})`)
    lastKey = key
  }
}
