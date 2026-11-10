# Query-visible Kusto live reader

The Kusto live dashboard uses one process-local
[`SharedKustoReader`](../src/aictl/kusto/live_reader.py) per normalized engine
endpoint, case-insensitive database name and authentication mode. Ingestion
settings do not create additional readers. Browser connections subscribe to
the live hub, not to independent Kusto pollers.

The reader is an invalidation feed, not another history database. It does not
open SQLite, initialize `HistoryDB`, ingest rows, change schemas or set policies.
Its default table definitions come from the existing store schema and OTel table
definitions. The existing query client factory supplies the SDK client, so reads
and management reads use the existing health operation counters.

## Authority and interface

```python
from aictl.kusto.live_reader import shared_reader

reader = shared_reader(settings)
subscription = reader.subscribe(on_batch)
reader.start()
# Daemon shutdown:
subscription.close()
reader.close()
```

`ReaderBatch` contains:

| Field | Meaning |
|---|---|
| `kind` | `bootstrap`, `changes`, `resync`, or `status` |
| `changed_tables` | Dependencies that require a query-visible projection refresh |
| `rows` | Optional bounded `KustoRow` identity/version hints |
| `frontier` | Opaque per-table database cursors; only completed ranges advance |
| `ready`, `stale`, `reason` | Reader capability/read status, not proof of current data freshness |
| `sequence` | Process-local mailbox ordering, not a durable history revision |
| `details` | Available/missing tables, checked policies, limits and completion times |

A `KustoRow` has `table`, the native primary/unique/rowid `key`, source `version`,
`deleted`, and `data`. Its data contains only key columns, `rowid`, and existing
`session_id`/`project_path` scope columns. Prompts, file contents, configuration
values, tool arguments and raw telemetry bodies are not selected.

These are invalidation hints, not public UI entities. The hub owns public topic
IDs, monotonically increasing entity revisions and replay. Historical sessions,
file inventory/history, hooks, telemetry and derived usage/cost/activity values
must come from successful Kusto queries. A writer's enqueue acknowledgement,
local collector observation or operational DM counter cannot publish those
values or advance this reader's frontier.

OTel collector rows can lack aictl's `RowKey`. Raw OTel tables therefore produce
table invalidations, not invented per-record IDs or a claim that identical raw
rows were deduplicated.

`latest_status()` and `capabilities()` perform no I/O. A subscription without a
callback exposes `get(timeout)` for deterministic embedding and tests. Production
uses the worker thread; it must not call `poll_once()` on the runtime collector
or an HTTP request thread.

## Bootstrap and incremental reads

1. A new subscription immediately receives pending status.
2. The worker discovers existing managed tables with a read-only schema command.
3. It captures the current opaque database cursor and publishes a `bootstrap`
   invalidation **before consumers start their baseline history queries**.
   The batch has no raw fact snapshot and initially reports
   `ready=false, reason="policy_check"`.
4. Read-only per-table ingestion-time policy checks establish which tables can
   use cursor processing. Policy-less tables are explicitly reported as
   reconciliation-only and have no cursor frontier.
5. A bounded union query captures one upper cursor and detects tables with rows
   in `(completed_frontier, captured_upper]`. Dirty versioned tables are drained
   in fixed-bound keyset pages. An empty table range can advance immediately;
   a dirty range advances only after its final complete page.

Each page first finds changed native keys, then queries the **currently visible
winner** for those keys using the store's `arg_max(_v, ...)` semantics, including
tombstones. A late older version consequently cannot resurrect a key whose
visible winner is already a newer tombstone. A source `_v` is never an arrival
watermark: clocks on other machines and delayed queued ingestion do not define
cursor order. Equal versions retain the existing store's `arg_max` tie semantics;
the reader does not invent a cross-machine total order.

The page token is a reversible base64 encoding of a Kusto `pack_array` of the
native key. It is an ASCII ordering token, not a source revision. Server keyset
comparison uses `strcmp`, matching the explicit ascending token order without
relying on client Unicode collation. A repeated page that cannot advance is an
error, not an instruction to skip ahead.

The current-winner lookup can see data newer than the page's upper cursor.
Accordingly, the frontier identifies the invalidation input already processed;
it is **not** a cluster-wide atomic snapshot timestamp or a promise that a
subsequent multi-query board calculation read exactly that snapshot.

## Streaming visibility and ingestion-time requirements

