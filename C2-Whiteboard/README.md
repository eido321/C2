# C2 Whiteboard

A Figma-like whiteboard for building **custom D&D character sheets** out of draggable blocks on an infinite canvas. Start from a blank canvas or a template, drop in blocks, arrange them freely, and signed-in sheets automatically save to your private library. Guests can keep a draft on the current device.

## Features

- **Infinite canvas** — pan (middle-mouse, or hold `Space` + drag), zoom (`Ctrl`/`Cmd` + wheel, or the zoom controls), fit-to-content and reset, with a dotted grid that scales with zoom.
- **Freeform blocks** — absolutely positioned with drag-to-move, 8-handle resize, delete (`Del`/`Backspace`), duplicate (`Ctrl`/`Cmd`+`D`), layering, and optional snap-to-grid.
- **Block types**
  - `heading` — title + subtitle
  - `text` — free-form notes / paragraphs
  - `abilityScores` — the six D&D abilities with auto-computed modifiers
  - `statBlock` — a labeled stat (AC, HP, Speed, Initiative, Proficiency…)
  - `image` — image URL or uploaded file (stored as a data URL)
  - `divider` — decorative section break
  - `list` — editable bullet / numbered list (inventory, features…)
  - `spellList` — spell levels, preparation, slots and descriptions
- **Left palette** to add blocks near the center of the current viewport.
- **Right properties panel** to edit the selected block's content, typography, container style, and exact position/size.
- **Top bar** with editable title, templates, private sheets, JSON backups, fillable PDF export, PDF/HTML/JSON import and save status.
- **Templates** — Blank canvas, Universal Character Sheet and D&D class-specific layouts.
- **My character sheets** — create an account with a username and password. Open saved sheets across devices or copy an existing browser draft into the account. The editor confirms when an account save finishes.

## Tech stack

Vite 6 · React 19 · TypeScript 5.8 · Tailwind CSS v4 (`@tailwindcss/vite`) · lucide-react · clsx + tailwind-merge. Uses the `@/` → `src/` path alias.

## Getting started

```bash
cd C2-Whiteboard
npm install
npm run dev      # http://localhost:3001
```

Other scripts:

```bash
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # tsc --noEmit typecheck
```

## Project layout

```
C2-Whiteboard/
  index.html
  src/
    app/            main.tsx, App.tsx
    components/
      canvas/       Canvas (pan/zoom/grid), BlockRenderer (drag/resize)
      blocks/       one component per block type + dispatcher
      panels/       TopBar, BlockPalette, PropertiesPanel
      templates/    StartScreen (template gallery)
      Workspace.tsx layout + keyboard shortcuts
    store/          reducer + React context
    types/          Block / Whiteboard model
    data/           starter templates
    lib/            utils, block defaults, persistence, JSON import/export
    styles/         index.css (Tailwind + theme)
```

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Select multiple blocks | Drag on empty canvas, or Ctrl/Cmd/Shift-click blocks |
| Select all editable blocks | Ctrl/Cmd + A |
| Copy / cut / paste blocks | Ctrl/Cmd + C / X / V |
| Undo / redo | Ctrl/Cmd + Z / Shift+Z |
| Nudge selection | Arrow keys (Shift for 10 units) |
| Group / ungroup | Ctrl/Cmd + G / Shift+G |
| Delete block | `Del` / `Backspace` |
| Duplicate block | `Ctrl`/`Cmd` + `D` |
| Deselect / stop editing | `Esc` |
| Pan | `Space` + drag, middle-mouse drag |
| Zoom | `Ctrl`/`Cmd` + wheel |
| Edit block content | double-click a block |


## Account storage

The Vercel function in api/library.js uses Neon Postgres. Connect a Neon database to the Vercel project and set its server-side DATABASE_URL. The function creates the account, session and sheet tables on first use. Run vercel dev to serve the API and frontend together locally with a development database. Plain Vite serves the guest editor.



## Regression tests

Run `npm test` with Chrome installed (or set `CHROME_PATH` to a Chromium executable).
The suite builds the app, serves it on localhost, and runs the library API against an isolated in-memory Postgres database.
It covers templates, block editors, layers, pointer and keyboard controls, phone layouts, PDF/JSON/HTML imports, account autosave, session isolation and conflicting saves.


