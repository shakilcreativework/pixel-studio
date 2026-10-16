/**
 * TopologyGuard.js
 * Geometric analysis and topology preservation engine.
 * Detects outside convex corners, inside concave notches, stepped/staircase transitions,
 * and 1-cell-wide thin features, locking them against accidental background removal.
 */

import { CellDesignState, CellBoundaryState, CellCornerState } from './CellModel.js';



export class TopologyGuard {
  /**
   * Analyze the grid and mark all structural design geometry as protected.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {object} options
   */
  static protectDesignTopology(grid, options = {}) {
    const {
      preserveDesign = true,
      preserveBoundary = true,
      preserveCorners = true
    } = options;

    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    // Helper to check if neighbor cell is a design cell
    const isDesign = (r, c) => {
      if (r < 0 || r >= numRows || c < 0 || c >= numCols) return false;
      const cell = grid[r][c];
      return cell.designState === CellDesignState.DESIGN ||
             cell.designState === CellDesignState.LOCKED_DESIGN ||
             cell.designState === CellDesignState.LOCKED_BOUNDARY ||
             cell.designState === CellDesignState.LOCKED_CORNER ||
             cell.designState === CellDesignState.MANUAL_KEEP;
    };

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (!isDesign(r, c)) continue;

        if (preserveDesign) {
          cell.protected = true;
          cell.designState = CellDesignState.LOCKED_DESIGN;
        }

        // Neighborhood analysis
        const up = isDesign(r - 1, c);
        const down = isDesign(r + 1, c);
        const left = isDesign(r, c - 1);
        const right = isDesign(r, c + 1);

        const upLeft = isDesign(r - 1, c - 1);
        const upRight = isDesign(r - 1, c + 1);
        const downLeft = isDesign(r + 1, c - 1);
        const downRight = isDesign(r + 1, c + 1);

        const d4Count = (up ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0);

        // 1. Boundary Detection on Design Perimeter
        if (preserveBoundary && d4Count < 4) {
          cell.protected = true;
          cell.designState = CellDesignState.LOCKED_BOUNDARY;

          if ((!up || !down) && (left && right)) {
            cell.boundaryState = CellBoundaryState.HORIZONTAL;
          } else if ((!left || !right) && (up && down)) {
            cell.boundaryState = CellBoundaryState.VERTICAL;
          } else if (d4Count <= 2) {
            cell.boundaryState = CellBoundaryState.STEPPED;
          }
        }

        // 2. 1-Cell-Wide Thin Features & Lines
        if (preserveDesign) {
          // Thin vertical line (empty left and right)
          if (!left && !right && (up || down)) {
            cell.protected = true;
            cell.designState = CellDesignState.LOCKED_DESIGN;
            cell.boundaryState = CellBoundaryState.THIN_LINE;
          }
          // Thin horizontal line (empty up and down)
          if (!up && !down && (left || right)) {
            cell.protected = true;
            cell.designState = CellDesignState.LOCKED_DESIGN;
            cell.boundaryState = CellBoundaryState.THIN_LINE;
          }
          // Single isolated highlight cell
          if (d4Count === 0) {
            cell.protected = true;
            cell.designState = CellDesignState.LOCKED_DESIGN;
          }
        }

        // 3. Corner Detection (Convex & Concave)
        if (preserveCorners) {
          // Convex / Outside 90° Corners (e.g. top-left corner: empty up and left)
          const isConvexTopLeft = !up && !left && (down || right);
          const isConvexTopRight = !up && !right && (down || left);
          const isConvexBottomLeft = !down && !left && (up || right);
          const isConvexBottomRight = !down && !right && (up || left);

          if (isConvexTopLeft || isConvexTopRight || isConvexBottomLeft || isConvexBottomRight) {
            cell.protected = true;
            cell.cornerState = CellCornerState.CONVEX;
            cell.designState = CellDesignState.LOCKED_CORNER;
          }

          // Concave / Inside Corner Notches (e.g. inside corner of L or cross arm)
          const isConcaveTopLeft = up && left && !upLeft;
          const isConcaveTopRight = up && right && !upRight;
          const isConcaveBottomLeft = down && left && !downLeft;
          const isConcaveBottomRight = down && right && !downRight;

          if (isConcaveTopLeft || isConcaveTopRight || isConcaveBottomLeft || isConcaveBottomRight) {
            cell.protected = true;
            cell.cornerState = CellCornerState.CONCAVE;
            cell.designState = CellDesignState.LOCKED_CORNER;
          }
        }
      }
    }
  }

  /**
   * Evaluates whether removing a candidate cell would damage the design topology.
   * Prevents removing candidate cells that bridge or protect design boundaries.
   * @param {number} r
   * @param {number} c
   * @param {Array<Array<object>>} grid
   * @returns {boolean} - true if removing would damage topology (so removal MUST be rejected)
   */
  static wouldChangeDesignTopology(r, c, grid) {
    const cell = grid[r][c];

    // Protected cells must NEVER be removed
    if (cell.protected) {
      return true;
    }

    if (cell.designState === CellDesignState.LOCKED_DESIGN ||
        cell.designState === CellDesignState.LOCKED_BOUNDARY ||
        cell.designState === CellDesignState.LOCKED_CORNER ||
        cell.designState === CellDesignState.MANUAL_KEEP) {
      return true;
    }

    return false;
  }
}
