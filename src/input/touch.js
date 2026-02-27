import { store } from '../state/index.js';
import { ZOOM_MIN, ZOOM_MAX } from '../state/defaults.js';
import { getCanvasCoords } from '../canvas/coordinates.js';
import { findTokenAtPosition } from '../hex/math.js';
import { requestRedraw } from '../canvas/renderer.js';
import { addListener } from '../util/dom.js';
import { hideTooltip, showTooltipAt, setHoveredTokenIndex, getHoveredTokenIndex, getTooltipTimer, setTooltipTimer } from '../ui/tooltip.js';
import { startPanning, stopPanning } from './panZoom.js';
import { handleMouseMove } from './mouse.js';
import { addTokenAtPosition, handleCanvasDoubleClick } from '../tokens/tokenModal.js';

const TAP_TIME_LIMIT = 300;
const TAP_MOVE_LIMIT = 5;
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
let activeTouches = {};

let canvas = null;

export function setupTouchHandlers(canvasEl) {
    canvas = canvasEl;

    addListener(canvas, 'touchstart', handleTouchStart, { passive: false });
    addListener(canvas, 'touchmove', handleTouchMove, { passive: false });
    addListener(canvas, 'touchend', handleTouchEnd, { passive: false });
    addListener(canvas, 'touchcancel', handleTouchCancel, { passive: false });
}

function handleTouchStart(event) {
    if (!store.get('mapImage')) return;
    event.preventDefault();
    hideTooltip();

    for (const t of event.changedTouches) {
        activeTouches[t.identifier] = {
            startX: t.clientX,
            startY: t.clientY,
            startTime: Date.now(),
            moved: false,
        };
    }

    if (event.touches.length === 1) {
        const touch = event.touches[0];
        startPanning({
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            ctrlKey: false,
            metaKey: false,
            isTouch: true,
        });

        const { x, y } = getCanvasCoords(touch, canvas);
        const tokenIdx = findTokenAtPosition(x, y);
        const tokens = store.get('tokens');
        if (tokenIdx !== -1 && tokens[tokenIdx].notes) {
            const notes = tokens[tokenIdx].notes;
            setHoveredTokenIndex(tokenIdx);
            const timer = getTooltipTimer();
            if (timer) {
                clearTimeout(timer);
                setTooltipTimer(null);
            }
            const newTimer = setTimeout(() => {
                if (getHoveredTokenIndex() === tokenIdx) {
                    showTooltipAt(touch.clientX, touch.clientY, notes);
                    setTooltipTimer(null);
                }
            }, 500);
            setTooltipTimer(newTimer);
        }
    } else if (event.touches.length >= 2) {
        store.set('isPinching', true);
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        store.update({
            pinchStartDist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
            pinchStartZoom: store.get('zoomLevel'),
            pinchCenter: {
                clientX: (t1.clientX + t2.clientX) / 2,
                clientY: (t1.clientY + t2.clientY) / 2,
            },
        });
    }
}

function handleTouchMove(event) {
    if (!store.get('mapImage')) return;
    event.preventDefault();

    for (const t of event.changedTouches) {
        const info = activeTouches[t.identifier];
        if (info) {
            const dx = t.clientX - info.startX;
            const dy = t.clientY - info.startY;
            if (Math.hypot(dx, dy) > TAP_MOVE_LIMIT) {
                info.moved = true;
            }
        }
    }

    if (store.get('isPinching') && event.touches.length >= 2) {
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const prevZoom = store.get('zoomLevel');
        const pinchStartZoom = store.get('pinchStartZoom');
        const pinchStartDist = store.get('pinchStartDist');
        const panX = store.get('panX');
        const panY = store.get('panY');
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * (dist / pinchStartDist)));
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const { x: mx, y: my } = getCanvasCoords({ clientX: midX, clientY: midY }, canvas);
        const currentMouseInWorldX = (mx - panX) / prevZoom;
        const currentMouseInWorldY = (my - panY) / prevZoom;
        const newMouseInWorldX = (mx - panX) / newZoom;
        const newMouseInWorldY = (my - panY) / newZoom;
        store.update({
            panX: panX - (currentMouseInWorldX - newMouseInWorldX) * newZoom,
            panY: panY - (currentMouseInWorldY - newMouseInWorldY) * newZoom,
            zoomLevel: newZoom,
            pinchCenter: { clientX: midX, clientY: midY },
        });
        requestRedraw();
    } else if (event.touches.length === 1) {
        const touch = event.touches[0];
        const timer = getTooltipTimer();
        if (timer) {
            clearTimeout(timer);
            setTooltipTimer(null);
        }
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function handleTouchEnd(event) {
    event.preventDefault();

    const draggingBeforeStop = store.get('isDraggingToken');
    const wasPinching = store.get('isPinching');

    stopPanning();

    if (store.get('isPinching') && event.touches.length < 2) {
        store.set('isPinching', false);
    }

    for (const touch of event.changedTouches) {
        const info = activeTouches[touch.identifier];
        if (!info) continue;
        const duration = Date.now() - info.startTime;
        const wasDragging = draggingBeforeStop && info.moved;
        const shouldTap = !info.moved && duration < TAP_TIME_LIMIT && !wasPinching && !wasDragging;
        if (shouldTap) {
            const synthetic = { clientX: touch.clientX, clientY: touch.clientY };
            const { x, y } = getCanvasCoords(synthetic, canvas);
            const now = Date.now();
            const timeSince = now - lastTapTime;
            const dist = Math.hypot(x - lastTapX, y - lastTapY);
            if (timeSince < TAP_TIME_LIMIT && dist < 20) {
                const tokenIdx = findTokenAtPosition(x, y);
                if (tokenIdx !== -1) {
                    handleCanvasDoubleClick(synthetic, canvas);
                } else {
                    // Trigger click via dispatching event
                    canvas.dispatchEvent(new MouseEvent('click', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        bubbles: true,
                    }));
                }
                lastTapTime = 0;
                lastTapX = 0;
                lastTapY = 0;
            } else {
                canvas.dispatchEvent(new MouseEvent('click', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                }));
                lastTapTime = now;
                lastTapX = x;
                lastTapY = y;
            }
        }
        delete activeTouches[touch.identifier];
    }
}

function handleTouchCancel() {
    stopPanning();
    store.set('isPinching', false);
    hideTooltip();
    activeTouches = {};
}
