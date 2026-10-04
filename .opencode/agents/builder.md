---
description: Builder. Builds one task from its task file; checks and saves work only through two exact scripts.
mode: primary
model: opencode-go/muse-spark-1.3-contributor
temperature: 0.1
steps: 60
permission:
  # Default deny, then allow what a build needs. ORDER MATTERS: the LAST matching rule wins.
  "*": deny
  read:
    "*": allow
    "*.env": deny
    "*.env.*": deny
    "*.env.example": allow
  grep: allow
  glob: allow
  # Edits are open except protected paths; scripts/check-scope.sh then enforces the task's Modify only list.
  edit:
    "*": allow
    "contracts/*": deny
    "docs/*": deny
    "docs/work/*.md": allow
    "docs/work/ledger/*": deny
    "docs/work/TEMPLATE.md": deny
    "docs/work/scorecard.md": deny
    "docs/work/missed.md": deny
    "scripts/*": deny
    ".githooks/*": deny
    ".github/*": deny
    ".opencode/*": deny
    "opencode.json": deny
    "*AGENTS.md": deny
    "CLAUDE.md": deny
    "*package.json": deny
    "*package-lock.json": deny
    "*.config.*": deny
    "*.env": deny
    "*.env.*": deny
    "*node_modules/*": deny
    "*.next/*": deny
    ".git/*": deny
  # Shell is a short ALLOW list (everything else denied: no push, internet, rm, installs). Tests it runs are
  # still code, so scripts/check-scope.sh and a clean worktree are the real backstop, not this list.
  shell:
    "*": deny
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "git *--output*": deny
    "git diff *--no-index*": deny
    "lsof -i *": allow
    "npm --prefix app run test": allow
    "npm --prefix app run lint": allow
    "npm --prefix app run typecheck": allow
    "npm --prefix app run verify": allow
    "npm --prefix tools/Control_Centre run test": allow
    "npm --prefix tools/Control_Centre run check": allow
    "npm --prefix tools/Control_Centre run verify": allow
    "npm --prefix tools/Design_System run test": allow
    "npm --prefix tools/Design_System run check": allow
    "npm --prefix tools/Design_System run verify": allow
    "node --test *": allow
    "bash scripts/verify-task.sh": allow
    "bash scripts/finish.sh": allow
---
You build one task. Follow `docs/rules/executor.md` exactly: read it first, then the task file you were
given (`AGENTS.md` is already loaded). Nothing else unless the task file names it.

You are an implementer, not an explorer. If something is unclear or the spec looks wrong, write the
question under `## Questions` in the task file and STOP. Do not guess.

Check your work only with `bash scripts/verify-task.sh` and save it only with `bash scripts/finish.sh`.
Stop when every acceptance check passes and finish has succeeded.
