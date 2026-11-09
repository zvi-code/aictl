# Using a remote Kusto cluster as the store

SQLite is the default backend and needs no setup. Kusto (Azure Data Explorer, or a Fabric Eventhouse) is the alternative backend: the history lives in a Kusto database instead of the SQLite file. Every table becomes a table of that database, the daemon serves entirely from it, and nothing is written to `~/.config/aictl/history.db`. An existing SQLite history is not moved.

## 1. Get a cluster and create the database

You provide the cluster and an empty database; aictl owns everything inside the database (the tables, their policies, the information schema) and creates it all on the first start. It does not create the database itself: on Azure Data Explorer a database is an Azure resource, on Fabric it belongs to the Eventhouse. The database name is `kusto_database`, `aictl` by default. Any of these works; pick the cheapest you have access to.

**A local emulator**, free, for trying it out (needs Docker; on an Apple Silicon Mac the `--platform` flag is required):

```bash
docker run --platform linux/amd64 -e ACCEPT_EULA=Y -m 4G -d --name kustainer -p 8080:8080 mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
```

```bash
curl -s -X POST http://localhost:8080/v1/rest/mgmt -H "Content-Type: application/json" -d '{"csl":".create database aictl volatile"}'
```

The second command creates the database in memory (`volatile`): it is gone when the container stops. To keep it across restarts, mount a folder into the container and create the database as `persist`, naming a metadata folder and a data folder under the mount:

```bash
docker run --platform linux/amd64 -e ACCEPT_EULA=Y -m 4G -d --name kustainer -p 8080:8080 -v "$HOME/kustodata:/kustodata" mcr.microsoft.com/azuredataexplorer/kustainer-linux:latest
```

```bash
curl -s -X POST http://localhost:8080/v1/rest/mgmt -H "Content-Type: application/json" -d '{"csl":".create database aictl persist (@\"/kustodata/dbs/aictl/md\", @\"/kustodata/dbs/aictl/data\")"}'
```

In a KQL client the command is `.create database aictl persist (@"/kustodata/dbs/aictl/md", @"/kustodata/dbs/aictl/data")`. The two arguments are a **metadata folder** and a **data folder**, both paths inside the container, and that is all the provisioning there is: mount one host folder at `/kustodata` (the `-v` flag above; on Windows `-v "%USERPROFILE%\kustodata:/kustodata"`), and the command creates the two folders under it. Use a separate pair of folders per database. The host folder is where the data lives; back it up or delete it as you would a SQLite file. After the container is recreated, `.attach database aictl from @"/kustodata/dbs/aictl/md"` brings the database back from those folders. There are no storage containers to provision: that is the emulator's own on-disk format, not Azure Storage. (On an Azure Data Explorer cluster the database's storage is managed by the service and `.create database` is not used; `az kusto database create` is the whole provisioning.) The cluster URL is then `http://localhost:8080`, no sign-in. The emulator has no streaming ingestion; aictl uses `.ingest inline` there on its own.

**An Azure Data Explorer cluster** in your subscription. The dev tier costs about 0.12 USD per hour while running (auto-stop pauses it after days without use), so delete it when done:

```bash
az login
```

```bash
az provider register -n Microsoft.Kusto --wait
```

```bash
az group create -n rg-aictl -l westeurope
```

```bash
az kusto cluster create --cluster-name <name> --resource-group rg-aictl --location westeurope --sku name="Dev(No SLA)_Standard_E2a_v4" tier="Basic" capacity=1 --enable-streaming-ingest true --enable-auto-stop true
```

```bash
az kusto database create --cluster-name <name> --resource-group rg-aictl --database-name aictl --read-write-database soft-delete-period=P30D hot-cache-period=P7D location=westeurope
```

