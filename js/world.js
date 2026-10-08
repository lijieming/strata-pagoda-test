/* ============================================================
   world.js — voxel storage, occlusion culling, compile to arrays
   ============================================================ */
"use strict";

class VoxelWorld {
  constructor() {
    this.map = new Map();      // key -> material index
    this.tagMap = new Map();   // key -> {label, kind}
    this.tag = null;
    this.tags = [];
    this.bounds = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
  }

  static K(x, y, z) {
    return (x + 512) | ((y + 512) << 10) | ((z + 512) << 20);
  }
  static UX(k) { return (k & 1023) - 512; }
  static UY(k) { return ((k >> 10) & 1023) - 512; }
  static UZ(k) { return ((k >> 20) & 1023) - 512; }

  get(x, y, z) { return this.map.get(VoxelWorld.K(x, y, z)); }
  has(x, y, z) { return this.map.has(VoxelWorld.K(x, y, z)); }

  set(x, y, z, m) {
    const M = typeof m === "string" ? MAT[m] : m;
    if (!M) return;
    const k = VoxelWorld.K(x, y, z);
    this.map.set(k, M.idx);
    if (this.tag) this.tagMap.set(k, this.tag);
    const b = this.bounds;
    if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    if (z < b.z0) b.z0 = z; if (z > b.z1) b.z1 = z;
  }

  remove(x, y, z) {
    const k = VoxelWorld.K(x, y, z);
    this.map.delete(k);
    this.tagMap.delete(k);
  }

  withTag(label, kind, fn) {
    const prev = this.tag;
    this.tag = { label: label, kind: kind };
    this.tags.push(this.tag);
    fn();
    this.tag = prev;
  }

  box(x0, y0, z0, x1, y1, z1, m) {
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) this.set(x, y, z, m);
  }

  shell(x0, y0, z0, x1, y1, z1, m) {
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1)
            this.set(x, y, z, m);
        }
  }

  cylinder(cx, cy, z0, z1, r, m, hollow) {
    const r2 = r * r, i2 = (r - 1) * (r - 1);
    for (let z = z0; z <= z1; z++)
      for (let y = cy - r; y <= cy + r; y++)
        for (let x = cx - r; x <= cx + r; x++) {
          const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d > r2) continue;
          if (hollow && d <= i2) continue;
          this.set(x, y, z, m);
        }
  }

  /* ellipsoid blob; jitter gives an organic, hand-placed canopy edge */
  blob(cx, cy, cz, rx, ry, rz, m, jitter, seed) {
    const ix = Math.floor(cx - rx), ax = Math.ceil(cx + rx);
    const iy = Math.floor(cy - ry), ay = Math.ceil(cy + ry);
    const iz = Math.floor(cz - rz), az = Math.ceil(cz + rz);
    for (let z = iz; z <= az; z++)
      for (let y = iy; y <= ay; y++)
        for (let x = ix; x <= ax; x++) {
          const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
          let d = a * a + b * b + c * c;
          if (jitter) d -= (hash2(x * 3 + 11, y * 5 + z * 7, seed || 1) - 0.5) * jitter;
          if (d <= 1) this.set(x, y, z, m);
        }
  }

  /* ---- compile to flat render arrays ---- */
  compile() {
    const xs = [], ys = [], zs = [], mi = [], em = [], fm = [], info = [];
    const water = [];
    const map = this.map, tagMap = this.tagMap;
    const opaque = (x, y, z) => map.has(VoxelWorld.K(x, y, z));

    for (const [k, m] of map) {
      const x = VoxelWorld.UX(k);
      const y = VoxelWorld.UY(k);
      const z = VoxelWorld.UZ(k);

      // face mask: a face is drawn only when its neighbour is empty
      let mask = 0;
      if (!opaque(x + 1, y, z)) mask |= 1;
      if (!opaque(x - 1, y, z)) mask |= 2;
      if (!opaque(x, y + 1, z)) mask |= 4;
      if (!opaque(x, y - 1, z)) mask |= 8;
      if (!opaque(x, y, z + 1)) mask |= 16;
      if (!opaque(x, y, z - 1)) mask |= 32;
      if (mask === 0) continue;

      const M = MAT_LIST[m];
      const tag = tagMap.get(k) || null;

      xs.push(x); ys.push(y); zs.push(z); mi.push(m);
      em.push(M.em > 0 ? 1 : 0);
      fm.push(mask);
      info.push(tag);

      if (M.k === "water") {
        water.push({ x: x, y: y, z: z, m: m, tag: tag, mask: mask, top: !!(mask & 16) });
      }
    }

    this.voxels = {
      xs: Int16Array.from(xs),
      ys: Int16Array.from(ys),
      zs: Int16Array.from(zs),
      mi: Uint8Array.from(mi),
      em: Uint8Array.from(em),
      fm: Uint8Array.from(fm),
      info: info,
      count: xs.length,
    };
    this.water = water;
    return this.voxels;
  }

  _tagFor(k) {
    const t = this.map.get((k & ((1 << 30) - 1)) | (1 << 30));
    return t || null;
  }
}
