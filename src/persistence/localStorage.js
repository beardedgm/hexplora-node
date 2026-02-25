import { store } from '../state/index.js';
import { STORAGE_KEY } from '../state/defaults.js';
import * as db from './db.js';
import { log } from '../ui/debug.js';

export function loadSavedState() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsedState = JSON.parse(savedState);

            store.set('revealedHexes', parsedState.revealedHexes || {});

            if (parsedState.settings) {
                store.update({
                    hexSize: parsedState.settings.hexSize || store.get('hexSize'),
                    offsetX: parsedState.settings.offsetX || store.get('offsetX'),
                    offsetY: parsedState.settings.offsetY || store.get('offsetY'),
                    columnCount: parsedState.settings.columnCount || store.get('columnCount'),
                    rowCount: parsedState.settings.rowCount || store.get('rowCount'),
                    mapScale: parsedState.settings.mapScale || store.get('mapScale'),
                    fogColor: parsedState.settings.fogColor || store.get('fogColor'),
                    fogOpacity: parsedState.settings.fogOpacity || store.get('fogOpacity'),
                    gridColor: parsedState.settings.gridColor || store.get('gridColor'),
                    gridThickness: parsedState.settings.gridThickness || store.get('gridThickness'),
                    tokenColor: parsedState.settings.tokenColor || store.get('tokenColor'),
                    orientation: parsedState.settings.orientation || store.get('orientation'),
                });
            }

            if (parsedState.tokens) {
                const tokens = parsedState.tokens.map((t, idx) => ({
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

            log('Loaded saved state');
        }
    } catch (error) {
        console.error('Error loading saved state:', error);
        log('Error loading saved state: ' + error.message);
    }
}

function updateSavedState(key, value) {
    try {
        let storedState = {};
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            storedState = JSON.parse(savedState);
        }
        storedState[key] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
    } catch (error) {
        console.error('Error updating saved state:', error);
    }
}

export function saveState() {
    try {
        const settings = {
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
        };

        const view = {
            zoomLevel: store.get('zoomLevel'),
            panX: store.get('panX'),
            panY: store.get('panY'),
        };

        const tokens = store.get('tokens');
        const revealedHexes = store.get('revealedHexes');

        updateSavedState('revealedHexes', revealedHexes);
        updateSavedState('settings', settings);
        updateSavedState('tokens', tokens);
        updateSavedState('view', view);

        const currentMapId = store.get('currentMapId');
        if (currentMapId) {
            const state = { settings, view, tokens, revealedHexes };
            db.updateMap(currentMapId, {
                name: store.get('currentMapName'),
                blob: store.get('currentMapBlob'),
                state,
                updated: Date.now(),
            });
        }

        log('State saved');
    } catch (error) {
        console.error('Error saving state:', error);
        log('Error saving state: ' + error.message);
    }
}
