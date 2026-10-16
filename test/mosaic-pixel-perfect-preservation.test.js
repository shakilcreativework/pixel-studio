import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Mosaic Background Isolation & Pixel-Perfect Design Preservation (Test Matrix A-L)', () => {
  // Helper to create synthetic test images
  function createSyntheticImage(width, height, drawFn) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const color = drawFn(x, y);
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = color[3] !== undefined ? color[3] : 255;
      }
    }
    return { width, height, data };
  }

  // TEST A: Simple Flat Background
  it('Test A: removes external flat background while preserving 100% of design cells', () => {
    const img = createSyntheticImage(16, 16, (x, y) => {
      // 8x8 central blue design block (#2563eb) on white background (#ffffff)
      if (x >= 4 && x < 12 && y >= 4 && y < 12) {
        return [37, 99, 235, 255];
      }
      return [255, 255, 255, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous',
      colorTolerance: 20
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.modifiedProtectedCells).toBe(0);
    expect(result.integrityReport.deletedProtectedCells).toBe(0);

    // Verify all 4x4 tiles in the center (16 tiles total) are kept
    for (let r = 2; r < 6; r++) {
      for (let c = 2; c < 6; c++) {
        expect(result.grid[r][c].isRemoved).toBe(false);
      }
    }
    // Verify outer border tiles are removed
    expect(result.grid[0][0].isRemoved).toBe(true);
  });

  // TEST B: Black Background + Black Outline
  it('Test B: removes external black background while 100% preserving black design outline', () => {
    const img = createSyntheticImage(20, 20, (x, y) => {
      // Black background
      if (x < 4 || x >= 16 || y < 4 || y >= 16) {
        return [0, 0, 0, 255];
      }
      // Black outline (1px rim around design at bounds [4..15])
      if (x === 4 || x === 15 || y === 4 || y === 15) {
        return [0, 0, 0, 255];
      }
      // Yellow design interior
      return [250, 204, 21, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 20
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.modifiedProtectedCells).toBe(0);

    // The yellow interior is kept
    expect(result.grid[5][5].isRemoved).toBe(false);
    // Outer canvas background is removed
    expect(result.grid[0][0].isRemoved).toBe(true);
  });

  // TEST C: White Background + White Enclosed Detail (Contiguous Mode)
  it('Test C: preserves enclosed white design details in contiguous mode', () => {
    const img = createSyntheticImage(24, 24, (x, y) => {
      // Red character shape with white eye enclosed inside
      if (x >= 4 && x < 20 && y >= 4 && y < 20) {
        // Enclosed white eye at [10..13, 10..13]
        if (x >= 10 && x < 14 && y >= 10 && y < 14) {
          return [255, 255, 255, 255];
        }
        return [220, 38, 38, 255]; // Red body
      }
      return [255, 255, 255, 255]; // White external background
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous',
      colorTolerance: 20
    });

    expect(result.integrityReport.status).toBe('PASS');
    // Verify enclosed white eye at grid rows 5..6, cols 5..6 is preserved
    for (let r = 5; r <= 6; r++) {
      for (let c = 5; c <= 6; c++) {
        expect(result.grid[r][c].isRemoved).toBe(false);
      }
    }
    // Verify outer canvas corners are removed
    expect(result.grid[0][0].isRemoved).toBe(true);
  });

  // TEST D: Concave Corner Notch Preservation
  it('Test D: locks and preserves concave / inside corner notches', () => {
    const img = createSyntheticImage(24, 24, (x, y) => {
      // L-shape with an inside concave notch at (12, 12)
      const inVertical = (x >= 4 && x < 12 && y >= 4 && y < 20);
      const inHorizontal = (x >= 4 && x < 20 && y >= 12 && y < 20);
      if (inVertical || inHorizontal) {
        return [16, 185, 129, 255]; // Green design
      }
      return [0, 0, 0, 255]; // Black background
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      preserveCorners: true
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.cornerLosses).toBe(0);
    // Verify inside corner cell at row 6, col 6 is kept
    expect(result.grid[6][6].isRemoved).toBe(false);
  });

  // TEST E: Convex Outside Corner Preservation
  it('Test E: locks and preserves convex outside 90° corners', () => {
    const img = createSyntheticImage(20, 20, (x, y) => {
      // Square box
      if (x >= 4 && x < 16 && y >= 4 && y < 16) {
        return [234, 88, 12, 255];
      }
      return [255, 255, 255, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous',
      preserveCorners: true
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.cornerLosses).toBe(0);

    // Check all 4 convex corners
    expect(result.grid[2][2].cornerState).toBe('CONVEX');
    expect(result.grid[2][7].cornerState).toBe('CONVEX');
    expect(result.grid[7][2].cornerState).toBe('CONVEX');
    expect(result.grid[7][7].cornerState).toBe('CONVEX');

    expect(result.grid[2][2].isRemoved).toBe(false);
    expect(result.grid[2][7].isRemoved).toBe(false);
    expect(result.grid[7][2].isRemoved).toBe(false);
    expect(result.grid[7][7].isRemoved).toBe(false);
  });

  // TEST F: Staircase / Stepped Boundary Preservation
  it('Test F: locks and preserves diagonal stepped / staircase boundaries', () => {
    const img = createSyntheticImage(24, 24, (x, y) => {
      // Stepped triangular shape
      if (x >= 4 && y >= 4 && (x + y <= 24)) {
        return [168, 85, 247, 255]; // Purple
      }
      return [0, 0, 0, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      preserveBoundary: true
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.boundaryLosses).toBe(0);
  });

  // TEST G: 1-Cell-Wide Line Preservation
  it('Test G: preserves thin 1-cell-wide lines from erosion', () => {
    const img = createSyntheticImage(24, 24, (x, y) => {
      // Single thin vertical antenna line at x in [10..11] (1 tile wide for tileSize=2)
      if (x >= 10 && x < 12 && y >= 2 && y < 20) {
        return [236, 72, 153, 255]; // Pink antenna
      }
      return [0, 0, 0, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      deFringe: true // Even with deFringe, thin line must be preserved
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.deletedProtectedCells).toBe(0);

    // Verify antenna cells are kept
    for (let r = 1; r < 10; r++) {
      expect(result.grid[r][5].isRemoved).toBe(false);
    }
  });

  // TEST H: 1-Cell Highlight Preservation
  it('Test H: preserves isolated 1-cell highlights', () => {
    const img = createSyntheticImage(20, 20, (x, y) => {
      // Isolated highlight at [10..11, 10..11]
      if (x >= 10 && x < 12 && y >= 10 && y < 12) {
        return [255, 255, 0, 255];
      }
      return [0, 0, 0, 255];
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous'
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.grid[5][5].isRemoved).toBe(false);
  });

  // TEST I: Thin Outline Next to Background
  it('Test I: preserves thin outline while removing background', () => {
    const img = createSyntheticImage(20, 20, (x, y) => {
      // Hollow outline box
      if (x >= 4 && x < 16 && y >= 4 && y < 16) {
        if (x === 4 || x === 15 || y === 4 || y === 15) {
          return [30, 41, 59, 255]; // Dark slate outline
        }
        return [59, 130, 246, 255]; // Blue fill
      }
      return [255, 255, 255, 255]; // White bg
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous'
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.boundaryLosses).toBe(0);
  });

  // TEST J: Enclosed Interior Background-Colored Region
  it('Test J: distinguishes between external background and enclosed interior spaces', () => {
    const img = createSyntheticImage(24, 24, (x, y) => {
      // Donut / hollow ring
      if (x >= 4 && x < 20 && y >= 4 && y < 20) {
        if (x >= 8 && x < 16 && y >= 8 && y < 16) {
          return [0, 0, 0, 255]; // Enclosed black interior
        }
        return [234, 179, 8, 255]; // Yellow ring
      }
      return [0, 0, 0, 255]; // External black background
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous'
    });

    expect(result.integrityReport.status).toBe('PASS');
    // Enclosed interior (row 5, col 5) is preserved
    expect(result.grid[5][5].isRemoved).toBe(false);
    // External background (row 0, col 0) is removed
    expect(result.grid[0][0].isRemoved).toBe(true);
  });

  // TEST K: High Performance Grid Scaling
  it('Test K: processes medium/large grids without memory leaks or degradation', () => {
    const img = createSyntheticImage(64, 64, (x, y) => {
      if (x >= 16 && x < 48 && y >= 16 && y < 48) {
        return [14, 165, 233, 255];
      }
      return [255, 255, 255, 255];
    });

    const start = performance.now();
    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous'
    });
    const elapsed = performance.now() - start;

    expect(result.integrityReport.status).toBe('PASS');
    expect(elapsed).toBeLessThan(500); // Fast client execution under 500ms
  });

  // TEST L: Reference Screenshot Geometry Preservation
  it('Test L: preserves 100% of finished edges, corners, and yellow/orange cells from reference screenshot', () => {
    const img = createSyntheticImage(32, 32, (x, y) => {
      // Multi-tier cross/star with horizontal finished edges, vertical edges, stepped transitions,
      // convex corners, and concave notches
      const inCrossH = (x >= 4 && x < 28 && y >= 10 && y < 22);
      const inCrossV = (x >= 10 && x < 22 && y >= 4 && y < 28);
      if (inCrossH || inCrossV) {
        // Continuous yellow/orange gradient
        const r = 250;
        const g = Math.round(180 + (y / 32) * 50);
        const b = 20;
        return [r, g, b, 255];
      }
      return [0, 0, 0, 255]; // Black external background
    });

    const result = MosaicEngine.process(img, {
      tileSize: 2,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 25,
      perfectCorners: true,
      restoreEdgeColors: true,
      snapEdgeColors: true,
      preserveDesign: true,
      preserveBoundary: true,
      preserveCorners: true
    });

    expect(result.integrityReport.status).toBe('PASS');
    expect(result.integrityReport.modifiedProtectedCells).toBe(0);
    expect(result.integrityReport.deletedProtectedCells).toBe(0);
    expect(result.integrityReport.boundaryLosses).toBe(0);
    expect(result.integrityReport.cornerLosses).toBe(0);
    expect(result.integrityReport.geometryChanges).toBe(0);
    expect(result.integrityReport.colorChanges).toBe(0);

    // Vector SVG export check
    const svg = MosaicEngine.exportSVG(result, {
      transparentBg: true,
      includeOutline: true
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<g id="mosaic-cells">');
    expect(svg).toContain('<rect');
  });
});
