/**
 * Tiny shared store for the "next letter to spawn" in the philosophy section.
 *
 * The cursor (CustomCursor, "leaf" mode) previews this letter; a click in the
 * LeafField spawns it and then advances to a fresh random letter, which
 * re-renders the cursor preview. Both sides subscribe so they never disagree.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A uniformly random uppercase A–Z letter. */
export const randomLetter = (): string =>
  ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

let current = randomLetter();
const listeners = new Set<(letter: string) => void>();

/** The letter a click would spawn right now (and the cursor previews). */
export const getNextLetter = (): string => current;

/** Roll a new next letter, notify subscribers, and return it. */
export const advanceLetter = (): string => {
  current = randomLetter();
  for (const fn of listeners) fn(current);
  return current;
};

/** Subscribe to next-letter changes. Returns an unsubscribe fn. */
export const subscribeNextLetter = (fn: (letter: string) => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
