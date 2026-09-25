import { useEffect, useState } from 'react'

export interface EnvironmentFlags {
  prefersReducedMotion: boolean
  isMobile: boolean
}

/**
 * Track the two environment conditions that shape the experience:
 * `prefers-reduced-motion` and small viewports.
 */
export function useEnvironmentFlags(): EnvironmentFlags {
  const [flags, setFlags] = useState<EnvironmentFlags>(() => ({
    prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isMobile: typeof window !== 'undefined' && window.innerWidth < 720,
  }))

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = (e: MediaQueryListEvent): void => setFlags((f) => ({ ...f, prefersReducedMotion: e.matches }))

    const onResize = (): void => setFlags((f) => ({ ...f, isMobile: window.innerWidth < 720 }))

    motion.addEventListener('change', onMotion)
    window.addEventListener('resize', onResize)
    return () => {
      motion.removeEventListener('change', onMotion)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return flags
}
