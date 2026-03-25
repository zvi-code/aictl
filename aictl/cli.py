"""aictl — deploy AI context from .aictx files to native tool files."""

import click

from .commands.deploy import deploy
from .commands.scan import scan_cmd
from .commands.memory import memory
from .commands.import_cmd import import_cmd
from .commands.status import status
from .commands.plugin import plugin
from .commands.dashboard import dashboard
from .commands.serve import serve
from .commands.monitor import monitor


@click.group()
@click.version_option("0.4.0")
def main():
    """Deploy AI context from .aictx files to native tool files."""


main.add_command(deploy)
main.add_command(scan_cmd, name="scan")
main.add_command(memory)
main.add_command(import_cmd, name="import")
main.add_command(status)
main.add_command(plugin)
main.add_command(dashboard)
main.add_command(serve)
main.add_command(monitor)
