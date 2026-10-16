# SVG Vector Export

**Location**: [SvgExporter.js](../src/core/export/SvgExporter.js)

**Exports**: `SvgExporter` (static methods)

---

## Core Rule

The exported SVG contains **only vector geometry** — no embedded raster `<image>` tags.
Background `<rect>` is only added when `transparentBg: false` and a `bgColor` is provided.

---

## Export Methods

### `SvgExporter.exportPixelArt(grid, options)`

Exports a `PixelGrid` to SVG. Four modes available via `options.mode`:

| Mode | Behaviour |
|---|---|
| `editable` *(default)* | One `<rect>` per pixel cell — `x`, `y`, `width`, `height`, `fill`, optional `opacity` |
| `optimized` | Horizontally contiguous cells of identical color merged into wider `<rect>` elements (run-length aggregation) |
| `grouped` / `grouped-stock` | Cells grouped by color under `<g fill="#RRGGBB">` tags, with horizontal RLE merge inside each group |
| `objects` / `objects-stock` | Cells grouped by connected 8-neighbor island — each island in its own `<g id="design-element-N">` |

All modes include `shape-rendering="crispEdges"` on the root `<svg>` element.

---

### `SvgExporter.exportHalftone(result, options)`

Exports halftone dot geometry. Dot shapes map to SVG primitives:

| Dot Shape | SVG Element |
|---|---|
| circle *(default)* | `<circle cx cy r>` |
| square | `<rect x y width height>` |
| diamond | `<polygon points>` |

Supports `hollow: true` — renders `fill="none"` + `stroke` instead of solid fill. Other Halftone canvas shapes currently use the circle fallback in SVG export.

---

### `SvgExporter.exportRandomFlow(result, options)`

Exports Random Flow streamlines as SVG `<path>` elements.
Each path uses `M ... L ... L ...` with `stroke-linecap="round"` and `stroke-linejoin="round"`.

---

### `SvgExporter.exportMosaic(result, options)`

Exports Mosaic tile geometry. Tile shapes map to SVG primitives:

| Tile Shape | SVG Element |
|---|---|
| square *(default)* | `<rect>` |
| circle | `<circle>` |
| triangle | `<polygon points>` |
| diamond | `<polygon points>` |
| hexagon | `<polygon points>` (6-vertex) |

For grid results, this method delegates to [MosaicEngine.exportSVG](../src/core/mosaic/MosaicEngine.js). The application calls that method directly. Rotation and vector shape generation are handled there; the default engine export mode is `grouped`.

Mosaic adds `shape-rendering="crispEdges"` for unrotated square tiles. Other shapes and rotations do not receive that attribute.

---

## Dimensions

The application passes `targetWidth` and `targetHeight` to Pixel Art export. When calling it directly without these options, dimensions use `options.pixelSize` (default 10) multiplied by grid dimensions. Halftone, Random Flow, and Mosaic exporters use the processed result dimensions.

```xml
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 W H" width="W" height="H" shape-rendering="crispEdges">
```

Choose target dimensions that preserve the desired aspect ratio. Custom dimensions can change cell proportions.

## Application coverage

The current export handler has SVG branches for Pixel Art, Halftone, Random Flow, and Mosaic. It does not implement SVG conversion for Line Art, Camo Mesh, or Pencil. PNG/JPEG use the separate raster exporter.
