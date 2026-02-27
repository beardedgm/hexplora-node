import { store } from '../state/index.js';
import { generateHexGrid, rebuildTokenIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { saveState } from './localStorage.js';
import { getFullStateFromStore, applySettingsToStore, applyViewToStore, applyTokensToStore } from './serialization.js';

export function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export function handleExport() {
    const exportData = {
        version: 3,
        timestamp: new Date().toISOString(),
        ...getFullStateFromStore(),
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const exportJsonTextarea = document.getElementById('export-json');
    const exportModal = document.getElementById('export-modal');

    if (exportJsonTextarea) exportJsonTextarea.value = jsonData;
    if (exportModal) exportModal.style.display = 'block';

    log('Exported map state');
    showStatus('State exported', 'success');
}

export async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!importData.settings || !importData.revealedHexes) {
            throw new Error('Invalid import file format');
        }

        applySettingsToStore(importData.settings);
        applyViewToStore(importData.view);
        store.set('revealedHexes', importData.revealedHexes);
        applyTokensToStore(importData.tokens);

        generateHexGrid();
        requestRedraw();
        saveState();

        log('Imported map state');
        showStatus('Map state imported successfully!', 'success');
    } catch (error) {
        console.error('Error importing file:', error);
        log('Error importing file: ' + error.message);
        showStatus('Error importing file. Please check the file format.', 'error');
    } finally {
        event.target.value = null;
    }
}

export function applyState(importData) {
    if (!importData) return;

    applySettingsToStore(importData.settings);
    applyViewToStore(importData.view);
    store.set('revealedHexes', importData.revealedHexes || {});
    applyTokensToStore(importData.tokens);

    rebuildTokenIndex();
    generateHexGrid();
    requestRedraw();
}
