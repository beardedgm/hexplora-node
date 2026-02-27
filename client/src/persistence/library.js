import { store } from '../state/index.js';
import { DEFAULT_MAP, MAX_LIBRARY_INFO_LENGTH } from '../state/defaults.js';
import * as mapsApi from '../services/maps.js';
import * as localDb from './db.js';
import useAuthStore from '../store/useAuthStore.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { requestRedraw, resizeCanvases, showCanvases, hideCanvases } from '../canvas/renderer.js';
import { resetView } from '../input/panZoom.js';
import { applyState, blobToDataURL } from './importExport.js';
import { initHistory, pushHistory } from '../state/history.js';
import { saveState, flushSave } from './localStorage.js';
import { getFullStateFromStore } from './serialization.js';
import { generateHexGrid } from '../hex/math.js';

const TOKEN_KEY = 'hexplora_token';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
}

function isPatron() {
    const user = useAuthStore.getState().user;
    return user?.isPatron === true;
}

function isCloudEnabled() {
    return isAuthenticated() && isPatron();
}

/** MongoDB ObjectIds are 24-char hex; local UUIDs have dashes */
function isCloudMapId(id) {
    return id && /^[a-f0-9]{24}$/.test(id);
}

let isMapLoading = false;
let defaultMapAttempted = false;

/**
 * Convert a File/Blob to a base64 data URL string
 */
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Load a map from its image data URL and apply state.
 * Works with both data URLs and object URLs.
 */
export async function loadMapFromBlob(imageUrl, state) {
    initHistory(); // Clear undo/redo from previous map

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
            applyState(state);  // Apply state first so hexSize is available for padding

            // Add grid padding so edge hexes aren't clipped
            const gridPad = store.get('hexSize');
            store.set('gridPadding', gridPad);
            resizeCanvases(img.width + 2 * gridPad, img.height + 2 * gridPad);

            if (loadingElement) loadingElement.style.display = 'none';
            showCanvases();

            resetView();
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

        img.src = imageUrl;
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
        generateHexGrid();

        // Add grid padding so edge hexes aren't clipped
        const gridPad = store.get('hexSize');
        store.set('gridPadding', gridPad);
        resizeCanvases(img.width + 2 * gridPad, img.height + 2 * gridPad);

        if (loadingElement) loadingElement.style.display = 'none';
        showCanvases();

        resetView();
        showStatus('Map loaded successfully!', 'success');

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

        // Cloud map — authenticated users (patron or not) can load existing cloud maps
        if (isCloudMapId(lastId) && isAuthenticated()) {
            const entry = await mapsApi.fetchMap(lastId);
            if (!entry) return false;

            store.update({
                currentMapId: entry._id,
                currentMapName: entry.name,
            });

            await loadMapFromBlob(entry.mapImageData, {
                settings: entry.settings,
                view: entry.view,
                revealedHexes: entry.revealedHexes,
                tokens: entry.tokens,
            });
            return true;
        }

        // Local map — fetch from IndexedDB
        const entry = await localDb.getMap(lastId);
        if (!entry) return false;

        store.update({
            currentMapId: entry.id,
            currentMapName: entry.name,
        });

        await loadMapFromBlob(entry.blob, entry.state);
        return true;
    } catch (error) {
        console.error('Error loading last map:', error);
        log('Error loading last map: ' + error.message);
        localStorage.removeItem('currentMapId');
        return false;
    }
}

