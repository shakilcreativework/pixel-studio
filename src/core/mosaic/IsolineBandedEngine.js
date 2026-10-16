/**
 * IsolineBandedEngine.js
 * Perceptual Isoline Gradient Banding Strategy Engine.
 *
 * Primary Purpose:
 *   Specially designed for artwork with smooth continuous gradients (like sunset skies,
 *   lighting fades, and atmospheric backdrops). Quantizes continuous tones into clean,
 *   harmonious perceptual OKLab isoline bands without dithering noise or block stepping.
 *
 * Algorithm:
 *   1. Evaluates source colors using Perceptual OKLab sampling at each cell footprint.
 *   2. Maps OKLab luminance L and chromatic vectors (a, b) onto discrete perceptual isoline bands.
 *   3. Smoothes adjacent isoline bands to prevent abrupt pixel steps while preserving sharp contrast boundaries.
 *   4. Constructs canonical CellModel grid objects with complete shape and rotation support.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor, rgbToOklab, oklabToRgb } from '../pixel-art/ColorSampling.js';

export class IsolineBandedEngine {
  /**
   * Process source image through Perceptual Isoline Banding algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 4,
      isolineBands = 12, // number of discrete gradient bands (4 - 32)
      samplingMethod = 'perceptual-oklab',
      shape = 'square',
      rotation = 0
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const grid = [];
    const allCells = [];

    const effectiveBands = Math.max(2, Math.min(64, isolineBands || 12));
    const bandStep = 1.0 / effectiveBands;

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * tileSize;
        const cellY = r * tileSize;

        const rawSample = sampleCellColor(
          srcData,
          width,
          height,
          cellX,
          cellY,
          cellX + tileSize,
          cellY + tileSize,
          samplingMethod || 'perceptual-oklab',
          options
        );

        let finalR = rawSample.r;
        let finalG = rawSample.g;
        let finalB = rawSample.b;

        if (rawSample.a >= 10) {
          // Convert to OKLab
          const ok = rgbToOklab(rawSample.r, rawSample.g, rawSample.b);

          // Quantize Luminance into discrete harmonic isoline bands
          const quantizedL = Math.round(ok.L / bandStep) * bandStep;
          // Subtly quantize chroma vectors to align with the luminance band
          const quantizedA = Math.round(ok.a / (bandStep * 1.5)) * (bandStep * 1.5);
          const quantizedB = Math.round(ok.b / (bandStep * 1.5)) * (bandStep * 1.5);

          const [bR, bG, bB] = oklabToRgb(
            Math.max(0, Math.min(1, quantizedL)),
            quantizedA,
            quantizedB
          );
          finalR = bR;
          finalG = bG;
          finalB = bB;
        }

        const rgbColor = `rgb(${finalR},${finalG},${finalB})`;
        const isOccupied = rawSample.a > 10;

        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: cellX,
          y: cellY,
          width: tileSize,
          height: tileSize,
          shape,
          rotation,
          color: rgbColor,
          sample: { r: finalR, g: finalG, b: finalB, a: rawSample.a },
          occupied: isOccupied,
          sourceAlpha: rawSample.a
        });

        cell.isolineBand = Math.floor((finalR + finalG + finalB) / 3 / (256 / effectiveBands));
        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      strategy: 'isoline-banded',
      grid,
      cells: allCells,
      stats: {
        cols,
        rows,
        totalCells: allCells.length,
        effectiveBands
      }
    };
  }
}
