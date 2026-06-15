import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

interface CenterBlobProps {
  /** CSS class on the host <svg> (e.g. absolute positioning). */
  className?: string;
}

/** Radius of the source circle in px (the radial gradient fades inside this). */
const RADIUS = 320;
/** Max edge displacement in px — larger = more pronounced wobble. */
const DISPLACE_SCALE = 36;
/** How far the noise pattern scrolls (px) along each axis over time. */
const WOBBLE_AMPL = 90;
/** Independent drift rates per axis (rad/sec) so the wobble never loops obviously. */
const WOBBLE_FREQ_X = 0.35;
const WOBBLE_FREQ_Y = 0.27;

/** Entrance — how long the blob takes to grow in from scale 0 on mount. */
const ENTER_DURATION_MS = 1100;
/** Pulse profile triggered by clicks. */
const PULSE_DURATION_MS = 360;
const PULSE_PEAK = 1.18;
/** Ripple profile — ambient rings emitted on a random timer. */
const RIPPLE_DURATION_MS = 1000;
const RIPPLE_START_R = 60;
const RIPPLE_START_OPACITY = 0.12;
const RIPPLE_START_STROKE_W = 30;
const RIPPLE_END_STROKE_W = 6;
/** Hard cap on simultaneous rings — rapid clicks recycle the oldest. */
const MAX_RIPPLES = 8;
/**
 * Ambient ripples: random gap (ms) between spontaneous rings. Same shape as
 * the click-driven ripple, just no pulse, no delay. Picks a random value in
 * this range after each emission.
 */
const AMBIENT_INTERVAL_MS: [number, number] = [1800, 4200];

interface ActiveRipple {
  /** performance.now() at which this ring should appear (birth = click + delay). */
  birth: number;
}

/**
 * A soft, multi-colour bubble parked in the centre of the section. The base
 * shape is one <circle> filled with a five-stop radial gradient (deep purple
 * → blue → turquoise → transparent). A turbulence + displacement filter
 * warps its edges; a JS-driven `<feOffset>` scrolls the noise sample point
 * each frame, so the same noise pattern morphs continuously — different
 * parts of the edge slowly bulge out and contract in.
 *
 * Clicking anywhere over the section pulses the bubble (brief scale-up)
 * and emits a single multi-colour ring from the centre that grows outward
 * and fades. The same ring also spawns ambiently on a random interval
 * (AMBIENT_INTERVAL_MS) so the scene breathes without input. All effects
 * piggy-back on the same rAF loop that drives the wobble.
 */
