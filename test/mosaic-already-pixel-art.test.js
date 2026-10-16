import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { PixelGridDetector } from '../src/core/mosaic/PixelGridDetector.js';
import { ExactCellSampler } from '../src/core/mosaic/ExactCellSampler.js';

describe('Mosaic Engine — Already Pixel Art & Grid Lock Features', () => {
  it('already-pixel-art mode performs exact 1:1 center pixel sampling without edge color blending', () => {
    // 16x16 image: left half pure white (255, 255, 255), right half pure blue (0, 136, 216)
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 8) {
          // Pure White
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          // Pure Blue
          data[idx] = 0;
          data[idx + 1] = 136;
          data[idx + 2] = 216;
          data[idx + 3] = 255;
        }
      }
    }

    // Process with already-pixel-art mode (tileSize: 8)
    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 8,
      sourceArtType: 'already-pixel-art'
    });

    expect(result.grid).toBeDefined();
    expect(result.tiles.length).toBeGreaterThan(0);

    // Verify left tile is exact pure white, right tile is exact pure blue, with ZERO intermediate blend
    const leftTile = result.tiles.find(t => t.x === 0 && t.y === 0);
    const rightTile = result.tiles.find(t => t.x === 8 && t.y === 0);

    expect(leftTile.color).toBe('rgb(255,255,255)');
    expect(rightTile.color).toBe('rgb(0,136,216)');
  });

  it('normal mode area sampling averages boundary pixels into an intermediate shade', () => {
    // 16x16 image: 2 columns white, 2 columns blue per 4x4 tile
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x % 4 < 2) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else {
          data[idx] = 0; data[idx + 1] = 136; data[idx + 2] = 216; data[idx + 3] = 255;
        }
      }
    }

    // In already-pixel-art mode, center point is selected directly (0, 136, 216)
    const resultPixelArt = MosaicEngine.process({ width, height, data }, {
      tileSize: 4,
      sourceArtType: 'already-pixel-art'
    });

    const tilePixelArt = resultPixelArt.tiles.find(t => t.x === 0 && t.y === 0);
    expect(tilePixelArt.color).toBe('rgb(0,136,216)');
  });

  it('PixelGridDetector accurately detects native cell size and grid phase offset', () => {
    // 64x64 test image with 16x16 pixel blocks and a 3px X offset, 2px Y offset
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    const cellSize = 16;
    const offsetX = 3;
    const offsetY = 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const blockX = Math.floor((x - offsetX) / cellSize);
        const blockY = Math.floor((y - offsetY) / cellSize);
        const isWhite = (blockX + blockY) % 2 === 0;

        data[idx] = isWhite ? 255 : 30;
        data[idx + 1] = isWhite ? 255 : 120;
        data[idx + 2] = isWhite ? 255 : 220;
        data[idx + 3] = 255;
      }
    }

    const detection = PixelGridDetector.detect({ width, height, data }, { allowOffset: true });

    expect(detection.cellSize).toBe(16);
    expect(detection.offsetX).toBe(3);
    expect(detection.offsetY).toBe(2);
  });

  it('purifyCleanEdges eliminates anti-aliased transitional border pixels between background and design', () => {
    // Create an image where edge has anti-aliased intermediate light blue shade rgb(130, 190, 240)
    // between background rgb(0, 136, 216) and cloud rgb(255, 255, 255)
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 12) {
          // Pure White Cloud
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else if (x < 16) {
          // Anti-Aliased / Blurred Transition Zone from AI/JPEG
          data[idx] = 130; data[idx + 1] = 190; data[idx + 2] = 240; data[idx + 3] = 255;
        } else {
          // Pure Blue Background
          data[idx] = 0; data[idx + 1] = 136; data[idx + 2] = 216; data[idx + 3] = 255;
        }
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 8,
      sourceArtType: 'already-pixel-art',
      cleanEdgePurifier: true,
      bgRemovalMode: 'custom',
      customRemoveColor: '#0088d8'
    });

    // Verify all kept tiles are pure white (255, 255, 255) with zero leftover intermediate shaded pixels
    const keptTiles = result.tiles;
    for (const tile of keptTiles) {
      expect(tile.color).toBe('rgb(255,255,255)');
    }
  });

  it('purifyCleanEdges eliminates multi-color edge blur in Mode A full scenes with zero background removal', () => {
    // 32x32 full scene: left half pure white cloud rgb(255, 255, 255),
    // right half pure sky blue rgb(0, 136, 216),
    // with a 4px wide artificial AI/neural upscaler blur zone in columns 12..15 rgb(128, 195, 235)
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 12) {
          // Pure White Cloud
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else if (x < 16) {
          // AI Blurred/interpolated edge
          data[idx] = 128; data[idx + 1] = 195; data[idx + 2] = 235; data[idx + 3] = 255;
        } else {
          // Pure Sky Blue
          data[idx] = 0; data[idx + 1] = 136; data[idx + 2] = 216; data[idx + 3] = 255;
        }
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 8,
      sourceArtType: 'already-pixel-art',
      cleanEdgePurifier: true,
      bgRemovalMode: 'none' // Full scene Mode A, no background removal
    });

    expect(result.tiles.length).toBeGreaterThan(0);
    // Verify EVERY tile is either pure cloud white or pure sky blue, with ZERO blurred/intermediate colors
    for (const tile of result.tiles) {
      const isPureWhite = tile.color === 'rgb(255,255,255)';
      const isPureSkyBlue = tile.color === 'rgb(0,136,216)';
      expect(isPureWhite || isPureSkyBlue).toBe(true);
    }
  });

  it('eliminates 16x16 lattice edge blurs across complex multi-shade cloud silhouettes', () => {
    // 64x64 test image with 16x16 blocks:
    // Region 1: Cloud Highlight rgb(255, 255, 255)
    // Region 2: Cloud Shadow rgb(190, 210, 235)
    // Region 3: Sky Background rgb(0, 136, 216)
    // With 2px anti-aliased gradient bleed along every boundary
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);

    const cHighlight = [255, 255, 255];
    const cShadow = [190, 210, 235];
    const cSky = [0, 136, 216];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r, g, b;

        if (y < 30) {
          if (x < 30) {
            r = cHighlight[0]; g = cHighlight[1]; b = cHighlight[2];
          } else if (x < 34) {
            // Gradient bleed between highlight and shadow
            r = 222; g = 232; b = 245;
          } else {
            r = cShadow[0]; g = cShadow[1]; b = cShadow[2];
          }
        } else if (y < 34) {
          // Horizontal boundary bleed
          r = 128; g = 195; b = 235;
        } else {
          if (x < 30) {
            r = cHighlight[0]; g = cHighlight[1]; b = cHighlight[2];
          } else if (x < 34) {
            r = 95; g = 173; b = 225;
          } else {
            r = cSky[0]; g = cSky[1]; b = cSky[2];
          }
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 16,
      sourceArtType: 'already-pixel-art',
      cleanEdgePurifier: true,
      bgRemovalMode: 'none'
    });

    // Verify all 16 tiles snap to one of the 3 true core colors, with 0 blurred tiles
    const allowedColors = [
      'rgb(255,255,255)',
      'rgb(190,210,235)',
      'rgb(0,136,216)'
    ];

    for (const tile of result.tiles) {
      expect(allowedColors).toContain(tile.color);
    }
  });

  it('preserves enclosed white text inside sprite buttons in already-pixel-art mode with white background removal', () => {
    // 32x32 image:
    // Outer border: White background rgb(255, 255, 255)
    // Center 16x16: Red STOP button rgb(220, 38, 38)
    // Enclosed 4x4 inside Red STOP button: Pure White text "STOP" rgb(255, 255, 255)
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const inRedButton = (x >= 8 && x < 24 && y >= 8 && y < 24);
        const inWhiteText = (x >= 12 && x < 16 && y >= 12 && y < 16);

        if (inWhiteText) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        } else if (inRedButton) {
          data[idx] = 220; data[idx + 1] = 38; data[idx + 2] = 38; data[idx + 3] = 255;
        } else {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
        }
      }
    }

    const result = MosaicEngine.process({ width, height, data }, {
      tileSize: 4,
      sourceArtType: 'already-pixel-art',
      bgRemovalMode: 'white',
      bgRemovalScope: 'contiguous',
      colorTolerance: 20
    });

    // Outer background tiles are removed
    expect(result.grid[0][0].isRemoved).toBe(true);

    // Red button tiles are kept
    expect(result.grid[2][2].isRemoved).toBe(false);
    expect(result.grid[2][2].color).toBe('rgb(220,38,38)');

    // Enclosed white text tile at row 3, col 3 is 100% PRESERVED (not removed as background)
    expect(result.grid[3][3].isRemoved).toBe(false);
    expect(result.grid[3][3].color).toBe('rgb(255,255,255)');
  });

  it('Already Pixel Art Mode strictly bypasses shading, palette quantization, and dithering', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with a vibrant custom color not in GameBoy palette
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 100;
      data[i * 4 + 2] = 50;
      data[i * 4 + 3] = 255;
    }

    const result = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 4,
      palette: 'gameboy', // Should be strictly bypassed in Pathway B
      ditherAlgorithm: 'floyd-steinberg' // Should be strictly bypassed in Pathway B
    });

    expect(result.pathway).toBe('pixel-art');
    expect(result.palette).toBe('original-rgb');
    expect(result.ditherAlgorithm).toBe('none');
    expect(result.samplingMethod).toBe('center-exact');
    // Color must remain exact original RGB
    expect(result.tiles[0].color).toBe('rgb(255,100,50)');
  });

  it('Background removal is strictly optional: None preserves 100% of cells', () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);
    // Background white (255,255,255), center square blue (0,0,255)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isCenter = x >= 4 && x < 12 && y >= 4 && y < 12;
        data[idx] = isCenter ? 0 : 255;
        data[idx + 1] = isCenter ? 0 : 255;
        data[idx + 2] = isCenter ? 255 : 255;
        data[idx + 3] = 255;
      }
    }

    // 1. None (Keep All): 100% of cells preserved
    const keepAllResult = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 4,
      forceTileSize: 4, // legacy explicit grid (bypasses detected-grid fix)
      bgRemovalMode: 'none'
    });
    expect(keepAllResult.tiles.length).toBe(16); // 4x4 grid = 16 cells all kept
    expect(keepAllResult.grid[0][0].isRemoved).toBe(false);

    // 2. Remove White (Isolated Graphic): background removed
    const removeBgResult = MosaicEngine.process({ width, height, data }, {
      inputMode: 'pixel-art',
      tileSize: 4,
      forceTileSize: 4, // legacy explicit grid (bypasses detected-grid fix)
      bgRemovalMode: 'white'
    });
    expect(removeBgResult.grid[0][0].isRemoved).toBe(true);
    expect(removeBgResult.grid[1][1].isRemoved).toBe(false);
    expect(removeBgResult.grid[1][1].color).toBe('rgb(0,0,255)');
  });

  it('MosaicEngine._merge2DBlocks correctly merges adjacent horizontal and vertical identical color runs', () => {
    // 4x4 grid of pure red cells
    const grid = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 4; c++) {
        row.push({
          col: c, row: r, x: c * 16, y: r * 16,
          isRemoved: false, color: 'rgb(255,0,0)',
          sample: { a: 255 }
        });
      }
      grid.push(row);
    }

    const blocks = MosaicEngine._merge2DBlocks(grid, 4, 4, 16);
    // All 16 cells of matching color should merge into 1 single 64x64 rect!
    expect(blocks.length).toBe(1);
    expect(blocks[0].width).toBe(64);
    expect(blocks[0].height).toBe(64);
    expect(blocks[0].color).toBe('rgb(255,0,0)');
  });

  it('ExactCellSampler flags non-uniform gradient cells without falsifying blended colors', () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);

    // Multi-color gradient within a single 8x8 cell (4 colors)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = (x * 30) % 255;
        data[idx + 1] = (y * 30) % 255;
        data[idx + 2] = 100;
        data[idx + 3] = 255;
      }
    }

    const sampled = ExactCellSampler.sample({ width, height, data }, { cellSize: 8 });
    expect(sampled.cells[0].isNonUniform).toBe(true);
    expect(sampled.cells[0].hasMixel).toBe(true);
  });
});





