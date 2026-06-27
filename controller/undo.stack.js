function createUndoStack(maxDepth) {
  const actions = [];
  return {
    push(action) {
      actions.push(action);
      if (actions.length > maxDepth) actions.shift();
    },
    pop() {
      return actions.pop() || null;
    },
    peek() {
      return actions.length > 0 ? actions[actions.length - 1] : null;
    },
    clear() {
      actions.length = 0;
    },
    size() {
      return actions.length;
    },
  };
}

module.exports = { createUndoStack };
