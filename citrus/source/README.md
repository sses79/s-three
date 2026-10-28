# Citrus / Little Leaps sources

The soft-body lattice and XPBD solver come from `index.html` in [sses79/3d-action](https://github.com/sses79/3d-action), copied from the local `codex-3d` project. `solver-upstream.json` records the exact input file hash and topology. This repository owns the extracted `citrus/solver.js`; the original project has not been modified.

The slice is rotated from its original upright presentation into a horizontal landing platform: `[x,y,z] → [x,z+0.32,1.72-y]`. Its 995 nodes, 4,224 tetrahedra, and 1,056 surface triangles are retained. CPU distance/volume constraints and shape matching still drive deformation. Three.js renders the moving surface with new procedural citrus artwork and physical materials; the original WGSL material has not been ported.

The dummy is Quaternius's Universal Animation Library Standard character, licensed CC0. `CHARACTER-LICENSE.txt` and `character-upstream.json` retain the source license and published model hash. `character.json` records the derived file hash. The compact model keeps the original rig, geometry, skin weights, materials, and only Idle, Walk, Jump Start, Jump Loop, and Jump Land clips.

To reproduce the compact character from the original file:

```sh
node citrus/prepare-character.mjs /path/to/codex-3d/editor/assets/character.glb
```

The gameplay controller uses two simplified sole contacts against the deformed top triangles. Position corrections are shared between the dummy and jelly using their relative inverse masses; takeoff applies a downward reaction to nearby soft-body nodes. The dummy's root follows gravity/contact, and the source clips supply its visual poses. This is a prototype with vertical sole support and a simple lateral entry barrier. It does not provide full-body ragdoll collision, per-foot IK, tearing, or arbitrary mesh-to-soft-body collision.

Nominal display scale is one scene unit = 10 cm, with an 8 cm dummy and a 420 g slice. Weight settings are illustrative gameplay parameters, not calibrated material measurements.
