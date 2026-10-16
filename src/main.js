/**
 * main.js
 * Application State Manager, UI Controller, and Orchestrator.
 * Full Responsive Layout, Mobile Drawer, Touch Gestures, and Auto-Fit Viewport.
 */

import { ImageLoader } from './core/image/ImageLoader.js';
import { DocumentManager } from './core/document/DocumentManager.js';
import { MarketplaceSafeCheck } from './core/marketplace/MarketplaceSafeCheck.js';
import { AutoFitStockEngine } from './core/marketplace/AutoFitStockEngine.js';
import { PixelArtEngine } from './core/pixel-art/PixelArtEngine.js';
import { PixelGrid } from './core/pixel-art/PixelGrid.js';
import { PixelEditor } from './core/pixel-art/PixelEditor.js';
import { rgbToHex, hexToRgb } from './core/pixel-art/PaletteEngine.js';
import { HalftoneEngine } from './core/halftone/HalftoneEngine.js';
import { LineArtEngine } from './core/line-art/LineArtEngine.js';
import { RandomFlowEngine } from './core/random-flow/RandomFlowEngine.js';
import { CamoMeshEngine } from './core/camo-mesh/CamoMeshEngine.js';
import { MosaicEngine } from './core/mosaic/MosaicEngine.js';
import { canvasPointToCell } from './core/mosaic/MosaicToolMapper.js';
import { buildRealColorsSwatchData } from './core/mosaic/realColorsSwatchData.js';
import { DocumentColorExtractor } from './core/mosaic/DocumentColorExtractor.js';
import { PencilEngine } from './core/pencil/PencilEngine.js';
import { SvgExporter } from './core/export/SvgExporter.js';
import { PngExporter } from './core/export/PngExporter.js';
import { ProjectManager } from './core/export/ProjectManager.js';
import { HistoryManager } from './core/history/HistoryManager.js';

class App {
  constructor() {
    this.docManager = new DocumentManager('original');

    this.state = {
      mode: 'pixel-art', // 'pixel-art', 'halftone', 'line-art', 'random-flow', 'camo-mesh', 'mosaic', 'pencil'
      rawImage: null,
      croppedImageData: null,
      cropPreset: 'original',

      // Document Artboard Settings
      docPresetKey: 'original',
      documentWidth: 1024,
      documentHeight: 576,

      // Background Presentation Layer (Default: Transparent = true)
      transparentBg: true,
      bgColor: '#ffffff',

      zoom: 1.0,
      panX: 0,
      panY: 0,
      // When true, fitToScreen() runs once the next render completes
      // (used after canvas-dimension changes: resolution presets, mode switches).
      pendingFitToScreen: false,
      showGrid: true,
      splitView: false,
      splitPos: 0.5,
      isPanning: false,
      startPanX: 0,
      startPanY: 0,
      isSpaceDown: false,

      // Pixel Art Settings
      pixelResolution: 512,
      samplingMethod: 'perceptual',
      colorMode: 'limited',
      presetKey: 'pico-8',
      paletteSize: 32,
      dithering: 'none',
      ditheringStrength: 1.0,
      preserveAlpha: true,
      colorSpace: 'oklab',
      pixelGrid: null,
      activePaletteIndex: 0,
      activeColor: [99, 102, 241],

      // Active Drawing Tool
      activeTool: 'pencil',
      brushSize: 1,
      isDrawing: false,
      drawStartX: 0,
      drawStartY: 0,

      // Other Engine Settings
      halftone: {
        gridType: 'square',
        gridSpacing: 12,
        gridAngle: 45,
        dotRadius: 6,
        shape: 'circle',
        hollow: false,
        inverted: false,
        gamma: 1.0,
        colorMode: 'monochrome',
        dotColor: '#000000',
        transparentBg: true,
        bgColor: '#ffffff'
      },
      lineArt: {
        sensitivity: 50,
        lineThickness: 1,
        invert: false,
        transparentBg: true,
        lineColor: '#000000',
        bgColor: '#ffffff'
      },
      randomFlow: {
        particleCount: 1200,
        stepSize: 4,
        maxSteps: 30,
        strokeWidth: 2,
        colorMode: 'original',
        lineColor: '#3b82f6',
        transparentBg: true,
        bgColor: '#0f172a'
      },
      camoMesh: {
        regions: 150,
        dotSize: 14,
        warp: 0.5,
        variance: 0.4,
        darkShade: '#1e293b',
        lightShade: '#64748b',
        transparentBg: true,
        bgColor: '#0f172a'
      },
      mosaic: {
        inputMode: 'photo',
        detectedMode: 'photo',
        sourceArtType: 'normal',
        mosaicStrategy: 'default-pixel-art',
        minIslandSize: 4,
        islandProximity: 4,
        collinearMerge: true,
        minCellSize: 2,
        varianceThreshold: 15,
        targetScale: 'auto',
        gridOffsetX: 0,
        gridOffsetY: 0,
        cleanEdgePurifier: false,
        cleanEdgeScope: 'off',
        colorRestoreEnabled: true,
        colorRestoreTolerance: 12,
        edgeFringeCleanup: false, // "Pure Edge" retired from the UI; Edge Cleaner is the fringe feature now
        pureEdgeMode: 'strict', // legacy option, kept for engine compatibility
        edgeCleanerEnabled: false, // default OFF per user's explicit request — user enables manually
        edgeCleanerStrength: 25, // percent (10-40); higher = harder edge removal
        edgeCleanerDarkShading: false, // also remove dark edge shading/halo (long outlines always kept)
        forceTileSize: 0, // 0 = Auto (detect true grid) in Already Pixel Art mode
        tileSize: 16,
        fitDocumentToDesign: true,
        shape: 'square',
        spacing: 0,
        rotation: 0,
        stagger: 'none',
        samplingMethod: 'average',
        palette: 'original-rgb',
        ditherAlgorithm: 'none',
        outlineMode: 'none',
        outlineColor: '#000000',
        outlineWidth: 1,
        transparentBg: true,
        bgColor: '#0f172a',
        bgRemovalMode: 'none',
        bgRemovalScope: 'contiguous',
        bgRemovalColors: [],
        outsideBgRemovalColors: [],
        insideBgRemovalColors: [],
        customRemoveColor: '#ffffff',
        colorTolerance: 0,
        deFringe: false,
        snapEdgeColors: false,
        perfectCorners: false,
        restoreEdgeColors: false,
        edgeTrim: 0,
        trimEnabled: true,
        trimMode: 'outside',
        trimBoundary: 'design-silhouette',
        preserveDesignCells: true,
        preserveBoundaryCells: true,
        preserveCornerCells: true,
        preserveThinFeatures: true,
        trimPreview: false,
        cleanupEnabled: true,
        autoClean: true,
        noiseThreshold: 20,
        edgeSensitivity: 20,
        manualTool: null,
        protectedIds: new Set(),
        manualRemoveIds: new Set(),
        manualRestoreIds: new Set(),
        manualOverrides: {},
        isPickingColor: false,
        isAddingColor: false,
        qaOverlay: false,
        qualityChecks: {
          outside: true,
          edges: true,
          noise: true,
          protection: true,
          zeroColorLoss: true,
          gridAlignment: true,
          designBoundaries: true
        }
      },
      isPanToolActive: false,
      mosaicEraseRenderFrame: null,
      mosaicErasePaletteDirty: false
    };

    this.history = new HistoryManager(30);
    this.pencilEngine = new PencilEngine();
    this.worker = null;
    this.workerJobId = 0;

    this.initElements();
    this.initWorker();
    this.initEventListeners();
    this.initTouchAndGestureListeners();
    this.initHistory();
    this.updateMosaicModeUI(this.state.mosaic.inputMode, 'photo');
    this.loadDemoImage();
  }

  initElements() {
    this.el = {
      // Containers & Shell
      viewport: document.getElementById('viewport'),
      canvasContainer: document.getElementById('canvasContainer'),
      outputCanvas: document.getElementById('outputCanvas'),
      gridOverlayCanvas: document.getElementById('gridOverlayCanvas'),
      splitDivider: document.getElementById('splitDivider'),
      pixelToolbar: document.getElementById('pixelToolbar'),
      dropzone: document.getElementById('dropzone'),
      dropzoneEmpty: document.getElementById('dropzoneEmpty'),
      dropzonePreview: document.getElementById('dropzonePreview'),
      dropzoneImg: document.getElementById('dropzoneImg'),
      dropzoneFileName: document.getElementById('dropzoneFileName'),
      imageFileInput: document.getElementById('imageFileInput'),
      demoImageBtn: document.getElementById('demoImageBtn'),

      // Responsive Sidebar & Drawer
      sidebar: document.getElementById('sidebar'),
      sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
      sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
      sidebarBackdrop: document.getElementById('sidebarBackdrop'),

      // Mode Navigation & Scroll
      modeSelector: document.getElementById('modeSelector'),
      modeScrollPrev: document.getElementById('modeScrollPrev'),
      modeScrollNext: document.getElementById('modeScrollNext'),

      // Document Artboard Controls
      docDimsBadge: document.getElementById('docDimsBadge'),
      docPresetSelect: document.getElementById('docPresetSelect'),
      customSizeRow: document.getElementById('customSizeRow'),
      customWidthInput: document.getElementById('customWidthInput'),
      customHeightInput: document.getElementById('customHeightInput'),

      // Background Controls
      sidebarTransparentBg: document.getElementById('sidebarTransparentBg'),
      bgColorControlGroup: document.getElementById('bgColorControlGroup'),
      sidebarBgColorPicker: document.getElementById('sidebarBgColorPicker'),
      setWhiteBgBtn: document.getElementById('setWhiteBgBtn'),
      setBlackBgBtn: document.getElementById('setBlackBgBtn'),
      setDarkObsidianBgBtn: document.getElementById('setDarkObsidianBgBtn'),

      // Status
      statusText: document.getElementById('statusText'),
      statusDocDims: document.getElementById('statusDocDims'),
      statusStockBadge: document.getElementById('statusStockBadge'),
      statusGridDims: document.getElementById('statusGridDims'),
      statusPaletteCount: document.getElementById('statusPaletteCount'),
      statusBgTag: document.getElementById('statusBgTag'),
      statusCursor: document.getElementById('statusCursor'),
      zoomText: document.getElementById('zoomText'),
      autoFitStockBtn: document.getElementById('autoFitStockBtn'),
      modalAutoFitStockBtn: document.getElementById('modalAutoFitStockBtn'),

      // Mode & History
      modeButtons: document.querySelectorAll('.mode-btn'),
      undoBtn: document.getElementById('undoBtn'),
      redoBtn: document.getElementById('redoBtn'),
      safeCheckBtn: document.getElementById('safeCheckBtn'),
      splitViewBtn: document.getElementById('splitViewBtn'),
      saveProjectBtn: document.getElementById('saveProjectBtn'),
      projectFileInput: document.getElementById('projectFileInput'),
      exportModalBtn: document.getElementById('exportModalBtn'),

      // Overflow Menu
      overflowMenuContainer: document.getElementById('overflowMenuContainer'),
      overflowMenuBtn: document.getElementById('overflowMenuBtn'),
      overflowDropdown: document.getElementById('overflowDropdown'),
      overflowSafeCheckBtn: document.getElementById('overflowSafeCheckBtn'),
      overflowSplitViewBtn: document.getElementById('overflowSplitViewBtn'),
      overflowSaveProjectBtn: document.getElementById('overflowSaveProjectBtn'),
      overflowProjectFileInput: document.getElementById('overflowProjectFileInput'),

      // Zoom Controls
      zoomInBtn: document.getElementById('zoomInBtn'),
      zoomOutBtn: document.getElementById('zoomOutBtn'),
      zoomFitBtn: document.getElementById('zoomFitBtn'),
      zoom100Btn: document.getElementById('zoom100Btn'),
      toggleGridBtn: document.getElementById('toggleGridBtn'),

      // Pixel Art Controls
      resPresetSelect: document.getElementById('resPresetSelect'),
      resSlider: document.getElementById('resSlider'),
      resVal: document.getElementById('resVal'),
      samplingSelect: document.getElementById('samplingSelect'),
      samplingVal: document.getElementById('samplingVal'),
      colorModeSelect: document.getElementById('colorModeSelect'),
      presetSelectGroup: document.getElementById('presetSelectGroup'),
      presetSelect: document.getElementById('presetSelect'),
      paletteSizeGroup: document.getElementById('paletteSizeGroup'),
      paletteSizeSlider: document.getElementById('paletteSizeSlider'),
      paletteSizeVal: document.getElementById('paletteSizeVal'),
      paletteSwatchesGrid: document.getElementById('paletteSwatchesGrid'),
      paletteCountVal: document.getElementById('paletteCountVal'),
      ditheringSelect: document.getElementById('ditheringSelect'),
      ditherStrengthGroup: document.getElementById('ditherStrengthGroup'),
      ditherStrengthSlider: document.getElementById('ditherStrengthSlider'),
      ditherStrengthVal: document.getElementById('ditherStrengthVal'),

      // Tool buttons
      toolButtons: document.querySelectorAll('.tool-btn'),
      editorColorInput: document.getElementById('editorColorInput'),
      editorColorSwatch: document.getElementById('editorColorSwatch'),

      // Halftone controls
      htGridTypeSelect: document.getElementById('htGridTypeSelect'),
      htSpacingSlider: document.getElementById('htSpacingSlider'),
      htSpacingVal: document.getElementById('htSpacingVal'),
      htAngleSlider: document.getElementById('htAngleSlider'),
      htAngleVal: document.getElementById('htAngleVal'),
      htRadiusSlider: document.getElementById('htRadiusSlider'),
      htRadiusVal: document.getElementById('htRadiusVal'),
      htShapeSelect: document.getElementById('htShapeSelect'),
      htHollowCheckbox: document.getElementById('htHollowCheckbox'),
      htInvertCheckbox: document.getElementById('htInvertCheckbox'),

      // Line Art controls
      laSensitivitySlider: document.getElementById('laSensitivitySlider'),
      laSensitivityVal: document.getElementById('laSensitivityVal'),
      laThicknessSlider: document.getElementById('laThicknessSlider'),
      laThicknessVal: document.getElementById('laThicknessVal'),
      laInvertCheckbox: document.getElementById('laInvertCheckbox'),

      // Random Flow controls
      rfCountSlider: document.getElementById('rfCountSlider'),
      rfCountVal: document.getElementById('rfCountVal'),
      rfLengthSlider: document.getElementById('rfLengthSlider'),
      rfLengthVal: document.getElementById('rfLengthVal'),
      rfStrokeSlider: document.getElementById('rfStrokeSlider'),
      rfStrokeVal: document.getElementById('rfStrokeVal'),

      // Camo Mesh controls
      cmRegionsSlider: document.getElementById('cmRegionsSlider'),
      cmRegionsVal: document.getElementById('cmRegionsVal'),
      cmDotSizeSlider: document.getElementById('cmDotSizeSlider'),
      cmDotSizeVal: document.getElementById('cmDotSizeVal'),
      cmWarpSlider: document.getElementById('cmWarpSlider'),
      cmWarpVal: document.getElementById('cmWarpVal'),

      // Mosaic controls
      msSourceArtTypeSelect: document.getElementById('msSourceArtTypeSelect'),
      msZeroLossBanner: document.getElementById('msZeroLossBanner'),
      msJpegNoticeBanner: document.getElementById('msJpegNoticeBanner'),
      msStrategySection: document.getElementById('msStrategySection'),
      msSamplingGroup: document.getElementById('msSamplingGroup'),
      msColorPaletteSection: document.getElementById('msColorPaletteSection'),
      msTrimSection: document.getElementById('msTrimSection'),
      msCleanEdgeSection: document.getElementById('msCleanEdgeSection'),
      msCleanEdgeToggle: document.getElementById('msCleanEdgeToggle'),
      msCleanEdgeStatus: document.getElementById('msCleanEdgeStatus'),
      msCleanEdgeResetBtn: document.getElementById('msCleanEdgeResetBtn'),
      msColorRestoreSection: document.getElementById('msColorRestoreSection'),
      msColorRestoreToggle: document.getElementById('msColorRestoreToggle'),
      msColorRestoreStatus: document.getElementById('msColorRestoreStatus'),
      msColorRestoreTolSlider: document.getElementById('msColorRestoreTolSlider'),
      msColorRestoreTolVal: document.getElementById('msColorRestoreTolVal'),
      msEdgeCleanerSection: document.getElementById('msEdgeCleanerSection'),
      msEdgeCleanerToggle: document.getElementById('msEdgeCleanerToggle'),
      msEdgeCleanerStatus: document.getElementById('msEdgeCleanerStatus'),
      msEdgeCleanerStrengthSlider: document.getElementById('msEdgeCleanerStrengthSlider'),
      msEdgeCleanerStrengthVal: document.getElementById('msEdgeCleanerStrengthVal'),
      msEdgeCleanerDarkShadingToggle: document.getElementById('msEdgeCleanerDarkShadingToggle'),
      msRealColorsRow: document.getElementById('msRealColorsRow'),
      msRealColorsCount: document.getElementById('msRealColorsCount'),
      msPixelArtTileModeSelect: document.getElementById('msPixelArtTileModeSelect'),
      msMosaicStrategySelect: document.getElementById('msMosaicStrategySelect'),
      msStrategyDesc: document.getElementById('msStrategyDesc'),
      msStrategyRecBadge: document.getElementById('msStrategyRecBadge'),
      msStrategyControls: document.getElementById('msStrategyControls'),
      msIslandSizeSlider: document.getElementById('msIslandSizeSlider'),
      msIslandSizeVal: document.getElementById('msIslandSizeVal'),
      msIslandProxSlider: document.getElementById('msIslandProxSlider'),
      msIslandProxVal: document.getElementById('msIslandProxVal'),
      msOrthogonalCollinearToggle: document.getElementById('msOrthogonalCollinearToggle'),
      msQuadtreeMinSelect: document.getElementById('msQuadtreeMinSelect'),
      msQuadtreeMinVal: document.getElementById('msQuadtreeMinVal'),
      msQuadtreeVarSlider: document.getElementById('msQuadtreeVarSlider'),
      msQuadtreeVarVal: document.getElementById('msQuadtreeVarVal'),
      msResamplerScaleSelect: document.getElementById('msResamplerScaleSelect'),
      msIsolineBandsSlider: document.getElementById('msIsolineBandsSlider'),
      msIsolineBandsVal: document.getElementById('msIsolineBandsVal'),
      msSourceModeBadge: document.getElementById('msSourceModeBadge'),
      msSizePresetSelect: document.getElementById('msSizePresetSelect'),
      msSizeSlider: document.getElementById('msSizeSlider'),
      msTileSizeGroup: document.getElementById('msTileSizeGroup'),
      msSizeVal: document.getElementById('msSizeVal'),
      msFitDocumentToggle: document.getElementById('msFitDocumentToggle'),
      msShapeSelect: document.getElementById('msShapeSelect'),
      msSpacingSlider: document.getElementById('msSpacingSlider'),
      msSpacingVal: document.getElementById('msSpacingVal'),
      msRotationSlider: document.getElementById('msRotationSlider'),
      msRotationVal: document.getElementById('msRotationVal'),
      msStaggerSelect: document.getElementById('msStaggerSelect'),
      msSamplingSelect: document.getElementById('msSamplingSelect'),
      msPaletteSelect: document.getElementById('msPaletteSelect'),
      msDitherSelect: document.getElementById('msDitherSelect'),
      msPaletteSwatchesGrid: document.getElementById('msPaletteSwatchesGrid'),
      msPaletteColorCount: document.getElementById('msPaletteColorCount'),
      msTrimStatusBadge: document.getElementById('msTrimStatusBadge'),
      msTrimToggle: document.getElementById('msTrimToggle'),
      msTrimOptionsBox: document.getElementById('msTrimOptionsBox'),
      msTrimPreserveDesignCheck: document.getElementById('msTrimPreserveDesignCheck'),
      msTrimPreserveBoundaryCheck: document.getElementById('msTrimPreserveBoundaryCheck'),
      msTrimPreserveCornersCheck: document.getElementById('msTrimPreserveCornersCheck'),
      msTrimPreserveThinCheck: document.getElementById('msTrimPreserveThinCheck'),
      msTrimPreviewToggle: document.getElementById('msTrimPreviewToggle'),
      msBgStatusBadge: document.getElementById('msBgStatusBadge'),
      msBgModeButtons: document.querySelectorAll('#msBgModeGroup .filter-pill-btn'),
      msDocColorsTitle: document.getElementById('msDocColorsTitle'),
      msDocColorCountBadge: document.getElementById('msDocColorCountBadge'),
      msDocColorsGrid: document.getElementById('msDocColorsGrid'),
      msBatchAutoBgBtn: document.getElementById('msBatchAutoBgBtn'),
      msBatchDarkBtn: document.getElementById('msBatchDarkBtn'),
      msBatchLightBtn: document.getElementById('msBatchLightBtn'),
      msSortToggleBtn: document.getElementById('msSortToggleBtn'),
      msSortLabel: document.getElementById('msSortLabel'),
      msScopeOutsideBtn: document.getElementById('msScopeOutsideBtn'),
      msScopeInsideBtn: document.getElementById('msScopeInsideBtn'),
      msActiveColorsSection: document.getElementById('msActiveColorsSection'),
      msActiveColorsList: document.getElementById('msActiveColorsList'),
      msAddColorBtn: document.getElementById('msAddColorBtn'),
      msToleranceSlider: document.getElementById('msToleranceSlider'),
      msTolerancePresets: document.querySelectorAll('#msTolerancePresets .filter-pill-btn'),
      msToleranceVal: document.getElementById('msToleranceVal'),

      // Mosaic 100% Pixel Cleanup Controls
      msVerificationBadge: document.getElementById('msVerificationBadge'),
      msAutoCleanBtn: document.getElementById('msAutoCleanBtn'),
      msAnalyzeEdgesBtn: document.getElementById('msAnalyzeEdgesBtn'),
      msManualRemoveBtn: document.getElementById('msManualRemoveBtn'),
      msManualRestoreBtn: document.getElementById('msManualRestoreBtn'),
      msManualProtectBtn: document.getElementById('msManualProtectBtn'),
      msNoiseSlider: document.getElementById('msNoiseSlider'),
      msNoiseVal: document.getElementById('msNoiseVal'),
      msEdgeSensitivitySlider: document.getElementById('msEdgeSensitivitySlider'),
      msEdgeSensitivityVal: document.getElementById('msEdgeSensitivityVal'),
      msQualityChecksGrid: document.getElementById('msQualityChecksGrid'),
      msCheckOutside: document.getElementById('msCheckOutside'),
      msCheckEdges: document.getElementById('msCheckEdges'),
      msCheckNoise: document.getElementById('msCheckNoise'),
      msCheckProtection: document.getElementById('msCheckProtection'),
      msCheckZeroColorLoss: document.getElementById('msCheckZeroColorLoss'),
      msCheckGridAlignment: document.getElementById('msCheckGridAlignment'),
      msCheckDesignBoundaries: document.getElementById('msCheckDesignBoundaries'),
      msInputModeButtons: document.querySelectorAll('#msInputModeGroup .filter-pill-btn'),
      msResetAllBtn: document.getElementById('msResetAllBtn'),

      panToolBtn: document.getElementById('panToolBtn'),

      // Pencil controls
      pcSizeSlider: document.getElementById('pcSizeSlider'),
      pcSizeVal: document.getElementById('pcSizeVal'),
      pcUndoBtn: document.getElementById('pcUndoBtn'),
      pcClearBtn: document.getElementById('pcClearBtn'),

      // Modals
      exportModal: document.getElementById('exportModal'),
      modalCloseXBtn: document.getElementById('modalCloseXBtn'),
      exportFormatSelect: document.getElementById('exportFormatSelect'),
      svgOptionsGroup: document.getElementById('svgOptionsGroup'),
      pngOptionsGroup: document.getElementById('pngOptionsGroup'),
      svgModeSelect: document.getElementById('svgModeSelect'),
      svgModeHelpText: document.getElementById('svgModeHelpText'),
      pngScaleSelect: document.getElementById('pngScaleSelect'),
      exportTransparentBg: document.getElementById('exportTransparentBg'),
      jpegNotice: document.getElementById('jpegNotice'),
      modalBgControlGroup: document.getElementById('modalBgControlGroup'),
      closeExportModalBtn: document.getElementById('closeExportModalBtn'),
      downloadExportBtn: document.getElementById('downloadExportBtn'),

      safeCheckModal: document.getElementById('safeCheckModal'),
      safeCheckResults: document.getElementById('safeCheckResults'),
      safeCheckCloseXBtn: document.getElementById('safeCheckCloseXBtn'),
      closeSafeCheckModalBtn: document.getElementById('closeSafeCheckModalBtn'),
      toastContainer: document.getElementById('toastContainer')
    };

    this.ctx = this.el.outputCanvas.getContext('2d');
    this.overlayCtx = this.el.gridOverlayCanvas.getContext('2d');
  }

