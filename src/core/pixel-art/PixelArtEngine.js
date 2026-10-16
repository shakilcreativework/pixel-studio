/**
 * PixelArtEngine.js
 * Master orchestrator for the independent Pixel Art pipeline.
 * Converts raw source image data into a discrete fixed-grid PixelGrid model.
 */

import { PixelGrid } from './PixelGrid.js';
import { sampleCellColor } from './ColorSampling.js';
import { generateMedianCutPalette, PRESET_PALETTES } from './PaletteEngine.js';
import { DitheringEngine } from './DitheringEngine.js';

export class PixelArtEngine {
  /**
   * Process source image into a PixelGrid.
   * @param {ImageData|{data: Uint8ClampedArray, width: number, height: number}} sourceImage
   * @param {Object} options Configuration parameters
   */
  static process(sourceImage, options = {}) {
    const {
      gridWidth = 64,
      gridHeight = 64,
      samplingMethod = 'perceptual', // 'average', 'median', 'dominant', 'perceptual'
      colorMode = 'limited', // 'original', 'limited', 'preset', 'custom', 'monochrome'
      paletteSize = 32,
      presetKey = 'pico-8',
      customPalette = null,
      dithering = 'none', // 'none', 'bayer2', 'bayer4', 'bayer8', 'floyd-steinberg', 'atkinson', 'random'
      ditheringStrength = 1.0,
      colorSpace = 'oklab',
      preserveAlpha = true
    } = options;

    const srcWidth = sourceImage.width;
    const srcHeight = sourceImage.height;
    const srcData = sourceImage.data;

    const gw = Math.max(1, Math.floor(gridWidth));
    const gh = Math.max(1, Math.floor(gridHeight));

    const cellWidth = srcWidth / gw;
    const cellHeight = srcHeight / gh;

    // Step 1: Sample raw cell colors
    const rawCells = new Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const startX = gx * cellWidth;
        const startY = gy * cellHeight;
        const endX = startX + cellWidth;
        const endY = startY + cellHeight;

        const cellColor = sampleCellColor(
          srcData,
          srcWidth,
          srcHeight,
          startX,
          startY,
          endX,
          endY,
          samplingMethod
        );

        if (!preserveAlpha) {
          cellColor.a = 255;
        }

        rawCells[gy * gw + gx] = cellColor;
      }
    }

    // Step 2: Determine palette based on colorMode
    let targetPalette = [];

    if (colorMode === 'preset' && PRESET_PALETTES[presetKey]) {
      targetPalette = PRESET_PALETTES[presetKey].colors;
    } else if (colorMode === 'custom' && Array.isArray(customPalette) && customPalette.length > 0) {
      targetPalette = customPalette;
    } else if (colorMode === 'monochrome') {
      targetPalette = PRESET_PALETTES['monochrome'].colors;
    } else if (colorMode === 'original') {
      // Create palette of unique sampled colors
      const colorMap = new Map();
      for (let i = 0; i < rawCells.length; i++) {
        const c = rawCells[i];
        if (c.a >= 10) {
          const key = `${c.r},${c.g},${c.b}`;
          if (!colorMap.has(key)) {
            colorMap.set(key, [c.r, c.g, c.b]);
          }
        }
      }
      targetPalette = Array.from(colorMap.values());
      if (targetPalette.length === 0) {
        targetPalette = [[0, 0, 0], [255, 255, 255]];
      }
    } else {
      // 'limited' / automatic quantization
      targetPalette = generateMedianCutPalette(rawCells, paletteSize);
    }

    // Step 3: Apply Dithering / Palette Mapping
    const { indexes, alpha } = DitheringEngine.apply(
      rawCells,
      gw,
      gh,
      targetPalette,
      dithering,
      ditheringStrength,
      colorSpace
    );

    // Step 4: Construct and return PixelGrid
    const grid = new PixelGrid(gw, gh, targetPalette);
    grid.indexes.set(indexes);
    grid.alpha.set(alpha);

    return grid;
  }
}
