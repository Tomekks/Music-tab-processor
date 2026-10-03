# Task: Control Center stage-duration summary

Status: active
Branch: feat/cc-stage-durations
Next: done; awaiting owner checklist.
Written against: 145a218

## What changes for you
Nothing visible in the app. A new, tested function `stageDurations(records)` turns Control Center's run records into the fastest, median and slowest seconds per pipeline stage, plus how many runs were done, failed or stopped. It makes the numbers you worked out by hand on 2026-09-30 repeatable. Nothing uses it yet; what to measure for quality is decided later.

## Scope
**Modify only:**
- `tools/Control_Centre/src/lib/server/stats.ts` (new file)
- `tools/Control_Centre/src/lib/server/stats.test.ts` (new file)

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- `tools/Control_Centre/src/lib/server/records.ts` (only import its `RunRecord` type), `tools/Control_Centre/data/`

## Size
Files touched: 2. Expected diff: about 120 lines. New tests: 9.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1 (Claude reviews the diff).

## Steps
- [x] Read `tools/Control_Centre/src/lib/server/records.ts` (the `RunRecord` shape) and one existing test beside it for style (`node:test`, `node:assert/strict`, relative imports ending in `.ts`).
- [x] Write `stats.test.ts` first with the 9 cases below; run it and see it fail (the module does not exist yet).
- [x] Write `stats.ts`; run the tests until they pass.
- [x] Run `bash scripts/verify-task.sh`, fill `## Report`, run `bash scripts/finish.sh`.

**The function.** In `stats.ts`:
`export function stageDurations(records: RunRecord[]): Record<string, StageStats>` and
`export interface StageStats { done: number; failed: number; stopped: number; minSec: number | null; medianSec: number | null; maxSec: number | null }`.
1. Use only records with `type === "finished"`. Per `execId`, keep only the LAST finished record in array order (a stop writes `interrupted` then `stopped` for the same run, which must count once).
2. Group by `stage`. Count by that last outcome: `done`, `failed`, and `stopped` (outcome `stopped` or `interrupted`). A record with no outcome is ignored.
3. `minSec`, `medianSec`, `maxSec` come from `durationSec` of the `done` runs that have a finite number there; `null` when there are none. Median of an even count is the mean of the two middle values. No rounding.
4. Empty input gives `{}`. Never mutate the input array or its records. No file or network access, no new dependency.

**The 9 tests (fixtures built inline, never `data/records.jsonl`):**
1. empty input gives `{}`
2. one done run: counts and min = median = max
3. odd number of done runs: median is the middle one
4. even number: median is the mean of the two middle values
5. `interrupted` then `stopped` for the same `execId` counts as one stopped run
6. a failed run is counted but its duration is not in min/median/max
7. a `started` record with no finished record is ignored
8. a done run without `durationSec` counts as done but stays out of the durations
9. two stages are summarized separately

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: the control centre section shows `pass` of at least 161 with `fail 0`, and the last line is `verify-task: PASS`
- Run: `git diff --stat 145a218..HEAD` / Expected: exactly the two new files plus this task file

## Owner checklist
- [ ] In the worktree, run `node --input-type=module -e 'const m=await import("./tools/Control_Centre/src/lib/server/stats.ts"); const r=await import("./tools/Control_Centre/src/lib/server/records.ts"); console.log(m.stageDurations(r.readRecords("/Users/tomsvarpins/Projects/guitar_tab_processor/tools/Control_Centre/data")))'` → prints one entry per stage, with medians roughly 14 s separation, 7 s transcription, 4 s tab, as you recorded on 2026-09-30.

## Questions
(none open)

## Report
- `bash scripts/verify-task.sh` → control centre `pass 161 fail 0`, last line `verify-task: PASS` → ✓
- `git diff --stat 145a218..HEAD` → pending `finish.sh` commit; before commit only task file differs, new files untracked → ✓ (to confirm after finish)
- Decisions the spec didn't settle: NONE (followed spec literally; unknown outcomes produce no count and no stage entry unless another counted outcome created it).
- Spec fact wrong: NONE.
- Noticed but not touched: NONE.
- Test-first: `node --test tools/Control_Centre/src/lib/server/stats.test.ts` before `stats.ts` existed → fail 1 (module not found) → ✓ red; after → pass 9 fail 0 → ✓ green.
- Owner checklist: Not run (builder cannot run it).

### Checkpoint (written by scripts/finish.sh)
```
 docs/work/feat-cc-stage-durations.md              |  20 +++--
 tools/Control_Centre/src/lib/server/stats.test.ts | 105 ++++++++++++++++++++++
 tools/Control_Centre/src/lib/server/stats.ts      |  59 ++++++++++++
 3 files changed, 179 insertions(+), 5 deletions(-)
```