The last command creates the database; run it again with another `--database-name` for a second aictl database on the same cluster. The cluster URL is `https://<name>.westeurope.kusto.windows.net`. The default ingestion mode requires streaming ingestion enabled (the flag above); aictl enables the database policy so tables inherit it. Inline-only ingestion does not require streaming ingestion. To remove everything afterwards: `az group delete -n rg-aictl --yes`.

**A Microsoft Fabric Eventhouse.** Create an Eventhouse in a Fabric workspace (the account needs a Fabric license or trial and the workspace a capacity), open its KQL database and copy the query URI (`https://<id>.kusto.fabric.microsoft.com`). Fabric has streaming ingestion on by default.

## 2. Access to a remote cluster: identities, roles and endpoints

aictl creates the tables and sets policies, so the identity it runs as needs the **Database Admin** role on that database; Ingestor plus Viewer is enough once the tables exist. Grant a role with a management command on the database, for example from the Kusto web UI or `aictl`'s own connection:

```
.add database ['aictl'] admins ('aaduser=someone@contoso.com')
```

Things that trip people up on a remote cluster:

- **One person, two principals.** An Azure AD user (`aaduser=<object id>;<tenant>`) and the same person's personal Microsoft account (`msauser=name@outlook.com`) are different principals to Kusto. `az login` normally gives the Azure AD one; the Kusto web UI signs a personal account in as `msauser=...` unless its directory is switched to the cluster's tenant. Grant the one you actually use, or both.
- **Creating the cluster grants nothing by itself.** Azure Resource Manager roles (Owner, Contributor) do not give data-plane access. Add a principal assignment (`az kusto cluster-principal-assignment create ... --role AllDatabasesAdmin`) or a database role as above.
- **Two URLs.** `https://<name>.<region>.kusto.windows.net` is the engine: queries, commands, streaming ingestion, and what aictl uses. `https://ingest-<name>.<region>.kusto.windows.net` is the Data Management endpoint, for queued ingestion. `kusto_cluster` takes either: aictl drops the `ingest-` prefix and talks to the engine. Changing this URL does not change the ingestion mode; both supported modes use the engine URL.
- **Tenant and MFA.** If the tenant requires multi-factor authentication, `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` refreshes the sign-in aictl uses.
- **Firewalls.** The cluster must be reachable on port 443 from the machine running the daemon; a cluster with a private endpoint or an IP allow list needs that machine's address allowed.
- **Capacity.** A `Dev(No SLA)` cluster has one ingestion slot and a small cache. aictl writes through streaming ingestion, which does not take that slot. An `.ingest inline` command does take it: aictl reads the cluster's capacity once (`.show capacity ingestions`) and sends at most that many inline commands at a time, so they wait in the daemon instead of being refused. A saturated cluster answers HTTP 429, which aictl retries for about a minute.

## 3. Install the Kusto extra

`pipx install "aictl[all]"` includes it; otherwise `pipx inject aictl azure-kusto-data azure-kusto-ingest sqlglot`.

## 4. Sign in and point aictl at the cluster

Sign-in is the Azure CLI's by default, so run `az login` once (with `--scope "https://<cluster host>/.default"` if your tenant asks for multi-factor authentication again). Then either set the cluster in aictl's config file, which is `~/.config/aictl/config.toml` on macOS and Linux and `%APPDATA%\aictl\config.toml` on Windows (`aictl config show` prints the path in use, `aictl config init` creates the file):

```toml
[storage]
kusto_cluster = "https://<name>.westeurope.kusto.windows.net"
kusto_database = "aictl"
kusto_auth = "auto"   # azcli | device | managed-identity | none (emulator)
```

or pass it on the command line, which also works for a one-off run:

```bash
aictl daemon serve --kusto-cluster https://<name>.westeurope.kusto.windows.net --kusto-database aictl
```

