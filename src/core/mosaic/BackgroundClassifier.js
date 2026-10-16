/**
 * BackgroundClassifier.js
 * Stage 3: Background, Boundary, and Design Classification Engine.
 * Parameterized for all target colors (Black, White, Pick-Color).
 * Implements rich state modeling and priority chain.
 */

import { CellDesignState } from './CellModel.js';

const D8 = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

/**
 * Calculate Euclidean color distance between two RGB colors (0 to ~441.67)
 */
export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export class BackgroundClassifier {
  /**
   * Classify 2D grid cells into design states.
   * @param {Array<Array<object>>} grid - Sampled cell grid of CellModel instances
   * @param {Array<Array<number>>|Array<number>} targetRgbList - Target color(s) [r, g, b]
   * @param {number} distCeiling - Maximum color distance ceiling (0 for pure exact match)
   * @param {object} manualOverrides - Manual cell override map
   * @returns {void}
   */
  static classify(grid, targetRgbList, distCeiling = 0, manualOverrides = {}) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    // Normalize targets to array of [r, g, b]
    let targets = [];
    if (Array.isArray(targetRgbList)) {
      if (targetRgbList.length > 0 && typeof targetRgbList[0] === 'number') {
        targets = [targetRgbList];
      } else {
        targets = targetRgbList.filter(t => Array.isArray(t) && t.length >= 3);
      }
    }

    const hasTargets = targets.length > 0;

    // Pass 1: Identify unambiguous design-core candidates (non-transparent & not matching any removal target)
    const isDesignCore = Array.from({ length: numRows }, () => new Uint8Array(numCols));
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        const override = manualOverrides[cell.id] || manualOverrides[`${c},${r}`];

        if (override) {
          if (override.action === 'keep' || override.removed === false) {
            cell.designState = CellDesignState.MANUAL_KEEP;
            cell.protected = true;
            isDesignCore[r][c] = 1;
            continue;
          } else if (override.action === 'remove' || override.removed === true) {
            cell.designState = CellDesignState.MANUAL_REMOVE;
            cell.protected = false;
            continue;
          }
        }

        if (cell.sample.a >= 10 && hasTargets) {
          let minDist = 9999;
          let isMatch = false;

          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (distCeiling === 0) {
              // Pure exact color matching
              if (cell.sample.r === t[0] && cell.sample.g === t[1] && cell.sample.b === t[2]) {
                minDist = 0;
                isMatch = true;
                break;
              }
            } else {
              const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, t[0], t[1], t[2]);
              if (dist < minDist) minDist = dist;
              if (dist <= distCeiling) isMatch = true;
            }
          }

          cell.distToTarget = minDist;
          if (!isMatch) {
            isDesignCore[r][c] = 1;
          }
        } else if (cell.sample.a >= 10 && !hasTargets) {
          // No target background removal -> all non-transparent pixels are design
          isDesignCore[r][c] = 1;
          cell.distToTarget = 999;
        } else {
          cell.distToTarget = 0;
        }
      }
    }

    // Pass 2: Classify into rich design states
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        // Skip cells with manual overrides already set
        if (cell.designState === CellDesignState.MANUAL_KEEP || cell.designState === CellDesignState.MANUAL_REMOVE) {
          continue;
        }

        if (cell.sample.a < 10) {
          cell.designState = CellDesignState.BACKGROUND_CONFIRMED;
          cell.category = 'background';
          continue;
        }

        if (!hasTargets || isDesignCore[r][c]) {
          cell.designState = CellDesignState.DESIGN;
          cell.category = 'design';
        } else {
          // Check 8-neighborhood for design core adjacency
          let adjacentToDesign = false;
          for (let i = 0; i < 8; i++) {
            const nr = r + D8[i][0];
            const nc = c + D8[i][1];
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
              if (isDesignCore[nr][nc]) {
                adjacentToDesign = true;
                break;
              }
            }
          }

          if (adjacentToDesign) {
            cell.designState = CellDesignState.BOUNDARY;
            cell.category = 'boundary';
          } else {
            cell.designState = CellDesignState.BACKGROUND_CANDIDATE;
            cell.category = 'background';
          }
        }
      }
    }
  }
}
