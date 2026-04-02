# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""aictl — deploy AI context from .aictx files to native tool files."""

import click

from .commands.ctx_pipeline import deploy, scan_cmd, diff, validate_cmd, init
from .commands.status import status, memory
from .commands.import_plugin import import_cmd, plugin
from .commands.integrations import hooks, otel, enable
from .commands.daemon import serve, monitor, dashboard
from .commands.admin import config, catalog, db, build_ui, reinstall


@click.group()
@click.version_option("0.4.0")
def main():
    """Deploy AI context from .aictx files to native tool files."""


# ── ctx subgroup ────────────────────────────────────────────────────────────

@click.group("ctx")
def ctx_group():
    """Context pipeline — deploy, scan, diff, validate, init."""


ctx_group.add_command(deploy)
ctx_group.add_command(scan_cmd, name="scan")
ctx_group.add_command(diff)
ctx_group.add_command(validate_cmd, name="validate")
ctx_group.add_command(init)

main.add_command(ctx_group)

# ── daemon subgroup ──────────────────────────────────────────────────────────

@click.group("daemon")
def daemon_group():
    """Daemon commands — serve, monitor, dashboard."""


daemon_group.add_command(serve)
daemon_group.add_command(monitor)
daemon_group.add_command(dashboard)

main.add_command(daemon_group)

# ── top-level commands ───────────────────────────────────────────────────────

main.add_command(memory)
main.add_command(import_cmd, name="import")
main.add_command(status)
main.add_command(plugin)
main.add_command(hooks)
main.add_command(otel)
main.add_command(config)
main.add_command(catalog)
main.add_command(db)
main.add_command(enable)
main.add_command(build_ui)
main.add_command(reinstall)


if __name__ == "__main__":
    main()
