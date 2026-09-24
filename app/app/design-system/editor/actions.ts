import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECTIONS } from "../../../packages/design-system/src/field-descriptors.mjs";
import type { FieldDescriptor } from "../../../packages/design-system/src/field-descriptors.mjs";
import { SEED_RE } from "./styles";

export type ApiResult = { ok: true; reset?: string[]; slug?: string } | { ok: false; error: string };

export type PendingEdit = { value: string; scope: "exception" | "brand" };

export async function postAction(body: Record<string, unknown>): Promise<ApiResult> {
  let res: Response;
  try {
    res = await fetch("/api/design-system/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Request failed — is the dev server still running?" };
  }
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, error: `Unexpected response (HTTP ${res.status})` };
  }
}

// Every server-action handler for the editor's field-write/reset/save flows,
// plus their busy/error/feedback state. Deliberately does NOT own brand
// create/duplicate/delete (that's BrandSwitcher's own self-contained state —
// see brand-switcher.tsx) or selectedView (pure UI-navigation state, owned by
// index.tsx directly, not a server action).
export function useEditorActions(descriptors: FieldDescriptor[], selectedBrand: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<Set<string>>(() => new Set());
  const [resetArmed, setResetArmed] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Map<string, PendingEdit>>(() => new Map());
  const [bulkScope, setBulkScope] = useState<"exception" | "brand">("exception");
  const [saveBusy, setSaveBusy] = useState(false);
  // Seed inputs aren't token fields (no path/revert/modified-state) — they
  // start from the live resolved values and are never written back as tokens.
  const [neutralSeed, setNeutralSeed] = useState(
    descriptors.find((d) => d.path === "semantic.color.background")?.value ?? "",
  );
  const [accentSeed, setAccentSeed] = useState(
    descriptors.find((d) => d.path === "semantic.color.accent")?.value ?? "",
  );
  const seedsValid = SEED_RE.test(neutralSeed) && SEED_RE.test(accentSeed);

  const modifiedPaths = descriptors.filter((d) => d.isModified).map((d) => d.path);
  const modifiedKey = modifiedPaths.join("\n");

  // A refresh between arming reset-all and confirming must not present a
  // stale count — any change to the modified set disarms. Adjusted during
  // render (not in an effect), which is the pattern react-hooks lint allows.
  // Success feedback is intentionally NOT cleared here; it survives the
  // refresh it caused and clears on the next action instead.
  const [armedKey, setArmedKey] = useState(modifiedKey);
  if (armedKey !== modifiedKey) {
    setArmedKey(modifiedKey);
    setResetArmed(false);
  }

  const track = (path: string) =>
    setInFlight((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  const untrack = (path: string) =>
    setInFlight((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });

  async function runWrite(path: string, value: string): Promise<boolean> {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "write", path, value, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      untrack(path);
    }
  }

  async function runReset(path: string) {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "reset", path, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      untrack(path);
    }
  }

  async function runPromote(path: string) {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "set-as-default", path, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      untrack(path);
    }
  }

  function stageEdit(path: string, value: string) {
    setPendingEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(path);
      // A non-alias field can never go "brand" (nothing to cascade to) — force
      // "exception" here, don't just trust bulkScope. Without this, setting the
      // bulk default to Brand-wide and then editing any literal (non-alias)
      // field stages a "brand" edit that 8a's all-or-nothing batch-write would
      // reject at Save time, failing the whole batch over one field that
      // should never have had the option.
      const d = descriptors.find((x) => x.path === path);
      const scope = existing?.scope ?? (d?.isAlias ? bulkScope : "exception");
      next.set(path, { value, scope });
      return next;
    });
  }

  function setPendingScope(path: string, scope: "exception" | "brand") {
    setPendingEdits((prev) => {
      const existing = prev.get(path);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(path, { ...existing, scope });
      return next;
    });
  }

  function discardPendingEdit(path: string) {
    setPendingEdits((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  }

  function discardAllPending() {
    setPendingEdits(new Map());
  }

  function sectionHeading(sectionKey: string): string {
    return SECTIONS.find((s) => s.key === sectionKey)?.heading ?? sectionKey;
  }

  // F6: two pending "brand" edits resolving to the same alias target would
  // silently last-wins server-side (8a spec, F6) — block Save instead. Labels
  // are qualified with their section heading because two colliding fields are
  // very plausibly named the same thing in different components.
  function pendingCollisions(): { targetPath: string; labels: string[] }[] {
    const byTarget = new Map<string, string[]>();
    for (const [path, edit] of pendingEdits) {
      if (edit.scope !== "brand") continue;
      const d = descriptors.find((x) => x.path === path);
      if (!d?.isAlias) continue; // defensive; UI never offers "brand" for a non-alias field
      const target = d.rawValue.slice(1, -1);
      const label = `${d.label} (${sectionHeading(d.section)})`;
      byTarget.set(target, [...(byTarget.get(target) ?? []), label]);
    }
    return [...byTarget.entries()]
      .filter(([, labels]) => labels.length > 1)
      .map(([targetPath, labels]) => ({ targetPath, labels }));
  }

  async function runSaveAll() {
    if (pendingEdits.size === 0) return;
    const collisions = pendingCollisions();
    if (collisions.length > 0) {
      setError(
        collisions
          .map(
            (c) =>
              `${c.labels.join(" and ")} both target ${c.targetPath} as brand-wide edits — change one to Exception scope first.`,
          )
          .join(" "),
      );
      return;
    }
    setSaveBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const edits = [...pendingEdits.entries()].map(([path, e]) => ({
        path,
        value: e.value,
        scope: e.scope,
      }));
      const result = await postAction({ action: "batch-write", edits, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingEdits(new Map());
      setFeedback(`Saved ${edits.length} field${edits.length === 1 ? "" : "s"}`);
      router.refresh();
    } finally {
      setSaveBusy(false);
    }
  }

  async function runResetToParent(path: string) {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "reset-to-parent", path, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      untrack(path);
    }
  }

  async function runSetDescription(path: string, description: string): Promise<boolean> {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "set-description", path, description, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      untrack(path);
    }
  }

  async function runResetAll() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetArmed(false);
    setResetBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "reset-all", brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const n = result.reset?.length ?? 0;
      setFeedback(n > 0 ? `Reset ${n} field${n === 1 ? "" : "s"}` : "Nothing to reset");
      router.refresh();
    } finally {
      setResetBusy(false);
    }
  }

  async function runGenerate() {
    if (!seedsValid) return;
    setGenerateBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "generate-from-seed", neutralSeed, accentSeed, brand: selectedBrand });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback("Regenerated 18 colors from new seeds");
      router.refresh();
    } finally {
      setGenerateBusy(false);
    }
  }

  return {
    error,
    setError,
    feedback,
    inFlight,
    resetArmed,
    resetBusy,
    generateBusy,
    pendingEdits,
    bulkScope,
    setBulkScope,
    saveBusy,
    neutralSeed,
    setNeutralSeed,
    accentSeed,
    setAccentSeed,
    seedsValid,
    modifiedPaths,
    runWrite,
    runReset,
    runPromote,
    stageEdit,
    setPendingScope,
    discardPendingEdit,
    discardAllPending,
    runSaveAll,
    runResetToParent,
    runSetDescription,
    runResetAll,
    runGenerate,
  };
}
