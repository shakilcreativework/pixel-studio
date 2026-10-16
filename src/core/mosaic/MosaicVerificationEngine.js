/**
 * MosaicVerificationEngine.js
 * Machine-checkable 100% Verification Engine for Mosaic Pixel Cleanup & Edge Intelligence.
 * Conforms strictly to Mosaic_Edge_Intelligence_Context_Engineering_Working_Process.md (Sections 15 & 16).
 *
 * Rules:
 * - Earned 100% CLEAN verification badge when all 5 quality checks pass:
 *   1. Outside Noise Check (0 floating outside noise cells)
 *   2. Edge Structure Check (0 broken edge fringe artifacts)
 *   3. Internal Noise Check (0 unhandled internal noise cells)
 *   4. Protection Check (0 protected region violations)
 *   5. Design Boundaries Check (0 unresolved edge issues across every individual design object)
 */

import { MosaicCleanupEngine } from './MosaicCleanupEngine.js';
import { MosaicDesignDetector } from './MosaicDesignDetector.js';
import { MosaicBoundaryAnalyzer } from './MosaicBoundaryAnalyzer.js';

export class MosaicVerificationEngine {
  /**
   * Evaluate machine-checkable verification checks on the processed grid.
   * @param {Array<Array<object>>} grid - 2D grid of CellModel objects
   * @param {object} options
   * @returns {object} Machine-checkable verification report
   */
  static verify(grid, options = {}) {
    if (!grid || grid.length === 0) {
      return {
        is100PercentClean: true,
        cleanPercentage: 100,
        statusText: '100% CLEAN',
        issuesCount: 0,
        checks: {
          outside: true,
          edges: true,
          noise: true,
          protection: true,
          designBoundaries: true
        },
        issues: [],
        designReports: []
      };
    }

    const numRows = grid.length;
    const numCols = grid[0].length;
    const issues = [];

    // 1. Outside Noise Check
    const outsideCandidates = MosaicCleanupEngine.detectOutsideNoise(grid, 20);
    let outsideIssues = 0;
    outsideCandidates.forEach(id => {
      outsideIssues++;
      issues.push(`Outside floating noise cell detected: ${id}`);
    });

    // 2. Edge Structure Check
    let edgeIssues = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell.isRemoved && cell.category === 'boundary' && cell.isFringe) {
          edgeIssues++;
          issues.push(`Uncleaned edge fringe artifact at cell (${c}, ${r})`);
        }
      }
    }

    // 3. Internal Noise Check
    const stairStepProtection = MosaicCleanupEngine.analyzeStairStepGeometry(grid);
    const internalCandidates = MosaicCleanupEngine.detectInternalNoise(grid, 20, stairStepProtection);
    let internalNoiseIssues = 0;
    internalCandidates.forEach(id => {
      internalNoiseIssues++;
      issues.push(`Internal isolated noise cell detected: ${id}`);
    });

    // 4. Protection Region Verification Check
    let protectionViolations = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if ((cell.protected || cell.isProtected || cell.trimLocked) && cell.isRemoved) {
          protectionViolations++;
          issues.push(`Protected cell (${c}, ${r}) was incorrectly removed.`);
        }
      }
    }

    // 5. Individual Design Boundary Edge Intelligence Check
    const designs = MosaicDesignDetector.detectIndividualDesigns(grid);
    const designReports = [];
    let boundaryEdgeIssues = 0;

    for (const design of designs) {
      const bReport = MosaicBoundaryAnalyzer.analyzeDesignBoundaries(design, grid, options);
      designReports.push(bReport);
      if (bReport.edgeIssuesCount > 0) {
        boundaryEdgeIssues += bReport.edgeIssuesCount;
        issues.push(...bReport.issuesList);
      }
    }

    // 6. Zero Color Loss Check (Mandatory for Pathway B / Pixel Art mode)
    let colorLossIssues = 0;
    const isPixelArtMode = options.pathway === 'pixel-art' || options.sourceArtType === 'already-pixel-art';
    const sourcePalette = options.sourcePalette; // Array of [r, g, b] or hex strings or Set

    if (isPixelArtMode && sourcePalette && sourcePalette.length > 0) {
      const paletteSet = new Set(
        sourcePalette.map(c => Array.isArray(c) ? `${c[0]},${c[1]},${c[2]}` : String(c))
      );

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && cell.sample.a >= 10) {
            const key = `${cell.sample.r},${cell.sample.g},${cell.sample.b}`;
            if (!paletteSet.has(key)) {
              colorLossIssues++;
              issues.push(`Zero Color Loss violation: cell (${c}, ${r}) has color rgb(${key}) not in source palette.`);
            }
          }
        }
      }
    }

    // 7. Grid Alignment Check (Mandatory for Pathway B / Pixel Art mode)
    let gridAlignmentIssues = 0;
    if (isPixelArtMode) {
      const expectedCellSize = options.detectedCellSize || options.tileSize || (grid[0]?.[0]?.width) || 16;
      const expectedOx = options.offsetX || 0;
      const expectedOy = options.offsetY || 0;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];
          if (!cell.isRemoved && cell.sample.a >= 10) {
            const relX = cell.x - expectedOx;
            const relY = cell.y - expectedOy;
            if (relX % expectedCellSize !== 0 || relY % expectedCellSize !== 0) {
              gridAlignmentIssues++;
              issues.push(`Off-grid cell boundary at (${c}, ${r}): x=${cell.x}, y=${cell.y} does not align to ${expectedCellSize}px grid.`);
            }
          }
        }
      }
    }

    const qualityChecks = options.qualityChecks || options.enabledChecks || {};
    const isOutsideEnabled = qualityChecks.outside !== false;
    const isEdgesEnabled = qualityChecks.edges !== false;
    const isNoiseEnabled = qualityChecks.noise !== false;
    const isProtectionEnabled = qualityChecks.protection !== false;
    const isDesignBoundariesEnabled = qualityChecks.designBoundaries !== false;
    const isZeroColorLossEnabled = qualityChecks.zeroColorLoss !== false;
    const isGridAlignmentEnabled = qualityChecks.gridAlignment !== false;

    const activeOutsideIssues = isOutsideEnabled ? outsideIssues : 0;
    const activeEdgeIssues = isEdgesEnabled ? edgeIssues : 0;
    const activeInternalNoiseIssues = isNoiseEnabled ? internalNoiseIssues : 0;
    const activeProtectionViolations = isProtectionEnabled ? protectionViolations : 0;
    const activeBoundaryEdgeIssues = isDesignBoundariesEnabled ? boundaryEdgeIssues : 0;
    const activeColorLossIssues = isZeroColorLossEnabled ? colorLossIssues : 0;
    const activeGridAlignmentIssues = isGridAlignmentEnabled ? gridAlignmentIssues : 0;

    const checkOutside = isOutsideEnabled ? (outsideIssues === 0) : 'disabled';
    const checkEdges = isEdgesEnabled ? (edgeIssues === 0) : 'disabled';
    const checkNoise = isNoiseEnabled ? (internalNoiseIssues === 0) : 'disabled';
    const checkProtection = isProtectionEnabled ? (protectionViolations === 0) : 'disabled';
    const checkDesignBoundaries = isDesignBoundariesEnabled ? (boundaryEdgeIssues === 0) : 'disabled';
    const checkZeroColorLoss = isZeroColorLossEnabled ? (colorLossIssues === 0) : 'disabled';
    const checkGridAlignment = isGridAlignmentEnabled ? (gridAlignmentIssues === 0) : 'disabled';

    const issuesCount = activeOutsideIssues + activeEdgeIssues + activeInternalNoiseIssues + activeProtectionViolations + activeBoundaryEdgeIssues + activeColorLossIssues + activeGridAlignmentIssues;
    const is100PercentClean = (issuesCount === 0);

    const totalCheckCategories = (isOutsideEnabled ? 1 : 0) +
      (isEdgesEnabled ? 1 : 0) +
      (isNoiseEnabled ? 1 : 0) +
      (isProtectionEnabled ? 1 : 0) +
      (isDesignBoundariesEnabled ? 1 : 0) +
      (isPixelArtMode ? (isZeroColorLossEnabled ? 1 : 0) + (isGridAlignmentEnabled ? 1 : 0) : 0);

    const passedCheckCategories = (checkOutside === true ? 1 : 0) +
      (checkEdges === true ? 1 : 0) +
      (checkNoise === true ? 1 : 0) +
      (checkProtection === true ? 1 : 0) +
      (checkDesignBoundaries === true ? 1 : 0) +
      (isPixelArtMode ? (checkZeroColorLoss === true ? 1 : 0) + (checkGridAlignment === true ? 1 : 0) : 0);

    const cleanPercentage = (totalCheckCategories === 0 || is100PercentClean)
      ? 100
      : Math.max(70, Math.round((passedCheckCategories / totalCheckCategories) * 100));

    const statusText = is100PercentClean
      ? '100% CLEAN'
      : `${cleanPercentage}% CLEAN — ${issuesCount} ${issuesCount === 1 ? 'EDGE ISSUE' : 'EDGE ISSUES'}`;

    return {
      is100PercentClean,
      cleanPercentage,
      statusText,
      issuesCount,
      checks: {
        outside: checkOutside,
        edges: checkEdges,
        noise: checkNoise,
        protection: checkProtection,
        designBoundaries: checkDesignBoundaries,
        zeroColorLoss: checkZeroColorLoss,
        gridAlignment: checkGridAlignment
      },
      issues: issues.filter(i => {
        if (!isOutsideEnabled && i.includes('Outside floating noise')) return false;
        if (!isEdgesEnabled && i.includes('Uncleaned edge fringe')) return false;
        if (!isNoiseEnabled && i.includes('Internal isolated noise')) return false;
        if (!isProtectionEnabled && i.includes('Protected cell')) return false;
        if (!isZeroColorLossEnabled && i.includes('Zero Color Loss violation')) return false;
        if (!isGridAlignmentEnabled && i.includes('Off-grid cell boundary')) return false;
        return true;
      }),
      designReports,
      detectedDesignCount: designs.length
    };
  }
}
