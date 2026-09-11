// Pure predicate for the transport keyboard shortcuts (left/right step,
// space play/pause) added to StudioTabs.tsx -- kept separate from the
// keydown listener itself so it's testable without a DOM (this repo's tests
// run under plain `node --test`, no jsdom). Duck-typed rather than
// `instanceof HTMLElement` for the same reason: a real DOM element still
// satisfies this shape structurally, so the real call site needs no cast,
// but a test can pass a plain object.

/**
 * True when a keydown's target is a place normal typing/interaction should
 * win over a global transport shortcut -- an input, textarea, select, or any
 * contentEditable element (e.g. the Tempo field, where left/right arrows
 * must adjust the number, not step through the tab).
 */
export function isEditableTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target.isContentEditable);
}
