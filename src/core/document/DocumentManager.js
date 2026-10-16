/**
 * DocumentManager.js
 * Comprehensive document & artboard dimensions, aspect ratios, and preset catalog.
 */

export const DOCUMENT_PRESETS = {
  // Common Landscape
  'landscape-1024': { name: '1024 × 576 (16:9 Landscape)', width: 1024, height: 576, category: 'landscape' },
  'landscape-1280': { name: '1280 × 720 (HD 720p)', width: 1280, height: 720, category: 'landscape' },
  'landscape-1366': { name: '1366 × 768 (Laptop Standard)', width: 1366, height: 768, category: 'landscape' },
  'landscape-1536': { name: '1536 × 864 (QHD Lite)', width: 1536, height: 864, category: 'landscape' },
  'landscape-1920': { name: '1920 × 1080 (Full HD 1080p)', width: 1920, height: 1080, category: 'landscape' },
  'landscape-2560': { name: '2560 × 1440 (2K QHD)', width: 2560, height: 1440, category: 'landscape' },
  'landscape-3440': { name: '3440 × 1440 (UWQHD Ultra-Wide)', width: 3440, height: 1440, category: 'landscape' },
  'landscape-3840': { name: '3840 × 2160 (4K UHD)', width: 3840, height: 2160, category: 'landscape' },
  'landscape-4096': { name: '4096 × 2160 (Cinema 4K DCI)', width: 4096, height: 2160, category: 'landscape' },
  'landscape-5120': { name: '5120 × 2880 (5K Retina Display)', width: 5120, height: 2880, category: 'landscape' },
  'landscape-6016': { name: '6016 × 3384 (6K Pro Display XDR)', width: 6016, height: 3384, category: 'landscape' },
  'landscape-7680': { name: '7680 × 4320 (8K Ultra HD Master)', width: 7680, height: 4320, category: 'landscape' },

  // Common Portrait
  'portrait-576': { name: '576 × 1024 (9:16 Portrait)', width: 576, height: 1024, category: 'portrait' },
  'portrait-720': { name: '720 × 1280 (HD Portrait)', width: 720, height: 1280, category: 'portrait' },
  'portrait-768': { name: '768 × 1366 (Tall Display)', width: 768, height: 1366, category: 'portrait' },
  'portrait-864': { name: '864 × 1536 (Story Medium)', width: 864, height: 1536, category: 'portrait' },
  'portrait-1080': { name: '1080 × 1920 (Mobile / Story HD)', width: 1080, height: 1920, category: 'portrait' },
  'portrait-1440': { name: '1440 × 2560 (2K Vertical)', width: 1440, height: 2560, category: 'portrait' },
  'portrait-2160': { name: '2160 × 3840 (4K Vertical UHD)', width: 2160, height: 3840, category: 'portrait' },
  'portrait-2880': { name: '2880 × 5120 (5K Vertical UHD)', width: 2880, height: 5120, category: 'portrait' },
  'portrait-4320': { name: '4320 × 7680 (8K Vertical Ultra HD)', width: 4320, height: 7680, category: 'portrait' },

  // Square Presets
  'square-512': { name: '512 × 512 (Icon / Avatar)', width: 512, height: 512, category: 'square' },
  'square-768': { name: '768 × 768 (Square Medium)', width: 768, height: 768, category: 'square' },
  'square-1024': { name: '1024 × 1024 (1:1 Artboard Standard)', width: 1024, height: 1024, category: 'square' },
  'square-1536': { name: '1536 × 1536 (High Res Square)', width: 1536, height: 1536, category: 'square' },
  'square-2048': { name: '2048 × 2048 (2K Square Master)', width: 2048, height: 2048, category: 'square' },
  'square-3072': { name: '3072 × 3072 (3K High Precision Square)', width: 3072, height: 3072, category: 'square' },
  'square-4096': { name: '4096 × 4096 (4K Ultra Square)', width: 4096, height: 4096, category: 'square' },
  'square-6144': { name: '6144 × 6144 (6K Master Square)', width: 6144, height: 6144, category: 'square' },
  'square-8192': { name: '8192 × 8192 (8K Ultra Master Square)', width: 8192, height: 8192, category: 'square' },

  // High-Res Print & Poster (300 DPI)
  'print-a4-portrait': { name: 'A4 Print Portrait (2480 × 3508 - 300 DPI)', width: 2480, height: 3508, category: 'print' },
  'print-a4-landscape': { name: 'A4 Print Landscape (3508 × 2480 - 300 DPI)', width: 3508, height: 2480, category: 'print' },
  'print-a3-portrait': { name: 'A3 Print Portrait (3508 × 4960 - 300 DPI)', width: 3508, height: 4960, category: 'print' },
  'print-a3-landscape': { name: 'A3 Print Landscape (4960 × 3508 - 300 DPI)', width: 4960, height: 3508, category: 'print' },
  'print-poster-4-5': { name: 'Poster 8×10 Hi-Res (2400 × 3000 - 300 DPI)', width: 2400, height: 3000, category: 'print' },
  'print-poster-4-3': { name: 'Poster 12×16 Hi-Res (3600 × 4800 - 300 DPI)', width: 3600, height: 4800, category: 'print' },

  // Social & Creative Presets
  'social-ig-square': { name: 'Instagram Post (1080 × 1080)', width: 1080, height: 1080, category: 'social' },
  'social-ig-story': { name: 'Instagram Story / Reel (1080 × 1920)', width: 1080, height: 1920, category: 'social' },
  'social-ig-portrait': { name: 'Instagram Portrait 4:5 (1080 × 1350)', width: 1080, height: 1350, category: 'social' },
  'social-yt-thumb': { name: 'YouTube Thumbnail (1280 × 720)', width: 1280, height: 720, category: 'social' },
  'social-yt-banner': { name: 'YouTube Channel Art (2560 × 1440)', width: 2560, height: 1440, category: 'social' },
  'social-yt-4k': { name: 'YouTube 4K Banner (3840 × 2160)', width: 3840, height: 2160, category: 'social' },
  'social-fb-post': { name: 'Facebook Post (1200 × 630)', width: 1200, height: 630, category: 'social' },
  'social-twitter-post': { name: 'X / Twitter Post (1200 × 675)', width: 1200, height: 675, category: 'social' },
  'social-pinterest-pin': { name: 'Pinterest Pin 2:3 (1000 × 1500)', width: 1000, height: 1500, category: 'social' },
  'social-tiktok': { name: 'TikTok Video / Story (1080 × 1920)', width: 1080, height: 1920, category: 'social' },
  'social-tiktok-4k': { name: 'TikTok / Reel 4K Vertical (2160 × 3840)', width: 2160, height: 3840, category: 'social' },
  'social-dribbble-hd': { name: 'Dribbble / Behance Shot HD (2800 × 2100)', width: 2800, height: 2100, category: 'social' },

  // AI & Image Generation Aspect Ratios
  'ai-1-1': { name: 'AI 1:1 Square (1024 × 1024)', width: 1024, height: 1024, category: 'ai-aspect' },
  'ai-hd-1-1': { name: 'AI HD 1:1 Square (2048 × 2048)', width: 2048, height: 2048, category: 'ai-aspect' },
  'ai-4-3': { name: 'AI 4:3 Standard (1152 × 864)', width: 1152, height: 864, category: 'ai-aspect' },
  'ai-3-4': { name: 'AI 3:4 Vertical (864 × 1152)', width: 864, height: 1152, category: 'ai-aspect' },
  'ai-3-2': { name: 'AI 3:2 Photo (1200 × 800)', width: 1200, height: 800, category: 'ai-aspect' },
  'ai-2-3': { name: 'AI 2:3 Tall Photo (800 × 1200)', width: 800, height: 1200, category: 'ai-aspect' },
  'ai-16-9': { name: 'AI 16:9 Cinema (1344 × 768)', width: 1344, height: 768, category: 'ai-aspect' },
  'ai-hd-16-9': { name: 'AI HD 16:9 Cinema (2688 × 1536)', width: 2688, height: 1536, category: 'ai-aspect' },
  'ai-9-16': { name: 'AI 9:16 Vertical (768 × 1344)', width: 768, height: 1344, category: 'ai-aspect' },
  'ai-hd-9-16': { name: 'AI HD 9:16 Tall (1536 × 2688)', width: 1536, height: 2688, category: 'ai-aspect' },
  'ai-5-4': { name: 'AI 5:4 Format (1280 × 1024)', width: 1280, height: 1024, category: 'ai-aspect' },
  'ai-4-5': { name: 'AI 4:5 Social (1024 × 1280)', width: 1024, height: 1280, category: 'ai-aspect' },
  'ai-21-9': { name: 'AI 21:9 Ultra-Wide (1536 × 640)', width: 1536, height: 640, category: 'ai-aspect' },
  'ai-hd-21-9': { name: 'AI HD 21:9 Ultra-Wide (2560 × 1080)', width: 2560, height: 1080, category: 'ai-aspect' }
};

