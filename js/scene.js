/* ============================================================
   scene.js — the garden: pagoda, pond, paths, trees, lanterns
   ============================================================ */
"use strict";

const GARDEN = 42;                 // half-extent of the raked ground
const PAGODA = { x: 0, y: -18 };
const POND = { x: 19, y: 14, r: 11 };

const SEASON = {
  spring: {
    grass: "grass", grassAlt: "moss", canopy: ["sakura", "sakuraDeep", "sakuraPale"],
    maple: "leafMid", pine: "leafPine", flowers: true, snow: false, ice: false,
    bamboo: "bamboo", shrub: "shrubRound",
  },
  summer: {
    grass: "grass", grassAlt: "moss", canopy: ["leafMid", "leaf", "leafDark"],
    maple: "leaf", pine: "leafPine", flowers: false, snow: false, ice: false,
    bamboo: "bamboo", shrub: "shrub",
  },
  autumn: {
    grass: "grassDry", grassAlt: "moss", canopy: ["leafMapleGold", "leafMaple", "flowerRed"],
    maple: "leafMaple", pine: "leafPineMid", flowers: false, snow: false, ice: false,
    bamboo: "bambooDark", shrub: "shrubRound",
  },
  winter: {
    grass: "grassDry", grassAlt: "grassDry", canopy: [], maple: null,
    pine: "leafPine", flowers: false, snow: true, ice: true,
    bamboo: "bambooDark", shrub: "shrub",
  },
};

/* ------------------------------------------------------------------ */
function buildWorld(season) {
  const S = SEASON[season];
  const W = new VoxelWorld();
  const meta = {
    lanterns: [], koi: [], trees: [], waterCells: [], falls: [],
    bell: null, odoshi: null, pond: POND,
  };

  ground(W, S);
  pondAndStream(W, S, meta);
  paths(W, S);
  pagoda(W, S, meta);
  torii(W, S);
  bridge(W, S, meta);
  stoneLanterns(W, meta);
  trees(W, S, meta);
  rocks(W, S);
  shrubsAndFlowers(W, S);
  bambooGrove(W, S);
  bellTower(W, S, meta);
  shishiOodoshi(W, S, meta);
  border(W, S);
  if (S.snow) applySnow(W);

  return { world: W, meta: meta };
}

/* ---------------- ground ---------------- */
function ground(W, S) {
  const R = GARDEN;
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      let h = 0;
      // gentle hill, back-left, for a pine cluster
      const hd = Math.hypot(x + 29, y + 29);
      if (hd < 17) h = Math.round(Math.pow(1 - hd / 17, 1.4) * 5);
      // slight undulation everywhere
      h += Math.round(fbm2(x * 0.07, y * 0.07, 9, 3) * 1.6 - 0.6);
      if (h < 0) h = 0;
      // keep the pagoda terrace and main path flat
      if (Math.abs(x) < 12 && y > -30 && y < 40) h = 0;
      const n = fbm2(x * 0.16, y * 0.16, 3, 3);
      const top = n > 0.62 ? S.grassAlt : S.grass;
      for (let z = h; z >= h - 2; z--) {
        if (z === h) W.set(x, y, z, top);
        else W.set(x, y, z, z === h - 1 ? "dirt" : "mud");
      }
    }
  }
}

