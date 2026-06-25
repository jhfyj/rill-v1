import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { CenterBlob } from "../components/CenterBlob";
import { LeafField } from "../components/LeafField";
import { LetterCascade } from "../components/LetterCascade";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Vertical strips the section is sliced into. */
const STEPS = 33;

/** Section headline (left column). */
const HEADLINE = "You are more than keywords and what you can fit on a piece of paper";

/** Body copy (right column), one entry per paragraph. */
const PARAGRAPHS = [
  "We believe the traditional hiring funnel is broken. Hiring decisions are based on resumes or networks, which are just proxies for capability.",
  "Today hiring has turned into an optimization game. Companies use AI to screen resumes for keywords. Candidates use AI to optimize resumes to include them. Companies use AI to interview candidates. Candidates use AI to cheat on them. AI-powered tools enable mass applications and encourage spray-and-pray in job searching. The result is more applications, more filters, and more noise.",
  "We believe there is a better way. That is, hiring based on what people can do, not how well they can navigate the system. So we built Rill to connect candidates directly with hiring managers and leave resumes out of the process.",
];

interface PhilosophySectionProps {
  /**
   * Desktop only — called when the user scrolls to the very bottom of the
   * section to advance the deck. Not used on mobile (plain page scroll).
   */
  onNext?: () => void;
}

/**
 * Section 2 — a soft, low-opacity multi-colour bubble pinned to the centre
 * of the section, viewed through a fractal-glass strip overlay.
 *
 * Desktop: fixed two-column layout, centred vertically, no inner scroll.
 *          useSectionNavigation drives navigation via wheel/key/swipe.
 * Mobile:  plain block in the page flow — the page itself scrolls vertically.
 *          No inner scroll container, no touch interception, no dwell timers.
 */
export function PhilosophySection({ onNext: _onNext }: PhilosophySectionProps) {
  const reduceMotion = useReducedMotion();

  // Disable LeafField rAF loop on mobile.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Post-mount state flip so the text entrance plays on every re-entry.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animateState = shown || reduceMotion ? "show" : "hidden";

  const textGroup: Variants = { hidden: {}, show: {} };
  const textItem: Variants = {
    hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: reduceMotion ? 0 : 0.7,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : delay,
      },
    }),
  };

  const D_LABEL = 0;
  const D_HEADLINE = 0.35;
  const D_BODY = 0.8;
  const D_BODY_STAGGER = 0.18;

  void Strips;

  // ── Shared content ────────────────────────────────────────────────────────
  const content = (
    <motion.div
      variants={textGroup}
      initial={reduceMotion ? false : "hidden"}
      animate={animateState}
      className="grid w-full max-w-5xl grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-2"
    >
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
          <LetterCascade
            text={HEADLINE}
            triggerOnEvent="centerblob-ripple"
            waveSpeed={900}
          />
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
    </motion.div>
  );

  // ── Mobile: plain block layout in the page flow ───────────────────────────
  if (isMobile) {
    return (
      <section className="relative w-full h-full overflow-hidden bg-[#fbfaf7] flex flex-col items-start justify-center px-6">
        <CenterBlob className="absolute inset-0 z-10 pointer-events-none" />
        <div className="relative z-20">
          {content}
        </div>
      </section>
    );
  }

  // ── Desktop: original fixed-height centred layout ─────────────────────────
  return (
    <section className="relative h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Drifting background letters — desktop only. */}
      <LeafField className="absolute inset-0 z-[5]" />

      {/* Centre blob — wobble + ripples on desktop, plain CSS gradient on mobile. */}
      <CenterBlob className="absolute inset-0 z-10" />

      <div className="absolute inset-0 z-30 flex items-center justify-center px-[8vw]">
        {content}
      </div>
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
              backdropFilter: "blur(8px) saturate(140%)",
              WebkitBackdropFilter: "blur(8px) saturate(140%)",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
        );
      })}
    </div>
  );
}
