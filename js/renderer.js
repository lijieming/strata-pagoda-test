/* ============================================================
   renderer.js — isometric voxel rasteriser, sky layers, picking
   ============================================================ */
"use strict";

const View = {
  yaw: 0.62,
  pitch: 0.50,
  fitZoom: 15,
  zoomScale: 1,
  zoom: 15,
  cx: 1, cy: 4, cz: 13,
  offX: 0, offY: 0,
  minScale: 0.45, maxScale: 2.6,
  minPitch: 0.14, maxPitch: 1.20,
};

const Scene = { world: null, voxels: null, meta: null, season: "spring" };

const R = {
  canvas: null, ctx: null,
  w: 0, h: 0, dpr: 1,
  skyCanvas: null, skyCtx: null, skyKey: "",
  voxCanvas: null, voxCtx: null,
  puff: null,
  staticDirty: true,
  autoRotate: true, idleTime: 0,
  pickFaces: null, pickCount: 0, pickCap: 0,
  px: null, py: null, depth: null, order: null,
  waterPts: [], overWater: [], bridgeBox: null,
};

/* unit-cube face vertex offsets: +x -x +y -y top bottom */
const FV = [
  [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]],
  [[1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]],
  [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
];
const FN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/* projection basis, refreshed by updateProjection() */
let ca = 1, sa = 0, cp = 1, sp = 0;
let K = 15, ox = 0, oy = 0;
let XX = 0, XY = 0, YX = 0, YY = 0, ZY = 0;
let camX = 0, camY = 0, camZ = 1;

function updateProjection() {
  ca = Math.cos(View.yaw); sa = Math.sin(View.yaw);
  cp = Math.cos(View.pitch); sp = Math.sin(View.pitch);
  K = View.fitZoom * View.zoomScale * R.dpr;
  View.zoom = K / R.dpr;
  ox = R.w / 2 + View.offX * R.dpr - (View.cx * ca + View.cy * sa) * K;
  oy = R.h / 2 + View.offY * R.dpr - ((-View.cx * sa + View.cy * ca) * sp - View.cz * cp) * K;
  XX = ca * K; XY = sa * K;
  YX = -sa * sp * K; YY = ca * sp * K; ZY = -cp * K;
  camX = -sa * cp; camY = ca * cp; camZ = sp;
}

function project(x, y, z) {
  return [
    ox + (x * ca + y * sa) * K,
    oy + ((-x * sa + y * ca) * sp - z * cp) * K,
  ];
}

function makeCanvas(w, h, alpha) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c: c, x: c.getContext("2d", { alpha: alpha }) };
}

function initRenderer(canvas) {
  R.canvas = canvas;
  R.ctx = canvas.getContext("2d", { alpha: false });
  resizeRenderer();
}

function resizeRenderer() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, Math.round(window.innerWidth * dpr));
  const h = Math.max(240, Math.round(window.innerHeight * dpr));
  R.dpr = dpr; R.w = w; R.h = h;
  R.canvas.width = w; R.canvas.height = h;
  R.canvas.style.width = window.innerWidth + "px";
  R.canvas.style.height = window.innerHeight + "px";
  R.skyCanvas = null; R.skyKey = "";
  const v = makeCanvas(w, h, true);
  R.voxCanvas = v.c; R.voxCtx = v.x;
  R.staticDirty = true;
  updateProjection();
  buildPuff();
}

/* soft round sprite used for cloud puffs (fast: drawImage instead of gradients) */
function buildPuff() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.45, "rgba(255,255,255,0.42)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
  R.puff = c;
}

