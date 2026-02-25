import { store } from '../state/index.js';
import { getEl, addListener } from '../util/dom.js';
import { generateHexGrid } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { showStatus } from './status.js';
import { saveState } from '../persistence/localStorage.js';
import { debounce } from '../util/debounce.js';

const debouncedSaveState = debounce(saveState, 300);
const debouncedRequestRedraw = debounce(requestRedraw, 50);

function validateInput(inputElement, min, max, defaultValue) {
    let value = parseInt(inputElement.value);
    if (isNaN(value)) {
        value = defaultValue;
        inputElement.value = defaultValue;
        showStatus(`Invalid input. Using default value: ${defaultValue}`, 'warning');
    } else if (value < min) {
        value = min;
        inputElement.value = min;
        showStatus(`Value too small. Using minimum value: ${min}`, 'warning');
    } else if (value > max) {
        value = max;
        inputElement.value = max;
        showStatus(`Value too large. Using maximum value: ${max}`, 'warning');
    }
    return value;
}

export function setupInputFields() {
    const hexSizeInput = getEl('hex-size');
    const offsetXInput = getEl('offset-x');
    const offsetYInput = getEl('offset-y');
    const columnsInput = getEl('columns');
    const rowsInput = getEl('rows');
    const orientationInput = getEl('orientation');
    const mapScaleInput = getEl('map-scale');
    const fogColorInput = getEl('fog-color');
    const fogOpacityInput = getEl('fog-opacity');
    const gridColorInput = getEl('grid-color');
    const gridThicknessInput = getEl('grid-thickness');
    const tokenColorInput = getEl('token-color');

    if (hexSizeInput) addListener(hexSizeInput, 'change', function () {
        store.set('hexSize', validateInput(this, 10, 300, 40));
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (offsetXInput) addListener(offsetXInput, 'change', function () {
        store.set('offsetX', validateInput(this, -1000, 1000, 0));
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (offsetYInput) addListener(offsetYInput, 'change', function () {
        store.set('offsetY', validateInput(this, -1000, 1000, 0));
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (columnsInput) addListener(columnsInput, 'change', function () {
        store.set('columnCount', validateInput(this, 1, 200, 20));
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (rowsInput) addListener(rowsInput, 'change', function () {
        store.set('rowCount', validateInput(this, 1, 200, 15));
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (orientationInput) addListener(orientationInput, 'change', function () {
        store.set('orientation', this.value);
        generateHexGrid(); requestRedraw(); saveState();
    });

    if (mapScaleInput) addListener(mapScaleInput, 'change', function () {
        store.set('mapScale', validateInput(this, 10, 500, 100));
        requestRedraw(); saveState();
    });

    if (fogColorInput) addListener(fogColorInput, 'change', function () {
        store.set('fogColor', this.value);
        requestRedraw(); saveState();
    });

    if (fogOpacityInput) addListener(fogOpacityInput, 'input', function () {
        store.set('fogOpacity', parseFloat(this.value));
        debouncedRequestRedraw(); debouncedSaveState();
    });

    if (gridColorInput) addListener(gridColorInput, 'change', function () {
        store.set('gridColor', this.value);
        requestRedraw(); saveState();
    });

    if (gridThicknessInput) addListener(gridThicknessInput, 'input', function () {
        store.set('gridThickness', parseFloat(this.value));
        debouncedRequestRedraw(); debouncedSaveState();
    });

    if (tokenColorInput) addListener(tokenColorInput, 'change', function () {
        store.set('tokenColor', this.value);
        requestRedraw(); saveState();
    });
}

export function updateInputFields() {
    const fields = {
        'hex-size': 'hexSize',
        'offset-x': 'offsetX',
        'offset-y': 'offsetY',
        'columns': 'columnCount',
        'rows': 'rowCount',
        'map-scale': 'mapScale',
        'fog-color': 'fogColor',
        'fog-opacity': 'fogOpacity',
        'grid-color': 'gridColor',
        'grid-thickness': 'gridThickness',
        'token-color': 'tokenColor',
        'orientation': 'orientation',
    };

    for (const [elId, storeKey] of Object.entries(fields)) {
        const el = document.getElementById(elId);
        if (el) el.value = store.get(storeKey);
    }
}
