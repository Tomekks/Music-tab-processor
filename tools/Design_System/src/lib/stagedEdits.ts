export interface StagedEntry {
  was: string;
  now: string;
}

export type StagedMap = Record<string, StagedEntry>;

export interface StagedHistory {
  staged: StagedMap;
  past: StagedMap[];
  future: StagedMap[];
}

export interface PreviewToken {
  path: string;
  cssVar: string;
  value: string;
}

export function createStaged(): StagedHistory {
  return { staged: {}, past: [], future: [] };
}

export function stageEdit(
  state: StagedHistory,
  path: string,
  fileValue: string,
  nextHex: string,
): StagedHistory {
  const current = state.staged[path];
  if (nextHex.toLowerCase() === fileValue.toLowerCase()) {
    if (!current) return state;
    const staged = { ...state.staged };
    delete staged[path];
    return { staged, past: [...state.past, state.staged], future: [] };
  }
  const was = current ? current.now : fileValue;
  if (current && current.now.toLowerCase() === nextHex.toLowerCase()) return state;
  return {
    staged: { ...state.staged, [path]: { was, now: nextHex } },
    past: [...state.past, state.staged],
    future: [],
  };
}

export function undoEdit(state: StagedHistory): StagedHistory {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  return {
    staged: previous,
    past: state.past.slice(0, -1),
    future: [...state.future, state.staged],
  };
}

export function redoEdit(state: StagedHistory): StagedHistory {
  if (state.future.length === 0) return state;
  const next = state.future[state.future.length - 1];
  return {
    staged: next,
    past: [...state.past, state.staged],
    future: state.future.slice(0, -1),
  };
}

export function previewVars(tokens: PreviewToken[], staged: StagedMap): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const token of tokens) {
    const entry = staged[token.path];
    vars[token.cssVar] = entry ? entry.now : token.value;
  }
  return vars;
}
