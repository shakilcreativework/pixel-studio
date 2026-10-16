import { describe, it, expect } from 'vitest';
import { sampleContinuousShading, calculateColorDelta } from '../src/core/mosaic/ContinuousShading.js';
import { ContourTracer } from '../src/core/mosaic/ContourTracer.js';
import { PostQualityPass } from '../src/core/mosaic/PostQualityPass.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Mosaic Engine 5-Stage Architecture Verification', () => {
  // Helper to generate smooth gradient image (e.g. yellow cross with vertical gradient)
  function createGradientCrossImage(width = 24, height = 24) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Background black
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;

        // Cross shape: horizontal bar y in [9..14], vertical bar x in [9..14]
        const inCross = (x >= 9 && x <= 14 && y >= 4 && y <= 19) ||
                        (y >= 9 && y <= 14 && x >= 4 && x <= 19);

        if (inCross) {
          // Smooth continuous vertical gradient from top (light yellow) to bottom (deep gold)
          const t = y / height;
          data[idx] = 255;
          data[idx + 1] = Math.round(240 - t * 60); // 240 down to 180
          data[idx + 2] = Math.round(50 - t * 40);   // 50 down to 10
          data[idx + 3] = 255;
        }
      }
    }
    return { width, height, data };
  }

  // Helper for concave notch shape (e.g. L-shape or cross with 90 degree inward corner)
  function createConcaveNotchMask(rows = 10, cols = 10) {
    const mask = Array.from({ length: rows }, () => new Uint8Array(cols));
    // L-shape with inward concave corner at (4, 4)
    for (let r = 2; r <= 7; r++) {
      for (let c = 2; c <= 7; c++) {
        // Cut out top-right quadrant (r < 5 && c > 4) to form concave notch
        if (!(r < 5 && c > 4)) {
          mask[r][c] = 1;
        }
      }
    }
    return mask;
  }

  // =========================================================================
  // Stage 1: Continuous Shading Engine
  // =========================================================================
  describe('Stage 1: Continuous Shading Engine', () => {
    it('evaluates color continuously across adjacent tiles with delta within expected gradient step', () => {
      const img = createGradientCrossImage(24, 24);
      const tileSize = 2;

      // Sample two vertically adjacent tiles inside the cross arm at (10, 8) and (10, 10)
      const tile1 = sampleContinuousShading(img.data, img.width, img.height, 10, 8, tileSize);
      const tile2 = sampleContinuousShading(img.data, img.width, img.height, 10, 10, tileSize);

      const delta = calculateColorDelta(tile1, tile2);
      // Continuous smooth gradient step should be small (< 20 delta) and never a hard seam jump
      expect(delta).toBeLessThan(20);
    });
  });

  // =========================================================================
  // Stage 2: Contour Tracing Engine (Moore-Neighbor on Binary Mask)
  // =========================================================================
  describe('Stage 2: Binary Mask Contour Tracing', () => {
    it('correctly traces closed contour loop around concave notches and convex tips', () => {
      const mask = createConcaveNotchMask(10, 10);
      const { contours } = ContourTracer.traceContours(mask, 10, 10);

      expect(contours.length).toBeGreaterThan(0);
      const mainContour = contours[0];

      // Contour must be a closed path with multiple boundary vertices
      expect(mainContour.length).toBeGreaterThan(10);

      // Verify detection of concave notch
      let foundConcave = false;
      let foundConvex = false;
      for (const pt of mainContour) {
        if (pt.isConcave) foundConcave = true;
        if (pt.isConvex) foundConvex = true;
      }

      expect(foundConvex).toBe(true);
      expect(foundConcave).toBe(true);
    });
  });

  // =========================================================================
  // Stage 3 & 4: Unified Parameterized Background Removal
  // =========================================================================
  describe('Stage 3 & 4: Parameterized Background Removal', () => {
    it('produces identical high-quality removal on both black and white backgrounds', () => {
      // 1. Black background
      const blackBgImg = createGradientCrossImage(24, 24);
      const resBlack = MosaicEngine.process(blackBgImg, {
        tileSize: 2,
        bgRemovalMode: 'black',
        bgRemovalScope: 'contiguous',
        colorTolerance: 25
      });

      // 2. White background version
      const whiteData = new Uint8ClampedArray(blackBgImg.data);
      for (let i = 0; i < whiteData.length; i += 4) {
        if (whiteData[i] === 0 && whiteData[i + 1] === 0 && whiteData[i + 2] === 0) {
          whiteData[i] = 255;
          whiteData[i + 1] = 255;
          whiteData[i + 2] = 255;
        }
      }
      const whiteBgImg = { width: 24, height: 24, data: whiteData };
      const resWhite = MosaicEngine.process(whiteBgImg, {
        tileSize: 2,
        bgRemovalMode: 'white',
        bgRemovalScope: 'contiguous',
        colorTolerance: 25
      });

      // Both should yield exactly the same number of preserved artwork tiles
      expect(resBlack.tiles.length).toBe(resWhite.tiles.length);
      expect(resBlack.tiles.length).toBeGreaterThan(30);
    });
  });

  // =========================================================================
  // Stage 5: Post-Removal Quality Passes & QA Overlay Diagnostics
  // =========================================================================
  describe('Stage 5: Post-Removal Quality Passes & QA Diagnostics', () => {
    it('QA Overlay detects intentional hard color seams and corner mismatches', () => {
      const grid = [
        [
          { x: 0, y: 0, sample: { r: 255, g: 255, b: 255, a: 255 }, isRemoved: false, isBoundary: true },
          { x: 4, y: 0, sample: { r: 0, g: 0, b: 0, a: 255 }, isRemoved: false, isBoundary: true } // Hard seam jump > 115
        ]
      ];

      const mismatches = PostQualityPass.generateDiagnostics(grid, 1, 2);
      expect(mismatches.length).toBeGreaterThan(0);
      expect(mismatches[0].isSeam || mismatches[0].isBoundaryOutlier).toBe(true);
    });
  });

  // =========================================================================
  // Full Pipeline Determinism
  // =========================================================================
  describe('Full Pipeline Determinism', () => {
    it('executes deterministically yielding byte-identical results on repeated runs', () => {
      const img = createGradientCrossImage(24, 24);
      const opts = {
        tileSize: 2,
        bgRemovalMode: 'black',
        bgRemovalScope: 'contiguous',
        colorTolerance: 25,
        perfectCorners: true,
        restoreEdgeColors: true,
        snapEdgeColors: true
      };

      const pass1 = MosaicEngine.process(img, opts);
      const pass2 = MosaicEngine.process(img, opts);

      expect(JSON.stringify(pass1.tiles)).toEqual(JSON.stringify(pass2.tiles));
    });
  });
});
