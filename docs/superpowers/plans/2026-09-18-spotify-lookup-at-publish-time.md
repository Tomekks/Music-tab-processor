# Spotify Lookup At Publish Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix slow song-switching on the deployed app by moving Spotify metadata lookup from "live, on every page request, for every song in the sidebar" to "once, at publish time, stored in the database" — eliminating 6+ live Spotify API round-trips per navigation.

**Architecture:** Add three nullable columns (`coverArtUrl`, `spotifyArtist`, `spotifyUrl`) to the `songs` table. `pipeline/s05_publish/publish.py` gains a small Python port of `app/lib/spotify.ts`'s Client Credentials lookup, called once per publish, writing the result into those columns. `app/app/page.tsx` stops calling Spotify at request time entirely and just reads the stored columns. `app/lib/spotify.ts` becomes fully unused by this change and is deleted (not left as orphaned dead code).

**Tech Stack:** Drizzle ORM schema change + `drizzle-kit push` (no migration files exist in this repo yet — schema changes are pushed directly, matching existing convention), Python `requests` (already installed, no new dependency), Next.js Server Component (existing).

**Spec:** No separate spec file — classified as a **bounded** task (existing, well-scoped data flow) during `superpowers:brainstorming`; the design was approved in-chat ("ok") and is fully captured here.

## Global Constraints

- Only touch `app/db/schema.ts`, `pipeline/s01_ingest/ingest.py`, `pipeline/s04_tab/tab_generate.py`, `pipeline/s05_publish/publish.py`, `app/app/page.tsx`, `app/app/_components/SongListRow.tsx`, `app/app/_components/SongDetailPane.tsx`, `.env.local` (root, additive only), `pipeline_runs/shame-20260918-183654/metadata.json`, `pipeline_runs/shame-20260918-183654/tab.json`, and delete `app/lib/spotify.ts`. No other file changes.
- `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` values are never printed to chat or logged — only copied file-to-file via a redirect, same as this repo's existing convention for the Turso credentials duplicated between root and `app/` `.env.local` (see `pipeline/VERIFY.md`'s "Environment notes").
- `npm run verify` must still pass after `app/lib/spotify.ts` is removed (no remaining import of it anywhere).
- Existing published songs (Mister Sandman, Seven Nation Army, Shame) must be re-published so their new columns are backfilled — not left `NULL` until their next unrelated pipeline run.
- **Root cause note (2026-09-19):** the "Shame" run's stored `title` is wrong — the source file was `Friction - Shame.m4a` (song "Friction" by artist "Shame"), but the pipeline captured no artist field at all and the run ended up titled "Shame" instead of "Friction". This is why Spotify metadata for it was wrong: a bare `track:Shame` search (no artist to disambiguate) matches whatever track Spotify ranks highest for that word, not necessarily this one. Task 0 below fixes the pipeline's capture going forward and corrects this one run's stored data; Task 2 (below) is updated to pass the real artist into the Spotify search instead of `None`.

---

### Task 0: Capture artist through ingest → tab, and correct the existing "Shame" run

**Files:**
- Modify: `pipeline/s01_ingest/ingest.py`
- Modify: `pipeline/s04_tab/tab_generate.py`
- Modify: `pipeline_runs/shame-20260918-183654/metadata.json`, `pipeline_runs/shame-20260918-183654/tab.json` (data correction only, not a code change)

**Interfaces:**
- Produces: `metadata.json`'s `"artist"` key (string or `null`), read by `tab_generate.py`.
- Produces: `tab.json`'s `"artist"` key (string or `null`), consumed by Task 2's `publish()` call (below) in place of the current hardcoded `None`.

**Context:** source filenames in this project follow a `Title - Artist.ext` convention (e.g. `Friction - Shame.m4a`), but embedded file metadata/ID3 tags are not guaranteed to be present or correct, so title/artist must be derived from an explicit flag or the filename itself — never trusted from ID3.

- [ ] **Step 1: Add artist capture to `ingest.py`**

Add an `--artist` flag alongside the existing `--title`. When neither `--title` nor `--artist` is given, parse the filename stem against the `Title - Artist` convention (split on the *last* ` - ` separator, since a title itself may contain a hyphen): if it matches, title is the part before the separator and artist is the part after; if it doesn't match, fall back to today's behavior (whole stem as title, artist `null`). An explicitly passed `--title` and/or `--artist` always wins over filename parsing for that field.

