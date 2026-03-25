"""CLI command: aictl config — show and manage configuration."""

from __future__ import annotations

import click

from ..config import config_path, load_config, show_config, write_default_config


@click.group()
def config():
    """Show or manage aictl configuration."""


@config.command()
def show():
    """Show current effective configuration."""
    click.echo(show_config())


@config.command()
def init():
    """Create default config.toml if it doesn't exist."""
    path = write_default_config()
    if path.is_file():
        click.echo(f"Config file: {path}")
    else:
        click.echo(f"Created: {path}")


@config.command()
def path():
    """Print config file path."""
    click.echo(config_path())
