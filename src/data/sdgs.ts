/**
 * The 17 United Nations Sustainable Development Goals.
 * Single source of truth — shared by the 3D scene, the 2D fallback,
 * the overlay UI and the ecosystem transition.
 */

export interface Sdg {
  /** 1–17 */
  id: number
  /** Official UN goal name */
  name: string
  /** Official UN goal colour (hex) */
  color: string
  /** Short, student-friendly one-line description */
  description: string
}

export const SDGS: Sdg[] = [
  { id: 1, name: 'No Poverty', color: '#e5243b', description: 'End poverty everywhere, in all its forms.' },
  { id: 2, name: 'Zero Hunger', color: '#dda63a', description: 'Enough good food for every person, every day.' },
  { id: 3, name: 'Good Health and Well-being', color: '#4c9f38', description: 'Healthy lives and well-being at every age.' },
  { id: 4, name: 'Quality Education', color: '#c5192d', description: 'Inclusive, quality learning for everyone.' },
  { id: 5, name: 'Gender Equality', color: '#ff3a21', description: 'Equal rights and power for all genders.' },
  { id: 6, name: 'Clean Water and Sanitation', color: '#26bde2', description: 'Safe water and sanitation for all.' },
  { id: 7, name: 'Affordable and Clean Energy', color: '#fcc30b', description: 'Energy that is clean, modern and affordable.' },
  { id: 8, name: 'Decent Work and Economic Growth', color: '#a21942', description: 'Good jobs and an economy that includes everyone.' },
  { id: 9, name: 'Industry, Innovation and Infrastructure', color: '#fd6925', description: 'Resilient infrastructure and human innovation.' },
  { id: 10, name: 'Reduced Inequalities', color: '#dd1367', description: 'Fairness and opportunity across and within countries.' },
  { id: 11, name: 'Sustainable Cities and Communities', color: '#fd9d24', description: 'Cities that are safe, green and inclusive.' },
  { id: 12, name: 'Responsible Consumption and Production', color: '#bf8b2e', description: 'Do more and better with fewer resources.' },
  { id: 13, name: 'Climate Action', color: '#3f7e44', description: 'Act on the climate crisis before it acts on us.' },
  { id: 14, name: 'Life Below Water', color: '#0a97d9', description: 'Protect the oceans that regulate our planet.' },
  { id: 15, name: 'Life on Land', color: '#56c02b', description: 'Protect forests, soil and the life they carry.' },
  { id: 16, name: 'Peace, Justice and Strong Institutions', color: '#00689d', description: 'Peaceful, fair and accountable societies.' },
  { id: 17, name: 'Partnerships for the Goals', color: '#19486a', description: 'Only together can we reach the goals.' },
]

export const SDG_COUNT = SDGS.length

export function getSdg(id: number): Sdg | undefined {
  return SDGS.find((s) => s.id === id)
}
