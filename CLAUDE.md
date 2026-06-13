# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`bmf-generator` is a frontend-only online service for generating BMF bitmap fonts (AngelCode format). Users can upload a TTF/OTF font or draw glyphs from scratch, edit them on a pixel grid, and export a `.fnt` descriptor + PNG atlas. No backend; all state lives in localStorage/IndexedDB.

A `plans/` directory may be present locally with design and implementation planning documents.

## Commands

```bash
pnpm dev          # start dev server
pnpm build        # type-check + production build
pnpm preview      # preview production build
pnpm test         # run tests once
pnpm test:watch   # run tests in watch mode
pnpm lint         # ESLint
pnpm format       # Prettier
```

## Architecture

```
src/
  app/               # top-level view state, layout shell, providers
  features/          # feature modules
    home/            # home screen, project picker, new-project dialog
    editor/          # main editor workspace
      glyph-list/    # left panel
      pixel-editor/  # centre panel — canvas, tools, zoom/pan
      right-panel/   # metrics tab + atlas tab
      toolbar/       # top bar
    export/          # export dialog
  core/              # pure domain logic (no React)
    font/            # font parsing, rasterisation
    atlas/           # MaxRects packing
    bmf/             # BMF text format serialisation
    project/         # data models, load/save
  workers/           # Web Worker scripts
  store/             # Zustand slices
  db/                # Dexie / IndexedDB schema
  components/        # shadcn/ui components + shared UI
  hooks/             # shared React hooks
  utils/             # pure utilities
```

`core/` has no React imports — keep it that way. Tests for `core/` are co-located as `*.test.ts` files.
