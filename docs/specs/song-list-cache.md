# Spec A — Cache the song-list query

## 1. Scope

- `app/lib/songs.ts` (**new**): cached data-access module. `getSongList()` wraps the sidebar's existing column-projected Drizzle select in `unstable_cache` from `next/cache` with `revalidate: 60` and tag `songs-list`.
- `app/app/page.tsx`: call `getSongList()` for the sidebar list instead of the inline `db.select(...)`.
- Why `unstable_cache`: `app/next.config.ts` does **not** enable `cacheComponents`, so this app runs in legacy caching mode where `unstable_cache` is the supported API (not the `use cache` directive). Confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`.
- Why `revalidate: 60`: time-based, not deploy-scoped. `unstable_cache`'s backing store on Vercel is not confirmed to clear on redeploy, so depending on deploy timing is an unconfirmed assumption — a 60s window sidesteps it entirely. Songs change only via manual `publish.py` runs, so ≤60s staleness is a non-issue.
- No `.env`/credential contact. No change to `db/client.ts`.

## 2. Non-goals

- No Cache Components migration.
- No revalidate endpoint, no `publish.py` hookup, no `revalidateTag`/`revalidatePath` calls (tag is reserved for future use only).
- No change to what the list selects (same columns, same `desc(createdAt)` order).
- No client-side fetching.

## 3. Interface

```ts
// app/lib/songs.ts
export type SongListEntry = {
  id: string;
  title: string;
  artist: string | null;
  tempoBpm: number;
  coverArtUrl: string | null;
  spotifyArtist: string | null;
};
export function getSongList(): Promise<SongListEntry[]>;
```

Same shape as today's inline select. The `?? undefined` adaptation for `SongListItem` props stays at the call site in `page.tsx`, unchanged.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| First request after deploy (cold cache) | One ~445ms Turso hit, then cached; identical data |
| Song published, no redeploy | Sidebar reflects it within ~60s (cache naturally expires) |
| Empty table | Same as today: "No songs published yet" |

## 5. Forbidden patterns

- No bare `except`/swallowed errors; no `revalidate: false` (time-based `revalidate: 60` is the required approach).
- No touching `TURSO_*` handling in `db/client.ts`.
- No `loading.tsx` at the route level (that's Spec B's territory, and route-level loading would blank the sidebar too).

## 6. File allowlist

- `app/lib/songs.ts` (new)
- `app/app/page.tsx`

## 7. Acceptance criteria

- `cd app && npm run verify` passes (typecheck → lint → unit tests).
- Staging comparison: `npm run stage`, curl `http://localhost:3001/?song=<id>` before/after — navigation should be faster by roughly the list-query cost (~445ms). **Measure on `:3001`, not dev `:3000`** — dev bypasses the data cache, so dev numbers prove nothing.

## 8. Definition of done

`npm run verify` passes + `git diff --stat` matches the allowlist (+1 new file) + staging timing comparison recorded + checkpoint commit (ask-first per `AGENTS.md`).

## 9. Stop-conditions

- If staging shows no improvement (cache not engaging under `force-dynamic`), stop and ask — don't layer on Cache Components unprompted.
- If `unstable_cache` import/typecheck fails against Next 16.3.4 (API removed, not just deprecated), stop and ask.
- If anything wants a `contracts/` edit, stop — that's its own explicit task.
