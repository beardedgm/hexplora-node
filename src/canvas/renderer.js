import { store } from '../state/index.js';
import { drawMapLayer } from './mapLayer.js';
import { drawGridLayer } from './gridLayer.js';
import { drawTokenLayer } from './tokenLayer.js';
import { log } from '../ui/debug.js';

let mapCanvas, gridCanvas, tokenCanvas;
let mapCtx, gridCtx, tokenCtx;
let frameId = null;

export function setupRenderer(canvases) {
    mapCanvas = canvases.map;
    gridCanvas = canvases.grid;
    tokenCanvas = canvases.token;
    mapCtx = mapCanvas.getContext('2d');
    gridCtx = gridCanvas.getContext('2d');
    tokenCtx = tokenCanvas.getContext('2d');
}

export function getCanvases() {
    return { mapCanvas, gridCanvas, tokenCanvas };
}

export function requestRedraw() {
    store.set('needsRedraw', true);
}

export function drawMap() {
    if (!mapCtx || !store.get('mapImage')) return;

    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');

    // Clear all layers
    [mapCtx, gridCtx, tokenCtx].forEach(c =>
        c.clearRect(0, 0, mapCanvas.width, mapCanvas.height),
    );

    // Apply pan/zoom transform
    [mapCtx, gridCtx, tokenCtx].forEach(c => {
        c.save();
        c.translate(panX, panY);
        c.scale(zoomLevel, zoomLevel);
    });

    // Draw each layer
    drawMapLayer(mapCtx);
    drawGridLayer(gridCtx, mapCanvas.width);
    drawTokenLayer(tokenCtx, mapCanvas.width);

    // Restore transform
    [mapCtx, gridCtx, tokenCtx].forEach(c => c.restore());

    log('Map redrawn');
}

function renderLoop() {
    if (store.get('needsRedraw')) {
        drawMap();
        store._state.needsRedraw = false; // Direct set to avoid triggering listeners
    }
    if (document.visibilityState === 'visible') {
        frameId = requestAnimationFrame(renderLoop);
    } else {
        frameId = null;
    }
}

export function startRenderLoop() {
    if (!frameId) {
        frameId = requestAnimationFrame(renderLoop);
    }
}

export function stopRenderLoop() {
    if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
    }
}

export function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        startRenderLoop();
    } else {
        stopRenderLoop();
    }
}

export function resizeCanvases(width, height) {
    [mapCanvas, gridCanvas, tokenCanvas].forEach(c => {
        c.width = width;
        c.height = height;
        c.style.width = width + 'px';
        c.style.height = height + 'px';
    });
}

export function showCanvases() {
    [mapCanvas, gridCanvas, tokenCanvas].forEach(c => {
        c.style.display = 'block';
    });
}

export function hideCanvases() {
    [mapCanvas, gridCanvas, tokenCanvas].forEach(c => {
        c.style.display = 'none';
    });
}
