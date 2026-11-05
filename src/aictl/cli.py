# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""aictl — deploy AI context from .aictx files to native tool files."""

from importlib import import_module

import click


class LazyGroup(click.Group):
    """Group whose commands are imported on first use.

    Hooks and scripts call this CLI often; ``--version`` must not pay for the
    monitoring stack, asyncio and every emitter.
    """

    def __init__(self, *args, lazy: dict[str, str] | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self._lazy = lazy or {}

    def list_commands(self, ctx):
        return sorted({*super().list_commands(ctx), *self._lazy})

    def get_command(self, ctx, cmd_name):
        cmd = super().get_command(ctx, cmd_name)
        if cmd is None and cmd_name in self._lazy:
            module, attr = self._lazy[cmd_name].split(":")
            cmd = getattr(import_module(module, __package__), attr)
            self.add_command(cmd, name=cmd_name)
        return cmd


from .platforms import harden_stdio

harden_stdio()


def _version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("aictl")
    except PackageNotFoundError:  # editable dev install without metadata
        return "0.0.0-dev"


class _VersionOption(click.Option):
    """--version that reads package metadata only when used."""

    def __init__(self):
        super().__init__(
            ["--version"],
            is_flag=True,
            is_eager=True,
            expose_value=False,
            help="Show the version and exit.",
            callback=self._show,
        )

    @staticmethod
    def _show(ctx, _param, value):
        if value and not ctx.resilient_parsing:
            click.echo(f"{ctx.find_root().info_name or 'aictl'}, version {_version()}")
            ctx.exit()


main = LazyGroup(
    help="Deploy AI context from .aictx files to native tool files.",
    params=[_VersionOption()],
    lazy={
        "memory": ".commands.status:memory",
        "import": ".commands.import_plugin:import_cmd",
        "status": ".commands.status:status",
        "ps": ".commands.observe:ps",
        "top": ".commands.observe:top",
        "plugin": ".commands.import_plugin:plugin",
        "hooks": ".commands.integrations:hooks",
        "otel": ".commands.integrations:otel",
        "enable": ".commands.integrations:enable",
        "config": ".commands.admin:config",
        "catalog": ".commands.admin:catalog",
        "db": ".commands.admin:db",
        "build-ui": ".commands.admin:build_ui",
        "reinstall": ".commands.admin:reinstall",
        "disable": ".commands.disable:disable",
        "audit": ".commands.disable:audit",
        "session": ".commands.session:session_group",
    },
)

ctx_group = LazyGroup(
    "ctx",
    help="Context pipeline — deploy, scan, diff, validate, init.",
    lazy={
        "audit": ".commands.ctx_audit:audit_cmd",
        "deploy": ".commands.ctx_pipeline:deploy",
        "scan": ".commands.ctx_pipeline:scan_cmd",
        "diff": ".commands.ctx_pipeline:diff",
        "validate": ".commands.ctx_pipeline:validate_cmd",
        "init": ".commands.ctx_pipeline:init",
    },
)
main.add_command(ctx_group)

daemon_group = LazyGroup(
    "daemon",
    help="Daemon commands — serve, monitor, dashboard.",
    lazy={
        "serve": ".commands.daemon:serve",
        "monitor": ".commands.daemon:monitor",
        "dashboard": ".commands.daemon:dashboard",
    },
)
main.add_command(daemon_group)


if __name__ == "__main__":
    main()
