/**
 * CleanEdgePurifier — restore likely background-blended edge colors.
 *
 * Recolors exterior-boundary cells that look like background blends back to a
 * nearby TRUE design color (blend projection against the detected background).
 *
 * Safety contract (audited 2026-10-14):
 *  - NEVER touches deep-interior cells (boundary-adjacent only).
 *  - NEVER resurrects: cells close enough to the background to be removed by
 *    the pipeline's background removal are left alone — recoloring them would
 *    darken them past the removal threshold and materialize a "shadow" ring
 *    of new cells outside the true silhouette.
 *  - Candidates are TRUE design colors only: the exact samples of nearby
 *    interior (non-boundary) design cells. Fringe/blend colors are never valid
 *    restoration targets, so a muddy edge can never be "restored" into another
 *    muddy color.
 *  - Never adds or removes cells — recolor only. Locked/protected/manual and
 *    solid neutral dark outlines are skipped.
 */
export class CleanEdgePurifier {
  static apply(grid, source, options = {}) {
    const report = { correctedCells: 0, backgroundDetected: false };
    if (!grid.length || !source?.data) return report;
    const distanceSq = (a, b) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
    const rgb = cell => [cell.sample.r, cell.sample.g, cell.sample.b];
    const neighbors = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    // Require a dominant opaque source-border color; avoid guessing on photos
    // or transparent artwork. Keep the exact source RGB, not a quantized color.
    const borderColors = new Map();
    let borderSamples = 0;
    const readBorder = (x, y) => {
      const offset = (y * source.width + x) * 4;
      borderSamples++;
      if (source.data[offset + 3] < 240) return;
      const color = Array.from(source.data.subarray(offset, offset + 3));
      const key = color.map(value => Math.floor(value / 16)).join(',');
      const entry = borderColors.get(key) || { color, count: 0 };
      entry.count++;
      borderColors.set(key, entry);
    };
    const stride = Math.max(1, Math.ceil((source.width + source.height) / 2048));
    for (let x = 0; x < source.width; x += stride) {
      readBorder(x, 0);
      readBorder(x, source.height - 1);
    }
    for (let y = 0; y < source.height; y += stride) {
      readBorder(0, y);
      readBorder(source.width - 1, y);
    }
    const dominant = [...borderColors.values()].sort((a, b) => b.count - a.count)[0];
    const backgroundSupport = dominant && [...borderColors.values()]
      .filter(entry => distanceSq(entry.color, dominant.color) <= 576)
      .reduce((sum, entry) => sum + entry.count, 0);
    if (!dominant || backgroundSupport < borderSamples * 0.6) return report;
    const background = dominant.color;
    report.backgroundDetected = true;

    // Background-removal awareness: when the pipeline will remove background
    // colors, a boundary cell already inside that removal distance must be left
    // for removal — recoloring it darker would resurrect it as a "shadow" cell
    // outside the true silhouette.
    const removalActive = (options.bgRemovalMode && options.bgRemovalMode !== 'none') ||
      (Array.isArray(options.outsideBgRemovalColors) && options.outsideBgRemovalColors.length > 0) ||
      (Array.isArray(options.bgRemovalColors) && options.bgRemovalColors.length > 0) ||
      (Array.isArray(options.insideBgRemovalColors) && options.insideBgRemovalColors.length > 0);
    const tolPct = options.colorTolerance !== undefined ? options.colorTolerance : 3;
    const bgRemovalDistSq = (((tolPct / 100) * 441.67) ** 2);

    // Flood only exterior background. Enclosed holes and interior shading do
    // not become purification boundaries. This mask stays fixed for the pass.
    const exterior = grid.map(row => new Uint8Array(row.length));
    const queue = [];
    const visit = (r, c) => {
      const cell = grid[r]?.[c];
      if (!cell || exterior[r][c]) return;
      if (!cell.isRemoved && cell.sample.a >= 10 && distanceSq(rgb(cell), background) > 576) return;
      exterior[r][c] = 1;
      queue.push([r, c]);
    };
    for (let r = 0; r < grid.length; r++) {
      visit(r, 0);
      visit(r, grid[r].length - 1);
    }
    for (let c = 0; c < grid[0].length; c++) visit(0, c);
    for (let c = 0; c < grid[grid.length - 1].length; c++) visit(grid.length - 1, c);
    for (let i = 0; i < queue.length; i++) {
      const [r, c] = queue[i];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) visit(r + dr, c + dc);
    }

