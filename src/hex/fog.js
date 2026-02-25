import { store } from '../state/index.js';
import { log } from '../ui/debug.js';

export function revealHex(hex) {
    const revealedHexes = store.get('revealedHexes');
    hex.revealed = true;
    revealedHexes[hex.id] = true;
    store.set('revealedHexes', revealedHexes);
    log(`Revealing hex: ${hex.id} at ${Math.round(hex.x)}, ${Math.round(hex.y)}`);
}

export function hideHex(hex) {
    const revealedHexes = store.get('revealedHexes');
    hex.revealed = false;
    delete revealedHexes[hex.id];
    store.set('revealedHexes', revealedHexes);
    log(`Hiding hex: ${hex.id} at ${Math.round(hex.x)}, ${Math.round(hex.y)}`);
}

export function resetAllFog() {
    const hexes = store.get('hexes');
    store.set('revealedHexes', {});
    for (const hex of hexes) {
        hex.revealed = false;
    }
    log('All fog reset');
}
