/**
 * EdgeFringeCleanup.js
 * "Pure Edge" silhouette cleanup for Pathway B (Already Pixel Art).
 *
 * Problem: AI-generated pixel art often anti-aliases the sprite silhouette —
 * the outermost art pixels are blends of design color + background (the gray /
 * white fringe in user screenshots). The sampler faithfully reproduces them,
 * so the output silhouette looks shaded/blurry instead of crisp. These fringe
 * pixels are neither background nor main design colors — they waste the design.
 *
 * This pass resolves every exterior silhouette-boundary cell to a crisp
 * outcome — pure design color or transparent — never a muddy in-between.
 * Two fix modes (option `pureEdgeMode`):
 *   - 'strict' (default): ANY fringe below `fringeSnapBelow` is REMOVED
 *     (transparent). Nothing is ever recolored — the output contains only
 *     untouched source colors plus transparency. Silhouette tightens
 *     slightly where fringe existed, but no color is ever guessed.
 *   - 'snap': fringe that is mostly background (design amount <
 *     `fringeRemoveBelow`) is removed; mid-blend fringe is SNAPPED to the
 *     pure nearby design color (balanced — preserves silhouette width at
 *     the cost of recoloring blended cells).
 * Strong design colors (outlines, highlights) are left untouched in both.
 *
 * A cell is only treated as fringe when its color is well explained as
 * background + design blend (projection error <= `fringeMaxBlendErrorSq`).
 * Conservative guards: exterior boundary only (never interior, never holes),
 * never touches locked/protected/manual cells, never touches coherent
 * regions (>= `fringeCoherentNeed` neighbors share the cell's own color —
 * protects dithering and intentional detail), and requires a confidently
 * detected flat background. Thin 1-cell features with no strong interior
 * colors nearby are left alone (cannot tell fringe from design there).
 *
 * Runs AFTER ColorRestoreEngine and BEFORE background classification, so
 * removed fringe cells classify as transparent.
 */

