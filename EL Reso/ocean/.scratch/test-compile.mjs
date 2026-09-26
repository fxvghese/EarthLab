// quick esbuild transform then run
import { build } from 'esbuild'
import { writeFileSync } from 'fs'

const result = await build({
  entryPoints: ['src/game/interpreter.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: '.freebuff/interpreter.test.mjs',
  external: ['three'],
  logLevel: 'silent',
})

const { compile } = await import('../.freebuff/interpreter.test.mjs')

const code = `// MISSION 1
float patrolX[4] = { 20, 20, -20, -20 };
float patrolZ[4] = { 20, -20, -20, 20 };

void patrol() {
  for (int i = 0; i < 4; i++) {
    moveTo(patrolX[i], patrolZ[i]);
  }
}

void update() {
  if (detectTrash()) {
    goToTrash();
  } else {
    patrol();
  }
}`

console.log(JSON.stringify(compile(code), (k, v) => v instanceof Map ? [...v.keys()] : v, 1).slice(0, 500))
