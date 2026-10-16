import { describe, it, expect } from 'vitest';
import { PixelGrid } from '../src/core/pixel-art/PixelGrid.js';
import { SvgExporter } from '../src/core/export/SvgExporter.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { DocumentManager, DOCUMENT_PRESETS } from '../src/core/document/DocumentManager.js';
import { BoundaryValidator } from '../src/core/document/BoundaryValidator.js';
import { MarketplaceSafeCheck, MARKETPLACE_DISCLAIMER } from '../src/core/marketplace/MarketplaceSafeCheck.js';

describe('Transparent Background & SVG Zero-Background Mandate', () => {
  it('Pixel Art SVG in transparent mode contains ZERO background rect', () => {
    const grid = new PixelGrid(8, 8, [[255, 0, 0]]);
    grid.setPixelIndex(0, 0, 0, 255);

    const svg = SvgExporter.exportPixelArt(grid, {
      mode: 'editable',
      pixelSize: 10,
      transparentBg: true,
      bgColor: null
    });

    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<rect width="80" height="80"');
  });

  it('Pixel Art SVG with solid background generates background rect', () => {
    const grid = new PixelGrid(8, 8, [[255, 0, 0]]);
    grid.setPixelIndex(0, 0, 0, 255);

    const svg = SvgExporter.exportPixelArt(grid, {
      mode: 'editable',
      pixelSize: 10,
      transparentBg: false,
      bgColor: '#ffffff'
    });

    expect(svg).toContain('<rect width="80" height="80" fill="#ffffff" />');
  });

  it('Mosaic SVG in transparent mode contains ZERO background rect', () => {
    const mockMosaicResult = {
      width: 100,
      height: 100,
      tiles: [{ x: 50, y: 50, size: 10, shape: 'square', color: 'rgb(255,0,0)', alpha: 1 }]
    };

    const svg = SvgExporter.exportMosaic(mockMosaicResult, {
      transparentBg: true,
      bgColor: '#0f172a'
    });

    expect(svg).not.toContain('fill="#0f172a"');
    expect(svg).not.toContain('<rect width="100" height="100"');
    expect(svg).toContain('<rect x="45" y="45" width="10" height="10"');
  });

  it('MosaicEngine processes cleanly with Strict 5% tolerance and disabled edge filters', () => {
    // Create a 20x20 mock image (RGBA) with black background and yellow center
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 6 && x < 14 && y >= 6 && y < 14) {
          // Yellow center
          data[idx] = 255;
          data[idx + 1] = 220;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          // Black background
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      tileSize: 4,
      shape: 'square',
      spacing: 0,
      bgRemovalMode: 'black',
      bgRemovalScope: 'contiguous',
      colorTolerance: 5,
      restoreEdgeColors: false,
      perfectCorners: false,
      snapEdgeColors: false,
      deFringe: false
    });

    expect(res).toBeDefined();
    expect(res.tiles.length).toBeGreaterThan(0);
    // Yellow tiles in the center should be preserved, black background removed
    const yellowTiles = res.tiles.filter(t => t.color.includes('255'));
    expect(yellowTiles.length).toBeGreaterThan(0);
  });

  it('Magic Wand Tolerance: 1 strictly isolates pure #000000 and protects dark shades', () => {
    // 20x20 image: corners pure black (#000000), edges dark grey (#141414), center yellow
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 8 && x < 12 && y >= 8 && y < 12) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 0; data[idx + 3] = 255; // Yellow center
        } else if (x === 0 || y === 0) {
          data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255; // Pure Black #000000
        } else {
          data[idx] = 20; data[idx + 1] = 20; data[idx + 2] = 20; data[idx + 3] = 255; // Dark Grey #141414
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      tileSize: 4,
      shape: 'square',
      spacing: 0,
      bgRemovalMode: 'black',
      bgRemovalScope: 'global',
      colorTolerance: 1, // Pure single color tolerance 1
      restoreEdgeColors: false,
      perfectCorners: false,
      snapEdgeColors: false,
      deFringe: false
    });

    // Dark grey tiles (RGB 20) MUST NOT be removed with tolerance: 1
    const greyTiles = res.tiles.filter(t => t.color.includes('20, 20, 20') || t.color.includes('20,20,20'));
    expect(greyTiles.length).toBeGreaterThan(0);
  });

  it('Halftone SVG in transparent mode contains ZERO background rect', () => {
    const mockHalftoneResult = {
      width: 100,
      height: 100,
      items: [{ x: 50, y: 50, radius: 4, shape: 'circle', color: '#000000', alpha: 1, hollow: false }]
    };

    const svg = SvgExporter.exportHalftone(mockHalftoneResult, {
      transparentBg: true,
      bgColor: '#ffffff'
    });

    expect(svg).not.toContain('<rect width="100" height="100"');
    expect(svg).toContain('<circle cx="50" cy="50" r="4" fill="#000000"');
  });
});

describe('DocumentManager & BoundaryValidator', () => {
  it('provides all preset dimensions correctly', () => {
    const doc = new DocumentManager('landscape-1920');
    const dims = doc.getDimensions();
    expect(dims.width).toBe(1920);
    expect(dims.height).toBe(1080);
    expect(doc.getAspectRatio()).toBeCloseTo(16 / 9, 2);
  });

  it('validates all high quality preset entries in DOCUMENT_PRESETS catalog', () => {
    Object.keys(DOCUMENT_PRESETS).forEach((key) => {
      const doc = new DocumentManager(key);
      const dims = doc.getDimensions();
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
      expect(doc.getAspectRatio()).toBeGreaterThan(0);
    });
  });

  it('handles custom dimensions properly', () => {
    const doc = new DocumentManager('custom', 1200, 600);
    const dims = doc.getDimensions();
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(600);
  });

  it('validates and clamps overflow rectangles', () => {
    const clamped = BoundaryValidator.clampRect(90, 95, 20, 20, 100, 100);
    expect(clamped.x).toBe(90);
    expect(clamped.y).toBe(95);
    expect(clamped.width).toBe(10);
    expect(clamped.height).toBe(5);
  });

  it('validates and clamps overflow circles', () => {
    const clamped = BoundaryValidator.clampCircle(98, 98, 10, 100, 100);
    expect(clamped.cx + clamped.radius).toBeLessThanOrEqual(100);
    expect(clamped.cy + clamped.radius).toBeLessThanOrEqual(100);
  });
});

describe('MarketplaceSafeCheck & Disclaimers', () => {
  it('flags trademark brand keywords', () => {
    const report = MarketplaceSafeCheck.inspect({ title: 'Pixel art of Mario in castle' });
    expect(report.isSafe).toBe(false);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings[0].category).toBe('Trademark / Brand Risk');
  });

  it('returns exact required marketplace disclaimer', () => {
    const report = MarketplaceSafeCheck.inspect({});
    expect(report.disclaimer).toBe(MARKETPLACE_DISCLAIMER);
  });
});
