/**
 * InputClassifier.js
 * Stage 0 Input Classification Engine for Mosaic Engine v2.
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§3).
 *
 * Automatically and reliably determines whether a source image is:
 *   - "pixel-art" (Pure Pixel Art / Sprite Sheet: integer grid, flat fills, hard edges, zero anti-aliasing)
 *   - "photo" (Continuous-tone photo, painting, or gradient illustration)
 */

import { GridScaleDetector } from './GridScaleDetector.js';

export class InputClassifier {
  /**
   * Classify source image into "pixel-art" or "photo" mode.
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @returns {{
   *   mode: 'pixel-art'|'photo',
   *   confidence: number,
   *   detectedCellSize: number,
   *   offsetX: number,
   *   offsetY: number,
   *   uniqueColors: number,
   *   hasAntiAliasing: boolean,
   *   backgroundFlatness: number
   * }}
   */
  static classify(sourceImage, options = {}) {
    if (!sourceImage || !sourceImage.data || sourceImage.width < 4 || sourceImage.height < 4) {
      return {
        mode: 'photo',
        confidence: 0.5,
        detectedCellSize: 16,
        offsetX: 0,
        offsetY: 0,
        uniqueColors: 0,
        hasAntiAliasing: true,
        backgroundFlatness: 0
      };
    }

    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;
    const totalPixels = width * height;

    // 1. Measure Unique Color Count (sampled efficiently)
    const colorSet = new Set();
    const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / 20000)));
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 10) continue;
        // Quantize subtly to ignore sub-perceptual sensor noise
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const key = (r << 16) | (g << 8) | b;
        colorSet.add(key);
      }
    }

    const uniqueColors = colorSet.size;

    // 2. Measure Edge Sharpness & Anti-Aliasing (hard jumps vs gradual gradient ramps)
    let sharpTransitions = 0;
    let antiAliasedTransitions = 0;
    const edgeStride = Math.max(1, Math.floor(height / 40));

    for (let y = 0; y < height; y += edgeStride) {
      const rowOffset = y * width * 4;
      for (let x = 2; x < width - 2; x++) {
        const iPrev = rowOffset + (x - 1) * 4;
        const iCurr = rowOffset + x * 4;
        const iNext = rowOffset + (x + 1) * 4;

        const dLeft = Math.abs(data[iCurr] - data[iPrev]) +
                      Math.abs(data[iCurr + 1] - data[iPrev + 1]) +
                      Math.abs(data[iCurr + 2] - data[iPrev + 2]);

        const dRight = Math.abs(data[iNext] - data[iCurr]) +
                       Math.abs(data[iNext + 1] - data[iCurr + 1]) +
                       Math.abs(data[iNext + 2] - data[iCurr + 2]);

        // A hard pixel-art edge is a sharp jump adjacent to flat zero-change cells:
        if (dLeft > 40 && dRight < 10) {
          sharpTransitions++;
        } else if (dLeft > 15 && dLeft < 60 && dRight > 15 && dRight < 60) {
          // Gradual slope / anti-aliasing interpolation
          antiAliasedTransitions++;
        }
      }
    }

    const hasAntiAliasing = antiAliasedTransitions > (sharpTransitions * 0.8) && antiAliasedTransitions > 25;

    // 3. Measure Background Flatness (perimeter border color consistency)
    const perimeterColors = new Map();
    let perimeterSamples = 0;

    const sampleBorder = (x, y) => {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] < 10) return;
      perimeterSamples++;
      // Bin subtly (>> 3) to group near-identical compression noise into flat background bins
      const key = `${data[idx] >> 3},${data[idx + 1] >> 3},${data[idx + 2] >> 3}`;
      perimeterColors.set(key, (perimeterColors.get(key) || 0) + 1);
    };

    for (let x = 0; x < width; x += 4) {
      sampleBorder(x, 0);
      sampleBorder(x, height - 1);
    }
    for (let y = 0; y < height; y += 4) {
      sampleBorder(0, y);
      sampleBorder(width - 1, y);
    }

    let dominantBorderCount = 0;
    for (const count of perimeterColors.values()) {
      if (count > dominantBorderCount) dominantBorderCount = count;
    }
    const backgroundFlatness = perimeterSamples > 0 ? (dominantBorderCount / perimeterSamples) : 1.0;

    // 4. Run GridScaleDetector
    const gridDetect = GridScaleDetector.detect(sourceImage, options);

    // 5. Compute Classification Weights
    let pixelArtScore = 0;

    // A: Low unique color count strongly indicates pixel art
    if (uniqueColors <= 64) pixelArtScore += 0.35;
    else if (uniqueColors <= 128) pixelArtScore += 0.20;
    else if (uniqueColors <= 256) pixelArtScore += 0.05;

    // B: Lack of anti-aliasing
    if (!hasAntiAliasing) pixelArtScore += 0.25;
    else pixelArtScore -= 0.20;

    // C: Strong grid periodicity / integer run lengths
    if (gridDetect.confidence >= 0.6) pixelArtScore += 0.25;
    else if (gridDetect.confidence >= 0.4) pixelArtScore += 0.15;

    // D: Flat uniform perimeter background
    if (backgroundFlatness >= 0.85) pixelArtScore += 0.15;

    const isPixelArt = pixelArtScore >= 0.50;
    const confidence = isPixelArt
      ? Math.min(0.99, Math.max(0.60, pixelArtScore))
      : Math.min(0.99, Math.max(0.60, 1.0 - pixelArtScore));

    return {
      mode: isPixelArt ? 'pixel-art' : 'photo',
      confidence: Number(confidence.toFixed(2)),
      detectedCellSize: gridDetect.detectedCellSize || 16,
      offsetX: gridDetect.offsetX || 0,
      offsetY: gridDetect.offsetY || 0,
      uniqueColors,
      hasAntiAliasing,
      backgroundFlatness: Number(backgroundFlatness.toFixed(2)),
      gridConfidence: gridDetect.confidence
    };
  }
}