[Database cursors](https://learn.microsoft.com/en-us/kusto/query/database-cursor?view=azure-data-explorer)
are assigned after data becomes queryable. They require ingestion-time policy
to have been enabled when a row was originally ingested. Direct ingestion into
the target table is required for the documented exactly-once cursor guarantee;
extent move/replace and table rename operations are not covered by it.

The official
[streaming ingestion documentation](https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-streaming#performance-and-operational-considerations)
states that cursor updates can lag queryable streaming-buffer data by up to
60 seconds, as background sealing moves rows to column-store extents. A cursor
poll alone must not be presented as immediate RowStore visibility.

The reader therefore also scans query-visible rows with recent or null
`ingestion_time()`. This preview can publish an invalidation before cursor
assignment. It never advances a cursor or proves that a time window is complete.
It is a best-effort early lane: old/null-policy populations, scan backlogs and
rows outside its lookback can delay preview discovery.

[`ingestion_time()`](https://learn.microsoft.com/en-us/kusto/query/ingestion-time-function?view=azure-data-explorer)
is approximate and cannot order overlapping ingestions. Neither its maximum nor
event time is a correctness checkpoint. Raw OTel preview counts and latest
ingestion time only suppress redundant hints; cursor processing and reconciliation
remain independent of those hints.

The
[ingestion-time policy](https://learn.microsoft.com/en-us/kusto/management/ingestion-time-policy?view=azure-data-explorer)
must be checked, not assumed from the presence of `_v`. This reader never enables
it automatically. Missing tables, pending policy checks and reconciliation-only
tables are exposed in capabilities.

## Reconciliation, recovery and replay

Rotating key-hash partitions scan current query-visible identities and tombstones
without a `_v` or ingestion-time lower bound. On completion, a partition emits
`resync` with the affected table, even when it returned no rows. The consumer must
invalidate that dependency and refresh its complete affected projection. This is
necessary to remove entities lost through retention or physical deletion: an
append cursor cannot describe a row that was removed without a tombstone.

The default reconciliation target is one rotation in 300 seconds, not a latency
guarantee. Multi-page partitions, query durations, failures, policy checks and
inactive subscriptions can extend it. `reconciliation_completed_at` reports actual
completed table rotations; it does not fabricate a fresh timestamp on idle ticks.

Shared schema refresh detects tables created after bootstrap, including OTel
tables created on a first export. Table additions/removals and observed policy
changes emit explicit affected-table resyncs. Policies are checked again
periodically; the reported check time describes an observation, not a guarantee
that an administrator cannot change the policy immediately afterward.

Transport errors, truncation/partial query failures, malformed pages and
non-progress leave the page and its checkpoint uncommitted. Last good consumer
data must remain visibly stale. After repeated failures, an explicit recovery
resync precedes a new bootstrap checkpoint and complete consumer baseline.
Process restart and reader replacement likewise require a baseline; reader
checkpoints are memory-only.

The feed coalesces versions to current winners. It is not a lossless audit log
of every intermediate mutation. Rows that disappear before any read, or history
already outside retention, cannot be recovered. Cursor-supported direct-ingestion
ranges are drained without relying on arrival time or client version order;
unsupported ingestion operations are repaired by reconciliation of surviving
query-visible state, not by an unsupported exactly-once claim.

Subscriber mailboxes and the duplicate-hint LRU have fixed limits. LRU eviction
can repeat an invalidation but cannot discard a correctness checkpoint. Mailbox
overflow replaces the pending tail with an explicit `subscriber_overflow` resync
of all dependencies. The hub must invalidate resume and rebuild; it must not
continue a supposedly gap-free stream. Reader readiness still describes the
query worker, not the consumer's incomplete projection; the consumer must mark
its own projection pending until the rebuild completes. A reconnect gets a fresh
bootstrap invalidation without starting another poller. Browser replay remains the hub's
bounded-journal responsibility.

## Work limits and isolation

Default limits are configurable through `ReaderConfig`:

- 250 row hints per page, with one lookahead row.
- Four SDK requests per worker poll, including discovery/policy work.
- 15-second server timeout, bounded result rows and 4 MB result bytes.
- 128 MiB memory per query iterator and per query per node, plus a 25% query
  thread fan-out setting.
- 8,192 duplicate-hint entries with a separate 4 MB byte limit.
- Sixteen pending batches per subscriber, at most 64 subscribers.
- Adaptive idle delay up to 15 seconds and bounded error backoff.

Queries, Python result processing, mailboxes and callbacks run outside runtime
worker and hub locks. One slow callback has its own bounded mailbox rather than
blocking Kusto polling or native runtime updates. With no subscribers, the worker
does not query.

These are configured work/result limits, not measured CPU utilization or
end-to-end latency. A query that cannot fit fails explicitly and keeps prior data
stale rather than returning a false empty or silently incomplete projection.
Bootstrap, rotating reconciliation and legacy null-ingestion previews can still
scan substantial source data; there is no claim of constant server scan cost.
No additional SQLite mirror or per-browser Kusto read loop is used.

Requests explicitly set Kusto's read-only and strict read-only properties.
The account needs query access and read permission for the table schema and
ingestion-time policy commands (a Database Viewer can read the policy); it does
not need schema, policy or ingestion mutation permissions.

## Validation and limits of the observations

[`test_kusto_live_reader.py`](../test/test_kusto_live_reader.py) uses a fake SDK
that separates query visibility from cursor assignment. It covers bootstrap
races, fixed-bound paging, late/out-of-order versions, updates/tombstones,
duplicate and malformed pages, partial/transport failures, recovery/reconnect,
raw OTel invalidations, Unicode identities, shared workers, bounded buffers,
schema/policy changes and runtime hub updates during a deliberately blocked SDK
query.

Read-only SDK probes against the user-approved native destination on
2026-11-10 confirmed the sessions table's enabled ingestion-time policy and
validated cursor detection plus cursor/preview/reconciliation query syntax and
request properties. Page probes selected only bounded identity metadata; no
prompt contents or credentials were printed. No `HistoryDB` initialization,
inserts, policy/schema mutations, reinstall, server restart or UI build was used.

The quiet-table preview returned no rows. Actual streaming visibility/cursor
delay, queued DM latency, sustained load and end-to-end UI latency were **not**
measured. The RowStore timing caveat above comes from the official documentation,
not from fabricated live fixtures or an assumed SDK acknowledgement guarantee.
