You are sorting rule-like lines from a hobby software project's docs into a new, leaner documentation structure. The attached file has one row per line: id|file:line|section|text

For EACH row output exactly one line, with no other text, no markdown and no commentary:

id|VERDICT|HOME|SAME_AS|IDEA|REASON

VERDICT
- KEEP: a rule or principle still worth following, i.e. it changes how a person or AI should behave in this repo.
- MERGE: says the same idea as another row in this file (give that id in SAME_AS).
- DROP: status, history, a finished task, a backlog item, a pure description, or not really a rule.
- SUPERSEDED: an old-process rule that the new design (below) deliberately replaces. Put what replaces it in REASON.

The new design, so you can spot SUPERSEDED rows:
- A new session reads only AGENTS.md and the active task file. The "walk test" and the long orientation reading list run only on a cold start after a long gap.
- No plan status pages, drift log, handoff file or pending-actions file. Finished work is deleted; git history is the record.
- A cheap model drafts short briefs; Claude does grilling, plans and risk reviews; review has Levels 0, 1 and 2.
- Reports are a short core plus extras by task type; a script-checked verify footer replaces self-attested reports.
- The Superpowers plugin is removed; its useful rules are restated in AGENTS.md.

HOME (for KEEP and MERGE; use "-" for DROP and SUPERSEDED). Exactly one of:
AGENTS (short hard rules for every AI), PROCESS (how work flows), VERIFY (how checking works), EXECUTOR (rules for the cheap builder model), MODELS (model choice), SAFETY (never / ask-first rules), ENGINEERING (simplicity, code quality), DECISION (a hard-to-reverse decision and why), REFERENCE (facts, how something works), AREA (specific to app/, pipeline/ or tools/)

SAME_AS: for MERGE the id of the row it duplicates, otherwise "-".
IDEA: Y if, even when dropped or merged, the line holds a practical idea worth a human's second look; otherwise N.
REASON: at most 12 words.

Judgement rules:
- Prefer DROP for anything that is only state or history.
- If unsure between KEEP and DROP, choose KEEP and say why in REASON.
- Never invent ids. Output exactly one line per input row, in the same order.
