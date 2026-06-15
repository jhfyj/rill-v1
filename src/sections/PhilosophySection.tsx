import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { CenterBlob } from "../components/CenterBlob";
import { LeafField } from "../components/LeafField";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Vertical strips the section is sliced into. 33 matches the CodePen default. */
const STEPS = 33;

/** Headline typewriter — the first line is fixed; the second line ("Not …")
 *  cycles through these phrases, typing in and deleting out. */
const LINE_1 = "What you can do.";
const PHRASES = [
  "what you can fit on paper.",
  "what you say in interviews.",
  "what you have on resume.",
  "what you've done already.",
];
const TYPE_MS = 55; // per-char typing delay
const DELETE_MS = 28; // per-char deleting delay
const HOLD_MS = 1900; // pause once a phrase is fully typed
const GAP_MS = 300; // pause after deleting, before the next phrase

/**
 * Section 2 — a soft, low-opacity multi-colour bubble pinned to the centre
 * of the section, viewed through a fractal-glass strip overlay.
 *
 * Layers, back to front:
 *   z-0  cream base (#fbfaf7, matches LandingSection)
 *   z-[5] LeafField — small green ellipses drift in from the section edges.
 *        Listens for `centerblob-ripple` and gets pushed outward by it.
 *   z-10 CenterBlob — purple/blue/turquoise radial gradient with edges
 *        wobbled by an animated SVG displacement filter (parts of the rim
 *        slowly bulge out and contract in, like an AI-orb).
 *   z-20 Fractal-glass strips — per-strip backdrop blur.
 *   z-30 Centered text (OUR PHILOSOPHY / headline / body).
 */
export function PhilosophySection() {
  const reduceMotion = useReducedMotion();

  // Post-mount state flip so the text entrance plays on every re-entry — the
  // deck's <AnimatePresence> suppresses nested mount animations, but a plain
  // `animate` prop change isn't subject to that. Same pattern as LandingSection.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animateState = shown || reduceMotion ? "show" : "hidden";

  const textGroup: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduceMotion ? 0 : 0.2,
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };
  const textItem: Variants = {
    hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT },
    },
  };

  return (
    <section className="relative h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Drifting green leaves — spawn off the edges, float inward. The
          centre-blob's ripple events nudge them outward radially. */}
      <LeafField className="absolute inset-0 z-[5]" />

      {/* Centred wobbly bubble — purple/blue/turquoise radial gradient with
          a self-contained turbulence + displacement filter that morphs the
          edge each frame. No cursor input. */}
      <CenterBlob className="absolute inset-0 z-10" />

      {/* Fractal-glass strip overlay — TEMPORARILY DISABLED to preview the
          letters without frosting. Re-enable by uncommenting <Strips />.
          Width curve from the CodePen makes edges narrower than the center;
          factors are normalized so they sum to exactly the full section
          width (the raw factors only cover ~89%, leaving a bare gap). */}
      {/* <Strips /> */}

      {/* Centered text — only thing in the a11y tree. */}
      <motion.div
        variants={textGroup}
        initial={reduceMotion ? false : "hidden"}
        animate={animateState}
        className="absolute inset-0 z-30 flex flex-col items-center justify-center px-[8vw] text-center"
      >
        <motion.p
          variants={textItem}
          className="font-heading text-xs font-medium tracking-[0.3em] text-brand-700"
          style={{ textShadow: "0 1px 12px rgba(255, 255, 255, 0.65)" }}
        >
          OUR PHILOSOPHY
        </motion.p>
        <TypingHeadline
          variants={textItem}
          reduceMotion={!!reduceMotion}
          start={animateState === "show"}
        />
        <motion.p
          variants={textItem}
          className="mt-6 max-w-md font-body text-base text-ink"
          style={{ textShadow: "0 1px 10px rgba(255, 255, 255, 0.55)" }}
        >
          Rill is the new way to connect people to work based on what they can
          actually do.
        </motion.p>
      </motion.div>
    </section>
  );
}

