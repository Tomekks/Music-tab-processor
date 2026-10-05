import { createStaged, redoEdit, stageEdit, undoEdit } from "./stagedEdits.js";

let history = $state(createStaged());

export const stagedStore = {
  get staged() {
    return history.staged;
  },
  get count() {
    return Object.keys(history.staged).length;
  },
  get canUndo() {
    return history.past.length > 0;
  },
  get canRedo() {
    return history.future.length > 0;
  },
  stage(path: string, fileValue: string, nextHex: string) {
    history = stageEdit(history, path, fileValue, nextHex);
  },
  undo() {
    history = undoEdit(history);
  },
  redo() {
    history = redoEdit(history);
  },
};
