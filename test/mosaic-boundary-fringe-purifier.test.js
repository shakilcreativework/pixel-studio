import { describe, it, expect } from 'vitest';
import { BackgroundRemover } from '../src/core/mosaic/BackgroundRemover.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';

describe('Boundary Edge Fringe Purifier & Crisp Solid Outline Preservation', () => {
  function createTestGridWithFringe() {
    const grid = [];
    const rows = 10;
    const cols = 10;

    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        // Default white background cell (#FFFFFF)
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: 'rgb(255,255,255)',
          sample: { r: 255, g: 255, b: 255, a: 255 },
          occupied: true,
          isRemoved: false,
          sourceAlpha: 255
        });
        row.push(cell);
      }
      grid.push(row);
    }

    // Inner design body (red 255, 0, 0) at (4..5, 4..5)
    for (let r = 4; r <= 5; r++) {
      for (let c = 4; c <= 5; c++) {
        grid[r][c].sample = { r: 255, g: 0, b: 0, a: 255 };
        grid[r][c].color = 'rgb(255,0,0)';
      }
    }

    // Solid Black Outline (#000000) at r=3..6, c=3..6 (excluding inner red)
    for (let r = 3; r <= 6; r++) {
      for (let c = 3; c <= 6; c++) {
        if (r === 3 || r === 6 || c === 3 || c === 6) {
          grid[r][c].sample = { r: 0, g: 0, b: 0, a: 255 };
          grid[r][c].color = 'rgb(0,0,0)';
        }
      }
    }

    // Anti-aliased Transition Fringe cells (#E0E0E0 light grey) sitting outside black outline at r=2, c=3..6
    for (let c = 3; c <= 6; c++) {
      grid[2][c].sample = { r: 224, g: 224, b: 224, a: 255 };
      grid[2][c].color = 'rgb(224,224,224)';
    }

    return grid;
  }

  it('purges anti-aliased light transition fringe cells sitting outside solid black outline', () => {
    const grid = createTestGridWithFringe();

    // Execute background removal on white [255, 255, 255]
    BackgroundRemover.execute(grid, [[255, 255, 255]], 10, 'global', 0);

    // Verify white background cells are removed
    expect(grid[0][0].isRemoved).toBe(true);
    expect(grid[1][1].isRemoved).toBe(true);

    // Verify outer transition fringe cells (r=2, c=3..6) are 100% PURGED
    for (let c = 3; c <= 6; c++) {
      expect(grid[2][c].isRemoved).toBe(true);
    }

    // Verify Solid Black Outline cells (r=3, c=3..6) are 100% PROTECTED & KEPT
    for (let c = 3; c <= 6; c++) {
      expect(grid[3][c].isRemoved).toBe(false);
      expect(grid[3][c].sample.r).toBe(0);
      expect(grid[3][c].sample.g).toBe(0);
      expect(grid[3][c].sample.b).toBe(0);
    }

    // Verify Inner Red Design Body (r=4, c=4) is 100% PROTECTED & KEPT
    expect(grid[4][4].isRemoved).toBe(false);
    expect(grid[4][4].sample.r).toBe(255);
  });
});
