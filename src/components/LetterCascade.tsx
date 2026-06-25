import { useCallback, useEffect, useState } from "react";
import {
  type AnimationOptions,
  motion,
  stagger,
  useAnimate,
  useReducedMotion,
} from "motion/react";

/** Tiny classNames joiner — avoids pulling in clsx for a single component. */
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface LetterCascadeProps {
  /** The text to animate. */
  text: string;
  /** Additional CSS classes for the container. */
  className?: string;
  /** CSS classes applied to each individual letter. */
  letterClassName?: string;
  /**
   * Index-based stagger between letters, in seconds. Used as a fallback when
   * no spatial origin is available (e.g. plain hover/click with no ripple).
   */
  staggerDuration?: number;
  /** Where the index-based stagger wave originates (fallback only). */
  staggerFrom?: "first" | "last" | "center" | number;
  /**
   * Wave speed in px/sec when the cascade is driven from a spatial origin. Each
   * letter's flip is delayed by (its distance from the origin) / waveSpeed, so
   * the flip starts at the letters nearest the origin and ripples outward.
   */
  waveSpeed?: number;
  /** Spring stiffness — higher = snappier. */
  stiffness?: number;
  /** Spring damping — lower = bouncier. */
  damping?: number;
  /** Re-run the cascade on hover. */
  triggerOnHover?: boolean;
  /** Re-run the cascade on click. */
  triggerOnClick?: boolean;
  /**
   * Name of a `window` event that re-triggers the cascade (e.g.
   * "centerblob-ripple"). If the event carries `detail.origin` ({x, y} in
   * client coords), the cascade ripples outward from that point; otherwise it
   * falls back to the index-based stagger.
   */
  triggerOnEvent?: string;
  /** Callback when the full animation cycle completes. */
  onComplete?: () => void;
}

/** {x, y} in client (viewport) coordinates. */
type Origin = { x: number; y: number };

/**
 * Per-letter "cascade" — on each trigger the front face of every letter tilts
 * back and fades while an echo face flips up from below, staggered across the
 * word so it reads as a wave. Ported from @componentry/letter-cascade, adapted
 * to this repo: imports from `motion/react` (not framer-motion), no `cn`/util
 * dependency, an external `triggerOnEvent` driver, and an inline (wrapping)
 * layout so it works on a long, multi-word headline instead of one line.
 */
export function LetterCascade({
  text,
  className,
  letterClassName,
  staggerDuration = 0.04,
  staggerFrom = "first",
  waveSpeed = 900,
  stiffness = 220,
  damping = 16,
  triggerOnHover = false,
  triggerOnClick = false,
  triggerOnEvent,
  onComplete,
}: LetterCascadeProps) {
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [blocked, setBlocked] = useState(false);

  const trigger = useCallback(
    (origin?: Origin) => {
      if (blocked || reduceMotion) return;
      setBlocked(true);

      // With a spatial origin, delay each letter by its distance from that
      // point (÷ waveSpeed) so the flip starts nearest the origin and ripples
      // out. The DOM order of `.cascade-front` nodes matches the index Motion
      // passes to the delay function, so a same-ordered lookup table aligns.
      let delayFn: AnimationOptions["delay"] | undefined;
      if (origin) {
        const root = scope.current as Element | null;
        const fronts = root
          ? Array.from(root.querySelectorAll<HTMLElement>(".cascade-front"))
          : [];
        const delays = fronts.map((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          return Math.hypot(cx - origin.x, cy - origin.y) / waveSpeed;
        });
        delayFn = (i: number) => delays[i] ?? 0;
      }

      const merge = (base: AnimationOptions): AnimationOptions => ({
        ...base,
        // Spatial wave when we have an origin; index-based stagger otherwise.
        delay: delayFn ?? stagger(staggerDuration, { from: staggerFrom }),
      });
      const spring: AnimationOptions = { type: "spring", stiffness, damping };

      // ── Phase 1: front tilts back, echo flips in from below ──
      animate(
        ".cascade-front",
        { rotateX: 90, opacity: 0, y: -6, filter: "blur(4px)" },
        merge(spring),
      ).then(() => {
      // Instantly reset the front face for the next cycle.
      animate(
        ".cascade-front",
        { rotateX: 0, opacity: 1, y: 0, filter: "blur(0px)" },
        { duration: 0 },
      ).then(() => {
        setBlocked(false);
        onComplete?.();
      });
    });

    animate(
      ".cascade-echo",
      { rotateX: 0, opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
      merge(spring),
    ).then(() => {
      // Instantly tuck the echo face back below for the next cycle.
      animate(
        ".cascade-echo",
        { rotateX: -90, opacity: 0, y: 6, scale: 0.8, filter: "blur(4px)" },
        { duration: 0 },
      );
    });
  }, [
    blocked,
    reduceMotion,
    animate,
    scope,
    staggerDuration,
    staggerFrom,
    waveSpeed,
    stiffness,
    damping,
    onComplete,
  ]);

  // External driver: re-run whenever the named window event fires, passing
  // along the ripple origin from the event detail when present.
  useEffect(() => {
    if (!triggerOnEvent) return;
    const handler = (e: Event) => {
      const origin = (e as CustomEvent<{ origin?: Origin }>).detail?.origin;
      trigger(origin);
    };
    window.addEventListener(triggerOnEvent, handler);
    return () => window.removeEventListener(triggerOnEvent, handler);
  }, [triggerOnEvent, trigger]);

  return (
    // `inline` (not inline-flex) so a long headline flows and wraps like normal
    // text. Letters are grouped per word in a `nowrap` inline-block so a word
    // never splits mid-letter — the boundary between adjacent inline-block
    // letters is otherwise a valid line-break point. Breaks happen only at the
    // real spaces between words.
    <span
      ref={scope}
      className={cn("inline", className)}
      aria-label={text}
      {...(triggerOnHover ? { onMouseEnter: () => trigger() } : {})}
      {...(triggerOnClick ? { onClick: () => trigger() } : {})}
    >
      {text.split(" ").map((word, wi) => (
        <span key={wi}>
          {/* Breakable space before every word except the first. */}
          {wi > 0 ? " " : null}
          {/* Word kept atomic: its letters can't wrap to the next line. */}
          <span aria-hidden className="inline-block whitespace-nowrap">
            {word.split("").map((ch, ci) => (
              <span
                key={ci}
                className="relative inline-block whitespace-pre"
                style={{ perspective: "500px" }}
              >
                {/* Front face — visible by default, tilts backward on trigger. */}
                <motion.span
                  className={cn("cascade-front inline-block", letterClassName)}
                  style={{
                    rotateX: 0,
                    y: 0,
                    transformOrigin: "bottom center",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {ch}
                </motion.span>

                {/* Echo face — hidden below, flips up into view on trigger. */}
                <motion.span
                  className={cn(
                    "cascade-echo absolute inset-0 inline-block",
                    letterClassName,
                  )}
                  style={{
                    rotateX: -90,
                    opacity: 0,
                    y: 6,
                    scale: 0.8,
                    filter: "blur(4px)",
                    transformOrigin: "top center",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {ch}
                </motion.span>
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

export default LetterCascade;
