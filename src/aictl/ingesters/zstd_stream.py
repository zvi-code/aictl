"""Streaming reads of zstd-compressed files, for the tools that compress finished sessions.

Codex writes a finished session as ``rollout-*.jsonl.zst``. Python 3.14 has ``compression.zstd``;
older versions need the ``zstandard`` package (the ``zstd`` extra, part of ``[all]``). The library
is looked up on each call, not at import, so a library installed later is found without a restart.

A stream holds one 32 KiB block of compressed bytes at a time. Files made of several frames are read
through all of them, and a file that ends inside a frame raises :class:`ZstdReadError` after the
lines before the cut were delivered: ``compression.zstd`` signals that on its own, ``zstandard``
does not, so the frame state is tracked here for both.
"""

from __future__ import annotations

import importlib
import io
from collections.abc import Callable
from pathlib import Path
from typing import Any, BinaryIO

BLOCK = 32 * 1024

NO_LIBRARY = (
    "no zstd library: Python 3.14 includes one; on older Python install the 'zstandard' package "
    "(pip install zstandard, or reinstall aictl with its [all] extra)"
)


class ZstdReadError(OSError):
    """The file is not valid zstd data, or ends before its last frame does."""


def _import(name: str) -> Any | None:
    try:
        return importlib.import_module(name)
    except ImportError:
        return None


def _decompressor_factory() -> Callable[[], Any] | None:
    """A function making a one-frame decompressor (``decompress(bytes)``, ``eof``, ``unused_data``), or None."""
    std = _import("compression.zstd")
    if std is not None:
        return std.ZstdDecompressor
    package = _import("zstandard")
    if package is not None:
        return package.ZstdDecompressor().decompressobj
    return None


def available() -> bool:
    return _decompressor_factory() is not None


class _Frames(io.RawIOBase):
    def __init__(self, fh: BinaryIO, factory: Callable[[], Any]) -> None:
        self._fh = fh
        self._factory = factory
        self._dec = factory()
        self._in_frame = False
        self._pending = b""

    def readable(self) -> bool:
        return True

    def readinto(self, b: Any) -> int:
        while not self._pending:
            if not self._fill():
                return 0
        n = min(len(b), len(self._pending))
        b[:n] = self._pending[:n]
        self._pending = self._pending[n:]
        return n

    def _fill(self) -> bool:
        chunk = self._fh.read(BLOCK)
        if not chunk:
            if self._in_frame:
                raise ZstdReadError("the file ends inside a zstd frame (incomplete write or truncated)")
            return False
        out = []
        while chunk:
            try:
                out.append(self._dec.decompress(chunk))
            except Exception as exc:  # noqa: BLE001 - each library has its own error class
                raise ZstdReadError(f"invalid zstd data: {exc}") from exc
            if self._dec.eof:
                chunk = self._dec.unused_data
                self._dec = self._factory()
                self._in_frame = False
            else:
                self._in_frame = True
                chunk = b""
        self._pending = b"".join(out)
        return True

    def close(self) -> None:
        try:
            self._fh.close()
        finally:
            super().close()


def open_stream(path: Path) -> BinaryIO:
    """The decompressed bytes of *path*, to read forward only. Raises :class:`ZstdReadError` with no library."""
    factory = _decompressor_factory()
    if factory is None:
        raise ZstdReadError(NO_LIBRARY)
    fh = open(path, "rb")
    try:
        return io.BufferedReader(_Frames(fh, factory), BLOCK)  # type: ignore[return-value]
    except BaseException:
        fh.close()
        raise
