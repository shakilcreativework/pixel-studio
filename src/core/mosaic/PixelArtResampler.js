/**
 * PixelArtResampler.js
 * Native Integer Resampler Strategy Engine.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Master Specification.
 *
 * Primary Purpose:
 *   Handles uniformly scaled pixel-art assets when a reliable integer scale factor
 *   can be detected via run-length frequency and horizontal/vertical transition analysis.
 *
 * Algorithm:
 *   1. Analyze horizontal and vertical pixel run-lengths across source image.
 *   2. Find Greatest Common Divisor (GCD) / modal scale candidate (e.g. 2, 3, 4, 8).
 *   3. Perform core/center pixel sampling at the native detected scale grid.
 *   4. Reconstruct clean 1:1 native resolution grid cells.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor } from '../pixel-art/ColorSampling.js';

export class PixelArtResampler {
  /**
   * Detect uniform integer scale factor of pixel art asset.
   * @param {ImageData} sourceImage
   * @returns {Object} { detectedScale, confidence, runs }
   */
  static detectScale(sourceImage) {
    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const runLengths = [];

    // Horizontal run length sampling across 6 rows
    const sampleRows = [
      Math.floor(height * 0.15),
      Math.floor(height * 0.3),
      Math.floor(height * 0.5),
      Math.floor(height * 0.7),
      Math.floor(height * 0.85)
    ];

    for (const r of sampleRows) {
      if (r < 0 || r >= height) continue;
      let currentLen = 1;
      for (let c = 1; c < width; c++) {
        const prevIdx = (r * width + (c - 1)) * 4;
        const currIdx = (r * width + c) * 4;

        const sameColor =
          srcData[prevIdx] === srcData[currIdx] &&
          srcData[prevIdx + 1] === srcData[currIdx + 1] &&
          srcData[prevIdx + 2] === srcData[currIdx + 2] &&
          srcData[prevIdx + 3] === srcData[currIdx + 3];

        if (sameColor) {
          currentLen++;
        } else {
          if (currentLen > 0 && currentLen <= 64) {
            runLengths.push(currentLen);
          }
          currentLen = 1;
        }
      }
      if (currentLen > 0 && currentLen <= 64) {
        runLengths.push(currentLen);
      }
    }

    // Vertical run length sampling across 5 columns
    const sampleCols = [
      Math.floor(width * 0.2),
      Math.floor(width * 0.4),
      Math.floor(width * 0.6),
      Math.floor(width * 0.8)
    ];

    for (const c of sampleCols) {
      if (c < 0 || c >= width) continue;
      let currentLen = 1;
      for (let r = 1; r < height; r++) {
        const prevIdx = ((r - 1) * width + c) * 4;
        const currIdx = (r * width + c) * 4;

        const sameColor =
          srcData[prevIdx] === srcData[currIdx] &&
          srcData[prevIdx + 1] === srcData[currIdx + 1] &&
          srcData[prevIdx + 2] === srcData[currIdx + 2] &&
          srcData[prevIdx + 3] === srcData[currIdx + 3];

        if (sameColor) {
          currentLen++;
        } else {
          if (currentLen > 0 && currentLen <= 64) {
            runLengths.push(currentLen);
          }
          currentLen = 1;
        }
      }
      if (currentLen > 0 && currentLen <= 64) {
        runLengths.push(currentLen);
      }
    }

    if (runLengths.length === 0) {
      return { detectedScale: 1, confidence: 0.5 };
    }

    // Find GCD / mode candidate among scales [2, 3, 4, 6, 8, 12, 16, 32]
    const candidates = [2, 3, 4, 6, 8, 12, 16, 32];
    const candidateScores = new Map();

    for (const cand of candidates) {
      let score = 0;
      for (const len of runLengths) {
        if (len % cand === 0) {
          score++;
        }
      }
      candidateScores.set(cand, score / runLengths.length);
    }

    let bestCand = 1;
    let maxScore = 0;
    for (const [cand, score] of candidateScores.entries()) {
      if (score > maxScore && score > 0.3) {
        maxScore = score;
        bestCand = cand;
      } else if (score === maxScore && score > 0.3 && cand > bestCand) {
        bestCand = cand;
      }
    }

    return {
      detectedScale: bestCand,
      confidence: maxScore,
      sampleRunsCount: runLengths.length
    };
  }

  /**
   * Process source image through Native Integer Resampler algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 4,
      targetScale = 'auto',
      samplingMethod = 'center-exact',
      shape = 'square',
      rotation = 0
    } = options;

    const scaleInfo = this.detectScale(sourceImage);
    const effectiveScale = targetScale === 'auto' ? (scaleInfo.detectedScale || tileSize) : parseInt(targetScale, 10);
    const finalTileSize = effectiveScale > 0 ? effectiveScale : tileSize;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const cols = Math.ceil(width / finalTileSize);
    const rows = Math.ceil(height / finalTileSize);
    const grid = [];
    const allCells = [];

    const activeSampling = samplingMethod || 'center-exact';

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * finalTileSize;
        const cellY = r * finalTileSize;

        const sample = sampleCellColor(
          srcData,
          width,
          height,
          cellX,
          cellY,
          cellX + finalTileSize,
          cellY + finalTileSize,
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
          width: finalTileSize,
          height: finalTileSize,
          shape,
          rotation,
          color: rgbColor,
          sample,
          occupied: isOccupied,
          sourceAlpha: sample.a
        });

        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      strategy: 'integer-resample',
      grid,
      cells: allCells,
      stats: {
        detectedScale: scaleInfo.detectedScale,
        confidence: scaleInfo.confidence,
        effectiveScale: finalTileSize,
        cols,
        rows
      }
    };
  }
}
