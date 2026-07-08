# C2 Whiteboard

A Figma-like whiteboard for building **custom D&D character sheets** out of draggable blocks on an infinite canvas. Start from a blank canvas or a template, drop in blocks, arrange them freely, and everything auto-saves to your browser.

## Features

- **Infinite canvas** — pan (drag empty space, middle-mouse, or hold `Space` + drag), zoom (`Ctrl`/`Cmd` + wheel, or the zoom controls), fit-to-content and reset, with a dotted grid that scales with zoom.
- **Freeform blocks** — absolutely positioned with drag-to-move, 8-handle resize, delete (`Del`/`Backspace`), duplicate (`Ctrl`/`Cmd`+`D`), layering, and optional snap-to-grid.
- **Block types**
  - `heading` — title + subtitle
  - `text` — free-form notes / paragraphs
  - `abilityScores` — the six D&D abilities with auto-computed modifiers
  - `statBlock` — a labeled stat (AC, HP, Speed, Initiative, Proficiency…)
  - `image` — image URL or uploaded file (stored as a data URL)
  - `divider` — decorative section break
  - `list` — editable bullet / numbered list (inventory, features…)
- **Left palette** to add blocks near the center of the current viewport.
- **Right properties panel** to edit the selected block's content, typography, container style, and exact position/size.
- **Top bar** with editable title, template menu, JSON import/export, and a save indicator.
- **Templates** — Blank, Classic Character Sheet, Minimal Combat Card, NPC Card.
- **Persistence** — auto-saves to `localStorage`; export to a `.json` file and import it back.

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
| Delete block | `Del` / `Backspace` |
| Duplicate block | `Ctrl`/`Cmd` + `D` |
| Deselect / stop editing | `Esc` |
| Pan | `Space` + drag, middle-mouse, or drag empty space |
| Zoom | `Ctrl`/`Cmd` + wheel |
| Edit block content | double-click a block |
