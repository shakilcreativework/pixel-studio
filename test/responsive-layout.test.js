import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Layout & Markup Audit', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const cssPath = path.resolve(__dirname, '../src/styles/index.css');
  const mainPath = path.resolve(__dirname, '../src/main.js');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const main = fs.readFileSync(mainPath, 'utf-8');

  it('includes mobile-friendly viewport meta tag', () => {
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0');
  });

  it('contains responsive drawer toggle button with accessible aria-label', () => {
    expect(html).toContain('id="sidebarToggleBtn"');
    expect(html).toContain('aria-label="Toggle Controls Sidebar"');
    expect(html).toContain('id="sidebarCloseBtn"');
    expect(html).toContain('id="sidebarBackdrop"');
  });

  it('contains overflow menu container and secondary actions for tablet/mobile', () => {
    expect(html).toContain('id="overflowMenuContainer"');
    expect(html).toContain('id="overflowMenuBtn"');
    expect(html).toContain('id="overflowDropdown"');
    expect(html).toContain('id="overflowSafeCheckBtn"');
    expect(html).toContain('id="overflowSplitViewBtn"');
    expect(html).toContain('id="overflowSaveProjectBtn"');
    expect(html).toContain('id="overflowOpenProjectLabel"');
  });

  it('contains all 7 engine mode buttons with clean SVGs and scroll navigation', () => {
    const modes = ['pixel-art', 'halftone', 'line-art', 'random-flow', 'camo-mesh', 'mosaic', 'pencil'];
    modes.forEach(mode => {
      expect(html).toContain(`data-mode="${mode}"`);
    });
    expect(html).toContain('id="modeScrollPrev"');
    expect(html).toContain('id="modeScrollNext"');
  });

  it('contains modal close buttons with aria-labels', () => {
    expect(html).toContain('id="modalCloseXBtn"');
    expect(html).toContain('id="safeCheckCloseXBtn"');
  });

  it('defines responsive media queries in CSS for all major screen breakpoints', () => {
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('@media (max-width: 1480px)');
    expect(css).toContain('@media (max-width: 1280px)');
    expect(css).toContain('@media (max-width: 1023px)');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('@media (max-width: 379px)');
  });

  it('handles dynamic viewport height and touch actions without horizontal overflow', () => {
    expect(css).toContain('100dvh');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('touch-action: none');
  });

  it('contains streamlined Mosaic background removal options', () => {
    expect(html).toContain('id="msBgModeGroup"');
    expect(html).toContain('data-mode="white"');
    expect(html).toContain('data-mode="black"');
    expect(html).toContain('data-mode="custom"');
    expect(html).toContain('Remove White');
    expect(html).toContain('Remove Black');
    expect(html).toContain('Pick Color');
  });

  it('wires Auto-Fit to a concrete document-dimension update method', () => {
    expect(main).toContain('updateDocumentDimensions(width, height)');
    expect(main).toContain('this.docManager.setCustomSize(width, height)');
  });

  it('wires the visible Mosaic feature mode controls', () => {
    expect(html).toContain('id="msInputModePhotoBtn"');
    expect(html).toContain('id="msInputModePixelArtBtn"');
    expect(main).toContain("document.querySelectorAll('#msInputModeGroup .filter-pill-btn')");
    expect(main.match(/msInputModeButtons\?\.forEach\(btn => \{\s*btn\.addEventListener\('click'/g)).toHaveLength(1);
    expect(main).toContain("btn.getAttribute('data-input-mode')");
    expect(main).toContain('this.setMosaicInputMode(mode)');
  });

  it('applies mode-specific Clean Edge Purifier defaults', () => {
    expect(html).toContain('id="msCleanEdgeStatus" aria-live="polite">Off</span>');
    expect(html).toMatch(/id="msCleanEdgeToggle" aria-label="Enable Clean Edge Purifier">/);
    expect(html).not.toMatch(/id="msCleanEdgeToggle"[^>]*\schecked(?:\s|>)/);
    expect(main).toContain('cleanEdgePurifier: false');
    expect(main).toContain("cleanEdgeScope: 'off'");
    expect(main).toContain("this.state.mosaic.cleanEdgePurifier = false;");
    expect(main).toContain("this.state.mosaic.cleanEdgeScope = 'off';");
    expect(main).not.toContain("this.state.mosaic.cleanEdgePurifier = mode === 'pixel-art'");
  });

  it('offers only the four approved Mosaic sampling methods', () => {
    const samplingSelect = html.match(/<select id="msSamplingSelect">([\s\S]*?)<\/select>/)?.[1] || '';
    expect(samplingSelect.match(/<option /g)).toHaveLength(4);
    expect(samplingSelect).toContain('value="perceptual-oklab"');
    expect(samplingSelect).toContain('value="contrast-aware"');
    expect(samplingSelect).toContain('value="gaussian-weighted"');
    expect(samplingSelect).toContain('value="average"');
    expect(samplingSelect).not.toMatch(/k-centroid|lanczos-windowed|median|dominant-mode|center-exact/);
  });

  it('keeps Mosaic eraser dragging on the frame-batched grid preview path', () => {
    expect(main).toContain('scheduleMosaicErasePreview()');
    expect(main).toContain('if (cell.isRemoved && !cell.occupied) return;');
    expect(main).toContain('if (this.state.mosaicEraseRenderFrame !== null) return;');
    expect(main).toContain('window.requestAnimationFrame');
    expect(main).toContain('this.state.mosaicErasePaletteDirty = true;');
  });

  it('keeps the Mosaic reset path free of stale controller calls', () => {
    expect(main).toContain('manualRestoreIds: new Set()');
    expect(main).not.toContain('toggleMosaicPaintEyedropper');
  });
});
