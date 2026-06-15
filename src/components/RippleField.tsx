import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import {
  DEFAULT_RIPPLE_CONFIG,
  makeRipple,
  type RippleConfig,
} from "../lib/ripple";
import { MAX_RIPPLES, VERT_SRC, FRAG_SRC, createProgram } from "../lib/rippleShader";

/** Render buffer scale vs. CSS pixels. <1 trades sharpness for performance;
 *  the soft ripples tolerate it well. 1 = CSS resolution (no hi-dpi). */
const RENDER_SCALE = 1;

interface RippleFieldProps {
  /** Partial overrides merged over DEFAULT_RIPPLE_CONFIG. */
  config?: Partial<RippleConfig>;
  /** Delay before the first ambient ripple spawns, in ms (intro choreography). */
  startDelayMs?: number;
  className?: string;
}

/** An active ripple, positioned as a fraction (0..1) of the canvas. */
interface ActiveRipple {
  x: number;
  y: number;
  strength: number;
  duration: number;
  rings: number;
  birth: number; // seconds (performance.now()/1000), stamped at spawn
}

/**
 * Renders water-like ripples with a WebGL2 fragment shader: each ripple is an
 * expanding, damped radial wave, lit so you read it from highlights and shadows
 * on the wave crests (the surface is otherwise clear). Confine it with
 * `className`; the look is driven by `config` — see lib/ripple.ts and
 * lib/rippleShader.ts. Ambient ripples spawn on a timer; a click anywhere
 * spawns one at the pointer.
 */
