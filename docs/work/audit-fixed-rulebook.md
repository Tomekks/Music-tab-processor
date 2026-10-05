# Task: Audit the fixed rulebook

Status: active
Branch: master (no repo edits planned; changes are app/connector settings)
Next: owner switches off iOS Simulator in the app settings (no switch reachable from chat), then open a FRESH session and compare get_usage with the baseline in Report (MCP tools 19.8k, total 63.8k at start). Then tick acceptance, commit, set Status done. Optional later: skills batch (loop, schedule, claude-api, setup-claude, consolidate-memory, keybindings-help, plugin-authoring, browser skills; ~1k) and the duplicate grilling skills.
Written against: 6d48b53
Template: quick

## What changes for you
Fewer tokens loaded on every turn (target: 8-14k less of the ~63k) by turning off connectors and skills this repo never uses.

## Scope
**Modify only:**
- App connector settings and skill folders, each only after your yes for that specific item

**Do NOT touch:**
- `contracts/`, secrets, `AGENTS.md` rules, anything not listed above

## Findings (read-only pass, estimates not measurements)
- Tool definitions ~20-25k (largest; from the app and connectors). System prompt and MCP instructions ~12-15k (not editable). Skill listing ~7-9k. Own files ~4.5k.
- Cut 1 (largest): connectors unused here (iOS simulator, Docs, visualize, scheduled-tasks). Est. 5-10k. Turned off app-wide, not per repo, unless the app allows per-project.
- Cut 2: unused skills (docx, pptx, xlsx, pdf, schedule, loop, claude-api, setup-claude, consolidate-memory, fewer-permission-prompts, keybindings-help, plugin-authoring, browser skills). Est. 3-4k.
- Cut 3: duplicate skills in both ~/.claude/skills and .claude/skills (grilling, grill-with-docs, domain-modeling, ui-ux-pro-max); grill-me overlaps grill-with-docs. Est. ~1k.
- Real breakdown (get_usage, 2026-10-04, this chat, before any cuts): system tools 29.5k, MCP tools 20.4k, messages 11.7k, skills 5.3k, system prompt 4.9k, memory files 3.2k (total ~76k). Biggest lever is tool definitions (system 29.5k + MCP 20.4k = ~50k), not skills (5.3k). The "Cut 2" and "Cut 3" skill estimates are therefore worth at most ~5k together.
- Not checked: real token counts, ~/.claude/skills/synced contents, which project skills actually load, connector use in other projects.

## Acceptance checks
- Before and after context breakdown recorded here (explain-usage or the app's context view)
- Per item: owner said yes, and nothing else changed

## Decisions
- 2026-10-04: reply style rules added to AGENTS.md (6d48b53) as the first step of cutting verbosity; this audit is the separate follow-up task.
- 2026-10-04: "Make /wrap cheap" runs before this audit.

- 2026-10-04: "Make /wrap cheap" done first (05c8f05): cheap model compacts task files via scripts/compact-task.sh; builder cannot edit scripts/, so Claude wrote it.
- 2026-10-04: real tool-call counts (56 sessions) replace the estimates: browser 895 calls, ccd_pr 20, ccd_session_mgmt 14, terminal 11, ccd_session 6, Docs 0, iOS Simulator 0. Findings above that guessed 5-10k from connectors were too high; realistic saving 2-3k.
- 2026-10-04: owner said yes to: iOS Simulator, Claude Docs, one Visualize copy (my pick). Docs and connector `visualize` switched off (also off for new sessions). iOS Simulator not switchable from chat. Browser, ccd_*, terminal kept. Already off in .claude/settings.local.json: 14 skills, so the skill list (5.3k) is near its floor.

## Questions
(none open)

## Report
- Before (start of session): total 63.8k; system tools 29.5k, MCP tools 19.8k, skills 5.3k, system prompt 4.9k, memory 3.6k.
- Usage this session: 7 marks, 2683s span (measure.sh report). After: not measured yet (this session still held the old tool list: MCP tools read 20.2k at wrap). Measure in a fresh session.
