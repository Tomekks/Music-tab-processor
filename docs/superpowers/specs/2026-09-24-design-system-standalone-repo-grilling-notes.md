# Design system → standalone/local-only: grilling notes (open, not decided)

Parked mid-interview (`/grill-with-docs`) on 2026-09-24 to go work on Control Center instead. Picking this back up is a **next task**, not decided architecture yet — nothing below should be treated as settled beyond what's marked "Settled."

## Premise

The design system should not be visible on GitHub as its own machinery. Each consuming app (web app, design system's own future control center, a show app, etc.) should see only its own brand's resolved values — not other brands, not the design-system tooling itself. Distribution stays CSS-only, always-latest (already settled — `docs/adr/0001-brand-management-architecture.md`).

## Settled in this session

- **Q1 = A**: the package stays physically nested inside this repo (`app/packages/design-system/`) for now — no move to a sibling directory or a real second git repo yet. Smallest change; doesn't foreclose B/C later.
- **Q2**: each deployed consumer needs exactly one brand's compiled CSS baked in at publish time — no runtime brand-switching in production. Confirmed via the user's own framing: every app/project "uses a specific brand and does not need to see other brands or have any design system machinery available."
- This confirms the scope is **bigger than just gitignoring `brands/`** — the user's Q2 answer implies the whole package's *machinery* (not just token data) should be invisible to a consumer, not only its data.

## Open questions (frontier when parked)

**Q3 — how much of `app/packages/design-system/` goes local-only:**
Just the data (`brands/`, `active-brand.json`), with build tooling (`build-tokens.mjs`, `resolve.mjs`, etc.) staying committed as ordinary app code — or the entire package (data + editor React components + build script), leaving only the generated CSS committed? Leaning toward "entire package," per the Q2 answer, but not decided.

**Q4 — the in-app editor's Next.js routes:**
`app/app/design-system/page.tsx` and `app/app/api/design-system/*` live in the *main app tree*, not inside the package, and currently ship to Vercel (harmlessly broken there, since `brands/` won't exist server-side). Should these stop being committed/deployed entirely (dev-only), or is shipping dead admin routes acceptable?

## Facts gathered (still true, don't re-derive)

- `app/package.json`'s `predev`/`prebuild`/`prestage` all run `tokens:build` → `build-tokens.mjs` → `resolveBrandDir()` (reads `active-brand.json` → `brands/<slug>`) → writes `app/design-tokens.generated.css`, which `app/globals.css` `@import`s. This is the one point of consumption.
- `design-tokens.generated.css` is already gitignored (rebuilt every build); `brands/` itself is currently **tracked** in git for `default` and `demo-child` (contradicts the "local-only" goal — this is the thing to fix).
- `.needs-deploy` per-brand flag files (Task 4.6) are already gitignored and orthogonal to whether `brands/` itself is tracked — no changes needed there.
- Vercel builds from a git checkout only — it has no access to files that exist solely on the local Mac. Whatever Vercel needs at build time must be committed.
- `docs/adr/0001-brand-management-architecture.md` already anticipates the design system becoming a standalone repo eventually, with this app becoming "one more consumer" — this task is about turning that expectation into a real mechanism, not a new idea.

## Related

- `docs/adr/0001-brand-management-architecture.md` (distribution model, already settled)
- `CONTEXT.md` (Brand / Main brand / Child brand vocabulary — no new terms crystallized yet from this session)
- `app/status/design-system.md`
- BACKLOG.md item 14 (design-system, in-progress parent item)
