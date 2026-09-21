"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ColorField, SegmentedControl, Slider } from "@guitar-tabs/design-system";
import { SECTIONS } from "../../packages/design-system/src/field-descriptors.mjs";
import type { FieldDescriptor } from "../../packages/design-system/src/field-descriptors.mjs";
import { cssVarNameForPath } from "../../packages/design-system/src/css-var-naming.mjs";
import { cn } from "@/lib/cn";

// Canonical wire form per $type — the client always sends the full string the
// API validator expects ("12px", "8%"), never a bare number. Keyed by $type,
// never parsed out of the display string.
const UNIT: Record<string, string> = { dimension: "px", percentage: "%" };

// Client-side mirror of token-writes.mjs's SEED_COLOR_RE — gating only, the
// server still validates. Not a second source of truth.
const SEED_RE = /^#[0-9a-fA-F]{6}$/;

type Range = { min: number; max: number; step: number };

// Editor-local ranges — tokens carry no range metadata and adding it would be
// scope creep. Matched on FULL path (not leaf name) so a future same-named
// leaf in another section can't silently double-match.
function rangeFor(d: FieldDescriptor): Range | null {
  if (d.$type === "percentage") return { min: 0, max: 100, step: 1 };
  if (d.$type !== "dimension") return null;
  if (d.path === "component.colorField.swatchSize") return { min: 8, max: 48, step: 1 };
  if (d.path === "semantic.focus.ringWidth" || d.path === "semantic.focus.ringOffset") {
    return { min: 0, max: 8, step: 1 };
  }
  if (d.path === "semantic.layout.sidebarWidth") return { min: 120, max: 360, step: 1 };
  return { min: 0, max: 64, step: 1 };
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const MUTED_ACTION = cn(
  "text-xs",
  "text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)]",
  "hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]",
  FOCUS_RING,
  "disabled:opacity-[var(--state-disabled-opacity)]",
  "disabled:cursor-not-allowed",
);
const CAPTION = "text-xs text-surface-text/60";

type ApiResult = { ok: true; reset?: string[] } | { ok: false; error: string };

type PendingEdit = { value: string; scope: "exception" | "brand" };

async function postAction(body: Record<string, unknown>): Promise<ApiResult> {
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

function ColorRow({
  d,
  baseline,
  disabled,
  commit,
  onCancelPending,
}: {
  d: FieldDescriptor;
  baseline: string;
  disabled: boolean;
  commit: (value: string) => Promise<boolean>;
  onCancelPending?: () => void;
}) {
  const [text, setText] = useState(baseline);
  // State (not a ref): the render-adjust below reads this during render, and
  // refs are unreadable there per lint. Re-renders on focus change are trivial.
  const [isFocused, setIsFocused] = useState(false);
  // Adopt externally-changed values (revert/reset-all/generate — or, in staged
  // mode, stage/discard moving `baseline`) without remounting — never while the
  // user is typing in this row, or keystrokes would be clobbered. Adjusted
  // during render (not in an effect): setState in an effect trips the
  // cascading-render lint rule, and this file already uses the render-adjust
  // pattern for the reset-all disarm below. Rows are keyed on path only
  // (see FieldRow call sites).
  const [syncedSource, setSyncedSource] = useState(baseline);
  if (syncedSource !== baseline && !isFocused) {
    setSyncedSource(baseline);
    setText(baseline);
  }
  useEffect(() => {
    const varName = cssVarNameForPath(d.path)!;
    document.documentElement.style.setProperty(varName, text);
    return () => {
      document.documentElement.style.removeProperty(varName);
    };
  }, [text, d.path]);
  const commitIfChanged = async () => {
    if (text !== baseline) {
      const ok = await commit(text);
      if (!ok) setText(baseline);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void commitIfChanged();
      }}
      onFocus={() => {
        setIsFocused(true);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void commitIfChanged();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (onCancelPending) {
            onCancelPending();
          } else {
            setText(baseline);
          }
          (e.target as HTMLElement).blur();
        }
      }}
    >
      <ColorField label={d.label} value={text} onChange={setText} disabled={disabled} />
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
    </form>
  );
}

