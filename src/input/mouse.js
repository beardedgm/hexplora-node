import { store } from '../state/index.js';
import { getCanvasCoords } from '../canvas/coordinates.js';
import { findHexAtPosition, findTokenAtPosition } from '../hex/math.js';
import { revealHex, hideHex } from '../hex/fog.js';
import { requestRedraw } from '../canvas/renderer.js';
import { addListener } from '../util/dom.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { hideTooltip, showTooltipAt, getHoveredTokenIndex, setHoveredTokenIndex, getTooltipTimer, setTooltipTimer, getTokenTooltip, getMapContainer } from '../ui/tooltip.js';
import { handleZoom, startPanning, stopPanning } from './panZoom.js';
import { pushHistory } from '../state/history.js';
import { saveState } from '../persistence/localStorage.js';
import { removeTokenFromIndex } from '../hex/math.js';
import { addTokenAtPosition, handleCanvasDoubleClick } from '../tokens/tokenModal.js';

let canvas = null;
let mapContainer = null;

export function setupMouseHandlers(canvasEl, containerEl) {
    canvas = canvasEl;
    mapContainer = containerEl;

    addListener(canvas, 'click', handleCanvasClick);
    addListener(canvas, 'wheel', handleZoom);
    addListener(canvas, 'mousedown', startPanning);
    addListener(canvas, 'mousemove', handleMouseMove);
    addListener(canvas, 'mouseup', stopPanning);
    addListener(canvas, 'mouseleave', stopPanning);
    addListener(mapContainer, 'mouseleave', stopPanning);
    addListener(document, 'mouseup', stopPanning);
    addListener(document, 'mouseleave', stopPanning);
    addListener(canvas, 'dblclick', (e) => handleCanvasDoubleClick(e, canvas));
    addListener(canvas, 'contextmenu', (e) => e.preventDefault());
}

function handleCanvasClick(event) {
    if (!store.get('mapImage')) return;
    hideTooltip();

    const { x, y } = getCanvasCoords(event, canvas);
    log(`Click at: ${Math.round(x)}, ${Math.round(y)}`);

    // Token add mode
    if (store.get('isAddingToken')) {
        addTokenAtPosition(x, y, canvas);
        return;
    }

    // Token remove mode
    if (store.get('isRemovingToken')) {
        const idx = findTokenAtPosition(x, y);
        if (idx !== -1) {
            const tokens = store.get('tokens');
            const removed = tokens[idx];
            removeTokenFromIndex(removed);
            tokens.splice(idx, 1);
            for (let i = idx; i < tokens.length; i++) {
                tokens[i]._index = i;
            }
            store.set('selectedTokenIndex', -1);
            saveState();
            requestRedraw();
            pushHistory();
            showStatus('Token removed', 'success');
        } else {
            showStatus('No token at that location', 'warning');
        }
        return;
    }

    // Check if a token was clicked (selection handled in mousedown)
    const tokenIdx = findTokenAtPosition(x, y);
    if (tokenIdx !== -1) return;

    // Deselect token if clicking elsewhere
    if (store.get('selectedTokenIndex') !== -1) {
        store.set('selectedTokenIndex', -1);
        requestRedraw();
    }

    // Find which hex was clicked
    const revealMode = store.get('revealMode');
    const hex = findHexAtPosition(x, y);
    if (hex && !((revealMode && hex.revealed) || (!revealMode && !hex.revealed))) {
        if (revealMode) {
            revealHex(hex);
        } else {
            hideHex(hex);
        }
        saveState();
        requestRedraw();
        pushHistory();
    } else {
        log(`No ${revealMode ? 'unrevealed' : 'revealed'} hex found at click location`);
    }
}

export function handleMouseMove(event) {
    if (!store.get('mapImage')) return;

    const { x, y } = getCanvasCoords(event, canvas);

    // Handle panning
    if (store.get('isPanning')) {
        const lastMouseX = store.get('lastMouseX');
        const lastMouseY = store.get('lastMouseY');
        store.update({
            panX: store.get('panX') + (event.clientX - lastMouseX),
            panY: store.get('panY') + (event.clientY - lastMouseY),
            lastMouseX: event.clientX,
            lastMouseY: event.clientY,
        });
        requestRedraw();
        return;
    }

    // Handle token dragging
    const selectedTokenIndex = store.get('selectedTokenIndex');
    const tokens = store.get('tokens');
    if (store.get('isDraggingToken') && selectedTokenIndex !== -1 && selectedTokenIndex < tokens.length) {
        const panX = store.get('panX');
        const panY = store.get('panY');
        const zoomLevel = store.get('zoomLevel');
        const worldX = (x - panX) / zoomLevel;
        const worldY = (y - panY) / zoomLevel;
        tokens[selectedTokenIndex].x = worldX;
        tokens[selectedTokenIndex].y = worldY;
        requestRedraw();
        return;
    }

    // Update coord display
    const hoveredHex = findHexAtPosition(x, y);
    const coordDisplay = document.getElementById('coord-display');
    if (coordDisplay) {
        coordDisplay.textContent = hoveredHex ? `Hex: ${hoveredHex.col},${hoveredHex.row}` : 'Hex: ---';
    }

    // Token hover/tooltip
    const isAddingToken = store.get('isAddingToken');
    const isRemovingToken = store.get('isRemovingToken');
    const tokenIdx = findTokenAtPosition(x, y);
    if (tokenIdx !== -1 && !isAddingToken && !isRemovingToken) {
        mapContainer.classList.add('token-hover');
        const hoveredTokenIndex = getHoveredTokenIndex();

        if (tokenIdx !== hoveredTokenIndex) {
            const timer = getTooltipTimer();
            if (timer) {
                clearTimeout(timer);
                setTooltipTimer(null);
            }
            hideTooltip();
            setHoveredTokenIndex(tokenIdx);
            if (tokens[tokenIdx].notes) {
                const notes = tokens[tokenIdx].notes;
                const newTimer = setTimeout(() => {
                    if (getHoveredTokenIndex() === tokenIdx) {
                        showTooltipAt(event.clientX, event.clientY, notes);
                        setTooltipTimer(null);
                    }
                }, 1000);
                setTooltipTimer(newTimer);
            }
        } else {
            const tooltip = getTokenTooltip();
            if (tooltip && tooltip.style.display === 'block') {
                const container = getMapContainer();
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${event.clientX - rect.left + 15}px`;
                tooltip.style.top = `${event.clientY - rect.top + 15}px`;
            }
        }
    } else {
        mapContainer.classList.remove('token-hover');
        hideTooltip();
    }
}