/* ---------------- pond, stream, waterfall basin ---------------- */
function pondAndStream(W, S, meta) {
  const carve = (x, y) => {
    if (x < -GARDEN || x > GARDEN || y < -GARDEN || y > GARDEN) return;
    for (let z = 1; z <= 6; z++) W.remove(x, y, z);
    W.set(x, y, 0, S.ice ? "ice" : "water");
    W.set(x, y, -1, S.ice ? "ice" : "waterDeep");
    W.set(x, y, -2, "mud");
    meta.waterCells.push({ x: x, y: y });
  };

  // pond: noisy disc
  for (let y = POND.y - POND.r - 3; y <= POND.y + POND.r + 3; y++) {
    for (let x = POND.x - POND.r - 3; x <= POND.x + POND.r + 3; x++) {
      const d = Math.hypot(x - POND.x, (y - POND.y) * 1.12);
      const wob = (fbm2(x * 0.13, y * 0.13, 21, 3) - 0.5) * 6.5;
      if (d + wob < POND.r) carve(x, y);
    }
  }
  // deep centre
  for (let y = POND.y - 5; y <= POND.y + 5; y++)
    for (let x = POND.x - 5; x <= POND.x + 5; x++)
      if (Math.hypot(x - POND.x, y - POND.y) < 5) W.set(x, y, -1, S.ice ? "ice" : "waterDeep");

  // stream: pond -> waterfall basin
  const pts = [[10, 11], [7, 9], [4, 7], [1, 6], [-2, 4], [-5, 2], [-8, 0], [-10, -1], [-12, -2]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(lerp(a[0], b[0], t)), cy = Math.round(lerp(a[1], b[1], t));
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          if (ox * ox + oy * oy > 2) continue;
          carve(cx + ox, cy + oy);
        }
    }
  }
  // basin under the fall
  for (let y = -6; y <= 2; y++)
    for (let x = -17; x <= -8; x++)
      if (Math.hypot(x + 12, y + 2) < 4.6) carve(x, y);

  // pond & stream edging: stone lip on land cells that touch water
  const wc = meta.waterCells;
  const isWater = (x, y) => {
    const v = W.get(x, y, 0);
    return v !== undefined && MAT_LIST[v].k === "water";
  };
  const lip = [];
  for (const c of wc) {
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + d[0], ny = c.y + d[1];
      if (isWater(nx, ny)) continue;
      if (W.get(nx, ny, 0) === undefined) continue;
      if (Math.abs(nx) < 12 && ny > -30 && ny < 40 && Math.abs(nx) < 3) continue;
      lip.push([nx, ny]);
    }
  }
  for (const [x, y] of lip) {
    if (hash2(x, y, 5) > 0.55) W.set(x, y, 0, "stoneWarm");
    else if (hash2(x, y, 6) > 0.3) W.set(x, y, 0, "gravelDark");
  }

  // bounding box of every water surface, used to re-draw structures above it
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of wc) {
    if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x;
    if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y;
  }
  meta.waterBox = { x0: x0 - 1, x1: x1 + 1, y0: y0 - 1, y1: y1 + 1 };

  // waterfall rock mound
  W.withTag("滝", "fall", () => {
    for (let z = 1; z <= 4; z++) {
      const r = 4.2 - z * 0.55;
      for (let y = -8; y <= 3; y++)
        for (let x = -18; x <= -7; x++) {
          const d = Math.hypot(x + 12, (y + 2) * 1.1);
          if (d + (hash2(x, y + z * 31, 7) - 0.5) * 1.6 < r)
            W.set(x, y, z, hash2(x * 7, y * 3 + z, 11) > 0.72 ? "mossRock" : "stone");
        }
    }
    // notch for the water to fall through
    for (let z = 1; z <= 4; z++) { W.remove(-12, -2, z); W.remove(-12, -1, z); W.remove(-13, -2, z); }
  });
  meta.falls.push({ x: -12.5, y: -1.5, z0: 4, z1: 0 });
}

/* ---------------- paths ---------------- */
function paths(W, S) {
  const put = (x, y, m) => {
    if (W.get(x, y, 0) === undefined) return;
    if (MAT_LIST[W.get(x, y, 0)].k === "water") return;
    W.set(x, y, 0, m);
  };
  // main approach: torii -> pagoda
  for (let y = -9; y <= 37; y++)
    for (let x = -2; x <= 2; x++) put(x, y, "gravel");
  // stepping stones across the pond's south side
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 3, y = 26 - Math.round(Math.sin(i * 0.7) * 3);
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++)
        if (Math.abs(ox) + Math.abs(oy) <= 1) put(x + ox, y + oy, "stone");
  }
  // rim path around the pond
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * TAU;
    const r = POND.r + 4.5 + Math.sin(t * 3) * 1.5;
    const x = Math.round(POND.x + Math.cos(t) * r), y = Math.round(POND.y + Math.sin(t) * r * 1.05);
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++)
        if (ox * ox + oy * oy <= 1) put(x + ox, y + oy, "sand");
  }
  // link to the pagoda terrace
  for (let y = -10; y <= -8; y++) for (let x = -3; x <= 3; x++) put(x, y, "stoneWarm");
  // dry garden (karesansui) raked sand beside the pagoda
  for (let y = -30; y <= -26; y++)
    for (let x = -8; x <= 8; x++) put(x, y, "sand");
  for (let i = 0; i < 3; i++)
    for (let x = -8; x <= 8; x++) put(x, -30 + i * 2, "gravelDark");
}

