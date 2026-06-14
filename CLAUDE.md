# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`bmf-generator` is a frontend-only online service for generating BMF bitmap fonts (AngelCode format). Users can upload a TTF/OTF font or draw glyphs from scratch, edit them on a pixel grid, and export a `.fnt` descriptor + PNG atlas. No backend; all state lives in localStorage/IndexedDB.

A `plans/` directory may be present locally with design and implementation planning documents.

## Branching model

All work happens on feature branches merged to `main` via PRs. **Never commit directly to `main`** — it is protected by a GitHub branch ruleset that blocks direct pushes. Always create a branch, commit there, and open a PR.

**Before starting any new work**, create a fresh branch off an up-to-date `main`:

```bash
git fetch origin
git checkout main
git merge --ff-only origin/main
git checkout -b <type>/short-description
```

**Branch naming:** mirrors the commit type prefix:

- `feat/short-description` — new feature
- `fix/short-description` — bug fix
- `chore/short-description` — tooling, deps, config

**Merge strategy: regular merge commit (no squash).** Granular conventional commits on the branch are preserved in `main`'s history. Changelogen reads each individual commit when generating the changelog, so a well-documented branch produces a well-documented release. Squash merge is explicitly avoided for this reason.

**Commit granularity on branches:** each logical unit of work gets its own conventional commit. A branch implementing a feature may have several `feat:`, `fix:`, and `refactor:` commits — that's correct and intentional.

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org). Types:

- `feat:` — new user-facing feature
- `fix:` — bug fix visible to end users of the app
- `chore:` — tooling, dependencies, config (no production code change)
- `ci:` — GitHub Actions, release pipeline, CI/CD changes
- `refactor:` — code change with no behaviour change
- `test:` — adding or updating tests
- `docs:` — documentation only

Not enforced by tooling — use good judgement. Consistent messages keep the auto-generated changelog useful.

**Changelog visibility:** changelogen includes `feat:` and `fix:` in the changelog and hides everything else. Take this into account when generating commit message titles. See the commit convention above for the correct prefix to use for any given commit.

## Releases

```bash
pnpm release   # bumps version, generates CHANGELOG.md, creates git tag
```

Versioning follows [semver](https://semver.org). Current pre-launch range: `0.x.x`. Bump to `1.0.0` at first public launch.

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

**Prefer shared components and logic.** Before writing new UI or utility code, check whether a suitable shared component or helper already exists. Extract reusable pieces into shared modules (e.g. `import-shared.tsx` for wizard UI, `core/` for domain logic, `hooks/` for React hooks) rather than duplicating across feature files. Three similar implementations is a signal to consolidate, not a reason to add a fourth.

## Code style

**React components** must be defined as arrow functions: `const MyComponent = (props: Props): React.JSX.Element => { ... }`. Never use `function MyComponent()` syntax for components.

**Naming — no abbreviations.** All variables, constants, and function parameters (including callbacks) must use full, descriptive names. Avoid abbreviations like `btn`, `cfg`, `err`, `res`, `tmp`, `val`, `idx`, etc. Use `button`, `config`, `error`, `result`, `temp`, `value`, `index` instead. Specific conventions:

- Callback and function parameters: `value` not `v`, `event` not `e`, `state` not `s`, `project` not `p`, `index` not `i` or `idx`
- Array callbacks: the parameter name should reflect the array name — `glyphs.map((glyph) => ...)`, `projects.filter((project) => ...)`. Stay concise without abbreviating.
- Loop variables: use `index` for numeric counters, or a domain name like `glyphIndex`
- Destructured props: keep as-is — prop names are bound to the interface definition
- Single-letter names are never acceptable, including math-style variables unless the domain genuinely calls for it (e.g. `x`, `y` for coordinates)
