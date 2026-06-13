# Changelog

All notable changes to this project will be documented in this file.

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
