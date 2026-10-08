/* ============================================================
   effects.js — water, petals, fireflies, koi, ripples, glow
   ============================================================ */
"use strict";

const Flags = { petals: true, fireflies: true, glow: true, sound: false };

const FX = {
  petals: null, fireflies: null, ripples: [], koi: [],
  splashes: [], smoke: null, sparkles: null,
  petalAcc: 0,
};

/* ---------------- petals / leaves / snow ---------------- */
function petalCount(season) {
  if (season === "spring") return 260;
  if (season === "autumn") return 200;
  if (season === "winter") return 300;
  return 90;
}

function resetParticles() {
  const S = Scene.season;
  const n = petalCount(S);
  const r = rng(S === "spring" ? 11 : S === "autumn" ? 12 : S === "winter" ? 13 : 14);
  FX.petals = [];
  for (let i = 0; i < n; i++) FX.petals.push(newPetal(r, true));

  FX.fireflies = [];
  for (let i = 0; i < 70; i++) {
    FX.fireflies.push({
      x: (r() - 0.5) * 74, y: (r() - 0.5) * 74, z: 1.5 + r() * 9,
      a: r() * TAU, sp: 0.25 + r() * 0.7, ph: r() * TAU, fr: 0.7 + r() * 1.8,
      vy: (r() - 0.5) * 0.5, life: r(),
    });
  }

  // koi in the pond
  FX.koi = [];
  const kr = rng(555);
  for (let i = 0; i < 7; i++) {
    FX.koi.push({
      a: kr() * TAU, rad: 2 + kr() * 7.5, sp: (0.16 + kr() * 0.3) * (kr() > 0.5 ? 1 : -1),
      len: 1 + (kr() * 2 | 0), m: kr() > 0.45 ? "koi" : "koiWhite",
      wob: kr() * TAU, z: POND.z || 0.15,
    });
  }

  FX.sparkles = [];
  const sr = rng(808);
  for (let i = 0; i < 90; i++)
    FX.sparkles.push({ x: sr(), y: sr(), ph: sr() * TAU, sp: 0.8 + sr() * 2.6, s: sr() > 0.7 ? 2 : 1 });

  FX.smoke = [];
  for (let i = 0; i < 26; i++) FX.smoke.push({ t: i / 26, x: 0, y: 0, seed: i });
}

function newPetal(r, anywhere) {
  const S = Scene.season;
  const spread = 46;
  const p = {
    x: (r() - 0.5) * spread * 2,
    y: (r() - 0.5) * spread * 2,
    z: anywhere ? 1 + r() * 34 : 26 + r() * 12,
    vx: 0, vy: 0, vz: 0,
    ph: r() * TAU, sp: 0.6 + r() * 1.6,
    size: 1 + (r() * 2 | 0),
    c: 0, spin: r() * TAU, sw: 0.5 + r() * 2,
  };
  if (S === "spring") {
    const pal = ["#ffd0dd", "#ffc0d0", "#f8aec4", "#fff0f4", "#f2b8c6"];
    p.c = pal[(r() * pal.length) | 0];
    p.vz = -0.55 - r() * 0.5;
  } else if (S === "autumn") {
    const pal = ["#e07438", "#d8542c", "#f0a63a", "#c04428", "#e88b3a"];
    p.c = pal[(r() * pal.length) | 0];
    p.vz = -0.7 - r() * 0.6;
    p.size = 1 + (r() * 2 | 0);
  } else if (S === "winter") {
    p.c = "#f2f6fb";
    p.vz = -0.42 - r() * 0.4;
    p.size = r() > 0.6 ? 2 : 1;
  } else {
    const pal = ["#cfe8b0", "#b8dc9a", "#fff2c0", "#ffd9e2"];
    p.c = pal[(r() * pal.length) | 0];
    p.vz = -0.3 - r() * 0.35;
  }
  return p;
}

