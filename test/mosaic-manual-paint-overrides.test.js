import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('MosaicEngine Manual Paint Overrides Persistence', () => {
  it('restores painted cell colors and samples when re-running process with manualOverrides', () => {
    // 10x10 mock image data (all black)
    const srcData = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < srcData.length; i += 4) {
      srcData[i] = 0;
      srcData[i + 1] = 0;
      srcData[i + 2] = 0;
      srcData[i + 3] = 255;
    }

    const img = { width: 10, height: 10, data: srcData };
    const options = {
      tileSize: 5,
      manualOverrides: {
        '0,0': { type: 'paint', color: 'rgb(255,0,0)', action: 'keep', removed: false },
        '1,0': { type: 'erase', action: 'remove', removed: true }
      }
    };

    const result = MosaicEngine.process(img, options);
    const grid = result.grid;

    // Cell at (0,0) must have restored painted red color and sample
    const paintedCell = grid[0][0];
    expect(paintedCell.isRemoved).toBe(false);
    expect(paintedCell.occupied).toBe(true);
    expect(paintedCell.color).toBe('rgb(255,0,0)');
    expect(paintedCell.sample).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });

    // Cell at (0,1) [col 1, row 0] must be removed / erased
    const erasedCell = grid[0][1];
    expect(erasedCell.isRemoved).toBe(true);
    expect(erasedCell.occupied).toBe(false);
  });
});
