# PortableFont v2 is a breaking change from v1

When `Project` was renamed to `Font` across the codebase, the `PortableFont` JSON export format changed too — top-level key `project` → `font` and per-glyph `projectId` → `fontId`. We chose to bump the wire format to `version: 2` and reject v1 bundles outright rather than write a compatibility shim that accepted both shapes.

The trade-off: existing `.json` exports become un-importable. We accepted that because the user base at this point is small and a compat shim would be the kind of code that lives forever unloved — every future field rename would need to remember it. The reject path produces a clear "Unsupported font version: 1" error, which is enough.
