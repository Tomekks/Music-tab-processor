You are reading lines from a hobby software project's planning docs and decision records. Many mention a past problem. The attached file has one row per line: id|file:line|section|text

For EACH row output exactly one line, with no other text, no markdown and no commentary:

id|VERDICT|HOME|SAME_AS|IDEA|REASON

VERDICT
- INCIDENT: the line records a REAL past failure, bug or surprise, and a lesson can be drawn from it.
- NOISE: no real incident (a plan, a test name, a generic use of the word "bug" or "failed", a hypothetical).

HOME (for INCIDENT; "-" for NOISE): where the lesson should live. Exactly one of:
AGENTS, PROCESS, VERIFY, EXECUTOR, MODELS, SAFETY, ENGINEERING, DECISION, REFERENCE, AREA

SAME_AS: the id of an earlier row in this file recording the SAME incident or lesson, otherwise "-".
IDEA: always N.
REASON: the lesson in at most 12 words, as an instruction (e.g. "Commit and show git status after building").

Judgement rules: prefer NOISE when unsure. Never invent ids. Output exactly one line per input row, in the same order.
