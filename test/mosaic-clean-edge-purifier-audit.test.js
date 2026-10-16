import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

/**
 * Regression tests for the Clean Edge Purifier audit (2026-10-14).
 *
 * Two bugs were caught by a synthetic AI-art audit (fringe ring + white bg):
 *  1. RESURRECTION: the purifier recolored near-white fringe cells (which the
 *     pipeline's background removal would have deleted) into darker colors,
 *     materializing a "shadow" ring of NEW cells outside the true silhouette.
 *  2. ALOMALO CANDIDATES: restoration candidates came from ALL sampled colors
 *     (including fringe blends), so muddy edges were "restored" into other
 *     muddy colors instead of true design colors.
 *
 * Contract under test: the purifier never adds cells outside the baseline
 * silhouette, never touches deep-interior cells, and every recolor lands on a
 * true interior design color.
 */
function buildFringedSprite() {
  const CELL = 16, GW = 32, GH = 32, W = GW * CELL, H = GH * CELL;
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const GREENS = [[30, 107, 52], [53, 160, 90], [126, 217, 87]];
  const data = new Uint8ClampedArray(W * H * 4);
  const fillCell = (c, r, rgb, noise = 0) => {
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const n = noise ? Math.round((rnd() * 2 - 1) * noise) : 0;
      const i = ((r * CELL + y) * W + c * CELL + x) * 4;
      data[i] = rgb[0] + n; data[i + 1] = rgb[1] + n; data[i + 2] = rgb[2] + n; data[i + 3] = 255;
    }
  };
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) fillCell(c, r, [255, 255, 255], 4);
  const inBlob = (c, r) => (c - 16) ** 2 + (r - 14) ** 2 <= 81;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (!inBlob(c, r)) continue;
    const d = Math.sqrt((c - 16) ** 2 + (r - 14) ** 2);
    fillCell(c, r, d < 3.5 ? GREENS[0] : d < 6.5 ? GREENS[1] : GREENS[2], 2);
  }
  const amounts = [0.12, 0.22, 0.35, 0.5, 0.65, 0.8];
  let ai = 0;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (inBlob(c, r)) continue;
    let adj = false;
    for (let dr = -1; dr <= 1 && !adj; dr++)
      for (let dc = -1; dc <= 1 && !adj; dc++) if (inBlob(c + dc, r + dr)) adj = true;
    if (!adj) continue;
    const amt = amounts[ai++ % amounts.length];
    const g = GREENS[ai % 3];
    fillCell(c, r, [0, 1, 2].map(k => Math.round(255 + amt * (g[k] - 255))), 2);
  }
  return { width: W, height: H, data };
}

const baseOpts = {
  inputMode: 'pixel-art',
  forceTileSize: 16,
  minOutputCellSize: 16,
  fitDocumentToDesign: false,
  shape: 'square', spacing: 0, rotation: 0,
  transparentBg: true,
  bgRemovalMode: 'white',
  colorTolerance: 20,
  cleanEdgePurifier: false, cleanEdgeScope: 'off',
  edgeFringeCleanup: false,
  colorRestoreEnabled: false, colorRestoreTolerance: 12,
};

const occ = (grid, r, c) => {
  const cell = grid[r]?.[c];
  return cell && !cell.isRemoved && cell.sample && cell.sample.a >= 10 ? cell : null;
};
const col = (cell) => [cell.sample.r, cell.sample.g, cell.sample.b];
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));

describe('CleanEdgePurifier audit contract', () => {
  const img = buildFringedSprite();
  const baseRes = MosaicEngine.process(img, baseOpts);
  const pureRes = MosaicEngine.process(img, { ...baseOpts, cleanEdgePurifier: true, cleanEdgeScope: 'outer' });
  const baseGrid = baseRes.grid, pureGrid = pureRes.grid;

  // True design colors: deep-interior baseline samples.
  const trueColors = [];
  const deepInterior = new Set();
  for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
    if (!occ(baseGrid, r, c)) continue;
    let deep = true;
    for (let dr = -1; dr <= 1 && deep; dr++)
      for (let dc = -1; dc <= 1 && deep; dc++) if (!occ(baseGrid, r + dr, c + dc)) deep = false;
    if (deep) { deepInterior.add(`${c},${r}`); trueColors.push(col(occ(baseGrid, r, c))); }
  }

  it('never adds cells outside the baseline silhouette (no resurrection)', () => {
    let added = 0;
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
      if (!occ(baseGrid, r, c) && occ(pureGrid, r, c)) added++;
    }
    expect(added).toBe(0);
  });

  it('never recolors deep-interior cells', () => {
    for (const key of deepInterior) {
      const [c, r] = key.split(',').map(Number);
      const b = occ(baseGrid, r, c), v = occ(pureGrid, r, c);
      if (b && v) expect(col(v)).toEqual(col(b));
    }
  });

  it('recolors only to true interior design colors (no alomalo picks)', () => {
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
      const b = occ(baseGrid, r, c), v = occ(pureGrid, r, c);
      if (b && v && col(v).join() !== col(b).join()) {
        const nearest = Math.min(...trueColors.map(t => dist(col(v), t)));
        expect(nearest).toBeLessThanOrEqual(12);
      }
    }
  });

  it('still corrects some boundary blends (the feature keeps working)', () => {
    expect(pureRes.edgePurifierReport.backgroundDetected).toBe(true);
    expect(pureRes.edgePurifierReport.correctedCells).toBeGreaterThan(0);
  });
});
