import { store } from '../state/index.js';
import { DEFAULT_MAP, MAX_LIBRARY_INFO_LENGTH } from '../state/defaults.js';
import * as mapsApi from '../services/maps.js';
import useAuthStore from '../store/useAuthStore.js';
import { showStatus } from '../ui/status.js';
import { log } from '../ui/debug.js';
import { requestRedraw, resizeCanvases, showCanvases, hideCanvases } from '../canvas/renderer.js';
import { resetView } from '../input/panZoom.js';
import { applyState, blobToDataURL } from './importExport.js';
import { pushHistory } from '../state/history.js';
import { saveState } from './localStorage.js';
import { getFullStateFromStore } from './serialization.js';
import { generateHexGrid } from '../hex/math.js';

const TOKEN_KEY = 'hexplora_token';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
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
        if (!isAuthenticated()) return false;
        const lastId = localStorage.getItem('currentMapId');
        if (!lastId) return false;

        const entry = await mapsApi.fetchMap(lastId);
        if (!entry) return false;

        store.update({
            currentMapId: entry._id,
            currentMapName: entry.name,
        });

        // mapImageData is stored as a base64 data URL — use directly as img.src
        await loadMapFromBlob(entry.mapImageData, {
            settings: entry.settings,
            view: entry.view,
            revealedHexes: entry.revealedHexes,
            tokens: entry.tokens,
        });
        return true;
    } catch (error) {
        console.error('Error loading last map:', error);
        log('Error loading last map: ' + error.message);
        // Clear stale currentMapId if the map no longer exists
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

        if (isAuthenticated()) {
            const name = prompt('Enter map name:', file.name);
            if (!name) {
                event.target.value = null;
                return;
            }

            const state = getFullStateFromStore();

            // Save to API
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

            // Load the map from the data URL
            await loadMapFromBlob(mapImageData, state);
        } else {
            // Not signed in — load map locally (no cloud save)
            loadMap(mapImageData);
            showStatus('Map loaded locally. Sign in to save maps to the cloud.', 'info');
        }
    } catch (err) {
        console.error('Map upload error:', err);
        if (err.response?.status === 403) {
            showStatus('Map limit reached! Link Patreon for unlimited maps.', 'error');
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

    if (!isAuthenticated()) {
        showStatus('Sign in to import maps to your library.', 'info');
        event.target.value = null;
        return;
    }

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.name || !data.mapData || !data.state) throw new Error('Invalid map file');

        // data.mapData is already a base64 data URL
        await mapsApi.createMap({
            name: data.name,
            mapImageData: data.mapData,
            settings: data.state.settings,
            view: data.state.view,
            revealedHexes: data.state.revealedHexes,
            tokens: data.state.tokens,
        });

        showStatus('Map imported', 'success');
        showLibrary();
    } catch (err) {
        console.error('Import map error:', err);
        if (err.response?.status === 403) {
            showStatus('Map limit reached! Link Patreon for unlimited maps.', 'error');
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

    if (!isAuthenticated()) {
        const li = document.createElement('li');
        li.textContent = 'Sign in to access your saved maps.';
        li.style.color = '#a0aec0';
        li.style.textAlign = 'center';
        li.style.padding = '1rem 0';
        libraryList.appendChild(li);
        if (libraryModal) libraryModal.style.display = 'block';
        return;
    }

    let maps;
    try {
        maps = await mapsApi.fetchMaps();
    } catch (err) {
        console.error('Error fetching map library:', err);
        showStatus('Error loading map library', 'error');
        return;
    }

    updateStorageInfo(maps.length);

    // Sort by updatedAt descending
    maps.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    for (const m of maps) {
        const li = document.createElement('li');
        const info = document.createElement('span');
        const infoStr = `${m.name} - ${new Date(m.updatedAt).toLocaleString()}`;
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
                // Fetch full map data (including image) from API
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
                        store.update({
                            currentMapId: null,
                            currentMapName: '',
                        });
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
                // Fetch full map data for export
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
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
                const link = document.createElement('a');
                link.setAttribute('href', dataStr);
                const safeName = fullMap.name.replace(/\s+/g, '_');
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

function updateStorageInfo(mapCount) {
    const storageInfo = document.getElementById('storage-info');
    if (!storageInfo) return;

    const user = useAuthStore.getState().user;
    if (user) {
        const limit = user.mapLimit;
        let text = `Maps: ${mapCount} / ${limit}`;
        if (!user.isPatron && mapCount >= limit) {
            text += ' — Become a Member for more maps';
        } else if (!user.isPatron) {
            text += ` (Members get 25)`;
        }
        storageInfo.textContent = text;
    } else {
        storageInfo.textContent = `Maps: ${mapCount}`;
    }
}
