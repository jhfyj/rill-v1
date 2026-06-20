import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { FauxSphere } from "../components/FauxSphere";
import { CompanyDetailPanel } from "../components/CompanyDetailPanel";

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Open width of the detail panel (px). */
const PANEL_W = 460;

/**
 * Section 3 — integrations / hiring showcase. A faux integration sphere (a
 * looping dot+card lattice warped into a dome — see FauxSphere) lives in the
 * left column; clicking a card opens a detail panel that sits BESIDE it at the
 * same level (a split layout, not an overlay): an in-flow spacer pushes the
 * sphere area smaller (re-centering the dome), and the panel itself is portaled
 * to <body> so it can paint above the app's navbar. Hovering a card stops the
 * rotation and dims the rest; clicking the canvas (or the back arrow) closes.
 */
export function FauxSphereSection() {
  const reduceMotion = useReducedMotion();

  // Post-mount state flip so the heading entrance plays on every re-entry — the
  // deck's <AnimatePresence> suppresses nested mount animations, but a plain
  // `animate` prop change isn't subject to that. Same pattern as the other sections.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animateState = shown || reduceMotion ? "show" : "hidden";

  // A card is active (hovered or locked) — used to fade the heading out.
  const [cardActive, setCardActive] = useState(false);

  // Detail panel. Opens on card click; Esc closes.
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const textGroup: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduceMotion ? 0 : 0.2,
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };
  const textItem: Variants = {
    hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT },
    },
  };

  const panelTransition: Transition = {
    type: "tween",
    duration: 0.45,
    ease: EASE_OUT,
  };

  return (
    <section className="relative flex h-full w-full overflow-hidden bg-[#fbfaf7]">
      {/* Left column — sphere + heading. Flex-1 so it shrinks when the spacer
          opens; FauxSphere's ResizeObserver then re-centers the dome. Clicking
          anywhere here (the canvas) closes the panel; card clicks stop their
          propagation so they don't also close it. */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={() => setPanelOpen(false)}
      >
        <FauxSphere
          className="pointer-events-none absolute inset-0 z-10"
          onCardClick={() => setPanelOpen(true)}
          frozen={panelOpen}
          onActiveChange={setCardActive}
        />

        {/* Centered two-tone heading — pointer-events-none so it doesn't block
            hovering/clicking the cards beneath it. While a card is active
            (hovered/locked) the text fades out and the feathered blur dissolves
            to focus on that card. The blur layer animates its blur RADIUS (not
            opacity) — animating opacity on a backdrop-filter element forces a
            slow non-GPU recomposite (the blur visibly lags ~seconds), whereas
            the radius interpolates cleanly and stays glued to the text. */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-[8vw] text-center">
          <div className="relative">
            {/* Feathered blur backdrop — sits behind the text, extends past it,
                and fades to nothing via a radial mask so there's no box edge. */}
            <motion.div
              aria-hidden
              className="absolute inset-0 -m-[10vw]"
              style={{
                maskImage:
                  "radial-gradient(ellipse 60% 60% at 50% 50%, #000 35%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 60% 60% at 50% 50%, #000 35%, transparent 75%)",
              }}
              initial={false}
              animate={{
                backdropFilter: cardActive ? "blur(0px)" : "blur(12px)",
                backgroundColor: cardActive
                  ? "rgba(251,250,247,0)"
                  : "rgba(251,250,247,0.3)",
              }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            />

            {/* Text — fades on hover (cheap opacity, no backdrop-filter here). */}
            <motion.div
              className="relative"
              animate={{ opacity: cardActive ? 0 : 1 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <motion.div
                variants={textGroup}
                initial={reduceMotion ? false : "hidden"}
                animate={animateState}
              >
                <motion.h2
                  variants={textItem}
                  className="max-w-3xl font-title text-3xl leading-tight text-brand-900 sm:text-3xl lg:text-5xl"
                  style={{ textShadow: "0 2px 20px rgba(255,255,255,0.55)" }}
                >
                  Let us match you with the fastest growing teams
                  <span className="mt-3 block font-body text-[18px] font-normal text-[#B4B4B4]">
                    {/* Desktop uses cursor-lead rotation; touch/mobile uses a
                        two-finger drag — so the verb changes by viewport. */}
                    <span className="hidden md:inline">Move your cursor</span>
                    <span className="md:hidden">Drag</span>{" "}
                    and click to discover the latest teams hiring now
                  </span>
                </motion.h2>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* In-flow spacer — reserves the panel's width so the sphere shrinks /
          re-centers. The visible panel is portaled to <body> (below). */}
      <motion.div
        className="shrink-0"
        initial={false}
        animate={{ width: panelOpen ? PANEL_W : 0 }}
        transition={panelTransition}
      />

      {/* Detail panel — portaled to <body> so its stacking context is above the
          navbar; slides in from the right over the spacer. */}
      {createPortal(
        <AnimatePresence>
          {panelOpen && (
            <motion.aside
              key="company-panel"
              className="fixed right-0 top-0 z-[60] h-screen overflow-hidden border-l border-black/10 bg-white shadow-1xl"
              style={{ width: PANEL_W }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={panelTransition}
              onWheel={(e) => e.stopPropagation()}
            >
              <CompanyDetailPanel onClose={() => setPanelOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}

export default FauxSphereSection;
