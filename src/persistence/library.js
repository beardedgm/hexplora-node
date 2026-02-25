import { store } from '../state/index.js';
import { DEFAULT_MAP, MAX_LIBRARY_INFO_LENGTH } from '../state/defaults.js';
import * as db from './db.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { requestRedraw, resizeCanvases, showCanvases, hideCanvases } from '../canvas/renderer.js';
import { resetView } from '../input/panZoom.js';
import { applyState, blobToDataURL, dataURLToBlob } from './importExport.js';
import { pushHistory } from '../state/history.js';
import { saveState } from './localStorage.js';
import { generateHexGrid } from '../hex/math.js';

let isMapLoading = false;
let defaultMapAttempted = false;

export async function loadMapFromBlob(blobUrl, state) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'flex';
    hideCanvases();
    if (loadingElement) loadingElement.textContent = 'Loading map...';

    const img = new Image();
    const timeoutId = setTimeout(() => {
        if (loadingElement) loadingElement.textContent = 'Error loading map.';
        showStatus('Error loading map', 'error');
    }, 15000);

    return new Promise((resolve, reject) => {
        img.onload = function () {
            clearTimeout(timeoutId);
            store.set('mapImage', img);
            resizeCanvases(img.width, img.height);
            if (loadingElement) loadingElement.style.display = 'none';
            showCanvases();

            resetView();

            applyState(state);
            pushHistory();
            showStatus('Map loaded successfully!', 'success');
            resolve();
        };

        img.onerror = function () {
            clearTimeout(timeoutId);
            if (loadingElement) loadingElement.textContent = 'Error loading map.';
            showStatus('Error loading map', 'error');
            reject(new Error('Failed to load map image'));
        };

        img.src = blobUrl;
    });
}

export function loadMap(mapUrl) {
    if (isMapLoading) return;
    isMapLoading = true;

    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
        loadingElement.textContent = 'Loading map...';
    }
    hideCanvases();

    if (mapUrl && mapUrl !== DEFAULT_MAP) {
        defaultMapAttempted = false;
    }
    if (!mapUrl || mapUrl.trim() === '') {
        mapUrl = DEFAULT_MAP;
    }

    log(`Attempting to load map: ${mapUrl.substring(0, 50)}${mapUrl.length > 50 ? '...' : ''}`);

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    const timeoutId = setTimeout(() => {
        log('Image loading timed out');
        handleImageLoadError(new Error('Loading timed out'), mapUrl);
    }, 15000);

    img.onload = function () {
        clearTimeout(timeoutId);
        isMapLoading = false;
        log(`Map loaded successfully: ${img.width}x${img.height}`);
        defaultMapAttempted = false;

        store.set('mapImage', img);
        resizeCanvases(img.width, img.height);
        if (loadingElement) loadingElement.style.display = 'none';
        showCanvases();

        resetView();
        showStatus('Map loaded successfully!', 'success');

        generateHexGrid();
        requestRedraw();
        pushHistory();
    };

    img.onerror = function (error) {
        clearTimeout(timeoutId);
        handleImageLoadError(error, mapUrl);
    };

    img.src = mapUrl;

    function handleImageLoadError(error, failedUrl) {
        isMapLoading = false;
        console.error('Error loading map image:', error);
        log(`Error loading map: ${failedUrl.substring(0, 50)}${failedUrl.length > 50 ? '...' : ''}`);

        if (loadingElement) loadingElement.textContent = 'Error loading map. Please verify the URL and try again.';
        showStatus('Error loading map. Check the URL for typos or CORS issues.', 'error');

        if (failedUrl !== DEFAULT_MAP && !defaultMapAttempted) {
            defaultMapAttempted = true;
            log('Falling back to default map');
            setTimeout(() => loadMap(DEFAULT_MAP), 1000);
        } else {
            if (loadingElement) loadingElement.textContent = 'Critical error: Could not load any map. Please refresh the page.';
        }
    }
}

export async function loadLastMap() {
    try {
        const lastId = localStorage.getItem('currentMapId');
        if (!lastId) return false;
        const entry = await db.getMap(lastId);
        if (!entry) return false;
        store.update({
            currentMapId: entry.id,
            currentMapBlob: entry.blob,
            currentMapName: entry.name,
        });
        const url = URL.createObjectURL(entry.blob);
        try {
            await loadMapFromBlob(url, entry.state);
        } finally {
            URL.revokeObjectURL(url);
        }
        return true;
    } catch (error) {
        console.error('Error loading last map:', error);
        log('Error loading last map: ' + error.message);
        return false;
    }
}

