import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";

/** Headline typewriter — the first line is fixed; the second line ("Not …")
 *  cycles through these phrases, typing in and deleting out. */
const LINE_1 = "What you can do.";
/** Static lead-in on line 2, typed out before the cycling phrase begins. */
const PREFIX = "Not ";
const PHRASES = [
  "what you can fit on paper.",
  "what you say in interviews.",
  "what you have on resume.",
  "who you know.",
  "what you've done already.",
];
const TYPE_MS = 55; // per-char typing delay
const DELETE_MS = 28; // per-char deleting delay
const HOLD_MS = 1900; // pause once a phrase is fully typed
const GAP_MS = 300; // pause after deleting, before the next phrase

/** Default headline styling (matches the original Section 2 look). */
const DEFAULT_CLASS =
  "font-title text-4xl italic leading-tight text-brand-900 sm:text-4xl lg:text-5xl";

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
 * A headline that types itself out on appear. Line 1 ("What you can do.") types
 * once and stays; line 2 keeps the static prefix "Not " and cycles the remainder
 * through PHRASES — typing each in, holding, deleting, then the next. Both lines
 * reserve their height (min-h) so the centred block never jumps.
 *
 * Reused across sections: pass `className` to restyle the heading, `start` to
 * gate when typing begins, and `startDelayMs` to wait out an entrance animation
 * before the first character appears.
 */
export function TypingHeadline({
  variants,
  reduceMotion,
  start,
  className = DEFAULT_CLASS,
  startDelayMs = 0,
}: {
  variants?: Variants;
  reduceMotion: boolean;
  start: boolean;
  className?: string;
  startDelayMs?: number;
}) {
  const [line1, setLine1] = useState(reduceMotion ? LINE_1 : "");
  const [phrase, setPhrase] = useState(reduceMotion ? PHRASES[0] : "");
  // The "Not " lead-in, typed out char-by-char once line 2 begins.
  const [prefix, setPrefix] = useState(reduceMotion ? PREFIX : "");
  // Whether the "Not …" line has begun (line 1 finished typing).
  const [secondStarted, setSecondStarted] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion || !start) return;
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    async function run() {
      // Hold off until any entrance animation has settled.
      if (startDelayMs > 0) await wait(startDelayMs);
      if (cancelled) return;

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

      // 2. Type the static "Not " lead-in once; it stays put while phrases cycle.
      for (let i = 1; i <= PREFIX.length; i++) {
        if (cancelled) return;
        setPrefix(PREFIX.slice(0, i));
        await wait(TYPE_MS);
      }

      // 3. Cycle the second line forever.
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
  }, [start, reduceMotion, startDelayMs]);

  return (
    <motion.h2
      variants={variants}
      aria-label={`${LINE_1} Not ${PHRASES[0]}`}
      className={className}
      style={{ textShadow: "0 2px 20px rgba(255, 255, 255, 0.55)" }}
    >
      <span aria-hidden className="block min-h-[1.25em] whitespace-nowrap">
        {line1}
        {!secondStarted && !reduceMotion && <Caret />}
      </span>
      <span aria-hidden className="block min-h-[1.25em] whitespace-nowrap">
        {secondStarted && (
          <>
            {prefix}
            {phrase}
            {!reduceMotion && <Caret />}
          </>
        )}
      </span>
    </motion.h2>
  );
}

export default TypingHeadline;