function updatePetals(dt, t) {
  if (!FX.petals) return;
  const r = Math.random;
  const wind = 1.6 + Math.sin(t * 0.21) * 1.1 + Math.sin(t * 0.07) * 0.7;
  const gust = Math.max(0, Math.sin(t * 0.13) * 0.5 + Math.sin(t * 0.37) * 0.3);
  for (const p of FX.petals) {
    p.ph += dt * p.sp;
    p.spin += dt * p.sw;
    p.vx = wind * (0.55 + 0.45 * Math.sin(p.ph * 0.7)) + gust * 1.4;
    p.vy = Math.sin(p.ph * 0.9 + p.spin) * 1.5;
    p.vz *= 1;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    const gh = groundH(Math.round(p.x), Math.round(p.y));
    if (p.z < gh + 0.2 || Math.abs(p.x) > 48 || Math.abs(p.y) > 48) {
      const np = newPetal(r, false);
      // respawn near a tree canopy when possible for a nicer fall
      if (Scene.meta && Scene.meta.trees.length && r() < 0.6) {
        const tr = Scene.meta.trees[(r() * Scene.meta.trees.length) | 0];
        np.x = tr.x + (r() - 0.5) * tr.r * 2.4;
        np.y = tr.y + (r() - 0.5) * tr.r * 2.4;
        np.z = tr.z + (r() - 0.5) * 3;
      }
      Object.assign(p, np);
    }
  }
}

function drawPetals(ctx) {
  if (!FX.petals || !Flags.petals) return;
  const xs = [];
  for (const p of FX.petals) {
    const d = (-p.x * sa + p.y * ca) * cp + p.z * sp;
    xs.push(d);
  }
  const idx = [];
  for (let i = 0; i < FX.petals.length; i++) idx.push(i);
  idx.sort((a, b) => xs[a] - xs[b]);
  for (const i of idx) {
    const p = FX.petals[i];
    const P = project(p.x, p.y, p.z);
    if (P[0] < -20 || P[0] > R.w + 20 || P[1] < -20 || P[1] > R.h + 20) continue;
    const s = Math.max(1, p.size * K * 0.11);
    const wob = Math.abs(Math.sin(p.spin)) * 0.7 + 0.3;
    ctx.fillStyle = p.c;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(P[0] - s / 2, P[1] - s * wob / 2, s, Math.max(1, s * wob));
  }
  ctx.globalAlpha = 1;
}

/* ---------------- water ---------------- */
function drawWater(ctx, t) {
  const pts = R.waterPts;
  if (!pts || !pts.length) return;
  const day = Light.dayFactor;
  const wind = 0.55 + 0.45 * Math.sin(t * 0.19);
  const inset = 0.10;

  for (const w of pts) {
    if (!(w.mask & 16)) continue;                       // top face only
    const cell = w.cell;
    const X = w.x, Y = w.y;
    if (X < -K * 2 || X > R.w + K * 2 || Y < -K * 2 || Y > R.h + K * 2) continue;

    const w1 = Math.sin(cell[0] * 0.42 + cell[1] * 0.31 + t * 1.5);
    const w2 = Math.sin(cell[0] * 0.19 - cell[1] * 0.55 + t * 1.05);
    const wv = (w1 + w2) * 0.5;
    const base = w.m * 8;
    ctx.fillStyle = shiftStr(base + 4, Math.round(wv * 12));

    const v = FV[4];
    const i = inset;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      const ax2 = v[k][0] * (1 - i) + v[k2][0] * i;
      const ay2 = v[k][1] * (1 - i) + v[k2][1] * i;
      const bx2 = v[k2][0] * (1 - i) + v[k][0] * i;
      const by2 = v[k2][1] * (1 - i) + v[k][1] * i;
      const p1x = X + ((ax2 + bx2) / 2) * XX + ((ay2 + by2) / 2) * XY;
      const p1y = Y + ((ax2 + bx2) / 2) * YX + ((ay2 + by2) / 2) * YY + ((v[k][2] + v[k2][2]) / 2) * ZY;
      if (k === 0) ctx.moveTo(p1x, p1y); else ctx.lineTo(p1x, p1y);
    }
    ctx.closePath(); ctx.fill();

    // specular sparkle
    if (day > 0.12) {
      const s = FX.sparkles[Math.abs(cell[0] * 7 + cell[1] * 13) % FX.sparkles.length];
      const tw = Math.sin(t * s.sp * (1.2 + wind) + s.ph + cell[0] * 0.6 + cell[1] * 0.4);
      if (tw > 0.70) {
        const a = (tw - 0.70) / 0.30 * day * 0.8;
        ctx.fillStyle = "rgba(255,252,240," + a.toFixed(3) + ")";
        const sz = Math.max(1, K * 0.15 * s.s);
        ctx.fillRect(X + K * 0.5 + (s.x - 0.5) * K * 0.7 - sz / 2,
          Y + K * 0.5 + (s.y - 0.5) * K * 0.4 - sz / 2, sz, sz);
      }
    }
  }

  drawKoi(ctx, t);
  drawRipples(ctx);
}

