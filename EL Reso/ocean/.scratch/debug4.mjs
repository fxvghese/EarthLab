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
const sim = new Simulation(0, { onMissionEnd: () => {}, onLog: (l) => console.log('LOG', l.kind, l.text) })
const res = compile(code)
sim.deploy(res.program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30

for (let i = 0; i < 40; i++) {
  sim.step(dt)
  const a = auv.action
  console.log(`i=${i} act=${a ? a.kind + (a.interceptId !== undefined ? ':'+a.interceptId : '') : 'none'} rem=${a ? a.remaining.toFixed(2) : '-'} state=${auv.state} pos=(${auv.pos.x.toFixed(1)},${auv.pos.z.toFixed(1)}) rt.frames=${auv.rt.frames.length} resume=${auv.rt.resume} waiting=${auv.rt.waiting}`)
}
