"""OTLP export requests as rows for the OpenTelemetry Collector's Kusto tables.

The OpenTelemetry Collector's ``azuredataexplorer`` exporter writes logs, metrics and
traces to three tables, ``OTELLogs``, ``OTELMetrics`` and ``OTELTraces``. This module
turns one OTLP export request into rows for the same tables, so a collector and aictl
can write to one database and the same queries read both:

- The first columns of each table are the collector's, in its order and casing, filled
  as its Go code fills them (``logsdata_to_adx.go``, ``metricsdata_to_adx.go``,
  ``tracesdata_to_adx.go``).
- The columns after them are aictl's: the session, tool, model and machine a row
  belongs to, and a ``RowKey`` that is the same when an export is retried. A collector
  leaves them null.
- Two kinds of metric rows are aictl's own, since the collector's exporter writes
  neither: ``<name>_min`` and ``<name>_max`` for a histogram that reports them, and
  the rows of an ``ExponentialHistogram``, which the exporter skips. An exponential
  histogram is stored as ``_sum``, ``_count`` and cumulative ``_bucket`` rows whose
  ``le`` is computed from its scale; its zero and negative counts are in a first
  bucket ``le="0"``.
- ``OTELPayloads`` holds the text of values too large for a row. Kusto cuts a string
  over 1 MiB and makes a dynamic value over 1 MiB null without an error, so a large
  value is moved there in chunks and the row keeps a reference to it.

A record without a time is not stored in 1970: a log takes its observed time or the
time it was received, a metric point the time it was received, a span its end time
or the time it was received; a span's unknown end stays null. ``RowKey`` is made from
the times as sent, so it is the same when such a record is sent again.

With ``keep_text=False`` (``capture = "metadata"``) no text is stored: attributes go
through the store's rule (``storage.strip_event_text``), which drops prompts, messages,
tool input and output and any string over 256 characters and keeps their length; a
log's body is emptied and its length kept; nothing is written to ``OTELPayloads``.

The input is the request as a dict: OTLP/JSON parsed with ``json.loads``, or a
protobuf message through ``google.protobuf.json_format.MessageToDict``. Both give the
same rows. The converters do no I/O and do not change the input.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import math
import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from ..dashboard.otel_receiver import _SESSION_ID_KEYS, CONVERSATION_ID_KEY, _resolve_tool
from ..storage import _EVENT_TEXT_KEYS, _EVENT_TEXT_MAX_CHARS
from .ingest import sound_line

LOGS = "OTELLogs"
METRICS = "OTELMetrics"
TRACES = "OTELTraces"
PAYLOADS = "OTELPayloads"

SPILL_BYTES = 32 * 1024
"""A string value over this many UTF-8 bytes is moved to ``OTELPayloads``."""
CHUNK_BYTES = 256 * 1024
"""The most UTF-8 bytes of text in one ``OTELPayloads`` row."""
BAG_BYTES = 512 * 1024
"""The most bytes of JSON in one dynamic column after spilling."""
ROW_BYTES = 960 * 1024
"""The most bytes in one row's JSON line; Kusto's limit per value is 1 MiB."""
PREVIEW_CHARS = 256
"""Characters of a spilled value kept in the row."""
_SPLIT_WINDOW = 1024
_CHUNK_ESCAPED = 3 * CHUNK_BYTES
_BAD = (ValueError, TypeError, KeyError, AttributeError, IndexError, OverflowError)
_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


# ── Tables ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Column:
    name: str
    kusto_type: str
    doc: str


@dataclass(frozen=True)
class Table:
    """A Kusto table: its columns in order, the first ``collector_columns`` the collector's."""

    name: str
    columns: tuple[Column, ...]
    collector_columns: int
    doc: str

    @property
    def column_names(self) -> tuple[str, ...]:
        return tuple(c.name for c in self.columns)


def _cols(*spec: tuple[str, str, str]) -> tuple[Column, ...]:
    return tuple(Column(n, t, d) for n, t, d in spec)


_AICTL_IDENTITY = (
    ("SessionId", "string", "aictl: the session: session.id, sessionId or session_id, else gen_ai.conversation.id"),
    ("Tool", "string", "aictl: the tool id resolved from resource service.name"),
)
_AICTL_MODEL = (("Model", "string", "aictl: attribute model, gen_ai.request.model or gen_ai.response.model"),)
_AICTL_TAIL = (
    ("MachineId", "string", "aictl: resource host.id, else host.name, else the receiving host"),
    ("RowKey", "string", "aictl: SHA-256 of the row identity; equal for a retried export"),
)