function drawWaterfall(ctx, t) {
  if (!Scene.meta || !Scene.meta.falls) return;
  const day = Light.dayFactor;
  for (const f of Scene.meta.falls) {
    for (let z = f.z0; z >= f.z1; z--) {
      for (let dx = -1; dx <= 0; dx++) {
        const x = f.x + dx, y = f.y;
        const X = ox + (x * ca + y * sa) * K;
        const Y = oy + ((-x * sa + y * ca) * sp - z * cp) * K;
        const ph = (z * 0.9 + t * 5.2 + dx * 1.3);
        const a = 0.30 + 0.34 * (0.5 + 0.5 * Math.sin(ph));
        const w = Math.max(1, K * 0.42);
        ctx.fillStyle = "rgba(" + (214 + day * 30 | 0) + "," + (236 + day * 16 | 0) + ",255," + a.toFixed(3) + ")";
        ctx.fillRect(X - w / 2, Y - K * 0.55, w, K * 0.95);
      }
    }
    // mist at the base
    const P = project(f.x, f.y, f.z1 + 0.4);
    const mr = K * 2.4;
    const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], mr);
    const ma = 0.10 + 0.06 * Math.sin(t * 2.1);
    g.addColorStop(0, "rgba(236,244,252," + (ma + 0.08).toFixed(3) + ")");
    g.addColorStop(1, "rgba(236,244,252,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(P[0], P[1], mr, 0, TAU); ctx.fill();
  }
}

