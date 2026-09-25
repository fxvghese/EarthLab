import { SDGS } from '../../data/sdgs'
import { useActiveSdgIndex } from '../../hooks/useActiveSdgIndex'
import { useExperience } from '../../state/ExperienceContext'
import { SDG_ICONS } from './SdgIcons'

/**
 * `SDGOverlay` — renders the information layer above the scene.
 *
 * Only the currently focused SDG is mounted as a full panel (entering and
 * leaving with animation); neighbours stay present as orbiting dots in the
 * scene layer, so the journey still feels continuous. Alternates sides to
 * create a rhythm around the planet.
 */
export function SDGOverlay() {
  const index = useActiveSdgIndex()
  const { setHoveredSdg } = useExperience()

  if (index < 0) return null

  const sdg = SDGS[index]
  const Icon = SDG_ICONS[index]
  const side: 'left' | 'right' = index % 2 === 0 ? 'left' : 'right'

  return (
    <div className={`sdg-panel sdg-panel--${side}`} key={sdg.id}>
      <div className="sdg-panel-inner" onMouseEnter={() => setHoveredSdg(sdg.id)} onMouseLeave={() => setHoveredSdg(null)}>
        <div className="sdg-panel-numeral" style={{ color: sdg.color }}>
          {String(sdg.id).padStart(2, '0')}
        </div>
        <div className="sdg-panel-body">
          <div className="sdg-panel-head">
            <span className="sdg-panel-icon" style={{ color: sdg.color }}>
              <Icon size={20} />
            </span>
            <h2 className="sdg-panel-name">{sdg.name}</h2>
          </div>
          <p className="sdg-panel-desc">{sdg.description}</p>
        </div>
        <div className="sdg-panel-rule" style={{ background: `linear-gradient(90deg, ${sdg.color}, transparent)` }} />
      </div>
    </div>
  )
}
