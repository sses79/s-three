# SECOND / Showcase

A standalone Three.js digital watch with an interactive Watch Lab and a repeatable 15-second product showcase. The showcase moves from the complete watch to the live face, presses its buttons, turns on the backlight, runs the stopwatch, and compares steel, gold, and graphite finishes.

![Six moments from the SECOND showcase](docs/showcase.png)

Extracted from [sses79/3d-action](https://github.com/sses79/3d-action) at commit [`e8e9cea`](https://github.com/sses79/3d-action/commit/e8e9cea06b6ac8994bcbcc10dd663ab8a691910f). The original watch files were verified against that commit before copying. Citrus Jelly and Animation Studio are separate projects and are not included here.

## Run

Requires Node.js 22.13 or later and npm.

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. Choose **Play showcase**, or open <http://127.0.0.1:5173/?showcase=1>. Pause and scrub the sequence; **Back to Watch Lab** restores the live watch and your preferences. Reduced-motion preferences start the showcase paused.

The watch uses Three.js 0.186.1 `WebGPURenderer` with WebGL2 fallback. Add `?webgl=1` to exercise the fallback. All browser dependencies and the GLB are local; no CDN or API key is needed.

## Watch Lab

Drag to orbit and scroll or pinch to zoom. Use the physical buttons or panel controls:

- **Light:** toggle backlight.
- **Mode:** switch clock/stopwatch; select hours/minutes while setting time.
- **Adjust:** enter time settings or increment the selected field; start/stop the stopwatch.
- **Done**, **Sync to device**, and **Reset stopwatch** perform their named actions.

Branding, inscription, finish, time offset, and 12/24-hour preference are stored in this browser. The showcase uses its own fixed clock and event replay; it does not save its scripted changes into your preferences. Keyboard shortcuts: L / M / A; Enter saves settings; Escape leaves the showcase when focus is outside an input.

## Capture

Install Google Chrome, or set `CHROME_PATH` to a Chromium executable. Video export additionally requires ffmpeg with libx264.

```sh
# Six moments in one contact sheet, plus a state manifest
npm run capture -- sheet

# Exact-time full-size PNGs
npm run capture -- stills --times 0,3.115,5.8,8.5,10.8,14.7

# Silent 15-second 1080p30 MP4
npm run capture -- video --fps 30 --out out/second.mp4

# Phone composition or forced WebGL2 capture
npm run capture -- sheet --width 390 --height 844 --out out/mobile.png
npm run capture -- sheet --webgl --out out/webgl.png
```

Captures use the same scene, fixed UTC showcase clock, and absolute-time camera/button evaluation as the preview. Seek order does not change the result. `?capture=1&t=8.5` opens a paused composition with playback controls hidden. Captures are repeatable within the tested browser/backend; fonts and GPU output can vary between platforms. The exporter captures browser frames at fixed times, without temporal supersampling or motion blur. Output goes into ignored `out/`.

## Build and verify

```sh
npm run build
npm test
npm run test:browser
```

`dist/` is a standalone static site. The included localhost server serves only the public build files. `npm run dev` rebuilds on source changes and restarts the server; refresh the browser afterward. `PORT=5174 npm run preview` starts a fresh build on another port.

The unit checks cover the watch state, source/final model structure, deterministic event replay, camera endpoints, and the server's public routes. The browser check covers live controls, saved preference restoration, identical captures after seeking, WebGPU/forced WebGL2, reduced motion, and a 390px phone viewport. Browser checks write screenshots to `out/verification/`. A phone viewport check is not a physical-device test.

## Files

| File | Purpose |
| --- | --- |
| `watch/main.js` | Three.js scene, live canvas face, picking, and showcase integration |
| `watch/state.js` | Live clock, time editing, and monotonic stopwatch |
| `watch/showcase.js` | Fixed clock, button events, camera keyframes, finishes, captions |
| `watch/assets/watch.glb` | Self-contained 2.17 MB runtime model |
| `watch/source/second-watch.blend` | Editable prepared Blender scene with packed textures |
| `scripts/capture.mjs` | Stills, contact sheets, video, and capture manifests |
| `docs/watch/` | Original asset preparation and implementation notes |

Asset rebuild, when Blender is installed:

```sh
python3 watch/prepare_asset.py
blender --background --factory-startup --python watch/prepare_blender.py
npm run build
```

## Credits

The original [Digital Wrist Watch](https://polyhaven.com/a/digital_wrist_watch) is by Adrian C / Poly Haven and is [CC0](https://polyhaven.com/license). The model was prepared in Blender for SECOND in `sses79/3d-action`. Three.js is MIT licensed; its license is retained in `watch/source/THREE-LICENSE.txt`.

The showcase's explicit-time rendering and contact-sheet workflow were inspired by [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video). No code, music, fonts, or imagery from that repository was copied.
