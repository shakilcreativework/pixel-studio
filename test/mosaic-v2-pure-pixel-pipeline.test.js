import { describe, it, expect, vi } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { GridScaleDetector } from '../src/core/mosaic/GridScaleDetector.js';
import { InputClassifier } from '../src/core/mosaic/InputClassifier.js';

import { MosaicVerificationEngine } from '../src/core/mosaic/MosaicVerificationEngine.js';
import * as ContinuousShadingModule from '../src/core/mosaic/ContinuousShading.js';

describe('Mosaic Engine v2 — Pathway B Pure Pixel Pipeline (PRD §11 Golden Tests)', () => {
  // Test 1: Exact Color Preservation (Zero Color Loss)
  it('Test 1 — Exact Color Preservation: output uses exactly source colors with zero additions', () => {
    // 16x16 sprite with 12 distinct colors (1 per column, remaining 4 white)
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    const colors = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
      [255, 0, 255], [0, 255, 255], [128, 0, 0], [0, 128, 0],
      [0, 0, 128], [128, 128, 0], [128, 0, 128], [0, 128, 128]
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const col = colors[x % colors.length];
        data[idx] = col[0];
        data[idx + 1] = col[1];
        data[idx + 2] = col[2];
        data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1 // legacy explicit grid (bypasses detected-grid fix)
    });

    expect(res.pathway).toBe('pixel-art');
    const outputColors = new Set(res.tiles.map(t => t.color));

    // Every color in output must be one of our 12 exact input colors
    for (const outCol of outputColors) {
      const match = outCol.match(/rgb\((\d+),(\d+),(\d+)\)/);
      expect(match).not.toBeNull();
      const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      const foundInInput = colors.some(c => c[0] === r && c[1] === g && c[2] === b);
      expect(foundInInput).toBe(true);
    }
    expect(outputColors.size).toBe(12);
  });

  // Test 2: Upscaled Sprite Detection
  it('Test 2 — Upscaled Sprite Detection: reports true underlying cell size (32px) on upscaled sprite', () => {
    // 16x16 sprite scaled 32x to 512x512 with nearest neighbor
    const width = 512;
    const height = 512;
    const data = new Uint8ClampedArray(width * height * 4);
    const nativeBlock = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const blockX = Math.floor(x / nativeBlock);
        const blockY = Math.floor(y / nativeBlock);
        const isDark = (blockX + blockY) % 2 === 0;

        data[idx] = isDark ? 0 : 255;
        data[idx + 1] = isDark ? 0 : 255;
        data[idx + 2] = isDark ? 0 : 255;
        data[idx + 3] = 255;
      }
    }

    const detection = GridScaleDetector.detect({ width, height, data });
    expect(detection.detectedCellSize).toBe(32);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.6);
  });

  // Test 3: Multi-Sprite Sheet Segmentation
  it('Test 3 — Multi-Sprite Sheet Segmentation: correctly segments distinct sprite islands', () => {
    // 64x64 sheet containing 4 distinct 8x8 heart/sprite islands separated by transparent background
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);

    const drawSprite = (startX, startY) => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = ((startY + y) * width + (startX + x)) * 4;
          data[idx] = 220;
          data[idx + 1] = 20;
          data[idx + 2] = 60;
          data[idx + 3] = 255;
        }
      }
    };

    drawSprite(8, 8);   // Island 1
    drawSprite(40, 8);  // Island 2
    drawSprite(8, 40);  // Island 3
    drawSprite(40, 40); // Island 4

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 8
    });

    expect(res.islands).toBeDefined();
    expect(res.islands.length).toBe(4);
    expect(res.islands[0].cells.length).toBeGreaterThan(0);
  });

  // Test 4: Thin Feature Survival
  it('Test 4 — Thin Feature Survival: 1-cell-wide lines survive cleanup unmodified', () => {
    // 16x16 grid with a 1-cell wide horizontal line across columns 4 to 12
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let x = 4; x <= 12; x++) {
      const idx = (8 * width + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 255;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1, // legacy explicit grid (bypasses detected-grid fix)
      cleanupEnabled: true
    });

    // Verify all 9 cells of the 1-cell-wide line survive
    for (let x = 4; x <= 12; x++) {
      const cell = res.grid[8][x];
      expect(cell.isRemoved).toBe(false);
      expect(cell.isThinFeature).toBe(true);
    }
  });

  // Test 5: Tight Background Tolerance
  it('Test 5 — Tight Background Tolerance: 0-5% tolerance does not misclassify near-white highlights as background', () => {
    // 16x16 image: pure white background (255, 255, 255), with a near-white highlight (245, 245, 245)
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 6 && x <= 10 && y >= 6 && y <= 10) {
          // Near-white highlight
          data[idx] = 245;
          data[idx + 1] = 245;
          data[idx + 2] = 245;
          data[idx + 3] = 255;
        } else {
          // Pure white background
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1, // legacy explicit grid (bypasses detected-grid fix)
      bgRemovalMode: 'white',
      colorTolerance: 2 // 2% tolerance
    });

    // The near-white highlight (6, 6) must NOT be removed
    const highlightCell = res.grid[6][6];
    expect(highlightCell.isRemoved).toBe(false);
    expect(highlightCell.color).toBe('rgb(245,245,245)');

    // The pure white background at (0, 0) MUST be removed
    const bgCell = res.grid[0][0];
    expect(bgCell.isRemoved).toBe(true);
  });

  // Test 6: Mixel Detection
  it('Test 6 — Mixel Detection: raises mixel warning for corrupted non-uniform cells without silent averaging', () => {
    // 16x16 image with 8x8 cells, where cell (0, 0) is deliberately corrupted with 2 colors
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 8 && y < 8) {
          // Half red, half blue inside cell (0, 0)
          if (x < 4) {
            data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
          } else {
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 255; data[idx + 3] = 255;
          }
        } else {
          data[idx] = 0; data[idx + 1] = 255; data[idx + 2] = 0; data[idx + 3] = 255;
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 8
    });

    expect(res.mixelWarnings).toBeDefined();
    expect(res.mixelWarnings.length).toBeGreaterThan(0);
    expect(res.mixelWarnings[0].col).toBe(0);
    expect(res.mixelWarnings[0].row).toBe(0);
  });

  // Test 7: No Shading Artifacts
  it('Test 7 — No Shading Artifacts: ContinuousShading is NEVER invoked on Pathway B', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);

    const spy = vi.spyOn(ContinuousShadingModule, 'sampleContinuousShading');

    MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 4
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // Test 8: Zero-Color-Loss Gate
  it('Test 8 — Zero-Color-Loss Gate: Check 6 fails if an output color is not in source palette', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 4
    });

    // Corrupt one cell color manually to simulate an illegal color addition
    res.grid[0][0].sample.r = 123;
    res.grid[0][0].sample.g = 45;
    res.grid[0][0].sample.b = 67;

    const report = MosaicVerificationEngine.verify(res.grid, {
      pathway: 'pixel-art',
      sourcePalette: [[255, 255, 255]],
      detectedCellSize: 4
    });

    expect(report.checks.zeroColorLoss).toBe(false);
    expect(report.is100PercentClean).toBe(false);
    expect(report.issues.some(i => i.includes('Zero Color Loss violation'))).toBe(true);
  });

  // Test 9: InputClassifier Accuracy
  it('Test 9 — InputClassifier accurately detects pure pixel art vs photo', () => {
    // Pure pixel art sprite: 32x32, 2 flat colors, 0 noise, 16px cell size
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isWhite = Math.floor(x / 16) === Math.floor(y / 16);
        data[idx] = isWhite ? 255 : 0;
        data[idx + 1] = isWhite ? 255 : 0;
        data[idx + 2] = isWhite ? 255 : 0;
        data[idx + 3] = 255;
      }
    }

    const classification = InputClassifier.classify({ width, height, data });
    expect(classification.mode).toBe('pixel-art');
    expect(classification.confidence).toBeGreaterThan(0.7);
    expect(classification.detectedCellSize).toBe(16);
  });

  // Test 10: SvgExporter Parity on Pathway B
  it('Test 10 — True Vector SVG Parity: exports grouped rectilinear SVG with zero raster tags', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isRed = x < 8;
        data[idx] = isRed ? 255 : 0;
        data[idx + 1] = 0;
        data[idx + 2] = isRed ? 0 : 255;
        data[idx + 3] = 255;
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 8
    });

    const svg = MosaicEngine.exportSVG(res, { mode: 'grouped' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('<image'); // Absolute zero raster embedding
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  // Test 11: Black Background Removal on Pathway B
  it('Test 11 — Black Background Removal: removes outer black background while preserving sprite islands', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
          // Yellow sprite island (255, 215, 0)
          data[idx] = 255; data[idx + 1] = 215; data[idx + 2] = 0; data[idx + 3] = 255;
        } else {
          // Pure black background (0, 0, 0)
          data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1, // legacy explicit grid (bypasses detected-grid fix)
      bgRemovalMode: 'black'
    });

    // Perimeter black background cells must be removed
    expect(res.grid[0][0].isRemoved).toBe(true);
    expect(res.grid[0][15].isRemoved).toBe(true);
    expect(res.grid[15][0].isRemoved).toBe(true);
    expect(res.grid[15][15].isRemoved).toBe(true);

    // Yellow sprite island must be completely preserved
    expect(res.grid[6][6].isRemoved).toBe(false);
    expect(res.grid[7][7].isRemoved).toBe(false);
    expect(res.grid[7][7].color).toBe('rgb(255,215,0)');

    const removedCount = res.grid.flat().filter(c => c.isRemoved).length;
    expect(removedCount).toBe(240); // 256 - 16
  });

  // Test 12: Multi-Shade Dark Background Removal with Noise Tolerance
  it('Test 12 — Multi-Shade Dark Background: 10% tolerance removes noisy near-black compression swatches', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
          // Cyan star sprite (0, 255, 255)
          data[idx] = 0; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else {
          // Noisy dark background values (#010101, #020001, #000100, etc.)
          data[idx] = (x + y) % 4;
          data[idx + 1] = (x * 2 + y) % 3;
          data[idx + 2] = (y * 3) % 4;
          data[idx + 3] = 255;
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1, // legacy explicit grid (bypasses detected-grid fix)
      outsideBgRemovalColors: ['#000000'],
      colorTolerance: 10
    });

    // All noisy dark background cells must be cleanly removed
    expect(res.grid[0][0].isRemoved).toBe(true);
    expect(res.grid[15][15].isRemoved).toBe(true);
    const removedCount = res.grid.flat().filter(c => c.isRemoved).length;
    expect(removedCount).toBe(240);

    // Cyan star is 100% intact
    expect(res.grid[7][7].isRemoved).toBe(false);
    expect(res.grid[7][7].color).toBe('rgb(0,255,255)');
  });

  // Test 13: Inside Color Removal on Pathway B
  it('Test 13 — Inside Color Removal: removes targeted inner colors without breaking outer silhouette', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    // Background transparent
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = 0;
    }

    // 8x8 heart sprite at (4,4) with pink outer (255,105,180) and white core (255,255,255)
    for (let y = 4; y <= 11; y++) {
      for (let x = 4; x <= 11; x++) {
        const idx = (y * width + x) * 4;
        if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255; // white core
        } else {
          data[idx] = 255; data[idx + 1] = 105; data[idx + 2] = 180; data[idx + 3] = 255; // pink outer
        }
      }
    }

    const res = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 1,
      forceTileSize: 1, // legacy explicit grid (bypasses detected-grid fix)
      insideBgRemovalColors: ['#ffffff']
    });

    // Outer pink shell is preserved
    expect(res.grid[4][4].isRemoved).toBe(false);
    expect(res.grid[4][4].color).toBe('rgb(255,105,180)');

    // White core is removed
    expect(res.grid[7][7].isRemoved).toBe(true);
  });
});
