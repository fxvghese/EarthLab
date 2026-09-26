import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

// aggressive collecting program
const code = `void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  }
}`
let endResult = null
const sim = new Simulation(0, { onMissionEnd: (s, r) => { endResult = { s, r } }, onLog: () => {} })
const res = compile(code)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
sim.deploy(res.program, [0])
sim.begin()
const dt = 1/30
let lastC = 0, lastT = 0
for (let i = 0; i < 300*30 && !endResult; i++) {
  sim.step(dt)
  const c = sim.garbage.filter(g => g.collected).length
  if (c !== lastC) { console.log(`t=${sim.time.toFixed(0)} collected=${c} cooldown=${sim.auvs[0].collectCooldown.toFixed(2)}`); lastC = c; lastT = sim.time }
}
console.log('final:', lastC, '/ 26', endResult ? endResult.s + ' ' + endResult.r : '')