export async function handleMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const name = prompt('Enter map name:', file.name);
    if (!name) {
        event.target.value = null;
        return;
    }

    const state = {
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

    let url;
    try {
        const id = await db.saveMap({ name, blob: file, state, updated: Date.now() });
        store.update({
            currentMapId: id,
            currentMapBlob: file,
            currentMapName: name,
        });
        localStorage.setItem('currentMapId', id);
        url = URL.createObjectURL(file);
        await loadMapFromBlob(url, state);
    } catch (err) {
        console.error('Map upload error:', err);
        showStatus('Error uploading map', 'error');
    } finally {
        if (url) URL.revokeObjectURL(url);
        event.target.value = null;
    }
}

export async function handleImportMap(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.name || !data.mapData || !data.state) throw new Error('Invalid map file');

        const blob = dataURLToBlob(data.mapData);
        await db.saveMap({ name: data.name, blob, state: data.state, updated: Date.now() });
        showStatus('Map imported', 'success');
        showLibrary();
    } catch (err) {
        console.error('Import map error:', err);
        showStatus('Error importing map', 'error');
    }
    event.target.value = null;
}

export async function showLibrary() {
    const maps = await db.getAllMaps();
    await updateStorageInfo();
    const libraryList = document.getElementById('library-list');
    const libraryModal = document.getElementById('library-modal');
    if (!libraryList) return;

    libraryList.innerHTML = '';
    maps.sort((a, b) => b.updated - a.updated);

    for (const m of maps) {
        const li = document.createElement('li');
        const info = document.createElement('span');
        const infoStr = `${m.name} - ${new Date(m.updated).toLocaleString()}`;
        const truncated = infoStr.length > MAX_LIBRARY_INFO_LENGTH
            ? infoStr.slice(0, MAX_LIBRARY_INFO_LENGTH) + '...'
            : infoStr;
        info.textContent = truncated;
        const actions = document.createElement('div');

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.className = 'btn btn-primary btn-sm';
        loadBtn.addEventListener('click', async () => {
            const url = URL.createObjectURL(m.blob);
            try {
                store.update({
                    currentMapId: m.id,
                    currentMapBlob: m.blob,
                    currentMapName: m.name,
                });
                localStorage.setItem('currentMapId', m.id);
                await loadMapFromBlob(url, m.state);
                if (libraryModal) libraryModal.style.display = 'none';
                await db.updateMap(m.id, {
                    name: m.name,
                    blob: m.blob,
                    state: m.state,
                    updated: Date.now(),
                });
            } finally {
                URL.revokeObjectURL(url);
            }
        });

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.className = 'btn btn-secondary btn-sm';
        renameBtn.addEventListener('click', async () => {
            const newName = prompt('Enter new name:', m.name);
            if (newName) {
                await db.renameMap(m.id, newName);
                if (store.get('currentMapId') === m.id) store.set('currentMapName', newName);
                showLibrary();
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Delete this map?')) {
                await db.deleteMap(m.id);
                if (store.get('currentMapId') === m.id) {
                    store.update({
                        currentMapId: null,
                        currentMapBlob: null,
                        currentMapName: '',
                    });
                    localStorage.removeItem('currentMapId');
                }
                showLibrary();
            }
        });

        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.className = 'btn btn-success btn-sm';
        exportBtn.addEventListener('click', async () => {
            try {
                const mapData = await blobToDataURL(m.blob);
                const exportObj = { name: m.name, state: m.state, mapData };
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
                const link = document.createElement('a');
                link.setAttribute('href', dataStr);
                const safeName = m.name.replace(/\s+/g, '_');
                link.setAttribute('download', safeName + '.json');
                document.body.appendChild(link);
                link.click();
                link.remove();
                showStatus('Map exported', 'success');
            } catch (err) {
                console.error('Export error:', err);
                showStatus('Error exporting map', 'error');
            }
        });

        actions.append(loadBtn, renameBtn, deleteBtn, exportBtn);
        li.append(info, actions);
        libraryList.appendChild(li);
    }
    if (libraryModal) libraryModal.style.display = 'block';
}

async function updateStorageInfo() {
    const storageInfo = document.getElementById('storage-info');
    if (!storageInfo || !navigator.storage || !navigator.storage.estimate) return;
    try {
        const { usage, quota } = await navigator.storage.estimate();
        const used = (usage / (1024 * 1024)).toFixed(1);
        const total = (quota / (1024 * 1024)).toFixed(1);
        storageInfo.textContent = `Storage used: ${used} MB of ${total} MB`;
    } catch (err) {
        console.error('Storage estimate error:', err);
    }
}
