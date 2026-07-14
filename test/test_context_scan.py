# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""Robustness tests for .context.toml parsing and discovery scanning.

A single malformed .context.toml used to raise TOMLDecodeError through
``scan()`` into the RefreshLoop (which then logged and served a stale
snapshot forever) and produced CLI tracebacks. ``parse_aictx`` must
return None with a warning; ``scan()`` must skip the file and continue.
"""

from __future__ import annotations

import logging

from aictl.context import parse_aictx, scan


class TestMalformedContextFile:
    def test_parse_aictx_returns_none_and_warns(self, tmp_path, caplog):
        bad = tmp_path / ".context.toml"
        bad.write_text("[instructions\nbase = 'unterminated table header'\n")

        with caplog.at_level(logging.WARNING, logger="aictl.context"):
            assert parse_aictx(bad) is None

        assert any("malformed" in rec.message.lower() for rec in caplog.records)
        assert any(str(bad) in rec.getMessage() for rec in caplog.records)

    def test_parse_aictx_returns_none_on_unreadable_file(self, tmp_path, monkeypatch):
        f = tmp_path / ".context.toml"
        f.write_text('[instructions]\nbase = "ok"\n')

        import builtins

        real_open = builtins.open

        def failing_open(path, *args, **kwargs):
            if str(path) == str(f):
                raise OSError("permission denied")
            return real_open(path, *args, **kwargs)

        monkeypatch.setattr(builtins, "open", failing_open)
        assert parse_aictx(f) is None

    def test_scan_skips_malformed_file_and_continues(self, tmp_path, caplog):
        # Root file is valid; a child directory holds a malformed one and
        # a deeper grandchild is valid again — discovery must yield both
        # valid files and skip the broken one.
        (tmp_path / ".context.toml").write_text('[instructions]\nbase = "root"\n')
        child = tmp_path / "services"
        child.mkdir()
        (child / ".context.toml").write_text("this is [ not toml = =\n")
        grandchild = child / "ingestion"
        grandchild.mkdir()
        (grandchild / ".context.toml").write_text('[instructions]\nbase = "ingestion"\n')

        with caplog.at_level(logging.WARNING, logger="aictl.context"):
            results = scan(tmp_path)

        rels = [rel for rel, _ in results]
        assert "." in rels
        assert any(rel.endswith("ingestion") for rel in rels)
        assert "services" not in rels
        assert any("malformed" in rec.message.lower() for rec in caplog.records)
