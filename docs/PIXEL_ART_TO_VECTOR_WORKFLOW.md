# Pixel Art and Mosaic SVG Conversion Workflow

Reviewed against the current application on September 20, 2026.

## Choose the workflow

| Input and purpose | Workflow |
|---|---|
| Generate a reduced pixel grid from an image | Pixel Art |
| Apply geometric tiles and photographic sampling | Mosaic → Normal Image |
| Convert an existing pixel grid without blended sampling | Mosaic → Already Pixel Art |

Pixel Art's Original Colors setting retains sampled colors without palette reduction. It does not force exact center sampling or guarantee source-pixel parity.

## Pixel Art

Upload an image, choose Pixel Art, and set the grid resolution, sampling, palette, and dithering. The application defaults to a grid width of 512 and derives height from the source aspect ratio.

Use the floating tools for pencil, eraser, fill, eyedropper, rectangle, and line edits. Export the processed PixelGrid with the desired SVG mode and document dimensions.

The engine is [PixelArtEngine.js](../src/core/pixel-art/PixelArtEngine.js); SVG conversion uses [SvgExporter.js](../src/core/export/SvgExporter.js).

## Mosaic — Normal Image

Choose Normal Image for photographic or continuous-tone input. The only visible strategy is Default Pixel Art.

Set tile size, shape, spacing, rotation, sampling, palette, and dithering as needed. Background removal defaults to None (Keep All). White, black, and picked-color removal are optional.

**Clean Edge Purifier** appears at the top of the Mosaic controls for both Normal Image and Already Pixel Art, enabled by default. It replaces likely exterior background blends with nearby source colors while preserving established interior shades and manual edits. Already Pixel Art replacements are restricted to its original sampled palette. Small background color variations are tolerated. **Reset Edge Colors** disables it and regenerates the unpurified result without clearing manual edits. Normal Image palette and dithering settings still apply afterward. Transparent or uncertain backgrounds are skipped; restoration is a heuristic, not a guarantee for every image.

## Mosaic — Already Pixel Art

Choose Already Pixel Art for existing pixel artwork. Set tile size to match the source grid. This pathway bypasses continuous shading, palette quantization, dithering, and morphological trim.

For source-like geometry, use square tiles, zero spacing, and zero rotation. Keep background removal off unless removal is intended, and review enabled cleanup settings.

Exact conversion depends on source alignment and dimensions. Incomplete edge cells are not sampled by ExactCellSampler, and mixed-cell inputs may lose detail even when no new colors are introduced. Inspect the preview and verification report.

The current UI has no Auto-Detect mode button, confirmation banner, or X/Y grid-offset sliders. The engine retains programmatic detection and offset options.

See [Mosaic dual-input reference](Mosaic_Engine_PRD_v2_Dual_Input_System.md) for the implementation.

## Export

The export dialog offers editable cells, optimized geometry, color groups, and object groups. Pixel Art, Mosaic, Halftone, and Random Flow have SVG export branches.

SVG output uses vector primitives. PNG and JPEG use raster output; the dialog offers 1×, 2×, 4×, and 8× scaling.

See [SVG export reference](SVG_EXPORT.md) for method options and shape behavior, and the [QA report](FINAL_QA_REPORT.md) for tested scope. Fixture tests and the cleanup badge are not a universal pixel-parity guarantee.

## Source-art guidelines

[Pixel_Art_Master_Prompt.txt](../Pixel_Art_Master_Prompt.txt) contains the existing version-6 pixel-art generation guidelines.
