/**
 * PixelArtWorker.js
 * Dedicated Web Worker for off-thread heavy sampling, quantization, and dithering.
 */

import { PixelArtEngine } from './PixelArtEngine.js';

self.onmessage = function (e) {
  const { jobId, imageData, options } = e.data;

  try {
    const grid = PixelArtEngine.process(imageData, options);
    self.postMessage({
      jobId,
      success: true,
      result: grid.toJSON()
    });
  } catch (error) {
    self.postMessage({
      jobId,
      success: false,
      error: error.message || 'Worker processing failed'
    });
  }
};