Update `ingest()`'s signature to `ingest(source_path, title=None, artist=None)`, write `"artist"` into `metadata.json` (string or `null`), and thread the new `--artist` CLI flag through `main()`.

- [ ] **Step 2: Pass artist through in `tab_generate.py`**

Mirror the existing `title` read (line ~116-119): read `artist` from `metadata.json` the same way (default `None` if the key is missing or the file predates this change), and add `"artist": artist` to the dict written at line ~145, alongside the existing `"title": title`.

- [ ] **Step 3: Correct the existing "Shame" run's stored data**

Directly edit (not re-ingest — re-ingesting would create a new run directory and orphan the old one):
- `pipeline_runs/shame-20260918-183654/metadata.json`: change `"title"` from `"Shame"` to `"Friction"`, add `"artist": "Shame"`.
- `pipeline_runs/shame-20260918-183654/tab.json`: change `"title"` from `"Shame"` to `"Friction"`, add `"artist": "Shame"`.

The run directory and `songs.id` keep the slug `shame-...` — that's just an internal identifier, not the display title, and renaming it would require re-publishing under a new primary key for no benefit.

- [ ] **Step 4: Verify ingest still works for a run with no `Title - Artist` pattern in its filename**

Run the existing pipeline unit tests for this stage if any exist (`pipeline/s01_ingest/test_ingest.py`); confirm they still pass, and that a filename with no ` - ` in it (e.g. `MisterSandman.m4a`) still falls back to whole-stem-as-title, artist `null` — not a broken split.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
git add pipeline/s01_ingest/ingest.py pipeline/s04_tab/tab_generate.py "pipeline_runs/shame-20260918-183654/metadata.json" "pipeline_runs/shame-20260918-183654/tab.json"
git commit -m "Capture artist through ingest/tab pipeline; correct Shame run's title/artist"
```

---

### Task 1: Add the three columns to the `songs` table

**Files:**
- Modify: `app/db/schema.ts`

**Interfaces:**
- Produces: `songs.coverArtUrl` (`text`, nullable), `songs.spotifyArtist` (`text`, nullable), `songs.spotifyUrl` (`text`, nullable) — consumed by Task 2 (publish.py's INSERT) and Task 3 (page.tsx's read).

- [ ] **Step 1: Add the columns**

In `app/db/schema.ts`, change:

```ts
export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(), // the pipeline run-id (e.g. "mister-sandman-20260907-161918")
  title: text("title").notNull(),
  artist: text("artist"),
  tempoBpm: real("tempo_bpm").notNull(),
  tuning: text("tuning", { mode: "json" }).$type<number[]>().notNull(),
  notes: text("notes", { mode: "json" })
    .$type<{ string: number; fret: number; startTimeSec: number; durationSec: number }[]>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

to:

```ts
export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(), // the pipeline run-id (e.g. "mister-sandman-20260907-161918")
  title: text("title").notNull(),
  artist: text("artist"),
  tempoBpm: real("tempo_bpm").notNull(),
  tuning: text("tuning", { mode: "json" }).$type<number[]>().notNull(),
  notes: text("notes", { mode: "json" })
    .$type<{ string: number; fret: number; startTimeSec: number; durationSec: number }[]>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  // Spotify metadata (2026-09-18), fetched once at publish time
  // (pipeline/s05_publish/publish.py) instead of live on every page request --
  // see docs/superpowers/plans/2026-09-18-spotify-lookup-at-publish-time.md
  // for why. All nullable: absent with no Spotify credentials configured, or
  // if Spotify had no match for this song, same degrade-gracefully rule as
  // the old live-lookup had.
  coverArtUrl: text("cover_art_url"),
  spotifyArtist: text("spotify_artist"),
  spotifyUrl: text("spotify_url"),
});
```

- [ ] **Step 2: Push the schema change to the real database**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor/app && npx drizzle-kit push`
Expected: prompts to confirm adding 3 nullable columns to the existing `songs` table (a purely additive change, no data loss); confirm yes. This talks to the real hosted Turso database — same one the deployed app reads from.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor/app && npm run typecheck`
Expected: PASS (schema-only change, nothing references the new columns yet).

