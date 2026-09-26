# Task spec: split docs/DRIFT_LOG.md into a live tail + archive

## Goal
`docs/DRIFT_LOG.md` is 4,365 words against its own "short entries only" rule. Split it per
`docs/DOCUMENTATION_PRINCIPLES.md`'s archive-split convention (chronological logs get an archive
split, not a topic split) — move old entries out, keep a short live tail.

## Reads
- `docs/DRIFT_LOG.md` — full file, all entries.
- `docs/DOCUMENTATION_PRINCIPLES.md` — confirms archive-split is the right move for this file shape.

## Writes
- New file `docs/DRIFT_LOG_archive.md` — the older entries, verbatim, unedited content.
- `docs/DRIFT_LOG.md` — trimmed to the live tail + a pointer to the archive.

## Steps
1. Read `docs/DRIFT_LOG.md` in full. Note: entries are not in strict chronological order in the
   file today (a 2026-09-19 entry sits between two 2026-09-08 entries) — this is a pre-existing
   quirk, not something to silently fix. Preserve file order when moving entries (don't
   re-sort by date) unless you flag the reorder as a separate, visible decision.
2. Cut point: move every entry through the **tenth check (2026-09-11)** to the archive. Keep the
   two **2026-09-20** entries (pre-merge check, token-discipline pass) live — they're recent and
   short.
3. Create `docs/DRIFT_LOG_archive.md`:
   - Header: `# Drift log archive` + one line: "Older entries from `docs/DRIFT_LOG.md`, moved here
     per the archive-split rule in `docs/DOCUMENTATION_PRINCIPLES.md`. Newest live entries are in
     the main file."
   - Paste the cut entries verbatim below that, in the same order they appeared in the source file.
4. Rewrite `docs/DRIFT_LOG.md`:
   - Keep the existing intro (format block, "Short entries only" line).
   - Add one line under the intro: "Older entries: `docs/DRIFT_LOG_archive.md`."
   - Keep only the two 2026-09-20 entries.
5. Grep the repo for any inbound reference to a specific dated entry in `DRIFT_LOG.md` (e.g. "see
   DRIFT_LOG's 2026-09-09 entries" in `docs/DOCUMENTATION_PRINCIPLES.md`) — if a reference names an
   entry that's moving to the archive, update the reference to point at the archive file instead.
   `grep -rn "DRIFT_LOG" --include="*.md" .` to find candidates.
6. Going forward, keep new entries to the format the header already specifies (Checked/Found/Action,
   a few lines each) — don't write session-narrative-length entries. This is a habit fix, not a new
   rule to add to any doc.

## Constraints
- Don't edit the *content* of any entry while moving it — copy verbatim, fix only the outbound
  references found in step 5.
- Don't delete `docs/DRIFT_LOG.md`'s existing format/header block.
- Per `AGENTS.md`: this is a docs-only change — commit-and-report as a single checkpoint per
  the checkpoint-commit exception, no push without asking.

## Done when
- [ ] `docs/DRIFT_LOG_archive.md` exists with the pre-2026-09-20 entries, verbatim, in original order
- [ ] `docs/DRIFT_LOG.md` is down to intro + the two 2026-09-20 entries + one pointer line to the archive
- [ ] No dangling reference to a moved entry anywhere else in the repo
- [ ] Word count check: `wc -w docs/DRIFT_LOG.md` reported in the report-back
