import { store } from '../state/index.js';
import { STORAGE_KEY } from '../state/defaults.js';
import { applySettingsToStore, applyTokensToStore, getFullStateFromStore } from './serialization.js';
import * as mapsApi from '../services/maps.js';
import { updateMapState } from './db.js';
import useAuthStore from '../store/useAuthStore.js';
import { log } from '../ui/debug.js';

// Debounce timer for persistent saves (API or IndexedDB)
let persistSaveTimer = null;
const PERSIST_SAVE_DELAY = 2000; // 2 seconds

function isCloudEnabled() {
    const token = localStorage.getItem('hexplora_token');
    const user = useAuthStore.getState().user;
    return !!token && user?.isPatron === true;
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
                    if (isCloudEnabled()) {
                        // Cloud path — save to API
                        await mapsApi.updateMap(currentMapId, {
                            settings: fullState.settings,
                            view: fullState.view,
                            revealedHexes: fullState.revealedHexes,
                            tokens: fullState.tokens,
                        });
                        log('State saved to server');
                    } else {
                        // Local path — save to IndexedDB
                        await updateMapState(currentMapId, {
                            settings: fullState.settings,
                            view: fullState.view,
                            revealedHexes: fullState.revealedHexes,
                            tokens: fullState.tokens,
                        });
                        log('State saved to local storage');
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
