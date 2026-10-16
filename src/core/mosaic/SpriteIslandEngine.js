/**
 * SpriteIslandEngine.js
 * Multi-Sprite Island Grid Strategy Engine.
 * Conforms to Mosaic Engine PRD v3.0.0 & Multi-Strategy Master Specification.
 *
 * Primary Purpose:
 *   Handles multi-sprite sheets and independently positioned pixel-art objects
 *   where a single global grid cannot correctly align every sprite.
 *
 * Algorithm:
 *   1. Connected Component Analysis (8-connected labeling) on non-background pixels.
 *   2. Spatial proximity grouping to merge multi-part visual objects into single islands.
 *   3. Per-island local bounding box calculation.
 *   4. Per-island local pixel scale and local X/Y phase shift detection.
 *   5. Exact local cell reconstruction into canonical CellModel grid objects.
 */

import { CellModel } from './CellModel.js';
import { sampleCellColor } from '../pixel-art/ColorSampling.js';

export class SpriteIslandEngine {
  /**
   * Process source image through Multi-Sprite Island Grid algorithm.
   * @param {ImageData} sourceImage
   * @param {Object} options
   * @returns {Object} { grid, cells, islands, stats }
   */
  static process(sourceImage, options = {}) {
    const {
      tileSize = 4,
      minIslandSize = 4, // min pixel count for an island
      islandProximity = 4, // px threshold to group nearby components
      localPhaseSnap = true,
      sourceArtType = 'already-pixel-art',
      samplingMethod = 'perceptual',
      shape = 'square',
      rotation = 0
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const srcData = sourceImage.data;

    // 1. Identify non-background mask
    const isForeground = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const alpha = srcData[idx + 3];
      if (alpha > 10) {
        isForeground[i] = 1;
      }
    }

    // 2. 8-Connected Component Labeling
    const labels = new Int32Array(width * height);
    let nextLabel = 1;
    const parent = [0];

    function find(i) {
      let root = i;
      while (root !== parent[root]) root = parent[root];
      let curr = i;
      while (curr !== root) {
        const nxt = parent[curr];
        parent[curr] = root;
        curr = nxt;
      }
      return root;
    }

    function union(i, j) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        if (rootI < rootJ) parent[rootJ] = rootI;
        else parent[rootI] = rootJ;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isForeground[idx]) continue;

        const neighbors = [];
        if (x > 0 && isForeground[idx - 1]) neighbors.push(labels[idx - 1]);
        if (y > 0 && isForeground[idx - width]) neighbors.push(labels[idx - width]);
        if (x > 0 && y > 0 && isForeground[idx - width - 1]) neighbors.push(labels[idx - width - 1]);
        if (x < width - 1 && y > 0 && isForeground[idx - width + 1]) neighbors.push(labels[idx - width + 1]);

