// how far does trash drift in 300s under mission-1 currents?
import { build } from 'esbuild'
await build({ entryPoints: ['src/game/currents.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/currents.test.mjs', external: ['three'], logLevel: 'silent' })
const { sampleCurrent, MISSIONS } = await import('../.scratch/currents.test.mjs')
const m = MISSIONS[0]
let x = 20, z = 20
const dt = 1/30
for (let t = 0; t < 300; t += dt) {
  const c = sampleCurrent(m.currents, x, z, t, m.currentFalloff)
  const drift = Math.sin(t * 0.4 + 1) * 0.12
  x += (c.vx + drift) * dt
  z += (c.vz + Math.cos(t * 0.3 + 1) * 0.12) * dt
  const r = Math.hypot(x, z)
  const maxR = 50 - 2
  if (r > maxR) { x *= maxR / r; z *= maxR / r }
}
console.log('trash at (20,20) after 300s:', x.toFixed(0), z.toFixed(0), '— moved', Math.hypot(x-20, z-20).toFixed(0) + 'u')
