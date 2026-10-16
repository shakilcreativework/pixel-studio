/**
 * PixelGrid.js
 * High-performance typed-array data model for Pixel Art.
 * Stores palette indexes and alpha masks independently for fixed-grid discrete cells.
 */

export class PixelGrid {
  constructor(width, height, palette = []) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.palette = Array.isArray(palette) ? [...palette] : [];
    
    const size = this.width * this.height;
    this.indexes = new Uint16Array(size);
    this.alpha = new Uint8Array(size).fill(255);
  }

  /**
   * Get 1D index from (x, y) coordinates.
   */
  getIndex(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return y * this.width + x;
  }

  /**
   * Get pixel RGBA and palette index at (x, y).
   */
  getPixel(x, y) {
    const idx = this.getIndex(x, y);
    if (idx === -1) return null;
    const palIdx = this.indexes[idx];
    const color = this.palette[palIdx] || [0, 0, 0, 255];
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      a: this.alpha[idx],
      paletteIndex: palIdx
    };
  }

  /**
   * Set pixel using a palette index.
   */
  setPixelIndex(x, y, paletteIndex, alpha = 255) {
    const idx = this.getIndex(x, y);
    if (idx === -1) return false;
    this.indexes[idx] = paletteIndex;
    this.alpha[idx] = Math.max(0, Math.min(255, alpha));
    return true;
  }

  /**
   * Clone the current PixelGrid.
   */
  clone() {
    const copy = new PixelGrid(this.width, this.height, this.palette.map(c => [...c]));
    copy.indexes.set(this.indexes);
    copy.alpha.set(this.alpha);
    return copy;
  }

  /**
   * Convert to ImageData for instant canvas rendering.
   */
  toImageData(ctx) {
    const imgData = ctx ? ctx.createImageData(this.width, this.height) : new ImageData(this.width, this.height);
    const data = imgData.data;
    const size = this.width * this.height;

    for (let i = 0; i < size; i++) {
      const palIdx = this.indexes[i];
      const color = this.palette[palIdx] || [0, 0, 0, 255];
      const offset = i * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = this.alpha[i];
    }
    return imgData;
  }

  /**
   * Export to serializable object.
   */
  toJSON() {
    return {
      version: 1,
      width: this.width,
      height: this.height,
      palette: this.palette,
      indexes: Array.from(this.indexes),
      alpha: Array.from(this.alpha)
    };
  }

  /**
   * Load from serialized JSON object.
   */
  static fromJSON(data) {
    if (!data || !data.width || !data.height) {
      throw new Error("Invalid PixelGrid JSON payload");
    }
    const grid = new PixelGrid(data.width, data.height, data.palette || []);
    if (data.indexes) {
      grid.indexes.set(data.indexes);
    }
    if (data.alpha) {
      grid.alpha.set(data.alpha);
    }
    return grid;
  }
}
