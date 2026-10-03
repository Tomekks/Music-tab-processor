# Models

Claude Pro allowance is the scarce resource, so Claude does the thinking and opencode models do the typing.

| Role | Model | Notes |
|---|---|---|
| Grilling, plan, Level 2 review | Claude (Sonnet) | Judgment work only; no line-by-line specs or builds |
| Brief drafting and build | `opencode-go/muse-spark-1.3-contributor` | Default builder |
| Level 1 review | `opencode-go/deepseek-v4.1-flash` | Different family from the builder; fresh session; read-only |
| Candidates for bake-off | `qwen3.8-max`, `kimi-k3`, `deepseek-v4-pro` | See below |

## Rules
- **Muse trains on prompts:** the default builder is cheap because its prompts and completions may train Meta
  models (owner accepted this 2026-10-02). Never send secrets, `.env` contents or credentials to any model.
- **Never use free-tier models** (ids ending `-free`), whichever provider. Paid `opencode-go/` ids only.
- **Start cheapest. Switch on evidence only:** verify fails twice, or a reviewer finds a correctness
  bug. Log each switch as one line in `docs/work/scorecard.md` (date, task, from → to, why).
- Models change often; a model that starts misbehaving gets replaced, with the reason logged.
- **Bake-off:** give the same 3 real tasks from this repo to each candidate and compare first-try pass
  rate, fix loops and tokens. Own tasks are better evidence than reputation.
- Which model suits which task is unknown until the scorecard has about 10 rows. Don't guess before then.

## Running opencode
- The wrapper scripts set `OPENCODE_DISABLE_CLAUDE_CODE=1` (no `~/.claude` notes) and the project
  `opencode.json` switches off the GitHub and Figma connections and sets a paid default model.
- `opencode stats --models --days 0` shows tokens and cost per model; read it before and after a task.
- **Reviews:** when the owner asks for a review, Claude gives only the one-line command
  `scripts/run-reviewer.sh <task file> "<already decided / answered>"` (fill the note from the conversation, so
  answered questions are not raised again). Never describe the risks you expect it to find: that anchors the
  review. The rules live in `.opencode/agents/reviewer.md` so they cannot drift between prompts.
- Start the builder with `scripts/run-builder.sh <task file>` (in its own worktree) and the reviewer with
  `scripts/run-reviewer.sh <task file>`. The scripts pass `-m` explicitly: `opencode run` ignores an agent's
  `model` setting and would use the default, which can be a free-tier model.
