/**
 * CellModel.js
 * Authoritative Mosaic Cell Model with rich multi-state modeling,
 * frozen snapshots, and serialization for 100% design preservation.
 * Production Standard: Mosaic Engine PRD v3.0.0
 */

export const CellDesignState = {
  UNKNOWN: 'UNKNOWN',
  BACKGROUND_CANDIDATE: 'BACKGROUND_CANDIDATE',
  BACKGROUND_CONFIRMED: 'BACKGROUND_CONFIRMED',
  DESIGN: 'DESIGN',
  BOUNDARY: 'BOUNDARY',
  CORNER: 'CORNER',
  THIN_FEATURE: 'THIN_FEATURE',
  LOCKED_DESIGN: 'LOCKED_DESIGN',
  LOCKED_BOUNDARY: 'LOCKED_BOUNDARY',
  LOCKED_CORNER: 'LOCKED_CORNER',
  TRIM_CANDIDATE: 'TRIM_CANDIDATE',
  TRIM_REJECTED: 'TRIM_REJECTED',
  TRIMMED: 'TRIMMED',
  MANUAL_KEEP: 'MANUAL_KEEP',
  MANUAL_REMOVE: 'MANUAL_REMOVE'
};

export const CellBoundaryState = {
  NONE: 'NONE',
  HORIZONTAL: 'HORIZONTAL',
  VERTICAL: 'VERTICAL',
  STEPPED: 'STEPPED',
  THIN_LINE: 'THIN_LINE',
  PROJECTION: 'PROJECTION',
  RECESS: 'RECESS'
};

export const CellCornerState = {
  NONE: 'NONE',
  CONVEX: 'CONVEX',
  CONCAVE: 'CONCAVE'
};

export class CellModel {
  /**
   * Create a standardized Mosaic Cell object conforming to PRD v3.0 Section 4.
   */
  static createCell({
    col,
    row,
    x,
    y,
    width,
    height,
    cx = null,
    cy = null,
    shape = 'square',
    rotation = 0,
    color = '#000000',
    sample = { r: 0, g: 0, b: 0, a: 255 },
    occupied = true,
    sourceCoverage = 1.0,
    sourceAlpha = 255,
    staggerOffset = 0
  }) {
    const calculatedCx = cx !== null ? cx : x + width / 2;
    const calculatedCy = cy !== null ? cy : y + height / 2;

    return {
      id: `${col}:${row}`,
      col,
      row,
      x,
      y,
      width,
      height,
      size: width,
      cx: calculatedCx,
      cy: calculatedCy,
      rotation,
      shape,
      color,
      alpha: sample.a < 255 ? sample.a / 255 : 1,
      sample: { ...sample },
      occupied,
      sourceCoverage,
      sourceAlpha,
      staggerOffset,

      // State classifications
      designState: CellDesignState.UNKNOWN,
      boundaryState: CellBoundaryState.NONE,
      cornerState: CellCornerState.NONE,

      // Protection & Trim flags
      protected: false,
      trimLocked: false,
      isRemoved: false,
      isTrimmed: false,
      distToTarget: 0,
      isBgMatch: false,
      rejectedByTopology: false
    };
  }

  /**
   * Create an immutable snapshot of all protected cells before destructive operations.
   * @param {Array<Array<object>>} grid
   * @returns {Map<string, object>}
   */
  static createProtectedSnapshot(grid) {
    const snapshot = new Map();
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.protected) {
          snapshot.set(cell.id, {
            id: cell.id,
            col: cell.col,
            row: cell.row,
            x: cell.x,
            y: cell.y,
            cx: cell.cx,
            cy: cell.cy,
            width: cell.width,
            height: cell.height,
            rotation: cell.rotation,
            shape: cell.shape,
            color: cell.color,
            alpha: cell.alpha,
            sampleRgb: [cell.sample.r, cell.sample.g, cell.sample.b, cell.sample.a],
            occupied: cell.occupied,
            designState: cell.designState,
            boundaryState: cell.boundaryState,
            cornerState: cell.cornerState
          });
        }
      }
    }

    return snapshot;
  }
}
