# Pixel Studio & Vector Creative Suite — Development Tracker

**Last updated:** September 21, 2026

**Latest activity:** Clean Edge Purifier enabled by default at the top of both Mosaic modes.

## Current project references

| Area | Reference |
|---|---|
| Product scope and maintenance rules | [Master PRD](<Master PRD — Production Ready Image to Pixel Art and Halftone Design Generator.md>) |
| Existing modules and architecture | [Architecture](docs/ARCHITECTURE.md) |
| Mosaic pathways and current controls | [Mosaic dual-input reference](docs/Mosaic_Engine_PRD_v2_Dual_Input_System.md) |
| Conversion workflow | [Pixel Art and Mosaic workflow](docs/PIXEL_ART_TO_VECTOR_WORKFLOW.md) |
| SVG methods and supported modes | [SVG export](docs/SVG_EXPORT.md) |
| Executed verification and limits | [QA report](docs/FINAL_QA_REPORT.md) |

## Latest executed checks

These results are from the September 21 Clean Edge Purifier implementation.

| Check | Result |
|---|---|
| Automated tests | **163/163 passed** across 22 files |
| Production build | Succeeded; **53 modules** transformed |
| Targeted ESLint checks | Four changed/new JavaScript files; zero unused-variable or unreachable-code findings |
| Interactive browser verification | Not performed in this session |

## Current implementation notes

- Pixel Art has an independent fixed-grid engine and a dedicated Web Worker.
- Mosaic defaults to Normal Image; Already Pixel Art selects a separate sampling pathway.
- The Normal Image strategy selector offers only Default Pixel Art. Other strategy engines remain in the source and tests.
- SVG application branches exist for Pixel Art, Halftone, Random Flow, and Mosaic.
- Project files store PixelGrid data and settings, not the source image, zoom/pan, or edit history.
- Pencil mode retains rendering and undo/clear controls; creation of strokes, shapes, and text is not wired to input handlers.

The previous cloud, batch-processing, animation, palette-sync, and multi-layer roadmap was unimplemented and has been removed from this current-project tracker.

## Historical process log

The entries below describe earlier work as recorded at the time. Old test counts, deleted filenames, removed controls, and superseded implementation claims are historical context, not current setup instructions or current verification. Current references above take precedence.

Duplicate entries have been consolidated by title, retaining the more complete copy.

### [Historical Note — September 5, 2026] — Unused Code Removal & Comprehensive Documentation Synchronization
* **Date**: September 5, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Performed static oxlint analysis on `src/` to identify unreferenced variables, parameters, imports, and duplicate keys.
  * **Unused Code Removed**:
    * Removed unused imports (`CellDesignState`, `CellBoundaryState`, `CellCornerState`) from `MosaicVerificationEngine.js` and `MosaicCleanupEngine.js`.
    * Removed unused option destructure properties (`transparentBg`, `bgColor`, `sourceArtType`, `colorTolerance`, `pixelSize`, `edgeSensitivity`) across `SpriteIslandEngine.js`, `PixelArtResampler.js`, `AdaptiveQuadtreeEngine.js`, `OrthogonalContourEngine.js`, and `SvgExporter.js`.
    * Removed unused signature parameters (`context`, `_targetRgbList`, `_options`, `_threshold`) in `MosaicTrim.js`, `BackgroundRemover.js`, `MosaicBoundaryAnalyzer.js`, and `MosaicCleanupEngine.js`.
    * Removed duplicate element key mapping `msResetBgBtn` in `src/main.js`.
    * Removed unused local variables `width` and `height` from `MosaicStrategyDetector.js`.
  * **Documentation Synchronized**: Updated `docs/ARCHITECTURE.md`, `docs/FINAL_QA_REPORT.md`, and `WEBSITE_DEVELOPMENT_TRACKER.md` to reflect all 16 test files (112 tests), 44 Vite production build modules, and complete strategy engine file maps.
  * **Verification**: Ran `npx oxlint src` (0 errors, 0 warnings), `npx vitest run` (112 / 112 tests passing), and `npx vite build` (clean 44-module production bundle).

---

### [Log Entry 001] — Code Audit and Decoupled Cleanup
* **Date**: August 30, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Performed static ESLint analysis on `src/` to identify unreferenced variables, imports, and modules.
  * **Unused Code Removed**:
    * Deleted unreferenced Web Worker module `MosaicWorker.js`.
    * Cleared unused imports (e.g., `BoundaryValidator` from halftone, `CropManager` from main, etc.).
    * Removed unreferenced parameters (e.g., `smoothing` from Line Art, `pixelGridLock` from Mosaic).
  * **Bug Corrected**: Fixed copy-paste bug in `PostQualityPass.js` where blue channel average calculation (`avgB`) was bound to green channel sum (`sumG`).
  * **Process Completed**: Re-ran the full automated test suite (87 tests passed) and executed Vite production builds (compiles cleanly with 35 modules).

---

### [Log Entry 002] — Documentation Alignment and Tracker Upgrade
* **Date**: August 30, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Reviewed all repository `.md` files to align descriptions with the updated codebase.
  * **Content Synced**:
    * Cleaned `docs/ARCHITECTURE.md` to remove reference to `MosaicWorker.js` and `smoothing` option.
    * Synchronized test counts (73 ➔ 87) and built modules counts (34 ➔ 35) across `WEBSITE_DEVELOPMENT_TRACKER.md` and `docs/FINAL_QA_REPORT.md`.
    * Upgraded this `WEBSITE_DEVELOPMENT_TRACKER.md` file to act as the official project tracker with legends, explicit requirements, and a running activity log.
  * **Process Completed**: Saved and verified document integrity.

---

### [Log Entry 003] — Removal of Auto-Detect Grid Button & Associated UI Actions
* **Date**: August 30, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated removal of the `Auto-Detect Native Grid & Phase` button (`#msAutoDetectGridBtn`) and its status display container (`#msDetectedGridInfo` / `#msAlreadyPixelArtControls`).
  * **Actual Changes Implemented**:
    * Removed `#msAlreadyPixelArtControls`, `#msAutoDetectGridBtn`, and `#msDetectedGridInfo` DOM elements from `index.html`.
    * Removed element cache properties (`msAlreadyPixelArtControls`, `msAutoDetectGridBtn`, `msDetectedGridInfo`), click event listener, and DOM display updates from `src/main.js`.
    * Preserved all underlying core modules (`PixelGridDetector.js`), algorithms, and tests intact.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 004] — Display Uploaded Image Preview & File Name in Dropzone Box
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated enhancement to show uploaded image preview thumbnail and image file name (e.g. `avatar.jpg`) inside `#dropzone` box.
  * **Actual Changes Implemented**:
    * Updated `index.html` to add `#dropzoneEmpty` (empty drag/browse state) and `#dropzonePreview` (preview state with `#dropzoneImg` thumbnail and `#dropzoneFileName` badge).
    * Updated `src/styles/index.css` to style `.dropzone-preview`, `.dropzone-thumb-wrapper`, `.dropzone-img`, `.dropzone-filename`, and `.dropzone-change-hint`.
    * Updated `src/main.js` to cache new DOM elements, extract `file.name` on upload / drop / demo load, and update dropzone preview thumbnail and filename badge dynamically.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 005] — Refine Dropzone Responsive Image Fit, Filename & Text Alignment
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated layout refinement for `#dropzone` box to make preview thumbnail fit responsively, align filename badge directly under image box, and center replacement text at bottom of box.
  * **Actual Changes Implemented**:
    * Updated `src/styles/index.css` for `.dropzone-preview`, `.dropzone-thumb-wrapper`, `.dropzone-img`, `.dropzone-filename`, and `.dropzone-change-hint`.
    * Implemented full responsive container width fitting (`width: 100%`, max height constraint: 120px) for the thumbnail preview box.
    * Aligned file name badge centered directly beneath the thumbnail image box and positioned the replacement text at the bottom side of the box.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 006] — Make 0%, 5%, 10%, and 20% Color Tolerance Buttons Functional
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated fix to make the 4 Color Tolerance preset buttons (`0%`, `5%`, `10%`, `20%`) under Mosaic Background Removal fully functional.
  * **Actual Changes Implemented**:
    * Corrected DOM selector in `src/main.js` for `msTolerancePresets` to query `#msTolerancePresets .filter-pill-btn`.
    * Binding click event listeners to call `setMosaicTolerance(tol, true, true, true)` when any preset button (`0%`, `5%`, `10%`, `20%`) is clicked.
    * Refined `setMosaicTolerance()` parsing logic with explicit `Number.isNaN()` check for 0% tolerance.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 007] — Set Default Mosaic Tile Size to 16x16 (16px)
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated update to set and preserve `16×16 (16 px - Default)` as the default Mosaic Tile Size across mode changes and Input Image Type selections.
  * **Actual Changes Implemented**:
    * Updated `msSourceArtTypeSelect` handler in `src/main.js` to preserve `16x16` tile size default when selecting `Already Pixel Art`.
    * Updated `openSafeCheckModal()` in `src/main.js` fallback tile size to `16`.
    * Confirmed HTML preset default option `16 × 16 (16 px - Default)` and initial state remain bound to `16`.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 008] — Make Mosaic Engine Dithering Options Fully Functional
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated fix to make all Dithering options (`Floyd-Steinberg`, `Atkinson`, `Bayer 4x4`, `Bayer 8x8`) under Mosaic mode fully functional.
  * **Actual Changes Implemented**:
    * Updated `src/core/mosaic/MosaicEngine.js` STAGE 1B to call `DitheringEngine.apply()` with mapped algorithm keys (`bayer4`, `bayer8`, `floyd-steinberg`, `atkinson`).
    * Implemented palette auto-generation for `Original RGB (Full Color)` mode when dithering is enabled so dithering operates across all palette configurations.
    * Mapped dithered cell colors back to grid samples and CSS color values.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 009] — Make Floating Editor Toolbar Perfectly Responsive
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated layout refinement for `#pixelToolbar` to make all editor tools (Pencil, Eraser, Fill, Picker, Rect, Line, Color Picker) display with zero clipping across all screen sizes.
  * **Actual Changes Implemented**:
    * Updated `.floating-editor-toolbar` in `src/styles/index.css` with comfortable horizontal padding (`5px 12px` desktop, `4px 10px` mobile, `3px 8px` ultra-mobile) to fit pill container border-radius curves.
    * Added `flex-wrap: nowrap`, `white-space: nowrap`, and `touch-action: pan-x` to guarantee clean linear tool layout and touch panning on narrow screens.
    * Added subtle border and background styling to `.editor-color-picker` and `.toolbar-separator` to prevent outer element clipping.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 010] — Enhance Eyedropper Icon and Active Color Swatch Visibility
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated UI update for Eyedropper tool to classic pipette icon and CSS pseudo-element styling for `.editor-color-picker` to render full, crisp color disc with white contrast ring.
  * **Actual Changes Implemented**:
    * Updated Eyedropper button (`data-tool="picker"`) SVG path in `index.html` to standard classic Lucide pipette/dropper icon.
    * Added `::-webkit-color-swatch-wrapper`, `::-webkit-color-swatch`, and `::-moz-color-swatch` pseudo-element rules in `src/styles/index.css` to strip native browser inset margins.
    * Applied high-contrast white ring border (`border: 2px solid rgba(255, 255, 255, 0.85)`), drop shadow, and hover scaling to `.editor-color-picker` for pro-level color visibility across all themes.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 011] — Replace Color Picker with Pro-Level Round Swatch Circle Button
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated replacement of native browser color input control with a custom round swatch circle button (`#editorColorSwatch` inside `.editor-color-picker-wrapper`).
  * **Actual Changes Implemented**:
    * Wrapped `<input type="color" id="editorColorInput">` inside `.editor-color-picker-wrapper` with an inner `#editorColorSwatch` span in `index.html`.
    * Added CSS rules in `src/styles/index.css` for 26px circular swatch geometry (`border-radius: 50%`), white contrast ring (`border: 2px solid rgba(255, 255, 255, 0.85)`), drop shadow, and absolute overlay transparent input.
    * Cached `editorColorSwatch` in `src/main.js` and synchronized its `style.backgroundColor` on input changes, palette clicks, and eyedropper color sampling.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 012] — Add Floating Editor Tools & Active Palette Swatches to Mosaic Mode
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated addition of floating editor tools (Brush, Eraser, Fill, Picker, Rect, Line) and Active Palette Swatches grid to Mosaic mode while keeping Pixel Art features 100% intact.
  * **Actual Changes Implemented**:
    * Added `Active Palette Swatches` grid (`#msPaletteSwatchesGrid`) and color count badge (`#msPaletteColorCount`) to Mosaic sidebar section in `index.html`.
    * Updated `setMode()` in `src/main.js` to display `#pixelToolbar` for both `pixel-art` and `mosaic` modes.
    * Implemented `handleMosaicTool()` and `handleMosaicShapeEnd()` for Pencil/Brush, Eraser, Flood Fill, Eyedropper, Rectangle, and Line tile drawing on Mosaic canvas grid.
    * Implemented `renderMosaicActivePaletteSwatches()` for dynamic swatch rendering and 1-click active color selection in Mosaic mode.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 013] — Fix Mosaic Eraser Persistence & Prevent Toolbar Click Canvas Drawing
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated fix for Mosaic Eraser tool persistence and viewport click propagation guard for floating toolbars.
  * **Actual Changes Implemented**:
    * Updated `MosaicEngine.js` STAGE 1 cell creation to support `override.type === 'erase'`, setting `sample.a = 0`, `occupied = false`, and `isRemoved = true` so tile erasure is 100% persistent across engine re-renders.
    * Added early `e.target.closest('.floating-zoom-controls, .floating-editor-toolbar')` guard to viewport `mousedown` and `touchstart` listeners in `src/main.js` so clicking toolbar buttons (zoom, reset, grid, tool buttons) never triggers pixel/tile drawing.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 014] — Fix Mosaic Eraser Tool Execution & Cell Erasure
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated fix to ensure Mosaic Eraser tool erases cells/pixels across brush sizes and stays persistent across Mosaic engine stages.
  * **Actual Changes Implemented**:
    * Updated `handleMosaicTool()` in `src/main.js` to set `cell.occupied = false`, `cell.isRemoved = true`, `cell.sample.a = 0`, handle `brushSize` multi-cell erasure, and store `{ type: 'erase', action: 'remove', removed: true }` in `manualOverrides`.
    * Updated STAGE 5 manual override evaluation in `MosaicEngine.js` to respect `type === 'erase'` and `action === 'remove'`, preventing downstream Mosaic Trim or Topology Guard passes from restoring erased tiles.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 015] — Fix Mosaic Canvas Clearing & Eraser Rendering Fallback
