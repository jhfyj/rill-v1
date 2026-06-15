/* ------------------------------------------------------------------ */
/* Ripple system — pure config + spawn helper                          */
/* The look is driven by these constants so it can be workshopped by    */
/* editing DEFAULT_RIPPLE_CONFIG (or passing a partial override into     */
/* <RippleField config={...} />). The ripples are rendered by a WebGL2   */
/* fragment shader (see lib/rippleShader.ts + components/RippleField).   */
/* ------------------------------------------------------------------ */

export interface RippleConfig {
  /* --- spawning --- */
  /** Hard cap on ambient ripples alive at once. */
  maxConcurrent: number;
  /** Random gap between ambient spawns, in ms: [min, max]. */
  spawnIntervalMs: [number, number];
  /** Lifetime of a ripple, in seconds: [min, max]. */
  durationRange: [number, number];
  /**
   * Where ambient ripples may spawn, as fractions (0..1) of the field box.
   * x/y are the ripple's CENTER. (Clicks spawn anywhere, ignoring this.)
   */
  spawnArea: { xMin: number; xMax: number; yMin: number; yMax: number };

  /* --- wave shape (shader) --- */
  /** Outward speed of the wavefront, in CSS px per second. */
  speed: number;
  /** Wave number k (radians per px) — smaller = wider-spaced rings. */
  frequency: number;
  /** Rings per ripple, scaled by its size: [smallest ripple, largest ripple]. */
  ringCountRange: [number, number];
  /** Wave amplitude/strength: [min, max] (drives slope → contrast). */
  strengthRange: [number, number];
  /** Fraction of lifetime (0..1) at which the ripple begins fading out. */
  fadeStart: number;

  /* --- lighting (shader) --- */
  /** How steeply the wave slope tilts the surface normal. */
  slopeScale: number;
  /** Directional light, [x, y, z] (need not be normalized). */
  lightDir: [number, number, number];
  /** Specular exponent — higher = tighter, glintier highlights. */
  shininess: number;
  /** Diffuse contrast → highlight/shadow alpha. */
  gain: number;
  /** Specular highlight strength → extra white alpha. */
  specGain: number;
  /** Shadow alpha multiplier (0 = no visible shadows). */
  shadowStrength: number;
  /** Highlight colour, RGB 0..1 (light blue tints the bright crests). */
  highlightColor: [number, number, number];
  /** Shadow colour, RGB 0..1 (the blue "filter" on the troughs). */
  shadowColor: [number, number, number];
  /**
   * Calm-water base tint, RGB 0..1 — the light blue each ripple washes out to.
   * Without it the flat parts of a ripple fade to transparent, and thin blue
   * over the warm cream reads grey; the base wash makes the fade end in light
   * blue instead. Keep it a saturated light blue (low R, B maxed).
   */
  baseColor: [number, number, number];
  /** Strength of the base wash (0 = off, fades to transparent like before). */
  baseStrength: number;
  /** Master opacity multiplier on the whole effect (0..1). */
  opacity: number;
}

export const DEFAULT_RIPPLE_CONFIG: RippleConfig = {
  maxConcurrent: 5,
  spawnIntervalMs: [600, 1000],
  durationRange: [3, 4],
  // Centers spawn across the full viewport, lightly inset from each edge.
  spawnArea: { xMin: 0.05, xMax: 0.95, yMin: 0.1, yMax: 0.9 },

  speed: 54,
  frequency: 0.13,
  ringCountRange: [1, 2],
  strengthRange: [0.6, 1.0],
  fadeStart: 0.04,

  slopeScale: 6.0,
  lightDir: [-0.55, 0.6, 0.6],
  shininess: 40,
  // Higher gain gives the EXPANDED rings more coverage. As a ring grows its
  // slope flattens, alpha falls, and a thin blue layer over warm cream washes
  // out to grey — more gain keeps enough blue in the wide rings to read as blue.
  gain: 4,
  specGain: 0.35,
  shadowStrength: 0.5,
  // Same cornflower hue (~218°) at full HSL saturation as before, but LIGHTER:
  // lightness was raised while hue + saturation held, so they read as a lighter
  // blue without losing vibrance. Lightening fully-saturated blue lifts R/G
  // together (B stays maxed), so these aren't grey — the high opacity keeps the
  // lighter colours covered enough to stay blue. Crest lighter than trough.
  highlightColor: [0.66, 0.78, 1.0],
  shadowColor: [0, 0.4, 1.0],
  // The light blue a ripple settles/washes out to (saturated so it doesn't grey
  // over the cream). baseStrength sets how much of this wash sits under the
  // wave shading; 0 reverts to the old fade-to-transparent behaviour.
  baseColor: [0.1, 0.1, 1.0],
  baseStrength: 0.5,
  opacity: 0.8,
};

export interface RippleInstance {
  id: string;
  /** Center position as a fraction (0..1) of the field box. */
  x: number;
  y: number;
  /** Wave amplitude/strength. */
  strength: number;
  /** Lifetime in seconds. */
  duration: number;
  /** Rings to show — derived from this ripple's size. */
  rings: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Build one ripple from the (already-merged) config. Position is random within
 * the config's spawnArea, unless `pos` (x/y as 0..1 fraction of the field) is
 * given — e.g. to spawn one exactly where the user clicked. `birth` (spawn
 * time) is stamped by the renderer when the ripple is pushed.
 */
export function makeRipple(
  cfg: RippleConfig,
  pos?: { x: number; y: number }
): RippleInstance {
  const { spawnArea, strengthRange, durationRange, ringCountRange } = cfg;
  const duration = rand(durationRange[0], durationRange[1]);
  // Size ∝ duration (radius = speed × duration), so scale rings with it:
  // bigger/longer ripples get more rings, smaller ones fewer.
  const sizeT =
    durationRange[1] > durationRange[0]
      ? (duration - durationRange[0]) / (durationRange[1] - durationRange[0])
      : 0;
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    x: pos ? pos.x : rand(spawnArea.xMin, spawnArea.xMax),
    y: pos ? pos.y : rand(spawnArea.yMin, spawnArea.yMax),
    strength: rand(strengthRange[0], strengthRange[1]),
    duration,
    rings: lerp(ringCountRange[0], ringCountRange[1], sizeT),
  };
}
