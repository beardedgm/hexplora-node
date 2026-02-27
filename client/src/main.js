import './style.css';

import { store } from './state/index.js';
import { getEl, addListener, cleanupEventListeners } from './util/dom.js';
import { debounce } from './util/debounce.js';

// UI setup
import { setupStatus } from './ui/status.js';
import { setupDebug, log } from './ui/debug.js';
import { setupTooltip } from './ui/tooltip.js';
import { setupToolbar, toggleMode, toggleAddTokenMode } from './ui/toolbar.js';
import { setupModals } from './ui/modals.js';
import { setupInfoBar } from './ui/infoBar.js';
import { setupInputFields, updateInputFields } from './ui/inputFields.js';

// Canvas
import { setupRenderer, requestRedraw, startRenderLoop, stopRenderLoop, handleVisibilityChange, drawMap, getCanvases } from './canvas/renderer.js';
import { downloadMapImage } from './canvas/screenshot.js';

// Input
import { setupPanZoom, resetView } from './input/panZoom.js';
import { setupMouseHandlers } from './input/mouse.js';
import { setupTouchHandlers } from './input/touch.js';
import { setupKeyboardHandlers } from './input/keyboard.js';

// Tokens
import { setupTokenModal } from './tokens/tokenModal.js';

// State
import { initHistory, updateUndoRedoButtons } from './state/history.js';

// Persistence
import { loadSavedState } from './persistence/localStorage.js';
import { handleExport, handleImport } from './persistence/importExport.js';
import { loadLastMap, loadMap, handleMapUpload, handleImportMap, showLibrary } from './persistence/library.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Grab required DOM elements
    const mapCanvas = getEl('map-layer', true);
    const gridCanvas = getEl('grid-layer', true);
    const tokenCanvas = getEl('token-layer', true);
    const mapContainer = getEl('map-container', true);
    const canvas = tokenCanvas; // topmost canvas handles interaction

    // Initialize UI modules
    setupStatus();
    setupDebug();
    setupTooltip(mapContainer);

    // Initialize renderer
    setupRenderer({ map: mapCanvas, grid: gridCanvas, token: tokenCanvas });

    // Load persisted state into the store
    loadSavedState();
    updateInputFields();

    // Initialize subsystems
    setupPanZoom(canvas, mapContainer);
    setupMouseHandlers(canvas, mapContainer);
    setupTouchHandlers(canvas);
    setupToolbar(mapContainer);
    setupTokenModal({ toggleAddTokenMode });
    setupModals();
    setupInfoBar();
    setupInputFields();
    initHistory();

    // Keyboard shortcuts
    const importFile = getEl('import-file');
    setupKeyboardHandlers({
        handleExport,
        importFile,
        toggleMode,
        toggleAddTokenMode,
    });

    // File handlers
    if (importFile) addListener(importFile, 'change', handleImport);
    const mapFileInput = getEl('map-file-input');
    if (mapFileInput) addListener(mapFileInput, 'change', handleMapUpload);
    const importMapFile = getEl('import-map-file');
    if (importMapFile) addListener(importMapFile, 'change', handleImportMap);

    // Button handlers
    const exportBtn = getEl('export-btn');
    if (exportBtn) addListener(exportBtn, 'click', handleExport);
    const openLibraryBtn = getEl('open-library-btn');
    if (openLibraryBtn) addListener(openLibraryBtn, 'click', showLibrary);
    const screenshotBtn = getEl('screenshot-btn');
    if (screenshotBtn) {
        addListener(screenshotBtn, 'click', () => {
            const canvases = getCanvases();
            downloadMapImage(canvases.mapCanvas, canvases.gridCanvas, canvases.tokenCanvas, drawMap);
        });
    }
    const resetViewBtn = getEl('reset-view-btn');
    if (resetViewBtn) addListener(resetViewBtn, 'click', resetView);

    // Window resize
    addListener(window, 'resize', debounce(() => requestRedraw(), 150));

    // Visibility change
    addListener(document, 'visibilitychange', handleVisibilityChange);

    // Cleanup handlers
    addListener(window, 'pagehide', cleanup);
    addListener(window, 'beforeunload', cleanup);

    // Load map
    const loaded = await loadLastMap();
    if (!loaded) {
        loadMap();
    }

    // Wait for Material Symbols font
    if (document.fonts && document.fonts.ready) {
        try {
            await document.fonts.ready;
        } catch (err) {
            console.error('Font loading error:', err);
        }
        requestRedraw();
    }

    updateUndoRedoButtons();
    startRenderLoop();
    log('App initialized');
});

function cleanup() {
    stopRenderLoop();
    cleanupEventListeners();
}
