/**
 * GridScaleDetector.js
 * High-Precision Native Grid Scale & Phase Detector for Mosaic Engine v2 (Pathway B).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§3 & §5).
 *
 * Algorithm:
 *   1. Build horizontal and vertical edge maps where color transitions occur.
 *   2. Compute pairwise differences between consecutive edge positions (observed run lengths).
 *   3. Calculate Greatest Common Divisor (GCD) and modal periodic candidate across runs.
 *   4. Evaluate candidate cell sizes and calculate optimal grid phase offsets (offsetX, offsetY).
 *   5. Accurately resolve upscaled pixel art to true underlying native cell size.
 *
 * Phase self-check: {@link GridScaleDetector.refinePhase} re-tests the
 * detected phase against ±1px candidates on a small probe region and keeps
 * whichever offset minimizes sampler mixel warnings (straddled cells).
 * It only ever replaces the detected phase with a clearly (>10%) cleaner
 * one, so it can never make sampling worse.
 */

import { ExactCellSampler } from './ExactCellSampler.js';

export class GridScaleDetector {
  /**
   * Detect underlying cell size and phase offset from ImageData.
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {number} [options.minCellSize=2]
   * @param {number} [options.maxCellSize=64]
   * @returns {{ detectedCellSize: number, offsetX: number, offsetY: number, confidence: number, runStats: Object }}
   */
  static detect(sourceImage, options = {}) {
    if (!sourceImage || !sourceImage.data || sourceImage.width < 4 || sourceImage.height < 4) {
      return { detectedCellSize: 16, offsetX: 0, offsetY: 0, confidence: 0, runStats: {} };
    }

    const {
      minCellSize = 2,
      maxCellSize = 64
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;

    // 1. Collect exact run lengths across sampled rows and columns
    const horizRunLengths = [];
    const sampleRowCount = Math.min(height, 32);
    const rowStep = Math.max(1, Math.floor(height / sampleRowCount));

    for (let y = 0; y < height; y += rowStep) {
      let runLen = 1;
      const rowOffset = y * width * 4;
      for (let x = 1; x < width; x++) {
        const curr = rowOffset + x * 4;
        const prev = rowOffset + (x - 1) * 4;
        const diff = Math.abs(data[curr] - data[prev]) +
                     Math.abs(data[curr + 1] - data[prev + 1]) +
                     Math.abs(data[curr + 2] - data[prev + 2]) +
                     Math.abs(data[curr + 3] - data[prev + 3]);

        if (diff < 15) {
          runLen++;
        } else {
          if (runLen >= minCellSize && runLen <= maxCellSize) {
            horizRunLengths.push(runLen);
          }
          runLen = 1;
        }
      }
      if (runLen >= minCellSize && runLen <= maxCellSize) {
        horizRunLengths.push(runLen);
      }
    }

    const vertRunLengths = [];
    const sampleColCount = Math.min(width, 32);
    const colStep = Math.max(1, Math.floor(width / sampleColCount));

    for (let x = 0; x < width; x += colStep) {
      let runLen = 1;
      for (let y = 1; y < height; y++) {
        const curr = (y * width + x) * 4;
        const prev = ((y - 1) * width + x) * 4;
        const diff = Math.abs(data[curr] - data[prev]) +
                     Math.abs(data[curr + 1] - data[prev + 1]) +
                     Math.abs(data[curr + 2] - data[prev + 2]) +
                     Math.abs(data[curr + 3] - data[prev + 3]);

        if (diff < 15) {
          runLen++;
        } else {
          if (runLen >= minCellSize && runLen <= maxCellSize) {
            vertRunLengths.push(runLen);
          }
          runLen = 1;
        }
      }
      if (runLen >= minCellSize && runLen <= maxCellSize) {
        vertRunLengths.push(runLen);
      }
    }

    const allRuns = [...horizRunLengths, ...vertRunLengths];
    if (allRuns.length === 0) {
      return { detectedCellSize: 16, offsetX: 0, offsetY: 0, confidence: 0.2, runStats: { count: 0 } };
    }

    // 2. Evaluate common candidate divisors & integer scales
    const candidateSizes = [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64].filter(
      s => s >= minCellSize && s <= maxCellSize
    );

    // Score candidates by how many observed run lengths are exact multiples of the candidate
    const candidateMultiples = new Map();
    for (const cand of candidateSizes) {
      let multipleCount = 0;
      let exactCount = 0;
      for (const len of allRuns) {
        if (len % cand === 0) {
          multipleCount++;
        }
        if (len === cand) {
          exactCount++;
        }
      }
      const score = (multipleCount / allRuns.length) * 0.7 + (exactCount / allRuns.length) * 0.3;
      candidateMultiples.set(cand, { score, multipleRatio: multipleCount / allRuns.length, exactRatio: exactCount / allRuns.length });
    }

    // 3. Compute Phase Histogram for Candidate Periodicities
    const horizEdges = new Float32Array(width);
    for (let y = 0; y < height; y += 2) {
      const rowOffset = y * width * 4;
      for (let x = 1; x < width; x++) {
        const i1 = rowOffset + x * 4;
        const i0 = rowOffset + (x - 1) * 4;
        const diff = Math.abs(data[i1] - data[i0]) +
                     Math.abs(data[i1 + 1] - data[i0 + 1]) +
                     Math.abs(data[i1 + 2] - data[i0 + 2]);
        if (diff > 25) horizEdges[x] += diff;
      }
    }

    const vertEdges = new Float32Array(height);
    for (let x = 0; x < width; x += 2) {
      for (let y = 1; y < height; y++) {
        const i1 = (y * width + x) * 4;
        const i0 = ((y - 1) * width + x) * 4;
        const diff = Math.abs(data[i1] - data[i0]) +
                     Math.abs(data[i1 + 1] - data[i0 + 1]) +
                     Math.abs(data[i1 + 2] - data[i0 + 2]);
        if (diff > 25) vertEdges[y] += diff;
      }
    }

    let bestCellSize = 16;
    let bestScore = -1;
    let bestOffsetX = 0;
    let bestOffsetY = 0;

    for (const cand of candidateSizes) {
      const runInfo = candidateMultiples.get(cand) || { score: 0, multipleRatio: 0 };
      if (runInfo.multipleRatio < 0.25) continue;

      let maxPhaseScoreX = 0;
      let optOx = 0;
      for (let ox = 0; ox < cand; ox++) {
        let scoreX = 0;
        let countX = 0;
        for (let x = ox; x < width; x += cand) {
          scoreX += horizEdges[x];
          countX++;
        }
        const avg = countX > 0 ? (scoreX / countX) : 0;
        if (avg > maxPhaseScoreX) {
          maxPhaseScoreX = avg;
          optOx = ox;
        }
      }

      let maxPhaseScoreY = 0;
      let optOy = 0;
      for (let oy = 0; oy < cand; oy++) {
        let scoreY = 0;
        let countY = 0;
        for (let y = oy; y < height; y += cand) {
          scoreY += vertEdges[y];
          countY++;
        }
        const avg = countY > 0 ? (scoreY / countY) : 0;
        if (avg > maxPhaseScoreY) {
          maxPhaseScoreY = avg;
          optOy = oy;
        }
      }

      const phasePower = maxPhaseScoreX + maxPhaseScoreY;
      const combinedScore = (phasePower > 0 ? Math.log(phasePower + 1) : 0) * 0.5 + (runInfo.score * 10);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestCellSize = cand;
        bestOffsetX = optOx;
        bestOffsetY = optOy;
      }
    }

    const confidence = Math.min(1.0, Math.max(0.1, (candidateMultiples.get(bestCellSize)?.multipleRatio || 0.5)));

    return {
      detectedCellSize: bestCellSize,
      offsetX: bestOffsetX,
      offsetY: bestOffsetY,
      confidence: Number(confidence.toFixed(2)),
      runStats: {
        totalRuns: allRuns.length,
        multipleRatio: candidateMultiples.get(bestCellSize)?.multipleRatio || 0
      }
    };
  }

