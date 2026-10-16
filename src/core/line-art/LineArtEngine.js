/**
 * LineArtEngine.js
 * Independent Line Art Extraction Engine using Sobel Edge Detection and adaptive thresholding.
 */

export class LineArtEngine {
  static process(sourceImage, options = {}) {
    const {
      sensitivity = 50, // 1 to 100
      lineThickness = 1, // 1 to 5
      invert = false,
      lineColor = '#000000',
      bgColor = '#ffffff',
      transparentBg = false
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    // Convert to grayscale luminance
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
    }

    // Sobel Edge Filter
    const edges = new Uint8Array(width * height);
    const threshold = (100 - sensitivity) * 2.5;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Sobel horizontal & vertical gradients
        const gx =
          -1 * gray[(y - 1) * width + (x - 1)] +
           1 * gray[(y - 1) * width + (x + 1)] +
          -2 * gray[y * width + (x - 1)] +
           2 * gray[y * width + (x + 1)] +
          -1 * gray[(y + 1) * width + (x - 1)] +
           1 * gray[(y + 1) * width + (x + 1)];

        const gy =
          -1 * gray[(y - 1) * width + (x - 1)] +
          -2 * gray[(y - 1) * width + x] +
          -1 * gray[(y - 1) * width + (x + 1)] +
           1 * gray[(y + 1) * width + (x - 1)] +
           2 * gray[(y + 1) * width + x] +
           1 * gray[(y + 1) * width + (x + 1)];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > threshold ? 255 : 0;
      }
    }

    return {
      width,
      height,
      edges,
      lineThickness,
      invert,
      lineColor,
      bgColor,
      transparentBg
    };
  }

  static renderToCanvas(result, ctx) {
    const { width, height, edges, lineThickness, invert, lineColor, bgColor, transparentBg } = result;

    if (!transparentBg) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.fillStyle = lineColor;
    const r = Math.max(1, lineThickness);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isEdge = edges[y * width + x] === 255;
        const draw = invert ? !isEdge : isEdge;

        if (draw) {
          ctx.fillRect(x - (r - 1) / 2, y - (r - 1) / 2, r, r);
        }
      }
    }
  }
}
