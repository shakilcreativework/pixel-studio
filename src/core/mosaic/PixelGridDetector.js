/**
 * PixelGridDetector.js
 * Automatic Native Pixel Grid & Phase Detection Engine.
 * Analyzes edge transition gradients and autocorrelation to determine:
 *   1. True native pixel cell size (e.g. 4, 8, 12, 14, 16, 24, 32 px).
 *   2. Precise grid phase offset (offsetX, offsetY) so sampling lands at exact cell centers.
 */

export class PixelGridDetector {
  /**
   * Detect native cell size and grid phase offset from an ImageData object.
   * @param {ImageData|Object} sourceImage - ImageData with width, height, data
   * @param {Object} options
   * @param {number} [options.minCellSize=2]
   * @param {number} [options.maxCellSize=64]
   * @param {number} [options.sampleStride=3] - Line stride for fast scanning
   * @returns {{ cellSize: number, offsetX: number, offsetY: number, confidence: number }}
   */
  static detect(sourceImage, options = {}) {
    if (!sourceImage || !sourceImage.data || sourceImage.width < 10 || sourceImage.height < 10) {
      return { cellSize: 16, offsetX: 0, offsetY: 0, confidence: 0 };
    }

    const {
      minCellSize = 2,
      maxCellSize = 64,
      sampleStride = 3
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;

    // 1. Compute Horizontal Edge Histogram (accumulated edge gradients per X column)
    const horizEdges = new Float32Array(width);
    let totalHorizSamples = 0;

    for (let y = 0; y < height; y += sampleStride) {
      const rowOffset = y * width * 4;
      for (let x = 1; x < width; x++) {
        const i1 = rowOffset + x * 4;
        const i0 = rowOffset + (x - 1) * 4;
        const dr = Math.abs(data[i1] - data[i0]);
        const dg = Math.abs(data[i1 + 1] - data[i0 + 1]);
        const db = Math.abs(data[i1 + 2] - data[i0 + 2]);
        const diff = dr + dg + db;
        if (diff > 25) {
          horizEdges[x] += diff;
          totalHorizSamples++;
        }
      }
    }

    // 2. Compute Vertical Edge Histogram (accumulated edge gradients per Y row)
    const vertEdges = new Float32Array(height);
    let totalVertSamples = 0;

    for (let x = 0; x < width; x += sampleStride) {
      for (let y = 1; y < height; y++) {
        const i1 = (y * width + x) * 4;
        const i0 = ((y - 1) * width + x) * 4;
        const dr = Math.abs(data[i1] - data[i0]);
        const dg = Math.abs(data[i1 + 1] - data[i0 + 1]);
        const db = Math.abs(data[i1 + 2] - data[i0 + 2]);
        const diff = dr + dg + db;
        if (diff > 25) {
          vertEdges[y] += diff;
          totalVertSamples++;
        }
      }
    }

    // 3. Find optimal cell size S by evaluating candidate grid periodicity
    let bestCellSize = 16;
    let bestCellScore = -1;

    for (let s = minCellSize; s <= maxCellSize; s++) {
      let maxPhaseScoreX = 0;
      for (let ox = 0; ox < s; ox++) {
        let scoreX = 0;
        let countX = 0;
        for (let x = ox; x < width; x += s) {
          scoreX += horizEdges[x];
          countX++;
        }
        if (countX > 0) {
          const avg = scoreX / countX;
          if (avg > maxPhaseScoreX) maxPhaseScoreX = avg;
        }
      }

      let maxPhaseScoreY = 0;
      for (let oy = 0; oy < s; oy++) {
        let scoreY = 0;
        let countY = 0;
        for (let y = oy; y < height; y += s) {
          scoreY += vertEdges[y];
          countY++;
        }
        if (countY > 0) {
          const avg = scoreY / countY;
          if (avg > maxPhaseScoreY) maxPhaseScoreY = avg;
        }
      }

      // Favor standard pixel art cell sizes (8, 16, 32) when scores are close
      let multiplier = 1.0;
      if (s === 16) multiplier = 1.15;
      else if (s === 8) multiplier = 1.10;
      else if (s === 32) multiplier = 1.08;
      else if (s === 64) multiplier = 1.06;
      else if (s % 4 === 0) multiplier = 1.04;
      else if (s % 2 === 0) multiplier = 1.02;

      const combinedScore = (maxPhaseScoreX + maxPhaseScoreY) * multiplier;
      if (combinedScore > bestCellScore) {
        bestCellScore = combinedScore;
        bestCellSize = s;
      }
    }

    // 4. Determine grid phase offsets (offsetX, offsetY)
    const s = bestCellSize;
    let bestOffsetX = 0;
    let bestOffsetY = 0;

    if (options.allowOffset) {
      let bestScoreX = -1;
      for (let ox = 0; ox < s; ox++) {
        let scoreX = 0;
        for (let x = ox; x < width; x += s) {
          scoreX += horizEdges[x];
        }
        if (scoreX > bestScoreX) {
          bestScoreX = scoreX;
          bestOffsetX = ox;
        }
      }

      let bestScoreY = -1;
      for (let oy = 0; oy < s; oy++) {
        let scoreY = 0;
        for (let y = oy; y < height; y += s) {
          scoreY += vertEdges[y];
        }
        if (scoreY > bestScoreY) {
          bestScoreY = scoreY;
          bestOffsetY = oy;
        }
      }
    }

    const confidence = Math.min(1.0, Number((bestCellScore / (Math.max(1, (totalHorizSamples + totalVertSamples) / (width + height)) * 10)).toFixed(2)));

    return {
      cellSize: bestCellSize,
      offsetX: bestOffsetX,
      offsetY: bestOffsetY,
      confidence
    };
  }
}