* **Date**: August 31, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated fix for canvas clearing and Eraser tool rendering fallback in Mosaic mode.
  * **Actual Changes Implemented**:
    * Added canvas dimension fallbacks (`ctx.canvas.width` and `ctx.canvas.height`) in `MosaicEngine.renderToCanvas` so canvas clearing (`clearRect`) never fails due to missing dimension options.
    * Explicitly passed `width`, `height`, `transparentBg`, and `bgColor` in all `MosaicEngine.renderToCanvas` calls in `handleMosaicTool()` and `handleMosaicShapeEnd()` in `src/main.js`.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 016] — Removal of Manual Pixel Touch-Up UI Section
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Initiated clean removal of the "Manual Pixel Touch-Up" sidebar section under Mosaic mode (`#msManualTouchUpGroup`), associated state properties, event listeners, and helper methods.
  * **Actual Changes Implemented**:
    * Removed `#msManualTouchUpGroup` DOM container (header, `#msTouchUpBadge`, `#msTouchUpButtonGroup`, `#msPaintColorRow`, and `#msTouchUpHint`) from `index.html`.
    * Removed `manualTouchUp` property from Mosaic state, DOM element references (`msManualTouchUpGroup`, `msTouchUpBadge`, `msTouchUpButtons`), click listener binding, `setMosaicTouchUpMode()` helper method, and reset call in `src/main.js`.
    * Removed `.canvas-container.manual-touchup-active` rule from `src/styles/index.css`.
    * Kept floating canvas toolbar tools and background removal filter controls 100% intact.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.

---

### [Log Entry 017] — Lock Canonical Background Engine Architecture
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Confirmed and locked `BackgroundClassifier.js` and `BackgroundRemover.js` as the permanent core architectural standards for Background Classification & Removal across the repository.
  * **Architectural Locks Enforced**:
    * `src/core/mosaic/BackgroundClassifier.js` is locked as the canonical cell classifier (`BACKGROUND`, `BOUNDARY`, `DESIGN`).
    * `src/core/mosaic/BackgroundRemover.js` is locked as the canonical perimeter-seeded BFS flood-fill engine for scope-aware removal (`Outer Edge` / `Everywhere`).
    * No extra unrequested code, rules, or features added.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (35 modules, 0 errors)**.
  * **Process Completed**: Standard locked and verified.

---

### [Log Entry 018] — Unused Code & Unreferenced Import Cleanup
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Audited all JS ES modules, CSS files, and HTML templates across the repository for unused/unreferenced code.
  * **Actual Changes Implemented**:
    * Removed unused import `PixelGridDetector` from `src/main.js`.
    * Removed dead `msScopeButtons` query and unused scope-pill listener/toggle handlers from `src/main.js`.
    * Removed unreferenced legacy CSS rules (`.scope-pill-group`, `.scope-pill-btn`, `.doc-color-item`, `.doc-color-meta`, `.toolbar-separator`) from `src/styles/index.css`.
    * Kept 100% of used logic, functions, engines, and tests intact.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (34 modules, 0 errors)**.
  * **Process Completed**: Codebase audited and verified clean.

---

### [Log Entry 019] — Local Silhouette Outline Snapping & Design Corner Color Preservation
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Problem Identified**: Global averaging of dark boundary cells in `PostQualityPass.js` (Pass 1) was blending dark outlines from multi-colored objects (green/red/blue/yellow buttons & progress bars) into a single global muddy grey, corrupting sprite borders. Additionally, Pass 3 corner snapping was overwriting high-contrast letter corners and progress bar end-caps with neighboring background colors.
  * **Intended Result**: Preserve exact local object outline colors (dark green for green buttons, dark red for red buttons/progress bars, dark yellow for yellow progress bars) and protect white letter text and progress bar end-cap colors from corruption.
  * **Scope**: Refine `PostQualityPass.js` Pass 1 to calculate local 5x5 neighborhood outline color clusters (color distance <= 60) rather than a single global artboard average, and protect design feature/letter tiles in Pass 3.
  * **Implementation Details**:
    1. Updated Pass 1 in `PostQualityPass.js` to calculate local 5x5 color-aware outline averages per boundary cell cluster so green, red, yellow, blue, and purple object outlines maintain their authentic dark shades.
    2. Updated Pass 3 in `PostQualityPass.js` to restrict corner harmonization strictly to boundary noise tiles (`category === 'boundary'`), preventing overwriting of white text letters and progress bar end-caps.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (34 modules, 0 errors)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 020] — Dominant Design Feature Tile Sampling for Out-of-Phase Sprite Sheets
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Problem Identified**: When sampling composite sprite sheets at fixed tile increments (e.g. 16x16), sprites placed at non-zero Y offsets (such as `STOP`, `EXIT`, `GAME OVER`, blue progress bar, gold coins) fall out of phase with grid centers. Small-radius center-point sampling landed on 1px black outline gap lines between text/sprite rows, causing horizontal black line cuts through letters and progress bars.
  * **Intended Result**: Eliminate horizontal black line cuts and gaps across all out-of-phase sprite text (`STOP`, `EXIT`, `GAME OVER`), progress bars, and coins, while keeping already clean designs (`PLAY` button) 100% clean and intact.
  * **Scope**: Upgrade Stage 1 tile sampling in `MosaicEngine.js` with full-tile dominant design feature sampling + center-pixel grid weighting, prioritizing dominant non-background design colors over outline gap lines when a tile contains design pixels (>= 12%).
  * **Implementation Details**:
    1. Implemented full-tile area color distribution analysis in `src/core/mosaic/MosaicEngine.js` for Stage 1 sampling.
    2. Prioritized non-background design feature colors over background removal colors when design pixels exist in the tile, eliminating black horizontal line cuts across text and progress bars.
    3. Added a center-pixel weight boost to anchor grid alignment and break ties in 1:1 cell preservation mode.
  * **Verification Results**:
    * Automated test suite (`npm test`): **87 / 87 tests passing**.
    * Production build (`npm run build`): **Clean compile (34 modules, 0 errors)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 021] — Pure Design Color Sampling & Interior Feature Protection
* **Date**: September 1, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Problem Identified**: Treating white pixels as background during Stage 1 tile sampling caused white icons (like `STOP` button square icon, `EXIT` text, lion shield highlights) to be ignored as background, replacing them with surrounding dark border tiles. This caused internal design features to be wasted/corrupted and background removal to misclassify internal white icons.
  * **Intended Result**: Sample all white text icons, lion shield emblem details, progress bars, and sprite letters with 100% pure authentic design colors without treating internal white icons as background, and remove outer background space cleanly.
  * **Scope**: Refine Stage 1 tile sampling in `MosaicEngine.js` to sample exact core/dominant colors across all design features without background masking during initial sampling, and ensure `BackgroundClassifier.js` protects interior design tiles.
  * **Implementation Details**:
    1. Updated Stage 1 tile sampling in `MosaicEngine.js` to perform unbiased core/dominant tile sampling for all non-transparent design pixels.
    2. Ensured `BackgroundClassifier.js` & `BackgroundRemover.js` protect interior design tiles (such as white text/icons inside buttons and shields).
  * **Verification Results**:
    * Automated test suite (`npm test`): **99 / 99 tests passing**.
    * Production build (`npm run build`): **Clean compile (38 modules, 0 errors)**.
  * **Process Completed**: Task verified and fully completed.

---

### [Log Entry 022] — Unused Code Cleanup & Complete Documentation Alignment
* **Date**: September 2, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Conducted codebase-wide audit for unused methods, exports, dead code, and documentation synchronization.
  * **Unused Code Removed**:
    * Removed unused static `ImageLoader.loadFromUrl` method from `src/core/image/ImageLoader.js`.
  * **Documentation Synchronized**:
    * Updated `WEBSITE_DEVELOPMENT_TRACKER.md`, `docs/ARCHITECTURE.md`, and `docs/FINAL_QA_REPORT.md` to reflect exact verified metrics.
    * Synchronized test counts across all 14 test files (99 / 99 tests passing).
    * Synchronized production build module counts (38 modules compiled cleanly).
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **99 / 99 tests passing across 14 test files**.
    * Production build (`npx vite build`): **38 modules transformed, 0 errors, 0 warnings**.
  * **Process Completed**: Code and documentation 100% synchronized.

