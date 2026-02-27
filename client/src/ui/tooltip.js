import { getEl } from '../util/dom.js';

let tokenTooltip = null;
let tooltipTimer = null;
let hoveredTokenIndex = -1;
let mapContainer = null;

export function setupTooltip(container) {
    tokenTooltip = getEl('token-tooltip');
    mapContainer = container;
}

export function hideTooltip() {
    if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }
    hoveredTokenIndex = -1;
    if (tokenTooltip) {
        tokenTooltip.style.display = 'none';
    }
}

export function showTooltipAt(clientX, clientY, text) {
    if (!tokenTooltip || !mapContainer) return;
    const rect = mapContainer.getBoundingClientRect();
    tokenTooltip.textContent = text;
    tokenTooltip.style.left = `${clientX - rect.left + 15}px`;
    tokenTooltip.style.top = `${clientY - rect.top + 15}px`;
    tokenTooltip.style.display = 'block';
}

export function getHoveredTokenIndex() {
    return hoveredTokenIndex;
}

export function setHoveredTokenIndex(idx) {
    hoveredTokenIndex = idx;
}

export function getTooltipTimer() {
    return tooltipTimer;
}

export function setTooltipTimer(timer) {
    tooltipTimer = timer;
}

export function getTokenTooltip() {
    return tokenTooltip;
}

export function getMapContainer() {
    return mapContainer;
}
