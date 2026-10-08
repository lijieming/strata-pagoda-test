/* ============================================================
   palette.js — materials, sky keyframes, lighting & face shading
   ============================================================ */
"use strict";

/* ---------- material registry ----------
   c   : base colour (side faces)
   t   : optional top-face colour override
   k   : shading kind  matte | wood | metal | leaf | stone | glow | water | paper | ice
   em  : emissive multiplier (glow materials). NEVER baked into the base
         face colours — added additively at draw time (see fillEmissive in
         renderer.js) so switching a light off removes its effect entirely.
*/
const MAT = {};
const MAT_LIST = [];
function mat(name, c, opts) {
  opts = opts || {};
  const m = {
    name: name,
    c: c,
    t: opts.t || null,
    k: opts.k || "matte",
    em: opts.em || 0,
    // ec: emissive colour added additively at draw time (only when the
    // source is lit). Kept separate from the base colour c so an unlit
    // block never keeps a warm tint baked into it.
    ec: opts.ec || null,
    idx: MAT_LIST.length,
  };
  MAT[name] = m;
  MAT_LIST.push(m);
  return m;
}

/* ground & stone */
mat("grass", [104, 146, 74], { k: "leaf", t: [118, 162, 82] });
mat("grassDry", [132, 148, 74], { k: "leaf", t: [146, 160, 84] });
mat("moss", [86, 122, 74], { k: "leaf", t: [98, 136, 82] });
mat("dirt", [110, 88, 66], { k: "matte" });
mat("mud", [86, 70, 56], { k: "matte" });
mat("gravel", [150, 148, 142], { k: "stone", t: [162, 160, 152] });
mat("gravelDark", [118, 118, 116], { k: "stone", t: [130, 130, 126] });
mat("sand", [196, 182, 148], { k: "stone", t: [206, 192, 158] });
mat("stone", [148, 150, 152], { k: "stone", t: [164, 166, 166] });
mat("stoneDark", [104, 106, 110], { k: "stone", t: [118, 120, 124] });
mat("stoneWarm", [160, 152, 140], { k: "stone", t: [174, 166, 152] });
mat("slate", [88, 92, 100], { k: "stone", t: [100, 104, 112] });
mat("snow", [232, 238, 246], { k: "matte", t: [244, 248, 252] });

/* water */
mat("water", [58, 112, 150], { k: "water", t: [72, 132, 168] });
mat("waterDeep", [36, 88, 128], { k: "water", t: [48, 104, 144] });
mat("ice", [150, 190, 214], { k: "water", t: [176, 208, 228] });

/* pagoda wood & structure */
mat("wood", [138, 62, 52], { k: "wood", t: [152, 72, 58] });
mat("woodDark", [92, 44, 40], { k: "wood", t: [104, 52, 44] });
mat("woodPale", [176, 128, 88], { k: "wood", t: [190, 142, 98] });
mat("plaster", [226, 218, 202], { k: "matte", t: [236, 230, 216] });
mat("plasterDark", [196, 188, 172], { k: "matte" });
mat("tatami", [188, 176, 118], { k: "matte" });
mat("gold", [214, 166, 74], { k: "metal", t: [236, 190, 96] });
mat("goldBright", [246, 206, 118], { k: "metal", t: [255, 224, 148] });
mat("bronze", [112, 92, 62], { k: "metal", t: [130, 108, 74] });
mat("roofTile", [58, 66, 86], { k: "matte", t: [70, 78, 98] });
mat("roofTileEdge", [46, 52, 70], { k: "matte", t: [56, 62, 80] });
mat("roofTileRust", [96, 66, 62], { k: "matte", t: [108, 76, 70] });
mat("white", [238, 238, 234], { k: "matte" });
mat("ink", [36, 38, 46], { k: "matte" });