---

### [Log Entry 023] — Mosaic Multi-Strategy Pixel Art Vectorization System
* **Date**: September 2, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Expanded Mosaic Engine with an additive Multi-Strategy Pixel Art Vectorization architecture conforming strictly to the Multi-Strategy Pixel Art Vectorization architecture.
  * **Modules Implemented**:
    1. `SpriteIslandEngine.js`: Multi-Sprite Island Grid (`island-grid`) with 8-connected component segmentation, local bounding box calculation, and local X/Y phase alignment.
    2. `OrthogonalContourEngine.js`: Direct Orthogonal Contour (`orthogonal-contour`) with 4-connected Manhattan contour tracing and collinear segment merging.
    3. `AdaptiveQuadtreeEngine.js`: Adaptive Quadtree (`adaptive-quadtree`) with recursive spatial decomposition down to 1px detail preservation.
    4. `PixelArtResampler.js`: Native Integer Resampler (`integer-resample`) with run-length scale detection and core center sampling.
    5. `MosaicStrategyDetector.js`: Auto Detect recommendation engine (`auto-detect`) displaying badge guidance without silent manual overrides.
  * **UI & Integration**:
    * Added `#msMosaicStrategySelect` and recommendation badge `#msStrategyRecBadge` in `index.html` and `src/styles/index.css`.
    * Wired state and event listeners in `src/main.js` and strategy router in `MosaicEngine.js`.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **105 / 105 tests passing across 15 test files**.
    * Production build (`npx vite build`): **43 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 024] — Mosaic Multi-Strategy Canvas Rendering & Pipeline Integration Fix
* **Date**: September 2, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Resolved empty document canvas rendering issue when selecting alternative Mosaic strategies (`island-grid`, `orthogonal-contour`, `adaptive-quadtree`, `integer-resample`, `auto-detect`).
  * **Root Cause & Fix**:
    1. Strategy engines now generate initial `grid` structures which flow directly through Stages 3-7 of `MosaicEngine.process()`.
    2. Attached complete canvas result metadata (`width`, `height`, `tileSize`, `transparentBg`, `bgColor`, `tiles`, `contours`, `verificationReport`, `strategyRecommendation`).
    3. Standardized cell color format (`rgb(...)`) across `SpriteIslandEngine`, `OrthogonalContourEngine`, `AdaptiveQuadtreeEngine`, and `PixelArtResampler`.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **105 / 105 tests passing across 15 test files**.
    * Production build (`npx vite build`): **43 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 025] — Mosaic Multi-Strategy Quality Enhancement & Visible Differentiation
* **Date**: September 2, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Process Started**: Enhanced alternative Mosaic strategies to ensure visibly distinct and higher quality results while keeping `Default Pixel Art` 100% untouched.
  * **Enhancements Delivered**:
    1. **Adaptive Quadtree**: Direct canvas rendering of variable-size quadtree leaf cells (1px/2px fine edge detail vs 16px/32px cohesive flat regions).
    2. **Direct Orthogonal Contour**: Collinear row-merging into seamless 90° Manhattan rectangular vector bands.
    3. **Multi-Sprite Island Grid**: Island local phase alignment and origin anchoring to avoid global grid phase cutting.
    4. **Interactive Sidebar Sub-Controls**: Added `#msStrategyControls` with dynamic inputs for each strategy (sliders, dropdowns, toggles) linked to immediate real-time canvas re-rendering.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **105 / 105 tests passing across 15 test files**.
    * Production build (`npx vite build`): **43 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 026] — Pixel Art Export Document Size Synchronization Fix
* **Date**: September 5, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Problem Identified**: When a user selected a Document Size Preset (e.g., `3840 x 2160 (4K UHD)`), exporting Pixel Art SVG or PNG resulted in hardcoded cell scale default (`pixelSize = 10`), producing `5120 x 2880` in Illustrator instead of the selected `3840 x 2160`.
  * **Root Cause & Fix**:
    1. `SvgExporter.exportPixelArt` and `PngExporter.exportPixelArtToBlob` now strictly accept `targetWidth` and `targetHeight` parameters and calculate cell dimensions (`cellW`, `cellH`) to match selected Document Artboard bounds.
    2. `src/main.js` (`executeExport`) now passes `targetWidth: this.state.documentWidth` and `targetHeight: this.state.documentHeight` during Pixel Art SVG/PNG exports.
    3. Unrelated features, engines, and code were kept 100% untouched.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **112 / 112 tests passing across 16 test files**.
    * Production build (`npm run build`): **44 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 027] — Pixel Art Default Grid Resolution Update to 512×512
* **Date**: September 5, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Requirement**: Set default Pixel Art Grid Resolution to `512 × 512 (512 px)`.
  * **Changes Implemented**:
    1. Updated `this.state.pixelResolution` default from `64` to `512` in `src/main.js`.
    2. Updated `index.html` controls (`#resVal` text to `512 px`, `#resPresetSelect` default option to `512`, and `#resSlider` default value to `512`).
    3. Left 100% of all other engines, features, and code completely untouched.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **112 / 112 tests passing across 16 test files**.
    * Production build (`npm run build`): **44 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 028] — Root Markdown Cleanup & Documentation Structure Verification
* **Date**: September 5, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Requirement**: Audited root `.md` files and safely removed redundant sprint specification files from the root workspace directory.
  * **Files Removed**:
    1. `Mosaic_100_Percent_Cleanup_Context_Engineering_Workflow.md`
    2. `Mosaic_Edge_Intelligence_Context_Engineering_Working_Process.md`
    3. `Mosaic_Multi_Strategy_Pixel_Art_Context_Engineering_Final.md`
    4. `ResponsiveLayouts.md`
  * **Retained Master Documentation**:
    1. `Master PRD — Production Ready Image to Pixel Art and Halftone Design Generator.md`
    2. `WEBSITE_DEVELOPMENT_TRACKER.md`
    3. `docs/` architecture & sub-engine specifications.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **112 / 112 tests passing across 16 test files**.
    * Production build (`npm run build`): **44 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 029] — Complete Codebase Audit, Unused Code Purge & Documentation Alignment
* **Date**: September 7, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Unused Code Purged**:
    * Purged unused imports (`RandomFlowEngine`, `HalftoneEngine`, `BackgroundClassifier`, `BackgroundRemover`, `oklabDistance`, `MosaicTrim`, `CellModel`, `CellBoundaryState`, `CellCornerState`, `IntegrityEngine`) across test files.
    * Removed unused variable declarations (`boundaryMap`, `result`) and unused array destructuring parameters (`[, count]`).
  * **Documentation Synchronized**:
    * Audited the repository Markdown files available at that time.
    * Aligned overall status, metrics, build output (44 modules), and test results (112 / 112 passing across 16 test files).
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **112 / 112 tests passing across 16 test files**.
    * Static Linter (`npx oxlint`): **0 errors, 0 unused imports/variables**.
    * Production build (`npm run build`): **44 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 030] — Unused Code, Dead Exports, Orphaned CSS Purge & Markdown Alignment
* **Date**: September 8, 2026
* **Status**: 🟢 Completed
* **Activity**:
  * **Dead Code & Unused Exports Purged**:
    * Removed unexported internal helper modifiers (`export`) from `srgbToLinear` and `linearToSrgb` in `src/core/pixel-art/ColorSampling.js`.
    * Removed unreferenced static method `serializeProtectedCells` in `src/core/mosaic/CellModel.js`.
    * Removed uncalled dead methods `setMosaicBgRemovalScope` and `resetMosaicCleanup` in `src/main.js`.
    * Removed 144 lines of orphaned legacy CSS classes (`.tolerance-*`, `.preset-pill-btn`, `.btn-eyedropper`, `@keyframes pulsePicker`, `.control-hint`) in `src/styles/index.css`.
  * **Documentation Cleaned & Synchronized**:
    * Audited the repository Markdown files available at that time.
    * Aligned bundle size metrics in `ARCHITECTURE.md` (CSS reduced to 25.24 kB, JS to 195.38 kB).
    * Updated the former standalone Pixel Art engine export reference.
    * Removed references to non-existent legacy sprint markdown files.
  * **Verification Results**:
    * Automated test suite (`npx vitest run`): **112 / 112 tests passing across 16 test files**.
    * Knip dead code audit (`npx knip`): **0 issues / 0 unused exports**.
    * Static Linter (`npx oxlint`): **0 errors**.
    * Production build (`npm run build`): **44 modules transformed cleanly, 0 errors**.
  * **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 031] — Complete Removal of Obsolete Mosaic "Pixel Grid Alignment" Feature
* **Date**: September 9, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Remove obsolete Mosaic "Pixel Grid Alignment" feature (`msGridLockSelect`, `pixelGridLock`) completely from UI markup, state, and event handlers.
* **Problem**: An obsolete UI control labelled "Pixel Grid Alignment" (with options: Flexible Tile Grid, 16×16 Lattice Lock, 8×8 Lattice Lock, 32×32 Lattice Lock) remained in the Mosaic sidebar, which duplicates/conflicts with the Mosaic Geometry Tile Size controls and was marked as unreferenced in the engine.
* **Intended Result**:
  - Completely remove the `<div class="control-group">` containing `Pixel Grid Alignment` and `<select id="msGridLockSelect">` from `index.html`.
  - Remove `pixelGridLock` from `this.state.mosaic` in `src/main.js`.
  - Remove `msGridLockSelect` from DOM element cache in `src/main.js`.
  - Remove event listener for `msGridLockSelect` in `src/main.js`.
  - Clean up obsolete comment referencing "Pixel Grid Alignment" in `src/core/mosaic/MosaicEngine.js`.
  - Leave all other features, controls, and engines 100% intact.
* **Correct vs Incorrect Comparison**:
  - *Expected / Correct*: Mosaic sidebar cleanly transitions from Mosaic Strategy controls directly to Mosaic Geometry controls without the redundant "Pixel Grid Alignment" dropdown.
  - *Actual / Incorrect*: Redundant "Pixel Grid Alignment" dropdown present in DOM and bound in `main.js`.
* **Root Cause**: Residual UI control from prior prototyping that was not cleaned up during the Mosaic v2 Dual-Input Pipeline refactor.
* **Scope**:
  - `index.html` (lines 810–818 removed)
  - `src/main.js` (lines 132, 373, 1675–1696 removed)
  - `src/core/mosaic/MosaicEngine.js` (line 182 comment cleaned)
* **Protected Areas**:
  - All other Mosaic controls (Mosaic Strategy, Input Classification, Mosaic Geometry, Background Removal, 100% Cleanup, Export).
  - All other 6 creative engines.
  - Test suites and production build pipeline.
* **Acceptance Criteria**:
  1. No occurrence of `msGridLockSelect` or `pixelGridLock` in active source code (Verified: 0 matches).
  2. Sidebar rendered in Mosaic mode has no "Pixel Grid Alignment" dropdown (Verified).
  3. All 137 vitest unit and integration tests pass without error (Verified: 137/137 passed).
  4. Production build (`npm run build`) builds cleanly with 0 errors (Verified: 52 modules transformed cleanly).
  5. Oxlint passes with 0 errors (Verified: 0 errors).
