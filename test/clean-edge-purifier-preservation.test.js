import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';

describe('Clean Edge Purifier Preservation & Edge Protection', () => {
  it('prioritizes design color over background color on boundary blend cells during collinear snapping', () => {
    // Create a 3x3 grid with background, boundary blend, and design cells
    const grid = [];
    const bgRgb = { r: 255, g: 255, b: 255, a: 255 }; // White background
    const designRgb = { r: 255, g: 215, b: 0, a: 255 }; // Gold star design

    // Blend cell: halfway between white (255,255,255) and gold (255,215,0) -> (255,235,128)
    const blendRgb = { r: 255, g: 235, b: 128, a: 255 };

    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        let sample = bgRgb;
        if (r === 1 && c === 1) {
          sample = { ...blendRgb };
        } else if (r === 1 && c === 2) {
          sample = { ...designRgb };
        }

        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: `rgb(${sample.r},${sample.g},${sample.b})`,
          sample: { ...sample }
        });
        row.push(cell);
      }
      grid.push(row);
    }

    // Call purifyCleanEdges with white background target
    MosaicEngine.purifyCleanEdges(grid, {
      targetRgbList: [[255, 255, 255]],
      distCeiling: 35,
      scope: 'outer'
    });

    const centerCell = grid[1][1];
    // Center cell should snap to gold design color (255, 215, 0) rather than white background
    expect(centerCell.sample.r).toBe(255);
    expect(centerCell.sample.g).toBe(215);
    expect(centerCell.sample.b).toBe(0);
  });

  it('does not erase interior design cells when scope is outer', () => {
    const grid = [];
    const bgRgb = { r: 0, g: 0, b: 0, a: 255 };
    const designRgb = { r: 200, g: 50, b: 50, a: 255 };

    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        const isOuterBg = (r === 0 || r === 4 || c === 0 || c === 4);
        const sample = isOuterBg ? { ...bgRgb } : { ...designRgb };
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: `rgb(${sample.r},${sample.g},${sample.b})`,
          sample: { ...sample }
        });
        row.push(cell);
      }
      grid.push(row);
    }

    MosaicEngine.purifyCleanEdges(grid, {
      targetRgbList: [[0, 0, 0]],
      distCeiling: 35,
      scope: 'outer'
    });

    // Interior center cell (2,2) should remain intact gold/red design color
    expect(grid[2][2].sample.r).toBe(200);
    expect(grid[2][2].sample.g).toBe(50);
    expect(grid[2][2].sample.b).toBe(50);
  });
});
