/**
 * ExactCellSampler.js
 * Zero-Color-Loss Center-Pixel Sampling Engine for Pathway B (Pure Pixel Pipeline).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§5, Stage B2).
 *
 * Guaranteed Invariants:
 *   - Output color set ⊆ input color set (ZERO color loss, ZERO interpolated colors).
 *   - Samples the center pixel of each detected grid cell without averaging or OKLab blending.
 *   - Detects non-uniform cell blocks and reports mixel warnings instead of silently smearing colors.
 */

import { CellModel } from './CellModel.js';

export class ExactCellSampler {
  /**
   * Sample grid cells from raw image data with zero color modification.
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {number} options.cellSize
   * @param {number} [options.offsetX=0]
   * @param {number} [options.offsetY=0]
   * @param {string} [options.shape='square']
   * @param {number} [options.rotation=0]
   * @returns {{
   *   grid: Array<Array<CellModel>>,
   *   cells: Array<CellModel>,
   *   palette: Array<Array<number>>,
   *   mixelWarnings: Array<{col: number, row: number, x: number, y: number}>
   * }}
   */
  static sample(sourceImage, options = {}) {
    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;

    const cellSize = Math.max(1, Math.floor(options.cellSize || 16));
    const offsetX = Math.max(0, Math.min(width - 1, Math.floor(options.offsetX || 0)));
    const offsetY = Math.max(0, Math.min(height - 1, Math.floor(options.offsetY || 0)));
    const shape = options.shape || 'square';
    const rotation = options.rotation || 0;

    const cols = Math.floor((width - offsetX) / cellSize);
    const rows = Math.floor((height - offsetY) / cellSize);

    const grid = [];
    const allCells = [];
    const paletteMap = new Map();
    const mixelWarnings = [];

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      const cellY = offsetY + r * cellSize;
      for (let c = 0; c < cols; c++) {
        const cellX = offsetX + c * cellSize;
        // Exact Center Pixel Coordinate
        const centerX = Math.min(width - 1, Math.max(0, cellX + Math.floor(cellSize / 2)));
        const centerY = Math.min(height - 1, Math.max(0, cellY + Math.floor(cellSize / 2)));
        const centerIdx = (centerY * width + centerX) * 4;

        // 1. Dominant Area Frequency Sampling (Unblended Majority Color)
        const colorFreq = new Map();
        let maxCount = 0;
        let dominantR = data[centerIdx];
        let dominantG = data[centerIdx + 1];
        let dominantB = data[centerIdx + 2];
        let dominantA = data[centerIdx + 3];
        let totalOpaquePixels = 0;
        let uniqueColorCount = 0;

        for (let py = cellY; py < Math.min(height, cellY + cellSize); py++) {
          for (let px = cellX; px < Math.min(width, cellX + cellSize); px++) {
            const pIdx = (py * width + px) * 4;
            const pa = data[pIdx + 3];
            if (pa >= 10) {
              totalOpaquePixels++;
              const pr = data[pIdx];
              const pg = data[pIdx + 1];
              const pb = data[pIdx + 2];
              const key = `${pr},${pg},${pb}`;
              const count = (colorFreq.get(key) || 0) + 1;
              colorFreq.set(key, count);
              if (count > maxCount) {
                maxCount = count;
                dominantR = pr;
                dominantG = pg;
                dominantB = pb;
                dominantA = pa;
              }
            }
          }
        }
        uniqueColorCount = colorFreq.size;

        // Use center pixel by default, fallback to dominant frequency if center is transparent
        let cr = data[centerIdx];
        let cg = data[centerIdx + 1];
        let cb = data[centerIdx + 2];
        let ca = data[centerIdx + 3];

        if (ca < 10 && dominantA >= 10 && totalOpaquePixels >= (cellSize * cellSize * 0.25)) {
          cr = dominantR;
          cg = dominantG;
          cb = dominantB;
          ca = dominantA;
        }

        // 2. Cell Variance Guard & Mixel Check
        let hasMixel = false;
        let isNonUniform = false;

        if (uniqueColorCount > 2 || (cellSize >= 4 && ca >= 10)) {
          const checkPoints = [
            [cellX + 1, cellY + 1],
            [cellX + cellSize - 2, cellY + 1],
            [cellX + 1, cellY + cellSize - 2],
            [cellX + cellSize - 2, cellY + cellSize - 2]
          ];
          for (const [px, py] of checkPoints) {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pIdx = (py * width + px) * 4;
              const diff = Math.abs(data[pIdx] - cr) +
                           Math.abs(data[pIdx + 1] - cg) +
                           Math.abs(data[pIdx + 2] - cb);
              if (diff > 45) {
                hasMixel = true;
                break;
              }
            }
          }
        }

        if (uniqueColorCount > 2 && totalOpaquePixels > 0) {
          isNonUniform = true;
        }

        if (hasMixel || isNonUniform) {
          mixelWarnings.push({ col: c, row: r, x: cellX, y: cellY, isNonUniform });
        }

        const isOccupied = ca >= 10;
        const colorKey = `${cr},${cg},${cb}`;
        if (isOccupied && !paletteMap.has(colorKey)) {
          paletteMap.set(colorKey, [cr, cg, cb]);
        }

        const rgbColor = `rgb(${cr},${cg},${cb})`;
        const sample = {
          r: cr,
          g: cg,
          b: cb,
          a: ca,
          centerX,
          centerY
        };

        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: cellX,
          y: cellY,
          width: cellSize,
          height: cellSize,
          shape,
          rotation,
          color: rgbColor,
          sample,
          occupied: isOccupied,
          sourceAlpha: ca
        });

        cell.hasMixel = hasMixel;
        cell.isNonUniform = isNonUniform;
        cell.uniqueColorCount = uniqueColorCount;
        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      grid,
      cells: allCells,
      palette: Array.from(paletteMap.values()),
      mixelWarnings,
      cols,
      rows,
      cellSize
    };
  }
}
