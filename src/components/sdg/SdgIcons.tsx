import type { CSSProperties } from 'react'

/**
 * Line-art icon set for the 17 SDGs.
 * Every icon is drawn from the same primitive family — thin strokes on a
 * 24x24 grid — so the set reads as one visual system. Icons are purely
 * decorative (aria-hidden) since the goal name is always rendered as text.
 *
 * Strokes inherit `currentColor`, so icons can be tinted per goal colour.
 */
type IconComponent = (props: { size?: number }) => JSX.Element

const base: CSSProperties = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function icon(children: JSX.Element): IconComponent {
  return function SdgIcon({ size = 22 }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={base}
        aria-hidden="true"
        focusable="false"
      >
        {children}
      </svg>
    )
  }
}

export const NoPoverty = icon(
  <>
    <path d="M4 20 20 4" />
    <circle cx="7.5" cy="7.5" r="3.5" />
    <circle cx="16.5" cy="16.5" r="3.5" />
  </>,
)

export const ZeroHunger = icon(
  <>
    <path d="M12 21c-3.5-1.2-6-4.2-6-8V6l6-3 6 3v7c0 3.8-2.5 6.8-6 8Z" />
    <path d="M9 12c0-2.2 1.3-4 3-4s3 1.8 3 4" />
    <path d="M12 8v13" />
  </>,
)

export const GoodHealth = icon(
  <>
    <path d="M12 21s-7-4.6-9-9c-1.4-3.1.6-6.5 3.8-6.5 2 0 3.6 1.1 5.2 3.2C13.6 6.6 15.2 5.5 17.2 5.5c3.2 0 5.2 3.4 3.8 6.5-2 4.4-9 9-9 9Z" />
  </>,
)

export const QualityEducation = icon(
  <>
    <path d="m12 4 10 5-10 5L2 9l10-5Z" />
    <path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" />
    <path d="M22 9v5" />
  </>,
)

export const GenderEquality = icon(
  <>
    <circle cx="9" cy="8" r="4" />
    <path d="M9 12v8" />
    <path d="M6.5 16.5h5" />
    <circle cx="16.5" cy="16" r="4" />
    <path d="m19.5 13 2.5-2.5" />
    <path d="M22 15v-4.5h-4.5" />
  </>,
)

export const CleanWater = icon(
  <>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
  </>,
)

export const CleanEnergy = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3" />
    <path d="M12 19v3" />
    <path d="m4.9 4.9 2.1 2.1" />
    <path d="m17 17 2.1 2.1" />
    <path d="M2 12h3" />
    <path d="M19 12h3" />
    <path d="m4.9 19.1 2.1-2.1" />
    <path d="m17 7 2.1-2.1" />
  </>,
)

export const DecentWork = icon(
  <>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
    <path d="M12 12v3" />
  </>,
)

export const Industry = icon(
  <>
    <path d="M3 21V11l6 4v-4l6 4v-4l6 4v6H3Z" />
    <path d="M6 17.5h2" />
    <path d="M11 17.5h2" />
    <path d="M16 17.5h2" />
  </>,
)

export const ReducedInequalities = icon(
  <>
    <path d="M4 18h16" />
    <circle cx="8" cy="13" r="2" />
    <circle cx="16" cy="13" r="2" />
    <path d="M8 11V6l4-2 4 2v5" />
    <path d="M12 4v4" />
  </>,
)

export const SustainableCities = icon(
  <>
    <path d="M3 21h18" />
    <path d="M5 21v-8l4-3v11" />
    <path d="M10 21V8l5-4v17" />
    <path d="M18 21v-7l2-1.5V21" />
    <path d="M7 13h.01" />
    <path d="M12.5 9h.01" />
    <path d="M12.5 13h.01" />
  </>,
)

export const ResponsibleConsumption = icon(
  <>
    <path d="M20 9a8 8 0 0 0-14.9-2" />
    <path d="M4 4v3.5h3.5" />
    <path d="M4 15a8 8 0 0 0 14.9 2" />
    <path d="M20 20v-3.5h-3.5" />
  </>,
)

export const ClimateAction = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.2 4.2 1.5 1.5" />
    <path d="m18.3 18.3 1.5 1.5" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.2 19.8 1.5-1.5" />
    <path d="m18.3 5.7 1.5-1.5" />
  </>,
)

export const LifeBelowWater = icon(
  <>
    <path d="M3 15c3-1.5 5-1.5 8 0s5 1.5 8 0" />
    <path d="M3 19c3-1.5 5-1.5 8 0s5 1.5 8 0" />
    <path d="M6 8c2.5-3 7-3.5 10-1 1 .8 1.8 1.9 2 3" />
    <path d="m18 10 3-2-1 3.5L23 13l-3.5.3" />
    <circle cx="14.5" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
  </>,
)

export const LifeOnLand = icon(
  <>
    <path d="M12 22v-7" />
    <path d="M12 15c0-4 3-7 7-7 0 4-3 7-7 7Z" />
    <path d="M12 12c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6Z" />
    <path d="M5 22h14" />
  </>,
)

export const PeaceJustice = icon(
  <>
    <path d="M12 3v18" />
    <path d="M5 6c0 5 3 8 7 8s7-3 7-8" />
    <path d="M8 21h8" />
  </>,
)

export const Partnerships = icon(
  <>
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="19" cy="5.5" r="2.5" />
    <circle cx="19" cy="18.5" r="2.5" />
    <path d="m7.3 10.8 9.4-4.2" />
    <path d="m7.3 13.2 9.4 4.2" />
  </>,
)

/** Icons in SDG order (index 0 → SDG 1). */
export const SDG_ICONS: IconComponent[] = [
  NoPoverty,
  ZeroHunger,
  GoodHealth,
  QualityEducation,
  GenderEquality,
  CleanWater,
  CleanEnergy,
  DecentWork,
  Industry,
  ReducedInequalities,
  SustainableCities,
  ResponsibleConsumption,
  ClimateAction,
  LifeBelowWater,
  LifeOnLand,
  PeaceJustice,
  Partnerships,
]