export async function handleMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        showStatus('Map image must be under 20 MB.', 'error');
        event.target.value = null;
        return;
    }

    try {
        // Convert file to base64 data URL
        const mapImageData = await fileToDataURL(file);

        if (isCloudEnabled()) {
            // Cloud path — save to API
            const name = prompt('Enter map name:', file.name);
            if (!name) {
                event.target.value = null;
                return;
            }

            const state = getFullStateFromStore();

            const saved = await mapsApi.createMap({
                name,
                mapImageData,
                settings: state.settings,
                view: state.view,
                revealedHexes: state.revealedHexes,
                tokens: state.tokens,
            });

            store.update({
                currentMapId: saved._id,
                currentMapName: name,
            });
            localStorage.setItem('currentMapId', saved._id);

            await loadMapFromBlob(mapImageData, state);
        } else {
            // Local path — save to IndexedDB (1 map slot)
            const existingMaps = await localDb.getAllMaps();
            if (existingMaps.length > 0) {
                if (!confirm('This will replace your existing local map. Continue?')) {
                    event.target.value = null;
                    return;
                }
                // Delete existing local maps to enforce 1-slot limit
                for (const m of existingMaps) {
                    await localDb.deleteMap(m.id);
                }
            }

            const name = prompt('Enter map name:', file.name);
            if (!name) {
                event.target.value = null;
                return;
            }

            const state = getFullStateFromStore();
            const localId = await localDb.saveMap({
                name,
                blob: mapImageData,
                state: {
                    settings: state.settings,
                    view: state.view,
                    revealedHexes: state.revealedHexes,
                    tokens: state.tokens,
                },
            });

            store.update({
                currentMapId: localId,
                currentMapName: name,
            });
            localStorage.setItem('currentMapId', localId);

            await loadMapFromBlob(mapImageData, state);
            showStatus('Map saved locally. Become a Member for cloud storage with 25 map slots.', 'info');
        }
    } catch (err) {
        console.error('Map upload error:', err);
        if (err.response?.status === 403) {
            showStatus('Map limit reached! Link Patreon for more maps.', 'error');
        } else {
            showStatus('Error uploading map', 'error');
        }
    } finally {
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

        if (isCloudEnabled()) {
            // Cloud path — save to API
            await mapsApi.createMap({
                name: data.name,
                mapImageData: data.mapData,
                settings: data.state.settings,
                view: data.state.view,
                revealedHexes: data.state.revealedHexes,
                tokens: data.state.tokens,
            });
        } else {
            // Local path — save to IndexedDB (1 map slot)
            const existingMaps = await localDb.getAllMaps();
            if (existingMaps.length > 0) {
                if (!confirm('This will replace your existing local map. Continue?')) {
                    event.target.value = null;
                    return;
                }
                for (const m of existingMaps) {
                    await localDb.deleteMap(m.id);
                }
            }

            await localDb.saveMap({
                name: data.name,
                blob: data.mapData,
                state: data.state,
            });
        }

        showStatus('Map imported', 'success');
        showLibrary();
    } catch (err) {
        console.error('Import map error:', err);
        if (err.response?.status === 403) {
            showStatus('Map limit reached! Link Patreon for more maps.', 'error');
        } else {
            showStatus('Error importing map', 'error');
        }
    }
    event.target.value = null;
}

export async function showLibrary() {
    const libraryList = document.getElementById('library-list');
    const libraryModal = document.getElementById('library-modal');
    if (!libraryList) return;

    libraryList.innerHTML = '';

    if (isCloudEnabled()) {
        // Full cloud library — patron
        let maps;
        try {
            maps = await mapsApi.fetchMaps();
        } catch (err) {
            console.error('Error fetching map library:', err);
            showStatus('Error loading map library', 'error');
            return;
        }

        updateStorageInfo(maps.length, 0);
        maps.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        for (const m of maps) {
            libraryList.appendChild(createCloudMapItem(m, libraryModal));
        }
    } else if (isAuthenticated()) {
        // Authenticated non-patron — show locked cloud maps + local maps
        let cloudMaps = [];
        try {
            cloudMaps = await mapsApi.fetchMaps();
        } catch (err) {
            // API might fail for unverified users, just skip cloud
            log('Could not fetch cloud maps: ' + err.message);
        }

        let localMaps = [];
        try {
            localMaps = await localDb.getAllMaps();
        } catch (err) {
            log('Could not fetch local maps: ' + err.message);
        }

        updateStorageInfo(cloudMaps.length, localMaps.length);

        // Show cloud maps (locked — load one at a time, no create)
        if (cloudMaps.length > 0) {
            cloudMaps.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            const cloudHeader = document.createElement('li');
            cloudHeader.innerHTML = '<strong>Cloud Maps</strong> <span style="color:#a0aec0; font-size:0.8rem;">(1 active at a time — subscribe for full access)</span>';
            cloudHeader.style.padding = '0.5rem 0';
            cloudHeader.style.borderBottom = '1px solid #4a5568';
            libraryList.appendChild(cloudHeader);

            for (const m of cloudMaps) {
                libraryList.appendChild(createCloudMapItem(m, libraryModal));
            }
        }

        // Show local maps
        if (localMaps.length > 0 || cloudMaps.length === 0) {
            if (cloudMaps.length > 0) {
                const localHeader = document.createElement('li');
                localHeader.innerHTML = '<strong>Local Maps</strong>';
                localHeader.style.padding = '0.5rem 0';
                localHeader.style.borderBottom = '1px solid #4a5568';
                localHeader.style.marginTop = '0.5rem';
                libraryList.appendChild(localHeader);
            }

            localMaps.sort((a, b) => (b.updated || 0) - (a.updated || 0));
            for (const m of localMaps) {
                libraryList.appendChild(createLocalMapItem(m, libraryModal));
            }
        }

        if (cloudMaps.length === 0 && localMaps.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No maps saved yet. Upload a map to get started!';
            li.style.color = '#a0aec0';
            li.style.textAlign = 'center';
            li.style.padding = '1rem 0';
            libraryList.appendChild(li);
        }
    } else {
        // Not logged in — local only
        let maps;
        try {
            maps = await localDb.getAllMaps();
        } catch (err) {
            console.error('Error fetching local map library:', err);
            showStatus('Error loading local map library', 'error');
            return;
        }

        updateStorageInfo(0, maps.length);
        maps.sort((a, b) => (b.updated || 0) - (a.updated || 0));

        for (const m of maps) {
            libraryList.appendChild(createLocalMapItem(m, libraryModal));
        }

        if (maps.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No local maps saved yet. Upload a map to get started!';
            li.style.color = '#a0aec0';
            li.style.textAlign = 'center';
            li.style.padding = '1rem 0';
            libraryList.appendChild(li);
        }
    }

    if (libraryModal) libraryModal.style.display = 'block';
}

