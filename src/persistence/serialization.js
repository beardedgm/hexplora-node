import { store } from '../state/index.js';
import { DEFAULTS } from '../state/defaults.js';

const SETTINGS_KEYS = [
    'hexSize', 'offsetX', 'offsetY', 'columnCount', 'rowCount',
    'orientation', 'mapScale', 'fogColor', 'fogOpacity',
    'gridColor', 'gridThickness', 'tokenColor',
];

export function getSettingsFromStore() {
    const settings = {};
    for (const key of SETTINGS_KEYS) {
        settings[key] = store.get(key);
    }
    return settings;
}

export function getViewFromStore() {
    return {
        zoomLevel: store.get('zoomLevel'),
        panX: store.get('panX'),
        panY: store.get('panY'),
    };
}

export function getFullStateFromStore() {
    return {
        settings: getSettingsFromStore(),
        view: getViewFromStore(),
        tokens: store.get('tokens'),
        revealedHexes: store.get('revealedHexes'),
    };
}

export function applySettingsToStore(settings, fallbackSource) {
    if (!settings) return;
    const fallback = fallbackSource || DEFAULTS;
    const update = {};
    for (const key of SETTINGS_KEYS) {
        if (key === 'orientation') {
            update[key] = ['pointy', 'flat'].includes(settings[key]) ? settings[key] : fallback[key];
        } else if (key === 'fogOpacity') {
            update[key] = settings[key] ?? fallback[key];
        } else {
            update[key] = settings[key] || fallback[key];
        }
    }
    store.update(update);
}

export function applyViewToStore(view) {
    if (!view) return;
    store.update({
        zoomLevel: view.zoomLevel || 1,
        panX: view.panX || 0,
        panY: view.panY || 0,
    });
}

export function deserializeTokens(tokenArray) {
    if (!tokenArray) return null;
    return tokenArray.map((t, idx) => ({
        x: t.x,
        y: t.y,
        color: t.color,
        label: t.label || '',
        icon: t.icon || '',
        notes: t.notes || '',
        zIndex: typeof t.zIndex === 'number' ? t.zIndex : idx + 1,
    }));
}

export function applyTokensToStore(tokenArray) {
    if (tokenArray) {
        const tokens = deserializeTokens(tokenArray);
        store.set('tokens', tokens);
        store.set('nextZIndex', tokens.reduce((m, t) => Math.max(m, t.zIndex), 0) + 1);
    } else {
        store.set('tokens', []);
        store.set('nextZIndex', 1);
    }
}