  initWorker() {
    try {
      this.worker = new Worker(new URL('./core/pixel-art/PixelArtWorker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { jobId, success, result, error } = e.data;
        if (jobId === this.workerJobId && success) {
          this.state.pixelGrid = PixelGrid.fromJSON(result);
          this.renderPixelArt();
          this.showStatus('Ready');
        } else if (!success) {
          console.warn('Worker error fallback:', error);
          this.processSync();
        }
      };
    } catch (e) {
      console.warn('Worker init failed, falling back to sync execution:', e);
      this.worker = null;
    }
  }

  initHistory() {
    this.history.subscribe(({ canUndo, canRedo }) => {
      if (this.el.undoBtn) this.el.undoBtn.disabled = !canUndo;
      if (this.el.redoBtn) this.el.redoBtn.disabled = !canRedo;
    });
  }

  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = document.createElement('span');
    icon.textContent = '⚡';
    toast.append(icon, document.createTextNode(` ${String(message)}`));
    this.el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  showStatus(text) {
    if (this.el.statusText) this.el.statusText.textContent = text;
  }

  loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d');

    // Synthwave Sunset Demo
    const grad = ctx.createLinearGradient(0, 0, 0, 576);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#701a75');
    grad.addColorStop(0.7, '#f43f5e');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 576);

