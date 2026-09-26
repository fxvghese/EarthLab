import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

// what a smart player writes after observing the sim
const good = `void sweep() {
  moveTo(-12, -12);
  moveTo(12, 12);
  moveTo(-12, 12);
  moveTo(12, -12);
  moveTo(0, 0);
}

void update() {
  if (battery() < 20) {
    returnToBase();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    sweep();
  }
}`
let end = null
const sim = new Simulation(0, { onMissionEnd: (s, r) => { end = { s, r } }, onLog: () => {} })
const res = compile(good)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
sim.deploy(res.program, [0])
sim.begin()
const dt = 1/30
for (let i = 0; i < 300*30 && !end; i++) sim.step(dt)
const c = sim.garbage.filter(g => g.collected).length
console.log(`good code: ${c}/${sim.garbage.length} = ${(c/sim.garbage.length*100).toFixed(0)}%  battery=${sim.auvs[0].battery.toFixed(0)}% end=${end ? end.s + ' ' + end.r : 'timeout'}`)
