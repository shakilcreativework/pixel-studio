# Architecture — Pixel Studio & Vector Creative Suite

## Overview

Client-side, browser-first image processing and vectorization web application.
All image computation runs entirely in the user's browser — no server uploads.
Built with vanilla HTML, JavaScript (ES Modules), and CSS. Bundled with Vite.

**Stack**

| Item | Detail |
|---|---|
| Bundler | Vite 5.4 |
| Test runner | Vitest 2.x |
| Language | JavaScript ES Modules (no framework) |
| Styling | Vanilla CSS (`src/styles/index.css`) |
| Entry | `src/main.js` |
| HTML shell | `index.html` |

---

## Core Architectural Principle

The **Pixel Art engine is 100% independent** from all other generative engines.
It does not share geometry, dot-radius, or variable-size logic with Halftone or Mosaic.

ImageLoader and DocumentManager prepare input for the selected engine. Pixel Art produces a PixelGrid; other modes render their results to canvas. PNG/JPEG export uses the grid or output canvas.

SVG export has application branches for Pixel Art, Halftone, Random Flow, and Mosaic. Line Art, Camo Mesh, and Pencil do not have dedicated SVG branches in the current export handler.

Only Pixel Art is processed through a dedicated Web Worker. Other engines run synchronously in main.js.

---

## Source File Map

Every file listed below exists in the repository as of September 21, 2026. The Mosaic UI offers Normal Image and Already Pixel Art; Normal Image exposes only Default Pixel Art. Other strategy modules remain available internally and in tests.

### `src/`

| File | Purpose |
|---|---|
| `main.js` | Application bootstrap, event wiring, zoom/pan, touch/pointer handlers, mode switching |
| `styles/index.css` | Full application CSS — dark studio theme, responsive breakpoints, glassmorphic UI |

---

### `src/core/image/`

| File | Purpose |
|---|---|
| `ImageLoader.js` | File validation, HTMLImageElement decode, canvas RGBA extraction, and downscaling above 4096 pixels |

---

### `src/core/pixel-art/`

| File | Purpose |
|---|---|
| `PixelGrid.js` | Fixed-grid data model — `Uint16Array` palette indexes + `Uint8Array` alpha |
| `ColorSampling.js` | sRGB → Linear RGB → OKLab perceptual sampling; average, median, dominant modes |
| `PaletteEngine.js` | Median-Cut quantization (2–256 colors); 10 retro presets: PICO-8 (16), Game Boy (4), Monochrome (2), C64 (16), Cyberpunk Neon (16), Pastel Dreams (16), Solar 8 (8), EDG 32 (32), NES Classic (54), Lego Studs (40) |
| `DitheringEngine.js` | Bayer 2×2 / 4×4 / 8×8, Floyd-Steinberg, Atkinson, Random dithering |
| `PixelEditor.js` | In-browser tile tools: Pencil, Eraser, Flood Fill (BFS), Eyedropper, Rectangle, Line |
| `PixelArtEngine.js` | Master coordinator — receives settings, calls sampling/palette/dithering, returns `PixelGrid` |
| `PixelArtWorker.js` | Web Worker entry-point that offloads `PixelArtEngine` off the UI thread |

---

### `src/core/mosaic/` — Dual-Input Architecture & Creative Pipeline

