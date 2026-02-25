import { SpatialHashGrid } from '../util/spatialIndex.js';
import { store } from '../state/index.js';
import { log } from '../ui/debug.js';

export function generateHexGrid() {
    const hexSize = store.get('hexSize');
    const offsetX = store.get('offsetX');
    const offsetY = store.get('offsetY');
    const columnCount = store.get('columnCount');
    const rowCount = store.get('rowCount');
    const orientation = store.get('orientation');
    const revealedHexes = store.get('revealedHexes');

    const hexes = [];

    let hexWidth, hexHeight;
    if (orientation === 'pointy') {
        hexWidth = hexSize * Math.sqrt(3);
        hexHeight = hexSize * 2;
    } else {
        hexWidth = hexSize * 2;
        hexHeight = hexSize * Math.sqrt(3);
    }

    const hexIndex = new SpatialHashGrid(hexSize * 2);

    for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < columnCount; col++) {
            let x, y;
            if (orientation === 'pointy') {
                x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + offsetX;
                y = row * (hexHeight * 3 / 4) + offsetY;
            } else {
                x = col * (hexWidth * 3 / 4) + offsetX;
                y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + offsetY;
            }

            const hexId = `${col}-${row}`;
            const isRevealed = revealedHexes[hexId] === true;

            const vertices = [];
            const startAngle = orientation === 'pointy' ? Math.PI / 2 : 0;
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + startAngle;
                const px = x + hexSize * Math.cos(angle);
                const py = y + hexSize * Math.sin(angle);
                vertices.push({ x: px, y: py });
            }

            const hex = {
                id: hexId,
                x: x,
                y: y,
                row: row,
                col: col,
                revealed: isRevealed,
                vertices: vertices,
            };
            hexes.push(hex);
            hexIndex.insert(hex, {
                xMin: x - hexSize,
                yMin: y - hexSize,
                xMax: x + hexSize,
                yMax: y + hexSize,
            });
        }
    }

    store.set('hexes', hexes);
    store.set('hexIndex', hexIndex);

    log(`Generated ${hexes.length} hexes, ${Object.keys(revealedHexes).length} already revealed`);

    // Rebuild token index after grid regeneration
    rebuildTokenIndex();
}

export function rebuildTokenIndex() {
    const hexSize = store.get('hexSize');
    const tokens = store.get('tokens');
    let tokenSpatialIndex = store.get('tokenSpatialIndex');

    if (tokenSpatialIndex) {
        tokenSpatialIndex.clear();
        tokenSpatialIndex.cellSize = hexSize * 2;
    } else {
        tokenSpatialIndex = new SpatialHashGrid(hexSize * 2);
    }

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        t._index = i;
        tokenSpatialIndex.insert(t, tokenBounds(t, hexSize));
    }

    store.set('tokenSpatialIndex', tokenSpatialIndex);
    updateNextZIndex();
}

export function updateNextZIndex() {
    const tokens = store.get('tokens');
    store.set('nextZIndex', tokens.reduce((m, t) => Math.max(m, t.zIndex || 0), 0) + 1);
}

export function tokenBounds(t, hexSize) {
    if (hexSize === undefined) hexSize = store.get('hexSize');
    return {
        xMin: t.x - hexSize * 0.4,
        yMin: t.y - hexSize * 0.4,
        xMax: t.x + hexSize * 0.4,
        yMax: t.y + hexSize * 0.4,
    };
}

export function addTokenToIndex(token, idx) {
    const tokenSpatialIndex = store.get('tokenSpatialIndex');
    const hexSize = store.get('hexSize');
    token._index = idx;
    tokenSpatialIndex.insert(token, tokenBounds(token, hexSize));
}

export function removeTokenFromIndex(token) {
    const tokenSpatialIndex = store.get('tokenSpatialIndex');
    const hexSize = store.get('hexSize');
    tokenSpatialIndex.remove(token, tokenBounds(token, hexSize));
}

export function updateTokenInIndex(token, oldPos) {
    const tokenSpatialIndex = store.get('tokenSpatialIndex');
    const hexSize = store.get('hexSize');
    const oldBounds = {
        xMin: oldPos.x - hexSize * 0.4,
        yMin: oldPos.y - hexSize * 0.4,
        xMax: oldPos.x + hexSize * 0.4,
        yMax: oldPos.y + hexSize * 0.4,
    };
    tokenSpatialIndex.update(token, oldBounds, tokenBounds(token, hexSize));
}

export function isPointInHex(px, py, hex) {
    const vertices = hex.vertices;
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

export function findHexAtPosition(x, y) {
    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');
    const hexIndex = store.get('hexIndex');

    const worldX = (x - panX) / zoomLevel;
    const worldY = (y - panY) / zoomLevel;

    if (!hexIndex) return null;
    const candidates = hexIndex.queryPoint(worldX, worldY);
    for (const hex of candidates) {
        if (isPointInHex(worldX, worldY, hex)) {
            return hex;
        }
    }
    return null;
}

export function findTokenAtPosition(x, y) {
    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');
    const hexSize = store.get('hexSize');
    const tokenSpatialIndex = store.get('tokenSpatialIndex');

    const worldX = (x - panX) / zoomLevel;
    const worldY = (y - panY) / zoomLevel;

    if (!tokenSpatialIndex) return -1;
    const candidates = tokenSpatialIndex.queryPoint(worldX, worldY).slice();
    candidates.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    for (const token of candidates) {
        const dx = token.x - worldX;
        const dy = token.y - worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= hexSize * 0.4) {
            return token._index;
        }
    }
    return -1;
}
