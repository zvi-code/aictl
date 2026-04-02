# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Configuration and path resolution for monitoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .. import platforms


def _existing_paths(paths: list[Path]) -> tuple[Path, ...]:
    seen: set[str] = set()
    result: list[Path] = []
    for path in paths:
        expanded = path.expanduser()
        key = str(expanded)
        if key in seen:
            continue
        seen.add(key)
        result.append(expanded)
    return tuple(result)


def default_state_paths(root: Path) -> tuple[Path, ...]:
    """Global state roots relevant to live AI-tool monitoring."""

    paths = [
        platforms.claude_global_dir(),
        platforms.claude_projects_dir(),
        platforms.copilot_session_dir(),
        platforms.gh_config_dir(),
        platforms.vscode_user_dir(),
        platforms.codex_global_dir(),
        Path.home() / ".copilot",
    ]

    project_paths = [
        root / ".vscode",
        root / ".copilot",
        root / ".claude",
        root / ".github" / "copilot",
        root / "appPackage",     # M365 Copilot declarative agent manifests
        root / ".fx",            # M365 Teams Toolkit legacy config
    ]

    return _existing_paths(paths + project_paths)


@dataclass(slots=True)
class MonitorConfig:
    """Runtime settings for the live monitor."""

    root: Path
    workspace_paths: tuple[Path, ...]
    state_paths: tuple[Path, ...]
    sample_interval: float = 1.0
    refresh_interval: float = 1.0
    process_interval: float = 1.0
    network_interval: float = 1.0
    telemetry_interval: float = 5.0
    filesystem_enabled: bool = True
    telemetry_enabled: bool = True
    json_output: bool = False
    once: bool = False
    duration_seconds: float | None = None
    debug_network: bool = False
    ignored_dir_names: tuple[str, ...] = (
        ".git",
        ".hg",
        ".svn",
        "node_modules",
        "__pycache__",
        ".venv",
        "venv",
        "build",
        "dist",
        ".next",
    )
    _workspace_roots: tuple[str, ...] = field(init=False, repr=False)
    _state_roots: tuple[str, ...] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.root = self.root.expanduser().resolve()
        self.workspace_paths = tuple(path.expanduser().resolve() for path in self.workspace_paths)
        self.state_paths = tuple(path.expanduser().resolve() for path in self.state_paths)
        self._workspace_roots = tuple(str(path) for path in self.workspace_paths)
        self._state_roots = tuple(str(path) for path in self.state_paths)

    @classmethod
    def for_root(cls, root: Path, **kwargs) -> "MonitorConfig":
        """Construct a MonitorConfig for a single workspace root.

        All MonitorConfig fields (sample_interval, refresh_interval,
        process_interval, network_interval, telemetry_interval,
        filesystem_enabled, telemetry_enabled, json_output, once,
        duration_seconds, debug_network, ignored_dir_names) may be
        passed as keyword arguments; defaults come from field defaults.
        """
        resolved_root = root.expanduser().resolve()
        return cls(
            root=resolved_root,
            workspace_paths=(resolved_root,),
            state_paths=default_state_paths(resolved_root),
            **kwargs,
        )

    def workspace_for_path(self, path: str | Path | None) -> str | None:
        if path is None:
            return None
        p = Path(path).expanduser()
        for root in self._workspace_roots:
            try:
                p.relative_to(root)
                return root
            except ValueError:
                continue
        return None

    def state_root_for_path(self, path: str | Path | None) -> str | None:
        if path is None:
            return None
        p = Path(path).expanduser()
        for root in self._state_roots:
            try:
                p.relative_to(root)
                return root
            except ValueError:
                continue
        return None
