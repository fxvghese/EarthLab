/**
 * SDG introduction overlay — the educational bridge between the ecosystem
 * finale and the games.
 *
 * When the student selects an ecosystem element (tree, cloud, fish, solar
 * panel), this overlay fades in over the scene: it names the environmental
 * category, shows a hand-drawn category visual, reveals the connected
 * Sustainable Development Goals one by one, and then lists the games for
 * that category. Selecting a game hands off to the existing game — nothing
 * about the games themselves changes.
 */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getSdg } from '../data/sdgs'
import type { CategoryId, CategoryDef, SdgEntry } from '../data/sdgCategories'
import { CATEGORIES } from '../data/sdgCategories'
import { CategoryArt, GameCardArt } from './SdgGameArt'

const ease = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }

/* ------------------------------------------------------------------ */
/* Official-style SDG pictograms — clean line marks in the goal's      */
/* UN colour. Drawn as small inline SVGs so no external assets exist.  */
/* ------------------------------------------------------------------ */

function SdgIcon({ id, color }: { id: number; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (id) {
    case 2: // Zero Hunger — bowl with steam
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M4 12h16a8 8 0 0 1-16 0Z" {...common} />
          <path d="M2.5 12h19" {...common} />
          <path d="M9.5 8.5c0-1.2 1.4-1.4 1.4-2.7M13.2 8.5c0-1.2 1.4-1.4 1.4-2.7" {...common} />
        </svg>
      )
    case 3: // Well-being — heartbeat pulse
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M3 12h4l2-4.5 3.5 9L15 12h6" {...common} />
        </svg>
      )
    case 6: // Clean Water — droplet
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M12 3.5c3.2 4 6 7.3 6 10.4A6 6 0 0 1 6 13.9C6 10.8 8.8 7.5 12 3.5Z" {...common} />
          <path d="M9.4 14.2a2.7 2.7 0 0 0 2.6 2.9" {...common} strokeWidth={1.3} />
        </svg>
      )
    case 7: // Clean Energy — sun over a power line
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <circle cx="12" cy="9.5" r="3.2" {...common} />
          <path d="M12 3.2v1.6M12 14.2v1.6M5.9 9.5H4.2M19.8 9.5h-1.7M7.6 5.2 6.4 4M17.6 15l-1.2-1.2M16.4 5.2 17.6 4M6.4 15l1.2-1.2" {...common} />
          <path d="M7.5 20.5h9M12 15.8v4.7" {...common} />
        </svg>
      )
    case 9: // Infrastructure — bridge
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M3 13.5c3.5-5 14.5-5 18 0" {...common} />
          <path d="M5.5 12v7.5M18.5 12v7.5M3 19.5h18" {...common} />
          <path d="M9.5 12.6v3M14.5 12.6v3" {...common} strokeWidth={1.3} />
        </svg>
      )
    case 11: // Cities — skyline
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M4 20.5V11l3.5-2v11.5M7.5 20.5V7l4-2.5v16M11.5 20.5v-9l4-1.5v10.5M15.5 20.5V13l4.5-1v8.5" {...common} />
          <path d="M2.5 20.5h19" {...common} />
        </svg>
      )
    case 12: // Responsible consumption — looped arrows
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M6.5 8.5 4 6.2M6.5 8.5l2.8-1.9M6.5 8.5C8 5.4 11.5 4 14.8 5c2.4.7 4 2.4 4.7 4.6" {...common} />
          <path d="M17.5 15.5l2.5 2.3M17.5 15.5l-2.8 1.9M17.5 15.5c-1.5 3.1-5 4.5-8.3 3.5-2.4-.7-4-2.4-4.7-4.6" {...common} />
        </svg>
      )
    case 13: // Climate action — globe held by hands
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <circle cx="12" cy="11" r="6.5" {...common} />
          <path d="M5.5 11h13M12 4.5c-2.2 2-3.2 4.3-3.2 6.5s1 4.5 3.2 6.5c2.2-2 3.2-4.3 3.2-6.5s-1-4.5-3.2-6.5Z" {...common} strokeWidth={1.3} />
          <path d="M3.5 17.5c2.6-1.6 5.4-2.4 8.5-2.4s5.9.8 8.5 2.4" {...common} />
        </svg>
      )
    case 14: // Life Below Water — wave with fish
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M3 15.5c2.4 0 2.4 1.6 4.8 1.6s2.4-1.6 4.8-1.6 2.4 1.6 4.8 1.6 2.4-1.6 4.6-1.6" {...common} />
          <path d="M7.5 10.6c1.5-2.4 4.6-3 6.6-1.3 1.6 1.3 2 3.4 1 5.2l-4.4.4Z" {...common} />
          <path d="M7.5 10.6 5.4 9v4.4l2.1-1.4" {...common} />
          <circle cx="12.6" cy="10.4" r="0.55" fill={color} stroke="none" />
        </svg>
      )
    case 15: // Life on Land — tree
      return (
        <svg viewBox="0 0 24 24" className="sdg-ico" aria-hidden="true">
          <path d="M12 21v-6.5" {...common} />
          <path d="M12 14.5c-4.2 0-6.4-2.4-6.4-5.2C5.6 5.9 8.4 3 12 3s6.4 2.9 6.4 6.3c0 2.8-2.2 5.2-6.4 5.2Z" {...common} />
          <path d="M8.6 19.8h6.8" {...common} />
        </svg>
      )
    default:
      return null
  }
}

