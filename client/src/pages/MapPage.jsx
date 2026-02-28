import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';

// Import all imperative setup functions
import { setupStatus } from '../ui/status.js';
import { setupDebug, log } from '../ui/debug.js';
import { setupTooltip } from '../ui/tooltip.js';
import { setupToolbar, toggleMode, toggleAddTokenMode } from '../ui/toolbar.js';
import { setupModals } from '../ui/modals.js';
import { setupInfoBar } from '../ui/infoBar.js';
import { setupInputFields, updateInputFields } from '../ui/inputFields.js';
import { setupRenderer, requestRedraw, startRenderLoop, stopRenderLoop, handleVisibilityChange, drawMap, getCanvases } from '../canvas/renderer.js';
import { downloadMapImage } from '../canvas/screenshot.js';
import { setupPanZoom, resetView } from '../input/panZoom.js';
import { setupMouseHandlers } from '../input/mouse.js';
import { setupTouchHandlers } from '../input/touch.js';
import { setupKeyboardHandlers } from '../input/keyboard.js';
import { setupTokenModal } from '../tokens/tokenModal.js';
import { initHistory, updateUndoRedoButtons } from '../state/history.js';
import { cancelPendingSave } from '../persistence/localStorage.js';
import { loadLastMap, loadMap, handleMapUpload, handleImportMap, showLibrary } from '../persistence/library.js';
import { store } from '../state/index.js';
import { debounce } from '../util/debounce.js';
import { cleanupEventListeners } from '../util/dom.js';

