import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CursorCard } from '@/components/ui/cursor-card'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useEcosystemPhase } from '../hooks/useEcosystemPhase'
import { scrollToSdg } from '../journey/sections'
import cloudPng from '../assets/eco-cloud.png'
import {
  ECOSYSTEM_CLOUDS,
  ECOSYSTEM_FISH,
  ECOSYSTEM_SOLARS,
  ECOSYSTEM_TREES,
  type EcosystemElement,
  type EcosystemKind,
} from '../data/ecosystem'
import { CATEGORY_BY_KIND, CATEGORY_HASH, CATEGORY_NAME, type CategoryId } from '../data/sdgCategories'
import { SdgIntroOverlay } from './SdgIntroOverlay'

/** Small deterministic PRNG factory so the scene never reshuffles. */
function makeRand(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Element click → category SDG introduction. The overlay shows the category's
 * connected SDGs, then the games for that category; launching a game from the
 * overlay hands off to the existing build untouched.
 */
/** Moon → EarthLab: simple browser redirect, no router. */
function openEarthLab(): void {
  window.location.href = '/earthlab'
}

function moonKeyDown(e: React.KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openEarthLab()
  }
}

/** Anchor point (viewBox coords) used for hover scale + selection halo. */
function haloFor(el: EcosystemElement): { cx: number; cy: number; rx: number; ry: number } {
  switch (el.kind) {
    case 'tree':
      return { cx: el.x, cy: el.y - 6.5 * el.scale, rx: 9 * el.scale, ry: 6.2 * el.scale }
    case 'solar':
      return { cx: el.x + 6.5 * el.scale, cy: el.y - 1, rx: 9.5 * el.scale, ry: 4.6 * el.scale }
    case 'fish':
      return { cx: el.x, cy: el.y, rx: 6.5 * el.scale, ry: 2.8 * el.scale }
    case 'cloud':
      // Cloud artwork is a 26×23 photo sprite anchored 2.3 units above `el.y`.
      return { cx: el.x, cy: el.y - 9.4 * el.scale, rx: 15 * el.scale, ry: 12.5 * el.scale }
  }
}

/* ------------------------------------------------------------------ */
/* Per-kind artwork. Each interactive element keeps its own silhouette */
/* so the scene reads as a real place, not a grid of identical props.  */
/* ------------------------------------------------------------------ */