TABLES: tuple[Table, ...] = (
    Table(
        LOGS,
        _cols(
            ("Timestamp", "datetime", "When the event occurred"),
            ("ObservedTimestamp", "datetime", "When the event was observed"),
            ("TraceID", "string", "Trace id, lowercase hex"),
            ("SpanID", "string", "Span id, lowercase hex"),
            ("SeverityText", "string", "Severity text as sent"),
            ("SeverityNumber", "int", "OTLP severity number; INFO is 9"),
            ("Body", "string", "The log body as text; maps and arrays as JSON"),
            ("ResourceAttributes", "dynamic", "Resource attributes"),
            ("LogsAttributes", "dynamic", "Record attributes plus scope.name and scope.version"),
            ("EventName", "string", "aictl: eventName, else attribute event.name, else attribute name"),
            *_AICTL_IDENTITY,
            *_AICTL_MODEL,
            *_AICTL_TAIL,
        ),
        9,
        "OpenTelemetry log records",
    ),
    Table(
        METRICS,
        _cols(
            ("Timestamp", "datetime", "Time of the data point"),
            ("MetricName", "string", "Metric name; _sum, _count, _bucket and quantile rows add a suffix"),
            ("MetricType", "string", "Gauge, Sum, Histogram, ExponentialHistogram or Summary"),
            ("MetricUnit", "string", "Unit of the metric"),
            ("MetricDescription", "string", "Description of the metric"),
            ("MetricValue", "real", "Value of the data point; null when not finite"),
            ("Host", "string", "Resource host.name, else the receiving host"),
            ("ResourceAttributes", "dynamic", "Resource attributes"),
            ("MetricAttributes", "dynamic", "Data point attributes plus scope.name, scope.version, le and qt"),
            ("StartTime", "datetime", "aictl: start of the aggregation interval; null when not sent"),
            ("Temporality", "string", "aictl: Delta, Cumulative or empty"),
            ("Monotonic", "bool", "aictl: whether a Sum is monotonic; null for other types"),
            *_AICTL_IDENTITY,
            *_AICTL_MODEL,
            *_AICTL_TAIL,
        ),
        9,
        "OpenTelemetry metric data points",
    ),
    Table(
        TRACES,
        _cols(
            ("TraceID", "string", "Trace id, lowercase hex"),
            ("SpanID", "string", "Span id, lowercase hex"),
            ("ParentID", "string", "Parent span id; empty for a root span"),
            ("SpanName", "string", "Span name"),
            ("SpanStatus", "string", "STATUS_CODE_UNSET, STATUS_CODE_OK or STATUS_CODE_ERROR"),
            ("SpanKind", "string", "SPAN_KIND_UNSPECIFIED, INTERNAL, SERVER, CLIENT, PRODUCER or CONSUMER"),
            ("StartTime", "datetime", "Span start"),
            ("EndTime", "datetime", "Span end"),
            ("ResourceAttributes", "dynamic", "Resource attributes"),
            ("TraceAttributes", "dynamic", "Span attributes plus scope.name and scope.version"),
            ("Events", "dynamic", "Span events: EventName, Timestamp, EventAttributes"),
            ("Links", "dynamic", "Span links: TraceID, SpanID, TraceState, SpanLinkAttributes"),
            ("SpanStatusMessage", "string", "Status message"),
            ("DurationMs", "long", "aictl: EndTime minus StartTime in milliseconds; null when a time is missing"),
            *_AICTL_IDENTITY,
            *_AICTL_MODEL,
            *_AICTL_TAIL,
        ),
        13,
        "OpenTelemetry spans",
    ),
    Table(
        PAYLOADS,
        _cols(
            ("Timestamp", "datetime", "Time of the row the text came from"),
            ("PayloadId", "string", "SHA-256 of the full text as UTF-8"),
            ("ChunkNo", "int", "Position of this chunk, from 0"),
            ("ChunkCount", "int", "Number of chunks of the text"),
            ("TotalBytes", "long", "Size of the full text in UTF-8 bytes"),
            ("PayloadKind", "string", "Attribute key the text came from, or body"),
            ("SourceTable", "string", "Table of the row the text came from"),
            ("SourceRowKey", "string", "RowKey of the row the text came from"),
            ("SourceField", "string", "Column and key the text came from"),
            ("SessionId", "string", "Session of the source row"),
            ("Tool", "string", "Tool of the source row"),
            ("MachineId", "string", "Machine of the source row"),
            ("Text", "string", "This chunk of the text"),
        ),
        0,
        "aictl: text of values too large for their row, in chunks; concatenate by ChunkNo",
    ),
)
TABLES_BY_NAME: dict[str, Table] = {t.name: t for t in TABLES}


def create_commands() -> list[str]:
    """``.create-merge table`` for each table. Safe to run again: it adds missing columns only."""
    return [
        f".create-merge table {t.name} (" + ", ".join(f"{c.name}:{c.kusto_type}" for c in t.columns) + ")"
        for t in TABLES
    ]


def docstring_commands() -> list[str]:
    """``.alter-merge table ... column-docstrings`` for each table."""
    return [
        f".alter-merge table {t.name} column-docstrings ("
        + ", ".join(f"{c.name}:{json.dumps(c.doc)}" for c in t.columns)
        + ")"
        for t in TABLES
    ]


def json_line(row: dict) -> str:
    """One row as one compact JSON line, ASCII only, with dynamic columns nested."""
    return sound_line(json.dumps(row, ensure_ascii=True, separators=(",", ":"), allow_nan=False))


@dataclass
class Converted:
    """Rows per table and counters for one export request."""

    rows: dict[str, list[dict]] = field(default_factory=lambda: {t.name: [] for t in TABLES})
    stats: dict[str, int] = field(
        default_factory=lambda: dict.fromkeys(
            (
                "records",
                "bad_records",
                "bad_values",
                "nonfinite_values",
                "dropped_nonfinite",
                "unsupported_metrics",
                "spilled_values",
                "spilled_bytes",
                "payload_rows",
            ),
            0,
        )
    )


# ── Input access ──────────────────────────────────────────────────────

_SNAKE_RE = re.compile(r"(?<!^)(?=[A-Z])")
_SNAKE_CACHE: dict[str, str] = {}


def _get(d: Any, key: str, default: Any = None) -> Any:
    """``d[key]`` for a camelCase key, or its snake_case form, else *default*."""
    if not isinstance(d, dict):
        return default
    if key in d:
        return d[key]
    snake = _SNAKE_CACHE.get(key)
    if snake is None:
        snake = _SNAKE_CACHE[key] = _SNAKE_RE.sub("_", key).lower()
    return d.get(snake, default)


def _children(container: Any, key: str, stats: dict[str, int]) -> Iterator[dict]:
    """Dict children of ``container[key]``; a non-dict child is counted as a bad record."""
    items = _get(container, key)
    if not isinstance(items, list):
        return
    for item in items:
        if isinstance(item, dict):
            yield item
        else:
            stats["bad_records"] += 1


def _int(v: Any, default: int = 0) -> int:
    """An OTLP integer, sent as a number or a decimal string."""
    if v is None or v == "":
        return default
    if isinstance(v, bool):
        raise TypeError("bool is not an integer")
    if isinstance(v, float):
        if not v.is_integer():
            raise ValueError(f"not an integer: {v}")
        return int(v)
    return int(v)


def _float(v: Any) -> float:
    """An OTLP double: a number, or a string such as ``"NaN"`` or ``"Infinity"``."""
    if v is None:
        return 0.0
    if isinstance(v, bool):
        raise TypeError("bool is not a double")
    return float(v)


