"""Read the same scoped projections as the dashboard, from the serving daemon."""

import json
from urllib.error import HTTPError, URLError

import click

from ..client import DEFAULT_HOST, DEFAULT_PORT, ServerClient


@click.command()
@click.argument("view", type=click.Choice(["nodes", "overview", "health", "settings", "session", "identity"]))
@click.argument("session_id", required=False)
@click.option("--node", help="Reporting node ID (legacy for untagged history).")
@click.option("--all-nodes", is_flag=True, help="Query every reporting node.")
@click.option("--since", type=float, help="Overview start, inclusive Unix seconds (default: seven days before end).")
@click.option("--until", type=float, help="Overview end, exclusive Unix seconds.")
@click.option("--port", type=click.IntRange(1, 65535), envvar="AICTL_PORT", default=DEFAULT_PORT, show_default=True)
@click.option("--json", "as_json", is_flag=True, help="Print the dashboard API response as JSON.")
def board(view, session_id, node, all_nodes, since, until, port, as_json):
    """Inspect board data. Defaults to this daemon; all operations are read-only.

    Use `aictl board nodes` for discovery, `aictl board overview --all-nodes`
    for fleet totals, or `aictl board session ID --node NAME` for one session.
    """
    if node is not None and all_nodes:
        raise click.UsageError("Choose either --node or --all-nodes")
    if view == "session" and (not session_id or not node):
        raise click.UsageError("Session detail needs both SESSION_ID and --node")
    if view != "session" and session_id is not None:
        raise click.UsageError("SESSION_ID is only valid for the session view")
    if view != "overview" and (since is not None or until is not None):
        raise click.UsageError("--since and --until apply only to overview")
    params = {"view": view, "scope": "fleet" if all_nodes else "node" if node is not None else "local"}
    params.update(
        {
            k: str(v)
            for k, v in (("node_id", node), ("session_id", session_id), ("since", since), ("until", until))
            if v is not None
        }
    )
    client = ServerClient(f"http://{DEFAULT_HOST}:{port}")
    try:
        data = client.get_board_view(params)
    except HTTPError as exc:
        try:
            message = json.loads(exc.read()).get("error") or exc.reason
        except (ValueError, AttributeError):
            message = exc.reason
        raise click.ClickException(f"Board returned HTTP {exc.code}: {message}") from exc
    except (URLError, OSError) as exc:
        raise click.ClickException(f"Could not reach the daemon on port {port}: {exc}") from exc
    if as_json:
        click.echo(json.dumps(data, indent=2))
        return
    click.echo(
        f"{view.title()} | {params['scope']} | serving node: {data['local_node']['node_id']} ({data['local_node']['source']})"
    )
    for key in ("totals", "shared_kusto", "rows", "sessions"):
        if key not in data or data[key] is None:
            continue
        rows = data[key] if isinstance(data[key], list) else [data[key]]
        click.echo(f"{key.replace('_', ' ').title()}:")
        if not rows:
            click.echo("  No records.")
        for r in rows:
            click.echo(
                "  "
                + "  ".join(
                    f"{k}={json.dumps(v, ensure_ascii=True) if v is not None else 'Unknown'}" for k, v in r.items()
                )
            )
    if data.get("truncated"):
        click.echo("List truncated; select a node or narrow the overview time range.")
