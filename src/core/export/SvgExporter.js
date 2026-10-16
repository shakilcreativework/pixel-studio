/**
 * SvgExporter.js
 * True vector SVG exporters for Pixel Art, Halftone, Random Flow, and Mosaic.
 * Strictly outputs vector geometry (<rect>, <circle>, <path>, <polygon>) with ZERO raster <image> embedding.
 * Default: TRANSPARENT BACKGROUND (No background <rect> is generated unless explicitly enabled by user).
 */

import { rgbToHex } from '../pixel-art/PaletteEngine.js';
import { BoundaryValidator } from '../document/BoundaryValidator.js';
import { MosaicEngine } from '../mosaic/MosaicEngine.js';

export class SvgExporter {
  /**
   * Export PixelGrid to true vector SVG string.
   * @param {PixelGrid} grid
   * @param {Object} options
   */
  static exportPixelArt(grid, options = {}) {
    const {
      mode = 'editable', // 'editable', 'optimized', 'grouped'
      transparentBg = true,
      bgColor = null,
      targetWidth = null,
      targetHeight = null
    } = options;

    const targetW = Number(targetWidth);
    const targetH = Number(targetHeight);
    const cellW = (targetW && grid.width > 0) ? (targetW / grid.width) : (options.pixelSize || 10);
    const cellH = (targetH && grid.height > 0) ? (targetH / grid.height) : (options.pixelSize || 10);

    const width = targetW || (grid.width * cellW);
    const height = targetH || (grid.height * cellH);

    const crispAttr = ' shape-rendering="crispEdges"';
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"${crispAttr}>\n`;

    // Only add background rect if explicitly requested (transparentBg is false and bgColor provided)
    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      svg += `  <rect width="${width}" height="${height}" fill="${bgColor}" />\n`;
    }

