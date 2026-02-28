import { getEl, addListener } from '../util/dom.js';
import { closeTokenLabelModal, confirmTokenLabel } from '../tokens/tokenModal.js';

// --- Focus trapping for accessible modals ---

function trapFocus(modal) {
    const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handler(e) {
        if (e.key === 'Escape') {
            closeModal(modal);
            return;
        }
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    modal._focusTrapHandler = handler;
    modal.addEventListener('keydown', handler);
    first.focus();
}

function releaseFocus(modal) {
    if (modal._focusTrapHandler) {
        modal.removeEventListener('keydown', modal._focusTrapHandler);
        modal._focusTrapHandler = null;
    }
}

function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    trapFocus(modal);
}

function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    releaseFocus(modal);
}

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
    if (tokenLabelModalClose) addListener(tokenLabelModalClose, 'click', () => { closeTokenLabelModal(); releaseFocus(tokenLabelModal); });
    if (tokenLabelCancel) addListener(tokenLabelCancel, 'click', () => { closeTokenLabelModal(); releaseFocus(tokenLabelModal); });
    if (tokenLabelConfirmBtn) addListener(tokenLabelConfirmBtn, 'click', () => { confirmTokenLabel(); releaseFocus(tokenLabelModal); });
    if (tokenLabelInput) {
        addListener(tokenLabelInput, 'keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirmTokenLabel();
                releaseFocus(tokenLabelModal);
            }
        });
    }

    // Library modal
    if (libraryModalClose) addListener(libraryModalClose, 'click', () => closeModal(libraryModal));
    if (libraryModalCloseBtn) addListener(libraryModalCloseBtn, 'click', () => closeModal(libraryModal));

    // Help modal
    const helpModal = getEl('help-modal');
    const helpModalClose = getEl('help-modal-close');
    const helpModalCloseBtn = getEl('help-modal-close-btn');
    const helpBtn = getEl('help-btn');

    if (helpModalClose) addListener(helpModalClose, 'click', () => closeModal(helpModal));
    if (helpModalCloseBtn) addListener(helpModalCloseBtn, 'click', () => closeModal(helpModal));
    if (helpBtn) addListener(helpBtn, 'click', () => {
        if (helpModal) {
            if (helpModal.style.display === 'block') {
                closeModal(helpModal);
            } else {
                openModal(helpModal);
            }
        }
    });

    // Close on outside click
    addListener(window, 'click', (event) => {
        if (event.target === tokenLabelModal) { closeTokenLabelModal(); releaseFocus(tokenLabelModal); }
        if (event.target === libraryModal) closeModal(libraryModal);
        if (event.target === helpModal) closeModal(helpModal);
    });
}

// Export for use by library.js which opens the library modal
export { openModal, closeModal };