function TreeArt({ el }: { el: EcosystemElement }) {
  const s = el.scale
  if (el.id === 'tree-2') {
    // Strangler fig — layered, wide canopy
    return (
      <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
        <path d="M0 0 C -0.6 -3 -2.4 -5 -3.2 -8" stroke="#3a2c1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M0 0 C 0.6 -3 2.4 -5 3.2 -8" stroke="#33261a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M0 -2 C 0 -6 0 -9 0 -12" stroke="#423322" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="-15.5" rx="9.5" ry="4.6" fill="#132a1c" />
        <ellipse cx="-5.5" cy="-13.2" rx="6" ry="3.4" fill="#193524" />
        <ellipse cx="5.8" cy="-13.4" rx="6.2" ry="3.5" fill="#10241a" />
        <ellipse cx="-1.5" cy="-17.6" rx="5.4" ry="2.9" fill="#1f412c" opacity="0.95" />
        <ellipse cx="-7.5" cy="-16" rx="2.6" ry="1.2" fill="#26503a" opacity="0.55" />
        <ellipse cx="7" cy="-16.4" rx="2.2" ry="1" fill="#2a563c" opacity="0.5" />
      </g>
    )
  }
  if (el.id === 'tree-3') {
    // Coastal palm
    return (
      <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
        <path d="M0 0 C 0.9 -4 0.4 -8 -0.4 -12" stroke="#4a3a28" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <g transform="translate(-0.4 -12)">
          <path d="M0 0 C -3.5 -2.2 -6.8 -2.4 -9.6 -0.6" stroke="#1c4028" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <path d="M0 0 C -2.8 -3.2 -5.6 -4.6 -8.6 -4.4" stroke="#234c33" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <path d="M0 0 C 3.5 -2.2 6.8 -2.4 9.6 -0.6" stroke="#1c4028" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <path d="M0 0 C 2.8 -3.2 5.6 -4.6 8.6 -4.4" stroke="#234c33" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <path d="M0 0 C -0.8 -3.4 -0.6 -5.6 0.4 -7.4" stroke="#2a563c" strokeWidth="1.15" fill="none" strokeLinecap="round" />
          <circle cx="1.2" cy="-0.6" r="0.65" fill="#6d5a35" />
          <circle cx="-1.3" cy="-0.2" r="0.6" fill="#6d5a35" />
        </g>
      </g>
    )
  }
  // tree-1 — tall takamaka with broad crown
  return (
    <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
      <path d="M0 0 C -0.5 -5 0.5 -9 0.2 -13" stroke="#33261a" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M0.2 -6 L3.4 -8.4" stroke="#33261a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M0.1 -9 L-2.8 -11" stroke="#2c2015" strokeWidth="1" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="-15.4" rx="8.2" ry="4.4" fill="#16311f" />
      <ellipse cx="-5" cy="-12.8" rx="5" ry="2.9" fill="#1c3d26" />
      <ellipse cx="5.2" cy="-12.9" rx="5.1" ry="3" fill="#122a1b" />
      <ellipse cx="-1" cy="-17.4" rx="4.6" ry="2.5" fill="#23492e" opacity="0.95" />
      <ellipse cx="-6.4" cy="-15.8" rx="2.2" ry="1" fill="#2b5638" opacity="0.5" />
      <ellipse cx="6.6" cy="-16" rx="2" ry="0.95" fill="#2b5638" opacity="0.45" />
    </g>
  )
}

function FishArt({ el }: { el: EcosystemElement }) {
  const s = el.scale
  if (el.id === 'fish-2') {
    // Blue tang — rounder, deep body
    return (
      <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
        <path d="M0 0 C 1.6 -1.9 3.8 -1.5 4.6 0 C 3.8 1.5 1.6 1.9 0 0 Z" fill="#2f6fd0" />
        <path d="M0 0 L-1.8 -1.5 L-1.8 1.5 Z" fill="#2458a8" />
        <path d="M0.4 -1.2 C 1 -2.4 2.6 -2.4 3.2 -1.4" fill="none" stroke="#3f88e0" strokeWidth="0.5" />
        <circle cx="3.4" cy="-0.2" r="0.3" fill="#0a1626" />
      </g>
    )
  }
  if (el.id === 'fish-3') {
    // Lanternfish — small, with a glowing photophore
    return (
      <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
        <path d="M0 0 C 1.4 -1.1 3 -0.7 3.6 0 C 3 0.7 1.4 1.1 0 0 Z" fill="#41546e" />
        <path d="M0 0 L-1.5 -0.9 L-1.5 0.9 Z" fill="#37475d" />
        <circle cx="1.9" cy="-0.5" r="0.34" fill="#b7ffd9">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.8s" begin={`${el.phase}s`} repeatCount="indefinite" />
        </circle>
        <circle cx="3.2" cy="-0.2" r="0.22" fill="#0a1626" />
      </g>
    )
  }
  // fish-1 — parrotfish
  return (
    <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
      <path d="M0 0 C 1.7 -1.7 4 -1.3 4.9 0 C 4 1.3 1.7 1.7 0 0 Z" fill="#3aa08f" />
      <path d="M0.5 -0.9 C 1.4 -1.6 3 -1.5 3.6 -0.8" fill="none" stroke="#7fd8c4" strokeWidth="0.45" opacity="0.8" />
      <path d="M0 0 L-1.7 -1.3 L-1.7 1.3 Z" fill="#2f8375" />
      <path d="M1.6 0.9 C 1.9 1.4 2.5 1.4 2.8 1" fill="none" stroke="#2f8375" strokeWidth="0.4" />
      <circle cx="3.6" cy="-0.25" r="0.3" fill="#0a1626" />
    </g>
  )
}