/* ---------------- pagoda ---------------- */
function pagoda(W, S, meta) {
  const cx = PAGODA.x, cy = PAGODA.y;
  W.withTag("五重塔", "pagoda", () => {
    // terraces
    W.box(cx - 9, cy - 9, 1, cx + 9, cy + 9, 1, "stone");
    W.box(cx - 8, cy - 8, 2, cx + 8, cy + 8, 2, "stoneWarm");
    W.box(cx - 7, cy - 7, 3, cx + 7, cy + 7, 3, "stoneWarm");
    // stair on the front (+y)
    for (let s = 0; s < 3; s++)
      W.box(cx - 2, cy + 9 + s, 1 + (2 - s), cx + 2, cy + 9 + s, 1 + (2 - s), "stone");

    const tiers = [
      { z: 4, h: 6, half: 5 },
      { z: 13, h: 4, half: 4 },
      { z: 20, h: 4, half: 3 },
      { z: 27, h: 4, half: 3 },
      { z: 34, h: 4, half: 2 },
    ];
    const roofs = [
      { z: 10, half: 8 },
      { z: 17, half: 7 },
      { z: 24, half: 6 },
      { z: 31, half: 5 },
      { z: 38, half: 4 },
    ];

    tiers.forEach((t, i) => {
      tierBody(W, cx, cy, t.z, t.h, t.half, i === 0);
      if (i > 0) balcony(W, cx, cy, t.z, t.half + 1);
    });
    roofs.forEach((r, i) => roof(W, cx, cy, r.z, r.half, i === 0 ? "roofTile" : "roofTile"));

    // hanging lanterns under the first eave
    const corners = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
    for (const [ox, oy] of corners) {
      const lx = cx + ox, ly = cy + oy;
      W.set(lx, ly, 8, "woodDark");
      W.set(lx, ly, 7, "lanternRed");
      W.set(lx, ly, 6, "lanternRed");
      W.set(lx, ly, 5, "lanternRed");
      W.set(lx, ly, 4, "woodDark");
      meta.lanterns.push({
        x: lx + 0.5, y: ly + 0.5, z: 5.5, r: 13, i: 0.85,
        c: [255, 150, 90], on: true, kind: "hang", auto: true,
      });
    }

    // finial / sorin
    const fz = 42;
    W.set(cx, cy, fz, "gold");
    for (let z = fz + 1; z <= fz + 9; z++) W.set(cx, cy, z, z % 2 ? "goldBright" : "gold");
    for (let ring = 0; ring < 3; ring++) {
      const rz = fz + 2 + ring * 2, rr = 3 - ring;
      for (let a = 0; a < 12; a++) {
        const t = (a / 12) * TAU;
        W.set(Math.round(cx + Math.cos(t) * rr), Math.round(cy + Math.sin(t) * rr), rz, "gold");
      }
    }
    W.set(cx, cy, fz + 10, "goldBright");
    W.set(cx, cy, fz + 11, "goldBright");
  });
}

