/**
 * MosaicBoundaryAnalyzer.js
 * Traces exact perimeter boundary contours for individual design objects and analyzes every edge cell-by-cell.
 * Conforms strictly to Mosaic_Edge_Intelligence_Context_Engineering_Working_Process.md (Sections 6, 7 & 8).
 */

import { BackgroundRemover } from './BackgroundRemover.js';
import { CellDesignState } from './CellModel.js';

const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class MosaicBoundaryAnalyzer {
  /**
   * Traces and analyzes the perimeter boundary contour of a design object.
   * @param {object} design - Design object returned by MosaicDesignDetector
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {object} options - Sensitivity and threshold options
   * @returns {object} { boundaryCells, edgeIssuesCount, issuesList }
   */
  static analyzeDesignBoundaries(design, grid, _options = {}) {
    if (!design || !design.cells || design.cells.length === 0) {
      return { boundaryCells: [], edgeIssuesCount: 0, issuesList: [] };
    }

    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    const designCellSet = new Set(design.cells.map(c => c.id));

    const boundaryCells = [];
    const issuesList = [];
    let edgeIssuesCount = 0;

    // 1. Identify outer perimeter boundary cells of this design object
    for (const cell of design.cells) {
      if (cell.isRemoved) continue;

      const r = cell.row;
      const c = cell.col;

      let isBoundaryCell = false;
      let touchesOutsideBackground = false;

      for (let i = 0; i < 4; i++) {
        const nr = r + D4[i][0];
        const nc = c + D4[i][1];
        if (nr < 0 || nr >= numRows || nc < 0 || nc >= numCols) {
          isBoundaryCell = true;
          touchesOutsideBackground = true;
        } else {
          const neighbor = grid[nr][nc];
          if (neighbor.isRemoved || !designCellSet.has(neighbor.id)) {
            isBoundaryCell = true;
            if (neighbor.isRemoved || neighbor.sample.a < 10) {
              touchesOutsideBackground = true;
            }
          }
        }
      }

      if (isBoundaryCell) {
        // 2. Classify boundary cell edge status
        let classification = 'KEEP';
        let isFringeNoise = false;

        if (cell.protected || cell.isProtected || cell.designState === CellDesignState.MANUAL_KEEP) {
          classification = 'PROTECTED';
        } else if (touchesOutsideBackground) {
          // Check if cell is fringe noise using BackgroundRemover classifier
          isFringeNoise = BackgroundRemover.isFringeOrEdgeNoise(cell, grid, numRows, numCols, r, c);
          if (isFringeNoise) {
            classification = 'REMOVE';
            edgeIssuesCount++;
            issuesList.push(`Uncleaned edge noise on ${design.id} boundary at (${c}, ${r})`);
          }
        }

        boundaryCells.push({
          cell,
          id: cell.id,
          col: c,
          row: r,
          classification,
          isFringeNoise,
          touchesOutsideBackground
        });
      }
    }

    return {
      designId: design.id,
      boundaryCells,
      totalBoundaryCount: boundaryCells.length,
      edgeIssuesCount,
      issuesList,
      isClean: (edgeIssuesCount === 0)
    };
  }
}
