import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { CenterBlob } from "../components/CenterBlob";
import { LeafField } from "../components/LeafField";
import { LetterCascade } from "../components/LetterCascade";

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

interface PhilosophySectionProps {
  /** Called when the user scrolls to the very bottom — advance to next section. */
  onNext?: () => void;
}

/**
 * Section 2 — a soft, low-opacity multi-colour bubble pinned to the centre
 * of the section, viewed through a fractal-glass strip overlay.
 *
 * Desktop: fixed two-column layout, centred vertically, no inner scroll.
 * Mobile: content starts at 20% VPH, scrolls within the section, top/bottom
 *         fade masks, and advances to the next section when the user reaches
 *         the bottom of the content.
 *
 * Touch events on the scroll container are stopped from bubbling to the
 * window so the deck's global touchend handler never sees them — preventing
 * an immediate jump to Section 3 on the first swipe.
 */
export function PhilosophySection({ onNext }: PhilosophySectionProps) {
  const reduceMotion = useReducedMotion();

  // Disable LeafField rAF loop on mobile.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
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

  // ── Mobile scroll logic ───────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  // Prevent firing onNext more than once per visit to the section.
  const nextFiredRef = useRef(false);
  // Dwell timer: armed when the user first reaches the bottom.
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the scroll container is currently at the bottom.
  const atBottomRef = useRef(false);

  // Reset state whenever the section becomes active (re-mounts).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    nextFiredRef.current = false;
    atBottomRef.current = false;
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  // NOTE: touch stopPropagation is now handled inside the extra-swipe
  // useEffect below, which combines both concerns in one listener set.

  // Detect reaching the bottom and arm the trigger after a 600ms dwell.
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;

      if (atBottom && !atBottomRef.current) {
        // Just arrived at the bottom — start the dwell timer.
        atBottomRef.current = true;
        dwellTimerRef.current = setTimeout(() => {
          // Dwell complete: clear the ref to null so the overscroll
          // condition (dwellTimerRef.current === null) becomes true.
          dwellTimerRef.current = null;
        }, 600);
      } else if (!atBottom) {
        // Scrolled back up — cancel everything.
        atBottomRef.current = false;
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, [isMobile]);

  // Touch handling:
  // - Always stopPropagation so the deck never sees mid-content swipes.
  // - Exception: upward swipe (delta < -40px) when already at the TOP of
  //   the scroll container — let it propagate so the deck can go back to
  //   Section 1.
  // - Downward overscroll at the bottom (after 600ms dwell) fires onNext.
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;

    let swipeStartY: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      swipeStartY = e.touches[0]?.clientY ?? null;
      // Always stop propagation on touchstart to prevent deck interference.
      e.stopPropagation();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (swipeStartY === null) {
        e.stopPropagation();
        return;
      }
      const endY = e.changedTouches[0]?.clientY ?? swipeStartY;
      const delta = swipeStartY - endY; // positive = swipe up (scroll down)
      swipeStartY = null;

      const atTop = el.scrollTop < 4;

      // Upward swipe at the very top — let the deck handle it (go back).
      if (atTop && delta < -40) {
        // Do NOT stopPropagation — the deck's window touchend listener
        // will see this and navigate back to Section 1.
        return;
      }

      // All other swipes: stop propagation so the deck is never triggered.
      e.stopPropagation();

      // Downward overscroll at the bottom — advance to Section 3.
      if (
        atBottomRef.current &&
        dwellTimerRef.current === null &&
        delta > 30 &&
        !nextFiredRef.current
      ) {
        nextFiredRef.current = true;
        onNext?.();
        setTimeout(() => {
          nextFiredRef.current = false;
          atBottomRef.current = false;
        }, 1500);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, onNext]);

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

  return (
    <section className="relative h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Drifting background letters — desktop only. */}
      {!isMobile && <LeafField className="absolute inset-0 z-[5]" />}

      {/* Centre blob — wobble + ripples disabled on mobile (see CenterBlob). */}
      <CenterBlob className="absolute inset-0 z-10" />

      {/* <Strips /> — temporarily disabled */}

      {isMobile ? (
        // ── Mobile: scrollable container starting at 20% VPH ──────────────
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Scroll container — touch events stop here, never reach the deck */}
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto pointer-events-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* 20% VPH top spacer so content starts below the fold */}
            <div style={{ height: "20vh" }} aria-hidden />
            <div className="px-6 pb-20">
              {content}
            </div>
          </div>

          {/* Top fade — covers content scrolling under the top edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10"
            style={{
              height: "22vh",
              background:
                "linear-gradient(to bottom, #fbfaf7 40%, transparent 100%)",
            }}
          />

          {/* Bottom fade — covers content approaching the bottom edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
            style={{
              height: "14vh",
              background:
                "linear-gradient(to top, #fbfaf7 30%, transparent 100%)",
            }}
          />
        </div>
      ) : (
        // ── Desktop: original centred absolute layout ─────────────────────
        <div className="absolute inset-0 z-30 flex items-center justify-center px-[8vw]">
          {content}
        </div>
      )}
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
          >
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
