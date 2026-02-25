import { store } from '../state/index.js';
import { hexToRgb } from '../util/color.js';

export function drawTokenLayer(ctx, canvasWidth) {
    const tokens = store.get('tokens');
    const hexSize = store.get('hexSize');
    const tokenColor = store.get('tokenColor');
    const selectedTokenIndex = store.get('selectedTokenIndex');
    const debugMode = store.get('debugMode');
    const panX = store.get('panX');
    const panY = store.get('panY');
    const zoomLevel = store.get('zoomLevel');
    const hexes = store.get('hexes');
    const revealedHexes = store.get('revealedHexes');
    const revealMode = store.get('revealMode');

    // Visible bounds for culling
    const viewLeft = -panX / zoomLevel;
    const viewTop = -panY / zoomLevel;
    const viewRight = viewLeft + canvasWidth / zoomLevel;
    const viewBottom = viewTop + canvasWidth / zoomLevel;

    // Draw tokens in z-index order
    const tokensToDraw = [...tokens].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const token of tokensToDraw) {
        const isSelected = token._index === selectedTokenIndex;

        if (
            token.x + hexSize < viewLeft ||
            token.x - hexSize > viewRight ||
            token.y + hexSize < viewTop ||
            token.y - hexSize > viewBottom
        ) {
            continue;
        }

        ctx.beginPath();
        ctx.arc(token.x, token.y, hexSize * 0.4, 0, Math.PI * 2);

        ctx.fillStyle = token.color || tokenColor;
        ctx.fill();

        if (isSelected) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            const color = token.color || tokenColor;
            const rgb = hexToRgb(color);
            const darkerR = Math.floor(rgb.r * 0.6);
            const darkerG = Math.floor(rgb.g * 0.6);
            const darkerB = Math.floor(rgb.b * 0.6);
            ctx.strokeStyle = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (token.icon) {
            const iconSize = hexSize * 0.6;
            const iconYOffset = hexSize * 0.05;
            ctx.font = `${iconSize}px "Material Symbols Outlined"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(token.icon, token.x, token.y + iconYOffset);
        }

        if (token.label) {
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            const textY = token.y + hexSize * 0.5;
            ctx.strokeText(token.label, token.x, textY);
            ctx.fillText(token.label, token.x, textY);
        }
    }

    // Debug overlay
    if (debugMode) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Total Hexes: ${hexes.length}`, 20, 20);
        ctx.fillText(`Revealed: ${Object.keys(revealedHexes).length}`, 20, 40);
        ctx.fillText(`Mode: ${revealMode ? 'Reveal' : 'Hide'}`, 20, 60);
        ctx.fillText(`Zoom: ${(zoomLevel * 100).toFixed(0)}%`, 20, 80);
    }
}
