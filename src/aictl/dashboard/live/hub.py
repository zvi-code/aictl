"""Bounded in-process state, replay, and backpressure for the live protocol.

Publishing does no I/O. A slow history query or socket never holds the hub lock.
The history projection and runtime producers share this hub, not their workers.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from collections import OrderedDict, deque
from dataclasses import dataclass
from typing import Any

from .protocol import PROTOCOL_VERSION, TOPICS, capabilities, entity_visible, validate_data, validate_source


class LiveCapacityError(ValueError):
    """A complete projection does not fit; retain the last complete projection."""


@dataclass(frozen=True)
class HubLimits:
    state_entities: int = 30_000
    state_bytes: int = 32 * 1024 * 1024
    entity_bytes: int = 1024 * 1024
    journal_entries: int = 2048
    journal_bytes: int = 8 * 1024 * 1024
    pending_entities: int = 4096
    pending_bytes: int = 8 * 1024 * 1024
    output_entries: int = 2000
    output_bytes: int = 4 * 1024 * 1024
    history_entities: int = 24_000
    history_bytes: int = 24 * 1024 * 1024


def _encoded(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), allow_nan=False).encode()


class LiveHub:
    """One daemon's revision domain; a restart gets a different epoch."""

    def __init__(self, *, limits: HubLimits | None = None, epoch: str | None = None) -> None:
        self.limits = limits or HubLimits()
        self.epoch = epoch or uuid.uuid4().hex
        self._sequence = 0
        self._condition = threading.Condition(threading.RLock())
        self._state: dict[tuple[str, str], dict] = {}
        self._sizes: dict[tuple[str, str], int] = {}
        self._state_bytes = 0
        self._history_bytes = 0
        self._history_entities = 0
        self._journal: deque[tuple[dict, int, dict]] = deque()
        self._journal_bytes = 0
        self._outputs: OrderedDict[tuple[str, str], int] = OrderedDict()
        self._output_bytes = 0
        self._output_evictions = 0
        self._subscriptions: set[LiveSubscription] = set()
        self._closed = False

    @property
    def sequence(self) -> int:
        with self._condition:
            return self._sequence

    def values(self, topic: str) -> tuple[dict, ...]:
        """Current frozen observations for a source-aware server projection."""
        with self._condition:
            return tuple(value["data"] for key, value in self._state.items() if key[0] == topic)

    def publish(self, topic: str, entity_id: str, data: dict, *, source: str) -> int:
        return self.commit([(topic, entity_id, data, source)])

    def remove(self, topic: str, entity_id: str, *, source: str) -> int:
        validate_source(topic, source)
        return self.commit([], [(topic, entity_id)])

    def commit(
        self,
        upserts: list[tuple[str, str, dict, str]],
        removals: list[tuple[str, str]] | None = None,
    ) -> int:
        """Validate privately, then install one complete change atomically."""
        prepared = {}
        for topic, entity_id, data, source in upserts:
            validate_source(topic, source)
            if not isinstance(entity_id, str) or not entity_id or not isinstance(data, dict):
                raise ValueError("Live entities need a non-empty ID and object data")
            validate_data(topic, data)
            raw = _encoded(data)
            if len(raw) > self.limits.entity_bytes:
                raise LiveCapacityError("Live entity exceeds its byte limit")
            if topic == "runtime.output" and len(raw) + len(entity_id) + 128 > self.limits.output_bytes:
                raise LiveCapacityError("Native output entry exceeds the retained-tail byte limit")
            prepared[(topic, entity_id)] = (json.loads(raw), source, len(raw) + len(entity_id) + 128)
        with self._condition:
            if self._closed:
                return self._sequence
            return self._commit_locked(prepared, set(removals or []))

    def _commit_locked(self, prepared: dict, removed_keys: set) -> int:
        changed = {
            key: value
            for key, value in prepared.items()
            if key not in self._state or self._state[key]["data"] != value[0] or self._state[key]["source"] != value[1]
        }
        removed_keys = {key for key in removed_keys if key in self._state and key not in prepared}
        if not changed and not removed_keys:
            return self._sequence

        output_changed = any(key[0] == "runtime.output" for key in (*removed_keys, *changed))
        outputs = self._outputs.copy() if output_changed else self._outputs
        for key in removed_keys:
            outputs.pop(key, None)
        for key, (_, _, size) in changed.items():
            if key[0] == "runtime.output":
                outputs[key] = size
        output_bytes = sum(outputs.values()) if output_changed else self._output_bytes
        evictions = 0
        while outputs and (len(outputs) > self.limits.output_entries or output_bytes > self.limits.output_bytes):
            key, size = outputs.popitem(last=False)
            output_bytes -= size
            evictions += 1
            changed.pop(key, None)
            if key in self._state:
                removed_keys.add(key)

        state_bytes = self._state_bytes - sum(self._sizes[key] for key in removed_keys)
        state_bytes += sum(value[2] - self._sizes.get(key, 0) for key, value in changed.items())
        count = len(self._state) - len(removed_keys) + sum(key not in self._state for key in changed)
        if state_bytes > self.limits.state_bytes or count > self.limits.state_entities:
            raise LiveCapacityError("Live state capacity reached; complete prior state retained")
        history_bytes, history_entities = self._history_bytes, self._history_entities
        for key in removed_keys:
            if self._is_history(key):
                history_bytes -= self._sizes[key]
                history_entities -= 1
        for key, (data, _, size) in changed.items():
            old = self._state.get(key)
            if old is not None and self._is_history(key):
                history_bytes -= self._sizes[key]
                history_entities -= 1
            if self._is_history(key):
                history_bytes += size
                history_entities += 1
        if history_bytes > self.limits.history_bytes or history_entities > self.limits.history_entities:
            raise LiveCapacityError("Live history capacity reached; runtime capacity is reserved")

        self._sequence += 1
        sequence = self._sequence
        upserts = []
        removals = []
        sizes = {}
        for key in sorted(removed_keys):
            old = self._state.pop(key)
            removal = {"topic": key[0], "id": key[1], "revision": sequence}
            if "scope" in old["data"]:
                removal["scope"] = old["data"]["scope"]
            removals.append(removal)
            sizes[("removals", *key)] = len(_encoded(removal))
            self._sizes.pop(key)
        for key, (data, source, size) in changed.items():
            entity = {"topic": key[0], "id": key[1], "revision": sequence, "source": source, "data": data}
            self._state[key] = entity
            self._sizes[key] = size
            upserts.append(entity)
            sizes[("upserts", *key)] = size
        self._state_bytes = state_bytes
        self._history_bytes, self._history_entities = history_bytes, history_entities
        self._outputs = outputs
        self._output_bytes = output_bytes
        self._output_evictions += evictions
        change = self._envelope(upserts=upserts, removals=removals)
        # Payload accounting is prepared before the lock; don't JSON-encode a large
        # history projection once for the journal and again for every watching client.
        size = sum(sizes.values()) + 256
        self._journal.append((change, size, sizes))
        self._journal_bytes += size
        while self._journal and (
            len(self._journal) > self.limits.journal_entries or self._journal_bytes > self.limits.journal_bytes
        ):
            _, size, _ = self._journal.popleft()
            self._journal_bytes -= size
        for subscription in self._subscriptions:
            subscription._enqueue_locked(change, sizes)
        self._condition.notify_all()
        return sequence

    def replace(
        self,
        topic: str,
        scope: str,
        entities: list[tuple[str, dict]],
        *,
        source: str,
    ) -> int:
        """Replace one completed scoped projection, transmitting only entity differences."""
        return self.replace_topics(scope, [(topic, entity_id, data, source) for entity_id, data in entities], {topic})

    def replace_topics(self, scope: str, entities: list[tuple[str, str, dict, str]], topics: set[str]) -> int:
        prepared = {}
        for topic, entity_id, data, source in entities:
            validate_source(topic, source)
            if topic not in topics or data.get("scope") != scope:
                raise ValueError("A projection may replace only its own scope and topics")
            validate_data(topic, data)
            raw = _encoded(data)
            if len(raw) > self.limits.entity_bytes:
                raise LiveCapacityError("Live projection entity exceeds its byte limit")
            prepared[(topic, entity_id)] = (json.loads(raw), source, len(raw) + len(entity_id) + 128)
        with self._condition:
            if self._closed:
                return self._sequence
            removed = {
                key
                for key, value in self._state.items()
                if key[0] in topics and value["data"].get("scope") == scope and key not in prepared
            }
            return self._commit_locked(prepared, removed)

    @staticmethod
    def _is_history(key: tuple[str, str]) -> bool:
        return key[0] in {"history.board", "configuration.board", "catalog.board"}

    def _envelope(self, **fields: Any) -> dict:
        return {
            "protocol": PROTOCOL_VERSION,
            "epoch": self.epoch,
            "sequence": self._sequence,
            "cursor": f"{self.epoch}:{self._sequence}",
            **fields,
        }

    def _bootstrap_locked(self, scope: str, history: bool, reason: str, ordered_gap: bool = False) -> dict:
        return self._envelope(
            scope=scope,
            capabilities=capabilities(),
            reason=reason,
            ordered_gap=ordered_gap,
            entities=[value for value in self._state.values() if entity_visible(value, scope, history)],
            retention={
                "native_output": {
                    "max_entries": self.limits.output_entries,
                    "max_bytes": self.limits.output_bytes,
                    "retained_entries": len(self._outputs),
                    "evicted_entries": self._output_evictions,
                    "scope": "bounded runtime tail; historical output remains queryable on demand",
                },
                "state_bytes_limit": self.limits.state_bytes,
                "history_bytes_limit": self.limits.history_bytes,
                "journal_entries_limit": self.limits.journal_entries,
                "journal_bytes_limit": self.limits.journal_bytes,
            },
        )

    def subscribe(self, scope: str = "", *, history: bool = True, cursor: str | None = None) -> LiveSubscription:
        with self._condition:
            if self._closed:
                raise RuntimeError("Live hub is closed")
            subscription = LiveSubscription(self, scope, history)
            replay_after = self._resume_sequence(cursor)
            if replay_after is None:
                reason = "initial" if not cursor else "resume_miss"
                subscription._initial.append(
                    ("bootstrap", self._bootstrap_locked(scope, history, reason, bool(cursor)))
                )
            else:
                for change, _, sizes in self._journal:
                    if change["sequence"] > replay_after:
                        subscription._enqueue_locked(change, sizes)
                if not subscription._latest and not subscription._ordered and not subscription._reset:
                    subscription._initial.append(
                        ("change", self._envelope(scope=scope, upserts=[], removals=[], resumed=True))
                    )
            self._subscriptions.add(subscription)
            return subscription

    def _resume_sequence(self, cursor: str | None) -> int | None:
        if not cursor:
            return None
        epoch, sep, raw = cursor.rpartition(":")
        if not sep or epoch != self.epoch:
            return None
        try:
            sequence = int(raw)
        except ValueError:
            return None
        oldest = self._journal[0][0]["sequence"] - 1 if self._journal else self._sequence
        return sequence if oldest <= sequence <= self._sequence else None

    def close(self) -> None:
        with self._condition:
            self._closed = True
            for subscription in self._subscriptions:
                subscription._closed = True
            self._subscriptions.clear()
            self._condition.notify_all()

    def invalidate(self, reason: str, *, ordered_gap: bool = True) -> None:
        """A producer detected loss; no old replay cursor may hide that gap."""
        with self._condition:
            if self._closed:
                return
            self._sequence += 1
            self._journal.clear()
            self._journal_bytes = 0
            for subscription in self._subscriptions:
                subscription._initial.clear()
                subscription._latest.clear()
                subscription._ordered.clear()
                subscription._pending_bytes = 0
                subscription._reset = True
                subscription._reset_reason = reason
                subscription._ordered_gap |= ordered_gap
            self._condition.notify_all()