function SliderRow({
  d,
  baseline,
  range,
  disabled,
  commit,
}: {
  d: FieldDescriptor;
  baseline: string;
  range: Range;
  disabled: boolean;
  commit: (value: string) => Promise<boolean>;
}) {
  const initial = parseFloat(baseline);
  const [num, setNum] = useState(Number.isFinite(initial) ? initial : range.min);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // State (not a ref): read during render by the adjust below. Re-renders on
  // drag start/end are trivial.
  const [isDragging, setIsDragging] = useState(false);
  // Adopt externally-changed values (revert/reset-all — or, in staged mode,
  // stage/discard moving `baseline`) without remounting — never mid-drag, or
  // the thumb would snap back under the pointer. Adjusted during render (not
  // in an effect) — same pattern and reason as ColorRow.
  const [syncedSource, setSyncedSource] = useState(baseline);
  if (syncedSource !== baseline && !isDragging) {
    setSyncedSource(baseline);
    const v = parseFloat(baseline);
    if (Number.isFinite(v)) setNum(v);
  }
  useEffect(() => {
    const varName = cssVarNameForPath(d.path)!;
    document.documentElement.style.setProperty(varName, `${num}${UNIT[d.$type]}`);
    return () => {
      document.documentElement.style.removeProperty(varName);
    };
  }, [num, d.path, d.$type]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <>
      {/* Pointer handlers live on this wrapper (not the <input> itself) because
          the shared Slider component doesn't forward DOM props — pointer events
          from the drag bubble up identically. */}
      <div
        onPointerDown={() => {
          setIsDragging(true);
        }}
        onPointerUp={() => {
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          setIsDragging(false);
        }}
      >
      <Slider
        label={d.label}
        value={num}
        min={range.min}
        max={range.max}
        step={range.step}
        disabled={disabled}
        onChange={(n) => {
          setNum(n);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(async () => {
            const ok = await commit(`${n}${UNIT[d.$type]}`);
            if (!ok) {
              const reverted = parseFloat(baseline);
              setNum(Number.isFinite(reverted) ? reverted : range.min);
            }
          }, 200);
        }}
      />
      </div>
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
    </>
  );
}

