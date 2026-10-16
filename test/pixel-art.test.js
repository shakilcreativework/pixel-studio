import { describe, it, expect } from 'vitest';
import { PixelGrid } from '../src/core/pixel-art/PixelGrid.js';
import { rgbToOklab, oklabToRgb, sampleCellColor } from '../src/core/pixel-art/ColorSampling.js';
import { generateMedianCutPalette, findNearestPaletteColor, PRESET_PALETTES } from '../src/core/pixel-art/PaletteEngine.js';
import { DitheringEngine } from '../src/core/pixel-art/DitheringEngine.js';
import { PixelEditor } from '../src/core/pixel-art/PixelEditor.js';
import { SvgExporter } from '../src/core/export/SvgExporter.js';

describe('PixelGrid Data Model', () => {
  it('creates a grid with correct dimensions and typed arrays', () => {
    const grid = new PixelGrid(32, 16, [[255, 0, 0], [0, 255, 0]]);
    expect(grid.width).toBe(32);
    expect(grid.height).toBe(16);
    expect(grid.indexes.length).toBe(32 * 16);
    expect(grid.alpha.length).toBe(32 * 16);
  });

  it('sets and gets pixel colors and alpha correctly', () => {
    const grid = new PixelGrid(10, 10, [[255, 0, 0]]);
    grid.setPixelIndex(2, 3, 0, 200);

    const pixel = grid.getPixel(2, 3);
    expect(pixel).not.toBeNull();
    expect(pixel.r).toBe(255);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
    expect(pixel.a).toBe(200);
    expect(pixel.paletteIndex).toBe(0);
  });

  it('serializes to JSON and restores identical state', () => {
    const grid = new PixelGrid(4, 4, [[10, 20, 30], [200, 100, 50]]);
    grid.setPixelIndex(1, 1, 1, 180);
    const json = grid.toJSON();

    const restored = PixelGrid.fromJSON(json);
    expect(restored.width).toBe(4);
    expect(restored.height).toBe(4);
    expect(restored.getPixel(1, 1).r).toBe(200);
    expect(restored.getPixel(1, 1).a).toBe(180);
  });
});

describe('ColorSpace & OKLab Sampling', () => {
  it('converts RGB to OKLab and back accurately', () => {
    const r = 180, g = 60, b = 220;
    const ok = rgbToOklab(r, g, b);
    expect(ok.L).toBeGreaterThan(0);
    expect(ok.L).toBeLessThan(1);

    const [r2, g2, b2] = oklabToRgb(ok.L, ok.a, ok.b);
    expect(Math.abs(r - r2)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - g2)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - b2)).toBeLessThanOrEqual(2);
  });

  it('samples perceptual OKLab color accurately from RGBA buffer', () => {
    const buffer = new Uint8ClampedArray(4 * 4 * 4); // 4x4 image
    for (let i = 0; i < 16; i++) {
      buffer[i * 4] = 255;
      buffer[i * 4 + 1] = 0;
      buffer[i * 4 + 2] = 0;
      buffer[i * 4 + 3] = 255;
    }

    const sample = sampleCellColor(buffer, 4, 4, 0, 0, 4, 4, 'perceptual');
    expect(sample.r).toBeGreaterThanOrEqual(250);
    expect(sample.g).toBe(0);
    expect(sample.b).toBe(0);
    expect(sample.a).toBe(255);
  });
});

describe('PaletteEngine & Median-Cut', () => {
  it('quantizes colors into target palette count', () => {
    const colors = [];
    for (let r = 0; r < 256; r += 32) {
      for (let g = 0; g < 256; g += 32) {
        colors.push({ r, g, b: 128, a: 255 });
      }
    }

    const palette = generateMedianCutPalette(colors, 8);
    expect(palette.length).toBeLessThanOrEqual(8);
    expect(palette.length).toBeGreaterThanOrEqual(2);
  });

  it('finds closest palette color via OKLab distance', () => {
    const palette = [
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255]
    ];

    const match = findNearestPaletteColor(240, 20, 10, palette, 'oklab');
    expect(match.color).toEqual([255, 0, 0]);
  });
});

