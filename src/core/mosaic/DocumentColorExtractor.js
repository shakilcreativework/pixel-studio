/**
 * DocumentColorExtractor.js
 * Extracts unique & dominant colors from artboard / image data,
 * calculates perceived luminance, sorts colors serially (Dark to Light),
 * and provides intelligent background color cluster detection.
 */

import { rgbToHex } from '../pixel-art/PaletteEngine.js';

export class DocumentColorExtractor {
  /**
   * Calculates perceived luminance (0.0 to 1.0) using ITU-R BT.709 standard.
   * Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
   */
  static getLuminance(r, g, b) {
    const val = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return Number(Math.max(0, Math.min(1, val)).toFixed(4));
  }

  /**
   * Categorizes color into tonal range based on luminance.
   */
  static getTonalCategory(luminance) {
    if (luminance < 0.20) return 'dark';
    if (luminance > 0.80) return 'light';
    return 'midtone';
  }

  /**
   * Extracts and sorts colors from ImageData or 2D array of pixels/cells.
   * @param {ImageData|Object} sourceImage - ImageData object with {data, width, height}
   * @param {Object} options
   * @param {string} [options.sortBy='dark-to-light'] - 'dark-to-light' | 'light-to-dark' | 'frequency'
   * @param {number} [options.maxColors=64] - Maximum number of distinct colors to return
   * @param {number} [options.minAlpha=10] - Minimum alpha threshold to consider
   * @returns {Array<{hex: string, r: number, g: number, b: number, count: number, percentage: number, luminance: number, category: string}>}
   */
  static extractColors(sourceImage, options = {}) {
    if (!sourceImage || !sourceImage.data) return [];

    const {
      sortBy = 'dark-to-light',
      maxColors = 64,
      minAlpha = 10
    } = options;

    const data = sourceImage.data;
    const colorMap = new Map(); // key: hex -> { hex, r, g, b, count }
    let validPixelCount = 0;

    // Scan pixels
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < minAlpha) continue;

      validPixelCount++;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const hex = rgbToHex(r, g, b).toLowerCase();

