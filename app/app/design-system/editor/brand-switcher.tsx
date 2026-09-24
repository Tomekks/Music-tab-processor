import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { humanize } from "../../../packages/design-system/src/field-descriptors.mjs";
import { cn } from "@/lib/cn";
import { FOCUS_RING, MUTED_ACTION, CAPTION } from "./styles";
import { postAction } from "./actions";

export function BrandSwitcher({
  brands,
  selectedBrand,
  blocked,
  blockedReason,
  onError,
}: {
  brands: string[];
  selectedBrand: string;
  blocked: boolean;
  blockedReason: string | undefined;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [brandAction, setBrandAction] = useState<"new" | "duplicate" | "delete" | null>(null);
  const [brandActionInput, setBrandActionInput] = useState("");
  const [brandActionBusy, setBrandActionBusy] = useState(false);
  const brandActionInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (brandAction) brandActionInputRef.current?.focus();
  }, [brandAction]);

  function cancelBrandAction() {
    setBrandAction(null);
    setBrandActionInput("");
  }

  async function submitBrandAction() {
    if (brandAction === "new" || brandAction === "duplicate") {
      setBrandActionBusy(true);
      onError(null);
      try {
        const result = await postAction(
          brandAction === "new"
            ? { action: "create-brand", name: brandActionInput }
            : { action: "duplicate-brand", name: brandActionInput, source: selectedBrand },
        );
        if (result.ok) {
          router.push(`/design-system?brand=${(result as { slug: string }).slug}`);
        } else {
          onError(result.error);
        }
      } finally {
        setBrandActionBusy(false);
      }
      return;
    }
    if (brandAction === "delete") {
      setBrandActionBusy(true);
      onError(null);
      try {
        const result = await postAction({ action: "delete-brand", brand: selectedBrand });
        if (result.ok) {
          router.push("/design-system?brand=default");
        } else {
          onError(result.error);
        }
      } finally {
        setBrandActionBusy(false);
      }
    }
  }

  function renderBrandActionRow() {
    if (brandAction === null) {
      return (
        <>
          <button
            type="button"
            disabled={blocked}
            title={blockedReason}
            onClick={() => setBrandAction("new")}
            className={cn(MUTED_ACTION, "text-sm")}
          >
            New brand
          </button>
          <button
            type="button"
            disabled={blocked}
            title={blockedReason}
            onClick={() => setBrandAction("duplicate")}
            className={cn(MUTED_ACTION, "text-sm")}
          >
            Duplicate this brand
          </button>
          {selectedBrand !== "default" && (
            <button
              type="button"
              disabled={blocked}
              title={blockedReason}
              onClick={() => setBrandAction("delete")}
              className={cn(MUTED_ACTION, "text-sm")}
            >
              Delete this brand
            </button>
          )}
        </>
      );
    }

    if (brandAction === "delete") {
      return (
        <>
          <span className={CAPTION}>
            {`Type "${selectedBrand}" to confirm — the brand's short name, not "${humanize(selectedBrand)}"`}
          </span>
          <input
            ref={brandActionInputRef}
            type="text"
            value={brandActionInput}
            onChange={(e) => setBrandActionInput(e.target.value)}
            aria-label="Type brand name to confirm deletion"
            className={cn(CAPTION, "min-w-0 flex-1 border-b border-transparent focus:border-border", FOCUS_RING)}
          />
          <button
            type="button"
            disabled={brandActionInput !== selectedBrand || brandActionBusy}
            onClick={submitBrandAction}
            className={cn(MUTED_ACTION, "text-sm")}
          >
            {brandActionBusy ? "Deleting…" : "Confirm delete"}
          </button>
          <button type="button" onClick={cancelBrandAction} className={cn(MUTED_ACTION, "text-sm")}>
            Cancel
          </button>
        </>
      );
    }

    // brandAction is "new" or "duplicate"
    return (
      <>
        <input
          ref={brandActionInputRef}
          type="text"
          value={brandActionInput}
          onChange={(e) => setBrandActionInput(e.target.value)}
          placeholder={brandAction === "new" ? "Untitled brand" : undefined}
          aria-label={brandAction === "new" ? "New brand name" : "Duplicate brand name"}
          className={cn(CAPTION, "min-w-0 flex-1 border-b border-transparent focus:border-border", FOCUS_RING)}
        />
        <button
          type="button"
          disabled={brandActionBusy}
          onClick={submitBrandAction}
          className={cn(MUTED_ACTION, "text-sm")}
        >
          {brandActionBusy ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={cancelBrandAction} className={cn(MUTED_ACTION, "text-sm")}>
          Cancel
        </button>
      </>
    );
  }

  return (
    <>
      <nav aria-label="Brands" className="mt-4 flex flex-wrap items-center gap-3">
        {brands.map((slug) => {
          if (slug === selectedBrand) {
            return (
              <span key={slug} aria-current="page" className="text-sm font-semibold">
                {humanize(slug)}
              </span>
            );
          }
          if (blockedReason) {
            return (
              <span
                key={slug}
                title={blockedReason}
                className={cn(MUTED_ACTION, "text-sm cursor-not-allowed opacity-[var(--state-disabled-opacity)]")}
              >
                {humanize(slug)}
              </span>
            );
          }
          return (
            <Link key={slug} href={`/design-system?brand=${slug}`} className={cn(MUTED_ACTION, "text-sm")}>
              {humanize(slug)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">{renderBrandActionRow()}</div>
    </>
  );
}
