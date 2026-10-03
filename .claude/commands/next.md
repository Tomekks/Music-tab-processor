---
description: Say which step of the flow this task is on and exactly what the owner needs to do next
allowed-tools: Bash(bash scripts/start.sh:*)
---
Run `bash scripts/start.sh ""` to find the active task file, then read only that file. If it lists several active tasks, ask the user which one and wait.

Answer in 3 to 5 plain lines for a non-programmer:
1. Which step of `docs/rules/process.md` the task is on (size, brief, review, build, check, report, owner test, ship).
2. What is done, from the ticked checklist and the `Report`.
3. What the owner must do now (approve the "What changes for you" block, run the owner checklist, or answer a Question), with the exact command if there is one.
4. What you will do after that.

Do not start any work. If the task file is missing, stale or has open Questions, say so first.
