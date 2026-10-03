# Pipeline rules

- Each stage `pipeline/NN_stage/` keeps a `STATUS.md`: what it does, the contract it reads, the contract
  it writes, current status. Update it as part of finishing any task in that folder.
- Stages talk only through `contracts/`; never import another stage's internals. Read the contract first.
- Audio/ML stages are tested by a golden-file comparison against a known-good prior output.
- Set the working directory explicitly; resolve venv binaries via `sys.executable`, not a bare name.
- Create temp files in a `try`/`finally` that removes them.
- Checks: `scripts/verify-pipeline.sh` when `pipeline/` files change. Don't edit `contracts/` as a side effect.

<!-- covers: R057 R183 R225 R232 -->
