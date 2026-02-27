export function getCanvasCoords(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

export function screenToWorld(x, y, panX, panY, zoomLevel) {
    return {
        x: (x - panX) / zoomLevel,
        y: (y - panY) / zoomLevel,
    };
}
