import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Pixel-Perfect Mosaic Background Removal Pipeline', () => {
  // Helper to create synthetic ImageData (e.g. 16x16 with black background and a central yellow star shape)
  function createTestImage(width = 16, height = 16, pattern = 'star') {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Default pure black background #000000
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;

        if (pattern === 'star') {
          // Cross / Star pattern: center at (8, 8)
          const dx = Math.abs(x - 8);
          const dy = Math.abs(y - 8);
          if (dx + dy <= 5) {
            // Yellow star core #fbbf24
            data[idx] = 251;
            data[idx + 1] = 191;
            data[idx + 2] = 36;
            data[idx + 3] = 255;
          }
        } else if (pattern === 'donut') {
          // Outer square ring with inner black hole (enclosed pocket)
          if (x >= 3 && x <= 12 && y >= 3 && y <= 12) {
            if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
              // Enclosed black center
              data[idx] = 0;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
            } else {
              // Bright green artwork #10b981
              data[idx] = 16;
              data[idx + 1] = 185;
              data[idx + 2] = 129;
            }
          }
        }
      }
    }

    return { width, height, data };
  }

  it('Stage 1 & 2: classifies background, boundary, and design and removes black background while preserving star shape', () => {
    const img = createTestImage(16, 16, 'star');
    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      perfectCorners: true,
      restoreEdgeColors: true,
      snapEdgeColors: true
    });

    expect(result.tiles.length).toBeGreaterThan(0);
    // Background tiles removed, only artwork tiles remaining
    for (const tile of result.tiles) {
      // None of the remaining tiles should be pure black background
      expect(tile.color).not.toBe('rgb(0,0,0)');
    }
  });

  it('Stage 3: contiguous outer edge mode protects enclosed internal pockets while global mode removes them', () => {
    const donutImg = createTestImage(16, 16, 'donut');

    // 1. Contiguous (Outer Edge Safe) Mode: enclosed center must NOT be removed
    const contiguousResult = MosaicEngine.process(donutImg, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25
    });

    // Center tile at (7, 7) should exist in contiguous mode because it is enclosed
    const hasCenterContiguous = contiguousResult.tiles.some(t => Math.abs(t.x - 8) <= 1 && Math.abs(t.y - 8) <= 1);
    expect(hasCenterContiguous).toBe(true);

    // 2. Global (Everywhere) Mode: enclosed center MUST be removed
    const globalResult = MosaicEngine.process(donutImg, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'global',
      colorTolerance: 25
    });

    // In global mode, all black tiles including the center are removed
    const hasCenterGlobal = globalResult.tiles.some(t => Math.abs(t.x - 8) <= 1 && Math.abs(t.y - 8) <= 1);
    expect(hasCenterGlobal).toBe(false);
  });

  it('Stage 4: post-removal passes run properly with Strict Clean Mode without losing edge quality', () => {
    const img = createTestImage(16, 16, 'star');

    // Run with Strict Clean Mode ON and edge quality options ON
    const strictResult = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      strictMode: true,
      perfectCorners: true,
      restoreEdgeColors: true,
      snapEdgeColors: true,
      deFringe: false
    });

    expect(strictResult.tiles.length).toBeGreaterThan(0);
    // Star tips must be preserved and not clipped
    expect(strictResult.tiles.length).toBeGreaterThanOrEqual(12);
  });

  it('QA Diagnostic overlay: generates overlay metadata and renders cleanly to canvas context', () => {
    const img = createTestImage(16, 16, 'star');
    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      qaOverlay: true
    });

    expect(result.qaOverlay).toBe(true);
    expect(Array.isArray(result.qaMismatches)).toBe(true);

    // Mock canvas 2D context
    const mockCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1
    };

    expect(() => MosaicEngine.renderToCanvas(result, mockCtx)).not.toThrow();
  });

  it('Determinism: running removal twice on the same image with same settings produces byte-identical output', () => {
    const img = createTestImage(16, 16, 'star');
    const options = {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      perfectCorners: true,
      restoreEdgeColors: true,
      snapEdgeColors: true
    };

    const res1 = MosaicEngine.process(img, options);
    const res2 = MosaicEngine.process(img, options);

    expect(JSON.stringify(res1.tiles)).toEqual(JSON.stringify(res2.tiles));
  });

  it('Harmonizes multi-sprite canvas with multiple distinct star/cross shapes', () => {
    // 32x32 canvas with multiple isolated star shapes
    const data = new Uint8ClampedArray(32 * 32 * 4);
    // Background pure black
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    // Draw Shape 1: Star at (8, 8)
    for (let y = 4; y <= 12; y++) {
      for (let x = 4; x <= 12; x++) {
        if (Math.abs(x - 8) + Math.abs(y - 8) <= 4) {
          const idx = (y * 32 + x) * 4;
          data[idx] = 255;
          data[idx + 1] = 220;
          data[idx + 2] = 0;
        }
      }
    }

    // Draw Shape 2: Cross at (24, 24)
    for (let y = 20; y <= 28; y++) {
      for (let x = 20; x <= 28; x++) {
        if (x === 24 || y === 24) {
          const idx = (y * 32 + x) * 4;
          data[idx] = 255;
          data[idx + 1] = 220;
          data[idx + 2] = 0;
        }
      }
    }

    const multiImg = { width: 32, height: 32, data };
    const res = MosaicEngine.process(multiImg, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      perfectCorners: true,
      restoreEdgeColors: true,
      snapEdgeColors: true
    });

    // Both shapes should have background removed cleanly
    expect(res.tiles.length).toBeGreaterThan(20);
    // Verify no pure black background tiles survived
    const hasBlackBg = res.tiles.some(t => t.color === 'rgb(0,0,0)');
    expect(hasBlackBg).toBe(false);
  });

  it('Edge Trim: negative values shave outer contour, positive values preserve boundary', () => {
    const img = createTestImage(16, 16, 'star');

    const baseRes = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      colorTolerance: 25,
      edgeTrim: 0
    });

    const trimmedRes = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      colorTolerance: 25,
      edgeTrim: -1
    });

    expect(trimmedRes.tiles.length).toBeLessThan(baseRes.tiles.length);
  });

  it('Pure Color Matching: removes strictly pure #000000 / #ffffff and preserves near-colors (#010101 / #fefefe)', () => {
    // 4x4 image with pure black [0,0,0], near-black [1,1,1], pure white [255,255,255], and near-white [254,254,254]
    const data = new Uint8ClampedArray(4 * 4 * 4);
    // (0,0) pure black
    data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 255;
    // (1,0) near-black [1,1,1]
    data[4] = 1; data[5] = 1; data[6] = 1; data[7] = 255;
    // (2,0) pure white [255,255,255]
    data[8] = 255; data[9] = 255; data[10] = 255; data[11] = 255;
    // (3,0) near-white [254,254,254]
    data[12] = 254; data[13] = 254; data[14] = 254; data[15] = 255;

    const img = { width: 4, height: 4, data };

    // Test removing pure black with tolerance = 0 (exact match)
    const blackRes = MosaicEngine.process(img, {
      tileSize: 1,
      bgRemovalMode: 'black',
      colorTolerance: 0,
      bgRemovalScope: 'global'
    });

    // Pure black at (0,0) must be removed
    const hasPureBlack = blackRes.tiles.some(t => t.x === 0 && t.y === 0);
    expect(hasPureBlack).toBe(false);

    // Near black at (1,0) must be PRESERVED (not removed)
    const hasNearBlack = blackRes.tiles.some(t => t.x === 1 && t.y === 0);
    expect(hasNearBlack).toBe(true);

    // Test removing pure white with tolerance = 0
    const whiteRes = MosaicEngine.process(img, {
      tileSize: 1,
      bgRemovalMode: 'white',
      colorTolerance: 0,
      bgRemovalScope: 'global'
    });

    // Pure white at (2,0) must be removed
    const hasPureWhite = whiteRes.tiles.some(t => t.x === 2 && t.y === 0);
    expect(hasPureWhite).toBe(false);

    // Near white at (3,0) must be PRESERVED (not removed)
    const hasNearWhite = whiteRes.tiles.some(t => t.x === 3 && t.y === 0);
    expect(hasNearWhite).toBe(true);
  });

  it('Multi-Color Dynamic Removal: simultaneously removes multiple target colors in bgRemovalColors', () => {
    // 4x4 image with black, white, cyan, and red
    const data = new Uint8ClampedArray(4 * 4 * 4);
    // (0,0) pure black
    data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 255;
    // (1,0) pure white
    data[4] = 255; data[5] = 255; data[6] = 255; data[7] = 255;
    // (2,0) yellow artwork [255,220,0]
    data[8] = 255; data[9] = 220; data[10] = 0; data[11] = 255;
    // (3,0) green artwork [16,185,129]
    data[12] = 16; data[13] = 185; data[14] = 129; data[15] = 255;

    const img = { width: 4, height: 4, data };

    // Remove BOTH pure black and pure white simultaneously
    const res = MosaicEngine.process(img, {
      tileSize: 1,
      bgRemovalMode: 'custom',
      bgRemovalColors: ['#000000', '#ffffff'],
      colorTolerance: 0,
      bgRemovalScope: 'global'
    });

    // Pure black (0,0) and pure white (1,0) should both be removed
    expect(res.tiles.some(t => t.x === 0 && t.y === 0)).toBe(false);
    expect(res.tiles.some(t => t.x === 1 && t.y === 0)).toBe(false);

    // Yellow (2,0) and Green (3,0) artwork tiles must remain intact
    expect(res.tiles.some(t => t.x === 2 && t.y === 0)).toBe(true);
    expect(res.tiles.some(t => t.x === 3 && t.y === 0)).toBe(true);
  });
});
