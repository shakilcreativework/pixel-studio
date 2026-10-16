import { describe, it, expect } from 'vitest';
import { CleanEdgePurifier } from '../src/core/mosaic/CleanEdgePurifier.js';
import { MosaicEngine } from '../src/core/mosaic/MosaicEngine.js';
import { CellModel } from '../src/core/mosaic/CellModel.js';

const yellow = [255, 220, 0];
const muddy = [102, 88, 0];
const highlight = [255, 245, 140];

function fixture(background = [0, 0, 0], design = yellow, blend = muddy) {
  const size = 9, tileSize = 4, width = size * tileSize;
  const data = new Uint8ClampedArray(width * width * 4);
  const grid = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => {
    const inside = row >= 2 && row <= 6 && col >= 2 && col <= 6;
    const edge = inside && (row === 2 || row === 6 || col === 2 || col === 6);
    const color = !inside ? background : edge ? blend : row === 4 && col === 4 ? highlight : design;
    for (let y = row * tileSize; y < (row + 1) * tileSize; y++) {
      for (let x = col * tileSize; x < (col + 1) * tileSize; x++) data.set([...color, 255], (y * width + x) * 4);
    }
    return CellModel.createCell({ col, row, x: col * tileSize, y: row * tileSize,
      width: tileSize, height: tileSize, sample: { r: color[0], g: color[1], b: color[2], a: 255 },
      color: `rgb(${color.join(',')})` });
  }));
  return { grid, source: { width, height: width, data }, tileSize };
}

