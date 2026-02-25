import { store } from '../state/index.js';
import { hexToRgb } from '../util/color.js';

function drawHex(ctx, hex, debugMode) {
    ctx.beginPath();
    const vertices = hex.vertices;
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    if (debugMode) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hex.id, hex.x, hex.y);

        ctx.fillStyle = 'yellow';
        for (const vertex of vertices) {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export function drawGridLayer(ctx, canvasWidth) {
    const hexes = store.get('hexes');
    const hexSize = store.get('hexSize');
    const gridColor = store.get('gridColor');
    const gridThickness = store.get('gridThickness');
    const fogColor = store.get('fogColor');
    const fogOpacity = store.get('fogOpacity');
    const debugMode = store.get('debugMode');
    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');

    // Visible bounds for culling
    const viewLeft = -panX / zoomLevel;
    const viewTop = -panY / zoomLevel;
    const viewRight = viewLeft + canvasWidth / zoomLevel;
    const viewBottom = viewTop + canvasWidth / zoomLevel;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = gridThickness;
    const { r, g, b } = hexToRgb(fogColor);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fogOpacity})`;

    for (const hex of hexes) {
        if (
            hex.x + hexSize < viewLeft ||
            hex.x - hexSize > viewRight ||
            hex.y + hexSize < viewTop ||
            hex.y - hexSize > viewBottom
        ) {
            continue;
        }

        if (!hex.revealed) {
            drawHex(ctx, hex, debugMode);
            ctx.fill();
            ctx.stroke();
        } else if (debugMode) {
            ctx.save();
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            drawHex(ctx, hex, false);
            ctx.stroke();
            ctx.restore();
        }
    }
}
