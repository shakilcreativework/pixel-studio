/**
 * PixelEditor.js
 * In-browser pixel manipulation tools: Pencil, Eraser, Flood Fill, Color Picker,
 * Rectangle, and Bresenham Line.
 * Edits modify the PixelGrid instance directly without touching source image.
 */

export class PixelEditor {
  /**
   * Draw with pencil / brush on PixelGrid.
   */
  static drawPencil(grid, x, y, paletteIndex, brushSize = 1, alpha = 255) {
    const half = Math.floor(brushSize / 2);
    let changed = false;

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < grid.width && py >= 0 && py < grid.height) {
          grid.setPixelIndex(px, py, paletteIndex, alpha);
          changed = true;
        }
      }
    }
    return changed;
  }

  /**
   * Erase pixels (sets alpha to 0).
   */
  static erase(grid, x, y, brushSize = 1) {
    const half = Math.floor(brushSize / 2);
    let changed = false;

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < grid.width && py >= 0 && py < grid.height) {
          const idx = grid.getIndex(px, py);
          if (idx !== -1) {
            grid.alpha[idx] = 0;
            changed = true;
          }
        }
      }
    }
    return changed;
  }

  /**
   * 4-way Flood Fill using Breadth-First Search (BFS).
   */
  static floodFill(grid, startX, startY, targetPaletteIndex, targetAlpha = 255) {
    if (startX < 0 || startX >= grid.width || startY < 0 || startY >= grid.height) {
      return false;
    }

    const startIdx = grid.getIndex(startX, startY);
    const sourceIndex = grid.indexes[startIdx];
    const sourceAlpha = grid.alpha[startIdx];

    // If already matching, nothing to do
    if (sourceIndex === targetPaletteIndex && sourceAlpha === targetAlpha) {
      return false;
    }

    const queue = [[startX, startY]];
    const visited = new Uint8Array(grid.width * grid.height);
    visited[startIdx] = 1;

    grid.setPixelIndex(startX, startY, targetPaletteIndex, targetAlpha);

    const neighbors = [
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
          const nIdx = grid.getIndex(nx, ny);
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            if (grid.indexes[nIdx] === sourceIndex && grid.alpha[nIdx] === sourceAlpha) {
              grid.setPixelIndex(nx, ny, targetPaletteIndex, targetAlpha);
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Bresenham Line Drawing Algorithm.
   */
  static drawLine(grid, x0, y0, x1, y1, paletteIndex, brushSize = 1, alpha = 255) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    let changed = false;

    while (true) {
      this.drawPencil(grid, cx, cy, paletteIndex, brushSize, alpha);
      changed = true;

      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }

    return changed;
  }

  /**
   * Rectangle Drawing (filled or outline).
   */
  static drawRect(grid, x0, y0, x1, y1, paletteIndex, fill = true, brushSize = 1, alpha = 255) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    let changed = false;

    if (fill) {
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          grid.setPixelIndex(px, py, paletteIndex, alpha);
          changed = true;
        }
      }
    } else {
      this.drawLine(grid, minX, minY, maxX, minY, paletteIndex, brushSize, alpha);
      this.drawLine(grid, maxX, minY, maxX, maxY, paletteIndex, brushSize, alpha);
      this.drawLine(grid, maxX, maxY, minX, maxY, paletteIndex, brushSize, alpha);
      this.drawLine(grid, minX, maxY, minX, minY, paletteIndex, brushSize, alpha);
      changed = true;
    }

    return changed;
  }
}
