import { useEffect, useState } from 'react'
import { ECOSYSTEM_START } from '../journey/sections'

/**
 * Returns whether the journey has scrolled into the ecosystem finale phase.
 * Boolean state, so it re-renders only on phase change.
 */
export function useEcosystemPhase(): boolean {
  const [phase, setPhase] = useState(false)

  useEffect(() => {
    let raf = 0
    let queued = false

    const read = (): void => {
      queued = false
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const t = Math.min(1, Math.max(0, window.scrollY / max))
      setPhase(t >= ECOSYSTEM_START)
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

  return phase
}
