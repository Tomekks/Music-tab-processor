#!/usr/bin/env bash
# Runs the builder model on one task file, with the checks that don't need a model before and after.
# Usage: scripts/run-builder.sh <task-file>      (run it inside the task's worktree, on its branch)
# Env:   BUILDER_MODEL (default muse-spark#high), BUILDER_TIMEOUT seconds total (default 1200); dead runs are cut off early, see scripts/oc-run.sh
set -uo pipefail
TASK="${1:?usage: scripts/run-builder.sh <task-file>}"
cd "$(git rev-parse --show-toplevel)" || exit 1
[ -f "$TASK" ] || { echo "no such file: $TASK"; exit 1; }

MODEL="${BUILDER_MODEL:-opencode-go/muse-spark-1.3-contributor#high}"
TIMEOUT="${BUILDER_TIMEOUT:-1200}"
case "$MODEL" in *free*) echo "refusing free-tier model: $MODEL"; exit 1 ;; esac
case "$MODEL" in opencode-go/*) ;; *) echo "builder model must be an opencode-go/ id, got: $MODEL"; exit 1 ;; esac

# 1. The brief has every required part and no unfilled blanks.
bash scripts/check-brief.sh "$TASK" || { echo "run-builder: stopped, fix the task file first"; exit 1; }

# 2. Right branch, and never master.
BRANCH="$(git branch --show-current)"
WANT="$(sed -n 's/^Branch:[[:space:]]*//p' "$TASK" | head -1)"
[ "$BRANCH" = "$WANT" ] || { echo "run-builder: task says Branch: $WANT but you are on '$BRANCH'"; exit 1; }
case "$BRANCH" in master|main) echo "run-builder: never build on $BRANCH, use a worktree"; exit 1 ;; esac

# 3. Drift: the files to modify must be clean and unchanged since the commit the task was written against.
BASE="$(sed -n 's/^Written against:[[:space:]]*//p' "$TASK" | head -1 | grep -oE '[0-9a-f]{7,40}' | head -1)"
# shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
PATHS="$(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$TASK" | grep -oE '`[^`]+`' | tr -d '`')"
PATHARGS=(); while IFS= read -r p; do [ -n "$p" ] && PATHARGS+=("$p"); done <<< "$PATHS"
[ -z "$(git status --porcelain -- "${PATHARGS[@]}" 2>/dev/null)" ] || { echo "run-builder: 'Modify only' files already have uncommitted changes:"; git status --short -- "${PATHARGS[@]}"; exit 1; }
if ! git diff --quiet "$BASE" HEAD -- "${PATHARGS[@]}" 2>/dev/null; then
  echo "run-builder: DRIFT, 'Modify only' files changed since $BASE:"; git diff --stat "$BASE" HEAD -- "${PATHARGS[@]}"; exit 1
fi

# 4. Area rules the builder would not load on its own (opencode only reads AGENTS.md files above the start folder).
EXTRA=""
for area in app pipeline tools/Control_Centre tools/Design_System; do
  if printf '%s\n' "${PATHARGS[@]}" | grep -q "^$area/" && [ -f "$area/AGENTS.md" ]; then EXTRA="$EXTRA $area/AGENTS.md"; fi
done

mkdir -p docs/work/runs; LOG="${LOG_FILE:-docs/work/runs/$(basename "$TASK" .md).log}"
PROMPT="Build the task in $TASK. Read docs/rules/executor.md first, then the task file${EXTRA:+, then these area rules:$EXTRA}. Follow them exactly."
if [ "${BUILDER_MODE:-}" = critique ]; then
  PROMPT="Do NOT build anything. Read docs/rules/executor.md and the task file $TASK as if you had to build it cold. Under '## Questions' in the task file write at most 5 lines, only things that are ambiguous, contradictory or missing so you could not build it without guessing (name the exact spot). Also allowed, prefixed CUT: or REUSE:, a thing the brief asks you to build that could be skipped, or that existing code already does (cite file:line). No other suggestions, no redesign, no improvements. If you could build it as written and see nothing to cut or reuse, write exactly: clear. Edit nothing else."
fi

echo "run-builder: $MODEL on $TASK (timeout ${TIMEOUT}s, log $LOG)"
# env -i: the builder never sees tokens or secrets from this shell, only what opencode needs to run.
env -i HOME="$HOME" PATH="$PATH" USER="${USER:-}" TERM=dumb LANG="${LANG:-en_US.UTF-8}" TASK_FILE="$TASK" \
  OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1 \
  FIRST_OUTPUT_TIMEOUT="${FIRST_OUTPUT_TIMEOUT:-60}" STALL_TIMEOUT="${STALL_TIMEOUT:-180}" \
  bash scripts/oc-run.sh "$LOG" "$TIMEOUT" -- --agent builder -m "$MODEL" \
  --title "build: $(basename "$TASK" .md)" "$PROMPT"
RC=$?

# Keep the log small: strip colour codes, last 200 lines, newest 10 logs.
sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' "$LOG" | tail -n 200 > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
# shellcheck disable=SC2012
ls -t docs/work/runs/*.log 2>/dev/null | tail -n +11 | while IFS= read -r old; do rm -f "$old"; done

# 5. What happened, from facts not from the model's own summary.
case "$RC" in
  124) echo "run-builder: TIMEOUT: stopped after ${TIMEOUT}s." ;;
  125) echo "run-builder: NO RESPONSE within ${FIRST_OUTPUT_TIMEOUT:-60}s, so the model or endpoint is down right now. Retry later, or set BUILDER_MODEL to another opencode-go/ model." ;;
  126) echo "run-builder: STALLED, no new output for ${STALL_TIMEOUT:-180}s, stopped." ;;
  127) echo "run-builder: finished with an empty log (silent failure)." ;;
esac
if grep -qiE '^> [^ ]+ · .*free' "$LOG"; then echo "run-builder: WARNING a free-tier model answered. Stop and tell the owner."; fi
echo "--- last 25 lines of the builder's output"; grep -vE '^\s*$' "$LOG" | tail -25
echo "--- git log -1"; git log -1 --oneline
bash scripts/check-scope.sh "$TASK" || echo "run-builder: SCOPE FAIL, do not accept this work"
echo "--- git status --short"; git status --short
