/**
 * PencilEngine.js
 * Independent Freehand Pencil & Shape Annotation Engine.
 * Handles freehand drawing, vector shape overlays, and text stamping.
 */

export class PencilEngine {
  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.elements = [];
    this.history = [];
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  saveState() {
    this.history.push(JSON.parse(JSON.stringify(this.elements)));
    if (this.history.length > 30) this.history.shift();
  }

  undo() {
    if (this.history.length > 0) {
      this.elements = this.history.pop();
      return true;
    }
    return false;
  }

  clear() {
    this.saveState();
    this.elements = [];
  }

  renderToCanvas(ctx) {
    for (const el of this.elements) {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.size || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'stroke' && el.points && el.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'shape') {
        const { shapeType, x0, y0, x1, y1, filled } = el;
        ctx.beginPath();

        if (shapeType === 'rect') {
          const w = x1 - x0;
          const h = y1 - y0;
          if (filled) ctx.fillRect(x0, y0, w, h);
          else ctx.strokeRect(x0, y0, w, h);
        } else if (shapeType === 'circle') {
          const rx = Math.abs(x1 - x0) / 2;
          const ry = Math.abs(y1 - y0) / 2;
          const cx = (x0 + x1) / 2;
          const cy = (y0 + y1) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (filled) ctx.fill();
          else ctx.stroke();
        } else if (shapeType === 'line') {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        } else if (shapeType === 'arrow') {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          // Draw arrowhead
          const headlen = 12;
          const angle = Math.atan2(y1 - y0, x1 - x0);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headlen * Math.cos(angle - Math.PI / 6), y1 - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - headlen * Math.cos(angle + Math.PI / 6), y1 - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (el.type === 'text') {
        ctx.font = `bold ${el.fontSize}px sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      }

      ctx.restore();
    }
  }
}
