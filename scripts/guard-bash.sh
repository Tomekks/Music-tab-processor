#!/usr/bin/env bash
# Claude Code PreToolUse hook for Bash. Turns the "ask first" rules of AGENTS.md into a fixed check:
#   deny: --no-verify (skips the pre-commit secret scan and verify)
#   ask:  git push, gh pr, vercel (publish/deploy); git reset --hard, rm -rf (hard to undo)
# Quoted text and heredoc bodies are ignored, so a commit message may mention these words.
# Never blocks on its own failure: bad input or missing jq means no decision (exit 0, no output).
set -uo pipefail
command -v jq >/dev/null || exit 0
CMD="$(jq -r '.tool_input.command // empty' 2>/dev/null)" || exit 0
[ -n "$CMD" ] || exit 0

C="${CMD%%<<*}"                                      # drop heredoc bodies
C="$(printf '%s' "$C" | tr '\n' ' ' | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")"   # drop quoted strings (also multi-line ones)

decide() { # <ask|deny> <reason>
  jq -n --arg d "$1" --arg r "$2" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d,permissionDecisionReason:$r}}'
  exit 0
}
START='(^|[;&|(] *)'
printf '%s' "$C" | grep -qE -- '--no-verify' && decide deny "guard-bash: --no-verify skips the secret scan and verify. Ask the owner to run it themselves."
printf '%s' "$C" | grep -qE "${START}git( +-C +[^ ]+)? +push" && decide ask "guard-bash: git push needs the owner's yes (AGENTS.md 'Ask first')."
printf '%s' "$C" | grep -qE "${START}gh +pr( |$)" && decide ask "guard-bash: opening or changing a PR needs the owner's yes (AGENTS.md 'Ask first')."
printf '%s' "$C" | grep -qE "${START}(npx +)?vercel( |$)" && decide ask "guard-bash: a deploy needs the owner's yes (AGENTS.md 'Ask first')."
printf '%s' "$C" | grep -qE "${START}git( +-C +[^ ]+)? +reset +--hard" && decide ask "guard-bash: git reset --hard discards work that cannot be recovered."
printf '%s' "$C" | grep -qE "${START}rm +-[a-zA-Z]*(rf|fr)" && decide ask "guard-bash: rm -rf deletes without a trash; deletes need the owner's yes for that case."
exit 0
