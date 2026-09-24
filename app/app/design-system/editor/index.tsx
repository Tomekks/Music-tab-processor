"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ColorField, SegmentedControl } from "@guitar-tabs/design-system";
import { SECTIONS, humanize } from "../../../packages/design-system/src/field-descriptors.mjs";
import type { FieldDescriptor } from "../../../packages/design-system/src/field-descriptors.mjs";
import { cn } from "@/lib/cn";
import { FOCUS_RING, MUTED_ACTION, CAPTION } from "./styles";
import { FieldRow, ComponentDetailView, type ComponentSectionKey } from "./field-row";
import { BrandSwitcher } from "./brand-switcher";
import { useEditorActions } from "./actions";

export function Editor({
  descriptors,
  isChildBrand,
  parentName,
  brands,
  selectedBrand,
  needsDeploy,
}: {
  descriptors: FieldDescriptor[];
  isChildBrand: boolean;
  parentName: string | null;
  brands: string[];
  selectedBrand: string;
  needsDeploy: Record<string, boolean>;
}) {
  const [selectedView, setSelectedView] = useState<"all" | ComponentSectionKey>("all");
  const {
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
  } = useEditorActions(descriptors, selectedBrand);

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
              onSetDescription={runSetDescription}
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
      <BrandSwitcher
        brands={brands}
        selectedBrand={selectedBrand}
        needsDeploy={needsDeploy}
        blocked={pendingEdits.size > 0 || inFlight.size > 0}
        blockedReason={
          pendingEdits.size > 0
            ? "Save or discard your pending changes before switching brands"
            : inFlight.size > 0
              ? "Wait for the current change to finish saving"
              : undefined
        }
        onError={setError}
      />
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
                    // NOTE: this route is themed via ThemeProvider (on
                    // documentElement) like every other route.
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
                Live brand values for {humanize(selectedBrand)}. Edits write to <code>tokens.json</code> and
                rebuild the stylesheet immediately.
              </p>
              <p className="mt-1 text-sm text-surface-text/70">
                Note: this edits the brand&apos;s base values, and these previews render them as-is. The
                running app follows the header&apos;s Light/Dark toggle — base values in light mode,
                dark overrides in dark mode — and theme-invariant tokens like <code>accent</code> update
                live everywhere.
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
                  onSetDescription={runSetDescription}
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
