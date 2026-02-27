import { store } from './index.js';
import { rebuildTokenIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { saveState } from '../persistence/localStorage.js';

let undoStack = [];
let redoStack = [];

export function initHistory() {
    undoStack = [];
    redoStack = [];
}

function snapshotState() {
    return {
        revealedHexes: JSON.parse(JSON.stringify(store.get('revealedHexes'))),
        tokens: JSON.parse(JSON.stringify(store.get('tokens'))),
        zoomLevel: store.get('zoomLevel'),
        panX: store.get('panX'),
        panY: store.get('panY'),
    };
}

function restoreSnapshot(snap) {
    store.set('revealedHexes', JSON.parse(JSON.stringify(snap.revealedHexes)));
    store.set('tokens', JSON.parse(JSON.stringify(snap.tokens)));
    rebuildTokenIndex();
    store.set('zoomLevel', snap.zoomLevel);
    store.set('panX', snap.panX);
    store.set('panY', snap.panY);

    const hexes = store.get('hexes');
    const revealedHexes = store.get('revealedHexes');
    for (const hex of hexes) {
        hex.revealed = !!revealedHexes[hex.id];
    }

    saveState();
    requestRedraw();
}

export function pushHistory() {
    undoStack.push(snapshotState());
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

export function undo() {
    if (undoStack.length <= 1) return;
    const current = undoStack.pop();
    redoStack.push(current);
    if (redoStack.length > 100) redoStack.shift();
    const previous = undoStack[undoStack.length - 1];
    restoreSnapshot(previous);
    updateUndoRedoButtons();
}

export function redo() {
    if (redoStack.length === 0) return;
    const redoState = redoStack.pop();
    undoStack.push(redoState);
    if (undoStack.length > 100) undoStack.shift();
    restoreSnapshot(redoState);
    updateUndoRedoButtons();
}

export function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}
