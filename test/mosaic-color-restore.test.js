import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { ExactCellSampler } from '../src/core/mosaic/ExactCellSampler.js';
import { ColorRestoreEngine } from '../src/core/mosaic/ColorRestoreEngine.js';
import { buildRealColorsSwatchData, MAX_REAL_COLOR_SWATCHES } from '../src/core/mosaic/realColorsSwatchData.js';

/**
 * Tests for the ColorRestoreEngine (full-grid lost-color restoration).
 *
 * Problem: JPEG compression artifacts and blended leftovers leave cells with
 * colors that never existed in the original design, in places the edge-only
 * CleanEdgePurifier does not cover. ColorRestore snaps every occupied design
 * cell back to the nearest TRUE design color (exact sampled colors filtered
 * by grid frequency — no quantization).
 */

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLACK = [0, 0, 0];

// 48x48 synthetic image, 8px flat-color cells:
// red 3x3 block (cells 0..2,0..2), green 3x3 block (cells 3..5,3..5), black rest.
function makeFlatImage() {
  const width = 48, height = 48, cell = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      const [r, g, b] = (cx <= 2 && cy <= 2) ? RED : (cx >= 3 && cy >= 3) ? GREEN : BLACK;
      const idx = (y * width + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function setCellColor(cell, r, g, b) {
  cell.sample.r = r; cell.sample.g = g; cell.sample.b = b;
  cell.color = `rgb(${r},${g},${b})`;
}

describe('ColorRestoreEngine — full-grid lost-color restoration', () => {
  it('snaps artifact colors to the nearest true design color and counts them', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    // Inject JPEG-like artifacts: slightly-off colors (dist to red ≈ 12.4 > tol 12)
    setCellColor(grid[0][0], 247, 8, 5);   // near-red artifact
    setCellColor(grid[4][4], 8, 240, 10);   // near-green artifact
    // Within-tolerance wobble must stay untouched (dist² = 25+9+4=38 < 144)
    setCellColor(grid[0][1], 250, 3, 2);

    const report = ColorRestoreEngine.restore(grid, palette, {});

    expect(report.applied).toBe(true);
    expect(report.restoredCount).toBe(2);
    expect(report.truePaletteSize).toBe(3); // red, green, black
    expect([grid[0][0].sample.r, grid[0][0].sample.g, grid[0][0].sample.b]).toEqual(RED);
    expect([grid[4][4].sample.r, grid[4][4].sample.g, grid[4][4].sample.b]).toEqual(GREEN);
    // Within-tolerance cell untouched
    expect([grid[0][1].sample.r, grid[0][1].sample.g, grid[0][1].sample.b]).toEqual([250, 3, 2]);
    // Exact design cells untouched
    expect([grid[1][1].sample.r, grid[1][1].sample.g, grid[1][1].sample.b]).toEqual(RED);
  });

  it('does not touch protected, removed, or transparent cells', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    setCellColor(grid[0][0], 247, 8, 5);
    grid[0][0].protected = true; // manually protected
    setCellColor(grid[5][5], 10, 10, 250); // would-be artifact on green cell
    grid[5][5].isRemoved = true; // background-removed

    const report = ColorRestoreEngine.restore(grid, palette, {});

    expect(report.restoredCount).toBe(0);
    expect([grid[0][0].sample.r, grid[0][0].sample.g, grid[0][0].sample.b]).toEqual([247, 8, 5]);
    expect([grid[5][5].sample.r, grid[5][5].sample.g, grid[5][5].sample.b]).toEqual([10, 10, 250]);
  });

  it('is a no-op when disabled', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });
    setCellColor(grid[0][0], 247, 8, 5);

    const report = ColorRestoreEngine.restore(grid, palette, { colorRestoreEnabled: false });

    expect(report.applied).toBe(false);
    expect(report.restoredCount).toBe(0);
    expect(grid[0][0].sample.r).toBe(247);
  });

  it('integration: Pathway B restores a JPEG-like artifact cell end-to-end', () => {
    // 64x64 source, 8px TRUE cells; red 4x4 block at 8px-cells (2..5,2..5);
    // source 8px-cell (3,3) is painted as a JPEG artifact (247,8,5).
    const width = 64, height = 64, cell = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        let r = 0, g = 0, b = 0;
        if (cx >= 2 && cx <= 5 && cy >= 2 && cy <= 5) { r = 255; }
        if (cx === 3 && cy === 3) { r = 247; g = 8; b = 5; } // artifact in source
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 16, // must be IGNORED — detected 8px grid wins (16px floor → 2x)
      cleanEdgePurifier: false
    });

    // 8px detected → 16px floor → 4x4 grid; artifact lands in 16px cell (1,1)
    expect(res.appliedCellSize).toBe(16);
    expect(res.colorRestoreReport).toBeDefined();
    expect(res.colorRestoreReport.applied).toBe(true);
    expect(res.colorRestoreReport.restoredCount).toBe(1);
    const cell11 = res.grid[1][1];
    expect([cell11.sample.r, cell11.sample.g, cell11.sample.b]).toEqual([255, 0, 0]);
  });

  it('integration: disabled toggle leaves the artifact cell unchanged', () => {
    const width = 64, height = 64, cell = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        let r = 0, g = 0, b = 0;
        if (cx >= 2 && cx <= 5 && cy >= 2 && cy <= 5) { r = 255; }
        if (cx === 3 && cy === 3) { r = 247; g = 8; b = 5; }
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      cleanEdgePurifier: false,
      colorRestoreEnabled: false
    });

    expect(res.colorRestoreReport.applied).toBe(false);
    expect(res.colorRestoreReport.restoredCount).toBe(0);
    const cell11 = res.grid[1][1];
    expect([cell11.sample.r, cell11.sample.g, cell11.sample.b]).toEqual([247, 8, 5]);
  });

  it('report.truePalette exposes the frequent design colors as hex strings, most-frequent first', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    const report = ColorRestoreEngine.restore(grid, palette, {});

    // 36 cells: black x18, red x9, green x9 — black must come first
    expect(report.truePalette).toHaveLength(3);
    expect(report.truePalette[0]).toBe('#000000');
    expect(new Set(report.truePalette)).toEqual(new Set(['#000000', '#ff0000', '#00ff00']));
    expect(report.truePaletteSize).toBe(3);
  });

  it('report.truePalette excludes rare artifact colors below the frequency bar', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    // Inject a rare artifact near black: frequency 1 < minColorFrequency 3
    setCellColor(grid[5][0], 8, 8, 8);

    const report = ColorRestoreEngine.restore(grid, palette, {});

    expect(report.truePalette).toHaveLength(3);
    expect(report.truePalette).not.toContain('#080808');
    // The rare cell still gets snapped to the nearest true color
    expect(report.restoredCount).toBe(1);
    expect([grid[5][0].sample.r, grid[5][0].sample.g, grid[5][0].sample.b]).toEqual(BLACK);
  });

  it('never snaps a genuinely unique color far from the palette (max snap distance cap)', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    // A true blue detail pixel deep inside the red block: ~360 away from red,
    // far beyond maxSnapDist (tolerance 12 * factor 2 = 24).
    setCellColor(grid[1][1], 0, 0, 255);

    const report = ColorRestoreEngine.restore(grid, palette, {});

    expect(report.restoredCount).toBe(0);
    expect(report.guardedSkips).toBe(1);
    expect([grid[1][1].sample.r, grid[1][1].sample.g, grid[1][1].sample.b]).toEqual([0, 0, 255]);
  });

  it('never snaps a coherent rare detail region, even below the frequency bar', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    // L-shaped trio of near-black cells, frequency 3 < minColorFrequency 4,
    // so it is NOT in the true palette — yet each cell has >=2 neighbors
    // sharing its own color: real detail, not an artifact.
    setCellColor(grid[4][0], 8, 8, 8);
    setCellColor(grid[5][0], 8, 8, 8);
    setCellColor(grid[5][1], 8, 8, 8);

    const report = ColorRestoreEngine.restore(grid, palette, { minColorFrequency: 4 });

    expect(report.restoredCount).toBe(0);
    expect(report.guardedSkips).toBe(3);
    for (const [r, c] of [[4, 0], [5, 0], [5, 1]]) {
      expect([grid[r][c].sample.r, grid[r][c].sample.g, grid[r][c].sample.b]).toEqual([8, 8, 8]);
    }
  });

  it('does not snap a color that is not a blend of its neighbors, even within snap range', () => {
    // Red block (0..2,0..2) + ORANGE block (3..5,0..2, frequent) + black rest.
    // A cell near orange but sitting inside the red block is NOT explainable
    // as a red/neighbor blend — old code snapped it to orange (wrong color).
    const width = 48, height = 48, cell = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        let r = 0, g = 0, b = 0;
        if (cx <= 2 && cy <= 2) { r = 255; }
        else if (cx >= 3 && cy <= 2) { r = 255; g = 128; }
        const idx = (y * width + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    const { grid, palette } = ExactCellSampler.sample({ width, height, data }, { cellSize: 8 });

    // (255,110,10): nearest is orange at dist ~20.6 (within cap 24) but its
    // green channel (110) is far outside the red neighbors' range -> keep.
    setCellColor(grid[0][0], 255, 110, 10);
    const report = ColorRestoreEngine.restore(grid, palette, {});
    expect(report.restoredCount).toBe(0);
    expect(report.guardedSkips).toBe(1);
    expect([grid[0][0].sample.r, grid[0][0].sample.g, grid[0][0].sample.b]).toEqual([255, 110, 10]);

    // Positive control: a true near-red JPEG wobble IS a plausible red blend
    // and must still snap to red (not to the frequent orange).
    const { grid: grid2, palette: palette2 } =
      ExactCellSampler.sample({ width, height, data }, { cellSize: 8 });
    setCellColor(grid2[0][0], 250, 10, 5);
    const report2 = ColorRestoreEngine.restore(grid2, palette2, {});
    expect(report2.restoredCount).toBe(1);
    expect([grid2[0][0].sample.r, grid2[0][0].sample.g, grid2[0][0].sample.b]).toEqual(RED);
  });

  it('rich palettes use a tighter snap factor automatically', () => {
    const src = makeFlatImage();
    const { grid, palette } = ExactCellSampler.sample(src, { cellSize: 8 });

    // dist to red ~23.5: inside the normal cap (24) but outside the rich cap (18).
    setCellColor(grid[0][0], 240, 15, 10);

    const normal = ColorRestoreEngine.restore(grid, palette, {});
    expect(normal.restoredCount).toBe(1);

    const { grid: grid2, palette: palette2 } = ExactCellSampler.sample(src, { cellSize: 8 });
    setCellColor(grid2[0][0], 240, 15, 10);
    const rich = ColorRestoreEngine.restore(grid2, palette2, { richPaletteThreshold: 2 });
    expect(rich.restoredCount).toBe(0);
    expect(rich.guardedSkips).toBe(1);
    expect([grid2[0][0].sample.r, grid2[0][0].sample.g, grid2[0][0].sample.b]).toEqual([240, 15, 10]);
  });
});