| File | Stage / Category | Purpose |
|---|---|---|
| `MosaicEngine.js` | Coordinator | Master tile geometry renderer; Square, Circle, Triangle, Hexagon, Diamond tiles; variable size (1–64 px), spacing (0–10 px), rotation (0°–360°) |
| `InputClassifier.js` | Stage 0 | Two-tier heuristic and multi-signal input classifier (Auto / Photo vs Already Pixel Art) |
| `ContinuousShading.js` | Stage 1 (Pathway A) | OKLab area sampling at tile centers in world pixel space — eliminates horizontal/vertical row seams |
| `CleanEdgePurifier.js` | Color pass for both pathways | Enabled by default in the UI; restores likely exterior blends using source colors, with original-palette restrictions in Already Pixel Art; preserves geometry and established interior shades |
| `ContourTracer.js` | Stage 2 (Pathway A) | 8-connected Moore-Neighbor contour tracing on binary design masks — closed outlines, concave notches, convex tips |
| `BackgroundClassifier.js` | Stage 3 (Pathway A) | Parameterized 3-category classifier: `background`, `boundary`, `design` |
| `BackgroundRemover.js` | Stage 4 (Pathway A) | Scope-aware adaptive flood fill — perimeter-seeded BFS; modes: Outer Edge (Safe) and Everywhere (Global); Black / White / Pick-Color targets |
| `PostQualityPass.js` | Stage 5 (Pathway A) | Outline snapping, anti-fade de-contamination, symmetrical corner/side harmonization, de-fringe, QA diagnostics overlay |
| `GridScaleDetector.js` | Pathway B (B1) | Modal periodic candidate GCD and edge run-length detector for native integer grid detection |
| `ExactCellSampler.js` | Pathway B (B2) | Zero color loss center pixel sampling directly in original color space |
| `FlatBackgroundClassifier.js` | Pathway B (B3) | High-contrast tight-tolerance flat background classifier |
| `HardEdgeBackgroundRemover.js` | Pathway B (B4) | Outer perimeter BFS flood fill with zero transitional fringe purification |
| `IslandSeparator.js` | Pathway B (B5) | 8-connected island segmentation and 1-cell thin feature preservation |
| `MosaicCleanupEngine.js` | Stage 6 (Quality) | Non-destructive 100% pixel cleanup engine detecting outside floating noise & internal noise |
| `MosaicVerificationEngine.js` | Stage 7 (Quality) | Seven supported check keys; clean status reflects enabled checks and the active pathway |
| `MosaicDesignDetector.js` | Edge Intelligence | 8-connected component segmentation for individual design object detection |
| `MosaicBoundaryAnalyzer.js` | Edge Intelligence | Perimeter edge-by-edge contour analyzer across top, bottom, left, and right boundaries |
| `SpriteIslandEngine.js` | Strategy Engine | Multi-Sprite Island Grid connected component segmentation and local bounding box reconstruction |
| `OrthogonalContourEngine.js` | Strategy Engine | Direct 4-connected Manhattan contour tracing and collinear segment merging |
| `AdaptiveQuadtreeEngine.js` | Strategy Engine | Hierarchical spatial quadtree decomposition preserving 1px fine details |
| `PixelArtResampler.js` | Strategy Engine | Native integer scale detection and core center-sampled pixel reconstruction |
| `ContrastEdgeEngine.js` | Strategy Engine | Edge-preserving directional vectorization engine |
| `IsolineBandedEngine.js` | Strategy Engine | Quantized isoline band tracing engine |
| `MosaicStrategyDetector.js` | Strategy Engine | Artwork analysis engine recommending optimal vectorization strategy |
| `CellModel.js` | Support | Cell data model and world-coordinate mapping |
| `DocumentColorExtractor.js` | Support | Dominant color extraction from processed mosaic tile output |
| `MosaicTrim.js` | Support | Cell-level morphological trimming and boundary protection |
| `TopologyGuard.js` | Support | Connectivity and topology integrity enforcement |
| `IntegrityEngine.js` | Support | Post-render integrity validation and artifact detection |
| `PixelGridDetector.js` | Support | Native grid/phase detector retained by tests; not imported by the application |

---

### `src/core/halftone/`

| File | Purpose |
|---|---|
| `HalftoneEngine.js` | Halftone dot rasterization — Square, Hexagonal, Radial grids; Circle, Square, Diamond, Ellipse, Triangle, Cross canvas geometries; radius, grid angle/spacing, gamma, hollow |

---

### `src/core/line-art/`

| File | Purpose |
|---|---|
| `LineArtEngine.js` | Sobel edge detection; sensitivity, line thickness, dark-mode inversion |

---

### `src/core/random-flow/`

| File | Purpose |
|---|---|
| `RandomFlowEngine.js` | Perlin noise particle streamlines — flow field vector art |

---

### `src/core/camo-mesh/`

| File | Purpose |
|---|---|
| `CamoMeshEngine.js` | Organic Voronoi cellular camouflage patches |

---

### `src/core/pencil/`

