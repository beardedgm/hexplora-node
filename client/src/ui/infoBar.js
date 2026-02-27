import { store } from '../state/index.js';
import { addListener } from '../util/dom.js';
import { undo, redo } from '../state/history.js';

export function setupInfoBar() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) addListener(undoBtn, 'click', undo);
    if (redoBtn) addListener(redoBtn, 'click', redo);

    // Subscribe to zoom changes to update display
    store.on('zoomLevel', (val) => {
        const el = document.getElementById('zoom-display');
        if (el) el.textContent = `Zoom: ${Math.round(val * 100)}%`;
    });
}
