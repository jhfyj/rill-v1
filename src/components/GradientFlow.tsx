import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { createProgram } from "../lib/rippleShader";

/** Fullscreen-quad vertex shader (same as the ripple field's). */
const VERT_SRC = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/**
 * Bottom-up blue gradient. The canvas is white (cream) at the top; our brand
 * blue bleeds up from the bottom. The boundary between them is a soft, wide
 * "shoreline" that gently undulates over time (a few slow sine waves + fBm) so
 * the blue fluctuates like waves. Brand colours below come from index.css
 * (brand-500 / brand-700).
 */
const FRAG_SRC = `#version 300 es
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uTop;    // colour at the top of the canvas
uniform vec3  uMid;    // main gradient colour
uniform vec3  uBottom; // deepest colour, at the very bottom

out vec4 fragColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                 dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                 dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  // uv.y: 0 at the bottom, 1 at the top.
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  float x = uv.x * aspect;

  float t = uTime * 0.4; // drift speed

  // Wavy shoreline height — where blue gives way to white. Sits low so the blue
  // only occupies the bottom ~40% of the canvas. A few sines (different speeds)
  // plus fBm give an obvious, organic rise-and-fall.
  float line = 0.26;
  line += 0.10 * sin(x * 2.3 + t);
  line += 0.07 * sin(x * 3.9 - t * 0.9);
  line += 0.05 * fbm(vec2(x * 1.1, t * 0.6));

  // Moderate softness — tight enough that the wave motion stays visible.
  float soft = 0.20;
  float amount = smoothstep(line + soft, line - soft, uv.y);

  // Colours come from GRADIENT_COLORS (JS) via uniforms — edit them there.
  vec3 col = mix(uTop, uMid, amount);
  // Deepen toward the very bottom of the canvas.
  col = mix(col, uBottom, amount * smoothstep(0.42, 0.0, uv.y));

  fragColor = vec4(col, 1.0);
}`;

/**
 * 👇 EDIT THE GRADIENT COLOURS HERE. Plain hex strings — they hot-reload live
 * (no browser refresh needed). `top` is the canvas top, `mid` the main colour,
 * `bottom` the deepest colour at the very bottom.
 */
const GRADIENT_COLORS = {
  top: "#fbfaf7",
  mid: "#abc8ff",
  bottom: "#9b99ff",
};

/** "#rrggbb" → [r, g, b] in 0..1 (the form WebGL wants). */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface GradientFlowProps {
  className?: string;
}

/**
 * Animated gradient-shader background (see FinaleSection). A single
 * fullscreen-quad WebGL2 fragment shader paints a slowly churning pastel mesh
 * gradient. Falls back gracefully (transparent canvas) if WebGL2 is missing;
 * with reduced motion it paints one static frame and stops.
 */
export function GradientFlow({ className }: GradientFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  // Recomputed every render and read by the draw loop each frame, so editing
  // GRADIENT_COLORS hot-reloads into the already-running shader (no refresh).
  const colorsRef = useRef<{
    top: [number, number, number];
    mid: [number, number, number];
    bottom: [number, number, number];
  }>({ top: [0, 0, 0], mid: [0, 0, 0], bottom: [0, 0, 0] });
  colorsRef.current = {
    top: hexToRgb(GRADIENT_COLORS.top),
    mid: hexToRgb(GRADIENT_COLORS.mid),
    bottom: hexToRgb(GRADIENT_COLORS.bottom),
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
    if (!gl) return; // no WebGL2 → CSS fallback background shows through

    const program = createProgram(gl, VERT_SRC, FRAG_SRC);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uTop = gl.getUniformLocation(program, "uTop");
    const uMid = gl.getUniformLocation(program, "uMid");
    const uBottom = gl.getUniformLocation(program, "uBottom");

    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth));
      const h = Math.max(1, Math.floor(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (seconds: number) => {
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, seconds);
      gl.uniform3fv(uTop, colorsRef.current.top);
      gl.uniform3fv(uMid, colorsRef.current.mid);
      gl.uniform3fv(uBottom, colorsRef.current.bottom);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0;
    if (reduceMotion) {
      draw(0); // one static frame
    } else {
      const render = () => {
        raf = requestAnimationFrame(render);
        draw(performance.now() / 1000);
      };
      raf = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default GradientFlow;
