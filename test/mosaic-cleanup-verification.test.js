import { describe, it, expect } from 'vitest';
import { MosaicCleanupEngine } from '../src/core/mosaic/MosaicCleanupEngine.js';
import { MosaicVerificationEngine } from '../src/core/mosaic/MosaicVerificationEngine.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Mosaic 100% Pixel Cleanup & Quality Verification Engine', () => {
  function createTestGrid(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const isBorder = (r === 0 || r === rows - 1 || c === 0 || c === cols - 1);
        const alpha = isBorder ? 0 : 255;
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: alpha === 0 ? 'rgba(0,0,0,0)' : 'rgb(50,200,50)',
          sample: { r: 50, g: 200, b: 50, a: alpha },
          occupied: alpha >= 10,
          isRemoved: alpha < 10,
          sourceAlpha: alpha
        });
        row.push(cell);
      }
      grid.push(row);
    }
    return grid;
  }

  it('detects and cleans floating outside noise single cells', () => {
    const grid = createTestGrid(9, 9);
    // Add a single floating noise cell in perimeter border at (0, 0)
    grid[0][0].isRemoved = false;
    grid[0][0].sample = { r: 240, g: 240, b: 240, a: 255 };

    const result = MosaicCleanupEngine.execute(grid, { autoClean: true });
    expect(result.cleanedCount).toBeGreaterThan(0);
    expect(grid[0][0].isRemoved).toBe(true);
  });

  it('100% protects intentional stair-step pixel-art diagonal geometry', () => {
    const grid = createTestGrid(9, 9);

    // Create a 1x1 diagonal stair step line from (2,2) to (3,3) to (4,4)
    const stairSteps = MosaicCleanupEngine.analyzeStairStepGeometry(grid);
    expect(stairSteps.has(grid[3][3].id)).toBe(true);

    MosaicCleanupEngine.execute(grid, { autoClean: true });
    expect(grid[3][3].isRemoved).toBe(false);
  });

  it('evaluates MosaicVerificationEngine rules and returns 100% CLEAN when clean', () => {
    const grid = createTestGrid(7, 7);
    const report = MosaicVerificationEngine.verify(grid);

    expect(report.is100PercentClean).toBe(true);
    expect(report.statusText).toBe('100% CLEAN');
    expect(report.checks.outside).toBe(true);
    expect(report.checks.edges).toBe(true);
    expect(report.checks.noise).toBe(true);
    expect(report.checks.protection).toBe(true);
  });

  it('respects manual protection overrides and prevents deletion', () => {
    const grid = createTestGrid(7, 7);
    const cell = grid[1][1];

    const protectedIds = new Set([cell.id]);
    MosaicCleanupEngine.execute(grid, {
      autoClean: true,
      protectedIds
    });

    expect(cell.isProtected).toBe(true);
    expect(cell.isRemoved).toBe(false);
  });

  it('returns verificationReport in MosaicEngine.process cleanly', () => {
    const canvasData = {
      width: 20,
      height: 20,
      data: new Uint8ClampedArray(20 * 20 * 4)
    };
    for (let y = 5; y < 15; y++) {
      for (let x = 5; x < 15; x++) {
        const idx = (y * 20 + x) * 4;
        canvasData.data[idx] = 50;
        canvasData.data[idx + 1] = 200;
        canvasData.data[idx + 2] = 50;
        canvasData.data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process(canvasData, {
      tileSize: 2,
      cleanupEnabled: true,
      autoClean: true
    });

    expect(res.verificationReport).toBeDefined();
    expect(res.verificationReport.is100PercentClean).toBe(true);
    expect(res.verificationReport.statusText).toBe('100% CLEAN');
  });
});
