#!/usr/bin/env bash
# Test: stop-verify.sh checks app/ and the two tools/ folders. Usage: bash scripts/test-stop-verify.sh
# Runs the script in a throwaway git repo with a stub `npm` (its result comes from $STUB_RESULT).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0
mkdir -p "$T/bin" && cat > "$T/bin/npm" <<'S'
#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
[ "$STUB_RESULT" = pass ]
S
chmod +x "$T/bin/npm"
cd "$T" && git init -q . && git config user.email t@t && git config user.name t
for d in app tools/Design_System tools/Control_Centre docs; do mkdir -p "$d"; echo v1 > "$d/f.txt"; done
mkdir -p app/node_modules tools/Design_System/node_modules tools/Control_Centre/node_modules
printf 'node_modules\n' > .gitignore
git add -A && git commit -qm init
run() { # <result> [stdin] -> sets RC, ERR, and LOG (npm calls)
  : > "$T/log"; ERR="$(printf '%s' "${2:-{\}}" | STUB_RESULT="$1" STUB_LOG="$T/log" PATH="$T/bin:$PATH" bash "$ROOT/scripts/stop-verify.sh" 2>&1 >/dev/null)"; RC=$?; LOG="$(cat "$T/log")"; }
check() { # <label> <want-rc> <want-grep-in-ERR-or-LOG or ''>
  if [ "$RC" = "$2" ] && { [ -z "$3" ] || printf '%s\n%s' "$ERR" "$LOG" | grep -q -- "$3"; }; then echo "ok   $1"; else echo "FAIL $1 (rc=$RC err=$ERR log=$LOG)"; fail=1; fi
}
run pass;                         check "no changes: nothing runs" 0 ""; [ -z "$LOG" ] || { echo "FAIL no changes ran npm: $LOG"; fail=1; }
echo v2 > docs/f.txt; run fail;   check "change outside app/tools: nothing runs" 0 ""; [ -z "$LOG" ] || { echo "FAIL docs ran npm"; fail=1; }; git checkout -q docs
echo v2 > tools/Design_System/f.txt; run fail; check "failing Design_System change blocks and names it" 2 "tools/Design_System"
run fail '{"stop_hook_active": true}'; check "retry turn is never blocked" 0 ""
run pass;                         check "passing Design_System change is allowed (verify ran)" 0 "run verify"
run fail;                         check "same diff already passed: skipped, not re-run" 0 ""; [ -z "$LOG" ] || { echo "FAIL re-ran a passed diff"; fail=1; }
git checkout -q tools/Design_System
echo v2 > tools/Control_Centre/f.txt; run fail; check "failing Control_Centre change blocks" 2 "tools/Control_Centre"; git checkout -q tools/Control_Centre
echo v2 > app/f.txt; run fail;    check "failing app change still blocks" 2 "app"; git checkout -q app
echo v2 > tools/Design_System/f.txt; mv tools/Design_System/node_modules tools/Design_System/nm; run fail; check "no node_modules: skipped, not blocked" 0 "skipped"; mv tools/Design_System/nm tools/Design_System/node_modules
exit $fail