- [ ] **Step 4: Commit**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
git add app/db/schema.ts
git commit -m "Add coverArtUrl/spotifyArtist/spotifyUrl columns to songs table"
```

---

### Task 2: Fetch and store Spotify metadata at publish time

**Files:**
- Modify: `pipeline/s05_publish/publish.py`
- Modify: `.env.local` (repo root) — additive only, copies 2 existing lines from `app/.env.local`

**Interfaces:**
- Consumes: `songs.coverArtUrl`/`spotifyArtist`/`spotifyUrl` columns from Task 1; `tab_data["artist"]` from Task 0 (string or `None`).
- Produces: nothing new for other files — `publish(run_dir)`'s own signature and return value (`run_id`) are unchanged, this only adds to what it writes into the DB row.

- [ ] **Step 1: Copy the Spotify credentials into the root `.env.local`**

`pipeline/s05_publish/publish.py`'s `_load_env()` only reads the repo-root `.env.local`, which doesn't currently have `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` (only `app/.env.local` does). Copy just those two lines over, without printing their values to the terminal:

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
grep "^SPOTIFY_CLIENT_ID=\|^SPOTIFY_CLIENT_SECRET=" app/.env.local >> .env.local
```

Verify the keys landed (not their values):

```bash
grep -o "^SPOTIFY_CLIENT_ID=\|^SPOTIFY_CLIENT_SECRET=" .env.local
```

Expected: both key names print.

- [ ] **Step 2: Add the Spotify lookup helper and wire it into `publish()`**

In `pipeline/s05_publish/publish.py`, add this function after `_load_env()`:

```python
def _get_spotify_track_metadata(title, artist, env):
    """Client Credentials lookup, same logic as app/lib/spotify.ts's
    getTrackMetadata -- ported to Python since this now runs at publish
    time instead of live on every page request. Returns
    (cover_art_url, spotify_artist, spotify_url), all None if no
    credentials are configured, nothing matched, or any request fails --
    never raises, same degrade-gracefully rule as the TS version had."""
    client_id = env.get("SPOTIFY_CLIENT_ID")
    client_secret = env.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None, None, None

    try:
        token_res = requests.post(
            "https://accounts.spotify.com/api/token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        if not token_res.ok:
            return None, None, None
        token = token_res.json()["access_token"]

        query = f"track:{title} artist:{artist}" if artist else title
        search_res = requests.get(
            "https://api.spotify.com/v1/search",
            params={"type": "track", "limit": 1, "q": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if not search_res.ok:
            return None, None, None
        items = search_res.json().get("tracks", {}).get("items", [])
        if not items:
            return None, None, None
        track = items[0]

        images = track.get("album", {}).get("images", [])
        cover_art_url = images[0]["url"] if images else None
        spotify_artist = track.get("artists", [{}])[0].get("name") or artist
        spotify_url = track.get("external_urls", {}).get("spotify")
        return cover_art_url, spotify_artist, spotify_url
    except requests.RequestException:
        return None, None, None
```

Add the import at the top of the file (alongside the existing `import libsql_client`):

```python
import requests
```

- [ ] **Step 3: Call it in `publish()` and store the result**

Change the `publish()` function's body from:

```python
    env = _load_env()
    client = libsql_client.create_client_sync(
        url=env["TURSO_DATABASE_URL"].replace("libsql://", "https://"),
        auth_token=env["TURSO_AUTH_TOKEN"],
    )
    try:
        client.execute(
            """
            INSERT INTO songs (id, title, artist, tempo_bpm, tuning, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, artist=excluded.artist, tempo_bpm=excluded.tempo_bpm,
                tuning=excluded.tuning, notes=excluded.notes
            """,
            [
                run_id,
                tab_data["title"],
                None,  # artist -- not captured anywhere in the pipeline yet
                tab_data["tempoBpm"],
                json.dumps(tab_data["tuning"]),
                json.dumps(tab_data["notes"]),
                int(time.time()),
            ],
        )
    finally:
        client.close()
```

to:

