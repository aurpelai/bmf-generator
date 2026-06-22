# PortableFont versioning and import-shim policy

## v1 → v2 (the original decision)

When `Project` was renamed to `Font` across the codebase, the `PortableFont` JSON export format changed too — top-level key `project` → `font` and per-glyph `projectId` → `fontId`. We chose to bump the wire format to `version: 2` and reject v1 bundles outright rather than write a compatibility shim that accepted both shapes.

The trade-off: existing `.json` exports become un-importable. We accepted that because the user base at this point is small and a compat shim would be the kind of code that lives forever unloved — every future field rename would need to remember it. The reject path produces a clear "Unsupported font version: 1" error, which is enough.

## v2 → v3 (Stage B, PR 3): shim policy update

v3 serialises the full layer stack (per-layer pixels, offsets, visibility, lock, color, preview). v2 only carried the flattened bitmap and conflated the BMF char-line nudge with the flatten origin. The wire formats are structurally different — a v2 file does not contain enough information to reconstruct a multi-layer v3 glyph.

We now accept previous versions via per-version import shims (`import-vN.ts` under `src/core/font/portable/`). Specifically:

- **v3** is the current format, written by `export.ts` and read by `import.ts`.
- **v2** is accepted via `import-v2.ts`. v2 glyphs reconstitute as single-base-layer v3 glyphs; the v2 top-level xoffset/yoffset/xadvance become `bmf`. Layer offsets default to (0, 0) because v2 had no concept of layer offsets independent of the flatten origin.
- **v1** stays rejected — there is no v1 data in the wild worth a shim, and the v1 → v2 boundary predates the layers model entirely.

Shims live until the total shim complexity (LOC + cross-references across `import-vN.ts` files) exceeds a per-release budget the team judges by feel. When a shim is culled it should be replaced by the same `Unsupported font version: N` error as v1 today — clear and final.
