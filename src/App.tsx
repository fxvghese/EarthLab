import { useEffect, useState } from 'react'
import { EarthExperience } from './components/EarthExperience'
import { IntroContent } from './components/IntroContent'
import { SDGOverlay } from './components/sdg/SDGOverlay'
import { SDGProgress } from './components/sdg/SDGProgress'
import { EcosystemScene } from './components/EcosystemScene'
import { ExperienceProvider } from './state/ExperienceContext'
import { useEnvironmentFlags } from './hooks/useEnvironmentFlags'
import { SDGS } from './data/sdgs'

/**
 * SDGs in the Classroom — intro experience.
 *
 * Layout: a fixed scene layer (3D or 2D Earth) + a fixed overlay layer
 * (title, SDG panels, progress) + a tall invisible scroll track that drives
 * the journey. The ecosystem finale is a fixed layer revealed at the end.
 */
export default function App() {
  const flags = useEnvironmentFlags()
  const [journeyStarted, setJourneyStarted] = useState(false)

  useEffect(() => {
    const onScroll = (): void => {
      if (window.scrollY > 40) setJourneyStarted(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <ExperienceProvider>
      {/* Fixed scene layer — 3D or 2D chosen by EarthExperience */}
      <div className="scene-layer" data-mode={journeyStarted ? 'journey' : 'intro'}>
        <EarthExperience reducedMotion={flags.prefersReducedMotion} />
      </div>

      {/* Fixed ecosystem finale layer */}
      <EcosystemScene />

      {/* Fixed overlay layer */}
      <div className="overlay-layer">
        <IntroContent />
        <SDGOverlay />
        <SDGProgress />
      </div>

      {/* Scroll track: gives the journey its length and the screen-reader flow */}
      <main className="journey-track">
        <section className="track-intro" aria-label="Introduction">
          <h1 className="sr-only">SDGs in the Classroom</h1>
          <p className="sr-only">Earth is our classroom.</p>
          <p className="sr-only">Explore our planet. Understand the problems. Make better choices.</p>
        </section>

        <ol className="track-sdgs" aria-label="The 17 Sustainable Development Goals">
          {SDGS.map((sdg) => (
            <li key={sdg.id} className="track-sdg" id={`sdg-${sdg.id}`}>
              <h2 className="sr-only">{`Goal ${sdg.id}: ${sdg.name}`}</h2>
              <p className="sr-only">{sdg.description}</p>
            </li>
          ))}
        </ol>

        <section className="track-finale" aria-label="The ecosystem finale">
          <h2 className="sr-only">Earth is our classroom — the journey continues</h2>
        </section>
      </main>
    </ExperienceProvider>
  )
}
