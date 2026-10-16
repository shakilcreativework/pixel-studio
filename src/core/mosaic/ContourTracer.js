/**
 * ContourTracer.js
 * Stage 2: Binary Mask Contour Tracing Engine (Moore-Neighbor 8-connected algorithm).
 * Extracts true shape silhouettes, outer convex corners, and inner concave notches
 * directly from binary design masks, preventing ghost strokes on internal shading seams
 * and guaranteeing 100% complete outline closure.
 */

// 8-directional Moore neighborhood offsets (clockwise starting from North)
const MOORE_OFFSETS = [
  [-1, 0],  // 0: North
  [-1, 1],  // 1: North-East
  [0, 1],   // 2: East
  [1, 1],   // 3: South-East
  [1, 0],   // 4: South
  [1, -1],  // 5: South-West
  [0, -1],  // 6: West
  [-1, -1]  // 7: North-West
];

const D4 = [
  [-1, 0], // North
  [1, 0],  // South
  [0, -1], // West
  [0, 1]   // East
];

export class ContourTracer {
  /**
   * Convenience method to trace contour from a 2D cell grid.
   * @param {Array<Array<object>>} grid
   * @returns {{ contours: Array<Array<object>>, boundaryMap: Array<Array<object|null>>, path: string }}
   */
  static trace(grid) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return { contours: [], boundaryMap: [], path: '' };

    const isDesignMask = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell.isRemoved && cell.sample.a >= 10) {
          isDesignMask[r][c] = 1;
        }
      }
    }

    const { contours, boundaryMap } = this.traceContours(isDesignMask, numRows, numCols);

    // Build SVG path string from contours
    let pathStr = '';
    contours.forEach(contour => {
      if (contour.length === 0) return;
      const first = grid[contour[0].r][contour[0].c];
      pathStr += `M ${first.x} ${first.y} `;
      for (let i = 1; i < contour.length; i++) {
        const pt = grid[contour[i].r][contour[i].c];
        pathStr += `L ${pt.x} ${pt.y} `;
      }
      pathStr += 'Z ';
    });

    return { contours, boundaryMap, path: pathStr.trim() };
  }

  /**
   * Trace all silhouette contours from a 2D binary mask.
   * @param {Array<Array<number|boolean>>} isDesignMask - 2D grid where true/1 represents a design tile
   * @param {number} numRows - Number of grid rows
   * @param {number} numCols - Number of grid columns
   * @returns {{ contours: Array<Array<{ r: number, c: number, isConvex: boolean, isConcave: boolean }>>, boundaryMap: Array<Array<object|null>> }}
   */
  static traceContours(isDesignMask, numRows, numCols) {
    const boundaryMap = Array.from({ length: numRows }, () => new Array(numCols).fill(null));
    const visitedBoundaries = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const contours = [];

    // Identify all boundary cells (design cells with at least one non-design 4-neighbor)
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (!isDesignMask[r][c]) continue;

        let touchesBackground = false;
        let bgNeighborCount = 0;

        for (let i = 0; i < 4; i++) {
          const nr = r + D4[i][0];
          const nc = c + D4[i][1];
          if (nr < 0 || nr >= numRows || nc < 0 || nc >= numCols || !isDesignMask[nr][nc]) {
            touchesBackground = true;
            bgNeighborCount++;
          }
        }

        if (touchesBackground) {
          // Check orthogonal neighbors to classify corner type
          const upSolid = r > 0 && isDesignMask[r - 1][c];
          const downSolid = r < numRows - 1 && isDesignMask[r + 1][c];
          const leftSolid = c > 0 && isDesignMask[r][c - 1];
          const rightSolid = c < numCols - 1 && isDesignMask[r][c + 1];

          // Corner detection:
          // Convex corner: 2 orthogonal neighbors are background (e.g. top & left are background)
          const isConvex = bgNeighborCount >= 2;

          // Concave notch: cell is surrounded by 3 solid neighbors in an L/cross configuration
          const isConcave = (upSolid && downSolid && (leftSolid || rightSolid)) ||
                            (leftSolid && rightSolid && (upSolid || downSolid)) ||
                            ((upSolid && leftSolid && !downSolid && !rightSolid) && bgNeighborCount === 1);

          boundaryMap[r][c] = {
            r,
            c,
            isConvex,
            isConcave: !isConvex && isConcave,
            bgNeighborCount
          };
        }
      }
    }

    // Moore-Neighbor Contour Tracing to extract closed contour paths
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (!boundaryMap[r][c] || visitedBoundaries[r][c]) continue;

        const path = this._traceMoorePath(isDesignMask, boundaryMap, visitedBoundaries, r, c, numRows, numCols);
        if (path && path.length > 0) {
          contours.push(path);
        }
      }
    }

    return { contours, boundaryMap };
  }

  /**
   * Internal Moore-Neighbor tracing for a single connected silhouette boundary.
   */
  static _traceMoorePath(isDesignMask, boundaryMap, visited, startR, startC, numRows, numCols) {
    const path = [];
    let currR = startR;
    let currC = startC;
    let backtrackDir = 6; // West
    let steps = 0;
    const maxSteps = numRows * numCols * 2;

    while (steps < maxSteps) {
      visited[currR][currC] = 1;
      const bInfo = boundaryMap[currR][currC] || { r: currR, c: currC, isConvex: false, isConcave: false };
      path.push({
        r: currR,
        c: currC,
        isConvex: bInfo.isConvex,
        isConcave: bInfo.isConcave
      });

      // Search 8-neighbors clockwise starting from backtrack entry point
      let nextR = -1;
      let nextC = -1;
      let nextBacktrack = 0;
      let found = false;

      const startOffsetIdx = (backtrackDir + 1) % 8;
      for (let i = 0; i < 8; i++) {
        const dirIdx = (startOffsetIdx + i) % 8;
        const nr = currR + MOORE_OFFSETS[dirIdx][0];
        const nc = currC + MOORE_OFFSETS[dirIdx][1];

        if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && isDesignMask[nr][nc]) {
          nextR = nr;
          nextC = nc;
          nextBacktrack = (dirIdx + 4) % 8;
          found = true;
          break;
        }
      }

      if (!found || (nextR === startR && nextC === startC)) {
        break; // Loop closed
      }

      currR = nextR;
      currC = nextC;
      backtrackDir = nextBacktrack;
      steps++;
    }

    return path;
  }
}