/* foliage */
mat("leaf", [72, 128, 62], { k: "leaf", t: [88, 146, 72] });
mat("leafMid", [88, 142, 66], { k: "leaf", t: [104, 158, 78] });
mat("leafDark", [52, 100, 54], { k: "leaf", t: [62, 116, 60] });
mat("leafPine", [46, 88, 66], { k: "leaf", t: [56, 102, 74] });
mat("leafPineMid", [58, 104, 74], { k: "leaf", t: [70, 118, 82] });
mat("leafMaple", [176, 74, 44], { k: "leaf", t: [196, 92, 50] });
mat("leafMapleGold", [206, 142, 48], { k: "leaf", t: [222, 162, 60] });
mat("sakura", [226, 132, 164], { k: "leaf", t: [238, 148, 176] });
mat("sakuraDeep", [196, 96, 132], { k: "leaf", t: [210, 112, 148] });
mat("sakuraPale", [246, 186, 206], { k: "leaf", t: [252, 202, 218] });
mat("bamboo", [112, 158, 74], { k: "leaf", t: [128, 174, 86] });
mat("bambooDark", [86, 124, 62], { k: "leaf" });
mat("trunk", [86, 62, 46], { k: "wood", t: [98, 72, 52] });
mat("trunkPale", [128, 106, 88], { k: "wood", t: [140, 118, 98] });
mat("willow", [104, 148, 84], { k: "leaf", t: [120, 164, 92] });

/* shrubs, flowers, props */
mat("shrub", [78, 118, 68], { k: "leaf", t: [92, 134, 76] });
mat("shrubRound", [96, 134, 74], { k: "leaf", t: [110, 148, 84] });
mat("irisPurple", [122, 96, 176], { k: "leaf", t: [140, 114, 196] });
mat("irisYellow", [214, 178, 74], { k: "leaf", t: [230, 194, 90] });
mat("flowerRed", [206, 74, 74], { k: "leaf", t: [222, 92, 92] });
mat("flowerWhite", [236, 232, 224], { k: "leaf", t: [246, 244, 238] });
mat("flowerPink", [232, 148, 176], { k: "leaf", t: [244, 170, 194] });
mat("reeds", [132, 142, 92], { k: "leaf", t: [148, 158, 102] });
mat("mossRock", [96, 124, 84], { k: "leaf", t: [108, 138, 92] });

/* lanterns & light
   Emissive materials keep a NEUTRAL base colour (what the block looks
   like when its light source is off) and carry their warm hue in `ec`,
   which the additive emissive layer applies only while the source is lit.
   This is what stops orange tiles from lingering after a lamp is off. */
mat("paper", [214, 210, 200], { k: "paper", t: [224, 220, 210], em: 1.0, ec: [255, 236, 202] });
mat("paperWarm", [206, 200, 188], { k: "paper", t: [216, 210, 198], em: 1.0, ec: [255, 208, 148] });
mat("stoneLantern", [140, 142, 144], { k: "stone", t: [156, 158, 158] });
mat("fire", [70, 60, 54], { k: "glow", t: [80, 68, 60], em: 1.6, ec: [255, 178, 92] });
mat("bell", [156, 128, 84], { k: "metal", t: [176, 148, 100] });
mat("torii", [196, 58, 48], { k: "wood", t: [212, 70, 56] });
mat("toriiDark", [128, 40, 36], { k: "wood" });
mat("bridge", [176, 62, 50], { k: "wood", t: [190, 74, 58] });
mat("koi", [238, 128, 66], { k: "matte", t: [248, 148, 84] });
mat("koiWhite", [238, 234, 226], { k: "matte", t: [248, 246, 240] });
mat("lanternRed", [150, 58, 52], { k: "paper", t: [164, 66, 58], em: 0.55, ec: [255, 96, 72] });
mat("curtain", [216, 210, 196], { k: "matte" });