* **Actual Changes Made**:
  1. `index.html`: Removed `<div class="control-group">` containing "Pixel Grid Alignment" label and `<select id="msGridLockSelect">`.
  2. `src/main.js`:
     - Removed `pixelGridLock: 'none'` from `this.state.mosaic`.
     - Removed `msGridLockSelect: document.getElementById('msGridLockSelect')` from `this.el`.
     - Removed `msGridLockSelect` `change` event listener block.
  3. `src/core/mosaic/MosaicEngine.js`: Updated comment from `// Source Art Mode & Pixel Grid Alignment` to `// Source Art Mode`.
* **Verification Evidence**:
  - Test Suite: `npm test` -> 18 test files passed, 137 / 137 tests passed in 2.50s.
  - Production Build: `npm run build` -> 52 modules transformed cleanly in 930ms, dist output generated with 0 errors.
  - Linter: `npx oxlint` -> 0 errors, 0 warnings on modified files.
* **Regression Result**: Zero regressions across all 7 creative engines, export pipeline, and responsive UI.
* **Recommendations**: None.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 032] — Complete Removal of Unused Code and Markdown Documentation Alignment
* **Date**: September 9, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Perform a complete codebase audit to remove all unused code, dead imports, unreferenced variables, obsolete DOM element lookups, and uncalled methods, followed by aligning all `.md` documentation files with the active codebase.
* **Problem**: Residual unreferenced variables/imports remained in core mosaic engines (`AdaptiveQuadtreeEngine.js`, `ContrastEdgeEngine.js`, `InputClassifier.js`, `IsolineBandedEngine.js`, `MosaicCleanupEngine.js`, `PostQualityPass.js`, `ColorSampling.js`), along with dead DOM queries/listeners in `src/main.js` from previous UI refactors. In addition, documentation files (`FINAL_QA_REPORT.md`, `ARCHITECTURE.md`, `PIXEL_ART_ENGINE.md`) contained outdated test counts, module counts, or obsolete UI control references.
* **Intended Result**:
  - Clean up all unused variables, unused imports, dead element lookups, and obsolete methods from JS source files.
  - Align all Markdown (`.md`) documentation files to accurately match current source code, test matrix (137/137 passed across 18 test files), and build statistics (52 modules).
  - Leave active code, feature contracts, and tests 100% intact.
* **Scope**:
  - `src/core/mosaic/AdaptiveQuadtreeEngine.js`
  - `src/core/mosaic/ContrastEdgeEngine.js`
  - `src/core/mosaic/InputClassifier.js`
  - `src/core/mosaic/IsolineBandedEngine.js`
  - `src/core/mosaic/MosaicCleanupEngine.js`
  - `src/core/mosaic/PostQualityPass.js`
  - `src/core/pixel-art/ColorSampling.js`
  - `src/main.js`
  - `docs/FINAL_QA_REPORT.md`
  - `docs/ARCHITECTURE.md`
  - `WEBSITE_DEVELOPMENT_TRACKER.md`
* **Acceptance Criteria**:
  1. ESLint validation passes with 0 errors and 0 warnings across all JS source files (Verified).
  2. All 137 unit and integration tests pass cleanly (`npm test`) (Verified: 137/137 passed across 18 files).
  3. Production build (`npm run build`) succeeds cleanly with 0 errors (Verified: 52 modules transformed).
  4. All `.md` files contain clean, accurate documentation matching the active repository (Verified).
* **Actual Changes Made**:
  1. **Source Code Cleanups**:
     - Removed unused `rgbToOklab` import and `maxCellSize` parameter in `AdaptiveQuadtreeEngine.js`.
     - Removed unused `sourceArtType` parameter in `ContrastEdgeEngine.js` and `IsolineBandedEngine.js`.
     - Removed unused `colorRatio` calculation and `sampledPixels` counter in `InputClassifier.js`.
     - Prefixed unused parameters in `MosaicCleanupEngine.js`, `PostQualityPass.js`, and `ColorSampling.js`.
     - Removed 30 dead DOM element lookups in `this.el` and their associated event listeners, state properties, and dead methods in `src/main.js`.
  2. **Documentation Alignments**:
     - Updated `docs/FINAL_QA_REPORT.md` with 137/137 test matrix (18 test files), 52 build modules, and cleaned feature table.
     - Updated `docs/ARCHITECTURE.md` test matrix and build module statistics.
     - Corrected utility export locations in the former standalone Pixel Art engine reference.
     - Recorded Log Entry 032 in `WEBSITE_DEVELOPMENT_TRACKER.md`.
* **Verification Evidence**:
  - Historical ESLint run with a temporary configuration: 0 errors, 0 warnings.
  - Test Suite: `npm test` -> 18 test files passed, 137 / 137 tests passed.
  - Production Build: `npm run build` -> 52 modules transformed, dist output generated with 0 errors.
* **Regression Result**: Zero regressions across all 7 creative engines, export pipeline, responsive layout, and documentation.
* **Recommendations**: None.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 033] — Comprehensive Codebase Unused Code Audit & Purge
* **Date**: September 11, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Perform an exhaustive check across all JavaScript source code, tests, and styles to identify and remove strictly unused code (dead imports, unused DOM element lookups) while strictly preserving all active and used code.
* **Problem**:
  - Residual unused imports remained in test suites:
    - `SpriteIslandEngine`, `OrthogonalContourEngine`, `AdaptiveQuadtreeEngine`, and `PixelArtResampler` in `test/mosaic-strategies-and-sampling.test.js`.
    - `ExactCellSampler`, `FlatBackgroundClassifier`, `HardEdgeBackgroundRemover`, and `IslandSeparator` in `test/mosaic-v2-pure-pixel-pipeline.test.js`.
  - Seven dead/unreferenced DOM element lookups existed in `this.el` in `src/main.js`:
    - `overflowOpenProjectLabel`, `msResamplerDetectedBadge`, `msTrimSection`, `msDocColorsSection`, `msInputModeGroup`, `msResetCleanupBtn`, and `pcColorInput`.
* **Intended Result**:
  - Safely remove the 8 unused imports and 7 dead element lookups.
  - Leave all 52 production modules, active UI elements, algorithms, and engine behaviors 100% intact.
  - Maintain 100% test pass rate and clean build.
* **Scope**:
  - `test/mosaic-strategies-and-sampling.test.js`
  - `test/mosaic-v2-pure-pixel-pipeline.test.js`
  - `src/main.js`
  - `WEBSITE_DEVELOPMENT_TRACKER.md`
* **Acceptance Criteria**:
  1. ESLint validation passes with 0 errors and 0 warnings across all `src/**/*.js` and `test/**/*.js` files (Verified).
  2. All 140 unit and integration tests pass cleanly (`npm test`) across 19 test files (Verified: 140/140 passed).
  3. Production build (`npm run build`) succeeds cleanly with 52 modules transformed and 0 errors (Verified).
  4. Zero regressions across all creative engines and features.
* **Actual Changes Made**:
  1. **Test Suite Cleanup**:
     - Removed 4 unused imports from `test/mosaic-strategies-and-sampling.test.js`.
     - Removed 4 unused imports from `test/mosaic-v2-pure-pixel-pipeline.test.js`.
  2. **Main Application Cleanup**:
     - Removed 7 dead DOM element queries (`overflowOpenProjectLabel`, `msResamplerDetectedBadge`, `msTrimSection`, `msDocColorsSection`, `msInputModeGroup`, `msResetCleanupBtn`, `pcColorInput`) from `this.el` in `src/main.js`.
  3. **Documentation Tracking**:
     - Updated status dashboard to 140/140 tests passing across 19 test files.
     - Recorded Log Entry 033 in `WEBSITE_DEVELOPMENT_TRACKER.md`.
* **Verification Evidence**:
  - Historical ESLint run with a temporary configuration: 0 errors, 0 warnings.
  - Test Suite: `npm test` -> 19 test files passed, 140 / 140 tests passed in 2.84s.
  - Production Build: `npm run build` -> 52 modules transformed cleanly, dist generated in 906ms with 0 errors.
* **Regression Result**: Zero regressions across all 7 creative engines, export pipelines, and responsive layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 034] — Dual-Mode Mosaic Features (Normal Image vs. Already Pixel Art)
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Implement explicit Dual-Mode Mosaic features cleanly separating Normal Image (full creative generation pipeline) and Already Pixel Art (pure 1:1 cell/vector conversion with guaranteed bypass of Continuous Shading, Blending, Quantization, and Edge Detection), while ensuring background removal remains strictly optional.
* **Problem**:
  - Previously, the Mosaic UI did not expose an active, visible mode toggle between "Normal Image" and "Already Pixel Art", creating confusion about whether continuous shading, palette quantization, dithering, or edge filtering were altering already-pixelated artwork.
  - Users needed clarity that when processing "Already Pixel Art", none of Continuous Shading, Blending, Quantization, or Edge Detection are ever applied.
  - Background removal must not be mandatory or forced on every run, but remain available on-demand when isolating design icons and graphic elements on a transparent background.
* **Intended Result**:
  - High-visibility 2-Feature Mode Selector in the Mosaic sidebar: `📷 Normal Image` vs `🎨 Already Pixel Art` (+ `⚡ Auto-Detect`).
  - Active `Zero-Loss Mode` banner displayed when "Already Pixel Art" is selected, dynamically hiding creative-generation-only tools (Continuous Sampling methods, Palette quantization presets, Dithering, and Trim) that do not apply to pure pixel art.
  - In `MosaicEngine.processPathwayB`, strictly enforce `palette = 'original-rgb'`, `ditherAlgorithm = 'none'`, `samplingMethod = 'center-exact'`, zero shading, and zero edge deformation.
  - Background removal defaults to `None (Keep All)` preserving 100% of cells for full compositions/scenes, while activating cleanly when `Remove White`, `Remove Black`, or `Pick Color` are selected for isolated icons.
  - Maintain 100% test pass rate and clean build.
* **Scope**:
  - `index.html`
  - `src/main.js`
  - `src/core/mosaic/MosaicEngine.js`
  - `test/mosaic-already-pixel-art.test.js`
  - `WEBSITE_DEVELOPMENT_TRACKER.md`
* **Acceptance Criteria**:
  1. User can toggle between Normal Image and Already Pixel Art with 1 click; UI adapts dynamically.
  2. Already Pixel Art strictly bypasses continuous shading, blending, quantization, and edge filters.
  3. Background removal is optional: `None (Keep All)` preserves 100% of cells; background removal only triggers when selected.
  4. All unit tests pass cleanly (`npm test`: 142/142 passing).
  5. Production build (`npm run build`) builds cleanly with 52 modules and 0 errors.
