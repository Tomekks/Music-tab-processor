import { useEffect, useRef, useState } from "react";
import { Button, ColorField, SegmentedControl, Slider } from "@guitar-tabs/design-system";
import type { FieldDescriptor } from "../../../packages/design-system/src/field-descriptors.mjs";
import { cssVarNameForPath } from "../../../packages/design-system/src/css-var-naming.mjs";
import { cn } from "@/lib/cn";
import { UNIT, FOCUS_RING, MUTED_ACTION, CAPTION } from "./styles";
import type { PendingEdit } from "./actions";

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

// Dark-value's own Revert/Set-as-default never involves staging, child-brand
// inheritance, or scope override — reusing FieldRow wholesale would drag in
// all of that conditional logic for a case that can never need it. A
// focused sibling component keeps the diff small and the dark column's
// behavior obviously simple.
function DarkValueColumn({
  d,
  disabled,
  onCommitValue,
  onRevert,
  onPromote,
}: {
  d: NonNullable<FieldDescriptor["dark"]>;
  disabled: boolean;
  onCommitValue: (path: string, value: string) => Promise<boolean>;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
}) {
  // ColorRow needs a full FieldDescriptor shape -- every dark leaf is $type
  // "color" (all 8 today are under semantic.color), so this cast is safe,
  // not a workaround for a real type mismatch.
  const asDescriptor: FieldDescriptor = {
    path: d.path,
    section: "semantic.color",
    label: "Dark",
    $type: "color",
    value: d.value,
    rawValue: d.rawValue,
    isModified: d.isModified,
    isAlias: d.isAlias,
    isInheritedFromParent: false,
    description: "",
  };
  return (
    <div className="min-w-0 flex-1">
      <ColorRow d={asDescriptor} baseline={d.value} disabled={disabled} commit={(v) => onCommitValue(d.path, v)} />
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
      {d.isModified && (
        <div className="mt-1 flex items-center gap-2">
          <button type="button" disabled={disabled} onClick={() => onRevert(d.path)} className={MUTED_ACTION}>
            Revert
          </button>
          <button type="button" disabled={disabled} onClick={() => onPromote(d.path)} className={MUTED_ACTION}>
            Set as default
          </button>
        </div>
      )}
    </div>
  );
}

// A description isn't a token value -- no scope, no staging, no inheritance
// concept -- so its save is always immediate and independent of Task 8's
// pending-edit model, regardless of which FieldRow call site renders it.
function DescriptionRow({
  d,
  onSave,
}: {
  d: FieldDescriptor;
  onSave: (path: string, description: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(d.description);
  const [saving, setSaving] = useState(false);
  // Adopt an externally-changed description (a successful save triggers
  // router.refresh(), updating d.description) without remounting. Adjusted
  // during render (not in an effect): setState in an effect trips the
  // cascading-render lint rule — same render-adjust pattern ColorRow and
  // SliderRow already use, above.
  const [syncedSource, setSyncedSource] = useState(d.description);
  if (syncedSource !== d.description) {
    setSyncedSource(d.description);
    setText(d.description);
  }
  const dirty = text !== d.description;
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        placeholder="Where is this used?"
        aria-label={`Description for ${d.label}`}
        className={cn(
          CAPTION,
          "min-w-0 flex-1 border-b border-transparent bg-transparent focus:border-border",
          FOCUS_RING,
        )}
      />
      {dirty && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(d.path, text);
            setSaving(false);
          }}
          className={MUTED_ACTION}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

export function FieldRow({
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
  onSetDescription,
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
  onSetDescription: (path: string, description: string) => Promise<boolean>;
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
        <DescriptionRow d={d} onSave={onSetDescription} />
      </div>
      {d.dark && (
        <DarkValueColumn
          d={d.dark}
          disabled={disabled}
          onCommitValue={onCommitValue!}
          onRevert={onRevert}
          onPromote={onPromote}
        />
      )}
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

export type ComponentSectionKey =
  | "component.colorField"
  | "component.slider"
  | "component.segmentedControl"
  | "component.button";

export function ComponentPreview({ sectionKey }: { sectionKey: ComponentSectionKey }) {
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

export function ComponentDetailView({
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
  onSetDescription,
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
  onSetDescription: (path: string, description: string) => Promise<boolean>;
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
            onSetDescription={onSetDescription}
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