function tierBody(W, cx, cy, z0, h, half, groundFloor) {
  const z1 = z0 + h;
  W.box(cx - half, cy - half, z0, cx + half, cy + half, z0, "woodDark");
  for (let z = z0 + 1; z <= z1; z++) {
    for (let y = cy - half; y <= cy + half; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        const ex = x === cx - half || x === cx + half;
        const ey = y === cy - half || y === cy + half;
        if (!ex && !ey) continue;
        const corner = ex && ey;
        let m = "plaster";
        if (corner) m = "wood";
        else if (z === z1) m = "woodDark";
        else if (z === z0 + 1) m = "woodPale";
        W.set(x, y, z, m);
      }
    }
  }
  // posts at every other bay + dark window slits
  for (let z = z0 + 2; z <= z1 - 1; z += 2) {
    for (let y = cy - half; y <= cy + half; y++)
      for (let x = cx - half; x <= cx + half; x++) {
        const onEdge = (x === cx - half || x === cx + half) !== (y === cy - half || y === cy + half);
        if (!onEdge) continue;
        if ((x + y + z) % 3 === 0) W.set(x, y, z, "ink");
      }
  }
  if (!groundFloor) return;
  // entrance on the +y face
  for (let z = z0 + 1; z <= z0 + 4; z++)
    for (let x = cx - 1; x <= cx + 1; x++) W.set(x, cy + half, z, "woodDark");
  for (let z = z0 + 2; z <= z0 + 4; z++)
    for (let x = cx - 1; x <= cx + 1; x++) W.remove(x, cy + half, z);
  // interior hint (tatami + a gold shrine) visible through the door
  W.box(cx - 4, cy - 4, z0 + 1, cx + 4, cy + 4, z0 + 1, "tatami");
  W.box(cx - 1, cy - 2, z0 + 2, cx + 1, cy, z0 + 4, "gold");
  W.set(cx, cy - 1, z0 + 5, "goldBright");
}

function balcony(W, cx, cy, z, half) {
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++) {
      const ex = x === cx - half || x === cx + half;
      const ey = y === cy - half || y === cy + half;
      if (!ex && !ey) continue;
      W.set(x, y, z - 1, "woodPale");
      if ((x + y) % 2 === 0) W.set(x, y, z, "woodPale");
    }
}

function roof(W, cx, cy, z0, half) {
  for (let i = 0; i < 3; i++) {
    const h = half - i;
    W.box(cx - h, cy - h, z0 + i, cx + h, cy + h, z0 + i, i === 2 ? "woodDark" : "roofTile");
  }
  // eave trim + lifted corners (the soroban curve)
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ax = cx + sx * half, ay = cy + sy * half;
    W.set(ax, ay, z0, "roofTileEdge");
    W.set(ax, ay, z0 + 1, "roofTileEdge");
    W.set(ax, ay, z0 + 2, "roofTileEdge");
    W.set(ax + sx, ay + sy, z0 + 1, "roofTileEdge");
    W.set(ax + sx, ay + sy, z0 + 2, "gold");
    // mid-eave lift
    W.set(cx + sx * half, cy, z0 + 1, "roofTileEdge");
    W.set(cx, cy + sy * half, z0 + 1, "roofTileEdge");
  }
  // soffit shadow band under the eave
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++) {
      const ex = x === cx - half || x === cx + half;
      const ey = y === cy - half || y === cy + half;
      if (ex || ey) W.set(x, y, z0 - 1, "woodDark");
    }
}

/* ---------------- torii ---------------- */
function torii(W, S) {
  const tx = 0, ty = 32;
  W.withTag("鳥居", "torii", () => {
    for (let z = 1; z <= 10; z++) {
      W.set(tx - 4, ty, z, "torii");
      W.set(tx + 4, ty, z, "torii");
    }
    W.set(tx - 4, ty, 1, "toriiDark"); W.set(tx + 4, ty, 1, "toriiDark");
    W.box(tx - 5, ty, 8, tx + 5, ty, 8, "toriiDark");           // nuki
    W.box(tx - 6, ty, 11, tx + 6, ty, 11, "toriiDark");         // shimaki
    W.box(tx - 7, ty, 12, tx + 7, ty, 12, "torii");             // kasagi
    for (let x = tx - 7; x <= tx + 7; x++) W.set(x, ty, 13, "ink");
    W.set(tx, ty, 9, "white"); W.set(tx, ty, 10, "white");
    // base stones
    W.set(tx - 4, ty, 0, "stone"); W.set(tx + 4, ty, 0, "stone");
  });
}

