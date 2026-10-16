/**
 * BoundaryValidator.js
 * Validates and constrains artwork geometry strictly within the document / artboard bounds.
 */

export class BoundaryValidator {
  /**
   * Clamps a rectangular element to the document boundaries.
   */
  static clampRect(x, y, width, height, docWidth, docHeight) {
    const clampedX = Math.max(0, Math.min(docWidth, x));
    const clampedY = Math.max(0, Math.min(docHeight, y));
    const clampedW = Math.max(0, Math.min(docWidth - clampedX, width));
    const clampedH = Math.max(0, Math.min(docHeight - clampedY, height));

    return {
      x: clampedX,
      y: clampedY,
      width: clampedW,
      height: clampedH
    };
  }

  /**
   * Clamps a circular element or dot to the document boundaries.
   */
  static clampCircle(cx, cy, radius, docWidth, docHeight) {
    const clampedX = Math.max(radius, Math.min(docWidth - radius, cx));
    const clampedY = Math.max(radius, Math.min(docHeight - radius, cy));
    const maxRadius = Math.min(clampedX, clampedY, docWidth - clampedX, docHeight - clampedY, radius);

    return {
      cx: clampedX,
      cy: clampedY,
      radius: Math.max(0.5, maxRadius)
    };
  }
}
