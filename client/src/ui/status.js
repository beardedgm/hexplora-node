import { getEl } from '../util/dom.js';

let statusIndicator = null;

export function setupStatus() {
    statusIndicator = getEl('status-indicator');
}

export function showStatus(message, type = 'info') {
    if (!statusIndicator) return;

    let bgColor = '#4299e1'; // info (blue)
    if (type === 'success') bgColor = '#48bb78';
    if (type === 'error') bgColor = '#e53e3e';
    if (type === 'warning') bgColor = '#ed8936';

    statusIndicator.style.backgroundColor = bgColor;
    statusIndicator.textContent = message;
    statusIndicator.style.display = 'inline-block';

    if (statusIndicator.hideTimeout) {
        clearTimeout(statusIndicator.hideTimeout);
    }

    statusIndicator.hideTimeout = setTimeout(() => {
        statusIndicator.style.display = 'none';
    }, 5000);
}

// Expose globally for the error handler in index.html
window.showStatus = showStatus;
