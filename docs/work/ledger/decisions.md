# Rule ledger: owner decisions (2026-10-02)

Source of truth for P3 (writing the new `AGENTS.md` and `docs/rules/*`). Numbers are the
must-keep list statements from the grilling session; row ids (R0xx) are in `rules.tsv`.
Rule: everything not dropped or moved below is KEPT.

## Rulings
- **A. R017** ("ask approval before any file change, no exceptions") is reworded to: ask before
  deleting or moving anything, and before touching `contracts/`, config or secrets; edits inside the
  task's allowed files need no separate yes.
- **B. Ideas/open items** (IDEA=Y rows, e.g. R097 case-study backup decision) go to the backlog, not the rules.
- **Keep rest:** all statements not listed under Drop / Move / Reword are kept.

## Drop
- 15 (filenames understandable standing alone): negligible risk.
- 16 (type/schema checking at module boundaries) as prose: app is enforced by typecheck; **add a pipeline
  checker** (`scripts/verify-pipeline.sh`, pytest + footer) because nothing runs pipeline tests today.
- 7 (secret scan) prose half only: the pre-commit hook does it; keep "no credentials in chat"; the
  worktree script must set `core.hooksPath`.

## Move
- To memory only (how Claude works with the owner): 8 (copy-paste commands), 23 (comment rewrites).
- To the backlog file header: 22 (never add an item without showing the exact entry).
- To builder rules / spec template: 26, 27, 28 (allowlist; builder drafts human checklist, owner runs it; report pass/fail + diff stat).
- To the model-choice file: 6 (never use free-tier models; paid opencode-go only).

## Reword
- 13: "Write small, reusable functions. Change code the task needs; leave unrelated working code alone."
- 33: "On this machine, prefer adding new things beside the old ones over editing shared system settings. Say so when a task requires it."
- 21: "One fix loop, then escalate."
- 2 + 3 merge into one ask-first list (push/deploy three-way question; deletion per case).

## Added (missed by the keyword net, found by a mechanical check) — kept
29 stage `STATUS.md`; 30 golden-file test for audio/ML stages; 31 deploy from repo root; 32 explain outbound
requests; 33 additive-changes rule (reworded above); 34 `research/` never silently promoted; 35 read
`contracts/` first; 36 `app/AGENTS.md` Next.js-docs warning (stays in `app/AGENTS.md`).

## New rules (not in the old docs; from this redesign)
Mechanical before reasoning; say plainly what was not checked; testing budget; debugging steps (reproduce,
evidence, one hypothesis, regression test, stop after two failures); worktree rule; verify footer before "done".

## Plan additions
`/next`, `/wrap`, `scripts/check-brief.sh`, `scripts/new-worktree.sh`, `scripts/check-rules.sh`,
`scripts/restore-old-docs.sh`, `scripts/verify-pipeline.sh`; old docs move to `docs/_old/` with `MAP.md`.

## 2026-10-02 sizes
New tests per task: about 10 max. Caps: AGENTS.md <= 80 lines, each rules file <= 70.