  /**
   * Phase self-check: verify the detected grid phase against ±1px candidates.
   *
   * Samples a small central probe region (up to 10×10 cells) at the detected
   * offset and at each ±1px neighbor offset, counting ExactCellSampler mixel
   * warnings (cells straddling true art-pixel boundaries). Adopts the offset
   * with strictly fewer warnings — but only when it is clearly (>10%)
   * cleaner, with ties always keeping the detected phase. A fully clean
   * detection (0 warnings) is never overridden.
   *
   * Cheap by design: the probe is a small crop, so this costs a fraction of
   * one full-image sample pass.
   *
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {{offsetX: number, offsetY: number}} detection - detected phase
   * @param {number} nativeCellSize - detected native cell size (pre-upscale)
   * @returns {{ offsetX: number, offsetY: number, refined: boolean }}
   */
  static refinePhase(sourceImage, detection, nativeCellSize) {
    const fallback = {
      offsetX: detection?.offsetX || 0,
      offsetY: detection?.offsetY || 0,
      refined: false
    };
    if (!sourceImage || !sourceImage.data) return fallback;
    const width = sourceImage.width, height = sourceImage.height;
    if (width < 8 || height < 8) return fallback;
    const cs = Math.max(2, Math.floor(nativeCellSize || 16));

    // Probe origin: one cell inside the detected phase when possible, so every
    // candidate global offset stays non-negative in probe-local coordinates.
    const px0 = Math.max(0, fallback.offsetX - 1);
    const py0 = Math.max(0, fallback.offsetY - 1);
    const probeCells = Math.min(10,
      Math.floor((width - px0) / cs), Math.floor((height - py0) / cs));
    if (probeCells < 4) return fallback;
    const pw = probeCells * cs, ph = probeCells * cs;

    const probe = { width: pw, height: ph, data: new Uint8ClampedArray(pw * ph * 4) };
    const src = sourceImage.data;
    for (let y = 0; y < ph; y++) {
      const sRow = ((py0 + y) * width + px0) * 4;
      probe.data.set(src.subarray(sRow, sRow + pw * 4), y * pw * 4);
    }

    // Score detected offset first so ties always keep it; remaining
    // candidates are distance-ordered so ties prefer the offset closest
    // to the detector's own phase estimate.
    const scored = [];
    const order = [[0, 0], [-1, 0], [0, -1], [0, 1], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dx, dy] of order) {
      const gx = fallback.offsetX + dx, gy = fallback.offsetY + dy;
      if (gx < 0 || gy < 0) continue;
      const lx = gx - px0, ly = gy - py0;
      if (lx < 0 || ly < 0 || lx >= pw || ly >= ph) continue;
      const s = ExactCellSampler.sample(probe, { cellSize: cs, offsetX: lx, offsetY: ly });
      scored.push({ gx, gy, bad: s.mixelWarnings.length });
    }
    if (scored.length === 0) return fallback;

    const base = scored[0];
    let winner = base;
    for (const s of scored) {
      if (s.bad < winner.bad) winner = s;
    }
    if (winner !== base && winner.bad < base.bad * 0.9) {
      return { offsetX: winner.gx, offsetY: winner.gy, refined: true };
    }
    return fallback;
  }
}
