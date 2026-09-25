/**
 * Scroll layout of the journey.
 *
 * The document is a tall scroll track (see `<Journey/>` in App). The visual
 * layers (3D scene, 2D fallback scene, overlay) all interpret the same
 * normalised progress `t ∈ [0, 1]` using the section boundaries defined here,
 * so every layer stays in sync no matter which renderer is active.
 */

import { SDG_COUNT } from '../data/sdgs'

/** Progress where the SDG sequence begins (after the intro title). */
export const SDG_SECTION_START = 0.12
/** Progress where the SDG sequence ends and the finale begins. */
export const SDG_SECTION_END = 0.88
/** Progress where the ecosystem finale is fully established. */
export const ECOSYSTEM_START = 0.94

export const SDG_SPAN = (SDG_SECTION_END - SDG_SECTION_START) / SDG_COUNT

/** Local progress [0, 1] of progress `t` inside the SDG sequence. */
export function sdgSequenceProgress(t: number): number {
  return clamp01((t - SDG_SECTION_START) / (SDG_SECTION_END - SDG_SECTION_START))
}

/**
 * Continuous "orbit index" for progress `t`: a float in [0, SDG_COUNT-1]
 * that advances through the goals as the user scrolls. Positions and
 * opacities are derived from distance to the nearest goal.
 */
export function orbitIndexAt(t: number): number {
  return sdgSequenceProgress(t) * (SDG_COUNT - 1)
}

/** Which SDG (0-based) is emphasised at progress `t`, or -1 outside the sequence. */
export function activeSdgIndexAt(t: number): number {
  if (t < SDG_SECTION_START || t >= SDG_SECTION_END) return -1
  return Math.min(SDG_COUNT - 1, Math.max(0, Math.round(orbitIndexAt(t))))
}

/** Document scroll position (px) that brings SDG `index` (0-based) into focus. */
export function scrollToSdg(index: number, viewportH: number, docH: number): number {
  const localTarget = (index / (SDG_COUNT - 1)) * (SDG_SECTION_END - SDG_SECTION_START) + SDG_SECTION_START
  const maxScroll = Math.max(1, docH - viewportH)
  return localTarget * maxScroll
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = clamp01((x - edge0) / (edge1 - edge0))
  return u * u * (3 - 2 * u)
}

export function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u
}
