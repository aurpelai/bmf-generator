# Changelog

All notable changes to this project will be documented in this file.

## v0.0.7

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.6...v0.0.7)

### 🚀 Enhancements

- Load existing BMF project from .fnt + atlas PNG ([5a1f133](https://github.com/aurpelai/bmf-generator/commit/5a1f133))

### 🩹 Fixes

- Auto-detect 1-bit vs alpha atlas when slicing glyph pixels ([2cf7f7e](https://github.com/aurpelai/bmf-generator/commit/2cf7f7e))
- Handle black-on-white RGB atlases by inverting pixel values ([b40613a](https://github.com/aurpelai/bmf-generator/commit/b40613a))

### 💅 Refactors

- Move Load existing project button next to New blank project ([9151055](https://github.com/aurpelai/bmf-generator/commit/9151055))

### 🤖 CI

- Create GitHub Release from CHANGELOG after each version tag ([b3e4dfd](https://github.com/aurpelai/bmf-generator/commit/b3e4dfd))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.0.6

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.5...v0.0.6)

### 🚀 Enhancements

- Baseline/cap-height guides, metrics tab, reset to font, atlas auto-update ([011c188](https://github.com/aurpelai/bmf-generator/commit/011c188))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.0.5

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.4...v0.0.5)

### 🚀 Enhancements

- Sort glyph list by uppercase letters, lowercase, digits, then rest ([ebf3cc1](https://github.com/aurpelai/bmf-generator/commit/ebf3cc1))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.0.4

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.3...v0.0.4)

### 🚀 Enhancements

- Add glyph list panel and pixel grid editor ([da0a6ec](https://github.com/aurpelai/bmf-generator/commit/da0a6ec))
- Initialize blank glyphs on project creation, add single-glyph UI ([e0f3f5c](https://github.com/aurpelai/bmf-generator/commit/e0f3f5c))

### 📖 Documentation

- Add ci: commit type, split from chore: ([935ba8c](https://github.com/aurpelai/bmf-generator/commit/935ba8c))
- Clarify branching rules — protected main, fresh-branch workflow ([3ea4c92](https://github.com/aurpelai/bmf-generator/commit/3ea4c92))

### 🏡 Chore

- Add changelogen config restricting version bumps to feat and fix ([bbb7d79](https://github.com/aurpelai/bmf-generator/commit/bbb7d79))

### 🤖 CI

- Skip release when no feat or fix commits since last tag ([58e6ba3](https://github.com/aurpelai/bmf-generator/commit/58e6ba3))
- Bump GitHub Actions to v6 for Node.js 24 support ([3631228](https://github.com/aurpelai/bmf-generator/commit/3631228))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.0.3

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.2...v0.0.3)

### 📖 Documentation

- Clarify changelog visibility rules in commit convention ([39d3b5c](https://github.com/aurpelai/bmf-generator/commit/39d3b5c))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## v0.0.2

[compare changes](https://github.com/aurpelai/bmf-generator/compare/v0.0.1...v0.0.2)

### 🚀 Enhancements

- Phase 1 — core domain logic, Dexie schema, Zustand store ([4ac342b](https://github.com/aurpelai/bmf-generator/commit/4ac342b))
- Phase 2 — app shell, home screen, project management ([aa23092](https://github.com/aurpelai/bmf-generator/commit/aa23092))
- Add font rasterisation pipeline (opentype.js + OffscreenCanvas) ([dcf021a](https://github.com/aurpelai/bmf-generator/commit/dcf021a))

### 📖 Documentation

- Document branching model in CLAUDE.md ([0d59a2e](https://github.com/aurpelai/bmf-generator/commit/0d59a2e))

### 🏡 Chore

- Add automated release workflow ([53c9f70](https://github.com/aurpelai/bmf-generator/commit/53c9f70))
- Resolve release workflow errors ([c64946a](https://github.com/aurpelai/bmf-generator/commit/c64946a))

### ❤️ Contributors

- Antti Urpelainen <antti.urpelainen@gmail.com>

## [0.0.1] - Unreleased

Initial project scaffold.
