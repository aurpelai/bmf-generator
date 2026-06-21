# Rebuilding the `glyphs` store via a temporary store across two Dexie versions

The `Project` → `Font` rename required changing the `glyphs` store's compound primary key from `[projectId+codePoint]` to `[fontId+codePoint]`. Dexie does not support renaming a primary key in place — it throws `UpgradeError: Not yet support for changing primary key`.

We considered three alternatives:

1. **Keep a permanently-renamed store like `glyphs2` plus a `get glyphs()` getter** — leaks the rename history into the schema and class definition forever; a future reader would wonder why `glyphs2` exists.
2. **Persist `projectId` on disk while exposing `fontId` in memory**, translating in `db/glyphs.ts` — keeps a hidden divergence between disk format and code that compounds with every future rename.
3. **The chosen approach: stash records into a temp store in v4, recreate `glyphs` with the new key in v5, restore the records, and drop the temp store** — costs two version bumps and ~30 lines of migration but leaves no permanent artifact.

Dexie processes upgrade callbacks sequentially even when a user jumps from v3 straight to v5, so the v4→v5 pair works correctly for any starting version. The v3→v5 migration path was not exercised against a real prior database before merge — only the fresh-install path. A user with v1/v2/v3 data on disk should spot-check.
