#!/usr/bin/env bash
# Test: check-brief.sh refuses "Modify only" paths the builder may not edit. Usage: bash scripts/test-check-brief.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0
task() { # <paths...>: a minimal valid brief whose Modify only lists the given paths
  { printf '# Task: t\n\nStatus: active\nBranch: b\nNext: n\nWritten against: abcdef1\n\n## Scope\n**Modify only:**\n'
    for p in "$@"; do printf -- '- `%s`\n' "$p"; done
    printf '\n**Do NOT touch:**\n- x\n\n## Size\nFiles touched: 1.\n\n## Risk\nnone\n\n## Acceptance checks\n- Run: `bash scripts/verify-task.sh` / Expected: PASS\n\n## Questions\n(none open)\n'; } > "$T/t.md"; }
expect() { # <label> <want: OK|BLOCKED> <paths...>
  label="$1"; want="$2"; shift 2; task "$@"
  out="$(bash scripts/check-brief.sh "$T/t.md" 2>&1)"
  if [ "$want" = FULLPATH ]; then echo "$out" | grep -q "not a full path" && echo "ok   $label" || { echo "FAIL $label: $out"; fail=1; }
  elif [ "$want" = OK ]; then echo "$out" | grep -q "check-brief: OK" && echo "ok   $label" || { echo "FAIL $label: $out"; fail=1; }
  else echo "$out" | grep -q "BLOCKED for the builder" && echo "ok   $label" || { echo "FAIL $label: $out"; fail=1; }; fi
}
expect "a normal source file is allowed"            OK      tools/Design_System/src/lib/a.ts
expect "a config file (vite.config.ts) is refused"  BLOCKED tools/Design_System/vite.config.ts
expect "an AGENTS.md is refused"                    BLOCKED tools/Design_System/AGENTS.md
expect "package.json is refused"                    BLOCKED tools/Design_System/package.json
expect "a script is refused"                        BLOCKED scripts/new.sh
expect "a rules doc is refused"                     BLOCKED docs/rules/review.md
expect "a task file under docs/work is allowed (last rule wins)" OK docs/work/some-task.md
expect "one blocked path among good ones is refused" BLOCKED tools/x/a.ts tools/x/b.config.js
expect "a bare file name that does not exist at the root is refused (verify-task would call it missing)" FULLPATH tools/x/a.ts previewHeight.ts
expect "a bare name that exists at the repo root (README.md) is allowed" OK README.md
expect "a path with spaces is refused" FULLPATH "tools/x/a b.ts"
exit $fail
