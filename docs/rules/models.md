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
- `opencode stats --all --json` gives lifetime tokens and cost (the text table caps at 5 models and `--days 0` means today only); `scripts/measure.sh` records it before and after each builder run, and `measure.sh report <task>` adds the Claude tokens per step from the session transcripts.
- **Reviews (decided 2026-10-03):** Level 1 (default) by the cheap reviewer above, fresh session, read-only. Level 2
  (risk trigger) by Claude. Claude always spot-checks the final diff and checks a reviewer's claims against the code before
  acting. Log each review in `scripts/measure.sh` notes (who, findings, false findings) to judge the split on evidence.
- Claude hands a task to the builder with `scripts/delegate.sh <task file>` (in its own worktree). It passes `-m`
  explicitly: `opencode run` ignores an agent's `model` setting and would use the default, which can be a
  free-tier model. If the builder model is down, delegate.sh stops and Claude asks the owner before any switch.
