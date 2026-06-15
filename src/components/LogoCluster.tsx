import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { CompanyCard } from "./CompanyCard";

interface LogoClusterProps {
  /** CSS class on the host container (e.g. absolute positioning + z-index). */
  className?: string;
}

/** Number of logo tiles distributed over the sphere surface. */
const TILE_COUNT = 16;
/**
 * Card width in px (pre-scale) on the sphere; height grows to fit the content.
 * A wider width relative to the content makes the card longer than it is tall.
 */
const CARD_W = 380;
/**
 * Uniform scale applied to each card on the sphere — shrinks the whole card
 * (text + padding together) without changing its proportions.
 */
const CARD_SCALE = 0.6;
/**
 * Sphere radius as a fraction of the container's LARGER side. At 0.58 the
 * diameter is ~116% of the bigger viewport dimension, so the globe is a little
 * larger than the viewport — only its front-centre region shows, and the cards
 * spread across more surface (more spacing between them).
 */
const RADIUS_FRAC = 0.58;
/** CSS perspective as a multiple of the sphere radius — larger = flatter. */
const PERSPECTIVE_MULT = 2.6;
/** Baseline auto-spin around the vertical axis (rad/sec) when the mouse is idle. */
const BASE_SPIN = 0.14;
/** Extra spin the mouse can add at the container edge (rad/sec). */
const MAX_SPIN = 0.95;
/** Velocity easing time constant (sec) — bigger = more momentum / slower catch-up. */
const VEL_TAU = 0.35;
/**
 * Maximum vertical tilt (rad) the mouse can apply. Pitch is a *bounded* eased
 * angle, not an integrating velocity, so the sphere can never roll over far
 * enough to bring a pole (where the lat/long dot grid pinches) into view — the
 * interaction stays an endless horizontal scroll, à la ramp.com.
 */
const MAX_PITCH = (22 * Math.PI) / 180;

const DEG = 180 / Math.PI;

/* --- Dot surface ("material" mapped onto the sphere) ----------------------- */
/**
 * Dot layout — PREVIEW TOGGLE:
 *   "grid"      — latitude/longitude grid (clean rows & columns, but pinches at
 *                 the two poles; this is the committed look).
 *   "fibonacci" — golden-angle even distribution (uniform density everywhere, no
 *                 poles / no convergence, like the cards — but no straight rows).
 * Flip this to switch; everything else adapts.
 */
const DOT_LAYOUT: string = "fibonacci"; // "grid" | "fibonacci"

/**
 * Fibonacci layout: number of dots in the *base* (darker) lattice. A second
 * lattice of the same size is laid down shifted by half the dot spacing and
 * tinted lighter, so the lighter dots sit in the gaps between the darker ones.
 */
const DOT_FIB_PER_SET = 360;

/**
 * Grid resolution: rows of latitude × columns of longitude. Longitude spans 360°
 * and latitude 180°, so DOT_LON = 2 × DOT_LAT gives equal angular spacing → the
 * cells read as squares (clear rows AND vertical columns), like a flat dot grid
 * wrapped onto the sphere. Both counts are divisible by DOT_DARK_EVERY so the
 * darker sub-grid wraps seamlessly around the longitude with no visible seam.
 */
const DOT_LAT = 16;
const DOT_LON = 32;
/** Dot disc diameter in px (perspective scales it with depth). */
const DOT_SIZE = 5;
/**
 * Darker dots fall on a sub-grid every Nth row & column. With N = 2 a dark dot
 * lands on every even row+column, so each light dot sits exactly at the midpoint
 * between two dark dots (horizontally and vertically) — the lights "link" the
 * darks. Pattern per 2×2 cell:  D L / L L  (1 dark : 3 light).
 */
const DOT_DARK_EVERY = 4;
const DOT_LIGHT_COLOR = "#aab0c0";
const DOT_DARK_COLOR = "#41496a";
/**
 * Dots sit this many px inside the card radius. A clear gap (not just 1–2px)
 * makes the 3D depth-sort reliably keep cards in front of the pattern, so the
 * dots never paint over a card.
 */
const DOT_INSET = 14;

/**
 * Edge fade applied to the whole cluster (mask), so the sphere dissolves toward
 * all four edges instead of ending on a hard silhouette — same soft vignette as
 * ramp.com's integration sphere. Opaque through the centre, ramping to fully
 * transparent before the container edges. Tune the two stops for a tighter or
 * looser fade. Used for both `maskImage` and `WebkitMaskImage`.
 */
