/**
 * ImageLoader.js
 * Validates, decodes, and normalizes image files (JPG, PNG, WebP, etc.)
 * into RGBA buffers with memory protection and error handling.
 */

export class ImageLoader {
  static MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  static MAX_DIMENSION = 4096; // 4K max processing size

  /**
   * Validate uploaded File object.
   */
  static validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|gif|bmp)$/i)) {
      throw new Error('Unsupported image format. Please upload JPG, PNG, or WebP.');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 25MB.`);
    }

    return true;
  }

  /**
   * Load image file into an HTMLImageElement / ImageData object.
   */
  static loadFromFile(file) {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.naturalWidth > this.MAX_DIMENSION || img.naturalHeight > this.MAX_DIMENSION) {
          // Scale down if exceeds max processing dimension
          const scale = Math.min(
            this.MAX_DIMENSION / img.naturalWidth,
            this.MAX_DIMENSION / img.naturalHeight
          );
          const scaledW = Math.round(img.naturalWidth * scale);
          const scaledH = Math.round(img.naturalHeight * scale);

          const canvas = document.createElement('canvas');
          canvas.width = scaledW;
          canvas.height = scaledH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, scaledW, scaledH);
          const imageData = ctx.getImageData(0, 0, scaledW, scaledH);

          resolve({
            img,
            width: scaledW,
            height: scaledH,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            imageData
          });
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

          resolve({
            img,
            width: img.naturalWidth,
            height: img.naturalHeight,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            imageData
          });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode image file. The file may be corrupt.'));
      };

      img.src = url;
    });
  }


}
