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
  dependents?: string[];
}

export function createStaged(): StagedHistory {
  return { staged: {}, past: [], future: [] };
}

export function stageEdit(
  state: StagedHistory,
  path: string,
  fileValue: string,
  nextHex: string,
  replace = false,
): StagedHistory {
  const current = state.staged[path];
  if (nextHex.toLowerCase() === fileValue.toLowerCase()) {
    if (!current) return state;
    if (replace) {
      const staged = { ...state.staged };
      delete staged[path];
      return { staged, past: state.past, future: [] };
    }
    const staged = { ...state.staged };
    delete staged[path];
    return { staged, past: [...state.past, state.staged], future: [] };
  }
  const was = fileValue;
  if (current && current.now.toLowerCase() === nextHex.toLowerCase()) return state;
  if (replace && current) {
    return {
      staged: { ...state.staged, [path]: { was, now: nextHex } },
      past: state.past,
      future: [],
    };
  }
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

export function discardAll(state: StagedHistory): StagedHistory {
  if (Object.keys(state.staged).length === 0) return state;
  return { staged: {}, past: [...state.past, state.staged], future: [] };
}

export function rebaseOnFile(
  state: StagedHistory,
  tokens: { path: string; value: string }[],
): StagedHistory {
  const fileByPath = new Map(tokens.map((token) => [token.path, token.value]));
  const staged: StagedMap = {};
  let changed = false;
  for (const [path, entry] of Object.entries(state.staged)) {
    const fileValue = fileByPath.get(path);
    if (fileValue === undefined) {
      changed = true;
      continue;
    }
    if (entry.now.toLowerCase() === fileValue.toLowerCase()) {
      changed = true;
      continue;
    }
    if (entry.was !== fileValue) {
      changed = true;
      staged[path] = { was: fileValue, now: entry.now };
    } else {
      staged[path] = entry;
    }
  }
  if (!changed) {
    return state;
  }
  return { staged, past: [], future: [] };
}

export function previewVars(tokens: PreviewToken[], staged: StagedMap): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const token of tokens) {
    const entry = staged[token.path];
    const resolved = entry ? entry.now : token.value;
    vars[token.cssVar] = resolved;
    for (const dependent of token.dependents ?? []) {
      vars[dependent] = resolved;
    }
  }
  return vars;
}
