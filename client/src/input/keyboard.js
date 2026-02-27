import { store } from '../state/index.js';
import { addListener } from '../util/dom.js';
import { requestRedraw } from '../canvas/renderer.js';
import { removeTokenFromIndex } from '../hex/math.js';
import { showStatus } from '../ui/status.js';
import { pushHistory } from '../state/history.js';
import { undo, redo } from '../state/history.js';
import { saveState } from '../persistence/localStorage.js';

let handleExportFn = null;
let importFileEl = null;
let toggleModeFn = null;
let toggleAddTokenModeFn = null;

export function setupKeyboardHandlers(opts) {
    handleExportFn = opts.handleExport;
    importFileEl = opts.importFile;
    toggleModeFn = opts.toggleMode;
    toggleAddTokenModeFn = opts.toggleAddTokenMode;

    addListener(document, 'keydown', handleKeyDown);
}

function handleKeyDown(event) {
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        if (handleExportFn) handleExportFn();
    }

    if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        if (importFileEl) importFileEl.click();
    }

    if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        if (toggleModeFn) toggleModeFn();
    }

    if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        if (toggleAddTokenModeFn) toggleAddTokenModeFn();
    }

    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    }

    if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
    }

    if (event.key === 'Escape') {
        if (store.get('isAddingToken')) {
            if (toggleAddTokenModeFn) toggleAddTokenModeFn();
        } else if (store.get('selectedTokenIndex') !== -1) {
            store.set('selectedTokenIndex', -1);
            requestRedraw();
        }
    }

    if (event.key === 'Delete' && store.get('selectedTokenIndex') !== -1) {
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
    }
}
