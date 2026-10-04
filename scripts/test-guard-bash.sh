#!/usr/bin/env bash
# Test: guard-bash.sh asks before push/PR/deploy/destructive commands and denies --no-verify.
# Usage: bash scripts/test-guard-bash.sh
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)" || exit 1
fail=0
expect() { # <label> <want: allow|ask|deny> <command>
  local out got
  out="$(jq -n --arg c "$3" '{tool_name:"Bash",tool_input:{command:$c}}' | bash "$ROOT/scripts/guard-bash.sh" 2>/dev/null)"; local rc=$?
  if [ -z "$out" ]; then got=allow; else got="$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision' 2>/dev/null || echo BAD)"; fi
  if [ "$rc" = 0 ] && [ "$got" = "$2" ]; then echo "ok   $1"; else echo "FAIL $1 (want $2, got $got, rc=$rc)"; fail=1; fi
}
expect "plain command passes"                         allow 'ls -la'
expect "npm verify passes"                            allow 'npm run verify'
expect "git push asks"                                ask   'git push origin master'
expect "git push after && asks"                       ask   'git status && git push'
expect "git -C dir push asks"                         ask   'git -C /tmp/x push'
expect "gh pr create asks"                            ask   'gh pr create --title x'
expect "vercel deploy asks"                           ask   'npx vercel deploy --prod --yes'
expect "git reset --hard asks"                        ask   'git reset --hard HEAD~1'
expect "rm -rf asks"                                  ask   'rm -rf node_modules'
expect "plain rm passes"                              allow 'rm file.txt'
expect "--no-verify is denied"                        deny  'git commit --no-verify -m x'
expect "--no-verify inside a quoted message passes"   allow 'git commit -m "docs: explain --no-verify"'
expect "git push inside a quoted message passes"      allow 'git commit -m "fix git push docs"'
expect "the words mid-command (not a command) pass"  allow 'echo git push is blocked here'
expect "a multi-line quoted message passes"       allow $'git commit -m "feat: guard\n\ndeny --no-verify and ask on git push\n"'
expect "words inside a heredoc message pass"          allow $'git commit -m "$(cat <<\'EOF\'\nfix: git push and --no-verify notes\nEOF\n)"'
# Garbage on stdin must never block: exit 0, no decision.
out="$(printf 'not json' | bash "$ROOT/scripts/guard-bash.sh" 2>/dev/null)"; rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && echo "ok   non-JSON input passes" || { echo "FAIL non-JSON input (rc=$rc out=$out)"; fail=1; }
exit $fail
