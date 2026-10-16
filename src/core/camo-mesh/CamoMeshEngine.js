/**
 * CamoMeshEngine.js
 * Independent Camouflage Mesh Generation Engine with transparent background support.
 */

export class CamoMeshEngine {
  static process(sourceImage, options = {}) {
    const {
      regions = 150,
      dotSize = 14,
      warp = 0.5,
      variance = 0.4,
      darkShade = '#1e293b',
      lightShade = '#64748b',
      transparentBg = true,
      bgColor = '#0f172a'
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const cells = [];
    for (let i = 0; i < regions; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const idx = (Math.min(height - 1, Math.max(0, Math.floor(y))) * width + Math.min(width - 1, Math.max(0, Math.floor(x)))) * 4;
      const r = srcData[idx] || 0;
      const g = srcData[idx + 1] || 0;
      const b = srcData[idx + 2] || 0;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const sizeVar = (1 + (Math.random() - 0.5) * variance) * dotSize;
      const isDark = lum < 0.5;

      cells.push({
        x,
        y,
        size: Math.max(2, sizeVar),
        color: isDark ? darkShade : lightShade,
        lum,
        warpFactor: (Math.random() - 0.5) * warp * 20
      });
    }

    return {
      width,
      height,
      transparentBg,
      bgColor,
      cells
    };
  }

  static renderToCanvas(result, ctx) {
    const { width, height, transparentBg, bgColor, cells } = result;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    for (const cell of cells) {
      ctx.save();
      ctx.fillStyle = cell.color;
      ctx.beginPath();

      const r = cell.size;
      const wx = Math.max(r, Math.min(width - r, cell.x + cell.warpFactor));
      const wy = Math.max(r, Math.min(height - r, cell.y + cell.warpFactor));

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const rad = r + Math.sin(angle * 3 + cell.warpFactor) * (r * 0.2);
        const px = wx + rad * Math.cos(angle);
        const py = wy + rad * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
