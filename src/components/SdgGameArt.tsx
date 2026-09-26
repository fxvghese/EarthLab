/**
 * Hand-drawn SVG art for the SDG introduction overlay — the category hero
 * visual and the small game-card marks. Kept as inline components so the
 * overlay needs no external assets and inherits the night-palette look.
 */
import type { CategoryId, GameArtKind } from '../data/sdgCategories'

const stroke = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Large illustrated hero for the opened category. */
export function CategoryArt({ id }: { id: CategoryId }) {
  if (id === 'land') {
    return (
      <svg viewBox="0 0 120 84" className="sdg-art" aria-hidden="true">
        <defs>
          <linearGradient id="sdg-art-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16311f" />
            <stop offset="1" stopColor="#0a1a12" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="76" rx="58" ry="10" fill="url(#sdg-art-hill)" />
        <path d="M60 66 V46" stroke="#4a3a28" strokeWidth="2.6" {...stroke} />
        <path d="M60 52 L51 46M60 57 L69 51" stroke="#4a3a28" strokeWidth="1.4" {...stroke} />
        <ellipse cx="60" cy="36" rx="17" ry="9.5" fill="#1f412c" />
        <ellipse cx="47" cy="42" rx="11" ry="6.5" fill="#193524" />
        <ellipse cx="73" cy="42" rx="11.5" ry="6.8" fill="#16301f" />
        <ellipse cx="57" cy="30" rx="10" ry="5" fill="#2a563c" opacity="0.9" />
        <g className="sdg-art-spark">
          <circle cx="45" cy="24" r="1.1" fill="#bfe9ff" opacity="0.8" />
          <circle cx="80" cy="20" r="0.9" fill="#bfe9ff" opacity="0.6" />
        </g>
        <path d="M18 72 q4 -7 9 -8M96 71 q3 -6 8 -7" stroke="#1f412c" strokeWidth="1.2" {...stroke} />
      </svg>
    )
  }
  if (id === 'climate') {
    return (
      <svg viewBox="0 0 120 84" className="sdg-art" aria-hidden="true">
        <defs>
          <linearGradient id="sdg-art-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1830" />
            <stop offset="1" stopColor="#04070d" />
          </linearGradient>
        </defs>
        <rect width="120" height="84" rx="10" fill="url(#sdg-art-sky)" />
        <circle cx="26" cy="18" r="1" fill="#dfe8ff" opacity="0.9" />
        <circle cx="98" cy="12" r="0.8" fill="#dfe8ff" opacity="0.7" />
        <circle cx="88" cy="26" r="1.1" fill="#dfe8ff" opacity="0.5" />
        <g className="sdg-art-float">
          <ellipse cx="62" cy="38" rx="26" ry="11" fill="#22344e" />
          <ellipse cx="48" cy="33" rx="13" ry="8" fill="#2b4260" />
          <ellipse cx="74" cy="32" rx="12" ry="7" fill="#1b2b44" />
          <path d="M40 52 q6 -3 12 0M58 56 q7 -3.5 14 0M74 52 q5 -2.5 10 0" stroke="#9fc4e8" strokeWidth="1.1" opacity="0.5" {...stroke} />
        </g>
        <path d="M14 70 q8 -4 16 0M92 72 q7 -3.5 14 0" stroke="#3a5a82" strokeWidth="1.2" opacity="0.6" {...stroke} />
      </svg>
    )
  }
  if (id === 'water') {
    return (
      <svg viewBox="0 0 120 84" className="sdg-art" aria-hidden="true">
        <defs>
          <linearGradient id="sdg-art-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d2a4a" />
            <stop offset="1" stopColor="#050d18" />
          </linearGradient>
        </defs>
        <rect width="120" height="84" rx="10" fill="url(#sdg-art-sea)" />
        <path d="M0 18 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#9fc4e8" strokeWidth="1.1" opacity="0.4" fill="none" />
        <path d="M0 26 q12 -3.5 24 0 t24 0 t24 0 t24 0 t24 0" stroke="#7fa8dd" strokeWidth="0.9" opacity="0.25" fill="none" />
        <g className="sdg-art-swim">
          <path d="M30 52 c8 -8 22 -8 30 0 c-8 8 -22 8 -30 0Z" fill="#3aa08f" />
          <path d="M30 52 l-9 -7 v14Z" fill="#2f8375" />
          <circle cx="53" cy="50.5" r="1.2" fill="#0a1626" />
        </g>
        <g className="sdg-art-swim2" opacity="0.85">
          <path d="M66 66 c5 -5 14 -5 19 0 c-5 5 -14 5 -19 0Z" fill="#41546e" />
          <path d="M66 66 l-6 -4.5 v9Z" fill="#37475d" />
        </g>
        <path d="M12 78 q2.5 -9 -1 -14M20 80 q2 -8 -0.5 -12" stroke="#1f8a6b" strokeWidth="1.3" opacity="0.8" {...stroke} />
        <circle className="sdg-art-glow" cx="92" cy="44" r="1.4" fill="#b7ffd9" />
        <circle className="sdg-art-glow2" cx="102" cy="58" r="1" fill="#bfeaff" />
      </svg>
    )
  }
  // energy
  return (
    <svg viewBox="0 0 120 84" className="sdg-art" aria-hidden="true">
      <defs>
        <linearGradient id="sdg-art-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#274a76" />
          <stop offset="1" stopColor="#132c4c" />
        </linearGradient>
      </defs>
      <circle cx="94" cy="18" r="9" fill="#e9effb" opacity="0.92" />
      <path d="M94 30 v4M80 22 l-3 2M108 22 l3 2" stroke="#e8f2ff" strokeWidth="1.4" opacity="0.55" {...stroke} />
      <path d="M10 74 h100" stroke="#20344e" strokeWidth="1.4" {...stroke} />
      <g className="sdg-art-panel">
        <path d="M22 62 L34 62 L38 72 L18 72 Z" fill="url(#sdg-art-panel)" stroke="#7fa8dd" strokeWidth="0.8" />
        <path d="M26 62 L29 72M32 62 L35 72M20.5 67 L36.5 67" stroke="#7fa8dd" strokeWidth="0.55" opacity="0.7" />
        <path d="M56 62 L68 62 L72 72 L52 72 Z" fill="url(#sdg-art-panel)" stroke="#7fa8dd" strokeWidth="0.8" />
        <path d="M60 62 L63 72M66 62 L69 72M54.5 67 L70.5 67" stroke="#7fa8dd" strokeWidth="0.55" opacity="0.7" />
      </g>
      <path d="M43 40 l-5 9 h6 l-4 9 11 -12 h-6 l5 -6Z" fill="#ffd9a0" className="sdg-art-bolt" />
      <path d="M20 78 v-6M70 78 v-6" stroke="#2a3b52" strokeWidth="1.2" {...stroke} />
    </svg>
  )
}

