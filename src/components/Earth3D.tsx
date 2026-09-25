import { useEffect, useRef } from 'react'
import type { SpaceSceneApi } from '../scene/SpaceScene'
import { useExperience } from '../state/ExperienceContext'
import { usePointerParallax } from '../hooks/usePointerParallax'

export interface Earth3DProps {
  reducedMotion: boolean
  /** Called when 3D initialisation fails (WebGL context loss at boot, etc.). */
  onFatal: () => void
}

/**
 * `Earth3D` — the WebGL implementation of the Earth experience.
 *
 * The Three.js engine is loaded lazily (dynamic import) and only in this
 * component, so devices on the 2D fallback never download the 3D bundle.
 * Mounts the `SpaceScene` engine onto a fixed, full-viewport canvas.
 */
export function Earth3D({ reducedMotion, onFatal }: Earth3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SpaceSceneApi | null>(null)
  const onFatalRef = useRef(onFatal)
  onFatalRef.current = onFatal
  const { hoveredSdg } = useExperience()

  usePointerParallax((x, y) => sceneRef.current?.setPointer(x, y))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let api: SpaceSceneApi | null = null

    const boot = async (): Promise<void> => {
      try {
        const { createSpaceScene } = await import('../scene/SpaceScene')
        if (disposed) return
        api = createSpaceScene({ canvas, reducedMotion })
        sceneRef.current = api

        // Runtime context loss: fall back rather than show a dead canvas.
        canvas.addEventListener('webglcontextlost', onContextLost)
      } catch (err) {
        if (disposed) return
        // Any failure to boot the 3D layer (init error, chunk load failure,
        // shader compile error…) degrades to the 2D experience.
        console.warn(
          '[intro] 3D layer unavailable, using the 2D Earth:',
          err instanceof Error ? err.message : err,
        )
        onFatalRef.current()
      }
    }

    const onContextLost = (e: Event): void => {
      e.preventDefault()
      console.warn('[intro] WebGL context lost — switching to the 2D Earth.')
      onFatalRef.current()
    }

    void boot()

    return () => {
      disposed = true
      canvas.removeEventListener('webglcontextlost', onContextLost)
      api?.dispose()
      sceneRef.current = null
    }
  }, [reducedMotion])

  useEffect(() => {
    sceneRef.current?.setHoveredSdg(hoveredSdg)
  }, [hoveredSdg])

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />
}
