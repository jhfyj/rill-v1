import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { GradientFlow } from "../components/GradientFlow";
import { Button } from "../components/Button";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Current time in New York (HH:MM:SS, 24h). DST handled by the time zone. */
function formatNewYork(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** Ticks every second, kept in sync with New York wall-clock time. */
function useNewYorkClock(): string {
  const [time, setTime] = useState(formatNewYork);
  useEffect(() => {
    const id = setInterval(() => setTime(formatNewYork()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/**
 * Section 4 — the closing call-to-action. A flowing gradient-shader background
 * (see GradientFlow) churns pastel colours behind a left-aligned headline +
 * waitlist button, with a footer row (contact / copyright / New York clock)
 * pinned to the bottom.
 */
export function FinaleSection() {
  const reduceMotion = useReducedMotion();
  const clock = useNewYorkClock();

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Post-mount state flip so the entrance plays on every re-entry (the deck's
  // <AnimatePresence> suppresses nested mount animations). Same as the others.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animateState = shown || reduceMotion ? "show" : "hidden";

  const group: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduceMotion ? 0 : 0.2,
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT },
    },
  };

  // ── Mobile: plain block layout ───────────────────────────────────────────
  if (isMobile) {
    return (
      <section className="relative w-full h-full overflow-hidden bg-[#fbfaf7] flex flex-col items-start justify-center px-6 py-16">
        <GradientFlow className="absolute inset-0 z-0" />
        <motion.div
          variants={group}
          initial={reduceMotion ? false : "hidden"}
          animate={animateState}
          className="relative z-10 flex flex-col items-start"
        >
          <motion.h2
            variants={item}
            className="max-w-xs font-title text-4xl leading-tight text-brand-900"
            style={{ textShadow: "0 2px 24px rgba(255,255,255,0.5)" }}
          >
            <span className="italic">Your next role</span> starts with us
          </motion.h2>
          <motion.p
            variants={item}
            className="mt-5 font-heading text-base text-ink-muted"
            style={{ textShadow: "0 1px 12px rgba(255,255,255,0.55)" }}
          >
            Book a meeting with us and get started today
          </motion.p>
          <motion.div variants={item} className="mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={() => { window.location.href = "mailto:areyoufor@rill.so"; }}
            >
              Get Early Access
            </Button>
          </motion.div>
        </motion.div>
        <motion.footer
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: shown || reduceMotion ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.6, ease: EASE_OUT }}
          className="relative z-10 mt-16 flex flex-col gap-2 font-body text-[11px] text-brand-50/70"
        >
          <a href="mailto:areyoufor@rill.so" className="hover:text-brand-50">
            areyoufor@rill.so
          </a>
          <span className="uppercase tracking-[0.18em]">©2026 All Rights Reserved</span>
          <span className="whitespace-nowrap uppercase tracking-[0.18em] tabular-nums">
            New&nbsp;York&nbsp;&nbsp;•&nbsp;&nbsp;{clock}
          </span>
        </motion.footer>
      </section>
    );
  }

  // ── Desktop: original absolute layout ────────────────────────────────────
  return (
    <section className="relative h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Flowing gradient-shader background. The cream bg above is a static
          fallback for browsers without WebGL2. */}
      <GradientFlow className="absolute inset-0 z-0" />

      {/* Left-aligned headline + CTA, vertically centred. */}
      <motion.div
        variants={group}
        initial={reduceMotion ? false : "hidden"}
        animate={animateState}
        className="absolute inset-0 z-10 flex flex-col items-start justify-center px-[9vw]"
      >
        <motion.h2
          variants={item}
          className="max-w-3xl font-title text-5xl leading-tight text-brand-900 sm:text-6xl"
          style={{ textShadow: "0 2px 24px rgba(255,255,255,0.5)" }}
        >
          <span className="italic">Your next role</span> starts with us
        </motion.h2>
        <motion.p
          variants={item}
          className="mt-5 font-heading text-lg text-ink-muted sm:text-xl"
          style={{ textShadow: "0 1px 12px rgba(255,255,255,0.55)" }}
        >
          Book a meeting with us and get started today
        </motion.p>
        <motion.div variants={item} className="mt-8">
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

      {/* Footer — contact / copyright / New York clock. */}
      <motion.footer
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: shown || reduceMotion ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.6, ease: EASE_OUT }}
        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 px-[9vw] pb-7 font-body text-[10px] text-brand-50/70 sm:text-xs lg:text-[13px]"
      >
        <span className="flex-1">
          <a href="mailto:areyoufor@rill.so" className="hover:text-brand-50">
            areyoufor@rill.so
          </a>
        </span>
        <span className="flex-1 text-center uppercase tracking-[0.18em]">
          ©2026 All Rights Reserved
        </span>
        <span className="flex-1 whitespace-nowrap text-right uppercase tracking-[0.18em] tabular-nums">
          New&nbsp;York&nbsp;&nbsp;•&nbsp;&nbsp;{clock}
        </span>
      </motion.footer>
    </section>
  );
}

export default FinaleSection;
