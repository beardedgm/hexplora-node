import { store } from '../state/index.js';
import { STORAGE_KEY } from '../state/defaults.js';
import { applySettingsToStore, applyTokensToStore, getFullStateFromStore } from './serialization.js';
import * as mapsApi from '../services/maps.js';
import { updateMapState } from './db.js';
import { log } from '../ui/debug.js';
import { showStatus } from '../ui/status.js';

// Debounce timer for persistent saves (API or IndexedDB)
let persistSaveTimer = null;
const PERSIST_SAVE_DELAY = 2000; // 2 seconds

const TOKEN_KEY = 'hexplora_token';

function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
}

/** MongoDB ObjectIds are 24-char hex; local UUIDs have dashes */
function isCloudMapId(id) {
    return id && /^[a-f0-9]{24}$/.test(id);
}

export function loadSavedState() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsedState = JSON.parse(savedState);

            store.set('revealedHexes', parsedState.revealedHexes || {});
            applySettingsToStore(parsedState.settings);
            applyTokensToStore(parsedState.tokens);

            log('Loaded saved state');
        }
    } catch (error) {
        console.error('Error loading saved state:', error);
        log('Error loading saved state: ' + error.message);
    }
}

export function cancelPendingSave() {
    if (persistSaveTimer) {
        clearTimeout(persistSaveTimer);
        persistSaveTimer = null;
    }
}

/** Immediately persist the current map's state (cancel any pending debounce first). */
export async function flushSave() {
    cancelPendingSave();
    const currentMapId = store.get('currentMapId');
    if (!currentMapId) return;

    const fullState = getFullStateFromStore();

    // Also update the localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));

    try {
        if (isCloudMapId(currentMapId) && isAuthenticated()) {
            await mapsApi.updateMap(currentMapId, {
                settings: fullState.settings,
                view: fullState.view,
                revealedHexes: fullState.revealedHexes,
                tokens: fullState.tokens,
            });
            log('State flushed to server');
            showStatus('Saved to cloud', 'success');
        } else {
            await updateMapState(currentMapId, {
                settings: fullState.settings,
                view: fullState.view,
                revealedHexes: fullState.revealedHexes,
                tokens: fullState.tokens,
            });
            log('State flushed to local storage');
            showStatus('Saved locally', 'success');
        }
    } catch (err) {
        console.error('Error flushing state:', err);
        log('Error flushing state: ' + err.message);
    }
}

export function saveState() {
    try {
        const fullState = getFullStateFromStore();

        // Instant localStorage write (offline resilience)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));

        // Debounced persistent save
        const currentMapId = store.get('currentMapId');
        if (currentMapId) {
            if (persistSaveTimer) clearTimeout(persistSaveTimer);
            persistSaveTimer = setTimeout(async () => {
                try {
                    if (isCloudMapId(currentMapId) && isAuthenticated()) {
                        // Cloud map — save to API (works for patrons and non-patrons with existing maps)
                        await mapsApi.updateMap(currentMapId, {
                            settings: fullState.settings,
                            view: fullState.view,
                            revealedHexes: fullState.revealedHexes,
                            tokens: fullState.tokens,
                        });
                        log('State saved to server');
                        showStatus('Saved to cloud', 'success');
                    } else {
                        // Local map — save to IndexedDB
                        await updateMapState(currentMapId, {
                            settings: fullState.settings,
                            view: fullState.view,
                            revealedHexes: fullState.revealedHexes,
                            tokens: fullState.tokens,
                        });
                        log('State saved to local storage');
                        showStatus('Saved locally', 'success');
                    }
                } catch (err) {
                    console.error('Error saving state:', err);
                    log('Error saving state: ' + err.message);
                }
            }, PERSIST_SAVE_DELAY);
        }

        log('State saved');
    } catch (error) {
        console.error('Error saving state:', error);
        log('Error saving state: ' + error.message);
    }
}
