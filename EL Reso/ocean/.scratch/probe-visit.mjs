// does the AUV actually complete sweep legs? track position over time
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

const best = `void sweep() {
  moveTo(-16, -16); moveTo(-16, 16); moveTo(0, 16); moveTo(0, -16); moveTo(16, -16); moveTo(16, 16);
}
void update() {
  if (battery() < 18) { returnToBase(); }
  else if (detectTrash()) { goToTrash(); collect(); }
  else { sweep(); }
}`
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: () => {} })
sim.deploy(compile(best).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
let lastAct = ''
let legStart = 0
for (let i = 0; i < 120*30; i++) {
  sim.step(dt)
  const a = auv.action
  const key = a ? (a.target ? a.target.x.toFixed(0) + ',' + a.target.z.toFixed(0) : a.kind) : 'none'
  if (key !== lastAct) {
    console.log(`t=${sim.time.toFixed(1)} -> (${key}) pos=(${auv.pos.x.toFixed(0)},${auv.pos.z.toFixed(0)})`)
    lastAct = key
    legStart = sim.time
  }
}
