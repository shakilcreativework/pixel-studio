/**
 * MosaicDesignDetector.js
 * Segments 2D Mosaic grid into distinct individual design objects using 8-connected component analysis.
 * Conforms strictly to Mosaic_Edge_Intelligence_Context_Engineering_Working_Process.md (Section 5).
 */

const D8 = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

export class MosaicDesignDetector {
  /**
   * Detects and segments individual design/artwork objects from the 2D grid.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @returns {Array<object>} Array of individual design objects
   */
  static detectIndividualDesigns(grid) {
    if (!grid || grid.length === 0) return [];

    const numRows = grid.length;
    const numCols = grid[0].length;
    const visited = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    const designs = [];
    let designIdCounter = 1;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        // Skip removed, background, or already visited cells
        if (cell.isRemoved || cell.sample.a < 10 || visited[r][c]) {
          continue;
        }

        // Run 8-connected BFS to collect all cells belonging to this design object
        const componentCells = [];
        const queue = [[r, c]];
        visited[r][c] = 1;

        let minRow = r, maxRow = r;
        let minCol = c, maxCol = c;
        let sumRow = 0, sumCol = 0;
        const colorSet = new Set();

        let head = 0;
        while (head < queue.length) {
          const [cr, cc] = queue[head++];
          const currCell = grid[cr][cc];
          componentCells.push(currCell);

          if (cr < minRow) minRow = cr;
          if (cr > maxRow) maxRow = cr;
          if (cc < minCol) minCol = cc;
          if (cc > maxCol) maxCol = cc;

          sumRow += cr;
          sumCol += cc;
          colorSet.add(currCell.color);

          // Check 8-connected neighbors
          for (let i = 0; i < 8; i++) {
            const nr = cr + D8[i][0];
            const nc = cc + D8[i][1];
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && !visited[nr][nc]) {
              const nCell = grid[nr][nc];
              if (!nCell.isRemoved && nCell.sample.a >= 10) {
                visited[nr][nc] = 1;
                queue.push([nr, nc]);
              }
            }
          }
        }

        // Require at least 2 connected cells to be classified as a distinct design object
        if (componentCells.length >= 2) {
          const designId = `design-${designIdCounter++}`;
          const centroid = {
            r: Math.round(sumRow / componentCells.length),
            c: Math.round(sumCol / componentCells.length)
          };

          designs.push({
            id: designId,
            name: `Design Object ${designIdCounter - 1}`,
            cells: componentCells,
            cellCount: componentCells.length,
            bounds: {
              minRow,
              maxRow,
              minCol,
              maxCol,
              width: maxCol - minCol + 1,
              height: maxRow - minRow + 1
            },
            centroid,
            colors: Array.from(colorSet)
          });
        }
      }
    }

    return designs;
  }
}
