"""Serve dashboard assets and allowed local file previews."""

from __future__ import annotations

import email.utils
import json as _json
import logging
import re
from pathlib import Path

from ..secret_mask import mask_text
from ..tools import (
    HOST_LABELS as _REG_HOST_LABELS,
)
from ..tools import (
    TOOL_COLORS as _REG_COLORS,
)
from ..tools import (
    TOOL_ICONS as _REG_ICONS,
)
from ..tools import (
    TOOL_RELATIONSHIPS as _REG_RELATIONSHIPS,
)
from ..tools import (
    TOOL_VENDORS as _REG_TOOL_VENDORS,
)
from ..tools import (
    VENDOR_COLORS as _REG_VENDOR_COLORS,
)
from ..tools import (
    VENDOR_LABELS as _REG_VENDOR_LABELS,
)
from .http_response import _COMPRESSIBLE_TYPES, _GZIP_MEMO, _GZIP_MIN_BYTES

logger = logging.getLogger(__name__)


_MAX_FILE_SIZE = 200_000


def _read_file_safe(path_str: str) -> str | None:
    """File content for display, with safety limits and secret-shaped values masked."""
    text = _read_file_raw(path_str)
    return None if text is None else mask_text(text)


def _read_file_raw(path_str: str) -> str | None:
    try:
        p = Path(path_str)
        if not p.is_file():
            return None
        size = p.stat().st_size
        if size > _MAX_FILE_SIZE:
            with open(p, errors="replace", encoding="utf-8") as f:
                f.seek(max(0, size - _MAX_FILE_SIZE))
                f.readline()  # skip partial line
                tail = f.read()
            return f"[... truncated, showing last {len(tail)} chars of {size} ...]\n{tail}"
        return p.read_text(errors="replace", encoding="utf-8")
    except OSError:
        return None


def _static_dist_candidates() -> list[Path]:
    """Directories static assets may be served from (module-level for tests)."""
    return [
        Path(__file__).parent / "dist",
        Path(__file__).parent / "ui" / "dist",
    ]


# File names that carry a content hash (Vite writes name-HASH.ext), so a cached
# copy can never be stale and may be kept for a year.
_HASHED_ASSET = re.compile(r"-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|png|svg|jpg|webp)$")


def _static_encodings(header: str) -> list[str]:
    """Return accepted static encodings in preference order. Prefer Brotli on a tie."""
    weights: dict[str, float] = {}
    for part in header.split(","):
        name, _, params = part.lower().partition(";")
        name = name.strip()
        if name == "x-gzip":
            name = "gzip"
        weight = 1.0
        key, _, value = params.partition("=")
        if key.strip() == "q":
            try:
                weight = float(value)
            except ValueError:
                weight = 0.0
        weights[name] = weight if 0 <= weight <= 1 else 0.0

    def quality(name: str) -> float:
        return weights.get(name, weights.get("*", 0.0))

    return [name for name in sorted(("br", "gzip"), key=quality, reverse=True) if quality(name) > 0]


def _make_js_colors() -> str:
    """Generate the JavaScript COLORS const from the registry."""
    return f"window.COLORS = {_json.dumps(_REG_COLORS)};"


def _make_js_icons() -> str:
    """Generate the JavaScript ICONS const from the registry."""
    return f"window.ICONS = {_json.dumps(_REG_ICONS)};"


def _make_js_taxonomy() -> str:
    """Generate vendor/host label and color constants."""
    return (
        f"window.VENDOR_LABELS = {_json.dumps(_REG_VENDOR_LABELS)};\n"
        f"window.VENDOR_COLORS = {_json.dumps(_REG_VENDOR_COLORS)};\n"
        f"window.HOST_LABELS = {_json.dumps(_REG_HOST_LABELS)};\n"
        f"window.TOOL_VENDORS = {_json.dumps(_REG_TOOL_VENDORS)};\n"
        f"window.TOOL_RELATIONSHIPS = {_json.dumps(_REG_RELATIONSHIPS)};"
    )


_TEMPLATE_CACHE: str | None = None


_TEMPLATE_MTIME: float = 0.0


_DEV_MODE: bool = False


def _load_template() -> str:
    """Load the HTML template from dist/index.html (built Vite output).

    Auto-builds if npm is available and dist/ is missing.
    Automatically reloads when the file changes on disk (after rebuild).
    """
    global _TEMPLATE_CACHE, _TEMPLATE_MTIME
    ui_dist_path = Path(__file__).parent / "ui" / "dist" / "index.html"
    dist_path = Path(__file__).parent / "dist" / "index.html"

    # Pick whichever exists (prefer dist_path in prod, ui_dist_path in dev)
    if _DEV_MODE and ui_dist_path.exists():
        tpl_path = ui_dist_path
    elif dist_path.exists():
        tpl_path = dist_path
    elif ui_dist_path.exists():
        tpl_path = ui_dist_path
    else:
        tpl_path = None

    # The server never builds: a build rewrites tracked files and blocks the request.
    if tpl_path is None:
        raise FileNotFoundError(
            "Dashboard not found. Run 'aictl build-ui'."
        )

    # Reload if file changed on disk (one stat() call — negligible cost)
    mtime = tpl_path.stat().st_mtime
    if _TEMPLATE_CACHE is None or mtime != _TEMPLATE_MTIME:
        _TEMPLATE_CACHE = tpl_path.read_text(encoding="utf-8")
        _TEMPLATE_MTIME = mtime

    return _TEMPLATE_CACHE


