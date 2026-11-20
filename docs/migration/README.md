# Migration records

These files record the phase-0 work of the dashboard and storage rewrite. Later phases use them as work lists and baselines.

| Plan item | Record |
|---|---|
| 1. Parity inventory | [`../ui/spec.md`](../ui/spec.md) |
| 2. Consumer audit | [`consumer-audit.md`](consumer-audit.md) |
| 3. Recordings | [`../../test/recordings/README.md`](../../test/recordings/README.md) |
| 4. UI baseline | Not done in phase 0. The measurement replays the recordings in Chromium, which needs the Playwright replay harness of phase 1, item 6. It is measured with that harness before phase 3 changes the UI. The bundle sizes are in [`ledger-baseline.md`](ledger-baseline.md). |
| 5. The 9 failing UI tests | [`../ui/spec.md`](../ui/spec.md) |
| 6. Ledger script and baseline | `C:\OSS\aictl\scripts\ledger.mjs`, [`ledger-baseline.md`](ledger-baseline.md) |
| 7. Write-path audit | [`write-path-audit.md`](write-path-audit.md) |
| 8. Read-path audit | [`read-path-audit.md`](read-path-audit.md) |
| 9. `sqlite3` users | [`sqlite-users.md`](sqlite-users.md) |
| 10. Test database | `aictl_perf_test`, loaded by `C:\OSS\aictl\scripts\recording\load_perf_test_db.py`; row counts in [`../../test/recordings/README.md`](../../test/recordings/README.md) |
| 11. Load after the revision-5 fixes | [`item11-measurement.md`](item11-measurement.md) (local node only) |
