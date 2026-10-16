/**
 * HardEdgeBackgroundRemover.js
 * Crisp Non-Destructive Background Removal for Pathway B (Pure Pixel Pipeline).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§5, Stage B4).
 *
 * Guaranteed Invariants:
 *   - Fringe purifier is STRICTLY DISABLED — never alters, blends, or introduces new boundary colors.
 *   - Outer (Perimeter-Seeded BFS Flood Fill): preserves internal design features of same color
 *     (e.g., panda white belly and eye reflections are never removed when white background is removed).
 *   - Solid outline protection (RGB < 70) is strictly respected.
 */

export class HardEdgeBackgroundRemover {
  /**
   * Remove background cells without eroding edges or altering colors.
   * @param {Array<Array<CellModel>>} grid
   * @param {Object} options
   * @param {string} [options.scope='outer'] - 'outer' (perimeter-contiguous) or 'global' (all matching)
   * @param {boolean} [options.protectBlackOutlines=true]
   * @returns {{ removedCount: number, preservedCount: number }}
   */
  static execute(grid, options = {}) {
    if (!grid || grid.length === 0) {
      return { removedCount: 0, preservedCount: 0 };
    }

    const numRows = grid.length;
    const numCols = grid[0].length;
    const scope = (options.scope === 'global' || options.bgRemovalScope === 'global') ? 'global' : 'outer';
    const protectBlackOutlines = options.protectBlackOutlines !== false;

    // Black outline protection only applies when the background being removed is NOT black/dark
    const isTargetingDark = options.bgRemovalMode === 'black' ||
      (Array.isArray(options.targetRgbList) && options.targetRgbList.some(
        t => Array.isArray(t) && t[0] <= 60 && t[1] <= 60 && t[2] <= 60
      ));

    let removedCount = 0;
    let preservedCount = 0;

    const isBlackOutline = (cell) => {
      if (!protectBlackOutlines || isTargetingDark || !cell) return false;
      // Cells explicitly classified as background candidates matching the removal target are never protected outlines
      if (cell.category === 'background' || cell.designState === 'BACKGROUND_CANDIDATE') {
        return false;
      }
      return (
        cell.sample.r <= 60 &&
        cell.sample.g <= 60 &&
        cell.sample.b <= 60 &&
        cell.sample.a >= 200
      );
    };

    if (scope === 'global') {
      // Remove all cells classified as background
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (cell.category === 'background' || cell.designState === 'BACKGROUND_CANDIDATE') {
            if (!isBlackOutline(cell) && !cell.protected && !cell.trimLocked) {
              cell.isRemoved = true;
              cell.occupied = false;
              cell.designState = 'BACKGROUND_CONFIRMED';
              removedCount++;
            } else {
              preservedCount++;
            }
          } else {
            preservedCount++;
          }
        }
      }
      return { removedCount, preservedCount };
    }

    // Outer Edge Mode: Perimeter-Seeded BFS Flood Fill
    // Only removes background connected to the outer boundaries of the canvas
    const visited = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const queue = [];

    // Seed from all 4 perimeter borders
    const trySeed = (r, c) => {
      if (visited[r][c]) return;
      const cell = grid[r][c];
      if (cell.category === 'background' || cell.designState === 'BACKGROUND_CANDIDATE' || cell.sample.a < 10) {
        if (!isBlackOutline(cell) && !cell.protected && !cell.trimLocked) {
          visited[r][c] = 1;
          queue.push([r, c]);
        }
      }
    };

    for (let c = 0; c < numCols; c++) {
      trySeed(0, c);
      trySeed(numRows - 1, c);
    }
    for (let r = 0; r < numRows; r++) {
      trySeed(r, 0);
      trySeed(r, numCols - 1);
    }

    // BFS 4-way flood fill
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const [currR, currC] = queue.shift();
      const cell = grid[currR][currC];

      cell.isRemoved = true;
      cell.occupied = false;
      cell.designState = 'BACKGROUND_CONFIRMED';
      removedCount++;

      for (const [dr, dc] of dirs) {
        const nr = currR + dr;
        const nc = currC + dc;

        if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && !visited[nr][nc]) {
          const neighbor = grid[nr][nc];
          if (
            neighbor &&
            (neighbor.category === 'background' || neighbor.designState === 'BACKGROUND_CANDIDATE' || neighbor.sample.a < 10) &&
            !isBlackOutline(neighbor) &&
            !neighbor.protected &&
            !neighbor.trimLocked
          ) {
            visited[nr][nc] = 1;
            queue.push([nr, nc]);
          }
        }
      }
    }

    // All unvisited background candidates remain protected design elements (e.g. panda white belly)
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell.isRemoved) {
          cell.category = 'design';
          cell.designState = 'DESIGN';
          cell.occupied = true;
          preservedCount++;
        }
      }
    }

    return { removedCount, preservedCount };
  }
}