describe('buildRealColorsSwatchData — "Real Colors Detected" row shaping', () => {
  it('caps visible swatches at 24 and reports the overflow count', () => {
    const palette = Array.from({ length: 30 }, (_, i) =>
      '#' + i.toString(16).padStart(6, '0'));
    const { swatches, moreCount, total } = buildRealColorsSwatchData(palette);

    expect(swatches).toHaveLength(24);
    expect(swatches).toEqual(palette.slice(0, 24));
    expect(moreCount).toBe(6);
    expect(total).toBe(30);
  });

  it('shows small palettes fully with no overflow label', () => {
    const { swatches, moreCount, total } =
      buildRealColorsSwatchData(['#ff0000', '#00ff00', '#000000']);

    expect(swatches).toEqual(['#ff0000', '#00ff00', '#000000']);
    expect(moreCount).toBe(0);
    expect(total).toBe(3);
  });

  it('handles missing palettes gracefully', () => {
    expect(buildRealColorsSwatchData(undefined)).toEqual({ swatches: [], moreCount: 0, total: 0 });
    expect(buildRealColorsSwatchData(null)).toEqual({ swatches: [], moreCount: 0, total: 0 });
    expect(buildRealColorsSwatchData([])).toEqual({ swatches: [], moreCount: 0, total: 0 });
  });

  it('exposes the 24-swatch cap constant', () => {
    expect(MAX_REAL_COLOR_SWATCHES).toBe(24);
  });
});
