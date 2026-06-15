import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { advanceLetter, getNextLetter, randomLetter } from "../lib/nextLetter";

/** Serif stack for the drifting letters — Times New Roman with serif fallback. */
const LETTER_FONT = '"Times New Roman", Times, serif';

interface LeafFieldProps {
  /** CSS class on the host <svg> (e.g. absolute positioning). */
  className?: string;
  /** Partial overrides merged over DEFAULT_LEAF_CONFIG. */
  config?: Partial<LeafConfig>;
}

export interface LeafConfig {
  /**
   * Ambient spawn cap: the edge-spawn timer stops adding once this many
   * leaves are alive. Click-spawns bypass it — the user can pile on more.
   * When the population is over this number, the oldest leaves get a gentle
   * per-frame outward nudge so they drift off-screen and cull naturally.
   */
  maxCount: number;
  /** Random gap between spawns, in ms. */
  spawnIntervalMs: [number, number];
  /** Base inward drift speed at spawn (px/sec). Per-leaf 0.7×–1.4× jitter. */
  driftSpeed: number;
  /** Per-second fractional velocity decay — keep low for sustained drift. */
  damping: number;
  /** Random rotational velocity at spawn (deg/sec, ±). */
  angularDriftRate: number;
  /** Letter font-size range (px) — letters vary slightly in size. */
  sizeRange: [number, number];
  /** Max velocity kick a leaf at the centre receives when a ripple spawns (px/sec). */
  ripplePushStrength: number;
  /** Beyond this distance from centre, ripples no longer push the leaf (px). */
  ripplePushRadius: number;
  /** Margin beyond the section bounds before a leaf is culled (px). */
  cullMargin: number;
}

interface Leaf {
  id: string;
  /** The glyph this leaf renders (uppercase A–Z). */
  letter: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Font size in px. */
  size: number;
  angle: number;
  angularVel: number;
  fill: string;
  /** performance.now() at spawn — drives the subtle fade-in. */
  birth: number;
}

/** Letters fade in from fully transparent over this long, so they blend out
 *  of the background on spawn rather than popping in. */
const FADE_IN_MS = 1600;

