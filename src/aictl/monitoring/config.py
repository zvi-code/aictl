# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Configuration and path resolution for monitoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .. import platforms, tree_walk

# A project's own AI tool folders, relative to the project root.
PROJECT_STATE_DIRS = (
    ".vscode",
    ".copilot",
    ".claude",
    ".github/copilot",
    "appPackage",  # M365 Copilot declarative agent manifests
    ".fx",  # M365 Teams Toolkit legacy config
)


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


def _is_home(path: Path) -> bool:
    # In the home folder, ~/.claude, ~/.copilot and ~/.vscode are the tools' own homes, not a project's folders.
    try:
        return path == Path.home().resolve()
    except (RuntimeError, OSError):
        return False


def default_state_paths(root: Path) -> tuple[Path, ...]:
    """Global state roots relevant to live AI-tool monitoring."""

    paths = [
        platforms.claude_global_dir(),
        platforms.claude_projects_dir(),
        platforms.copilot_session_dir(),
        platforms.gh_config_dir(),
        platforms.vscode_user_dir(),
        platforms.codex_global_dir(),
        platforms.copilot_global_dir(),
    ]
    # Homes a tool uses outside its default folder, found on this machine.
    from .. import tool_homes

    paths += [h.path for h in tool_homes.homes() if h.found_by != "default"]

    project_paths = [root / Path(*d.split("/")) for d in PROJECT_STATE_DIRS]

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
    # Path prefixes never reported as file activity: aictl's own logs and DB.
    # Watching them is a feedback loop (log line -> file event -> log line).
    ignored_paths: tuple[str, ...] = ()
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
        "target",
        "bin",
        "obj",
        ".next",
    )
    # Where the git change tracker keeps file signatures between runs; None keeps nothing.
    repo_state_path: Path | None = None
    _state_roots: tuple[str, ...] = field(init=False, repr=False)
    _project_state_roots: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.root = self.root.expanduser().resolve()
        self.workspace_paths = tuple(path.expanduser().resolve() for path in self.workspace_paths)
        self.state_paths = tuple(path.expanduser().resolve() for path in self.state_paths)
        self._state_roots = tuple(str(path) for path in self.state_paths)
        self._project_state_roots = (
            frozenset()
            if _is_home(self.root)
            else frozenset(str((self.root / Path(*d.split("/"))).resolve()) for d in PROJECT_STATE_DIRS)
        )

    @classmethod
    def for_root(cls, root: Path, **kwargs) -> MonitorConfig:
        """Construct a MonitorConfig for a single workspace root.

        The root is a project workspace only when it is in a git work tree. A folder such as
        ``C:\\`` or the home folder that holds many projects is not one project: the file
        watcher finds the repositories under it and the repositories of the AI sessions.

        All MonitorConfig fields (sample_interval, refresh_interval,
        process_interval, network_interval, telemetry_interval,
        filesystem_enabled, telemetry_enabled, json_output, once,
        duration_seconds, debug_network, ignored_dir_names, repo_state_path)
        may be passed as keyword arguments; defaults come from field defaults.
        """
        resolved_root = root.expanduser().resolve()
        return cls(
            root=resolved_root,
            workspace_paths=(resolved_root,) if tree_walk.git_root(resolved_root) is not None else (),
            state_paths=default_state_paths(resolved_root),
            **kwargs,
        )

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

    def tool_home_for_path(self, path: str | Path | None) -> str | None:
        """The tool home (``~/.claude``, VS Code's user folder ...) that holds *path*.

        A project's own tool folders, such as ``<root>/.claude``, do not count: they belong
        to the project's repository.
        """
        root = self.state_root_for_path(path)
        return None if root in self._project_state_roots else root
