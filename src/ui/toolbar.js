import { store } from '../state/index.js';
import { getEl, addListener } from '../util/dom.js';
import { requestRedraw } from '../canvas/renderer.js';
import { showStatus } from './status.js';
import { log } from './debug.js';
import { resetAllFog } from '../hex/fog.js';
import { saveState } from '../persistence/localStorage.js';
import { pushHistory } from '../state/history.js';

let mapContainer = null;

export function setupToolbar(container) {
    mapContainer = container;

    const toggleModeBtn = getEl('toggle-mode-btn');
    const toggleHeaderBtn = getEl('toggle-header-btn');
    const resetBtn = getEl('reset-map-btn');
    const addTokenBtn = getEl('add-token-btn');
    const removeTokenBtn = getEl('remove-token-btn');
    const clearTokensBtn = getEl('clear-tokens-btn');
    const debugToggle = getEl('debug-toggle');

    if (toggleModeBtn) addListener(toggleModeBtn, 'click', toggleMode);
    if (toggleHeaderBtn) addListener(toggleHeaderBtn, 'click', toggleHeader);
    if (resetBtn) addListener(resetBtn, 'click', resetMap);
    if (addTokenBtn) addListener(addTokenBtn, 'click', toggleAddTokenMode);
    if (removeTokenBtn) addListener(removeTokenBtn, 'click', toggleRemoveTokenMode);
    if (clearTokensBtn) addListener(clearTokensBtn, 'click', clearTokens);
    if (debugToggle) {
        addListener(debugToggle, 'click', () => {
            const debugMode = !store.get('debugMode');
            store.set('debugMode', debugMode);
            const debugInfo = getEl('debug-info');
            if (debugInfo) debugInfo.style.display = debugMode ? 'block' : 'none';
            requestRedraw();
            log('Debug mode ' + (debugMode ? 'enabled' : 'disabled'));
        });
    }
}

export function toggleMode() {
    const revealMode = !store.get('revealMode');
    store.set('revealMode', revealMode);

    const toggleModeBtn = getEl('toggle-mode-btn');
    if (toggleModeBtn) {
        toggleModeBtn.textContent = `Mode: ${revealMode ? 'Reveal' : 'Hide'}`;
        toggleModeBtn.classList.toggle('btn-primary', revealMode);
        toggleModeBtn.classList.toggle('btn-warning', !revealMode);
    }

    if (mapContainer) {
        mapContainer.classList.toggle('reveal-mode', revealMode);
        mapContainer.classList.toggle('hide-mode', !revealMode);
    }

    showStatus(`Mode switched to: ${revealMode ? 'Reveal' : 'Hide'} hexes`, 'info');
    log(`Mode changed to: ${revealMode ? 'Reveal' : 'Hide'}`);
    requestRedraw();
}

function toggleHeader() {
    const headerContent = document.getElementById('header-content');
    if (!headerContent) return;
    const isVisible = !headerContent.classList.contains('collapsed');

    if (isVisible) {
        headerContent.classList.add('collapsed');
    } else {
        headerContent.classList.remove('collapsed');
    }

    const toggleHeaderBtn = getEl('toggle-header-btn');
    if (toggleHeaderBtn) {
        toggleHeaderBtn.innerHTML = isVisible
            ? '<i class="bi bi-caret-down-fill"></i>'
            : '<i class="bi bi-caret-up-fill"></i>';
    }

    log(`Header ${isVisible ? 'hidden' : 'shown'}`);
    showStatus(`Header ${isVisible ? 'hidden' : 'shown'}`, 'info');
}

function resetMap() {
    if (confirm('Are you sure you want to reset the map? All revealed hexes will be hidden again.')) {
        resetAllFog();
        saveState();
        requestRedraw();
        pushHistory();
        log('Map reset');
        showStatus('Map has been reset', 'info');
    }
}

export function toggleAddTokenMode() {
    const isAddingToken = !store.get('isAddingToken');
    store.set('isAddingToken', isAddingToken);

    if (isAddingToken && store.get('isRemovingToken')) {
        toggleRemoveTokenMode(false);
    }

    const addTokenBtn = getEl('add-token-btn');
    if (isAddingToken) {
        if (mapContainer) mapContainer.classList.add('token-add-mode');
        if (addTokenBtn) {
            addTokenBtn.textContent = 'Cancel';
            addTokenBtn.classList.remove('btn-info');
            addTokenBtn.classList.add('btn-warning');
        }
        showStatus('Click on the map to place a token', 'info');
    } else {
        if (mapContainer) mapContainer.classList.remove('token-add-mode');
        if (addTokenBtn) {
            addTokenBtn.textContent = 'Add Token';
            addTokenBtn.classList.remove('btn-warning');
            addTokenBtn.classList.add('btn-info');
        }
    }

    log(`Token add mode ${isAddingToken ? 'enabled' : 'disabled'}`);
}

function toggleRemoveTokenMode(forceState) {
    const isRemovingToken = typeof forceState === 'boolean' ? forceState : !store.get('isRemovingToken');
    store.set('isRemovingToken', isRemovingToken);

    if (isRemovingToken && store.get('isAddingToken')) {
        toggleAddTokenMode();
    }

    const removeTokenBtn = getEl('remove-token-btn');
    if (isRemovingToken) {
        if (mapContainer) mapContainer.classList.add('token-remove-mode');
        if (removeTokenBtn) {
            removeTokenBtn.textContent = 'Cancel';
            removeTokenBtn.classList.remove('btn-warning');
            removeTokenBtn.classList.add('btn-danger');
        }
        showStatus('Click a token to remove it', 'info');
    } else {
        if (mapContainer) mapContainer.classList.remove('token-remove-mode');
        if (removeTokenBtn) {
            removeTokenBtn.textContent = 'Remove Token';
            removeTokenBtn.classList.remove('btn-danger');
            removeTokenBtn.classList.add('btn-warning');
        }
    }

    log(`Token remove mode ${isRemovingToken ? 'enabled' : 'disabled'}`);
}

function clearTokens() {
    const tokens = store.get('tokens');
    if (tokens.length === 0) {
        showStatus('No tokens to clear', 'info');
        return;
    }

    if (confirm(`Are you sure you want to remove all ${tokens.length} tokens?`)) {
        store.set('tokens', []);
        store.set('selectedTokenIndex', -1);
        const tokenSpatialIndex = store.get('tokenSpatialIndex');
        if (tokenSpatialIndex) tokenSpatialIndex.clear();
        store.set('nextZIndex', 1);
        saveState();
        requestRedraw();
        pushHistory();
        log('All tokens cleared');
        showStatus('All tokens removed', 'info');
    }
}