/** One SDG row: official number chip, pictogram, name, one-line explanation. */
function SdgRow({ entry, index }: { entry: SdgEntry; index: number }) {
  const official = getSdg(entry.id)
  if (!official) return null
  return (
    <motion.li
      className="sdg-row"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ease, delay: 0.55 + index * 0.28 }}
    >
      <span className="sdg-row-num" style={{ background: official.color }}>
        {entry.id}
      </span>
      <SdgIcon id={entry.id} color={official.color} />
      <div className="sdg-row-text">
        <h4>
          SDG {entry.id} — {official.name}
        </h4>
        <p>{entry.blurb}</p>
      </div>
    </motion.li>
  )
}

/* ------------------------------------------------------------------ */
/* Overlay                                                             */
/* ------------------------------------------------------------------ */

export interface SdgIntroState {
  category: CategoryId
  /** true → skip the SDG stage and land straight on game selection (deep link). */
  showGames?: boolean
}

export function SdgIntroOverlay({ intro, onClose }: { intro: SdgIntroState; onClose: () => void }) {
  const def: CategoryDef | undefined = CATEGORIES[intro.category]
  const [stage, setStage] = useState<'intro' | 'games'>(intro.showGames ? 'games' : 'intro')

  // Re-deriving stage when the intro target changes (new category or a
  // deep link arriving while the overlay is already mounted).
  useEffect(() => {
    setStage(intro.showGames ? 'games' : 'intro')
  }, [intro.category, intro.showGames])

  // Lock page scroll while the overlay is open.
  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])

  const games = useMemo(() => def?.games ?? [], [def])
  if (!def) return null

  const close = (): void => onClose()

  const gameLabel = def.id === 'energy' ? 'energy' : def.name.toLowerCase()

  // Portal to <body>: the overlay must not inherit the ecosystem layer's
  // hidden state (it fades in only when scrolled to the finale, but the
  // deep-link path — Back from a game — opens at scroll 0).
  return createPortal(
    <motion.div
      className={'sdg-intro' + (stage === 'games' ? ' show-games' : '')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${def.name} — sustainable development goals`}
    >
      <div className="sdg-intro-veil" aria-hidden="true" />

      <motion.div
        className="sdg-intro-panel"
        initial={{ y: 26, opacity: 0, scale: 0.985 }}
        animate={{
          y: 0,
          opacity: stage === 'games' ? 0 : 1,
          scale: stage === 'games' ? 0.985 : 1,
        }}
        exit={{ y: 18, opacity: 0, scale: 0.99 }}
        transition={ease}
        style={{ pointerEvents: stage === 'games' ? 'none' : 'auto' }}
      >
        <button type="button" className="sdg-intro-close" onClick={close} aria-label="Close introduction">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </button>

        {/* stage 1 — category + SDGs */}
        <div className="sdg-intro-hero">
          <p className="sdg-intro-kicker">You are exploring</p>
          <h2 className="sdg-intro-title">{def.name}</h2>
          <p className="sdg-intro-focus">{def.focus}</p>
          <div className="sdg-intro-art">
            <CategoryArt id={def.id} />
          </div>
          <p className="sdg-intro-whisper" aria-hidden="true">
            {def.id === 'water'
              ? 'the fish know the way down'
              : def.id === 'land'
                ? 'the forest remembers'
                : def.id === 'climate'
                  ? 'the sky keeps the record'
                  : 'light becomes power'}
          </p>
        </div>

        <div className="sdg-intro-side">
          <h3 className="sdg-intro-sub">Connected SDGs</h3>
          <ul className="sdg-list">
            {def.sdgs.map((s, i) => (
              <SdgRow key={s.id} entry={s} index={i} />
            ))}
          </ul>

          <motion.button
            type="button"
            className="sdg-intro-continue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 + def.sdgs.length * 0.28 + 0.15 }}
            onClick={() => setStage('games')}
          >
            <span>choose a {gameLabel} game</span>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* stage 2 — game selection (fades in above the panel) */}
      <AnimatePresence>
        {stage === 'games' && (
          <motion.div
            className="sdg-games"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-label={`${def.name} games`}
          >
            <button type="button" className="sdg-games-back" onClick={() => setStage('intro')}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path d="M19 12H5m0 0 6 6m-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>back to the SDGs</span>
            </button>
            <h3 className="sdg-games-title">{def.name} games</h3>
            <p className="sdg-games-sub">Each mission opens the game exactly as it works today.</p>
            <div className="sdg-games-grid">
              {games.map((g, i) => (
                <motion.button
                  key={g.title}
                  type="button"
                  className="sdg-game-card"
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...ease, delay: 0.08 + i * 0.09 }}
                  onClick={() => window.location.assign(g.href)}
                >
                  <span className="sdg-game-art" aria-hidden="true">
                    <GameCardArt kind={g.art} />
                  </span>
                  <span className="sdg-game-body">
                    <span className="sdg-game-title">{g.title}</span>
                    <span className="sdg-game-desc">{g.desc}</span>
                    <span className="sdg-game-go">
                      play
                      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
                        <path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}