/* ---------- sky / light keyframes ---------- */
const SKY_KEYS = [
  { h: 0.0,  top: "#04060d", mid: "#080e1c", hor: "#101827", amb: "#26344c", ambI: 0.40, sun: "#9db4d6", sunI: 0.20, star: 1.0 },
  { h: 4.2,  top: "#0b1124", mid: "#222c48", hor: "#4e4152", amb: "#3a4460", ambI: 0.48, sun: "#a98a86", sunI: 0.26, star: 0.72 },
  { h: 6.1,  top: "#26365c", mid: "#6f5f7e", hor: "#e79a68", amb: "#62607a", ambI: 0.70, sun: "#ffab63", sunI: 0.82, star: 0.10 },
  { h: 7.6,  top: "#3f6a9c", mid: "#87a8c8", hor: "#d6e2e8", amb: "#8ba2b8", ambI: 0.80, sun: "#ffe2b8", sunI: 0.94, star: 0.0 },
  { h: 12.0, top: "#3b78bd", mid: "#7cb0dc", hor: "#cfe4ef", amb: "#a6bdd2", ambI: 0.90, sun: "#fff5e0", sunI: 0.98, star: 0.0 },
  { h: 16.4, top: "#4382b8", mid: "#84a2c8", hor: "#d2dde4", amb: "#9fb3c4", ambI: 0.86, sun: "#ffeccc", sunI: 0.94, star: 0.0 },
  { h: 18.1, top: "#37476f", mid: "#9c6672", hor: "#f5854a", amb: "#75646e", ambI: 0.70, sun: "#ff8a45", sunI: 0.80, star: 0.02 },
  { h: 19.5, top: "#1c2444", mid: "#463757", hor: "#a44f3c", amb: "#454460", ambI: 0.55, sun: "#c8664f", sunI: 0.40, star: 0.35 },
  { h: 21.3, top: "#05070f", mid: "#0a101e", hor: "#131b2a", amb: "#26344c", ambI: 0.41, sun: "#9db4d6", sunI: 0.20, star: 1.0 },
  { h: 24.0, top: "#04060d", mid: "#080e1c", hor: "#101827", amb: "#26344c", ambI: 0.40, sun: "#9db4d6", sunI: 0.20, star: 1.0 },
];
for (const k of SKY_KEYS) {
  k.topC = hexC(k.top); k.midC = hexC(k.mid); k.horC = hexC(k.hor);
  k.ambC = hexC(k.amb); k.sunC = hexC(k.sun);
}

/* ---------- lighting state ---------- */
const Light = {
  hour: 10.5,
  dir: [0, 0, 1],          // direction TOWARD the light
  color: [255, 245, 224],
  intensity: 1.1,
  ambColor: [166, 189, 210],
  ambI: 1.0,
  skyTop: [59, 120, 189],
  skyMid: [124, 176, 220],
  skyHor: [207, 228, 239],
  starAlpha: 0,
  dayFactor: 1,
  glow: 0,                 // 0 = day, 1 = full night (lamps, fireflies)
  sunScreen: null,
  moonScreen: null,
  key: "",
};

/* point lights (lanterns) — filled by scene */
const PointLights = [];
let lightsVersion = 0;

function setTimeOfDay(hour) {
  Light.hour = ((hour % 24) + 24) % 24;
  const h = Light.hour;

  // find bracketing keyframes
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (h >= SKY_KEYS[i].h && h <= SKY_KEYS[i + 1].h) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  }
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  const e = t * t * (3 - 2 * t);

  Light.skyTop = mixC(a.topC, b.topC, e);
  Light.skyMid = mixC(a.midC, b.midC, e);
  Light.skyHor = mixC(a.horC, b.horC, e);
  Light.ambColor = mixC(a.ambC, b.ambC, e);
  Light.ambI = mix(a.ambI, b.ambI, e);
  Light.color = mixC(a.sunC, b.sunC, e);
  Light.intensity = mix(a.sunI, b.sunI, e);
  Light.starAlpha = mix(a.star, b.star, e);

  // sun / moon arc
  const ang = ((h - 6) / 12) * Math.PI;      // 0 at 06:00, PI at 18:00
  const elev = Math.sin(ang);
  const azim = -0.9;                         // fixed compass tilt
  const isDay = elev > -0.06;
  const ce = Math.cos(ang);
  if (isDay) {
    Light.dir = [Math.cos(azim) * 0.72 * Math.abs(ce) + 0.12, Math.sin(azim) * 0.62 * Math.abs(ce) - 0.22, Math.max(0.16, elev)];
  } else {
    const ma = ang + Math.PI;
    const me = Math.sin(ma);
    Light.dir = [-Math.cos(azim) * 0.55 * Math.abs(Math.cos(ma)) + 0.2, -0.34, Math.max(0.3, me)];
  }
  const L = Light.dir;
  const n = Math.hypot(L[0], L[1], L[2]);
  Light.dir = [L[0] / n, L[1] / n, L[2] / n];

  Light.dayFactor = smoothstep(-0.10, 0.26, elev);
  Light.glow = 1 - smoothstep(-0.02, 0.20, elev);
  Light.elev = elev;
  Light.isDay = isDay;

  const bucket = Math.round(h * 20) / 20;
  Light.key = bucket + "|" + lightsVersion;
}

