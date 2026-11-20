# Dashboard data contract

`index.json` maps board fields, live entity `data` payloads, and successful JSON detail responses to Draft 2020-12 schemas. `shared` holds common schemas, including one for the full live entity. The server reports `contract_version` in `/api/live/capabilities`. It is independent of the live transport's `protocol` version. Edit `index.json` and `CONTRACT_VERSION` together when the contract version changes.

The schemas describe the payloads of the dashboard, not the rows of the Kusto store. A required field can have a null value if the producer has no measurement. A field that is not required can be absent, for example when it applies only to one scope. Clients ignore extra fields. Raw file responses, request bodies, error responses, and the rest of the SSE envelope are not included.

The local terminal details under `/api/board/terminal/` supply fields not
carried by live process and agent entities. The events and metrics details read
the configured store. The file detail returns a bounded JSON preview only for
files in the daemon's allowlist.

After you change a schema, run `npm run gen:contract` in `src\aictl\dashboard\ui`. The generator updates `src\data\contract.gen.ts`. Vitest checks that it is current.

From the repository root, run the schema, replay, and UI fixture checks:

```powershell
$env:PYTHONPATH = (Resolve-Path src).Path
python -m pytest test\test_contract.py test\test_contract_ui.py test\test_contract_kusto.py
```

The UI fixture test uses Node with TypeScript stripping. It checks the fields that the gallery extracts, and records the known differences in the legacy JavaScript fixtures. Playwright uses the same REST and live tapes as the replay tests.

To run the same recorded-board seed and detail checks against the test database, set the Azure CLI configuration path before pytest isolates the home directory:

```powershell
$env:AZURE_CONFIG_DIR = "$env:USERPROFILE\.azure"
$env:AICTL_PARITY_DB = "aictl_perf_test"
$env:AICTL_RECORD_KUSTO = "1"
python -m pytest test\test_contract_kusto.py
```

The database test sends read-only queries with inline test rows. It records their results under `test\recordings\kusto\test_contract_kusto\`. It does not write to the database.
