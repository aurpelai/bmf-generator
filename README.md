# BMF Generator

A frontend-only web service for generating [BMF bitmap fonts](https://www.angelcode.com/products/bmfont/doc/file_format.html) (AngelCode format).

Upload a TTF/OTF/WOFF font or draw glyphs from scratch on a pixel grid, then export a `.fnt` descriptor and PNG atlas ready for use in game engines (Phaser, PixiJS, Godot, etc.).

No backend. No accounts. All data stays in your browser.

## Development

```bash
pnpm install
pnpm dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Open Vitest UI |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

## Tech stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) (state) + [Dexie](https://dexie.org/) (IndexedDB)
- [opentype.js](https://opentype.js.org/) (font parsing)
- [fflate](https://101arrowz.github.io/fflate/) (ZIP export)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)

## License

[Unlicense](./LICENSE) — public domain.
