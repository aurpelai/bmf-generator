# BMF Font Editor

A browser-based editor for creating [BMF bitmap fonts](https://www.angelcode.com/products/bmfont/doc/file_format.html) (AngelCode format) — the format used by Phaser, PixiJS, Godot, and most 2D game engines.

Upload a TTF/OTF/WOFF font to rasterise it automatically, or draw glyphs pixel-by-pixel from scratch. Export a `.fnt` descriptor and a packed PNG atlas ready to drop into your game.

No backend. No accounts. All data stays in your browser.

## Features

- **Import TTF/OTF/WOFF** — rasterise any system or uploaded font at any size
- **Import existing BMF** — load a `.fnt` + atlas PNG to continue editing
- **Pixel grid editor** — pencil, eraser, fill, move, and zoom tools with configurable brush size
- **Typography guides** — baseline, cap-height, and line-height guides overlaid on the canvas
- **Glyph metrics** — per-glyph xOffset, yOffset, and xAdvance controls
- **Atlas preview** — live MaxRects-packed atlas visible while editing
- **Selective export** — choose which glyphs to include; presets for ASCII, digits, and custom ranges
- **Export formats** — ZIP download (`.fnt` + PNG), clipboard copy, or JSON project portability
- **Multi-project** — unlimited projects stored in IndexedDB; switch without losing work
- **Undo / redo** — full history per glyph
- **Keyboard shortcuts** — press `?` in the editor for the shortcut reference

## Getting started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`, create a new blank project or import an existing font, and start editing.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

## Tech stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) (state) + [Dexie](https://dexie.org/) (IndexedDB)
- [opentype.js](https://opentype.js.org/) (font parsing and rasterisation)
- [fflate](https://101arrowz.github.io/fflate/) (ZIP export)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)

## License

[Unlicense](./LICENSE) — public domain.