describe('Mosaic Clean Edge Purifier', () => {
  it('restores yellow boundary colors while preserving interior shading, background, geometry and source pixels', () => {
    const { grid, source } = fixture();
    const original = structuredClone(grid);
    const sourceBefore = source.data.slice();
    const report = CleanEdgePurifier.apply(grid, source);
    expect(report).toEqual({ correctedCells: 16, backgroundDetected: true });
    expect(grid[2][4].sample).toMatchObject({ r: 255, g: 220, b: 0 });
    expect(grid[4][4]).toEqual(original[4][4]);
    expect(grid[0]).toEqual(original[0]);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const { color: _color, sample, ...geometry } = grid[r][c];
      const { color: _oldColor, sample: oldSample, ...oldGeometry } = original[r][c];
      expect(geometry).toEqual(oldGeometry);
      expect(sample.a).toBe(oldSample.a);
    }
    expect(source.data).toEqual(sourceBefore);
  });

  it('restores gold on white without turning neutral black outlines into gold', () => {
    const { grid, source } = fixture([255, 255, 255], [255, 215, 0], [255, 235, 128]);
    grid[2][2].sample = { r: 20, g: 20, b: 20, a: 255 };
    grid[2][2].color = 'rgb(20,20,20)';
    CleanEdgePurifier.apply(grid, source);
    expect(grid[2][4].sample).toMatchObject({ r: 255, g: 215, b: 0 });
    expect(grid[2][2].color).toBe('rgb(20,20,20)');
  });

  it('respects painted, protected, restored, erased and translucent cells', () => {
    const { grid, source } = fixture();
    grid[2][2].protected = true;
    grid[2][6].isRemoved = true;
    grid[6][2].sample.a = 128;
    const before = structuredClone(grid);
    CleanEdgePurifier.apply(grid, source, {
      manualOverrides: { '3,2': { type: 'paint', color: 'rgb(102,88,0)' } },
      protectedIds: new Set(['4:2']), manualRestoreIds: new Set(['5:2'])
    });
    for (let c = 2; c <= 6; c++) expect(grid[2][c]).toEqual(before[2][c]);
    expect(grid[6][2]).toEqual(before[6][2]);
    expect(grid[6][4].color).toBe('rgb(255,220,0)');
  });

  it('does not alter internal color transitions or enclosed background holes', () => {
    const { grid, source } = fixture();
    grid[4][4].sample = { r: 0, g: 0, b: 0, a: 255 };
    grid[4][4].color = 'rgb(0,0,0)';
    grid[4][3].sample = { r: 102, g: 88, b: 0, a: 255 };
    grid[4][3].color = 'rgb(102,88,0)';
    const before = structuredClone(grid[4]);
    CleanEdgePurifier.apply(grid, source);
    expect(grid[4][3]).toEqual(before[3]);
    expect(grid[4][4]).toEqual(before[4]);
  });

  it('leaves images without a confident flat opaque background unchanged', () => {
    const { grid, source } = fixture();
    for (let i = 3; i < source.data.length; i += 4) source.data[i] = 0;
    const before = structuredClone(grid);
    expect(CleanEdgePurifier.apply(grid, source).backgroundDetected).toBe(false);
    expect(grid).toEqual(before);
  });

  it('is opt-in, exports restored colors, and resets by regenerating the unchanged source', () => {
    const { source, tileSize } = fixture();
    const options = { inputMode: 'photo', sourceArtType: 'normal', tileSize,
      samplingMethod: 'center', bgRemovalMode: 'none', trimEnabled: false, cleanupEnabled: false };
    const before = MosaicEngine.process(source, options);
    const enabled = MosaicEngine.process(source, { ...options, cleanEdgePurifier: true, cleanEdgeScope: 'outer' });
    expect(enabled.edgePurifierReport.correctedCells).toBe(16);
    expect(enabled.grid[2][4].color).toBe('rgb(255,220,0)');
    expect(MosaicEngine.exportSVG(enabled, { mode: 'editable' })).toContain('rgb(255,220,0)');
    const reset = MosaicEngine.process(source, { ...options, cleanEdgePurifier: false, cleanEdgeScope: 'off' });
    expect(reset.grid).toEqual(before.grid);
    expect(MosaicEngine.exportSVG(reset)).toBe(MosaicEngine.exportSVG(before));
  });

  it('restores Already Pixel Art edges using its original palette and resets without losing design colors', () => {
    const { source, tileSize } = fixture();
    const options = { inputMode: 'pixel-art', tileSize, forceTileSize: tileSize, cleanupEnabled: false };
    const before = MosaicEngine.process(source, options);
    const enabled = MosaicEngine.process(source, { ...options, cleanEdgePurifier: true, cleanEdgeScope: 'outer' });
    expect(enabled.edgePurifierReport.correctedCells).toBe(16);
    expect(enabled.grid[2][4].color).toBe('rgb(255,220,0)');
    expect(enabled.grid[4][4].color).toBe(before.grid[4][4].color);
    expect(enabled.verificationReport.checks.zeroColorLoss).toBe(true);
    expect(enabled.verificationReport.checks.gridAlignment).toBe(true);
    const palette = new Set(before.grid.flat().map(cell => cell.color));
    for (const cell of enabled.grid.flat()) expect(palette.has(cell.color)).toBe(true);
    const geometry = result => result.grid.flat().map(({ x, y, width, height, alpha, occupied, isRemoved }) =>
      ({ x, y, width, height, alpha, occupied, isRemoved }));
    expect(geometry(enabled)).toEqual(geometry(before));
    const reset = MosaicEngine.process(source, { ...options, cleanEdgePurifier: false, cleanEdgeScope: 'off' });
    expect(reset.grid).toEqual(before.grid);
    expect(MosaicEngine.exportSVG(enabled)).toContain('rgb(255,220,0)');
  });

  it('recognizes a nearly black background despite small RGB variations', () => {
    const { grid, source } = fixture();
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      if (x >= 8 && x < 28 && y >= 8 && y < 28) continue;
      const offset = (y * source.width + x) * 4;
      source.data[offset] = (x + y) % 9;
      source.data[offset + 1] = (2 * x + y) % 9;
      source.data[offset + 2] = (x + 3 * y) % 9;
    }
    const report = CleanEdgePurifier.apply(grid, source);
    expect(report.backgroundDetected).toBe(true);
    expect(report.correctedCells).toBeGreaterThan(0);
    expect(grid[2][4].color).toBe('rgb(255,220,0)');
  });

  it('protects established design shades that also occur on the boundary', () => {
    const { grid, source } = fixture();
    grid[4][4].sample = { r: 102, g: 88, b: 0, a: 255 };
    grid[4][4].color = 'rgb(102,88,0)';
    const before = structuredClone(grid);
    CleanEdgePurifier.apply(grid, source);
    expect(grid).toEqual(before);
  });

  it('does not alter already clean pixel-art colors', () => {
    const { source, tileSize } = fixture([0, 0, 0], yellow, yellow);
    const options = { inputMode: 'pixel-art', tileSize, cleanupEnabled: false };
    const before = MosaicEngine.process(source, options);
    const after = MosaicEngine.process(source, { ...options, cleanEdgePurifier: true, cleanEdgeScope: 'outer' });
    expect(after.edgePurifierReport.correctedCells).toBe(0);
    expect(after.grid).toEqual(before.grid);
  });

  it('preserves Already Pixel Art manual paint and erasure with purification enabled', () => {
    const { source, tileSize } = fixture();
    const result = MosaicEngine.process(source, { inputMode: 'pixel-art', tileSize, forceTileSize: tileSize,
      cleanEdgePurifier: true, cleanEdgeScope: 'outer', cleanupEnabled: false,
      manualOverrides: { '4,2': { type: 'paint', color: 'rgb(40,120,200)' }, '2,4': { type: 'erase' } } });
    expect(result.grid[2][4].color).toBe('rgb(40,120,200)');
    expect(result.grid[4][2].isRemoved).toBe(true);
    expect(result.grid[6][4].color).toBe('rgb(255,220,0)');
  });
});
