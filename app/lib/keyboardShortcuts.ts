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

// Spec 1+4: the single truth table for transport shortcuts. Arrows match by
// e.key; Space matches by e.code (layout-independent -- hence no key field).
// Handled-key knowledge lives ONLY here: the StudioTabs listener dispatches
// via matchTransportShortcut, and hints/aria-keyshortcuts render from these
// entries -- nothing re-lists keys.
export type ShortcutAction = "step-back" | "step-forward" | "toggle-play";

export interface ShortcutDef {
  key?: string;
  code?: string;
  action: ShortcutAction;
  kbd: string[];
  label: string;
}

export const TRANSPORT_SHORTCUTS: ShortcutDef[] = [
  { key: "ArrowLeft", action: "step-back", kbd: ["←"], label: "step" },
  { key: "ArrowRight", action: "step-forward", kbd: ["→"], label: "step" },
  { code: "Space", action: "toggle-play", kbd: ["Space"], label: "play/pause" },
];

/** Pure key matching against the map (no modifiers/scope/editable checks). */
export function matchTransportShortcut(e: { key: string; code: string }): ShortcutDef | undefined {
  return TRANSPORT_SHORTCUTS.find((s) => (s.key !== undefined ? e.key === s.key : e.code === s.code));
}

export function shouldHandleKey(
  e: {
    key: string;
    code: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey?: boolean;
  },
  target: { tagName?: string; isContentEditable?: boolean } | null,
  opts: { inScope: boolean },
): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (!opts.inScope) return false;
  if (isEditableTarget(target)) return false;
  // shiftKey deliberately ignored (matches today's listener; editable
  // targets are excluded anyway, so Shift+arrows in text fields stay native).
  return matchTransportShortcut(e) !== undefined;
}