/* ---------------- sky ---------------- */
function buildSkyBase() {
  const key = Math.round(Light.hour * 30) / 30 + "|" + R.w + "x" + R.h;
  if (R.skyCanvas && R.skyKey === key) return;
  if (!R.skyCanvas) { const s = makeCanvas(R.w, R.h, false); R.skyCanvas = s.c; R.skyCtx = s.x; }
  const ctx = R.skyCtx;
  const g = ctx.createLinearGradient(0, 0, 0, R.h);
  g.addColorStop(0, css(Light.skyTop));
  g.addColorStop(0.46, css(Light.skyMid));
  g.addColorStop(0.80, css(Light.skyHor));
  g.addColorStop(1, css(mixC(Light.skyHor, [10, 14, 22], 0.5)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, R.w, R.h);

  // dawn / dusk glow near the horizon on the sun side
  const low = 1 - Math.min(1, Math.abs(Light.elev || 0) / 0.45);
  if (low > 0.02) {
    const sx = R.w * (0.5 + (Light.dir[0] * 0.55));
    const gg = ctx.createRadialGradient(sx, R.h * 0.78, 0, sx, R.h * 0.78, R.w * 0.55);
    const warm = mixC(Light.color, [255, 120, 60], 0.35);
    gg.addColorStop(0, css(warm, 0.34 * low));
    gg.addColorStop(0.5, css(warm, 0.12 * low));
    gg.addColorStop(1, css(warm, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, R.w, R.h);
  }
  R.skyCanvas = R.skyCanvas; R.skyKey = key;
}

let _stars = null;
function drawStars(ctx, t) {
  if (Light.starAlpha <= 0.01) return;
  if (!_stars) {
    const r = rng(9001);
    _stars = [];
    for (let i = 0; i < 340; i++)
      _stars.push({ x: r(), y: r() * 0.68, s: r() < 0.87 ? 1 : 2, b: 0.3 + r() * 0.7, p: r() * TAU, sp: 0.5 + r() * 2.6 });
  }
  ctx.save();
  const sz1 = Math.max(1, R.dpr * 0.95);
  for (const s of _stars) {
    const tw = 0.6 + 0.4 * Math.sin(t * s.sp + s.p);
    ctx.globalAlpha = Light.starAlpha * s.b * tw;
    ctx.fillStyle = s.s === 2 ? "#fff6e6" : "#dfe8f6";
    ctx.fillRect(s.x * R.w, s.y * R.h, sz1 * s.s, sz1 * s.s);
  }
  ctx.restore();
}

let _clouds = null;
function drawClouds(ctx, t) {
  if (!R.puff) return;
  if (!_clouds) {
    const r = rng(31337);
    _clouds = [];
    for (let i = 0; i < 14; i++) {
      const puffs = [];
      const np = 4 + ((r() * 5) | 0);
      for (let j = 0; j < np; j++)
        puffs.push({ dx: (r() - 0.5) * 320, dy: (r() - 0.5) * 44, rad: 46 + r() * 96 });
      _clouds.push({ x: r(), y: 0.03 + r() * 0.30, sp: 0.0028 + r() * 0.0062, puffs: puffs, a: 0.30 + r() * 0.40, sc: 0.62 + r() * 0.85 });
    }
  }
  const day = Light.dayFactor;
  const body = mixC(mixC([252, 252, 254], Light.skyHor, 0.34), Light.ambColor, 0.10);
  const dusk = mixC(body, [255, 158, 112], (1 - day) * 0.8);
  const scale = R.w / 1500;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const c of _clouds) {
    const cx = (((c.x + t * c.sp) % 1.4) - 0.2) * R.w;
    const cy = c.y * R.h;
    ctx.globalAlpha = c.a * (0.20 + 0.80 * day);
    for (const p of c.puffs) {
      const rad = Math.max(8, p.rad * c.sc * scale);
      const px = cx + p.dx * c.sc * scale, py = cy + p.dy * c.sc * scale;
      ctx.drawImage(R.puff, px - rad, py - rad, rad * 2, rad * 2);
    }
  }
  // tint the puffs toward the sky colour
  ctx.globalAlpha = 1;
  ctx.restore();
  // soft colour wash so clouds match the light
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = css(dusk);
  for (const c of _clouds) {
    const cx = (((c.x + t * c.sp) % 1.4) - 0.2) * R.w;
    const cy = c.y * R.h;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 190 * c.sc * scale, 46 * c.sc * scale, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSunMoon(ctx) {
  const L = Light.dir;
  const far = 500;
  const p = project(L[0] * far + View.cx, L[1] * far + View.cy, L[2] * far + View.cz);
  const x = p[0], y = p[1];
  if (y > R.h * 0.95 || x < -R.w * 0.35 || x > R.w * 1.35) return;
  const day = Light.isDay;
  const core = day ? mixC([255, 250, 232], Light.color, 0.4) : [224, 234, 250];
  const rad = (day ? 24 : 17) * R.dpr;
  const haloR = rad * (day ? 7 : 4.5);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
  halo.addColorStop(0, css(core, day ? 0.5 : 0.26));
  halo.addColorStop(0.32, css(core, day ? 0.14 : 0.09));
  halo.addColorStop(1, css(core, 0));
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, haloR, 0, TAU); ctx.fill();
  ctx.fillStyle = css(core, day ? 0.95 : 0.92);
  ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  if (!day) {
    ctx.fillStyle = css(mixC(core, [146, 164, 188], 0.6), 0.8);
    const u = rad * 0.26;
    ctx.fillRect(x - u * 1.4, y - u * 0.8, u, u);
    ctx.fillRect(x + u * 0.4, y + u * 0.6, u * 0.8, u * 0.8);
    ctx.fillRect(x - u * 0.2, y - u * 2.1, u * 0.7, u * 0.7);
  }
}

function drawSkyFrame(ctx, t) {
  buildSkyBase();
  ctx.drawImage(R.skyCanvas, 0, 0);
  drawStars(ctx, t);
  drawClouds(ctx, t);
  drawSunMoon(ctx);
}

/* ---------------- static voxel pass ---------------- */
function renderStatic() {
  const ctx = R.voxCtx;
  const V = Scene.voxels;
  updateProjection();
  buildShadeCache();

  ctx.clearRect(0, 0, R.w, R.h);
  drawGroundShadows(ctx);

  const n = V.count;
  R.px = ensureF32(R.px, n); R.py = ensureF32(R.py, n);
  R.depth = ensureF32(R.depth, n); R.order = ensureI32(R.order, n);
  const px = R.px, py = R.py, depth = R.depth, order = R.order;
  const xs = V.xs, ys = V.ys, zs = V.zs;

  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], z = zs[i];
    px[i] = ox + (x * ca + y * sa) * K;
    py[i] = oy + ((-x * sa + y * ca) * sp - z * cp) * K;
    depth[i] = (-x * sa + y * ca) * cp + z * sp;
  }
  for (let i = 0; i < n; i++) order[i] = i;
  const ord = order.subarray(0, n);
  ord.sort((a, b) => depth[a] - depth[b]);

  const cap = n * 3 * 9;
  if (!R.pickFaces || R.pickCap < cap) { R.pickFaces = new Int32Array(cap); R.pickCap = cap; }
  const PF = R.pickFaces;
  let pf = 0;

  const fm = V.fm, mi = V.mi, em = V.em;
  const hasLights = PointLights.length > 0;
  // emissive strength is evaluated at draw time — never baked into the
  // shade cache — so toggling lamps off removes the effect completely
  const emiGate = emissiveGate();
  R.waterPts.length = 0;
  R.overWater.length = 0;
  const waterKind = [];
  for (let m = 0; m < MAT_LIST.length; m++) waterKind[m] = MAT_LIST[m].k === "water" ? 1 : 0;

  /* Which voxels must be re-drawn above the animated water?
     Water is animated, so it cannot live in the depth-sorted static pass; it is
     painted afterwards. Anything that should occlude it has to be re-drawn —
     but only things that are genuinely in front of it. Re-drawing everything
     inside the pond's bounding box (the old rule) painted tree canopies, paths
     and lanterns over the whole scene as unsorted white blobs.
     Correct rule: a voxel is re-drawn when it sits over a water column, or is
     nearer to the camera than every water voxel, or stacks on such a voxel. */
  const wb = Scene.meta && Scene.meta.waterBox;
  const owSet = new Set();
  if (wb) {
    const waterKey = new Set();
    const waterCol = new Set();
    const WA = Scene.water;
    if (WA) for (let wi = 0; wi < WA.length; wi++) {
      const w = WA[wi];
      waterKey.add(VoxelWorld.K(w.x, w.y, w.z));
      waterCol.add((w.x + 512) | ((w.y + 512) << 10));
    }
    const VX = Scene.voxels;
    const cand = [];
    for (let i = 0; i < VX.count; i++) {
      const z = VX.zs[i];
      if (z < 1 || waterKind[VX.mi[i]]) continue;
      const x = VX.xs[i], y = VX.ys[i];
      if (x < wb.x0 || x > wb.x1 || y < wb.y0 || y > wb.y1) continue;
      const touchesWater =
        waterCol.has((x + 512) | ((y + 512) << 10)) ||
        waterKey.has(VoxelWorld.K(x + 1, y, z)) || waterKey.has(VoxelWorld.K(x - 1, y, z)) ||
        waterKey.has(VoxelWorld.K(x, y + 1, z)) || waterKey.has(VoxelWorld.K(x, y - 1, z)) ||
        waterKey.has(VoxelWorld.K(x, y, z - 1));
      if (touchesWater) {
        owSet.add(VoxelWorld.K(x, y, z));
      } else {
        cand.push(i);
      }
    }
    // railings / upper tiers: include anything stacked on an
    // already-included voxel, resolving bottom-up
    cand.sort((a, b) => VX.zs[a] - VX.zs[b]);
    for (let ci = 0; ci < cand.length; ci++) {
      const i = cand[ci];
      if (owSet.has(VoxelWorld.K(VX.xs[i], VX.ys[i], VX.zs[i] - 1))) {
        owSet.add(VoxelWorld.K(VX.xs[i], VX.ys[i], VX.zs[i]));
      }
    }
  }

  for (let oi = 0; oi < n; oi++) {
    const i = ord[oi];
    const X = px[i], Y = py[i];
    const mask = fm[i], m = mi[i];
    const q = hasLights ? tintForVoxel(xs[i] + 0.5, ys[i] + 0.5, zs[i] + 0.5) : 0;
    const base = m * 8;

    // Emissive voxels (lantern paper, fire): decide once whether this voxel is
    // currently "lit". It counts as lit only while the nearest lantern point
    // light — if one is close enough to own it — is switched on. Clicking a
    // lantern off therefore removes BOTH its glow halo (drawGlow) and the warm
    // colour of its own blocks (the additive fill below), instead of leaving
    // orange baked into the terrain.
    let emiLit = 0;
    if (em[i]) {
      emiLit = 1;
      const ecx = xs[i] + 0.5, ecy = ys[i] + 0.5, ecz = zs[i] + 0.5;
      let best = null, bd = 1e9;
      for (let li = 0; li < PointLights.length; li++) {
        const pL = PointLights[li];
        const ddx = ecx - pL.x, ddy = ecy - pL.y, ddz = ecz - pL.z;
        const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
        if (d < bd) { bd = d; best = pL; }
      }
      if (best && bd < 2.5 && !best.on) emiLit = 0;
    }

    if (waterKind[m]) {
      R.waterPts.push({ i: i, x: X, y: Y, m: m, mask: mask, cell: [xs[i], ys[i], zs[i]] });
    } else if (owSet.has(VoxelWorld.K(xs[i], ys[i], zs[i]))) {
      // bridge, in-pond rocks, waterfall mound, pond lip: re-drawn above the
      // animated water so occlusion stays correct
      R.overWater.push({ x: xs[i], y: ys[i], z: zs[i], m: m });
    }

    for (let f = 0; f < 6; f++) {
      if (!(mask & (1 << f))) continue;
      if (FN[f][0] * camX + FN[f][1] * camY + FN[f][2] * camZ <= 0.0005) continue;
      ctx.fillStyle = q ? tintedStr(base + f, q) : faceStr[base + f];

      const v = FV[f];
      const ax = X + v[0][0] * XX + v[0][1] * XY, ay = Y + v[0][0] * YX + v[0][1] * YY + v[0][2] * ZY;
      const bx = X + v[1][0] * XX + v[1][1] * XY, by = Y + v[1][0] * YX + v[1][1] * YY + v[1][2] * ZY;
      const cx2 = X + v[2][0] * XX + v[2][1] * XY, cy2 = Y + v[2][0] * YX + v[2][1] * YY + v[2][2] * ZY;
      const dx2 = X + v[3][0] * XX + v[3][1] * XY, dy2 = Y + v[3][0] * YX + v[3][1] * YY + v[3][2] * ZY;

      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx2, dy2);
      ctx.closePath();
      ctx.fill();

      // layered lighting: base colour first, then the emissive contribution
      // added on top (additive) for the same face. emiGate is 0 when the lamp
      // toggle is off, so the face keeps only its pure (neutral) base colour.
      // The warm hue lives in the material's ec, never in its base c.
      if (emiLit && emiGate > 0) {
        const M = MAT_LIST[m];
        const e = M.em * emiGate;
        if (e > 0.01) {
          const ec = M.ec || [255, 205, 130];
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = "rgba(" + ec[0] + "," + ec[1] + "," + ec[2] + "," +
            clamp(e * 0.55, 0, 0.85).toFixed(3) + ")";
          ctx.fill();
          ctx.restore();
        }
      }

      if (pf + 9 <= cap) {
        PF[pf] = i;
        PF[pf + 1] = ax | 0; PF[pf + 2] = ay | 0;
        PF[pf + 3] = bx | 0; PF[pf + 4] = by | 0;
        PF[pf + 5] = cx2 | 0; PF[pf + 6] = cy2 | 0;
        PF[pf + 7] = dx2 | 0; PF[pf + 8] = dy2 | 0;
        pf += 9;
      }
    }
  }
  R.pickCount = pf;
  R.staticDirty = false;
}

