# C2

D&D 2024 PHB–style character sheet and creation flow (React, Vite, TypeScript, Tailwind).

## Project layout

```text
src/
  app/                 # App shell — main.tsx, App.tsx (entry: index.html → /src/app/main.tsx)
  components/
    layout/            # Sidebar
    sheet/             # Character sheet UI (CharacterSheet, rows, pickers wiring)
    creation/          # CharacterCreationWizard, LevelUpModal
    modals/            # Race / background / feat / spell / armor pickers
    tabs/              # Companion, Wild Shape
  config/              # constants.ts (classes, alignments, …)
  data/                # Game data (spells, feats, level tables, …)
  lib/                 # utils, exportCharacterPDF
  styles/              # index.css
  types/               # Shared TypeScript types (index.ts)
  vite-env.d.ts
```

Imports use the `@/` alias → `src/` (see `vite.config.ts` and `tsconfig.json`).

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optional — Gemini features: create `.env.local` in the project root and set:

   ```env
   GEMINI_API_KEY=your_key_here
   ```

   Vite loads this via `vite.config.ts` for `process.env.GEMINI_API_KEY`.

3. Optional — **Rules PDF** (sidebar “Rules” viewer): place your PDF as:

   ```text
   public/rules.pdf
   ```

   It is copied to `dist/rules.pdf` on build. Without it, the Rules iframe will be empty.

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Dev server at `http://localhost:3000` (host `0.0.0.0`) |
| `npm run build`   | Production build to `dist/`                      |
| `npm run preview` | Serve `dist/` over HTTP (good for testing builds) |
| `npm run lint`    | Typecheck (`tsc --noEmit`)                       |

On Windows, if `npm run clean` fails (`rm` not found), delete the `dist` folder manually.

## Production build notes

- **`base: './'`** — Asset URLs are relative so the app can be hosted under a subpath or opened from `dist/index.html` on disk.
- **IIFE + deferred classic script** — The production bundle avoids `type="module"` in the emitted HTML so Chrome can load the app from `file://`. Dev mode is unchanged (ES modules + HMR).
- **Embedded PDF** — Some browsers restrict showing a local PDF inside an iframe when using `file://`. If the Rules panel is blank from disk, use `npm run preview` or any static HTTP server for `dist/`.

## AI Studio

Original AI Studio app: https://ai.studio/apps/a13b72e3-de58-4399-856e-e5ae36a321f1
