# Documentation principles

The standing rules this project's documentation follows — written down so restructuring a file (or deciding not to) is a repeatable decision, not a one-off judgment call each time. Read this when doing documentation maintenance, or when deciding where a new piece of information belongs.

## The three homes

Every fact about this project belongs in exactly one of three places:

- **Why** something was decided → `docs/decisions/` (index: `docs/DECISIONS.md`)
- **What's true right now** → `app/status/` (index: `app/STATUS.md`), or each pipeline stage's own `STATUS.md`
- **Exactly how something behaves or renders** → the relevant component's own `RULES.md` (e.g. `FretboardDiagram.RULES.md`, `SheetDiagram.RULES.md`)

When adding a new piece of information, ask which of the three it is before deciding where it goes. A single change often touches more than one home — e.g. building a new feature usually means a *why* entry, a *status* update, and possibly a new `RULES.md` — but each individual fact still has exactly one correct home, not several copies of the same fact retold three ways.

## Naming conventions

- Top-level `docs/` files stay uppercase-snake-case (e.g. `DRIFT_CHECK.md`, `SESSION_HANDOFF.md`) — this applies whether the file is a rules/procedure doc meant to be read in full, or an index (e.g. `DECISIONS.md`, `AUDIOPROCESSINGTOOLS.md`).
- Files inside a topic folder (`docs/decisions/`, `docs/audio-tools/`, `app/status/`) use lowercase kebab-case (e.g. `hosting-and-deployment.md`), matching this repo's existing precedent for "a folder of small topic files," `docs/specs/`.
- **A filename must be understandable standing alone.** Someone looking at a folder listing, with no index open, should be able to tell what's in a file from its name. Prefer a specific, self-contained name (`pipeline-tool-choices.md`) over a vague or generic one (`components.md`, which would also collide in meaning with the actual `app/components/` folder elsewhere in this repo). Before adding a new file, check its name against existing ones in the repo for exactly this kind of collision — not after.

## The index format

Every index file (`docs/DECISIONS.md`, `app/STATUS.md`, `docs/AUDIOPROCESSINGTOOLS.md`, and any future one) uses the same per-topic shape, so the index alone can answer a walk test without needing a topic file open:

> **[Topic]** — the conclusion, in one or two sentences, plus its core reason. *Open `path/to/file.md` if your task touches: [specific triggers].*

This is a routing table, not a table of contents — it should tell a reader (human or AI) whether they need to open the full file, not just that the full file exists.

## Writing for token-efficient navigation

Every file exists to be read by an AI (or human) trying to reach one specific fact with the least irrelevant text along the way. Two rules follow:

- **Concise, but complete for what the file claims to cover.** Say everything the file's own scope promises. If something is deliberately out of scope, say so explicitly and point to where it lives (`"X isn't covered here — see Y"`) — a silent gap costs more tokens than a stated pointer, because the reader has to discover it's missing before they can go looking elsewhere.
- **No padding** — a sentence that adds no fact, reason, or pointer is a sentence every future reader pays to skip. Applies to code comments and docstrings too, not just docs.

**Index entries stay to roughly one or two sentences** (already the rule above) — as a concrete check: if an index's entries average past ~100 words, that entry needs trimming even if the whole file is nowhere near the split threshold below. `docs/DECISIONS.md` hit this in practice (2026-09-09) not because its entries were individually too long, but because ~600 words of actual reasoning (the project's core reframe, local-only scope rules) sat directly in the index instead of being split out like everything else — fixed 2026-09-10 by moving that content to `docs/decisions/project-purpose-and-scope.md`.

## When a file should become an index + folder

**Split it** once a file exceeds roughly 1,500–2,000 words *and* genuinely covers more than one separable topic. `docs/DECISIONS.md` (5,452 words, seven separable topics), `app/STATUS.md` (2,233 words, four), and `docs/AUDIOPROCESSINGTOOLS.md` (1,041 words, four pipeline stages) are the worked examples — see `docs/DRIFT_LOG.md`'s 2026-09-09 entries for how each was actually split.

**Don't split** a file just because it's grown, if it's one of these shapes instead:

- A linear procedure or checklist meant to be followed start-to-end (`docs/DRIFT_CHECK.md`, `docs/SESSION_HANDOFF.md`) — splitting a checklist into pieces makes it harder to follow, not more efficient.
- A rules file meant to be read in full, every time (`AGENTS.md`) — splitting risks a future reader missing a rule because they opened the wrong piece.
- A chronological log meant to be skimmed at the tail, not indexed by topic (`docs/DRIFT_LOG.md`) — if a log like this grows large enough to matter, the fix is an *archive* split (move old entries to a separate file), not a topic split.

## Keeping indexes thin (the durability rule)

**New reasoning or status goes straight into the matching topic file — never appended back into an index.** An index file states this explicitly in its own intro. If a topic file itself grows past the split threshold above, it gets split again, the same way, into its own sub-folder if genuinely warranted.

This is the rule that makes the split stick instead of quietly re-bloating the way `DECISIONS.md` originally did.

## Weekly maintenance check

Lighter-weight than `docs/DRIFT_CHECK.md`'s full, event-triggered audit, and deliberately calendar-based (weekly) rather than tied to a natural pause point — doc bloat accumulates gradually with ordinary use, not in one identifiable burst.

1. Check the word count (`wc -w`) of the index files (`docs/DECISIONS.md`, `app/STATUS.md`, `docs/AUDIOPROCESSINGTOOLS.md`) plus any file that's grown noticeably that week.
2. Check whether the "three homes" assignment still held for everything added that week — did any *why* end up in a status file, or vice versa?
3. Check whether any topic file has itself crossed the split-threshold above.
4. Log the result as an entry in the existing `docs/DRIFT_LOG.md` (no separate log file), tagged as a **doc maintenance check** so it's distinguishable from a full drift check.

This is currently a documented, manually-run procedure — not an automated recurring job. Real scheduling (an actual weekly reminder) is possible but a separate decision, not assumed here.

## The update ritual

Whenever a new rule or principle is discovered — a new naming problem, a new signal for when to split, anything that changes how this structure should work — **first re-read the existing principles in this file and assess whether they still hold, are actually being followed, or need adjusting.** Only then add the new one. Never just append without that review pass; that's exactly the habit that let `DECISIONS.md` grow unchecked in the first place.