function FieldRow({
  d,
  disabled,
  onCommitValue,
  onRevert,
  onPromote,
  pending,
  onStage,
  onDiscardPending,
  onSetScope,
  isChildBrand,
  parentName,
  onResetToParent,
}: {
  d: FieldDescriptor;
  disabled: boolean;
  // Optional: only the "All variables" call site passes it (immediate writes).
  // The per-component detail view stages instead and omits it — the fallback
  // branch below is unreachable there, hence the single assertion.
  onCommitValue?: (path: string, value: string) => Promise<boolean>;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
  pending?: PendingEdit;
  onStage?: (path: string, value: string) => void;
  onDiscardPending?: (path: string) => void;
  onSetScope?: (path: string, scope: "exception" | "brand") => void;
  isChildBrand?: boolean;
  parentName?: string | null;
  onResetToParent?: (path: string) => void;
}) {
  const range = rangeFor(d);
  // Staged mode is on iff onStage is passed (only from ComponentDetailView).
  // baseline is the row's "current committed value": the staged value when one
  // exists, the disk value otherwise. All-value call sites pass no staged
  // props, so baseline is d.value there — byte-for-byte today's behavior.
  const baseline = pending?.value ?? d.value;
  const commit = onStage
    ? (value: string) => {
        onStage!(d.path, value);
        return Promise.resolve(true);
      }
    : (value: string) => onCommitValue!(d.path, value);
  const control =
    d.$type === "color" ? (
      <ColorRow
        d={d}
        baseline={baseline}
        disabled={disabled}
        commit={commit}
        onCancelPending={pending ? () => onDiscardPending!(d.path) : undefined}
      />
    ) : range !== null ? (
      <SliderRow d={d} baseline={baseline} range={range} disabled={disabled} commit={commit} />
    ) : (
      <div>
        <p className="text-sm font-medium">{d.label}</p>
        <p className="text-sm text-surface-text/70">{d.value}</p>
      </div>
    );
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        {control}
        {isChildBrand && (
          <p className={cn(CAPTION, "mt-1")}>
            {d.isInheritedFromParent ? `Inherited from ${parentName ?? "parent"}` : "Overridden"}
          </p>
        )}
        {pending && d.isAlias && (
          <div className="mt-2">
            <SegmentedControl
              options={[
                { value: "exception", label: "Exception" },
                { value: "brand", label: "Brand-wide" },
              ]}
              value={pending.scope}
              onChange={(v) => onSetScope!(d.path, v as "exception" | "brand")}
              ariaLabel={`Scope for ${d.label}`}
            />
          </div>
        )}
        {pending && !d.isAlias && (
          <p className={cn(CAPTION, "mt-1")}>
            (exception only — not linked to a shared token)
          </p>
        )}
      </div>
      {(d.isModified || pending || (isChildBrand && !d.isInheritedFromParent)) && (
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (pending) return onDiscardPending!(d.path);
              if (isChildBrand && !d.isInheritedFromParent) return onResetToParent!(d.path);
              return onRevert(d.path);
            }}
            aria-label={
              pending
                ? `Discard staged change to ${d.label}`
                : isChildBrand && !d.isInheritedFromParent
                  ? `Revert ${d.label} to parent`
                  : `Revert ${d.label} to default`
            }
            className={MUTED_ACTION}
          >
            Revert
          </button>
          {d.isModified && !isChildBrand && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPromote(d.path)}
              aria-label={`Set ${d.label} as new default`}
              className={MUTED_ACTION}
            >
              Set as default
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type ComponentSectionKey =
  | "component.colorField"
  | "component.slider"
  | "component.segmentedControl"
  | "component.button";

function ComponentPreview({ sectionKey }: { sectionKey: ComponentSectionKey }) {
  const [demoTab, setDemoTab] = useState<"a" | "b">("a");
  // Preview state is local-only demo state (like demoTab) — it moves the
  // rendered instance without writing any token. A controlled component with
  // a no-op onChange would be frozen by React definition.
  const [demoSlider, setDemoSlider] = useState(50);
  const [demoColor, setDemoColor] = useState("#4a90d9");
  switch (sectionKey) {
    case "component.colorField":
      return <ColorField label="Sample" value={demoColor} onChange={setDemoColor} />;
    case "component.slider":
      return (
        <Slider label="Sample" value={demoSlider} min={0} max={100} step={1} onChange={setDemoSlider} />
      );
    case "component.segmentedControl":
      return (
        <SegmentedControl
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
          value={demoTab}
          onChange={setDemoTab}
          ariaLabel="Sample"
        />
      );
    case "component.button":
      return (
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => {}}>Primary</Button>
          <Button variant="secondary" onClick={() => {}}>Secondary</Button>
        </div>
      );
  }
}

