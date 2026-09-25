import { useEffect, useRef } from 'react'
import { clamp01 } from '../journey/sections'

/**
 * Subscribe a callback to journey progress `t ∈ [0, 1]` (rAF-throttled).
 * The callback receives every scroll update and is expected to apply the
 * result imperatively (refs + style), keeping React out of the hot path.
 */
export function useScrollT(apply: (t: number) => void): void {
  const applyRef = useRef(apply)
  applyRef.current = apply

  useEffect(() => {
    let raf = 0
    let queued = false

    const read = (): void => {
      queued = false
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      applyRef.current(clamp01(window.scrollY / max))
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
}
