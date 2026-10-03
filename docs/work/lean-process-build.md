# Task: build the lean process (branch `lean-process`)

Status: active
Branch: lean-process
Next: P3 step B (new AGENTS.md and area files) is in progress in another session; then C, D, E, F (/start, /next, /wrap), G, H, I.

**Goal:** replace the heavy old workflow with the lean one described in `docs/PROCESS.html` (open it in a
browser). Safety nets: tag `pre-lean`, tarballs in `~/Backups/`, old docs stay in place until step P3b.

## Resume (read this first in a new session)
Read only this file, then the rules files named under Done. Skip `START_HERE.md` and the walk test:
`CLAUDE.md` still points at the old boot chain until step B replaces it. Check `pwd` and the branch first.

## Done (committed unless noted)
- P0 `7806ccf`: verify footer, `npm run coverage`, pre-commit runs verify for staged `app/`, Stop hook.
- P1 `ac07158`: `docs/PROCESS.html` (old vs new, risks, commands, progress).
- P2 `d3cef64`: rule ledger in `docs/work/ledger/` (242 rules: 160 KEEP / 20 MERGE / 26 SUPERSEDED / 37 DROP;
  296 incident lines → 33 lessons). Owner rulings: `ledger/decisions.md`. Gaps G1–G10: `ledger/incident-table.md`.
- P3 step A (this checkpoint): `docs/rules/{process,verify,executor,models}.md` written and accepted.
  Owner set: ~10 new tests per task max; caps `AGENTS.md` ≤ 80 lines, rules files ≤ 70.

## Next (P3, in order; each ends with an owner stop)
- **B** New `AGENTS.md` (≤ 80): map, ask-first list (merge old #2+#3), engineering posture + ladder,
  honesty, testing/debugging/done, worktree rule, G1/G4. `CLAUDE.md` → one line `@AGENTS.md`. Area files:
  `app/AGENTS.md` (keep the Next.js docs warning, G8 tokens, verify, stage, deploy-from-root),
  `pipeline/AGENTS.md` (STATUS.md rule, golden files, contracts, G9), `tools/Control_Centre/AGENTS.md` (G10).
  Claim ledger rows R065, R067 in a `covers:` line. Show diff → **stop 2**.
- **C** Scripts: `check-rules.sh` (every KEEP/MERGE id in some `covers:` line + size caps), `verify-pipeline.sh`
  (only when `pipeline/` staged), `new-worktree.sh` (env files, install, port, set `core.hooksPath`,
  copy `.opencode`), `check-brief.sh`. Add duration + test count to the verify footer.
- **D** `docs/work/TEMPLATE.md`, `scorecard.md`, `missed.md`.
- **E** Opencode: `builder` (update `.opencode/agents/delegate-builder.md`: allow verify/git add/commit, deny push/rm/network,
  stop-and-ask not decide), read-only `reviewer`, `/exec` and `/review` commands, project `opencode.json` with MCP off,
  un-ignore `.opencode/agents` + `commands`. Claim R107–R109. Dry run → **stop 3**.
- **F** `/next`, `/wrap` skills calling scripts. **G** skill pruning via `skillOverrides` (off: design, brand, slides,
  ui-styling, banner-design, design-system, grill-me, find-skills; keep grilling, domain-modeling, grill-with-docs,
  wireframe, code-review, ui-ux-pro-max). **H** full dry run of the flow on a harmless task.
- **I** Remove Superpowers (owner runs the uninstall) after `grep -r "superpowers:"` is clean in kept files → **stop 4**.
- **P3b** (separate approval) move old docs to `docs/_old/` + `MAP.md` + `restore-old-docs.sh`. Then a trial of
  2–3 real tasks, then P4 delete, P5 Playwright layout spike.

## Decisions to remember
- Reviewer = `opencode-go/deepseek-v4.1-flash`; builder = `opencode-go/muse-spark-1.3-contributor`. Never `-free` ids.
- Mechanical before reasoning. Pipeline checks only when pipeline files change. `.opencode/` is gitignored today.
- Hand opencode jobs through `scripts/ledger/classify.sh` style: isolated temp dir, 7-minute timeout, validated output.

## Watch-outs
- opencode CLI was upgraded 1.17.9 → 2.0.20; the desktop app is 1.18.x and shares the database. If the app misbehaves, tell Claude.
- `~/.config/opencode/opencode.json` contains a Figma client secret (exposed once in chat); rotate it if sensitive.
- Primary working directory drifts in some sessions: run `pwd` before writing absolute paths.
- Untracked, not ours: `.claude/skills/`, `app/packages/design-system/brands/{byebye,heyhey}/`.

## Questions
(none open)
