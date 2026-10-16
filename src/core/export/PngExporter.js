/**
 * PngExporter.js
 * Crisp PNG and JPEG export with nearest-neighbor scaling and transparency preservation.
 */

export class PngExporter {
  /**
   * Export PixelGrid to PNG Blob.
   * @param {PixelGrid} grid
   * @param {Object} options
   */
  static exportPixelArtToBlob(grid, options = {}) {
    const {
      scale = 1,
      targetWidth = null,
      targetHeight = null,
      transparentBg = true,
      bgColor = '#ffffff',
      format = 'image/png', // 'image/png' or 'image/jpeg'
      quality = 0.95
    } = options;

    const targetW = Number(targetWidth);
    const targetH = Number(targetHeight);
    const baseW = targetW || (grid.width * 10);
    const baseH = targetH || (grid.height * 10);

    const outWidth = Math.round(baseW * scale);
    const outHeight = Math.round(baseH * scale);
    const cellW = outWidth / grid.width;
    const cellH = outHeight / grid.height;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');

    // Disable image smoothing for sharp crisp pixel edges
    ctx.imageSmoothingEnabled = false;

    // If JPEG or transparentBg is disabled, fill background
    if (!transparentBg || format === 'image/jpeg') {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, outWidth, outHeight);
    } else {
      ctx.clearRect(0, 0, outWidth, outHeight);
    }

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const pixel = grid.getPixel(x, y);
        if (!pixel || pixel.a < 10) continue;

        ctx.fillStyle = `rgba(${pixel.r},${pixel.g},${pixel.b},${pixel.a / 255})`;
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, quality);
    });
  }

  /**
   * Export an existing canvas element to PNG / JPEG with transparent background handling.
   */
  static exportCanvasToBlob(srcCanvas, options = {}) {
    const {
      scale = 1,
      transparentBg = true,
      bgColor = '#ffffff',
      format = 'image/png',
      quality = 0.95
    } = options;

    const outWidth = srcCanvas.width * scale;
    const outHeight = srcCanvas.height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    if (!transparentBg || format === 'image/jpeg') {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, outWidth, outHeight);
    } else {
      ctx.clearRect(0, 0, outWidth, outHeight);
    }

    ctx.drawImage(srcCanvas, 0, 0, outWidth, outHeight);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, quality);
    });
  }

  /**
   * Trigger direct browser download of a Blob or string.
   */
  static downloadFile(data, filename, mimeType = 'image/png') {
    let blob = data;
    if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
