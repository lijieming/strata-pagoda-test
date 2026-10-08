/* headless smoke test: builds every season, compiles, reports counts */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = {
  console, performance: { now: () => Date.now() },
  window: {}, document: {}, Math, Date,
};
vm.createContext(ctx);

// renderer.js is DOM-dependent; stub the one function palette.js needs from it
vm.runInContext(`
  function jitterCache() {
    if (!globalThis.__jit) {
      const n = MAT_LIST.length * 6;
      const a = new Int32Array(n);
      const r = rng(4242);
      for (let i = 0; i < n; i++) a[i] = Math.round((r() - 0.5) * 8);
      globalThis.__jit = a;
    }
    return globalThis.__jit;
  }
`, ctx);

for (const f of ["utils.js", "palette.js", "world.js", "scene.js"]) {
  const src = fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
  vm.runInContext(src, ctx, { filename: f });
}

const seasons = ["spring", "summer", "autumn", "winter"];
for (const s of seasons) {
  const t0 = Date.now();
  const built = vm.runInContext("buildWorld('" + s + "')", ctx);
  const t1 = Date.now();
  const V = built.world.compile();
  const t2 = Date.now();
  console.log(
    s.padEnd(7),
    "stored=" + built.world.map.size,
    "visible=" + V.count,
    "water=" + built.world.water.length,
    "lanterns=" + built.meta.lanterns.length,
    "trees=" + built.meta.trees.length,
    "build=" + (t1 - t0) + "ms",
    "compile=" + (t2 - t1) + "ms"
  );
  // sanity: no NaN in geometry
  let bad = 0;
  for (let i = 0; i < V.count; i++) {
    if (!Number.isFinite(V.xs[i]) || !Number.isFinite(V.zs[i])) bad++;
  }
  if (bad) console.log("  !! non-finite coords:", bad);
  if (!built.meta.waterBox) console.log("  !! missing waterBox");
}

// lighting sweep: make sure no keyframe produces NaN shading
const light = vm.runInContext("Light", ctx);
for (let h = 0; h < 24; h += 0.5) {
  vm.runInContext("setTimeOfDay(" + h + ")", ctx);
  vm.runInContext("buildShadeCache()", ctx);
  const sc = vm.runInContext("Array.from(shadeCache.slice(0, 400))", ctx);
  const nan = sc.filter((v) => !Number.isFinite(v) || v < 0).length;
  if (nan) console.log("  !! NaN shade at hour", h, nan);
}
console.log("lighting sweep ok");