```python
    env = _load_env()
    cover_art_url, spotify_artist, spotify_url = _get_spotify_track_metadata(
        tab_data["title"], tab_data.get("artist"), env  # artist from Task 0's ingest/tab capture, may still be None for older runs
    )

    client = libsql_client.create_client_sync(
        url=env["TURSO_DATABASE_URL"].replace("libsql://", "https://"),
        auth_token=env["TURSO_AUTH_TOKEN"],
    )
    try:
        client.execute(
            """
            INSERT INTO songs (id, title, artist, tempo_bpm, tuning, notes, created_at, cover_art_url, spotify_artist, spotify_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, artist=excluded.artist, tempo_bpm=excluded.tempo_bpm,
                tuning=excluded.tuning, notes=excluded.notes, cover_art_url=excluded.cover_art_url,
                spotify_artist=excluded.spotify_artist, spotify_url=excluded.spotify_url
            """,
            [
                run_id,
                tab_data["title"],
                tab_data.get("artist"),  # from Task 0's ingest/tab capture, may still be None for older runs
                tab_data["tempoBpm"],
                json.dumps(tab_data["tuning"]),
                json.dumps(tab_data["notes"]),
                int(time.time()),
                cover_art_url,
                spotify_artist,
                spotify_url,
            ],
        )
    finally:
        client.close()
```

- [ ] **Step 4: Manually verify against one real run**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && .venv/bin/python pipeline/s05_publish/publish.py pipeline_runs/mister-sandman-20260907-161918`
Expected: `Published: mister-sandman-20260907-161918`, no errors. This is the real re-publish for Task 4 too, so no need to run it twice.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
git add pipeline/s05_publish/publish.py .env.local
git commit -m "Fetch and store Spotify metadata at publish time instead of live per-request"
```