function CloudArt({ el }: { el: EcosystemElement }) {
  const s = el.scale
  // The user-provided photorealistic cloud render (black background keyed
  // to alpha by the #eco-cloudkey filter). Sprite is 26×23 units, its
  // bottom edge resting ~2.3 units above the element anchor.
  return (
    <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
      <image
        href={cloudPng}
        x={-13}
        y={-20.8}
        width={26}
        height={23.1}
        filter="url(#eco-cloudkey)"
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  )
}

function SolarArt({ el }: { el: EcosystemElement }) {
  const s = el.scale
  return (
    <g className="eco-art" transform={`translate(${el.x} ${el.y}) scale(${s})`}>
      <path d="M1 3.6 L1.6 1.6 M4.4 3.6 L3.9 1.6 M7.4 3.6 L6.9 1.6 M10.4 3.6 L9.9 1.6" stroke="#2a3b52" strokeWidth="0.4" />
      {[0, -4.6].map((row, r) => (
        <g key={r} transform={`translate(0 ${row})`}>
          {[0, 6.4].map((col, c) => (
            <g key={c} transform={`translate(${col} 0)`}>
              <path d="M0 0 L5.4 0 L6.8 2.6 L1.4 2.6 Z" fill="url(#eco-panel)" stroke="#7fa8dd" strokeWidth="0.22" />
              <path d="M2 0 L3.4 2.6 M4 0 L5.4 2.6 M0.7 1.3 L6.1 1.3" stroke="#7fa8dd" strokeWidth="0.16" opacity="0.65" />
              <path d="M5.9 0.35 L6.6 1.65" stroke="#e8f2ff" strokeWidth="0.3" opacity="0.5" />
            </g>
          ))}
        </g>
      ))}
    </g>
  )
}

/** Simplified silhouettes for the hover-card thumbnails (raw SVG string). */
const THUMB_ART: Record<EcosystemKind, string> = {
  tree:
    "<rect x='56' y='52' width='7' height='18' rx='2' fill='#5a4230'/>" +
    "<circle cx='60' cy='42' r='16' fill='#2f6b3c'/>" +
    "<circle cx='48' cy='50' r='10' fill='#38804a'/>" +
    "<circle cx='72' cy='50' r='10' fill='#285c34'/>",
  fish:
    "<ellipse cx='58' cy='46' rx='16' ry='8' fill='#3f9fd8'/>" +
    "<path d='M42 46 L30 38 L30 54 Z' fill='#3f9fd8'/>" +
    "<circle cx='66' cy='44' r='2' fill='#eaf6ff'/>",
  cloud:
    "<ellipse cx='52' cy='44' rx='18' ry='7' fill='#aab8cc'/>" +
    "<ellipse cx='66' cy='40' rx='13' ry='7' fill='#c3cfe0'/>" +
    "<ellipse cx='40' cy='40' rx='10' ry='5' fill='#bcc8da'/>",
  solar:
    "<g transform='skewX(-16)'>" +
    "<rect x='62' y='42' width='36' height='14' fill='#16345c' stroke='#4d7cc0' stroke-width='1.2'/>" +
    "<path d='M62 49 h36 M74 42 v14 M86 42 v14' stroke='#4d7cc0' stroke-width='1' fill='none'/>" +
    '</g>',
}

/**
 * `EcosystemScene` — the finale.
 *
 * A cinematic nighttime island shoreline in split above/below-water
 * perspective. Exactly 3 trees, 3 fish, 3 clouds and 2 solar arrays are
 * interactive: each object *is* the button (wrapped in `CursorCard` for the
 * cursor-following hover preview). Clicking an object opens its category's
 * SDG introduction overlay — the bridge to that category's games. All other
 * artwork is decorative.
 */
