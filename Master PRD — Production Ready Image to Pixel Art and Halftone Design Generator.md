# Master PRD — Pixel & Vector Creative Suite

Current project requirements and implementation references, reviewed September 20, 2026.
Obsolete rollout phases, proposed files, and unimplemented roadmap items have been removed.

## Product scope

The application processes images locally in the browser using vanilla HTML, CSS, JavaScript ES modules, and Vite. Its mode selector contains Pixel Art, Halftone, Line Art, Random Flow, Camo Mesh, Mosaic, and Pencil.

See [Architecture](docs/ARCHITECTURE.md) for the existing source modules and [QA report](docs/FINAL_QA_REPORT.md) for the limits of automated verification. A mode appearing in the interface is not evidence that every originally proposed feature is implemented.

## Architectural requirements

- Keep Pixel Art independent of Halftone and Mosaic. Its fixed cell dimensions must not vary with brightness.
- Keep image-processing algorithms separate from application event wiring.
- Render Pixel Art previews and exports from the processed PixelGrid.
- Export actual vector geometry for supported SVG workflows; do not embed raster images as a substitute.
- Preserve working features and existing engine behavior during maintenance.

## Image and document workflow

[ImageLoader](src/core/image/ImageLoader.js) validates files and decodes them through an HTML image and canvas. It accepts JPEG, PNG, WebP, GIF, and BMP inputs, with a 25 MB file limit and a 4096-pixel maximum processing dimension.

The application supports file browsing and drag-and-drop. [DocumentManager](src/core/document/DocumentManager.js) supplies original-size, landscape, portrait, square, social, AI-ratio, and custom artboard settings. Background presentation can be transparent or solid.

## Pixel Art

[PixelArtEngine](src/core/pixel-art/PixelArtEngine.js) coordinates sampling, palette selection, and dithering. [PixelGrid](src/core/pixel-art/PixelGrid.js) stores palette indexes and alpha in typed arrays.

- Sampling: average, median, dominant, and perceptual.
- Engine color modes: original sampled colors, limited palette, preset, custom palette, and monochrome. Engine options are not all exposed as standalone UI controls.
- Palette generation: median cut; color matching supports RGB and OKLab.
- Dithering: none, Bayer 2/4/8, Floyd-Steinberg, Atkinson, and random.
- Editing: pencil, eraser, flood fill, eyedropper, rectangle, and line.
- Processing uses [PixelArtWorker](src/core/pixel-art/PixelArtWorker.js), with a synchronous fallback. Job IDs prevent stale results from replacing newer previews.

Application defaults are defined in [main.js](src/main.js): grid width 512, aspect-derived height, perceptual sampling, limited palette with 32 colors, no dithering, and preserved alpha. These differ from defaults used when calling the engine without options.

Original-color mode preserves sampled colors without palette reduction; sampling can still change source colors. Use Mosaic's Already Pixel Art pathway for exact-cell sampling.

## Mosaic

The sidebar offers **Normal Image** (default) and **Already Pixel Art**.

Normal Image exposes only Default Pixel Art. Already Pixel Art uses a separate sampling pathway that bypasses continuous shading, palette quantization, and dithering. Background removal is optional.

See [Mosaic dual-input reference](docs/Mosaic_Engine_PRD_v2_Dual_Input_System.md) for the implemented pathways, options, and preservation limits.

## Other modes

| Mode | Existing implementation |
|---|---|
| Halftone | Square, hexagonal, and radial grids; shape, spacing, angle, radius, hollow, and invert controls |
| Line Art | Edge detection, sensitivity, thickness, and inversion |
| Random Flow | Noise-guided paths with particle-count, length, and stroke-width controls |
| Camo Mesh | Cellular pattern generation with region-count, size, and warp controls |
| Pencil | Existing element renderer and undo/clear controls; no current pointer wiring for creating strokes, shapes, or text in this mode |

The Pencil/brush editor tools in Pixel Art and Mosaic are separate from the Pencil mode.

## Preview and editing

The application includes zoom, fit-to-screen, pan, grid overlay, split view, and touch gestures. The grid is a preview overlay. PixelGrid history supports undo/redo; do not assume this history covers every engine.

Responsive styles live in [index.css](src/styles/index.css). They include 1480, 1280, 1023, 767, and 379-pixel maximum-width breakpoints.

## Export and project files

- PNG and JPEG use [PngExporter](src/core/export/PngExporter.js). The UI offers 1×, 2×, 4×, and 8× scale options; JPEG uses an opaque background.
- SVG has application export branches for Pixel Art, Halftone, Random Flow, and Mosaic. See [SVG export](docs/SVG_EXPORT.md).
- [ProjectManager](src/core/export/ProjectManager.js) saves a version-2 `.pixelart` JSON file with mode, document/background settings, PixelGrid data, and engine settings. It does not serialize the source image, zoom/pan, or undo history.
- Auto-Fit Stock and Marketplace Safe Check provide local dimension and technical checks. Their results do not establish marketplace acceptance.

## Development rules

1. Inspect before modifying.
2. Never rewrite the entire project without permission.
3. Never delete working features.
4. Never change existing engine behavior unintentionally.
5. Pixel Art is independent.
6. Keep UI and algorithms separate.
7. Test after every meaningful implementation.
8. Fix build errors before continuing.
9. Do not claim functionality works without testing it.
10. Do not create fake controls.
11. Every visible control must affect the correct engine.
12. Never export raster data as fake vector SVG.
13. Keep documentation updated.
14. Make small, reviewable changes.
15. Preserve existing APIs where possible.

For implementation work: read, understand, plan, implement, run, test, inspect, fix, document, and report. Documentation-only edits require reference and scope checks rather than a new production build.

## Existing documentation

- [Architecture and module map](docs/ARCHITECTURE.md)
- [Mosaic dual-input reference](docs/Mosaic_Engine_PRD_v2_Dual_Input_System.md)
- [Pixel Art and Mosaic conversion workflow](docs/PIXEL_ART_TO_VECTOR_WORKFLOW.md)
- [SVG export reference](docs/SVG_EXPORT.md)
- [QA report](docs/FINAL_QA_REPORT.md)
- [Development history](WEBSITE_DEVELOPMENT_TRACKER.md)
