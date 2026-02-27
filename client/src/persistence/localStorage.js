import { store } from '../state/index.js';
import { STORAGE_KEY } from '../state/defaults.js';
import { applySettingsToStore, applyTokensToStore, getFullStateFromStore } from './serialization.js';
import * as mapsApi from '../services/maps.js';
import { log } from '../ui/debug.js';

// Debounce timer for API saves
let apiSaveTimer = null;
const API_SAVE_DELAY = 2000; // 2 seconds

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

        // Debounced API save
        const currentMapId = store.get('currentMapId');
        if (currentMapId) {
            if (apiSaveTimer) clearTimeout(apiSaveTimer);
            apiSaveTimer = setTimeout(async () => {
                try {
                    await mapsApi.updateMap(currentMapId, {
                        settings: fullState.settings,
                        view: fullState.view,
                        revealedHexes: fullState.revealedHexes,
                        tokens: fullState.tokens,
                    });
                    log('State saved to server');
                } catch (err) {
                    console.error('Error saving state to server:', err);
                    log('Error saving to server: ' + err.message);
                }
            }, API_SAVE_DELAY);
        }

        log('State saved');
    } catch (error) {
        console.error('Error saving state:', error);
        log('Error saving state: ' + error.message);
    }
}
