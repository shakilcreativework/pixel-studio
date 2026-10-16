import { describe, it, expect } from 'vitest';
import { MosaicDesignDetector } from '../src/core/mosaic/MosaicDesignDetector.js';
import { MosaicBoundaryAnalyzer } from '../src/core/mosaic/MosaicBoundaryAnalyzer.js';
import { MosaicVerificationEngine } from '../src/core/mosaic/MosaicVerificationEngine.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Mosaic Edge Intelligence & Individual Design Boundary Verification', () => {
  function createMultiSpriteGrid(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: 'rgba(0,0,0,0)',
          sample: { r: 0, g: 0, b: 0, a: 0 },
          occupied: false,
          isRemoved: true,
          sourceAlpha: 0
        });
        row.push(cell);
      }
      grid.push(row);
    }

    // Helper to paint a block
    function paintBlock(startR, endR, startC, endC, colorRgb) {
      for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
          grid[r][c].sample = { r: colorRgb.r, g: colorRgb.g, b: colorRgb.b, a: 255 };
          grid[r][c].color = `rgb(${colorRgb.r},${colorRgb.g},${colorRgb.b})`;
          grid[r][c].occupied = true;
          grid[r][c].isRemoved = false;
          grid[r][c].sourceAlpha = 255;
        }
      }
    }

    // Object 1: PLAY button at top-left (rows 2..5, cols 2..7) - Green
    paintBlock(2, 5, 2, 7, { r: 50, g: 200, b: 50 });

    // Object 2: SWORD at bottom-right (rows 10..14, cols 10..14) - Blue
    paintBlock(10, 14, 10, 14, { r: 30, g: 120, b: 220 });

    return grid;
  }

  it('detects individual design objects using 8-connected component analysis', () => {
    const grid = createMultiSpriteGrid(20, 20);
    const designs = MosaicDesignDetector.detectIndividualDesigns(grid);

    expect(designs.length).toBe(2);
    expect(designs[0].cellCount).toBe(24); // 4x6 block = 24 cells
    expect(designs[1].cellCount).toBe(25); // 5x5 block = 25 cells
  });

  it('traces exact perimeter boundary contour for every individual design object', () => {
    const grid = createMultiSpriteGrid(20, 20);
    const designs = MosaicDesignDetector.detectIndividualDesigns(grid);

    const bReport1 = MosaicBoundaryAnalyzer.analyzeDesignBoundaries(designs[0], grid);
    expect(bReport1.totalBoundaryCount).toBe(16); // 4x6 block has 16 boundary cells
    expect(bReport1.isClean).toBe(true);
  });

  it('detects uncleaned edge noise on design boundary and prevents false 100% CLEAN', () => {
    const grid = createMultiSpriteGrid(20, 20);

    // Add white fringe noise cell (240, 240, 240) touching design 1 perimeter at (2, 1)
    grid[2][1].sample = { r: 240, g: 240, b: 240, a: 255 };
    grid[2][1].color = 'rgb(240,240,240)';
    grid[2][1].occupied = true;
    grid[2][1].isRemoved = false;

    const report = MosaicVerificationEngine.verify(grid);

    expect(report.is100PercentClean).toBe(false);
    expect(report.checks.designBoundaries).toBe(false);
    expect(report.issuesCount).toBeGreaterThan(0);
    expect(report.statusText).toContain('EDGE ISSUE');
  });

  it('grants 100% CLEAN when all individual design object boundaries pass verification', () => {
    const grid = createMultiSpriteGrid(20, 20);
    const report = MosaicVerificationEngine.verify(grid);

    expect(report.is100PercentClean).toBe(true);
    expect(report.statusText).toBe('100% CLEAN');
    expect(report.checks.designBoundaries).toBe(true);
  });

  it('executes edge intelligence pass cleanly inside MosaicEngine.process', () => {
    const canvasData = {
      width: 20,
      height: 20,
      data: new Uint8ClampedArray(20 * 20 * 4)
    };
    for (let y = 4; y < 16; y++) {
      for (let x = 4; x < 16; x++) {
        const idx = (y * 20 + x) * 4;
        canvasData.data[idx] = 50;
        canvasData.data[idx + 1] = 200;
        canvasData.data[idx + 2] = 50;
        canvasData.data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process(canvasData, {
      tileSize: 2,
      cleanupEnabled: true
    });

    expect(res.verificationReport).toBeDefined();
    expect(res.verificationReport.checks.designBoundaries).toBe(true);
    expect(res.verificationReport.detectedDesignCount).toBeGreaterThan(0);
  });
});
