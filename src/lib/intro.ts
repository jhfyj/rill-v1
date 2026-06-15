/**
 * First-load intro choreography. Each value is the start time (in seconds from
 * page load) for a stage of the landing entrance, so the elements arrive in a
 * deliberate order. Consumed by LandingSection (headline + logos), RippleField
 * (spawn start), and Navbar (rise/expand).
 *
 * These only govern the initial load; returning to the landing by scrolling
 * back uses the snappier per-component timing instead.
 */
export const INTRO = {
  /** Stage 1 — RILL title + subtitle (+ CTA buttons). */
  headline: 0.3,
  /** Stage 2 — the ripple field begins spawning. */
  ripples: 1.8,
  /** Stage 3 — the navbar rises in and expands. */
  navbar: 2.6,
  /** Stage 4 — the bottom logo strip. */
  logos: 3.8,
} as const;
