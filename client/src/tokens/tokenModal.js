import { store } from '../state/index.js';
import { getEl } from '../util/dom.js';
import { getCanvasCoords } from '../canvas/coordinates.js';
import { findTokenAtPosition, addTokenToIndex } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { showStatus } from '../ui/status.js';
import { hideTooltip } from '../ui/tooltip.js';
import { pushHistory } from '../state/history.js';
import { saveState } from '../persistence/localStorage.js';

let tokenLabelModal, tokenLabelInput, tokenIconSelect, tokenColorInput, tokenNotesInput;
let toggleAddTokenModeFn = null;

export function setupTokenModal(opts) {
    tokenLabelModal = getEl('token-label-modal');
    tokenLabelInput = getEl('token-label-input');
    tokenIconSelect = getEl('token-icon-select');
    tokenColorInput = getEl('token-color');
    tokenNotesInput = getEl('token-notes-input');
    toggleAddTokenModeFn = opts.toggleAddTokenMode;
}

export function addTokenAtPosition(x, y, canvas) {
    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');
    const worldX = (x - panX) / zoomLevel;
    const worldY = (y - panY) / zoomLevel;

    store.set('pendingTokenPos', { x: worldX, y: worldY });

    tokenLabelInput.value = '';
    if (tokenIconSelect) tokenIconSelect.value = '';
    tokenColorInput.value = store.get('tokenColor');
    if (tokenNotesInput) tokenNotesInput.value = '';
    tokenLabelModal.style.display = 'block';
    tokenLabelInput.focus();
}

export function confirmTokenLabel() {
    const label = tokenLabelInput.value.trim();
    const icon = tokenIconSelect ? tokenIconSelect.value : '';
    const color = tokenColorInput.value || store.get('tokenColor');
    const notes = tokenNotesInput ? tokenNotesInput.value.trim() : '';

    store.set('tokenColor', color);

    const editingTokenIndex = store.get('editingTokenIndex');
    const wasEditing = editingTokenIndex !== -1;

    if (editingTokenIndex !== -1) {
        const tokens = store.get('tokens');
        if (editingTokenIndex < 0 || editingTokenIndex >= tokens.length) {
            store.set('editingTokenIndex', -1);
            store.set('selectedTokenIndex', -1);
        } else {
            const token = tokens[editingTokenIndex];
            token.label = label;
            token.icon = icon;
            token.color = color;
            token.notes = notes;
            store.set('selectedTokenIndex', editingTokenIndex);
            store.set('editingTokenIndex', -1);
        }
    } else {
        const pendingTokenPos = store.get('pendingTokenPos');
        if (!pendingTokenPos) return;
        const tokens = store.get('tokens');
        const nextZIndex = store.get('nextZIndex');
        const newToken = {
            x: pendingTokenPos.x,
            y: pendingTokenPos.y,
            color: color,
            label: label,
            icon: icon,
            notes: notes,
            zIndex: nextZIndex,
        };
        store.set('nextZIndex', nextZIndex + 1);
        tokens.push(newToken);
        addTokenToIndex(newToken, tokens.length - 1);
        store.set('selectedTokenIndex', tokens.length - 1);
        store.set('pendingTokenPos', null);
        if (toggleAddTokenModeFn) toggleAddTokenModeFn();
    }

    closeTokenLabelModal();
    saveState();
    requestRedraw();
    pushHistory();

    const msg = wasEditing ? 'Token updated' : 'Token added (click and drag to move)';
    showStatus(msg, 'success');
}

export function closeTokenLabelModal() {
    tokenLabelModal.style.display = 'none';
    store.set('pendingTokenPos', null);
    store.set('editingTokenIndex', -1);
}

export function handleCanvasDoubleClick(event, canvas) {
    if (!store.get('mapImage') || store.get('isAddingToken') || store.get('isRemovingToken')) return;
    hideTooltip();

    const { x, y } = getCanvasCoords(event, canvas);
    const idx = findTokenAtPosition(x, y);
    if (idx !== -1) {
        store.set('editingTokenIndex', idx);
        const tokens = store.get('tokens');
        const token = tokens[idx];
        tokenLabelInput.value = token.label || '';
        if (tokenIconSelect) tokenIconSelect.value = token.icon || '';
        tokenColorInput.value = token.color || store.get('tokenColor');
        if (tokenNotesInput) tokenNotesInput.value = token.notes || '';
        tokenLabelModal.style.display = 'block';
        tokenLabelInput.focus();
    }
}
