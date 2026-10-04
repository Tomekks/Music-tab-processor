# Task: Audit the fixed rulebook

Status: active
Branch: master (no repo edits planned; changes are app/connector settings)
Next: owner chose to run the parked idea "Make /wrap cheap" BEFORE this audit; do that first. Then here: use the real breakdown below, pick connectors and skills to turn off (one yes per item)
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

## Questions
(none open)

## Report
