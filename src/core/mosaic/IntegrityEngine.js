/**
 * IntegrityEngine.js
 * Verification engine providing zero-modification guarantees.
 * Compares pre-removal and post-removal cell models and generates
 * machine-checkable integrity reports.
 */

import { CellDesignState, CellCornerState, CellBoundaryState } from './CellModel.js';

export class IntegrityEngine {
  /**
   * Run full integrity verification between the pre-removal snapshot and post-removal grid.
   * @param {Map<string, object>} preSnapshot - Map of cell.id -> frozen snapshot cell
   * @param {Array<Array<object>>} postGrid - 2D grid after background removal & quality passes
   * @param {object} options
   * @returns {object} Machine-checkable integrity report
   */
  static verifyIntegrity(preSnapshot, postGrid, options = {}) {
    const numRows = postGrid.length;
    const numCols = numRows > 0 ? postGrid[0].length : 0;

    let totalCells = numRows * numCols;
    let designCells = 0;
    let boundaryCells = 0;
    let cornerCells = 0;
    let backgroundCandidates = 0;
    let removedBackgroundCells = 0;
    let protectedCells = preSnapshot ? preSnapshot.size : 0;

    let modifiedProtectedCells = 0;
    let deletedProtectedCells = 0;
    let boundaryLosses = 0;
    let cornerLosses = 0;
    let geometryChanges = 0;
    let colorChanges = 0;
    const errors = [];

    // Track post grid cells
    const postMap = new Map();

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = postGrid[r][c];
        postMap.set(cell.id, cell);

        if (cell.isBgMatch) backgroundCandidates++;
        if (cell.isRemoved) removedBackgroundCells++;

        if (cell.designState === CellDesignState.DESIGN || cell.designState === CellDesignState.LOCKED_DESIGN) {
          designCells++;
        }
        if (cell.boundaryState !== CellBoundaryState.NONE || cell.designState === CellDesignState.LOCKED_BOUNDARY) {
          boundaryCells++;
        }
        if (cell.cornerState !== CellCornerState.NONE || cell.designState === CellDesignState.LOCKED_CORNER) {
          cornerCells++;
        }
      }
    }

    // Verify every protected cell from preSnapshot against postGrid
    if (preSnapshot) {
      for (const [id, preCell] of preSnapshot.entries()) {
        const postCell = postMap.get(id);

        if (!postCell) {
          deletedProtectedCells++;
          errors.push(`Protected cell ${id} was deleted from post-removal grid.`);
          continue;
        }

        // Rule 1: Protected cell must NEVER be removed
        if (postCell.isRemoved) {
          deletedProtectedCells++;
          errors.push(`Protected cell ${id} was marked as removed.`);
        }

        // Rule 2: Protected cell geometry must remain identical
        if (postCell.x !== preCell.x || postCell.y !== preCell.y ||
            postCell.width !== preCell.width || postCell.height !== preCell.height ||
            postCell.shape !== preCell.shape) {
          geometryChanges++;
          errors.push(`Protected cell ${id} geometry changed.`);
        }

        // Rule 3: Protected design cell color must not be corrupted
        const isBoundary = preCell.boundaryState !== CellBoundaryState.NONE || preCell.designState === CellDesignState.LOCKED_BOUNDARY;
        const allowBoundaryColorEnhancement = options.snapEdgeColors || options.restoreEdgeColors;

        if (!isBoundary || !allowBoundaryColorEnhancement) {
          if (postCell.color !== preCell.color ||
              postCell.sample.r !== preCell.sampleRgb[0] ||
              postCell.sample.g !== preCell.sampleRgb[1] ||
              postCell.sample.b !== preCell.sampleRgb[2]) {
            colorChanges++;
            errors.push(`Protected design cell ${id} color changed.`);
          }
        }

        // Rule 4: Boundary & Corner classification preservation
        if (preCell.boundaryState !== CellBoundaryState.NONE && postCell.isRemoved) {
          boundaryLosses++;
          errors.push(`Protected boundary cell ${id} was lost.`);
        }

        if (preCell.cornerState !== CellCornerState.NONE && postCell.isRemoved) {
          cornerLosses++;
          errors.push(`Protected corner cell ${id} was lost.`);
        }
      }
    }

    if (deletedProtectedCells > 0 || geometryChanges > 0 || colorChanges > 0) {
      modifiedProtectedCells = deletedProtectedCells + geometryChanges + colorChanges;
    }

    const passed = (
      modifiedProtectedCells === 0 &&
      deletedProtectedCells === 0 &&
      boundaryLosses === 0 &&
      cornerLosses === 0 &&
      geometryChanges === 0 &&
      colorChanges === 0
    );

    return {
      status: passed ? 'PASS' : 'FAIL',
      totalCells,
      designCells,
      boundaryCells,
      cornerCells,
      backgroundCandidates,
      removedBackgroundCells,
      protectedCells,
      modifiedProtectedCells,
      deletedProtectedCells,
      boundaryLosses,
      cornerLosses,
      colorChanges,
      geometryChanges,
      integrity: {
        passed,
        errors
      }
    };
  }
}
