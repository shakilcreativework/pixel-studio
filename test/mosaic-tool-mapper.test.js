import { describe, it, expect } from 'vitest';
import { canvasPointToCell } from '../src/core/mosaic/MosaicToolMapper.js';

// Regression test for: "tools work perfectly only when 16px is selected —
// at 32px manual, click here but it works over there."
// Root cause: click→cell mapping divided by the stale UI preset
// (state.mosaic.tileSize, default 16) instead of the ACTUAL rendered cell
// size from the engine result. At 32px manual the engine draws 32px cells
// while the mapper divided by 16, doubling every cell index.
describe('MosaicToolMapper.canvasPointToCell', () => {
  it('maps clicks with the actual rendered size, not a stale 16px preset', () => {
    // Rendered cells are 32px (manual 32px selected). A click at x=70
    // lands in cell col 2. The old buggy mapping (/16) gave col 4.
    expect(canvasPointToCell(70, 70, 32)).toMatchObject({ c: 2, r: 2 });
    expect(canvasPointToCell(70, 70, 32).step).toBe(32);
  });

  it('still maps correctly at 16px (the size that always worked)', () => {
    expect(canvasPointToCell(70, 70, 16)).toMatchObject({ c: 4, r: 4 });
  });

  it('covers every manual size (24/32/48/64)', () => {
    // Click at the visual center of cell (col 3, row 2) for each size.
    for (const size of [24, 32, 48, 64]) {
      const x = 3 * size + size / 2;
      const y = 2 * size + size / 2;
      expect(canvasPointToCell(x, y, size)).toMatchObject({ c: 3, r: 2 });
    }
  });

  it('includes tile spacing in the step', () => {
    // 16px cells + 4px spacing => step 20; x=45 is inside cell col 2.
    expect(canvasPointToCell(45, 45, 16, 4)).toMatchObject({ c: 2, r: 2, step: 20 });
  });

  it('adds no crop origin offset (cells are already shifted onto the canvas)', () => {
    // Old code re-added fitOffsetX (the pre-crop origin), double-counting it
    // whenever the design was actually cropped. Mapping must be pure floor(x/step).
    expect(canvasPointToCell(0, 0, 32)).toMatchObject({ c: 0, r: 0 });
    expect(canvasPointToCell(31.9, 31.9, 32)).toMatchObject({ c: 0, r: 0 });
    expect(canvasPointToCell(32, 32, 32)).toMatchObject({ c: 1, r: 1 });
  });

  it('returns out-of-range indices for clicks outside the canvas so callers can guard', () => {
    expect(canvasPointToCell(-5, -5, 32)).toMatchObject({ c: -1, r: -1 });
  });

  it('falls back to 16 when no size is provided', () => {
    expect(canvasPointToCell(70, 70, 0)).toMatchObject({ c: 4, r: 4 });
    expect(canvasPointToCell(70, 70, undefined)).toMatchObject({ c: 4, r: 4 });
  });
});
