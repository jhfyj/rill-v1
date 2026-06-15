import { useState } from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { INTRO } from "../lib/intro";
import { cn } from "../lib/cn";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Companies", href: "#" },
  { label: "About", href: "#" },
];

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
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Center links blur in as the bar expands.
  const linkContainer: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduceMotion ? 0 : INTRO.navbar + 0.85,
        staggerChildren: reduceMotion ? 0 : 0.09,
      },
    },
  };
  const linkItem: Variants = {
    hidden: { opacity: 0, filter: "blur(8px)" },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0 : 0.55, ease: "easeOut" },
    },
  };

  return (
    <header className="sticky top-1 z-50 px-4 pt-4">
      <motion.nav
        initial={reduceMotion ? false : { opacity: 0, y: 24, maxWidth: COMPACT_WIDTH }}
        animate={{ opacity: 1, y: 0, maxWidth: FULL_WIDTH }}
        transition={{ opacity: riseTransition, y: riseTransition, maxWidth: expandTransition }}
        className={cn("mx-auto w-full rounded-pill")}
      >
        {/* Bar — logo + actions live in flow (flex, auto spacing); the center
            links are absolutely centered so they reserve no space. While the
            frame is compact the logo + buttons are wider than it, so the
            buttons spill past the right edge until it expands to full width. */}
        <div className="relative flex items-center justify-between gap-4 px-2 py-2">
          {/* Logo (left) */}
          <Logo className="pl-3 font-title text-2xl tracking-[0.15em] text-brand-800" />

          {/* Center links — absolutely centered; blur in as the bar expands */}
          <motion.ul
            variants={linkContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-12 md:flex"
          >
            {NAV_LINKS.map((link) => (
              <motion.li key={link.label} variants={linkItem}>
                <a
                  href={link.href}
                  className="font-heading text-[15px] text-ink transition-colors hover:text-brand-700"
                >
                  {link.label}
                </a>
              </motion.li>
            ))}
          </motion.ul>

          {/* Actions (right) — desktop buttons, or the mobile hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 md:flex">
              <Button variant="primary">Join the Waitlist</Button>
            </div>
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-800 transition-colors hover:bg-brand-50 md:hidden"
            >
              <HamburgerIcon open={open} />
            </button>
          </div>
        </div>

      </motion.nav>

      {/* Full-screen mobile menu — solid background so nothing shows through.
          Rendered outside <motion.nav> so the nav's animated transform doesn't
          become the containing block for this `fixed` overlay. */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#fbfaf7] md:hidden">
          {/* Top row mirrors the bar: logo + close button. */}
          <div className="flex items-center justify-between px-7 pt-5">
            <Logo className="font-title text-2xl tracking-[0.15em] text-brand-800" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-800 transition-colors hover:bg-brand-50"
            >
              <HamburgerIcon open />
            </button>
          </div>

          {/* Links — large, vertically centred. */}
          <nav className="flex flex-1 flex-col justify-center gap-2 px-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 font-title text-4xl text-brand-900 transition-colors hover:text-brand-700"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA pinned to the bottom. */}
          <div className="px-7 pb-10">
            <Button variant="primary" size="lg" className="w-full">
              Join the Waitlist
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

export default Navbar;
