// test mission 3 (current trap) — has returnToBase logic and 3 AUVs
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

let endResult = null
const sim = new Simulation(2, { onMissionEnd: (s, r) => { endResult = { s, r } }, onLog: () => {} })
const res = compile(sim.mission.starterCode)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
sim.deploy(res.program, [0, 1, 2])
sim.begin()

const dt = 1/30
for (let i = 0; i < 300*30 && !endResult; i++) sim.step(dt)

const collected = sim.garbage.filter(g => g.collected).length
console.log('m3 time:', sim.time.toFixed(0))
console.log('collected:', collected, '/', sim.garbage.length)
sim.auvs.forEach(a => console.log(`  ${a.name}: state=${a.state} bat=${a.battery.toFixed(0)}% load=${a.load} total=${a.totalPlastic}`))
console.log('stats:', { plastic: sim.stats.collectedPlastic, batteryUsed: sim.stats.batteryUsed.toFixed(0) })
console.log(endResult ? `END: ${endResult.s ? 'SUCCESS' : 'FAIL'} — ${endResult.r}` : 'still running')
console.log('errors:', sim.logs.filter(l => l.kind === 'error').slice(0, 2).map(l => l.text))
