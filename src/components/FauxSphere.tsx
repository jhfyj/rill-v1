import { useEffect, useRef, type TouchEvent as ReactTouchEvent } from "react";
import type { Company } from "../types/company";
import { useReducedMotion } from "motion/react";
import { CompanyCard } from "./CompanyCard";

interface FauxSphereProps {
  /** CSS class on the host container (e.g. absolute positioning + z-index). */
  className?: string;
  /** Called when a card is clicked (e.g. to open the detail panel). */
  onCardClick?: (company: Company) => void;
  /** Freeze the rotation externally (e.g. while the detail panel is open). */
  frozen?: boolean;
  /** Fires when a card becomes active (hovered/locked), or when none is. */
  onActiveChange?: (active: boolean) => void;
  /** Company data to display on the cards. When empty, placeholder defaults are used. */
  companies?: Company[];
}

/* --- Geometry / feel -------------------------------------------------------- */
/** On-screen dome radius as a fraction of the container's larger side. */
const DOME_RADIUS_FRAC = 0.58;
/** CSS perspective as a multiple of the dome radius (drives the card tilt). */
const PERSPECTIVE_MULT = 2.6;
/** Dot lattice spacing in *radians* of arc (fine, even grid). */
const S_DOT = 0.14;
/**
 * Cards are NOT gridded. Each loop-tile (period P_CARD) holds CARDS_PER_TILE
 * cards at fixed pseudo-random offsets; that tile repeats across the plane, so
 * placement looks scattered yet still loops seamlessly in both axes.
 */
const P_CARD = 1.8;
const CARDS_PER_TILE = 5;
const CARD_MIN_DIST = 0.55; // min toroidal spacing within a tile (rad)
/** Arc-angle (rad) of the dome silhouette; past it, elements are culled. */
const A_MAX = 1.4; // ~80°
/** Arc-angle (rad) where the edge opacity fade begins. */
const A_FADE = 1.05; // ~60°

/** Card width (pre-scale) + uniform shrink, matching LogoCluster. */
const CARD_W = 380;
const CARD_SCALE = 0.6;
/** Tilt cards tangent to the dome (vs flat billboards) — toggle to compare. */
const CARD_TILT = true;

/** Dot appearance (matches LogoCluster's dark Fibonacci dots). */
const DOT_SIZE = 5;
const DOT_COLOR = "#41496a";

/** Scroll feel: idle drift + mouse-driven speed + momentum easing. */
const BASE_DRIFT = 0.07; // rad/sec, horizontal idle drift
const MAX_SPEED = 0.7; // rad/sec at the container edge
const VEL_TAU = 0.35; // velocity easing time constant (sec)
/** Touch flick momentum: how fast the post-drag velocity eases to idle (sec). */
const MOMENTUM_TAU = 0.6;

/** Focus mode (hovering a card): dim the rest + ease in/out. */
const CARD_DIM = 0.22; // opacity factor for non-hovered cards
const DOT_DIM = 0.18; // opacity factor for dots while focusing
const FOCUS_TAU = 0.18; // dim ease time constant (sec)

const DEG = 180 / Math.PI;

/** Round vignette so the dome dissolves into the background at its rim. */
const EDGE_FADE_MASK =
  "radial-gradient(ellipse 72% 72% at 50% 50%, #000 38%, transparent 80%)";

/**
 * Scattered-but-tiling card offsets within one loop-tile. Toroidal min-distance
 * rejection keeps them from clumping, including across tile seams. Stable at
 * module eval (Math.random here is fine — never called in render).
 */
function makeJitter(count: number, period: number, minDist: number) {
  const pts: { x: number; y: number }[] = [];
  let attempts = 0;
  while (pts.length < count && attempts < count * 300) {
    attempts++;
    const x = Math.random() * period;
    const y = Math.random() * period;
    const ok = pts.every((p) => {
      const dx = Math.min(Math.abs(x - p.x), period - Math.abs(x - p.x));
      const dy = Math.min(Math.abs(y - p.y), period - Math.abs(y - p.y));
      return Math.hypot(dx, dy) >= minDist;
    });
    if (ok) pts.push({ x, y });
  }
  while (pts.length < count) {
    pts.push({ x: Math.random() * period, y: Math.random() * period });
  }
  return pts;
}

/** Element-pool sizes: cover the dome (±A_MAX) plus a tile of wrap margin. */
const COLS_DOT = Math.ceil((2 * A_MAX) / S_DOT) + 2;
const DOT_COUNT = COLS_DOT * COLS_DOT;
const CARD_COPIES = Math.ceil((2 * A_MAX) / P_CARD) + 1;
const CARD_COUNT = CARDS_PER_TILE * CARD_COPIES * CARD_COPIES;
const CARD_JITTER = makeJitter(CARDS_PER_TILE, P_CARD, CARD_MIN_DIST);