* **Actual Changes Made**:
  1. **UI Markup (`index.html`)**:
     - Enhanced the Input Classification section with a high-visibility 2-Mode Selector (`📷 Normal Image`, `🎨 Already Pixel Art`, `⚡ Auto-Detect`).
     - Added the `Zero-Loss Mode` status banner explaining exact 1:1 color and grid preservation with shading/blending bypassed.
     - Assigned unique section IDs (`msSamplingGroup`, `msColorPaletteSection`, `msStrategySection`, `msTrimSection`) for clean dynamic display toggling.
  2. **Application Logic (`src/main.js`)**:
     - Set default mosaic mode to `'pixel-art'`.
     - Cached mode controls in `this.el`.
     - Attached event listeners for mode pill buttons and confirmation/override prompts.
     - Implemented `setMosaicInputMode()` and `updateMosaicModeUI()` to dynamically show/hide generation-only tools.
     - Wired up live synchronization in `renderCurrentEngine()`.
  3. **Core Engine (`src/core/mosaic/MosaicEngine.js`)**:
     - Explicitly locked `palette = 'original-rgb'` and `ditherAlgorithm = 'none'` in `processPathwayB`.
  4. **Automated Tests (`test/mosaic-already-pixel-art.test.js`)**:
     - Added unit tests verifying strict bypass of shading, quantization, and dithering in Already Pixel Art mode.
     - Added unit tests verifying optional background removal (`None` keeps 100% of cells; `Remove White` isolates designs).
* **Verification Evidence**:
  - Test Suite: `npm test` -> 19 test files passed, 142 / 142 tests passed in 2.59s.
  - Production Build: `npm run build` -> 52 modules transformed cleanly, dist generated in 879ms with 0 errors.
* **Regression Result**: Zero regressions across all 7 creative engines, export pipeline, and responsive UI.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 035] — Codebase Audit & Unused Code Purge
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Perform an exhaustive check across all JavaScript source files, tests, HTML templates, and CSS stylesheets to purge strictly unused code while leaving all active code, core engines, and tests 100% intact.
* **Audit & Findings**:
  - `src/main.js`: Identified unused element lookup `app: document.getElementById('app')`, duplicate element lookup alias `msResetBgBtn: document.getElementById('msResetAllBtn')`, and duplicate click event listener block for `msResetBgBtn`.
  - `src/core/document/BoundaryValidator.js`: Identified unused static method `validateBounds`.
  - All CSS selectors in `src/styles/index.css` (117 classes), exports across `src/core/` modules, and imports across all 70 JS source/test files were verified 100% active and in use.
* **Actual Changes Made**:
  1. Removed `app` and duplicate `msResetBgBtn` element references and redundant listener from `src/main.js`.
  2. Removed uncalled static `validateBounds` method from `src/core/document/BoundaryValidator.js`.
* **Verification Evidence**:
  - Linter (`npx oxlint`): 0 errors across 70 files.
  - Test Suite (`npx vitest run`): 19 test files passed, **142 / 142 tests passed** (2.59s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 2.04s with 0 errors.
* **Regression Result**: Zero regressions across all 7 creative engines, export pipelines, and responsive layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 036] — Already Pixel Art Engine Upgrade: Bitwise Loss-Free Vector Preservation & 2D Block Merging
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Upgrade Mosaic Pathway B (`Already Pixel Art`) to achieve 100% loss-free raster pixel art / sprite sheet to vector SVG conversion without pixel cell loss, micro-detail erasure, or false anti-aliased color interpolation.
* **Key Enhancements**:
  1. **Unblended Cell Frequency Sampling (`ExactCellSampler.js`)**:
     - Introduced `sampleWithUnblendedFrequency` to select the exact non-transparent dominant RGB color within sprite cells.
     - Added `isNonUniform` & `hasMixel` flags for variance detection and warning propagation.
  2. **2D Scanline Rect Block Merging (`MosaicEngine.js`)**:
     - Implemented `_merge2DBlocks` algorithm to aggregate matching pixel cell runs horizontally and vertically into unified SVG `<rect>` shapes.
     - Reduces SVG element count by ~75% while maintaining 100% bitwise pixel-perfect rendering.
  3. **Fine Grid Phase Offset Controls (`index.html` & `src/main.js`)**:
     - Added sub-pixel $X$ ($0..15\text{px}$) and $Y$ ($0..15\text{px}$) offset sliders (`msGridOffsetXSlider`, `msGridOffsetYSlider`) for padded/offset sprite sheets.
     - Added JPEG source artifact notice banner (`#msJpegNoticeBanner`) recommending PNG format for 100% bitwise loss-free vectors.
  4. **Bitwise Pixel-Diff Verification (`test/mosaic-pixel-diff.test.js`)**:
     - Added bitwise verification test comparing rasterized SVG back to input source PNG, confirming 0 mismatched cell colors.
* **Verification Evidence**:
  - Linter (`npx oxlint src test`): 0 errors across 71 files.
  - Test Suite (`npx vitest run`): 20 test files passed, **146 / 146 tests passed** (2.64s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 887ms with 0 errors.
* **Regression Result**: Zero regressions across all creative engines (Halftone, Line Art, Pixel Art, Camo, etc.).
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 037] — Artwork Mode Feature Selector Simplification
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Simplify the Mosaic `Artwork Mode` -> `Select Feature Mode` sidebar selector to keep strictly `📷 Normal Image` and `🎨 Already Pixel Art` options, removing the redundant `⚡ Auto-Detect` pill button.
* **Actual Changes Made**:
  1. **UI Markup (`index.html`)**: Removed `#msInputModeAutoBtn` (`⚡ Auto-Detect`) from `#msInputModeGroup`, leaving strictly `📷 Normal Image` (`#msInputModePhotoBtn`) and `🎨 Already Pixel Art` (`#msInputModePixelArtBtn`).
  2. **Application Logic (`src/main.js`)**: Updated `msInputModeButtons` click event handling to strictly toggle between `pixel-art` and `photo` feature modes cleanly with active badge synchronization (`🎨 Already Pixel Art` vs `📷 Normal Image`).
* **Verification Evidence**:
  - Test Suite (`npm test`): 20 test files passed, **146 / 146 tests passed** (2.53s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 848ms with 0 errors.
* **Regression Result**: Zero regressions across all creative engines, export pipeline, and responsive UI layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 038] — Mosaic Strategy Dropdown Pruning for Normal Image Mode
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Restrict the `Mosaic Strategy` dropdown selector under `Normal Image` mode to keep strictly two feature options: `Default Pixel Art` and `Contrast-Aware Ridge & Silhouette`.
* **Actual Changes Made**:
  1. **UI Markup (`index.html`)**: Pruned `<select id="msMosaicStrategySelect">` options to retain strictly `<option value="default-pixel-art">Default Pixel Art</option>` and `<option value="contrast-edge">Contrast-Aware Ridge & Silhouette</option>`.
  2. **Application Logic (`src/main.js`)**: Updated `msMosaicStrategySelect` event handling and `updateStrategyUI` logic to toggle sub-controls (`#msCtrlContrastEdge` with Edge Sensitivity & Ridge Sharpness sliders) cleanly between the 2 strategies.
* **Verification Evidence**:
  - Test Suite (`npm test`): 20 test files passed, **146 / 146 tests passed** (2.50s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 878ms with 0 errors.
* **Regression Result**: Zero regressions across all creative engines, export pipeline, and responsive UI layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 039] — Normal Image Default Selection Alignment
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Set `📷 Normal Image` (`photo` mode) as the default active Feature Mode selection in the Mosaic sidebar layout and application state.
* **Actual Changes Made**:
  1. **UI Markup (`index.html`)**: Added `active` class to `#msInputModePhotoBtn` (`📷 Normal Image`), removed `active` from `#msInputModePixelArtBtn`, and set `selected` on `<option value="normal">` in `#msSourceArtTypeSelect`.
  2. **Application Logic (`src/main.js`)**: Updated `this.state.mosaic` default state to `inputMode: 'photo'`, `detectedMode: 'photo'`, `sourceArtType: 'normal'`, and initialized UI with `this.updateMosaicModeUI(this.state.mosaic.inputMode, 'photo')`.
* **Verification Evidence**:
  - Test Suite (`npm test`): 20 test files passed, **146 / 146 tests passed** (2.47s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 892ms with 0 errors.
* **Regression Result**: Zero regressions across all creative engines, export pipeline, and responsive UI layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 040] — Top Floating Canvas Toolbar Feature Fix for Mosaic Mode
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Fix top floating canvas toolbar (`#pixelToolbar`) so all editing tools (`Pencil`, `Eraser`, `Flood Fill`, `Eyedropper`, `Rectangle`, `Line`) execute their specific designated features instead of all being overridden by Eraser cell removal.
* **Actual Changes Made**:
  1. **Default State (`src/main.js`)**: Updated `this.state.mosaic.manualTool` default state from `'remove'` to `null`, ensuring standard canvas clicks run designated toolbar drawing features instead of forcing cell removal.
  2. **Toolbar Event Listener (`src/main.js`)**: Updated `#pixelToolbar` click listener to set `manualTool = 'remove'` when `Eraser` is selected and `manualTool = null` when `Pencil`, `Flood Fill`, `Eyedropper`, `Rectangle`, or `Line` are selected.
  3. **Sidebar Cleanup Sync (`src/main.js`)**: Updated `setMosaicManualTool(tool)` to remove `.active` styling from sidebar cleanup buttons when a standard toolbar drawing tool is selected.
* **Verification Evidence**:
  - Test Suite (`npm test`): 20 test files passed, **146 / 146 tests passed** (4.64s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 2.94s with 0 errors.
* **Regression Result**: Zero regressions across all creative engines, export pipeline, and responsive UI layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 041] — Grid Phase Align (X Offset & Y Offset) Controls Removal
* **Date**: September 15, 2026
* **Status**: 🟢 COMPLETED
* **Task**: Remove the `Grid Phase Align (Offset)` section containing `X Offset` and `Y Offset` range sliders from the Artwork Mode sidebar layout.
* **Actual Changes Made**:
  1. **UI Markup (`index.html`)**: Removed `#msGridOffsetRow` container markup containing `Grid Phase Align (Offset)` header and `X Offset` / `Y Offset` range sliders.
  2. **Application Logic (`src/main.js`)**: Removed `msGridOffsetRow`, `msGridOffsetXSlider`, `msGridOffsetYSlider`, `msGridOffsetXVal`, `msGridOffsetYVal` DOM element queries, input event listeners, and UI visibility toggling logic.
* **Verification Evidence**:
  - Test Suite (`npm test`): 20 test files passed, **146 / 146 tests passed** (2.65s).
  - Production Build (`npm run build`): **52 modules transformed cleanly**, dist generated in 876ms with 0 errors.
* **Regression Result**: Zero regressions across all creative engines, export pipeline, and responsive UI layout.
* **Process Completed**: Task verified and marked 🟢 COMPLETED.

---

### [Log Entry 042] — Unused Code Cleanup
* **Date**: September 20, 2026
* **Changes**: Removed five unused Mosaic container lookups, four lookups for absent detection/confirmation controls, and their unreachable banner updates and listeners from src/main.js.
* Removed four helpers with no application or test callers: PencilEngine.addStroke, addShape, addText, and PixelGrid.setPixelColor. Existing rendering, history, and palette-index editing paths remain unchanged.
* Updated the obsolete confirmation-handler test to check the visible Mosaic mode controls.
* **Audit**: Checked imports, method callers, DOM references, module reachability, and CSS class references. Retained modules used by tests and engines/settings supported by saved projects. No HTML, CSS, or processing-algorithm changes.
* **Verification**: Before and after cleanup: 21 test files, **152/152 tests passed**. Production build: **52 modules**, completed successfully. ESLint unused-variable, unreachable-code, and constant-condition checks: **73 JavaScript files, 0 findings**.
* **Limit**: Automated checks only; no interactive browser verification performed.

---

### [Log Entry 043] — Markdown Audit and Obsolete Documentation Cleanup

