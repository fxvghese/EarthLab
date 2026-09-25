import { SDGS } from '../../data/sdgs'
import { useActiveSdgIndex } from '../../hooks/useActiveSdgIndex'
import { useEcosystemPhase } from '../../hooks/useEcosystemPhase'

/**
 * `SDGProgress` — the quiet wayfinding element.
 * A hairline rail with 17 ticks plus an understated `07 / 17` counter that
 * also becomes `18 / 17` → replaced by the finale label in the last phase.
 */
export function SDGProgress() {
  const index = useActiveSdgIndex()
  const inEcosystem = useEcosystemPhase()

  return (
    <div className="sdg-progress" aria-hidden="true">
      <div className="sdg-progress-rail">
        {SDGS.map((sdg, i) => (
          <span
            key={sdg.id}
            className={
              'sdg-progress-tick' +
              (i === index ? ' is-active' : '') +
              (i < index ? ' is-past' : '')
            }
            style={i === index ? { background: sdg.color } : undefined}
          />
        ))}
      </div>
      <div className="sdg-progress-count">
        {inEcosystem ? (
          <span className="sdg-progress-final">HOME</span>
        ) : index >= 0 ? (
          <>
            <span className="sdg-progress-current" style={{ color: SDGS[index].color }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="sdg-progress-sep"> / 17</span>
          </>
        ) : (
          <span className="sdg-progress-sep">01 / 17</span>
        )}
      </div>
    </div>
  )
}
