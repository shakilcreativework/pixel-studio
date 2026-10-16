import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

/**
 * Regression tests for the Pathway B detected-grid fix.
 *
 * Bug: processPathwayB let the UI tileSize (default 16px) override the
 * GridScaleDetector's detected NATIVE cell size and phase offsets. When an
 * AI-generated image's true cells (e.g. 6px) didn't align with the forced
 * 16px sampling grid, center-pixel sampling straddled true cells and picked
 * blended edge colors — the reported "Already Pixel Art gives imperfect
 * output" symptoms (wasted colors, continuous shading, blurs).
 *
 * Fix: Pathway B ALWAYS samples at the detected native grid (+16px
 * microstock floor via integer upscale). options.tileSize is ignored unless
 * options.forceTileSize is explicitly set (legacy escape hatch).
 */

const INPUT_COLORS = [
  [255, 0, 0],    // red
  [0, 255, 0],    // green
  [0, 0, 255],    // blue
  [255, 255, 0]   // yellow
];

// 96x96 synthetic image with a KNOWN native cell size of 6px:
// 2x2 repeating flat-color blocks with hard edges, phase-aligned at 0.
function makeNative6pxImage() {
  const width = 96;
  const height = 96;
  const nativeCell = 6;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockX = Math.floor(x / nativeCell) % 2;
      const blockY = Math.floor(y / nativeCell) % 2;
      const [r, g, b] = INPUT_COLORS[blockY * 2 + blockX];
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function outputColorsAreOnlyInputColors(tiles) {
  return tiles
    .filter(t => !t.isRemoved)
    .every(t => {
      const m = t.color.match(/rgb\((\d+),(\d+),(\d+)\)/);
      if (!m) return false;
      const [r, g, b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      return INPUT_COLORS.some(c => c[0] === r && c[1] === g && c[2] === b);
    });
}

describe('Pathway B — detected native grid (regression)', () => {
  it('ignores UI tileSize and samples the detected 6px grid (18px after 16px floor)', () => {
    const source = makeNative6pxImage();

    // UI default tileSize: 16 — must NOT drive the sampling grid anymore.
    const result = MosaicEngine.processPathwayB(source, {
      inputMode: 'pixel-art',
      tileSize: 16,
      bgRemovalMode: 'none'
    });

    expect(result.pathway).toBe('pixel-art');
    // Detection stats
    expect(result.detectedCellSize).toBe(6);
    expect(result.appliedCellSize).toBe(18); // 6px * ceil(16/6)=3
    expect(result.upscaleFactor).toBe(3);
    expect(result.minCellEnforced).toBe(true);
    // Grid follows the detected+floored grid: floor(96/18) = 5,
    // NOT the 16px UI grid (which would be 96/16 = 6).
    expect(result.grid.length).toBe(5);
    expect(result.grid[0].length).toBe(5);
    expect(result.grid.length).not.toBe(6);
    // Zero blended colors: every output tile color is an input flat color.
    expect(result.tiles.length).toBeGreaterThan(0);
    expect(outputColorsAreOnlyInputColors(result.tiles)).toBe(true);
  });

  it('forceTileSize escape hatch restores legacy explicit-grid behavior', () => {
    const source = makeNative6pxImage();

    const result = MosaicEngine.processPathwayB(source, {
      inputMode: 'pixel-art',
      tileSize: 16,
      forceTileSize: 16,
      bgRemovalMode: 'none'
    });

    // Legacy behavior: sampling grid driven by the explicit size.
    expect(result.grid.length).toBe(6); // 96/16
    expect(result.grid[0].length).toBe(6);
    expect(result.appliedCellSize).toBe(16);
    expect(result.minCellEnforced).toBe(false);
  });

  it('minOutputCellSize is settable (floor disabled below native size)', () => {
    const source = makeNative6pxImage();

    const result = MosaicEngine.processPathwayB(source, {
      inputMode: 'pixel-art',
      tileSize: 16,
      minOutputCellSize: 6,
      bgRemovalMode: 'none'
    });

    expect(result.detectedCellSize).toBe(6);
    expect(result.appliedCellSize).toBe(6); // no upscale: 6 >= 6
    expect(result.upscaleFactor).toBe(1);
    expect(result.minCellEnforced).toBe(false);
    expect(result.grid.length).toBe(16); // 96/6 native grid
    expect(result.grid[0].length).toBe(16);
    expect(outputColorsAreOnlyInputColors(result.tiles)).toBe(true);
  });

  it('already-16px native art is untouched by the floor', () => {
    // 64x64 image with 16px flat blocks.
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const block = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
        const [r, g, b] = block ? [0, 136, 216] : [255, 255, 255];
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }

    const result = MosaicEngine.processPathwayB({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 32, // ignored: must not drive sampling
      bgRemovalMode: 'none'
    });

    expect(result.detectedCellSize).toBe(16);
    expect(result.appliedCellSize).toBe(16);
    expect(result.minCellEnforced).toBe(false);
    expect(result.grid.length).toBe(4);
    expect(result.grid[0].length).toBe(4);
  });
});