/** Blinking text caret. */
function Caret() {
  return (
    <motion.span
      aria-hidden
      className="font-sans font-light not-italic text-brand-700"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
        times: [0, 0.5, 0.5, 1],
      }}
    >
      |
    </motion.span>
  );
}

/**
 * The philosophy headline, typed out on appear. Line 1 ("What you can do.")
 * types once and stays; line 2 keeps the static prefix "Not " and cycles the
 * remainder through PHRASES — typing each in, holding, deleting, then the next.
 * Both lines reserve their height (min-h) so the centred block never jumps.
 */
function TypingHeadline({
  variants,
  reduceMotion,
  start,
}: {
  variants: Variants;
  reduceMotion: boolean;
  start: boolean;
}) {
  const [line1, setLine1] = useState(reduceMotion ? LINE_1 : "");
  const [phrase, setPhrase] = useState(reduceMotion ? PHRASES[0] : "");
  // Whether the "Not …" line has begun (line 1 finished typing).
  const [secondStarted, setSecondStarted] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion || !start) return;
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    async function run() {
      // 1. Type the first line.
      for (let i = 1; i <= LINE_1.length; i++) {
        if (cancelled) return;
        setLine1(LINE_1.slice(0, i));
        await wait(TYPE_MS);
      }
      await wait(450);
      if (cancelled) return;
      setSecondStarted(true);
      await wait(200);

      // 2. Cycle the second line forever.
      let idx = 0;
      while (!cancelled) {
        const target = PHRASES[idx];
        for (let i = 1; i <= target.length; i++) {
          if (cancelled) return;
          setPhrase(target.slice(0, i));
          await wait(TYPE_MS);
        }
        await wait(HOLD_MS);
        for (let i = target.length - 1; i >= 0; i--) {
          if (cancelled) return;
          setPhrase(target.slice(0, i));
          await wait(DELETE_MS);
        }
        await wait(GAP_MS);
        idx = (idx + 1) % PHRASES.length;
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [start, reduceMotion]);

  return (
    <motion.h2
      variants={variants}
      aria-label={`${LINE_1} Not ${PHRASES[0]}`}
      className="mt-6 font-title text-5xl italic leading-tight text-brand-900 sm:text-4xl lg:text-5xl"
      style={{ textShadow: "0 2px 20px rgba(255, 255, 255, 0.55)" }}
    >
      <span aria-hidden className="block min-h-[1.25em]">
        {line1}
        {!secondStarted && !reduceMotion && <Caret />}
      </span>
      <span aria-hidden className="block min-h-[1.25em]">
        {secondStarted && (
          <>
            Not {phrase}
            {!reduceMotion && <Caret />}
          </>
        )}
      </span>
    </motion.h2>
  );
}

/** Vertical glass strips that frost whatever sits behind them. */
function Strips() {
  const factor = (i: number) =>
    1 - (Math.abs(i - STEPS / 2) / (STEPS / 2)) * 0.2;
  const totalFactor = Array.from({ length: STEPS }).reduce<number>(
    (s, _, i) => s + factor(i),
    0,
  );
  return (
    <div aria-hidden className="absolute inset-0 z-20 flex">
      {Array.from({ length: STEPS }).map((_, i) => {
        const cellWidth = (100 * factor(i)) / totalFactor;
        return (
          <div
            key={i}
            className="relative h-full overflow-hidden"
            style={{
              width: `${cellWidth}%`,
              // Heavy frosted-glass blur on whatever sits behind (the blobs).
              // Per-strip so each glass shard reads as its own pane.
              backdropFilter: "blur(8px) saturate(140%)",
              WebkitBackdropFilter: "blur(8px) saturate(140%)",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            {/* Right-edge shimmer — glass-shard highlight. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 72.63%, rgba(255,255,255,0.08) 99%, rgba(255,255,255,0.6) 100%)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default PhilosophySection;
