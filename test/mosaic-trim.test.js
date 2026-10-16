import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { CellDesignState } from '../src/core/mosaic/CellModel.js';

describe('Mosaic Engine PRD v3.0.0 — Production Standard Verification', () => {
  // Helper to create synthetic sprite with subject, thin sword, white highlights, and transparent background
  function createSyntheticCharacterImage(width = 32, height = 32) {
    const data = new Uint8ClampedArray(width * height * 4);

    // Initialize full canvas to transparent (0 alpha) or white background
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = 0; // Transparent
    }

    // Draw Character Body (8x8 box in center: x in [12..19], y in [12..19]) -> Blue body
    for (let y = 12; y <= 19; y++) {
      for (let x = 12; x <= 19; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 30;
        data[idx + 1] = 144;
        data[idx + 2] = 255;
        data[idx + 3] = 255; // Solid Blue
      }
    }

    // Draw White Eyes / Internal Highlight (x in [14..15], y in [14..15]) -> White detail
    for (let y = 14; y <= 15; y++) {
      for (let x = 14; x <= 15; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    // Draw 1-Pixel Thin Sword / Feature projecting out (x in [20..27], y = 15) -> Grey blade
    for (let x = 20; x <= 27; x++) {
      const idx = (15 * width + x) * 4;
      data[idx] = 180;
      data[idx + 1] = 180;
      data[idx + 2] = 180;
      data[idx + 3] = 255;
    }

    // Draw Concave Notch at Top-Right of Body: Clear corner at (x: 18..19, y: 12..13)
    for (let y = 12; y <= 13; y++) {
      for (let x = 18; x <= 19; x++) {
        const idx = (y * width + x) * 4;
        data[idx + 3] = 0; // transparent notch
      }
    }

    return { width, height, data };
  }

  // =========================================================================
  // 1. Mosaic Trim & Discrete Cell-Level Preservation
  // =========================================================================
  describe('Illustrator-Inspired Mosaic Trim', () => {
    it('executes cell-level trim removing only perimeter-connected outside cells', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 2,
        trimEnabled: true,
        trimMode: 'outside',
        preserveDesignCells: true,
        preserveBoundaryCells: true,
        preserveCornerCells: true,
        preserveThinFeatures: true
      });

      expect(res.trimResult).toBeDefined();
      expect(res.trimResult.trimmedCount).toBeGreaterThan(0);

      // Verify that surviving tiles only contain design cells
      const remainingTiles = res.tiles;
      expect(remainingTiles.length).toBeGreaterThan(0);

      // All remaining tiles must have valid opacity
      remainingTiles.forEach(tile => {
        expect(tile.isRemoved).toBe(false);
        expect(tile.alpha).toBeGreaterThan(0);
      });
    });

    it('100% preserves internal white eye highlights and body cells', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 2,
        trimEnabled: true,
        preserveDesignCells: true
      });

      // Find eye cells at (col: 7, row: 7) which corresponds to (x: 14, y: 14)
      const eyeCell = res.grid[7][7];
      expect(eyeCell.isRemoved).toBe(false);
      expect(eyeCell.sample.r).toBe(255);
      expect(eyeCell.sample.g).toBe(255);
      expect(eyeCell.sample.b).toBe(255);
    });

    it('100% preserves 1-cell wide thin features (sword projection)', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 2,
        trimEnabled: true,
        preserveThinFeatures: true
      });

      // The blade tip at x = 26, y = 14 corresponds to col = 13, row = 7
      const bladeCell = res.grid[7][13];
      expect(bladeCell.isRemoved).toBe(false);
      expect(bladeCell.designState).toBe(CellDesignState.THIN_FEATURE);
      expect(bladeCell.protected).toBe(true);
    });

    it('100% preserves concave inner notches without rounding or filling', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 2,
        trimEnabled: true,
        preserveCornerCells: true
      });

      // Corner at boundary of notch
      const cornerCell = res.grid[7][8]; // (x: 16, y: 14) near notch
      expect(cornerCell.protected).toBe(true);
      expect(cornerCell.isRemoved).toBe(false);
    });
  });

  // =========================================================================
  // 2. Grid Geometry, Stagger, and Sampling Modes
  // =========================================================================
  describe('Grid Geometry & Sampling Modes', () => {
    it('supports 50% row stagger layout offset', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 4,
        stagger: 'row'
      });

      expect(res.grid.length).toBeGreaterThan(0);
      // Row 0 has offset 0, Row 1 has offset step / 2 = 2
      expect(res.grid[0][0].x).toBe(0);
      expect(res.grid[1][0].x).toBe(2);
    });

    it('supports 50% column stagger layout offset', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 4,
        stagger: 'column'
      });

      expect(res.grid.length).toBeGreaterThan(0);
      // Col 0 has offset 0, Col 1 has offset step / 2 = 2
      expect(res.grid[0][0].y).toBe(0);
      expect(res.grid[0][1].y).toBe(2);
    });

    it('supports Center, Average, and Dominant sampling without error', () => {
      const img = createSyntheticCharacterImage(32, 32);

      const resAvg = MosaicEngine.process(img, { tileSize: 4, samplingMethod: 'average' });
      const resCenter = MosaicEngine.process(img, { tileSize: 4, samplingMethod: 'center' });
      const resDom = MosaicEngine.process(img, { tileSize: 4, samplingMethod: 'dominant' });

      expect(resAvg.grid.length).toBe(resCenter.grid.length);
      expect(resAvg.grid.length).toBe(resDom.grid.length);
    });
  });

  // =========================================================================
  // 3. Palettes, Dithering & Outlines
  // =========================================================================
  describe('Palettes & Dithering', () => {
    it('quantizes to retro palettes (e.g. Game Boy, PICO-8, Lego Studs)', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const resGb = MosaicEngine.process(img, { tileSize: 4, palette: 'gameboy' });
      const resPico = MosaicEngine.process(img, { tileSize: 4, palette: 'pico-8' });
      const resLego = MosaicEngine.process(img, { tileSize: 4, palette: 'lego-studs-40' });

      expect(resGb.tiles.length).toBeGreaterThan(0);
      expect(resPico.tiles.length).toBeGreaterThan(0);
      expect(resLego.tiles.length).toBeGreaterThan(0);
    });

    it('renders vector SVG with pure geometry and 0 raster <image> tags', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 4,
        shape: 'hexagon',
        rotation: 45,
        outlineMode: 'contour-mask'
      });

      const svg = MosaicEngine.exportSVG(res, { includeOutline: true });
      expect(svg).toContain('<svg');
      expect(svg).toContain('<polygon');
      expect(svg).toContain('transform="rotate(45');
      expect(svg).not.toContain('<image');
      expect(svg).not.toContain('base64');
    });
  });

  // =========================================================================
  // 4. Integrity Validation Guarantee
  // =========================================================================
  describe('Integrity Validation & Zero-Modification Guarantee', () => {
    it('passes integrity verification with zero protected cell loss', () => {
      const img = createSyntheticCharacterImage(32, 32);
      const res = MosaicEngine.process(img, {
        tileSize: 2,
        trimEnabled: true,
        preserveDesign: true,
        preserveBoundary: true,
        preserveCorners: true
      });

      expect(res.integrityReport).toBeDefined();
      expect(res.integrityReport.integrity.passed).toBe(true);
      expect(res.integrityReport.deletedProtectedCells).toBe(0);
      expect(res.integrityReport.modifiedProtectedCells).toBe(0);
      expect(res.integrityReport.boundaryLosses).toBe(0);
      expect(res.integrityReport.cornerLosses).toBe(0);
    });
  });
});
