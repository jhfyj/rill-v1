import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSectionNavigationOptions {
  /** Total number of sections. */
  count: number;
  /** Cooldown after a transition during which input is ignored (ms). */
  lockMs?: number;
  /** Minimum |deltaY| for a wheel event to count as intent. */
  wheelThreshold?: number;
  /** When false, all gesture handling is disabled. */
  enabled?: boolean;
}

export interface SectionNavigation {
  index: number;
  /** Last travel direction: 1 = forward/down, -1 = backward/up. */
  direction: 1 | -1;
  /** Jump to a section (clamped). Public API for navbar links. */
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
}

/**
 * Drives a full-page section deck: wheel / keyboard / touch gestures each
 * advance or retreat exactly one section. A ref-based lock guarantees one
 * gesture = one transition even though wheel events fire in rapid bursts.
 * Hard-stops at the first and last section (no wraparound).
 */
export function useSectionNavigation({
  count,
  lockMs = 800,
  wheelThreshold = 20,
  enabled = true,
}: UseSectionNavigationOptions): SectionNavigation {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // index mirror for use inside event listeners without re-binding them.
  const indexRef = useRef(0);
  const isLockedRef = useRef(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    isLockedRef.current = true;
    if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    lockTimeoutRef.current = setTimeout(() => {
      isLockedRef.current = false;
    }, lockMs);
  }, [lockMs]);

  const move = useCallback(
    (target: number, dir: 1 | -1) => {
      if (isLockedRef.current) return;
      const cur = indexRef.current;
      const clamped = Math.max(0, Math.min(count - 1, target));
      if (clamped === cur) return; // hard stop at the ends — don't even lock
      indexRef.current = clamped;
      setDirection(dir);
      setIndex(clamped);
      lock();
    },
    [count, lock]
  );

  const next = useCallback(() => move(indexRef.current + 1, 1), [move]);
  const prev = useCallback(() => move(indexRef.current - 1, -1), [move]);
  const goTo = useCallback(
    (i: number) => move(i, i > indexRef.current ? 1 : -1),
    [move]
  );

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < wheelThreshold) return;
      e.preventDefault();
      move(indexRef.current + (e.deltaY > 0 ? 1 : -1), e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable)
        return;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case " ":
          if (tag === "BUTTON" || tag === "A") return; // let Space activate the control
          e.preventDefault();
          next();
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(count - 1);
          break;
      }
    };

    let touchStartY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY === null) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - endY;
      if (Math.abs(delta) > 50) {
        const dir = delta > 0 ? 1 : -1;
        move(indexRef.current + dir, dir);
      }
      touchStartY = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, wheelThreshold, count, move, next, prev, goTo]);

  // Clear the lock timer on unmount.
  useEffect(
    () => () => {
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    },
    []
  );

  return { index, direction, goTo, next, prev };
}

export default useSectionNavigation;
