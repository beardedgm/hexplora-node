# HexPlora

A full-stack hex map viewer for tabletop RPGs. Upload a map image, overlay a hex grid, manage fog of war, and place tokens — all in your browser. Sign in to sync maps to the cloud, or use local storage as a guest.

## Features

- **Hex grid overlay** — Configurable size, offset, orientation (flat-top / pointy-top), color, and thickness
- **Fog of war** — Click hexes to reveal or hide areas; adjustable fog color and opacity
- **Token management** — Place, drag, edit, and delete tokens with labels and Material Symbols icons
- **Pan & zoom** — Mouse wheel zoom, middle-click/right-click/ctrl+click pan, touch pinch zoom
- **Undo / redo** — Full history for fog and token changes (Ctrl+Z / Ctrl+Y)
- **Map library** — Save multiple maps; load, rename, delete, export, and import them as complete packages
- **Cloud sync** — Patrons get up to 25 cloud-synced maps via MongoDB Atlas
- **Local storage** — Guest users get 1 local map via IndexedDB; authenticated non-patrons also get 1 local slot
- **Screenshot** — Download the current view as a composite PNG
- **Self-contained maps** — Every map is a complete package: image, grid settings, fog state, tokens, and view
- **Patreon integration** — Link your Patreon account to unlock cloud storage tiers
- **Responsive** — Works on desktop and mobile (touch gestures supported)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Zustand 5, HTML5 Canvas, Bootstrap 5 (CDN) |
| Icons | Material Symbols Outlined (Google Fonts CDN) |
| Bundler | Vite |
| Backend | Express 4, Node.js (ES modules) |
| Database | MongoDB Atlas (Mongoose 8) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Client storage | IndexedDB (local maps), localStorage (auth token cache) |
| HTTP client | Axios |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize, express-validator |
| Deployment | Render.com (Node.js web service) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A MongoDB Atlas cluster (or local MongoDB instance)

### Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
PORT=3000

# Patreon OAuth (optional — only needed for patron tier)
PATREON_CLIENT_ID=your-patreon-client-id
PATREON_CLIENT_SECRET=your-patreon-client-secret
PATREON_REDIRECT_URI=http://localhost:3000/api/patreon/callback
```

### Install

```bash
git clone <your-repo-url>
cd hexplora-node-main
npm install
cd client && npm install && cd ..
```

### Development

```bash
npm run dev
```

Starts both the Express API server (`http://localhost:3000`) and the Vite dev server (`http://localhost:5173`) concurrently with hot module replacement.

### Production Build

```bash
npm run build
```

Bundles `client/src/` into `dist/` via Vite.

### Production Server

```bash
npm start
```

Starts Express on port 3000 (or `$PORT`), serving the API routes and the built frontend from `dist/`.

## Project Structure

