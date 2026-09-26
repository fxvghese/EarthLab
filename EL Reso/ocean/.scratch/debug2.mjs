import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')

let endResult = null
const sim = new Simulation(0, { onMissionEnd: (s, r) => { endResult = { s, r } }, onLog: () => {} })
const { compile } = await import('../.scratch/interpreter.test.mjs')
const res = compile(sim.mission.starterCode)
sim.deploy(res.program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30

// single step trace
for (let i = 0; i < 10; i++) {
  sim.step(dt)
}
console.log('after 10 steps: action =', auv.action && { kind: auv.action.kind, rem: auv.action.remaining, interceptId: auv.action.interceptId })
console.log('rt.frames =', auv.rt.frames.length, 'waiting =', auv.rt.waiting, 'resume =', auv.rt.resume)

// now one more step: watch what happens to the action
const before = auv.action ? auv.action.remaining : null
sim.step(dt)
console.log('after 1 more: action =', auv.action && auv.action.kind, 'rem before/after:', before, auv.action && auv.action.remaining)
console.log('auv pos:', auv.pos.x.toFixed(2), auv.pos.z.toFixed(2))
console.log('garbage 26 (if tracked):', (() => { const g = sim.garbage.find(x => x.id === 26); return g ? g.pos.x.toFixed(1)+','+g.pos.z.toFixed(1)+' collected='+g.collected : 'gone' })())