export class DocumentManager {
  constructor(defaultKey = 'original', customWidth = 1024, customHeight = 1024) {
    this.presetKey = defaultKey;
    this.customWidth = customWidth;
    this.customHeight = customHeight;
    this.sourceWidth = 0;
    this.sourceHeight = 0;
  }

  setSourceDimensions(w, h) {
    this.sourceWidth = Math.max(1, Math.round(w));
    this.sourceHeight = Math.max(1, Math.round(h));
  }

  setPreset(key) {
    this.presetKey = key;
  }

  setCustomSize(w, h) {
    this.customWidth = Math.max(16, Math.min(8192, Math.round(w)));
    this.customHeight = Math.max(16, Math.min(8192, Math.round(h)));
    this.presetKey = 'custom';
  }

  getDimensions() {
    if (this.presetKey === 'original' && this.sourceWidth > 0 && this.sourceHeight > 0) {
      return { width: this.sourceWidth, height: this.sourceHeight, isCustom: false };
    }

    if (this.presetKey === 'custom') {
      return { width: this.customWidth, height: this.customHeight, isCustom: true };
    }

    const preset = DOCUMENT_PRESETS[this.presetKey];
    if (preset) {
      return { width: preset.width, height: preset.height, isCustom: false };
    }

    return {
      width: this.sourceWidth || 1024,
      height: this.sourceHeight || 1024,
      isCustom: false
    };
  }

  getAspectRatio() {
    const { width, height } = this.getDimensions();
    return width / height;
  }
}