_NONFINITE_NAME = {"nan": "NaN", "inf": "Infinity", "-inf": "-Infinity"}


# ── AnyValue ──────────────────────────────────────────────────────────


def _any(v: Any, stats: dict[str, int]) -> Any:
    """An OTLP AnyValue as a Python value: maps are dicts, arrays lists, bytes base64 text.

    A non-finite double becomes its proto3 JSON name (``"NaN"``, ``"Infinity"``,
    ``"-Infinity"``), so the value is kept and the row is valid JSON.
    """
    if not isinstance(v, dict):
        return None
    if "stringValue" in v or "string_value" in v:
        return _get(v, "stringValue")
    if "boolValue" in v or "bool_value" in v:
        return bool(_get(v, "boolValue"))
    if "intValue" in v or "int_value" in v:
        raw = _get(v, "intValue")
        try:
            return _int(raw)
        except _BAD:
            stats["bad_values"] += 1
            return raw
    if "doubleValue" in v or "double_value" in v:
        raw = _get(v, "doubleValue")
        try:
            f = _float(raw)
        except _BAD:
            stats["bad_values"] += 1
            return raw
        if not math.isfinite(f):
            stats["nonfinite_values"] += 1
            return _NONFINITE_NAME[repr(f)]
        return f
    if "arrayValue" in v or "array_value" in v:
        values = _get(_get(v, "arrayValue"), "values")
        return [_any(x, stats) for x in values] if isinstance(values, list) else []
    if "kvlistValue" in v or "kvlist_value" in v:
        return _attrs(_get(_get(v, "kvlistValue"), "values"), stats)
    if "bytesValue" in v or "bytes_value" in v:
        return _get(v, "bytesValue")
    return None


def _attrs(kvs: Any, stats: dict[str, int]) -> dict:
    """An OTLP ``KeyValue`` list as a dict; a later duplicate key wins, as in the collector."""
    out: dict = {}
    if not isinstance(kvs, list):
        return out
    for kv in kvs:
        if not isinstance(kv, dict):
            stats["bad_values"] += 1
            continue
        key = kv.get("key", "")
        out[key if isinstance(key, str) else str(key)] = _any(kv.get("value"), stats)
    return out


# ── Go formatting ─────────────────────────────────────────────────────


class _Unsupported(ValueError):
    pass


def _digits(f: float) -> tuple[bool, str, int]:
    """Shortest round-trip decimal digits of a finite non-zero float and the point position."""
    t = Decimal(repr(f)).normalize().as_tuple()
    digits = "".join(str(d) for d in t.digits)
    return bool(t.sign), digits, len(digits) + int(t.exponent)


def _fmt_f(neg: bool, digits: str, dp: int) -> str:
    if dp <= 0:
        s = "0." + "0" * -dp + digits
    elif dp >= len(digits):
        s = digits + "0" * (dp - len(digits))
    else:
        s = digits[:dp] + "." + digits[dp:]
    return ("-" if neg else "") + s


def _fmt_e(neg: bool, digits: str, dp: int, min_exp_digits: int) -> str:
    exp = dp - 1
    mant = digits[0] + ("." + digits[1:] if len(digits) > 1 else "")
    return ("-" if neg else "") + mant + "e" + ("-" if exp < 0 else "+") + str(abs(exp)).zfill(min_exp_digits)


def _go_nonfinite(f: float) -> str | None:
    if math.isnan(f):
        return "NaN"
    if math.isinf(f):
        return "+Inf" if f > 0 else "-Inf"
    return None


def go_format_g(f: float) -> str:
    """Go ``strconv.FormatFloat(f, 'g', -1, 64)``: the collector's ``le`` and ``qt`` values."""
    special = _go_nonfinite(f)
    if special is not None:
        return special
    if f == 0:
        return "-0" if math.copysign(1, f) < 0 else "0"
    neg, digits, dp = _digits(f)
    if dp - 1 < -4 or dp - 1 >= 6:
        return _fmt_e(neg, digits, dp, 2)
    return _fmt_f(neg, digits, dp)


def go_format_f(f: float) -> str:
    """Go ``strconv.FormatFloat(f, 'f', -1, 64)``: the collector's quantile metric names."""
    special = _go_nonfinite(f)
    if special is not None:
        return special
    if f == 0:
        return "-0" if math.copysign(1, f) < 0 else "0"
    neg, digits, dp = _digits(f)
    return _fmt_f(neg, digits, dp)


def _go_json_float(f: float) -> str:
    """Go ``encoding/json`` number text (ES6 style); a non-finite value is an error."""
    if not math.isfinite(f):
        raise _Unsupported(go_format_g(f))
    if f == 0:
        return "-0" if math.copysign(1, f) < 0 else "0"
    neg, digits, dp = _digits(f)
    if abs(f) < 1e-6 or abs(f) >= 1e21:
        return _fmt_e(neg, digits, dp, 1)
    return _fmt_f(neg, digits, dp)


