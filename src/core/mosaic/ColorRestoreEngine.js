/**
 * ColorRestoreEngine.js
 * Conservative full-grid "lost color" restoration for Pathway B (Already Pixel Art).
 *
 * Problem: JPEG compression artifacts and blended leftovers leave cells with
 * colors that never existed in the original design — in places the edge-only
 * CleanEdgePurifier does not cover (the red-arrow artifacts in user reports).
 * This pass snaps artifact cells back to the nearest TRUE design color.
 *
 * True palette = exact sampled colors (no quantization — straight from
 * ExactCellSampler) filtered by grid frequency: real design colors repeat
 * across many cells, while artifact colors are rare.
 *
 * CONSERVATIVE (blend-aware) snapping — a cell is only snapped when ALL hold:
 *   (a) its color is beyond `tolerance` of the nearest true palette color;
 *   (b) that nearest palette color is within `maxSnapDist` — genuinely unique
 *       design colors (far from every frequent color) are NEVER touched;
 *   (c) blend-plausible: the color lies within the per-channel range of its
 *       8 neighbors (±blendSlack), i.e. it is explainable as a blend/sampling
 *       artifact of its surroundings — not a distinct color of its own;
 *   (d) not a coherent detail: fewer than `coherentNeighborCount` neighbors
 *       share the cell's own color (within tolerance). This protects tiny but
 *       REAL detail regions and dithering patterns, even when they are rare
 *       globally.
 * Rich palettes (AI art with gradients/shading, e.g. 200+ colors) automatically
 * use a tighter snap factor, because "rare = artifact" breaks down there.
 *
 * Safety: never touches background/removed cells, transparent cells,
 * protected cells, trim-locked cells, or manual-override cells. Cells already
 * within tolerance of a true design color are left unchanged.
 *
 * The report also exposes `truePalette` (hex strings, most-frequent first)
 * for display-only transparency UI — it does not affect restoration logic.
 */

import { rgbToHex } from '../pixel-art/PaletteEngine.js';

