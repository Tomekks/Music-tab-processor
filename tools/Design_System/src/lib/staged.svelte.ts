import { createStaged, discardAll, rebaseOnFile, redoEdit, stageEdit, undoEdit } from "./stagedEdits.js";

let history = $state(createStaged());
let loadedVersion = $state<string | null>(null);

export const stagedStore = {
  get staged() {
    return history.staged;
  },
  get loadedVersion() {
    return loadedVersion;
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
  stage(path: string, fileValue: string, nextHex: string, replace = false) {
    history = stageEdit(history, path, fileValue, nextHex, replace);
  },
  undo() {
    history = undoEdit(history);
  },
  redo() {
    history = redoEdit(history);
  },
  discard() {
    history = discardAll(history);
  },
  sync(tokens: { path: string; value: string }[], version: string) {
    loadedVersion = version;
    history = rebaseOnFile(history, tokens);
  },
};
