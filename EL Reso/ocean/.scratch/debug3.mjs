import { build } from 'esbuild'
await build({ entryPoints: ['src/game/sim.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/sim.test.mjs', external: ['three'], logLevel: 'silent' })
const { Simulation } = await import('../.scratch/sim.test.mjs')
const { compile } = await import('../.scratch/interpreter.test.mjs')

let endResult = null
const sim = new Simulation(0, { onMissionEnd: (s, r) => { endResult = { s, r } }, onLog: () => {} })
const res = compile(sim.mission.starterCode)
sim.deploy(res.program, [0])
sim.begin()
const auv = sim.auvs[0]
const dt = 1/30

for (let i = 0; i <= 1100; i++) {
  sim.step(dt)
  if (i > 1040) {
    const a = auv.action
    const target = a && a.target
    const d = target ? Math.hypot(auv.pos.x-target.x, auv.pos.z-target.z).toFixed(2) : '-'
    console.log(`i=${i} t=${sim.time.toFixed(2)} act=${a ? a.kind+':'+(a.interceptId??'')+' rem='+a.remaining.toFixed(2)+' d='+d : 'none'} pos=(${auv.pos.x.toFixed(1)},${auv.pos.z.toFixed(1)}) load=${auv.load} cooldown=${auv.collectCooldown.toFixed(2)}`)
  }
  if (i > 1080) break
}
