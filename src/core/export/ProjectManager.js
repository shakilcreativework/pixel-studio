/**
 * ProjectManager.js
 * Serializes and restores full project workspaces in .pixelart JSON format,
 * preserving document dimensions, background settings, and active mode states.
 */

import { PixelGrid } from '../pixel-art/PixelGrid.js';
import { PngExporter } from './PngExporter.js';

export class ProjectManager {
  static saveProject(state) {
    const projectData = {
      format: 'PIXEL_ART_PROJECT',
      version: 2,
      timestamp: new Date().toISOString(),
      mode: state.mode,
      document: {
        presetKey: state.docPresetKey || 'original',
        width: state.documentWidth,
        height: state.documentHeight,
        aspectRatio: state.cropPreset
      },
      background: {
        transparent: state.transparentBg !== false,
        color: state.bgColor || '#ffffff'
      },
      crop: state.cropPreset,
      pixelArt: state.pixelGrid ? state.pixelGrid.toJSON() : null,
      settings: {
        pixelResolution: state.pixelResolution,
        samplingMethod: state.samplingMethod,
        colorMode: state.colorMode,
        paletteSize: state.paletteSize,
        presetKey: state.presetKey,
        dithering: state.dithering,
        ditheringStrength: state.ditheringStrength,
        colorSpace: state.colorSpace,
        preserveAlpha: state.preserveAlpha,
        halftone: state.halftone,
        lineArt: state.lineArt,
        randomFlow: state.randomFlow,
        camoMesh: state.camoMesh,
        mosaic: state.mosaic
      }
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    PngExporter.downloadFile(jsonString, `pixel-studio-${state.mode}-${Date.now()}.pixelart`, 'application/json');
  }

  static loadProject(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.format !== 'PIXEL_ART_PROJECT') {
            throw new Error('Invalid project file format');
          }

          let grid = null;
          if (data.pixelArt) {
            grid = PixelGrid.fromJSON(data.pixelArt);
          }

          resolve({
            data,
            grid
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read project file'));
      reader.readAsText(file);
    });
  }
}
