"""Parallel board reads: a read refused for memory runs once more alone; other failures are raised."""

from types import SimpleNamespace

import pytest

from aictl.dashboard.board_projection import _gather
from aictl.stores.base import StoreError

CLUSTER = SimpleNamespace(_live_latency_bound=True)
LOW_MEMORY = "Kusto view requests.cells failed: Low memory condition (E_LOW_MEMORY_CONDITION)"


def flaky(error, failures=1):
    calls = []

    def call():
        calls.append(1)
        if len(calls) <= failures:
            raise StoreError(error)
        return "rows"

    return call, calls


def test_a_read_refused_for_memory_runs_again_alone_and_the_order_is_kept():
    call, calls = flaky(LOW_MEMORY)
    assert _gather(CLUSTER, [lambda: "first", call, lambda: "last"]) == ["first", "rows", "last"]
    assert len(calls) == 2


def test_a_second_memory_refusal_is_raised():
    call, calls = flaky(LOW_MEMORY, failures=2)
    with pytest.raises(StoreError, match="Low memory"):
        _gather(CLUSTER, [lambda: "first", call])
    assert len(calls) == 2


def test_another_failure_is_raised_without_a_second_try():
    call, calls = flaky("Kusto view requests.cells failed: syntax error")
    with pytest.raises(StoreError, match="syntax error"):
        _gather(CLUSTER, [lambda: "first", call])
    assert len(calls) == 1


def test_staged_reads_retry_a_memory_refusal_and_record_only_store_failures_where_asked():
    from aictl.dashboard.board_projection import _FAILED, _StagedReads

    call, calls = flaky(LOW_MEMORY)
    failing, _ = flaky("Kusto view board.loops failed: timeout")

    def broken():
        raise RuntimeError("not a store failure")

    with _StagedReads(CLUSTER, [lambda: "first", call, failing, broken]) as reads:
        assert reads.result(0) == "first"
        assert reads.result(1) == "rows" and len(calls) == 2
        errors = {}
        assert reads.result(2, errors) is _FAILED and list(errors) == [2]
        with pytest.raises(StoreError, match="timeout"):
            reads.result(2)
        # Only a store failure makes a section optional; any other error fails the board as before.
        with pytest.raises(RuntimeError, match="not a store failure"):
            reads.result(3, {})
