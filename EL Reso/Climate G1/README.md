# Climate & Atmosphere

A small interactive climate simulator game: push global temperature up with a big slider and watch
sea level, heat, agriculture and ecosystems respond in real time.

## Run

```bash
npm install
npm run dev
```

- Home: `http://localhost:5173/` — the card uses a plain `window.location` redirect to the game.
- Game: `http://localhost:5173/climate.html`

No router, no state management library — React state only. The homepage integration is a single
card (`src/pages/Home.tsx`) you can copy into any existing site.

## Stack

Vite 5 · React 18 · TypeScript · Tailwind CSS v4 · three.js · framer-motion · shadcn-style
`CursorCard` (`src/components/ui/cursor-card.tsx`).

## Note

This is an educational visualization with simplified, relative values — it demonstrates
cause-and-effect relationships, not precise scientific projections.