const EDGE_FADE_MASK =
  "radial-gradient(ellipse 80% 58% at 50% 50%, #000 38%, transparent 80%)";

interface SphereDot {
  /** Yaw / pitch (deg) placing the dot on the surface, facing outward. */
  ry: number;
  rx: number;
  /** Darker sub-grid dot? */
  dark: boolean;
}

/**
 * The dot "material" mapped onto the sphere. Either a latitude/longitude grid
 * (clean rows/columns, but converges at the two poles) or a golden-angle
 * Fibonacci spread (uniform density, no poles), per DOT_LAYOUT. Both convert
 * each point to outward-facing ry/rx; perspective foreshortens toward the
 * silhouette and backface-visibility culls the far side, so it reads as a
 * pattern painted on a solid rotating sphere.
 */
const DOTS: SphereDot[] = [];
if (DOT_LAYOUT === "grid") {
  for (let i = 0; i < DOT_LAT; i++) {
    const phi = ((i + 0.5) / DOT_LAT) * Math.PI; // polar, avoids exact poles
    const y = Math.cos(phi);
    const ring = Math.sin(phi);
    for (let j = 0; j < DOT_LON; j++) {
      const lam = (j / DOT_LON) * Math.PI * 2;
      const x = ring * Math.cos(lam);
      const z = ring * Math.sin(lam);
      DOTS.push({
        ry: Math.atan2(x, z) * DEG,
        rx: -Math.asin(Math.max(-1, Math.min(1, y))) * DEG,
        dark: i % DOT_DARK_EVERY === 0 && j % DOT_DARK_EVERY === 0,
      });
    }
  }
} else {
  // Single golden-angle (Fibonacci) lattice — even density, no poles. Only the
  // darker dots (the lighter half-spacing duplicate has been removed).
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = DOT_FIB_PER_SET;
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;
    DOTS.push({
      ry: Math.atan2(x, z) * DEG,
      rx: -Math.asin(Math.max(-1, Math.min(1, y))) * DEG,
      dark: true,
    });
  }
}

interface Tile {
  /** Yaw / pitch (deg) that lay the tile flat on the sphere, facing outward. */
  ry: number;
  rx: number;
}

/**
 * Even point distribution over a unit sphere via the golden-angle (Fibonacci)
 * method, converted to the per-tile rotations that orient each card tangent to
 * the surface with its face pointing outward. Computed once at module eval.
 *
 * For a surface normal (x, y, z): rotateY(atan2(x, z)) aims a forward-facing
 * card toward that longitude, rotateX(-asin(y)) tilts it to the right latitude,
 * then translateZ(R) (applied in the element style) pushes it out onto the
 * sphere. With backface-visibility:hidden, cards on the far side (normal facing
 * away from the camera) are culled, so the sphere reads as solid.
 */
