# Testing aictl

For anyone changing this repository, people and coding agents alike: what to run, when, and how to read the result.

## Commands

Python for tests is the pipx environment `make` picks (`~/.local/pipx/venvs/aictl/bin/python`); run from the repository root with `PYTHONPATH=src` so the checkout is tested, not the installed copy:
`PYTHONPATH=src ~/.local/pipx/venvs/aictl/bin/python -m pytest test/ -q -p no:cacheprovider`.

Dashboard UI lives in `src/aictl/dashboard/ui` (Vite, Solid 2, TSX): `npm install`, `npm test` (type check + Vitest), `npm run lint`, `npm run build`.

## What to run, and when

Run the narrowest thing that can fail for your change while you work, and each broad suite **once**, at the end. Do not rerun a suite that already passed on the same code, and do not rerun it "to be sure" after a step that cannot change its result.

| You changed | While working | Once, before you report done |
|---|---|---|
| Python under `src/aictl` | the test file(s) for that module: `pytest test/test_<name>.py -q` | the full Python suite (about 2.5 min) |
| UI source under `src/aictl/dashboard/ui/src` | `npx vitest run test/<file>` in the UI folder | `npm test`, `npm run lint`, `npm run build`, then commit `src/aictl/dashboard/dist` with the source |
| A payload the UI reads (`contract/*.schema.json`, a projection) | `pytest test/test_contract.py test/test_contract_ui.py -q` | regenerate `ui/src/data/contract.gen.ts` with `node scripts/gen-contract.mjs` (run in the UI folder), then both columns above |
| A Kusto query, a table, or the rows a test writes | the replay test file that uses it | record the missing queries (below), then the full Python suite |
| Only docs or comments | nothing | `pytest test/test_storage_schema_doc.py -q` if `docs/storage-schema.md` or a table changed |

Facts that save reruns:

- **No Python test reads the built `dist`.** Rebuilding it cannot change a pytest result, so do not run pytest again after `npm run build`. `test_contract_ui.py` needs `ui/node_modules` (run `npm install` once in a fresh worktree; without it that file gives 3 errors and nothing else is affected).
- **The UI tests do not need the Python suite and the reverse**, except for the contract tests in the table.
- **E2E (`test/e2e`, Playwright) and `test/e2e_tools` are not part of the default run** (`addopts` ignores them). Run them only when asked; the Playwright screenshot baselines must be re-recorded on purpose after a visual change.
- **Emulator tests** (`test_kusto_*_emulator.py`) skip unless a Kusto emulator answers on `localhost:8080` (see [docs/kusto-cluster.md](kusto-cluster.md)). A skip there is expected, not a failure to chase.
- **Expected result:** zero failures and zero errors. A test that fails only in the full run and passes alone is an isolation defect (shared home, leaked environment): find the test that leaves state behind; do not rerun until it passes.

Replay recordings (`test/recordings/kusto/<test module>/views.jsonl.gz`): tests answer Kusto queries from these files, keyed by the query text, its parameters and the inline data. A changed query or changed test rows gives `UnrecordedQueryError: Missing fixture query`. That is not a product failure: record that one test file against a scratch database, never a database with real data, with `AICTL_RECORD_KUSTO=1` and `AICTL_KUSTO_CLUSTER`, `AICTL_KUSTO_DATABASE`, `AICTL_PARITY_DB` set to the scratch target (and `AZURE_CONFIG_DIR=$HOME/.azure`, because tests replace `HOME`). Recording only adds entries. Commit recordings with the change that needs them.

Writing tests:

- A defect gets a test that fails before the fix; say in the report what failed.
- Tool folders are built in `tmp_path` with a home of the test's own (`monkeypatch.setenv` of `HOME`, `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`). Never write into the home all tests share, and never read real tool folders or real secrets.
- No sleeps, timing assertions, raised timeouts, skips or expected-failure marks. A flaky test is fixed at its cause or removed.
- Guards that must stay green when you touch their area: `test_tombstone_scope.py`, `test_kql_parameter_names.py`, `test_history_paging.py`, `test_source_markers.py`, `test_secret_leaks.py`, `test_storage_schema_doc.py`, `test_tool_data_tables.py`.

In the report: the exact result line of each suite you ran (`4900 passed, 2 skipped`), what you did not run, and why.