class AssetRoutes:
    def _serve_html(self) -> None:
        html = _load_template()
        html = html.replace("%%TOOL_COLORS_JS%%", _make_js_colors())
        html = html.replace("%%TOOL_ICONS_JS%%", _make_js_icons())
        html = html.replace("%%TAXONOMY_JS%%", _make_js_taxonomy())
        self._send_body(html.encode("utf-8"), "text/html; charset=utf-8", cache_control="no-cache", cors=False)

    def _serve_static(self, path: str) -> None:
        """Serve static assets from the dist/ directory."""
        import mimetypes

        rel = path.lstrip("/")
        candidates = _static_dist_candidates()
        file_path = None
        root = None
        for dist_dir in candidates:
            # Resolve and confine to the dist dir — a path with ".." segments
            # must never escape it (path traversal).
            root = dist_dir.resolve()
            full = (root / rel).resolve()
            if not full.is_relative_to(root) or full.suffix in (".br", ".gz"):
                continue
            if full.is_file():
                file_path = full
                break
        if file_path is None or root is None:
            checked = [str(d / rel) for d in candidates]
            logger.warning("Static 404: %s — checked: %s", path, checked)
            self.send_error(404, "Not found")
            return
        suffix = file_path.suffix.lower()
        mime, _ = mimetypes.guess_type(str(file_path))
        mime = "font/woff2" if suffix == ".woff2" else mime or "application/octet-stream"
        stat = file_path.stat()
        # A hashed name never changes content, so browsers keep it for a year.
        # Any other file is revalidated with its ETag.
        hashed = bool(_HASHED_ASSET.search(file_path.name))
        compressible = mime.startswith(_COMPRESSIBLE_TYPES)
        supports_sidecars = suffix in (".js", ".css")
        accepted = _static_encodings(", ".join(self.headers.get_all("Accept-Encoding", [])))
        served_path = file_path
        encoding = None
        if supports_sidecars:
            for name in accepted:
                extension = ".br" if name == "br" else ".gz"
                sidecar = file_path.with_name(file_path.name + extension).resolve()
                if sidecar.is_relative_to(root) and sidecar.is_file():
                    served_path, encoding = sidecar, name
                    break
        dynamic_gzip = encoding is None and compressible and stat.st_size > _GZIP_MIN_BYTES and "gzip" in accepted
        if dynamic_gzip:
            encoding = "gzip"
        etag = None
        if hashed:
            cache_control = "public, max-age=31536000, immutable"
        else:
            cache_control = "no-cache"
            selected = stat if served_path == file_path else served_path.stat()
            variant = "-gz" if dynamic_gzip else f"-{encoding}-file" if encoding else ""
            etag = f'"{selected.st_mtime_ns:x}-{selected.st_size:x}{variant}"'
            if self._check_etag(etag):
                return
        body = served_path.read_bytes()
        if dynamic_gzip:
            body = _GZIP_MEMO.get(str(file_path), (stat.st_mtime_ns, stat.st_size), body)
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", cache_control)
        if encoding:
            self.send_header("Content-Encoding", encoding)
        if compressible or supports_sidecars:
            self.send_header("Vary", "Accept-Encoding")
        if etag:
            self.send_header("ETag", etag)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self) -> None:
        qs = self._qs
        file_path = qs.get("path", [None])[0]
        if not file_path:
            self.send_error(400, "Missing path parameter")
            return
        if not self.server.allowed.is_allowed(file_path):
            # A session's artifact: a file in a tool's session folder, or a file a session wrote.
            from ..stores.base import StoreError
            from .projections.history import HistoryScope
            from .session_record import is_recorded_artifact, is_text_file

            try:
                recorded = is_recorded_artifact(self._db, file_path, history=HistoryScope.local(self.server.store))
            except StoreError:
                self._json_response({"error": "Artifact inventory unavailable"}, status=503)
                return
            if not recorded:
                self.send_error(403, "Path not in discovered resource set")
                return
            if Path(file_path).is_file() and not is_text_file(file_path):
                self.send_error(415, "Binary file: not shown as text")
                return
        p = Path(file_path)
        try:
            mtime = p.stat().st_mtime
        except OSError:
            self.send_error(404, "File not readable")
            return
        etag = f'"{int(mtime)}"'
        if self._check_etag(etag):
            return
        content = _read_file_safe(file_path)
        if content is None:
            self.send_error(404, "File not readable")
            return
        body = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("ETag", etag)
        self.send_header("Last-Modified", email.utils.formatdate(mtime, usegmt=True))
        self.send_header("Cache-Control", "no-cache")
        self._send_cors_header()
        self.end_headers()
        self.wfile.write(body)