| File | Purpose |
|---|---|
| `PencilEngine.js` | Element rendering, undo, clear, and resize; current Pencil-mode UI has no stroke/shape/text creation wiring |

---

### `src/core/document/`

| File | Purpose |
|---|---|
| `DocumentManager.js` | Artboard presets (Landscape 1024→4K, Portrait, Square, Social Media, AI Aspect Ratios, Custom 16–8192 px); transparent / solid background |
| `BoundaryValidator.js` | Canvas boundary and dimension validation |

---

### `src/core/marketplace/`

| File | Purpose |
|---|---|
| `AutoFitStockEngine.js` | Aspect-preserving dimension scaling toward the application’s configured 4.0 MP target |
| `MarketplaceSafeCheck.js` | Boundary validation and transparency compliance for stock-platform submission |

---

### `src/core/export/`

| File | Purpose |
|---|---|
| `SvgExporter.js` | True vector SVG — 4 modes: Editable (1 `<rect>` per cell), Optimized (horizontal RLE merge), Grouped-by-color (`<g fill>` layers), Objects (grouped by connected island); also exports Halftone (`<circle>`, `<rect>`, `<polygon>`), Random Flow (`<path>`), and Mosaic (5 tile shapes as native SVG primitives); zero raster `<image>` tags |
| `PngExporter.js` | Nearest-neighbor sharp PNG upscaling — 1×, 2×, 4×, 8×, custom |
| `ProjectManager.js` | Version-2 `.pixelart` JSON stores grid, palette, document/background and engine settings; no source image, zoom, or undo history |

---

### `src/core/history/`

| File | Purpose |
|---|---|
| `HistoryManager.js` | Undo / Redo stack — `Ctrl+Z`, `Ctrl+Shift+Z` / `Ctrl+Y` |

---

## Test Suite

Recorded after Clean Edge Purifier implementation on September 21, 2026.

| Test File | Tests | Status |
|---|:---:|:---:|
| `test/pixel-art.test.js` | 15 | 🟢 PASS |
| `test/mosaic-already-pixel-art.test.js` | 11 | 🟢 PASS |
| `test/mosaic-architecture-stages.test.js` | 5 | 🟢 PASS |
| `test/mosaic-background-removal.test.js` | 9 | 🟢 PASS |
| `test/mosaic-pixel-perfect-preservation.test.js` | 12 | 🟢 PASS |
| `test/mosaic-trim.test.js` | 10 | 🟢 PASS |
| `test/document-and-background.test.js` | 13 | 🟢 PASS |
| `test/responsive-layout.test.js` | 11 | 🟢 PASS |
| `test/document-color-extractor.test.js` | 3 | 🟢 PASS |
| `test/mosaic-cleanup-verification.test.js` | 5 | 🟢 PASS |
| `test/mosaic-edge-intelligence.test.js` | 5 | 🟢 PASS |
| `test/clean-edge-purifier-preservation.test.js` | 2 | 🟢 PASS |
| `test/document-color-controls.test.js` | 5 | 🟢 PASS |
| `test/mosaic-boundary-fringe-purifier.test.js` | 1 | 🟢 PASS |
| `test/auto-fit-stock.test.js` | 8 | 🟢 PASS |
| `test/mosaic-multi-strategy.test.js` | 6 | 🟢 PASS |
| `test/mosaic-strategies-and-sampling.test.js` | 12 | 🟢 PASS |
| `test/mosaic-v2-pure-pixel-pipeline.test.js` | 13 | 🟢 PASS |
| `test/mosaic-quality-verification-toggle.test.js` | 3 | 🟢 PASS |
| `test/mosaic-pixel-diff.test.js` | 2 | 🟢 PASS |
| `test/mosaic-manual-paint-overrides.test.js` | 1 | 🟢 PASS |
| `test/mosaic-clean-edge-purifier.test.js` | 11 | 🟢 PASS |
| **Total** | **163 / 163** | **🟢 100% PASS** |

---

## Build Output

The September 21, 2026 Clean Edge Purifier build succeeded with 53 transformed modules. Generated assets live in `dist/`; bundle sizes and hash filenames change with builds.

See [QA report](FINAL_QA_REPORT.md) for verification scope and [SVG export](SVG_EXPORT.md) for format limitations.
