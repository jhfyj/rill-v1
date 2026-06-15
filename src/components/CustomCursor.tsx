import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { getNextLetter, subscribeNextLetter } from "../lib/nextLetter";

export type CursorMode = "dot" | "leaf";

interface CustomCursorProps {
  /** "dot" everywhere, "leaf" while Section 2 is the active deck section. */
  mode?: CursorMode;
}

/* ------------------------------------------------------------------ */
/* Shared footprint + dot-mode constants                               */
/* ------------------------------------------------------------------ */
/** Both modes share the same outer box so swaps don't resize the cursor. */
const SIZE = 32;
/** Vibrant blue dot core / glow colour. */
const DOT_COLOR = "#718be0";
/** Circle diameter as a fraction of SIZE (the rest is glow headroom). */
const DOT = SIZE * 0.56;
/** Soft blue halo behind the dot. */
const DOT_GLOW_BLUR = SIZE * 0.1;
const DOT_GLOW_OPACITY = 0.6;
const RIM = "1px solid rgba(255,255,255,0.9)";

/* ------------------------------------------------------------------ */
/* Leaf-mode constants — Times New Roman preview of the next letter     */
/* ------------------------------------------------------------------ */
/** Colour of the previewed letter glyph. */
const LETTER_COLOR = "#3a47b8";
/** Serif stack matching the spawned letters in LeafField. */
const LETTER_FONT = '"Times New Roman", Times, serif';

const circleStyle = (size: number): React.CSSProperties => ({
  position: "absolute",
  left: "50%",
  top: "50%",
  width: size,
  height: size,
  transform: "translate(-50%, -50%)",
  borderRadius: "9999px",
});

/**
 * A custom pointer for the site. By default a glowing blue dot (`mode="dot"`);
 * switches to a Times New Roman glyph previewing the next letter to spawn
 * (`mode="leaf"`) while Section 2 is the active deck section. Only shown on
 * fine-pointer (mouse) devices; the native cursor is hidden via index.css.
 * Mounted once at the app root so it sits above every section.
 */
export function CustomCursor({ mode = "dot" }: CustomCursorProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // A little spring lag gives it a fluid feel; instant for reduced motion.
  const sx = useSpring(x, { damping: 28, stiffness: 500, mass: 0.4 });
  const sy = useSpring(y, { damping: 28, stiffness: 500, mass: 0.4 });
  const px = reduceMotion ? x : sx;
  const py = reduceMotion ? y : sy;

  const [visible, setVisible] = useState(false);

  // The letter a click would spawn next — kept in sync with LeafField via the
  // shared nextLetter store. Only rendered in "leaf" mode.
  const [nextLetter, setNextLetter] = useState(getNextLetter);
  useEffect(() => subscribeNextLetter(setNextLetter), []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const hide = () => setVisible(false);
    window.addEventListener("mousemove", move);
    document.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden md:block"
      style={{
        x: px,
        y: py,
        width: SIZE,
        height: SIZE,
        marginLeft: -SIZE / 2,
        marginTop: -SIZE / 2,
      }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {mode === "leaf" ? (
        // Preview of the next letter a click will spawn, in the same serif
        // face the spawned letters use.
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: LETTER_FONT,
            fontSize: SIZE * 0.78,
            lineHeight: 1,
            color: LETTER_COLOR,
            textShadow: "0 1px 6px rgba(255,255,255,0.7)",
            userSelect: "none",
          }}
        >
          {nextLetter}
        </span>
      ) : (
        <>
          {/* Soft halo behind the core. */}
          <span
            style={{
              ...circleStyle(DOT),
              background: DOT_COLOR,
              border: RIM,
              filter: `blur(${DOT_GLOW_BLUR}px)`,
              opacity: DOT_GLOW_OPACITY,
            }}
          />
          {/* Glassy core — translucent white lets the coloured glow read through. */}
          <span
            style={{
              ...circleStyle(DOT),
              opacity: 0.8,
            }}
          />
        </>
      )}
    </motion.div>
  );
}

export default CustomCursor;
