import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "../lib/cn";

/**
 * Letter-by-letter "roll" on hover, GSAP-style: each character slides up and
 * out while an identical copy rolls up from below into its place, staggered
 * left-to-right. The text is the same before and after.
 *
 * It does NOT manage its own hover — it reads the `rest` / `hover` variant
 * label from the nearest motion ancestor (a <Button>, motion.a, etc.), so the
 * whole clickable area triggers the animation, not just the glyphs.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DURATION = 0.4;
const STAGGER = 0.025;

const transition = (i: number) => ({ duration: DURATION, ease: EASE, delay: i * STAGGER });

const topVariants: Variants = {
  rest: (i: number) => ({ y: "0%", transition: transition(i) }),
  hover: (i: number) => ({ y: "-110%", transition: transition(i) }),
};

const bottomVariants: Variants = {
  rest: (i: number) => ({ y: "110%", transition: transition(i) }),
  hover: (i: number) => ({ y: "0%", transition: transition(i) }),
};

const NBSP = " ";

export interface AnimatedTextProps {
  text: string;
  className?: string;
}

export function AnimatedText({ text, className }: AnimatedTextProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      aria-label={text}
      className={cn(
        // Flex row + items-center centres the glyph boxes regardless of font
        // size — `inline-block` + `overflow-hidden` shifts the baseline, which
        // left vertical centring off (most visible on the small button).
        "relative inline-flex items-center whitespace-nowrap align-middle",
        className,
      )}
    >
      {text.split("").map((char, i) => {
        const glyph = char === " " ? NBSP : char;
        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-block overflow-hidden align-middle"
          >
            <motion.span className="inline-block" custom={i} variants={topVariants}>
              {glyph}
            </motion.span>
            <motion.span
              className="absolute left-0 top-0 inline-block"
              custom={i}
              variants={bottomVariants}
            >
              {glyph}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export default AnimatedText;