/* ---------------- bridge ---------------- */
function bridge(W, S, meta) {
  const bx = 0, y0 = -1, y1 = 7;
  W.withTag("橋", "bridge", () => {
    for (let y = y0; y <= y1; y++) {
      const tt = (y - y0) / (y1 - y0);
      const deck = 2 + Math.round(Math.sin(tt * Math.PI) * 2.2);
      for (let x = bx - 2; x <= bx + 2; x++) W.set(x, y, deck, "bridge");
      // railings
      W.set(bx - 2, y, deck + 1, "woodPale");
      W.set(bx + 2, y, deck + 1, "woodPale");
      if ((y - y0) % 2 === 0) {
        W.set(bx - 2, y, deck + 2, "woodPale");
        W.set(bx + 2, y, deck + 2, "woodPale");
      }
      // piers down into the water
      if ((y - y0) % 3 === 0) for (let pz = deck - 1; pz >= -1; pz--) W.set(bx, y, pz, "woodDark");
    }
    // abutments
    W.box(bx - 2, y0 - 1, 1, bx + 2, y0 - 1, 2, "stone");
    W.box(bx - 2, y1 + 1, 1, bx + 2, y1 + 1, 2, "stone");
  });
  meta.bridge = { x0: bx - 2, x1: bx + 2, y0: y0 - 1, y1: y1 + 1 };
}

/* ---------------- stone lanterns ---------------- */
function stoneLantern(W, x, y, z, meta, big) {
  W.withTag("石灯籠", "lantern", () => {
    const s = big ? 1 : 0;
    W.box(x - 1 - s, y - 1 - s, z, x + 1 + s, y + 1 + s, z, "stoneDark");
    W.set(x, y, z + 1, "stone");
    W.set(x, y, z + 2, "stone");
    W.box(x - 1, y - 1, z + 3, x + 1, y + 1, z + 3, "stoneLantern");
    // fire box: posts + glowing panels
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.set(x + ox, y + oy, z + 4, "stoneLantern");
    W.set(x + 1, y, z + 4, "paperWarm"); W.set(x - 1, y, z + 4, "paperWarm");
    W.set(x, y + 1, z + 4, "paperWarm"); W.set(x, y - 1, z + 4, "paperWarm");
    W.set(x, y, z + 4, "fire");
    W.box(x - 1, y - 1, z + 5, x + 1, y + 1, z + 5, "stoneLantern");
    W.box(x - 2, y - 2, z + 6, x + 2, y + 2, z + 6, "stoneDark");
    W.set(x, y, z + 7, "stone");
  });
  meta.lanterns.push({
    x: x + 0.5, y: y + 0.5, z: z + 4.5, r: 15, i: 1.0,
    c: [255, 178, 96], on: true, kind: "stone", auto: true, id: meta.lanterns.length,
  });
}

function stoneLanterns(W, meta) {
  const spots = [
    [-4, 27], [4, 27], [-4, 17], [4, 17], [-4, 7], [4, 7],
    [-4, -6], [4, -6],
    [30, 22], [8, 20], [-16, 4], [-6, -26], [8, -26],
  ];
  spots.forEach((p, i) => stoneLantern(W, p[0], p[1], 0, meta, i < 2));
}

/* ---------------- trees ---------------- */
function trees(W, S, meta) {
  const sakura = [[-15, 21], [13, 31], [-26, 3], [27, -4], [-6, 14]];
  const maples = [[-21, -12], [31, 3], [10, -30]];
  const pines = [[-29, -30], [-35, -20], [34, 25], [-38, 26]];

  sakura.forEach((p, i) => sakuraTree(W, S, p[0], p[1], 0, 1000 + i * 37, meta));
  maples.forEach((p, i) => mapleTree(W, S, p[0], p[1], 0, 2000 + i * 53, meta));
  pines.forEach((p, i) => pineTree(W, S, p[0], p[1], groundH(p[0], p[1]), 3000 + i * 71, meta));
}

function groundH(x, y) {
  let h = 0;
  const hd = Math.hypot(x + 29, y + 29);
  if (hd < 17) h = Math.round(Math.pow(1 - hd / 17, 1.4) * 5);
  h += Math.round(fbm2(x * 0.07, y * 0.07, 9, 3) * 1.6 - 0.6);
  if (h < 0) h = 0;
  if (Math.abs(x) < 12 && y > -30 && y < 40) h = 0;
  return h;
}

function trunk(W, x, y, z0, h, r, seed, lean) {
  for (let z = z0; z < z0 + h; z++) {
    const t = (z - z0) / h;
    const ox = Math.round(Math.sin(t * 2.1 + seed) * lean);
    const oy = Math.round(Math.cos(t * 1.7 + seed) * lean);
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 0.4) continue;
        W.set(x + ox + dx, y + oy + dy, z, t > 0.62 ? "trunkPale" : "trunk");
      }
  }
  return { x: x + Math.round(Math.sin(2.1 + seed) * lean), y: y + Math.round(Math.cos(1.7 + seed) * lean), z: z0 + h };
}

