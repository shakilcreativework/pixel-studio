/**
 * MosaicToolMapper — click→cell coordinate mapping for mosaic paint tools
 * (pencil, eraser, fill, rect, line).
 *
 * The output canvas holds the engine's rendered grid: each cell is drawn at
 * (col * step, row * step) where step = renderedCellSize + spacing, already
 * shifted onto the (possibly design-cropped) canvas by applyDesignFit. So the
 * mapping is simply floor(point / step):
 *
 * - NO added offset: the pre-crop origin (fitOffsetX/Y) must NOT be re-added.
 *   Cells are already shifted; re-adding the origin double-counts it and
 *   misplaces every click whenever the design was actually cropped.
 * - The size MUST be the ACTUAL rendered cell size reported by the engine
 *   (res.appliedCellSize / res.tileSize), never a stale UI preset. In Already
 *   Pixel Art mode the tile-mode dropdown drives options.forceTileSize (and
 *   Auto uses the detected grid), while state.mosaic.tileSize keeps the old
 *   Normal-mode preset — mapping clicks with that stale value made tools
 *   land on the wrong cell at every manual size except 16px
 *   ("click here, works over there").
 */
export function canvasPointToCell(x, y, renderedCellSize, spacing = 0) {
  const step = Math.max(1, (renderedCellSize || 16) + (spacing || 0));
  return {
    c: Math.floor(x / step),
    r: Math.floor(y / step),
    step
  };
}