/** Small pictogram for a game card. */
export function GameCardArt({ kind }: { kind: GameArtKind }) {
  if (kind === 'land') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M24 26 V15" stroke="#4a3a28" strokeWidth="2" {...stroke} />
        <ellipse cx="24" cy="10" rx="11" ry="6.5" fill="#1f412c" />
        <ellipse cx="15" cy="14" rx="7" ry="4.4" fill="#193524" />
        <ellipse cx="33" cy="14" rx="7.4" ry="4.6" fill="#16301f" />
        <ellipse cx="21.5" cy="6" rx="6" ry="3.2" fill="#2a563c" opacity="0.9" />
      </svg>
    )
  }
  if (kind === 'climate') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <ellipse cx="24" cy="15" rx="15" ry="7" fill="#22344e" />
        <ellipse cx="17" cy="11.5" rx="8" ry="5" fill="#2b4260" />
        <ellipse cx="31" cy="11" rx="7.4" ry="4.6" fill="#1b2b44" />
        <path d="M12 23 q5 -2.5 10 0M26 24.5 q5 -2.5 10 0" stroke="#9fc4e8" strokeWidth="1" opacity="0.55" fill="none" />
      </svg>
    )
  }
  if (kind === 'ocean') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M4 24 c4 0 4 2.4 8 2.4s4-2.4 8-2.4 4 2.4 8 2.4 4-2.4 8-2.4" stroke="#7fd8c4" strokeWidth="1.2" opacity="0.6" {...stroke} />
        <path d="M15 13 c4.5 -4.5 12 -4.5 16 0 c-4 4.5 -11.5 4.5 -16 0Z" fill="#3aa08f" />
        <path d="M15 13 l-5 -4 v8Z" fill="#2f8375" />
        <circle cx="27.5" cy="12" r="0.9" fill="#0a1626" />
      </svg>
    )
  }
  // energy
  return (
    <svg viewBox="0 0 48 32" aria-hidden="true">
      <path d="M8 20 L16 20 L19 27 L5 27 Z" fill="#274a76" stroke="#7fa8dd" strokeWidth="0.7" />
      <path d="M11 20 L13.5 27M15 20 L17.5 27M7 23.5 L17.5 23.5" stroke="#7fa8dd" strokeWidth="0.5" opacity="0.7" />
      <path d="M31 6 l-4 8 h5 l-3.5 8 10 -11 h-5.5 l4.5 -5Z" fill="#ffd9a0" />
    </svg>
  )
}
