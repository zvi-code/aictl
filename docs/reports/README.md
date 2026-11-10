# Generating the Kusto reports

`aictl db report` writes one self-contained HTML page from the data in a Kusto store. Generated pages hold data of the machine they came from, so they are not kept in this repository. Write them outside the repository, or to a path that git ignores, for example `wip/`.

## Before you run

1. Install aictl with the Kusto extra: `pipx install "aictl[all]"`.
2. Sign in: `az login`. The local emulator needs no sign-in.
3. Point aictl at the store. Use the cluster and the database that `aictl daemon serve --kusto-cluster URL` writes to.

macOS and Linux:

```bash
export AICTL_KUSTO_CLUSTER=https://<cluster>.<region>.kusto.windows.net
export AICTL_KUSTO_DATABASE=aictl
```

Windows PowerShell:

```powershell
$env:AICTL_KUSTO_CLUSTER = "https://<cluster>.<region>.kusto.windows.net"
$env:AICTL_KUSTO_DATABASE = "aictl"
```

If `config.toml` already has `[storage] kusto_cluster`, skip step 3.

On Windows, `setx` does not change the terminal it runs in: a variable set with it reaches only terminals opened after it. Use the `$env:` lines above for the current terminal.

Or give the store on the command line, with no variable at all:

```bash
aictl db report --kusto-cluster https://<cluster>.<region>.kusto.windows.net --kusto-database aictl --out kusto-report-all-sections.html
```

## The lines to run

All ten sections:

```bash
aictl db report --out kusto-report-all-sections.html
```

The five second-wave sections only:

```bash
aictl db report --sections returns,stuck,models,skills,mcp --out kusto-report-second-wave.html
```

A part of the data: list what the store holds, then name it. `--mcp`, `--skill` and `--agent` keep the sessions in which that MCP server, skill or agent type was used.

```bash
aictl db report --values
aictl db report --tool copilot-cli --from 2026-11-01 --to 2026-11-09 --out kusto-report-copilot.html
aictl db report --mcp <server> --sections mcp,stuck,returns --out kusto-report-mcp.html --json wip/kusto-report-mcp.json
```

The Copilot agent [kusto-report](../../.github/agents/kusto-report.agent.md) chooses such cuts from the store's own data and writes the pages and a summary into `wip/kusto-reports/`: `copilot --agent kusto-report`.

Only the last 30 days:

```bash
aictl db report --days 30 --out kusto-report-30-days.html
```

From a source checkout, without installing, run the same command through Python from the repository root:

```bash
PYTHONPATH=src python -c "import sys; from aictl.cli import main; sys.argv=['aictl','db','report','--sections','returns,stuck,models,skills,mcp','--out','wip/kusto-report-second-wave.local.html']; main()"
```

## What the command prints

```
Running 10 queries on kusto://<cluster>.<region>.kusto.windows.net/aictl, all data
  dna          2.30 s  ok
  relay        3.34 s  ok
  cost         2.15 s  ok
  slow         1.68 s  ok
  context      1.24 s  ok
  returns      0.87 s  ok
  stuck        1.36 s  ok
  models       0.70 s  ok
  skills       0.60 s  ok
  mcp          0.58 s  ok
Wrote /path/to/kusto-report-all-sections.html
```

These times are from a dev-tier Azure Data Explorer cluster with about 31,000 requests of six days. The command only reads. It runs the queries in `src/aictl/kusto/report/queries/`, puts the result rows into `src/aictl/kusto/report/template.html` and writes the page. Each section of the page shows the KQL that produced it.

## What a page holds

Aggregates, 8-character session id prefixes, the names of tools, models, MCP servers and skills, file base names, and the host name of the cluster. No prompt text, no full paths and no user names. Check a page before you share it.

The sections, the options and how to read the page are in the [README](../../README.md#insight-report-from-a-kusto-store-aictl-db-report-work-in-progress) and in [docs/kusto-cluster.md](../kusto-cluster.md#report).
