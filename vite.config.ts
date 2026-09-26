import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

/** The `EL Reso` games exposed as static routes under /games/<slug>. */
const EL_RESO_GAMES: Array<{ slug: string; dir: string; entry: string }> = [
  { slug: 'land', dir: 'Land G1', entry: 'index.html' },
  { slug: 'energy', dir: 'Energy S1', entry: 'game.html' },
  { slug: 'climate', dir: 'Climate G1', entry: 'climate.html' },
  { slug: 'ocean', dir: 'ocean', entry: 'index.html' },
]

const gameDist = (dir: string): string => path.join(root, 'EL Reso', dir, 'dist')

/** Dev middleware: serve each game's own build at /games/<slug>/… */
function elResoGamesDevServer(): Plugin {
  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json; charset=utf-8',
  }
  return {
    name: 'el-reso-games-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        const match = url.match(/^\/games\/(land|energy|climate|ocean)(\/.*)?$/)
        if (!match) return next()
        const game = EL_RESO_GAMES.find((g) => g.slug === match[1])
        if (!game) return next()
        const base = gameDist(game.dir)
        let sub = match[2] ?? '/'
        if (sub.endsWith('/')) sub += game.entry // directory root → game entry
        const file = path.normalize(path.join(base, sub))
        if (!file.startsWith(path.normalize(base + path.sep)) && file !== path.normalize(base)) {
          return next() // block path traversal
        }
        try {
          const body = fs.readFileSync(file)
          res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
          res.end(body)
        } catch {
          next()
        }
      })
    },
  }
}

/** Production build: copy each game's dist into dist/games/<slug>. */
function elResoGamesCopy(): Plugin {
  return {
    name: 'el-reso-games-copy',
    apply: 'build',
    closeBundle() {
      for (const game of EL_RESO_GAMES) {
        const from = gameDist(game.dir)
        const to = path.join(root, 'dist', 'games', game.slug)
        if (!fs.existsSync(path.join(from, game.entry))) {
          this.warn(`EL Reso game dist missing, skipping copy: ${from}`)
          continue
        }
        fs.cpSync(from, to, { recursive: true })
        // Make the game entry reachable at the directory root too, so
        // /games/<slug>/ is the game under any static host (vite preview).
        if (game.entry !== 'index.html') {
          fs.copyFileSync(path.join(to, game.entry), path.join(to, 'index.html'))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), elResoGamesDevServer(), elResoGamesCopy()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  // Standalone pages: the intro journey (/) and the EarthLab game (/earthlab).
  // The three `EL Reso` games are pre-built by their own projects and exposed
  // as static /games/... routes (see the two el-reso plugins above).
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        earthlab: path.resolve(root, 'earthlab.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