    // Glowing Sun
    ctx.beginPath();
    ctx.arc(512, 340, 130, 0, Math.PI * 2);
    const sunGrad = ctx.createLinearGradient(512, 210, 512, 470);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Horizon line
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 420, 1024, 156);

    // Mountains
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(200, 310);
    ctx.lineTo(400, 420);
    ctx.lineTo(650, 270);
    ctx.lineTo(850, 420);
    ctx.lineTo(1024, 420);
    ctx.lineTo(1024, 576);
    ctx.lineTo(0, 576);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();

    const imgData = ctx.getImageData(0, 0, 1024, 576);
    this.setImageData(imgData, 1024, 576, 'demo-artwork.png');
  }

  getActiveScopeColors() {
    const scope = this.state.mosaic.docColorScope || 'outside';
    if (scope === 'inside') {
      if (!Array.isArray(this.state.mosaic.insideBgRemovalColors)) {
        this.state.mosaic.insideBgRemovalColors = [];
      }
      return this.state.mosaic.insideBgRemovalColors;
    } else {
      if (!Array.isArray(this.state.mosaic.outsideBgRemovalColors)) {
        this.state.mosaic.outsideBgRemovalColors = [];
      }
      return this.state.mosaic.outsideBgRemovalColors;
    }
  }

  setActiveScopeColors(colors) {
    const scope = this.state.mosaic.docColorScope || 'outside';
    if (scope === 'inside') {
      this.state.mosaic.insideBgRemovalColors = colors;
    } else {
      this.state.mosaic.outsideBgRemovalColors = colors;
    }
    this.state.mosaic.bgRemovalColors = [
      ...(this.state.mosaic.outsideBgRemovalColors || []),
      ...(this.state.mosaic.insideBgRemovalColors || [])
    ];
  }

  setImageData(imageData, width, height, fileName = 'avatar.jpg') {
    this.resetForNewImage();
    this.resetMosaicBgRemoval();
    this.state.rawImage = imageData;
    this.state.sourceFileName = fileName;
    this.docManager.setSourceDimensions(width, height);
    this.updateDocumentAndCrop();
    this.updateDropzonePreview(imageData, fileName);
    this.showToast(`Loaded image (${width} × ${height})`);
    this.reprocess();
    this.fitToScreen();
  }

  resetForNewImage() {
    // A replacement design starts a fresh editing session: no prior edits,
    // drawing strokes, mosaic cell overrides, or in-progress gestures carry over.
    this.history.clear();
    this.pencilEngine.clear();
    this.state.pixelGrid = null;
    this.state.mosaicGrid = null;
    this.state.mosaic.manualOverrides = {};
    this.state.mosaic.protectedIds.clear();
    this.state.mosaic.manualRemoveIds.clear();
    this.state.mosaic.manualRestoreIds.clear();
    this.state.mosaicErasePaletteDirty = false;
    this.state.isDrawing = false;
    this.state.drawStartX = 0;
    this.state.drawStartY = 0;
    this.state.activeTool = 'pencil';
    this.state.activePaletteIndex = 0;
    this.state.activeColor = [99, 102, 241];

    this.el.toolButtons?.forEach((button) => {
      button.classList.toggle('active', button.dataset.tool === 'pencil');
    });
    this.el.pixelToolbar?.setAttribute('data-active-tool', 'pencil');
    this.el.pixelToolbar?.style.setProperty('--editor-active-color', '#6366f1');
    if (this.el.editorColorInput) this.el.editorColorInput.value = '#6366f1';
    if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = '#6366f1';
    if (this.el.editorColorInput) this.el.editorColorInput.setAttribute('aria-label', 'Active draw color #6366f1');
    this.pencilEngine.resize(0, 0);
  }

  updateDropzonePreview(imageData, fileName) {
    if (!this.el.dropzoneEmpty || !this.el.dropzonePreview || !this.el.dropzoneImg || !this.el.dropzoneFileName) return;

    if (imageData) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);

      this.el.dropzoneImg.src = canvas.toDataURL();
      this.el.dropzoneFileName.textContent = fileName || 'avatar.jpg';
      this.el.dropzoneEmpty.style.display = 'none';
      this.el.dropzonePreview.style.display = 'flex';
    } else {
      this.el.dropzoneEmpty.style.display = 'block';
      this.el.dropzonePreview.style.display = 'none';
    }
  }

  updateDocumentAndCrop() {
    if (!this.state.rawImage) return;

    const { width: docW, height: docH } = this.docManager.getDimensions();
    this.state.documentWidth = docW;
    this.state.documentHeight = docH;

    if (this.el.docDimsBadge) this.el.docDimsBadge.textContent = `${docW} × ${docH}`;
    if (this.el.statusDocDims) this.el.statusDocDims.textContent = `${docW} × ${docH} px`;
    this.updateStockResolutionStatus();

    // Scale / fit image into document artboard
    const canvas = document.createElement('canvas');
    canvas.width = docW;
    canvas.height = docH;
    const ctx = canvas.getContext('2d');

    const srcW = this.state.rawImage.width;
    const srcH = this.state.rawImage.height;

    // Draw source onto offscreen canvas scaled to document dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = srcW;
    tempCanvas.height = srcH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(this.state.rawImage, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, srcW, srcH, 0, 0, docW, docH);
    this.state.croppedImageData = ctx.getImageData(0, 0, docW, docH);
  }

  reprocess() {
    if (!this.state.croppedImageData) return;

    // Sync transparency settings to sub-engines
    this.state.halftone.transparentBg = this.state.transparentBg;
    this.state.halftone.bgColor = this.state.bgColor;
    this.state.lineArt.transparentBg = this.state.transparentBg;
    this.state.lineArt.bgColor = this.state.bgColor;
    this.state.randomFlow.transparentBg = this.state.transparentBg;
    this.state.randomFlow.bgColor = this.state.bgColor;
    this.state.camoMesh.transparentBg = this.state.transparentBg;
    this.state.camoMesh.bgColor = this.state.bgColor;
    this.state.mosaic.transparentBg = this.state.transparentBg;
    this.state.mosaic.bgColor = this.state.bgColor;

    if (this.el.statusBgTag) {
      this.el.statusBgTag.textContent = this.state.transparentBg ? 'Transparent' : this.state.bgColor;
    }

    if (this.state.mode === 'pixel-art') {
      this.showStatus('Processing Pixel Art...');
      this.processPixelArt();
    } else {
      this.renderCurrentEngine();
    }
  }

  processPixelArt() {
    const src = this.state.croppedImageData;
    const aspect = src.width / src.height;
    let gw = this.state.pixelResolution;
    let gh = Math.max(1, Math.round(gw / aspect));

    const options = {
      gridWidth: gw,
      gridHeight: gh,
      samplingMethod: this.state.samplingMethod,
      colorMode: this.state.colorMode,
      paletteSize: this.state.paletteSize,
      presetKey: this.state.presetKey,
      dithering: this.state.dithering,
      ditheringStrength: this.state.ditheringStrength,
      colorSpace: this.state.colorSpace,
      preserveAlpha: this.state.preserveAlpha
    };

    if (this.worker) {
      this.workerJobId++;
      this.worker.postMessage({
        jobId: this.workerJobId,
        imageData: src,
        options
      });
    } else {
      this.processSync(options);
    }
  }

  processSync(opts) {
    const options = opts || {
      gridWidth: this.state.pixelResolution,
      gridHeight: Math.max(1, Math.round(this.state.pixelResolution / (this.state.croppedImageData.width / this.state.croppedImageData.height))),
      samplingMethod: this.state.samplingMethod,
      colorMode: this.state.colorMode,
      paletteSize: this.state.paletteSize,
      presetKey: this.state.presetKey,
      dithering: this.state.dithering,
      ditheringStrength: this.state.ditheringStrength,
      colorSpace: this.state.colorSpace,
      preserveAlpha: this.state.preserveAlpha
    };

    this.state.pixelGrid = PixelArtEngine.process(this.state.croppedImageData, options);
    this.renderPixelArt();
    this.showStatus('Ready');
  }

  renderPixelArt() {
    if (!this.state.pixelGrid) return;
    const grid = this.state.pixelGrid;

    this.el.outputCanvas.width = grid.width;
    this.el.outputCanvas.height = grid.height;
    this.el.gridOverlayCanvas.width = grid.width;
    this.el.gridOverlayCanvas.height = grid.height;

    // Apply background color if transparency is disabled
    if (!this.state.transparentBg && this.state.bgColor && this.state.bgColor !== 'transparent') {
      this.ctx.fillStyle = this.state.bgColor;
      this.ctx.fillRect(0, 0, grid.width, grid.height);
    } else {
      this.ctx.clearRect(0, 0, grid.width, grid.height);
    }

    const imgData = grid.toImageData(this.ctx);
    this.ctx.putImageData(imgData, 0, 0);

    this.updatePaletteSwatches();
    this.renderGridOverlay();
    this.updateStatusBar();
    this.consumePendingFitToScreen();
  }

  updatePaletteSwatches() {
    if (!this.state.pixelGrid) return;
    const grid = this.state.pixelGrid;
    const palette = grid.palette;

    if (!this.el.paletteSwatchesGrid) return;
    this.el.paletteSwatchesGrid.innerHTML = '';
    if (this.el.paletteCountVal) this.el.paletteCountVal.textContent = `${palette.length} colors`;

    palette.forEach((color, idx) => {
      const hex = rgbToHex(color[0], color[1], color[2]);
      const swatch = document.createElement('div');
      swatch.className = `palette-swatch ${idx === this.state.activePaletteIndex ? 'active' : ''}`;
      swatch.style.backgroundColor = hex;
      swatch.title = `Color #${idx + 1}: ${hex}`;

      swatch.addEventListener('click', () => {
        this.state.activePaletteIndex = idx;
        this.state.activeColor = [...color];
        if (this.el.editorColorInput) this.el.editorColorInput.value = hex;
        if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = hex;
        document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });

      this.el.paletteSwatchesGrid.appendChild(swatch);
    });
  }

  renderGridOverlay() {
    const { width, height } = this.el.gridOverlayCanvas;
    this.overlayCtx.clearRect(0, 0, width, height);

    if (!this.state.showGrid || this.state.zoom < 3 || this.state.mode !== 'pixel-art') {
      return;
    }

    this.overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    this.overlayCtx.lineWidth = 0.08;

    for (let x = 0; x <= width; x++) {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(x, 0);
      this.overlayCtx.lineTo(x, height);
      this.overlayCtx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(0, y);
      this.overlayCtx.lineTo(width, y);
      this.overlayCtx.stroke();
    }
  }

  renderCurrentEngine() {
    if (!this.state.croppedImageData) return;
    const src = this.state.croppedImageData;

    this.el.outputCanvas.width = src.width;
    this.el.outputCanvas.height = src.height;
    this.el.gridOverlayCanvas.width = src.width;
    this.el.gridOverlayCanvas.height = src.height;
    this.overlayCtx.clearRect(0, 0, src.width, src.height);

    if (this.state.mode === 'halftone') {
      const res = HalftoneEngine.process(src, this.state.halftone);
      HalftoneEngine.renderToCanvas(res, this.ctx);
    } else if (this.state.mode === 'line-art') {
      const res = LineArtEngine.process(src, this.state.lineArt);
      LineArtEngine.renderToCanvas(res, this.ctx);
    } else if (this.state.mode === 'random-flow') {
      const res = RandomFlowEngine.process(src, this.state.randomFlow);
      RandomFlowEngine.renderToCanvas(res, this.ctx);
    } else if (this.state.mode === 'camo-mesh') {
      const res = CamoMeshEngine.process(src, this.state.camoMesh);
      CamoMeshEngine.renderToCanvas(res, this.ctx);
    } else if (this.state.mode === 'mosaic') {
      const res = MosaicEngine.process(src, this.getMosaicRenderOptions());
      this.state.mosaicGrid = res.grid;
      this.state.mosaicFitOffsetX = res.fitOffsetX || 0;
      this.state.mosaicFitOffsetY = res.fitOffsetY || 0;
      // Actual on-canvas cell size for tool click-mapping (pencil/eraser/etc).
      // In Already Pixel Art mode the tile-mode dropdown drives
      // options.forceTileSize and Auto uses the detected grid, so the
      // state.mosaic.tileSize preset goes stale — mapping clicks with it
      // broke tools at every manual size except 16px.
      this.state.mosaic.appliedTileSize = res.appliedCellSize || res.tileSize || this.state.mosaic.tileSize;
      this.el.outputCanvas.width = res.width;
      this.el.outputCanvas.height = res.height;
      this.el.gridOverlayCanvas.width = res.width;
      this.el.gridOverlayCanvas.height = res.height;
      if (this.el.statusDocDims) this.el.statusDocDims.textContent = `${res.width} × ${res.height} px`;
      if (this.el.docDimsBadge && this.state.mosaic.fitDocumentToDesign) {
        this.el.docDimsBadge.textContent = `${res.width} × ${res.height}`;
      } else if (this.el.docDimsBadge) {
        this.el.docDimsBadge.textContent = `${this.state.documentWidth} × ${this.state.documentHeight}`;
      }
      MosaicEngine.renderToCanvas(res, this.ctx);
      // In Already Pixel Art mode the grid is auto-detected — surface it.
      // Manual tile sizes use the forceTileSize escape hatch (legacy fixed-grid).
      if (this.el.msSizeVal) {
        if (res.pathway === 'pixel-art') {
          this.el.msSizeVal.textContent = this.state.mosaic.forceTileSize > 0
            ? `Manual (${res.appliedCellSize} px)`
            : (res.appliedCellSize ? `Auto (${res.appliedCellSize} px)` : 'Auto');
        } else {
          this.el.msSizeVal.textContent = `${this.state.mosaic.tileSize} px`;
        }
      }
      this.renderMosaicDocColors();
      this.renderMosaicActivePaletteSwatches();
      this.updateMosaicVerificationUI(res.verificationReport);
      if (this.el.msCleanEdgeStatus) {
        const report = res.edgePurifierReport;
        this.el.msCleanEdgeStatus.textContent = !this.state.mosaic.cleanEdgePurifier ? 'Off'
          : !report ? 'Not applied'
          : !report.backgroundDetected ? 'No flat background'
          : `${report.correctedCells} restored`;
      }
      if (this.el.msColorRestoreStatus) {
        const crReport = res.colorRestoreReport;
        this.el.msColorRestoreStatus.textContent = !this.state.mosaic.colorRestoreEnabled ? 'Off'
          : !crReport || !crReport.applied ? 'Ready'
          : `${crReport.restoredCount} restored`;
        this.renderRealColorsSwatches(crReport && crReport.truePalette);
      }
      if (this.el.msEdgeCleanerStatus) {
        const ecReport = res.edgeCleanerReport;
        this.el.msEdgeCleanerStatus.textContent = !this.state.mosaic.edgeCleanerEnabled ? 'Off'
          : !ecReport || !ecReport.applied ? 'Ready'
          : !ecReport.backgroundDetected ? 'No flat background'
          : `${ecReport.removedCount} removed`;
      }

      this.updateMosaicModeUI(this.state.mosaic.inputMode, res.pathway);

      if (res.strategyRecommendation && this.el.msStrategyRecBadge) {
        this.el.msStrategyRecBadge.style.display = 'block';
        this.el.msStrategyRecBadge.textContent = res.strategyRecommendation.badgeLabel;
      } else if (this.el.msStrategyRecBadge) {
        this.el.msStrategyRecBadge.style.display = 'none';
      }
    } else if (this.state.mode === 'pencil') {
      if (!this.state.transparentBg && this.state.bgColor) {
        this.ctx.fillStyle = this.state.bgColor;
        this.ctx.fillRect(0, 0, src.width, src.height);
      } else {
        this.ctx.clearRect(0, 0, src.width, src.height);
      }
      this.ctx.putImageData(src, 0, 0);
      this.pencilEngine.resize(src.width, src.height);
      this.pencilEngine.renderToCanvas(this.ctx);
    }

    this.updateStatusBar();
    this.showStatus('Ready');
    this.consumePendingFitToScreen();
  }

  getMosaicRenderOptions() {
    const mosaic = this.state.mosaic;
    const hasBackgroundRemoval = mosaic.bgRemovalMode !== 'none'
      || (mosaic.outsideBgRemovalColors?.length || 0) > 0
      || (mosaic.insideBgRemovalColors?.length || 0) > 0
      || (mosaic.bgRemovalColors?.length || 0) > 0;

    return {
      ...mosaic,
      fitDocumentToDesign: Boolean(mosaic.fitDocumentToDesign && !hasBackgroundRemoval)
    };
  }

  renderMosaicDocColors() {
    if (!this.el.msDocColorsGrid || !this.state.croppedImageData) return;

    const scope = this.state.mosaic.docColorScope || 'outside';
    const sort = this.state.mosaic.docColorSort || 'dark-to-light';
    let colors = [];

    // Extract colors from the base cropped image data for complete extraction stability
    const source = this.state.croppedImageData;
    if (scope === 'inside') {
      colors = DocumentColorExtractor.extractInsideColors(source, { sortBy: sort, maxColors: 48 });
    } else {
      colors = DocumentColorExtractor.extractBoundaryAndOutsideColors(source, { sortBy: sort, maxColors: 48 });
    }

    if (this.el.msDocColorCountBadge) {
      this.el.msDocColorCountBadge.textContent = `${colors.length} Colors`;
    }

    if (this.el.msDocColorsTitle) {
      const labelMap = {
        'dark-to-light': 'Dark → Light',
        'light-to-dark': 'Light → Dark',
        'frequency': 'Frequency'
      };
      const scopeLabel = scope === 'inside' ? 'Inside / Edge' : 'Outside / Edge';
      this.el.msDocColorsTitle.textContent = `${scopeLabel} Colors (${labelMap[sort]})`;
    }

    this.el.msDocColorsGrid.innerHTML = '';
    if (colors.length === 0) {
      this.el.msDocColorsGrid.innerHTML = '<div class="doc-colors-empty">No colors detected</div>';
      return;
    }

    const activeColors = this.getActiveScopeColors();
    const activeHexes = new Set(activeColors.map(h => h.toLowerCase()));

    colors.forEach(c => {
      const isSelected = activeHexes.has(c.hex.toLowerCase());
      const chip = document.createElement('div');
      chip.className = `doc-color-chip ${isSelected ? 'active' : ''}`;
      chip.setAttribute('data-hex', c.hex);
      chip.title = `Color: ${c.hex.toUpperCase()} | Lum: ${(c.luminance * 100).toFixed(0)}% (${c.category}) | ${c.percentage}%`;

      chip.innerHTML = `
        <span class="doc-color-swatch" style="background-color: ${c.hex}"></span>
        <span class="doc-color-hex">${c.hex.toUpperCase()}</span>
        <span class="doc-color-pct">${c.percentage}%</span>
      `;

      chip.addEventListener('click', () => {
        let current = [...this.getActiveScopeColors()];
        const lowerHex = c.hex.toLowerCase();
        if (current.some(h => h.toLowerCase() === lowerHex)) {
          current = current.filter(h => h.toLowerCase() !== lowerHex);
        } else {
          current.push(c.hex);
        }
        this.setActiveScopeColors(current);
        const hasActiveRemovals = (this.state.mosaic.outsideBgRemovalColors?.length > 0) || (this.state.mosaic.insideBgRemovalColors?.length > 0);
        this.state.mosaic.bgRemovalMode = hasActiveRemovals ? 'custom' : 'none';
        this.syncMosaicBgModeButtons();
        this.renderMosaicDocColors();
        this.renderMosaicActiveColors();
        this.renderCurrentEngine();
      });

      this.el.msDocColorsGrid.appendChild(chip);
    });
  }

  updateStatusBar() {
    if (this.state.mode === 'pixel-art' && this.state.pixelGrid) {
      const grid = this.state.pixelGrid;
      if (this.el.statusGridDims) this.el.statusGridDims.textContent = `${grid.width} × ${grid.height} px`;
      if (this.el.statusPaletteCount) this.el.statusPaletteCount.textContent = `${grid.palette.length} colors`;
    } else if (this.state.mode === 'pixel-art') {
      // Not computed yet (e.g. first load before processing completes) — placeholder.
      if (this.el.statusPaletteCount) this.el.statusPaletteCount.textContent = '…';
    } else if (this.state.croppedImageData) {
      if (this.el.statusGridDims) this.el.statusGridDims.textContent = `${this.state.croppedImageData.width} × ${this.state.croppedImageData.height} px`;
      if (this.el.statusPaletteCount) this.el.statusPaletteCount.textContent = 'Continuous';
    }
  }

  applyTransform() {
    if (!this.el.canvasContainer) return;
    this.el.canvasContainer.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`;
    if (this.el.zoomText) this.el.zoomText.textContent = `${Math.round(this.state.zoom * 100)}%`;
    this.renderGridOverlay();
  }

  fitToScreen() {
    if (!this.el.outputCanvas.width || !this.el.viewport) return;
    const pad = window.innerWidth < 768 ? 16 : 40;
    const viewW = Math.max(60, this.el.viewport.clientWidth - pad);
    const viewH = Math.max(60, this.el.viewport.clientHeight - pad);
    const canW = this.el.outputCanvas.width;
    const canH = this.el.outputCanvas.height;

    const scale = Math.min(viewW / canW, viewH / canH);
    // Allow zoom to scale down to 0.005 for 4K / 8K artboards on mobile devices
    this.state.zoom = Math.max(0.005, Math.min(16, scale));
    this.state.panX = 0;
    this.state.panY = 0;
    this.applyTransform();
  }

  // Runs a queued fitToScreen() once the current render has finished.
  // Called at the end of render paths (sync and worker-async alike).
  consumePendingFitToScreen() {
    if (this.state.pendingFitToScreen) {
      this.state.pendingFitToScreen = false;
      this.fitToScreen();
    }
  }

  toggleSplitView() {
    this.state.splitView = !this.state.splitView;
    if (this.el.splitDivider) {
      this.el.splitDivider.style.display = this.state.splitView ? 'block' : 'none';
      this.el.splitDivider.style.left = `${this.state.splitPos * 100}%`;
    }
    this.showToast(this.state.splitView ? 'Split View Enabled' : 'Split View Disabled');
  }

  initEventListeners() {
    // Responsive Drawer Toggle
    const toggleSidebar = (force) => {
      const isOpen = force !== undefined ? force : !this.el.sidebar.classList.contains('open');
      this.el.sidebar.classList.toggle('open', isOpen);
      this.el.sidebarBackdrop.classList.toggle('open', isOpen);
      setTimeout(() => this.fitToScreen(), 100);
    };

    if (this.el.sidebarToggleBtn) {
      this.el.sidebarToggleBtn.addEventListener('click', () => toggleSidebar(true));
    }
    if (this.el.sidebarCloseBtn) {
      this.el.sidebarCloseBtn.addEventListener('click', () => toggleSidebar(false));
    }
    if (this.el.sidebarBackdrop) {
      this.el.sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));
    }

    // Mode Selector Scrolling Controls
    if (this.el.modeScrollPrev) {
      this.el.modeScrollPrev.addEventListener('click', () => {
        this.el.modeSelector?.scrollBy({ left: -140, behavior: 'smooth' });
      });
    }
    if (this.el.modeScrollNext) {
      this.el.modeScrollNext.addEventListener('click', () => {
        this.el.modeSelector?.scrollBy({ left: 140, behavior: 'smooth' });
      });
    }
    if (this.el.modeSelector) {
      this.el.modeSelector.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          this.el.modeSelector.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // Overflow Menu Toggle & Actions
    if (this.el.overflowMenuBtn) {
      this.el.overflowMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.overflowDropdown.classList.toggle('open');
      });
    }

    document.addEventListener('click', (e) => {
      if (this.el.overflowMenuContainer && !this.el.overflowMenuContainer.contains(e.target)) {
        this.el.overflowDropdown?.classList.remove('open');
      }
    });

    if (this.el.overflowSafeCheckBtn) {
      this.el.overflowSafeCheckBtn.addEventListener('click', () => {
        this.el.overflowDropdown.classList.remove('open');
        this.el.safeCheckModal.classList.add('open');
      });
    }

    if (this.el.overflowSplitViewBtn) {
      this.el.overflowSplitViewBtn.addEventListener('click', () => {
        this.el.overflowDropdown.classList.remove('open');
        this.toggleSplitView();
      });
    }

    if (this.el.overflowSaveProjectBtn) {
      this.el.overflowSaveProjectBtn.addEventListener('click', () => {
        this.el.overflowDropdown.classList.remove('open');
        ProjectManager.saveProject(this.state);
        this.showToast('Saved .pixelart project file');
      });
    }

    if (this.el.overflowProjectFileInput) {
      this.el.overflowProjectFileInput.addEventListener('change', (e) => {
        this.el.overflowDropdown.classList.remove('open');
        const file = e.target.files[0];
        if (file) {
          ProjectManager.loadProject(file).then(({ data, grid }) => {
            if (grid) {
              this.state.pixelGrid = grid;
              this.state.mode = data.mode || 'pixel-art';
              if (data.background) {
                this.state.transparentBg = data.background.transparent !== false;
                this.state.bgColor = data.background.color || '#ffffff';
                if (this.el.sidebarTransparentBg) this.el.sidebarTransparentBg.checked = this.state.transparentBg;
                if (this.el.bgColorControlGroup) this.el.bgColorControlGroup.style.display = this.state.transparentBg ? 'none' : 'block';
              }
              this.setMode(this.state.mode);
              this.renderPixelArt();
              this.showToast('Loaded project file');
            }
          }).catch(err => alert(err.message));
        }
      });
    }

    // Split Divider Dragging
    if (this.el.splitDivider) {
      let isDraggingSplit = false;
      this.el.splitDivider.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDraggingSplit = true;
      });
      window.addEventListener('mousemove', (e) => {
        if (isDraggingSplit && this.el.viewport) {
          const rect = this.el.viewport.getBoundingClientRect();
          const pos = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
          this.state.splitPos = pos;
          this.el.splitDivider.style.left = `${pos * 100}%`;
        }
      });
      window.addEventListener('mouseup', () => {
        isDraggingSplit = false;
      });
    }

    // Mode Switching
    this.el.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // File Upload
    this.el.dropzone.addEventListener('click', () => this.el.imageFileInput.click());
    this.el.imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        ImageLoader.loadFromFile(file).then(({ imageData, width, height }) => {
          this.setImageData(imageData, width, height, file.name);
        }).catch(err => alert(err.message)).finally(() => { e.target.value = ''; });
      }
    });

    this.el.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.el.dropzone.classList.add('dragover');
    });

    this.el.dropzone.addEventListener('dragleave', () => {
      this.el.dropzone.classList.remove('dragover');
    });

    this.el.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.el.dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        ImageLoader.loadFromFile(file).then(({ imageData, width, height }) => {
          this.setImageData(imageData, width, height, file.name);
        }).catch(err => alert(err.message));
      }
    });

    this.el.demoImageBtn.addEventListener('click', () => this.loadDemoImage());

    // Document Artboard Size Presets
    this.el.docPresetSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      this.state.docPresetKey = key;
      this.docManager.setPreset(key);
      this.el.customSizeRow.style.display = key === 'custom' ? 'grid' : 'none';

      if (key === 'custom') {
        const w = parseInt(this.el.customWidthInput.value, 10) || 1024;
        const h = parseInt(this.el.customHeightInput.value, 10) || 1024;
        this.docManager.setCustomSize(w, h);
      }

      this.updateDocumentAndCrop();
      this.reprocess();
      this.fitToScreen();
    });

    this.el.customWidthInput.addEventListener('input', (e) => {
      const w = parseInt(e.target.value, 10) || 1024;
      const h = parseInt(this.el.customHeightInput.value, 10) || 1024;
      this.docManager.setCustomSize(w, h);
      this.updateDocumentAndCrop();
      this.reprocess();
      this.fitToScreen();
    });

    this.el.customHeightInput.addEventListener('input', (e) => {
      const w = parseInt(this.el.customWidthInput.value, 10) || 1024;
      const h = parseInt(e.target.value, 10) || 1024;
      this.docManager.setCustomSize(w, h);
      this.updateDocumentAndCrop();
      this.reprocess();
      this.fitToScreen();
    });

    // Dedicated Transparent Background Sidebar Checkbox
    this.el.sidebarTransparentBg.addEventListener('change', (e) => {
      this.state.transparentBg = e.target.checked;
      this.el.bgColorControlGroup.style.display = this.state.transparentBg ? 'none' : 'block';
      if (this.el.exportTransparentBg) this.el.exportTransparentBg.checked = this.state.transparentBg;
      this.reprocess();
    });

    this.el.sidebarBgColorPicker.addEventListener('input', (e) => {
      this.state.bgColor = e.target.value;
      if (!this.state.transparentBg) {
        this.reprocess();
      }
    });

    this.el.setWhiteBgBtn.addEventListener('click', () => {
      this.state.bgColor = '#ffffff';
      this.el.sidebarBgColorPicker.value = '#ffffff';
      if (!this.state.transparentBg) this.reprocess();
    });

    this.el.setBlackBgBtn.addEventListener('click', () => {
      this.state.bgColor = '#000000';
      this.el.sidebarBgColorPicker.value = '#000000';
      if (!this.state.transparentBg) this.reprocess();
    });

    this.el.setDarkObsidianBgBtn.addEventListener('click', () => {
      this.state.bgColor = '#0f172a';
      this.el.sidebarBgColorPicker.value = '#0f172a';
      if (!this.state.transparentBg) this.reprocess();
    });

    // Pixel Art Controls
    if (this.el.resPresetSelect) {
      this.el.resPresetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val !== 'custom') {
          const num = parseInt(val, 10);
          this.state.pixelResolution = num;
          if (this.el.resSlider) this.el.resSlider.value = num;
          if (this.el.resVal) this.el.resVal.textContent = `${num} px`;
          // Resolution changes the canvas dimensions — re-fit once rendered.
          this.state.pendingFitToScreen = true;
          this.reprocess();
        }
      });
    }

    this.el.resSlider.addEventListener('input', (e) => {
      this.state.pixelResolution = parseInt(e.target.value, 10);
      this.el.resVal.textContent = `${this.state.pixelResolution} px`;
      if (this.el.resPresetSelect) {
        const matchingOpt = Array.from(this.el.resPresetSelect.options).find(o => o.value === String(this.state.pixelResolution));
        this.el.resPresetSelect.value = matchingOpt ? String(this.state.pixelResolution) : 'custom';
      }
      // Resolution changes the canvas dimensions — re-fit once rendered.
      this.state.pendingFitToScreen = true;
      this.reprocess();
    });

    this.el.samplingSelect.addEventListener('change', (e) => {
      this.state.samplingMethod = e.target.value;
      this.el.samplingVal.textContent = e.target.options[e.target.selectedIndex].text;
      this.reprocess();
    });

    this.el.colorModeSelect.addEventListener('change', (e) => {
      this.state.colorMode = e.target.value;
      this.el.presetSelectGroup.style.display = this.state.colorMode === 'preset' ? 'block' : 'none';
      this.el.paletteSizeGroup.style.display = this.state.colorMode === 'limited' ? 'block' : 'none';
      this.reprocess();
    });

    this.el.presetSelect.addEventListener('change', (e) => {
      this.state.presetKey = e.target.value;
      this.reprocess();
    });

    this.el.paletteSizeSlider.addEventListener('input', (e) => {
      this.state.paletteSize = parseInt(e.target.value, 10);
      this.el.paletteSizeVal.textContent = this.state.paletteSize;
      this.reprocess();
    });

    this.el.ditheringSelect.addEventListener('change', (e) => {
      this.state.dithering = e.target.value;
      this.el.ditherStrengthGroup.style.display = this.state.dithering !== 'none' ? 'block' : 'none';
      this.reprocess();
    });

    this.el.ditherStrengthSlider.addEventListener('input', (e) => {
      this.state.ditheringStrength = parseInt(e.target.value, 10) / 100;
      this.el.ditherStrengthVal.textContent = `${e.target.value}%`;
      this.reprocess();
    });

    // Tool switching
    this.el.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.getAttribute('data-tool');
        this.state.activeTool = tool;
        this.el.pixelToolbar?.setAttribute('data-active-tool', tool);
        this.showStatus(`${btn.getAttribute('aria-label') || tool} tool active`);
        if (tool === 'eraser') {
          this.setMosaicManualTool('remove');
        } else {
          this.setMosaicManualTool(null);
        }
      });
    });

    this.el.editorColorInput.addEventListener('input', (e) => {
      const hex = e.target.value;
      if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = hex;
      const rgb = hexToRgb(hex);
      this.state.activeColor = rgb;
      this.el.pixelToolbar?.style.setProperty('--editor-active-color', hex);
      this.el.editorColorInput?.setAttribute('aria-label', `Active draw color ${hex}`);

      if (this.state.pixelGrid) {
        let idx = this.state.pixelGrid.palette.findIndex(
          c => c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]
        );
        if (idx === -1) {
          idx = this.state.pixelGrid.palette.length;
          this.state.pixelGrid.palette.push(rgb);
          this.updatePaletteSwatches();
        }
        this.state.activePaletteIndex = idx;
      }
    });

    // Halftone controls events
    this.el.htGridTypeSelect.addEventListener('change', (e) => {
      this.state.halftone.gridType = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.htSpacingSlider.addEventListener('input', (e) => {
      this.state.halftone.gridSpacing = parseInt(e.target.value, 10);
      this.el.htSpacingVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });
    this.el.htAngleSlider.addEventListener('input', (e) => {
      this.state.halftone.gridAngle = parseInt(e.target.value, 10);
      this.el.htAngleVal.textContent = `${e.target.value}°`;
      this.renderCurrentEngine();
    });
    this.el.htRadiusSlider.addEventListener('input', (e) => {
      this.state.halftone.dotRadius = parseFloat(e.target.value);
      this.el.htRadiusVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });
    this.el.htShapeSelect.addEventListener('change', (e) => {
      this.state.halftone.shape = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.htHollowCheckbox.addEventListener('change', (e) => {
      this.state.halftone.hollow = e.target.checked;
      this.renderCurrentEngine();
    });
    this.el.htInvertCheckbox.addEventListener('change', (e) => {
      this.state.halftone.inverted = e.target.checked;
      this.renderCurrentEngine();
    });

    // Line art controls events
    this.el.laSensitivitySlider.addEventListener('input', (e) => {
      this.state.lineArt.sensitivity = parseInt(e.target.value, 10);
      this.el.laSensitivityVal.textContent = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.laThicknessSlider.addEventListener('input', (e) => {
      this.state.lineArt.lineThickness = parseInt(e.target.value, 10);
      this.el.laThicknessVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });
    this.el.laInvertCheckbox.addEventListener('change', (e) => {
      this.state.lineArt.invert = e.target.checked;
      this.renderCurrentEngine();
    });

    // Random Flow controls events
    this.el.rfCountSlider.addEventListener('input', (e) => {
      this.state.randomFlow.particleCount = parseInt(e.target.value, 10);
      this.el.rfCountVal.textContent = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.rfLengthSlider.addEventListener('input', (e) => {
      this.state.randomFlow.maxSteps = parseInt(e.target.value, 10);
      this.el.rfLengthVal.textContent = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.rfStrokeSlider.addEventListener('input', (e) => {
      this.state.randomFlow.strokeWidth = parseInt(e.target.value, 10);
      this.el.rfStrokeVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });

    // Camo Mesh controls events
    this.el.cmRegionsSlider.addEventListener('input', (e) => {
      this.state.camoMesh.regions = parseInt(e.target.value, 10);
      this.el.cmRegionsVal.textContent = e.target.value;
      this.renderCurrentEngine();
    });
    this.el.cmDotSizeSlider.addEventListener('input', (e) => {
      this.state.camoMesh.dotSize = parseInt(e.target.value, 10);
      this.el.cmDotSizeVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });
    this.el.cmWarpSlider.addEventListener('input', (e) => {
      this.state.camoMesh.warp = parseInt(e.target.value, 10) / 100;
      this.el.cmWarpVal.textContent = `${e.target.value}%`;
      this.renderCurrentEngine();
    });

    // Mosaic controls events
    if (this.el.msSizePresetSelect) {
      this.el.msSizePresetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val !== 'custom') {
          const num = parseInt(val, 10);
          this.state.mosaic.tileSize = num;
          if (this.el.msSizeSlider) this.el.msSizeSlider.value = num;
          if (this.el.msSizeVal) this.el.msSizeVal.textContent = `${num} px`;
          this.renderCurrentEngine();
        }
      });
    }

    this.el.msSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.mosaic.tileSize = val;
      this.el.msSizeVal.textContent = `${val} px`;
      if (this.el.msSizePresetSelect) {
        const matchingOpt = Array.from(this.el.msSizePresetSelect.options).find(o => o.value === String(val));
        this.el.msSizePresetSelect.value = matchingOpt ? String(val) : 'custom';
      }
      this.renderCurrentEngine();
    });
    this.el.msShapeSelect.addEventListener('change', (e) => {
      this.state.mosaic.shape = e.target.value;
      this.renderCurrentEngine();
    });
    if (this.el.msFitDocumentToggle) {
      this.el.msFitDocumentToggle.addEventListener('change', (e) => {
        this.state.mosaic.fitDocumentToDesign = e.target.checked;
        this.renderCurrentEngine();
      });
    }
    this.el.msSpacingSlider.addEventListener('input', (e) => {
      this.state.mosaic.spacing = parseInt(e.target.value, 10);
      this.el.msSpacingVal.textContent = `${e.target.value} px`;
      this.renderCurrentEngine();
    });
    if (this.el.msRotationSlider) {
      this.el.msRotationSlider.addEventListener('input', (e) => {
        this.state.mosaic.rotation = parseInt(e.target.value, 10);
        if (this.el.msRotationVal) this.el.msRotationVal.textContent = `${e.target.value}°`;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msStaggerSelect) {
      this.el.msStaggerSelect.addEventListener('change', (e) => {
        this.state.mosaic.stagger = e.target.value;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msSourceArtTypeSelect) {
      this.el.msSourceArtTypeSelect.addEventListener('change', (e) => {
        const isPixelArt = e.target.value === 'already-pixel-art';
        this.setMosaicInputMode(isPixelArt ? 'pixel-art' : 'photo');
      });
    }
    if (this.el.msMosaicStrategySelect) {
      const descriptions = {
        'default-pixel-art': 'Existing default Pixel Art Mosaic processing.'
      };
      const updateStrategyUI = (val) => {
        if (!this.el.msStrategyControls) return;
        const isDefault = val === 'default-pixel-art';
        this.el.msStrategyControls.style.display = isDefault ? 'none' : 'block';

      };

      this.el.msMosaicStrategySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.state.mosaic.mosaicStrategy = val;
        if (this.el.msStrategyDesc) {
          this.el.msStrategyDesc.textContent = descriptions[val] || descriptions['default-pixel-art'];
        }
        updateStrategyUI(val);
        this.renderCurrentEngine();
      });

      // Sub-control event listeners
      if (this.el.msIslandSizeSlider) {
        this.el.msIslandSizeSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.state.mosaic.minIslandSize = val;
          if (this.el.msIslandSizeVal) this.el.msIslandSizeVal.textContent = `${val} px`;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msIslandProxSlider) {
        this.el.msIslandProxSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.state.mosaic.islandProximity = val;
          if (this.el.msIslandProxVal) this.el.msIslandProxVal.textContent = `${val} px`;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msOrthogonalCollinearToggle) {
        this.el.msOrthogonalCollinearToggle.addEventListener('change', (e) => {
          this.state.mosaic.collinearMerge = e.target.checked;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msQuadtreeMinSelect) {
        this.el.msQuadtreeMinSelect.addEventListener('change', (e) => {
          const val = parseInt(e.target.value, 10);
          this.state.mosaic.minCellSize = val;
          if (this.el.msQuadtreeMinVal) this.el.msQuadtreeMinVal.textContent = `${val} px`;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msQuadtreeVarSlider) {
        this.el.msQuadtreeVarSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.state.mosaic.varianceThreshold = val;
          if (this.el.msQuadtreeVarVal) this.el.msQuadtreeVarVal.textContent = `${val}`;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msResamplerScaleSelect) {
        this.el.msResamplerScaleSelect.addEventListener('change', (e) => {
          this.state.mosaic.targetScale = e.target.value;
          this.renderCurrentEngine();
        });
      }
      if (this.el.msIsolineBandsSlider) {
        this.el.msIsolineBandsSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.state.mosaic.isolineBands = val;
          if (this.el.msIsolineBandsVal) this.el.msIsolineBandsVal.textContent = `${val}`;
          this.renderCurrentEngine();
        });
      }
    }
    if (this.el.msSamplingSelect) {
      this.el.msSamplingSelect.addEventListener('change', (e) => {
        this.state.mosaic.samplingMethod = e.target.value;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msPaletteSelect) {
      this.el.msPaletteSelect.addEventListener('change', (e) => {
        this.state.mosaic.palette = e.target.value;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msDitherSelect) {
      this.el.msDitherSelect.addEventListener('change', (e) => {
        this.state.mosaic.ditherAlgorithm = e.target.value;
        this.renderCurrentEngine();
      });
    }

    this.el.msCleanEdgeToggle?.addEventListener('change', (e) => {
      this.setMosaicCleanEdgePurifier(e.target.checked);
    });
    this.el.msCleanEdgeResetBtn?.addEventListener('click', () => {
      this.setMosaicCleanEdgePurifier(false);
    });

    // Color Restore (full-grid lost-color restoration, Already Pixel Art)
    this.el.msColorRestoreToggle?.addEventListener('change', (e) => {
      this.setMosaicColorRestore(e.target.checked);
    });
    this.el.msColorRestoreTolSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.mosaic.colorRestoreTolerance = val;
      if (this.el.msColorRestoreTolVal) this.el.msColorRestoreTolVal.textContent = `${val}`;
      this.renderCurrentEngine();
    });

    // Edge Cleaner (outside-edge light fringe removal, Already Pixel Art)
    this.el.msEdgeCleanerToggle?.addEventListener('change', (e) => {
      this.setMosaicEdgeCleaner(e.target.checked);
    });
    this.el.msEdgeCleanerStrengthSlider?.addEventListener('input', (e) => {
      this.state.mosaic.edgeCleanerStrength = parseInt(e.target.value, 10) || 25;
      if (this.el.msEdgeCleanerStrengthVal) {
        this.el.msEdgeCleanerStrengthVal.textContent = `${this.state.mosaic.edgeCleanerStrength}%`;
      }
      this.renderCurrentEngine();
    });
    this.el.msEdgeCleanerDarkShadingToggle?.addEventListener('change', (e) => {
      this.state.mosaic.edgeCleanerDarkShading = e.target.checked;
      this.renderCurrentEngine();
    });

    // Already Pixel Art tile mode: Auto (detect) vs manual fixed sizes
    this.el.msPixelArtTileModeSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      this.state.mosaic.forceTileSize = val === 'auto' ? 0 : parseInt(val, 10);
      this.renderCurrentEngine();
    });

    // Mosaic Trim Controls
    if (this.el.msTrimToggle) {
      this.el.msTrimToggle.addEventListener('change', (e) => {
        this.state.mosaic.trimEnabled = e.target.checked;
        if (this.el.msTrimOptionsBox) {
          this.el.msTrimOptionsBox.style.display = e.target.checked ? 'block' : 'none';
        }
        if (this.el.msTrimStatusBadge) {
          this.el.msTrimStatusBadge.textContent = e.target.checked ? 'Active' : 'Off';
        }
        this.renderCurrentEngine();
      });
    }
    if (this.el.msTrimPreserveDesignCheck) {
      this.el.msTrimPreserveDesignCheck.addEventListener('change', (e) => {
        this.state.mosaic.preserveDesignCells = e.target.checked;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msTrimPreserveBoundaryCheck) {
      this.el.msTrimPreserveBoundaryCheck.addEventListener('change', (e) => {
        this.state.mosaic.preserveBoundaryCells = e.target.checked;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msTrimPreserveCornersCheck) {
      this.el.msTrimPreserveCornersCheck.addEventListener('change', (e) => {
        this.state.mosaic.preserveCornerCells = e.target.checked;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msTrimPreserveThinCheck) {
      this.el.msTrimPreserveThinCheck.addEventListener('change', (e) => {
        this.state.mosaic.preserveThinFeatures = e.target.checked;
        this.renderCurrentEngine();
      });
    }
    if (this.el.msTrimPreviewToggle) {
      this.el.msTrimPreviewToggle.addEventListener('change', (e) => {
        this.state.mosaic.trimPreview = e.target.checked;
        this.renderCurrentEngine();
      });
    }

    // Mosaic Feature Mode (Normal Image vs Already Pixel Art)
    this.el.msInputModeButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-input-mode');
        if (mode) {
          this.setMosaicInputMode(mode);
        }
      });
    });

    // Mosaic Background Removal Filter Pill buttons
    this.el.msBgModeButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.setMosaicBgRemovalMode(mode);
      });
    });

    // Mosaic Add Color to Removal List button
    if (this.el.msAddColorBtn) {
      this.el.msAddColorBtn.addEventListener('click', () => {
        this.state.mosaic.isAddingColor = true;
        this.toggleMosaicEyedropper(true);
        this.showToast('Click any color on the canvas to add it to removal list');
      });
    }

    // Document & Outside Colors Batch & Scope Event Listeners
    if (this.el.msBatchAutoBgBtn) {
      this.el.msBatchAutoBgBtn.addEventListener('click', () => {
        if (!this.state.croppedImageData) return;
        const autoColors = DocumentColorExtractor.detectBackgroundColorCluster(this.state.croppedImageData);
        if (autoColors.length > 0) {
          this.setActiveScopeColors(autoColors);
          this.state.mosaic.bgRemovalMode = 'custom';
          this.syncMosaicBgModeButtons();
          this.renderMosaicDocColors();
          this.renderMosaicActiveColors();
          this.renderCurrentEngine();
          this.showToast(`Auto BG: Detected ${autoColors.length} background colors`);
        } else {
          this.showToast('No background cluster detected');
        }
      });
    }

    if (this.el.msBatchDarkBtn) {
      this.el.msBatchDarkBtn.addEventListener('click', () => {
        const source = this.state.croppedImageData;
        if (!source) return;
        const scope = this.state.mosaic.docColorScope || 'outside';
        const extracted = scope === 'inside'
          ? DocumentColorExtractor.extractInsideColors(source, { sortBy: 'dark-to-light', maxColors: 64 })
          : DocumentColorExtractor.extractBoundaryAndOutsideColors(source, { sortBy: 'dark-to-light', maxColors: 64 });
        const darkHexes = extracted.filter(c => c.luminance < 0.20).map(c => c.hex);
        if (darkHexes.length > 0) {
          const current = this.getActiveScopeColors();
          const combined = Array.from(new Set([...current, ...darkHexes]));
          this.setActiveScopeColors(combined);
          this.state.mosaic.bgRemovalMode = 'custom';
          this.syncMosaicBgModeButtons();
          this.renderMosaicDocColors();
          this.renderMosaicActiveColors();
          this.renderCurrentEngine();
          this.showToast(`Selected ${darkHexes.length} dark colors`);
        } else {
          this.showToast('No dark colors found (Luminance < 20%)');
        }
      });
    }

    if (this.el.msBatchLightBtn) {
      this.el.msBatchLightBtn.addEventListener('click', () => {
        const source = this.state.croppedImageData;
        if (!source) return;
        const scope = this.state.mosaic.docColorScope || 'outside';
        const extracted = scope === 'inside'
          ? DocumentColorExtractor.extractInsideColors(source, { sortBy: 'dark-to-light', maxColors: 64 })
          : DocumentColorExtractor.extractBoundaryAndOutsideColors(source, { sortBy: 'dark-to-light', maxColors: 64 });
        const lightHexes = extracted.filter(c => c.luminance > 0.80).map(c => c.hex);
        if (lightHexes.length > 0) {
          const current = this.getActiveScopeColors();
          const combined = Array.from(new Set([...current, ...lightHexes]));
          this.setActiveScopeColors(combined);
          this.state.mosaic.bgRemovalMode = 'custom';
          this.syncMosaicBgModeButtons();
          this.renderMosaicDocColors();
          this.renderMosaicActiveColors();
          this.renderCurrentEngine();
          this.showToast(`Selected ${lightHexes.length} light colors`);
        } else {
          this.showToast('No light colors found (Luminance > 80%)');
        }
      });
    }

    if (this.el.msSortToggleBtn) {
      this.el.msSortToggleBtn.addEventListener('click', () => {
        const current = this.state.mosaic.docColorSort || 'dark-to-light';
        const nextMap = {
          'dark-to-light': 'light-to-dark',
          'light-to-dark': 'frequency',
          'frequency': 'dark-to-light'
        };
        const labelMap = {
          'dark-to-light': 'D→L',
          'light-to-dark': 'L→D',
          'frequency': 'Freq'
        };
        this.state.mosaic.docColorSort = nextMap[current];
        if (this.el.msSortLabel) {
          this.el.msSortLabel.textContent = labelMap[this.state.mosaic.docColorSort];
        }
        this.renderMosaicDocColors();
      });
    }

    if (this.el.msScopeOutsideBtn) {
      this.el.msScopeOutsideBtn.addEventListener('click', () => {
        this.state.mosaic.docColorScope = 'outside';
        this.el.msScopeOutsideBtn.classList.add('active');
        if (this.el.msScopeInsideBtn) this.el.msScopeInsideBtn.classList.remove('active');
        this.renderMosaicDocColors();
        this.renderMosaicActiveColors();
      });
    }
    if (this.el.msScopeInsideBtn) {
      this.el.msScopeInsideBtn.addEventListener('click', () => {
        this.state.mosaic.docColorScope = 'inside';
        this.el.msScopeInsideBtn.classList.add('active');
        if (this.el.msScopeOutsideBtn) this.el.msScopeOutsideBtn.classList.remove('active');
        this.renderMosaicDocColors();
        this.renderMosaicActiveColors();
      });
    }

    if (this.el.msToleranceSlider) {
      this.el.msToleranceSlider.addEventListener('input', (e) => {
        this.setMosaicTolerance(e.target.value, false, true, true);
      });
    }

    this.el.msTolerancePresets?.forEach(btn => {
      btn.addEventListener('click', () => {
        const tol = parseInt(btn.getAttribute('data-tol'), 10);
        this.setMosaicTolerance(tol, true, true, true);
      });
    });

    // Mosaic 100% Pixel Cleanup Controls & Tools Event Listeners
    if (this.el.msAutoCleanBtn) {
      this.el.msAutoCleanBtn.addEventListener('click', () => {
        this.triggerAutoClean();
      });
    }

    if (this.el.msAnalyzeEdgesBtn) {
      this.el.msAnalyzeEdgesBtn.addEventListener('click', () => {
        this.triggerAnalyzeEdges();
      });
    }

    if (this.el.msManualRemoveBtn) {
      this.el.msManualRemoveBtn.addEventListener('click', () => {
        this.setMosaicManualTool('remove');
      });
    }
    if (this.el.msManualRestoreBtn) {
      this.el.msManualRestoreBtn.addEventListener('click', () => {
        this.setMosaicManualTool('restore');
      });
    }
    if (this.el.msManualProtectBtn) {
      this.el.msManualProtectBtn.addEventListener('click', () => {
        this.setMosaicManualTool('protect');
      });
    }

    if (this.el.msNoiseSlider) {
      this.el.msNoiseSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.mosaic.noiseThreshold = val;
        this.state.mosaic.cleanupEnabled = true;
        if (this.el.msNoiseVal) this.el.msNoiseVal.textContent = `${val}%`;
        this.renderCurrentEngine();
      });
    }

    if (this.el.msEdgeSensitivitySlider) {
      this.el.msEdgeSensitivitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.mosaic.edgeSensitivity = val;
        this.state.mosaic.cleanupEnabled = true;
        if (this.el.msEdgeSensitivityVal) this.el.msEdgeSensitivityVal.textContent = `${val}%`;
        this.renderCurrentEngine();
      });
    }

    if (this.el.msQualityChecksGrid) {
      const checkItems = this.el.msQualityChecksGrid.querySelectorAll('.quality-check-item');
      checkItems.forEach(item => {
        item.addEventListener('click', () => {
          const key = item.getAttribute('data-check-key');
          if (!key) return;
          if (!this.state.mosaic.qualityChecks) {
            this.state.mosaic.qualityChecks = {
              outside: true,
              edges: true,
              noise: true,
              protection: true,
              zeroColorLoss: true,
              gridAlignment: true,
              designBoundaries: true
            };
          }
          const current = this.state.mosaic.qualityChecks[key] !== false;
          this.state.mosaic.qualityChecks[key] = !current;
          const label = item.querySelector('.check-label')?.textContent || key;
          this.showToast(`${label} check ${!current ? 'enabled' : 'disabled'}`);
          this.renderCurrentEngine();
        });
      });
    }

    if (this.el.msResetAllBtn) {
      this.el.msResetAllBtn.addEventListener('click', () => {
        this.resetMosaicAll();
      });
    }

    if (this.el.autoFitStockBtn) {
      this.el.autoFitStockBtn.addEventListener('click', () => {
        this.applyAutoFitStock();
      });
    }
    if (this.el.modalAutoFitStockBtn) {
      this.el.modalAutoFitStockBtn.addEventListener('click', () => {
        this.applyAutoFitStock();
        if (this.el.safeCheckModal) this.el.safeCheckModal.classList.remove('open');
      });
    }

    if (this.el.panToolBtn) {
      this.el.panToolBtn.addEventListener('click', () => {
        this.togglePanTool();
      });
    }

    // Pencil controls events
    this.el.pcSizeSlider.addEventListener('input', (e) => {
      this.el.pcSizeVal.textContent = `${e.target.value} px`;
    });
    this.el.pcUndoBtn.addEventListener('click', () => {
      this.pencilEngine.undo();
      this.renderCurrentEngine();
    });
    this.el.pcClearBtn.addEventListener('click', () => {
      this.pencilEngine.clear();
      this.renderCurrentEngine();
    });

    // Zoom and Pan Handlers
    this.el.zoomInBtn.addEventListener('click', () => {
      this.state.zoom = Math.min(16, this.state.zoom * 1.25);
      this.applyTransform();
    });
    this.el.zoomOutBtn.addEventListener('click', () => {
      this.state.zoom = Math.max(0.005, this.state.zoom / 1.25);
      this.applyTransform();
    });
    this.el.zoomFitBtn.addEventListener('click', () => this.fitToScreen());
    this.el.zoom100Btn.addEventListener('click', () => {
      this.state.zoom = 1.0;
      this.state.panX = 0;
      this.state.panY = 0;
      this.applyTransform();
    });
    this.el.toggleGridBtn.addEventListener('click', () => {
      this.state.showGrid = !this.state.showGrid;
      this.renderGridOverlay();
    });

    // Context Menu suppression on canvas viewport to enable smooth right-click drag pan
    this.el.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Mouse Wheel Zoom anchored towards mouse cursor
    this.el.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.el.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const prevZoom = this.state.zoom;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const nextZoom = Math.max(0.005, Math.min(16, prevZoom * zoomFactor));

      // Adjust pan coordinates so the point under the cursor stays fixed in place
      this.state.panX = mouseX - (mouseX - this.state.panX) * (nextZoom / prevZoom);
      this.state.panY = mouseY - (mouseY - this.state.panY) * (nextZoom / prevZoom);
      this.state.zoom = nextZoom;
      this.applyTransform();
    });

    // Viewport Pan / Draw Handlers
    this.el.viewport.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('.floating-zoom-controls, .floating-editor-toolbar')) {
        return;
      }
      // Panning via Middle Mouse (1), Right Click (2), Spacebar + Left Click, or Active Hand Tool
      if (e.button === 1 || e.button === 2 || this.state.isSpaceDown || this.state.isPanToolActive) {
        this.state.isPanning = true;
        this.state.startPanX = e.clientX - this.state.panX;
        this.state.startPanY = e.clientY - this.state.panY;
        this.el.viewport.style.cursor = 'grabbing';
        return;
      } else if (e.button === 0 && this.state.mode === 'mosaic' && this.state.mosaic.isPickingColor) {
        // Sample color from canvas for background removal
        const coords = this.getGridCoords(e);
        if (coords && this.state.croppedImageData) {
          const src = this.state.croppedImageData;
          const idx = (coords.y * src.width + coords.x) * 4;
          const hex = rgbToHex(src.data[idx], src.data[idx + 1], src.data[idx + 2]);
          this.state.mosaic.customRemoveColor = hex;
          if (this.el.msRemoveColorInput) this.el.msRemoveColorInput.value = hex;

          const current = [...this.getActiveScopeColors()];
          if (this.state.mosaic.isAddingColor) {
            if (!current.includes(hex)) {
              current.push(hex);
              this.setActiveScopeColors(current);
            }
            this.state.mosaic.isAddingColor = false;
            this.toggleMosaicEyedropper(false);
            this.renderMosaicActiveColors();
            this.renderMosaicDocColors();
            this.renderCurrentEngine();
            this.showToast(`Added color ${hex} to removal list`);
          } else {
            this.setActiveScopeColors([hex]);
            this.toggleMosaicEyedropper(false);
            this.setMosaicBgRemovalMode('custom');
            this.renderMosaicActiveColors();
            this.renderMosaicDocColors();
            this.renderCurrentEngine();
            this.showToast(`Selected color ${hex} to remove`);
          }
        }
      } else if (e.button === 0 && (this.state.mode === 'pixel-art' || this.state.mode === 'mosaic')) {
        const coords = this.getGridCoords(e);
        if (coords) {
          this.state.isDrawing = true;
          this.state.drawStartX = coords.x;
          this.state.drawStartY = coords.y;
          if (this.state.mode === 'pixel-art' && this.state.pixelGrid) {
            this.history.push(this.state.pixelGrid);
            this.handlePixelTool(coords.x, coords.y, false);
          } else if (this.state.mode === 'mosaic' && this.state.mosaicGrid) {
            this.handleMosaicTool(coords.x, coords.y, false);
          }
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.state.isPanning) {
        this.state.panX = e.clientX - this.state.startPanX;
        this.state.panY = e.clientY - this.state.startPanY;
        this.applyTransform();
      } else if (this.state.isDrawing && this.state.mode === 'pixel-art') {
        const coords = this.getGridCoords(e);
        if (coords) {
          this.handlePixelTool(coords.x, coords.y, true);
        }
      } else if (this.state.isDrawing && this.state.mode === 'mosaic' && this.state.mosaicGrid) {
        const coords = this.getGridCoords(e);
        if (coords) {
          this.handleMosaicTool(coords.x, coords.y, true);
        }
      }

      const coords = this.getGridCoords(e);
      if (coords && this.el.statusCursor) {
        this.el.statusCursor.textContent = `X: ${coords.x}, Y: ${coords.y}`;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.state.isPanning) {
        this.state.isPanning = false;
        this.el.viewport.style.cursor = (this.state.isSpaceDown || this.state.isPanToolActive) ? 'grab' : 'default';
      }
      if (this.state.isDrawing) {
        const coords = this.getGridCoords(e);
        if (coords && (this.state.activeTool === 'rect' || this.state.activeTool === 'line')) {
          if (this.state.mode === 'pixel-art') {
            this.handleShapeEnd(coords.x, coords.y);
          } else if (this.state.mode === 'mosaic') {
            this.handleMosaicShapeEnd(coords.x, coords.y);
          }
        }
        this.state.isDrawing = false;
        if (this.state.mode === 'mosaic' && this.state.mosaicErasePaletteDirty) {
          this.state.mosaicErasePaletteDirty = false;
          this.renderMosaicActivePaletteSwatches();
        }
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.state.isSpaceDown && document.activeElement.tagName !== 'INPUT') {
        this.state.isSpaceDown = true;
        this.el.viewport.style.cursor = 'grab';
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.handleRedo();
        } else {
          this.handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.handleRedo();
      }
      if (e.key.toLowerCase() === 'g' && document.activeElement.tagName !== 'INPUT') {
        this.state.showGrid = !this.state.showGrid;
        this.renderGridOverlay();
      }
      if (e.key === 'Escape') {
        toggleSidebar(false);
        this.el.overflowDropdown?.classList.remove('open');
        this.el.exportModal?.classList.remove('open');
        this.el.safeCheckModal?.classList.remove('open');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.state.isSpaceDown = false;
        this.el.viewport.style.cursor = 'default';
      }
    });

    // Undo / Redo Buttons
    if (this.el.undoBtn) this.el.undoBtn.addEventListener('click', () => this.handleUndo());
    if (this.el.redoBtn) this.el.redoBtn.addEventListener('click', () => this.handleRedo());

    // Marketplace Safe Check Modal
    if (this.el.safeCheckBtn) {
      this.el.safeCheckBtn.addEventListener('click', () => {
        this.openSafeCheckModal();
      });
    }
    if (this.el.closeSafeCheckModalBtn) {
      this.el.closeSafeCheckModalBtn.addEventListener('click', () => {
        this.el.safeCheckModal.classList.remove('open');
      });
    }
    if (this.el.safeCheckCloseXBtn) {
      this.el.safeCheckCloseXBtn.addEventListener('click', () => {
        this.el.safeCheckModal.classList.remove('open');
      });
    }

    // Split View Button
    if (this.el.splitViewBtn) {
      this.el.splitViewBtn.addEventListener('click', () => this.toggleSplitView());
    }

    // Project Save / Load
    if (this.el.saveProjectBtn) {
      this.el.saveProjectBtn.addEventListener('click', () => {
        ProjectManager.saveProject(this.state);
        this.showToast('Saved .pixelart project file');
      });
    }

    if (this.el.projectFileInput) {
      this.el.projectFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          ProjectManager.loadProject(file).then(({ data, grid }) => {
            if (grid) {
              this.state.pixelGrid = grid;
              this.state.mode = data.mode || 'pixel-art';
              if (data.background) {
                this.state.transparentBg = data.background.transparent !== false;
                this.state.bgColor = data.background.color || '#ffffff';
                if (this.el.sidebarTransparentBg) this.el.sidebarTransparentBg.checked = this.state.transparentBg;
                if (this.el.bgColorControlGroup) this.el.bgColorControlGroup.style.display = this.state.transparentBg ? 'none' : 'block';
              }
              this.setMode(this.state.mode);
              this.renderPixelArt();
              this.showToast('Loaded project file');
            }
          }).catch(err => alert(err.message));
        }
      });
    }

    // Export Modal Events
    if (this.el.exportModalBtn) {
      this.el.exportModalBtn.addEventListener('click', () => {
        if (this.el.exportTransparentBg) this.el.exportTransparentBg.checked = this.state.transparentBg;
        this.el.exportModal.classList.add('open');
      });
    }

    if (this.el.closeExportModalBtn) {
      this.el.closeExportModalBtn.addEventListener('click', () => {
        this.el.exportModal.classList.remove('open');
      });
    }
    if (this.el.modalCloseXBtn) {
      this.el.modalCloseXBtn.addEventListener('click', () => {
        this.el.exportModal.classList.remove('open');
      });
    }

    if (this.el.svgModeSelect) {
      this.el.svgModeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (this.el.svgModeHelpText) {
          if (val === 'grouped-stock') {
            this.el.svgModeHelpText.textContent = '✓ Grouped by Color + Run-length merged. Slashes file size by 85%+ and enables 1-click ungroup in Illustrator/Inkscape.';
          } else if (val === 'objects-stock') {
            this.el.svgModeHelpText.textContent = '✓ Each connected icon or star is packaged into its own top-level group for 1-click selection and easy repositioning.';
          } else if (val === 'optimized') {
            this.el.svgModeHelpText.textContent = '✓ Contiguous horizontal row merging to produce the smallest possible raw SVG payload.';
          } else {
            this.el.svgModeHelpText.textContent = '⚠️ 1 discrete shape per cell. High anchor point count for small tile sizes.';
          }
        }
      });
    }

    if (this.el.exportFormatSelect) {
      this.el.exportFormatSelect.addEventListener('change', (e) => {
        const format = e.target.value;
        const isSvg = format === 'svg';
        const isJpeg = format === 'jpeg';

        this.el.svgOptionsGroup.style.display = isSvg ? 'block' : 'none';
        this.el.pngOptionsGroup.style.display = !isSvg ? 'block' : 'none';
        this.el.jpegNotice.style.display = isJpeg ? 'block' : 'none';
        this.el.modalBgControlGroup.style.display = isJpeg ? 'none' : 'block';
      });
    }

    if (this.el.exportTransparentBg) {
      this.el.exportTransparentBg.addEventListener('change', (e) => {
        this.state.transparentBg = e.target.checked;
        if (this.el.sidebarTransparentBg) this.el.sidebarTransparentBg.checked = this.state.transparentBg;
        if (this.el.bgColorControlGroup) this.el.bgColorControlGroup.style.display = this.state.transparentBg ? 'none' : 'block';
        this.reprocess();
      });
    }

    if (this.el.downloadExportBtn) {
      this.el.downloadExportBtn.addEventListener('click', () => {
        this.executeExport();
        this.el.exportModal.classList.remove('open');
      });
    }

    // Responsive Auto-Fit on Resize
    window.addEventListener('resize', () => {
      this.fitToScreen();
    });

    if (window.ResizeObserver && this.el.viewport) {
      const resizeObserver = new ResizeObserver(() => {
        this.fitToScreen();
      });
      resizeObserver.observe(this.el.viewport);
    }
  }

  initTouchAndGestureListeners() {
    let touchStartDist = 0;
    let touchStartZoom = 1;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let touchStartCenter = { x: 0, y: 0 };
    let isTouchPanning = false;
    let isTouchDrawing = false;
    let startTouchPanX = 0;
    let startTouchPanY = 0;

    const viewport = this.el.viewport;
    if (!viewport) return;

    viewport.addEventListener('touchstart', (e) => {
      if (e.target && e.target.closest && e.target.closest('.floating-zoom-controls, .floating-editor-toolbar')) {
        return;
      }
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (this.state.mode === 'pixel-art' && this.state.pixelGrid) {
          const coords = this.getGridCoords(t);
          if (coords) {
            this.history.push(this.state.pixelGrid);
            isTouchDrawing = true;
            this.state.drawStartX = coords.x;
            this.state.drawStartY = coords.y;
            this.handlePixelTool(coords.x, coords.y, false);
            return;
          }
        }
        isTouchPanning = true;
        startTouchPanX = t.clientX - this.state.panX;
        startTouchPanY = t.clientY - this.state.panY;
      } else if (e.touches.length === 2) {
        isTouchDrawing = false;
        isTouchPanning = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartZoom = this.state.zoom;
        touchStartCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        touchStartPanX = this.state.panX;
        touchStartPanY = this.state.panY;
      }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent browser native viewport scroll
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (isTouchDrawing && this.state.mode === 'pixel-art') {
          const coords = this.getGridCoords(t);
          if (coords) {
            this.handlePixelTool(coords.x, coords.y, true);
          }
        } else if (isTouchPanning) {
          this.state.panX = t.clientX - startTouchPanX;
          this.state.panY = t.clientY - startTouchPanY;
          this.applyTransform();
        }
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (touchStartDist > 0) {
          const scale = dist / touchStartDist;
          this.state.zoom = Math.max(0.005, Math.min(16, touchStartZoom * scale));
        }
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        this.state.panX = touchStartPanX + (currentCenter.x - touchStartCenter.x);
        this.state.panY = touchStartPanY + (currentCenter.y - touchStartCenter.y);
        this.applyTransform();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (isTouchDrawing) {
        if (e.changedTouches.length > 0) {
          const coords = this.getGridCoords(e.changedTouches[0]);
          if (coords && (this.state.activeTool === 'rect' || this.state.activeTool === 'line')) {
            this.handleShapeEnd(coords.x, coords.y);
          }
        }
        isTouchDrawing = false;
      }
      if (e.touches.length === 0) {
        isTouchPanning = false;
        touchStartDist = 0;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        startTouchPanX = t.clientX - this.state.panX;
        startTouchPanY = t.clientY - this.state.panY;
      }
    });

    viewport.addEventListener('touchcancel', () => {
      isTouchDrawing = false;
      isTouchPanning = false;
      touchStartDist = 0;
    });
  }

  getGridCoords(e) {
    if (!this.el.outputCanvas) return null;
    const rect = this.el.outputCanvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      return null;
    }
    const x = Math.floor((e.clientX - rect.left) / (rect.width / this.el.outputCanvas.width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / this.el.outputCanvas.height));
    return { x: Math.max(0, Math.min(this.el.outputCanvas.width - 1, x)), y: Math.max(0, Math.min(this.el.outputCanvas.height - 1, y)) };
  }

  handlePixelTool(x, y, isDrag) {
    if (!this.state.pixelGrid) return;
    const grid = this.state.pixelGrid;
    const tool = this.state.activeTool;

    if (tool === 'pencil') {
      PixelEditor.drawPencil(grid, x, y, this.state.activePaletteIndex, this.state.brushSize, 255);
      this.renderPixelArt();
    } else if (tool === 'eraser') {
      PixelEditor.erase(grid, x, y, this.state.brushSize);
      this.renderPixelArt();
    } else if (tool === 'fill' && !isDrag) {
      PixelEditor.floodFill(grid, x, y, this.state.activePaletteIndex, 255);
      this.renderPixelArt();
    } else if (tool === 'picker') {
      const p = grid.getPixel(x, y);
      if (p) {
        this.state.activePaletteIndex = p.paletteIndex;
        this.state.activeColor = [p.r, p.g, p.b];
        const hex = rgbToHex(p.r, p.g, p.b);
        if (this.el.editorColorInput) this.el.editorColorInput.value = hex;
        if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = hex;
        this.updatePaletteSwatches();
      }
    }
  }

  handleShapeEnd(x, y) {
    if (!this.state.pixelGrid) return;
    const grid = this.state.pixelGrid;
    const tool = this.state.activeTool;

    if (tool === 'rect') {
      PixelEditor.drawRect(grid, this.state.drawStartX, this.state.drawStartY, x, y, this.state.activePaletteIndex, true);
      this.renderPixelArt();
    } else if (tool === 'line') {
      PixelEditor.drawLine(grid, this.state.drawStartX, this.state.drawStartY, x, y, this.state.activePaletteIndex, 1);
      this.renderPixelArt();
    }
  }

  // Rendered mosaic cell size from the last engine run — the single source of
  // truth for click→cell mapping and the Safe Check cell-size audit.
  getMosaicToolCellSize() {
    return this.state.mosaic?.appliedTileSize || this.state.mosaic?.tileSize || 16;
  }

  handleMosaicTool(x, y, isDrag) {
    if (!this.state.mosaicGrid || !this.el.outputCanvas) return;
    const grid = this.state.mosaicGrid;
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    // Cells are drawn (and crop-shifted) at step = rendered size + spacing,
    // so mapping divides by the ACTUAL rendered size with no added offset.
    const { c, r } = canvasPointToCell(x, y, this.getMosaicToolCellSize(), this.state.mosaic.spacing || 0);
    if (r < 0 || r >= numRows || c < 0 || c >= numCols) return;

    const tool = this.state.activeTool;
    const rgb = this.state.activeColor || [99, 102, 241];
    const colorStr = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

    if (!this.state.mosaic.manualOverrides) {
      this.state.mosaic.manualOverrides = {};
    }

    const manualTool = this.state.mosaic?.manualTool;
    if (manualTool && (manualTool === 'remove' || manualTool === 'restore' || manualTool === 'protect')) {
      const cell = grid[r][c];
      if (cell) {
        this.state.mosaic.cleanupEnabled = true;
        if (!this.state.mosaic.manualRemoveIds) this.state.mosaic.manualRemoveIds = new Set();
        if (!this.state.mosaic.manualRestoreIds) this.state.mosaic.manualRestoreIds = new Set();
        if (!this.state.mosaic.protectedIds) this.state.mosaic.protectedIds = new Set();

        if (manualTool === 'remove') {
          if (cell.isRemoved && !cell.occupied) return;
          this.state.mosaic.manualRemoveIds.add(cell.id);
          this.state.mosaic.manualRestoreIds.delete(cell.id);
          this.state.mosaic.manualOverrides[`${c},${r}`] = { action: 'remove', removed: true };
          cell.isRemoved = true;
          cell.occupied = false;
        } else if (manualTool === 'restore') {
          this.state.mosaic.manualRestoreIds.add(cell.id);
          this.state.mosaic.manualRemoveIds.delete(cell.id);
          this.state.mosaic.manualOverrides[`${c},${r}`] = { action: 'keep', removed: false };
          cell.isRemoved = false;
          cell.occupied = true;
        } else if (manualTool === 'protect') {
          if (this.state.mosaic.protectedIds.has(cell.id)) {
            this.state.mosaic.protectedIds.delete(cell.id);
            cell.protected = false;
            cell.isProtected = false;
          } else {
            this.state.mosaic.protectedIds.add(cell.id);
            cell.protected = true;
            cell.isProtected = true;
          }
        }
        if (manualTool === 'remove') {
          this.state.mosaicErasePaletteDirty = true;
          this.scheduleMosaicErasePreview();
        } else {
          this.renderCurrentEngine();
        }
        return;
      }
    }

    const brushRadius = Math.max(0, Math.floor(((this.state.brushSize || 1) - 1) / 2));

    if (tool === 'pencil') {
      for (let dr = -brushRadius; dr <= brushRadius; dr++) {
        for (let dc = -brushRadius; dc <= brushRadius; dc++) {
          const targetR = r + dr;
          const targetC = c + dc;
          if (targetR >= 0 && targetR < numRows && targetC >= 0 && targetC < numCols) {
            const cell = grid[targetR][targetC];
            if (cell) {
              cell.occupied = true;
              cell.isRemoved = false;
              cell.sample = { r: rgb[0], g: rgb[1], b: rgb[2], a: 255 };
              cell.color = colorStr;
              this.state.mosaic.manualOverrides[`${targetC},${targetR}`] = { type: 'paint', color: colorStr, action: 'keep', removed: false };
            }
          }
        }
      }
      MosaicEngine.renderToCanvas({
        grid,
        width: this.el.outputCanvas.width,
        height: this.el.outputCanvas.height,
        transparentBg: this.state.transparentBg,
        bgColor: this.state.bgColor,
        ...this.state.mosaic
      }, this.ctx);
      this.renderMosaicActivePaletteSwatches();
    } else if (tool === 'eraser') {
      for (let dr = -brushRadius; dr <= brushRadius; dr++) {
        for (let dc = -brushRadius; dc <= brushRadius; dc++) {
          const targetR = r + dr;
          const targetC = c + dc;
          if (targetR >= 0 && targetR < numRows && targetC >= 0 && targetC < numCols) {
            const cell = grid[targetR][targetC];
            if (cell) {
              cell.occupied = false;
              cell.isRemoved = true;
              cell.sample = { r: 0, g: 0, b: 0, a: 0 };
              this.state.mosaic.manualOverrides[`${targetC},${targetR}`] = { type: 'erase', action: 'remove', removed: true };
            }
          }
        }
      }
      MosaicEngine.renderToCanvas({
        grid,
        width: this.el.outputCanvas.width,
        height: this.el.outputCanvas.height,
        transparentBg: this.state.transparentBg,
        bgColor: this.state.bgColor,
        ...this.state.mosaic
      }, this.ctx);
      this.renderMosaicActivePaletteSwatches();
    } else if (tool === 'fill' && !isDrag) {
      const targetCell = grid[r][c];
      if (targetCell) {
        const targetColor = targetCell.color;
        const queue = [[r, c]];
        const visited = new Set();
        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
          const key = `${currR},${currC}`;
          if (visited.has(key)) continue;
          visited.add(key);

          const cell = grid[currR][currC];
          if (cell && (cell.color === targetColor || !cell.occupied)) {
            cell.occupied = true;
            cell.isRemoved = false;
            cell.sample = { r: rgb[0], g: rgb[1], b: rgb[2], a: 255 };
            cell.color = colorStr;
            this.state.mosaic.manualOverrides[`${currC},${currR}`] = { type: 'paint', color: colorStr, action: 'keep', removed: false };

            if (currR > 0) queue.push([currR - 1, currC]);
            if (currR < numRows - 1) queue.push([currR + 1, currC]);
            if (currC > 0) queue.push([currR, currC - 1]);
            if (currC < numCols - 1) queue.push([currR, currC + 1]);
          }
        }
        MosaicEngine.renderToCanvas({
          grid,
          width: this.el.outputCanvas.width,
          height: this.el.outputCanvas.height,
          transparentBg: this.state.transparentBg,
          bgColor: this.state.bgColor,
          ...this.state.mosaic
        }, this.ctx);
        this.renderMosaicActivePaletteSwatches();
      }
    } else if (tool === 'picker') {
      const cell = grid[r][c];
      if (cell && cell.sample) {
        const sampledRgb = [cell.sample.r, cell.sample.g, cell.sample.b];
        this.state.activeColor = sampledRgb;
        const hex = rgbToHex(sampledRgb[0], sampledRgb[1], sampledRgb[2]);
        if (this.el.editorColorInput) this.el.editorColorInput.value = hex;
        if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = hex;
        this.renderMosaicActivePaletteSwatches();
      }
    }
  }

  scheduleMosaicErasePreview() {
    if (this.state.mosaicEraseRenderFrame !== null) return;

    const scheduleFrame = window.requestAnimationFrame
      ? (callback) => window.requestAnimationFrame(callback)
      : (callback) => window.setTimeout(callback, 16);
    this.state.mosaicEraseRenderFrame = scheduleFrame(() => {
      this.state.mosaicEraseRenderFrame = null;
      if (this.state.mode !== 'mosaic' || !this.state.mosaicGrid || !this.el.outputCanvas) return;

      MosaicEngine.renderToCanvas({
        grid: this.state.mosaicGrid,
        width: this.el.outputCanvas.width,
        height: this.el.outputCanvas.height,
        transparentBg: this.state.transparentBg,
        bgColor: this.state.bgColor,
        ...this.state.mosaic
      }, this.ctx);
    });
  }

  handleMosaicShapeEnd(x, y) {
    if (!this.state.mosaicGrid || !this.el.outputCanvas) return;
    const grid = this.state.mosaicGrid;
    const numRows = grid.length;
    const numCols = numRows > 0 ? grid[0].length : 0;
    if (numRows === 0 || numCols === 0) return;

    const { c: startC, r: startR } = canvasPointToCell(this.state.drawStartX, this.state.drawStartY, this.getMosaicToolCellSize(), this.state.mosaic.spacing || 0);
    const { c: endC, r: endR } = canvasPointToCell(x, y, this.getMosaicToolCellSize(), this.state.mosaic.spacing || 0);

    const tool = this.state.activeTool;
    const rgb = this.state.activeColor || [99, 102, 241];
    const colorStr = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

    if (!this.state.mosaic.manualOverrides) {
      this.state.mosaic.manualOverrides = {};
    }

    if (tool === 'rect') {
      const minR = Math.max(0, Math.min(startR, endR));
      const maxR = Math.min(numRows - 1, Math.max(startR, endR));
      const minC = Math.max(0, Math.min(startC, endC));
      const maxC = Math.min(numCols - 1, Math.max(startC, endC));

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = grid[r][c];
          if (cell) {
            cell.occupied = true;
            cell.isRemoved = false;
            cell.sample = { r: rgb[0], g: rgb[1], b: rgb[2], a: 255 };
            cell.color = colorStr;
            this.state.mosaic.manualOverrides[`${c},${r}`] = { type: 'paint', color: colorStr, action: 'keep', removed: false };
          }
        }
      }
      MosaicEngine.renderToCanvas({
        grid,
        width: this.el.outputCanvas.width,
        height: this.el.outputCanvas.height,
        transparentBg: this.state.transparentBg,
        bgColor: this.state.bgColor,
        ...this.state.mosaic
      }, this.ctx);
      this.renderMosaicActivePaletteSwatches();
    } else if (tool === 'line') {
      let x0 = startC, y0 = startR, x1 = endC, y1 = endR;
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, e2;

      while (true) {
        if (y0 >= 0 && y0 < numRows && x0 >= 0 && x0 < numCols) {
          const cell = grid[y0][x0];
          if (cell) {
            cell.occupied = true;
            cell.isRemoved = false;
            cell.sample = { r: rgb[0], g: rgb[1], b: rgb[2], a: 255 };
            cell.color = colorStr;
            this.state.mosaic.manualOverrides[`${x0},${y0}`] = { type: 'paint', color: colorStr, action: 'keep', removed: false };
          }
        }
        if (x0 === x1 && y0 === y1) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      MosaicEngine.renderToCanvas({
        grid,
        width: this.el.outputCanvas.width,
        height: this.el.outputCanvas.height,
        transparentBg: this.state.transparentBg,
        bgColor: this.state.bgColor,
        ...this.state.mosaic
      }, this.ctx);
      this.renderMosaicActivePaletteSwatches();
    }
  }

  renderMosaicActivePaletteSwatches() {
    if (!this.el.msPaletteSwatchesGrid || this.state.mode !== 'mosaic') return;
    const grid = this.state.mosaicGrid;
    let palette = [];

    if (this.state.mosaic.palette !== 'original-rgb' && PRESET_PALETTES[this.state.mosaic.palette]) {
      palette = PRESET_PALETTES[this.state.mosaic.palette].colors;
    } else if (grid && grid.length > 0) {
      const colorMap = new Map();
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const cell = grid[r][c];
          if (cell && cell.occupied && !cell.isRemoved && cell.sample && cell.sample.a >= 10) {
            const key = `${cell.sample.r},${cell.sample.g},${cell.sample.b}`;
            if (!colorMap.has(key)) {
              colorMap.set(key, [cell.sample.r, cell.sample.g, cell.sample.b]);
            }
          }
        }
      }
      palette = Array.from(colorMap.values());
    }

    this.el.msPaletteSwatchesGrid.innerHTML = '';
    if (this.el.msPaletteColorCount) {
      this.el.msPaletteColorCount.textContent = `${palette.length} colors`;
    }

    if (palette.length === 0) return;

    palette.forEach((color, idx) => {
      const hex = rgbToHex(color[0], color[1], color[2]);
      const swatch = document.createElement('div');
      const isActive = this.state.activeColor &&
        this.state.activeColor[0] === color[0] &&
        this.state.activeColor[1] === color[1] &&
        this.state.activeColor[2] === color[2];
      swatch.className = `palette-swatch ${isActive ? 'active' : ''}`;
      swatch.style.backgroundColor = hex;
      swatch.title = `Color #${idx + 1}: ${hex}`;

      swatch.addEventListener('click', () => {
        this.state.activeColor = [...color];
        if (this.el.editorColorInput) this.el.editorColorInput.value = hex;
        if (this.el.editorColorSwatch) this.el.editorColorSwatch.style.backgroundColor = hex;
        this.el.msPaletteSwatchesGrid.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });

      this.el.msPaletteSwatchesGrid.appendChild(swatch);
    });
  }

  // Pure helper for the "Real Colors Detected" row: caps visible swatches and
  // computes the "+M more" overflow count. DOM-free so it is unit-testable.
  renderRealColorsSwatches(truePalette) {
    if (!this.el.msRealColorsRow || this.state.mode !== 'mosaic') return;
    const { swatches, moreCount, total } = buildRealColorsSwatchData(truePalette);
    const row = this.el.msRealColorsRow;
    row.innerHTML = '';
    if (this.el.msRealColorsCount) {
      this.el.msRealColorsCount.textContent = total > 0 ? `${total}` : '…';
    }
    swatches.forEach((hex, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'real-color-swatch';
      swatch.style.backgroundColor = hex;
      swatch.title = `Real color #${idx + 1}: ${hex}`;
      row.appendChild(swatch);
    });
    if (moreCount > 0) {
      const more = document.createElement('span');
      more.className = 'real-colors-more';
      more.textContent = `+${moreCount} more`;
      row.appendChild(more);
    }
  }

  handleUndo() {
    const prevState = this.history.undo(this.state.pixelGrid);
    if (prevState) {
      this.state.pixelGrid = prevState;
      this.renderPixelArt();
      this.showToast('Undo');
    }
  }

  handleRedo() {
    const nextState = this.history.redo(this.state.pixelGrid);
    if (nextState) {
      this.state.pixelGrid = nextState;
      this.renderPixelArt();
      this.showToast('Redo');
    }
  }

  setMode(mode) {
    this.state.mode = mode;

    this.el.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    document.querySelectorAll('.engine-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`panel-${mode}`);
    if (panel) panel.style.display = 'block';

    if (this.el.pixelToolbar) {
      this.el.pixelToolbar.style.display = (mode === 'pixel-art' || mode === 'mosaic') ? 'flex' : 'none';
    }

    this.toggleMosaicEyedropper(false);
    // Mode switches change canvas content/dimensions — re-fit once rendered
    // instead of carrying the previous mode's zoom level over.
    this.state.pendingFitToScreen = true;
    this.reprocess();
  }

  syncMosaicBgModeButtons() {
    const totalCount = (this.state.mosaic.outsideBgRemovalColors?.length || 0) + (this.state.mosaic.insideBgRemovalColors?.length || 0);
    const outside = this.state.mosaic.outsideBgRemovalColors || [];

    let activeMode = this.state.mosaic.bgRemovalMode;
    if (totalCount === 0) {
      activeMode = 'none';
    } else if (outside.length === 1 && outside[0].toLowerCase() === '#ffffff') {
      activeMode = 'white';
    } else if (outside.length === 1 && outside[0].toLowerCase() === '#000000') {
      activeMode = 'black';
    } else if (totalCount > 0) {
      activeMode = 'custom';
    }

    this.state.mosaic.bgRemovalMode = activeMode;
    this.el.msBgModeButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === activeMode);
    });
  }

  setMosaicBgRemovalMode(mode, triggerRender = true) {
    this.state.mosaic.bgRemovalMode = mode;
    this.state.mosaic.isAddingColor = false;

    if (mode === 'none') {
      this.state.mosaic.outsideBgRemovalColors = [];
      this.state.mosaic.insideBgRemovalColors = [];
      this.state.mosaic.bgRemovalColors = [];
    } else if (mode === 'white') {
      this.setActiveScopeColors(['#ffffff']);
    } else if (mode === 'black') {
      this.setActiveScopeColors(['#000000']);
    } else if (mode === 'custom') {
      const active = this.getActiveScopeColors();
      if (!active || active.length === 0) {
        this.toggleMosaicEyedropper(true);
      }
    }

    if (mode !== 'custom') {
      this.toggleMosaicEyedropper(false);
    }

    this.syncMosaicBgModeButtons();
    this.renderMosaicActiveColors();

    if (triggerRender) {
      this.renderCurrentEngine();
    }
  }

  setMosaicInputMode(mode, triggerRender = true) {
    if (mode !== 'photo' && mode !== 'pixel-art') return;

    this.state.mosaic.inputMode = mode;
    this.state.mosaic.sourceArtType = (mode === 'photo') ? 'normal' : 'already-pixel-art';
    this.state.mosaic.cleanEdgePurifier = false;
    this.state.mosaic.cleanEdgeScope = 'off';
    // Edge Cleaner defaults OFF per the user's explicit request ("Keep default
    // Off") — the user enables it manually from the sidebar.
    this.state.mosaic.edgeFringeCleanup = false;
    this.state.mosaic.edgeCleanerEnabled = false;

    if (this.el.msCleanEdgeStatus) {
      this.el.msCleanEdgeStatus.textContent = 'Off';
    }
    if (this.el.msEdgeCleanerToggle) {
      this.el.msEdgeCleanerToggle.checked = false; // default OFF per user
    }

    if (this.el.msSourceArtTypeSelect) {
      this.el.msSourceArtTypeSelect.value = this.state.mosaic.sourceArtType;
    }

    this.el.msInputModeButtons?.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-input-mode') === mode);
    });

    const isPixelArt = mode === 'pixel-art' || (mode === 'auto' && this.state.mosaic.detectedMode === 'pixel-art');
    this.updateMosaicModeUI(mode, isPixelArt ? 'pixel-art' : 'photo');

    if (triggerRender) {
      this.renderCurrentEngine();
    }

    if (mode === 'pixel-art') {
      this.showToast('Already Pixel Art: Pure 1:1 cell & vector conversion active (Zero Loss)');
    } else if (mode === 'photo') {
      this.showToast('Normal Image: Continuous shading & creative generation active');
    } else {
      this.showToast('Auto-Detect Mode: Classifying image input type...');
    }
  }

  updateMosaicModeUI(inputMode, activePathway) {
    const isPixelArt = activePathway === 'pixel-art' || (inputMode === 'pixel-art');

    if (this.el.msCleanEdgeSection) this.el.msCleanEdgeSection.style.display = '';
    if (this.el.msCleanEdgeToggle) this.el.msCleanEdgeToggle.checked = !!this.state.mosaic.cleanEdgePurifier;
    if (this.el.msCleanEdgeResetBtn) this.el.msCleanEdgeResetBtn.disabled = !this.state.mosaic.cleanEdgePurifier;
    if (this.el.msColorRestoreToggle) this.el.msColorRestoreToggle.checked = !!this.state.mosaic.colorRestoreEnabled;
    if (this.el.msEdgeCleanerToggle) this.el.msEdgeCleanerToggle.checked = !!this.state.mosaic.edgeCleanerEnabled;
    if (this.el.msEdgeCleanerStrengthSlider) this.el.msEdgeCleanerStrengthSlider.value = this.state.mosaic.edgeCleanerStrength;
    if (this.el.msEdgeCleanerStrengthVal) this.el.msEdgeCleanerStrengthVal.textContent = `${this.state.mosaic.edgeCleanerStrength}%`;
    if (this.el.msEdgeCleanerDarkShadingToggle) this.el.msEdgeCleanerDarkShadingToggle.checked = !!this.state.mosaic.edgeCleanerDarkShading;
    if (this.el.msColorRestoreTolSlider) this.el.msColorRestoreTolSlider.value = this.state.mosaic.colorRestoreTolerance;
    if (this.el.msColorRestoreTolVal) this.el.msColorRestoreTolVal.textContent = `${this.state.mosaic.colorRestoreTolerance}`;

    if (this.el.msZeroLossBanner) {
      this.el.msZeroLossBanner.style.display = isPixelArt ? 'block' : 'none';
    }
    if (this.el.msJpegNoticeBanner) {
      const isJpeg = typeof this.state.sourceFileName === 'string' && /\.(jpe?g)$/i.test(this.state.sourceFileName);
      this.el.msJpegNoticeBanner.style.display = (isPixelArt && isJpeg) ? 'block' : 'none';
    }
    if (this.el.msStrategySection) {
      this.el.msStrategySection.style.display = isPixelArt ? 'none' : 'block';
    }
    if (this.el.msSamplingGroup) {
      this.el.msSamplingGroup.style.display = isPixelArt ? 'none' : 'block';
    }
    if (this.el.msColorPaletteSection) {
      this.el.msColorPaletteSection.style.display = isPixelArt ? 'none' : 'block';
    }
    if (this.el.msTrimSection) {
      this.el.msTrimSection.style.display = isPixelArt ? 'none' : 'block';
    }

    // In Already Pixel Art mode the sampling grid is auto-detected from the
    // source (Pathway B detected-grid fix). Show the Auto/Manual tile-mode
    // dropdown instead of the fixed preset+slider (Normal Image controls).
    // Manual sizes use the forceTileSize escape hatch (legacy fixed-grid).
    if (this.el.msSizePresetSelect) {
      this.el.msSizePresetSelect.style.display = isPixelArt ? 'none' : '';
      this.el.msSizePresetSelect.disabled = false;
      this.el.msSizePresetSelect.title = '';
    }
    if (this.el.msSizeSlider) {
      this.el.msSizeSlider.style.display = isPixelArt ? 'none' : '';
      this.el.msSizeSlider.disabled = false;
      this.el.msSizeSlider.title = '';
    }
    if (this.el.msPixelArtTileModeSelect) {
      this.el.msPixelArtTileModeSelect.style.display = isPixelArt ? '' : 'none';
      this.el.msPixelArtTileModeSelect.value = this.state.mosaic.forceTileSize > 0
        ? String(this.state.mosaic.forceTileSize) : 'auto';
    }
    if (this.el.msTileSizeGroup) {
      this.el.msTileSizeGroup.style.opacity = '';
      this.el.msTileSizeGroup.title = isPixelArt
        ? 'Auto detects the image\'s true pixel grid. Manual uses a fixed grid (legacy behavior).'
        : '';
    }

    // Color Restore runs in the Already Pixel Art pathway only — hide the
    // section in Normal Image mode so the toggle is never a dead control.
    if (this.el.msColorRestoreSection) {
      this.el.msColorRestoreSection.style.display = isPixelArt ? '' : 'none';
    }

    // Edge Cleaner runs in the Already Pixel Art pathway only — same scoping.
    if (this.el.msEdgeCleanerSection) {
      this.el.msEdgeCleanerSection.style.display = isPixelArt ? '' : 'none';
    }

    if (this.el.msSourceModeBadge) {
      if (isPixelArt) {
        this.el.msSourceModeBadge.textContent = '🎨 Already Pixel Art';
        this.el.msSourceModeBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        this.el.msSourceModeBadge.style.color = 'var(--accent-emerald)';
      } else {
        this.el.msSourceModeBadge.textContent = '📷 Normal Image';
        this.el.msSourceModeBadge.style.background = 'rgba(59, 130, 246, 0.2)';
        this.el.msSourceModeBadge.style.color = 'var(--accent-primary)';
      }
    }
  }

  renderMosaicActiveColors() {
    if (!this.el.msActiveColorsList || !this.el.msActiveColorsSection) return;

    const colors = this.getActiveScopeColors();
    const totalActiveCount = (this.state.mosaic.outsideBgRemovalColors?.length || 0) + (this.state.mosaic.insideBgRemovalColors?.length || 0);
    const isNone = this.state.mosaic.bgRemovalMode === 'none' && totalActiveCount === 0;

    this.el.msActiveColorsSection.style.display = isNone ? 'none' : 'block';
    this.el.msActiveColorsList.innerHTML = '';

    colors.forEach((hex, idx) => {
      const chip = document.createElement('div');
      chip.className = 'color-chip';
      chip.innerHTML = `
        <span class="color-chip-dot" style="background-color: ${hex};"></span>
        <span>${hex.toUpperCase()}</span>
        <button type="button" class="chip-remove-btn" title="Remove this color">✕</button>
      `;
      chip.querySelector('.chip-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeMosaicBgColor(idx);
      });
      this.el.msActiveColorsList.appendChild(chip);
    });

    if (this.el.msBgStatusBadge) {
      if (colors.length === 0) this.el.msBgStatusBadge.textContent = 'None';
      else if (colors.length === 1 && colors[0].toLowerCase() === '#ffffff') this.el.msBgStatusBadge.textContent = 'White';
      else if (colors.length === 1 && colors[0].toLowerCase() === '#000000') this.el.msBgStatusBadge.textContent = 'Black';
      else if (colors.length === 1) this.el.msBgStatusBadge.textContent = 'Color';
      else this.el.msBgStatusBadge.textContent = `${colors.length} Colors`;
    }
  }

  removeMosaicBgColor(index) {
    const current = [...this.getActiveScopeColors()];
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      this.setActiveScopeColors(current);
      const totalActiveCount = (this.state.mosaic.outsideBgRemovalColors?.length || 0) + (this.state.mosaic.insideBgRemovalColors?.length || 0);
      if (totalActiveCount === 0) {
        this.state.mosaic.bgRemovalMode = 'none';
      }
      this.syncMosaicBgModeButtons();
      this.renderMosaicDocColors();
      this.renderMosaicActiveColors();
      this.renderCurrentEngine();
    }
  }



  togglePanTool(forceState) {
    const next = forceState !== undefined ? forceState : !this.state.isPanToolActive;
    this.state.isPanToolActive = next;
    if (this.el.panToolBtn) {
      this.el.panToolBtn.classList.toggle('active', next);
    }
    this.el.viewport.style.cursor = next ? 'grab' : 'default';
    this.showToast(next ? 'Pan Tool Active (Drag canvas)' : 'Pan Tool Deactivated');
  }

  setMosaicTolerance(val, syncSlider = true, _syncInput = true, triggerRender = true) {
    const parsed = parseInt(val, 10);
    const clamped = Math.max(0, Math.min(100, Number.isNaN(parsed) ? 0 : parsed));
    this.state.mosaic.colorTolerance = clamped;

    if (syncSlider && this.el.msToleranceSlider) {
      this.el.msToleranceSlider.value = clamped;
    }
    if (this.el.msToleranceVal) {
      this.el.msToleranceVal.textContent = `${clamped}%`;
    }

    // Highlight matching preset pill
    this.el.msTolerancePresets?.forEach(btn => {
      const tol = parseInt(btn.getAttribute('data-tol'), 10);
      btn.classList.toggle('active', tol === clamped);
    });

    if (triggerRender) {
      this.renderCurrentEngine();
    }
  }



  setMosaicCleanEdgePurifier(enabled) {
    this.state.mosaic.cleanEdgePurifier = enabled;
    this.state.mosaic.cleanEdgeScope = enabled ? 'outer' : 'off';
    this.updateMosaicModeUI(this.state.mosaic.inputMode, this.state.mosaic.inputMode);
    if (this.el.msCleanEdgeStatus) this.el.msCleanEdgeStatus.textContent = enabled ? 'Ready' : 'Off';
    this.renderCurrentEngine();
  }

  setMosaicColorRestore(enabled) {
    this.state.mosaic.colorRestoreEnabled = enabled;
    if (this.el.msColorRestoreStatus) this.el.msColorRestoreStatus.textContent = enabled ? 'Ready' : 'Off';
    this.renderCurrentEngine();
  }

  setMosaicEdgeCleaner(enabled) {
    this.state.mosaic.edgeCleanerEnabled = enabled;
    if (this.el.msEdgeCleanerStatus) this.el.msEdgeCleanerStatus.textContent = enabled ? 'Ready' : 'Off';
    this.renderCurrentEngine();
  }

  triggerAutoClean() {
    this.state.mosaic.cleanupEnabled = true;
    this.state.mosaic.autoClean = true;
    this.showToast('Auto Clean artwork pass executed');
    this.renderCurrentEngine();
  }

  triggerAnalyzeEdges() {
    this.state.mosaic.cleanupEnabled = true;
    this.showToast('Edge-by-edge boundary analysis executed across all individual designs');
    this.renderCurrentEngine();
  }

  setMosaicManualTool(tool) {
    this.state.mosaic.manualTool = tool;
    const tools = [
      { id: 'msManualRemoveBtn', tool: 'remove' },
      { id: 'msManualRestoreBtn', tool: 'restore' },
      { id: 'msManualProtectBtn', tool: 'protect' }
    ];

    tools.forEach(item => {
      if (this.el[item.id]) {
        this.el[item.id].classList.toggle('active', !!tool && item.tool === tool);
      }
    });

    if (tool) {
      this.showToast(`Manual tool active: ${tool.toUpperCase()}`);
    }
  }

  resetMosaicAll() {
    // 1. Reset background removal colors, modes, tolerance, and filters
    this.state.mosaic.bgRemovalColors = [];
    this.state.mosaic.outsideBgRemovalColors = [];
    this.state.mosaic.insideBgRemovalColors = [];
    this.state.mosaic.isAddingColor = false;
    this.state.mosaic.colorTolerance = 0;
    this.state.mosaic.snapEdgeColors = false;
    this.state.mosaic.perfectCorners = false;
    this.state.mosaic.restoreEdgeColors = false;
    this.state.mosaic.deFringe = false;
    this.state.mosaic.edgeTrim = 0;
    this.state.mosaic.cleanEdgePurifier = false;
    this.state.mosaic.cleanEdgeScope = 'off';
    this.state.mosaic.colorRestoreEnabled = true;
    this.state.mosaic.colorRestoreTolerance = 12;
    this.state.mosaic.edgeFringeCleanup = false;
    this.state.mosaic.edgeCleanerEnabled = false;
    this.state.mosaic.edgeCleanerStrength = 25;
    this.state.mosaic.edgeCleanerDarkShading = false;
    this.state.mosaic.forceTileSize = 0;
    if (this.el.msColorRestoreToggle) this.el.msColorRestoreToggle.checked = true;
    if (this.el.msEdgeCleanerToggle) this.el.msEdgeCleanerToggle.checked = false;
    if (this.el.msEdgeCleanerDarkShadingToggle) this.el.msEdgeCleanerDarkShadingToggle.checked = false;
    if (this.el.msEdgeCleanerStrengthSlider) this.el.msEdgeCleanerStrengthSlider.value = 25;
    if (this.el.msEdgeCleanerStrengthVal) this.el.msEdgeCleanerStrengthVal.textContent = '25%';
    if (this.el.msEdgeCleanerStatus) this.el.msEdgeCleanerStatus.textContent = 'Off';
    if (this.el.msColorRestoreTolSlider) this.el.msColorRestoreTolSlider.value = 12;
    if (this.el.msColorRestoreTolVal) this.el.msColorRestoreTolVal.textContent = '12';
    if (this.el.msColorRestoreStatus) this.el.msColorRestoreStatus.textContent = 'Off';
    this.renderRealColorsSwatches([]);
    if (this.el.msPixelArtTileModeSelect) this.el.msPixelArtTileModeSelect.value = 'auto';
    this.setMosaicBgRemovalMode('none', false);
    this.toggleMosaicEyedropper(false);

    // 2. Reset pixel cleanup state, manual tools, and sensitivity sliders
    this.state.mosaic.manualOverrides = {};
    this.state.mosaic.protectedIds.clear();
    this.state.mosaic.manualRemoveIds.clear();
    this.state.mosaic.manualRestoreIds.clear();
    this.state.mosaic.autoClean = true;
    this.state.mosaic.noiseThreshold = 20;
    this.state.mosaic.edgeSensitivity = 20;
    this.state.mosaic.fitDocumentToDesign = true;
    if (this.el.msFitDocumentToggle) this.el.msFitDocumentToggle.checked = true;
    this.state.mosaic.qualityChecks = {
      outside: true,
      edges: true,
      noise: true,
      protection: true,
      zeroColorLoss: true,
      gridAlignment: true,
      designBoundaries: true
    };

    if (this.el.msNoiseSlider) this.el.msNoiseSlider.value = 20;
    if (this.el.msNoiseVal) this.el.msNoiseVal.textContent = '20%';
    if (this.el.msEdgeSensitivitySlider) this.el.msEdgeSensitivitySlider.value = 20;
    if (this.el.msEdgeSensitivityVal) this.el.msEdgeSensitivityVal.textContent = '20%';

    this.renderCurrentEngine();
    this.showToast('All Mosaic colors, filters & pixel cleanup state reset');
  }

  updateMosaicVerificationUI(report) {
    if (!report) return;

    if (this.el.msVerificationBadge) {
      this.el.msVerificationBadge.textContent = report.statusText;
      this.el.msVerificationBadge.classList.toggle('status-clean', report.is100PercentClean);
    }

    const { checks } = report;
    const qualityChecks = this.state.mosaic?.qualityChecks || {};

    const renderCheckItem = (el, val, key) => {
      if (!el) return;
      const parent = el.closest('.quality-check-item');
      const isEnabled = qualityChecks[key] !== false;

      if (!isEnabled || val === 'disabled') {
        el.textContent = '✕';
        el.className = 'check-icon disabled';
        if (parent) parent.classList.add('disabled');
      } else if (val === true) {
        el.textContent = '✓';
        el.className = 'check-icon pass';
        if (parent) parent.classList.remove('disabled');
      } else {
        el.textContent = '⚠';
        el.className = 'check-icon warn';
        if (parent) parent.classList.remove('disabled');
      }
    };

    renderCheckItem(this.el.msCheckOutside, checks.outside, 'outside');
    renderCheckItem(this.el.msCheckEdges, checks.edges, 'edges');
    renderCheckItem(this.el.msCheckNoise, checks.noise, 'noise');
    renderCheckItem(this.el.msCheckProtection, checks.protection, 'protection');
    renderCheckItem(this.el.msCheckZeroColorLoss, checks.zeroColorLoss, 'zeroColorLoss');
    renderCheckItem(this.el.msCheckGridAlignment, checks.gridAlignment, 'gridAlignment');
    renderCheckItem(this.el.msCheckDesignBoundaries, checks.designBoundaries, 'designBoundaries');
  }

  resetMosaicBgRemoval() {
    this.state.mosaic.manualOverrides = {};
    this.state.mosaic.bgRemovalColors = [];
    this.state.mosaic.outsideBgRemovalColors = [];
    this.state.mosaic.insideBgRemovalColors = [];
    this.state.mosaic.isAddingColor = false;
    this.state.mosaic.colorTolerance = 0;
    this.state.mosaic.snapEdgeColors = false;
    this.state.mosaic.perfectCorners = false;
    this.state.mosaic.restoreEdgeColors = false;
    this.state.mosaic.deFringe = false;
    this.state.mosaic.edgeTrim = 0;

    this.setMosaicBgRemovalMode('none', false);
    this.toggleMosaicEyedropper(false);

    this.renderCurrentEngine();
    this.showToast('All original Mosaic colors & filters restored');
  }

  toggleMosaicEyedropper(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.state.mosaic.isPickingColor;
    this.state.mosaic.isPickingColor = nextState;

    if (this.el.canvasContainer) {
      this.el.canvasContainer.classList.toggle('picking-color', nextState);
    }

    if (nextState) {
      this.showToast('Click anywhere on the image to sample removal color');
    }
  }

  openSafeCheckModal() {
    if (!this.el.safeCheckModal) return;

    const width = this.state.documentWidth || 3840;
    const height = this.state.documentHeight || 2160;
    const mode = this.state.mode;
    const tileSize = mode === 'mosaic' ? this.getMosaicToolCellSize() : 10;
    const svgMode = this.el.svgModeSelect ? this.el.svgModeSelect.value : 'editable';
    const format = this.el.exportFormatSelect ? this.el.exportFormatSelect.value : 'svg';

    let activeCellCount = 0;
    if (mode === 'pixel-art' && this.state.pixelGrid) {
      for (let y = 0; y < this.state.pixelGrid.height; y++) {
        for (let x = 0; x < this.state.pixelGrid.width; x++) {
          const p = this.state.pixelGrid.getPixel(x, y);
          if (p && p.a >= 10) activeCellCount++;
        }
      }
    }

    const report = MarketplaceSafeCheck.inspect({
      metadata: {
        title: 'Pixel Vector Artwork',
        tags: 'pixel art, mosaic, vector, stars, geometric',
        author: 'Contributor',
        hasVisibleWatermark: false
      },
      width,
      height,
      mode,
      tileSize,
      svgMode,
      format,
      activeCellCount
    });

    if (this.el.safeCheckResults) {
      let html = '';

      // Technical Adobe Stock Readiness Checklist
      if (report.technicalChecks && report.technicalChecks.length > 0) {
        html += '<div style="margin-bottom: 12px; font-weight: 700; font-size: 13px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">📋 Adobe Stock Technical Audit</div>';
        for (const tc of report.technicalChecks) {
          const color = tc.passed ? 'var(--accent-emerald, #10b981)' : 'var(--accent-danger, #ef4444)';
          const icon = tc.passed ? '✓' : '⚠️';
          html += `
            <div style="margin-bottom: 8px; font-size: 12px;">
              <div style="color: ${color}; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <span>${icon}</span> <span>${tc.label}</span>
              </div>
              <div style="color: var(--text-secondary); margin-left: 18px; font-size: 11px;">${tc.detail}</div>
            </div>
          `;
        }
      }

      // Findings & Warnings
      if (report.findings && report.findings.length > 0) {
        html += '<div style="margin-top: 14px; margin-bottom: 8px; font-weight: 700; font-size: 13px; color: var(--text-primary);">⚠️ Marketplace Risk Findings</div>';
        for (const f of report.findings) {
          const badgeCol = f.severity === 'danger' ? '#ef4444' : '#f59e0b';
          html += `
            <div style="padding: 8px 10px; background: rgba(239,68,68,0.1); border-left: 3px solid ${badgeCol}; border-radius: 4px; margin-bottom: 6px; font-size: 12px; color: var(--text-primary);">
              <span style="font-weight: 700; color: ${badgeCol}; text-transform: uppercase; font-size: 10px;">[${f.category}]</span> ${f.message}
            </div>
          `;
        }
      } else {
        html += `
          <div style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; font-size: 12px; color: #a7f3d0;">
            🎉 <strong>100% Adobe Stock Safe!</strong> Zero trademarks, zero raster embeddings, compliant 4K resolution, and clean 1-click ungroup structure.
          </div>
        `;
      }

      this.el.safeCheckResults.innerHTML = html;
    }

    this.el.safeCheckModal.classList.add('open');
  }

  executeExport() {
    const format = this.el.exportFormatSelect.value;
    const transparent = format !== 'jpeg' && this.el.exportTransparentBg.checked;
    const bgColor = transparent ? null : (this.state.bgColor || '#ffffff');
    const targetWidth = this.state.documentWidth || 1024;
    const targetHeight = this.state.documentHeight || 576;

    if (format === 'svg') {
      let svg = '';
      const svgMode = this.el.svgModeSelect.value;

      if (this.state.mode === 'pixel-art' && this.state.pixelGrid) {
        svg = SvgExporter.exportPixelArt(this.state.pixelGrid, {
          mode: svgMode,
          transparentBg: transparent,
          bgColor,
          targetWidth,
          targetHeight
        });
      } else if (this.state.mode === 'halftone') {
        const res = HalftoneEngine.process(this.state.croppedImageData, this.state.halftone);
        svg = SvgExporter.exportHalftone(res, { transparentBg: transparent, bgColor });
      } else if (this.state.mode === 'random-flow') {
        const res = RandomFlowEngine.process(this.state.croppedImageData, this.state.randomFlow);
        svg = SvgExporter.exportRandomFlow(res, { transparentBg: transparent, bgColor });
      } else if (this.state.mode === 'mosaic') {
        const res = MosaicEngine.process(this.state.croppedImageData, this.getMosaicRenderOptions());
        svg = MosaicEngine.exportSVG(res, {
          mode: svgMode,
          transparentBg: transparent,
          bgColor,
          includeOutline: this.state.mosaic.outlineMode !== 'none',
          outlineColor: this.state.mosaic.outlineColor,
          outlineWidth: this.state.mosaic.outlineWidth
        });
      }

      PngExporter.downloadFile(svg, `pixel-studio-${this.state.mode}-${Date.now()}.svg`, 'image/svg+xml');
      this.showToast('Downloaded True Vector SVG');
    } else {
      const scale = parseInt(this.el.pngScaleSelect ? this.el.pngScaleSelect.value : 1, 10);
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';

      if (this.state.mode === 'pixel-art' && this.state.pixelGrid) {
        PngExporter.exportPixelArtToBlob(this.state.pixelGrid, {
          scale,
          transparentBg: transparent,
          bgColor,
          format: mimeType,
          targetWidth,
          targetHeight
        }).then(blob => {
          PngExporter.downloadFile(blob, `pixel-studio-${Date.now()}.${ext}`, mimeType);
          this.showToast(`Downloaded ${scale}× ${ext.toUpperCase()}`);
        });
      } else {
        PngExporter.exportCanvasToBlob(this.el.outputCanvas, { scale, transparentBg: transparent, bgColor, format: mimeType }).then(blob => {
          PngExporter.downloadFile(blob, `pixel-studio-${this.state.mode}-${Date.now()}.${ext}`, mimeType);
          this.showToast(`Downloaded ${ext.toUpperCase()}`);
        });
      }
    }
  }

  updateStockResolutionStatus() {
    if (!this.el.statusStockBadge) return;
    const w = this.state.documentWidth || 1024;
    const h = this.state.documentHeight || 576;
    const report = AutoFitStockEngine.getAuditReport({ width: w, height: h });

    this.el.statusStockBadge.textContent = report.badgeText;
    if (report.passed) {
      this.el.statusStockBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      this.el.statusStockBadge.style.color = '#10b981';
    } else {
      this.el.statusStockBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      this.el.statusStockBadge.style.color = '#f59e0b';
    }
  }

  updateDocumentDimensions(width, height) {
    this.docManager.setCustomSize(width, height);
    const dimensions = this.docManager.getDimensions();

    this.state.docPresetKey = 'custom';
    this.state.documentWidth = dimensions.width;
    this.state.documentHeight = dimensions.height;

    if (this.el.docPresetSelect) this.el.docPresetSelect.value = 'custom';
    if (this.el.customSizeRow) this.el.customSizeRow.style.display = 'grid';
    if (this.el.customWidthInput) this.el.customWidthInput.value = String(dimensions.width);
    if (this.el.customHeightInput) this.el.customHeightInput.value = String(dimensions.height);

    if (this.state.rawImage) {
      this.updateDocumentAndCrop();
    } else {
      if (this.el.docDimsBadge) this.el.docDimsBadge.textContent = `${dimensions.width} × ${dimensions.height}`;
      if (this.el.statusDocDims) this.el.statusDocDims.textContent = `${dimensions.width} × ${dimensions.height} px`;
    }

    return dimensions;
  }

  applyAutoFitStock() {
    const w = this.state.documentWidth || 1024;
    const h = this.state.documentHeight || 576;
    const fit = AutoFitStockEngine.calculateStockScale(w, h);

    if (fit.dimensionLimited && !fit.isCompliant) {
      this.showToast(`Auto-Fit cannot reach 4.0 MP without exceeding the ${AutoFitStockEngine.MAX_DOCUMENT_DIMENSION}px document limit`);
      return;
    }

    if (fit.scaleMultiplier <= 1.0) {
      this.showToast(`Resolution already compliant (${fit.originalMP} MP $\\ge 4.0$ MP minimum)`);
      return;
    }

    // Set PNG scale select to closest integer scale or auto-upscale document dimensions
    if (this.el.pngScaleSelect) {
      const targetScale = Math.min(8, Math.max(2, Math.ceil(fit.scaleMultiplier)));
      this.el.pngScaleSelect.value = String(targetScale);
    }

    // Apply aspect-ratio locked target dimensions to document manager
    const dimensions = this.updateDocumentDimensions(fit.targetWidth, fit.targetHeight);
    this.updateStockResolutionStatus();

    const appliedMP = Number(((dimensions.width * dimensions.height) / 1000000).toFixed(2));
    this.showToast(`📐 Auto-Fit Applied: Scaled to ${dimensions.width}×${dimensions.height} (${appliedMP} MP) — 100% aspect ratio locked!`);
  }
}

// Initialize Application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
