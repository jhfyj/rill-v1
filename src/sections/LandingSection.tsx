import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { RippleField } from "../components/RippleField";
import { LogoMarquee } from "../components/LogoMarquee";
import { Button } from "../components/Button";
import { TypingHeadline } from "../components/TypingHeadline";
import { INTRO } from "../lib/intro";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/**
 * Module-level so it survives the section unmounting/remounting as the user
 * navigates the deck. The blur-in entrance plays every mount; we only want the
 * slower, more deliberate version on the very first page load.
 */
let hasLoadedOnce = false;

export function LandingSection() {
  const reduceMotion = useReducedMotion();
  // Stable for this mount: true only on the first ever page load.
  const [isFirstLoad] = useState(() => !hasLoadedOnce);
  useEffect(() => {
    hasLoadedOnce = true;
  }, []);

  // Drive the entrance from a post-mount state flip rather than Motion's
  // initial-mount animation. The deck wraps sections in <AnimatePresence
  // initial={false}> to suppress the section slide on first paint, but that
  // also suppresses any mount/enter animation in the subtree — so on first
  // load the blur-in never ran. A plain `animate` prop change isn't subject to
  // that suppression, so it fires on load and on scroll-back alike.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animateState = shown || reduceMotion ? "show" : "hidden";

  // The first-load entrance is the same blur-in, just stretched out a little.
  // On first load the start times come from the shared INTRO timeline so the
  // landing elements arrive in order (headline → ripples → navbar → logos);
  // scroll-back uses the snappier standalone delays.
  const slow = isFirstLoad;
  const headlineDuration = reduceMotion ? 0 : slow ? 1.2 : 0.7;
  const headlineDelay = reduceMotion ? 0 : slow ? INTRO.headline : 0.5;
  const headlineStagger = reduceMotion ? 0 : slow ? 0.2 : 0.12;
  const logoDuration = reduceMotion ? 0 : slow ? 0.8 : 0.5;
  const logoDelay = reduceMotion ? 0 : slow ? INTRO.logos : 0.75;
  const logoStagger = reduceMotion ? 0 : slow ? 0.12 : 0.08;
  const rippleDelayMs = reduceMotion ? 0 : slow ? INTRO.ripples * 1000 : 300;

  const headline: Variants = {
    hidden: {},
    show: {
      transition: { delayChildren: headlineDelay, staggerChildren: headlineStagger },
    },
  };
  const headlineItem: Variants = {
    hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: headlineDuration, ease: EASE_OUT },
    },
  };

  // Per-item stagger no longer makes sense once the strip is scrolling, so the
  // whole strip just rises + fades in as one unit (kept on the same intro beat
  // as before via logoDelay/logoDuration). Marquee motion is a separate CSS
  // animation that runs forever on the inner track.
  const logoRow: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: logoDuration, delay: logoDelay, ease: EASE_OUT },
    },
  };
  // Silence unused-var when stagger isn't used.
  void logoStagger;

  return (
    <section className="relative h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Ripples — right ~45%, behind the content, hidden on small screens. */}
      <RippleField
        startDelayMs={rippleDelayMs}
        className="pointer-events-none absolute inset-0 z-10 hidden md:block"
      />

      {/* The light-blue wash now lives INSIDE the shader (baseColor +
          baseStrength in lib/ripple.ts) so it paints only on ripple pixels
          — the cream background stays untinted. No overlay needed. */}

      {/* Headline — centered, above the ripples. */}
      <motion.div
        variants={headline}
        initial={reduceMotion ? false : "hidden"}
        animate={animateState}
        className="absolute inset-x-0 top-1/2 z-20 mx-auto max-w-[900px] -translate-y-1/2 px-6 text-center"
      >
        <TypingHeadline
          variants={headlineItem}
          reduceMotion={!!reduceMotion}
          start={animateState === "show"}
          startDelayMs={headlineDelay * 1000}
          className="font-title text-xl italic leading-tight tracking-tight text-brand-900 sm:text-4xl lg:text-5xl"
        />
        <motion.p
          variants={headlineItem}
          className="mt-4 font-heading text-sm text-ink-muted sm:text-lg lg:text-xl"
        >
          Rill, the better way to hire.
        </motion.p>
        <motion.div variants={headlineItem} className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              window.location.href = "mailto:areyoufor@rill.so";
            }}
          >
            Get Early Access
          </Button>
        </motion.div>
      </motion.div>

      {/* Company-logo marquee — strip clipped at the section edges, scrolling
          left→right forever, with macOS-dock-style magnetic magnification on
          the logos near the cursor (see LogoMarquee). The extra top padding is
          headroom so magnified logos aren't clipped by overflow-hidden. */}
      <motion.div
        variants={logoRow}
        initial={reduceMotion ? false : "hidden"}
        animate={animateState}
        aria-label="Trusted by"
        className={
          // inset-x-0 + mx-auto + max-w-* = centered cap. The strip is clipped
          // at this cap's edges, so logos enter/exit there instead of running
          // all the way to the section sides.
          "absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[1100px] overflow-hidden px-4 pb-[6vh] pt-16"
        }
      >
        <LogoMarquee />
      </motion.div>
    </section>
  );
}

export default LandingSection;
