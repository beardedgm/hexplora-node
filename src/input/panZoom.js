import { store } from '../state/index.js';
import { getCanvasCoords } from '../canvas/coordinates.js';
import { findTokenAtPosition } from '../hex/math.js';
import { updateTokenInIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { hideTooltip } from '../ui/tooltip.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { pushHistory } from '../state/history.js';
import { saveState } from '../persistence/localStorage.js';

let mapContainer = null;
let canvas = null;

export function setupPanZoom(canvasEl, containerEl) {
    canvas = canvasEl;
    mapContainer = containerEl;
}

export function handleZoom(event) {
    event.preventDefault();
    const { x: mouseX, y: mouseY } = getCanvasCoords(event, canvas);
    const zoomLevel = store.get('zoomLevel');
    const panX = store.get('panX');
    const panY = store.get('panY');

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));

    const currentMouseInWorldX = (mouseX - panX) / zoomLevel;
    const currentMouseInWorldY = (mouseY - panY) / zoomLevel;
    const newMouseInWorldX = (mouseX - panX) / newZoom;
    const newMouseInWorldY = (mouseY - panY) / newZoom;

    store.update({
        panX: panX - (currentMouseInWorldX - newMouseInWorldX) * newZoom,
        panY: panY - (currentMouseInWorldY - newMouseInWorldY) * newZoom,
        zoomLevel: newZoom,
    });

    requestRedraw();
    log(`Zoomed to ${(newZoom * 100).toFixed(0)}%`);
}

export function startPanning(event) {
    const { x, y } = getCanvasCoords(event, canvas);
    const tokenIdx = findTokenAtPosition(x, y);
    const isAddingToken = store.get('isAddingToken');
    const isRemovingToken = store.get('isRemovingToken');
    const tokens = store.get('tokens');

    // Handle token dragging with left mouse button
    if (event.button === 0 && tokenIdx !== -1 && !isAddingToken && !isRemovingToken) {
        store.set('selectedTokenIndex', tokenIdx);
        if (tokenIdx < 0 || tokenIdx >= tokens.length) {
            store.set('selectedTokenIndex', -1);
            return;
        }
        store.set('dragStartPos', { x: tokens[tokenIdx].x, y: tokens[tokenIdx].y });
        store.set('isDraggingToken', true);
        mapContainer.classList.add('token-dragging');
        requestRedraw();
        showStatus('Token selected (drag to move)', 'info');
        return;
    }

    // Right-click deselect
    if (event.button === 2 && store.get('selectedTokenIndex') !== -1) {
        store.set('selectedTokenIndex', -1);
        requestRedraw();
        event.preventDefault();
        return;
    }

    // Panning conditions
    const allowPanning = (
        (event.button === 1 && !isAddingToken && !isRemovingToken) ||
        (event.button === 2 && tokenIdx === -1 && !isAddingToken && !isRemovingToken) ||
        (event.button === 0 && (event.ctrlKey || event.metaKey) && tokenIdx === -1 && !isAddingToken && !isRemovingToken) ||
        (event.button === 0 && event.isTouch && tokenIdx === -1 && !isAddingToken && !isRemovingToken)
    );

    if (allowPanning) {
        store.update({
            isPanning: true,
            lastMouseX: event.clientX,
            lastMouseY: event.clientY,
        });
        mapContainer.classList.add('panning');
        hideTooltip();
        log('Started panning');
    }
}

export function stopPanning() {
    if (store.get('isPanning')) {
        store.set('isPanning', false);
        mapContainer.classList.remove('panning');
        log('Stopped panning');
    }

    hideTooltip();

    if (store.get('isDraggingToken')) {
        store.set('isDraggingToken', false);
        mapContainer.classList.remove('token-dragging');
        const dragStartPos = store.get('dragStartPos');
        const selectedTokenIndex = store.get('selectedTokenIndex');
        const tokens = store.get('tokens');
        if (dragStartPos && selectedTokenIndex !== -1 && selectedTokenIndex < tokens.length) {
            const token = tokens[selectedTokenIndex];
            updateTokenInIndex(token, dragStartPos);
            token.zIndex = store.get('nextZIndex');
            store.set('nextZIndex', store.get('nextZIndex') + 1);
        }
        store.set('dragStartPos', null);
        saveState();
        pushHistory();
        log('Stopped token dragging');
    }
}

export function resetView() {
    store.update({
        zoomLevel: 1,
        panX: 0,
        panY: 0,
        selectedTokenIndex: -1,
        isAddingToken: false,
        isRemovingToken: false,
    });

    mapContainer.classList.remove('token-add-mode');
    mapContainer.classList.remove('token-remove-mode');

    const addTokenBtn = document.getElementById('add-token-btn');
    const removeTokenBtn = document.getElementById('remove-token-btn');
    if (addTokenBtn) {
        addTokenBtn.textContent = 'Add Token';
        addTokenBtn.classList.remove('btn-warning');
        addTokenBtn.classList.add('btn-info');
    }
    if (removeTokenBtn) {
        removeTokenBtn.textContent = 'Remove Token';
        removeTokenBtn.classList.remove('btn-danger');
        removeTokenBtn.classList.add('btn-warning');
    }

    requestRedraw();
    log('View reset');
    showStatus('View has been reset', 'info');
    pushHistory();
}
