// Worker thread for tile/overview rendering. Loaded from tileRenderPool via worker_threads.
// Must be CJS-compatible (no top-level await, no import.meta).

import { workerData, parentPort } from 'node:worker_threads';
import { renderTileRaw, renderOverviewRaw } from './terrainRender.js';
import type { TerrainSource } from './terrainRender.js';

const src: TerrainSource = workerData as TerrainSource;

// Tiles are rendered at 512×512 (TILE_PX * TILE_SS = 256*2).
// We no longer downscale to 256 — serving at native 512px means Pixi never
// has to upscale them, eliminating pixelation at high zoom levels.
const TILE_PX = 256;
const TILE_SS = 2; // render dim = TILE_PX * TILE_SS = 512

async function handleMessage(msg: { id: number; kind: 'tile' | 'overview'; z?: number; x?: number; y?: number; variant?: string }) {
  const { default: sharp } = await import('sharp');

  if (msg.kind === 'tile') {
    const { z = 0, x = 0, y = 0 } = msg;
    const dim = TILE_PX * TILE_SS; // 512
    const raw = renderTileRaw(src, z, x, y);
    // Serve at full 512px — no downscale. Sharp still handles RGB→WebP conversion.
    const buf = await sharp(raw, { raw: { width: dim, height: dim, channels: 3 } })
      .webp({ quality: 88, effort: 2 })
      .toBuffer();
    parentPort!.postMessage({ id: msg.id, buf }, [buf.buffer as ArrayBuffer]);
  } else {
    const variant = msg.variant ?? 'default';
    const { raw, imgW, imgH } = renderOverviewRaw(src, variant);
    const targetSize = variant === 'mobile' ? 1600 : 2600;
    const blurAmount = variant === 'mobile' ? 0.3 : 0.2;
    const quality = variant === 'mobile' ? 72 : 80;
    const buf = await sharp(raw, { raw: { width: imgW, height: imgH, channels: 3 } })
      .resize(targetSize, targetSize, { kernel: 'lanczos3' })
      .blur(blurAmount)
      .webp({ quality, effort: 2 })
      .toBuffer();
    parentPort!.postMessage({ id: msg.id, buf }, [buf.buffer as ArrayBuffer]);
  }
}

parentPort!.on('message', (msg) => {
  handleMessage(msg).catch((err) => {
    parentPort!.postMessage({ id: msg.id, err: String(err) });
  });
});
