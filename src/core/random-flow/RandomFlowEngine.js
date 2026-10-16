/**
 * RandomFlowEngine.js
 * Independent Random Flow Generation Engine with transparent background support.
 */

export class RandomFlowEngine {
  static process(sourceImage, options = {}) {
    const {
      particleCount = 1200,
      stepSize = 4,
      maxSteps = 30,
      noiseScale = 0.005,
      strokeWidth = 2,
      colorMode = 'original',
      lineColor = '#3b82f6',
      transparentBg = true,
      bgColor = '#0f172a'
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    const paths = [];

    const pseudoNoise = (x, y) => {
      const sinVal = Math.sin(x * noiseScale * 12.9898 + y * noiseScale * 78.233);
      return (sinVal * 43758.5453) % 1;
    };

    for (let i = 0; i < particleCount; i++) {
      let px = Math.random() * width;
      let py = Math.random() * height;
      const points = [{ x: px, y: py }];

      const imgIdx = (Math.floor(py) * width + Math.floor(px)) * 4;
      const r = srcData[imgIdx] || 0;
      const g = srcData[imgIdx + 1] || 0;
      const b = srcData[imgIdx + 2] || 0;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const pathColor = colorMode === 'original' ? `rgb(${r},${g},${b})` : lineColor;

      for (let s = 0; s < maxSteps; s++) {
        const angle = pseudoNoise(px, py) * Math.PI * 4 + (1 - lum) * Math.PI;
        px += Math.cos(angle) * stepSize;
        py += Math.sin(angle) * stepSize;

        if (px < 0 || px >= width || py < 0 || py >= height) break;
        points.push({ x: px, y: py });
      }

      if (points.length > 2) {
        paths.push({ points, color: pathColor, width: strokeWidth });
      }
    }

    return {
      width,
      height,
      transparentBg,
      bgColor,
      paths
    };
  }

  static renderToCanvas(result, ctx) {
    const { width, height, transparentBg, bgColor, paths } = result;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }
}
