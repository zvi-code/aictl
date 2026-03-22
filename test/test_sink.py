"""Tests for aictl.sink — SampleSink."""

from __future__ import annotations

import time
from unittest.mock import MagicMock

from aictl.sink import SampleSink


class TestEmit:
    def test_emit_single(self):
        sink = SampleSink()
        sink.emit("cpu.core.0", 45.2, {"host": "mac"})
        assert sink.stats()["total_emitted"] == 1

    def test_emit_updates_latest(self):
        sink = SampleSink()
        sink.emit("cpu.core.0", 10.0)
        sink.emit("cpu.core.0", 20.0)
        latest = sink.get_latest("cpu.core.0")
        assert latest is not None
        assert latest[1] == 20.0  # (ts, value, tags)

    def test_emit_batch(self):
        sink = SampleSink()
        sink.emit_batch([
            ("cpu.core.0", 10.0, None),
            ("cpu.core.1", 20.0, None),
            ("cpu.core.2", 30.0, {"note": "hot"}),
        ])
        assert sink.stats()["total_emitted"] == 3
        assert sink.stats()["metrics_tracked"] == 3

    def test_emit_with_custom_timestamp(self):
        sink = SampleSink()
        sink.emit("test.metric", 1.0, ts=1000.0)
        latest = sink.get_latest("test.metric")
        assert latest[0] == 1000.0


class TestSeries:
    def test_series_accumulates(self):
        sink = SampleSink()
        for i in range(5):
            sink.emit("cpu.core.0", float(i), ts=1000.0 + i)
        series = sink.get_series("cpu.core.0")
        assert len(series) == 5
        assert series[0] == (1000.0, 0.0)
        assert series[4] == (1004.0, 4.0)

    def test_series_max_length(self):
        sink = SampleSink()
        for i in range(200):
            sink.emit("test", float(i))
        series = sink.get_series("test")
        assert len(series) == 120  # maxlen=120


class TestHandlers:
    def test_handler_called_on_emit(self):
        sink = SampleSink()
        calls = []
        sink.register_handler(lambda m, v, t, ts: calls.append((m, v)))
        sink.emit("test.x", 42.0)
        assert len(calls) == 1
        assert calls[0] == ("test.x", 42.0)

    def test_handler_called_on_batch(self):
        sink = SampleSink()
        calls = []
        sink.register_handler(lambda m, v, t, ts: calls.append(m))
        sink.emit_batch([("a", 1.0, None), ("b", 2.0, None)])
        assert calls == ["a", "b"]

    def test_handler_error_doesnt_crash(self):
        sink = SampleSink()
        sink.register_handler(lambda m, v, t, ts: 1/0)  # raises ZeroDivisionError
        sink.emit("test", 1.0)  # should not raise
        assert sink.stats()["total_emitted"] == 1

    def test_unregister_handler(self):
        sink = SampleSink()
        calls = []
        handler = lambda m, v, t, ts: calls.append(m)
        sink.register_handler(handler)
        sink.emit("a", 1.0)
        sink.unregister_handler(handler)
        sink.emit("b", 2.0)
        assert calls == ["a"]  # handler not called for "b"


class TestQuery:
    def test_get_latest_by_prefix(self):
        sink = SampleSink()
        sink.emit("cpu.core.0", 10.0)
        sink.emit("cpu.core.1", 20.0)
        sink.emit("mem.total", 8000.0)
        result = sink.get_latest_by_prefix("cpu.core.")
        assert len(result) == 2
        assert "cpu.core.0" in result

    def test_list_metrics(self):
        sink = SampleSink()
        sink.emit("b", 1.0)
        sink.emit("a", 2.0)
        sink.emit("c", 3.0)
        assert sink.list_metrics() == ["a", "b", "c"]  # sorted

    def test_get_latest_missing(self):
        sink = SampleSink()
        assert sink.get_latest("nonexistent") is None

    def test_get_series_missing(self):
        sink = SampleSink()
        assert sink.get_series("nonexistent") == []


class TestPersistence:
    def test_flush_to_db(self):
        mock_db = MagicMock()
        sink = SampleSink(db=mock_db, buffer_size=0)
        sink.emit("test", 1.0)
        # buffer_size=0 means flush on every emit
        assert mock_db.append_samples.called

    def test_flush_returns_count(self):
        mock_db = MagicMock()
        sink = SampleSink(db=mock_db, buffer_size=10000)
        sink.emit("a", 1.0)
        sink.emit("b", 2.0)
        count = sink.flush()
        assert count == 2

    def test_no_db_flush_returns_zero(self):
        sink = SampleSink(db=None)
        sink.emit("test", 1.0)
        assert sink.flush() == 0

    def test_close_flushes(self):
        mock_db = MagicMock()
        sink = SampleSink(db=mock_db, buffer_size=10000)
        sink.emit("test", 1.0)
        sink.close()
        assert mock_db.append_samples.called


class TestStats:
    def test_stats(self):
        sink = SampleSink()
        sink.emit("a", 1.0)
        sink.emit("b", 2.0)
        s = sink.stats()
        assert s["total_emitted"] == 2
        assert s["metrics_tracked"] == 2
        assert s["handlers"] == 0