function sakuraTree(W, S, x, y, z, seed, meta) {
  const rnd = rng(seed);
  const h = 7 + Math.floor(rnd() * 3);
  W.withTag("桜", "tree", () => {
    const top = trunk(W, x, y, z + 1, h, 1, seed * 0.01, 1);
    // branch arms
    const arms = 4 + Math.floor(rnd() * 2);
    const blobs = [];
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * TAU + rnd() * 0.7;
      const len = 2 + Math.floor(rnd() * 2);
      let bx = top.x, by = top.y, bz = top.z;
      for (let s = 0; s < len; s++) {
        bx += Math.round(Math.cos(a)); by += Math.round(Math.sin(a)); bz += 1;
        W.set(bx, by, bz, "trunk");
      }
      blobs.push({ x: bx, y: by, z: bz + 1, r: 2.6 + rnd() * 1.4 });
    }
    blobs.push({ x: top.x, y: top.y, z: top.z + 2, r: 3.2 + rnd() * 1.2 });
    if (S.canopy.length) {
      blobs.forEach((b, i) => {
        const m = S.canopy[i % S.canopy.length];
        W.blob(b.x, b.y, b.z, b.r, b.r * 0.72, b.r, m, 0.42, seed + i * 13);
      });
      // sparse pale highlights on top (not a solid cap — avoids a white hat)
      blobs.forEach((b, i) => {
        if (i % 2 === 0) W.blob(b.x, b.y, b.z + b.r * 0.55, b.r * 0.42, b.r * 0.24, b.r * 0.42, "sakuraPale", 0.55, seed + 7 + i);
      });
    } else {
      // winter: frost on the bare branches
      blobs.forEach((b) => W.blob(b.x, b.y, b.z, b.r * 0.7, b.r * 0.4, b.r * 0.7, "snow", 0.5, seed + 3));
    }
    meta.trees.push({ x: x, y: y, z: top.z + 2, kind: "sakura", r: 4.2, seed: seed });
  });
}

function mapleTree(W, S, x, y, z, seed, meta) {
  const rnd = rng(seed);
  const h = 6 + Math.floor(rnd() * 2);
  W.withTag("紅葉", "tree", () => {
    const top = trunk(W, x, y, z + 1, h, 1, seed * 0.013, 1);
    if (S.maple) {
      W.blob(top.x, top.y, top.z + 2, 3.6, 2.4, 3.4, S.maple, 0.55, seed);
      W.blob(top.x + 2, top.y - 1, top.z + 1, 2.2, 1.6, 2.2, "leafMapleGold", 0.5, seed + 5);
      W.blob(top.x - 2, top.y + 1, top.z + 1, 2.2, 1.6, 2.2, S.maple, 0.5, seed + 9);
    } else {
      W.blob(top.x, top.y, top.z + 1, 2.6, 1.4, 2.4, "snow", 0.5, seed);
    }
    meta.trees.push({ x: x, y: y, z: top.z + 2, kind: "maple", r: 3.6, seed: seed });
  });
}

function pineTree(W, S, x, y, z, seed, meta) {
  const rnd = rng(seed);
  const h = 9 + Math.floor(rnd() * 5);
  W.withTag("松", "tree", () => {
    trunk(W, x, y, z + 1, h, 1, seed * 0.017, 1.4);
    const tiers = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const cz = z + 3 + Math.round(t * (h - 1));
      const r = 3.6 - t * 1.9 + rnd() * 0.7;
      const cy = cz + 1;
      W.blob(x + Math.round(Math.sin(t * 3 + seed) * 1.4), y, cy, r, r, r * 0.42, i % 2 ? S.pine : "leafPineMid", 0.3, seed + i * 7);
    }
    meta.trees.push({ x: x, y: y, z: z + h, kind: "pine", r: 3.4, seed: seed });
  });
}

