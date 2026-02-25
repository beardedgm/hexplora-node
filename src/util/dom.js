const eventHandlers = [];

export function getEl(id, required = false) {
    const el = document.getElementById(id);
    if (!el) {
        console.error(`Element with id '${id}' not found`);
        if (required) {
            throw new Error(`Required element '${id}' not found`);
        }
    }
    return el;
}

export function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    eventHandlers.push(() => target.removeEventListener(type, handler, options));
}

export function cleanupEventListeners() {
    for (const off of eventHandlers) {
        off();
    }
    eventHandlers.length = 0;
}
