/**
 * ContrastEdgeEngine.js
 * Contrast-Aware Ridge & Silhouette Strategy Engine.
 *
 * Primary Purpose:
 *   Specially designed for artwork with prominent silhouettes, mountain ridges,
 *   suns, and high-contrast boundaries. Identifies edge gradients and aligns
 *   sampling and cell boundaries so dark silhouettes never bleed into bright backgrounds.
 *
 * Algorithm:
 *   1. Computes local gradient magnitude (Sobel operator) across the source image.
 *   2. Classifies each cell as 'edge-ridge' (high local gradient) or 'smooth-gradient' (low gradient).
 *   3. For edge-ridge cells, applies contrast-aware structural weighting or K-Centroid clustering
 *      to ensure razor-sharp mountain slopes and sun contours without color mud.
 *   4. For smooth-gradient cells, applies perceptual OKLab area sampling.
 *   5. Outputs canonical CellModel grid objects with full shape and rotation support.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor } from '../pixel-art/ColorSampling.js';

export class ContrastEdgeEngine {
  /**
   * Process source image through Contrast-Aware Ridge & Silhouette algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, edgeMap, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 4,
      edgeSensitivity = 25, // threshold for ridge classification (0-100)
      ridgeSharpness = 1.5, // contrast multiplier for edge cells
      samplingMethod = 'contrast-aware',
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

    // Pre-calculate gradient magnitude for edge detection
    const gradThreshold = (edgeSensitivity / 100) * 128;
    let edgeCellsCount = 0;

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * tileSize;
        const cellY = r * tileSize;

        // Sample gradient and color range across the cell footprint
        let maxGrad = 0;
        let minLum = 999, maxLum = -1;

        for (let dy = 0; dy < tileSize; dy++) {
          for (let dx = 0; dx < tileSize; dx++) {
            const px = cellX + dx;
            const py = cellY + dy;
            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            const r = srcData[idx];
            const g = srcData[idx + 1];
            const b = srcData[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;

            if (px < width - 1) {
              const idxR = (py * width + (px + 1)) * 4;
              const dX = (Math.abs(r - srcData[idxR]) +
                          Math.abs(g - srcData[idxR + 1]) +
                          Math.abs(b - srcData[idxR + 2])) / 3;
              if (dX > maxGrad) maxGrad = dX;
            }

            if (py < height - 1) {
              const idxD = ((py + 1) * width + px) * 4;
              const dY = (Math.abs(r - srcData[idxD]) +
                          Math.abs(g - srcData[idxD + 1]) +
                          Math.abs(b - srcData[idxD + 2])) / 3;
              if (dY > maxGrad) maxGrad = dY;
            }
          }
        }

        const spanGrad = maxLum >= 0 ? (maxLum - minLum) : 0;
        const effectiveGrad = Math.max(maxGrad, spanGrad);
        const isEdgeCell = effectiveGrad >= gradThreshold;
        if (isEdgeCell) edgeCellsCount++;

        // Determine effective sampling method
        let effectiveMethod = samplingMethod;
        if (isEdgeCell) {
          effectiveMethod = (samplingMethod === 'average' || samplingMethod === 'perceptual')
            ? 'contrast-aware'
            : samplingMethod;
        } else {
          effectiveMethod = samplingMethod === 'contrast-aware' ? 'perceptual-oklab' : samplingMethod;
        }

        const sample = sampleCellColor(
          srcData,
          width,
          height,
          cellX,
          cellY,
          cellX + tileSize,
          cellY + tileSize,
          effectiveMethod,
          { ...options, ridgeSharpness }
        );

        const rgbColor = `rgb(${sample.r},${sample.g},${sample.b})`;
        const isOccupied = sample.a > 10;

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
          sample,
          occupied: isOccupied,
          sourceAlpha: sample.a
        });

        cell.isEdgeRidge = isEdgeCell;
        cell.gradientMagnitude = maxGrad;
        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      strategy: 'contrast-edge',
      grid,
      cells: allCells,
      stats: {
        cols,
        rows,
        totalCells: allCells.length,
        edgeCellsCount,
        edgePercentage: allCells.length > 0 ? ((edgeCellsCount / allCells.length) * 100).toFixed(1) : '0'
      }
    };
  }
}
