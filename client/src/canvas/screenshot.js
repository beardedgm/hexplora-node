import { showStatus } from '../ui/status.js';

export function downloadMapImage(mapCanvas, gridCanvas, tokenCanvas, drawMap) {
    drawMap(); // ensure latest view
    const outCanvas = document.createElement('canvas');
    outCanvas.width = mapCanvas.width;
    outCanvas.height = mapCanvas.height;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(mapCanvas, 0, 0);
    outCtx.drawImage(gridCanvas, 0, 0);
    outCtx.drawImage(tokenCanvas, 0, 0);
    const link = document.createElement('a');
    link.href = outCanvas.toDataURL('image/png');
    link.download = 'hexplora-map.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showStatus('Screenshot downloaded', 'success');
}
