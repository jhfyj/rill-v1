import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/** Distinct logo placeholders per copy. */
const LOGO_COUNT = 6;
/**
 * Copies of the logo set rendered in the track. The CSS keyframe
 * (logo-marquee in index.css) translates by 1 / LOGO_COPIES = 33.333% so the
 * loop is seamless. Three copies span wider than any viewport, so no gap shows.
 */
const LOGO_COPIES = 3;
/** Seconds for one full cycle (one copy width). Higher = slower drift. */
const MARQUEE_DURATION_SEC = 36;
const TILE_TOTAL = LOGO_COUNT * LOGO_COPIES;

/* --- Magnetic magnification (ported from @componentry/magnetic-dock) ------- */
/** Beyond this horizontal distance (px) from the cursor a logo isn't magnified. */
const MAGNET_DISTANCE = 130;
/** Scale of the logo directly under the cursor. */
const MAX_SCALE = 1.6;
/** How far the most-magnified logo lifts upward (px). */
const LIFT = 12;
/** Scale-smoothing time constant (s) — smaller = snappier follow. */
const SMOOTH_TAU = 0.09;

/**
 * The Section 1 company-logo strip: a seamless left→right marquee (CSS keyframe
 * on the track) with a macOS-dock-style magnetic effect — logos near the cursor
 * scale up and lift, falling off with horizontal distance.
 *
 * Unlike the original magnetic-dock (which recomputes only on mousemove via
 * Framer MotionValues), this runs a single requestAnimationFrame loop that
 * re-reads each tile's live position every frame, so the magnification tracks
 * logos correctly even while they scroll past a stationary cursor. Same rAF +
 * imperative-transform pattern as CenterBlob / LeafField / LogoCluster.
 */
export function LogoMarquee() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  /**
   * Last known pointer X (client coords) and whether the cursor is over the
   * strip. `active` is driven by enter/leave on the track (below), so logos
   * only magnify while the cursor is on the marquee.
   */
  const pointerRef = useRef({ x: 0, active: false });

  // rAF loop: per frame, read every tile's live centre, map cursor distance to a
  // target scale, ease toward it, and write the transform.
  useEffect(() => {
    if (reduceMotion) return;
    const track = trackRef.current;
    if (!track) return;
    const tiles = track.children;
    const scales = new Float32Array(tiles.length).fill(1);

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt / SMOOTH_TAU);
      const { x: px, active } = pointerRef.current;

      // Pass 1: read all live centres up front (avoids read/write layout thrash).
      const centers = new Float64Array(tiles.length);
      for (let i = 0; i < tiles.length; i++) {
        const r = (tiles[i] as HTMLElement).getBoundingClientRect();
        centers[i] = r.left + r.width / 2;
      }
      // Pass 2: ease each tile's scale toward its proximity target and write it.
      for (let i = 0; i < tiles.length; i++) {
        let target = 1;
        if (active) {
          const d = Math.abs(px - centers[i]);
          if (d < MAGNET_DISTANCE) {
            target = 1 + (MAX_SCALE - 1) * (1 - d / MAGNET_DISTANCE);
          }
        }
        const s = scales[i] + (target - scales[i]) * k;
        scales[i] = s;
        const lift = ((s - 1) / (MAX_SCALE - 1)) * LIFT;
        (tiles[i] as HTMLElement).style.transform =
          `translateY(${-lift}px) scale(${s})`;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <div
      ref={trackRef}
      // Magnification is gated on hovering the strip: enter/move set the cursor
      // X and mark active; leaving the strip clears it so every logo eases back
      // to scale 1. Hovering a (transformed) logo or a gap still counts as over
      // the track, so the effect stays smooth across the row.
      onMouseEnter={(e) => {
        pointerRef.current = { x: e.clientX, active: true };
      }}
      onMouseMove={(e) => {
        pointerRef.current = { x: e.clientX, active: true };
      }}
      onMouseLeave={() => {
        pointerRef.current.active = false;
      }}
      className="flex w-max items-end gap-10 sm:gap-16"
      style={{
        animation: reduceMotion
          ? undefined
          : `logo-marquee ${MARQUEE_DURATION_SEC}s linear infinite`,
        willChange: "transform",
      }}
    >
      {Array.from({ length: TILE_TOTAL }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-12 w-12 shrink-0 origin-bottom rounded-2xl border border-white/50 bg-brand-100/60 shadow-glass"
          style={{ willChange: "transform" }}
        />
      ))}
    </div>
  );
}

export default LogoMarquee;
