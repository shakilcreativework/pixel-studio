/**
 * realColorsSwatchData.js
 * Pure, DOM-free helper for the "Real Colors Detected" transparency row in the
 * Color Restore sidebar section (Already Pixel Art mode).
 *
 * Shapes the engine's `truePalette` (hex strings, most-frequent first) into
 * what the row renders: a capped list of visible swatches plus an overflow
 * count for the "+M more" label. Display logic only — no restoration logic.
 */

export const MAX_REAL_COLOR_SWATCHES = 24;

/**
 * @param {string[]|undefined|null} truePalette - hex color strings, most-frequent first
 * @param {number} [maxSwatches=24] - max visible swatches before the overflow label
 * @returns {{ swatches: string[], moreCount: number, total: number }}
 */
export function buildRealColorsSwatchData(truePalette, maxSwatches = MAX_REAL_COLOR_SWATCHES) {
  const palette = Array.isArray(truePalette) ? truePalette : [];
  return {
    swatches: palette.slice(0, maxSwatches),
    moreCount: Math.max(0, palette.length - maxSwatches),
    total: palette.length,
  };
}
