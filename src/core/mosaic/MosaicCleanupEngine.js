/**
 * MosaicCleanupEngine.js
 * Isolated, non-destructive Mosaic Pixel Cleanup Engine.
 * Conforms strictly to Mosaic_100_Percent_Cleanup_Context_Engineering_Workflow.md.
 *
 * Responsibilities:
 * 1. Outside noise & floating artifact detection.
 * 2. Internal noise detection with stair-step pixel-art geometry protection.
 * 3. Non-destructive cleanup pipeline with confidence scoring.
 * 4. Manual Remove, Restore, and Protect candidate resolution.
 */

import { CellDesignState } from './CellModel.js';
import { MosaicDesignDetector } from './MosaicDesignDetector.js';
import { MosaicBoundaryAnalyzer } from './MosaicBoundaryAnalyzer.js';

const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const D8 = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

export class MosaicCleanupEngine {
  /**
   * Execute intelligent cleanup on a 2D CellModel grid.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {object} options - Cleanup configuration settings
   * @returns {object} { grid, candidatesCount, cleanedCount, protectedCount }
   */
  static execute(grid, options = {}) {
    if (!grid || grid.length === 0) {
      return { grid, candidatesCount: 0, cleanedCount: 0, protectedCount: 0 };
    }

    const {
      autoClean = true,
      noiseThreshold = 20,
      manualOverrides = {},
      protectedIds = new Set(),
      manualRemoveIds = new Set(),
      manualRestoreIds = new Set()
    } = options;

    const numRows = grid.length;
    const numCols = grid[0].length;

    // 1. Analyze local edge geometry to protect valid pixel-art stair steps
    const stairStepProtection = this.analyzeStairStepGeometry(grid);

    // 2. Identify candidate noise cells across canvas and individual design boundaries
    const outsideCandidates = this.detectOutsideNoise(grid, noiseThreshold);
    const internalCandidates = this.detectInternalNoise(grid, noiseThreshold, stairStepProtection);

    // Boundary contour edge noise candidates across individual design objects
    const boundaryCandidates = new Set();
    const designs = MosaicDesignDetector.detectIndividualDesigns(grid);
    for (const design of designs) {
      const bReport = MosaicBoundaryAnalyzer.analyzeDesignBoundaries(design, grid, options);
      for (const bCell of bReport.boundaryCells) {
        if (bCell.classification === 'REMOVE') {
          boundaryCandidates.add(bCell.id);
        }
      }
    }

    let candidatesCount = outsideCandidates.size + internalCandidates.size + boundaryCandidates.size;
    let cleanedCount = 0;
    let protectedCount = 0;

    // 3. Apply cleanup decision to each cell
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];

        // Manual Protect Override
        const isManuallyProtected = protectedIds.has(cell.id) || manualOverrides[cell.id] === 'protect';
        const isManuallyRestored = manualRestoreIds.has(cell.id) || manualOverrides[cell.id] === 'restore';
        const isManuallyRemoved = manualRemoveIds.has(cell.id) || manualOverrides[cell.id] === 'remove';

        if (isManuallyProtected || cell.protected || cell.trimLocked || cell.isThinFeature) {
          cell.isProtected = true;
          protectedCount++;
          continue;
        }

        if (isManuallyRestored) {
          cell.isRemoved = false;
          cell.occupied = true;
          continue;
        }

        if (isManuallyRemoved) {
          cell.isRemoved = true;
          cleanedCount++;
          continue;
        }

        // Automatic Cleanup
        if (autoClean) {
          const isPixelArtMode = options.pathway === 'pixel-art' || options.sourceArtType === 'already-pixel-art';
          // On Pathway B, cleanup is strictly conservative: only remove floating outside noise
          const isCandidate = isPixelArtMode
            ? outsideCandidates.has(cell.id)
            : (outsideCandidates.has(cell.id) || internalCandidates.has(cell.id) || boundaryCandidates.has(cell.id));

          if (isCandidate && !stairStepProtection.has(cell.id) && !cell.isThinFeature) {
            cell.isRemoved = true;
            cell.isTrimmed = true;
            cell.designState = CellDesignState.TRIMMED;
            cleanedCount++;
          }
        }
      }
    }

    return {
      grid,
      candidatesCount,
      cleanedCount,
      protectedCount
    };
  }

  /**
   * Analyzes local neighborhood to protect intentional pixel-art stair-step edges.
   */
  static analyzeStairStepGeometry(grid) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    const protectedStairSteps = new Set();

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.isRemoved || cell.sample.a < 10) continue;

        // Check for 1x1 stair-step diagonal connection (e.g., top-left to bottom-right or top-right to bottom-left)
        const topLeft = (r > 0 && c > 0 && !grid[r - 1][c - 1].isRemoved);
        const bottomRight = (r < numRows - 1 && c < numCols - 1 && !grid[r + 1][c + 1].isRemoved);
        const topRight = (r > 0 && c < numCols - 1 && !grid[r - 1][c + 1].isRemoved);
        const bottomLeft = (r < numRows - 1 && c > 0 && !grid[r + 1][c - 1].isRemoved);

        const isDiagonalStair = (topLeft && bottomRight) || (topRight && bottomLeft);

        if (isDiagonalStair) {
          protectedStairSteps.add(cell.id);
        }
      }
    }

    return protectedStairSteps;
  }

  /**
   * Detects floating single cells or tiny disconnected clusters in the perimeter region.
   */
  static detectOutsideNoise(grid, _threshold = 20) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    const candidates = new Set();

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.isRemoved || cell.sample.a < 10) continue;

        // Count 8-connected occupied design neighbors
        let occupiedNeighbors = 0;
        for (let i = 0; i < 8; i++) {
          const nr = r + D8[i][0];
          const nc = c + D8[i][1];
          if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
            if (!grid[nr][nc].isRemoved && grid[nr][nc].sample.a >= 10) {
              occupiedNeighbors++;
            }
          }
        }

        // Isolated single cell or tiny 1-neighbor island floating outside
        if (occupiedNeighbors <= 1 && (r <= 1 || r >= numRows - 2 || c <= 1 || c >= numCols - 2)) {
          candidates.add(cell.id);
        }
      }
    }

    return candidates;
  }

  /**
   * Detects accidental internal noise cells while respecting protected stair steps.
   */
  static detectInternalNoise(grid, _threshold = 20, stairStepProtection = new Set()) {
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    const candidates = new Set();

    for (let r = 1; r < numRows - 1; r++) {
      for (let c = 1; c < numCols - 1; c++) {
        const cell = grid[r][c];
        if (cell.isRemoved || cell.sample.a < 10) continue;
        if (stairStepProtection.has(cell.id)) continue;

        // Count 4-way orthogonal neighbors
        let orthogonalRemoved = 0;
        for (let i = 0; i < 4; i++) {
          const nr = r + D4[i][0];
          const nc = c + D4[i][1];
          if (grid[nr][nc].isRemoved || grid[nr][nc].sample.a < 10) {
            orthogonalRemoved++;
          }
        }

        // Isolated internal pixel surrounded by removed background cells
        if (orthogonalRemoved >= 3 && !cell.protected) {
          candidates.add(cell.id);
        }
      }
    }

    return candidates;
  }
}
