import { useEffect, useRef } from 'react'

/**
 * Track pointer movement across the viewport and forward normalised
 * coordinates (-1..1) to a callback, rAF-throttled. Touch devices simply
 * never fire it — parallax is an enhancement, never required.
 */
export function usePointerParallax(onMove: (x: number, y: number) => void): void {
  const cbRef = useRef(onMove)
  cbRef.current = onMove

  useEffect(() => {
    let raf = 0
    let queued = false
    let nx = 0
    let ny = 0

    const flush = (): void => {
      queued = false
      cbRef.current(nx, ny)
    }

    const onMove = (e: PointerEvent): void => {
      nx = (e.clientX / window.innerWidth) * 2 - 1
      ny = -((e.clientY / window.innerHeight) * 2 - 1)
      if (!queued) {
        queued = true
        raf = requestAnimationFrame(flush)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
}
