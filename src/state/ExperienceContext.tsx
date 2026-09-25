import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface ExperienceContextValue {
  /** SDG id currently receiving pointer emphasis from the overlay cards, or null. */
  hoveredSdg: number | null
  setHoveredSdg: (id: number | null) => void
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null)

/**
 * Shared UI state for the intro experience.
 *
 * Deliberately tiny: scroll progress is *not* React state — the 3D scene
 * samples it inside its render loop and the overlay components subscribe
 * individually via `useScrollProgress`, so no high-frequency state flows
 * through the tree. Only hover emphasis (low frequency) lives here.
 */
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [hoveredSdg, setHoveredSdg] = useState<number | null>(null)
  const value = useMemo(() => ({ hoveredSdg, setHoveredSdg }), [hoveredSdg])
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext)
  if (!ctx) throw new Error('useExperience must be used within ExperienceProvider')
  return ctx
}