const NEIGHBORS_8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const NEIGHBORS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class EdgeFringeCleanup {
  /**
   * @param {Array<Array<Object>>} grid - CellModel grid (mutated in place)
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {boolean} [options.edgeFringeCleanup=true]
   * @param {string} [options.pureEdgeMode='strict'] - 'strict': fringe is only
   *   ever removed (transparent), never recolored; 'snap': mid-blend fringe is
   *   snapped to the pure nearby design color (legacy balanced behavior)
   * @param {number} [options.fringeRemoveBelow=0.35] - design amount below which
   *   the fringe cell is removed (transparent)
   * @param {number} [options.fringeSnapBelow=0.92] - design amount below which
   *   the fringe cell is snapped to the pure design color
   * @param {number} [options.fringeMaxBlendErrorSq=800] - max squared RGB error
   *   for the background+design blend model to be accepted
   * @param {number} [options.fringeDesignTolerance=12] - RGB distance for
   *   "already a design color" / coherence checks
   * @param {number} [options.fringeCoherentNeed=2] - neighbors sharing the
   *   cell's own color that mark it as intentional detail
   * @param {number} [options.fringeCandidateRadius=3] - Chebyshev radius for
   *   nearby strong design colors
   * @param {Object} [options.manualOverrides]
   * @param {Set} [options.protectedIds]
   * @param {Set} [options.manualRestoreIds]
   * @param {Set} [options.manualRemoveIds]
   * @returns {{ applied: boolean, removedCount: number, snappedCount: number,
   *   backgroundDetected: boolean }}
   */
  static apply(grid, sourceImage, options = {}) {
    const report = { applied: false, removedCount: 0, snappedCount: 0, backgroundDetected: false };
    const enabled = options.edgeFringeCleanup !== false;
    if (!enabled || !Array.isArray(grid) || grid.length === 0) return report;
    if (!sourceImage || !sourceImage.data) return report;

    const removeBelow = options.fringeRemoveBelow !== undefined ? options.fringeRemoveBelow : 0.35;
    const snapBelow = options.fringeSnapBelow !== undefined ? options.fringeSnapBelow : 0.92;
    // 'strict' (default): fringe is only removed, never recolored — the user
    // asked for pure removal ("pure design only", no guessed colors).
    // 'snap': legacy balanced behavior (remove + snap to design color).
    const strictMode = options.pureEdgeMode !== 'snap';
    const maxBlendErrSq = options.fringeMaxBlendErrorSq !== undefined ? options.fringeMaxBlendErrorSq : 800;
    const designTol = options.fringeDesignTolerance !== undefined ? options.fringeDesignTolerance : 12;
    const designTolSq = designTol * designTol;
    const coherentNeed = options.fringeCoherentNeed !== undefined ? options.fringeCoherentNeed : 2;
    const candRadius = options.fringeCandidateRadius !== undefined ? options.fringeCandidateRadius : 3;

    const distSq = (a, b) => {
      const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
      return dr * dr + dg * dg + db * db;
    };
    const rgb = (cell) => [cell.sample.r, cell.sample.g, cell.sample.b];
    const occupied = (cell) =>
      cell && !cell.isRemoved && cell.sample && cell.sample.a >= 10;

    // 1. Detect the flat background from the source border (dominant opaque
    // border color with >=60% support). No confident background => no-op.
    const borderColors = new Map();
    let borderSamples = 0;
    const readBorder = (x, y) => {
      const o = (y * sourceImage.width + x) * 4;
      borderSamples++;
      if (sourceImage.data[o + 3] < 240) return;
      const color = [sourceImage.data[o], sourceImage.data[o + 1], sourceImage.data[o + 2]];
      const key = color.map(v => Math.floor(v / 16)).join(',');
      const e = borderColors.get(key) || { color, count: 0 };
      e.count++;
      borderColors.set(key, e);
    };
    const stride = Math.max(1, Math.ceil((sourceImage.width + sourceImage.height) / 2048));
    for (let x = 0; x < sourceImage.width; x += stride) {
      readBorder(x, 0); readBorder(x, sourceImage.height - 1);
    }
    for (let y = 0; y < sourceImage.height; y += stride) {
      readBorder(0, y); readBorder(sourceImage.width - 1, y);
    }
    const dominant = [...borderColors.values()].sort((a, b) => b.count - a.count)[0];
    const bgSupport = dominant && [...borderColors.values()]
      .filter(e => distSq(e.color, dominant.color) <= 576)
      .reduce((s, e) => s + e.count, 0);
    if (!dominant || bgSupport < borderSamples * 0.6) return report;
    const background = dominant.color;
    report.backgroundDetected = true;

    // 2. Flood-fill the EXTERIOR background only (4-connected from the grid
    // border, through removed/transparent/near-background cells). Enclosed
    // holes are intentionally not boundaries — conservative.
    const rows = grid.length;
    const exterior = grid.map(row => new Uint8Array(row.length));
    const queue = [];
    const visit = (r, c) => {
      const cell = grid[r]?.[c];
      if (!cell || exterior[r][c]) return;
      if (occupied(cell) && distSq(rgb(cell), background) > 576) return;
      exterior[r][c] = 1;
      queue.push([r, c]);
    };
    for (let r = 0; r < rows; r++) { visit(r, 0); visit(r, grid[r].length - 1); }
    for (let c = 0; c < grid[0].length; c++) visit(0, c);
    for (let c = 0; c < grid[rows - 1].length; c++) visit(rows - 1, c);
    for (let i = 0; i < queue.length; i++) {
      const [r, c] = queue[i];
      for (const [dr, dc] of NEIGHBORS_4) visit(r + dr, c + dc);
    }
    const adjacentExterior = (r, c) =>
      NEIGHBORS_8.some(([dr, dc]) => exterior[r + dr]?.[c + dc]);

    const isLocked = (cell) => {
      const keys = [cell.id, `${cell.col},${cell.row}`];
      return cell.protected || cell.trimLocked ||
        keys.some(k => options.manualOverrides?.[k] || options.protectedIds?.has?.(k) ||
          options.manualRestoreIds?.has?.(k) || options.manualRemoveIds?.has?.(k));
    };

    // 3. Strong design colors: occupied design cells NOT on the silhouette
    // boundary — the "main design parts" palette. Fringe blends never match
    // these exactly; real edge pixels (outlines, highlights) do.
    const strongColors = new Set();
    const strongList = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!occupied(cell) || exterior[r][c] || adjacentExterior(r, c)) continue;
        const key = rgb(cell).join(',');
        if (!strongColors.has(key)) {
          strongColors.add(key);
          strongList.push({ r, c, color: rgb(cell) });
        }
      }
    }

    const nearbyStrong = (r, c) => {
      const out = [];
      const seen = new Set();
      for (const s of strongList) {
        if (Math.abs(s.r - r) > candRadius || Math.abs(s.c - c) > candRadius) continue;
        const key = s.color.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s.color);
      }
      return out;
    };

    // 4. Resolve each silhouette-boundary cell.
    let removed = 0, snapped = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!occupied(cell) || exterior[r][c] || isLocked(cell)) continue;
        if (!adjacentExterior(r, c)) continue;
        const current = rgb(cell);

        // Guard 1: coherent region (>=N neighbors share its own color) —
        // intentional detail or dithering, never fringe. Locked neighbors
        // don't vote: a user-pinned cell must not shield its neighbors.
        let coherent = 0;
        for (const [dr, dc] of NEIGHBORS_8) {
          const n = grid[r + dr]?.[c + dc];
          if (occupied(n) && !isLocked(n) && distSq(current, rgb(n)) <= designTolSq) coherent++;
        }
        if (coherent >= coherentNeed) continue;

        const candidates = nearbyStrong(r, c);
        if (candidates.length === 0) continue; // thin feature — cannot judge, leave it

        // Guard 2: already a main design color.
        let nearestStrongSq = Infinity;
        for (const s of candidates) {
          const d = distSq(current, s);
          if (d < nearestStrongSq) nearestStrongSq = d;
        }
        if (nearestStrongSq <= designTolSq) continue;

        // Blend analysis: cell ≈ background + amount × (design − background)?
        let best = null;
        for (const s of candidates) {
          const vx = s[0] - background[0], vy = s[1] - background[1], vz = s[2] - background[2];
          const lenSq = vx * vx + vy * vy + vz * vz;
          if (lenSq < 1) continue;
          const amount = ((current[0] - background[0]) * vx +
                          (current[1] - background[1]) * vy +
                          (current[2] - background[2]) * vz) / lenSq;
          const bx = background[0] + amount * vx;
          const by = background[1] + amount * vy;
          const bz = background[2] + amount * vz;
          const err = (current[0] - bx) ** 2 + (current[1] - by) ** 2 + (current[2] - bz) ** 2;
          if (!best || err < best.err) best = { color: s, amount, err };
        }
        if (!best || best.err > maxBlendErrSq) continue; // not a bg blend — its own color

        if (best.amount < removeBelow) {
          cell.isRemoved = true; // fringe was never design — transparent
          removed++;
        } else if (best.amount < snapBelow) {
          if (strictMode) {
            cell.isRemoved = true; // strict: remove, never guess a color
            removed++;
          } else {
            cell.sample.r = best.color[0];
            cell.sample.g = best.color[1];
            cell.sample.b = best.color[2];
            cell.color = `rgb(${best.color[0]},${best.color[1]},${best.color[2]})`;
            snapped++;
          }
        }
        // amount >= snapBelow: essentially the design color itself — leave it.
      }
    }

    report.applied = true;
    report.removedCount = removed;
    report.snappedCount = snapped;
    return report;
  }
}
