import { store } from '../state/index.js';
import { generateHexGrid, rebuildTokenIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { saveState } from './localStorage.js';

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
        settings: {
            hexSize: store.get('hexSize'),
            offsetX: store.get('offsetX'),
            offsetY: store.get('offsetY'),
            columnCount: store.get('columnCount'),
            rowCount: store.get('rowCount'),
            orientation: store.get('orientation'),
            mapScale: store.get('mapScale'),
            fogColor: store.get('fogColor'),
            fogOpacity: store.get('fogOpacity'),
            gridColor: store.get('gridColor'),
            gridThickness: store.get('gridThickness'),
            tokenColor: store.get('tokenColor'),
        },
        view: {
            zoomLevel: store.get('zoomLevel'),
            panX: store.get('panX'),
            panY: store.get('panY'),
        },
        tokens: store.get('tokens'),
        revealedHexes: store.get('revealedHexes'),
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

        if (importData.settings) {
            store.update({
                hexSize: importData.settings.hexSize || store.get('hexSize'),
                offsetX: importData.settings.offsetX || store.get('offsetX'),
                offsetY: importData.settings.offsetY || store.get('offsetY'),
                columnCount: importData.settings.columnCount || store.get('columnCount'),
                rowCount: importData.settings.rowCount || store.get('rowCount'),
                orientation: importData.settings.orientation || store.get('orientation'),
                mapScale: importData.settings.mapScale || store.get('mapScale'),
                fogColor: importData.settings.fogColor || store.get('fogColor'),
                fogOpacity: importData.settings.fogOpacity || store.get('fogOpacity'),
                gridColor: importData.settings.gridColor || store.get('gridColor'),
                gridThickness: importData.settings.gridThickness || store.get('gridThickness'),
                tokenColor: importData.settings.tokenColor || store.get('tokenColor'),
            });
        }

        if (importData.view) {
            store.update({
                zoomLevel: importData.view.zoomLevel || 1,
                panX: importData.view.panX || 0,
                panY: importData.view.panY || 0,
            });
        }

        store.set('revealedHexes', importData.revealedHexes);

        if (importData.tokens) {
            const tokens = importData.tokens.map((t, idx) => ({
                x: t.x,
                y: t.y,
                color: t.color,
                label: t.label || '',
                icon: t.icon || '',
                notes: t.notes || '',
                zIndex: typeof t.zIndex === 'number' ? t.zIndex : idx + 1,
            }));
            store.set('tokens', tokens);
            store.set('nextZIndex', tokens.reduce((m, t) => Math.max(m, t.zIndex), 0) + 1);
        }

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

    if (importData.settings) {
        store.update({
            hexSize: importData.settings.hexSize || 40,
            offsetX: importData.settings.offsetX || 0,
            offsetY: importData.settings.offsetY || 0,
            columnCount: importData.settings.columnCount || 20,
            rowCount: importData.settings.rowCount || 15,
            orientation: ['pointy', 'flat'].includes(importData.settings.orientation) ? importData.settings.orientation : 'pointy',
            mapScale: importData.settings.mapScale || 100,
            fogColor: importData.settings.fogColor || store.get('fogColor'),
            fogOpacity: importData.settings.fogOpacity ?? 0.85,
            gridColor: importData.settings.gridColor || store.get('gridColor'),
            gridThickness: importData.settings.gridThickness || 1,
            tokenColor: importData.settings.tokenColor || store.get('tokenColor'),
        });
    }

    if (importData.view) {
        store.update({
            zoomLevel: importData.view.zoomLevel || 1,
            panX: importData.view.panX || 0,
            panY: importData.view.panY || 0,
        });
    }

    store.set('revealedHexes', importData.revealedHexes || {});

    if (importData.tokens) {
        const tokens = importData.tokens.map((t, idx) => ({
            x: t.x,
            y: t.y,
            color: t.color,
            label: t.label || '',
            icon: t.icon || '',
            notes: t.notes || '',
            zIndex: typeof t.zIndex === 'number' ? t.zIndex : idx + 1,
        }));
        store.set('tokens', tokens);
        store.set('nextZIndex', tokens.reduce((m, t) => Math.max(m, t.zIndex), 0) + 1);
    } else {
        store.set('tokens', []);
        store.set('nextZIndex', 1);
    }

    rebuildTokenIndex();
    generateHexGrid();
    requestRedraw();
}
