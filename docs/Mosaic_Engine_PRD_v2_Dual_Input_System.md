# Mosaic Engine v2 — Dual-Input System

Current implementation reference, reviewed September 20, 2026.
The original migration proposal has been removed where it described absent files, controls, state schemas, or future engine deletion.

## 0. Scope

[MosaicEngine.js](../src/core/mosaic/MosaicEngine.js) supports two processing pathways. The application defaults to **Normal Image** (`inputMode: 'photo'`). **Already Pixel Art** selects `inputMode: 'pixel-art'`.

The engine also supports `inputMode: 'auto'` and explicit detection options programmatically. The current sidebar has no Auto-Detect mode button or detection-confirmation banner.

## 1. Architectural requirements

- Keep photographic sampling separate from exact-cell pixel-art sampling.
- Preserve Pathway A's existing background classification and removal behavior.
- Pathway B bypasses continuous shading, palette quantization, dithering, edge snapping, and morphological trim.
- Keep exports as true vector geometry.
- Preserve manual overrides and existing saved-project settings.

## 2. Pipeline map

| Stage | Normal Image | Already Pixel Art |
|---|---|---|
| Input routing | Explicit photo mode or optional classifier | Explicit pixel-art mode or optional classifier |
| Grid sampling | ContinuousShading or selected strategy | GridScaleDetector / explicit tile size, then ExactCellSampler |
| Background | BackgroundClassifier and BackgroundRemover | Optional FlatBackgroundClassifier and HardEdgeBackgroundRemover |
| Geometry/quality | Contours, trim, topology and quality passes as configured | IslandSeparator and thin-feature protection |
| Cleanup | MosaicCleanupEngine when enabled | MosaicCleanupEngine with pixel-art pathway options when enabled |
| Verification | Shared checks | Shared checks plus color and grid checks |
| Output | MosaicEngine canvas/SVG methods | Same output methods |

Rendering is implemented in MosaicEngine; there is no separate TileRenderer module. Mosaic processing runs synchronously in the application. The dedicated Web Worker belongs to Pixel Art.

## 3. Input classification

[InputClassifier.js](../src/core/mosaic/InputClassifier.js) and [GridScaleDetector.js](../src/core/mosaic/GridScaleDetector.js) analyze image colors, transitions, and grid repetition.

Classification runs when `inputMode === 'auto'` or `detectInput` is requested. Explicit modes do not require classification. A supplied positive `tileSize` takes precedence over automatic cell-size detection in Pathway B.

## 4. Pathway A — Normal Image

The default pipeline uses [ContinuousShading.js](../src/core/mosaic/ContinuousShading.js), [ContourTracer.js](../src/core/mosaic/ContourTracer.js), [BackgroundClassifier.js](../src/core/mosaic/BackgroundClassifier.js), [BackgroundRemover.js](../src/core/mosaic/BackgroundRemover.js), and [PostQualityPass.js](../src/core/mosaic/PostQualityPass.js), with additional trim, topology, cleanup, and verification stages.

The visible strategy dropdown contains only:

- `default-pixel-art` — Default Pixel Art.

The engine still supports contrast-edge, island-grid, orthogonal-contour, adaptive-quadtree, integer-resample, isoline-banded, and auto-detect strategy values. Their modules and tests exist; they are not current dropdown choices.

## 5. Pathway B — Already Pixel Art

### B1. GridScaleDetector

Cell size uses explicit `tileSize` when supplied, otherwise detected size. Engine options also support `gridOffsetX` and `gridOffsetY`; the offset sliders were removed from the UI.

### B2. ExactCellSampler

[ExactCellSampler.js](../src/core/mosaic/ExactCellSampler.js) normally reads each cell's center pixel without blending. If the center is transparent and enough opaque pixels exist in the cell, it can use an unblended dominant source color instead. It reports nonuniform/mixed-cell warnings.

Sampling covers complete cells. Correct size, alignment, and input dimensions matter: this is not a guarantee that every arbitrary source image survives conversion pixel-for-pixel.

### B3. FlatBackgroundClassifier

Between sampling and classification, Clean Edge Purifier runs when enabled. The application enables it by default for both image modes. In this pathway it may replace exterior blend colors only with colors in the original sampled palette. It preserves established interior shades, manual overrides, alpha, and cell geometry. Turning it off restores the unchanged sampled result on regeneration.

[FlatBackgroundClassifier.js](../src/core/mosaic/FlatBackgroundClassifier.js) classifies selected background colors using the configured tolerance. It runs when background removal is requested.

### B4. HardEdgeBackgroundRemover

[HardEdgeBackgroundRemover.js](../src/core/mosaic/HardEdgeBackgroundRemover.js) supports perimeter-connected or global removal without Pathway A's fringe purification. Inside-color removal and explicit manual overrides are also handled in MosaicEngine.

### B5. IslandSeparator

[IslandSeparator.js](../src/core/mosaic/IslandSeparator.js) segments connected islands and identifies thin features for protection. The pipeline then optionally runs cleanup and produces a verification report.

Generated results report `palette: 'original-rgb'`, `ditherAlgorithm: 'none'`, and `samplingMethod: 'center-exact'`. Manual painting, removal, and enabled cleanup can deliberately change the sampled artwork.

## 6. Cleanup, verification, and output

[MosaicVerificationEngine.js](../src/core/mosaic/MosaicVerificationEngine.js) supports these check keys:

| Key | Check |
|---|---|
| `outside` | Outside noise |
| `edges` | Edge geometry |
| `noise` | Internal noise |
| `protection` | Protection integrity |
| `designBoundaries` | Design boundaries |
| `zeroColorLoss` | Pixel-art color preservation |
| `gridAlignment` | Pixel-art grid alignment |

The `qualityChecks` options can disable individual checks. A clean badge reflects applicable, enabled checks; it does not certify every possible property of the source image. The export action is not gated on a clean badge.

Canvas rendering uses `MosaicEngine.renderToCanvas`. SVG uses `MosaicEngine.exportSVG`; `SvgExporter.exportMosaic` delegates to it for grid results. Both pathways support square, circle, triangle, diamond, and hexagon geometry.

## 7. Current application settings

Defaults in [main.js](../src/main.js) include photo input, default-pixel-art strategy, 16-pixel square tiles, zero spacing/rotation, original RGB palette, no dithering, no background removal, zero color tolerance, and enabled cleanup/auto-clean.

State is a flat Mosaic options object, including `manualOverrides`, `manualRemoveIds`, `manualRestoreIds`, `protectedIds`, and `qualityChecks`. The old proposal's nested photoPipeline/pixelArtPipeline schema and migration shim are not implemented.

Already Pixel Art hides generation-only sampling, palette/dithering, strategy, and trim sections. Normal Image exposes them.

## 8. Existing validation and references

The current tests cover both pathways, optional background removal, sampling, cleanup, verification toggles, manual overrides, and pixel differences on fixtures. See the [QA report](FINAL_QA_REPORT.md) for the recorded test run.

The available artwork prompt is [Pixel_Art_Master_Prompt.txt](../Pixel_Art_Master_Prompt.txt), version 6. It describes source-art guidelines; a prompt alone cannot guarantee conversion accuracy.
