/**
 * DitheringEngine.js
 * Dedicated color distribution dithering algorithms: Bayer (2x2, 4x4, 8x8),
 * Floyd-Steinberg, Atkinson, Ordered, and Random.
 * Strictly operates on fixed discrete pixel cells without modifying geometry.
 */

import { findNearestPaletteColor } from './PaletteEngine.js';

// Bayer Matrices
const BAYER_2X2 = [
  [0, 2],
  [3, 1]
];

const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

export class DitheringEngine {
  /**
   * Apply dithering and map sampled grid colors to target palette.
   * @param {Array<{r, g, b, a}>} rawCells 1D array of sampled cell colors
   * @param {number} width Grid width
   * @param {number} height Grid height
   * @param {Array<Array<number>>} palette Target RGB palette
   * @param {string} algorithm 'none' | 'bayer2' | 'bayer4' | 'bayer8' | 'floyd-steinberg' | 'atkinson' | 'random'
   * @param {number} strength 0.0 to 1.0 (multiplier for error or threshold)
   * @param {string} colorSpace 'oklab' | 'rgb'
   */
  static apply(rawCells, width, height, palette, algorithm = 'none', strength = 1.0, colorSpace = 'oklab') {
    const total = width * height;
    const resultIndexes = new Uint16Array(total);
    const resultAlpha = new Uint8Array(total);

    if (algorithm === 'none' || !algorithm) {
      for (let i = 0; i < total; i++) {
        const cell = rawCells[i];
        if (!cell || cell.a < 10) {
          resultIndexes[i] = 0;
          resultAlpha[i] = 0;
          continue;
        }
        const match = findNearestPaletteColor(cell.r, cell.g, cell.b, palette, colorSpace);
        resultIndexes[i] = match.index;
        resultAlpha[i] = cell.a;
      }
      return { indexes: resultIndexes, alpha: resultAlpha };
    }

    // Bayer matrix dithering
    if (algorithm.startsWith('bayer')) {
      let matrix = BAYER_4X4;
      let mSize = 4;
      let mScale = 16;

      if (algorithm === 'bayer2') {
        matrix = BAYER_2X2;
        mSize = 2;
        mScale = 4;
      } else if (algorithm === 'bayer8') {
        matrix = BAYER_8X8;
        mSize = 8;
        mScale = 64;
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const cell = rawCells[idx];
          if (!cell || cell.a < 10) {
            resultIndexes[idx] = 0;
            resultAlpha[idx] = 0;
            continue;
          }

          const threshold = (matrix[y % mSize][x % mSize] / mScale - 0.5) * 64 * strength;
          const r = Math.max(0, Math.min(255, cell.r + threshold));
          const g = Math.max(0, Math.min(255, cell.g + threshold));
          const b = Math.max(0, Math.min(255, cell.b + threshold));

          const match = findNearestPaletteColor(r, g, b, palette, colorSpace);
          resultIndexes[idx] = match.index;
          resultAlpha[idx] = cell.a;
        }
      }
      return { indexes: resultIndexes, alpha: resultAlpha };
    }

    // Random noise dithering
    if (algorithm === 'random') {
      for (let i = 0; i < total; i++) {
        const cell = rawCells[i];
        if (!cell || cell.a < 10) {
          resultIndexes[i] = 0;
          resultAlpha[i] = 0;
          continue;
        }

        const noise = (Math.random() - 0.5) * 48 * strength;
        const r = Math.max(0, Math.min(255, cell.r + noise));
        const g = Math.max(0, Math.min(255, cell.g + noise));
        const b = Math.max(0, Math.min(255, cell.b + noise));

        const match = findNearestPaletteColor(r, g, b, palette, colorSpace);
        resultIndexes[i] = match.index;
        resultAlpha[i] = cell.a;
      }
      return { indexes: resultIndexes, alpha: resultAlpha };
    }

    // Error Diffusion (Floyd-Steinberg or Atkinson)
    const errR = new Float32Array(total);
    const errG = new Float32Array(total);
    const errB = new Float32Array(total);

    // Populate initial buffers
    for (let i = 0; i < total; i++) {
      const c = rawCells[i] || { r: 0, g: 0, b: 0, a: 0 };
      errR[i] = c.r;
      errG[i] = c.g;
      errB[i] = c.b;
      resultAlpha[i] = c.a;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const alpha = resultAlpha[idx];
        if (alpha < 10) {
          resultIndexes[idx] = 0;
          resultAlpha[idx] = 0;
          continue;
        }

        const oldR = Math.max(0, Math.min(255, Math.round(errR[idx])));
        const oldG = Math.max(0, Math.min(255, Math.round(errG[idx])));
        const oldB = Math.max(0, Math.min(255, Math.round(errB[idx])));

        const match = findNearestPaletteColor(oldR, oldG, oldB, palette, colorSpace);
        resultIndexes[idx] = match.index;

        const newR = match.color[0];
        const newG = match.color[1];
        const newB = match.color[2];

        const diffR = (oldR - newR) * strength;
        const diffG = (oldG - newG) * strength;
        const diffB = (oldB - newB) * strength;

        const distribute = (dx, dy, factor) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            errR[nIdx] += diffR * factor;
            errG[nIdx] += diffG * factor;
            errB[nIdx] += diffB * factor;
          }
        };

        if (algorithm === 'floyd-steinberg') {
          // Floyd-Steinberg kernel: 7/16, 3/16, 5/16, 1/16
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else if (algorithm === 'atkinson') {
          // Atkinson kernel (1/8 each):
          //     *   1   1
          // 1   1   1
          //     1
          distribute(1, 0, 1 / 8);
          distribute(2, 0, 1 / 8);
          distribute(-1, 1, 1 / 8);
          distribute(0, 1, 1 / 8);
          distribute(1, 1, 1 / 8);
          distribute(0, 2, 1 / 8);
        }
      }
    }

    return { indexes: resultIndexes, alpha: resultAlpha };
  }
}