export const DEFAULT_LEAF_CONFIG: LeafConfig = {
  maxCount: 12,
  spawnIntervalMs: [600, 1800],
  driftSpeed: 14,
  damping: 0.18,
  angularDriftRate: 22,
  sizeRange: [22, 46],
  // Small enough that a leaf can drift back inward after being kicked — the
  // natural inward drift (driftSpeed ≈ 14) shouldn't be fully overwhelmed.
  ripplePushStrength: 18,
  ripplePushRadius: 700,
  // Generous cull buffer so a leaf nudged just past an edge has room to drift
  // back instead of being deleted.
  cullMargin: 120,
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}`;

/**
 * Blue/purple HSL with slight per-letter variance so the field reads as part
 * of the blob palette rather than a uniform block of text.
 */
function letterFill(): string {
  const h = 220 + Math.random() * 40; // 220° (blue) → 260° (purple)
  const s = 45 + Math.random() * 25;
  const l = 38 + Math.random() * 14;
  const a = 0.45 + Math.random() * 0.2;
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

/** Spawn a letter at a random interior position (used for the initial burst). */
function spawnInteriorLeaf(cfg: LeafConfig, w: number, h: number): Leaf {
  const angle = rand(0, Math.PI * 2);
  const speed = cfg.driftSpeed * rand(0.6, 1.3);
  return {
    id: newId(),
    letter: randomLetter(),
    x: rand(cfg.sizeRange[1], Math.max(cfg.sizeRange[1] + 1, w - cfg.sizeRange[1])),
    y: rand(cfg.sizeRange[1], Math.max(cfg.sizeRange[1] + 1, h - cfg.sizeRange[1])),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: rand(cfg.sizeRange[0], cfg.sizeRange[1]),
    angle: Math.random() * 360,
    angularVel: rand(-cfg.angularDriftRate, cfg.angularDriftRate),
    fill: letterFill(),
    birth: performance.now(),
  };
}

/**
 * Spawn a letter near the centre with a gentle random drift. Used for ambient
 * replenishment so the middle stays populated after ripples push letters out.
 * Pairs with the fade-in (see FADE_IN_MS) so they emerge softly.
 */
function spawnCenterLeaf(cfg: LeafConfig, w: number, h: number): Leaf {
  const r = rand(0, Math.min(w, h) * 0.1); // a small cloud around the centre
  const pos = rand(0, Math.PI * 2);
  const dir = rand(0, Math.PI * 2);
  const speed = cfg.driftSpeed * rand(0.3, 0.8);
  return {
    id: newId(),
    letter: randomLetter(),
    x: w / 2 + Math.cos(pos) * r,
    y: h / 2 + Math.sin(pos) * r,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size: rand(cfg.sizeRange[0], cfg.sizeRange[1]),
    angle: Math.random() * 360,
    angularVel: rand(-cfg.angularDriftRate, cfg.angularDriftRate),
    fill: letterFill(),
    birth: performance.now(),
  };
}

/**
 * A drifting field of random Times New Roman letters that spawn just off the
 * section's edges and float inward. Clicking spawns the letter the cursor is
 * previewing (see lib/nextLetter). Listens for the global `centerblob-ripple`
 * event (dispatched by CenterBlob) and applies a gentle radial outward
 * velocity kick to each letter, falling off linearly with distance from the
 * section centre.
 */
export function LeafField({ className, config }: LeafFieldProps) {
  const cfg = useMemo<LeafConfig>(
    () => ({ ...DEFAULT_LEAF_CONFIG, ...config }),
    [config],
  );
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const leavesRef = useRef<Leaf[]>([]);
  const boundsRef = useRef({ w: 0, h: 0 });
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // --- Measure + spawn loop ---------------------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    const svg = svgRef.current;
    if (!svg) return;
    // Initial burst on first valid measurement so the section isn't empty
    // for the 0.6–1.8 s before the first edge-spawn timer fires.
    let initialDone = false;
    const initialBurst = () => {
      if (initialDone) return;
      const b = boundsRef.current;
      if (b.w <= 0) return;
      initialDone = true;
      for (let i = 0; i < 5; i++) {
        leavesRef.current.push(
          spawnInteriorLeaf(cfgRef.current, b.w, b.h),
        );
      }
    };
    const measure = () => {
      const r = svg.getBoundingClientRect();
      boundsRef.current = { w: r.width, h: r.height };
      initialBurst();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const [lo, hi] = cfgRef.current.spawnIntervalMs;
      timer = setTimeout(() => {
        const b = boundsRef.current;
        if (leavesRef.current.length < cfgRef.current.maxCount && b.w > 0) {
          leavesRef.current.push(spawnCenterLeaf(cfgRef.current, b.w, b.h));
        }
        schedule();
      }, lo + Math.random() * (hi - lo));
    };
    schedule();

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [reduceMotion]);

  // --- Click → spawn the previewed letter at the cursor ------------------
  useEffect(() => {
    if (reduceMotion) return;
    const svg = svgRef.current;
    if (!svg) return;
    const onDown = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const c = cfgRef.current;
      // No maxCount gate here — clicks can pile on as many as the user wants.
      // The rAF loop trims the population by drifting the oldest excess
      // letters outward once the count exceeds c.maxCount.
      const size = rand(c.sizeRange[0], c.sizeRange[1]);
      const angle = rand(0, Math.PI * 2);
      const speed = c.driftSpeed * rand(0.6, 1.1);
      leavesRef.current.push({
        id: newId(),
        // Spawn exactly the letter the cursor was previewing, then roll a
        // fresh one so the cursor preview updates for the next click.
        letter: getNextLetter(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        angle: Math.random() * 360,
        angularVel: rand(-c.angularDriftRate, c.angularDriftRate),
        fill: letterFill(),
        birth: performance.now(),
      });
      advanceLetter();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [reduceMotion]);

  // --- Ripple-push listener ---------------------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    const onRipple = () => {
      const { w, h } = boundsRef.current;
      if (w <= 0) return;
      const cx = w / 2;
      const cy = h / 2;
      const c = cfgRef.current;
      for (const l of leavesRef.current) {
        const dx = l.x - cx;
        const dy = l.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 1 || dist > c.ripplePushRadius) continue;
        const falloff = 1 - dist / c.ripplePushRadius;
        const kick = c.ripplePushStrength * falloff;
        l.vx += (dx / dist) * kick;
        l.vy += (dy / dist) * kick;
        // Small rotational scuff so the leaves twirl a bit when nudged.
        l.angularVel += (Math.random() - 0.5) * 18;
      }
    };
    window.addEventListener("centerblob-ripple", onRipple);
    return () => window.removeEventListener("centerblob-ripple", onRipple);
  }, [reduceMotion]);

  // --- Integration + render loop -----------------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = cfgRef.current;
      const damp = Math.pow(1 - Math.min(0.99, c.damping), dt);
      const { w, h } = boundsRef.current;
      const m = c.cullMargin;
      const leaves = leavesRef.current;
      // When the population is over the ambient cap (only possible via
      // click-spawns), gently nudge the OLDEST excess leaves outward each
      // frame. They drift off-screen and cull naturally — no abrupt deletes.
      const excess = leaves.length - c.maxCount;
      if (excess > 0 && w > 0) {
        const cx = w / 2;
        const cy = h / 2;
        const EXIT_ACCEL = 60; // px/sec² outward acceleration
        for (let i = 0; i < excess; i++) {
          const l = leaves[i];
          const dx = l.x - cx;
          const dy = l.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) continue;
          l.vx += (dx / dist) * EXIT_ACCEL * dt;
          l.vy += (dy / dist) * EXIT_ACCEL * dt;
        }
      }
      for (let i = leaves.length - 1; i >= 0; i--) {
        const l = leaves[i];
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.vx *= damp;
        l.vy *= damp;
        l.angle += l.angularVel * dt;
        l.angularVel *= damp;
        if (l.x < -m || l.x > w + m || l.y < -m || l.y > h + m) {
          leaves.splice(i, 1);
        }
      }
      syncEllipses(now);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  /**
   * Reconcile <text> DOM nodes with `leavesRef.current` in place — no React
   * reconciliation per frame, same hot-path pattern the previous lava-lamp
   * and cursor-trail implementations used. Each node is a single Times New
   * Roman glyph, centred on its (x, y) and rotated by the transform.
   */
  function syncEllipses(now: number) {
    const group = groupRef.current;
    if (!group) return;
    const leaves = leavesRef.current;
    while (group.childElementCount < leaves.length) {
      const el = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      el.setAttribute("text-anchor", "middle");
      el.setAttribute("dominant-baseline", "central");
      el.style.fontFamily = LETTER_FONT;
      group.appendChild(el);
    }
    while (group.childElementCount > leaves.length) {
      group.removeChild(group.lastElementChild!);
    }
    for (let i = 0; i < leaves.length; i++) {
      const el = group.children[i] as SVGTextElement;
      const l = leaves[i];
      if (el.textContent !== l.letter) el.textContent = l.letter;
      el.setAttribute("fill", l.fill);
      el.setAttribute("font-size", String(l.size));
      // Subtle fade-in: opacity ramps 0 → 1 (smoothstep) over FADE_IN_MS so the
      // letter emerges from the background rather than popping in.
      const f = Math.min(1, (now - l.birth) / FADE_IN_MS);
      el.setAttribute("opacity", String(f * f * (3 - 2 * f)));
      el.setAttribute(
        "transform",
        `translate(${l.x} ${l.y}) rotate(${l.angle})`,
      );
    }
  }

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className={className}
      // overflow:visible so leaves that spawn just outside an edge (y=-rx)
      // still paint while they drift in. Default SVG overflow is hidden.
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <g ref={groupRef} />
    </svg>
  );
}

export default LeafField;
