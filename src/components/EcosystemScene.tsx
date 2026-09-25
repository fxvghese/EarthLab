import { useMemo, useRef } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useEcosystemPhase } from '../hooks/useEcosystemPhase'
import { scrollToSdg } from '../journey/sections'

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
 * `EcosystemScene` — the finale.
 *
 * A stylised miniature world that will later become the navigation
 * environment for the subject games. For now every landmark is decorative:
 * land, soil, forest, clouds, sky, ocean, fish, sun, wind turbines and
 * solar panels. The scene rises as the planet recedes, connecting the
 * "understanding" phase to the "interaction" phase.
 */
export function EcosystemScene() {
  const inPhase = useEcosystemPhase()
  const sceneRef = useRef<HTMLDivElement>(null)

  useEscapeKey(() => {
    // Escape = "leave the finale": scroll back to the last SDG.
    window.scrollTo({
      top: scrollToSdg(16, window.innerHeight, document.documentElement.scrollHeight),
      behavior: 'smooth',
    })
  }, inPhase)

  const trees = useMemo(() => {
    const rand = makeRand(7)
    return Array.from({ length: 14 }, (_, i) => ({
      x: 5 + i * 7.4 + rand() * 3,
      y: 62 + rand() * 8,
      s: 0.65 + rand() * 0.7,
    }))
  }, [])

  const fish = useMemo(() => {
    const rand = makeRand(13)
    return Array.from({ length: 5 }, () => ({
      x: 108 + rand() * 42,
      y: 80 + rand() * 6,
      s: 0.5 + rand() * 0.5,
      flip: rand() > 0.5,
    }))
  }, [])

  const clouds = useMemo(() => {
    const rand = makeRand(29)
    return Array.from({ length: 4 }, (_, i) => ({
      x: 10 + i * 36 + rand() * 14,
      y: 12 + rand() * 12,
      s: 0.75 + rand() * 0.6,
    }))
  }, [])

  const stars = useMemo(() => {
    const rand = makeRand(97)
    return Array.from({ length: 26 }, () => ({
      x: rand() * 160,
      y: rand() * 34,
      r: 0.12 + rand() * 0.22,
      o: 0.25 + rand() * 0.5,
    }))
  }, [])

  return (
    <div ref={sceneRef} className={'ecosystem' + (inPhase ? ' is-visible' : '')} aria-hidden="true">
      <svg className="ecosystem-svg" viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="eco-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#060b18" />
            <stop offset="0.45" stopColor="#0d1e38" />
            <stop offset="0.78" stopColor="#1d3f61" />
            <stop offset="1" stopColor="#2f648e" />
          </linearGradient>
          <radialGradient id="eco-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff4d6" />
            <stop offset="0.35" stopColor="#ffd98a" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eco-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3e7d46" />
            <stop offset="0.5" stopColor="#2c5c39" />
            <stop offset="1" stopColor="#1c3d2a" />
          </linearGradient>
          <linearGradient id="eco-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3625" />
            <stop offset="1" stopColor="#2a1d13" />
          </linearGradient>
          <linearGradient id="eco-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e5f8e" />
            <stop offset="1" stopColor="#0b2c4d" />
          </linearGradient>
          <linearGradient id="eco-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#274a76" />
            <stop offset="1" stopColor="#132c4c" />
          </linearGradient>
        </defs>

        {/* sky */}
        <rect x="0" y="0" width="160" height="90" fill="url(#eco-sky)" />

        {/* stars fading as the atmosphere thickens */}
        <g className="eco-stars">
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe8ff" opacity={s.o} />
          ))}
        </g>

        {/* sun with soft glow */}
        <circle cx="132" cy="20" r="12" fill="url(#eco-sun)" opacity="0.9" />
        <circle cx="132" cy="20" r="3.6" fill="#ffe9b0" />

        {/* clouds */}
        {clouds.map((c, i) => (
          <g key={i} className="eco-cloud" transform={`translate(${c.x} ${c.y}) scale(${c.s})`} opacity="0.85">
            <ellipse cx="0" cy="0" rx="9" ry="2.6" fill="#cfe0f2" opacity="0.5" />
            <ellipse cx="-4" cy="-1.4" rx="4.6" ry="2.2" fill="#dfe9f7" opacity="0.7" />
            <ellipse cx="3" cy="-1.8" rx="5.4" ry="2.6" fill="#d7e5f5" opacity="0.65" />
          </g>
        ))}

        {/* distant mountains */}
        <path
          d="M0 56 L14 40 L26 50 L40 34 L54 48 L68 38 L82 50 L96 42 L112 52 L128 44 L144 52 L160 46 L160 70 L0 70 Z"
          fill="#0f2338"
          opacity="0.9"
        />
        <path
          d="M0 60 L18 48 L32 56 L48 44 L66 56 L84 48 L102 57 L120 50 L138 57 L160 52 L160 74 L0 74 Z"
          fill="#15304a"
          opacity="0.95"
        />

        {/* land */}
        <path d="M0 66 C 24 58, 52 60, 78 62 C 96 63.4, 104 62, 112 63 L112 90 L0 90 Z" fill="url(#eco-land)" />
        {/* soil under the land */}
        <path d="M0 78 L112 76 L112 90 L0 90 Z" fill="url(#eco-soil)" opacity="0.95" />

        {/* forest */}
        {trees.map((t, i) => (
          <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
            <rect x="-0.5" y="0" width="1" height="3.4" fill="#3a2a1a" />
            <path d="M0 -9 L3.2 -2.4 L-3.2 -2.4 Z" fill="#2f6b3c" />
            <path d="M0 -6.4 L3.8 0.4 L-3.8 0.4 Z" fill="#38804a" />
          </g>
        ))}

        {/* wind turbines */}
        {[
          { x: 20, s: 1.15 },
          { x: 38, s: 0.9 },
          { x: 88, s: 1.0 },
        ].map((t, i) => (
          <g key={i} className="eco-turbine" transform={`translate(${t.x} 64) scale(${t.s})`}>
            <path d="M0 0 L0 -16" stroke="#c9d6e6" strokeWidth="0.7" strokeLinecap="round" />
            <g className="eco-rotor" transform="translate(0 -16)">
              <path d="M0 0 L0 -7" stroke="#e6eefb" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M0 0 L6.1 3.5" stroke="#e6eefb" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M0 0 L-6.1 3.5" stroke="#e6eefb" strokeWidth="0.9" strokeLinecap="round" />
              <circle r="0.9" fill="#e6eefb" />
            </g>
          </g>
        ))}

        {/* solar farm */}
        <g transform="translate(58 66)">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 7.5} ${i % 2 === 0 ? 0 : 2.4})`}>
              <path d="M0 0 L5.6 0 L6.8 3.2 L1.2 3.2 Z" fill="url(#eco-panel)" stroke="#5b83b8" strokeWidth="0.18" />
              <path d="M1.9 0 L3.1 3.2 M3.7 0 L4.9 3.2 M0.6 1.6 L6.2 1.6" stroke="#5b83b8" strokeWidth="0.14" opacity="0.7" />
              <path d="M3.4 3.2 L3.4 4.6" stroke="#33465e" strokeWidth="0.4" />
            </g>
          ))}
        </g>

        {/* ocean */}
        <path d="M104 68 C 120 64.5, 140 66, 160 64 L160 90 L104 90 Z" fill="url(#eco-ocean)" />
        <path d="M104 68 C 120 64.5, 140 66, 160 64" fill="none" stroke="#7db8dd" strokeWidth="0.35" opacity="0.6" />
        {/* waves */}
        {[74, 79, 84].map((y, i) => (
          <path
            key={i}
            className="eco-wave"
            d={`M${108 + i * 4} ${y} q 4 -1.2 8 0 t 8 0 t 8 0 t 8 0 t 8 0`}
            fill="none"
            stroke="#9fd0ea"
            strokeWidth="0.3"
            opacity={0.5 - i * 0.12}
          />
        ))}
        {/* fish */}
        {fish.map((f, i) => (
          <g key={i} className="eco-fish" transform={`translate(${f.x} ${f.y}) scale(${f.flip ? -f.s : f.s} ${f.s})`}>
            <path d="M0 0 C 1.6 -1, 3.4 -0.6, 4 0 C 3.4 0.6, 1.6 1, 0 0 Z" fill="#b9dfef" opacity="0.85" />
            <path d="M0 0 L-1.4 -1 L-1.4 1 Z" fill="#8fc4dc" opacity="0.85" />
            <circle cx="3" cy="-0.15" r="0.16" fill="#123" />
          </g>
        ))}

        {/* horizon haze */}
        <rect x="0" y="58" width="160" height="6" fill="#4c88b8" opacity="0.08" />
      </svg>

      <div className="ecosystem-caption">
        <p className="ecosystem-kicker">From understanding to interacting</p>
        <h2 className="ecosystem-title">Earth is our classroom.</h2>
        <p className="ecosystem-sub">
          Land, water, energy and life — this world is where the journey continues.
        </p>
      </div>
    </div>
  )
}