    const isLocked = cell => {
      if (!cell) return true;
      const keys = [cell.id, `${cell.col},${cell.row}`];
      return cell.protected || cell.trimLocked || keys.some(key =>
        options.manualOverrides?.[key] || options.protectedIds?.has?.(key) ||
        options.manualRestoreIds?.has?.(key) || options.manualRemoveIds?.has?.(key));
    };

    // TRUE design colors: exact samples of interior cells (not adjacent to the
    // exterior, not locked). Fringe/blend colors can never be interior, so they
    // can never become restoration candidates.
    const interiorColors = new Set();
    for (let r = 1; r < grid.length - 1; r++) {
      for (let c = 1; c < grid[r].length - 1; c++) {
        const cell = grid[r][c];
        if (!cell.isRemoved && cell.sample.a >= 240 && !exterior[r][c] && !isLocked(cell) &&
            !neighbors.some(([dr, dc]) => exterior[r + dr]?.[c + dc])) {
          interiorColors.add(rgb(cell).join(','));
        }
      }
    }

    const updates = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (exterior[r][c] || cell.isRemoved || cell.sample.a < 240 || isLocked(cell)) continue;
        if (!neighbors.some(([dr, dc]) => exterior[r + dr]?.[c + dc])) continue;
        const current = rgb(cell);
        if (interiorColors.has(current.join(','))) continue;
        // Do not recolor solid neutral outlines, even on a white background.
        if (Math.max(...current) - Math.min(...current) < 12 && Math.max(...current) < 80) continue;
        // Do not resurrect: bg-bound cells belong to background removal.
        if (removalActive && distanceSq(current, background) <= bgRemovalDistSq) continue;

        // Gather candidate TRUE design colors from nearby interior cells
        // (at most two connected foreground cells away, never across a
        // background gap into a different sprite).
        const nearby = [[r, c, 0]];
        const seen = new Set([`${r},${c}`]);
        const candidates = new Map();
        for (let i = 0; i < nearby.length; i++) {
          const [nr, nc, depth] = nearby[i];
          const neighbor = grid[nr]?.[nc];
          if (neighbor && !isLocked(neighbor) && !neighbor.isRemoved && neighbor.sample.a >= 240) {
            const key = rgb(neighbor).join(',');
            if (interiorColors.has(key)) {
              const candidate = candidates.get(key) || { color: rgb(neighbor), support: 0 };
              candidate.support += 1 / (depth + 1);
              candidates.set(key, candidate);
            }
          }
          if (depth === 2) continue;
          for (const [dr, dc] of neighbors) {
            const rr = nr + dr, cc = nc + dc, key = `${rr},${cc}`;
            const next = grid[rr]?.[cc];
            if (!next || exterior[rr][cc] || next.isRemoved || next.sample.a < 240 || seen.has(key)) continue;
            seen.add(key);
            nearby.push([rr, cc, depth + 1]);
          }
        }
        let best = null;
        for (const candidate of candidates.values()) {
          const vector = candidate.color.map((value, i) => value - background[i]);
          const lengthSq = vector.reduce((sum, value) => sum + value * value, 0);
          if (lengthSq === 0) continue;
          const amount = vector.reduce((sum, value, i) => sum + (current[i] - background[i]) * value, 0) / lengthSq;
          if (amount < 0.12 || amount > 0.92 || distanceSq(current, candidate.color) < 324) continue;
          const blend = vector.map((value, i) => background[i] + amount * value);
          const error = distanceSq(current, blend);
          if (error > 300) continue;
          const score = error + 20 * amount - Math.min(candidate.support, 100) * 0.02;
          if (!best || score < best.score) best = { color: candidate.color, score };
        }
        if (best) updates.push({ cell, color: best.color });
      }
    }
    for (const { cell, color } of updates) {
      [cell.sample.r, cell.sample.g, cell.sample.b] = color;
      cell.color = `rgb(${color.join(',')})`;
    }
    report.correctedCells = updates.length;
    return report;
  }
}