export function CenterBlob({ className }: CenterBlobProps) {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const offsetRef = useRef<SVGFEOffsetElement>(null);
  const pulseGroupRef = useRef<SVGGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const ripplesGroupRef = useRef<SVGGElement>(null);
  /** Start timestamp of the current pulse (null = idle). */
  const pulseStartRef = useRef<number | null>(null);
  /** Live ripples sorted oldest → newest. */
  const ripplesRef = useRef<ActiveRipple[]>([]);

  // Clicks no longer trigger a pulse/ripple here — that responsibility moved
  // to LeafField (clicks now spawn a leaf at the cursor). Ambient ripples
  // continue to fire from the ambient timer below.


  // --- Ambient ripples — spontaneous rings on a random interval ----------
  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const [lo, hi] = AMBIENT_INTERVAL_MS;
    const schedule = () => {
      timer = setTimeout(() => {
        if (ripplesRef.current.length < MAX_RIPPLES) {
          ripplesRef.current.push({ birth: performance.now() });
          window.dispatchEvent(new CustomEvent("centerblob-ripple"));
        }
        schedule();
      }, lo + Math.random() * (hi - lo));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  // --- rAF loop: wobble + pulse + ripples --------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);

      // 1. Wobble — scroll the noise sample along a Lissajous-ish path.
      const t = (now - start) / 1000;
      const o = offsetRef.current;
      if (o) {
        o.setAttribute("dx", String(Math.sin(t * WOBBLE_FREQ_X) * WOBBLE_AMPL));
        o.setAttribute("dy", String(Math.cos(t * WOBBLE_FREQ_Y) * WOBBLE_AMPL));
      }

      // 2. Entrance — animate the circle's actual `r` from 0 to RADIUS via
      // ease-out-cubic. Driving the SVG attribute (not a CSS scale) means
      // r=0 renders literally nothing on the first frame; CSS scale(0) on
      // the wobble-filtered group wasn't reliably collapsing the output.
      const c = circleRef.current;
      if (c) {
        const enterT = Math.min(1, (now - start) / ENTER_DURATION_MS);
        const enterScale = 1 - Math.pow(1 - enterT, 3);
        c.setAttribute("r", String(enterScale * RADIUS));
      }

      // 3. Pulse — smooth ease-in-out via sin(π·t). Applied as a CSS scale
      // on the wrapping group so it stacks on top of the entrance growth.
      const pg = pulseGroupRef.current;
      if (pg) {
        let pulseScale = 1;
        const ps = pulseStartRef.current;
        if (ps !== null) {
          const pt = (now - ps) / PULSE_DURATION_MS;
          if (pt >= 1) {
            pulseStartRef.current = null;
          } else if (pt > 0) {
            pulseScale = 1 + (PULSE_PEAK - 1) * Math.sin(Math.PI * pt);
          }
        }
        pg.style.transform = `scale(${pulseScale})`;
      }

      // 4. Ripples — grow the radius, fade alpha, thin the stroke.
      const rg = ripplesGroupRef.current;
      if (rg) {
        const live = ripplesRef.current;
        // Compute max radius from the actual SVG bounds — guarantees each
        // ring reaches the section's corners before its lifetime ends.
        const svg = svgRef.current;
        let maxR = RADIUS + 200;
        if (svg) {
          const r = svg.getBoundingClientRect();
          maxR = Math.hypot(r.width, r.height) / 2;
        }

        // Drop expired entries.
        for (let i = live.length - 1; i >= 0; i--) {
          if (now - live[i].birth > RIPPLE_DURATION_MS) {
            live.splice(i, 1);
          }
        }
        // Pre-delay entries (age < 0) stay in the array but don't paint yet —
        // visible count is the subset with age in [0, duration].
        let visibleCount = 0;
        for (const e of live) {
          if (now - e.birth >= 0) visibleCount++;
        }

        // Grow / shrink the pool of <circle> children to match visibleCount.
        while (rg.childElementCount < visibleCount) {
          const c = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
          );
          c.setAttribute("cx", "50%");
          c.setAttribute("cy", "50%");
          c.setAttribute("fill", "none");
          c.setAttribute("stroke", "url(#rippleStroke)");
          rg.appendChild(c);
        }
        while (rg.childElementCount > visibleCount) {
          rg.removeChild(rg.lastElementChild!);
        }

        // Write attributes for each visible ripple. ease-out-quad on the
        // radius — fast push, slow decay near the end.
        let idx = 0;
        for (const e of live) {
          const age = now - e.birth;
          if (age < 0) continue;
          const pt = Math.min(1, age / RIPPLE_DURATION_MS);
          const eased = 1 - (1 - pt) * (1 - pt);
          const r = RIPPLE_START_R + (maxR - RIPPLE_START_R) * eased;
          const opacity = RIPPLE_START_OPACITY * (1 - pt);
          const strokeW =
            RIPPLE_START_STROKE_W -
            (RIPPLE_START_STROKE_W - RIPPLE_END_STROKE_W) * pt;
          const c = rg.children[idx] as SVGCircleElement;
          c.setAttribute("r", String(r));
          c.setAttribute("opacity", String(opacity));
          c.setAttribute("stroke-width", String(strokeW));
          idx++;
        }
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        {/*
          Soft, low-opacity gradient — toned roughly half as vibrant as the
          previous cursor-trail palette. Five stops give the smooth purple →
          blue → turquoise falloff before reaching transparent at the rim.
        */}
        <radialGradient id="centerBlobGrad">
          <stop offset="0%" stopColor="#2c3ee0" stopOpacity="0.5" />
          <stop offset="22%" stopColor="#6a90e8" stopOpacity="0.4" />
          <stop offset="52%" stopColor="#759cca" stopOpacity="0.24" />
          <stop offset="80%" stopColor="#a5d5e3" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#d2e7ee" stopOpacity="0" />
        </radialGradient>
        {/*
          Ring stroke — diagonal purple → blue → turquoise band matching the
          blob palette. Used by every ripple emitted on click.
        */}
        <linearGradient id="rippleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a17a8" />
          <stop offset="50%" stopColor="#4d59ff" />
          <stop offset="100%" stopColor="#9ee9ff" />
        </linearGradient>
        {/*
          Wobble filter. feTurbulence makes a static fractal-noise field;
          feOffset is animated per-frame (via the ref) to scroll that field;
          feDisplacementMap reads the (now-shifting) noise and warps the
          circle's pixels by it. Filter region is expanded so the warped
          edges don't get clipped at the source bounding box.
        */}
        <filter
          id="blobWobble"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008"
            numOctaves="2"
            result="noise"
          />
          <feOffset
            ref={offsetRef}
            in="noise"
            dx="0"
            dy="0"
            result="shiftedNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="shiftedNoise"
            scale={DISPLACE_SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/*
          Ripple-ring blur. Soft gaussian on the ripples group so the
          expanding rings read as glowing bands rather than crisp circles.
          Expanded region so the blur halo isn't clipped at the source bbox.
        */}
        <filter
          id="rippleBlur"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {/*
        Pulse wrapper — CSS scale runs on this group so the filtered circle
        is uniformly scaled about its own visual centre. transform-box +
        transform-origin pin the origin to the circle's bounding box.
      */}
      <g
        ref={pulseGroupRef}
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
        }}
      >
        <circle
          ref={circleRef}
          cx="50%"
          cy="50%"
          // r is driven by the rAF entrance envelope (0 → RADIUS). Reduced
          // motion users skip the loop, so render at full size immediately.
          r={reduceMotion ? RADIUS : 0}
          fill="url(#centerBlobGrad)"
          filter="url(#blobWobble)"
        />
      </g>
      {/* Expanding rings — siblings of the pulse group; gaussian-blurred so
          they read as glowing bands. */}
      <g ref={ripplesGroupRef} filter="url(#rippleBlur)" />
    </svg>
  );
}

export default CenterBlob;
