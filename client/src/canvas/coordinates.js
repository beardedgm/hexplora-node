import { store } from '../state/index.js';

export function getCanvasCoords(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const gridPad = store.get('gridPadding') || 0;

    return {
        x: (event.clientX - rect.left) * scaleX - gridPad,
        y: (event.clientY - rect.top) * scaleY - gridPad,
    };
}

export function screenToWorld(x, y, panX, panY, zoomLevel) {
    return {
        x: (x - panX) / zoomLevel,
        y: (y - panY) / zoomLevel,
    };
}
