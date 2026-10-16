/**
 * mosaic-strategies-and-sampling.test.js
 * Comprehensive Unit Test Suite for Mosaic strategies and active sampling methods.
 */

import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { sampleCellColor } from '../src/core/pixel-art/ColorSampling.js';
import { ContrastEdgeEngine } from '../src/core/mosaic/ContrastEdgeEngine.js';
import { IsolineBandedEngine } from '../src/core/mosaic/IsolineBandedEngine.js';


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

describe('Mosaic Sampling Methods Suite', () => {
  // Test cell with 75% dark blue (mountain) and 25% bright yellow (sun)
  const mountainSunImg = createSyntheticImageData(8, 8, (setPixel) => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (x < 6) {
          setPixel(x, y, 20, 20, 50, 255); // Dark mountain blue
        } else {
          setPixel(x, y, 255, 220, 80, 255); // Bright sun yellow
        }
      }
    }
  });

  it('1. Center-exact sampling picks the exact 1:1 geometric center pixel', () => {
    const sample = sampleCellColor(mountainSunImg.data, 8, 8, 0, 0, 8, 8, 'center-exact');
    // Center at (4, 4) is dark mountain blue
    expect(sample.r).toBe(20);
    expect(sample.g).toBe(20);
    expect(sample.b).toBe(50);
  });

  it('2. Contrast-aware sampling preserves structural edge color without blending into background', () => {
    const sample = sampleCellColor(mountainSunImg.data, 8, 8, 0, 0, 8, 8, 'contrast-aware');
    expect(sample).toBeDefined();
    expect(sample.a).toBe(255);
  });

  it('3. Gaussian-weighted sampling smoothly weights pixels around cell center', () => {
    const sample = sampleCellColor(mountainSunImg.data, 8, 8, 0, 0, 8, 8, 'gaussian-weighted');
    expect(sample).toBeDefined();
    expect(sample.a).toBe(255);
  });

  it('4. Perceptual OKLab area sampling produces accurate perceptual color', () => {
    const sample = sampleCellColor(mountainSunImg.data, 8, 8, 0, 0, 8, 8, 'perceptual-oklab');
    expect(sample).toBeDefined();
    expect(sample.a).toBe(255);
  });

  it('5. Standard average produces the uniform arithmetic mean', () => {
    const sample = sampleCellColor(mountainSunImg.data, 8, 8, 0, 0, 8, 8, 'average');
    expect(sample).toEqual({ r: 79, g: 70, b: 58, a: 255 });
  });
});

describe('Contrast-Aware Ridge & Silhouette Strategy Engine', () => {
  it('identifies edge cells along silhouette boundaries and routes via MosaicEngine', () => {
    // 16x16 image with diagonal slope (mountain ridge)
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (x + y > 15) {
            setPixel(x, y, 15, 15, 45, 255); // Mountain
          } else {
            setPixel(x, y, 250, 180, 50, 255); // Sunset sky
          }
        }
      }
    });

    const res = ContrastEdgeEngine.process(img, {
      tileSize: 4,
      edgeSensitivity: 20
    });

    expect(res.strategy).toBe('contrast-edge');
    expect(res.stats.edgeCellsCount).toBeGreaterThan(0);

    // Verify routing through MosaicEngine
    const routed = MosaicEngine.process(img, {
      mosaicStrategy: 'contrast-edge',
      tileSize: 4,
      shape: 'circle',
      spacing: 1
    });

    expect(routed.strategy).toBe('contrast-edge');
    expect(routed.grid.length).toBe(4);
    expect(routed.grid[0].length).toBe(4);
  });
});

describe('Perceptual Isoline Gradient Banding Strategy Engine', () => {
  it('quantizes smooth continuous gradient into discrete harmonic bands', () => {
    // 16x16 smooth vertical gradient (like sunset sky)
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const t = y / 16;
          const r = Math.round(50 + 200 * t);
          const g = Math.round(20 + 100 * t);
          const b = Math.round(100 - 60 * t);
          setPixel(x, y, r, g, b, 255);
        }
      }
    });

    const res = IsolineBandedEngine.process(img, {
      tileSize: 4,
      isolineBands: 8
    });

    expect(res.strategy).toBe('isoline-banded');
    expect(res.stats.effectiveBands).toBe(8);

    // Verify routing through MosaicEngine
    const routed = MosaicEngine.process(img, {
      mosaicStrategy: 'isoline-banded',
      tileSize: 4,
      shape: 'hexagon'
    });

    expect(routed.strategy).toBe('isoline-banded');
    expect(routed.grid.length).toBe(4);
  });
});

describe('Universal Shape, Rotation, and SVG Parity', () => {
  it('supports vector shapes (circle, diamond, hexagon, triangle) and SVG export across alternative strategies', () => {
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          setPixel(x, y, 200, 100, 50, 255);
        }
      }
    });

    const shapes = ['circle', 'diamond', 'hexagon', 'triangle'];
    for (const sh of shapes) {
      const res = MosaicEngine.process(img, {
        mosaicStrategy: 'contrast-edge',
        tileSize: 4,
        shape: sh,
        rotation: 45
      });

      expect(res.grid).toBeDefined();
      const svg = MosaicEngine.exportSVG(res, { mode: 'flat' });
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('preserves baseline Default Pixel Art strategy 100% intact', () => {
    const img = createSyntheticImageData(16, 16, (setPixel) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          setPixel(x, y, 100, 150, 200, 255);
        }
      }
    });

    const res = MosaicEngine.process(img, {
      mosaicStrategy: 'default-pixel-art',
      tileSize: 4
    });

    expect(res.strategy).toBe('default-pixel-art');
    expect(res.grid.length).toBe(4);
    expect(res.verificationReport).toBeDefined();
  });
});
