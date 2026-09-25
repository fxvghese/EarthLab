import { useEffect, useRef } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { usePointerParallax } from '../hooks/usePointerParallax'
import { SDGS } from '../data/sdgs'
import {
  clamp01,
  ECOSYSTEM_START,
  lerp,
  orbitIndexAt,
  SDG_SECTION_END,
  SDG_SECTION_START,
  smoothstep,
} from '../journey/sections'

export interface EarthFallbackProps {
  reducedMotion: boolean
}

const LIGHT_DIR = { x: 0.55, y: -0.45, z: 0.7 }

/**
 * `EarthFallback` — polished 2D canvas implementation of the Earth
 * experience. Renders the same planet framing, starfield, SDG markers and
 * scroll choreography as the 3D scene, without any WebGL dependency.
 */
export function EarthFallback({ reducedMotion }: EarthFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { hoveredSdg } = useExperience()
  const hoveredRef = useRef<number | null>(null)

  useEffect(() => {
    hoveredRef.current = hoveredSdg === null ? null : hoveredSdg - 1
  }, [hoveredSdg])

  usePointerParallax((x, y) => {
    if (wrapRef.current && !reducedMotion) {
      wrapRef.current.style.transform = `translate3d(${x * 8}px, ${y * 6}px, 0)`
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    let w = 0
    let h = 0
    let smoothT = 0
    const stars: { x: number; y: number; r: number; a: number; tw: number }[] = []
    let starsSeeded = false

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      starsSeeded = false
    }
    resize()
    window.addEventListener('resize', resize)

    const seedStars = (): void => {
      stars.length = 0
      const count = Math.round((w * h) / 2600)
      const n = Math.min(260, Math.max(90, count))
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + Math.random() * 1.1,
          a: 0.25 + Math.random() * 0.6,
          tw: Math.random() * Math.PI * 2,
        })
      }
      starsSeeded = true
    }

    // Value noise + fbm for cheap but convincing continents.
    const valueNoise = (x: number, y: number, seed: number): number => {
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      const xf = x - xi
      const yf = y - yi
      const u = xf * xf * (3 - 2 * xf)
      const v = yf * yf * (3 - 2 * yf)
      const h2 = (ix: number, iy: number): number => {
        const s = Math.sin(ix * 127.1 + iy * 311.7 + seed) * 43758.5453
        return s - Math.floor(s)
      }
      return (
        h2(xi, yi) * (1 - u) * (1 - v) +
        h2(xi + 1, yi) * u * (1 - v) +
        h2(xi, yi + 1) * (1 - u) * v +
        h2(xi + 1, yi + 1) * u * v
      )
    }
    const fbm2 = (x: number, y: number, seed: number): number => {
      let v = 0
      let a = 0.5
      let fx = x
      let fy = y
      for (let o = 0; o < 4; o++) {
        v += a * valueNoise(fx, fy, seed + o * 101)
        fx *= 2.03
        fy *= 2.03
        a *= 0.5
      }
      return v
    }

    const draw = (): void => {
      raf = requestAnimationFrame(draw)
      if (!running) return

      const now = performance.now() / 1000

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const t = clamp01(window.scrollY / maxScroll)
      smoothT += (t - smoothT) * (reducedMotion ? 0.35 : 0.12)
      const st = smoothT

      if (!starsSeeded) seedStars()

      // Phase blends — mirrors SpaceScene.
      const cruiseBlend = smoothstep(SDG_SECTION_START - 0.05, SDG_SECTION_START + 0.1, st)
      const leaveBlend = smoothstep(0.86, ECOSYSTEM_START, st)
      const spaceFade = 1 - smoothstep(ECOSYSTEM_START, ECOSYSTEM_START + 0.045, st)

      // Framing.
      const cx = w / 2 + lerp(0, w * 0.09, cruiseBlend) * (1 - leaveBlend)
      const cy = h * 0.62 + lerp(0, -h * 0.1, cruiseBlend) * (1 - leaveBlend)
      const R = Math.min(w, h) * lerp(0.46, 0.38, cruiseBlend) * lerp(1, 0.16, leaveBlend)

      ctx.clearRect(0, 0, w, h)

      // Starfield.
      if (spaceFade > 0.01) {
        for (const s of stars) {
          const tw = reducedMotion ? 0 : Math.sin(now * 1.4 + s.tw) * 0.18
          ctx.globalAlpha = clamp01((s.a + tw) * spaceFade)
          ctx.fillStyle = '#dfe8ff'
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      if (R > 2 && spaceFade > 0.01) {
        const alpha = spaceFade
        ctx.globalAlpha = alpha

        // Planet body with day-side shading.
        const grad = ctx.createRadialGradient(
          cx + LIGHT_DIR.x * R * 0.55, cy + LIGHT_DIR.y * R * 0.55, R * 0.1,
          cx, cy, R * 1.05,
        )
        grad.addColorStop(0, '#3a7bd5')
        grad.addColorStop(0.55, '#1b4f91')
        grad.addColorStop(1, '#060d1d')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.fill()

        // Clip to the sphere for continents, terminator and clouds.
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.clip()

        // Continents: sample fbm on a lat/long grid with a drifting longitude.
        const spin = reducedMotion ? 0.02 : 0.05
        const lonOffset = now * spin
        const cols = reducedMotion ? 90 : 130
        const rows = Math.round(cols / 2)
        const cell = (2 * R) / cols
        for (let gx = 0; gx < cols; gx++) {
          for (let gy = 0; gy < rows; gy++) {
            const u = gx / cols
            const v = gy / rows
            const lon = (u - 0.5) * Math.PI * 2
            const lat = (0.5 - v) * Math.PI
            const front = Math.cos(lat) * Math.cos(lon + lonOffset)
            if (front <= 0.02) continue
            const nz = fbm2(u * 9 + 5, v * 5 + 2, 11)
            if (nz < 0.58) continue // ~30% land coverage
            const sx = cx + R * Math.cos(lat) * Math.sin(lon + lonOffset)
            const sy = cy - R * Math.sin(lat)
            const shade = 0.75 + 0.25 * front
            ctx.fillStyle = `rgba(${Math.round(58 * shade)}, ${Math.round(140 * shade)}, ${Math.round(84 * shade)}, 0.85)`
            ctx.fillRect(sx - cell / 2, sy - cell / 2, cell * 1.6, cell * 1.6)
          }
        }

        // Terminator: darken the side away from the light.
        const termGrad = ctx.createRadialGradient(
          cx + LIGHT_DIR.x * R * 1.2, cy + LIGHT_DIR.y * R * 1.2, R * 0.4,
          cx + LIGHT_DIR.x * R * 0.3, cy + LIGHT_DIR.y * R * 0.3, R * 2.1,
        )
        termGrad.addColorStop(0, 'rgba(3, 5, 12, 0)')
        termGrad.addColorStop(0.55, 'rgba(3, 5, 12, 0.55)')
        termGrad.addColorStop(1, 'rgba(3, 5, 12, 0.92)')
        ctx.fillStyle = termGrad
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

        // Clouds: soft drifting ellipses.
        const cloudDrift = reducedMotion ? 0 : (now * 6) % (R * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        for (let i = 0; i < 5; i++) {
          const cy2 = cy - R * 0.6 + (i / 4) * R * 1.2
          const cx2 = cx + Math.sin(now * 0.15 + i * 2.1) * R * 0.5 + cloudDrift - R
          const rw = R * (0.5 + 0.3 * Math.sin(i * 1.3 + 1))
          const rh = R * 0.16
          ctx.beginPath()
          ctx.ellipse(cx2, cy2, rw, rh, 0.2 * Math.sin(i), 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()

        // Atmosphere glow.
        const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.28)
        glow.addColorStop(0, 'rgba(93, 168, 255, 0)')
        glow.addColorStop(0.55, 'rgba(93, 168, 255, 0.14)')
        glow.addColorStop(1, 'rgba(93, 168, 255, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2)
        ctx.fill()

        // SDG orbit dots with depth cueing.
        const idxFloat = orbitIndexAt(st)
        const inSeq = st >= SDG_SECTION_START && st < SDG_SECTION_END
        const orbitR = R * 1.55

        for (let i = 0; i < SDGS.length; i++) {
          const a = (i / SDGS.length) * Math.PI * 2 + (reducedMotion ? 0 : now * 0.03) + idxFloat * 0.22
          const ex = Math.cos(a) * orbitR
          const ez = Math.sin(a) * orbitR
          const ey = ez * 0.42
          const px = cx + ex
          const py = cy + ey

          const depth = (ez / orbitR + 1) / 2 // 0 = far side, 1 = near side
          const dist = Math.abs(i - idxFloat)
          let focus = inSeq ? clamp01(1.15 - dist * 0.75) : 0
          const active = inSeq && Math.round(idxFloat) === i
          if (hoveredRef.current === i) focus = 1
          const baseA = (0.1 + depth * 0.35) * (1 - leaveBlend * 0.8)
          const a2 = clamp01(baseA + focus * 0.6)
          const rr = (2 + focus * 2.5 + (active ? 1.5 : 0)) * (0.7 + depth * 0.3)

          ctx.globalAlpha = alpha * a2
          ctx.fillStyle = SDGS[i].color
          ctx.beginPath()
          ctx.arc(px, py, rr, 0, Math.PI * 2)
          ctx.fill()

          if (focus > 0.25) {
            ctx.globalAlpha = alpha * focus * 0.3
            ctx.beginPath()
            ctx.arc(px, py, rr * 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        ctx.globalAlpha = 1
      }

      // Whole-canvas fade toward the ecosystem finale.
      canvas.style.opacity = String(spaceFade)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return (
    <div className="fallback-wrap" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} className="scene-canvas" />
    </div>
  )
}
