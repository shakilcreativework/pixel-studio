import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { ExactCellSampler } from '../src/core/mosaic/ExactCellSampler.js';
import { EdgeCleaner } from '../src/core/mosaic/EdgeCleaner.js';

/**
 * Tests for EdgeCleaner ("Edge Cleaner" outside-edge fringe removal).
 *
 * The user asked for a feature that ONLY removes outside-edge light-graded
 * pixels (blur/shade fringe) and makes them background — never recoloring
 * anything. The decision is "how close is this edge pixel to the pure
 * background", with guards that understand background vs edge:
 *   - strong-color match (real design color, e.g. white bark) -> keep
 *   - coherent region (intentional detail) -> keep
 *   - locked/protected/manual -> keep
 *   - close to pure background -> remove (transparent)
 */

const WHITE = [255, 255, 255];
const GREEN = [60, 180, 70];

// 56x56, 8px cells -> 7x7 grid. Green sprite pixels [16,40)^2 on white.
// `fringePaint` optionally paints the 1-cell ring just above the sprite
// (grid row 1, cols 2..4).
function makeSpriteImage(fringePaint = null) {
  const width = 56, height = 56;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let [r, g, b] = WHITE;
      if (x >= 16 && x < 40 && y >= 16 && y < 40) [r, g, b] = GREEN;
      if (fringePaint && x >= 16 && x < 40 && y >= 8 && y < 16) [r, g, b] = fringePaint;
      const idx = (y * width + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

const sampleOf = (cell) => [cell.sample.r, cell.sample.g, cell.sample.b];

describe('EdgeCleaner — outside-edge light fringe removal', () => {
  it('removes light-graded fringe close to the background', () => {
    // Light gray fringe (235) — close to white bg -> removed
    const src = makeSpriteImage([235, 235, 235]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.applied).toBe(true);
    expect(report.backgroundDetected).toBe(true);
    expect(report.removedCount).toBe(3); // fringe cells (2,1),(3,1),(4,1)
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(true);
    }
    // Interior design untouched
    expect(grid[3][3].isRemoved).toBe(false);
    expect(sampleOf(grid[3][3])).toEqual(GREEN);
  });

  it('keeps saturated edge colors far from the background (never recolors)', () => {
    // Saturated light green at the edge — far from white bg -> kept as-is
    const src = makeSpriteImage([110, 220, 120]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.removedCount).toBe(0);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(false);
      expect(sampleOf(grid[1][c])).toEqual([110, 220, 120]); // exact color kept
    }
  });

  it('removes COHERENT light fringe bands (smooth top/bottom anti-aliasing)', () => {
    // A uniform light-gray band at the edge is coherent (>=2 similar
    // neighbors) but still fringe — the light path must NOT be protected by
    // the coherence guard. Real light colors stay via the strong-match guard.
    const width = 96, height = 48; // 12x6 cells
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 80 && y >= 16 && y < 40) [r, g, b] = GREEN;
        if (x >= 16 && x < 80 && y >= 8 && y < 16) [r, g, b] = [205, 205, 205]; // 8-cell fringe band
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.removedCount).toBe(8);
    for (let c = 2; c <= 9; c++) {
      expect(grid[1][c].isRemoved).toBe(true);
    }
    expect(grid[2][5].isRemoved).toBe(false); // green interior kept
  });


  it('keeps coherent white regions at the edge (white bark on white bg)', () => {
    // A 2x2 block of near-white "bark" at the boundary with white interior:
    // coherent + matches interior color -> kept, NOT eaten as background.
    const width = 56, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        // white "bark" column x in [16,32), y in [8,48) — wider than fringe
        if (x >= 16 && x < 32 && y >= 8 && y < 48) [r, g, b] = [242, 242, 242];
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.applied).toBe(true);
    expect(report.removedCount).toBe(0); // bark understood as edge, not background
    expect(grid[1][2].isRemoved).toBe(false);
    expect(sampleOf(grid[1][2])).toEqual([242, 242, 242]);
  });

  it('strength slider controls aggression: higher removes darker fringe', () => {
    // Mid gray (200) — distance ~95 from white.
    // At 10% (dist ~44) it survives; at 40% (dist ~177) it is removed.
    const src = makeSpriteImage([200, 200, 200]);

    const low = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });
    const rLow = EdgeCleaner.apply(low.grid, src, { edgeCleanerStrength: 10 });
    expect(rLow.removedCount).toBe(0);

    const high = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });
    const rHigh = EdgeCleaner.apply(high.grid, src, { edgeCleanerStrength: 40 });
    expect(rHigh.removedCount).toBe(3);
  });

  it('never touches interior cells, even light ones', () => {
    const src = makeSpriteImage([235, 235, 235]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });
    // Paint a light interior cell manually (not adjacent to exterior)
    grid[3][3].sample.r = 240; grid[3][3].sample.g = 240; grid[3][3].sample.b = 240;

    EdgeCleaner.apply(grid, src, {});

    expect(grid[3][3].isRemoved).toBe(false);
  });

  it('is a no-op when disabled', () => {
    const src = makeSpriteImage([235, 235, 235]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, { edgeCleanerEnabled: false });

    expect(report.applied).toBe(false);
    expect(report.removedCount).toBe(0);
    expect(grid[1][2].isRemoved).toBe(false);
  });

  it('is a no-op without a confidently detected flat background', () => {
    // Checkerboard border -> no dominant background
    const width = 56, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const white = ((x + y) % 2 === 0);
        const idx = (y * width + x) * 4;
        data[idx] = white ? 255 : 0; data[idx + 1] = white ? 255 : 0;
        data[idx + 2] = white ? 255 : 0; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.applied).toBe(false);
    expect(report.backgroundDetected).toBe(false);
  });

  it('does not touch protected cells', () => {
    const src = makeSpriteImage([235, 235, 235]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, { protectedIds: new Set(['2,1']) });

    expect(report.removedCount).toBe(2);
    expect(grid[1][2].isRemoved).toBe(false);
  });

  it('removes small dark specks at the edge with no interior match (dark junk)', () => {
    // Two pure-black cells at the boundary, black appears nowhere inside —
    // like the birch-top artifact dashes. Must be removed, not "added".
    const width = 56, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 40 && y >= 16 && y < 40) [r, g, b] = GREEN;
        if (x >= 16 && x < 32 && y >= 8 && y < 16) [r, g, b] = [5, 5, 5]; // dark dash
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.darkRemovedCount).toBe(2);
    expect(grid[1][2].isRemoved).toBe(true);
    expect(grid[1][3].isRemoved).toBe(true);
    // Interior design untouched
    expect(grid[3][3].isRemoved).toBe(false);
    expect(sampleOf(grid[3][3])).toEqual(GREEN);
  });

  it('keeps dark outlines whose color exists in the interior', () => {
    // Dark blue-green at the boundary AND in the interior — like the pine's
    // real dark outline. Must be kept.
    const DARK = [10, 20, 40];
    const width = 56, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 40 && y >= 16 && y < 40) [r, g, b] = GREEN;
        if (x >= 24 && x < 32 && y >= 24 && y < 32) [r, g, b] = DARK; // interior dark
        if (x >= 16 && x < 32 && y >= 8 && y < 16) [r, g, b] = DARK; // dark edge
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.darkRemovedCount).toBe(0);
    expect(report.removedCount).toBe(0);
    expect(grid[1][2].isRemoved).toBe(false);
    expect(sampleOf(grid[1][2])).toEqual(DARK);
  });

  it('keeps long dark runs even when the color is unique to the edge (conservative)', () => {
    // A 12-cell black line at the boundary, black nowhere inside: a long run
    // reads as an outline, not a speck — kept.
    const width = 112, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 96 && y >= 16 && y < 40) [r, g, b] = GREEN;
        if (x >= 8 && x < 104 && y >= 8 && y < 16) [r, g, b] = [5, 5, 5];
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, {});

    expect(report.darkRemovedCount).toBe(0);
    for (let c = 1; c <= 12; c++) {
      expect(grid[1][c].isRemoved).toBe(false);
    }
  });

  it('dark-shading mode removes matched dark edge halos; default keeps them', () => {
    // Dark olive band at the boundary whose color exists in the interior FAR
    // away (like the birch-top halo): default keeps it, dark-shading mode
    // removes it because it is darker than every nearby interior cell.
    const DARKOLIVE = [57, 77, 15];
    const width = 320, height = 96; // 40x12 cells
    const makeSrc = () => {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let [r, g, b] = WHITE;
          if (x >= 16 && x < 304 && y >= 16 && y < 80) [r, g, b] = GREEN;
          if (x >= 152 && x < 160 && y >= 56 && y < 64) [r, g, b] = DARKOLIVE; // far interior
          const idx = (y * width + x) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
        }
      }
      // 15-cell dark band at the top edge (row 1, cols 3-17)
      for (let y = 8; y < 16; y++)
        for (let x = 24; x < 144; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = DARKOLIVE[0]; data[idx + 1] = DARKOLIVE[1]; data[idx + 2] = DARKOLIVE[2];
        }
      return { width, height, data };
    };

    const src1 = makeSrc();
    const g1 = ExactCellSampler.sample(src1, { cellSize: 8, offsetX: 0, offsetY: 0 });
    const r1 = EdgeCleaner.apply(g1.grid, src1, {});
    expect(r1.darkRemovedCount).toBe(0);
    expect(g1.grid[1][3].isRemoved).toBe(false);

    const src2 = makeSrc();
    const g2 = ExactCellSampler.sample(src2, { cellSize: 8, offsetX: 0, offsetY: 0 });
    const r2 = EdgeCleaner.apply(g2.grid, src2, { edgeCleanerDarkShading: true });
    expect(r2.darkRemovedCount).toBe(15);
    for (let c = 3; c <= 17; c++) {
      expect(g2.grid[1][c].isRemoved).toBe(true);
    }
    // Far interior dark kept in both modes
    expect(g2.grid[7][19].isRemoved).toBe(false);
  });

  it('dark-shading mode still keeps very long dark runs (real outlines)', () => {
    // 35-cell matched dark run: an outline, not a halo — kept even in shading mode.
    const DARKOLIVE = [57, 77, 15];
    const width = 320, height = 96; // 40x12 cells
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 304 && y >= 16 && y < 80) [r, g, b] = GREEN;
        if (x >= 152 && x < 160 && y >= 56 && y < 64) [r, g, b] = DARKOLIVE; // far interior
        if (x >= 16 && x < 296 && y >= 8 && y < 16) [r, g, b] = DARKOLIVE; // 35-cell run
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeCleaner.apply(grid, src, { edgeCleanerDarkShading: true });

    expect(report.darkRemovedCount).toBe(0);
    expect(grid[1][2].isRemoved).toBe(false);
    expect(grid[1][20].isRemoved).toBe(false);
  });

  it('runs in Pathway B (Already Pixel Art) and reports to the UI', () => {
    // 64x64, 16px cells -> stable 4x4 grid. Green sprite [16,48)^2, light
    // fringe ring on the row above it.
    const width = 64, height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let [r, g, b] = WHITE;
        if (x >= 16 && x < 48 && y >= 16 && y < 48) [r, g, b] = GREEN;
        if (x >= 16 && x < 48 && y >= 0 && y < 16) [r, g, b] = [235, 235, 235];
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };

    const res = MosaicEngine.process(src, {
      inputMode: 'pixel-art',
      forceTileSize: 16,
      cleanEdgePurifier: false,
      colorRestoreEnabled: false,
      edgeFringeCleanup: false,
      edgeCleanerEnabled: true
    });

    expect(res.edgeCleanerReport).toBeDefined();
    expect(res.edgeCleanerReport.applied).toBe(true);
    expect(res.edgeCleanerReport.backgroundDetected).toBe(true);
    expect(res.edgeCleanerReport.removedCount).toBe(2); // fringe cells (0,1),(0,2)
    expect(res.grid[0][1].isRemoved).toBe(true);
    expect(res.grid[0][2].isRemoved).toBe(true);
    expect(res.grid[1][1].isRemoved).toBe(false); // interior design kept
    expect(sampleOf(res.grid[1][1])).toEqual(GREEN);
  });
});
