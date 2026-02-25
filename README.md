# HexPlora

A browser-based hex map viewer for tabletop RPGs. Upload a map image, overlay a hex grid, manage fog of war, and place tokens — all in your browser.

## Features

- **Hex grid overlay** — Configurable size, offset, orientation (flat-top / pointy-top), color, and thickness
- **Fog of war** — Click hexes to reveal or hide areas; adjustable fog color and opacity
- **Token management** — Place, drag, edit, and delete tokens with labels and Material Symbols icons
- **Pan & zoom** — Mouse wheel zoom, middle-click/right-click/ctrl+click pan, touch pinch zoom
- **Undo / redo** — Full history for fog and token changes (Ctrl+Z / Ctrl+Y)
- **Map library** — Save multiple maps to IndexedDB; load, rename, delete, and export them
- **Import / export** — JSON state import/export for sharing configurations
- **Screenshot** — Download the current view as a composite PNG
- **Persistent state** — Settings and revealed hexes survive page reloads via localStorage + IndexedDB
- **Responsive** — Works on desktop and mobile (touch gestures supported)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES6 modules), HTML5 Canvas, Bootstrap 5 (CDN) |
| Icons | Material Symbols Outlined (Google Fonts CDN) |
| Bundler | Vite 6 |
| Backend | Express 4 (static file server) |
| Storage | localStorage + IndexedDB (client-side) |
| Deployment | Render.com (Node.js web service) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone <your-repo-url>
cd hexplora
npm install
```

### Development

```bash
npm run dev
```

Opens a Vite dev server at `http://localhost:5173` with hot module replacement.

### Production Build

```bash
npm run build
```

Bundles `src/` into `dist/` via Vite.

### Production Server

```bash
npm start
```

Starts Express on port 3000 (or `$PORT`), serving the built files from `dist/`.

### Preview (Build + Serve)

```bash
npm run preview
```

Builds and immediately serves — useful for local production testing.

## Project Structure

```
hexplora/
  package.json
  vite.config.js
  render.yaml
  server/
    index.js              # Express — serves dist/
  src/
    index.html            # Entry HTML (3 canvases, modals, toolbar)
    main.js               # App bootstrap
    style.css             # Dark theme UI styles
    state/
      store.js            # Pub/sub state store
      index.js            # Singleton store instance
      defaults.js         # Default values & constants
      history.js          # Undo/redo stack
    hex/
      math.js             # Grid generation, hex hit-testing, spatial index
      fog.js              # Reveal/hide/reset fog of war
    canvas/
      renderer.js         # Render loop orchestrator
      mapLayer.js         # Background map drawing
      gridLayer.js        # Hex grid + fog rendering
      tokenLayer.js       # Token rendering (icons, labels, selection)
      screenshot.js       # Composite PNG export
      coordinates.js      # Screen-to-world coordinate conversion
    tokens/
      tokenModal.js       # Token add/edit modal logic
    input/
      mouse.js            # Mouse click, move, drag handlers
      touch.js            # Touch, pinch zoom, double-tap
      keyboard.js         # Keyboard shortcuts
      panZoom.js          # Pan/zoom state and handlers
    ui/
      toolbar.js          # Toolbar button wiring
      modals.js           # Modal open/close logic
      infoBar.js          # Zoom display, undo/redo buttons
      status.js           # Status notifications
      debug.js            # Debug panel
      tooltip.js          # Hover tooltips
      inputFields.js      # Grid/appearance input bindings
    persistence/
      db.js               # IndexedDB operations
      localStorage.js     # localStorage save/load
      importExport.js     # JSON export/import, blob utilities
      library.js          # Map library (save, load, rename, delete)
    util/
      dom.js              # DOM helpers with event cleanup
      debounce.js         # Debounce utility
      color.js            # Color conversion
      spatialIndex.js     # SpatialHashGrid for O(1) lookups
  public/
    icons/                # Favicons, manifest, social images
    maps/                 # Sample map images
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl + Z | Undo |
| Ctrl + Y | Redo |
| Ctrl + E | Export state |
| Ctrl + I | Import state |
| Ctrl + M | Toggle reveal/hide mode |
| Ctrl + T | Toggle add-token mode |
| Delete | Delete selected token |
| Escape | Cancel current mode |

## Deployment (Render.com)

The project includes a `render.yaml` for automatic configuration:

1. Push the repo to GitHub
2. In the Render dashboard: **New > Web Service > Connect GitHub repo**
3. Render detects `render.yaml` and configures the build/start commands automatically
4. Configure a custom domain in the Render dashboard if desired

## License

All rights reserved.