export class ColorRestoreEngine {
  /**
   * @param {Array<Array<Object>>} grid - CellModel grid (mutated in place)
   * @param {Array<Array<number>>} sourcePalette - exact [r,g,b] colors from ExactCellSampler
   * @param {Object} options
   * @param {boolean} [options.colorRestoreEnabled=true]
   * @param {number} [options.colorRestoreTolerance=12] - RGB euclidean distance, 0-48
   * @param {number} [options.minColorFrequency=3] - min cell count for a "true" design color
   * @param {number} [options.maxSnapFactor=2.0] - max snap distance = tolerance * factor
   * @param {number} [options.richPaletteThreshold=60] - palette size above which the
   *   snap factor tightens to `richPaletteSnapFactor`
   * @param {number} [options.richPaletteSnapFactor=1.5]
   * @param {number} [options.coherentNeighborCount=2] - neighbors sharing the cell's
   *   own color (within tolerance) that mark it as real detail, never snapped
   * @param {Object} [options.manualOverrides]
   * @param {Set} [options.protectedIds]
   * @param {Set} [options.manualRestoreIds]
   * @param {Set} [options.manualRemoveIds]
   * @returns {{ applied: boolean, restoredCount: number, guardedSkips: number,
   *   truePaletteSize: number, totalChecked: number, truePalette: string[] }}
   */
  static restore(grid, sourcePalette, options = {}) {
    const report = {
      applied: false, restoredCount: 0, guardedSkips: 0,
      truePaletteSize: 0, totalChecked: 0, truePalette: []
    };
    const enabled = options.colorRestoreEnabled !== false;
    if (!enabled || !Array.isArray(grid) || grid.length === 0) return report;
    if (!Array.isArray(sourcePalette) || sourcePalette.length === 0) return report;

    const tolerance = Math.max(0, Math.min(48,
      options.colorRestoreTolerance !== undefined ? options.colorRestoreTolerance : 12));
    const minFreq = Math.max(1,
      options.minColorFrequency !== undefined ? options.minColorFrequency : 3);
    const tolSq = tolerance * tolerance;

    const richThreshold = options.richPaletteThreshold !== undefined ? options.richPaletteThreshold : 60;
    const snapFactor = options.maxSnapFactor !== undefined ? options.maxSnapFactor : 2.0;
    const richSnapFactor = options.richPaletteSnapFactor !== undefined ? options.richPaletteSnapFactor : 1.5;
    const coherentNeed = options.coherentNeighborCount !== undefined ? options.coherentNeighborCount : 2;

    const distSq = (a, b) => {
      const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
      return dr * dr + dg * dg + db * db;
    };

    // 1. Frequency of each exact color across occupied cells
    const freq = new Map();
    const occupiedCells = [];
    for (const row of grid) {
      for (const cell of row) {
        if (!cell || cell.isRemoved || !cell.sample || cell.sample.a < 10) continue;
        occupiedCells.push(cell);
        const key = `${cell.sample.r},${cell.sample.g},${cell.sample.b}`;
        freq.set(key, (freq.get(key) || 0) + 1);
      }
    }
    if (occupiedCells.length === 0) return report;

    // 2. True palette: exact source colors meeting the frequency bar,
    // sorted most-frequent first for display transparency.
    const colorKey = (c) => `${c[0]},${c[1]},${c[2]}`;
    let truePalette = sourcePalette.filter(
      c => (freq.get(colorKey(c)) || 0) >= minFreq
    );
    if (truePalette.length === 0) {
      // Fallback: never leave the palette empty — use the most frequent color
      let bestKey = null, bestCount = 0;
      for (const [key, count] of freq) {
        if (count > bestCount) { bestCount = count; bestKey = key; }
      }
      truePalette = [bestKey.split(',').map(Number)];
    }
    truePalette.sort((a, b) => (freq.get(colorKey(b)) || 0) - (freq.get(colorKey(a)) || 0));
    report.truePaletteSize = truePalette.length;
    report.truePalette = truePalette.map(c => rgbToHex(c[0], c[1], c[2]));

    // Conservative snap budget: rich palettes snap more carefully.
    const richPalette = truePalette.length > richThreshold;
    const maxSnapDist = tolerance * (richPalette ? richSnapFactor : snapFactor);
    const maxSnapDistSq = maxSnapDist * maxSnapDist;
    const blendSlack = maxSnapDist;

    const isLocked = (cell) => {
      const keys = [cell.id, `${cell.col},${cell.row}`];
      return cell.protected || cell.trimLocked ||
        keys.some(k => options.manualOverrides?.[k] || options.protectedIds?.has?.(k) ||
          options.manualRestoreIds?.has?.(k) || options.manualRemoveIds?.has?.(k));
    };

    const nearest = (rgb) => {
      let best = truePalette[0], bestD = Infinity;
      for (const p of truePalette) {
        const d = distSq(rgb, p);
        if (d < bestD) { bestD = d; best = p; }
      }
      return { color: best, distSq: bestD };
    };

    // Snapshot original samples so neighbor checks never see in-place
    // mutation order effects from cells snapped earlier in the loop.
    const original = new Map();
    for (const cell of occupiedCells) {
      original.set(cell, [cell.sample.r, cell.sample.g, cell.sample.b]);
    }
    const rows = grid.length;
    const neighborRgbs = (cell) => {
      const out = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = cell.row + dr, c = cell.col + dc;
          if (r < 0 || c < 0 || r >= rows) continue;
          const rowArr = grid[r];
          if (!rowArr || c >= rowArr.length) continue;
          const n = rowArr[c];
          if (!n || n.isRemoved || !n.sample || n.sample.a < 10) continue;
          const rgb = original.get(n);
          if (rgb) out.push(rgb);
        }
      }
      return out;
    };

    // 3. Conservative snap: every guard must pass before a cell is touched.
    let restored = 0;
    let guardedSkips = 0;
    for (const cell of occupiedCells) {
      if (isLocked(cell)) continue;
      const rgb = original.get(cell);
      const { color, distSq: d } = nearest(rgb);
      if (d <= tolSq) continue; // (a) already a true design color (within tolerance)
      if (d > maxSnapDistSq) { guardedSkips++; continue; } // (b) unique color — never touch
      const neighbors = neighborRgbs(cell);
      if (neighbors.length === 0) { guardedSkips++; continue; } // isolated — do not guess
      let coherent = 0; // (d) tiny-but-real detail region / dithering?
      for (const n of neighbors) {
        if (distSq(rgb, n) <= tolSq) coherent++;
      }
      if (coherent >= coherentNeed) { guardedSkips++; continue; }
      let plausible = true; // (c) explainable as a blend of its surroundings?
      for (let k = 0; k < 3; k++) {
        let mn = Infinity, mx = -Infinity;
        for (const n of neighbors) {
          if (n[k] < mn) mn = n[k];
          if (n[k] > mx) mx = n[k];
        }
        if (rgb[k] < mn - blendSlack || rgb[k] > mx + blendSlack) { plausible = false; break; }
      }
      if (!plausible) { guardedSkips++; continue; }

      cell.sample.r = color[0];
      cell.sample.g = color[1];
      cell.sample.b = color[2];
      cell.color = `rgb(${color[0]},${color[1]},${color[2]})`;
      restored++;
    }

    report.applied = true;
    report.restoredCount = restored;
    report.guardedSkips = guardedSkips;
    report.totalChecked = occupiedCells.length;
    return report;
  }
}
