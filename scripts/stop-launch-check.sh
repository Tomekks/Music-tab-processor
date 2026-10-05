#!/usr/bin/env bash
# Claude Code Stop hook: blocks a final reply that offers a launch command (a dev server, preview or
# stage run) in a code block without BOTH a port check (lsof) and a stop command (kill) in code blocks
# of the same reply. Rule: AGENTS.md "Session". Exit 2 = block (stderr goes back to Claude); anything
# else lets the turn end. Skips the retry turn (stop_hook_active) so it can never loop.
# Input: the hook JSON on stdin (needs transcript_path). Missing or unreadable transcript: allow.
set -uo pipefail

INPUT="$(cat)"
if printf '%s' "$INPUT" | grep -qE '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi

printf '%s' "$INPUT" | python3 -c '
import json, re, sys

try:
    transcript = json.load(sys.stdin).get("transcript_path")
    lines = open(transcript, encoding="utf-8").read().splitlines()
except Exception:
    sys.exit(0)

# Text of every assistant message since the last real user prompt (tool results are not prompts).
texts = []
for line in lines:
    try:
        entry = json.loads(line)
    except Exception:
        continue
    msg = entry.get("message") or {}
    content = msg.get("content")
    if entry.get("type") == "user":
        is_prompt = isinstance(content, str) or any(
            isinstance(b, dict) and b.get("type") == "text" for b in (content or [])
        )
        if is_prompt:
            texts = []
    elif entry.get("type") == "assistant" and isinstance(content, list):
        texts += [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]

blocks = re.findall(r"```[a-zA-Z]*\n(.*?)```", "\n".join(texts), re.S)
code = "\n".join(blocks)
launch = re.search(
    r"(npm|pnpm|yarn)\s+(--prefix\s+\S+\s+)?(run\s+)?(dev|start|stage)\b|\bnext\s+(dev|start)\b|\bvite(\s+dev)?\b", code
)
if launch and not (re.search(r"\blsof\b", code) and re.search(r"\bkill\b", code)):
    sys.stderr.write(
        "BLOCKED: this reply offers a launch command (" + launch.group(0).strip() + ") but its code blocks lack a "
        "free-port check (lsof -i :PORT) and a stop command (kill $(lsof -nP -iTCP:PORT -sTCP:LISTEN -t), never plain lsof -ti :PORT, which also kills browsers). AGENTS.md Session rule: put both in the same "
        "reply, one command per block, then finish.\n"
    )
    sys.exit(2)
'
