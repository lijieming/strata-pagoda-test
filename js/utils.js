/* ============================================================
   utils.js — math, colour and noise helpers (no dependencies)
   ============================================================ */
"use strict";

const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (v - a) / (b - a);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

/* --- colour helpers: colours are [r,g,b] 0..255 --- */
const mixC = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const packRGB = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
const scaleC = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const css = (c, a) =>
  a === undefined
    ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")"
    : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
const hexC = (h) => [
  (parseInt(h.slice(1, 3), 16)),
  (parseInt(h.slice(3, 5), 16)),
  (parseInt(h.slice(5, 7), 16)),
];

/* --- deterministic RNG (mulberry32) --- */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- hash-based value noise --- */
function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1013904223);
  h = h ^ (h >>> 13);
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm2(x, y, seed, oct) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += noise2(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

/* --- geometry: point in convex quad (screen space, y down) --- */
function pointInQuad(px, py, x0, y0, x1, y1, x2, y2, x3, y3) {
  // split into two triangles
  const d1 = (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);
  const d2 = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
  const d3 = (x3 - x2) * (py - y2) - (y3 - y2) * (px - x2);
  const d4 = (x0 - x3) * (py - y3) - (y0 - y3) * (px - x3);
  const pos = (d1 > 0) + (d2 > 0) + (d3 > 0) + (d4 > 0);
  if (pos === 4 || pos === 0) return true;
  // quad may be wound either way; fall back to triangle test
  return (
    pointInTri(px, py, x0, y0, x1, y1, x2, y2) ||
    pointInTri(px, py, x0, y0, x2, y2, x3, y3)
  );
}
function pointInTri(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax, v0y = cy - ay, v1x = bx - ax, v1y = by - ay;
  const v2x = px - ax, v2y = py - ay;
  const d00 = v0x * v0x + v0y * v0y, d01 = v0x * v1x + v0y * v1y, d02 = v0x * v2x + v0y * v2y;
  const d11 = v1x * v1x + v1y * v1y, d12 = v1x * v2x + v1y * v2y;
  const den = d00 * d11 - d01 * d01;
  if (den === 0) return false;
  const u = (d11 * d02 - d01 * d12) / den;
  const v = (d00 * d12 - d01 * d02) / den;
  return u >= 0 && v >= 0 && u + v <= 1;
}

/* --- small array helpers --- */
function ensureF32(arr, n) {
  if (!arr || arr.length < n) return new Float32Array(n);
  return arr;
}
function ensureI32(arr, n) {
  if (!arr || arr.length < n) return new Int32Array(n);
  return arr;
}
