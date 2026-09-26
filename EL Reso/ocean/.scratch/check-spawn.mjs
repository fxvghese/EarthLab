import { build } from 'esbuild'
await build({ entryPoints: ['src/game/currents.ts'], bundle: true, format: 'esm', platform: 'node', outfile: '.scratch/currents.test.mjs', external: ['three'], logLevel: 'silent' })
const { spawnGarbage } = await import('../.scratch/currents.test.mjs')
const g = spawnGarbage(26, 1)
const rs = g.map(x => Math.hypot(x.pos.x, x.pos.z).toFixed(0))
console.log('radii:', rs.join(','))
console.log('within 24u:', rs.filter(r => +r <= 24).length, '/ 26')