export function EcosystemScene() {
  const inPhase = useEcosystemPhase()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Open category SDG introduction (fish → water, tree → land, …). */
  const [introCategory, setIntroCategory] = useState<CategoryId | null>(null)
  /** Deep-link stage: true → jump straight to the category's game selection. */
  const [introShowGames, setIntroShowGames] = useState(false)

  // Deep link: the ocean game's Back button returns to /#water-games, which
  // reopens the Water overlay directly on its game-selection stage.
  useEffect(() => {
    const read = (): void => {
      const hash = window.location.hash.replace(/^#/, '')
      const match = (Object.keys(CATEGORY_HASH) as CategoryId[]).find((c) => CATEGORY_HASH[c] === hash)
      if (match) {
        setIntroCategory(match)
        setIntroShowGames(true)
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  // Whole-scene fitting: slice on wide screens, bottom-anchored meet on
  // narrow/portrait screens so every interactive element stays reachable.
  // ResizeObserver (not the window resize event) so emulation, zoom and
  // visual-viewport changes are all covered.
  const [preserve, setPreserve] = useState('xMidYMax slice')
  useEffect(() => {
    const read = (): void => {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight
      setPreserve(h > 0 && w / h < 1.1 ? 'xMidYMax meet' : 'xMidYMax slice')
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  useEscapeKey(() => {
    if (introCategory) {
      setIntroCategory(null)
    } else if (selectedId) {
      setSelectedId(null)
    } else {
      window.scrollTo({
        top: scrollToSdg(16, window.innerHeight, document.documentElement.scrollHeight),
        behavior: 'smooth',
      })
    }
  }, inPhase)

  /* --- seeded scenery ------------------------------------------------ */
  const stars = useMemo(() => {
    const rand = makeRand(97)
    return Array.from({ length: 260 }, () => ({
      x: rand() * 160,
      y: rand() * rand() * 46,
      r: 0.1 + rand() * 0.24,
      o: 0.25 + rand() * 0.6,
      tw: rand() * 6,
    }))
  }, [])

  const mwStars = useMemo(() => {
    const rand = makeRand(113)
    return Array.from({ length: 70 }, () => {
      const u = rand()
      return {
        x: 6 + u * 150,
        y: 26 - u * 18 + (rand() - 0.5) * 7,
        r: 0.08 + rand() * 0.2,
        o: 0.3 + rand() * 0.55,
      }
    })
  }, [])

  const hillRocks = useMemo(() => {
    const rand = makeRand(23)
    return Array.from({ length: 7 }, () => ({
      x: 3 + rand() * 58,
      y: 33 + rand() * 9,
      rx: 1 + rand() * 1.6,
      ry: 0.6 + rand() * 0.9,
    }))
  }, [])

  const veg = useMemo(() => {
    const rand = makeRand(83)
    return Array.from({ length: 18 }, (_, i) => ({
      x: 2 + i * 3.4 + rand() * 2.2,
      y: 32.5 + rand() * 8.5,
      s: 0.55 + rand() * 0.6,
    }))
  }, [])

  const lights = useMemo(() => {
    const rand = makeRand(19)
    return Array.from({ length: 7 }, () => ({
      x: 5 + rand() * 46,
      y: 29 + rand() * 8,
      r: 0.16 + rand() * 0.1,
      o: 0.45 + rand() * 0.35,
    }))
  }, [])

  const rocks = useMemo(() => {
    const rand = makeRand(41)
    return Array.from({ length: 9 }, () => ({
      x: 105 + rand() * 55,
      y: 82 + rand() * 7,
      rx: 1.6 + rand() * 2.6,
      ry: 1 + rand() * 1.4,
      o: 0.55 + rand() * 0.4,
    }))
  }, [])

  const seagrass = useMemo(() => {
    const rand = makeRand(59)
    return Array.from({ length: 12 }, (_, i) => ({
      x: 106 + i * 4.6 + rand() * 2.2,
      y: 87.5 + rand() * 2,
      s: 0.7 + rand() * 0.7,
      phase: rand() * 4,
    }))
  }, [])

  const plankton = useMemo(() => {
    const rand = makeRand(71)
    return Array.from({ length: 22 }, () => ({
      x: 104 + rand() * 56,
      y: 56 + rand() * 32,
      r: 0.1 + rand() * 0.16,
      o: 0.12 + rand() * 0.3,
      phase: rand() * 6,
    }))
  }, [])

  /* --- hover thumbnails ---------------------------------------------- */
  const thumbs = useMemo(() => {
    const all = [...ECOSYSTEM_TREES, ...ECOSYSTEM_FISH, ...ECOSYSTEM_CLOUDS, ...ECOSYSTEM_SOLARS]
    const entries = all.map((el) => {
      // Clouds use the real photo render as their hover-card image.
      if (el.kind === 'cloud') return [el.id, cloudPng] as const
      const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'>" +
        "<rect width='120' height='80' fill='#050c17'/>" +
        "<circle cx='98' cy='15' r='8' fill='#dfe8fa' opacity='0.95'/>" +
        THUMB_ART[el.kind] +
        '</svg>'
      return [el.id, `data:image/svg+xml,${encodeURIComponent(svg)}`] as const
    })
    return Object.fromEntries(entries) as Record<string, string>
  }, [])

  const allElements: EcosystemElement[] = [...ECOSYSTEM_TREES, ...ECOSYSTEM_CLOUDS, ...ECOSYSTEM_SOLARS, ...ECOSYSTEM_FISH]
  const selected = allElements.find((el) => el.id === selectedId) ?? null

  /* --- object button (the object IS the button) ----------------------- */
  const renderElement = (el: EcosystemElement): JSX.Element => {
    const halo = haloFor(el)
    const active = selectedId === el.id
    // Every object opens its category's SDG introduction before any game.
    const category: CategoryId = CATEGORY_BY_KIND[el.kind]
    const aria = `Explore ${CATEGORY_NAME[category]} — ${el.hover}`
    return (
      <CursorCard key={el.id} image={thumbs[el.id]} description={el.hover} className="eco-card-anchor">
        <g
          role="button"
          tabIndex={0}
          className={'eco-el' + (active ? ' is-active' : '')}
          data-kind={el.kind}
          aria-label={aria}
          aria-pressed={active}
          onClick={() => {
            setSelectedId((cur) => (cur === el.id ? null : el.id))
            setIntroCategory(category)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedId((cur) => (cur === el.id ? null : el.id))
              setIntroCategory(category)
            }
          }}
          style={{ transformBox: 'view-box', transformOrigin: `${halo.cx}px ${halo.cy}px` }}
        >
          <ellipse className="eco-halo" cx={halo.cx} cy={halo.cy} rx={halo.rx} ry={halo.ry} />
          {el.kind === 'tree' && (
            <g className="eco-sway" style={{ transformBox: 'view-box', transformOrigin: `${el.x}px ${el.y}px`, animationDelay: `${el.phase}s` }}>
              <TreeArt el={el} />
            </g>
          )}
          {el.kind === 'cloud' && (
            <g className="eco-drift" style={{ animationDelay: `${el.phase}s` }}>
              <CloudArt el={el} />
            </g>
          )}
          {el.kind === 'fish' && (
            <g className="eco-swim" style={{ animationDelay: `${el.phase}s` }}>
              <FishArt el={el} />
            </g>
          )}
          {el.kind === 'solar' && <SolarArt el={el} />}
        </g>
      </CursorCard>
    )
  }

  return (
    <div
      className={'ecosystem' + (inPhase ? ' is-visible' : '')}
      aria-hidden={false}
      onClickCapture={(e) => {
        // The scene objects are anchors by inheritance of CursorCard; keep
        // their click purely in-scene (never navigate).
        const target = e.target as HTMLElement
        if (target.closest('.eco-card-anchor')) e.preventDefault()
      }}
    >
      <svg className="ecosystem-svg" viewBox="0 0 160 90" preserveAspectRatio={preserve}>
        <defs>
          <linearGradient id="eco-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#020409" />
            <stop offset="0.35" stopColor="#061024" />
            <stop offset="0.75" stopColor="#0b2140" />
            <stop offset="1" stopColor="#14355c" />
          </linearGradient>
          <radialGradient id="eco-moonhalo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#eaf1ff" stopOpacity="0.55" />
            <stop offset="0.4" stopColor="#bcd0f7" stopOpacity="0.18" />
            <stop offset="1" stopColor="#bcd0f7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eco-mw" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#b8c8e8" stopOpacity="0.16" />
            <stop offset="0.6" stopColor="#93a9d4" stopOpacity="0.07" />
            <stop offset="1" stopColor="#93a9d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eco-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#12261c" />
            <stop offset="0.55" stopColor="#0c1b14" />
            <stop offset="1" stopColor="#071009" />
          </linearGradient>
          <linearGradient id="eco-ridge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1520" />
            <stop offset="1" stopColor="#060d15" />
          </linearGradient>
          <linearGradient id="eco-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123055" />
            <stop offset="1" stopColor="#081a30" />
          </linearGradient>
          <linearGradient id="eco-uw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e8ea8" />
            <stop offset="0.35" stopColor="#1b6a8c" />
            <stop offset="1" stopColor="#0a3554" />
          </linearGradient>
          <linearGradient id="eco-seabed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2438" />
            <stop offset="1" stopColor="#151220" />
          </linearGradient>
          <linearGradient id="eco-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#274a76" />
            <stop offset="1" stopColor="#132c4c" />
          </linearGradient>
          <clipPath id="eco-uw">
            <rect x="0" y="50" width="160" height="40" />
          </clipPath>
          {/* Luminance key for the photo cloud sprite: black pixels become
              transparent, bright cloud pixels become opaque, soft edges keep
              partial alpha (so the night sky shows through the wisps). */}
          <filter id="eco-cloudkey" x="-10%" y="-10%" width="120%" height="120%">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0.35 0.5 0.15 0 0"
            />
            <feComponentTransfer>
              <feFuncA type="gamma" amplitude="1.55" exponent="0.55" offset="0" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* sky */}
        <rect x="0" y="0" width="160" height="90" fill="url(#eco-sky)" />

        {/* stars */}
        <g>
          {stars.map((s, i) => (
            <circle
              key={i}
              className="eco-star"
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#dfe8ff"
              style={{ animationDelay: `${s.tw}s`, ['--o' as string]: s.o } as React.CSSProperties}
            />
          ))}
        </g>

        {/* milky way */}
        <g opacity="0.7">
          <ellipse cx="80" cy="24" rx="95" ry="9" fill="url(#eco-mw)" transform="rotate(-14 80 24)" />
          <ellipse cx="80" cy="26" rx="80" ry="4.5" fill="url(#eco-mw)" transform="rotate(-14 80 26)" opacity="0.8" />
          {mwStars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e6edff" opacity={s.o} />
          ))}
        </g>

        {/* moon artwork is rendered last so it stays clickable above the
            interactive objects — see the .eco-moon-btn group at the end. */}

        {/* interactive clouds */}
        {ECOSYSTEM_CLOUDS.map(renderElement)}

        {/* distant ridge */}
        <path
          d="M0 40 L10 36.5 L22 39 L34 35.5 L48 39.5 L60 37 L74 41 L86 44 L100 42.5 L116 44.5 L132 43 L148 45 L160 43.5 L160 50 L0 50 Z"
          fill="url(#eco-ridge)"
          opacity="0.9"
        />

        {/* hillside */}
        <path
          d="M0 33 C 12 30.5, 24 30.2, 34 32.5 C 44 34.8, 54 40, 62 45 C 67 47.8, 71 49.2, 75 50 L0 50 Z"
          fill="url(#eco-hill)"
        />

        {/* solar clearings */}
        <ellipse cx="31.5" cy="49.7" rx="9.6" ry="1.05" fill="#1d3226" opacity="0.9" />
        <ellipse cx="50.5" cy="49.85" rx="7.6" ry="0.85" fill="#1d3226" opacity="0.9" />

        {/* hill rocks + vegetation + warm lights */}
        {hillRocks.map((r, i) => (
          <ellipse key={i} cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill="#20342a" opacity="0.85" />
        ))}
        {veg.map((v, i) => (
          <g key={i} transform={`translate(${v.x} ${v.y}) scale(${v.s})`}>
            <ellipse cx="0" cy="-1.1" rx="1.9" ry="1.1" fill="#0f2818" />
            <ellipse cx="0.6" cy="-1.5" rx="1.1" ry="0.6" fill="#163622" opacity="0.8" />
          </g>
        ))}
        {lights.map((l, i) => (
          <g key={i}>
            <circle cx={l.x} cy={l.y} r={l.r * 2.6} fill="#ffb45e" opacity={l.o * 0.25} className="eco-glow" style={{ animationDelay: `${i * 0.9}s` }} />
            <circle cx={l.x} cy={l.y} r={l.r} fill="#ffd9a0" opacity={l.o} className="eco-glow" style={{ animationDelay: `${i * 0.9}s` }} />
          </g>
        ))}

        {/* interactive trees + solar arrays */}
        {ECOSYSTEM_TREES.map(renderElement)}
        {ECOSYSTEM_SOLARS.map(renderElement)}

        {/* shore + waterline */}
        <path d="M66 49.1 C 72 48.7, 79 49.1, 86 49.7 L86 50.5 L66 50.5 Z" fill="#22303f" opacity="0.9" />
        <path d="M0 50 L160 50" stroke="#bcd7ff" strokeWidth="0.14" opacity="0.45" />
        <g className="eco-surface">
          <path d="M4 51.2 q 3 -0.5 6 0 t 6 0 t 6 0" fill="none" stroke="#9fc4e8" strokeWidth="0.22" opacity="0.35" />
          <path d="M88 51.6 q 3 -0.5 6 0 t 6 0 t 6 0" fill="none" stroke="#9fc4e8" strokeWidth="0.22" opacity="0.3" />
          <path d="M120 51 q 3 -0.5 6 0 t 6 0 t 6 0" fill="none" stroke="#9fc4e8" strokeWidth="0.22" opacity="0.35" />
        </g>

        {/* ocean surface band */}
        <rect x="0" y="50" width="160" height="0" fill="none" />
        <rect x="0" y="50" width="160" height="40" fill="url(#eco-ocean)" opacity="0.001" />
        <rect x="0" y="50" width="160" height="40" fill="url(#eco-uw)" />

        {/* underwater: reflections, rays, life */}
        <g clipPath="url(#eco-uw)">
          {/* moonlight shaft + shimmer */}
          <path d="M123 50 L137 50 L142 68 L118 68 Z" fill="#cfe0ff" opacity="0.06" />
          <g className="eco-ripple" opacity="0.55">
            <ellipse cx="130" cy="52.4" rx="9" ry="0.9" fill="#dfe9ff" opacity="0.5" />
            <ellipse cx="130" cy="54.4" rx="13" ry="1" fill="#c8d8f5" opacity="0.3" />
            <ellipse cx="130" cy="56.8" rx="17" ry="1.1" fill="#b7cbf0" opacity="0.2" />
            <ellipse cx="130" cy="59.6" rx="21" ry="1.2" fill="#a5bce8" opacity="0.14" />
          </g>
          {/* landscape reflections */}
          <path d="M2 50.2 L40 50.2 L38 55.5 L6 55.5 Z" fill="#08131f" opacity="0.5" />
          <path d="M44 50.3 L58 50.3 L57 52.6 L45 52.6 Z" fill="#16345c" opacity="0.22" />
          <path d="M0 50.4 C 20 51.8, 50 50.6, 74 51.2 C 100 51.8, 130 50.6, 160 51.4 L160 53.2 C 130 52.4, 100 53.6, 74 53 C 50 52.4, 20 53.6, 0 52.2 Z" fill="#0a1930" opacity="0.35" />
          {/* light rays */}
          <g className="eco-rays" style={{ transformBox: 'view-box', transformOrigin: '78px 50px' }}>
            <path d="M36 50 L46 50 L58 90 L40 90 Z" fill="#bfe9ff" opacity="0.05" />
            <path d="M52 50 L60 50 L74 90 L60 90 Z" fill="#bfe9ff" opacity="0.04" />
            <path d="M70 50 L76 50 L92 90 L80 90 Z" fill="#bfe9ff" opacity="0.05" />
          </g>
          {/* seabed */}
          <path d="M100 84 C 116 81.5, 138 83, 160 80.5 L160 90 L100 90 Z" fill="url(#eco-seabed)" />
          {rocks.map((r, i) => (
            <ellipse key={i} cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill="#3a3450" opacity={r.o} />
          ))}
          {seagrass.map((g, i) => (
            <g key={i} className="eco-grass" transform={`translate(${g.x} ${g.y}) scale(${g.s})`} style={{ transformOrigin: `${g.x}px ${g.y}px`, animationDelay: `${g.phase}s` }}>
              <path d="M0 0 C -0.8 -2.2, 0.5 -4.2, -0.3 -6.4" fill="none" stroke="#1f8a6b" strokeWidth="0.34" strokeLinecap="round" />
              <path d="M0.5 0 C 1.4 -2, 0.6 -4, 1.4 -5.8" fill="none" stroke="#24a37e" strokeWidth="0.3" strokeLinecap="round" opacity="0.85" />
            </g>
          ))}
          {plankton.map((p, i) => (
            <circle key={i} className="eco-plankton" cx={p.x} cy={p.y} r={p.r} fill="#bfeaff" opacity={p.o} style={{ animationDelay: `${p.phase}s` }} />
          ))}
        </g>

        {/* interactive fish */}
        {ECOSYSTEM_FISH.map(renderElement)}

        {/* moon — clickable entry point to the EarthLab climate game.
            Rendered LAST so it sits above every interactive object for hit
            testing; the artwork itself is unchanged from the original. */}
        <g className="eco-moon-btn" onClick={openEarthLab} onKeyDown={moonKeyDown} role="button" tabIndex={0} aria-label="EarthLab: Climate Control — open the climate game">
          <title>EarthLab: Climate Control</title>
          <circle className="eco-moon-halo" cx="130" cy="18" r="17.5" />
          <circle cx="130" cy="18" r="16" fill="url(#eco-moonhalo)" />
          <circle cx="130" cy="18" r="7.5" fill="#e9effb" />
          <circle cx="127.6" cy="16.2" r="1.5" fill="#cdd8ea" opacity="0.55" />
          <circle cx="132.4" cy="20.4" r="1.1" fill="#cdd8ea" opacity="0.45" />
          <circle cx="131.8" cy="15.4" r="0.7" fill="#cdd8ea" opacity="0.4" />
        </g>
      </svg>

      {/* discoverability hint — fades once an object is selected */}
      <div className={'eco-hint' + (selected || introCategory ? ' is-hidden' : '')} aria-hidden="true">
        Click a tree, cloud, fish or solar panel to meet its Sustainable Development Goals
      </div>

      {/* glass info panel */}
      {selected && (
        <div className="eco-panel" role="status" key={selected.id}>
          <button type="button" className="eco-panel-close" onClick={() => setSelectedId(null)} aria-label="Close details">
            ×
          </button>
          <p className="eco-panel-kicker">{selected.kicker}</p>
          <h2 className="eco-panel-title">{selected.label}</h2>
          <p className="eco-panel-text">{selected.info}</p>
        </div>
      )}

      {/* category → SDG introduction → game selection */}
      <AnimatePresence>
        {introCategory && (
          <SdgIntroOverlay
            intro={{ category: introCategory, showGames: introShowGames }}
            onClose={() => {
              setIntroCategory(null)
              setIntroShowGames(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
