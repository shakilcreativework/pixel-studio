/**
 * EdgeCleaner.js — "Edge Cleaner" outside-edge fringe removal for Pathway B
 * (Already Pixel Art).
 *
 * Problem: AI-generated pixel art anti-aliases sprite silhouettes — the
 * outermost art pixels are light-graded blends of design + background (the
 * gray/white fringe in user screenshots). The sampler faithfully reproduces
 * them, so edges look shaded/blurry instead of clean.
 *
 * This pass DELETES those fringe pixels (transparent) and never recolors
 * anything: every surviving cell keeps its exact source color. It judges
 * each exterior boundary cell in two ways:
 *   - LIGHT: "how close is this edge pixel to the pure background" — within
 *     Strength% RGB distance -> removed (light fringe, blur blends);
 *   - DARK: "is this dark pixel real design or edge junk" — a dark boundary
 *     pixel is real if its color exists in the interior (dark outlines,
 *     shading) or it belongs to a long continuous run; small isolated dark
 *     clusters (specks, dashes, dark blends) with no interior presence are
 *     edge dirt -> removed.
 *
 * Conservative guards (must understand background vs edge):
 *  - exterior silhouette boundary only (never interior, never holes);
 *  - never touches locked/protected/manual cells;
 *  - strong-color match: a boundary cell whose color already exists in the
 *    interior (within tolerance) is a real design color — keep. This protects
 *    e.g. white birch bark on a white background;
 *  - coherence: >= `coherentNeed` neighbors sharing the cell's own color mark
 *    a real region (bark, dithering, intentional detail) — keep;
 *  - requires a confidently detected flat background, otherwise no-op.
 *
 * Runs AFTER ColorRestoreEngine and BEFORE background classification, so
 * removed fringe classifies as transparent.
 */

