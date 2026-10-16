/**
 * HalftoneEngine.js
 * Independent Halftone Generation Engine.
 * Supports Square, Hexagonal, and Radial dot grids with various geometric shapes.
 * Transparent background supported by default.
 */


export class HalftoneEngine {
  static process(sourceImage, options = {}) {
    const {
      gridType = 'square', // 'square', 'hexagonal', 'radial'
      gridSpacing = 12,
      gridAngle = 45, // in degrees
      dotRadius = 6,
      shape = 'circle', // 'circle', 'square', 'diamond', 'hexagon', 'triangle'
      hollow = false,
      colorMode = 'monochrome', // 'monochrome', 'original'
      dotColor = '#000000',
      transparentBg = true,
      bgColor = '#ffffff',
      inverted = false,
      gamma = 1.0
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const items = [];
    const radAngle = (gridAngle * Math.PI) / 180;
    const cosA = Math.cos(radAngle);
    const sinA = Math.sin(radAngle);

    const diag = Math.sqrt(width * width + height * height);
    const step = Math.max(4, gridSpacing);

    if (gridType === 'radial') {
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) / 2;
      const ringCount = Math.floor(maxR / step);

      for (let r = 1; r <= ringCount; r++) {
        const radius = r * step;
        const circumference = 2 * Math.PI * radius;
        const count = Math.max(6, Math.floor(circumference / step));

        for (let i = 0; i < count; i++) {
          const theta = (i / count) * 2 * Math.PI;
          const x = cx + radius * Math.cos(theta);
          const y = cy + radius * Math.sin(theta);

          if (x >= 0 && x <= width && y >= 0 && y <= height) {
            this._sampleAndPushDot(items, srcData, width, height, x, y, dotRadius, shape, hollow, colorMode, dotColor, inverted, gamma);
          }
        }
      }
    } else {
      // Square or Hexagonal Grid
      const start = -diag;
      const end = diag * 2;
      let rowIndex = 0;

      for (let gy = start; gy < end; gy += step) {
        const isHex = gridType === 'hexagonal';
        const xOffset = isHex && (rowIndex % 2 !== 0) ? step / 2 : 0;

        for (let gx = start; gx < end; gx += step) {
          const rotX = (gx + xOffset) * cosA - gy * sinA + width / 2;
          const rotY = (gx + xOffset) * sinA + gy * cosA + height / 2;

          if (rotX >= 0 && rotX <= width && rotY >= 0 && rotY <= height) {
            this._sampleAndPushDot(items, srcData, width, height, rotX, rotY, dotRadius, shape, hollow, colorMode, dotColor, inverted, gamma);
          }
        }
        rowIndex++;
      }
    }

    return {
      width,
      height,
      transparentBg,
      bgColor,
      items
    };
  }

  static _sampleAndPushDot(items, srcData, width, height, x, y, maxDotRadius, shape, hollow, colorMode, dotColor, inverted, gamma) {
    const px = Math.min(width - 1, Math.max(0, Math.floor(x)));
    const py = Math.min(height - 1, Math.max(0, Math.floor(y)));
    const idx = (py * width + px) * 4;

    const r = srcData[idx] || 0;
    const g = srcData[idx + 1] || 0;
    const b = srcData[idx + 2] || 0;
    const a = srcData[idx + 3] || 255;

    if (a < 10) return;

    let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (gamma !== 1.0) lum = Math.pow(lum, gamma);

    const factor = inverted ? lum : 1 - lum;
    const radius = Math.max(0.5, factor * maxDotRadius);

    let color = dotColor;
    if (colorMode === 'original') {
      color = `rgb(${r},${g},${b})`;
    }

    if (radius >= 0.8) {
      items.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        radius: Math.round(radius * 10) / 10,
        shape,
        hollow,
        color,
        alpha: a / 255
      });
    }
  }

  static renderToCanvas(result, ctx) {
    const { width, height, transparentBg, bgColor, items } = result;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    for (const item of items) {
      ctx.save();
      ctx.fillStyle = item.color;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = item.alpha;

      ctx.beginPath();
      const { x, y, radius, shape, hollow } = item;

      if (shape === 'square') {
        const size = radius * 1.6;
        if (hollow) ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        else ctx.fillRect(x - size / 2, y - size / 2, size, size);
      } else if (shape === 'diamond') {
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius, y);
        ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius, y);
        ctx.closePath();
        if (hollow) ctx.stroke(); else ctx.fill();
      } else if (shape === 'triangle') {
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius * 0.866, y + radius * 0.5);
        ctx.lineTo(x - radius * 0.866, y + radius * 0.5);
        ctx.closePath();
        if (hollow) ctx.stroke(); else ctx.fill();
      } else {
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (hollow) ctx.stroke(); else ctx.fill();
      }

      ctx.restore();
    }
  }
}
