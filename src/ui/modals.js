import { getEl, addListener } from '../util/dom.js';
import { showStatus } from './status.js';
import { closeTokenLabelModal, confirmTokenLabel } from '../tokens/tokenModal.js';

export function setupModals() {
    const exportModal = getEl('export-modal');
    const exportModalClose = getEl('export-modal-close');
    const tokenLabelModalClose = getEl('token-label-modal-close');
    const tokenLabelCancel = getEl('token-label-cancel');
    const tokenLabelConfirmBtn = getEl('token-label-confirm');
    const tokenLabelInput = getEl('token-label-input');
    const libraryModal = getEl('library-modal');
    const libraryModalClose = getEl('library-modal-close');
    const libraryModalCloseBtn = getEl('library-modal-close-btn');
    const tokenLabelModal = getEl('token-label-modal');

    // Export modal
    if (exportModalClose) {
        addListener(exportModalClose, 'click', () => {
            if (exportModal) exportModal.style.display = 'none';
        });
    }

    // Copy JSON
    const copyJsonBtn = getEl('copy-json-btn');
    const exportJsonTextarea = getEl('export-json');
    if (copyJsonBtn) {
        addListener(copyJsonBtn, 'click', async () => {
            try {
                if (exportJsonTextarea) exportJsonTextarea.select();
                await navigator.clipboard.writeText(exportJsonTextarea.value);
                showStatus('Copied to clipboard!', 'success');
            } catch (err) {
                console.error('Clipboard error:', err);
                showStatus('Failed to copy to clipboard', 'error');
            }
        });
    }

    // Download JSON
    const downloadJsonBtn = getEl('download-json-btn');
    if (downloadJsonBtn) {
        addListener(downloadJsonBtn, 'click', () => {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportJsonTextarea.value);
            const link = document.createElement('a');
            link.setAttribute('href', dataStr);
            link.setAttribute('download', 'hex-map-state.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showStatus('File downloaded', 'success');
        });
    }

    // Token modal
    if (tokenLabelModalClose) addListener(tokenLabelModalClose, 'click', closeTokenLabelModal);
    if (tokenLabelCancel) addListener(tokenLabelCancel, 'click', closeTokenLabelModal);
    if (tokenLabelConfirmBtn) addListener(tokenLabelConfirmBtn, 'click', confirmTokenLabel);
    if (tokenLabelInput) {
        addListener(tokenLabelInput, 'keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirmTokenLabel();
            }
        });
    }

    // Library modal
    if (libraryModalClose) addListener(libraryModalClose, 'click', () => { if (libraryModal) libraryModal.style.display = 'none'; });
    if (libraryModalCloseBtn) addListener(libraryModalCloseBtn, 'click', () => { if (libraryModal) libraryModal.style.display = 'none'; });

    // Close on outside click
    addListener(window, 'click', (event) => {
        if (event.target === exportModal) exportModal.style.display = 'none';
        if (event.target === tokenLabelModal) closeTokenLabelModal();
        if (event.target === libraryModal) libraryModal.style.display = 'none';
    });
}