const NEIGHBORS_8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const NEIGHBORS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class EdgeCleaner {
  /**
   * @param {Array<Array<Object>>} grid - CellModel grid (mutated in place)
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {boolean} [options.edgeCleanerEnabled=true]
   * @param {number} [options.edgeCleanerStrength=25] - percent (10-40): boundary
   *   cells within this RGB distance of the pure background are removed.
   *   Higher = more aggressive ("hard" edge removal).
   * @param {number} [options.edgeCleanerDesignTolerance=12] - RGB distance for
   *   the strong-color / coherence guards
   * @param {number} [options.edgeCleanerCoherentNeed=2] - neighbors sharing the
   *   cell's own color that mark it as an intentional region
   * @param {number} [options.edgeCleanerDarkLuminance=60] - a boundary cell
   *   darker than this (and not a known interior design color) is dark-junk
   *   suspect. Kept low so normal saturated design colors never enter the
   *   dark path; only near-black specks/dashes do.
   * @param {number} [options.edgeCleanerMaxJunkSize=12] - dark suspect clusters
   *   smaller than this many connected cells are removed; larger clusters are
   *   kept (conservative: could be a real dark region)
   * @param {boolean} [options.edgeCleanerDarkShading=false] - when true, also
   *   removes dark boundary cells whose color DOES exist in the interior but
   *   which form small/medium clusters (< edgeCleanerShadingMaxSize) AND are
   *   darker than every nearby interior cell (dark halo / edge shading).
   *   Long continuous runs (real outlines) are always kept.
   * @param {number} [options.edgeCleanerShadingMaxSize=30] - cluster size below
   *   which dark-shading removal applies (only when edgeCleanerDarkShading)
   * @param {number} [options.edgeCleanerHaloRadius=4] - Chebyshev radius for
   *   the nearby-interior darkness comparison
   * @param {number} [options.edgeCleanerHaloMargin=15] - the boundary cell must
   *   be this much darker (luminance) than the darkest nearby interior cell
   * @param {Object} [options.manualOverrides]
   * @param {Set} [options.protectedIds]
   * @param {Set} [options.manualRestoreIds]
   * @param {Set} [options.manualRemoveIds]
   * @returns {{ applied: boolean, removedCount: number, darkRemovedCount: number,
   *   backgroundDetected: boolean }}
   */
  static apply(grid, sourceImage, options = {}) {
    const report = { applied: false, removedCount: 0, darkRemovedCount: 0, backgroundDetected: false };
    const enabled = options.edgeCleanerEnabled !== false;
    if (!enabled || !Array.isArray(grid) || grid.length === 0) return report;
    if (!sourceImage || !sourceImage.data) return report;

    const strengthPct = Math.max(5, Math.min(60,
      options.edgeCleanerStrength !== undefined ? options.edgeCleanerStrength : 25));
    const strengthDistSq = (((strengthPct / 100) * 441.67) ** 2);
    const designTol = options.edgeCleanerDesignTolerance !== undefined ? options.edgeCleanerDesignTolerance : 12;
    const designTolSq = designTol * designTol;
    const coherentNeed = options.edgeCleanerCoherentNeed !== undefined ? options.edgeCleanerCoherentNeed : 2;

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
    // border, through removed/transparent/near-background cells).
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
    // boundary. A boundary cell already wearing one of these colors is real
    // design (outline, highlight, white bark) — never fringe.
    const strongColors = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!occupied(cell) || exterior[r][c] || adjacentExterior(r, c)) continue;
        strongColors.add(rgb(cell).join(','));
      }
    }
    const strongList = [...strongColors].map(k => k.split(',').map(Number));
    const isStrongColor = (color) =>
      strongList.some(s => distSq(color, s) <= designTolSq);

    // 4. Classify each silhouette-boundary cell: light fringe, dark junk,
    //    or real design. Never recolors — only removes.
    const darkLum = options.edgeCleanerDarkLuminance !== undefined ? options.edgeCleanerDarkLuminance : 60;
    const maxJunkSize = options.edgeCleanerMaxJunkSize !== undefined ? options.edgeCleanerMaxJunkSize : 12;
    const darkShading = options.edgeCleanerDarkShading === true;
    const shadingMaxSize = options.edgeCleanerShadingMaxSize !== undefined ? options.edgeCleanerShadingMaxSize : 30;
    const luminance = (col) => (col[0] + col[1] + col[2]) / 3;
    const keyOf = (r, c) => r + ',' + c;

    let removed = 0, darkRemoved = 0;
    const darkCandidates = new Map(); // key -> { r, c, cell }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!occupied(cell) || exterior[r][c] || isLocked(cell)) continue;
        if (!adjacentExterior(r, c)) continue;
        const current = rgb(cell);
        const isDarkCell = luminance(current) < darkLum;
        const strongMatch = isStrongColor(current);

        // Guard 1: already a real design color (dark outlines, shading,
        // white bark, highlights) — keep, unless dark-shading mode is on and
        // this is a dark cell (then the component pass decides: small/medium
        // dark clusters are edge shading, long runs are real outlines).
        if (strongMatch && !(darkShading && isDarkCell)) continue;

        if (isDarkCell) {
          // Dark boundary cell: dark-junk suspect (specks, dashes, dark
          // blends, edge shading). The verdict comes from the
          // connected-component pass below — small isolated clusters are
          // junk/shading, long continuous runs are real outlines even when
          // their color only lives at the edge.
          darkCandidates.set(keyOf(r, c), { r, c, cell, matched: strongMatch, lum: luminance(current) });
          continue;
        }

        // Guard 2: coherent region — intentional detail, never fringe.
        // NOTE: this guard is SKIPPED for light fringe (below). Uniform
        // anti-aliased bands at smooth tops/bottoms are coherent but still
        // fringe; real light colors (white bark, highlights) are already
        // protected by the strong-match guard above. Coherence only protects
        // mid-tone details here.
        let coherent = 0;
        for (const [dr, dc] of NEIGHBORS_8) {
          const n = grid[r + dr]?.[c + dc];
          if (occupied(n) && !isLocked(n) && distSq(current, rgb(n)) <= designTolSq) coherent++;
        }

        // Light decision FIRST: close to the pure background => fringe =>
        // remove, even if coherent (smooth top/bottom bands). Mid-tone
        // anti-aliasing is handled by raising Strength.
        if (distSq(current, background) <= strengthDistSq) {
          cell.isRemoved = true;
          removed++;
          continue;
        }

        if (coherent >= coherentNeed) continue;
        // Mid-tones not close to bg: keep (nothing more to do).
      }
    }

    // 5. Dark junk / shading: connected clusters (8-neighborhood) of dark
    // boundary cells, decided per cell:
    //   - unmatched color + small cluster (< maxJunkSize) -> edge junk, remove;
    //   - matched color + dark-shading mode + small/medium cluster
    //     (< shadingMaxSize) + darker than every nearby interior cell ->
    //     dark halo / edge shading, remove;
    //   - otherwise keep (long runs are real outlines; dark cells that are
    //     not darker than nearby interior are real shadows).
    const haloRadius = options.edgeCleanerHaloRadius !== undefined ? options.edgeCleanerHaloRadius : 4;
    const haloMargin = options.edgeCleanerHaloMargin !== undefined ? options.edgeCleanerHaloMargin : 15;
    const isInteriorCell = (r, c) => {
      const cell = grid[r]?.[c];
      return occupied(cell) && !exterior[r]?.[c] && !adjacentExterior(r, c);
    };
    const isHalo = (node) => {
      // Reference: darkest nearby interior cell (MIN). Strict: the cell must
      // be darker than everything nearby inside to count as a halo.
      let refLum = Infinity;
      for (let dr = -haloRadius; dr <= haloRadius; dr++) {
        for (let dc = -haloRadius; dc <= haloRadius; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (!isInteriorCell(node.r + dr, node.c + dc)) continue;
          const n = grid[node.r + dr][node.c + dc];
          const lum = luminance(rgb(n));
          if (lum < refLum) refLum = lum;
        }
      }
      if (!isFinite(refLum)) return false; // no interior nearby — conservative keep
      return node.lum < refLum - haloMargin;
    };
    if (darkCandidates.size > 0) {
      const visited = new Set();
      for (const startKey of darkCandidates.keys()) {
        if (visited.has(startKey)) continue;
        const cluster = [];
        const stack = [startKey];
        visited.add(startKey);
        while (stack.length > 0) {
          const k = stack.pop();
          const node = darkCandidates.get(k);
          cluster.push(node);
          for (const [dr, dc] of NEIGHBORS_8) {
            const nk = keyOf(node.r + dr, node.c + dc);
            if (!visited.has(nk) && darkCandidates.has(nk)) {
              visited.add(nk);
              stack.push(nk);
            }
          }
        }
        for (const node of cluster) {
          let remove = false;
          if (!node.matched && cluster.length < maxJunkSize) {
            remove = true; // small dark cluster, color not in design -> junk
          } else if (node.matched && darkShading && cluster.length < shadingMaxSize && isHalo(node)) {
            remove = true; // small dark cluster, darker than nearby interior -> halo
          }
          if (remove) {
            node.cell.isRemoved = true;
            darkRemoved++;
          }
        }
      }
    }
    removed += darkRemoved;

    report.applied = true;
    report.removedCount = removed;
    report.darkRemovedCount = darkRemoved;
    return report;
  }
}