      let entry = colorMap.get(hex);
      if (!entry) {
        entry = {
          hex,
          r,
          g,
          b,
          count: 0
        };
        colorMap.set(hex, entry);
      }
      entry.count++;
    }

    if (validPixelCount === 0) return [];

    // Transform into enriched list
    const colors = Array.from(colorMap.values()).map(c => {
      const luminance = this.getLuminance(c.r, c.g, c.b);
      const percentage = Number(((c.count / validPixelCount) * 100).toFixed(1));
      return {
        hex: c.hex,
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count,
        percentage,
        luminance: Number(luminance.toFixed(3)),
        category: this.getTonalCategory(luminance)
      };
    });

    // Sort according to preference
    if (sortBy === 'dark-to-light') {
      colors.sort((a, b) => {
        if (Math.abs(a.luminance - b.luminance) > 0.001) {
          return a.luminance - b.luminance;
        }
        return b.count - a.count; // Secondary sort by frequency
      });
    } else if (sortBy === 'light-to-dark') {
      colors.sort((a, b) => {
        if (Math.abs(a.luminance - b.luminance) > 0.001) {
          return b.luminance - a.luminance;
        }
        return b.count - a.count;
      });
    } else if (sortBy === 'frequency') {
      colors.sort((a, b) => b.count - a.count);
    }

    return colors.slice(0, maxColors);
  }

  /**
   * Intelligently samples border and corner pixels to detect all background color variants
   * (e.g. #000000, #010101, #000001) present at the edges of the image.
   * @param {ImageData} sourceImage
   * @param {number} [sampleDepth=3] - Number of border pixel rows/columns to sample
   * @returns {Array<string>} Array of detected background hex colors
   */
  static detectBackgroundColorCluster(sourceImage, sampleDepth = 3) {
    if (!sourceImage || !sourceImage.data) return [];

    const { width, height, data } = sourceImage;
    const borderColors = new Map();
    let borderCount = 0;

    const samplePixel = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = (y * width + x) * 4;
      if (data[idx + 3] < 10) return; // ignore transparent
      const hex = rgbToHex(data[idx], data[idx + 1], data[idx + 2]).toLowerCase();
      borderColors.set(hex, (borderColors.get(hex) || 0) + 1);
      borderCount++;
    };

    // Sample top and bottom rows
    for (let d = 0; d < sampleDepth; d++) {
      for (let x = 0; x < width; x++) {
        samplePixel(x, d);
        samplePixel(x, height - 1 - d);
      }
    }

    // Sample left and right columns
    for (let d = 0; d < sampleDepth; d++) {
      for (let y = sampleDepth; y < height - sampleDepth; y++) {
        samplePixel(d, y);
        samplePixel(width - 1 - d, y);
      }
    }

    if (borderCount === 0) return [];

    // Filter colors that make up at least 1% of sampled border pixels
    const sortedBorderColors = Array.from(borderColors.entries())
      .filter(([, count]) => (count / borderCount) >= 0.01)
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex);

    return sortedBorderColors;
  }

  /**
   * Specifically extracts and serializes colors present on exterior boundaries, outlines,
   * outer fringes, and background cells.
   * @param {ImageData|Array<Array<object>>} source - ImageData or 2D CellModel grid
   * @param {Object} options
   * @param {string} [options.sortBy='dark-to-light'] - 'dark-to-light' | 'light-to-dark' | 'frequency'
   * @param {number} [options.maxColors=64] - Maximum number of distinct colors to return
   * @param {number} [options.minAlpha=10] - Minimum alpha threshold
   * @returns {Array<{hex: string, r: number, g: number, b: number, count: number, percentage: number, luminance: number, category: string}>}
   */
  static extractBoundaryAndOutsideColors(source, options = {}) {
    if (!source) return [];

    const {
      sortBy = 'dark-to-light',
      maxColors = 64,
      minAlpha = 10
    } = options;

    const colorMap = new Map();
    let totalCount = 0;

    if (Array.isArray(source) && source.length > 0 && Array.isArray(source[0])) {
      // 2D grid of CellModel objects
      const numRows = source.length;
      const numCols = source[0].length;
      const D8 = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = source[r][c];
          if (!cell || (cell.sample && cell.sample.a < minAlpha)) continue;

          const isPerimeter = (r === 0 || r === numRows - 1 || c === 0 || c === numCols - 1);
          let isBoundaryOrOuter = isPerimeter || cell.isRemoved || cell.category === 'background' || cell.category === 'boundary';
          if (!isBoundaryOrOuter) {
            for (let i = 0; i < 8; i++) {
              const nr = r + D8[i][0];
              const nc = c + D8[i][1];
              if (nr < 0 || nr >= numRows || nc < 0 || nc >= numCols || source[nr][nc].isRemoved || source[nr][nc].category === 'background') {
                isBoundaryOrOuter = true;
                break;
              }
            }
          }

          if (isBoundaryOrOuter) {
            const rVal = cell.sample ? cell.sample.r : 0;
            const gVal = cell.sample ? cell.sample.g : 0;
            const bVal = cell.sample ? cell.sample.b : 0;
            const hex = rgbToHex(rVal, gVal, bVal).toLowerCase();

            let entry = colorMap.get(hex);
            if (!entry) {
              entry = { hex, r: rVal, g: gVal, b: bVal, count: 0 };
              colorMap.set(hex, entry);
            }
            entry.count++;
            totalCount++;
          }
        }
      }
    } else if (source.data && source.width && source.height) {
      // ImageData object
      const { width, height, data } = source;
      const depth = Math.max(1, Math.floor(Math.min(width, height) * 0.05)); // 5% border depth

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const isOuter = (x < depth || x >= width - depth || y < depth || y >= height - depth);
          if (!isOuter) continue;

          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a < minAlpha) continue;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const hex = rgbToHex(r, g, b).toLowerCase();

          let entry = colorMap.get(hex);
          if (!entry) {
            entry = { hex, r, g, b, count: 0 };
            colorMap.set(hex, entry);
          }
          entry.count++;
          totalCount++;
        }
      }
    }

    if (totalCount === 0) return [];

    const colors = Array.from(colorMap.values()).map(c => {
      const luminance = this.getLuminance(c.r, c.g, c.b);
      const percentage = Number(((c.count / totalCount) * 100).toFixed(1));
      return {
        hex: c.hex,
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count,
        percentage,
        luminance: Number(luminance.toFixed(3)),
        category: this.getTonalCategory(luminance)
      };
    });

    if (sortBy === 'dark-to-light') {
      colors.sort((a, b) => Math.abs(a.luminance - b.luminance) > 0.001 ? a.luminance - b.luminance : b.count - a.count);
    } else if (sortBy === 'light-to-dark') {
      colors.sort((a, b) => Math.abs(a.luminance - b.luminance) > 0.001 ? b.luminance - a.luminance : b.count - a.count);
    } else if (sortBy === 'frequency') {
      colors.sort((a, b) => b.count - a.count);
    }

    return colors.slice(0, maxColors);
  }

  /**
   * Specifically extracts and serializes colors present on interior design regions,
   * inner edges, shading, and artwork core cells.
   * @param {ImageData|Array<Array<object>>} source - ImageData or 2D CellModel grid
   * @param {Object} options
   * @param {string} [options.sortBy='dark-to-light'] - 'dark-to-light' | 'light-to-dark' | 'frequency'
   * @param {number} [options.maxColors=64] - Maximum number of distinct colors to return
   * @param {number} [options.minAlpha=10] - Minimum alpha threshold
   * @returns {Array<{hex: string, r: number, g: number, b: number, count: number, percentage: number, luminance: number, category: string}>}
   */
  static extractInsideColors(source, options = {}) {
    if (!source) return [];

    const {
      sortBy = 'dark-to-light',
      maxColors = 64,
      minAlpha = 10
    } = options;

    const colorMap = new Map();
    let totalCount = 0;

    if (Array.isArray(source) && source.length > 0 && Array.isArray(source[0])) {
      // 2D grid of CellModel objects
      const numRows = source.length;
      const numCols = source[0].length;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = source[r][c];
          if (!cell || (cell.sample && cell.sample.a < minAlpha)) continue;

          // Inside design cell: not removed, category is design or boundary (or not background)
          const isBackground = cell.isRemoved || cell.category === 'background';
          if (!isBackground) {
            const rVal = cell.sample ? cell.sample.r : 0;
            const gVal = cell.sample ? cell.sample.g : 0;
            const bVal = cell.sample ? cell.sample.b : 0;
            const hex = rgbToHex(rVal, gVal, bVal).toLowerCase();

            let entry = colorMap.get(hex);
            if (!entry) {
              entry = { hex, r: rVal, g: gVal, b: bVal, count: 0 };
              colorMap.set(hex, entry);
            }
            entry.count++;
            totalCount++;
          }
        }
      }
    } else if (source.data && source.width && source.height) {
      // ImageData object
      const { width, height, data } = source;
      const depth = Math.max(1, Math.floor(Math.min(width, height) * 0.05));

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const isOuter = (x < depth || x >= width - depth || y < depth || y >= height - depth);
          if (isOuter) continue;

          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a < minAlpha) continue;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const hex = rgbToHex(r, g, b).toLowerCase();

          let entry = colorMap.get(hex);
          if (!entry) {
            entry = { hex, r, g, b, count: 0 };
            colorMap.set(hex, entry);
          }
          entry.count++;
          totalCount++;
        }
      }
    }

    if (totalCount === 0 && source) {
      return this.extractColors(source, options);
    }

    if (totalCount === 0) return [];

    const colors = Array.from(colorMap.values()).map(c => {
      const luminance = this.getLuminance(c.r, c.g, c.b);
      const percentage = Number(((c.count / totalCount) * 100).toFixed(1));
      return {
        hex: c.hex,
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count,
        percentage,
        luminance: Number(luminance.toFixed(3)),
        category: this.getTonalCategory(luminance)
      };
    });

    if (sortBy === 'dark-to-light') {
      colors.sort((a, b) => Math.abs(a.luminance - b.luminance) > 0.001 ? a.luminance - b.luminance : b.count - a.count);
    } else if (sortBy === 'light-to-dark') {
      colors.sort((a, b) => Math.abs(a.luminance - b.luminance) > 0.001 ? b.luminance - a.luminance : b.count - a.count);
    } else if (sortBy === 'frequency') {
      colors.sort((a, b) => b.count - a.count);
    }

    return colors.slice(0, maxColors);
  }
}
