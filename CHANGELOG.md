# Changelog

All notable changes to this project will be documented in this file.

## v0.2.0

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.1.0...v0.2.0)

### 🚀 Enhancements

- Add Settings tab to right panel with editable project settings ([e6aed93](https://github.com/aurpelai/bmf-generator/commit/e6aed93))
- Resize pixel editor canvas to font cell (fontSize × lineHeight) ([cd43fc1](https://github.com/aurpelai/bmf-generator/commit/cd43fc1))
- Live canvas preview when editing fontSize, lineHeight, and baseline ([a18dcbb](https://github.com/aurpelai/bmf-generator/commit/a18dcbb))
- Add editable capHeight setting with guide line labels ([e466e9c](https://github.com/aurpelai/bmf-generator/commit/e466e9c))
- Apply dark aquatic teal accent colour and refine background and borders ([7d25c30](https://github.com/aurpelai/bmf-generator/commit/7d25c30))
- Move tool for repositioning glyph on the pixel grid ([17f8d7d](https://github.com/aurpelai/bmf-generator/commit/17f8d7d))
- Move tool for repositioning glyph on the pixel grid ([3783074](https://github.com/aurpelai/bmf-generator/commit/3783074))
- Brush size for pencil and eraser tools ([0e81a85](https://github.com/aurpelai/bmf-generator/commit/0e81a85))
- Keyboard shortcuts, tool modifiers, and undo/redo ([6a1c63a](https://github.com/aurpelai/bmf-generator/commit/6a1c63a))
- Keyboard shortcuts, tool modifiers, and undo/redo ([650d726](https://github.com/aurpelai/bmf-generator/commit/650d726))
- Collapsible glyph list and right panel ([cd5da67](https://github.com/aurpelai/bmf-generator/commit/cd5da67))
- In-app keyboard shortcut help overlay ([7b8c6ec](https://github.com/aurpelai/bmf-generator/commit/7b8c6ec))
- Toast notifications for auto-save and export ([6e2213e](https://github.com/aurpelai/bmf-generator/commit/6e2213e))
- Resizable panels with collapse-on-drag ([a925342](https://github.com/aurpelai/bmf-generator/commit/a925342))
- Accessibility pass and performance improvements ([4fc04cf](https://github.com/aurpelai/bmf-generator/commit/4fc04cf))
- Cmd+' shortcut to toggle both side panels ([74f63cc](https://github.com/aurpelai/bmf-generator/commit/74f63cc))
- Zoom tool with Alt-to-invert and cursor-centred zoom ([fbaf2ed](https://github.com/aurpelai/bmf-generator/commit/fbaf2ed))
- Double-click drag handles to collapse panels ([7236a01](https://github.com/aurpelai/bmf-generator/commit/7236a01))

### 🩹 Fixes

- Baseline indicator not visible when importing a BMF font ([543e1b7](https://github.com/aurpelai/bmf-generator/commit/543e1b7))
- Show cap-height guide when glyph box is smaller than cap height ([0fb1f6b](https://github.com/aurpelai/bmf-generator/commit/0fb1f6b))
- Glyphs lost when switching between projects ([2b800f5](https://github.com/aurpelai/bmf-generator/commit/2b800f5))
- Font import rasterisation slow and silently fails on confirm ([3d0440f](https://github.com/aurpelai/bmf-generator/commit/3d0440f))
- Right panel tab bar height to match glyph list header and toolbar ([db7104e](https://github.com/aurpelai/bmf-generator/commit/db7104e))
- Cursor pointer on buttons and tabs, active tab underline alignment, placeholder text consistency ([7bee7a3](https://github.com/aurpelai/bmf-generator/commit/7bee7a3))
- Add px unit to brush size stepper ([584c63f](https://github.com/aurpelai/bmf-generator/commit/584c63f))
- Clamp baseline and cap height to line height, improve guide labels ([adc4524](https://github.com/aurpelai/bmf-generator/commit/adc4524))
- Match right panel collapse button style to glyph list ([88a08cc](https://github.com/aurpelai/bmf-generator/commit/88a08cc))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.1.0


### 🚀 Enhancements

- Phase 1 — core domain logic, Dexie schema, Zustand store ([4ac342b](https://github.com/aurpelai/bmf-generator/commit/4ac342b))
- Phase 2 — app shell, home screen, project management ([aa23092](https://github.com/aurpelai/bmf-generator/commit/aa23092))
- Add font rasterisation pipeline (opentype.js + OffscreenCanvas) ([dcf021a](https://github.com/aurpelai/bmf-generator/commit/dcf021a))
- Add glyph list panel and pixel grid editor ([da0a6ec](https://github.com/aurpelai/bmf-generator/commit/da0a6ec))
- Initialize blank glyphs on project creation, add single-glyph UI ([e0f3f5c](https://github.com/aurpelai/bmf-generator/commit/e0f3f5c))
- Sort glyph list by uppercase letters, lowercase, digits, then rest ([ebf3cc1](https://github.com/aurpelai/bmf-generator/commit/ebf3cc1))
- Baseline/cap-height guides, metrics tab, reset to font, atlas auto-update ([011c188](https://github.com/aurpelai/bmf-generator/commit/011c188))
- Load existing BMF project from .fnt + atlas PNG ([5a1f133](https://github.com/aurpelai/bmf-generator/commit/5a1f133))
- Phase 5 export — ZIP download, clipboard copy, JSON project portability ([23b48fb](https://github.com/aurpelai/bmf-generator/commit/23b48fb))
- Glyph selection for export — presets and per-glyph toggles ([37a8a56](https://github.com/aurpelai/bmf-generator/commit/37a8a56))

### 🩹 Fixes

- Auto-detect 1-bit vs alpha atlas when slicing glyph pixels ([2cf7f7e](https://github.com/aurpelai/bmf-generator/commit/2cf7f7e))
- Handle black-on-white RGB atlases by inverting pixel values ([b40613a](https://github.com/aurpelai/bmf-generator/commit/b40613a))

### 💅 Refactors

- Move Load existing project button next to New blank project ([9151055](https://github.com/aurpelai/bmf-generator/commit/9151055))
- Rename and reorder home screen actions to use consistent font terminology ([f184238](https://github.com/aurpelai/bmf-generator/commit/f184238))
- Rename app title to BMF Font Editor ([bae6d16](https://github.com/aurpelai/bmf-generator/commit/bae6d16))

### 📖 Documentation

- Document branching model in CLAUDE.md ([0d59a2e](https://github.com/aurpelai/bmf-generator/commit/0d59a2e))
- Clarify changelog visibility rules in commit convention ([39d3b5c](https://github.com/aurpelai/bmf-generator/commit/39d3b5c))
- Add ci: commit type, split from chore: ([935ba8c](https://github.com/aurpelai/bmf-generator/commit/935ba8c))
- Clarify branching rules — protected main, fresh-branch workflow ([3ea4c92](https://github.com/aurpelai/bmf-generator/commit/3ea4c92))

### 🏡 Chore

- Add CLAUDE.md ([1dd518f](https://github.com/aurpelai/bmf-generator/commit/1dd518f))
- Project scaffold ([40fc54d](https://github.com/aurpelai/bmf-generator/commit/40fc54d))
- Add versioning and changelog setup ([a406c55](https://github.com/aurpelai/bmf-generator/commit/a406c55))
- Add automated release workflow ([53c9f70](https://github.com/aurpelai/bmf-generator/commit/53c9f70))
- Resolve release workflow errors ([c64946a](https://github.com/aurpelai/bmf-generator/commit/c64946a))
- **release:** V0.0.2 ([12ca4ad](https://github.com/aurpelai/bmf-generator/commit/12ca4ad))
- **release:** V0.0.3 ([080d28a](https://github.com/aurpelai/bmf-generator/commit/080d28a))
- Add changelogen config restricting version bumps to feat and fix ([bbb7d79](https://github.com/aurpelai/bmf-generator/commit/bbb7d79))
- **release:** V0.0.4 ([ba71552](https://github.com/aurpelai/bmf-generator/commit/ba71552))
- **release:** V0.0.5 ([b6ec61d](https://github.com/aurpelai/bmf-generator/commit/b6ec61d))
- **release:** V0.0.6 ([45f299c](https://github.com/aurpelai/bmf-generator/commit/45f299c))
- **release:** V0.0.7 ([0b7e7df](https://github.com/aurpelai/bmf-generator/commit/0b7e7df))
- **ci:** Switch release workflow to manual trigger ([801a9aa](https://github.com/aurpelai/bmf-generator/commit/801a9aa))
- **release:** Reset versioning to v0.0.1, regenerate changelog from all commits ([dab1f89](https://github.com/aurpelai/bmf-generator/commit/dab1f89))
- **release:** Fold GitHub Release creation into pnpm release script, drop CI workflow ([de1d081](https://github.com/aurpelai/bmf-generator/commit/de1d081))

### 🤖 CI

- Skip release when no feat or fix commits since last tag ([58e6ba3](https://github.com/aurpelai/bmf-generator/commit/58e6ba3))
- Bump GitHub Actions to v6 for Node.js 24 support ([3631228](https://github.com/aurpelai/bmf-generator/commit/3631228))
- Create GitHub Release from CHANGELOG after each version tag ([b3e4dfd](https://github.com/aurpelai/bmf-generator/commit/b3e4dfd))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>
- Github-actions ([@Github-Action-Bot](https://github.com/Github-Action-Bot))

## v0.0.1

### 🚀 Enhancements

- Phase 1 — core domain logic, Dexie schema, Zustand store ([4ac342b](https://github.com/aurpelai/bmf-generator/commit/4ac342b))
- Phase 2 — app shell, home screen, project management ([aa23092](https://github.com/aurpelai/bmf-generator/commit/aa23092))
- Add font rasterisation pipeline (opentype.js + OffscreenCanvas) ([dcf021a](https://github.com/aurpelai/bmf-generator/commit/dcf021a))
- Add glyph list panel and pixel grid editor ([da0a6ec](https://github.com/aurpelai/bmf-generator/commit/da0a6ec))
- Initialize blank glyphs on project creation, add single-glyph UI ([e0f3f5c](https://github.com/aurpelai/bmf-generator/commit/e0f3f5c))
- Sort glyph list by uppercase letters, lowercase, digits, then rest ([ebf3cc1](https://github.com/aurpelai/bmf-generator/commit/ebf3cc1))
- Baseline/cap-height guides, metrics tab, reset to font, atlas auto-update ([011c188](https://github.com/aurpelai/bmf-generator/commit/011c188))
- Load existing BMF project from .fnt + atlas PNG ([5a1f133](https://github.com/aurpelai/bmf-generator/commit/5a1f133))
- Phase 5 export — ZIP download, clipboard copy, JSON project portability ([23b48fb](https://github.com/aurpelai/bmf-generator/commit/23b48fb))
- Glyph selection for export — presets and per-glyph toggles ([37a8a56](https://github.com/aurpelai/bmf-generator/commit/37a8a56))

### 🩹 Fixes

- Auto-detect 1-bit vs alpha atlas when slicing glyph pixels ([2cf7f7e](https://github.com/aurpelai/bmf-generator/commit/2cf7f7e))
- Handle black-on-white RGB atlases by inverting pixel values ([b40613a](https://github.com/aurpelai/bmf-generator/commit/b40613a))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>
