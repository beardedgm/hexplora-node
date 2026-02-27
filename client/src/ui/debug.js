import { getEl } from '../util/dom.js';

let debugInfo = null;

export function setupDebug() {
    debugInfo = getEl('debug-info');
}

export function log(message) {
    if (debugInfo) {
        const timestamp = new Date().toTimeString().split(' ')[0];
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        debugInfo.prepend(logEntry);

        while (debugInfo.children.length > 50) {
            debugInfo.removeChild(debugInfo.lastChild);
        }
    }

    console.log(message);
}
