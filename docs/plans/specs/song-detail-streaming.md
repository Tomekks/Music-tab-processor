# Spec B — Stream the detail pane with Suspense

## 1. Scope

- `app/app/_components/SongDetail.tsx` (**new**): async server component `SongDetail({ selectedId })` that runs the full-song query and renders `SongDetailPane`; plus a pure presentational `SongDetailSkeleton` (header shape: art block + two text lines, no props).
- `app/lib/songs.ts`: add cached `getSongById(id)` (`revalidate: 60`, tag `song-detail`, same reasoning as Spec A) returning the full song row or `undefined`.
- `app/app/page.tsx`: render the sidebar immediately from the cached list (Spec A); wrap the detail region in `<Suspense fallback={<SongDetailSkeleton/>}>` rendering `<SongDetail selectedId={...}/>`. The existing `selectedId` derivation (incl. invalid-`?song=` fallback to most recent) moves unchanged — it only needs the cached list.
- No `.env`/credential contact.

## 2. Non-goals

- No loading UI for the sidebar (fast post-Spec-A; blanking it would defeat the purpose).
- No change to `SongDetailPane`/`StudioTabs` props or the `key={song.id}` remount (deliberate per-song reset, stays).
- No client-side data fetching (the rejected option C).
- No error boundary (see table below).

## 3. Interface

```tsx
// app/app/_components/SongDetail.tsx
export async function SongDetail({ selectedId }: { selectedId: string | null });
export function SongDetailSkeleton();
```

```ts
// app/lib/songs.ts (addition to Spec A's module)
export function getSongById(id: string): Promise<FullSong | undefined>;
```

`FullSong` is the existing `typeof songs.$inferSelect` (same type `SongDetailPane` already takes as `song`).

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Invalid/stale `?song=` | Same fallback as today (most recent song), derived from cached list |
| No songs at all (`selectedId null`) | Renders `SongDetailPane song={null}` → "Choose a song from the list" |
| Detail query throws | Same failure mode as the current page (no error boundary today, not adding one) |
| Slow detail query | Sidebar interactive immediately; skeleton shows in detail region only |

## 5. Forbidden patterns

- No `loading.tsx` at the route level — that blanks the *whole* page including the sidebar, the opposite of the goal.
- No fetching inside the client tree (`StudioTabs` and below stay pure props-in).
- No prop-shape changes to `SongDetailPane`, `StudioTabs`, `SongListSidebar`, or `StudioShell`.
- No `useDeferredValue`/fallback-delay inventions: if the skeleton flashes distractingly on fast resolves, stop and ask (see stop-conditions) instead of inventing a variant.

## 6. File allowlist

- `app/app/_components/SongDetail.tsx` (new)
- `app/lib/songs.ts`
- `app/app/page.tsx`

## 7. Acceptance criteria

- `cd app && npm run verify` passes.
- `npx playwright test` (e2e: body visible, zero console errors) unaffected — the skeleton must render without errors.
- Staging click-through (`npm run stage`, `:3001`): clicking a song updates the sidebar selection immediately with the detail streaming in, vs today's all-at-once ~0.3–1.0s frozen swap. Check all 3 songs.

## 8. Definition of done

`npm run verify` passes + e2e passes + `git diff --stat` matches the allowlist (+1 new file) + manual staging click-through of all 3 songs + checkpoint commit (ask-first) + the standing three-way push/deploy question at the very end (per `AGENTS.md`).

## 9. Stop-conditions

- If the skeleton flashes on every click distractingly (detail usually resolves in <100ms post-cache), stop and ask about deferring the fallback — don't invent a variant unprompted.
- If e2e flakes on streamed content, stop — fix-spec, no second unsupervised attempt (per `WEB_APP_WORKFLOW.md` §5 step 6).
- If anything wants a `contracts/` edit, stop — that's its own explicit task.
