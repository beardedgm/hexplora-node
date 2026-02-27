import { store } from '../state/index.js';
import { generateHexGrid, rebuildTokenIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { applySettingsToStore, applyViewToStore, applyTokensToStore } from './serialization.js';

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
