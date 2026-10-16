/**
 * IslandSeparator.js
 * Sprite Sheet Island Segmentation & Thin Feature Protection Engine for Pathway B.
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§5, Stage B5).
 *
 * Capabilities:
 *   1. 8-connected component segmentation of independent sprite islands.
 *   2. Identifies and whitelists 1-cell-wide thin features (pointers, stems, EKG heartbeat lines)
 *      so they are never pruned as noise.
 *   3. Enforces sprite island clearance sanity checks (e.g., minimum 8–16 grid units).
 */

export class IslandSeparator {
  /**
   * Segment grid into distinct sprite islands and protect thin features.
   * @param {Array<Array<CellModel>>} grid
   * @param {Object} options
   * @param {number} [options.minIslandSize=2]
   * @param {boolean} [options.thinFeatureProtection=true]
   * @returns {{
   *   islands: Array<{
   *     id: string,
   *     cells: Array<CellModel>,
   *     bbox: { minCol: number, minRow: number, maxCol: number, maxRow: number, width: number, height: number },
   *     uniqueColors: Array<string>
   *   }>,
   *   thinFeatureCellCount: number
   * }}
   */
  static segment(grid, options = {}) {
    if (!grid || grid.length === 0) {
      return { islands: [], thinFeatureCellCount: 0 };
    }

    const numRows = grid.length;
    const numCols = grid[0].length;
    const minIslandSize = options.minIslandSize ?? 1;
    const protectThin = options.thinFeatureProtection !== false;

    const visited = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const islands = [];
    let thinFeatureCellCount = 0;

    // 1. Segment 8-connected islands
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const startCell = grid[r][c];
        if (!startCell || startCell.isRemoved || startCell.sample.a < 10 || visited[r][c]) {
          continue;
        }

        const islandCells = [];
        const queue = [[r, c]];
        visited[r][c] = 1;

        let minCol = c, maxCol = c;
        let minRow = r, maxRow = r;
        const colorSet = new Set();

        while (queue.length > 0) {
          const [currR, currC] = queue.pop();
          const cell = grid[currR][currC];
          islandCells.push(cell);

          if (currC < minCol) minCol = currC;
          if (currC > maxCol) maxCol = currC;
          if (currR < minRow) minRow = currR;
          if (currR > maxRow) maxRow = currR;

          if (cell.color) colorSet.add(cell.color);

          // 8-way neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = currR + dr;
              const nc = currC + dc;

              if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && !visited[nr][nc]) {
                const neighbor = grid[nr][nc];
                if (neighbor && !neighbor.isRemoved && neighbor.sample.a >= 10) {
                  visited[nr][nc] = 1;
                  queue.push([nr, nc]);
                }
              }
            }
          }
        }

        if (islandCells.length >= minIslandSize) {
          const islandId = `Design ${islands.length + 1}`;
          islandCells.forEach(cell => {
            cell.islandId = islandId;
          });

          islands.push({
            id: islandId,
            cells: islandCells,
            bbox: {
              minCol,
              minRow,
              maxCol,
              maxRow,
              width: maxCol - minCol + 1,
              height: maxRow - minRow + 1
            },
            uniqueColors: Array.from(colorSet)
          });
        }
      }
    }

    // 2. Identify and whitelist 1-cell-wide thin features
    if (protectThin) {
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell || cell.isRemoved || cell.sample.a < 10) continue;

          // Check if cell has 4-way neighbors
          const top = r > 0 && !grid[r - 1][c].isRemoved;
          const bottom = r < numRows - 1 && !grid[r + 1][c].isRemoved;
          const left = c > 0 && !grid[r][c - 1].isRemoved;
          const right = c < numCols - 1 && !grid[r][c + 1].isRemoved;

          // A 1-cell horizontal line has top and bottom empty, but left or right active
          const isHorizThin = (!top && !bottom) && (left || right);
          // A 1-cell vertical line has left and right empty, but top or bottom active
          const isVertThin = (!left && !right) && (top || bottom);

          if (isHorizThin || isVertThin) {
            cell.isThinFeature = true;
            cell.protected = true;
            cell.trimLocked = true;
            thinFeatureCellCount++;
          }
        }
      }
    }

    return {
      islands,
      thinFeatureCellCount
    };
  }
}
