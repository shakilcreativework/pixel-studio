/**
 * ContinuousShading.js
 * Stage 1: Continuous Shading Engine.
 * Evaluates shading and color in continuous world pixel space at tile centers (x, y),
 * eliminating artificial color banding and hard seams across internal tile rows/columns.
 */

import { sampleCellColor } from '../pixel-art/ColorSampling.js';

/**
 * Sample continuous color at world pixel coordinates with smooth sub-pixel spatial weighting.
 * @param {Uint8ClampedArray} srcData - Raw RGBA image buffer
 * @param {number} srcWidth - Image width in pixels
 * @param {number} srcHeight - Image height in pixels
 * @param {number} startX - Tile left coordinate
 * @param {number} startY - Tile top coordinate
 * @param {number} tileSize - Size of the tile
 * @param {string} method - Sampling strategy ('average', 'perceptual', etc.)
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
export function sampleContinuousShading(
  srcData,
  srcWidth,
  srcHeight,
  startX,
  startY,
  tileSize,
  method = 'perceptual',
  options = {}
) {
  const endX = startX + tileSize;
  const endY = startY + tileSize;

  // Center coordinate of the tile in continuous world space
  const centerX = startX + tileSize / 2;
  const centerY = startY + tileSize / 2;

  // Use selected sampling method centered around the tile area
  const sample = sampleCellColor(
    srcData,
    srcWidth,
    srcHeight,
    startX,
    startY,
    endX,
    endY,
    method,
    options
  );

  return {
    r: sample.r,
    g: sample.g,
    b: sample.b,
    a: sample.a,
    centerX,
    centerY
  };
}

/**
 * Check if two adjacent tiles have a color jump exceeding a smooth gradient step.
 */
export function calculateColorDelta(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