The start prints `history store: kusto://<host>/aictl (Kusto, azcli auth; no SQLite file)`. The first start creates the 47 tables, enables streaming ingestion on the database if any table uses it, writes `aictl_information_schema`, which describes every column, and, when a table streams, clears the engine's streaming-ingestion schema cache (`.clear database cache streamingingestion schema`) so the new tables take rows at once; `aictl db schema` prints the same. The streaming policy is set on the database and every table inherits it, so `.show table T policy streamingingestion` shows null for a table that streams. Later starts compare the database's schema with the code's and change only what differs.

### Global ingestion mode and per-table overrides

The global `kusto_ingestion` setting accepts:

| Mode | Behavior |
| --- | --- |
| `auto` (default) | Streaming ingestion on a remote cluster; inline ingestion on the local emulator. |
| `streaming` | Use the streaming-ingestion API and RowStore. Not supported by the emulator. |
| `inline` | Use synchronous `.ingest inline` management commands, without the streaming-ingestion/RowStore path. |

Both backends finish ingestion before aictl issues a dependent read. Inline ingestion is an opt-in option for small development/test writes or a streaming-ingestion workaround, not a recommended backend for sustained telemetry. It consumes ingestion-command capacity and can create many small extents. It is **not queued ingestion**; aictl does not currently implement an asynchronous queued-ingestion backend.

A commit that wrote several tables sends the streamed ones at the same time, four at a time, and the inline ones one after another; a table that fails keeps its rows for the next commit. Inline commands wait for one of the cluster's ingestion slots (one on a `Dev(No SLA)` cluster, twelve on the emulator). Measured on a `Dev(No SLA)` cluster, a first start stored 66,000 rows in 140 s with streaming and 21,000 with inline. Two differences in what is stored: `.ingest inline` cuts a single string longer than 1,048,576 characters at that length, where streaming stores it whole; and half of a surrogate pair, which Kusto would store as U+0000, is written as U+FFFD in both modes. NUL and other control characters are stored as sent.

Set a global default and override individual history tables in `config.toml`:

```toml
[storage]
kusto_cluster = "https://zdev3.swedencentral.dev.kusto.windows.net"
kusto_database = "aictl"
kusto_ingestion = "inline"

[storage.kusto_table_ingestion]
events = "streaming"
```

In this example, `path_defs` and every other history table use inline ingestion except `events`. To retain streaming as the default and bypass it only for `path_defs`, use `kusto_ingestion = "auto"` and `path_defs = "inline"` in the overrides section instead. Table overrides accept only `streaming` or `inline`; an unlisted table uses the global default. Unknown history-table names and invalid modes are errors, not ignored settings.

The equivalent command-line options are:

```bash
aictl daemon serve --kusto-cluster https://zdev3.swedencentral.dev.kusto.windows.net --kusto-database aictl --kusto-ingestion inline --kusto-table-ingestion events=streaming
```

Or bypass streaming for just the failing table:

```bash
aictl daemon serve --kusto-cluster https://zdev3.swedencentral.dev.kusto.windows.net --kusto-database aictl --kusto-table-ingestion path_defs=inline
```

Repeat `--kusto-table-ingestion TABLE=MODE` for additional tables. For environment-based configuration, use `AICTL_KUSTO_INGESTION` for the default and `AICTL_KUSTO_TABLE_INGESTION` for comma-separated overrides. For example, in Windows Command Prompt:

```cmd
set AICTL_KUSTO_INGESTION=inline
set AICTL_KUSTO_TABLE_INGESTION=events=streaming,sessions=streaming
```

For the global default, precedence is CLI, then environment, then config, then `auto`. Table overrides are merged in the same order, with the higher-priority source replacing only matching table entries; a repeated table uses its last value. Per-table overrides take precedence over the global default regardless of source. Use `aictl config show` to inspect config/environment values. CLI choices reach background daemon processes through the inherited environment. Restart a running daemon to apply changes.

Selecting inline changes the client routing; it does not disable existing cluster/database/table policies or affect other clients. There is no automatic switch between backends after a failure. Transient errors receive bounded retries and exhausted/permanent failures are reported. This selection applies to history-row ingestion, including updates and tombstones; schema-management commands such as the write to `aictl_information_schema` remain management commands.

