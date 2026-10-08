# 五重塔庭園 — Voxel Pagoda Garden

An interactive voxel-style Japanese pagoda garden rendered with a custom
isometric engine on Canvas 2D. **Zero dependencies** — plain HTML, CSS and
JavaScript (ES2020).

## Run

```bash
python3 serve.py        # http://localhost:8123
```

or open `index.html` directly in any modern browser (no build step).

## The scene

- Five-tier pagoda with soroban roof curves, gold sorin spire, hanging eave lanterns
- Pond with animated water, koi, arched bridge, waterfall and stream
- Torii gate, stone lanterns (13, individually lightable) plus 4 hanging eave
  lanterns, bell tower with a
  swaying bonshō bell, shishi-odoshi bamboo water-catcher, bamboo grove
- Cherry / maple / pine trees, shrubs, irises, rocks, stone paths, border hedge
- Sky with drifting clouds, sun/moon arc, stars, horizon glow
- Petals, fireflies, ripples, splashes, lantern glow, ground shadows, smoke

## Controls

| Action | How |
| --- | --- |
| Orbit | drag / A D ← → (pitch: W S ↑ ↓) |
| Zoom | wheel / pinch / + − / buttons |
| Reset view | R or ⌂ |
| Time of day | slider, presets (夜明け/正午/夕暮/夜), N ±6h, Space → night, T = time flows |
| Season | 春 夏 秋 冬 buttons or keys 1–4 |
| Ring the bell | click the pagoda or bell |
| Light a lantern | click any stone lantern (L = all on/off) |
| Shake a tree | click it — petals fall |
| Splash the pond | click the water |

The camera auto-frames the garden (`fitView()`) at any
window size, aspect ratio, device pixel ratio, yaw/pitch or season.

## Layout

```
index.html      DOM shell + control panel
styles.css      glass panel, typography, responsive rules
js/utils.js     math, color, rng, noise
js/palette.js   ~60 voxel materials, sky keyframes, lighting, shade caches
js/world.js     voxel store (bit-packed keys) + compile with face masks
js/scene.js     the whole garden: pagoda, pond, bridge, trees, props
js/renderer.js  isometric projection, painter's-algorithm raster, sky, picking, fitView
js/effects.js   water, petals, koi, ripples, glow, fireflies, props animation
js/audio.js     synthesized bell / clack / plop (WebAudio, no assets)
js/main.js      boot, input, UI, frame loop
test/scene.test.js  headless build/compile/lighting smoke test
```

## Test

```bash
node test/scene.test.js
```
