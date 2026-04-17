#!/usr/bin/env python3
# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Generate docs/vscode-defaults.generated.jsonc from the installed VS Code app.

Extraction strategy (pragmatic, stdlib-only):

VS Code has no supported CLI to dump the merged default settings. The
"Open Default Settings (JSON)" command renders the contents at runtime
from the configuration registry, which aggregates two sources:

    1. Core settings registered from compiled TypeScript inside
       ``out/vs/workbench/workbench.desktop.main.js`` (covers namespaces
       like ``editor.*``, ``workbench.*``, ``chat.*``, ``mcp.*``). These
       live in minified JS and can't be parsed reliably without a JS VM.

    2. Extension-contributed settings declared in
       ``contributes.configuration.properties`` inside every built-in and
       user-installed extension's ``package.json``.

This script covers (2), which is a reliable static extraction. It walks:

    /Applications/Visual Studio Code.app/Contents/Resources/app/extensions/*/package.json
    ~/.vscode/extensions/*/package.json

and emits one ``"key": <default>,`` entry per property, prefixed by the
``description`` / ``markdownDescription`` rendered as ``//`` comments. The
output is a JSONC file grouped by top-level namespace with a header banner
recording the VS Code version and extension count.

Coverage note: the generated file is a *companion* to the curated
``docs/vscode-defaults.jsonc`` (which was produced via VS Code's own
rendering and still includes core namespaces). Running this script does
NOT overwrite the curated file.

Usage:
    python3 scripts/gen-vscode-defaults.py [--output PATH] [--app PATH]
"""

from __future__ import annotations

import argparse
import datetime as _dt
import glob
import json
import os
import re
import subprocess
from pathlib import Path

DEFAULT_APP = "/Applications/Visual Studio Code.app"
DEFAULT_OUT = "docs/vscode-defaults.generated.jsonc"


def _vscode_version(app: Path) -> str:
    """Read the app's product.json for version/commit."""
    product = app / "Contents/Resources/app/product.json"
    try:
        data = json.loads(product.read_text())
        return f"{data.get('version', '?')} ({data.get('commit', '?')[:7]})"
    except Exception:
        try:
            out = subprocess.check_output(
                [str(app / "Contents/Resources/app/bin/code"), "--version"],
                text=True,
                timeout=10,
            )
            return out.strip().splitlines()[0]
        except Exception:
            return "unknown"


def _collect_packages(app: Path) -> list[Path]:
    builtin = glob.glob(str(app / "Contents/Resources/app/extensions/*/package.json"))
    user = glob.glob(os.path.expanduser("~/.vscode/extensions/*/package.json"))
    return [Path(p) for p in sorted(builtin) + sorted(user)]


def _extract_properties(pkg: Path) -> dict[str, dict]:
    try:
        data = json.loads(pkg.read_text())
    except Exception:
        return {}
    configs = data.get("contributes", {}).get("configuration", [])
    if isinstance(configs, dict):
        configs = [configs]
    props: dict[str, dict] = {}
    for c in configs:
        for k, v in (c.get("properties") or {}).items():
            if k not in props:
                props[k] = v
    return props


_NLS_RE = re.compile(r"%([^%]+)%")


def _load_nls(pkg: Path) -> dict[str, str]:
    nls = pkg.parent / "package.nls.json"
    if not nls.exists():
        return {}
    try:
        return json.loads(nls.read_text())
    except Exception:
        return {}


def _resolve_nls(text: object, nls: dict[str, str]) -> str:
    # Some extensions pre-resolve to a {message, comment} localization dict.
    if isinstance(text, dict):
        text = text.get("message", "")
    if not isinstance(text, str):
        return ""

    def sub(match: re.Match[str]) -> str:
        key = match.group(1)
        val = nls.get(key, match.group(0))
        if isinstance(val, dict):
            return val.get("message", match.group(0))
        return val if isinstance(val, str) else match.group(0)

    return _NLS_RE.sub(sub, text)


def _description(prop: dict, nls: dict[str, str]) -> str:
    desc = prop.get("markdownDescription") or prop.get("description") or ""
    return _resolve_nls(desc, nls)


def _format_default(value: object) -> str:
    """JSON-encode a default value with the same indent conventions the
    rendered "Default Settings (JSON)" uses — tabs for nested structures."""
    return json.dumps(value, indent="\t", ensure_ascii=False, sort_keys=False)


def _render_entry(key: str, prop: dict, nls: dict[str, str]) -> list[str]:
    lines: list[str] = []
    desc = _description(prop, nls).strip()
    if desc:
        for line in desc.splitlines():
            lines.append(f"\t// {line}")
    else:
        lines.append(f"\t// (no description)")
    default = prop.get("default")
    default_str = _format_default(default)
    # Indent continuation lines of multi-line defaults with a tab.
    if "\n" in default_str:
        default_str = default_str.replace("\n", "\n\t")
    lines.append(f'\t"{key}": {default_str},')
    lines.append("")
    return lines


def generate(app: Path, out: Path) -> None:
    version = _vscode_version(app)
    pkgs = _collect_packages(app)

    all_props: dict[str, tuple[dict, dict[str, str]]] = {}
    for pkg in pkgs:
        nls = _load_nls(pkg)
        for k, v in _extract_properties(pkg).items():
            # First-come wins, matching VS Code's own first-registration semantics.
            all_props.setdefault(k, (v, nls))

    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d")

    header = [
        "// Auto-generated — DO NOT EDIT BY HAND.",
        f"// Generated {now} from VS Code {version}",
        f"// Source: {len(pkgs)} extension package.json files "
        "(built-in + ~/.vscode/extensions).",
        "//",
        "// Coverage: extension-contributed settings only. Core-registered",
        "// namespaces (editor.*, workbench.*, chat.*, mcp.*, files.*, ...)",
        "// live in compiled workbench JS and are NOT included here. For the",
        "// full curated snapshot see docs/vscode-defaults.jsonc.",
        "//",
        "// Regenerate with: python3 scripts/gen-vscode-defaults.py",
    ]

    body: list[str] = ["{"]
    last_ns: str | None = None
    for key in sorted(all_props):
        ns = key.split(".", 1)[0]
        if ns != last_ns:
            body.append(f"\t// {ns}")
            last_ns = ns
        prop, nls = all_props[key]
        body.extend(_render_entry(key, prop, nls))
    # Strip the trailing blank line and replace the last key's trailing
    # comma to keep this JSONC parseable by permissive loaders.
    while body and body[-1] == "":
        body.pop()
    if body[-1].endswith(","):
        body[-1] = body[-1][:-1]
    body.append("}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(header) + "\n" + "\n".join(body) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(all_props)} keys from {len(pkgs)} extensions)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--app", default=DEFAULT_APP, help="Path to VS Code.app")
    ap.add_argument("--output", default=DEFAULT_OUT, help="Output JSONC path")
    args = ap.parse_args()
    generate(Path(args.app), Path(args.output))


if __name__ == "__main__":
    main()
