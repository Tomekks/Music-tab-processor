# Agent tooling log

**Last updated: 2026-09-10.**
 If that date looks old, treat the list below as possibly stale — check `claude plugin list` for what's actually installed right now.

This tracks tooling installed into the **coding agent's environment** — Claude Code plugins and skills — not the software this project ships. Actual runtime dependencies live where they always have and this file doesn't duplicate them: `app/package.json` (Next.js/TypeScript side) and the pipeline's `requirements.txt`/`pyproject.toml` (Python side). Check those for "what does the app/pipeline depend on"; check this file for "what's installed to help build it."

Newest first. Each entry: name, what it does (≤80 words), when it was installed.

---

## Graphify

Claude Code skill + CLI (`graphifyy` on PyPI, installed via `pipx`) — turns a folder of code/docs/PDFs/images into a queryable knowledge graph: local tree-sitter AST parsing for code (no API key, nothing leaves the machine), optional LLM semantic extraction for docs/images (Gemini key or the host agent itself), god-node/community detection, and a query/path/explain interface. Not yet run against this repo.

**Installed:** 2026-09-10, via `pipx` (isolated venv) + `graphify install`. Scope: user-wide — the skill and its global `~/.claude/CLAUDE.md` trigger apply in every project on this machine, not just this one.

---

## Superpowers

Claude Code plugin (`superpowers@superpowers-marketplace`) — a maintained library of engineering-process skills: brainstorming, writing plans, test-driven development, systematic debugging, requesting/receiving code review, git worktrees, finishing a branch, and verification-before-completion. Adopted as this repo's process driver, superseding the project's own earlier ad hoc versions of the same practices in `AGENTS.md`. See `docs/decisions/agent-workflow-tooling.md` for the full reasoning.

**Installed:** 2026-09-10, user-wide (applies in every repo, not just this one).

---

## CodeScene MCP

MCP server (`codescene@codescene`) — Code Health analysis: complexity/nesting scoring, hotspot detection, refactoring ROI, pre-commit safeguards against unhealthy code. Used for a 2026-09-09 audit of this repo (see `docs/codescene/`); the discipline it surfaced is documented tool-independently in `docs/decisions/stack-and-tooling.md` so it survives losing the tool.

**Installed:** date unknown — predates this log. Scope: local (this project).

---

## Figma

Official Claude Code plugin (`figma@claude-plugins-official`) — design-to-code and code-to-design workflows against Figma files (reading design context, pushing components/screens, Code Connect mappings). Not yet used on a task for this project as of this log's creation.

**Installed:** date unknown — predates this log. Scope: user-wide.