function drawKoi(ctx, t) {
  if (!FX.koi) return;
  const z = 0.12;
  for (const k of FX.koi) {
    k.a += k.sp * 0.016;
    const wob = Math.sin(t * 1.6 + k.wob) * 0.6;
    const x = POND.x + Math.cos(k.a) * (k.rad + wob);
    const y = POND.y + Math.sin(k.a) * (k.rad + wob) * 1.05;
    const P = project(x, y, z);
    const m = MAT[k.m];
    const col = shadeCache[m.idx * 8 + 4] & 0xffffff;
    ctx.globalAlpha = 0.6;
    for (let s = 0; s <= k.len; s++) {
      const aa = k.a + Math.PI / 2 + s * 0.16;
      const px = x - Math.cos(aa) * s * 0.85, py = y - Math.sin(aa) * s * 0.85;
      const Q = project(px, py, z);
      const sz = Math.max(1.5, K * (s === 0 ? 0.34 : 0.26));
      ctx.fillStyle = "#" + col.toString(16).padStart(6, "0");
      ctx.fillRect(Q[0] - sz / 2, Q[1] - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------------- ripples ---------------- */
function addRipple(x, y, strength) {
  FX.ripples.push({ x: x, y: y, r: 0.2, max: 3.2 + strength * 3, a: 0.55 + strength * 0.3 });
  if (FX.ripples.length > 40) FX.ripples.shift();
}
function updateRipples(dt) {
  for (const r of FX.ripples) { r.r += dt * 3.4; r.a -= dt * 0.42; }
  FX.ripples = FX.ripples.filter((r) => r.a > 0 && r.r < r.max);
}
function drawRipples(ctx) {
  for (const r of FX.ripples) {
    const P = project(r.x, r.y, 0.16);
    const rx = r.r * K, ry = r.r * K * Math.max(0.18, sp);
    ctx.save();
    ctx.translate(P[0], P[1]);
    ctx.strokeStyle = "rgba(238,248,255," + Math.max(0, r.a).toFixed(3) + ")";
    ctx.lineWidth = Math.max(1, K * 0.07);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke();
    if (r.r > 1) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------------- splashes ---------------- */
function addSplash(x, y, z, n, colour) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = 0.6 + Math.random() * 2.4;
    FX.splashes.push({
      x: x, y: y, z: z,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 2.6 + Math.random() * 3.4,
      life: 0.55 + Math.random() * 0.5, t: 0, c: colour || "rgba(226,242,255,0.9)",
    });
  }
  if (FX.splashes.length > 400) FX.splashes.splice(0, FX.splashes.length - 400);
}
function updateSplashes(dt) {
  for (const s of FX.splashes) {
    s.t += dt;
    s.vz -= 14 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  }
  FX.splashes = FX.splashes.filter((s) => s.t < s.life);
}
function drawSplashes(ctx) {
  for (const s of FX.splashes) {
    const P = project(s.x, s.y, s.z);
    const a = Math.max(0, 1 - s.t / s.life);
    ctx.fillStyle = s.c.replace(/[\d.]+\)$/, (a * 0.9).toFixed(3) + ")");
    const sz = Math.max(1, K * 0.11);
    ctx.fillRect(P[0] - sz / 2, P[1] - sz / 2, sz, sz);
  }
}

/* ---------------- lantern glow, fireflies, mist ---------------- */
function drawGlow(ctx, t) {
  if (!Flags.glow) return;
  const pulse = 0.86 + 0.14 * Math.sin(t * 2.3);
  const flick = (p) => 0.82 + 0.18 * Math.sin(t * (5.1 + p)) + 0.08 * Math.sin(t * (11.3 + p * 3));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const L of PointLights) {
    if (!L.on) continue;
    const P = project(L.x, L.y, L.z);
    if (P[0] < -200 || P[0] > R.w + 200 || P[1] < -200 || P[1] > R.h + 200) continue;
    const f = L.kind === "stone" || L.kind === "hang" ? flick(L.x + L.y) : pulse;
    const strength = (0.30 + 0.70 * Light.glow) * f;
    const rad = K * (L.r * 0.42);
    const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rad);
    const c = L.c;
    g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.34 * strength).toFixed(3) + ")");
    g.addColorStop(0.28, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.13 * strength).toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawFireflies(ctx, t) {
  if (!Flags.fireflies || !FX.fireflies) return;
  const night = Light.glow;
  if (night < 0.15) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const f of FX.fireflies) {
    f.a += (Math.random() - 0.5) * 0.5;
    f.x += Math.cos(f.a) * f.sp * 0.06;
    f.y += Math.sin(f.a) * f.sp * 0.06;
    f.z += Math.sin(t * 0.7 + f.ph) * 0.012;
    if (Math.abs(f.x) > 40 || Math.abs(f.y) > 40) { f.x *= -0.9; f.y *= -0.9; }
    const gh = groundH(Math.round(f.x), Math.round(f.y));
    if (f.z < gh + 1) f.z = gh + 1;
    const bl = 0.5 + 0.5 * Math.sin(t * f.fr * 2.4 + f.ph);
    const a = night * bl * 0.9;
    if (a < 0.03) continue;
    const P = project(f.x, f.y, f.z);
    if (P[0] < 0 || P[0] > R.w || P[1] < 0 || P[1] > R.h) continue;
    const rad = Math.max(3, K * 0.42);
    const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rad);
    g.addColorStop(0, "rgba(255,246,170," + (a * 0.85).toFixed(3) + ")");
    g.addColorStop(0.35, "rgba(214,255,150," + (a * 0.22).toFixed(3) + ")");
    g.addColorStop(1, "rgba(180,255,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,252,206," + a.toFixed(3) + ")";
    const s = Math.max(1, K * 0.07);
    ctx.fillRect(P[0] - s / 2, P[1] - s / 2, s, s);
  }
  ctx.restore();
}