export function RippleField({ config, startDelayMs = 300, className }: RippleFieldProps) {
  const cfg = useMemo<RippleConfig>(
    () => ({ ...DEFAULT_RIPPLE_CONFIG, ...config }),
    [config]
  );
  const reduceMotion = useReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<ActiveRipple[]>([]);
  // Keep the latest config in a ref so the render/spawn loops never go stale.
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // --- WebGL render loop -------------------------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) return; // no WebGL2 → no ripples (graceful)

    const program = createProgram(gl, VERT_SRC, FRAG_SRC);

    // Fullscreen quad (two triangles via a strip).
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const loc = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      count: gl.getUniformLocation(program, "uCount"),
      center: gl.getUniformLocation(program, "uCenter"),
      birth: gl.getUniformLocation(program, "uBirth"),
      duration: gl.getUniformLocation(program, "uDuration"),
      strength: gl.getUniformLocation(program, "uStrength"),
      rings: gl.getUniformLocation(program, "uRings"),
      speed: gl.getUniformLocation(program, "uSpeed"),
      freq: gl.getUniformLocation(program, "uFreq"),
      fadeStart: gl.getUniformLocation(program, "uFadeStart"),
      slopeScale: gl.getUniformLocation(program, "uSlopeScale"),
      lightDir: gl.getUniformLocation(program, "uLightDir"),
      shininess: gl.getUniformLocation(program, "uShininess"),
      gain: gl.getUniformLocation(program, "uGain"),
      specGain: gl.getUniformLocation(program, "uSpecGain"),
      shadowStrength: gl.getUniformLocation(program, "uShadowStrength"),
      highlightColor: gl.getUniformLocation(program, "uHighlightColor"),
      shadowColor: gl.getUniformLocation(program, "uShadowColor"),
      baseColor: gl.getUniformLocation(program, "uBaseColor"),
      baseStrength: gl.getUniformLocation(program, "uBaseStrength"),
      opacity: gl.getUniformLocation(program, "uOpacity"),
    };

    const resize = () => {
      // Render at CSS resolution (no DPR multiply) — the soft ripples don't
      // need hi-dpi, and this is the biggest perf lever (fragment count).
      const w = Math.max(1, Math.floor(canvas.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.floor(canvas.clientHeight * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Reused uniform buffers.
    const centerData = new Float32Array(MAX_RIPPLES * 2);
    const birthData = new Float32Array(MAX_RIPPLES);
    const durationData = new Float32Array(MAX_RIPPLES);
    const strengthData = new Float32Array(MAX_RIPPLES);
    const ringsData = new Float32Array(MAX_RIPPLES);

    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const W = canvas.width;
      const H = canvas.height;
      if (W <= 1 || H <= 1) return; // hidden (e.g. mobile) — skip drawing

      const now = performance.now() / 1000;
      const c = cfgRef.current;
      const active = ripplesRef.current;

      // Cull expired (frees slots for the maxConcurrent check).
      for (let i = active.length - 1; i >= 0; i--) {
        if (now - active[i].birth > active[i].duration) active.splice(i, 1);
      }

      // Upload the newest MAX_RIPPLES.
      const count = Math.min(active.length, MAX_RIPPLES);
      const offset = active.length - count;
      for (let i = 0; i < count; i++) {
        const r = active[offset + i];
        centerData[i * 2] = r.x * W;
        centerData[i * 2 + 1] = r.y * H;
        birthData[i] = r.birth;
        durationData[i] = r.duration;
        strengthData[i] = r.strength;
        ringsData[i] = r.rings;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(loc.resolution, W, H);
      gl.uniform1f(loc.time, now);
      gl.uniform1i(loc.count, count);
      gl.uniform2fv(loc.center, centerData);
      gl.uniform1fv(loc.birth, birthData);
      gl.uniform1fv(loc.duration, durationData);
      gl.uniform1fv(loc.strength, strengthData);
      gl.uniform1fv(loc.rings, ringsData);
      gl.uniform1f(loc.speed, c.speed);
      gl.uniform1f(loc.freq, c.frequency);
      gl.uniform1f(loc.fadeStart, c.fadeStart);
      gl.uniform1f(loc.slopeScale, c.slopeScale);
      gl.uniform3fv(loc.lightDir, c.lightDir);
      gl.uniform1f(loc.shininess, c.shininess);
      gl.uniform1f(loc.gain, c.gain);
      gl.uniform1f(loc.specGain, c.specGain);
      gl.uniform1f(loc.shadowStrength, c.shadowStrength);
      gl.uniform3fv(loc.highlightColor, c.highlightColor);
      gl.uniform3fv(loc.shadowColor, c.shadowColor);
      gl.uniform3fv(loc.baseColor, c.baseColor);
      gl.uniform1f(loc.baseStrength, c.baseStrength);
      gl.uniform1f(loc.opacity, c.opacity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, [reduceMotion]);

  // --- Ambient spawn loop ------------------------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const c = cfgRef.current;
      if (ripplesRef.current.length < c.maxConcurrent) {
        const r = makeRipple(c);
        ripplesRef.current.push({
          x: r.x,
          y: r.y,
          strength: r.strength,
          duration: r.duration,
          rings: r.rings,
          birth: performance.now() / 1000,
        });
      }
      const [minGap, maxGap] = c.spawnIntervalMs;
      timer = setTimeout(tick, minGap + Math.random() * (maxGap - minGap));
    };
    timer = setTimeout(tick, startDelayMs);
    return () => clearTimeout(timer);
  }, [reduceMotion, startDelayMs]);

  // --- Click anywhere spawns a ripple at the pointer ---------------------
  useEffect(() => {
    if (reduceMotion) return;
    const onClick = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return; // hidden
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const r = makeRipple(cfgRef.current, { x, y });
      const active = ripplesRef.current;
      active.push({
        x: r.x,
        y: r.y,
        strength: r.strength,
        duration: r.duration,
        rings: r.rings,
        birth: performance.now() / 1000,
      });
      // Bound the array so the uniform upload never overflows.
      if (active.length > MAX_RIPPLES) active.splice(0, active.length - MAX_RIPPLES);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [reduceMotion]);

  // width/height:100% is required — a <canvas> is a replaced element, so
  // `absolute inset-0` alone won't stretch it past its intrinsic 300×150.
  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default RippleField;
