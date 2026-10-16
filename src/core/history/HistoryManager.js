/**
 * HistoryManager.js
 * Undo and Redo stack management for PixelGrid states and parameter adjustments.
 */

export class HistoryManager {
  constructor(maxStates = 40) {
    this.maxStates = maxStates;
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = [];
  }

  push(state) {
    // Clone state if it's a PixelGrid or object
    const stateSnapshot = state && typeof state.clone === 'function' ? state.clone() : JSON.parse(JSON.stringify(state));
    this.undoStack.push(stateSnapshot);

    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }

    // Clear redo on new action
    this.redoStack = [];
    this.notify();
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;

    if (currentState) {
      const currentSnapshot = typeof currentState.clone === 'function' ? currentState.clone() : JSON.parse(JSON.stringify(currentState));
      this.redoStack.push(currentSnapshot);
    }

    const previousState = this.undoStack.pop();
    this.notify();
    return previousState;
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;

    if (currentState) {
      const currentSnapshot = typeof currentState.clone === 'function' ? currentState.clone() : JSON.parse(JSON.stringify(currentState));
      this.undoStack.push(currentSnapshot);
    }

    const nextState = this.redoStack.pop();
    this.notify();
    return nextState;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const l of this.listeners) {
      l({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length
      });
    }
  }
}
