import { build } from 'esbuild'

await build({
  entryPoints: ['src/game/sim.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: '.scratch/sim.test.mjs',
  external: ['three'],
  logLevel: 'silent',
})

const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

let endResult = null
const sim = new Simulation(0, {
  onMissionEnd: (success, reason, stats, remaining) => { endResult = { success, reason, stats, remaining } },
  onLog: () => {},
})

const res = compile(sim.mission.starterCode)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
sim.deploy(res.program, [0])
sim.begin()

// run 300 mission-seconds at 30hz
const dt = 1 / 30
for (let i = 0; i < 300 * 30 && !endResult; i++) {
  sim.step(dt)
}

const collected = sim.garbage.filter(g => g.collected).length
console.log('time:', sim.time.toFixed(0) + 's')
console.log('collected:', collected, '/', sim.garbage.length)
console.log('plastic:', sim.stats.collectedPlastic)
console.log('auv0:', { state: sim.auvs[0].state, battery: +sim.auvs[0].battery.toFixed(0), load: sim.auvs[0].load, totalPlastic: sim.auvs[0].totalPlastic })
console.log('errors in log:', sim.logs.filter(l => l.kind === 'error').map(l => l.text).slice(0, 3))
console.log(endResult ? `END: ${endResult.success ? 'SUCCESS' : 'FAIL'} — ${endResult.reason}` : 'mission still running')
if (collected > 5) console.log('PASS: AUV autonomously collecting via player code')
else { console.log('FAIL: insufficient progress'); process.exit(1) }