/* ---------------- soft ground shadows ---------------- */
function drawGroundShadows(ctx) {
  if (!Scene.meta) return;
  const strength = 0.20 + 0.30 * Light.dayFactor;
  const blobs = [{ x: PAGODA.x, y: PAGODA.y, r: 12.5, a: 1.0 }];
  for (const t of Scene.meta.trees) blobs.push({ x: t.x, y: t.y, r: t.r * 1.3, a: 0.72 });
  for (const g of [[24, 4], [12, 24], [-19, 6], [33, 15], [-30, -8], [20, -18]])
    blobs.push({ x: g[0], y: g[1], r: 3.6, a: 0.55 });

  const L = Light.dir;
  const off = 1.2 * (1.2 - Math.max(0, Light.elev || 0));
  ctx.save();
  for (const b of blobs) {
    const z = groundH(b.x, b.y) + 1.05;
    const p = project(b.x - L[0] * off, b.y - L[1] * off, z);
    const rx = b.r * K;
    if (rx < 2) continue;
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.scale(1, Math.max(0.16, sp));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const a = b.a * strength;
    g.addColorStop(0, "rgba(4,8,12," + a.toFixed(3) + ")");
    g.addColorStop(0.55, "rgba(4,8,12," + (a * 0.42).toFixed(3) + ")");
    g.addColorStop(1, "rgba(4,8,12,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------- picking ---------------- */
function pick(mx, my) {
  const PF = R.pickFaces;
  if (!PF || !Scene.voxels) return null;
  const x = mx * R.dpr, y = my * R.dpr;
  for (let p = R.pickCount - 9; p >= 0; p -= 9) {
    if (pointInQuad(x, y,
      PF[p + 1], PF[p + 2], PF[p + 3], PF[p + 4],
      PF[p + 5], PF[p + 6], PF[p + 7], PF[p + 8])) {
      const i = PF[p];
      const info = Scene.voxels.info[i];
      return info || { label: null, kind: null, i: i };
    }
  }
  return null;
}

/* ---------------- dynamic voxel props ---------------- */
function drawVoxelList(ctx, list) {
  for (const v of list) {
    const X = ox + (v.x * ca + v.y * sa) * K;
    const Y = oy + ((-v.x * sa + v.y * ca) * sp - v.z * cp) * K;
    const m = (typeof v.m === "string" ? MAT[v.m] : v.m).idx;
    const base = m * 8;
    for (let f = 0; f < 6; f++) {
      if (FN[f][0] * camX + FN[f][1] * camY + FN[f][2] * camZ <= 0.0005) continue;
      ctx.fillStyle = faceStr[base + f];
      const q = FV[f];
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const px2 = X + q[k][0] * XX + q[k][1] * XY;
        const py2 = Y + q[k][0] * YX + q[k][1] * YY + q[k][2] * ZY;
        if (k === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      ctx.closePath(); ctx.fill();
    }
  }
}

/* ---------- auto-framing ----------
   Fits the interesting content (pagoda, pond, torii, waterfall, bamboo) to the
   viewport, so the composition holds at any window size or device pixel ratio. */
function heroPoints() {
  const m = Scene.meta;
  const pts = [
    [PAGODA.x - 8, PAGODA.y - 8, 53], [PAGODA.x + 8, PAGODA.y + 8, 53],
    [PAGODA.x - 9, PAGODA.y - 9, 1], [PAGODA.x + 9, PAGODA.y + 9, 1],
    [0, 32, 13], [0, 34, 0],
    [POND.x - POND.r, POND.y - POND.r, 0], [POND.x + POND.r, POND.y + POND.r, 0],
    [-12, -4, 5], [-36, 16, 16], [-9, -14, 9], [-6, 8, 5],
  ];
  if (m && m.trees) for (const t of m.trees) pts.push([t.x, t.y, t.z + 3]);
  return pts;
}

/* Fit the hero content into the safe band of the viewport (below the title,
   above the control panel). Keeps the composition correct at any window
   size, aspect ratio or device pixel ratio. */
function fitView() {
  updateProjection();
  const pts = heroPoints();

  // shape coordinates: screen position at K = 1 with zero offsets
  let umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9;
  for (const p of pts) {
    const u = (p[0] - View.cx) * ca + (p[1] - View.cy) * sa;
    const v = ((View.cx - p[0]) * sa + (p[1] - View.cy) * ca) * sp - (p[2] - View.cz) * cp;
    if (u < umin) umin = u; if (u > umax) umax = u;
    if (v < vmin) vmin = v; if (v > vmax) vmax = v;
  }
  const du = Math.max(4, umax - umin), dv = Math.max(4, vmax - vmin);

  const topFrac = R.h < 620 ? 0.045 : 0.075;
  const botFrac = R.h < 620 ? 0.80 : 0.755;
  const band = R.h * (botFrac - topFrac);

  const Kfit = Math.min((R.w * 0.94) / du, band / dv);
  View.fitZoom = Kfit / R.dpr;

  const contentW = du * Kfit, contentH = dv * Kfit;
  const wantLeft = (R.w - contentW) / 2;
  const wantTop = R.h * topFrac + (band - contentH) / 2;
  View.offX = (wantLeft - R.w / 2 - umin * Kfit) / R.dpr;
  View.offY = (wantTop - R.h / 2 - vmin * Kfit) / R.dpr;

  updateProjection();
  R.staticDirty = true;
}
