import { store } from '../state/index.js';

export function drawMapLayer(ctx) {
    const mapImage = store.get('mapImage');
    if (!mapImage) return;

    const scaleRatio = store.get('mapScale') / 100;
    const scaledWidth = mapImage.width * scaleRatio;
    const scaledHeight = mapImage.height * scaleRatio;

    ctx.drawImage(
        mapImage,
        0, 0, mapImage.width, mapImage.height,
        0, 0, scaledWidth, scaledHeight,
    );
}
