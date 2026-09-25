import { useEffect, useState } from 'react'
import { smoothstep, SDG_SECTION_START } from '../journey/sections'

/**
 * `IntroContent` — the cinematic title block at the start of the journey.
 * Fades out as the user scrolls into the SDG sequence, and the scroll hint
 * disappears permanently once the user has begun.
 */
export function IntroContent() {
  const [opacity, setOpacity] = useState(1)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    let raf = 0
    let queued = false

    const read = (): void => {
      queued = false
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const t = Math.min(1, Math.max(0, window.scrollY / max))
      // Fade the title through the first section.
      setOpacity(1 - smoothstep(0.02, SDG_SECTION_START * 0.85, t))
      if (t > 0.015) setHasScrolled(true)
    }

    const onScroll = (): void => {
      if (!queued) {
        queued = true
        raf = requestAnimationFrame(read)
      }
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="intro-content" style={{ opacity }} aria-label="Welcome">
      <div className="intro-inner">
        <p className="intro-kicker">Earth is our classroom</p>
        <h1 className="intro-title">
          SDGs in the <span className="intro-title-accent">Classroom</span>
        </h1>
        <p className="intro-subtitle">
          Explore our planet. Understand the problems. Make better choices.
        </p>
      </div>
      {!hasScrolled && (
        <div className="scroll-hint" aria-hidden="true">
          <span className="scroll-hint-label">Scroll to begin the journey</span>
          <span className="scroll-hint-mouse">
            <span className="scroll-hint-wheel" />
          </span>
        </div>
      )}
    </section>
  )
}
