import { useEffect, useRef, useState } from "react";
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
 * → blue → turquoise → transparent). On desktop, a turbulence + displacement
 * filter warps its edges and ambient ripple rings expand outward. On mobile,
 * ALL filter defs, ripple elements, and their rAF loops are completely omitted
 * from the DOM to prevent mobile GPUs from compiling unused filter shaders.
 */
export function CenterBlob({ className }: CenterBlobProps) {
  const reduceMotion = useReducedMotion();

  // Detect mobile synchronously on first render so the correct SVG variant
  // is painted immediately — no flash of the desktop (filter-heavy) version.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const svgRef = useRef<SVGSVGElement>(null);
  const offsetRef = useRef<SVGFEOffsetElement>(null);
  const pulseGroupRef = useRef<SVGGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const ripplesGroupRef = useRef<SVGGElement>(null);
  /** Start timestamp of the current pulse (null = idle). */
  const pulseStartRef = useRef<number | null>(null);
  /** Live ripples sorted oldest → newest. */
  const ripplesRef = useRef<ActiveRipple[]>([]);

  // --- Ambient ripples — desktop only, spontaneous rings on a random interval
  useEffect(() => {
    if (reduceMotion || isMobile) return;
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
  }, [reduceMotion, isMobile]);

  // --- rAF loop: wobble + pulse + ripples (desktop) OR entrance only (mobile)
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const start = performance.now();

    if (isMobile) {
      // On mobile: just run the entrance animation, then stop the loop entirely.
      const step = (now: number) => {
        const c = circleRef.current;
        if (c) {
          const enterT = Math.min(1, (now - start) / ENTER_DURATION_MS);
          const enterScale = 1 - Math.pow(1 - enterT, 3);
          c.setAttribute("r", String(enterScale * RADIUS));
          if (enterT < 1) {
            raf = requestAnimationFrame(step);
          }
        }
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }

    // Desktop: full wobble + pulse + ripple loop.
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
      // ease-out-cubic.
      const c = circleRef.current;
      if (c) {
        const enterT = Math.min(1, (now - start) / ENTER_DURATION_MS);
        const enterScale = 1 - Math.pow(1 - enterT, 3);
        c.setAttribute("r", String(enterScale * RADIUS));
      }

      // 3. Pulse — smooth ease-in-out via sin(π·t).
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
        const svg = svgRef.current;
        let maxR = RADIUS + 200;
        if (svg) {
          const r = svg.getBoundingClientRect();
          maxR = Math.hypot(r.width, r.height) / 2;
        }

        for (let i = live.length - 1; i >= 0; i--) {
          if (now - live[i].birth > RIPPLE_DURATION_MS) {
            live.splice(i, 1);
          }
        }
        let visibleCount = 0;
        for (const e of live) {
          if (now - e.birth >= 0) visibleCount++;
        }

        while (rg.childElementCount < visibleCount) {
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", "50%");
          c.setAttribute("cy", "50%");
          c.setAttribute("fill", "none");
          c.setAttribute("stroke", "url(#rippleStroke)");
          rg.appendChild(c);
        }
        while (rg.childElementCount > visibleCount) {
          rg.removeChild(rg.lastElementChild!);
        }

        let idx = 0;
        for (const e of live) {
          const age = now - e.birth;
          if (age < 0) continue;
          const pt = Math.min(1, age / RIPPLE_DURATION_MS);
          const eased = 1 - (1 - pt) * (1 - pt);
          const r = RIPPLE_START_R + (maxR - RIPPLE_START_R) * eased;
          const opacity = RIPPLE_START_OPACITY * (1 - pt);
          const strokeW = RIPPLE_START_STROKE_W - (RIPPLE_START_STROKE_W - RIPPLE_END_STROKE_W) * pt;
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
  }, [reduceMotion, isMobile]);

  // ── Mobile render: CSS radial-gradient <div> instead of SVG ────────────────
  // iOS Safari renders SVG radial gradients in display-P3 wide color gamut,
  // which shifts blues toward purple. CSS gradients are always sRGB-clamped,
  // so this avoids the color space mismatch entirely.
  if (isMobile) {
    return (
      <div
        aria-hidden
        className={className}
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 50% 50%, " +
            "rgba(44,62,224,0.50) 0%, " +
            "rgba(106,144,232,0.40) 22%, " +
            "rgba(117,156,202,0.24) 52%, " +
            "rgba(165,213,227,0.10) 80%, " +
            "rgba(210,231,238,0.00) 100%)",
        }}
      />
    );
  }

  // ── Desktop render: full wobble filter + ripple rings ─────────────────────
  return (
    <svg
      ref={svgRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id="centerBlobGrad">
          <stop offset="0%" stopColor="#2c3ee0" stopOpacity="0.5" />
          <stop offset="22%" stopColor="#6a90e8" stopOpacity="0.4" />
          <stop offset="52%" stopColor="#759cca" stopOpacity="0.24" />
          <stop offset="80%" stopColor="#a5d5e3" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#d2e7ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rippleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a17a8" />
          <stop offset="50%" stopColor="#4d59ff" />
          <stop offset="100%" stopColor="#9ee9ff" />
        </linearGradient>
        <filter id="blobWobble" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008"
            numOctaves="2"
            result="noise"
          />
          <feOffset ref={offsetRef} in="noise" dx="0" dy="0" result="shiftedNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="shiftedNoise"
            scale={DISPLACE_SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="rippleBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g
        ref={pulseGroupRef}
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
      >
        <circle
          ref={circleRef}
          cx="50%"
          cy="50%"
          r={reduceMotion ? RADIUS : 0}
          fill="url(#centerBlobGrad)"
          filter="url(#blobWobble)"
        />
      </g>
      <g ref={ripplesGroupRef} filter="url(#rippleBlur)" />
    </svg>
  );
}

export default CenterBlob;
