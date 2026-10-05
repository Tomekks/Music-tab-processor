# Task: Audit the fixed rulebook

Status: active
Branch: master
Next: iOS Simulator switch not found in the app (get_settings has none; ~1k at most), item skipped. Open a FRESH session, run get_usage and compare with the Report baseline (total 63.8k) to record the "after" (Docs and visualize are off). Then tick acceptance, set Status done. No worktree or PR open. Optional later: remaining unused skills, duplicate grilling skills (~5k together at most).
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
- Cut 1: connectors unused here (iOS simulator, Docs, visualize, scheduled-tasks), turned off app-wide. Real saving only 2-3k (56 sessions: browser 895 calls, ccd_pr 20, ccd_session_mgmt 14, terminal 11, ccd_session 6, Docs 0, iOS Simulator 0).
- Cut 2: unused skills; Cut 3: duplicate skills (grilling, grill-with-docs, domain-modeling, ui-ux-pro-max; grill-me overlaps grill-with-docs). Together worth at most ~5k; 14 skills already off in .claude/settings.local.json, so the skill list (5.3k) is near its floor.
- Real breakdown (get_usage, 2026-10-04, this chat, before any cuts): system tools 29.5k, MCP tools 20.4k, messages 11.7k, skills 5.3k, system prompt 4.9k, memory 3.2k (~76k). Biggest lever is tool definitions (~50k), not skills.
- Not checked: ~/.claude/skills/synced contents, which project skills actually load, connector use in other projects.

## Acceptance checks
- Before and after context breakdown recorded here (explain-usage or the app's context view)
- Per item: owner said yes, and nothing else changed

## Decisions
- 2026-10-04: reply style rules added to AGENTS.md (6d48b53); "Make /wrap cheap" done first (05c8f05) — cheap model compacts task files via scripts/compact-task.sh; builder cannot edit scripts/, so Claude wrote it.
- 2026-10-04: owner said yes to iOS Simulator, Claude Docs, one Visualize copy. Docs and connector `visualize` switched off (also off for new sessions); iOS Simulator not switchable from chat. Browser, ccd_*, terminal kept.
- 2026-10-04: explain-usage on a 12-turn session: fixed load ~58k on turn one, instructions ~66% of effective cost (~99k of ~150k). Confirms tool definitions as the lever.

- 2026-10-04: iOS Simulator has no switch in the app settings; skipped as not worth the search.

## Questions
(none open)

## Report
- Before (start of session): total 63.8k; system tools 29.5k, MCP tools 19.8k, skills 5.3k, system prompt 4.9k, memory 3.6k.
- Usage this session: 7 marks, 2683s span (measure.sh report). After: not measured yet (this session still held the old tool list: MCP tools read 20.2k at wrap). Measure in a fresh session.
- Wrap of the explain-usage session: total 72.1k; system tools 29.5k, MCP tools 19.0k, skills 5.3k (Docs/visualize already off). session-end mark logged (5h=8% weekly=44%); measure.sh: 9 marks, 2783s.
