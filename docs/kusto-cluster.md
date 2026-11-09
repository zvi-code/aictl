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

In a KQL client the command is `.create database aictl persist (@"/kustodata/dbs/aictl/md", @"/kustodata/dbs/aictl/data")`; the two paths are inside the container. After a restart, `.attach database aictl from @"/kustodata/dbs/aictl/md"` brings it back. The cluster URL is then `http://localhost:8080`, no sign-in. The emulator has no streaming ingestion; aictl uses `.ingest inline` there on its own.

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

The last command creates the database; run it again with another `--database-name` for a second aictl database on the same cluster. The cluster URL is `https://<name>.westeurope.kusto.windows.net`. The cluster must have streaming ingestion enabled (the flag above); aictl sets the table-level policy itself. To remove everything afterwards: `az group delete -n rg-aictl --yes`.

**A Microsoft Fabric Eventhouse.** Create an Eventhouse in a Fabric workspace (the account needs a Fabric license or trial and the workspace a capacity), open its KQL database and copy the query URI (`https://<id>.kusto.fabric.microsoft.com`). Fabric has streaming ingestion on by default.

## 2. Access to a remote cluster: identities, roles and endpoints

aictl creates the tables and sets policies, so the identity it runs as needs the **Database Admin** role on that database; Ingestor plus Viewer is enough once the tables exist. Grant a role with a management command on the database, for example from the Kusto web UI or `aictl`'s own connection:

```
.add database ['aictl'] admins ('aaduser=someone@contoso.com')
```

Things that trip people up on a remote cluster:

- **One person, two principals.** An Azure AD user (`aaduser=<object id>;<tenant>`) and the same person's personal Microsoft account (`msauser=name@outlook.com`) are different principals to Kusto. `az login` normally gives the Azure AD one; the Kusto web UI signs a personal account in as `msauser=...` unless its directory is switched to the cluster's tenant. Grant the one you actually use, or both.
- **Creating the cluster grants nothing by itself.** Azure Resource Manager roles (Owner, Contributor) do not give data-plane access. Add a principal assignment (`az kusto cluster-principal-assignment create ... --role AllDatabasesAdmin`) or a database role as above.
- **Two URLs.** `https://<name>.<region>.kusto.windows.net` is the engine: queries, commands, and what aictl's `kusto_cluster` takes. `https://ingest-<name>.<region>.kusto.windows.net` is the Data Management endpoint, for queued ingestion only; it accepts a connection from anyone signed in, which is why it can seem to work while the engine refuses.
- **Tenant and MFA.** If the tenant requires multi-factor authentication, `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` refreshes the sign-in aictl uses.
- **Firewalls.** The cluster must be reachable on port 443 from the machine running the daemon; a cluster with a private endpoint or an IP allow list needs that machine's address allowed.
- **Capacity.** A `Dev(No SLA)` cluster has one ingestion slot and a small cache. aictl writes through streaming ingestion, which does not take that slot, but heavy management commands (`.set-or-append`, `.set-or-replace`) queue behind each other, and a saturated cluster answers HTTP 429, which aictl retries for a few seconds.

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

The start prints `history store: kusto://<host>/aictl (Kusto, azcli auth; no SQLite file)`. The first start creates the 47 tables, enables their streaming ingestion policy and writes `aictl_information_schema`, which describes every column; `aictl db schema` prints the same.

## 5. Check it

Open the dashboard as usual (`aictl daemon serve` prints the URL). In the Kusto web UI or any KQL client, `['sessions'] | count` and `['requests'] | summarize count() by ['tool']` show the rows arriving; `aictl_information_schema | summarize count() by ['scope']` lists the schema. Every environment variable, hook and ingester works the same as with SQLite; the only visible differences are that the Settings screen's "Data sources" shows the cluster, and the size budget never evicts (retention is the database's retention policy, set from `retention_days`).

## Troubleshooting

- `Principal 'msauser=...' is not authorized` in the Kusto web UI: the web UI signed you in as your personal Microsoft account, which Kusto treats as a different principal from the Azure AD user that created the cluster. Either switch the web UI's directory to the cluster's tenant (account menu, Switch directory), open the cluster from the Azure portal (Data, Query), or add the account as a principal: `.add database ['aictl'] admins ('msauser=<you>@outlook.com')`.
- The web UI connects to `https://ingest-<name>...` but not to `https://<name>...`: the ingest URL is the Data Management endpoint, which only takes ingestion; queries and commands go to the engine URL, and that is the one whose roles matter. Give the identity a database role (above).
- Slow first start on a dev-tier cluster: a `Dev(No SLA)` cluster has one ingestion slot. aictl uses streaming ingestion, which does not take it, but the first start still creates 48 tables and their policies (about 10 s) and the first polls ingest every recent session.
- `AADSTS50076 ... multi-factor authentication`: run `az login --tenant <tenant id> --scope "https://<cluster host>/.default"` and sign in again.
- `Forbidden` on the first start: the account lacks Database Admin on the database (step 2).
- `UserNotLicensed` from Fabric: the account has no Fabric license; start a Fabric trial in the Fabric portal or use an Azure Data Explorer cluster.
- `KustoStoreError: ... Unsupported`: a statement the translator cannot express; the message names the construct. Open an issue with it.