function touchLights() {
  lightsVersion++;
  Light.key = Math.round(Light.hour * 20) / 20 + "|" + lightsVersion;
}

/* Emissive strength gate, evaluated at DRAW time — never cached into the
   shade cache. Returns 0 when the lamp toggle (Flags.glow) is off, so
   emissive blocks fall back to their plain base colour. */
function emissiveGate() {
  if (typeof Flags === "undefined" || !Flags.glow) return 0;
  return 0.30 + 0.70 * Light.glow;
}

/* ---------- face shading with cache ---------- */
// face order: 0=+x 1=-x 2=+y 3=-y 4=top 5=bottom
const FACE_N = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const FACE_HEMI = [0.52, 0.52, 0.52, 0.52, 1.0, 0.16];

let shadeCache = new Int32Array(MAT_LIST.length * 8);
let faceStr = new Array(MAT_LIST.length * 8);
let cacheKey = "";

const hex6 = (n) => "#" + (n & 0xffffff).toString(16).padStart(6, "0");

/* soft-knee tone curve: linear below knee, rolls off toward ~1.0 above so
   bright materials keep hue instead of clipping to white. knee ~0.85. */
function tone(x) {
  if (x <= 0.85) return x;
  const e = x - 0.85;
  return 0.85 + e * 0.15 / (1 + e * 1.2);
}

function pointLightAt(x, y, z, out) {
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < PointLights.length; i++) {
    const p = PointLights[i];
    if (!p.on) continue;
    const dx = x - p.x, dy = y - p.y, dz = z - p.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    const r2 = p.r * p.r;
    if (d2 > r2) continue;
    const att = (1 - d2 / r2);
    const k = att * att * p.i;
    r += p.c[0] * k; g += p.c[1] * k; b += p.c[2] * k;
  }
  out[0] = r; out[1] = g; out[2] = b;
}

const _pl = [0, 0, 0];

/* per-material brightness jitter so large flat areas read as hand-placed voxels */
let _jit = null;
function jitterCache() {
  if (_jit) return _jit;
  const n = MAT_LIST.length * 6;
  _jit = new Int32Array(n);
  const r = rng(4242);
  for (let m = 0; m < MAT_LIST.length; m++) {
    const M = MAT_LIST[m];
    const amt = M.k === "leaf" ? 8 : M.k === "stone" ? 7 : M.k === "wood" ? 5 : M.k === "water" ? 4 : 3;
    for (let f = 0; f < 6; f++) _jit[m * 6 + f] = Math.round((r() - 0.5) * 2 * amt);
  }
  return _jit;
}