```
hexplora-node-main/
  package.json            # Root — scripts, shared dependencies
  render.yaml             # Render.com deployment config
  server/
    index.js              # Express app — middleware, routes, static serving
    config/
      db.js               # MongoDB connection
    middleware/
      auth.js             # JWT authentication middleware
      mapLimit.js         # Enforces per-tier map slot limits
    models/
      User.js             # User schema (email, password, patreon, mapLimit)
      Map.js              # Map schema (image, settings, view, tokens, fog)
    routes/
      auth.js             # POST /api/auth/register, /login, /me
      maps.js             # CRUD /api/maps — cloud map storage
      patreon.js          # GET /api/patreon/link, /callback, /unlink
  client/
    package.json          # Client dependencies (React, Zustand, Axios)
    vite.config.js        # Vite config with React plugin + API proxy
    public/
      icons/              # Favicons, manifest, social images
      maps/               # Sample map images
    src/
      main.jsx            # React entry point
      App.jsx             # Router — Login, Register, Profile, Map pages
      style.css           # Dark theme UI styles
      pages/
        MapPage.jsx       # Main app page (canvas, toolbar, modals)
        LoginPage.jsx     # Email/password login
        RegisterPage.jsx  # Account registration
        ProfilePage.jsx   # Profile, Patreon linking, account management
      store/
        useAuthStore.js   # Zustand — auth state (user, token, isPatron)
        useStore.js       # Zustand — re-exports vanilla store for React
      state/
        store.js          # Vanilla pub/sub store (for imperative canvas code)
        index.js          # Singleton store instance
        defaults.js       # Default values & constants
        history.js        # Undo/redo stack
      canvas/
        renderer.js       # Render loop orchestrator (3-layer canvas)
        mapLayer.js       # Background map drawing
        gridLayer.js      # Hex grid + fog rendering
        tokenLayer.js     # Token rendering (icons, labels, selection)
        screenshot.js     # Composite PNG export
        coordinates.js    # Screen-to-world coordinate conversion
      hex/
        math.js           # Grid generation, hex hit-testing, spatial index
        fog.js            # Reveal/hide/reset fog of war
      tokens/
        tokenModal.js     # Token add/edit modal logic
      input/
        mouse.js          # Mouse click, move, drag handlers
        touch.js          # Touch, pinch zoom, double-tap
        keyboard.js       # Keyboard shortcuts
        panZoom.js        # Pan/zoom state and handlers
      ui/
        toolbar.js        # Toolbar button wiring
        modals.js         # Modal open/close logic
        infoBar.js        # Zoom display, undo/redo buttons
        status.js         # Status toast notifications
        debug.js          # Debug panel
        tooltip.js        # Hover tooltips
        inputFields.js    # Grid/appearance input bindings
      persistence/
        db.js             # IndexedDB operations (local map CRUD)
        localStorage.js   # Debounced state persistence (cloud + local)
        importExport.js   # Blob/DataURL utilities, applyState helper
        serialization.js  # Store ↔ serialized state conversion
        library.js        # Map library — load, save, rename, delete, export, import
      services/
        client.js         # Axios API client (base URL, token, 401 handling)
        auth.js           # Auth API calls (register, login, getProfile)
        maps.js           # Maps API calls (CRUD for cloud maps)
        patreon.js        # Patreon API calls (link, callback, unlink)
      util/
        dom.js            # DOM helpers with event cleanup
        debounce.js       # Debounce utility
        color.js          # Color conversion
        spatialIndex.js   # SpatialHashGrid for O(1) token lookups
```

## Storage Tiers

| Tier | Cloud maps | Local maps | Requirements |
|---|---|---|---|
| Patron | Up to 25 | — | Signed in + Patreon linked |
| Authenticated | — (read-only\*) | 1 | Signed in |
| Guest | — | 1 | No account needed |

\* Authenticated non-patrons can still view their cloud maps but cannot create new ones until they link Patreon.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+M | Toggle reveal/hide mode |
| Ctrl+T | Toggle add-token mode |
| Arrow keys | Pan map (hold Shift for fast pan) |
| +/= | Zoom in |
| - | Zoom out |
| Delete / Backspace | Delete selected token |
| Escape | Cancel current mode / deselect token |
| ? | Toggle help modal |

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |
| GET | `/api/maps` | Yes | List user's cloud maps |
| POST | `/api/maps` | Yes | Create a new cloud map |
| PUT | `/api/maps/:id` | Yes | Update a cloud map |
| DELETE | `/api/maps/:id` | Yes | Delete a cloud map |
| GET | `/api/patreon/link` | Yes | Start Patreon OAuth flow |
| GET | `/api/patreon/callback` | No | Patreon OAuth callback |
| POST | `/api/patreon/unlink` | Yes | Unlink Patreon account |

## Deployment (Render.com)

The project includes a `render.yaml` for automatic configuration:

1. Push the repo to GitHub
2. In the Render dashboard: **New > Web Service > Connect GitHub repo**
3. Render detects `render.yaml` and configures the build/start commands automatically
4. Add the environment variables (`MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and optionally the Patreon keys)
5. Configure a custom domain in the Render dashboard if desired

## License

All rights reserved.