function createCloudMapItem(m, libraryModal) {
    const li = document.createElement('li');
    const info = document.createElement('span');

    // Green dot to indicate cloud-synced map
    const dot = document.createElement('span');
    dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:#48bb78;margin-right:6px;vertical-align:middle;';
    dot.title = 'Cloud map';
    info.appendChild(dot);

    const infoStr = `${m.name} - ${new Date(m.updatedAt).toLocaleString()}`;
    const truncated = infoStr.length > MAX_LIBRARY_INFO_LENGTH
        ? infoStr.slice(0, MAX_LIBRARY_INFO_LENGTH) + '...'
        : infoStr;
    info.appendChild(document.createTextNode(truncated));
    const actions = document.createElement('div');

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.className = 'btn btn-primary btn-sm';
    loadBtn.addEventListener('click', async () => {
        try {
            await flushSave(); // Save current map before switching
            const fullMap = await mapsApi.fetchMap(m._id);
            store.update({
                currentMapId: fullMap._id,
                currentMapName: fullMap.name,
            });
            localStorage.setItem('currentMapId', fullMap._id);
            await loadMapFromBlob(fullMap.mapImageData, {
                settings: fullMap.settings,
                view: fullMap.view,
                revealedHexes: fullMap.revealedHexes,
                tokens: fullMap.tokens,
            });
            if (libraryModal) libraryModal.style.display = 'none';
        } catch (err) {
            console.error('Error loading map:', err);
            showStatus('Error loading map', 'error');
        }
    });

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'btn btn-secondary btn-sm';
    renameBtn.addEventListener('click', async () => {
        const newName = prompt('Enter new name:', m.name);
        if (newName) {
            try {
                await mapsApi.updateMap(m._id, { name: newName });
                if (store.get('currentMapId') === m._id) store.set('currentMapName', newName);
                showLibrary();
            } catch (err) {
                console.error('Rename error:', err);
                showStatus('Error renaming map', 'error');
            }
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this map?')) {
            try {
                await mapsApi.deleteMap(m._id);
                if (store.get('currentMapId') === m._id) {
                    store.update({ currentMapId: null, currentMapName: '' });
                    localStorage.removeItem('currentMapId');
                }
                showLibrary();
            } catch (err) {
                console.error('Delete error:', err);
                showStatus('Error deleting map', 'error');
            }
        }
    });

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export';
    exportBtn.className = 'btn btn-success btn-sm';
    exportBtn.addEventListener('click', async () => {
        try {
            const fullMap = await mapsApi.fetchMap(m._id);
            const exportObj = {
                name: fullMap.name,
                state: {
                    settings: fullMap.settings,
                    view: fullMap.view,
                    revealedHexes: fullMap.revealedHexes,
                    tokens: fullMap.tokens,
                },
                mapData: fullMap.mapImageData,
            };
            downloadJson(exportObj, fullMap.name);
            showStatus('Map exported', 'success');
        } catch (err) {
            console.error('Export error:', err);
            showStatus('Error exporting map', 'error');
        }
    });

    actions.append(loadBtn, renameBtn, deleteBtn, exportBtn);
    li.append(info, actions);
    return li;
}

