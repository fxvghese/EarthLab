import { useEffect, useState } from 'react'
import { activeSdgIndexAt } from '../journey/sections'

/**
 * The SDG index currently emphasised by the scroll position, or -1 when the
 * journey is on the intro or the ecosystem finale. Only re-renders when the
 * integer index actually changes.
 */
export function useActiveSdgIndex(): number {
  const [index, setIndex] = useState(-1)

  useEffect(() => {
    let raf = 0
    let queued = false

    const read = (): void => {
      queued = false
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const t = Math.min(1, Math.max(0, window.scrollY / max))
      setIndex(activeSdgIndexAt(t))
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

  return index
}
