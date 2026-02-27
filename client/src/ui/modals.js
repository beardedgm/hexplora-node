import { getEl, addListener } from '../util/dom.js';
import { closeTokenLabelModal, confirmTokenLabel } from '../tokens/tokenModal.js';

export function setupModals() {
    const tokenLabelModalClose = getEl('token-label-modal-close');
    const tokenLabelCancel = getEl('token-label-cancel');
    const tokenLabelConfirmBtn = getEl('token-label-confirm');
    const tokenLabelInput = getEl('token-label-input');
    const libraryModal = getEl('library-modal');
    const libraryModalClose = getEl('library-modal-close');
    const libraryModalCloseBtn = getEl('library-modal-close-btn');
    const tokenLabelModal = getEl('token-label-modal');

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

    // Help modal
    const helpModal = getEl('help-modal');
    const helpModalClose = getEl('help-modal-close');
    const helpModalCloseBtn = getEl('help-modal-close-btn');
    const helpBtn = getEl('help-btn');

    if (helpModalClose) addListener(helpModalClose, 'click', () => { if (helpModal) helpModal.style.display = 'none'; });
    if (helpModalCloseBtn) addListener(helpModalCloseBtn, 'click', () => { if (helpModal) helpModal.style.display = 'none'; });
    if (helpBtn) addListener(helpBtn, 'click', () => {
        if (helpModal) helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
    });

    // Close on outside click
    addListener(window, 'click', (event) => {
        if (event.target === tokenLabelModal) closeTokenLabelModal();
        if (event.target === libraryModal) libraryModal.style.display = 'none';
        if (event.target === helpModal) helpModal.style.display = 'none';
    });
}
