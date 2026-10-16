/**
 * PaletteEngine.js
 * Automatic palette generation (Median Cut, K-Means), OKLab Delta-E color quantization,
 * preset retro palettes, and color palette reduction algorithms.
 */

import { rgbToOklab, oklabDistance, rgbDistanceSq } from './ColorSampling.js';

export const PRESET_PALETTES = {
  'pico-8': {
    name: 'PICO-8 (16 Colors)',
    colors: [
      [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
      [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
      [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
      [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
    ]
  },
  'gameboy': {
    name: 'Game Boy (4 Colors)',
    colors: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ]
  },
  'monochrome': {
    name: '1-Bit Monochrome (2 Colors)',
    colors: [
      [0, 0, 0],
      [255, 255, 255]
    ]
  },
  'c64': {
    name: 'Commodore 64 (16 Colors)',
    colors: [
      [0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238],
      [204, 68, 204], [0, 204, 85], [0, 0, 170], [238, 238, 119],
      [221, 136, 85], [102, 68, 0], [255, 119, 119], [51, 51, 51],
      [119, 119, 119], [170, 255, 102], [0, 136, 255], [187, 187, 187]
    ]
  },
  'cyberpunk': {
    name: 'Cyberpunk Neon (16 Colors)',
    colors: [
      [11, 10, 29], [34, 13, 56], [68, 19, 87], [138, 30, 126],
      [238, 58, 130], [254, 138, 138], [255, 222, 169], [255, 255, 255],
      [17, 34, 80], [13, 89, 138], [28, 163, 173], [79, 234, 196],
      [255, 240, 90], [255, 142, 43], [191, 38, 86], [103, 19, 128]
    ]
  },
  'pastel': {
    name: 'Pastel Dreams (16 Colors)',
    colors: [
      [94, 75, 113], [139, 109, 156], [198, 158, 192], [240, 208, 219],
      [254, 238, 235], [255, 209, 220], [255, 179, 186], [255, 223, 186],
      [255, 255, 186], [186, 255, 201], [186, 225, 255], [179, 186, 255],
      [209, 179, 255], [242, 179, 255], [149, 165, 166], [52, 73, 94]
    ]
  },
  'solar8': {
    name: 'Solar 8 (8 Colors)',
    colors: [
      [16, 12, 33], [72, 34, 76], [152, 59, 84], [228, 106, 73],
      [251, 190, 83], [254, 244, 139], [86, 175, 145], [22, 73, 99]
    ]
  },
  'endesga32': {
    name: 'EDG 32 (32 Colors)',
    colors: [
      [190, 74, 47], [215, 118, 67], [234, 212, 170], [228, 166, 114],
      [184, 111, 80], [115, 62, 57], [62, 39, 49], [162, 38, 51],
      [228, 59, 68], [247, 118, 34], [254, 174, 52], [254, 231, 97],
      [99, 199, 77], [62, 137, 72], [38, 92, 66], [25, 60, 62],
      [18, 78, 137], [0, 153, 219], [44, 232, 245], [255, 255, 255],
      [192, 203, 220], [139, 155, 180], [90, 105, 136], [58, 68, 102],
      [38, 43, 68], [24, 20, 37], [78, 74, 78], [133, 76, 48],
      [118, 66, 138], [172, 50, 50], [217, 87, 99], [215, 123, 186]
    ]
  },
  'nes-54': {
    name: 'NES Classic (54 Colors)',
    colors: [
      [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188],
      [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0],
      [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0],
      [0, 64, 88], [0, 0, 0], [188, 188, 188], [0, 120, 248],
      [0, 88, 248], [104, 68, 252], [216, 0, 204], [228, 0, 88],
      [248, 56, 0], [228, 92, 16], [172, 124, 0], [0, 184, 0],
      [0, 168, 0], [0, 168, 68], [0, 136, 136], [248, 248, 248],
      [60, 188, 252], [104, 136, 252], [152, 120, 248], [248, 120, 248],
      [248, 88, 152], [248, 120, 88], [252, 160, 68], [248, 184, 0],
      [184, 248, 24], [88, 216, 84], [88, 248, 152], [0, 232, 216],
      [120, 120, 120], [252, 252, 252], [164, 228, 252], [184, 184, 248],
      [216, 184, 248], [248, 184, 248], [248, 164, 192], [240, 208, 176],
      [252, 224, 168], [248, 216, 120], [216, 248, 120], [184, 248, 184],
      [184, 248, 216], [0, 252, 252]
    ]
  },
  'lego-studs-40': {
    name: 'Lego Studs (40 Colors)',
    colors: [
      [255, 255, 255], [33, 33, 33], [201, 26, 9], [0, 85, 191],
      [254, 196, 0], [0, 133, 43], [254, 138, 24], [88, 42, 18],
      [160, 165, 169], [108, 110, 104], [214, 121, 35], [228, 205, 158],
      [0, 170, 220], [187, 233, 11], [228, 173, 200], [146, 57, 120],
      [71, 140, 198], [149, 138, 115], [112, 142, 124], [231, 99, 24],
      [207, 135, 110], [92, 106, 118], [174, 162, 150], [160, 95, 52],
      [222, 198, 156], [220, 144, 149], [128, 8, 8], [53, 33, 156],
      [24, 70, 40], [135, 192, 234], [170, 202, 58], [246, 173, 205],
      [170, 85, 0], [138, 146, 141], [156, 163, 168], [211, 242, 234],
      [245, 193, 137], [255, 230, 0], [115, 20, 18], [13, 105, 171]
    ]
  }
};

/**
 * Generate a reduced palette using the Median-Cut algorithm.
 */
export function generateMedianCutPalette(sampledColors, targetSize = 16) {
  if (!sampledColors || sampledColors.length === 0) {
    return [[0, 0, 0], [255, 255, 255]];
  }

  // Filter out transparent / zero colors
  const validColors = sampledColors.filter(c => c && (c.a === undefined || c.a > 10));
  if (validColors.length <= targetSize) {
    return validColors.map(c => [c.r, c.g, c.b]);
  }

  // Box class for partitioning
  class ColorBox {
    constructor(colors) {
      this.colors = colors;
      this.calculateBounds();
    }

    calculateBounds() {
      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let i = 0; i < this.colors.length; i++) {
        const c = this.colors[i];
        if (c.r < minR) minR = c.r;
        if (c.r > maxR) maxR = c.r;
        if (c.g < minG) minG = c.g;
        if (c.g > maxG) maxG = c.g;
        if (c.b < minB) minB = c.b;
        if (c.b > maxB) maxB = c.b;
      }

      this.rangeR = maxR - minR;
      this.rangeG = maxG - minG;
      this.rangeB = maxB - minB;
      this.maxRange = Math.max(this.rangeR, this.rangeG, this.rangeB);
    }

    split() {
      if (this.colors.length <= 1) return [this];

      let channel = 'r';
      if (this.rangeG >= this.rangeR && this.rangeG >= this.rangeB) {
        channel = 'g';
      } else if (this.rangeB >= this.rangeR && this.rangeB >= this.rangeG) {
        channel = 'b';
      }

      this.colors.sort((a, b) => a[channel] - b[channel]);
      const mid = Math.floor(this.colors.length / 2);
      const box1 = new ColorBox(this.colors.slice(0, mid));
      const box2 = new ColorBox(this.colors.slice(mid));
      return [box1, box2];
    }

    getAverageColor() {
      if (this.colors.length === 0) return [0, 0, 0];
      let sumR = 0, sumG = 0, sumB = 0;
      for (let i = 0; i < this.colors.length; i++) {
        sumR += this.colors[i].r;
        sumG += this.colors[i].g;
        sumB += this.colors[i].b;
      }
      return [
        Math.round(sumR / this.colors.length),
        Math.round(sumG / this.colors.length),
        Math.round(sumB / this.colors.length)
      ];
    }
  }

  const initialBox = new ColorBox(validColors);
  const boxes = [initialBox];

  while (boxes.length < targetSize) {
    // Find the box with the largest color range and more than 1 color
    let largestBoxIndex = -1;
    let maxRange = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].colors.length > 1 && boxes[i].maxRange > maxRange) {
        maxRange = boxes[i].maxRange;
        largestBoxIndex = i;
      }
    }

    if (largestBoxIndex === -1 || maxRange === 0) {
      break; // cannot split further
    }

    const boxToSplit = boxes.splice(largestBoxIndex, 1)[0];
    const [b1, b2] = boxToSplit.split();
    boxes.push(b1, b2);
  }

  return boxes.map(b => b.getAverageColor());
}

/**
 * Find nearest color in palette using OKLab or RGB distance.
 */
export function findNearestPaletteColor(r, g, b, palette, colorSpace = 'oklab') {
  if (!palette || palette.length === 0) {
    return { index: 0, color: [r, g, b] };
  }

  let bestIndex = 0;
  let minDistance = Infinity;

  if (colorSpace === 'oklab') {
    const targetOk = rgbToOklab(r, g, b);
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const pOk = rgbToOklab(p[0], p[1], p[2]);
      const dist = oklabDistance(targetOk, pOk);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }
  } else {
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dist = rgbDistanceSq(r, g, b, p[0], p[1], p[2]);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }
  }

  return {
    index: bestIndex,
    color: palette[bestIndex]
  };
}

/**
 * Convert RGB array to hex string `#RRGGBB`
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex string `#RRGGBB` or `#RGB` to `[r, g, b]`
 */
export function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(ch => ch + ch).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
