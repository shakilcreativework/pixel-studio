/**
 * OrthogonalContourEngine.js
 * Direct Orthogonal Contour Strategy Engine.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Master Specification.
 *
 * Primary Purpose:
 *   Generate clean vector geometry directly from discrete color regions
 *   using 4-connected region boundaries and Manhattan geometry.
 *
 * Algorithm:
 *   1. Cell/region discretization at target tile size.
 *   2. Discrete color region clustering & 4-connected perimeter tracing.
 *   3. Collinear segment merging to eliminate redundant collinear vertices.
 *   4. Output clean 90-degree orthogonal geometry into canonical CellModel format.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor } from '../pixel-art/ColorSampling.js';

export class OrthogonalContourEngine {
  /**
   * Process source image through Direct Orthogonal Contour algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, contours, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 4,
      collinearMerge = true,
      sourceArtType = 'already-pixel-art',
      samplingMethod = 'perceptual',
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

    const activeSampling = samplingMethod || (sourceArtType === 'already-pixel-art' ? 'center-exact' : 'perceptual-oklab');

    // 1. Grid Discretization with Advanced Sampling
    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * tileSize;
        const cellY = r * tileSize;

        const sample = sampleCellColor(
          srcData,
          width,
          height,
          cellX,
          cellY,
          cellX + tileSize,
          cellY + tileSize,
          activeSampling,
          options
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

        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;
        cell.orthogonalContour = true;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    // 2. Collinear Orthogonal Boundary Segment Merging (Row Run-Length Merging)
    const contours = [];
    if (collinearMerge) {
      for (let r = 0; r < rows; r++) {
        let currentRun = null;
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          if (!cell.occupied || cell.isRemoved) {
            if (currentRun) {
              contours.push(currentRun);
              currentRun = null;
            }
            continue;
          }

          if (!currentRun) {
            currentRun = {
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              color: cell.color,
              alpha: cell.alpha,
              startCol: c,
              endCol: c,
              row: r
            };
          } else if (currentRun.color === cell.color) {
            currentRun.width += cell.width;
            currentRun.endCol = c;
          } else {
            contours.push(currentRun);
            currentRun = {
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              color: cell.color,
              alpha: cell.alpha,
              startCol: c,
              endCol: c,
              row: r
            };
          }
        }
        if (currentRun) {
          contours.push(currentRun);
        }
      }
    }

    return {
      strategy: 'orthogonal-contour',
      grid,
      cells: allCells,
      contours,
      stats: {
        cols,
        rows,
        mergedContoursCount: contours.length
      }
    };
  }
}
