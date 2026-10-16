/**
 * ColorSampling.js
 * Advanced color space conversions (sRGB, Linear RGB, OKLab) and
 * pixel-art cell sampling strategies (Average, Median, Dominant, Perceptual OKLab).
 */

// sRGB [0..255] to Linear RGB [0..1]
function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Linear RGB [0..1] to sRGB [0..255]
function linearToSrgb(c) {
  const v = Math.max(0, Math.min(1, c));
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

// RGB [0..255] -> OKLab { L, a, b }
export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  };
}

// OKLab { L, a, b } -> RGB [0..255]
export function oklabToRgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// Perceptual OKLab Color Distance ΔE
export function oklabDistance(ok1, ok2) {
  const dL = ok1.L - ok2.L;
  const da = ok1.a - ok2.a;
  const db = ok1.b - ok2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// RGB Euclidean distance squared
export function rgbDistanceSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Sample a rectangular cell region from an RGBA buffer.
 * Supports shared Pixel Art and Mosaic sampling algorithms:
 *   - 'perceptual-oklab' / 'perceptual': OKLab Perceptual Area Weighted
 *   - 'contrast-aware': Edge-Preserving Contrast Weighting
 *   - 'gaussian-weighted': 2D Gaussian Bell-Curve Footprint
 *   - 'median': Median Filter (Impulse Noise Rejection)
 *   - 'dominant-mode' / 'dominant': 5-Bit Modal Frequency Bucket
 *   - 'center-exact' / 'center': 1:1 Exact Geometric Center Point
 *   - 'average': Standard Uniform Arithmetic Mean
 */
export function sampleCellColor(
  srcData,
  srcWidth,
  srcHeight,
  startX,
  startY,
  endX,
  endY,
  method = 'perceptual',
  _options = {}
) {
  const clampedStartX = Math.max(0, Math.floor(startX));
  const clampedStartY = Math.max(0, Math.floor(startY));
  const clampedEndX = Math.min(srcWidth, Math.ceil(endX));
  const clampedEndY = Math.min(srcHeight, Math.ceil(endY));

  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const icx = Math.min(srcWidth - 1, Math.max(0, Math.floor(centerX)));
  const icy = Math.min(srcHeight - 1, Math.max(0, Math.floor(centerY)));

  // Fast-Path: 1:1 Exact Center Point Sampling
  if (method === 'center' || method === 'center-exact') {
    const centerIdx = (icy * srcWidth + icx) * 4;
    return {
      r: srcData[centerIdx],
      g: srcData[centerIdx + 1],
      b: srcData[centerIdx + 2],
      a: srcData[centerIdx + 3]
    };
  }

  const boxW = Math.max(1, clampedEndX - clampedStartX);
  const boxH = Math.max(1, clampedEndY - clampedStartY);

  // Collect valid pixels
  const pixels = [];
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
  let count = 0;

  for (let py = clampedStartY; py < clampedEndY; py++) {
    for (let px = clampedStartX; px < clampedEndX; px++) {
      const idx = (py * srcWidth + px) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const a = srcData[idx + 3];

      totalA += a;
      count++;

      if (a >= 10) {
        pixels.push({ px, py, r, g, b, a });
        totalR += r;
        totalG += g;
        totalB += b;
      }
    }
  }

  if (count === 0 || pixels.length === 0) {
    const centerIdx = (icy * srcWidth + icx) * 4;
    return {
      r: srcData[centerIdx] || 0,
      g: srcData[centerIdx + 1] || 0,
      b: srcData[centerIdx + 2] || 0,
      a: count > 0 ? Math.round(totalA / count) : 0
    };
  }

  const avgAlpha = Math.round(totalA / count);
  if (avgAlpha < 10) {
    return { r: 0, g: 0, b: 0, a: avgAlpha };
  }

  // 1. Median Filtering
  if (method === 'median') {
    const rSorted = pixels.map(p => p.r).sort((a, b) => a - b);
    const gSorted = pixels.map(p => p.g).sort((a, b) => a - b);
    const bSorted = pixels.map(p => p.b).sort((a, b) => a - b);
    const mid = Math.floor(pixels.length / 2);
    return {
      r: rSorted[mid],
      g: gSorted[mid],
      b: bSorted[mid],
      a: avgAlpha
    };
  }

  // 2. Dominant Modal Frequency Bucket
  if (method === 'dominant' || method === 'dominant-mode') {
    const colorMap = new Map();
    for (const p of pixels) {
      const key = ((p.r >> 3) << 10) | ((p.g >> 3) << 5) | (p.b >> 3);
      const entry = colorMap.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      entry.count++;
      entry.r += p.r;
      entry.g += p.g;
      entry.b += p.b;
      colorMap.set(key, entry);
    }
    let dominantEntry = null;
    for (const entry of colorMap.values()) {
      if (!dominantEntry || entry.count > dominantEntry.count) {
        dominantEntry = entry;
      }
    }
    if (dominantEntry && dominantEntry.count > 0) {
      return {
        r: Math.round(dominantEntry.r / dominantEntry.count),
        g: Math.round(dominantEntry.g / dominantEntry.count),
        b: Math.round(dominantEntry.b / dominantEntry.count),
        a: avgAlpha
      };
    }
  }

  // 3. Contrast-Aware Edge Preserving
  if (method === 'contrast-aware') {
    // Weight each pixel based on distance from local edge gradient
    let weightedR = 0, weightedG = 0, weightedB = 0, totalW = 0;
    for (const p of pixels) {
      // Calculate local neighborhood contrast
      let localContrast = 0;
      if (p.px + 1 < srcWidth && p.py + 1 < srcHeight) {
        const nIdx = (p.py * srcWidth + (p.px + 1)) * 4;
        const diffR = Math.abs(p.r - srcData[nIdx]);
        const diffG = Math.abs(p.g - srcData[nIdx + 1]);
        const diffB = Math.abs(p.b - srcData[nIdx + 2]);
        localContrast = (diffR + diffG + diffB) / 3;
      }
      const distToCenter = Math.hypot(p.px - centerX, p.py - centerY);
      const spatialW = 1.0 / (1.0 + distToCenter * 0.5);
      const weight = spatialW * (1.0 + localContrast * 0.05);

      weightedR += p.r * weight;
      weightedG += p.g * weight;
      weightedB += p.b * weight;
      totalW += weight;
    }

    if (totalW > 0) {
      return {
        r: Math.round(weightedR / totalW),
        g: Math.round(weightedG / totalW),
        b: Math.round(weightedB / totalW),
        a: avgAlpha
      };
    }
  }

  // 4. 2D Gaussian Bell-Curve Footprint
  if (method === 'gaussian-weighted') {
    const sigma = Math.max(0.7, (Math.max(boxW, boxH) / 2.5));
    const twoSigmaSq = 2 * sigma * sigma;
    let wR = 0, wG = 0, wB = 0, wSum = 0;

    for (const p of pixels) {
      const dx = p.px - centerX;
      const dy = p.py - centerY;
      const weight = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq);

      wR += p.r * weight;
      wG += p.g * weight;
      wB += p.b * weight;
      wSum += weight;
    }

    if (wSum > 0) {
      return {
        r: Math.round(wR / wSum),
        g: Math.round(wG / wSum),
        b: Math.round(wB / wSum),
        a: avgAlpha
      };
    }
  }

  // 5. Perceptual OKLab Area Weighted (Default High-Fidelity)
  if (method === 'perceptual' || method === 'perceptual-oklab') {
    let okLSum = 0, okaSum = 0, okbSum = 0;
    for (const p of pixels) {
      const ok = rgbToOklab(p.r, p.g, p.b);
      okLSum += ok.L;
      okaSum += ok.a;
      okbSum += ok.b;
    }
    const avgL = okLSum / pixels.length;
    const avga = okaSum / pixels.length;
    const avgb = okbSum / pixels.length;
    const [r, g, b] = oklabToRgb(avgL, avga, avgb);
    return { r, g, b, a: avgAlpha };
  }

  // 6. Fallback / Standard Area Average
  return {
    r: Math.round(totalR / pixels.length),
    g: Math.round(totalG / pixels.length),
    b: Math.round(totalB / pixels.length),
    a: avgAlpha
  };
}
