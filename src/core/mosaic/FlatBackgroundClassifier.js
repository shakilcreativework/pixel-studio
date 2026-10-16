/**
 * FlatBackgroundClassifier.js
 * High-Precision Flat Background Classification for Pathway B (Pure Pixel Pipeline).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§5, Stage B3).
 *
 * Guaranteed Invariants:
 *   - Tight tolerance (0–5% default) prevents misclassifying distinct foreground highlights as background.
 *   - Exact or near-exact RGB comparison without OKLab distance bleed or blurred decision boundaries.
 *   - Auto-samples perimeter border swatches to detect solid background colors.
 */

export class FlatBackgroundClassifier {
  /**
   * Classify cells in grid as background, boundary, or design.
   * @param {Array<Array<CellModel>>} grid
   * @param {Object} options
   * @param {Array<Array<number>>} [options.targetRgbList]
   * @param {number} [options.tolerance=3] - Tight tolerance percentage (0 - 10)
   * @param {Object} [options.manualOverrides={}]
   * @returns {{ targetRgbList: Array<Array<number>>, backgroundCount: number, designCount: number }}
   */
  static classify(grid, options = {}) {
    if (!grid || grid.length === 0) {
      return { targetRgbList: [], backgroundCount: 0, designCount: 0 };
    }

    const numRows = grid.length;
    const numCols = grid[0].length;
    const tolerance = Math.min(100, Math.max(0, options.tolerance ?? 3));
    // Max Euclidean distance in RGB (0 - 441.67) corresponding to tolerance %
    const maxDist = tolerance === 0 ? 0 : (tolerance / 100) * 441.67;

    // Auto-detect background swatches from perimeter if not explicitly provided
    let targetRgbList = options.targetRgbList;
    if (!targetRgbList || targetRgbList.length === 0) {
      targetRgbList = this.detectPerimeterSwatches(grid);
    }

    const manualOverrides = options.manualOverrides || {};
    let backgroundCount = 0;
    let designCount = 0;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        const override = manualOverrides[cell.id] || manualOverrides[`${c},${r}`];

        if (override) {
          if (override.action === 'remove' || override.removed === true || override.type === 'erase') {
            cell.category = 'background';
            cell.designState = 'BACKGROUND_CONFIRMED';
            cell.isRemoved = true;
            backgroundCount++;
            continue;
          } else if (override.action === 'keep' || override.removed === false || override.type === 'paint') {
            cell.category = 'design';
            cell.designState = 'DESIGN';
            cell.isRemoved = false;
            designCount++;
            continue;
          }
        }

        // Alpha check
        if (cell.sample.a < 10) {
          cell.category = 'background';
          cell.designState = 'BACKGROUND_CONFIRMED';
          cell.isRemoved = true;
          backgroundCount++;
          continue;
        }

        let isMatch = false;
        for (const targetRgb of targetRgbList) {
          const dr = cell.sample.r - targetRgb[0];
          const dg = cell.sample.g - targetRgb[1];
          const db = cell.sample.b - targetRgb[2];

          if (maxDist === 0) {
            if (dr === 0 && dg === 0 && db === 0) {
              isMatch = true;
              break;
            }
          } else {
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            if (dist <= maxDist) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          cell.category = 'background';
          cell.designState = 'BACKGROUND_CANDIDATE';
          backgroundCount++;
        } else {
          cell.category = 'design';
          cell.designState = 'DESIGN';
          cell.isRemoved = false;
          designCount++;
        }
      }
    }

    return {
      targetRgbList,
      backgroundCount,
      designCount
    };
  }

  /**
   * Sample dominant perimeter swatch(es).
   * @param {Array<Array<CellModel>>} grid
   * @returns {Array<Array<number>>}
   */
  static detectPerimeterSwatches(grid) {
    const numRows = grid.length;
    const numCols = grid[0].length;
    const counts = new Map();

    const sample = (r, c) => {
      const cell = grid[r]?.[c];
      if (!cell || cell.sample.a < 10) return;
      const key = `${cell.sample.r},${cell.sample.g},${cell.sample.b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    };

    for (let c = 0; c < numCols; c++) {
      sample(0, c);
      sample(numRows - 1, c);
    }
    for (let r = 0; r < numRows; r++) {
      sample(r, 0);
      sample(r, numCols - 1);
    }

    let topCount = 0;
    let topRgb = [255, 255, 255];

    for (const [key, count] of counts.entries()) {
      if (count > topCount) {
        topCount = count;
        topRgb = key.split(',').map(Number);
      }
    }

    return [topRgb];
  }
}
