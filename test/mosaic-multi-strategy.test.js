/**
 * mosaic-multi-strategy.test.js
 * Comprehensive Unit Test Suite for Mosaic Multi-Strategy Pixel Art Vectorization System.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Specification.
 */

import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { SpriteIslandEngine } from '../src/core/mosaic/SpriteIslandEngine.js';
import { OrthogonalContourEngine } from '../src/core/mosaic/OrthogonalContourEngine.js';
import { AdaptiveQuadtreeEngine } from '../src/core/mosaic/AdaptiveQuadtreeEngine.js';
import { PixelArtResampler } from '../src/core/mosaic/PixelArtResampler.js';
import { MosaicStrategyDetector } from '../src/core/mosaic/MosaicStrategyDetector.js';

// Helper to create synthetic RGBA ImageData
function createSyntheticImageData(width, height, drawFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  drawFn((x, y, r, g, b, a = 255) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  });
  return { width, height, data };
}

describe('Mosaic Multi-Strategy System', () => {
  it('1. Default Pixel Art strategy preserves baseline 5-stage processing', () => {
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          setPixel(x, y, 255, 0, 0, 255);
        }
      }
    });

    const res = MosaicEngine.process(img, {
      mosaicStrategy: 'default-pixel-art',
      tileSize: 4
    });

    expect(res.grid).toBeDefined();
    expect(res.grid.length).toBe(4);
    expect(res.grid[0].length).toBe(4);
    expect(res.tiles).toBeDefined();
    expect(res.verificationReport).toBeDefined();
  });

  it('2. Multi-Sprite Island Grid strategy detects independent sprite islands', () => {
    // Synthetic sheet with 2 distinct sprite boxes separated by empty space
    const img = createSyntheticImageData(32, 16, (setPixel) => {
      // Sprite 1: Left 8x8 box at (2, 2)
      for (let y = 2; y < 10; y++) {
        for (let x = 2; x < 10; x++) {
          setPixel(x, y, 255, 0, 0, 255);
        }
      }
      // Sprite 2: Right 8x8 box at (20, 4)
      for (let y = 4; y < 12; y++) {
        for (let x = 20; x < 28; x++) {
          setPixel(x, y, 0, 255, 0, 255);
        }
      }
    });

    const res = SpriteIslandEngine.process(img, { tileSize: 4 });
    expect(res.islands).toBeDefined();
    expect(res.islands.length).toBe(2);

    // Verify per-island local bounding boxes
    expect(res.islands[0].minX).toBe(2);
    expect(res.islands[0].maxX).toBe(9);
    expect(res.islands[1].minX).toBe(20);
    expect(res.islands[1].maxX).toBe(27);

    // Verify MosaicEngine router dispatch
    const routed = MosaicEngine.process(img, {
      mosaicStrategy: 'island-grid',
      tileSize: 4
    });
    expect(routed.strategy).toBe('island-grid');
    expect(routed.islands.length).toBe(2);
  });

  it('3. Direct Orthogonal Contour strategy generates collinear merged orthogonal paths', () => {
    const img = createSyntheticImageData(16, 8, (setPixel) => {
      // Solid block of red pixels across 2 rows (y=2, 3)
      for (let y = 2; y < 4; y++) {
        for (let x = 2; x < 14; x++) {
          setPixel(x, y, 255, 0, 0, 255);
        }
      }
    });

    const res = OrthogonalContourEngine.process(img, {
      tileSize: 2,
      collinearMerge: true
    });

    expect(res.contours).toBeDefined();
    expect(res.contours.length).toBeGreaterThan(0);
    expect(res.contours[0].width).toBeGreaterThanOrEqual(2);

    const routed = MosaicEngine.process(img, {
      mosaicStrategy: 'orthogonal-contour',
      tileSize: 2
    });
    expect(routed.strategy).toBe('orthogonal-contour');
  });

  it('4. Adaptive Quadtree strategy subdivides complex regions while preserving 1px detail', () => {
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      // Flat blue area
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          setPixel(x, y, 0, 0, 255, 255);
        }
      }
      // Single 1px red highlight at (5, 5)
      setPixel(5, 5, 255, 0, 0, 255);
    });

    const res = AdaptiveQuadtreeEngine.process(img, {
      tileSize: 8,
      minCellSize: 1,
      varianceThreshold: 10
    });

    expect(res.cells).toBeDefined();
    expect(res.cells.length).toBeGreaterThan(4); // Subdivided around red detail

    const detailCell = res.cells.find(c => c.x === 5 && c.y === 5);
    expect(detailCell).toBeDefined();
    expect(detailCell.color).toBe('rgb(255,0,0)');
  });

  it('5. Native Integer Resampler detects uniform integer scale factor', () => {
    // 4x scaled 2x2 grid (8x8 pixels total)
    const img = createSyntheticImageData(8, 8, (setPixel) => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const color = (x < 4 && y < 4) || (x >= 4 && y >= 4) ? 255 : 0;
          setPixel(x, y, color, color, color, 255);
        }
      }
    });

    const scaleInfo = PixelArtResampler.detectScale(img);
    expect(scaleInfo.detectedScale).toBe(4);

    const res = PixelArtResampler.process(img, { targetScale: 'auto' });
    expect(res.stats.effectiveScale).toBe(4);
    expect(res.grid.length).toBe(2);
    expect(res.grid[0].length).toBe(2);
  });

  it('6. Auto Detect strategy provides reliable recommendation without silent override', () => {
    // Multi-sprite image
    const multiSpriteImg = createSyntheticImageData(32, 16, (setPixel) => {
      for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) setPixel(x, y, 255, 0, 0, 255);
      for (let y = 2; y < 8; y++) for (let x = 20; x < 26; x++) setPixel(x, y, 0, 255, 0, 255);
      for (let y = 10; y < 14; y++) for (let x = 10; x < 14; x++) setPixel(x, y, 0, 0, 255, 255);
    });

    const rec = MosaicStrategyDetector.analyze(multiSpriteImg);
    expect(rec.recommendedStrategy).toBe('island-grid');
    expect(rec.badgeLabel).toContain('Multi-Sprite Island Grid');

    // Auto Detect in MosaicEngine process
    const res = MosaicEngine.process(multiSpriteImg, {
      mosaicStrategy: 'auto-detect'
    });

    expect(res.strategyRecommendation).toBeDefined();
    expect(res.strategyRecommendation.recommendedStrategy).toBe('island-grid');
    expect(res.strategy).toBe('island-grid');
  });
});
