/**
 * AutoFitStockEngine.js
 * 
 * Aspect-Ratio Locked & Zero-Crop Microstock Resolution Engine.
 * Scales image/artboard dimensions uniformly to satisfy microstock
 * submission guidelines (min 4.0 Megapixels, Adobe Stock / Shutterstock standard)
 * without cropping any design content or distorting aspect ratio.
 */

export class AutoFitStockEngine {
  /**
   * Minimum stock megapixel requirement (Adobe Stock / Shutterstock standard).
   */
  static MIN_STOCK_MEGAPIXELS = 4.0;
  static MAX_STOCK_MEGAPIXELS = 100.0;
  static MAX_DOCUMENT_DIMENSION = 8192;

  /**
   * Calculate uniform aspect-ratio locked scale factor for target megapixels.
   * Zero-crop guarantee: 100% of the image design content is preserved.
   * 
   * @param {number} width - Original artwork width in pixels
   * @param {number} height - Original artwork height in pixels
   * @param {number} [targetMinMP=4.0] - Target minimum megapixels
   * @returns {Object} Fit result containing scaleMultiplier, targetWidth, targetHeight, megaPixels, and aspect ratio
   */
  static calculateStockScale(width, height, targetMinMP = AutoFitStockEngine.MIN_STOCK_MEGAPIXELS) {
    const w = Math.max(1, Number(width) || 1000);
    const h = Math.max(1, Number(height) || 1000);

    const currentPixels = w * h;
    const currentMP = Number((currentPixels / 1000000).toFixed(2));
    const targetPixels = targetMinMP * 1000000;

    let scaleMultiplier = 1.0;
    let dimensionLimited = false;

    if (currentPixels < targetPixels) {
      // Calculate uniform scale multiplier to hit or exceed target megapixels
      const exactMultiplier = Math.sqrt(targetPixels / currentPixels);
      // Round up slightly to guarantee hitting targetMinMP threshold cleanly
      scaleMultiplier = Number((Math.ceil(exactMultiplier * 100) / 100).toFixed(2));
    }

    // Respect the document limit without independently clamping width/height,
    // which would distort very wide or tall artwork.
    const maxDimensionScale = AutoFitStockEngine.MAX_DOCUMENT_DIMENSION / Math.max(w, h);
    if (scaleMultiplier > 1 && maxDimensionScale < scaleMultiplier) {
      scaleMultiplier = maxDimensionScale;
      dimensionLimited = true;
    }

    const targetWidth = Math.round(w * scaleMultiplier);
    const targetHeight = Math.round(h * scaleMultiplier);
    const targetMP = Number(((targetWidth * targetHeight) / 1000000).toFixed(2));

    const aspectRatio = w / h;
    const isCompliant = targetMP >= targetMinMP && targetMP <= AutoFitStockEngine.MAX_STOCK_MEGAPIXELS;

    return {
      originalWidth: w,
      originalHeight: h,
      scaleMultiplier,
      targetWidth,
      targetHeight,
      originalMP: currentMP,
      targetMP,
      aspectRatio,
      aspectRatioFormatted: `${w}:${h}`,
      isCompliant,
      zeroCropGuaranteed: true,
      dimensionLimited
    };
  }

  /**
   * Generate complete machine-checkable stock fit audit report.
   * 
   * @param {Object} options 
   * @param {number} options.width 
   * @param {number} options.height 
   * @param {number} [options.targetMinMP=4.0] 
   * @returns {Object} Comprehensive audit report
   */
  static getAuditReport(options = {}) {
    const { width = 1920, height = 1080, targetMinMP = 4.0 } = options;
    const fitData = AutoFitStockEngine.calculateStockScale(width, height, targetMinMP);

    const findings = [];
    const passed = fitData.originalMP >= targetMinMP;

    if (passed) {
      findings.push({
        severity: 'success',
        category: 'Stock Resolution Compliance',
        message: `Artboard dimension ${fitData.originalWidth} × ${fitData.originalHeight} (${fitData.originalMP} MP) already satisfies Adobe Stock 4.0 MP minimum threshold.`
      });
    } else {
      findings.push({
        severity: 'info',
        category: 'Auto-Scale Recommendation',
        message: `Original artwork is ${fitData.originalMP} MP. 1-Click Auto-Fit will scale dimensions by ${fitData.scaleMultiplier}× to ${fitData.targetWidth} × ${fitData.targetHeight} (${fitData.targetMP} MP) with zero cropping and locked aspect ratio.`
      });
    }

    return {
      fitData,
      passed,
      badgeText: passed
        ? `${fitData.originalMP} MP ✓ Stock Ready`
        : `${fitData.originalMP} MP ⚠️ Auto-Fit Recommended (${fitData.scaleMultiplier}×)`,
      findings
    };
  }
}