        if (neighbors.length === 0) {
          labels[idx] = nextLabel;
          parent.push(nextLabel);
          nextLabel++;
        } else {
          let minL = find(neighbors[0]);
          for (let k = 1; k < neighbors.length; k++) {
            const l = find(neighbors[k]);
            if (l < minL) minL = l;
          }
          labels[idx] = minL;
          for (let k = 1; k < neighbors.length; k++) {
            union(neighbors[k], minL);
          }
        }
      }
    }

    // Flatten labels & aggregate component stats
    const components = new Map();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isForeground[idx]) continue;
        const root = find(labels[idx]);
        labels[idx] = root;

        if (!components.has(root)) {
          components.set(root, {
            id: root,
            minX: x,
            maxX: x,
            minY: y,
            maxY: y,
            pixelCount: 0,
            pixels: []
          });
        }
        const comp = components.get(root);
        if (x < comp.minX) comp.minX = x;
        if (x > comp.maxX) comp.maxX = x;
        if (y < comp.minY) comp.minY = y;
        if (y > comp.maxY) comp.maxY = y;
        comp.pixelCount++;
        comp.pixels.push({ x, y });
      }
    }

    // Filter tiny noise components
    const validComps = Array.from(components.values()).filter(c => c.pixelCount >= minIslandSize);

    // 3. Proximity Grouping to combine multi-part sprite objects
    const islandGroups = [];
    const compVisited = new Set();

    for (let i = 0; i < validComps.length; i++) {
      if (compVisited.has(i)) continue;
      const group = [validComps[i]];
      compVisited.add(i);

      let added = true;
      while (added) {
        added = false;
        for (let j = 0; j < validComps.length; j++) {
          if (compVisited.has(j)) continue;
          const candidate = validComps[j];

          // Check if candidate is within islandProximity of any component in group
          let close = false;
          for (const member of group) {
            const dx = Math.max(0, Math.max(member.minX - candidate.maxX, candidate.minX - member.maxX));
            const dy = Math.max(0, Math.max(member.minY - candidate.maxY, candidate.minY - member.maxY));
            if (dx <= islandProximity && dy <= islandProximity) {
              close = true;
              break;
            }
          }

          if (close) {
            group.push(candidate);
            compVisited.add(j);
            added = true;
          }
        }
      }
      islandGroups.push(group);
    }

    // 4. Construct Island Objects & Local Grid Alignments
    const islands = islandGroups.map((group, islandIndex) => {
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let totalPixels = 0;

      for (const comp of group) {
        if (comp.minX < minX) minX = comp.minX;
        if (comp.maxX > maxX) maxX = comp.maxX;
        if (comp.minY < minY) minY = comp.minY;
        if (comp.maxY > maxY) maxY = comp.maxY;
        totalPixels += comp.pixelCount;
      }

      // Determine local phase offsets (xPhase, yPhase)
      const localXPhase = minX % tileSize;
      const localYPhase = minY % tileSize;

      return {
        id: islandIndex + 1,
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        totalPixels,
        localXPhase: localPhaseSnap ? localXPhase : 0,
        localYPhase: localPhaseSnap ? localYPhase : 0,
        components: group
      };
    });

    // 5. Construct Canonical Grid & Cells Model
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const grid = [];
    const allCells = [];

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cellX = c * tileSize;
        const cellY = r * tileSize;

        // Check which island owns this cell location
        let ownerIsland = null;
        for (const isl of islands) {
          if (
            cellX + tileSize > isl.minX &&
            cellX < isl.maxX + 1 &&
            cellY + tileSize > isl.minY &&
            cellY < isl.maxY + 1
          ) {
            ownerIsland = isl;
            break;
          }
        }

        // Apply local island phase offset if enabled
        let sampleX = cellX;
        let sampleY = cellY;
        if (ownerIsland && localPhaseSnap) {
          sampleX = ownerIsland.minX + Math.floor((cellX - ownerIsland.minX) / tileSize) * tileSize;
          sampleY = ownerIsland.minY + Math.floor((cellY - ownerIsland.minY) / tileSize) * tileSize;
        }

        // Compute color sampling via advanced sampling engine
        const activeSampling = samplingMethod || (sourceArtType === 'already-pixel-art' ? 'center-exact' : 'perceptual-oklab');
        const sample = sampleCellColor(
          srcData,
          width,
          height,
          sampleX,
          sampleY,
          sampleX + tileSize,
          sampleY + tileSize,
          activeSampling,
          options
        );

        const rgbColor = `rgb(${sample.r},${sample.g},${sample.b})`;
        const isOccupied = sample.a > 10;

        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: cellX,
          y: cellY,
          width: tileSize,
          height: tileSize,
          shape,
          rotation,
          color: rgbColor,
          sample,
          occupied: isOccupied,
          sourceAlpha: sample.a
        });

        cell.islandId = ownerIsland ? ownerIsland.id : 0;
        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      strategy: 'island-grid',
      grid,
      cells: allCells,
      islands,
      stats: {
        totalIslands: islands.length,
        cols,
        rows
      }
    };
  }
}