    if (mode === 'grouped' || mode === 'grouped-stock') {
      // Group rects by color + Horizontal RLE merge for Adobe Stock 1-click ungroup
      const colorGroups = new Map();

      for (let y = 0; y < grid.height; y++) {
        let runStart = 0;
        let runColorHex = null;
        let runAlpha = 0;

        for (let x = 0; x < grid.width; x++) {
          const pixel = grid.getPixel(x, y);
          const isVisible = pixel && pixel.a >= 10;
          const hex = isVisible ? rgbToHex(pixel.r, pixel.g, pixel.b) : null;
          const alpha = isVisible ? pixel.a : 0;

          if (hex !== runColorHex || alpha !== runAlpha) {
            if (runColorHex && runAlpha >= 10) {
              const runWidth = (x - runStart) * cellW;
              const opAttr = runAlpha < 255 ? (runAlpha / 255).toFixed(2) : '1';
              const key = `${runColorHex}_${opAttr}`;
              if (!colorGroups.has(key)) {
                colorGroups.set(key, { hex: runColorHex, opacity: opAttr, rects: [] });
              }
              const clamped = BoundaryValidator.clampRect(runStart * cellW, y * cellH, runWidth, cellH, width, height);
              colorGroups.get(key).rects.push(clamped);
            }
            runStart = x;
            runColorHex = hex;
            runAlpha = alpha;
          }
        }

        if (runColorHex && runAlpha >= 10) {
          const runWidth = (grid.width - runStart) * cellW;
          const opAttr = runAlpha < 255 ? (runAlpha / 255).toFixed(2) : '1';
          const key = `${runColorHex}_${opAttr}`;
          if (!colorGroups.has(key)) {
            colorGroups.set(key, { hex: runColorHex, opacity: opAttr, rects: [] });
          }
          const clamped = BoundaryValidator.clampRect(runStart * cellW, y * cellH, runWidth, cellH, width, height);
          colorGroups.get(key).rects.push(clamped);
        }
      }

      svg += `  <g id="pixel-artwork">\n`;
      let layerIdx = 1;
      for (const group of colorGroups.values()) {
        const cleanHex = group.hex.replace(/[^a-zA-Z0-9]/g, '');
        const opAttr = group.opacity !== '1' ? ` opacity="${group.opacity}"` : '';
        svg += `    <g id="layer-${layerIdx}-color-${cleanHex}" fill="${group.hex}"${opAttr}>\n`;
        for (const r of group.rects) {
          svg += `      <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" />\n`;
        }
        svg += `    </g>\n`;
        layerIdx++;
      }
      svg += `  </g>\n`;
    } else if (mode === 'objects' || mode === 'objects-stock') {
      // Group by connected islands/objects
      const visited = Array.from({ length: grid.height }, () => new Uint8Array(grid.width));
      const islands = [];

      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const p = grid.getPixel(x, y);
          if (!p || p.a < 10 || visited[y][x]) continue;

          const island = [];
          const queue = [[x, y]];
          visited[y][x] = 1;

          while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const currPixel = grid.getPixel(cx, cy);
            island.push({ x: cx, y: cy, pixel: currPixel });

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height && !visited[ny][nx]) {
                  const np = grid.getPixel(nx, ny);
                  if (np && np.a >= 10) {
                    visited[ny][nx] = 1;
                    queue.push([nx, ny]);
                  }
                }
              }
            }
          }

          if (island.length > 0) islands.push(island);
        }
      }

      svg += `  <g id="pixel-artwork">\n`;
      islands.forEach((island, idx) => {
        svg += `    <g id="design-element-${idx + 1}">\n`;
        const colorMap = new Map();
        for (const item of island) {
          const hex = rgbToHex(item.pixel.r, item.pixel.g, item.pixel.b);
          const op = item.pixel.a < 255 ? (item.pixel.a / 255).toFixed(2) : '1';
          const key = `${hex}_${op}`;
          if (!colorMap.has(key)) colorMap.set(key, { hex, op, items: [] });
          colorMap.get(key).items.push(item);
        }

        for (const group of colorMap.values()) {
          const cleanHex = group.hex.replace(/[^a-zA-Z0-9]/g, '');
          const opAttr = group.op !== '1' ? ` opacity="${group.op}"` : '';
          svg += `      <g id="element-${idx + 1}-color-${cleanHex}" fill="${group.hex}"${opAttr}>\n`;
          group.items.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
          let run = null;
          for (const item of group.items) {
            if (!run) {
              run = { x: item.x * cellW, y: item.y * cellH, gridY: item.y, gridX: item.x, width: cellW };
            } else if (item.y === run.gridY && item.x === run.gridX + Math.round(run.width / cellW)) {
              run.width += cellW;
            } else {
              svg += `        <rect x="${run.x}" y="${run.y}" width="${run.width}" height="${cellH}" />\n`;
              run = { x: item.x * cellW, y: item.y * cellH, gridY: item.y, gridX: item.x, width: cellW };
            }
          }
          if (run) {
            svg += `        <rect x="${run.x}" y="${run.y}" width="${run.width}" height="${cellH}" />\n`;
          }
          svg += `      </g>\n`;
        }
        svg += `    </g>\n`;
      });
      svg += `  </g>\n`;
    } else if (mode === 'optimized') {
      // Horizontal run-length contiguous merge
      svg += `  <g id="pixel-artwork">\n`;
      for (let y = 0; y < grid.height; y++) {
        let runStart = 0;
        let runColorHex = null;
        let runAlpha = 0;

        for (let x = 0; x < grid.width; x++) {
          const pixel = grid.getPixel(x, y);
          const isVisible = pixel && pixel.a >= 10;
          const hex = isVisible ? rgbToHex(pixel.r, pixel.g, pixel.b) : null;
          const alpha = isVisible ? pixel.a : 0;

          if (hex !== runColorHex || alpha !== runAlpha) {
            if (runColorHex && runAlpha >= 10) {
              const runWidth = (x - runStart) * cellW;
              const opAttr = runAlpha < 255 ? ` opacity="${(runAlpha / 255).toFixed(2)}"` : '';
              const clamped = BoundaryValidator.clampRect(runStart * cellW, y * cellH, runWidth, cellH, width, height);
              svg += `    <rect x="${clamped.x}" y="${clamped.y}" width="${clamped.width}" height="${clamped.height}" fill="${runColorHex}"${opAttr} />\n`;
            }
            runStart = x;
            runColorHex = hex;
            runAlpha = alpha;
          }
        }

        if (runColorHex && runAlpha >= 10) {
          const runWidth = (grid.width - runStart) * cellW;
          const opAttr = runAlpha < 255 ? ` opacity="${(runAlpha / 255).toFixed(2)}"` : '';
          const clamped = BoundaryValidator.clampRect(runStart * cellW, y * cellH, runWidth, cellH, width, height);
          svg += `    <rect x="${clamped.x}" y="${clamped.y}" width="${clamped.width}" height="${clamped.height}" fill="${runColorHex}"${opAttr} />\n`;
        }
      }
      svg += `  </g>\n`;
    } else {
      // Default: Editable 1 rect per cell
      svg += `  <g id="pixel-cells">\n`;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const pixel = grid.getPixel(x, y);
          if (!pixel || pixel.a < 10) continue;

          const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
          const opAttr = pixel.a < 255 ? ` opacity="${(pixel.a / 255).toFixed(2)}"` : '';
          const clamped = BoundaryValidator.clampRect(x * cellW, y * cellH, cellW, cellH, width, height);
          svg += `    <rect x="${clamped.x}" y="${clamped.y}" width="${clamped.width}" height="${clamped.height}" fill="${hex}"${opAttr} />\n`;
        }
      }
      svg += `  </g>\n`;
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Export Halftone result to SVG
   */
  static exportHalftone(result, options = {}) {
    const { width, height, items } = result;
    const { transparentBg = true, bgColor = null } = options;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      svg += `  <rect width="${width}" height="${height}" fill="${bgColor}" />\n`;
    }

    for (const item of items) {
      const { x, y, radius, shape, hollow, color, alpha } = item;
      const op = alpha < 1 ? ` opacity="${alpha.toFixed(2)}"` : '';

      if (shape === 'square') {
        const s = radius * 1.6;
        const clamped = BoundaryValidator.clampRect(x - s / 2, y - s / 2, s, s, width, height);
        if (hollow) {
          svg += `  <rect x="${clamped.x}" y="${clamped.y}" width="${clamped.width}" height="${clamped.height}" fill="none" stroke="${color}" stroke-width="1.5"${op} />\n`;
        } else {
          svg += `  <rect x="${clamped.x}" y="${clamped.y}" width="${clamped.width}" height="${clamped.height}" fill="${color}"${op} />\n`;
        }
      } else if (shape === 'diamond') {
        const pts = `${x},${Math.max(0, y - radius)} ${Math.min(width, x + radius)},${y} ${x},${Math.min(height, y + radius)} ${Math.max(0, x - radius)},${y}`;
        if (hollow) {
          svg += `  <polygon points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"${op} />\n`;
        } else {
          svg += `  <polygon points="${pts}" fill="${color}"${op} />\n`;
        }
      } else {
        // Circle default
        const clamped = BoundaryValidator.clampCircle(x, y, radius, width, height);
        if (hollow) {
          svg += `  <circle cx="${clamped.cx}" cy="${clamped.cy}" r="${clamped.radius}" fill="none" stroke="${color}" stroke-width="1.5"${op} />\n`;
        } else {
          svg += `  <circle cx="${clamped.cx}" cy="${clamped.cy}" r="${clamped.radius}" fill="${color}"${op} />\n`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Export Random Flow paths to SVG
   */
  static exportRandomFlow(result, options = {}) {
    const { width, height, paths } = result;
    const { transparentBg = true, bgColor = null } = options;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      svg += `  <rect width="${width}" height="${height}" fill="${bgColor}" />\n`;
    }

    for (const p of paths) {
      if (!p.points || p.points.length < 2) continue;
      const validPoints = p.points.filter(pt => pt.x >= 0 && pt.x <= width && pt.y >= 0 && pt.y <= height);
      if (validPoints.length < 2) continue;

      let d = `M ${validPoints[0].x.toFixed(1)} ${validPoints[0].y.toFixed(1)}`;
      for (let i = 1; i < validPoints.length; i++) {
        d += ` L ${validPoints[i].x.toFixed(1)} ${validPoints[i].y.toFixed(1)}`;
      }
      svg += `  <path d="${d}" fill="none" stroke="${p.color}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Export Mosaic to SVG
   * Guaranteed: NO background rect unless transparentBg is false!
   * Fully supports Square, Circle, Triangle, Hexagon, and Diamond vector geometry with Adobe Stock grouping.
   */
  static exportMosaic(result, options = {}) {
    if (result.grid) {
      return MosaicEngine.exportSVG(result, options);
    }

    const { width, height, tiles = [] } = result;
    const { transparentBg = true, bgColor = null, mode = 'grouped' } = options;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (!transparentBg && bgColor && bgColor !== 'transparent') {
      svg += `  <rect width="${width}" height="${height}" fill="${bgColor}" />\n`;
    }

    const formatNum = (n) => Number(n.toFixed(2));

    if (mode === 'grouped' || mode === 'grouped-stock') {
      const colorGroups = new Map();
      for (const t of tiles) {
        const col = t.color || '#ffffff';
        if (!colorGroups.has(col)) colorGroups.set(col, []);
        colorGroups.get(col).push(t);
      }

      svg += `  <g id="mosaic-artwork">\n`;
      let layerIdx = 1;
      for (const [col, groupTiles] of colorGroups.entries()) {
        const cleanHex = col.replace(/[^a-zA-Z0-9]/g, '');
        svg += `    <g id="layer-${layerIdx}-color-${cleanHex}" fill="${col}">\n`;
        for (const t of groupTiles) {
          const half = t.size / 2;
          const op = t.alpha < 1 ? ` opacity="${formatNum(t.alpha)}"` : '';
          const rot = (t.rotation && t.rotation !== 0)
            ? ` transform="rotate(${formatNum((t.rotation * 180) / Math.PI)} ${formatNum(t.x)} ${formatNum(t.y)})"`
            : '';

          if (t.shape === 'circle') {
            const clamped = BoundaryValidator.clampCircle(t.x, t.y, half, width, height);
            svg += `      <circle cx="${formatNum(clamped.cx)}" cy="${formatNum(clamped.cy)}" r="${formatNum(clamped.radius)}"${op}${rot} />\n`;
          } else if (t.shape === 'triangle') {
            const p1 = `${formatNum(t.x)},${formatNum(t.y - half)}`;
            const p2 = `${formatNum(t.x + half)},${formatNum(t.y + half)}`;
            const p3 = `${formatNum(t.x - half)},${formatNum(t.y + half)}`;
            svg += `      <polygon points="${p1} ${p2} ${p3}"${op}${rot} />\n`;
          } else if (t.shape === 'diamond') {
            const p1 = `${formatNum(t.x)},${formatNum(t.y - half)}`;
            const p2 = `${formatNum(t.x + half)},${formatNum(t.y)}`;
            const p3 = `${formatNum(t.x)},${formatNum(t.y + half)}`;
            const p4 = `${formatNum(t.x - half)},${formatNum(t.y)}`;
            svg += `      <polygon points="${p1} ${p2} ${p3} ${p4}"${op}${rot} />\n`;
          } else if (t.shape === 'hexagon') {
            const points = [];
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              const px = formatNum(t.x + half * Math.cos(angle));
              const py = formatNum(t.y + half * Math.sin(angle));
              points.push(`${px},${py}`);
            }
            svg += `      <polygon points="${points.join(' ')}"${op}${rot} />\n`;
          } else {
            const clamped = BoundaryValidator.clampRect(t.x - half, t.y - half, t.size, t.size, width, height);
            svg += `      <rect x="${formatNum(clamped.x)}" y="${formatNum(clamped.y)}" width="${formatNum(clamped.width)}" height="${formatNum(clamped.height)}"${op}${rot} />\n`;
          }
        }
        svg += `    </g>\n`;
        layerIdx++;
      }
      svg += `  </g>\n`;
    } else {
      svg += `  <g id="mosaic-cells">\n`;
      for (const t of tiles) {
        const half = t.size / 2;
        const op = t.alpha < 1 ? ` opacity="${formatNum(t.alpha)}"` : '';
        const rot = (t.rotation && t.rotation !== 0)
          ? ` transform="rotate(${formatNum((t.rotation * 180) / Math.PI)} ${formatNum(t.x)} ${formatNum(t.y)})"`
          : '';

        if (t.shape === 'circle') {
          const clamped = BoundaryValidator.clampCircle(t.x, t.y, half, width, height);
          svg += `    <circle cx="${formatNum(clamped.cx)}" cy="${formatNum(clamped.cy)}" r="${formatNum(clamped.radius)}" fill="${t.color}"${op}${rot} />\n`;
        } else if (t.shape === 'triangle') {
          const p1 = `${formatNum(t.x)},${formatNum(t.y - half)}`;
          const p2 = `${formatNum(t.x + half)},${formatNum(t.y + half)}`;
          const p3 = `${formatNum(t.x - half)},${formatNum(t.y + half)}`;
          svg += `    <polygon points="${p1} ${p2} ${p3}" fill="${t.color}"${op}${rot} />\n`;
        } else if (t.shape === 'diamond') {
          const p1 = `${formatNum(t.x)},${formatNum(t.y - half)}`;
          const p2 = `${formatNum(t.x + half)},${formatNum(t.y)}`;
          const p3 = `${formatNum(t.x)},${formatNum(t.y + half)}`;
          const p4 = `${formatNum(t.x - half)},${formatNum(t.y)}`;
          svg += `    <polygon points="${p1} ${p2} ${p3} ${p4}" fill="${t.color}"${op}${rot} />\n`;
        } else if (t.shape === 'hexagon') {
          const points = [];
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = formatNum(t.x + half * Math.cos(angle));
            const py = formatNum(t.y + half * Math.sin(angle));
            points.push(`${px},${py}`);
          }
          svg += `    <polygon points="${points.join(' ')}" fill="${t.color}"${op}${rot} />\n`;
        } else {
          const clamped = BoundaryValidator.clampRect(t.x - half, t.y - half, t.size, t.size, width, height);
          svg += `    <rect x="${formatNum(clamped.x)}" y="${formatNum(clamped.y)}" width="${formatNum(clamped.width)}" height="${formatNum(clamped.height)}" fill="${t.color}"${op}${rot} />\n`;
        }
      }
      svg += `  </g>\n`;
    }

    svg += `</svg>`;
    return svg;
  }
}
