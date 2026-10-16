import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { ExactCellSampler } from '../src/core/mosaic/ExactCellSampler.js';
import { EdgeFringeCleanup } from '../src/core/mosaic/EdgeFringeCleanup.js';

/**
 * Tests for EdgeFringeCleanup ("Pure Edge" silhouette cleanup).
 *
 * AI-generated pixel art anti-aliases sprite silhouettes: the outermost art
 * pixels are design+background blends (gray/white fringe). The sampler
 * faithfully reproduces them, so the silhouette looks shaded/blurry.
 * This pass resolves each exterior boundary cell crisply:
 *   - mostly-background fringe  -> removed (transparent)
 *   - mid-blend fringe          -> snapped to the pure design color
 *   - strong design colors      -> untouched (outlines, highlights)
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

describe('EdgeFringeCleanup — pure silhouette edges', () => {
  it('removes mostly-background fringe at the silhouette', () => {
    // 0.15 green + 0.85 white ≈ (226,244,228): design amount ~0.15 -> transparent
    const src = makeSpriteImage([226, 244, 228]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.applied).toBe(true);
    expect(report.backgroundDetected).toBe(true);
    expect(report.removedCount).toBe(3); // fringe cells (2,1),(3,1),(4,1)
    expect(report.snappedCount).toBe(0);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(true);
    }
    // Interior design untouched
    expect(grid[3][3].isRemoved).toBe(false);
    expect(sampleOf(grid[3][3])).toEqual(GREEN);
  });

  it('snaps mid-blend fringe to the pure design color (snap mode)', () => {
    // 0.6 green + 0.4 white ≈ (138,210,142): design amount ~0.6 -> snap to green
    const src = makeSpriteImage([138, 210, 142]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, { pureEdgeMode: 'snap' });

    expect(report.removedCount).toBe(0);
    expect(report.snappedCount).toBe(3);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(false);
      expect(sampleOf(grid[1][c])).toEqual(GREEN);
    }
  });

  it('strict mode (default) removes mid-blend fringe instead of recoloring it', () => {
    // Same mid-blend fringe: strict mode must NEVER recolor, only remove.
    const src = makeSpriteImage([138, 210, 142]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {}); // default = strict

    expect(report.removedCount).toBe(3);
    expect(report.snappedCount).toBe(0);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(true);
    }
    // Interior design untouched
    expect(grid[3][3].isRemoved).toBe(false);
    expect(sampleOf(grid[3][3])).toEqual(GREEN);
  });

  it('strict mode keeps strong design colors and thin features untouched', () => {
    // Dark outline (amount ~1.0) must survive strict removal.
    const src = makeSpriteImage([20, 40, 22]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, { pureEdgeMode: 'strict' });

    expect(report.removedCount).toBe(0);
    expect(report.snappedCount).toBe(0);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(false);
      expect(sampleOf(grid[1][c])).toEqual([20, 40, 22]);
    }
  });

  it('never touches strong design colors at the edge (dark outline)', () => {
    // Dark outline color: projects beyond the design vector (amount > 1) and
    // is not a background blend -> must stay exactly as sampled.
    const src = makeSpriteImage([20, 60, 30]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.removedCount).toBe(0);
    expect(report.snappedCount).toBe(0);
    for (const c of [2, 3, 4]) {
      expect(grid[1][c].isRemoved).toBe(false);
      expect(sampleOf(grid[1][c])).toEqual([20, 60, 30]);
    }
  });

  it('never touches coherent regions, even when blend-like', () => {
    // 2x2 neutral gray patch at the silhouette: each cell shares its color
    // with >=2 neighbors -> intentional detail, not fringe.
    const src = makeSpriteImage(null);
    // paint 2x2 gray patch at grid cells (2..3, 1..2) -> pixels [16,32)x[8,24)
    for (let y = 8; y < 24; y++) {
      for (let x = 16; x < 32; x++) {
        const idx = (y * src.width + x) * 4;
        src.data[idx] = 200; src.data[idx + 1] = 200; src.data[idx + 2] = 200;
      }
    }
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.removedCount).toBe(0);
    expect(report.snappedCount).toBe(0);
    for (const [r, c] of [[1, 2], [1, 3], [2, 2], [2, 3]]) {
      expect(grid[r][c].isRemoved).toBe(false);
      expect(sampleOf(grid[r][c])).toEqual([200, 200, 200]);
    }
  });

  it('leaves clean silhouettes (no fringe) completely alone', () => {
    const src = makeSpriteImage(null); // crisp green sprite, white bg
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.applied).toBe(true);
    expect(report.removedCount).toBe(0);
    expect(report.snappedCount).toBe(0);
  });

  it('is a no-op when disabled', () => {
    const src = makeSpriteImage([226, 244, 228]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, { edgeFringeCleanup: false });

    expect(report.applied).toBe(false);
    expect(report.removedCount).toBe(0);
    expect(grid[1][2].isRemoved).toBe(false);
  });

  it('is a no-op without a confidently detected flat background', () => {
    // Border has no dominant color (checkerboard) -> cannot judge fringe.
    const width = 56, height = 56;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = ((x + y) % 2 === 0) ? 0 : 255;
        const idx = (y * width + x) * 4;
        data[idx] = v; data[idx + 1] = v; data[idx + 2] = v; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.applied).toBe(false);
    expect(report.backgroundDetected).toBe(false);
  });

  it('does not touch protected cells', () => {
    const src = makeSpriteImage([226, 244, 228]);
    const { grid } = ExactCellSampler.sample(src, { cellSize: 8, offsetX: 0, offsetY: 0 });
    grid[1][2].protected = true;

    const report = EdgeFringeCleanup.apply(grid, src, {});

    expect(report.removedCount).toBe(2); // only the unprotected fringe cells
    expect(grid[1][2].isRemoved).toBe(false);
    expect(sampleOf(grid[1][2])).toEqual([226, 244, 228]);
  });

  it('integration: Pathway B exposes edgeFringeReport and cleans the fringe', () => {
    // 112x112, 16px art cells (forceTileSize skips detection): green sprite
    // pixels [32,80)^2, 16px fringe ring [32,80)x[16,32) above it.
    const width = 112, height = 112;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 255, g = 255, b = 255;
        if (x >= 32 && x < 80 && y >= 32 && y < 80) { r = 60; g = 180; b = 70; }
        if (x >= 32 && x < 80 && y >= 16 && y < 32) { r = 226; g = 244; b = 228; }
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const src = { width, height, data };

    const res = MosaicEngine.process(src, {
      inputMode: 'pixel-art',
      forceTileSize: 16,
      cleanEdgePurifier: false,
      colorRestoreEnabled: false
    });

    expect(res.edgeFringeReport).toBeDefined();
    expect(res.edgeFringeReport.applied).toBe(true);
    expect(res.edgeFringeReport.backgroundDetected).toBe(true);
    expect(res.edgeFringeReport.removedCount).toBe(3); // fringe cells (2,1),(3,1),(4,1)
    expect(res.grid[1][2].isRemoved).toBe(true);
    expect(res.grid[3][3].isRemoved).toBe(false); // interior design kept
  });
});
