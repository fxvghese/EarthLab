import { useEffect, useRef } from 'react'

/** Fire a callback when Escape is pressed (used to leave the finale). */
export function useEscapeKey(onEscape: () => void, enabled: boolean): void {
  const cbRef = useRef(onEscape)
  cbRef.current = onEscape

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cbRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
