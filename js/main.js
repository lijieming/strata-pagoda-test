/* ============================================================
   main.js — boot, input, UI, frame loop
   ============================================================ */
"use strict";

(function () {
  const canvas = document.getElementById("scene");
  const stage = document.getElementById("stage");
  const chip = document.getElementById("hoverchip");
  const statusText = document.getElementById("statusText");
  const titlecard = document.getElementById("titlecard");

  initRenderer(canvas);

  /* ---------- build the garden ---------- */
  function rebuild(season) {
    Scene.season = season;
    const built = buildWorld(season);
    Scene.world = built.world;
    Scene.meta = built.meta;
    Scene.voxels = Scene.world.compile();
    Scene.water = Scene.world.water;

    PointLights.length = 0;
    for (const L of Scene.meta.lanterns) PointLights.push(L);
    touchLights();
    resetParticles();
    fitView();
  }

  rebuild("spring");

  /* ---------- clock ---------- */
  let hour = 10.5;
  let autoAdvance = false;
  let lastTimeInput = 0;

  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const timeIcon = document.getElementById("timeIcon");

  function fmtTime(h) {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  function applyTime(h, fromSlider) {
    hour = ((h % 24) + 24) % 24;
    setTimeOfDay(hour);
    R.staticDirty = true;
    timeLabel.textContent = fmtTime(hour);
    timeIcon.textContent = Light.isDay ? "☀" : "☾";
    if (!fromSlider) timeSlider.value = String(Math.round(hour * 60));
  }
  timeSlider.addEventListener("input", () => {
    autoAdvance = false;
    lastTimeInput = performance.now();
    applyTime(timeSlider.value / 60, true);
  });
  document.querySelectorAll("[data-time]").forEach((b) => {
    b.addEventListener("click", () => {
      autoAdvance = false;
      lastTimeInput = performance.now();
      applyTime(parseFloat(b.dataset.time), false);
      flash("時刻を " + fmtTime(parseFloat(b.dataset.time)) + " に合わせました");
    });
  });
  applyTime(10.5, false);

  /* ---------- seasons ---------- */
  document.querySelectorAll(".chip.season").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".chip.season").forEach((o) => o.classList.remove("active"));
      b.classList.add("active");
      const s = b.dataset.season;
      rebuild(s);
      flash({ spring: "春 — 桜が咲いています", summer: "夏 — 緑が深い", autumn: "秋 — 紅葉が色づいた", winter: "冬 — 雪が積もった" }[s]);
    });
  });

  /* ---------- toggles ---------- */
  document.querySelectorAll(".chip.toggle").forEach((b) => {
    b.addEventListener("click", () => {
      const f = b.dataset.flag;
      Flags[f] = !Flags[f];
      b.classList.toggle("active", Flags[f]);
      if (f === "sound" && Flags.sound) { Audio.ready(); Audio.resume(); Audio.plop(); }
      if (f === "glow") touchLights();
      R.staticDirty = f === "glow";
    });
  });

  /* ---------- view buttons ---------- */
  const rotL = document.getElementById("rotL"), rotR = document.getElementById("rotR");
  const zoomIn = document.getElementById("zoomIn"), zoomOut = document.getElementById("zoomOut");
  const reset = document.getElementById("reset");
  rotL.addEventListener("click", () => { View.yaw -= 0.26; fitView(); R.idleTime = 0; });
  rotR.addEventListener("click", () => { View.yaw += 0.26; fitView(); R.idleTime = 0; });
  zoomIn.addEventListener("click", () => { setZoom(View.zoomScale * 1.18); });
  zoomOut.addEventListener("click", () => { setZoom(View.zoomScale / 1.18); });
  reset.addEventListener("click", () => {
    View.yaw = 0.62; View.pitch = 0.50; View.zoomScale = 1;
    fitView();
    R.idleTime = 0;
    flash("視点を戻しました");
  });

  function setZoom(scale) {
    View.zoomScale = clamp(scale, View.minScale, View.maxScale);
    R.staticDirty = true;
    R.idleTime = 0;
  }

  /* ---------- pointer: orbit, zoom, pick ---------- */
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  let pinchDist = 0;
  const pointers = new Map();

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add("dragging");
      R.autoRotate = false; R.idleTime = 0;
    } else if (pointers.size === 2) {
      const p = [...pointers.values()];
      pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    }
    Audio.resume();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const p = [...pointers.values()];
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchDist > 0) setZoom(View.zoomScale * (d / pinchDist));
      pinchDist = d;
      return;
    }

    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      View.yaw += dx * 0.0075;
      View.pitch = clamp(View.pitch - dy * 0.0055, View.minPitch, View.maxPitch);
      fitView();
      R.idleTime = 0;
    } else {
      hoverTest(e.clientX, e.clientY);
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) {
      if (dragging && moved < 6) handleClick(e.clientX, e.clientY);
      dragging = false;
      canvas.classList.remove("dragging");
      R.idleTime = 0;
    }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => { hideChip(); });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    setZoom(View.zoomScale * (e.deltaY > 0 ? 0.92 : 1.09));
  }, { passive: false });

  /* ---------- hover ---------- */
  let hoverTimer = 0;
  function hoverTest(cx, cy) {
    const now = performance.now();
    if (now - hoverTimer < 45) return;
    hoverTimer = now;
    const hit = pick(cx, cy);
    if (hit && hit.label) {
      canvas.classList.add("hot");
      showChip(cx, cy, hit.label, hit.kind);
    } else {
      canvas.classList.remove("hot");
      hideChip();
    }
  }
  function showChip(cx, cy, label, kind) {
    chip.hidden = false;
    chip.innerHTML = "<b>" + label + "</b>" + (KIND_HINT[kind] || "");
    chip.style.left = cx + "px";
    chip.style.top = cy + "px";
  }
  function hideChip() { chip.hidden = true; }

  const KIND_HINT = {
    pagoda: "五重塔 — click to ring the bell",
    torii: "鳥居 — sacred gate",
    bridge: "橋 — arched bridge",
    lantern: "石灯籠 — click to light / dim",
    tree: "木 — click to shake the branches",
    rock: "岩 — stone",
    bamboo: "竹林 — bamboo grove",
    bell: "梵鐘 — click to ring",
    odoshi: "鹿威し — bamboo water catcher",
    fall: "滝 — waterfall",
    shrub: "刈り込み — clipped shrub",
    water: "池 — click to splash",
  };

  /* ---------- click actions ---------- */
  function handleClick(cx, cy) {
    const hit = pick(cx, cy);
    if (!hit) return;
    const kind = hit.kind;

    if (kind === "pagoda" || kind === "bell") {
      if (Scene.meta.bell) Scene.meta.bell.ring = 1;
      Audio.bell();
      flash("梵鐘を鳴らしました — the bell resonates");
      rippleFromBell();
      return;
    }
    if (kind === "lantern") {
      const L = nearestLantern(cx, cy);
      if (L) {
        L.on = !L.on;
        touchLights();
        R.staticDirty = true;
        flash(L.on ? "灯籠を灯しました" : "灯籠を消しました");
      }
      return;
    }
    if (kind === "tree") {
      shakeTree(cx, cy);
      return;
    }
    if (kind === "water" || hit.i !== undefined && isWaterVoxel(hit.i)) {
      const w = screenToWater(cx, cy);
      if (w) {
        addRipple(w.x, w.y, 1);
        addSplash(w.x, w.y, 0.4, 16, "rgba(226,244,255,0.95)");
        Audio.plop();
        flash("水に石を投げました");
      }
      return;
    }
    if (kind) { flash(hit.label + " — " + (KIND_HINT[kind] || "")); }
  }

  function isWaterVoxel(i) { return false; }

  function nearestLantern(cx, cy) {
    let best = null, bd = 1e9;
    for (const L of PointLights) {
      const P = project(L.x, L.y, L.z);
      const d = Math.hypot(P[0] / R.dpr - cx, P[1] / R.dpr - cy);
      if (d < bd) { bd = d; best = L; }
    }
    return bd < 90 ? best : null;
  }

  function shakeTree(cx, cy) {
    const trees = Scene.meta.trees;
    if (!trees.length) return;
    let best = null, bd = 1e9;
    for (const t of trees) {
      const P = project(t.x, t.y, t.z);
      const d = Math.hypot(P[0] / R.dpr - cx, P[1] / R.dpr - cy);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best || bd > 130) return;
    const r = Math.random;
    for (let i = 0; i < 46; i++) {
      const p = newPetal(r, false);
      p.x = best.x + (r() - 0.5) * best.r * 3;
      p.y = best.y + (r() - 0.5) * best.r * 3;
      p.z = best.z + (r() - 0.5) * 4;
      p.vz = -0.3 - r() * 0.4;
      FX.petals.push(p);
    }
    if (FX.petals.length > 620) FX.petals.splice(0, FX.petals.length - 620);
    if (Scene.season === "spring") Audio.plop();
    flash(best.kind === "sakura" ? "桜が散りました" : best.kind === "maple" ? "紅葉が落ちました" : "枝を揺らしました");
  }

  function rippleFromBell() {
    for (let i = 0; i < 3; i++)
      setTimeout(() => addRipple(POND.x + (Math.random() - 0.5) * 8, POND.y + (Math.random() - 0.5) * 8, 0.7), i * 260);
  }

  /* approximate world position under the cursor, on the water plane */
  function screenToWater(cx, cy) {
    const sx = cx * R.dpr, sy = cy * R.dpr;
    // solve for (x,y) at z = 0.15 using the 2x2 screen basis
    const a1 = ca * K, b1 = sa * K;
    const a2 = -sa * sp * K, b2 = ca * sp * K;
    const px = sx - ox, py = sy - oy + 0.15 * cp * K;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-6) return null;
    const x = (px * b2 - py * b1) / det;
    const y = (py * a1 - px * b2) / det;
    const d = Math.hypot(x - POND.x, (y - POND.y) * 1.1);
    if (d < POND.r + 2) return { x: x, y: y };
    return { x: clamp(x, -GARDEN + 2, GARDEN - 2), y: clamp(y, -GARDEN + 2, GARDEN - 2) };
  }

  /* ---------- status flash ---------- */
  let flashTimer = null;
  const defaultStatus = statusText.textContent;
  function flash(msg) {
    statusText.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { statusText.textContent = defaultStatus; }, 3200);
  }

  /* ---------- keyboard ---------- */
  window.addEventListener("keydown", (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    switch (e.key.toLowerCase()) {
      case "a": case "arrowleft": View.yaw -= 0.14; fitView(); R.idleTime = 0; break;
      case "d": case "arrowright": View.yaw += 0.14; fitView(); R.idleTime = 0; break;
      case "w": case "arrowup": View.pitch = clamp(View.pitch + 0.07, View.minPitch, View.maxPitch); fitView(); break;
      case "s": case "arrowdown": View.pitch = clamp(View.pitch - 0.07, View.minPitch, View.maxPitch); fitView(); break;
      case "+": case "=": setZoom(View.zoomScale * 1.15); break;
      case "-": case "_": setZoom(View.zoomScale / 1.15); break;
      case "r": reset.click(); break;
      case "n": applyTime(hour < 12 ? hour + 6 : hour - 6, false); break;
      case "t": autoAdvance = !autoAdvance; flash(autoAdvance ? "時間が流れ始めました" : "時間を止めました"); break;
      case "l": {
        const off = PointLights.find((p) => p.on) || null;
        if (off) { PointLights.forEach((p) => (p.on = false)); }
        else PointLights.forEach((p) => (p.on = true));
        touchLights(); R.staticDirty = true;
        break;
      }
      case "1": document.querySelector('[data-season="spring"]').click(); break;
      case "2": document.querySelector('[data-season="summer"]').click(); break;
      case "3": document.querySelector('[data-season="autumn"]').click(); break;
      case "4": document.querySelector('[data-season="winter"]').click(); break;
      case " ": e.preventDefault(); document.querySelector('[data-time="22"]').click(); break;
    }
  });

  /* ---------- resize ---------- */
  let resizeT = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { resizeRenderer(); fitView(); }, 90);
    R.staticDirty = true;
  });

  /* ---------- title card fade ---------- */
  setTimeout(() => titlecard.classList.add("gone"), 6500);
  canvas.addEventListener("pointerdown", () => titlecard.classList.add("gone"), { once: true });

  /* ---------- frame loop ---------- */
  let prev = performance.now();
  let fpsAcc = 0, fpsN = 0, fps = 60;

  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const t = now * 0.001;

    // time of day may drift on its own
    if (autoAdvance) {
      applyTime(hour + dt * 0.35, false);
    } else if (now - lastTimeInput > 14000 && hour > 0) {
      autoAdvance = true;
    }

    // idle auto-orbit
    R.idleTime += dt;
    if (R.autoRotate && R.idleTime > 7) {
      View.yaw += dt * 0.055;
      fitView();
    }

    updateFX(dt, t);

    if (R.staticDirty) renderStatic();

    const ctx = R.ctx;
    drawSkyFrame(ctx, t);
    ctx.drawImage(R.voxCanvas, 0, 0);
    drawFX(ctx, t);
    const props = collectPropVoxels();
    if (props.length) drawVoxelList(ctx, props);
    drawPost(ctx);

    fpsAcc += dt; fpsN++;
    if (fpsAcc > 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__garden = { View: View, Light: Light, Scene: Scene, FX: FX, fps: () => fps };
})();
