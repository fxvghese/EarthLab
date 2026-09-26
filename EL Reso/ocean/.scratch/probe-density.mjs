// why is pickup rate so low? track: time in goToTrash vs sweep, and chase distances
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
let state = { goTo: 0, sweep: 0, collect: 0, none: 0 }
let last = ''
for (let i = 0; i < 300*30; i++) {
  sim.step(dt)
  const k = auv.action ? (auv.action.interceptId !== undefined ? 'goTo' : auv.action.kind === 'returnToBase' ? 'home' : auv.action.kind === 'collect' ? 'collect' : 'sweep') : 'none'
  if (k !== last) { last = k }
  state[k] = (state[k] ?? 0) + dt
}
console.log('time split (s):', Object.fromEntries(Object.entries(state).map(([k,v]) => [k, v.toFixed(0)])))
console.log('collected:', sim.garbage.filter(g=>g.collected).length)
// how far apart is surviving trash?
const alive = sim.garbage.filter(g => !g.collected)
console.log('alive trash sample dists from auv:', alive.slice(0, 6).map(g => Math.hypot(auv.pos.x-g.pos.x, auv.pos.z-g.pos.z).toFixed(0)).join(', '))
