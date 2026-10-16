/**
 * PostQualityPass.js
 * Stage 5: Post-Removal Quality Passes & QA Diagnostic Overlay.
 * Runs non-destructive refinement and renders rich visual diagnostics.
 */

import { colorDistance } from './BackgroundClassifier.js';
import { CellDesignState, CellBoundaryState, CellCornerState } from './CellModel.js';

const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class PostQualityPass {
  /**
   * Execute post-removal quality passes in fixed sequence.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {object} options
   * @returns {void}
   */
  static apply(grid, options = {}) {
    if (options.sourceArtType === 'already-pixel-art') return;

    const {
      snapEdgeColors = true,
      restoreEdgeColors = true,
      perfectCorners = true,
      deFringe = false,
      targetRgb = null,
      distCeiling = 100
    } = options;

    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    // Pass 1: Snap to Design Outline Color (Local Silhouette Normalization)
    if (snapEdgeColors) {
      // Local color-aware outline smoothing so dark outlines match each specific object's shade
      const newColors = new Map();

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && cell.category === 'boundary' && !cell.protected) {
            const lum = 0.299 * cell.sample.r + 0.587 * cell.sample.g + 0.114 * cell.sample.b;
            if (lum < 90) {
              let sumR = 0, sumG = 0, sumB = 0, count = 0;
              for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                  const nr = r + dr;
                  const nc = c + dc;
                  if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
                    const neighbor = grid[nr][nc];
                    if (neighbor && !neighbor.isRemoved && neighbor.category === 'boundary') {
                      const nLum = 0.299 * neighbor.sample.r + 0.587 * neighbor.sample.g + 0.114 * neighbor.sample.b;
                      if (nLum < 90) {
                        const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, neighbor.sample.r, neighbor.sample.g, neighbor.sample.b);
                        if (dist <= 60) {
                          sumR += neighbor.sample.r;
                          sumG += neighbor.sample.g;
                          sumB += neighbor.sample.b;
                          count++;
                        }
                      }
                    }
                  }
                }
              }

              if (count > 0) {
                newColors.set(`${r},${c}`, {
                  r: Math.round(sumR / count),
                  g: Math.round(sumG / count),
                  b: Math.round(sumB / count)
                });
              }
            }
          }
        }
      }

      for (const [key, val] of newColors.entries()) {
        const [r, c] = key.split(',').map(Number);
        const cell = grid[r][c];
        cell.sample.r = val.r;
        cell.sample.g = val.g;
        cell.sample.b = val.b;
        cell.color = `rgb(${val.r},${val.g},${val.b})`;
      }
    }

    // Pass 2: Restore Vibrant Edge Colors (De-Fade)
    if (restoreEdgeColors && targetRgb) {
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && cell.category === 'boundary') {
            // Un-mix faded colors against target background
            const lumBg = 0.299 * targetRgb[0] + 0.587 * targetRgb[1] + 0.114 * targetRgb[2];
            const isDarkBg = lumBg < 128;

            if (isDarkBg) {
              // Background was dark -> edge may be dimmed
              const maxC = Math.max(cell.sample.r, cell.sample.g, cell.sample.b);
              if (maxC > 40 && maxC < 220) {
                const boost = 1.15;
                cell.sample.r = Math.min(255, Math.round(cell.sample.r * boost));
                cell.sample.g = Math.min(255, Math.round(cell.sample.g * boost));
                cell.sample.b = Math.min(255, Math.round(cell.sample.b * boost));
                cell.color = `rgb(${cell.sample.r},${cell.sample.g},${cell.sample.b})`;
              }
            } else {
              // Background was light -> edge may be washed out
              const minC = Math.min(cell.sample.r, cell.sample.g, cell.sample.b);
              if (minC > 30) {
                const satScale = 0.88;
                cell.sample.r = Math.max(0, Math.round(cell.sample.r * satScale));
                cell.sample.g = Math.max(0, Math.round(cell.sample.g * satScale));
                cell.sample.b = Math.max(0, Math.round(cell.sample.b * satScale));
                cell.color = `rgb(${cell.sample.r},${cell.sample.g},${cell.sample.b})`;
              }
            }
          }
        }
      }
    }

    // Pass 3: Perfect Symmetry & Corner Harmonization
    if (perfectCorners) {
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && cell.category === 'boundary' && !cell.protected && cell.designState !== CellDesignState.LOCKED_DESIGN) {
            // Collect neighboring kept tiles
            let neighborColors = [];
            for (let i = 0; i < 4; i++) {
              const nr = r + D4[i][0];
              const nc = c + D4[i][1];
              if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
                const n = grid[nr][nc];
                if (!n.isRemoved) {
                  neighborColors.push(n.sample);
                }
              }
            }

            // Snap outlier color to dominant neighbor if wildly different and cell is purely a boundary artifact
            if (neighborColors.length >= 3 && !cell.protected) {
              const avgDist = neighborColors.reduce((acc, nc) =>
                acc + colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, nc.r, nc.g, nc.b), 0) / neighborColors.length;

              if (avgDist > 160) {
                const closest = neighborColors[0];
                cell.sample.r = closest.r;
                cell.sample.g = closest.g;
                cell.sample.b = closest.b;
                cell.color = `rgb(${closest.r},${closest.g},${closest.b})`;
              }
            }
          }
        }
      }
    }

    // Pass 4: Clean Edge Halo (De-Fringe) — Strictly restricted to candidate background, never eroding design
    if (deFringe && targetRgb) {
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && !cell.protected && cell.designState !== CellDesignState.LOCKED_DESIGN) {
            let adjacentToRemoved = false;
            for (let i = 0; i < 4; i++) {
              const nr = r + D4[i][0];
              const nc = c + D4[i][1];
              if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols && grid[nr][nc].isRemoved) {
                adjacentToRemoved = true;
                break;
              }
            }

            if (adjacentToRemoved) {
              const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, targetRgb[0], targetRgb[1], targetRgb[2]);
              // Remove only if within 1.5x tolerance and not protected
              if (dist <= distCeiling * 1.5) {
                cell.isRemoved = true;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generate diagnostic metadata for QA overlay.
   * @param {Array<Array<object>>} grid
   * @param {number} numRows
   * @param {number} numCols
   * @returns {Array<object>}
   */
  static generateDiagnostics(grid, numRows, numCols) {
    const mismatches = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.isRemoved) continue;

        // Check horizontal seam
        if (c + 1 < numCols) {
          const right = grid[r][c + 1];
          if (!right.isRemoved) {
            const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, right.sample.r, right.sample.g, right.sample.b);
            if (dist > 100) {
              mismatches.push({
                r,
                c,
                x: cell.x,
                y: cell.y,
                isSeam: true,
                dist
              });
            }
          }
        }

        // Check boundary outlier
        if (cell.isBoundary || cell.category === 'boundary') {
          for (let i = 0; i < 4; i++) {
            const nr = r + D4[i][0];
            const nc = c + D4[i][1];
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
              const neighbor = grid[nr][nc];
              if (!neighbor.isRemoved && (neighbor.isBoundary || neighbor.category === 'boundary')) {
                const dist = colorDistance(cell.sample.r, cell.sample.g, cell.sample.b, neighbor.sample.r, neighbor.sample.g, neighbor.sample.b);
                if (dist > 120) {
                  mismatches.push({
                    r,
                    c,
                    x: cell.x,
                    y: cell.y,
                    isBoundaryOutlier: true,
                    dist
                  });
                  break;
                }
              }
            }
          }
        }
      }
    }
    return mismatches;
  }

  /**
   * Render QA diagnostic inspection overlay onto the target canvas context.
   * Conforms to Mosaic PRD v3.0.0 Section 34:
   *   GREEN   = Protected design (#00e676)
   *   YELLOW  = Protected boundary (#ffd600)
   *   BLUE    = Protected corner (#2979ff)
   *   CYAN    = Protected thin feature (#00e5ff)
   *   RED     = Trim candidate / Removed cell (#ff1744)
   *   ORANGE  = Rejected Trim candidate / Protected by Topology (#ff9100)
   *   MAGENTA = Integrity Violation (#ff007f)
   */
  static renderQAOverlay(ctx, grid, tileSize, _spacing, integrityReport = null) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    ctx.save();
    ctx.lineWidth = 1;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        const x = cell.x;
        const y = cell.y;
        const w = cell.width || tileSize;
        const h = cell.height || tileSize;

        if (cell.rejectedByTopology || cell.designState === CellDesignState.TRIM_REJECTED) {
          // ORANGE: Rejected Trim candidate / Protected by Topology
          ctx.strokeStyle = '#ff9100';
          ctx.fillStyle = 'rgba(255, 145, 0, 0.35)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } else if (cell.isRemoved || cell.isTrimmed || cell.designState === CellDesignState.TRIMMED) {
          // RED: Trim candidate / Removed cell
          ctx.strokeStyle = '#ff1744';
          ctx.fillStyle = 'rgba(255, 23, 68, 0.25)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } else if (cell.designState === CellDesignState.THIN_FEATURE || cell.boundaryState === CellBoundaryState.THIN_LINE) {
          // CYAN: Protected Thin Feature
          ctx.strokeStyle = '#00e5ff';
          ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } else if (cell.cornerState !== CellCornerState.NONE || cell.designState === CellDesignState.CORNER || cell.designState === CellDesignState.LOCKED_CORNER) {
          // BLUE: Protected Corner
          ctx.strokeStyle = '#2979ff';
          ctx.fillStyle = 'rgba(41, 121, 255, 0.35)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } else if (cell.boundaryState !== CellBoundaryState.NONE || cell.designState === CellDesignState.BOUNDARY || cell.designState === CellDesignState.LOCKED_BOUNDARY) {
          // YELLOW: Protected Boundary
          ctx.strokeStyle = '#ffd600';
          ctx.fillStyle = 'rgba(255, 214, 0, 0.3)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } else if (cell.designState === CellDesignState.DESIGN || cell.designState === CellDesignState.LOCKED_DESIGN || cell.designState === CellDesignState.MANUAL_KEEP) {
          // GREEN: Protected Design Cell
          ctx.strokeStyle = '#00e676';
          ctx.fillStyle = 'rgba(0, 230, 118, 0.25)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }

        // Highlight any integrity error cells in MAGENTA
        if (integrityReport && !integrityReport.integrity.passed && cell.protected && cell.isRemoved) {
          ctx.strokeStyle = '#ff007f';
          ctx.fillStyle = 'rgba(255, 0, 127, 0.6)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }
      }
    }

    ctx.restore();
  }
}