class LiveSubscription:
    """Latest-value slots and a separate ordered queue, both bounded by bytes."""

    def __init__(self, hub: LiveHub, scope: str, history: bool) -> None:
        self.hub = hub
        self.scope = scope
        self.history = history
        self._initial: deque[tuple[str, dict]] = deque()
        self._latest: dict[tuple[str, str], tuple[int, str, dict, int]] = {}
        self._ordered: deque[tuple[int, str, dict, int]] = deque()
        self._pending_bytes = 0
        self._reset = False
        self._reset_reason = "overflow"
        self._ordered_gap = False
        self._closed = False

    def _enqueue_locked(self, change: dict, sizes: dict) -> None:
        if self._closed or self._reset:
            return
        for kind in ("upserts", "removals"):
            for entity in change[kind]:
                if not entity_visible(entity, self.scope, self.history):
                    continue
                size = sizes[(kind, entity["topic"], entity["id"])]
                item = (change["sequence"], kind, entity, size)
                if TOPICS[entity["topic"]]["delivery"] == "ordered":
                    self._ordered.append(item)
                else:
                    key = (entity["topic"], entity["id"])
                    previous = self._latest.get(key)
                    if previous is not None:
                        self._pending_bytes -= previous[3]
                    self._latest[key] = item
                self._pending_bytes += size
        limits = self.hub.limits
        if (
            len(self._latest) + len(self._ordered) > limits.pending_entities
            or self._pending_bytes > limits.pending_bytes
        ):
            self._ordered_gap = bool(self._ordered)
            self._latest.clear()
            self._ordered.clear()
            self._pending_bytes = 0
            self._reset = True

    def next(self, timeout: float = 30.0) -> tuple[str, dict] | None:
        """None is a heartbeat timeout; StopIteration means shutdown."""
        deadline = time.monotonic() + timeout
        with self.hub._condition:
            while True:
                if self._closed:
                    raise StopIteration
                if self._initial:
                    return self._initial.popleft()
                if self._reset:
                    self._reset = False
                    result = self.hub._bootstrap_locked(self.scope, self.history, self._reset_reason, self._ordered_gap)
                    self._reset_reason = "overflow"
                    self._ordered_gap = False
                    return "bootstrap", result
                if self._latest or self._ordered:
                    pending = sorted([*self._latest.values(), *self._ordered], key=lambda item: item[0])
                    self._latest.clear()
                    self._ordered.clear()
                    self._pending_bytes = 0
                    sequence = pending[-1][0]
                    return "change", {
                        "protocol": PROTOCOL_VERSION,
                        "epoch": self.hub.epoch,
                        "sequence": sequence,
                        "cursor": f"{self.hub.epoch}:{sequence}",
                        "scope": self.scope,
                        "upserts": [item[2] for item in pending if item[1] == "upserts"],
                        "removals": [item[2] for item in pending if item[1] == "removals"],
                    }
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None
                self.hub._condition.wait(remaining)

    def close(self) -> None:
        with self.hub._condition:
            self._closed = True
            self.hub._subscriptions.discard(self)
            self.hub._condition.notify_all()
