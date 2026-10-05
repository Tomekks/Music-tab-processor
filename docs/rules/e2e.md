# Browser tests (e2e areas)

Areas are listed in `docs/rules/e2e-areas.txt`: name, the UI paths it watches, its spec folder, its command.
Today: `workbench` (`cd app && npm run test:e2e:workbench`, specs in `app/e2e/workbench/`, own config
`playwright.workbench.config.ts`; starts the web app on 3000 and the workbench on 5174, stops if either port is taken).

## Default step
A task that changes watched UI runs the area's specs and adds or updates specs in the same task. `verify-task.sh`
prints `e2e-revisit: NOTE ...` when watched UI changed and no spec did; answer it in the Report (specs added, or
why none). The specs are not in `verify` (they need dev servers). The builder cannot run them: it writes them,
Claude runs them and breaks each feature on purpose to see its test fail.

## Revisit the specs when
- a label or role the specs find elements by is renamed;
- a feature a spec covers is removed or redesigned (delete the spec, don't leave it red);
- a new slice lands (1g Save/Discard, other token types, dark values): new specs, written with the feature;
- the design settles enough to consider screenshot comparison.
Claude raises this at brief time and in the Report when a task touches any of the above.

## Limits
- They check behavior, not looks. Spacing, alignment and feel stay the owner's call; green means "still works".
- Specs find things by accessible labels and roles (plus a few `data-testid`), never by CSS class, and read the
  preview iframe's computed styles. They never write `tokens.json` (when Save lands, use a copy).
- One spec file per feature area; a flaky spec is fixed or removed, never rerun until green.