/** Smooth 0→1 ramp; here used inverted for the rim opacity fade. */
function edgeOpacity(a: number) {
  if (a <= A_FADE) return 1;
  if (a >= A_MAX) return 0;
  const t = (a - A_FADE) / (A_MAX - A_FADE);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * A *faux* integration sphere: a flat dot+card lattice that tiles infinitely in
 * both axes, warped each frame through a fixed orthographic-azimuthal ("dome")
 * projection so it bulges in the centre and compresses/fades toward a circular
 * rim — reading as a sphere. Because the lattice is homogeneous and looping,
 * there is no pole to ever scroll into: every scroll position looks equivalent,
 * and content flows across the dome and wraps seamlessly up/down and left/right.
 *
 * Same hot-path shape as LogoCluster (rAF + pointerRef + exp-velocity easing),
 * but the loop drives a 2D scroll offset and writes a per-element transform
 * instead of rotating one 3D group.
 */
export function FauxSphere({
  className,
  onCardClick,
  frozen,
  onActiveChange,
  companies = [],
}: FauxSphereProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const dotEls = useRef<(HTMLDivElement | null)[]>([]);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  /** On-screen dome radius in px, kept in sync with the container size. */
  const rRef = useRef(300);
  /** Last pointer position (client coords) and whether it's on-screen. */
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  /** Touch-drag state (mobile): two-finger drag switches to drag input. */
  const touchModeRef = useRef(false);
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, lastT: 0 });
  /** Drag delta (px) not yet folded into the offset, consumed each frame. */
  const pendingDragRef = useRef({ x: 0, y: 0 });
  /** Latest drag velocity (px/sec) — carried as flick momentum on release. */
  const dragVelRef = useRef({ x: 0, y: 0 });
  /** True for the lifetime of a multi-touch gesture — while set we swallow the
   *  touch events so the deck's one-finger swipe navigation stays inert. */
  const multiTouchRef = useRef(false);
  /** Pool index of the card currently hovered (null = none). */
  const hoverRef = useRef<number | null>(null);
  /** Mirror of the `frozen` prop, readable inside the rAF loop. */
  const frozenRef = useRef(false);
  /** Pool index of the card "locked" active while the panel is open. */
  const lockedRef = useRef<number | null>(null);
  useEffect(() => {
    frozenRef.current = !!frozen;
    // Releasing the freeze (panel closed) returns control to live hover.
    if (!frozen) lockedRef.current = null;
  }, [frozen]);
  /** Latest onActiveChange, readable from the rAF loop without restarting it. */
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  // Track the pointer globally — the field itself is pointer-events-none.
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

  // Keep the dome radius (px) + the --r perspective var in sync with the size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const r = container.getBoundingClientRect();
      const radius = Math.max(r.width, r.height) * DOME_RADIUS_FRAC;
      rRef.current = radius;
      container.style.setProperty("--r", `${radius}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Project the looping lattice through the dome warp and write per-element
  // transforms. Called every frame (rAF) or once (reduced motion).
  useEffect(() => {
    if (!containerRef.current) return;

    const renderFrame = (
      ox: number,
      oy: number,
      focus: number,
      hoverIdx: number | null,
    ) => {
      const R = rRef.current;
      // Dots fade toward DOT_DIM while a card is focused.
      const dotDim = 1 - focus * (1 - DOT_DIM);
      // Only the fractional part of the offset matters (the lattice is periodic
      // with period S) — this is what makes the scroll loop seamlessly.
      const fracDotX = ((ox % S_DOT) + S_DOT) % S_DOT;
      const fracDotY = ((oy % S_DOT) + S_DOT) % S_DOT;
      const fracCardX = ((ox % P_CARD) + P_CARD) % P_CARD;
      const fracCardY = ((oy % P_CARD) + P_CARD) % P_CARD;

      // Dots — flat discs, position + scale + opacity.
      for (let idx = 0; idx < DOT_COUNT; idx++) {
        const el = dotEls.current[idx];
        if (!el) continue;
        const i = idx % COLS_DOT;
        const j = (idx / COLS_DOT) | 0;
        const px = (i - (COLS_DOT - 1) / 2) * S_DOT - fracDotX;
        const py = (j - (COLS_DOT - 1) / 2) * S_DOT - fracDotY;
        const a = Math.hypot(px, py);
        if (a >= A_MAX) {
          el.style.display = "none";
          continue;
        }
        el.style.display = "";
        const m = a < 1e-4 ? 1 : Math.sin(a) / a;
        const sx = R * px * m;
        const sy = R * py * m;
        const k = Math.cos(a);
        el.style.transform = `translate(${sx}px, ${sy}px) scale(${k})`;
        el.style.opacity = `${edgeOpacity(a) * dotDim}`;
      }

      // Cards — same projection, plus a tangent tilt from the dome normal.
      for (let idx = 0; idx < CARD_COUNT; idx++) {
        const el = cardEls.current[idx];
        if (!el) continue;
        const c = idx % CARDS_PER_TILE;
        const tile = (idx / CARDS_PER_TILE) | 0;
        const bx = tile % CARD_COPIES;
        const by = (tile / CARD_COPIES) | 0;
        const px =
          (bx - (CARD_COPIES - 1) / 2) * P_CARD + CARD_JITTER[c].x - fracCardX;
        const py =
          (by - (CARD_COPIES - 1) / 2) * P_CARD + CARD_JITTER[c].y - fracCardY;
        const a = Math.hypot(px, py);
        if (a >= A_MAX) {
          el.style.display = "none";
          continue;
        }
        el.style.display = "";
        const m = a < 1e-4 ? 1 : Math.sin(a) / a;
        const sx = R * px * m;
        const sy = R * py * m;
        const k = Math.cos(a);
        let ry = 0;
        let rx = 0;
        if (CARD_TILT && a >= 1e-4) {
          const nx = Math.sin(a) * (px / a);
          const ny = Math.sin(a) * (py / a);
          const nz = Math.cos(a);
          ry = Math.atan2(nx, nz) * DEG;
          rx = -Math.asin(Math.max(-1, Math.min(1, ny))) * DEG;
        }
        el.style.transform = `translate(${sx}px, ${sy}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${k})`;
        // The hovered card stays full; the others dim toward CARD_DIM.
        const dim =
          hoverIdx !== null && idx !== hoverIdx
            ? 1 - focus * (1 - CARD_DIM)
            : 1;
        el.style.opacity = `${edgeOpacity(a) * dim}`;
      }
    };

    if (reduceMotion) {
      renderFrame(0, 0, 0, null);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let ox = 0;
    let oy = 0;
    let vx = BASE_DRIFT;
    let vy = 0;
    let focus = 0;
    let wasActive = false;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const R = rRef.current;
      // The active card is the locked one while frozen (panel open) — so the
      // canvas stays put on it and it stays highlighted even as the cursor moves
      // to the panel — otherwise it's whatever card is live-hovered.
      const active = frozenRef.current ? lockedRef.current : hoverRef.current;
      // An active card stops the scroll and holds it there.
      const paused = active !== null;
      // Notify on active/inactive transitions (drives the heading fade).
      if (paused !== wasActive) {
        wasActive = paused;
        onActiveChangeRef.current?.(paused);
      }

      if (touchModeRef.current) {
        // Mobile: the finger drags the sphere directly; a flick coasts on.
        const pend = pendingDragRef.current;
        if (!paused) {
          // Drag delta (px) → scroll offset (rad): the dome follows the finger.
          ox -= pend.x / R;
          oy -= pend.y / R;
        }
        pend.x = 0;
        pend.y = 0;
        if (dragRef.current.dragging || paused) {
          // Position is finger-driven; keep velocity synced for release momentum.
          vx = paused ? 0 : -dragVelRef.current.x / R;
          vy = paused ? 0 : -dragVelRef.current.y / R;
        } else {
          // Released: ease the flick velocity back toward the idle drift.
          const km = 1 - Math.exp(-dt / MOMENTUM_TAU);
          vx += (BASE_DRIFT - vx) * km;
          vy += (0 - vy) * km;
          ox += vx * dt;
          oy += vy * dt;
        }
      } else {
        // Desktop: cursor position relative to centre sets a scroll velocity.
        const container = containerRef.current;
        let nx = 0;
        let ny = 0;
        if (container && pointerRef.current.active) {
          const r = container.getBoundingClientRect();
          if (r.width > 0) {
            nx = (pointerRef.current.x - (r.left + r.width / 2)) / (r.width / 2);
            ny = (pointerRef.current.y - (r.top + r.height / 2)) / (r.height / 2);
            nx = Math.max(-1, Math.min(1, nx));
            ny = Math.max(-1, Math.min(1, ny));
          }
        }
        const targetVX = paused ? 0 : nx * MAX_SPEED + BASE_DRIFT;
        const targetVY = paused ? 0 : ny * MAX_SPEED;
        const kk = 1 - Math.exp(-dt / VEL_TAU);
        vx += (targetVX - vx) * kk;
        vy += (targetVY - vy) * kk;
        ox += vx * dt;
        oy += vy * dt;
      }

      // Ease the focus dim in while a card is active, out when none is.
      const kf = 1 - Math.exp(-dt / FOCUS_TAU);
      focus += ((active !== null ? 1 : 0) - focus) * kf;

      renderFrame(ox, oy, focus, active);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // Touch-drag (mobile). TWO fingers drag/spin the sphere; one finger is left
  // for the deck's swipe navigation. While 2+ fingers are down we stopPropagation
  // so the deck never sees the gesture; touch-action:none also blocks pinch-zoom.
  // We track the midpoint of the two touches as the drag point.
  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length >= 2) {
      multiTouchRef.current = true;
      touchModeRef.current = true;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      dragRef.current = {
        dragging: true,
        lastX: mx,
        lastY: my,
        lastT: performance.now(),
      };
      dragVelRef.current = { x: 0, y: 0 };
    }
    if (multiTouchRef.current) e.stopPropagation();
  };
  const onTouchMove = (e: ReactTouchEvent) => {
    if (multiTouchRef.current) e.stopPropagation();
    const d = dragRef.current;
    if (!d.dragging || e.touches.length < 2) return;
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const now = performance.now();
    const dx = mx - d.lastX;
    const dy = my - d.lastY;
    const dts = Math.max(1, now - d.lastT) / 1000;
    pendingDragRef.current.x += dx;
    pendingDragRef.current.y += dy;
    dragVelRef.current = { x: dx / dts, y: dy / dts };
    d.lastX = mx;
    d.lastY = my;
    d.lastT = now;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    if (multiTouchRef.current) e.stopPropagation();
    // Dropping below two fingers ends the drag (momentum carries on); the
    // gesture block lifts only once every finger is up, so the stray final
    // touchend can't reach the deck's swipe navigation.
    if (e.touches.length < 2) dragRef.current.dragging = false;
    if (e.touches.length === 0) multiTouchRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={className}
      style={{
        perspective: `calc(var(--r, 200px) * ${PERSPECTIVE_MULT})`,
        perspectiveOrigin: "50% 50%",
        maskImage: EDGE_FADE_MASK,
        WebkitMaskImage: EDGE_FADE_MASK,
      }}
    >
      {/* Touch drag surface (mobile) — sits beneath the dots/cards so card taps
          still land on the cards; catches TWO-finger drags on the empty dome to
          spin it. touch-action:none blocks browser scroll/pinch mid-drag. */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />

      {/* Dot layer (flat) — kept in its OWN stacking context (separate from the
          cards) so it never z-sorts against the tilted cards: the opaque cards
          always paint over the dots, even on their back-tilted half. */}
      <div style={{ position: "absolute", left: "50%", top: "50%" }}>
        {Array.from({ length: DOT_COUNT }).map((_, idx) => (
          <div
            key={`dot-${idx}`}
            ref={(el) => {
              dotEls.current[idx] = el;
            }}
            className="rounded-full"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: DOT_SIZE,
              height: DOT_SIZE,
              marginLeft: -DOT_SIZE / 2,
              marginTop: -DOT_SIZE / 2,
              backgroundColor: DOT_COLOR,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Card layer (preserve-3d, painted after the dots). Zero-size anchors
          carry the per-frame transform; each CompanyCard centres on its anchor
          (height stays content-driven). */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transformStyle: "preserve-3d",
        }}
      >
        {Array.from({ length: CARD_COUNT }).map((_, idx) => (
          <div
            key={`card-${idx}`}
            ref={(el) => {
              cardEls.current[idx] = el;
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformStyle: "preserve-3d",
              willChange: "transform, opacity",
            }}
          >
            <CompanyCard
              {...(companies.length > 0
                ? companies[idx % companies.length]
                : {})}
              onMouseEnter={() => {
                hoverRef.current = idx;
              }}
              onMouseLeave={() => {
                if (hoverRef.current === idx) hoverRef.current = null;
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Lock this card active + freeze the canvas while the panel is open.
                lockedRef.current = idx;
                const company =
                  companies.length > 0
                    ? companies[idx % companies.length]
                    : undefined;
                onCardClick?.(company as Company);
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: CARD_W,
                transform: `translate(-50%, -50%) scale(${CARD_SCALE})`,
                pointerEvents: "auto",
                cursor: "pointer",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FauxSphere;
