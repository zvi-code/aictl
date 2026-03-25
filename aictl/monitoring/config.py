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
    def for_root(
        cls,
        root: Path,
        *,
        sample_interval: float = 1.0,
        refresh_interval: float = 1.0,
        process_interval: float = 1.0,
        network_interval: float = 1.0,
        telemetry_interval: float = 5.0,
        filesystem_enabled: bool = True,
        telemetry_enabled: bool = True,
        json_output: bool = False,
        once: bool = False,
        duration_seconds: float | None = None,
    ) -> "MonitorConfig":
        resolved_root = root.expanduser().resolve()
        return cls(
            root=resolved_root,
            workspace_paths=(resolved_root,),
            state_paths=default_state_paths(resolved_root),
            sample_interval=sample_interval,
            refresh_interval=refresh_interval,
            process_interval=process_interval,
            network_interval=network_interval,
            telemetry_interval=telemetry_interval,
            filesystem_enabled=filesystem_enabled,
            telemetry_enabled=telemetry_enabled,
            json_output=json_output,
            once=once,
            duration_seconds=duration_seconds,
        )

    def workspace_for_path(self, path: str | Path | None) -> str | None:
        if path is None:
            return None
        text = str(Path(path).expanduser())
        for root in self._workspace_roots:
            if text == root or text.startswith(f"{root}/"):
                return root
        return None

    def state_root_for_path(self, path: str | Path | None) -> str | None:
        if path is None:
            return None
        text = str(Path(path).expanduser())
        for root in self._state_roots:
            if text == root or text.startswith(f"{root}/"):
                return root
        return None
