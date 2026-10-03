# Models

Claude Pro allowance is the scarce resource, so Claude does the thinking and opencode models do the typing.

| Role | Model | Notes |
|---|---|---|
| Grilling, plan, Level 2 review | Claude (Sonnet) | Judgment work only; no line-by-line specs or builds |
| Brief drafting and build | `opencode-go/muse-spark-1.3-contributor` | Default builder |
| Level 1 review | `opencode-go/deepseek-v4.1-flash` | Different family from the builder; fresh session; read-only |
| Candidates for bake-off | `qwen3.8-max`, `kimi-k3`, `deepseek-v4-pro` | See below |

## Rules
- **Never use free-tier models** (ids ending `-free`), whichever provider. Paid `opencode-go/` ids only.
- **Start cheapest. Switch on evidence only:** verify fails twice, or a reviewer finds a correctness
  bug. Log each switch as one line in `docs/work/scorecard.md` (date, task, from → to, why).
- Models change often; a model that starts misbehaving gets replaced, with the reason logged.
- **Bake-off:** give the same 3 real tasks from this repo to each candidate and compare first-try pass
  rate, fix loops and tokens. Own tasks are better evidence than reputation.
- Which model suits which task is unknown until the scorecard has about 10 rows. Don't guess before then.

## Running opencode
- Set `OPENCODE_DISABLE_CLAUDE_CODE=1` (so it doesn't load `~/.claude` skills and notes); the project
  `opencode.json` switches off the GitHub and Figma connections.
- `opencode stats --models --days 0` shows tokens and cost per model; read it before and after a task.
- The builder works in its own worktree, started with `/exec <task file>`; the reviewer with `/review`.