describe('Dithering Engine (Fixed-Grid Invariant)', () => {
  it('preserves grid dimensions when applying Floyd-Steinberg dithering', () => {
    const w = 8, h = 8;
    const rawCells = new Array(w * h).fill({ r: 128, g: 128, b: 128, a: 255 });
    const palette = [[0, 0, 0], [255, 255, 255]];

    const result = DitheringEngine.apply(rawCells, w, h, palette, 'floyd-steinberg', 1.0);
    expect(result.indexes.length).toBe(w * h);
    expect(result.alpha.length).toBe(w * h);
  });

  it('preserves grid dimensions when applying Bayer dithering', () => {
    const w = 16, h = 16;
    const rawCells = new Array(w * h).fill({ r: 100, g: 150, b: 200, a: 255 });
    const palette = PRESET_PALETTES['pico-8'].colors;

    const result = DitheringEngine.apply(rawCells, w, h, palette, 'bayer4', 1.0);
    expect(result.indexes.length).toBe(w * h);
  });
});

describe('Pixel Editor Tools', () => {
  it('draws pencil and modifies pixel indices', () => {
    const grid = new PixelGrid(10, 10, [[0, 0, 0], [255, 255, 255]]);
    PixelEditor.drawPencil(grid, 5, 5, 1, 1, 255);

    expect(grid.indexes[grid.getIndex(5, 5)]).toBe(1);
    expect(grid.alpha[grid.getIndex(5, 5)]).toBe(255);
  });

  it('performs 4-way BFS flood fill correctly', () => {
    const grid = new PixelGrid(6, 6, [[0, 0, 0], [255, 0, 0]]);
    // All cells initially index 0
    PixelEditor.floodFill(grid, 0, 0, 1, 255);

    for (let i = 0; i < 36; i++) {
      expect(grid.indexes[i]).toBe(1);
    }
  });

  it('erases cell alpha', () => {
    const grid = new PixelGrid(5, 5, [[255, 0, 0]]);
    PixelEditor.erase(grid, 2, 2, 1);
    expect(grid.alpha[grid.getIndex(2, 2)]).toBe(0);
  });
});

describe('True Vector SVG Exporter', () => {
  it('exports true vector <rect> geometry without raster <image> tags', () => {
    const grid = new PixelGrid(8, 8, [[255, 0, 0], [0, 255, 0]]);
    grid.setPixelIndex(0, 0, 0, 255);
    grid.setPixelIndex(1, 0, 1, 255);

    const svg = SvgExporter.exportPixelArt(grid, { mode: 'editable', pixelSize: 10 });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('data:image/png');
  });

  it('exports optimized run-length merged SVG', () => {
    const grid = new PixelGrid(10, 1, [[255, 0, 0]]);
    for (let x = 0; x < 10; x++) {
      grid.setPixelIndex(x, 0, 0, 255);
    }

    const svg = SvgExporter.exportPixelArt(grid, { mode: 'optimized', pixelSize: 10 });
    // Merged into 1 rect of width 100
    expect(svg).toContain('width="100"');
  });

  it('exports SVG matching targetWidth and targetHeight selected in Document Size Preset (e.g. 3840x2160)', () => {
    const grid = new PixelGrid(64, 36, [[255, 0, 0]]);
    grid.setPixelIndex(0, 0, 0, 255);

    const svg = SvgExporter.exportPixelArt(grid, {
      mode: 'editable',
      targetWidth: 3840,
      targetHeight: 2160
    });

    expect(svg).toContain('width="3840"');
    expect(svg).toContain('height="2160"');
    expect(svg).toContain('viewBox="0 0 3840 2160"');
  });
});
