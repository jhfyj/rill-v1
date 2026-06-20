import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { CenterBlob } from "../components/CenterBlob";
import { LeafField } from "../components/LeafField";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Vertical strips the section is sliced into. 33 matches the CodePen default. */
const STEPS = 33;

/** Section headline (left column). */
const HEADLINE = "You are more than keywords and what you can fit on a piece of paper";

/** Body copy (right column), one entry per paragraph. */
const PARAGRAPHS = [
  "We believe the traditional hiring funnel is broken. Hiring decisions are based on resumes or networks, which are just proxies for capability.",
  "Today hiring has turned into an optimization game. Companies use AI to screen resumes for keywords. Candidates use AI to optimize resumes to include them. Companies use AI to interview candidates. Candidates use AI to cheat on them. AI-powered tools enable mass applications and encourage spray-and-pray in job searching. The result is more applications, more filters, and more noise.",
  "We believe there is a better way. That is, hiring based on what people can do, not how well they can navigate the system. So we built Rill to connect candidates directly with hiring managers and leave resumes out of the process.",
];

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

  // The items live inside the two column <div>s, so Motion's staggerChildren
  // (which only times *direct* motion children) can't sequence them. Instead
  // each item carries its own delay via `custom`, so we can order them across
  // columns: label → headline → paragraphs (the longer text comes in last).
  const textGroup: Variants = { hidden: {}, show: {} };
  const textItem: Variants = {
    hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT, delay: reduceMotion ? 0 : delay },
    }),
  };

  // Entrance schedule (seconds). The body paragraphs start after the headline
  // and stagger gently among themselves.
  const D_LABEL = 0;
  const D_HEADLINE = 0.35;
  const D_BODY = 0.8;
  const D_BODY_STAGGER = 0.18;

  // <Strips /> is intentionally disabled (see below) but kept for easy
  // re-enable; reference it so noUnusedLocals doesn't trip the build.
  void Strips;

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

      {/* Two-column copy — label + headline on the left, body paragraphs on
          the right. Stacks to a single column on small screens. This is the
          only thing in the a11y tree. */}
      <motion.div
        variants={textGroup}
        initial={reduceMotion ? false : "hidden"}
        animate={animateState}
        className="absolute inset-0 z-30 flex items-center justify-center px-[8vw]"
      >
        <div className="grid w-full max-w-5xl grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-2">
          {/* Left — section label + headline */}
          <div>
            <motion.p
              variants={textItem}
              custom={D_LABEL}
              className="font-heading text-xs font-medium tracking-[0.3em] text-brand-700"
              style={{ textShadow: "0 1px 12px rgba(255, 255, 255, 0.65)" }}
            >
              OUR PHILOSOPHY
            </motion.p>
            <motion.h2
              variants={textItem}
              custom={D_HEADLINE}
              className="mt-6 max-w-md font-title text-3xl leading-snug text-brand-900 sm:text-4xl"
              style={{ textShadow: "0 2px 20px rgba(255, 255, 255, 0.55)" }}
            >
              {HEADLINE}
            </motion.h2>
          </div>

          {/* Right — body paragraphs */}
          <div className="max-w-md space-y-5">
            {PARAGRAPHS.map((para, i) => (
              <motion.p
                key={i}
                variants={textItem}
                custom={D_BODY + i * D_BODY_STAGGER}
                className="font-body text-[15px] leading-relaxed text-ink"
                style={{ textShadow: "0 1px 10px rgba(255, 255, 255, 0.55)" }}
              >
                {para}
              </motion.p>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
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