function buildShadeCache() {
  if (cacheKey === Light.key) return;
  cacheKey = Light.key;
  const jit = jitterCache();
  const L = Light.dir;
  const ac = Light.ambColor, ai = Light.ambI;
  const lc = Light.color, li = Light.intensity;
  for (let mi = 0; mi < MAT_LIST.length; mi++) {
    const m = MAT_LIST[mi];
    for (let f = 0; f < 6; f++) {
      const n = FACE_N[f];
      const nd = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const hemi = FACE_HEMI[f];
      let spec = 0;
      if ((m.k === "metal" || m.k === "water") && f === 4) {
        spec = Math.pow(nd, 6) * (m.k === "metal" ? 0.55 : 0.30);
      }
      const base = f === 4 && m.t ? m.t : m.c;
      // Layered lighting: this cache holds ONLY the base (ambient + sun)
      // shading. Emissive (m.em) and point-light contribution are applied at
      // draw time, so disabling a lamp/firefly removes its visual effect
      // completely instead of leaving warm colours baked into the blocks.
      let lr = ac[0] / 255 * ai * hemi + lc[0] / 255 * li * nd * 0.92 + spec;
      let lg = ac[1] / 255 * ai * hemi + lc[1] / 255 * li * nd * 0.92 + spec;
      let lb = ac[2] / 255 * ai * hemi + lc[2] / 255 * li * nd * 0.92 + spec;
      // soft-knee tone map: keeps bright materials (sakura, plaster, snow) from
      // clipping to pure white when ambient + sun exceed 1.0
      lr = tone(lr); lg = tone(lg); lb = tone(lb);
      let r = clamp(base[0] * lr, 0, 255) | 0;
      let g = clamp(base[1] * lg, 0, 255) | 0;
      let b = clamp(base[2] * lb, 0, 255) | 0;
      const packed = packRGB([r, g, b]);
      shadeCache[mi * 8 + f] = packed;
      // jitter per channel with clamping — adding to the packed int can borrow
      // across channels and wrap dark faces into garbage magenta
      const jv = jit[mi * 6 + f];
      faceStr[mi * 8 + f] = hex6(packRGB([
        clamp(r + jv, 0, 255), clamp(g + jv, 0, 255), clamp(b + jv, 0, 255),
      ]));
    }
    // bottom face reuses the -y shading entry for water side loops
    shadeCache[mi * 8 + 6] = shadeCache[mi * 8 + 5];
    shadeCache[mi * 8 + 7] = shadeCache[mi * 8 + 4];
  }
  tintStrCache.clear();
}

/* point-light tint, quantised so the string cache stays small.
   Gated by Flags.glow: with the lamp toggle off, point lights contribute
   nothing. touchLights() invalidates the shade/string caches whenever a
   light is toggled, so no stale warm tint survives. */
function tintForVoxel(x, y, z) {
  if (!PointLights.length) return 0;
  if (typeof Flags !== "undefined" && !Flags.glow) return 0;
  pointLightAt(x, y, z, _pl);
  const k = _pl[0] + _pl[1] + _pl[2];
  if (k < 0.012) return 0;
  return clamp(Math.round(Math.sqrt(k) * 13), 1, 22);
}

const tintStrCache = new Map();
function tintedStr(baseIdx, q) {
  if (!q) return faceStr[baseIdx];
  const key = baseIdx * 32 + q;
  let s = tintStrCache.get(key);
  if (s !== undefined) return s;
  const packed = shadeCache[baseIdx];
  const r = (packed >> 16) & 255, g = (packed >> 8) & 255, b = packed & 255;
  const sc = q / 22;
  const nr = clamp(r + (255 - r) * sc * 0.66 + 22 * sc, 0, 255) | 0;
  const ng = clamp(g + (255 - g) * sc * 0.46 + 9 * sc, 0, 255) | 0;
  const nb = clamp(b + (255 - b) * sc * 0.16, 0, 255) | 0;
  s = hex6(packRGB([nr, ng, nb]));
  tintStrCache.set(key, s);
  if (tintStrCache.size > 60000) tintStrCache.clear();
  return s;
}

/* signed brightness shift, used for water wave modulation */
const shiftStrCache = new Map();
function shiftStr(baseIdx, delta) {
  if (!delta) return faceStr[baseIdx];
  const key = baseIdx * 64 + (delta + 31);
  let s = shiftStrCache.get(key);
  if (s !== undefined) return s;
  const packed = shadeCache[baseIdx];
  const r = clamp(((packed >> 16) & 255) + delta, 0, 255) | 0;
  const g = clamp(((packed >> 8) & 255) + delta, 0, 255) | 0;
  const b = clamp((packed & 255) + delta, 0, 255) | 0;
  s = hex6(packRGB([r, g, b]));
  shiftStrCache.set(key, s);
  return s;
}