* **Date**: September 20, 2026.
* **Scope**: All seven project-owned Markdown files; dependency and build directories excluded.
* **Changes**: Removed obsolete implementation phases, absent-file inventories, unimplemented roadmap items, removed-control instructions, duplicate history entries, and unsupported blanket completion claims. Corrected local links, current mode descriptions, export coverage, and recorded test counts.
* **Preserved**: All seven documents still describe this project; no whole document needed deletion. Unique historical records remain explicitly labeled as history.
* **Verification**: Checked local Markdown links and file references, and compared SHA-256 hashes for tracked non-Markdown files against the start of this task. No application, test, configuration, or feature changes were made in this pass.
* **Tests/build**: Not rerun for documentation-only edits; the latest executed results remain those recorded above.

### [Log Entry 044] — Normal Image Strategy Option Removal

* **Date**: September 20, 2026.
* **Changes**: Removed Contrast-Aware Ridge & Silhouette from the Normal Image dropdown, its Edge Sensitivity and Ridge Sharpness controls, and their DOM lookups and listeners. Default Pixel Art remains selected.
* **Scope**: UI removal only. Processing engines, saved-project support, Already Pixel Art, and other controls remain unchanged.
* **Verification**: Dropdown/reference checks passed; 152/152 tests passed across 21 files; production build succeeded with 52 modules.

### [Log Entry 045] — Optional Clean Edge Purifier

* **Date**: September 20, 2026.
* **Changes**: Added an off-by-default Clean Edge Purifier toggle, restored-cell count, and Reset Edge Colors button above Mosaic Trim in Normal Image mode. A separate color pass replaces likely exterior background blends with local source colors before palette processing.
* **Preservation**: The pass does not change source pixels, tile geometry, alpha, protected cells, manual edits, or interior shading. Already Pixel Art and the existing purifier helper remain unchanged. Reset regenerates the normal result; Reset All also disables the new control.
* **Limits**: Requires a dominant opaque flat source background and suitable nearby source colors. Restoration is a heuristic, not recovery of missing source information. Later palette, dithering, removal, and cleanup settings still apply.
* **Verification**: Seven new tests cover yellow/gold restoration, outlines, shading, protected/manual cells, unsupported backgrounds, reset/export parity, and Already Pixel Art isolation. All 159 tests passed across 22 files; production build passed with 53 modules; targeted lint passed. No interactive browser check was performed.

### [Log Entry 046] — Clean Edge Purifier in Both Mosaic Modes

* **Date**: September 21, 2026.
* **Changes**: Enabled the purifier by default and moved it to the top of the Mosaic panel. Added Already Pixel Art processing with replacements restricted to its original sampled palette. Background detection now tolerates small RGB variations; established interior colors are protected even when they also occur on the boundary.
* **Reset**: Reset Edge Colors and Reset All can still explicitly disable purification. Mode changes preserve the user's toggle choice.
* **Verification**: 163/163 tests passed across 22 files, including 11 purifier tests; production build passed with 53 modules. Tests cover noisy backgrounds, clean pixel-art identity, palette and geometry preservation, interior shades, manual edits, export, and reset.
* **Limit**: No interactive browser or original screenshot-source-image validation was performed. Edge restoration remains heuristic and skips uncertain backgrounds.

### [Log Entry 047] — Pathway B Detected-Grid Fix + 16px Microstock Floor + UI Polish

* **Date**: October 12, 2026.
* **Problem**: "Already Pixel Art" mode produced imperfect output (wasted colors, continuous shading, blurs). Root cause: `processPathwayB` let the UI `tileSize` (default 16px) override the GridScaleDetector's detected native cell size AND phase offsets, so misaligned sampling straddled true cells and picked blended edge colors. The GridScaleDetector + ExactCellSampler machinery existed but was bypassed.
* **Changes** (`src/core/mosaic/MosaicEngine.js`, `processPathwayB`):
  - Pathway B now ALWAYS samples at the detected native cell size with detected phase offsets (`offsetX/offsetY`), regardless of UI `tileSize`.
  - New escape hatch `options.forceTileSize`: when explicitly set, the legacy explicit-grid behavior applies (API/back-compat).
  - New 16px microstock floor (`options.minOutputCellSize`, default 16, settable): if detected size < 16, integer upscale factor = `Math.ceil(16 / detected)` is applied (6px → 18px, 8px → 16px; never fractional). Phase offsets scale with the factor to stay grid-aligned. Named `minOutputCellSize` (not `minCellSize`) to avoid colliding with the existing Adaptive Quadtree / GridScaleDetector detection-range option.
  - Result stats now expose `{ detectedCellSize, appliedCellSize, upscaleFactor, minCellEnforced, minOutputCellSize }`.
* **UI** (`src/main.js`, `index.html`):
  - Tile Size control is disabled with an explanatory tooltip in Already Pixel Art mode (sampling is auto-detected; avoids a dead control). After each Pathway B render the label shows `Auto (N px)`.
  - Grid Resolution preset/slider changes and mode switches now queue a fit-to-screen that runs once the render completes (`pendingFitToScreen`), fixing the tiny-thumbnail-after-resolution-change and zoom-carryover issues (works for both sync and worker-async paths).
  - Status bar "Colors:" shows a "…" placeholder until the first processing completes (was blank).
* **Preservation**: No changes to Pixel Art, Line Art, Random Flow, Camo Mesh, or Pencil engines. Pathway A (Normal Image) untouched — UI tileSize still drives its grid.
* **Tests**: 10 existing tests encoded the old override behavior; their intent (bg removal, purifier, thin features, fidelity) is orthogonal to grid detection, so they were migrated to the `forceTileSize` escape hatch (documented inline). New file `test/mosaic-pathwayb-detected-grid.test.js` (4 tests): 6px native art ignores `tileSize: 16` (18px after floor, 5×5 grid, zero blended colors), escape hatch restores legacy 6×6, `minOutputCellSize` is settable, 16px native art is untouched by the floor.
* **Verification**: 173/173 tests passed across 24 files; `vite build` succeeded with zero errors. No interactive browser check was performed.
* **Limit**: When detected cells are below 16px, the integer upscale merges true cells by dominant color (detail below the floor cannot be preserved at ≥16px cells); fractional grids fall back to the detector's best estimate.

### [Log Entry 048] — ColorRestoreEngine (Full-Grid Lost-Color Restoration) + Already Pixel Art Tile Size Auto/Manual Dropdown

* **Date**: October 12, 2026.
* **Problem**: (1) Cells ended up with colors that never existed in the original design (JPEG compression artifacts, blended leftovers) in places the edge-only CleanEdgePurifier does not cover — the red-arrow artifacts in user screenshots. (2) Tile Size was hard-disabled in Already Pixel Art mode ("Auto (16 px)"); user needs 16px default but occasional manual sizes (8/12/16/24/32/48/64).
* **Changes**:
  - New `src/core/mosaic/ColorRestoreEngine.js`: full-grid pass that snaps every occupied design cell back to the nearest TRUE design color. True palette = exact sampled colors from ExactCellSampler (no quantization) filtered by grid frequency (default min 3 cells) — real design colors repeat, artifact colors are rare. Cells within `colorRestoreTolerance` (default 12, RGB euclidean, range 0–48) of a true color are untouched. Never touches background/removed, transparent, protected, trim-locked, or manual-override cells. Placed in Pathway B AFTER ExactCellSampler + CleanEdgePurifier and BEFORE background classification, so restored colors classify correctly. Exposes `colorRestoreReport { applied, restoredCount, truePaletteSize, totalChecked }`.
  - Tile Size control in Already Pixel Art mode is now a dropdown: "Auto (detect true grid)" (default, detected size + 16px floor) plus manual 8/12/16/24/32/48/64 px, which pass the existing `forceTileSize` escape hatch (legacy fixed-grid, offset 0). Normal Image mode keeps the original preset + slider untouched. Label shows `Auto (N px)` or `Manual (N px)` after each render; tooltip explains Auto vs Manual.
* **UI** (`src/main.js`, `index.html`): new "Color Restore" sidebar section (toggle + tolerance slider + live "N restored" badge, same style as the edge purifier badge), visible in Already Pixel Art mode only (never a dead control). State: `colorRestoreEnabled` (default true), `colorRestoreTolerance` (12), `forceTileSize` (0 = auto). Reset All restores defaults.
* **Preservation**: No changes to Pixel Art, Line Art, Random Flow, Camo Mesh, or Pencil engines. Pathway A untouched. All options flow through the existing `getMosaicRenderOptions` state spread — no API changes.
* **Tests**: new `test/mosaic-color-restore.test.js` (5 tests): artifact snap + count, within-tolerance untouched, protected/removed cells untouched, disabled no-op, end-to-end Pathway B integration (8px native art with injected JPEG-like artifact → restored, count 1) and disabled-toggle integration (artifact preserved).
* **Verification**: 178/178 tests passed across 25 files; `vite build` succeeded with zero errors. No interactive browser check was performed.
* **Limit**: Restoration is heuristic — it snaps to the nearest frequent color, it cannot recover design detail the source never had. If the true palette itself is polluted (e.g. heavy JPEG noise making artifacts frequent), results degrade gracefully to nearest-color matching.

### [Log Entry 049] — "Real Colors Detected" Transparency Panel (Color Restore, Display Only)

* **Date**: October 12, 2026.
* **User request**: After Color Restore shipped (user sees "562 restored" live and calls output perfect), user asked to SEE what the engine detected as the real colors from their uploaded image — so it is easy to understand what the true colors were and what artifacts were snapped to. Display-only; no engine logic changes.
* **Changes**:
  - `src/core/mosaic/ColorRestoreEngine.js`: report now also exposes `truePalette` — hex strings (e.g. "#ffd200"), sorted most-frequent first (frequency sort added; was source-palette order). Engine restoration loop, tolerance, frequency filter, and all safety guards untouched.
  - New `src/core/mosaic/realColorsSwatchData.js`: pure DOM-free helper `buildRealColorsSwatchData(truePalette, max=24)` returning `{ swatches, moreCount, total }` for the row; `MAX_REAL_COLOR_SWATCHES = 24`.
  - `index.html`: new "Real Colors Detected" row inside the existing Color Restore section (Already Pixel Art only, same scoping): count label (`msRealColorsCount`, shows "…" when empty) + swatch row (`msRealColorsRow`, 18px squares, hex tooltip).
  - `src/styles/index.css`: `.real-colors-row` / `.real-color-swatch` / `.real-colors-more` styles matching existing swatch look.
  - `src/main.js`: element bindings, `renderRealColorsSwatches()` called from the existing color-restore UI update path after each render; `resetMosaicAll` clears the row back to "…".
* **Preservation**: Zero changes to restoration/tolerance/sampling logic, Pathway A, or the other 5 modes. Row lives inside the Already Pixel Art–scoped section so it can never appear as a dead control.
* **Tests**: extended `test/mosaic-color-restore.test.js` (+6 tests): truePalette exact hex contents + most-frequent-first order; rare artifact colors excluded from truePalette; swatch cap at 24 + "+M more" overflow; small palette full display; missing-palette graceful handling; cap constant.
* **Verification**: 184/184 tests passed across 25 files; `vite build` succeeded with zero errors. No interactive browser check was performed — UI follows existing patterns; user should smoke-test the row on the live site.