export default function MapPage() {
  const initialized = useRef(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    cancelPendingSave(); // Cancel any debounced save in flight
    logout();
    // Clear map state and reset to default
    store.update({ currentMapId: null, currentMapName: '', mapImage: null });
    localStorage.removeItem('currentMapId');
    loadMap(); // loads default placeholder
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initApp() {
      const mapCanvas = document.getElementById('map-layer');
      const gridCanvas = document.getElementById('grid-layer');
      const tokenCanvas = document.getElementById('token-layer');
      const mapContainer = document.getElementById('map-container');
      const canvas = tokenCanvas;

      setupStatus();
      setupDebug();
      setupTooltip(mapContainer);
      setupRenderer({ map: mapCanvas, grid: gridCanvas, token: tokenCanvas });
      // State is loaded from the map's storage (cloud/IndexedDB) via loadLastMap(),
      // not from the global localStorage cache, so each map's data stays self-contained.
      updateInputFields();
      setupPanZoom(canvas, mapContainer);
      setupMouseHandlers(canvas, mapContainer);
      setupTouchHandlers(canvas);
      setupToolbar(mapContainer);
      setupTokenModal({ toggleAddTokenMode });
      setupModals();
      setupInfoBar();
      setupInputFields();
      initHistory();

      setupKeyboardHandlers({
        toggleMode,
        toggleAddTokenMode,
      });

      const mapFileInput = document.getElementById('map-file-input');
      if (mapFileInput) mapFileInput.addEventListener('change', handleMapUpload);
      const importMapFile = document.getElementById('import-map-file');
      if (importMapFile) importMapFile.addEventListener('change', handleImportMap);

      const openLibraryBtn = document.getElementById('open-library-btn');
      if (openLibraryBtn) openLibraryBtn.addEventListener('click', showLibrary);
      const screenshotBtn = document.getElementById('screenshot-btn');
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
          const canvases = getCanvases();
          downloadMapImage(canvases.mapCanvas, canvases.gridCanvas, canvases.tokenCanvas, drawMap);
        });
      }
      const resetViewBtn = document.getElementById('reset-view-btn');
      if (resetViewBtn) resetViewBtn.addEventListener('click', resetView);

      const debouncedRedraw = debounce(() => requestRedraw(), 150);
      window.addEventListener('resize', debouncedRedraw);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const loaded = await loadLastMap();
      if (!loaded) loadMap();

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (err) {
          console.error('Font loading error:', err);
        }
      }

      updateUndoRedoButtons();
      requestRedraw();
      startRenderLoop();
      log('App initialized');
    }

    initApp();

    return () => {
      stopRenderLoop();
      cleanupEventListeners();
    };
  }, []);

  return (
    <>
      {/* User bar */}
      <div className="user-bar d-flex align-items-center gap-2">
        {user ? (
          <>
            <Link to="/profile" className="text-light small text-decoration-none" title="View profile">
              {user.username || user.email}
            </Link>
            {user.isPatron && (
              <span className="badge bg-success">Member</span>
            )}
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline-light btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>

      {/* Button row — same HTML as original index.html */}
      <div className="button-row d-flex flex-wrap gap-2" id="button-row">
        <button id="toggle-mode-btn" className="btn btn-primary btn-sm" title="Toggle Reveal/Hide mode (Ctrl+M)">Mode: Reveal</button>
        <button id="add-token-btn" className="btn btn-info btn-sm" title="Add token to map (Ctrl+T)">Add Token</button>
        <button id="remove-token-btn" className="btn btn-warning btn-sm" title="Remove a token from the map">Remove Token</button>
        <button id="reset-view-btn" className="btn btn-info btn-sm" title="Reset pan and zoom to default">Reset View</button>
        <button id="reset-map-btn" className="btn btn-danger btn-sm" title="Hide all revealed hexes">Reset Fog</button>
        <button id="clear-tokens-btn" className="btn btn-danger btn-sm" title="Remove all tokens from the map">Clear Tokens</button>
        <button id="debug-toggle" className="btn btn-secondary btn-sm" title="Toggle debug info panel">Toggle Debug</button>
        <div className="file-input-container">
          <button className="btn btn-info btn-sm" title="Upload a map image file">Upload Map</button>
          <input type="file" id="map-file-input" className="file-input" accept="image/*" />
        </div>
        <button id="open-library-btn" className="btn btn-secondary btn-sm" title="Open saved map library">Map Library</button>
        <button id="screenshot-btn" className="btn btn-success btn-sm" title="Download map as PNG image">Download Image</button>
      </div>

      {/* Header / settings panels */}
      <div className="header container-fluid" id="header-content">
        <div className="title-bar">
          <h1>HexPlora - Hex Map Viewer</h1>
          <div className="header-info"></div>
        </div>
        <div className="controls-section">
          <div className="controls" id="grid-settings-panel">
            <h2>Grid Settings</h2>
            <div className="control-group">
              <label htmlFor="hex-size">Hex Size (px)</label>
              <input type="number" className="form-control form-control-sm" id="hex-size" min="10" max="300" defaultValue="40" />
            </div>
            <div className="control-group">
              <label htmlFor="offset-x">Grid X Offset (px)</label>
              <input type="number" className="form-control form-control-sm" id="offset-x" min="-1000" max="1000" defaultValue="0" />
            </div>
            <div className="control-group">
              <label htmlFor="offset-y">Grid Y Offset (px)</label>
              <input type="number" className="form-control form-control-sm" id="offset-y" min="-1000" max="1000" defaultValue="0" />
            </div>
            <div className="control-group">
              <label htmlFor="columns">Columns</label>
              <input type="number" className="form-control form-control-sm" id="columns" min="1" max="200" defaultValue="20" />
            </div>
            <div className="control-group">
              <label htmlFor="rows">Rows</label>
              <input type="number" className="form-control form-control-sm" id="rows" min="1" max="200" defaultValue="15" />
            </div>
            <div className="control-group">
              <label htmlFor="orientation">Grid Orientation</label>
              <select id="orientation" className="form-select form-select-sm" title="Choose pointy-top or flat-top grid">
                <option value="pointy">Pointy-Top</option>
                <option value="flat">Flat-Top</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="map-scale">Map Scale (%)</label>
              <input type="number" className="form-control form-control-sm" id="map-scale" min="10" max="500" defaultValue="100" title="Visual scale of the map image itself" />
            </div>
          </div>

          <div className="controls" id="appearance-settings-panel">
            <h2>Appearance</h2>
            <div className="control-group">
              <label htmlFor="fog-color">Fog Color</label>
              <input type="color" className="form-control form-control-color form-control-sm" id="fog-color" defaultValue="#225522" />
            </div>
            <div className="control-group">
              <label htmlFor="fog-opacity">Fog Opacity</label>
              <input type="range" className="form-range" id="fog-opacity" min="0" max="1" step="0.05" defaultValue="0.85" />
            </div>
            <div className="control-group">
              <label htmlFor="grid-color">Grid Line Color</label>
              <input type="color" className="form-control form-control-color form-control-sm" id="grid-color" defaultValue="#FFFFFF" />
            </div>
            <div className="control-group">
              <label htmlFor="grid-thickness">Grid Line Thickness</label>
              <input type="range" className="form-range" id="grid-thickness" min="0.1" max="5" step="0.1" defaultValue="1" />
            </div>
          </div>
        </div>
      </div>

      <div className="header-toggle position-fixed top-0 end-0 m-2">
        <button id="toggle-header-btn" className="btn btn-primary btn-sm">
          <i className="bi bi-caret-up-fill"></i>
        </button>
      </div>

      {/* Map canvas container */}
      <div className="map-container" id="map-container">
        <canvas id="map-layer" className="map-layer"></canvas>
        <canvas id="grid-layer" className="map-layer"></canvas>
        <canvas id="token-layer" className="map-layer"></canvas>
        <div className="loading" id="loading">Loading map...</div>
        <div id="token-tooltip" className="token-tooltip"></div>
      </div>

      {/* Info bar */}
      <div id="info-bar">
        <span id="zoom-display">Zoom: 100%</span>
        <span id="coord-display">Hex: ---</span>
        <div id="status-indicator"></div>
        <button id="undo-btn" className="btn btn-secondary btn-sm" title="Undo (Ctrl+Z)" disabled>Undo</button>
        <button id="redo-btn" className="btn btn-secondary btn-sm" title="Redo (Ctrl+Y)" disabled>Redo</button>
        <button id="help-btn" className="btn btn-outline-light btn-sm help-btn" title="Keyboard shortcuts (?)">?</button>
      </div>

      {/* Support bar */}
      <div id="support-bar">
        <a href="https://discord.gg/emVv2dNvs9" target="_blank" rel="noopener" title="Join us on Discord">
          <i className="bi bi-discord icon"></i>
        </a>
        <a href="https://www.patreon.com/altershell" target="_blank" rel="noopener" title="Support us on Patreon">
          <i className="bi bi-p-square-fill icon"></i>
        </a>
        <a href="https://coff.ee/beardedgm" target="_blank" rel="noopener" title="Buy me a coffee">
          <i className="bi bi-cup-hot-fill icon"></i>
        </a>
      </div>

      <div id="debug-info"></div>

      {/* Token label modal */}
      <div id="token-label-modal" className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Token Label</h2>
            <span className="close" id="token-label-modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <select id="token-icon-select" className="form-select mb-2">
              <option value="">-- None --</option>
              <option value="star_rate">Star</option>
              <option value="home">Home</option>
              <option value="flag">Flag</option>
              <option value="check">Check</option>
              <option value="close">Complete</option>
              <option value="location_on">Location</option>
              <option value="bolt">Bolt</option>
              <option value="landslide">Rock</option>
              <option value="skull">Skull</option>
              <option value="exclamation">Exclamation</option>
              <option value="question_mark">Question</option>
              <option value="sword">Sword</option>
              <option value="shield">Shield</option>
              <option value="castle">Castle</option>
              <option value="fort">Fort</option>
              <option value="holiday_village">Village</option>
              <option value="grass">Grass</option>
              <option value="groups_3">Group</option>
              <option value="person">Person</option>
              <option value="timer_1">1</option>
              <option value="timer_2">2</option>
              <option value="timer_3">3</option>
              <option value="timer_4">4</option>
              <option value="timer_5">5</option>
              <option value="timer_6">6</option>
            </select>
            <input type="text" id="token-label-input" className="form-control mb-2" placeholder="Enter label (optional)" />
            <label htmlFor="token-color" className="form-label">Token Color</label>
            <input type="color" className="form-control form-control-color form-control-sm mb-2" id="token-color" defaultValue="#FF0000" />
            <textarea id="token-notes-input" className="form-control" rows="3" placeholder="Enter notes (optional)"></textarea>
          </div>
          <div className="modal-footer">
            <button id="token-label-confirm" className="btn btn-primary btn-sm">Add Token</button>
            <button id="token-label-cancel" className="btn btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      </div>

      {/* Library modal */}
      <div id="library-modal" className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Map Library</h2>
            <span className="close" id="library-modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <ul id="library-list" className="list-unstyled"></ul>
            <div id="storage-info"></div>
            <div className="file-input-container mt-2">
              <button className="btn btn-success btn-sm">Import Map File</button>
              <input type="file" id="import-map-file" className="file-input" accept=".json" />
            </div>
          </div>
          <div className="modal-footer">
            <button id="library-modal-close-btn" className="btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      </div>

      {/* Help / keyboard shortcuts modal */}
      <div id="help-modal" className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Keyboard Shortcuts</h2>
            <span className="close" id="help-modal-close">&times;</span>
          </div>
          <div className="modal-body">
            <table className="help-shortcuts-table">
              <tbody>
                <tr><td className="help-key">Ctrl/Cmd + M</td><td>Toggle Reveal / Hide mode</td></tr>
                <tr><td className="help-key">Ctrl/Cmd + T</td><td>Toggle Add Token mode</td></tr>
                <tr><td className="help-key">Ctrl/Cmd + Z</td><td>Undo</td></tr>
                <tr><td className="help-key">Ctrl/Cmd + Shift + Z</td><td>Redo</td></tr>
                <tr><td className="help-key">Ctrl/Cmd + Y</td><td>Redo</td></tr>
                <tr><td className="help-key">Delete / Backspace</td><td>Remove selected token</td></tr>
                <tr><td className="help-key">Escape</td><td>Cancel / deselect</td></tr>
                <tr><td className="help-key">Arrow Keys</td><td>Pan map</td></tr>
                <tr><td className="help-key">Shift + Arrow Keys</td><td>Pan map (fast)</td></tr>
                <tr><td className="help-key">+ / =</td><td>Zoom in</td></tr>
                <tr><td className="help-key">-</td><td>Zoom out</td></tr>
                <tr><td className="help-key">?</td><td>Toggle this help</td></tr>
              </tbody>
            </table>
            <div className="help-section-title">Mouse</div>
            <table className="help-shortcuts-table">
              <tbody>
                <tr><td className="help-key">Left Click</td><td>Reveal/hide hex, select token</td></tr>
                <tr><td className="help-key">Double Click</td><td>Edit token</td></tr>
                <tr><td className="help-key">Right Click / Middle Click</td><td>Pan map</td></tr>
                <tr><td className="help-key">Ctrl/Cmd + Left Click</td><td>Pan map</td></tr>
                <tr><td className="help-key">Scroll Wheel</td><td>Zoom in / out</td></tr>
              </tbody>
            </table>
            <div className="help-section-title">Touch</div>
            <table className="help-shortcuts-table">
              <tbody>
                <tr><td className="help-key">Tap</td><td>Reveal/hide hex, select token</td></tr>
                <tr><td className="help-key">Double Tap</td><td>Edit token</td></tr>
                <tr><td className="help-key">One Finger Drag</td><td>Pan map / drag token</td></tr>
                <tr><td className="help-key">Pinch</td><td>Zoom in / out</td></tr>
              </tbody>
            </table>
          </div>
          <div className="modal-footer">
            <button id="help-modal-close-btn" className="btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      </div>
    </>
  );
}