/* ---------------- rocks ---------------- */
function rocks(W, S) {
  const groups = [
    [24, 4, 3.2], [12, 24, 2.4], [-19, 6, 2.8], [33, 15, 3.4],
    [-9, -28, 2.2], [6, -28, 1.8], [-30, -8, 3.0], [20, -18, 2.4],
  ];
  groups.forEach((g, gi) => {
    W.withTag("岩", "rock", () => {
      const rnd = rng(4000 + gi * 91);
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const ox = Math.round((rnd() - 0.5) * g[2] * 2.4);
        const oy = Math.round((rnd() - 0.5) * g[2] * 2.4);
        const r = g[2] * (0.5 + rnd() * 0.6);
        const h = groundH(g[0] + ox, g[1] + oy);
        W.blob(g[0] + ox, g[1] + oy, h + Math.round(r * 0.55), r, r * 0.8, r,
          rnd() > 0.6 ? "mossRock" : (rnd() > 0.5 ? "stone" : "stoneDark"), 0.35, gi * 13 + i);
      }
    });
  });
}

/* ---------------- shrubs & flowers ---------------- */
function shrubsAndFlowers(W, S) {
  const mounds = [
    [-9, 12, 2.4], [7, 15, 2.0], [-13, -6, 2.6], [14, -8, 2.2],
    [26, 30, 2.8], [-24, 18, 2.4], [5, 24, 1.8], [-20, 30, 2.6],
    [36, -6, 2.2], [-33, -14, 2.8], [18, 3, 1.6], [-4, 34, 2.0],
  ];
  mounds.forEach((m, i) => {
    const h = groundH(m[0], m[1]);
    W.withTag("刈り込み", "shrub", () =>
      W.blob(m[0], m[1], h + Math.round(m[2] * 0.7), m[2], m[2] * 0.78, m[2],
        i % 3 === 0 ? "shrub" : S.shrub, 0.28, 5000 + i * 17));
  });

  if (S.flowers) {
    const beds = [[-7, 20], [6, 20], [-16, 26], [22, 26], [-11, 8], [11, -14]];
    beds.forEach((b, bi) => {
      const h = groundH(b[0], b[1]);
      const mats = ["flowerRed", "flowerPink", "flowerWhite", "irisPurple", "irisYellow"];
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++) {
          if (hash2(x + b[0] * 7, y + b[1] * 7, 31 + bi) < 0.42) continue;
          W.set(b[0] + x, b[1] + y, h + 1, "leafDark");
          W.set(b[0] + x, b[1] + y, h + 2, mats[(hash2(x, y, bi + 3) * 5) | 0]);
        }
    });
  }
  // irises along the pond edge
  for (let a = 0; a < 26; a++) {
    const t = (a / 26) * TAU;
    const r = POND.r + 1.6;
    const x = Math.round(POND.x + Math.cos(t) * r), y = Math.round(POND.y + Math.sin(t) * r * 1.05);
    if (W.has(x, y, 0) && MAT_LIST[W.get(x, y, 0)].k !== "water" && hash2(x, y, 41) > 0.45) {
      W.set(x, y, 1, "reeds");
      if (hash2(x, y, 43) > 0.55) W.set(x, y, 2, hash2(x, y, 47) > 0.5 ? "irisPurple" : "irisYellow");
    }
  }
}

/* ---------------- bamboo grove ---------------- */
function bambooGrove(W, S) {
  const gx = -36, gy = 16;
  W.withTag("竹林", "bamboo", () => {
    const rnd = rng(777);
    for (let i = 0; i < 34; i++) {
      const x = gx + Math.round((rnd() - 0.5) * 13);
      const y = gy + Math.round((rnd() - 0.5) * 13);
      const h = groundH(x, y);
      const th = 9 + Math.round(rnd() * 7);
      for (let z = h + 1; z <= h + th; z++)
        W.set(x, y, z, z % 3 === 0 ? "bambooDark" : S.bamboo);
      for (let k = 0; k < 3; k++) {
        const cz = h + th - k * 3;
        W.blob(x, y, cz, 1.8, 1.1, 1.6, "bamboo", 0.5, i * 7 + k);
      }
    }
  });
}