_GO_ESCAPES = {'"': '\\"', "\\": "\\\\", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f"}


def _go_json_str(s: str) -> str:
    """Go ``encoding/json`` string text: HTML characters and U+2028/U+2029 escaped."""
    out = ['"']
    for ch in s:
        o = ord(ch)
        if ch in _GO_ESCAPES:
            out.append(_GO_ESCAPES[ch])
        elif o < 0x20 or ch in "<>&" or o in (0x2028, 0x2029):
            out.append(f"\\u{o:04x}")
        elif 0xD800 <= o <= 0xDFFF:
            out.append("\\ufffd")
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def _go_json_any(v: Any) -> str:
    """An OTLP AnyValue as Go's ``json.Marshal(value.AsRaw())`` writes it (keys sorted)."""
    if not isinstance(v, dict):
        return "null"
    if "stringValue" in v or "string_value" in v:
        return _go_json_str(str(_get(v, "stringValue")))
    if "boolValue" in v or "bool_value" in v:
        return "true" if _get(v, "boolValue") else "false"
    if "intValue" in v or "int_value" in v:
        return str(_int(_get(v, "intValue")))
    if "doubleValue" in v or "double_value" in v:
        return _go_json_float(_float(_get(v, "doubleValue")))
    if "arrayValue" in v or "array_value" in v:
        values = _get(_get(v, "arrayValue"), "values")
        return "[" + ",".join(_go_json_any(x) for x in (values if isinstance(values, list) else [])) + "]"
    if "kvlistValue" in v or "kvlist_value" in v:
        values = _get(_get(v, "kvlistValue"), "values")
        merged: dict[str, Any] = {}
        for kv in values if isinstance(values, list) else []:
            if isinstance(kv, dict):
                merged[str(kv.get("key", ""))] = kv.get("value")
        return "{" + ",".join(_go_json_str(k) + ":" + _go_json_any(merged[k]) for k in sorted(merged)) + "}"
    if "bytesValue" in v or "bytes_value" in v:
        return _go_json_str(str(_get(v, "bytesValue")))
    return "null"


def _body_text(v: Any) -> str:
    """The collector's ``Body().AsString()``."""
    if not isinstance(v, dict):
        return ""
    if "stringValue" in v or "string_value" in v:
        s = _get(v, "stringValue")
        return s if isinstance(s, str) else str(s)
    if "boolValue" in v or "bool_value" in v:
        return "true" if _get(v, "boolValue") else "false"
    if "intValue" in v or "int_value" in v:
        return str(_int(_get(v, "intValue")))
    if "doubleValue" in v or "double_value" in v:
        f = _float(_get(v, "doubleValue"))
        try:
            return _go_json_float(f)
        except _Unsupported:
            return "json: unsupported value: " + go_format_g(f)
    if "bytesValue" in v or "bytes_value" in v:
        return str(_get(v, "bytesValue"))
    if any(k in v for k in ("arrayValue", "array_value", "kvlistValue", "kvlist_value")):
        try:
            return _go_json_any(v)
        except _Unsupported:
            return ""
    return ""


def format_time(ns: int) -> str:
    """Integer nanoseconds as Go ``time.RFC3339Nano`` in UTC: fraction trimmed, ``Z`` suffix."""
    sec, frac = divmod(ns, 1_000_000_000)
    text = (_EPOCH + timedelta(seconds=sec)).strftime("%Y-%m-%dT%H:%M:%S")
    if frac:
        text += "." + f"{frac:09d}".rstrip("0")
    return text + "Z"


# ── Ids and enums ─────────────────────────────────────────────────────

_HEX = frozenset("0123456789abcdefABCDEF")


def otel_id(v: Any) -> str:
    """A trace or span id as lowercase hex; ``""`` when missing, all zero or unreadable.

    OTLP/JSON sends hex (32 or 16 characters), ``MessageToDict`` base64 (24 or 12).
    """
    if not isinstance(v, str) or not v:
        return ""
    is_hex = all(c in _HEX for c in v)
    if len(v) in (32, 16) and is_hex:
        out = v.lower()
    elif len(v) in (24, 12):
        try:
            out = base64.b64decode(v, validate=True).hex()
        except (binascii.Error, ValueError):
            return ""
    elif is_hex and len(v) % 2 == 0:
        out = v.lower()
    else:
        return ""
    return "" if out.strip("0") == "" else out


def _enum(v: Any, names: dict[str, int]) -> int:
    """An OTLP enum sent as a number, a decimal string or its proto name."""
    if v is None or v == "":
        return 0
    if isinstance(v, str) and v in names:
        return names[v]
    return _int(v)


_SPAN_KINDS = ("UNSPECIFIED", "INTERNAL", "SERVER", "CLIENT", "PRODUCER", "CONSUMER")
_SPAN_KIND_NAMES = {f"SPAN_KIND_{n}": i for i, n in enumerate(_SPAN_KINDS)}
_STATUS_CODES = ("UNSET", "OK", "ERROR")
_STATUS_NAMES = {f"STATUS_CODE_{n}": i for i, n in enumerate(_STATUS_CODES)}
_TEMPORALITY_NAMES = {
    "AGGREGATION_TEMPORALITY_UNSPECIFIED": 0,
    "AGGREGATION_TEMPORALITY_DELTA": 1,
    "AGGREGATION_TEMPORALITY_CUMULATIVE": 2,
}
_SEVERITY_NAMES = {"SEVERITY_NUMBER_UNSPECIFIED": 0}
for _i, _level in enumerate(("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL")):
    for _j in range(4):
        _SEVERITY_NAMES[f"SEVERITY_NUMBER_{_level}{_j + 1 if _j else ''}"] = 4 * _i + _j + 1


def _span_kind(v: Any) -> str:
    """traceutil.SpanKindStr: an unknown kind is ``""``."""
    i = _enum(v, _SPAN_KIND_NAMES)
    return f"SPAN_KIND_{_SPAN_KINDS[i]}" if 0 <= i < len(_SPAN_KINDS) else ""


def _status_code(v: Any) -> str:
    """traceutil.StatusCodeStr: an unknown code is ``""``."""
    i = _enum(v, _STATUS_NAMES)
    return f"STATUS_CODE_{_STATUS_CODES[i]}" if 0 <= i < len(_STATUS_CODES) else ""


def _temporality(v: Any) -> str:
    return {1: "Delta", 2: "Cumulative"}.get(_enum(v, _TEMPORALITY_NAMES), "")


# ── aictl identity ────────────────────────────────────────────────────


def _text(v: Any) -> str:
    if v is None or v == "" or isinstance(v, (dict, list)):
        return ""
    return v if isinstance(v, str) else str(v)


def _session_id(attrs: dict, resource: dict) -> str:
    for source in (attrs, resource):
        for key in _SESSION_ID_KEYS:
            val = _text(source.get(key))
            if val:
                return val
    for source in (attrs, resource):
        val = _text(source.get(CONVERSATION_ID_KEY))
        if val:
            return val
    return ""


def _model(attrs: dict) -> str:
    for key in ("model", "gen_ai.request.model", "gen_ai.response.model"):
        val = _text(attrs.get(key))
        if val:
            return val
    return ""


def _machine_id(resource: dict, host: str) -> str:
    return _text(resource.get("host.id")) or _text(resource.get("host.name")) or host


def _tool(resource: dict) -> str:
    return _resolve_tool(_text(resource.get("service.name")))


def _scope_map(scope: Any) -> dict:
    """The collector's getScopeMap: scope.name and scope.version, each only when not empty."""
    out = {}
    name, version = _get(scope, "name"), _get(scope, "version")
    if name:
        out["scope.name"] = name
    if version:
        out["scope.version"] = version
    return out


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False)


