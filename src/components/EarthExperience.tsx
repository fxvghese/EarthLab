import { useEffect, useRef, useState } from 'react'
import { Earth3D } from './Earth3D'
import { EarthFallback } from './EarthFallback'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { isWebGLAvailable } from '../scene/webgl'

type Mode = 'probing' | '3d' | '2d'

export interface EarthExperienceProps {
  reducedMotion: boolean
}

/**
 * `EarthExperience` — the seam between the app and the planet renderer.
 *
 * Chooses the WebGL implementation when available, and transparently swaps
 * to the polished 2D canvas implementation when:
 *   - the WebGL probe fails before mounting, or
 *   - the 3D layer throws during initialisation (caught at mount, deterministic), or
 *   - the 3D layer throws at render time (via `SceneErrorBoundary`).
 *
 * Consumers render this component and never need to know which
 * implementation is active. While probing, the 2D layer renders underneath
 * so the very first frame is already the real experience — no skeleton UI.
 */
export function EarthExperience({ reducedMotion }: EarthExperienceProps) {
  const [mode, setMode] = useState<Mode>('probing')
  const attemptRef = useRef(0)

  useEffect(() => {
    setMode(isWebGLAvailable() ? '3d' : '2d')
  }, [])

  const onFallback = (): void => setMode('2d')

  return (
    <div className="earth-experience" aria-hidden="true">
      {mode === 'probing' && <EarthFallback key="2d-probe" reducedMotion={reducedMotion} />}

      {mode === '3d' && (
        <div className="earth-3d-slot">
          <SceneErrorBoundary onFallback={onFallback}>
            <Earth3D
              key={`3d-${attemptRef.current}`}
              reducedMotion={reducedMotion}
              onFatal={onFallback}
            />
          </SceneErrorBoundary>
        </div>
      )}

      {mode === '2d' && <EarthFallback key="2d" reducedMotion={reducedMotion} />}
    </div>
  )
}
