import { describe, it, expect } from 'vitest';
import { GridScaleDetector } from '../src/core/mosaic/GridScaleDetector.js';
import { ExactCellSampler } from '../src/core/mosaic/ExactCellSampler.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

/**
 * Tests for GridScaleDetector.refinePhase — the Pathway B phase self-check.
 *
 * The detector's phase estimate can sit ±1px off the true art-pixel grid
 * (especially on AI-generated art with soft pixels). refinePhase re-tests
 * ±1px candidates on a small probe region and keeps whichever offset
 * minimizes sampler mixel warnings — but only when it is clearly (>10%)
 * cleaner, so it can never make sampling worse.
 */

// 96x96, 8px cells, TRUE grid phase (1,1):
// red block cells 0..2, green block cells 3..5, black elsewhere.
function makePhaseImage() {
  const width = 96, height = 96;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = Math.floor((x - 1) / 8), cy = Math.floor((y - 1) / 8);
      let r = 0, g = 0, b = 0;
      if (cx >= 0 && cx <= 2 && cy >= 0 && cy <= 2) { r = 255; }
      else if (cx >= 3 && cx <= 5 && cy >= 3 && cy <= 5) { g = 255; }
      const idx = (y * width + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function probeMixels(img, offsetX, offsetY, cellSize) {
  // Mirror the probe geometry refinePhase uses: origin one px inside the
  // detected offset, up to 10x10 cells.
  const px0 = Math.max(0, offsetX - 1), py0 = Math.max(0, offsetY - 1);
  const cells = Math.min(10, Math.floor((img.width - px0) / cellSize), Math.floor((img.height - py0) / cellSize));
  const pw = cells * cellSize, ph = cells * cellSize;
  const probe = { width: pw, height: ph, data: new Uint8ClampedArray(pw * ph * 4) };
  for (let y = 0; y < ph; y++) {
    const sRow = ((py0 + y) * img.width + px0) * 4;
    probe.data.set(img.data.subarray(sRow, sRow + pw * 4), y * pw * 4);
  }
  return ExactCellSampler.sample(probe, {
    cellSize, offsetX: offsetX - px0, offsetY: offsetY - py0
  }).mixelWarnings.length;
}

describe('GridScaleDetector.refinePhase — phase self-check', () => {
  it('adopts a clearly cleaner phase when detection is off', () => {
    const img = makePhaseImage();
    const before = probeMixels(img, 0, 0, 8);

    const r = GridScaleDetector.refinePhase(img, { offsetX: 0, offsetY: 0 }, 8);

    expect(r.refined).toBe(true);
    const after = probeMixels(img, r.offsetX, r.offsetY, 8);
    expect(after).toBeLessThan(before * 0.9);
  });

  it('leaves a correct detection untouched (never worse)', () => {
    const img = makePhaseImage();

    const r = GridScaleDetector.refinePhase(img, { offsetX: 1, offsetY: 1 }, 8);

    expect(r).toEqual({ offsetX: 1, offsetY: 1, refined: false });
  });

  it('falls back safely on tiny images', () => {
    const tiny = { width: 4, height: 4, data: new Uint8ClampedArray(4 * 4 * 4) };

    expect(GridScaleDetector.refinePhase(tiny, { offsetX: 0, offsetY: 0 }, 8))
      .toEqual({ offsetX: 0, offsetY: 0, refined: false });
    expect(GridScaleDetector.refinePhase(null, { offsetX: 3, offsetY: 2 }, 8))
      .toEqual({ offsetX: 3, offsetY: 2, refined: false });
  });

  it('integration: Pathway B exposes phaseRefined and keeps clean grids unrefined', () => {
    // 64x64 source, 8px TRUE cells; red 4x4 block at 8px-cells (2..5,2..5).
    const width = 64, height = 64, cell = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        const idx = (y * width + x) * 4;
        data[idx] = (cx >= 2 && cx <= 5 && cy >= 2 && cy <= 5) ? 255 : 0;
        data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      cleanEdgePurifier: false
    });

    expect(typeof res.phaseRefined).toBe('boolean');
    // Detection is already clean here (0 mixel warnings) -> no refinement.
    expect(res.phaseRefined).toBe(false);
    expect(res.appliedCellSize).toBe(16);
  });
});