function createLocalMapItem(m, libraryModal) {
    const li = document.createElement('li');
    const info = document.createElement('span');
    const dateStr = m.updated ? new Date(m.updated).toLocaleString() : '';
    const infoStr = `${m.name}${dateStr ? ' - ' + dateStr : ''}`;
    const truncated = infoStr.length > MAX_LIBRARY_INFO_LENGTH
        ? infoStr.slice(0, MAX_LIBRARY_INFO_LENGTH) + '...'
        : infoStr;
    info.textContent = truncated;
    const actions = document.createElement('div');

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.className = 'btn btn-primary btn-sm';
    loadBtn.addEventListener('click', async () => {
        try {
            await flushSave(); // Save current map before switching
            const fullMap = await localDb.getMap(m.id);
            if (!fullMap) {
                showStatus('Map not found in local storage', 'error');
                return;
            }
            store.update({
                currentMapId: fullMap.id,
                currentMapName: fullMap.name,
            });
            localStorage.setItem('currentMapId', fullMap.id);
            await loadMapFromBlob(fullMap.blob, fullMap.state);
            if (libraryModal) libraryModal.style.display = 'none';
        } catch (err) {
            console.error('Error loading local map:', err);
            showStatus('Error loading map', 'error');
        }
    });

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'btn btn-secondary btn-sm';
    renameBtn.addEventListener('click', async () => {
        const newName = prompt('Enter new name:', m.name);
        if (newName) {
            try {
                await localDb.renameMap(m.id, newName);
                if (store.get('currentMapId') === m.id) store.set('currentMapName', newName);
                showLibrary();
            } catch (err) {
                console.error('Rename error:', err);
                showStatus('Error renaming map', 'error');
            }
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this map?')) {
            try {
                await localDb.deleteMap(m.id);
                if (store.get('currentMapId') === m.id) {
                    store.update({ currentMapId: null, currentMapName: '' });
                    localStorage.removeItem('currentMapId');
                }
                showLibrary();
            } catch (err) {
                console.error('Delete error:', err);
                showStatus('Error deleting map', 'error');
            }
        }
    });

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export';
    exportBtn.className = 'btn btn-success btn-sm';
    exportBtn.addEventListener('click', async () => {
        try {
            const fullMap = await localDb.getMap(m.id);
            if (!fullMap) {
                showStatus('Map not found in local storage', 'error');
                return;
            }
            const exportObj = {
                name: fullMap.name,
                state: fullMap.state,
                mapData: fullMap.blob,
            };
            downloadJson(exportObj, fullMap.name);
            showStatus('Map exported', 'success');
        } catch (err) {
            console.error('Export error:', err);
            showStatus('Error exporting map', 'error');
        }
    });

    actions.append(loadBtn, renameBtn, deleteBtn, exportBtn);
    li.append(info, actions);
    return li;
}

function downloadJson(obj, name) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    const safeName = (name || 'map').replace(/\s+/g, '_');
    link.setAttribute('download', safeName + '.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function updateStorageInfo(cloudCount, localCount) {
    const storageInfo = document.getElementById('storage-info');
    if (!storageInfo) return;

    if (isCloudEnabled()) {
        const user = useAuthStore.getState().user;
        const limit = user?.mapLimit || 25;
        storageInfo.textContent = `Cloud Storage: ${cloudCount} / ${limit} maps`;
    } else if (isAuthenticated() && cloudCount > 0) {
        storageInfo.textContent = `${cloudCount} cloud map${cloudCount !== 1 ? 's' : ''} (1 active) · Local: ${localCount} / 1 — Subscribe to unlock all`;
    } else {
        storageInfo.textContent = `Local Storage: ${localCount} / 1 map — Become a Member for 25 cloud maps`;
    }
}
