/**
 * AdaptiveQuadtreeEngine.js
 * Adaptive Quadtree Strategy Engine.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Master Specification.
 *
 * Primary Purpose:
 *   Use larger cells in simple flat regions and finer cells around detailed boundaries,
 *   subdividing recursively based on local color variance and edge intensity down to 1px.
 *
 * Algorithm:
 *   1. Begin with root spatial blocks at maxCellSize (or target tileSize).
 *   2. For each block, measure color variance across source pixels.
 *   3. If variance exceeds threshold AND size > minCellSize, recursively subdivide into 4 quadrants.
 *   4. Construct canonical CellModel cells for all leaf quadtree nodes.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor } from '../pixel-art/ColorSampling.js';

export class AdaptiveQuadtreeEngine {
  /**
   * Process source image through Adaptive Quadtree algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, quadtreeNodes, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 8,
      minCellSize = 1,
      varianceThreshold = 15,
      samplingMethod = 'perceptual',
      shape = 'square',
      rotation = 0
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const leafCells = [];

    // Helper: calculate color variance for a rectangular block
    function analyzeBlock(x, y, w, h) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      let count = 0;

      for (let py = y; py < y + h && py < height; py++) {
        for (let px = x; px < x + w && px < width; px++) {
          const idx = (py * width + px) * 4;
          sumR += srcData[idx];
          sumG += srcData[idx + 1];
          sumB += srcData[idx + 2];
          sumA += srcData[idx + 3];
          count++;
        }
      }

      if (count === 0) return { variance: 0, avgA: 0 };

      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;
      const avgA = sumA / count;

      let varR = 0, varG = 0, varB = 0, varA = 0;
      for (let py = y; py < y + h && py < height; py++) {
        for (let px = x; px < x + w && px < width; px++) {
          const idx = (py * width + px) * 4;
          varR += Math.pow(srcData[idx] - avgR, 2);
          varG += Math.pow(srcData[idx + 1] - avgG, 2);
          varB += Math.pow(srcData[idx + 2] - avgB, 2);
          varA += Math.pow(srcData[idx + 3] - avgA, 2);
        }
      }

      const variance = Math.sqrt((varR + varG + varB + varA) / count);
      return {
        variance,
        avgA: Math.round(avgA)
      };
    }

    // Recursive quadtree decomposition
    function decompose(x, y, w, h) {
      const actualW = Math.min(w, width - x);
      const actualH = Math.min(h, height - y);

      if (actualW <= 0 || actualH <= 0) return;

      const analysis = analyzeBlock(x, y, actualW, actualH);

      // Subdivide if variance > threshold and block size > minCellSize
      const canSubdivide = (w > minCellSize || h > minCellSize) && w > 1 && h > 1;
      const shouldSubdivide = canSubdivide && analysis.variance > varianceThreshold;

      if (shouldSubdivide) {
        const halfW = Math.max(1, Math.floor(w / 2));
        const halfH = Math.max(1, Math.floor(h / 2));

        decompose(x, y, halfW, halfH);
        decompose(x + halfW, y, w - halfW, halfH);
        decompose(x, y + halfH, halfW, h - halfH);
        decompose(x + halfW, y + halfH, w - halfW, h - halfH);
      } else {
        // Sample final color for leaf node using selected sampling method
        const sample = sampleCellColor(
          srcData,
          width,
          height,
          x,
          y,
          x + actualW,
          y + actualH,
          samplingMethod,
          options
        );

        const rgbColor = `rgb(${sample.r},${sample.g},${sample.b})`;
        const isOccupied = sample.a > 10;

        const cell = CellModel.createCell({
          col: Math.floor(x / minCellSize),
          row: Math.floor(y / minCellSize),
          x,
          y,
          width: actualW,
          height: actualH,
          shape,
          rotation,
          color: rgbColor,
          sample,
          occupied: isOccupied,
          sourceAlpha: sample.a
        });

        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;
        cell.quadtreeLevel = Math.max(actualW, actualH);

        leafCells.push(cell);
      }
    }

    // Process image in grid blocks of tileSize (or maxCellSize if specified)
    const rootSize = options.maxCellSize !== undefined ? options.maxCellSize : (options.tileSize || 16);
    for (let y = 0; y < height; y += rootSize) {
      for (let x = 0; x < width; x += rootSize) {
        decompose(x, y, rootSize, rootSize);
      }
    }

    // Build 2D grid structure (for compatibility with grid renderers)
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const grid = [];

    // Map leaf cells into grid structure where applicable
    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * tileSize;
        const cellY = r * tileSize;
        const matchingCell = leafCells.find(
          lc => cellX >= lc.x && cellX < lc.x + lc.width && cellY >= lc.y && cellY < lc.y + lc.height
        ) || leafCells[0];
        rowArr.push(matchingCell);
      }
      grid.push(rowArr);
    }

    return {
      strategy: 'adaptive-quadtree',
      grid,
      cells: leafCells,
      stats: {
        totalLeafCells: leafCells.length,
        cols,
        rows
      }
    };
  }
}
