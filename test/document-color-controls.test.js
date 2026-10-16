import { describe, it, expect } from 'vitest';
import { DocumentColorExtractor } from '../src/core/mosaic/DocumentColorExtractor.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Document & Outside Colors Control System', () => {
  it('extracts boundary and outside colors sorted from dark to light', () => {
    const grid = [];
    const colorsList = [
      { r: 255, g: 255, b: 255 }, // Light (L = 1.0) -> #ffffff
      { r: 0, g: 0, b: 0 },       // Dark (L = 0.0) -> #000000
      { r: 128, g: 128, b: 128 }  // Midtone (L ~ 0.5) -> #808080
    ];

    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const rgb = colorsList[(r * 3 + c) % 3];
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: `rgb(${rgb.r},${rgb.g},${rgb.b})`,
          sample: { ...rgb, a: 255 }
        });
        row.push(cell);
      }
      grid.push(row);
    }

    const outsideColors = DocumentColorExtractor.extractBoundaryAndOutsideColors(grid, {
      sortBy: 'dark-to-light'
    });

    expect(outsideColors.length).toBeGreaterThan(0);
    // First color in dark-to-light order should be black (#000000)
    expect(outsideColors[0].hex).toBe('#000000');
    expect(outsideColors[0].luminance).toBe(0);

    // Last color should be white (#ffffff)
    expect(outsideColors[outsideColors.length - 1].hex).toBe('#ffffff');
    expect(outsideColors[outsideColors.length - 1].luminance).toBe(1);
  });

  it('correctly categorizes tonal ranges (dark, light, midtone)', () => {
    expect(DocumentColorExtractor.getTonalCategory(0.10)).toBe('dark');
    expect(DocumentColorExtractor.getTonalCategory(0.85)).toBe('light');
    expect(DocumentColorExtractor.getTonalCategory(0.50)).toBe('midtone');
  });

  it('detects outer background color cluster correctly from image data', () => {
    // 10x10 fake image with white border and black center
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isBorder = (x === 0 || x === width - 1 || y === 0 || y === height - 1);
        if (isBorder) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }

    const imgData = { width, height, data };
    const bgCluster = DocumentColorExtractor.detectBackgroundColorCluster(imgData, 1);

    expect(bgCluster).toContain('#ffffff');
    expect(bgCluster).not.toContain('#000000');
  });

  it('extracts inside / design colors from grid excluding background cells', () => {
    const grid = [];
    // 3x3 grid: perimeter is background (#ffffff), center cell (1,1) is design purple (#800080)
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const isCenter = (r === 1 && c === 1);
        const rgb = isCenter ? { r: 128, g: 0, b: 128 } : { r: 255, g: 255, b: 255 };
        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: c * 10,
          y: r * 10,
          width: 10,
          height: 10,
          color: `rgb(${rgb.r},${rgb.g},${rgb.b})`,
          sample: { ...rgb, a: 255 }
        });
        cell.category = isCenter ? 'design' : 'background';
        row.push(cell);
      }
      grid.push(row);
    }

    const insideColors = DocumentColorExtractor.extractInsideColors(grid);
    expect(insideColors.length).toBe(1);
    expect(insideColors[0].hex).toBe('#800080');
  });

  it('supports independent outside and inside color removal settings without side effects', () => {
    // 5x5 image: perimeter white (#ffffff), interior gold (#ffd700), center star red (#ff0000)
    const width = 5;
    const height = 5;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isBorder = (x === 0 || x === width - 1 || y === 0 || y === height - 1);
        const isCenter = (x === 2 && y === 2);
        if (isBorder) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else if (isCenter) {
          data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        } else {
          data[idx] = 255; data[idx + 1] = 215; data[idx + 2] = 0; data[idx + 3] = 255;
        }
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 1,
      bgRemovalMode: 'custom',
      outsideBgRemovalColors: ['#ffffff'],
      insideBgRemovalColors: ['#ff0000']
    });

    // Outer white border and center red star should be removed; gold ring remains
    expect(result.tiles.some(t => t.color === 'rgb(255,255,255)')).toBe(false);
    expect(result.tiles.some(t => t.color === 'rgb(255,0,0)')).toBe(false);
    expect(result.tiles.some(t => t.color === 'rgb(255,215,0)')).toBe(true);
  });
});