const TILES: Tile[] = Array.from({ length: TILE_COUNT }, (_, i) => {
  const phi = Math.acos(-1 + (2 * i + 1) / TILE_COUNT); // polar angle 0..π
  const theta = Math.sqrt((TILE_COUNT + 1) * Math.PI) * phi; // golden azimuth
  const x = Math.cos(theta) * Math.sin(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(phi);
  return {
    ry: Math.atan2(x, z) * DEG,
    rx: -Math.asin(Math.max(-1, Math.min(1, y))) * DEG,
  };
});

/**
 * A 3D sphere of placeholder logo tiles, modeled on ramp.com's integration
 * sphere. Cards sit tangent to a Fibonacci sphere (slanted to match its
 * curvature) that auto-rotates gently and speeds up / changes axis based on the
 * mouse position relative to the sphere centre (trackball feel with eased
 * momentum). Back-facing cards are culled via backface-visibility, so the
 * sphere is not see-through.
 *
 * The whole sphere is one CSS 3D group whose rotation is updated each frame on
 * a single requestAnimationFrame loop — same hot-path pattern as CenterBlob /
 * LeafField. Placeholder tiles reuse the glass tile style; real integration
 * logos can later be dropped inside each tile.
 */
export function LogoCluster({ className }: LogoClusterProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  /** Last known pointer position (client coords) and whether it's on-screen. */
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  // Track the pointer globally — the cluster itself is pointer-events-none.
  useEffect(() => {
    if (reduceMotion) return;
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      pointerRef.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reduceMotion]);

  // Keep the sphere radius (--r, drives each tile's translateZ) in sync with the
  // container size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const r = container.getBoundingClientRect();
      const radius = Math.max(r.width, r.height) * RADIUS_FRAC;
      container.style.setProperty("--r", `${radius}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // rAF loop: ease angular velocity toward the mouse-driven target, advance the
  // rotation, and write it to the sphere group. Reduced motion → static tilt.
  useEffect(() => {
    const sphere = sphereRef.current;
    const container = containerRef.current;
    if (!sphere || !container) return;

    if (reduceMotion) {
      sphere.style.transform = "rotateX(-12deg) rotateY(22deg)";
      return;
    }

    // The Fibonacci sphere has no poles, so pitch can spin freely (endless
    // scroll in every direction). The grid layout pinches at the poles, so there
    // we keep pitch bounded instead (see MAX_PITCH).
    const freePitch = DOT_LAYOUT === "fibonacci";

    let raf = 0;
    let last = performance.now();
    let rotX = 0;
    let rotY = 0;
    let velX = 0;
    let velY = BASE_SPIN;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const r = container.getBoundingClientRect();
      // Mouse offset from the sphere centre, normalised to [-1, 1].
      let nx = 0;
      let ny = 0;
      if (pointerRef.current.active && r.width > 0) {
        nx = (pointerRef.current.x - (r.left + r.width / 2)) / (r.width / 2);
        ny = (pointerRef.current.y - (r.top + r.height / 2)) / (r.height / 2);
        nx = Math.max(-1, Math.min(1, nx));
        ny = Math.max(-1, Math.min(1, ny));
      }
      // Yaw (Y): horizontal mouse sets a continuous spin *speed*. The sphere
      // wraps a full 360° around its vertical axis, so this reads as an endless
      // scroll — dots/cards leaving one side reappear on the other, no seam.
      // Baseline keeps it drifting even when the pointer is idle / centred.
      const targetVY = nx * MAX_SPIN + BASE_SPIN;
      const k = 1 - Math.exp(-dt / VEL_TAU);
      // Yaw always integrates (continuous spin with momentum).
      velY += (targetVY - velY) * k;
      rotY += velY * dt;

      if (freePitch) {
        // Pitch (X): vertical mouse sets a spin *speed* too, integrated without
        // bound — the sphere scrolls endlessly up/down as well as side to side,
        // wrapping with no convergence (no poles on the Fibonacci sphere).
        const targetVX = -ny * MAX_SPIN;
        velX += (targetVX - velX) * k;
        rotX += velX * dt;
      } else {
        // Grid layout: tilt to a *bounded* angle and ease back, so the rotation
        // can't climb to the poles where the grid converges.
        const targetRotX = -ny * MAX_PITCH;
        rotX += (targetRotX - rotX) * k;
      }

      sphere.style.transform = `rotateX(${rotX * DEG}deg) rotateY(${rotY * DEG}deg)`;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={className}
      style={{
        perspective: `calc(var(--r, 200px) * ${PERSPECTIVE_MULT})`,
        perspectiveOrigin: "50% 50%",
        // Fade the sphere out toward all four edges (Ramp-style soft vignette).
        maskImage: EDGE_FADE_MASK,
        WebkitMaskImage: EDGE_FADE_MASK,
      }}
    >
      {/* Sphere group — pinned to the container centre; the rAF loop spins it. */}
      <div
        ref={sphereRef}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
          willChange: "transform",
        }}
      >
        {/* Dot-grid surface — the sphere's "material". */}
        {DOTS.map((d, i) => (
          <div
            key={`dot-${i}`}
            className="absolute rounded-full"
            style={{
              left: 0,
              top: 0,
              width: DOT_SIZE,
              height: DOT_SIZE,
              marginLeft: -DOT_SIZE / 2,
              marginTop: -DOT_SIZE / 2,
              backgroundColor: d.dark ? DOT_DARK_COLOR : DOT_LIGHT_COLOR,
              transform: `rotateY(${d.ry}deg) rotateX(${d.rx}deg) translateZ(calc(var(--r, 50px) - ${DOT_INSET}px))`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
        ))}

        {/* Company cards — laid flat on the sphere surface, facing outward. The
            anchor is a zero-size point rotated onto the surface; the card centres
            on it via translate(-50%, -50%), so its height can grow to fit the
            content (plus the card's own top/bottom padding) without clipping. */}
        {TILES.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformStyle: "preserve-3d",
              transform: `rotateY(${t.ry}deg) rotateX(${t.rx}deg) translateZ(var(--r, 200px))`,
            }}
          >
            <CompanyCard
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: CARD_W,
                transform: `translate(-50%, -50%) scale(${CARD_SCALE})`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogoCluster;
