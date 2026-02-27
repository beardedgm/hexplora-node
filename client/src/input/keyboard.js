import { store } from '../state/index.js';
import { ZOOM_MIN, ZOOM_MAX } from '../state/defaults.js';
import { addListener } from '../util/dom.js';
import { requestRedraw, getCanvases } from '../canvas/renderer.js';
import { removeTokenFromIndex } from '../hex/math.js';
import { showStatus } from '../ui/status.js';
import { pushHistory } from '../state/history.js';
import { undo, redo } from '../state/history.js';
import { saveState } from '../persistence/localStorage.js';

const PAN_STEP = 50;
const PAN_STEP_FAST = 150;

let toggleModeFn = null;
let toggleAddTokenModeFn = null;

export function setupKeyboardHandlers(opts) {
    toggleModeFn = opts.toggleMode;
    toggleAddTokenModeFn = opts.toggleAddTokenMode;

    addListener(document, 'keydown', handleKeyDown);
}

function isModKey(event) {
    return event.ctrlKey || event.metaKey;
}

function handleKeyDown(event) {
    // Don't intercept when typing in inputs (except for global shortcuts)
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    // --- Modifier shortcuts (work even when typing, since they're Ctrl/Cmd combos) ---

    // Ctrl/Cmd+Shift+Z — Redo (must come before Ctrl+Z check)
    if (isModKey(event) && event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        redo();
        return;
    }

    if (isModKey(event) && event.key === 'm') {
        event.preventDefault();
        if (toggleModeFn) toggleModeFn();
        return;
    }

    if (isModKey(event) && event.key === 't') {
        event.preventDefault();
        if (toggleAddTokenModeFn) toggleAddTokenModeFn();
        return;
    }

    if (isModKey(event) && event.key === 'z') {
        event.preventDefault();
        undo();
        return;
    }

    if (isModKey(event) && event.key === 'y') {
        event.preventDefault();
        redo();
        return;
    }

    // --- Non-modifier shortcuts (skip when typing in inputs) ---
    if (isTyping) return;

    // Escape — cancel/deselect (also closes help modal)
    if (event.key === 'Escape') {
        const helpModal = document.getElementById('help-modal');
        if (helpModal && helpModal.style.display === 'block') {
            helpModal.style.display = 'none';
            return;
        }
        if (store.get('isAddingToken')) {
            if (toggleAddTokenModeFn) toggleAddTokenModeFn();
        } else if (store.get('selectedTokenIndex') !== -1) {
            store.set('selectedTokenIndex', -1);
            requestRedraw();
        }
        return;
    }

    // Delete / Backspace — remove selected token
    if ((event.key === 'Delete' || event.key === 'Backspace') && store.get('selectedTokenIndex') !== -1) {
        event.preventDefault();
        const tokens = store.get('tokens');
        const selectedTokenIndex = store.get('selectedTokenIndex');
        if (selectedTokenIndex < 0 || selectedTokenIndex >= tokens.length) {
            store.set('selectedTokenIndex', -1);
            requestRedraw();
            return;
        }
        const removed = tokens[selectedTokenIndex];
        removeTokenFromIndex(removed);
        tokens.splice(selectedTokenIndex, 1);
        for (let i = selectedTokenIndex; i < tokens.length; i++) {
            tokens[i]._index = i;
        }
        store.set('selectedTokenIndex', -1);
        requestRedraw();
        saveState();
        pushHistory();
        showStatus('Token deleted', 'info');
        return;
    }

    // Arrow keys — pan map
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.shiftKey ? PAN_STEP_FAST : PAN_STEP;
        let panX = store.get('panX');
        let panY = store.get('panY');

        if (event.key === 'ArrowUp') panY += step;
        if (event.key === 'ArrowDown') panY -= step;
        if (event.key === 'ArrowLeft') panX += step;
        if (event.key === 'ArrowRight') panX -= step;

        store.update({ panX, panY });
        requestRedraw();
        return;
    }

    // +/= key — zoom in, - key — zoom out (centered on canvas)
    if (event.key === '+' || event.key === '=' || event.key === '-') {
        event.preventDefault();
        const zoomLevel = store.get('zoomLevel');
        const panX = store.get('panX');
        const panY = store.get('panY');
        const zoomFactor = (event.key === '-') ? 0.9 : 1.1;
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel * zoomFactor));

        // Zoom centered on canvas midpoint
        const { tokenCanvas } = getCanvases();
        if (tokenCanvas) {
            const gridPad = store.get('gridPadding') || 0;
            const centerX = tokenCanvas.width / 2 - gridPad;
            const centerY = tokenCanvas.height / 2 - gridPad;

            const worldBeforeX = (centerX - panX) / zoomLevel;
            const worldBeforeY = (centerY - panY) / zoomLevel;
            const worldAfterX = (centerX - panX) / newZoom;
            const worldAfterY = (centerY - panY) / newZoom;

            store.update({
                panX: panX - (worldBeforeX - worldAfterX) * newZoom,
                panY: panY - (worldBeforeY - worldAfterY) * newZoom,
                zoomLevel: newZoom,
            });
        } else {
            store.set('zoomLevel', newZoom);
        }

        requestRedraw();
        return;
    }

    // ? key — toggle help modal
    if (event.key === '?') {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
        }
        return;
    }
}