function ComponentDetailView({
  sectionKey,
  heading,
  fields,
  disabledPaths,
  saveBusy,
  pendingEdits,
  onStage,
  onRevert,
  onPromote,
  onDiscardPending,
  onSetScope,
  isChildBrand,
  parentName,
  onResetToParent,
  error,
  feedback,
}: {
  sectionKey: ComponentSectionKey;
  heading: string;
  fields: FieldDescriptor[];
  disabledPaths: Set<string>;
  saveBusy: boolean;
  pendingEdits: Map<string, PendingEdit>;
  onStage: (path: string, value: string) => void;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
  onDiscardPending: (path: string) => void;
  onSetScope: (path: string, scope: "exception" | "brand") => void;
  isChildBrand: boolean;
  parentName: string | null;
  onResetToParent: (path: string) => void;
  error: string | null;
  feedback: string | null;
}) {
  return (
    <section aria-label={heading}>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <h3 className="mt-3 text-sm font-semibold text-surface-text/70">Preview</h3>
      <div className="mt-2 rounded-md border border-border p-4">
        <ComponentPreview key={sectionKey} sectionKey={sectionKey} />
      </div>
      <div className="mt-4 divide-y divide-border">
        {fields.map((d) => (
          <FieldRow
            key={d.path}
            d={d}
            disabled={disabledPaths.has(d.path) || saveBusy}
            onStage={onStage}
            onRevert={onRevert}
            onPromote={onPromote}
            pending={pendingEdits.get(d.path)}
            onDiscardPending={onDiscardPending}
            onSetScope={onSetScope}
            isChildBrand={isChildBrand}
            parentName={parentName}
            onResetToParent={onResetToParent}
          />
        ))}
      </div>
      {feedback && (
        <p aria-live="polite" className="mt-3 text-sm text-surface-text/70">{feedback}</p>
      )}
      {error && (
        <p aria-live="polite" role="alert" className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </section>
  );
}

export function Editor({
  descriptors,
  isChildBrand,
  parentName,
}: {
  descriptors: FieldDescriptor[];
  isChildBrand: boolean;
  parentName: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<Set<string>>(() => new Set());
  const [resetArmed, setResetArmed] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [selectedView, setSelectedView] = useState<"all" | ComponentSectionKey>("all");
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
      const result = await postAction({ action: "write", path, value });
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
      const result = await postAction({ action: "reset", path });
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
      const result = await postAction({ action: "set-as-default", path });
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
      const result = await postAction({ action: "batch-write", edits });
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
      const result = await postAction({ action: "reset-to-parent", path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
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
      const result = await postAction({ action: "reset-all" });
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
      const result = await postAction({ action: "generate-from-seed", neutralSeed, accentSeed });
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

  const fieldsFor = (key: string) => descriptors.filter((d) => d.section === key);
  const flat = SECTIONS.filter((s) => !s.group);
  const grouped = SECTIONS.filter((s) => s.group);

  // Only the component.* groups get sidebar entries — a per-component view
  // exists to pair a component's fields with a live-rendered instance of
  // that component. Semantic tokens are cross-cutting (no single component
  // to render) and stay exclusive to "All variables."
  const sidebarItems: { key: "all" | ComponentSectionKey; label: string }[] = [
    { key: "all", label: "All variables" },
    ...grouped.map((s) => ({ key: s.key as ComponentSectionKey, label: s.heading })),
  ];
  // Fall back to the first component section instead of crashing if the key
  // ever fails to match — selectedView can only come from sidebarItems, so
  // this is unreachable in practice, but a lookup miss must not throw.
  const selectedSection = grouped.find((s) => s.key === selectedView) ?? grouped[0];

  const renderSection = (key: string, Heading: "h2" | "h3", heading: string) => {
    const fields = fieldsFor(key);
    if (fields.length === 0) return null;
    const Title = Heading;
    return (
      <section key={key} aria-label={heading}>
        <Title className={Heading === "h2" ? "text-lg font-semibold" : "text-base font-semibold"}>
          {heading}
        </Title>
        <div className="divide-y divide-border">
          {fields.map((d) => (
            <FieldRow
              key={d.path}
              d={d}
              disabled={inFlight.has(d.path)}
              onCommitValue={runWrite}
              onRevert={runReset}
              onPromote={runPromote}
              isChildBrand={isChildBrand}
              parentName={parentName}
              onResetToParent={runResetToParent}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link href="/" className={cn(MUTED_ACTION, "text-sm")}>
        ← Back
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Design tokens</h1>
      <div className="mt-6 flex gap-8">
        <nav aria-label="Design system sections" className="w-44 shrink-0">
          <ul className="flex flex-col gap-1">
            {sidebarItems.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setSelectedView(item.key)}
                  aria-current={selectedView === item.key ? "page" : undefined}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm font-medium",
                    FOCUS_RING,
                    // NOTE: surface* utilities are unusable on this route.
                    // --color-surface-* vars exist only under [data-theme] scopes,
                    // and /design-system renders outside StudioShell's data-theme
                    // div (base :root scope), where they resolve to transparent.
                    // Foreground/background/state vars are bare :root tokens, so
                    // they paint in every scope.
                    selectedView === item.key
                      ? "bg-foreground text-background"
                      : "text-foreground/80 hover:bg-[color-mix(in_srgb,var(--foreground)_var(--state-hover-opacity),transparent)]",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">
          {selectedView === "all" ? (
            <>
              <p className="mt-1 text-sm text-surface-text/70">
                Live brand values for the default brand. Edits write to <code>tokens.json</code> and
                rebuild the stylesheet immediately.
              </p>
              <p className="mt-1 text-sm text-surface-text/70">
                Note: this edits the brand&apos;s base values, and these previews render them as-is. The
                running app renders the dark theme only, so base colors with dark overrides look different
                there — theme-invariant tokens like <code>accent</code> update live everywhere.
              </p>

              {/* Seed generation and reset-all are root-brand actions: the route
                  rejects both for child brands (no seeding into a sparse tree,
                  no defaults file to reset to), so hide them rather than offer
                  buttons that can only fail. */}
              {!isChildBrand && (
              <>
              <section aria-label="Generate from seed colors" className="mt-6">
                <h2 className="text-lg font-semibold">Generate from seed colors</h2>
                <p className={cn(CAPTION, "mt-1")}>
                  Pick a neutral seed and an accent seed to regenerate all 18 brand colors at once.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <ColorField
                    label="Neutral seed"
                    value={neutralSeed}
                    onChange={setNeutralSeed}
                    disabled={generateBusy}
                  />
                  <ColorField
                    label="Accent seed"
                    value={accentSeed}
                    onChange={setAccentSeed}
                    disabled={generateBusy}
                  />
                  <Button
                    variant="secondary"
                    disabled={generateBusy || !seedsValid}
                    onClick={runGenerate}
                  >
                    {generateBusy ? "Generating…" : "Generate from seeds"}
                  </Button>
                </div>
                {!seedsValid && (
                  <p className={cn(CAPTION, "mt-1")}>Seeds must be 6-digit hex colors like #rrggbb.</p>
                )}
              </section>

              <div className="mt-4 flex items-center gap-3">
                <Button variant="secondary" disabled={resetBusy} onClick={runResetAll}>
                  {resetArmed
                    ? `Confirm reset of ${modifiedPaths.length} changed field${modifiedPaths.length === 1 ? "" : "s"}?`
                    : "Reset all changes"}
                </Button>
                {feedback && (
                  <p aria-live="polite" className="text-sm text-surface-text/70">
                    {feedback}
                  </p>
                )}
              </div>
              </>
              )}

              {error && (
                <p aria-live="polite" role="alert" className="mt-3 text-sm text-red-500">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-8">
                {flat.map((s) => renderSection(s.key, "h2", s.heading))}
                <section aria-label="Components">
                  <h2 className="text-lg font-semibold">Components</h2>
                  <div className="mt-2 flex flex-col gap-6">
                    {grouped.map((s) => renderSection(s.key, "h3", s.heading))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            selectedSection && (
              <>
                {pendingEdits.size > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                    <SegmentedControl
                      options={[
                        { value: "exception", label: "Exception" },
                        { value: "brand", label: "Brand-wide" },
                      ]}
                      value={bulkScope}
                      onChange={(v) => setBulkScope(v as "exception" | "brand")}
                      ariaLabel="Default scope for new edits"
                    />
                    <Button variant="primary" disabled={saveBusy} onClick={runSaveAll}>
                      {saveBusy ? "Saving…" : `Save changes (${pendingEdits.size})`}
                    </Button>
                    <Button variant="secondary" disabled={saveBusy} onClick={discardAllPending}>
                      Discard changes
                    </Button>
                  </div>
                )}
                <ComponentDetailView
                  sectionKey={selectedView}
                  heading={selectedSection.heading}
                  fields={fieldsFor(selectedView)}
                  disabledPaths={inFlight}
                  saveBusy={saveBusy}
                  pendingEdits={pendingEdits}
                  onStage={stageEdit}
                  onRevert={runReset}
                  onPromote={runPromote}
                  onDiscardPending={discardPendingEdit}
                  onSetScope={setPendingScope}
                  isChildBrand={isChildBrand}
                  parentName={parentName}
                  onResetToParent={runResetToParent}
                  error={error}
                  feedback={feedback}
                />
              </>
            )
          )}
        </div>
      </div>
    </main>
  );
}
