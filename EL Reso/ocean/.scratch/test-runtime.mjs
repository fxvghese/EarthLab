import { build } from 'esbuild'

await build({
  entryPoints: ['src/game/runtime.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: '.scratch/runtime.test.mjs',
  external: ['three'],
  logLevel: 'silent',
})

await build({
  entryPoints: ['src/game/interpreter.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: '.scratch/interpreter.test.mjs',
  external: ['three'],
  logLevel: 'silent',
})

const { compile } = await import('../.scratch/interpreter.test.mjs')
const rt = await import('../.scratch/runtime.test.mjs')

function mockAuv(id = 0) {
  return {
    id, name: `AUV-0${id + 1}`,
    pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, heading: 0,
    battery: 100, capacity: 24, load: 0, detectionRadius: 11,
    state: 'idle', collectedCount: 0, loadPlastic: 0,
    program: null, rt: null, action: null, actionQueue: [],
    waypoints: [], waypointIdx: 0, avoidTurn: 1, collectCooldown: 0,
    lastMsg: '', totalPlastic: 0,
  }
}

const code = `float patrolX[4] = { 20, 20, -20, -20 };
float patrolZ[4] = { 20, -20, -20, 20 };

void patrol() {
  for (int i = 0; i < 4; i++) {
    moveTo(patrolX[i], patrolZ[i]);
  }
}

void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}`

const res = compile(code)
if ('errors' in res) { console.log('COMPILE FAIL', res.errors); process.exit(1) }
console.log('✓ compile ok, fns:', [...res.program.fns.keys()])

const auv = mockAuv()
rt.startProgram(auv, res.program)
rt.setSampler(auv, () => ({ angle: 0.5, strength: 0.3 }))

// trash right near the patrol corner (20,20)
const garbage = [
  { id: 1, pos: { x: 20, z: 20 }, kind: 'bottle' },
  { id: 2, pos: { x: -30, z: -30 }, kind: 'bag' },
]
const base = { x: 0, z: 0 }
const collected = []
let simTime = 0
const logs = []

for (let i = 0; i < 6000; i++) {
  const host = {
    auv, simTime,
    garbage: garbage.filter(g => !collected.includes(g.id)),
    base,
    msg: (s) => logs.push(s),
    collect: (a, targetId) => {
      if (collected.includes(targetId)) return false
      const g = garbage.find(x => x.id === targetId)
      if (!g) return false
      const d = Math.hypot(a.pos.x - g.pos.x, a.pos.z - g.pos.z)
      if (d > 2.7) return false
      collected.push(targetId)
      a.collectedCount++
      return true
    },
  }
  rt.runProgramTick(auv, host, 1 / 30)
  simTime += 1 / 30

  // crude physics: if action targets a point, glide toward it
  if (auv.action && auv.action.target) {
    const t = auv.action.target
    const dx = t.x - auv.pos.x, dz = t.z - auv.pos.z
    const d = Math.hypot(dx, dz)
    const step = 6 * (1 / 30)
    if (d < step) { auv.pos.x = t.x; auv.pos.z = t.z }
    else { auv.pos.x += dx / d * step; auv.pos.z += dz / d * step }
    auv.action.remaining -= 1 / 30
    if (auv.action.remaining <= 0) {
      auv.action = null
    }
  } else if (auv.action) {
    auv.action.remaining -= 1 / 30
    if (auv.action.remaining <= 0) auv.action = null
  }
}

console.log('✓ final pos:', auv.pos.x.toFixed(1), auv.pos.z.toFixed(1))
console.log('✓ collected:', collected, 'count:', auv.collectedCount)
console.log('✓ visited near (20,20):', Math.hypot(auv.pos.x - 20, auv.pos.z - 20) < 3 ? 'yes' : 'no — at', auv.pos.x.toFixed(1), auv.pos.z.toFixed(1))
console.log('✓ logs:', logs.slice(0, 5))
if (auv.pos.x > 15 && auv.pos.z > 15) console.log('PASS: AUV reached the patrol corner')
else { console.log('FAIL: AUV did not patrol toward (20,20)'); process.exit(1) }
