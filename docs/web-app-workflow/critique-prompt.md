# Critique prompt (second-model review of a spec or plan)

Part of the workflow — see `execution-loop.md` step 1 (one review round per spec) and
`spec-template.md`. A weaker, cheaper model will implement whatever the spec says, so the critic's
job is to catch what that model would get wrong before it builds on it.

## How much critique? Follow the spec's own tier line

| What is being reviewed | Depth | Why |
|---|---|---|
| Trivial task, or an **S-tier** spec | **None**, unless the author flags a specific risk; then **Lite** | the round trip costs more than a `git checkout` |
| **Full-tier** spec (real data, deletes, deploys) | **Full** | mistakes here are not a revert away |
| A **plan** (Architectural, several specs) | **Plan** | scope and sequencing are decided here, once |

Lite = checks 1, 2 and 4 only, answer in under 10 lines. Full = all of the checks. Plan = the plan
section below (plus the spec checks when one of its specs is attached).

## Paste to the critic (per review: change only the path and the depth)

```text
Critique <path>. Depth: <Lite | Full | Plan>. Read docs/web-app-workflow/critique-prompt.md
(section "Rules for the critic") and follow it. Read-only: change no file.
Already decided or answered (do not raise again): <list, or "none">.
Previous critique of this file: <its findings in one line each and how each was resolved, or "none">.
```

**Claude, when the owner asks for a critique prompt:** always give this paste block, filled in, and
nothing longer. The path, the depth (from the table above) and the two lists are the only things
that change; the rules live in this file so they cannot drift between prompts. Never describe the
risks you expect the critic to find (it anchors the review). Fill "already decided" from the
conversation so answered questions are not asked again.

**Claude, after the critique comes back:** verify each finding against the live code before acting
on it. A critic once cited an `osascript` call in a file that runs `open`. Record which findings
held up.

## Rules for the critic

Context: single-maintainer hobby project; a cheaper model implements from the spec; the owner
prefers simple, reliable solutions over clever or heavy ones. Be skeptical, not affirming, but report only what
you can point to. If the spec is sound, say so in one line and stop; never invent findings.
Decisions the owner already made (`docs/DECISIONS.md`, the plan's Locked decisions) are not findings.

1. **Check claims against live code.** For every quoted excerpt, "verified" claim, line number or
   count in the spec, open the cited file and confirm. Report each mismatch with `file:line`.
2. **Weaker-executor lens.** Where could a cheap model plausibly go wrong or fill a gap with a
   default that looks fine? Ambiguous steps, unstated edge cases, a test that cannot fail, an
   unpinned order of steps.
3. **Missing for this stage.** What does a change like this normally need that is absent (empty
   state, failure path, rollback, an existing test it will break)?
4. **Stop conditions and Done.** Each must be a command with an expected result or a checkable
   condition. Flag any that is a judgment, and any risk in the spec with no stop condition.
5. **Simplicity.** Name anything to delete or replace with something smaller and just as reliable
   (a state variable that a plain call would replace, an extra file, a dependency, a probe that
   `verify` already proves). "Remove this" counts as a finding.
6. **Scope.** Anything the spec touches beyond its stated user story, or an allowlist that misses
   a file the steps imply.

### Plan section (Plan depth only)

For each section of the plan: (1) what is solid, (2) what is vague, untested or likely to break in
practice, (3) what is missing, (4) one concrete change, if any. Then: are the chunks complementary
and modular, do they build on each other, are they in the right order, is each chunk too small,
too big or right? Split only at a real seam, not by size (`tiering.md`).

### Output (in this order)

1. **Blocking**: one line each: `file:line or spec section: what is wrong; suggested fix`.
2. **Worth fixing**: same format.
3. **Simplifications**: `remove or replace X with Y because Z`.
4. **Questions for the owner**: anything you cannot resolve from the files; do not guess.
5. **Verdict**: one line: ready, ready after the blocking items, or not ready.

Rules on the output itself:
- **Cite or ask.** A finding needs a `file:line` or spec section. If you cannot cite it, it belongs
  under Questions.
- **Tag inference.** Mark any claim you concluded from reading rather than checked (opened a file,
  ran a command) as `Inferred`.
- **Repeat review.** If this file was critiqued before, open with one line on what is new since,
  and check only that; do not re-audit the rest.
- **Verified claims: one line.** Say "all quoted excerpts match" once and list only the claims you
  could not confirm. Do not narrate what you checked.
- **Length.** Lite at most 10 lines, Full at most about 40, Plan as needed.
- Do not restate the spec, do not praise, do not rewrite the design.