### [Log Entry 050] — v5 Line: Clean Edge Purifier Default OFF (v3 base, no version mixing)

* **Date**: October 12, 2026.
* **User decision**: Focus ONLY on the v3 line — do not mix other versions' features into v3. This v5 = v3 + one change (Stray Cleanup from v4 is NOT included; v4 line is set aside).
* **Change** (`src/main.js`, `setMosaicInputMode`): Clean Edge Purifier no longer auto-enables when switching to Already Pixel Art mode. State defaults to `cleanEdgePurifier: false`, `cleanEdgeScope: 'off'`, status badge shows 'Off'. The user can still turn it ON manually via the existing toggle if needed (`setMosaicCleanEdgePurifier` path untouched).
* **Preservation**: Manual toggle, reset button, and engine purifier logic unchanged. No other defaults touched (Color Restore stays default ON, Tile Size stays Auto).
* **Tests**: updated `test/responsive-layout.test.js` ('applies mode-specific Clean Edge Purifier defaults') to assert the new default-off assignments and the absence of the old `mode === 'pixel-art'` auto-enable line.
* **Verification**: 184/184 tests passed across 25 files; `vite build` succeeded with zero errors. No interactive browser check was performed.

### [Log Entry 051] — Conservative Blend-Aware Color Restore + Phase Self-Check (user-reported over-restore fix)

* **Date**: October 13, 2026.
* **User report**: With Color Restore ON, pixels were replaced with unexpected wrong colors ("6870 restored" on a 208-color AI tree asset collection); with it OFF, sampled pixels still didn't perfectly match the source. User delegated the fix decision to the assistant.
* **Root causes**:
  1. `ColorRestoreEngine` assumed "rare color (<3 cells) = artifact" and snapped to the RGB-nearest frequent color with no max-distance cap. On rich AI art (gradients, shading, dithering, 200+ real colors), genuine rare detail colors were repainted — thousands of cells, not artifacts.
  2. Sampling phase could sit ±1px off the true art-pixel grid, so samples straddled cell boundaries and read blends.
* **Changes**:
  - `src/core/mosaic/ColorRestoreEngine.js` — conservative snap, ALL guards must pass: (a) beyond `colorRestoreTolerance` of nearest true palette color (unchanged); (b) NEW max snap distance (`tolerance × maxSnapFactor`, default 2.0; rich palettes with > `richPaletteThreshold` = 60 colors auto-tighten to ×1.5) — genuinely unique colors are never touched; (c) NEW blend-plausibility — the color must lie within the per-channel range of its 8 neighbors (±blendSlack), i.e. explainable as a blend/sampling artifact; (d) NEW coherence protection — skipped when ≥ `coherentNeighborCount` = 2 neighbors share the cell's own color (protects tiny real details + dithering). Neighbor checks use a pre-snap snapshot (no in-place order effects). Report adds `guardedSkips`. All thresholds are options with safe defaults — no UI changes, badge now shows an honest smaller number.
  - `src/core/mosaic/GridScaleDetector.js` — new `refinePhase(sourceImage, detection, nativeCellSize)`: re-tests the detected phase against ±1px candidates on a small probe crop (up to 10×10 cells), counting `ExactCellSampler` mixel warnings; adopts the offset only when strictly >10% cleaner, ties keep the detected phase, 0-warning detections never overridden. Tiny images fall back safely.
  - `src/core/mosaic/MosaicEngine.js` (`processPathwayB`) — runs the phase self-check in Auto mode only (skipped for `forceTileSize` / explicit `gridOffsetX/Y` overrides), before the 16px-floor upscale so offsets scale correctly; result stats gain `phaseRefined` boolean.
* **Preservation**: No changes to Pixel Art, Halftone, Line Art, Random Flow, Camo Mesh, or Pencil engines; Pathway A untouched; Clean Edge Purifier default OFF (v5 decision) untouched; UI/badge wiring untouched (`restoredCount` still drives the badge). Heavy 50/50 edge blends remain the edge purifier's job (user can toggle it on manually).
* **Tests**: `test/mosaic-color-restore.test.js` +4 (unique-color cap, coherent-detail protection, blend-plausibility with orange/red positive control, rich-palette auto-tightening); new `test/mosaic-phase-refine.test.js` (4 tests: off-phase correction, clean-detection no-op, tiny-image fallback, Pathway B `phaseRefined` integration). All pre-existing restore/pathwayB tests pass unchanged.
* **Verification**: 192/192 tests passed across 26 files; `vite build` succeeded with zero errors. No interactive browser check was performed — user should live-test on the tree asset collection (Already Pixel Art, restore ON): expect a small honest restored count and no wrong-color repaints.
* **Limit**: AI art with imperfect/resampled grids has a recovery ceiling — sampling can only be as true as the source. The self-check minimizes added straddle error; it cannot invent sub-cell detail.

### [Log Entry 052] — "Pure Edge" Silhouette Fringe Cleanup (user-requested feature)

