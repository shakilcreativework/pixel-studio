import { describe, it, expect } from 'vitest';
import { DocumentColorExtractor } from '../src/core/mosaic/DocumentColorExtractor.js';

describe('DocumentColorExtractor', () => {
  it('correctly calculates perceived luminance according to ITU-R BT.709', () => {
    const blackL = DocumentColorExtractor.getLuminance(0, 0, 0);
    const whiteL = DocumentColorExtractor.getLuminance(255, 255, 255);
    const redL = DocumentColorExtractor.getLuminance(255, 0, 0);
    const greenL = DocumentColorExtractor.getLuminance(0, 255, 0);
    const blueL = DocumentColorExtractor.getLuminance(0, 0, 255);

    expect(blackL).toBe(0);
    expect(whiteL).toBe(1);
    expect(greenL).toBeGreaterThan(redL); // Green has higher perceived luminance than red
    expect(redL).toBeGreaterThan(blueL);  // Red has higher perceived luminance than blue
  });

  it('extracts unique colors sorted from dark to light', () => {
    // 4x4 image with black, dark grey, bright yellow, and white
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    // Pixel 0: Black #000000
    data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 255;
    // Pixel 1: Dark noise #010101
    data[4] = 1; data[5] = 1; data[6] = 1; data[7] = 255;
    // Pixel 2: Bright Yellow #facc15
    data[8] = 250; data[9] = 204; data[10] = 21; data[11] = 255;
    // Pixel 3: White #ffffff
    data[12] = 255; data[13] = 255; data[14] = 255; data[15] = 255;

    // Remaining pixels: Black
    for (let i = 16; i < data.length; i += 4) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
    }

    const img = { data, width, height };
    const colors = DocumentColorExtractor.extractColors(img, { sortBy: 'dark-to-light' });

    expect(colors.length).toBe(4);
    // Darkest first
    expect(colors[0].hex).toBe('#000000');
    expect(colors[1].hex).toBe('#010101');
    // Lightest last
    expect(colors[colors.length - 1].hex).toBe('#ffffff');

    // Luminance must be monotonically non-decreasing
    for (let i = 1; i < colors.length; i++) {
      expect(colors[i].luminance).toBeGreaterThanOrEqual(colors[i - 1].luminance);
    }
  });

  it('intelligently detects multi-shade background clusters from image borders', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    // Border has mix of #000000, #010101, #000001
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          // Border
          if ((x + y) % 3 === 0) {
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255; // #000000
          } else if ((x + y) % 3 === 1) {
            data[idx] = 1; data[idx + 1] = 1; data[idx + 2] = 1; data[idx + 3] = 255; // #010101
          } else {
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 1; data[idx + 3] = 255; // #000001
          }
        } else {
          // Foreground star in center
          data[idx] = 255; data[idx + 1] = 215; data[idx + 2] = 0; data[idx + 3] = 255; // gold
        }
      }
    }

    const img = { data, width, height };
    const bgCluster = DocumentColorExtractor.detectBackgroundColorCluster(img, 1);

    expect(bgCluster).toContain('#000000');
    expect(bgCluster).toContain('#010101');
    expect(bgCluster).toContain('#000001');
    expect(bgCluster).not.toContain('#ffd700'); // Foreground gold should NOT be in background cluster
  });
});
