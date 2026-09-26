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
sim.deploy(compile(code).program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30
for (let i = 0; i <= 480; i++) {
  sim.step(dt)
  if (i % 60 === 0) {
    const v = Math.hypot(auv.vel.x, auv.vel.z)
    console.log(`t=${sim.time.toFixed(0)} battery=${auv.battery.toFixed(1)} drain-state=${v > 0.4 ? 'move' : 'idle'} vel=${v.toFixed(2)} state=${auv.state}`)
  }
}