/* ---------------- bell tower (bonshō) ---------------- */
function bellTower(W, S, meta) {
  const bx = -9, by = -14;
  const h = groundH(bx, by);
  W.withTag("梵鐘", "bell", () => {
    for (let z = h + 1; z <= h + 6; z++) {
      W.set(bx - 2, by, z, "wood");
      W.set(bx + 2, by, z, "wood");
    }
    W.box(bx - 3, by - 1, h + 7, bx + 3, by + 1, h + 7, "woodDark");
    W.box(bx - 3, by - 1, h + 8, bx + 3, by + 1, h + 8, "roofTile");
    W.set(bx, by, h + 9, "roofTileEdge");
    meta.bell = { x: bx, y: by, z: h + 5, swing: 0, ring: 0 };
  });
  // the bell itself is a dynamic prop
  meta.bellProp = { x: bx, y: by, z: h + 4, items: [
    { dx: 0, dy: 0, dz: 0, m: "bell" }, { dx: 0, dy: 0, dz: -1, m: "bell" },
    { dx: 0, dy: 0, dz: -2, m: "bronze" }, { dx: 0, dy: 0, dz: 1, m: "woodDark" },
  ] };
}

/* ---------------- shishi-odoshi ---------------- */
function shishiOodoshi(W, S, meta) {
  const sx = -6, sy = 8;
  const h = groundH(sx, sy);
  W.withTag("鹿威し", "odoshi", () => {
    // stone basin with a bamboo spout
    W.box(sx - 1, sy - 1, h + 1, sx + 1, sy + 1, h + 1, "stone");
    W.set(sx, sy, h + 1, "water");
    W.set(sx - 2, sy, h + 3, "bamboo");
    W.set(sx - 3, sy, h + 4, "bamboo");
    W.set(sx - 4, sy, h + 4, "bamboo");
    W.set(sx - 2, sy, h + 2, "stoneDark");
  });
  meta.odoshi = {
    x: sx + 2, y: sy, z: h + 3, angle: 0, state: 0, timer: 0,
    items: [
      { dx: 0, dy: 0, dz: 0, m: "bamboo" }, { dx: 1, dy: 0, dz: 0, m: "bamboo" },
      { dx: 2, dy: 0, dz: 0, m: "bamboo" }, { dx: 3, dy: 0, dz: 0, m: "bambooDark" },
      { dx: -1, dy: 0, dz: 0, m: "bamboo" }, { dx: -2, dy: 0, dz: 0, m: "bamboo" },
      { dx: -3, dy: 0, dz: 0, m: "bamboo" }, { dx: -4, dy: 0, dz: 0, m: "bambooDark" },
    ],
  };
}

/* ---------------- boundary hedge & fence ---------------- */
function border(W, S) {
  const R = GARDEN;
  for (let i = -R; i <= R; i++) {
    for (const a of [[i, -R], [i, R], [-R, i], [R, i]]) {
      const h = groundH(a[0], a[1]);
      W.set(a[0], a[1], h + 1, "leafDark");
      W.set(a[0], a[1], h + 2, "leafPine");
      // fence just inside
      const fx = a[0] === -R ? -R + 2 : a[0] === R ? R - 2 : a[0];
      const fy = a[1] === -R ? -R + 2 : a[1] === R ? R - 2 : a[1];
      if ((fx + fy) % 3 === 0) {
        const fh = groundH(fx, fy);
        W.set(fx, fy, fh + 1, "woodDark");
        W.set(fx, fy, fh + 2, "woodDark");
      }
    }
  }
}

/* ---------------- winter snow pass ---------------- */
function applySnow(W) {
  const skip = { water: 1, waterDeep: 1, ice: 1, fire: 1, paper: 1, paperWarm: 1, lanternRed: 1 };
  const keys = [];
  for (const [k, m] of W.map) {
    const x = VoxelWorld.UX(k), y = VoxelWorld.UY(k), z = VoxelWorld.UZ(k);
    if (W.has(x, y, z + 1)) continue;
    const M = MAT_LIST[m];
    if (skip[M.k] || M.name === "snow") continue;
    keys.push([x, y, z]);
  }
  for (const [x, y, z] of keys) {
    const m = W.get(x, y, z);
    if (m === undefined) continue;
    const M = MAT_LIST[m];
    if (M.k === "leaf" || M.k === "wood" || M.k === "stone" || M.k === "matte" || M.k === "metal") {
      W.set(x, y, z, "snow");
    }
  }
}
