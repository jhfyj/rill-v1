import type { ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Direction-aware vertical slide: forward pushes the deck up, back pushes it down. */
const slideVariants: Variants = {
  enter: (dir: 1 | -1) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (dir: 1 | -1) => ({ y: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

/** Reduced-motion fallback: a plain crossfade in place. */
const fadeVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

interface SectionDeckProps {
  sections: ReactNode[];
  index: number;
  direction: 1 | -1;
}

/**
 * Full-viewport deck that swaps the active section with a transition. Native
 * scroll should be locked (see index.css) — navigation is driven externally by
 * useSectionNavigation, which feeds `index` and `direction` here.
 */
export function SectionDeck({ sections, index, direction }: SectionDeckProps) {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? fadeVariants : slideVariants;
  const transition: Transition = reduceMotion
    ? { duration: 0.2, ease: "easeInOut" }
    : { duration: 0.8, ease: EASE_OUT };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="absolute inset-0"
        >
          {sections[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default SectionDeck;