## 5. Check it

Open the dashboard as usual (`aictl daemon serve` prints the URL). In the Kusto web UI or any KQL client, `['sessions'] | count` and `['requests'] | summarize count() by ['tool']` show the rows arriving; `aictl_information_schema | summarize count() by ['scope']` lists the schema. Every environment variable, hook and ingester works the same as with SQLite; the only visible differences are that the Settings screen's "Data sources" shows the cluster, and the size budget never evicts (retention is the database's retention policy, set from `retention_days`).

## What to expect

Measured on a `Dev(No SLA)` cluster in West Europe from a Mac: a query answers in about 0.1 to 0.2 s, so anything that asks many questions in a row is slower than on SQLite. The first start writes the machine's recent history: on an empty database the board answered 44 s after launch and 66,000 rows in 39 tables were stored after 140 s, the newest about half a second old. While that backfill runs, single writes of a large session can take tens of seconds and the board about 5 s. The board's first answer is one computation of about 175 queries, run eight at a time, about 20 s (45 s one after another); after that the daemon serves the last answer at once and recomputes behind it, so the dashboard stays responsive and is up to about a minute behind the cluster. The machine, context and settings routes answer in under two seconds. A cluster in your own region, or a larger SKU, shortens all of this.

## Troubleshooting

- `Principal 'msauser=...' is not authorized` in the Kusto web UI: the web UI signed you in as your personal Microsoft account, which Kusto treats as a different principal from the Azure AD user that created the cluster. Either switch the web UI's directory to the cluster's tenant (account menu, Switch directory), open the cluster from the Azure portal (Data, Query), or add the account as a principal: `.add database ['aictl'] admins ('msauser=<you>@outlook.com')`.
- The web UI connects to `https://ingest-<name>...` but not to `https://<name>...`: the ingest URL is the Data Management endpoint, which only takes ingestion; queries and commands go to the engine URL, and that is the one whose roles matter. Give the identity a database role (above).
- `Kusto ingestion into <table> failed ... Status: 520 ... RowStoreTrimmableStreamException`: a server-side streaming-ingestion storage error. The response alone does not establish its underlying cause; `"@permanent": false` means retryable, not guaranteed to recover. aictl retries transient errors for about a minute. If they persist, investigate the cluster traces using the request/activity and RowStore IDs. For small development/test tables, `--kusto-table-ingestion path_defs=inline` can bypass streaming for that table; `--kusto-ingestion inline` selects inline as the global default, subject to any per-table overrides.
- Slow first polls on a dev-tier cluster: a `Dev(No SLA)` cluster has one ingestion slot and answers a query in about a tenth of a second. aictl uses streaming ingestion, which does not take the slot, sends a batch of updates as one query and writes the tables of a commit at the same time, but the first polls still write every recent session's history, which takes two to three minutes; later polls are quick. With `inline` the same backfill is about three times slower, because every command waits for the one slot.
- `AADSTS50076 ... multi-factor authentication`: run `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` and sign in again.
- `Kusto ingestion into <table> failed transiently (BadRequest_EntityNotFound ...)` in the log right after tables were created or widened: an engine node still streams against the schema it cached before the change. aictl clears that cache after every schema change and repeats the rows for about a minute; without the clear the refusals last 45 to 90 s. `Kusto streaming schema cache was not cleared` means the account may not run the clear command (it needs Database Ingestor or higher); the rows then arrive after the cache expires on its own.
- `Forbidden` on the first start: the account lacks Database Admin on the database (step 2).
- `UserNotLicensed` from Fabric: the account has no Fabric license; start a Fabric trial in the Fabric portal or use an Azure Data Explorer cluster.
- `KustoStoreError: ... Unsupported`: a statement the translator cannot express; the message names the construct. Open an issue with it.