def _row_key(*identity: Any) -> str:
    return hashlib.sha256(_canonical(list(identity)).encode("ascii")).hexdigest()


# ── Size safety ───────────────────────────────────────────────────────


def _utf8(s: str) -> bytes:
    return s.encode("utf-8", "surrogatepass")


def _jlen(v: Any) -> int:
    """Bytes of *v* in a JSON line."""
    return len(json.dumps(v, ensure_ascii=True, separators=(",", ":"), allow_nan=False))


def _is_ref(v: Any) -> bool:
    return isinstance(v, dict) and ("payload_id" in v or "sha256" in v) and "bytes" in v and len(v) <= 4


def chunk_text(text: str) -> list[str]:
    """*text* cut into pieces of at most CHUNK_BYTES UTF-8 bytes that join back to it.

    A cut is made before a character that is not a letter or digit when the last
    1024 characters of a piece hold one, so a word is not split between two rows.
    """
    data = _utf8(text)
    chunks: list[str] = []
    start = 0
    while start < len(data):
        limit = min(start + CHUNK_BYTES, len(data))
        if limit < len(data):
            while limit > start and (data[limit] & 0xC0) == 0x80:
                limit -= 1
            limit = _word_cut(data, start, limit)
        piece = data[start:limit].decode("utf-8", "surrogatepass")
        while _jlen(piece) - 2 > _CHUNK_ESCAPED and len(piece) > 1:
            piece = piece[: len(piece) // 2]
        chunks.append(piece)
        start += len(_utf8(piece))
    return chunks


def _word_cut(data: bytes, start: int, limit: int) -> int:
    """The byte offset at or before *limit* to cut at, preferring a non-alphanumeric next character."""
    nxt = data[limit : limit + 4].decode("utf-8", "ignore")[:1]
    if nxt and not nxt.isalnum():
        return limit
    lo = max(start, limit - 4 * _SPLIT_WINDOW)
    while lo > start and (data[lo] & 0xC0) == 0x80:
        lo += 1
    window = data[lo:limit].decode("utf-8", "surrogatepass")[-_SPLIT_WINDOW:]
    offset = limit
    for ch in reversed(window):
        offset -= len(_utf8(ch))
        if not ch.isalnum() and offset > start:
            return offset
    return limit


@dataclass
class _Source:
    table: str
    row_key: str
    timestamp: str | None
    session_id: str
    tool: str
    machine_id: str


class _Spiller:
    """Moves large values of one conversion call to ``OTELPayloads`` rows."""

    def __init__(self, out: Converted, keep_text: bool) -> None:
        self.out = out
        self.keep_text = keep_text
        self.seen: set[str] = set()

    def spill(self, text: str, kind: str, src: _Source, fld: str, preview: bool = True) -> dict:
        """Store *text* and return the reference that replaces it in the row."""
        data = _utf8(text)
        pid = hashlib.sha256(data).hexdigest()
        stats = self.out.stats
        stats["spilled_values"] += 1
        stats["spilled_bytes"] += len(data)
        if not self.keep_text:
            return {"bytes": len(data), "sha256": pid}
        if pid not in self.seen:
            self.seen.add(pid)
            chunks = chunk_text(text)
            rows = self.out.rows[PAYLOADS]
            for no, chunk in enumerate(chunks):
                rows.append(
                    {
                        "Timestamp": src.timestamp,
                        "PayloadId": pid,
                        "ChunkNo": no,
                        "ChunkCount": len(chunks),
                        "TotalBytes": len(data),
                        "PayloadKind": kind,
                        "SourceTable": src.table,
                        "SourceRowKey": src.row_key,
                        "SourceField": fld,
                        "SessionId": src.session_id,
                        "Tool": src.tool,
                        "MachineId": src.machine_id,
                        "Text": chunk,
                    }
                )
            stats["payload_rows"] += len(chunks)
        ref: dict[str, Any] = {"payload_id": pid, "bytes": len(data)}
        if preview:
            ref["preview"] = text[:PREVIEW_CHARS]
        return ref

    def spill_value(self, container: dict, key: str, src: _Source, fld: str) -> int:
        """Replace ``container[key]`` by a reference; returns the change in JSON bytes."""
        value = container[key]
        before = _jlen(value)
        text = value if isinstance(value, str) else _canonical_text(value)
        ref = self.spill(text, key, src, fld)
        if not isinstance(value, str):
            ref["json"] = True
        container[key] = ref
        return _jlen(ref) - before

    def spill_long_strings(self, bag: dict, src: _Source, fld: str) -> None:
        for key, value in list(bag.items()):
            if isinstance(value, str) and len(value) * 4 > SPILL_BYTES and len(_utf8(value)) > SPILL_BYTES:
                self.spill_value(bag, key, src, f"{fld}.{key}")

    def fit(self, slots: list[tuple[dict, str, str]], total: int, budget: int, src: _Source) -> int:
        """Spill the largest values in *slots* until *total* is at most *budget*; returns the new total."""
        candidates = [(_jlen(c[k]), c, k, f) for c, k, f in slots if not _is_ref(c[k]) and not k.startswith("aictl.")]
        candidates.sort(key=lambda t: t[0], reverse=True)
        for size, container, key, fld in candidates:
            if total <= budget:
                break
            if size <= PREVIEW_CHARS:
                break
            total += self.spill_value(container, key, src, fld)
        return total


def _canonical_text(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def _bag_slots(bag: dict, fld: str) -> list[tuple[dict, str, str]]:
    return [(bag, k, f"{fld}.{k}") for k in bag]


def _make_safe(row: dict, bags: tuple[str, ...], lists: dict[str, str], sp: _Spiller, src: _Source) -> None:
    """Bring every dynamic column of *row* under BAG_BYTES and the row under ROW_BYTES.

    *bags* names dict columns; *lists* maps list columns to the attribute key of their elements.
    """
    slots_by_col: dict[str, list[tuple[dict, str, str]]] = {}
    for col in bags:
        bag = row[col]
        sp.spill_long_strings(bag, src, col)
        slots = _bag_slots(bag, col)
        sp.fit(slots, _jlen(bag), BAG_BYTES, src)
        slots_by_col[col] = slots
    for col, attr_key in lists.items():
        slots = []
        for i, item in enumerate(row[col]):
            attrs = item[attr_key]
            sp.spill_long_strings(attrs, src, f"{col}[{i}].{attr_key}")
            slots += _bag_slots(attrs, f"{col}[{i}].{attr_key}")
        total = sp.fit(slots, _jlen(row[col]), BAG_BYTES, src)
        if total > BAG_BYTES:
            whole = sp.spill(_canonical_text(row[col]), col, src, col)
            whole["json"] = True
            row[col] = [whole]
            slots = []
        slots_by_col[col] = slots
    total = _jlen(row)
    if total > ROW_BYTES:
        sp.fit([s for slots in slots_by_col.values() for s in slots], total, ROW_BYTES, src)


def _no_text(value: Any) -> Any:
    """The store's rule for a mode that keeps no text (``storage.strip_event_text``), inside arrays as well."""
    if isinstance(value, list):
        return [
            {"chars": len(v)} if isinstance(v, str) and len(v) > _EVENT_TEXT_MAX_CHARS else _no_text(v) for v in value
        ]
    if not isinstance(value, dict):
        return value
    out: dict[str, Any] = {}
    for key, v in value.items():
        if key in _EVENT_TEXT_KEYS:
            if isinstance(v, str):
                out[f"{key}_chars"] = len(v)
        elif isinstance(v, str) and len(v) > _EVENT_TEXT_MAX_CHARS:
            out[f"{key}_chars"] = len(v)
        else:
            out[key] = _no_text(v)
    return out


def _drop_text(row: dict, bags: tuple[str, ...], lists: dict[str, str]) -> None:
    """Take the text out of every attribute bag of *row*."""
    for col in bags:
        row[col] = _no_text(row[col])
    for col, attr_key in lists.items():
        for item in row[col]:
            item[attr_key] = _no_text(item[attr_key])


# ── Logs ──────────────────────────────────────────────────────────────


def convert_logs(body: dict, *, received_ns: int, host: str, keep_text: bool = True) -> Converted:
    """An OTLP logs export request as ``OTELLogs`` rows (and ``OTELPayloads`` rows for large text)."""
    out = Converted()
    sp = _Spiller(out, keep_text)
    if not isinstance(body, dict):
        out.stats["bad_records"] += 1
        return out
    for rl in _children(body, "resourceLogs", out.stats):
        resource = _attrs(_get(_get(rl, "resource"), "attributes"), out.stats)
        tool, machine = _tool(resource), _machine_id(resource, host)
        for sl in _children(rl, "scopeLogs", out.stats):
            scope = _scope_map(_get(sl, "scope"))
            for rec in _children(sl, "logRecords", out.stats):
                try:
                    row = _log_row(rec, resource, scope, tool, machine, received_ns, sp)
                except _BAD:
                    out.stats["bad_records"] += 1
                    continue
                out.rows[LOGS].append(row)
                out.stats["records"] += 1
    return out


def _log_row(rec: dict, resource: dict, scope: dict, tool: str, machine: str, received_ns: int, sp: _Spiller) -> dict:
    stats = sp.out.stats
    raw_attrs = _attrs(_get(rec, "attributes"), stats)
    attrs = {**raw_attrs, **scope}
    t = _int(_get(rec, "timeUnixNano"))
    observed = _int(_get(rec, "observedTimeUnixNano"))
    ts = format_time(t or observed or received_ns)
    observed_ts = format_time(observed or received_ns)
    event_name = _text(_get(rec, "eventName")) or _text(raw_attrs.get("event.name")) or _text(raw_attrs.get("name"))
    body = _body_text(_get(rec, "body"))
    if not event_name and 0 < len(body) <= 128 and not any(c.isspace() for c in body):
        # Some tools name the event in the body alone, and the receiver reads it there too.
        event_name = body
    row: dict[str, Any] = {
        "Timestamp": ts,
        "ObservedTimestamp": observed_ts,
        "TraceID": otel_id(_get(rec, "traceId")),
        "SpanID": otel_id(_get(rec, "spanId")),
        "SeverityText": _text(_get(rec, "severityText")),
        "SeverityNumber": _enum(_get(rec, "severityNumber"), _SEVERITY_NAMES),
        "Body": body,
        "ResourceAttributes": dict(resource),
        "LogsAttributes": attrs,
        "EventName": event_name,
        "SessionId": _session_id(raw_attrs, resource),
        "Tool": tool,
        "Model": _model(raw_attrs),
        "MachineId": machine,
    }
    # From the times as sent: a record without one keeps its key when it is sent again.
    sent = (format_time(t or observed), format_time(observed)) if t or observed else ("", "")
    row["RowKey"] = _row_key(tool, *sent, row["TraceID"], row["SpanID"], event_name, body, attrs)
    src = _Source(LOGS, row["RowKey"], ts, row["SessionId"], tool, machine)
    if sp.keep_text:
        if len(body) * 4 > SPILL_BYTES and len(_utf8(body)) > SPILL_BYTES:
            ref = sp.spill(body, "body", src, "Body", preview=False)
            row["Body"] = body[:PREVIEW_CHARS]
            attrs["aictl.body_payload"] = ref
    else:
        if body and body != event_name:
            row["Body"] = ""
            attrs["aictl.body_chars"] = len(body)
        _drop_text(row, ("LogsAttributes", "ResourceAttributes"), {})
    _make_safe(row, ("LogsAttributes", "ResourceAttributes"), {}, sp, src)
    return row


# ── Traces ────────────────────────────────────────────────────────────


def convert_traces(body: dict, *, received_ns: int, host: str, keep_text: bool = True) -> Converted:
    """An OTLP traces export request as ``OTELTraces`` rows (and ``OTELPayloads`` rows for large text).

    A span without a start time takes its end time, or *received_ns* when it has neither.
    """
    out = Converted()
    sp = _Spiller(out, keep_text)
    if not isinstance(body, dict):
        out.stats["bad_records"] += 1
        return out
    for rs in _children(body, "resourceSpans", out.stats):
        resource = _attrs(_get(_get(rs, "resource"), "attributes"), out.stats)
        tool, machine = _tool(resource), _machine_id(resource, host)
        for ss in _children(rs, "scopeSpans", out.stats):
            scope = _scope_map(_get(ss, "scope"))
            for span in _children(ss, "spans", out.stats):
                try:
                    row = _span_row(span, resource, scope, tool, machine, received_ns, sp)
                except _BAD:
                    out.stats["bad_records"] += 1
                    continue
                out.rows[TRACES].append(row)
                out.stats["records"] += 1
    return out


def _span_row(span: dict, resource: dict, scope: dict, tool: str, machine: str, received_ns: int, sp: _Spiller) -> dict:
    stats = sp.out.stats
    raw_attrs = _attrs(_get(span, "attributes"), stats)
    start_ns = _int(_get(span, "startTimeUnixNano"))
    end_ns = _int(_get(span, "endTimeUnixNano"))
    start = format_time(start_ns or end_ns or received_ns)
    status = _get(span, "status") or {}
    events = []
    for ev in _get(span, "events") or []:
        events.append(
            {
                "EventName": _text(_get(ev, "name")),
                "Timestamp": format_time(ev_ns) if (ev_ns := _int(_get(ev, "timeUnixNano"))) else start,
                "EventAttributes": _attrs(_get(ev, "attributes"), stats),
            }
        )
    links = []
    for ln in _get(span, "links") or []:
        links.append(
            {
                "TraceID": otel_id(_get(ln, "traceId")),
                "SpanID": otel_id(_get(ln, "spanId")),
                "TraceState": _text(_get(ln, "traceState")),
                "SpanLinkAttributes": _attrs(_get(ln, "attributes"), stats),
            }
        )
    row: dict[str, Any] = {
        "TraceID": otel_id(_get(span, "traceId")),
        "SpanID": otel_id(_get(span, "spanId")),
        "ParentID": otel_id(_get(span, "parentSpanId")),
        "SpanName": _text(_get(span, "name")),
        "SpanStatus": _status_code(_get(status, "code")),
        "SpanKind": _span_kind(_get(span, "kind")),
        "StartTime": start,
        "EndTime": format_time(end_ns) if end_ns else None,
        "ResourceAttributes": dict(resource),
        "TraceAttributes": {**raw_attrs, **scope},
        "Events": events,
        "Links": links,
        "SpanStatusMessage": _text(_get(status, "message")),
        "DurationMs": (end_ns - start_ns) // 1_000_000 if start_ns and end_ns else None,
        "SessionId": _session_id(raw_attrs, resource),
        "Tool": tool,
        "Model": _model(raw_attrs),
        "MachineId": machine,
    }
    row["RowKey"] = _row_key(row["TraceID"], row["SpanID"], format_time(start_ns))
    src = _Source(TRACES, row["RowKey"], start, row["SessionId"], tool, machine)
    bags = ("TraceAttributes", "ResourceAttributes")
    lists = {"Events": "EventAttributes", "Links": "SpanLinkAttributes"}
    if not sp.keep_text:
        _drop_text(row, bags, lists)
        if len(row["SpanStatusMessage"]) > PREVIEW_CHARS:
            row["TraceAttributes"]["aictl.status_message_chars"] = len(row["SpanStatusMessage"])
            row["SpanStatusMessage"] = ""
    _make_safe(row, bags, lists, sp, src)
    return row


# ── Metrics ───────────────────────────────────────────────────────────

_METRIC_TYPES = (
    ("gauge", "Gauge"),
    ("sum", "Sum"),
    ("histogram", "Histogram"),
    ("exponentialHistogram", "ExponentialHistogram"),
    ("summary", "Summary"),
)
_SUM_DESC = "(Sum total of samples)"
_COUNT_DESC = "(Count of samples)"
_MIN_DESC = "(Min of samples)"
_MAX_DESC = "(Max of samples)"


def convert_metrics(body: dict, *, received_ns: int, host: str, keep_text: bool = True) -> Converted:
    """An OTLP metrics export request as ``OTELMetrics`` rows, one or more per data point.

    A data point without a time takes *received_ns*.
    """
    out = Converted()
    sp = _Spiller(out, keep_text)
    if not isinstance(body, dict):
        out.stats["bad_records"] += 1
        return out
    for rm in _children(body, "resourceMetrics", out.stats):
        resource = _attrs(_get(_get(rm, "resource"), "attributes"), out.stats)
        host_name = resource.get("host.name")
        row_host = host_name if isinstance(host_name, str) else host
        ctx = (resource, _tool(resource), _machine_id(resource, host), row_host, received_ns)
        for sm in _children(rm, "scopeMetrics", out.stats):
            scope = _scope_map(_get(sm, "scope"))
            for metric in _children(sm, "metrics", out.stats):
                kind = next(((k, t) for k, t in _METRIC_TYPES if isinstance(_get(metric, k), dict)), None)
                if kind is None:
                    out.stats["unsupported_metrics"] += 1
                    continue
                data = _get(metric, kind[0])
                for dp in _children(data, "dataPoints", out.stats):
                    try:
                        rows = _metric_rows(metric, kind[1], data, dp, scope, ctx, sp)
                    except _BAD:
                        out.stats["bad_records"] += 1
                        continue
                    out.rows[METRICS].extend(rows)
                    out.stats["records"] += 1
    return out


def _metric_rows(metric: dict, mtype: str, data: dict, dp: dict, scope: dict, ctx: tuple, sp: _Spiller) -> list[dict]:
    resource, tool, machine, row_host, received_ns = ctx
    stats = sp.out.stats
    name = _text(_get(metric, "name"))
    desc = _text(_get(metric, "description"))
    unit = _text(_get(metric, "unit"))
    dp_attrs = _attrs(_get(dp, "attributes"), stats)
    t = _int(_get(dp, "timeUnixNano"))
    ts = format_time(t or received_ns)
    start_ns = _int(_get(dp, "startTimeUnixNano"))
    start = format_time(start_ns) if start_ns else None
    temporality = "" if mtype in ("Gauge", "Summary") else _temporality(_get(data, "aggregationTemporality"))
    monotonic = bool(_get(data, "isMonotonic", False)) if mtype == "Sum" else None
    session, model = _session_id(dp_attrs, resource), _model(dp_attrs)
    pending: list[tuple[str, str, float, dict]] = []

    def add(row_name: str, row_desc: str, value: float, extra: dict | None = None) -> None:
        attrs = {**scope, **(extra or {}), **dp_attrs}
        pending.append((row_name or name, row_desc or desc, value, attrs))

    if mtype in ("Gauge", "Sum"):
        if "asInt" in dp or "as_int" in dp:
            add("", "", float(_int(_get(dp, "asInt"))))
        elif "asDouble" in dp or "as_double" in dp:
            add("", "", _float(_get(dp, "asDouble")))
        else:
            add("", "", 0.0)
    elif mtype == "Histogram":
        _histogram(name, desc, dp, add)
    elif mtype == "ExponentialHistogram":
        _exp_histogram(name, desc, dp, add)
    else:
        _summary(name, desc, dp, add, stats)

    rows = []
    for row_name, row_desc, value, attrs in pending:
        if not math.isfinite(value):
            stats["dropped_nonfinite"] += 1
            value = None
        row: dict[str, Any] = {
            "Timestamp": ts,
            "MetricName": row_name,
            "MetricType": mtype,
            "MetricUnit": unit,
            "MetricDescription": row_desc,
            "MetricValue": value,
            "Host": row_host,
            "ResourceAttributes": dict(resource),
            "MetricAttributes": attrs,
            "StartTime": start,
            "Temporality": temporality,
            "Monotonic": monotonic,
            "SessionId": session,
            "Tool": tool,
            "Model": model,
            "MachineId": machine,
        }
        row["RowKey"] = _row_key(row_name, mtype, format_time(t), start, attrs, row["ResourceAttributes"])
        src = _Source(METRICS, row["RowKey"], ts, session, tool, machine)
        if not sp.keep_text:
            _drop_text(row, ("MetricAttributes", "ResourceAttributes"), {})
        _make_safe(row, ("MetricAttributes", "ResourceAttributes"), {}, sp, src)
        rows.append(row)
    return rows


def _histogram(name: str, desc: str, dp: dict, add) -> None:
    """The collector's histogram rows: _sum, _count, then cumulative _bucket rows ending at +Inf."""
    add(f"{name}_sum", desc + _SUM_DESC, _float(_get(dp, "sum")))
    add(f"{name}_count", desc + _COUNT_DESC, float(_int(_get(dp, "count"))))
    _min_max(name, desc, dp, add)
    bounds = [_float(b) for b in _get(dp, "explicitBounds") or []]
    counts = [_int(c) for c in _get(dp, "bucketCounts") or []]
    if not counts or len(counts) != len(bounds) + 1:
        return
    total = 0
    for bound, count in zip(bounds, counts):
        total += count
        add(f"{name}_bucket", "", float(total), {"le": go_format_g(bound)})
    add(f"{name}_bucket", "", float(total + counts[-1]), {"le": go_format_g(math.inf)})


def _min_max(name: str, desc: str, dp: dict, add) -> None:
    if "min" in dp:
        add(f"{name}_min", desc + _MIN_DESC, _float(dp["min"]))
    if "max" in dp:
        add(f"{name}_max", desc + _MAX_DESC, _float(dp["max"]))


def _exp_upper_bound(index: int, scale: int) -> float:
    try:
        return 2.0 ** ((index + 1) * 2.0**-scale)
    except OverflowError:
        return math.inf


def _exp_histogram(name: str, desc: str, dp: dict, add) -> None:
    """An exponential histogram as _sum, _count and cumulative _bucket rows with computed ``le``.

    The zero bucket and every negative bucket are counted in a first bucket ``le="0"``.
    """
    add(f"{name}_sum", desc + _SUM_DESC, _float(_get(dp, "sum")))
    add(f"{name}_count", desc + _COUNT_DESC, float(_int(_get(dp, "count"))))
    _min_max(name, desc, dp, add)
    scale = _int(_get(dp, "scale"))
    negative = _get(dp, "negative") or {}
    positive = _get(dp, "positive") or {}
    total = _int(_get(dp, "zeroCount")) + sum(_int(c) for c in _get(negative, "bucketCounts") or [])
    add(f"{name}_bucket", "", float(total), {"le": "0"})
    offset = _int(_get(positive, "offset"))
    for i, count in enumerate(_get(positive, "bucketCounts") or []):
        total += _int(count)
        add(f"{name}_bucket", "", float(total), {"le": go_format_g(_exp_upper_bound(offset + i, scale))})
    add(f"{name}_bucket", "", float(total), {"le": go_format_g(math.inf)})


def _summary(name: str, desc: str, dp: dict, add, stats: dict[str, int]) -> None:
    """The collector's summary rows: _sum, _count, then one row per quantile named by it."""
    add(f"{name}_sum", desc + _SUM_DESC, _float(_get(dp, "sum")))
    add(f"{name}_count", desc + _COUNT_DESC, float(_int(_get(dp, "count"))))
    for q in _get(dp, "quantileValues") or []:
        quantile = _float(_get(q, "quantile"))
        value = _float(_get(q, "value"))
        qname = f"{name}_{go_format_f(quantile)}"
        add(
            qname,
            desc + _COUNT_DESC,
            value,
            {"qt": go_format_g(quantile), qname: value if math.isfinite(value) else None},
        )
