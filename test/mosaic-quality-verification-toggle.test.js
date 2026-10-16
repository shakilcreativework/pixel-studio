import { describe, it, expect } from 'vitest';
import { MosaicVerificationEngine } from '../src/core/mosaic/MosaicVerificationEngine.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';

describe('Mosaic Quality Verification Manual Toggle', () => {
  function createTestGridWithNoise(rows, cols) {
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
    // Inject a floating outside noise cell at (0, 0)
    grid[0][0].isRemoved = false;
    grid[0][0].sample = { r: 240, g: 240, b: 240, a: 255 };
    return grid;
  }

  it('fails outside noise check when enabled and floating noise exists', () => {
    const grid = createTestGridWithNoise(9, 9);
    const report = MosaicVerificationEngine.verify(grid, {
      qualityChecks: {
        outside: true,
        edges: true,
        noise: true,
        protection: true,
        designBoundaries: true
      }
    });

    expect(report.checks.outside).toBe(false);
    expect(report.is100PercentClean).toBe(false);
    expect(report.issuesCount).toBeGreaterThan(0);
  });

  it('bypasses outside noise check when manually unchecked/disabled by user', () => {
    const grid = createTestGridWithNoise(9, 9);
    const report = MosaicVerificationEngine.verify(grid, {
      qualityChecks: {
        outside: false, // User manually unchecked Outside Noise
        edges: true,
        noise: true,
        protection: true,
        designBoundaries: false
      }
    });

    expect(report.checks.outside).toBe('disabled');
    expect(report.is100PercentClean).toBe(true);
    expect(report.issuesCount).toBe(0);
    expect(report.statusText).toBe('100% CLEAN');
  });

  it('supports toggling multiple check rules independently', () => {
    const grid = createTestGridWithNoise(9, 9);
    // Add protected cell violation
    grid[2][2].protected = true;
    grid[2][2].isRemoved = true;

    const reportAllDisabled = MosaicVerificationEngine.verify(grid, {
      qualityChecks: {
        outside: false,
        edges: false,
        noise: false,
        protection: false,
        designBoundaries: false,
        zeroColorLoss: false,
        gridAlignment: false
      }
    });

    expect(reportAllDisabled.issuesCount).toBe(0);
    expect(reportAllDisabled.is100PercentClean).toBe(true);
    expect(reportAllDisabled.checks.outside).toBe('disabled');
    expect(reportAllDisabled.checks.protection).toBe('disabled');
  });
});
