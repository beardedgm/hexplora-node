import { store } from '../state/index.js';
import { STORAGE_KEY } from '../state/defaults.js';
import { applySettingsToStore, applyTokensToStore, getFullStateFromStore } from './serialization.js';
import * as db from './db.js';
import { log } from '../ui/debug.js';

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

        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));

        const currentMapId = store.get('currentMapId');
        if (currentMapId) {
            db.updateMap(currentMapId, {
                name: store.get('currentMapName'),
                blob: store.get('currentMapBlob'),
                state: fullState,
                updated: Date.now(),
            });
        }

        log('State saved');
    } catch (error) {
        console.error('Error saving state:', error);
        log('Error saving state: ' + error.message);
    }
}