(`.env.local` is gitignored — this `git add` is a no-op if it's ignored, which is expected and fine; the real point of this step is committing `publish.py`.)

---

### Task 3: Stop live-fetching Spotify data in the app, delete the now-unused lookup module

**Files:**
- Modify: `app/app/page.tsx`
- Modify: `app/app/_components/SongListRow.tsx` (comment only)
- Modify: `app/app/_components/SongDetailPane.tsx` (comment only)
- Delete: `app/lib/spotify.ts`

**Interfaces:**
- Consumes: `songs.coverArtUrl`/`spotifyArtist`/`spotifyUrl` (Task 1), already-populated by Task 2/4.
- Produces: `SongListSidebar`/`SongDetailPane`'s own prop interfaces are unchanged — they already accept `coverArtUrl`/`spotifyArtist`/`spotifyUrl` as plain values; only where those values come from changes (DB columns instead of a live fetch).

- [ ] **Step 1: Rewrite `page.tsx` to read the stored columns instead of fetching live**

Replace the full contents of `app/app/page.tsx` with:

```tsx
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { songs } from "@/db/schema";
import { StudioShell } from "./_components/StudioShell";
import { SongListSidebar } from "./_components/SongListSidebar";
import { SongDetailPane } from "./_components/SongDetailPane";

// Always show the latest published songs, no caching.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Column-projected: the sidebar only ever needs enough to render a row, never the
  // full notes/tuning JSON blobs -- those are fetched once, below, for just the
  // selected song. Ordered newest-first so "first in the list" is a stable, meaningful
  // default. coverArtUrl/spotifyArtist are read straight from the DB now (2026-09-18)
  // -- populated once at publish time (pipeline/s05_publish/publish.py), not fetched
  // live here on every request. This is what fixed slow song-switching: the old
  // version made a live Spotify API call per song in this list, on every navigation.
  const list = await db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      tempoBpm: songs.tempoBpm,
      coverArtUrl: songs.coverArtUrl,
      spotifyArtist: songs.spotifyArtist,
    })
    .from(songs)
    .orderBy(desc(songs.createdAt));

  // ?song= is a soft UI preference, not a resource identifier -- an invalid or stale
  // id silently falls back to the most recent song instead of 404ing (deliberately
  // different from the retired v0.1 UI's hard notFound(), see archive/v0.1-web-ui/).
  const { song: raw } = await searchParams;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const selectedId = requested && list.some((s) => s.id === requested) ? requested : (list[0]?.id ?? null);

  const [fullSong] = selectedId ? await db.select().from(songs).where(eq(songs.id, selectedId)) : [];

  return (
    <StudioShell
      sidebar={<SongListSidebar songs={list.map((s) => ({ ...s, coverArtUrl: s.coverArtUrl ?? undefined, spotifyArtist: s.spotifyArtist ?? undefined }))} selectedId={selectedId} />}
      detail={
        <SongDetailPane
          song={fullSong ?? null}
          coverArtUrl={fullSong?.coverArtUrl ?? undefined}
          spotifyArtist={fullSong?.spotifyArtist ?? undefined}
          spotifyUrl={fullSong?.spotifyUrl ?? null}
        />
      }
    />
  );
}
```

(The `?? undefined` conversions exist because Drizzle's `text()` columns come back as `string | null`, but `SongListItem`/`SongDetailPane`'s existing prop types use `string | undefined` for these two fields — matching their current interfaces exactly, not changing them.)

- [ ] **Step 2: Update the now-stale comments pointing at `app/lib/spotify.ts`**

In `app/app/_components/SongListRow.tsx`, change:

```ts
  // Real Spotify cover art, same lookup as the selected song's header -- see
  // app/page.tsx and app/lib/spotify.ts. Undefined/empty both mean "no art
  // found," same degrade-gracefully rule as everywhere else Spotify data is used.
  coverArtUrl?: string;
```

to:

```ts
  // Real Spotify cover art, fetched once at publish time (2026-09-18) and
  // stored on the song row -- see pipeline/s05_publish/publish.py. Undefined/
  // empty both mean "no art found," same degrade-gracefully rule as before.
  coverArtUrl?: string;
```

In `app/app/_components/SongDetailPane.tsx`, change:

```tsx
        {/* Real cover art when Spotify metadata is available (app/lib/spotify.ts),
            the placeholder otherwise. Plain <img>, not next/image: an external CDN
```

to:

```tsx
        {/* Real cover art when Spotify metadata was found at publish time
            (pipeline/s05_publish/publish.py, 2026-09-18), the placeholder
            otherwise. Plain <img>, not next/image: an external CDN
```

And change:

```ts
  // now that app/lib/spotify.ts has real credentials to draw from.
```

to:

```ts
  // fetched once at publish time now, not live -- see publish.py.
```

- [ ] **Step 3: Delete the now-unused Spotify lookup module**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
rm app/lib/spotify.ts
```

- [ ] **Step 4: Verify nothing still imports it**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && grep -rn "lib/spotify" app --include="*.tsx" --include="*.ts" | grep -v node_modules`
Expected: no output (only the now-updated comments referencing `publish.py` remain, which don't match this grep).

- [ ] **Step 5: Full verify**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor/app && npm run verify`
Expected: PASS (typecheck, lint, all unit tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
git add app/app/page.tsx app/app/_components/SongListRow.tsx app/app/_components/SongDetailPane.tsx app/lib/spotify.ts
git commit -m "Read Spotify metadata from the DB instead of fetching live; remove now-unused lib/spotify.ts"
```

---

### Task 4: Re-publish the existing 3 songs to backfill the new columns

**Files:** None modified — re-runs `publish()` from Task 2 against existing run directories.

- [ ] **Step 1: Re-publish Seven Nation Army and Shame** (Mister Sandman was already done in Task 2, Step 4)

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
.venv/bin/python pipeline/s05_publish/publish.py pipeline_runs/seven-nation-army-20260918-183722
.venv/bin/python pipeline/s05_publish/publish.py pipeline_runs/shame-20260918-183654
```

Expected: both print `Published: <run-id>`, no errors.

- [ ] **Step 2: Verify in the browser**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor/app && npm run dev`, open `http://localhost:3000`, and confirm all three songs still show their cover art and artist name exactly as before (visual regression check — the data should look identical, just sourced differently now). Then click between songs a few times and confirm switching feels noticeably faster than before (no longer waiting on live Spotify calls).

- [ ] **Step 3: Preview on a real staging build, then ask before pushing/deploying**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor/app && npm run stage`, re-verify the same visual/speed check against `http://localhost:3001`. Per `AGENTS.md`'s standing procedure, then ask the user exactly: **"Push to git? Push to git & deploy? Or skip for now?"** — do not push or deploy without an explicit answer to that question, every time, no exceptions.
