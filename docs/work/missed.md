# Missed by the new process

If the lean process misses something the old one caught, log it here and decide together whether to add
the rule back. Old rules can be found in the `pre-lean` tag (`git grep <keyword> pre-lean`).

| Date | What went wrong or was missed | Where the old process caught it | Decision |
|---|---|---|---|
| 2026-10-05 | Builder (Muse #high, task 1f4) reported `Error: Permission denied: shell` on its first command, `git status --porcelain -- <Modify only paths>` (the executor.md drift check), and stopped without building. `opencode debug agents` shows `git status*` allowed and the two new `run-e2e.sh` lines present, so the allow-list as loaded is correct. Two self-tests (builder agent asked to run `git status --short`) ran it once under the original `.opencode/agents/builder.md` and refused twice under the new one, but the refusals came from the builder reading task-file notes, so they prove nothing. Cause NOT found. Next time: capture the exact command string that is denied (the log line is cut at about 230 characters) and whether it is a compound command. | not applicable (new failure) | open: gather the exact denied command first |
