import { motion, useReducedMotion, type Transition } from "motion/react";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { INTRO } from "../lib/intro";
import { cn } from "../lib/cn";

/** Width of the bar before / after it expands on load. In compact mode the
 *  frame is narrower than the logo + buttons, so the buttons spill past its
 *  right edge until it expands out to full width. */
const COMPACT_WIDTH = 400;
const FULL_WIDTH = 1100;

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
// The navbar is stage 3 of the load choreography (after the ripples start), so
// its whole entrance is offset by INTRO.navbar. See lib/intro.ts.
// 1. compact bar fades in + rises into place
const riseTransition: Transition = { duration: 0.55, ease: EASE_OUT, delay: INTRO.navbar };
// 2. after a beat, it expands outward to full width
const expandTransition: Transition = { duration: 0.65, ease: EASE_OUT, delay: INTRO.navbar + 0.7 };

export function Navbar() {
  const reduceMotion = useReducedMotion();

  return (
    <header className="sticky top-1 z-50 px-4 pt-4">
      <motion.nav
        initial={reduceMotion ? false : { opacity: 0, y: 24, maxWidth: COMPACT_WIDTH }}
        animate={{ opacity: 1, y: 0, maxWidth: FULL_WIDTH }}
        transition={{ opacity: riseTransition, y: riseTransition, maxWidth: expandTransition }}
        className={cn("mx-auto w-full rounded-pill")}
      >
        {/* Bar — logo (left) + CTA (right) in flow. While the frame is compact
            the logo + button are wider than it, so the button spills past the
            right edge until it expands to full width. The CTA shows on all
            screen sizes (no pages yet, so no nav menu). */}
        <div className="relative flex items-center justify-between gap-4 px-2 py-2">
          {/* Logo (left) */}
          <Logo className="pl-3 font-title text-2xl tracking-[0.15em] text-brand-800" />

          {/* CTA (right) */}
          <Button
            variant="primary"
            size="responsive"
            onClick={() => {
              window.location.href = "mailto:areyoufor@rill.so";
            }}
          >
            Get Early Access
          </Button>
        </div>
      </motion.nav>
    </header>
  );
}

export default Navbar;
