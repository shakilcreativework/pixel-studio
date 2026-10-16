/**
 * BackgroundRemover.js
 * Stage 4: Background Removal Execution Engine.
 * Parameterized unified removal with local contrast adaptive tolerance,
 * scope-aware flood fill (Outer Edge Safe vs Global), and Topology Guard integration.
 */

import { colorDistance } from './BackgroundClassifier.js';
import { CellDesignState } from './CellModel.js';
import { TopologyGuard } from './TopologyGuard.js';

const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class BackgroundRemover {
  /**
   * Execute adaptive background removal on a classified grid.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {Array<Array<number>>|Array<number>} targetRgbList - Removal color(s) [r, g, b]
   * @param {number} distCeiling - Color tolerance distance ceiling (0 for pure exact match)
   * @param {string} bgRemovalScope - 'contiguous' (Outer Edge Safe) or 'global' (Everywhere)
   * @param {number} edgeTrim - -2 to +2 (negative shaves design contour, positive expands boundary)
   * @returns {void}
   */
  static execute(grid, targetRgbList, distCeiling = 0, bgRemovalScope = 'contiguous', edgeTrim = 0) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;

    // Normalize targets to array of [r, g, b]
    let targets = [];
    if (Array.isArray(targetRgbList)) {
      if (targetRgbList.length > 0 && typeof targetRgbList[0] === 'number') {
        targets = [targetRgbList];
      } else {
        targets = targetRgbList.filter(t => Array.isArray(t) && t.length >= 3);
      }
    }

    if (numRows === 0 || numCols === 0 || targets.length === 0) return;

    // 1. Adaptive Tolerance Evaluation
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        if (cell.sample.a < 10) {
          cell.isBgMatch = true;
          continue;
        }

        // If manual keep or locked, it is NEVER a background match
        if (cell.designState === CellDesignState.MANUAL_KEEP || cell.protected) {
          cell.isBgMatch = false;
          continue;
        }

        if (distCeiling === 0) {
          // Pure exact color matching: matches strictly pure target colors
          let isMatch = false;
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (cell.sample.r === t[0] && cell.sample.g === t[1] && cell.sample.b === t[2]) {
              isMatch = true;
              break;
            }
          }
          cell.isBgMatch = isMatch;
          continue;
        }

        let minTargetDist = 999;
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, t[0], t[1], t[2]);
          if (dist < minTargetDist) minTargetDist = dist;
        }
        cell.distToTarget = minTargetDist;

        if (cell.distToTarget > distCeiling) {
          cell.isBgMatch = false;
          continue;
        }

        // Compute maximum local contrast to surrounding design neighbors
        let maxNeighborContrast = 0;
        for (let i = 0; i < 4; i++) {
          const nr = r + D4[i][0];
          const nc = c + D4[i][1];
          if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
            const n = grid[nr][nc];
            if (n.sample.a >= 10) {
              const contrast = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, n.sample.r, n.sample.g, n.sample.b);
              if (contrast > maxNeighborContrast) {
                maxNeighborContrast = contrast;
              }
            }
          }
        }

        // Tighter adaptive threshold near sharp high-contrast contours to protect outline steps
        const adaptiveRatio = maxNeighborContrast > 120 ? 0.65 : (maxNeighborContrast > 60 ? 0.85 : 1.0);
        const localThreshold = distCeiling * adaptiveRatio;

        cell.isBgMatch = (cell.distToTarget <= localThreshold);
      }
    }

    // 2. Removal Execution based on Scope with Topology Protection
    if (bgRemovalScope === 'global') {
      // Everywhere (Global): remove matching background cells if not protected
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (cell.sample.a < 10) {
            cell.isRemoved = true;
            continue;
          }

          if (cell.isBgMatch) {
            if (TopologyGuard.wouldChangeDesignTopology(r, c, grid)) {
              cell.rejectedByTopology = true;
            } else {
              cell.isRemoved = true;
            }
          }
        }
      }
    } else {
      // Outer Edge (Safe / Contiguous): BFS flood-fill strictly seeded from canvas perimeter
      const visited = Array.from({ length: numRows }, () => new Uint8Array(numCols));
      const queue = [];

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const isBorder = (r === 0 || r === numRows - 1 || c === 0 || c === numCols - 1);
          if (isBorder) {
            const cell = grid[r][c];
            if (cell.sample.a < 10) {
              visited[r][c] = 1;
              cell.isRemoved = true;
              queue.push(r * numCols + c);
            } else if (cell.isBgMatch) {
              if (TopologyGuard.wouldChangeDesignTopology(r, c, grid)) {
                cell.rejectedByTopology = true;
              } else {
                visited[r][c] = 1;
                cell.isRemoved = true;
                queue.push(r * numCols + c);
              }
            }
          }
        }
      }

      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        const r = Math.floor(idx / numCols);
        const c = idx % numCols;

        for (let i = 0; i < 4; i++) {
          const nr = r + D4[i][0];
          const nc = c + D4[i][1];

          if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && !visited[nr][nc]) {
            const neighbor = grid[nr][nc];

            if (neighbor.sample.a < 10) {
              visited[nr][nc] = 1;
              neighbor.isRemoved = true;
              queue.push(nr * numCols + nc);
            } else if (neighbor.isBgMatch) {
              if (TopologyGuard.wouldChangeDesignTopology(nr, nc, grid)) {
                neighbor.rejectedByTopology = true;
              } else {
                visited[nr][nc] = 1;
                neighbor.isRemoved = true;
                queue.push(nr * numCols + nc);
              }
            }
          }
        }
      }
    }

    // 3. Edge Trim: Negative shaves outer design contour, Positive expands boundary
    if (edgeTrim !== 0) {
      if (edgeTrim < 0) {
        // Negative edgeTrim: shave outer contour (remove outer boundary cells touching removed background)
        const steps = Math.abs(edgeTrim);
        for (let step = 0; step < steps; step++) {
          const toRemove = [];
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              if (!grid[r][c].isRemoved) {
                let hasRemovedNeighbor = false;
                for (let i = 0; i < 4; i++) {
                  const nr = r + D4[i][0];
                  const nc = c + D4[i][1];
                  if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && grid[nr][nc].isRemoved) {
                    hasRemovedNeighbor = true;
                    break;
                  }
                }
                if (hasRemovedNeighbor) {
                  toRemove.push([r, c]);
                }
              }
            }
          }
          toRemove.forEach(([r, c]) => {
            grid[r][c].isRemoved = true;
          });
        }
      } else if (edgeTrim > 0) {
        // Positive edgeTrim: restore removed tiles adjacent to kept design
        for (let step = 0; step < edgeTrim; step++) {
          const toRestore = [];
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              if (grid[r][c].isRemoved) {
                let hasKeptNeighbor = false;
                for (let i = 0; i < 4; i++) {
                  const nr = r + D4[i][0];
                  const nc = c + D4[i][1];
                  if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && !grid[nr][nc].isRemoved) {
                    hasKeptNeighbor = true;
                    break;
                  }
                }
                if (hasKeptNeighbor) {
                  toRestore.push([r, c]);
                }
              }
            }
          }
          toRestore.forEach(([r, c]) => {
            grid[r][c].isRemoved = false;
          });
        }
      }
    }

    // 4. Automatic Boundary Edge Fringe Purifier pass
    BackgroundRemover.purifyBoundaryFringe(grid, targets, { distCeiling, bgRemovalScope, edgeTrim });
  }

  /**
   * Classifies whether a perimeter design cell is a fringe/edge noise artifact
   * (white/light halo, grey border blur, translucent edge, or low-value dark fringe)
   * vs a solid design body color (solid vibrant colors or solid dark outlines).
   */
  static isFringeOrEdgeNoise(cell, grid, numRows, numCols, r, c) {
    if (!cell || cell.protected || cell.isProtected || cell.designState === CellDesignState.MANUAL_KEEP || cell.designState === CellDesignState.LOCKED_DESIGN) {
      return false;
    }

    const { r: red, g: green, b: blue, a: alpha } = cell.sample;

    // Translucent edge noise
    if (alpha < 210) return true;

    const lum = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const maxC = Math.max(red, green, blue);
    const minC = Math.min(red, green, blue);
    const sat = maxC - minC;

    // 1. White / Light Fringe Halos (all 3 channels high or high luminance with low saturation)
    if ((red > 185 && green > 185 && blue > 185) || (lum > 0.75 && sat < 40)) {
      return true;
    }

    // 2. Grey / Anti-Aliased Border Blur (low saturation midtone transition pixels)
    if (lum >= 0.22 && lum <= 0.85 && sat < 38) {
      return true;
    }

    // 3. Low-Value Dark Fringe Noise (translucent or faint dark edge noise)
    if (alpha < 240 && lum < 0.15 && sat < 22) {
      return true;
    }

    // 4. Check color distance continuity against inner kept design body neighbors
    let innerNeighbors = [];
    for (let i = 0; i < 4; i++) {
      const nr = r + D4[i][0];
      const nc = c + D4[i][1];
      if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
        const neighbor = grid[nr][nc];
        if (neighbor && !neighbor.isRemoved) {
          innerNeighbors.push(neighbor.sample);
        }
      }
    }

    if (innerNeighbors.length > 0) {
      let minDist = 999;
      for (const inSample of innerNeighbors) {
        const dist = colorDistance(red, green, blue, inSample.r, inSample.g, inSample.b);
        if (dist < minDist) minDist = dist;
      }
      // Sub-pixel anti-aliased edge transition pixel against background
      if (minDist > 55) {
        return true;
      }
    }

    // Solid design body color -> 100% Protected!
    return false;
  }

  /**
   * Purges anti-aliased background-to-outline transition fringe pixels sitting outside
   * solid design boundaries (such as solid black outlines #000000), leaving a crisp, 
   * 100% clean solid boundary around all sprite items.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {Array<Array<number>>} targetRgbList - Target removal color(s) [r, g, b]
   * @param {object} options
   */
  static purifyBoundaryFringe(grid, _targetRgbList = [], _options = {}) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return 0;

    let purgedCount = 0;

    for (let pass = 0; pass < 2; pass++) {
      const toRemove = [];

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell || cell.isRemoved || cell.sample.a < 10) continue;
          if (cell.protected || cell.isProtected || cell.designState === CellDesignState.MANUAL_KEEP) continue;

          // Check if cell is a perimeter cell touching removed background or canvas boundary
          let touchesBg = (r === 0 || r === numRows - 1 || c === 0 || c === numCols - 1);
          let innerOutlineNeighbor = null;

          for (let i = 0; i < 4; i++) {
            const nr = r + D4[i][0];
            const nc = c + D4[i][1];
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
              const neighbor = grid[nr][nc];
              if (neighbor.isRemoved || neighbor.sample.a < 10) {
                touchesBg = true;
              } else {
                // Check if inner neighbor is a solid dark outline (#000000) or solid body color
                const nLum = (0.2126 * neighbor.sample.r + 0.7152 * neighbor.sample.g + 0.0722 * neighbor.sample.b) / 255;
                if (nLum < 0.30 || (neighbor.sample.r < 80 && neighbor.sample.g < 80 && neighbor.sample.b < 80)) {
                  innerOutlineNeighbor = neighbor;
                }
              }
            }
          }

          if (!touchesBg) continue;

          // Evaluate cell color properties
          const { r: red, g: green, b: blue, a: alpha } = cell.sample;
          const cellLum = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

          // Check if cell is a solid black outline cell itself (r,g,b < 70) -> 100% PROTECTED!
          const isSolidBlackOutline = (red < 70 && green < 70 && blue < 70 && alpha >= 220);
          if (isSolidBlackOutline) continue;

          // Check if cell is a transition fringe pixel created by blending background + solid outline
          let isTransitionFringe = false;

          if (innerOutlineNeighbor) {
            // Cell sits outside a solid dark outline and has higher luminance (light/grey transition pixel)
            const nLum = (0.2126 * innerOutlineNeighbor.sample.r + 0.7152 * innerOutlineNeighbor.sample.g + 0.0722 * innerOutlineNeighbor.sample.b) / 255;
            if (cellLum > nLum + 0.12 || (red > 90 && green > 90 && blue > 90)) {
              isTransitionFringe = true;
            }
          } else {
            // General outer fringe noise check
            isTransitionFringe = this.isFringeOrEdgeNoise(cell, grid, numRows, numCols, r, c);
          }

          if (isTransitionFringe) {
            toRemove.push([r, c]);
          }
        }
      }

      if (toRemove.length === 0) break;

      toRemove.forEach(([r, c]) => {
        grid[r][c].isRemoved = true;
        grid[r][c].isTrimmed = true;
        purgedCount++;
      });
    }

    return purgedCount;
  }
}
