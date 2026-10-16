/**
 * MosaicStrategyDetector.js
 * Intelligent Strategy Recommendation Engine for Auto Detect.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Master Specification.
 *
 * Primary Purpose:
 *   Analyzes artwork characteristics (island count, scale confidence, detail variance)
 *   and recommends the optimal Mosaic vectorization strategy.
 *
 * Guaranteed Behavior:
 *   Returns a recommendation object without silently overriding manual user selection.
 */

import { SpriteIslandEngine } from './SpriteIslandEngine.js';
import { PixelArtResampler } from './PixelArtResampler.js';

export class MosaicStrategyDetector {
  /**
   * Analyze artwork and return strategy recommendation.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { recommendedStrategy, badgeLabel, rationale, confidence }
   */
  static analyze(sourceImage, options = {}) {
    // 1. Analyze Sprite Islands & Component Counts
    const islandRes = SpriteIslandEngine.process(sourceImage, {
      tileSize: options.tileSize || 4,
      minIslandSize: 4
    });

    const islandCount = islandRes.stats.totalIslands;

    // 2. Analyze Integer Scale Confidence
    const scaleRes = PixelArtResampler.detectScale(sourceImage);

    // 3. Recommendation Heuristics
    if (islandCount > 1) {
      return {
        recommendedStrategy: 'island-grid',
        badgeLabel: `Recommended: Multi-Sprite Island Grid (${islandCount} Islands)`,
        rationale: `Detected ${islandCount} independent sprite objects requiring multi-phase local grid alignment.`,
        confidence: 0.95
      };
    }

    if (scaleRes.confidence > 0.6 && scaleRes.detectedScale > 1) {
      return {
        recommendedStrategy: 'integer-resample',
        badgeLabel: `Recommended: Native Integer Resampler (${scaleRes.detectedScale}x)`,
        rationale: `Detected uniform ${scaleRes.detectedScale}x integer scale with ${(scaleRes.confidence * 100).toFixed(0)}% confidence.`,
        confidence: scaleRes.confidence
      };
    }

    if (options.sourceArtType === 'normal') {
      // Analyze gradient continuity vs high-contrast ridges
      const width = sourceImage.width;
      const height = sourceImage.height;
      const data = sourceImage.data;
      let highEdgeCount = 0;
      let smoothGradientSteps = 0;
      let totalTests = 0;

      for (let y = 10; y < height - 10; y += Math.max(1, Math.floor(height / 20))) {
        for (let x = 10; x < width - 10; x += Math.max(1, Math.floor(width / 20))) {
          const idx = (y * width + x) * 4;
          const rIdx = (y * width + (x + 2)) * 4;
          const diff = Math.abs(data[idx] - data[rIdx]) +
                       Math.abs(data[idx + 1] - data[rIdx + 1]) +
                       Math.abs(data[idx + 2] - data[rIdx + 2]);
          totalTests++;
          if (diff > 80) highEdgeCount++;
          else if (diff > 5 && diff <= 40) smoothGradientSteps++;
        }
      }

      if (highEdgeCount > totalTests * 0.15) {
        return {
          recommendedStrategy: 'contrast-edge',
          badgeLabel: 'Recommended: Contrast-Aware Ridge & Silhouette',
          rationale: 'Prominent silhouette ridges and high-contrast boundaries detected. Prevents color bleed along edges.',
          confidence: 0.92,
          recommendedSampling: 'contrast-aware'
        };
      }

      if (smoothGradientSteps > totalTests * 0.4) {
        return {
          recommendedStrategy: 'isoline-banded',
          badgeLabel: 'Recommended: Perceptual Isoline Gradient Banding',
          rationale: 'Continuous smooth color gradients detected. Creates harmonious stepped color bands.',
          confidence: 0.90,
          recommendedSampling: 'perceptual-oklab'
        };
      }

      return {
        recommendedStrategy: 'orthogonal-contour',
        badgeLabel: 'Recommended: Direct Orthogonal Contour',
        rationale: 'Continuous shading detected; orthogonal contour tracing yields crisp geometric regions.',
        confidence: 0.85,
        recommendedSampling: 'perceptual-oklab'
      };
    }

    return {
      recommendedStrategy: 'default-pixel-art',
      badgeLabel: 'Recommended: Default Pixel Art',
      rationale: 'Standard single-grid pixel art asset matching baseline 5-stage processing.',
      confidence: 0.95,
      recommendedSampling: 'perceptual-oklab'
    };
  }
}
