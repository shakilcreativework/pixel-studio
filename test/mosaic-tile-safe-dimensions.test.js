import { describe, it, expect } from 'vitest';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';

describe('Mosaic tile-safe document dimensions', () => {
  it('expands a document so a 32px final row and column are complete', () => {
    expect(MosaicEngine.getTileSafeDimensions(3840, 2160, 32, 0)).toEqual({
      width: 3840,
      height: 2176
    });
  });

  it('keeps already aligned 16px dimensions unchanged', () => {
    expect(MosaicEngine.getTileSafeDimensions(3840, 2160, 16, 0)).toEqual({
      width: 3840,
      height: 2160
    });
  });

  it('accounts for tile spacing when calculating the grid step', () => {
    expect(MosaicEngine.getTileSafeDimensions(100, 100, 32, 2)).toEqual({
      width: 102,
      height: 102
    });
  });

  it('fits only occupied design cells and keeps complete tile boundaries', () => {
    const grid = [
      [
        { x: 0, y: 0, width: 32, height: 32, occupied: false, isRemoved: true, sample: { a: 0 } },
        { x: 32, y: 0, width: 32, height: 32, occupied: true, isRemoved: false, sample: { a: 255 } }
      ],
      [
        { x: 0, y: 32, width: 32, height: 32, occupied: false, isRemoved: true, sample: { a: 0 } },
        { x: 32, y: 32, width: 32, height: 32, occupied: true, isRemoved: false, sample: { a: 255 } }
      ]
    ];

    expect(MosaicEngine.getDesignFit(grid, 64, 64, 32, 0)).toEqual({
      x: 32,
      y: 0,
      width: 32,
      height: 64,
      fitted: true
    });
  });

  it('falls back to tile-safe original bounds when no design cells remain', () => {
    const fit = MosaicEngine.getDesignFit([], 3840, 2160, 32, 0);
    expect(fit).toEqual({ x: 0, y: 0, width: 3840, height: 2176, fitted: false });
  });

  it('translates fitted cells without changing their size or color data', () => {
    const cell = {
      x: 32,
      y: 64,
      cx: 48,
      cy: 80,
      width: 32,
      height: 32,
      color: 'rgb(255,0,0)',
      sample: { r: 255, g: 0, b: 0, a: 255 }
    };
    MosaicEngine.applyDesignFit([[cell]], { x: 32, y: 64, width: 32, height: 32, fitted: true });
    expect(cell).toMatchObject({ x: 0, y: 0, cx: 16, cy: 16, width: 32, height: 32, color: 'rgb(255,0,0)' });
  });
});
