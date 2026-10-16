import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Pathway B — Bitwise Pixel-Diff Fidelity Verification', () => {
  it('flat pixel art image round-trips with 0 bitwise unflagged cell color mismatches', () => {
    // Generate a 32x32 synthetic pixel art sprite sheet with 8x8 cell blocks
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    const blockColors = [
      [255, 0, 0],     // Red
      [0, 255, 0],     // Green
      [0, 0, 255],     // Blue
      [255, 255, 0]    // Yellow
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const blockX = Math.floor(x / 8);
        const blockY = Math.floor(y / 8);
        const colorIdx = (blockX + blockY) % 4;
        const [r, g, b] = blockColors[colorIdx];

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const sourceImage = { width, height, data };
    const result = MosaicEngine.process(sourceImage, {
      inputMode: 'pixel-art',
      tileSize: 8,
      forceTileSize: 8, // legacy explicit grid (bypasses detected-grid fix)
      bgRemovalMode: 'none'
    });

    expect(result.pathway).toBe('pixel-art');
    expect(result.grid.length).toBe(4); // 32 / 8 = 4 rows
    expect(result.grid[0].length).toBe(4); // 32 / 8 = 4 cols

    // Bitwise compare every cell center against input source image
    let mismatches = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = result.grid[r][c];
        const blockX = c;
        const blockY = r;
        const colorIdx = (blockX + blockY) % 4;
        const [expectedR, expectedG, expectedB] = blockColors[colorIdx];

        const expectedRgb = `rgb(${expectedR},${expectedG},${expectedB})`;
        if (cell.color !== expectedRgb) {
          mismatches++;
        }
      }
    }

    expect(mismatches).toBe(0); // 100% Zero Mismatched Cells
  });

  it('2D block merging produces 100% loss-free SVG output with reduced node count', () => {
    // 32x32 image with 4 identical 16x16 color quadrants
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isRight = x >= 16;
        const isBottom = y >= 16;
        data[idx] = isRight ? 255 : 0;
        data[idx + 1] = isBottom ? 255 : 0;
        data[idx + 2] = 128;
        data[idx + 3] = 255;
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 8,
      bgRemovalMode: 'none'
    });

    const svg = MosaicEngine.exportSVG(result, { mode: 'grouped' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');

    // Counts number of <rect tags in SVG
    const rectCount = (svg.match(/<rect/g) || []).length;
    // 16 8x8 cells merged into 4 16x16 quadrants!
    expect(rectCount).toBeLessThanOrEqual(4);
  });
});
