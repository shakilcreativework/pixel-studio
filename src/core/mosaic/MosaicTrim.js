/**
 * MosaicTrim.js
 * Dedicated Illustrator-inspired Cell-Level Mosaic Trim Algorithm.
 * Conforms to Mosaic Engine PRD v3.0.0 (Sections 17-28, 44).
 *
 * Invariant Guarantee:
 * - Trims only non-design cells in the perimeter-connected outside region.
 * - 100% preserves design cells, boundary cells, convex/concave corners,
 *   thin 1-cell features, and interior enclosed design cavities.
 * - Works strictly at the discrete logical cell level without raster erosion.
 */

import { CellDesignState, CellBoundaryState, CellCornerState } from './CellModel.js';

export class MosaicTrim {
  /**
   * Execute cell-level Mosaic Trim on the grid.
   *
   * @param {Array<Array<object>>} grid - 2D matrix of CellModel cells
   * @param {object} options - Trim configuration parameters
   * @param {object} [context] - Context with manual overrides or pre-computed maps
   * @returns {object} { grid, trimmedCount, protectedCount, outsideCount }
   */
  static execute(grid, options = {}) {
    const {
      trimEnabled = false,
      preserveDesignCells = true,
      preserveBoundaryCells = true,
      preserveCornerCells = true,
      preserveThinFeatures = true,
      manualOverrides = {}
    } = options;

    if (!trimEnabled || !grid || grid.length === 0) {
      return { grid, trimmedCount: 0, protectedCount: 0, outsideCount: 0 };
    }

    const numRows = grid.length;
    const numCols = grid[0].length;

    // 1. Identify Design Ownership and Occupancy
    // Design cells are occupied cells that are not explicitly marked as background or removed
    const occupancy = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const thinFeatureCells = new Set();
    const manualKeep = new Set();
    const manualRemove = new Set();

    // Check manual overrides
    for (const [key, val] of Object.entries(manualOverrides)) {
      if (val === 'keep' || val?.action === 'keep') manualKeep.add(key);
      if (val === 'remove' || val?.action === 'remove') manualRemove.add(key);
    }

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        // If manually kept, definitely design
        if (manualKeep.has(cell.id)) {
          occupancy[r][c] = 1;
          cell.designState = CellDesignState.DESIGN;
          continue;
        }

        // If already removed or manually removed, not design
        if (cell.isRemoved || manualRemove.has(cell.id)) {
          occupancy[r][c] = 0;
          continue;
        }

        // Cell is design if it has valid opacity/coverage and is not confirmed background
        const isDesignCell = (
          cell.occupied &&
          cell.sourceAlpha > 15 &&
          cell.designState !== CellDesignState.BACKGROUND_CONFIRMED
        );

        if (isDesignCell) {
          occupancy[r][c] = 1;
          if (cell.designState === CellDesignState.UNKNOWN) {
            cell.designState = CellDesignState.DESIGN;
          }
        } else {
          occupancy[r][c] = 0;
        }
      }
    }

    // 2. Classify Boundaries, Corners, and Thin Features

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (occupancy[r][c] === 0) continue;

        // Check 4-way orthogonal neighbors
        const top = r > 0 ? occupancy[r - 1][c] : 0;
        const bottom = r < numRows - 1 ? occupancy[r + 1][c] : 0;
        const left = c > 0 ? occupancy[r][c - 1] : 0;
        const right = c < numCols - 1 ? occupancy[r][c + 1] : 0;

        const orthoSum = top + bottom + left + right;

        // Thin 1-cell feature detection (lines & projections)
        const isHorizThin = (top === 0 && bottom === 0);
        const isVertThin = (left === 0 && right === 0);
        const isIsolated = (orthoSum <= 1);

        if (isHorizThin || isVertThin || isIsolated) {
          thinFeatureCells.add(cell.id);
          cell.designState = CellDesignState.THIN_FEATURE;
          cell.boundaryState = CellBoundaryState.THIN_LINE;
        }

        // Boundary detection
        if (orthoSum < 4) {
          if (cell.boundaryState === CellBoundaryState.NONE) {
            if (top === 0 || bottom === 0) {
              cell.boundaryState = CellBoundaryState.HORIZONTAL;
            } else if (left === 0 || right === 0) {
              cell.boundaryState = CellBoundaryState.VERTICAL;
            } else {
              cell.boundaryState = CellBoundaryState.STEPPED;
            }
          }
        }

        // Corner detection (Convex & Concave)
        const topLeft = (r > 0 && c > 0) ? occupancy[r - 1][c - 1] : 0;
        const topRight = (r > 0 && c < numCols - 1) ? occupancy[r - 1][c + 1] : 0;
        const bottomLeft = (r < numRows - 1 && c > 0) ? occupancy[r + 1][c - 1] : 0;
        const bottomRight = (r < numRows - 1 && c < numCols - 1) ? occupancy[r + 1][c + 1] : 0;

        // Convex corner: Two adjacent orthogonal neighbors are 0
        const isConvex = (
          (top === 0 && left === 0) ||
          (top === 0 && right === 0) ||
          (bottom === 0 && left === 0) ||
          (bottom === 0 && right === 0)
        );

        // Concave notch: Orthogonal neighbors present, but diagonal is 0
        const isConcave = (
          (top === 1 && left === 1 && topLeft === 0) ||
          (top === 1 && right === 1 && topRight === 0) ||
          (bottom === 1 && left === 1 && bottomLeft === 0) ||
          (bottom === 1 && right === 1 && bottomRight === 0)
        );

        if (isConvex) {
          cell.cornerState = CellCornerState.CONVEX;
          if (cell.designState !== CellDesignState.THIN_FEATURE) {
            cell.designState = CellDesignState.CORNER;
          }
        } else if (isConcave) {
          cell.cornerState = CellCornerState.CONCAVE;
          if (cell.designState !== CellDesignState.THIN_FEATURE) {
            cell.designState = CellDesignState.CORNER;
          }
        }

        // Lock protection flags
        if (preserveDesignCells && (cell.designState === CellDesignState.DESIGN || cell.designState === CellDesignState.CORNER || cell.designState === CellDesignState.THIN_FEATURE)) {
          cell.protected = true;
          cell.trimLocked = true;
        }
        if (preserveBoundaryCells && cell.boundaryState !== CellBoundaryState.NONE) {
          cell.protected = true;
          cell.trimLocked = true;
        }
        if (preserveCornerCells && cell.cornerState !== CellCornerState.NONE) {
          cell.protected = true;
          cell.trimLocked = true;
        }
        if (preserveThinFeatures && thinFeatureCells.has(cell.id)) {
          cell.protected = true;
          cell.trimLocked = true;
        }
      }
    }

    // 3. Determine Outside Region via Perimeter-Seeded Flood Fill
    // Non-design cells connected to canvas borders are "Outside"
    // Non-design cells enclosed inside design (cavities/holes) are preserved
    const outsideRegion = new Set();
    const visited = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const queue = [];

    // Seed from perimeter edges
    for (let c = 0; c < numCols; c++) {
      if (occupancy[0][c] === 0) queue.push([0, c]);
      if (occupancy[numRows - 1][c] === 0) queue.push([numRows - 1, c]);
    }
    for (let r = 0; r < numRows; r++) {
      if (occupancy[r][0] === 0) queue.push([r, 0]);
      if (occupancy[r][numCols - 1] === 0) queue.push([r, numCols - 1]);
    }

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      if (r < 0 || r >= numRows || c < 0 || c >= numCols) continue;
      if (visited[r][c] === 1) continue;

      visited[r][c] = 1;

      // If hit design cell, stop flood at design silhouette
      if (occupancy[r][c] === 1) continue;

      const cell = grid[r][c];
      outsideRegion.add(cell.id);

      // Expand 4-directionally
      queue.push([r - 1, c]);
      queue.push([r + 1, c]);
      queue.push([r, c - 1]);
      queue.push([r, c + 1]);
    }

    // 4. Evaluate Trim Decision for Every Cell
    let trimmedCount = 0;
    let protectedCount = 0;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        if (cell.protected || cell.trimLocked) {
          protectedCount++;
        }

        const isOutside = outsideRegion.has(cell.id);

        if (!isOutside) {
          // Internal cell or enclosed cavity -> Never trimmed
          if (!cell.protected) {
            cell.designState = CellDesignState.TRIM_REJECTED;
          }
          continue;
        }

        // Decision logic conforming to Section 22 contract
        const shouldTrim = this.shouldTrimCell(cell, {
          manualKeep,
          preserveDesignCells,
          preserveBoundaryCells,
          preserveCornerCells,
          preserveThinFeatures,
          thinFeatureCells,
          outsideRegion
        });

        if (shouldTrim) {
          cell.isRemoved = true;
          cell.isTrimmed = true;
          cell.alpha = 0;
          cell.designState = CellDesignState.TRIMMED;
          trimmedCount++;
        } else {
          cell.designState = CellDesignState.TRIM_REJECTED;
        }
      }
    }

    return {
      grid,
      trimmedCount,
      protectedCount,
      outsideCount: outsideRegion.size
    };
  }

  /**
   * Deterministic decision contract for trimming a single cell.
   */
  static shouldTrimCell(cell, context) {
    if (context.manualKeep.has(cell.id)) return false;
    if (context.preserveDesignCells && (cell.designState === CellDesignState.DESIGN || cell.designState === CellDesignState.LOCKED_DESIGN)) return false;
    if (context.preserveBoundaryCells && cell.boundaryState !== CellBoundaryState.NONE) return false;
    if (context.preserveCornerCells && cell.cornerState !== CellCornerState.NONE) return false;
    if (context.preserveThinFeatures && context.thinFeatureCells.has(cell.id)) return false;
    if (!context.outsideRegion.has(cell.id)) return false;
    if (cell.protected || cell.trimLocked) return false;

    return true;
  }
}
