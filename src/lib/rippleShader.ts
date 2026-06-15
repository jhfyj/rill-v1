/* ------------------------------------------------------------------ */
/* WebGL2 ripple shader — clear-water look from light & shadow          */
/* A single fullscreen-quad fragment shader. Each ripple is an          */
/* expanding, damped radial wave; we accumulate the surface gradient    */
/* from all ripples, build a normal, and light it. The surface is       */
/* transparent except where it's sloped, so it reads as clear water.    */
/* ------------------------------------------------------------------ */

/** Max ripples uploaded to the shader at once (uniform array size). */
export const MAX_RIPPLES = 16;

export const VERT_SRC = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAG_SRC = `#version 300 es
precision highp float;

#define MAX_RIPPLES ${MAX_RIPPLES}
#define TWO_PI 6.28318530718

uniform vec2  uResolution;            // device px
uniform float uTime;                  // seconds
uniform int   uCount;
uniform vec2  uCenter[MAX_RIPPLES];   // top-left device px
uniform float uBirth[MAX_RIPPLES];    // seconds
uniform float uDuration[MAX_RIPPLES]; // seconds
uniform float uStrength[MAX_RIPPLES];
uniform float uRings[MAX_RIPPLES];    // rings to show (per ripple, by size)

uniform float uSpeed;        // px/s wavefront expansion
uniform float uFreq;         // wave number (rad/px)
uniform float uFadeStart;    // fraction of life when fade-out begins
uniform float uSlopeScale;
uniform vec3  uLightDir;
uniform float uShininess;
uniform float uGain;
uniform float uSpecGain;
uniform float uShadowStrength;
uniform vec3  uHighlightColor;
uniform vec3  uShadowColor;
uniform vec3  uBaseColor;     // calm-water tint the ripple washes out to
uniform float uBaseStrength;  // how much base wash sits under the shading
uniform float uOpacity;

out vec4 fragColor;

void main() {
  // Work in top-left px so JS centers (clientX/Y * dpr) line up.
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  vec2 grad = vec2(0.0);
  float presence = 0.0;   // smooth "there is a ripple here" field (for base wash)

  for (int i = 0; i < MAX_RIPPLES; i++) {
    if (i >= uCount) break;
    float age = uTime - uBirth[i];
    if (age < 0.0) continue;
    float t = age / uDuration[i];
    if (t > 1.0) continue;

    vec2 delta = p - uCenter[i];
    float d = length(delta);
    if (d < 0.0001) continue;

    float R = uSpeed * age;                 // wavefront radius
    float x = d - R;                         // distance from the front (px)
    float lambda = TWO_PI / uFreq;           // ring spacing (px per ring)
    float u = x / lambda;                    // distance from front, in rings
    float rings = uRings[i];                 // this ripple's ring count (by size)

    // Cheap early-out: outside the visible ring band the gaussian is ~0, so
    // skip the expensive exp/sin/cos. Cost stays proportional to ring area.
    if (abs(u) > 0.5 * rings + 1.0) continue;

    // Envelope width is set in rings, so this count controls how many show.
    float sigma = max(rings, 1.0) * 0.25;
    float s2 = sigma * sigma;
    float env = exp(-(u * u) / (2.0 * s2));
    float osc = sin(TWO_PI * u);             // == sin(uFreq * x)
    float life = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(uFadeStart, 1.0, t));
    float A = uStrength[i] * life;

    // h = A * osc * env;  u = x/lambda  →  du/dx = 1/lambda
    float dosc = TWO_PI * cos(TWO_PI * u);
    float denv = -(u / s2) * env;
    float dhdx = A * (dosc * env + osc * denv) / lambda;

    grad += dhdx * (delta / d);
    // Amplitude envelope (no oscillation sign): a smooth band around the
    // wavefront that fades with life — drives the light-blue base wash.
    presence += A * env;
  }

  // Light the surface implied by the accumulated slope.
  vec3 n = normalize(vec3(-grad * uSlopeScale, 1.0));
  vec3 L = normalize(uLightDir);
  vec3 V = vec3(0.0, 0.0, 1.0);

  float diff = dot(n, L) - L.z;  // signed tilt vs. a flat surface
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), uShininess);

  float aH = clamp(diff * uGain + spec * uSpecGain, 0.0, 1.0); // highlight (light)
  float aS = clamp(-diff * uGain, 0.0, 1.0) * uShadowStrength;  // shadow (deep)

  // Wave shading: lit crests toward highlight, troughs toward shadow.
  float shadeA = max(aH, aS);
  vec3 shadeColor = mix(uShadowColor, uHighlightColor, aH / (aH + aS + 1e-4));

  // Base wash: the flat parts of the ripple band are a light-blue calm-water
  // tint instead of fading to transparent — so the ripple washes out to light
  // blue, never to a thin (grey-over-cream) edge.
  float baseA = clamp(presence * uBaseStrength, 0.0, 1.0);

  // Composite: where the surface is shaded use the shade colour, elsewhere the
  // base tint; alpha is whichever wash is stronger.
  vec3 rgb = mix(uBaseColor, shadeColor, shadeA / (shadeA + baseA + 1e-4));
  float alpha = max(shadeA, baseA) * uOpacity;

  fragColor = vec4(rgb, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Ripple shader compile error: " + log);
  }
  return shader;
}

/** Compile + link the ripple program; throws with the GL log on failure. */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Ripple program link error: " + log);
  }
  return program;
}
