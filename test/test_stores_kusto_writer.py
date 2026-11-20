import json
import logging
import threading

import pytest

from aictl.stores.base import InvalidRowError
from aictl.stores.kusto import client
from aictl.stores.kusto.writer import KustoWriter
from aictl.stores.testing import MemoryWriter


class Sink:
    def __init__(self) -> None:
        self.batches = []
        self.error = None

    def ingest_lines(self, table, lines):
        self.batches.append((table, list(lines)))
        if self.error:
            raise self.error


def folder(path):
    return {"project": "repo", "path": path}


def stats(writer, table="files"):
    return writer.health()["tables"][table]


def test_full_version_and_tombstone_have_same_key():
    sink = Sink()
    writer = KustoWriter(sink, node_id="node")
    writer.upsert("files", [{**folder("a"), "size_bytes": 1}])
    writer.upsert("files", [folder("a")])
    writer.delete("files", [folder("a")])
    writer.flush()
    first, second, deleted = map(json.loads, sink.batches[0][1])
    assert first["size_bytes"] == 1 and second["size_bytes"] is None
    assert first["path"] == deleted["path"] and deleted["node_id"] == "node"
    assert first["_v"] < second["_v"] < deleted["_v"]
    assert not first["_deleted"] and deleted["_deleted"]
    assert stats(writer)["rows_sent"] == 3 and stats(writer)["queue_depth"] == 0


def test_drop_oldest_counts_rows_and_bytes_independently_per_table():
    sink = Sink()
    writer = KustoWriter(sink, node_id="node", max_rows=2, max_bytes=700)
    writer.append("files", map(folder, ("a", "b", "c")))
    writer.append("session_prompts", [{"project": "", "dedup_key": "one"}])
    assert stats(writer)["rows_dropped"] == 1
    writer.append("files", [folder("d" * 300)])
    assert stats(writer)["queue_depth"] == 1
    writer.append("files", [folder("too big" * 700)])
    assert stats(writer)["rows_dropped"] == 4
    assert stats(writer)["queue_bytes"] <= 700
    writer.flush()
    assert [json.loads(lines[0]).get("path") for _, lines in sink.batches] == ["d" * 300, None]


def test_transient_retry_reuses_same_serialized_version(monkeypatch):
    monkeypatch.setattr(client, "RETRY_DELAYS_S", (0,))

    class KustoNetworkError(RuntimeError):
        pass

    class Flaky(Sink):
        def ingest_lines(self, table, lines):
            super().ingest_lines(table, lines)
            if len(self.batches) == 1:
                raise KustoNetworkError("lost response")

    sink = Flaky()
    writer = KustoWriter(sink, node_id="node")
    writer.upsert("files", [folder("a")])
    writer.flush()
    assert sink.batches[0] == sink.batches[1]
    assert stats(writer)["rows_sent"] == 1


def test_failed_batch_waits_for_next_flush_or_counts_as_lost_at_exit(caplog):
    sink = Sink()
    sink.error = RuntimeError("forced ingestion failure")
    writer = KustoWriter(sink, node_id="node")
    writer.upsert("files", [folder("a")])
    writer.flush()
    assert stats(writer)["queue_depth"] == 1 and stats(writer)["rows_sent"] == 0
    assert stats(writer)["last_error"] == "forced ingestion failure"
    sink.error = None
    writer.flush()
    assert stats(writer)["last_error"] is None and stats(writer)["rows_sent"] == 1
    writer.upsert("files", [folder("b")])
    with caplog.at_level(logging.INFO):
        writer.close()
        writer.close()
    assert stats(writer)["lost_at_exit"] == 1 and stats(writer)["queue_depth"] == 0
    assert caplog.messages[-1].endswith("lost_at_exit=1")


def test_enqueue_does_not_wait_for_ingestion_and_keeps_newest_after_failure():
    entered, finish = threading.Event(), threading.Event()

    class StallingSink(Sink):
        def ingest_lines(self, table, lines):
            if not self.batches:
                entered.set()
                assert finish.wait(5)
                self.error = RuntimeError("first request failed")
            else:
                self.error = None
            super().ingest_lines(table, lines)

    sink = StallingSink()
    writer = KustoWriter(sink, node_id="node", max_rows=1)
    writer.append("files", [folder("old")])
    flush = threading.Thread(target=writer.flush)
    flush.start()
    try:
        assert entered.wait(5)
        writer.append("files", [folder("new")])
    finally:
        finish.set()
        flush.join(5)
    writer.flush()
    assert stats(writer)["rows_dropped"] == stats(writer)["rows_sent"] == 1
    assert json.loads(sink.batches[-1][1][0])["path"] == "new"


@pytest.mark.parametrize(
    ("row", "error"),
    [
        ({"path": "a"}, "key requires project"),
        (folder(""), "key requires path"),
        ({**folder("a"), "typo": 1}, "unknown"),
        ({**folder("a"), "_v": "spoofed"}, "writer-owned"),
        ({**folder("a"), "size_bytes": "not a long"}, "expects long"),
    ],
)
def test_rejects_missing_keys_bad_types_and_reserved_columns(row, error):
    writer = KustoWriter(Sink(), node_id="node")
    with pytest.raises(InvalidRowError, match=error):
        writer.upsert("files", [row])
    assert stats(writer)["queue_depth"] == 0
    with pytest.raises(InvalidRowError, match="does not accept tombstones"):
        writer.delete("metrics", [])


def test_capture_off_does_not_consume_or_validate_rows():
    def rows():
        pytest.fail("capture is off")
        yield {}

    writer = KustoWriter(None, node_id="node", capture=False)
    writer.append("not_a_table", rows())
    writer.upsert("files", rows())
    writer.delete("files", rows())
    writer.flush()
    assert writer.health()["status"] == "capture is off"


def test_memory_writer_keeps_independent_copies_of_calls():
    writer = MemoryWriter()
    row = {"nested": ["old"]}
    writer.append("a", iter([row]))
    writer.upsert("b", [row])
    writer.delete("b", [{"id": 2}])
    row["nested"].append("new")
    assert writer.operations == [
        ("append", "a", [{"nested": ["old"]}]),
        ("upsert", "b", [{"nested": ["old"]}]),
        ("delete", "b", [{"id": 2}]),
    ]