/* incense / chimney smoke wisps near the pagoda base */
function drawSmoke(ctx, t) {
  if (!FX.smoke) return;
  const src = { x: -6, y: -22, z: 3 };
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const s of FX.smoke) {
    const tt = (s.t + t * 0.09) % 1;
    const z = src.z + tt * 11;
    const sway = Math.sin(t * 0.6 + s.seed) * (0.5 + tt * 2.4);
    const P = project(src.x + sway, src.y + Math.cos(t * 0.4 + s.seed * 1.7) * 0.8, z);
    const rad = K * (0.5 + tt * 3.2);
    const a = (1 - tt) * 0.09 * (0.4 + 0.6 * Light.dayFactor);
    const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rad);
    g.addColorStop(0, "rgba(226,226,232," + a.toFixed(3) + ")");
    g.addColorStop(1, "rgba(226,226,232,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------------- post: vignette + horizon haze ---------------- */
function drawPost(ctx) {
  // horizon haze band to seat the garden in the sky
  const hz = R.h * 0.42;
  const g = ctx.createLinearGradient(0, hz, 0, R.h * 0.78);
  g.addColorStop(0, css(Light.skyHor, 0.30));
  g.addColorStop(1, css(Light.skyHor, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, hz, R.w, R.h * 0.4);

  const v = ctx.createRadialGradient(R.w / 2, R.h * 0.46, Math.min(R.w, R.h) * 0.30,
    R.w / 2, R.h * 0.5, Math.max(R.w, R.h) * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(3,5,10,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, R.w, R.h);
}

/* ---------------- per-frame ---------------- */
function updateFX(dt, t) {
  updatePetals(dt, t);
  updateRipples(dt);
  updateSplashes(dt);
  updateProps(dt, t);
}

/* structures that sit above the water (bridge, in-pond rocks, fall mound)
   are re-drawn after the animated water so occlusion stays correct */
function drawOverWater(ctx) {
  if (R.overWater && R.overWater.length) drawVoxelList(ctx, R.overWater);
}

function drawFX(ctx, t) {
  drawWater(ctx, t);
  drawOverWater(ctx);
  drawWaterfall(ctx, t);
  drawSmoke(ctx, t);
  drawSplashes(ctx);
  drawPetals(ctx);
  drawGlow(ctx, t);
  drawFireflies(ctx, t);
}

function drawWaterfallReflectionHint(ctx, t) {
  if (!Scene.meta || !Scene.meta.falls) return;
  const f = Scene.meta.falls[0];
  const P = project(f.x, f.y + 3.5, 0.2);
  const rad = K * 3;
  const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rad);
  const a = 0.06 + 0.03 * Math.sin(t * 3.1);
  g.addColorStop(0, "rgba(240,248,255," + a.toFixed(3) + ")");
  g.addColorStop(1, "rgba(240,248,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, TAU); ctx.fill();
}

/* ---------------- dynamic props: bell + shishi-odoshi ---------------- */
function updateProps(dt, t) {
  const m = Scene.meta;
  if (!m) return;

  // bell sway decays after a ring
  if (m.bell) {
    m.bell.ring = Math.max(0, m.bell.ring - dt * 0.9);
    m.bell.swing = m.bell.ring * Math.sin(t * 7.5) * 0.55;
  }

  // shishi-odoshi: fills, tips, clacks
  const o = m.odoshi;
  if (o) {
    o.timer += dt;
    if (o.state === 0) {                       // filling / resting
      o.angle = lerp(o.angle, 0.12, 1 - Math.pow(0.02, dt));
      if (o.timer > 4.6) { o.state = 1; o.timer = 0; }
    } else if (o.state === 1) {                // tipping forward
      o.angle = lerp(o.angle, -1.15, 1 - Math.pow(0.0009, dt));
      if (o.timer > 0.75) {
        o.state = 2; o.timer = 0;
        if (Flags.sound) Audio.clack();
        addSplash(o.x - 1, o.y, o.z - 0.4, 7, "rgba(214,238,252,0.9)");
      }
    } else {                                   // swinging back up
      o.angle = lerp(o.angle, 0.12, 1 - Math.pow(0.06, dt));
      if (o.timer > 1.5) { o.state = 0; o.timer = 0; }
    }
  }
}

function collectPropVoxels() {
  const out = [];
  const m = Scene.meta;
  if (!m) return out;
  const t = performance.now() * 0.001;

  if (m.bellProp && m.bell) {
    const sw = m.bell.swing;
    for (const it of m.bellProp.items) {
      const a = it.dz;
      out.push({
        x: m.bellProp.x + Math.sin(sw) * -a,
        y: m.bellProp.y,
        z: m.bellProp.z + Math.cos(sw) * a,
        m: it.m,
      });
    }
  }

  if (m.odoshi) {
    const o = m.odoshi;
    const ca2 = Math.cos(o.angle), sa2 = Math.sin(o.angle);
    for (const it of o.items) {
      out.push({
        x: o.x + it.dx * ca2 - it.dz * sa2,
        y: o.y + it.dy,
        z: o.z + it.dx * sa2 + it.dz * ca2,
        m: it.m,
      });
    }
  }
  return out;
}
