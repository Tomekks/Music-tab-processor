"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ColorField, Slider } from "@guitar-tabs/design-system";
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

async function postAction(body: Record<string, string>): Promise<ApiResult> {
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
  disabled,
  commit,
}: {
  d: FieldDescriptor;
  disabled: boolean;
  commit: (value: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(d.value);
  useEffect(() => {
    const varName = cssVarNameForPath(d.path)!;
    document.documentElement.style.setProperty(varName, text);
    return () => {
      document.documentElement.style.removeProperty(varName);
    };
  }, [text, d.path]);
  const commitIfChanged = async () => {
    if (text !== d.value) {
      const ok = await commit(text);
      if (!ok) setText(d.value);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void commitIfChanged();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void commitIfChanged();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setText(d.value);
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
  range,
  disabled,
  commit,
}: {
  d: FieldDescriptor;
  range: Range;
  disabled: boolean;
  commit: (value: string) => Promise<boolean>;
}) {
  const initial = parseFloat(d.value);
  const [num, setNum] = useState(Number.isFinite(initial) ? initial : range.min);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
              const reverted = parseFloat(d.value);
              setNum(Number.isFinite(reverted) ? reverted : range.min);
            }
          }, 200);
        }}
      />
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
}: {
  d: FieldDescriptor;
  disabled: boolean;
  onCommitValue: (path: string, value: string) => Promise<boolean>;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
}) {
  const range = rangeFor(d);
  const control =
    d.$type === "color" ? (
      <ColorRow d={d} disabled={disabled} commit={(value) => onCommitValue(d.path, value)} />
    ) : range !== null ? (
      <SliderRow
        d={d}
        range={range}
        disabled={disabled}
        commit={(value) => onCommitValue(d.path, value)}
      />
    ) : (
      <div>
        <p className="text-sm font-medium">{d.label}</p>
        <p className="text-sm text-surface-text/70">{d.value}</p>
      </div>
    );
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">{control}</div>
      {d.isModified && (
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRevert(d.path)}
            aria-label={`Revert ${d.label} to default`}
            className={MUTED_ACTION}
          >
            Revert
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPromote(d.path)}
            aria-label={`Set ${d.label} as new default`}
            className={MUTED_ACTION}
          >
            Set as default
          </button>
        </div>
      )}
    </div>
  );
}

export function Editor({ descriptors }: { descriptors: FieldDescriptor[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<Set<string>>(() => new Set());
  const [resetArmed, setResetArmed] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
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
              key={`${d.path}:${d.value}`}
              d={d}
              disabled={inFlight.has(d.path)}
              onCommitValue={runWrite}
              onRevert={runReset}
              onPromote={runPromote}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <Link href="/" className={cn(MUTED_ACTION, "text-sm")}>
        ← Back
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Design tokens</h1>
      <p className="mt-1 text-sm text-surface-text/70">
        Live brand values for the default brand. Edits write to <code>tokens.json</code> and
        rebuild the stylesheet immediately.
      </p>
      <p className="mt-1 text-sm text-surface-text/70">
        Note: this edits the brand&apos;s base values, and these previews render them as-is. The
        running app renders the dark theme only, so base colors with dark overrides look different
        there — theme-invariant tokens like <code>accent</code> update live everywhere.
      </p>

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
    </main>
  );
}
