# 五重塔庭園 — Voxel Pagoda Garden

[![Live Demo](https://img.shields.io/badge/Live%20Demo-2D2A32?style=for-the-badge&logo=github&logoColor=white)](https://lijieming.github.io/strata-pagoda-test/)
![Zero dependencies](https://img.shields.io/badge/zero%20dependencies-plain%20JS-4C6EF5?style=for-the-badge)

An interactive voxel-style Japanese pagoda garden rendered with a custom
isometric engine on Canvas 2D. **Zero dependencies** — plain HTML, CSS and
JavaScript (ES2020).

Live: <https://lijieming.github.io/strata-pagoda-test/>

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

## 生成プロンプト (one-shot generation prompt)

本项目由以下标准 one-shot prompt 一次性生成：

> Build a polished, interactive voxel-style Japanese pagoda garden as a small web application in this empty folder.
>
> Create everything needed yourself using HTML, CSS, and JavaScript. Avoid external dependencies unless they are genuinely necessary.
>
> The scene should include a multi-tier Japanese pagoda, garden vegetation, cherry blossom trees, stone paths, lanterns, water, and subtle ambient animation. Give the entire scene a cohesive pixel/voxel aesthetic and aim for a visually impressive showcase piece rather than a basic demo.
>
> Make the application responsive and interactive. Include a day/night control, controllable environmental effects such as lamps and fireflies, and several small ambient animations or interactions.
>
> Pay particular attention to the rendering architecture. Base terrain and object colors must remain separate from lighting and environmental effects. Do not permanently bake lamp, firefly, or other illumination into the underlying block or tile colors.
>
> Implement lighting as a separate, reversible rendering contribution. A good rendering order is:
>
> 1. render the base terrain/object colors,
> 2. apply dynamic illumination or lighting overlays,
> 3. render emissive elements, particles, and other visual effects.
>
> When a light source such as a lamp or firefly effect is disabled, its illumination contribution must disappear completely and the affected areas must return to their correct unlit appearance. Light-source state, emissive visuals, particles, and illumination should remain consistent with one another.
>
> Work autonomously. Create the project files, inspect your own implementation, run useful validation or local commands, and fix problems you encounter.
>
> Use visual inspection if available. Critically evaluate composition, color balance, exposure, object scale, voxel consistency, readability, and interaction state. Test the important controls, especially day/night mode and lighting toggles, and verify that effects are genuinely reversible rather than visually baked into the scene.
>
> Leave the project in a clean, runnable state. Do not stop after explaining what you would do—implement, inspect, test, and refine the result yourself.
