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
const res = compile(code)
sim.deploy(res.program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30

let lastAct = ''
for (let i = 0; i < 900; i++) {
  sim.step(dt)
  const a = auv.action
  const key = a ? a.kind + ':' + (a.interceptId ?? '') + ':' + Math.ceil(a.remaining) : 'none'
  if (key !== lastAct) {
    const tgt = a && a.target
    const d = tgt ? Math.hypot(auv.pos.x - tgt.x, auv.pos.z - tgt.z).toFixed(1) : '-'
    console.log(`i=${i} act=${key} d=${d} collected=${sim.garbage.filter(g=>g.collected).length}`)
    lastAct = key
  }
}
console.log('final collected:', sim.garbage.filter(g => g.collected).length)