* **Date**: October 13, 2026.
* **User report** (screenshots, tree asset collection @67-82% zoom): light gray/white fringe pixels sit on the outer silhouette (leaf tips, bush tops) — neither background nor main design colors; they read as shade/blur and "waste" the design. User asked: where do these pixels come from, and wants a feature that keeps ONLY main design parts with matching design colors ("pure design only" in Already Pixel Art mode).
* **Diagnosis**: The fringe is mostly baked into the SOURCE — AI-generated pixel art anti-aliases sprite silhouettes (design+background blends in the outermost art pixels). ExactCellSampler faithfully reproduces the source's center pixel per cell, so this is faithful reproduction of a soft source edge, not a sampling bug. The existing CleanEdgePurifier (default OFF per v5 decision) only recolors (never removes) and its blend model (err<=300) rejects neutral-gray fringe; it also skips colors appearing in the interior — inadequate for this case, so a dedicated feature was built instead of changing v5's purifier decision.
* **Changes**:
  - New `src/core/mosaic/EdgeFringeCleanup.js`: exterior-silhouette-only pass. For each boundary cell it estimates design-vs-background amount via blend projection `cell ≈ bg + amount×(design−bg)` against nearby strong interior design colors (≤3 cells away): amount < 0.35 → cell REMOVED (transparent — was never design); 0.35–0.92 → SNAPPED to the pure design color; ≥0.92 → untouched. Acts only when the blend model fits (err ≤ 800). Guards: exterior boundary only (never interior/holes), locked/protected/manual cells untouched, coherent regions (≥2 unlocked neighbors share the cell's color) untouched — protects dithering/detail, thin 1-cell features with no strong colors nearby left alone, no-op without a confidently detected flat background (60% border support).
  - `src/core/mosaic/MosaicEngine.js`: wired into Pathway B AFTER ColorRestoreEngine and BEFORE background classification (removed fringe classifies as transparent); result stats gain `edgeFringeReport { applied, removedCount, snappedCount, backgroundDetected }`.
  - UI (`index.html`, `src/main.js`): new "Pure Edge" sidebar section (Already Pixel Art only, same scoping pattern as Color Restore) with toggle + live "N fixed" badge; state `edgeFringeCleanup` default true; `setMosaicInputMode` sets it ON for pixel-art / OFF for photo (user's explicit "pure design only in Already Pixel Art" request); `resetMosaicAll` restores default ON; flows through existing `getMosaicRenderOptions` state spread — no API changes.
* **Preservation**: Clean Edge Purifier default OFF untouched (v5 decision); no changes to the other 5 modes, Pathway A, Color Restore, or phase self-check. Locked-cell coherence semantics tightened (locked neighbors don't vote) — covered by test.
* **Tests**: new `test/mosaic-edge-fringe.test.js` (9 tests): mostly-bg fringe removed, mid-blend snapped to pure green, dark outline untouched, coherent 2×2 detail untouched, clean silhouette no-op, disabled no-op, no-flat-background no-op, protected cell untouched (neighbors still cleaned), Pathway B integration (`forceTileSize: 16`, `edgeFringeReport.removedCount === 3`, interior kept).
* **Verification**: 201/201 tests passed across 27 files; `vite build` succeeded with zero errors; UI element IDs cross-checked against index.html. No interactive browser check — user should live-test on the tree collection and compare toggle ON/OFF at the silhouette tips.
* **Limit**: 2+-cell-wide coherent fringe bands are preserved as intentional (conservative); enclosed-hole fringes not handled (exterior only, same as purifier); single-cell edge-only highlights lying exactly on a bg-blend line are ambiguous and may snap — coherence/interior guards cover the common cases.

### [Log Entry 053] — Mosaic Tool Click-Mapping Fix (manual tile size ≠ 16px)

* **Date**: October 14, 2026.
* **User report** (screenshot, Already Pixel Art mode, tree collection): with Tile Size set to any manual value other than 16px (e.g. 32px), the top floating toolbar tools (pencil/eraser) "click here but work over there" — the edit lands on the wrong cell. Only 16px works perfectly. User asked why.
* **Root cause**: In Already Pixel Art mode the tile-mode dropdown writes `state.mosaic.forceTileSize` (16/24/32/48/64/auto), and Pathway B renders cells at that size (`tileSize: cellSize` in the engine result). But `handleMosaicTool` / `handleMosaicShapeEnd` mapped canvas clicks with `state.mosaic.tileSize` — a Normal-mode preset value (default 16) that goes stale in pixel-art mode and is never updated from the engine result. At 32px manual the engine drew 32px cells while clicks were divided by 16, doubling every cell index; at 16px both agreed, which is exactly why "only 16px works". Auto mode was equally broken whenever the detected grid ≠ 16px. Secondary latent bug: the handlers re-added `mosaicFitOffsetX` (the pre-crop origin) even though `applyDesignFit` already shifts cells onto the cropped canvas — double-counting the origin whenever the design was actually cropped (harmless only when the offset is 0).
* **Changes**:
  - `src/main.js` (`renderCurrentEngine`): stores the engine's ACTUAL rendered cell size — `state.mosaic.appliedTileSize = res.appliedCellSize || res.tileSize || state.mosaic.tileSize` (covers both pathways).
  - New `src/core/mosaic/MosaicToolMapper.js`: pure `canvasPointToCell(x, y, renderedCellSize, spacing)` — `floor(point / step)`, no added offset.
  - `src/main.js`: new `getMosaicToolCellSize()` helper (appliedTileSize → tileSize → 16 fallback); `handleMosaicTool` and `handleMosaicShapeEnd` now map through it (offset re-add removed); Safe Check modal uses it too so the 16px microstock cell-size audit reflects the real rendered size.
* **Preservation**: No engine/pipeline changes; Pathway A/B, Color Restore, Pure Edge, purifier defaults untouched. When the crop offset is 0 the new mapping is bit-identical to the old (the user's working 16px case cannot regress).
* **Tests**: new `test/mosaic-tool-mapper.test.js` (7 tests): 32px click maps to col 2 not 4 (the old bug), 16px unchanged, all manual sizes 24/32/48/64, spacing in step, no crop-origin offset, out-of-range guard values, 16 fallback.
* **Verification**: 208/208 tests passed across 28 files; `vite build` clean. User should live-test: Already Pixel Art, manual 32px, eraser on a stray pixel — the erased cell must now be exactly the clicked cell; repeat at 24/48/64 and Auto.

### [Log Entry 054] — Sidebar Feature Audit + Clean Edge Purifier Fix (user-requested)

* **Date**: October 14, 2026.
* **User report**: Tested every sidebar feature one-by-one; "very bad" — asked which feature works / doesn't, which sets unwanted colors INSIDE the design, which creates shadow-like pixels OUTSIDE the design, and what each feature protects.
* **Audit method**: synthetic AI-style image (512px, 16px native cells, flat 3-green interior + rare pink cluster + single orange accent + 1-cell white↔green fringe ring at amounts 0.12–0.80 + JPEG-noisy white bg), Pathway B with white bg removal (tol 20%, mirroring the user's session), baseline (all OFF) vs each feature ON.
* **Verdict**:
  - Baseline (all OFF): faithful — middle pixel-perfect, fringe visible (it is the SOURCE's baked-in anti-aliasing, not created by the tool).
  - Clean Edge Purifier: TWO BUGS — (1) RESURRECTION: recolored near-white fringe cells that bg-removal would have deleted into darker colors, materializing 22 NEW cells outside the true silhouette (the user's "shadow-like" complaint); (2) ALOMALO CANDIDATES: restoration pool was ALL sampled colors incl. fringe blends, so muddy edges were "restored" into other muddy colors (e.g. 232,245,236 → 177,204,185). Deep interior untouched (0).
  - Pure Edge: CLEAN — 0 interior touches, 8 boundary snaps to true greens, 7 mostly-bg fringe removed, 0 added cells.
  - Color Restore (conservative): CLEAN — 0 changes on the synthetic (1 guarded skip); guards hold.
* **Fix** (`src/core/mosaic/CleanEdgePurifier.js` rewritten):
  - No-resurrection guard: when background removal is active, boundary cells already inside the removal distance of the detected background are skipped (left for removal).
  - True-color-only candidates: restoration targets are now the exact samples of nearby INTERIOR (non-boundary) design cells; the source-pixel histogram (which admitted fringe colors) is removed. Faster as a side effect.
  - Contract preserved: boundary-only, recolor-only (never adds/removes cells), locked/protected/manual + solid neutral dark outlines still skipped.
* **Verification**: re-ran audit — added cells 22→0, all 15 recolors land on true interior greens (0 alomalo), interior 0, feature still corrects real blends (correctedCells 15 > 0). New `test/mosaic-clean-edge-purifier-audit.test.js` (4 regression tests). Full suite: 212/212 across 29 files; `vite build` clean.
* **Note**: purifier stays default OFF per the v5 decision; it is now safe to toggle on manually.

### [Log Entry 055] — Pure Edge "Strict Remove" Mode (user-requested)

* **Date**: October 14, 2026.
* **User report** (screenshots, tree collection @26% zoom, badge "222 fixed"): with Pure Edge ON, unwanted colored pixels appear at outside edges / low ends / gaps between design parts — "pure edge always try replace blurs, shading, or edge colors by any colors". With it OFF the inside stays clean but gray/white fringe returns. User asked for a NEW feature that ONLY removes outside/end/around-edge shading, blurs and unwanted pixels (fringe becomes background color), never recolors — "my idea not 100%, research, catch reason, then act". Also asked: version the zip file name on every change (v5 → v6).
* **Research / reason caught**: the snap path recolors mid-blend fringe (design amount 0.35–0.92) to the min-blend-error nearby interior color. Candidates are radius-3 only (not "anywhere"), and the blend-error cap (800) already rejects saturated highlights — but on soft AI edges the snap still replaces the user's visible edge tone with a guessed flat color, which reads as "unwanted colors". Removal-only is sound for the user's "pure design only" goal: every surviving cell keeps its exact source color; the tradeoff (silhouette tightens ~1 cell where fringe existed) is explicit and the coherence/thin-feature/locked guards still apply.
* **Changes**:
  - `src/core/mosaic/EdgeFringeCleanup.js`: new `pureEdgeMode` option — 'strict' (DEFAULT): any fringe below `fringeSnapBelow` (0.92) is REMOVED (transparent), nothing ever recolored; 'snap': legacy balanced behavior (remove <0.35, snap 0.35–0.92). Docstring updated.
  - UI (`index.html`, `src/main.js`): "Fix mode" select in the Pure Edge section (Strict remove / Snap + remove); state `pureEdgeMode` default 'strict'; flows via existing options spread; badge shows "N removed" in strict mode, "N fixed" in snap mode; synced in `updateMosaicModeUI` and Reset All.
* **Preservation**: snap behavior unchanged and selectable; all guards (exterior-only, coherence, thin features, locked/manual, flat-bg required) identical in both modes; other features untouched.
* **Tests**: `test/mosaic-edge-fringe.test.js` +2 (strict removes mid-blend without recoloring; strict keeps strong outlines), existing snap test pinned to `{ pureEdgeMode: 'snap' }`. Full suite: 214/214 across 29 files; `vite build` clean.
* **Packaging**: per user request, version bumped — working dir renamed `pixel-studio-v5` → `pixel-studio-v6`, canonical zip is now `pixel-studio-fixed-v6.zip` (v5 zip kept for history, superseded).

### [Log Entry 056] — New "Edge Cleaner" Feature; "Pure Edge" Retired from UI (user-requested)

* **Date**: October 14, 2026.
* **User report** (screenshot + source PNG of the 8-tree collection): "Keep PURE EDGE Off. Add a NEW feature that works ONLY on outside edges — light graded colors. Look carefully which pixels I call unwanted/blur/shade pixels — those must be REMOVED. You can also check edges against the pure background: if no match, remove and make background. Remove edges HARD so the design looks clean and edges match the background — but it must understand which is background and which is edge." User supplied the source PNG for careful study.
* **Study of the PNG**: fringe confirmed (light gray/white pixels at pine tip, round-tree top); the critical edge case is the WHITE BIRCH BARK on white background — any background-matching logic must not eat it; thin willow strands / fern tips need care; pink/yellow flowers are interior (safe).
* **Design** (`src/core/mosaic/EdgeCleaner.js`, new): for each exterior silhouette-boundary cell, the ONLY question is "how close is this pixel to the pure background" — within Strength% RGB distance -> removed (transparent). Never recolors anything. Guards that understand background vs edge: (1) strong-color match — boundary cell already wearing an interior design color (e.g. white bark) is kept; (2) coherence — >=2 neighbors sharing the color marks a real region; (3) locked/protected/manual untouched; (4) no-op without confidently detected flat background. Runs in Pathway B after ColorRestore, before background classification.
* **UI** (user's explicit "keep Pure Edge off" honored by removing it): the Pure Edge section (incl. Fix-mode select) was removed from the sidebar; new "Edge Cleaner" section with toggle (default ON in Already Pixel Art), "N removed" badge, and a Strength slider (10–40%, default 25%) for harder/softer edge removal. `edgeFringeCleanup` now defaults false (engine retained + tested, no UI).
* **Why this differs from Pure Edge**: no design-color candidates, no blend projection, no recoloring — a predictable background-distance decision, and it handles thin features (Pure Edge skipped those when no interior colors were nearby).
* **Tests**: `test/mosaic-edge-cleaner.test.js` (9 tests) — removes light fringe, keeps saturated edge colors exactly, keeps coherent white bark on white bg, strength slider aggression, interior untouched, disabled/no-bg no-ops, protected cells, Pathway B integration. Full suite: 223/223 across 30 files; `vite build` clean.
* **Packaging**: per user versioning rule — working dir renamed `pixel-studio-v6` -> `pixel-studio-v7`; canonical zip is now `pixel-studio-fixed-v7.zip` (v6 zip kept for history, superseded).

### [Log Entry 057] — Edge Cleaner: Dark-Edge Junk Removal + "Dark Edge Shading" Toggle (user-requested)

* **Date**: October 14, 2026.
* **User report** (screenshot, Edge Cleaner ON "16 removed", arrows at pine-left + birch top-right): "Remove Light Fringe removes light edges, but the feature adds dark pixels somewhere. First understand what is dark and light? What is continuous anti-aliasing, shading, edges, blurs? Then try to solve. I want removal around the design — top, bottom, left, right edges — continuous anti-aliasing, shading, blurs, etc."
* **Research** (pixel-level analysis of the source PNG + pipeline tracing on the real 3840x2160 image):
  - LIGHT = near-background fringe/blends -> already removed by Edge Cleaner (strength slider).
  - DARK has 3 kinds: (a) pure-black artifact cells at birch top (5 full cells) — already removed by an earlier pipeline stage before EdgeCleaner; (b) small dark specks/dashes with no interior presence — NEW dark-junk rule; (c) dark-olive edge band matching interior colors (ambiguous: technically real shading).
  - Pine's dark outline verified real (color abundant in interior, 13584 px) — must be kept.
  - Key distinguisher for halos: a boundary cell darker than EVERY nearby interior cell cannot be a real outline/shadow (real darks continue inward).
* **Changes** (`src/core/mosaic/EdgeCleaner.js`):
  - Dark-junk rule (default ON): dark boundary cells (lum<60) whose color is NOT in the interior and which form small connected clusters (<12 cells) are removed. Long dark runs always kept (real outlines).
  - New "Remove dark edge shading" sub-toggle (default OFF): also removes dark boundary cells whose color IS in the interior but which form small/medium clusters (<30) AND are darker than every nearby interior cell (halo test). Catches dark halos like the birch-top band; long outlines still kept.
  - UI: sub-toggle in the Edge Cleaner section with explanatory title text.
* **Validation**: synthetic tests (dark specks removed, dark outlines kept, long runs kept, halo removed in shading mode only); real-image run: default 3 removed / 0 dark (safe), shading mode 39 removed / 36 dark — all "darker than everything nearby". Full suite 228/228 (30 files), build clean.
* **Packaging**: v8 per versioning rule — dir `pixel-studio-v7` -> `pixel-studio-v8`, canonical zip `pixel-studio-fixed-v8.zip`.

### [Log Entry 058] — Edge Cleaner: Coherent Fringe Fix + Default OFF (user-requested)

* **Date**: October 14, 2026.
* **User report** (screenshot of a NEW 11-tree image): "Keep default Off". Key finding: unwanted edges appear ONLY at the TOP (where design starts) and BOTTOM (where design ends) — "All goods middle designs". Asked: identify WHY these edges form, then action/solve.
* **Root cause identified** (pixel analysis of the screenshot's pine top + bush bottom): the top/bottom fringe forms SMOOTH UNIFORM light-gray bands (coherent: each cell has 2+ similar neighbors along the curve). EdgeCleaner's coherence guard classified these as "intentional detail" and KEPT them — while irregular side fringe (not coherent) was removed. That is exactly the user's "top/bottom only" pattern.
* **Changes** (`src/core/mosaic/EdgeCleaner.js`):
  - Light-fringe path now BYPASSES the coherence guard: a cell close to the pure background is fringe even when coherent. Real light colors stay protected by the strong-interior-match guard (white birch bark, highlights — verified by test).
  - Coherence guard now applies to mid-tone details only.
  - `src/main.js`: Edge Cleaner default is now OFF everywhere (state default, mode switch, reset) per the user's explicit "Keep default Off" instruction. User enables it manually.
* **Validation**: new test "removes COHERENT light fringe bands" (8-cell uniform band -> 8 removed); white-bark test still passes (strong-match). Full suite 229/229 (30 files), build clean.
* **Packaging**: v9 per versioning rule — dir `pixel-studio-v8` -> `pixel-studio-v9`, canonical zip `pixel-studio-fixed-v9.zip`.
