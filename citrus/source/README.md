# Citrus / Little Leaps sources

The soft-body lattice and XPBD solver come from `index.html` in [sses79/3d-action](https://github.com/sses79/3d-action), copied from the local `codex-3d` project. `solver-upstream.json` records the exact input file hash and topology. This repository owns the extracted `citrus/solver.js`; the original project has not been modified.

The slice is rotated from its original upright presentation into a horizontal landing platform: `[x,y,z] → [x,z+0.32,1.72-y]`. Its 995 nodes, 4,224 tetrahedra, and 1,056 surface triangles are retained. CPU distance/volume constraints and shape matching still drive deformation. Three.js renders the moving surface with new procedural citrus artwork and physical materials; the original WGSL material has not been ported.

The dummy is Quaternius's Universal Animation Library Standard character, licensed CC0. `CHARACTER-LICENSE.txt` and `character-upstream.json` retain the source license and published model hash. `character.json` records the derived file hash. The compact model keeps the original rig, geometry, skin weights, materials, and only Idle, Walk, Jump Start, Jump Loop, and Jump Land clips.

To reproduce the compact character from the original file:

```sh
node citrus/prepare-character.mjs /path/to/codex-3d/editor/assets/character.glb
```

The gameplay controller uses two simplified sole contacts against the deformed top surface. Each sole spreads pressure across a small patch of nearby top-layer nodes. This regularizes the coarse lattice under heavy landings. Contact position corrections follow the surface normal and are shared between the dummy and jelly using their effective inverse masses. The solver's conditioned masses are normalized to 420 g; damping, contact corrections, jump reactions, and applied impulses use that same mass scale.

After the XPBD position solve, `contact.js` resolves relative velocity between the dummy and its moving contact patch. Rebound sets the restitution coefficient (0–0.6), with a low-speed threshold for resting support. Coulomb friction transfers tangential motion, using a coefficient of 0.55 and the accumulated normal impulse as its limit. Each contact impulse is applied to the dummy and distributed with the opposite sign to the supporting nodes. Separating contacts exert no attractive normal impulse. Floor contact, shape restoration, damping, and player movement are additional influences; the complete scene is not an isolated momentum-conserving system.

**Bounce jelly / B** applies an external upward impulse only to the jelly beneath the dummy (or the slice center if the dummy is off it). Contact must produce the dummy's launch; this action never sets its velocity or requests a jump. Repeated taps have a half-second cooldown. **Space / Jump** uses the dummy's own takeoff and applies its reaction downward to the jelly.

The force overlay shows the opposing normal support forces, offset beside the dummy for visibility. Arrow lengths share a logarithmic scale. Contact load is the accumulated normal impulse's vertical component divided by the step duration and dummy weight: roughly **1×** at rest, **0×** without contact, and higher during impacts. Peak load records the largest physics-step value since Reset; it is a gameplay diagnostic, not an injury or real-material measurement.

The dummy's root follows gravity/contact, and the source clips supply its visual poses. This remains a prototype with sole support and a simple lateral entry barrier. It does not provide full-body ragdoll collision, per-foot IK, tearing, or arbitrary mesh-to-soft-body collision.

`tests/contact.test.mjs` checks momentum balance, restitution energy bounds, separation, and friction against independent momentum/energy calculations. `tests/citrus.test.mjs` checks loaded support, jelly-only launches, light/heavy response, release, and stability at the weight/firmness/rebound limits. Browser checks exercise the actual controls and both graphics backends.

Nominal display scale is one scene unit = 10 cm, with an 8 cm dummy and a 420 g slice. Weight settings are illustrative gameplay parameters, not calibrated material measurements.
