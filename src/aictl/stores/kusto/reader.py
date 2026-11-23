"""Read a named KQL view with request parameters and a bounded result."""

from __future__ import annotations

import json
import math
import threading
import time
import uuid
from collections import OrderedDict
from collections.abc import Mapping
from concurrent.futures import Future
from copy import deepcopy
from dataclasses import dataclass, replace
from datetime import timedelta
from functools import lru_cache
from importlib.resources import files
from itertools import islice
from typing import Any

from ..base import ReadResult, StoreError, UnknownViewError
from .client import QUERY_TIMEOUT, query_memory_error, retrying
from .query_cpu import _cpu_ticks

_SCOPE = "all_nodes requested_node requested_project"
_EVENT = f"{_SCOPE} since until requested_tool requested_kinds requested_session raw_session"
_SESSION = "session_id tool model project_path started_at ended_at request_count input_tokens output_tokens cost_usd"
_TIME = "all_nodes requested_node since until"
_WINDOW = f"{_TIME} grid"
_BOARD_ID = "node_id session_id agent_id"
_VIEWS = {
    "analytics.requests": (f"{_TIME} restrict_tools requested_tools page_size", "row_type hidden count model avg_ms p50_ms p95_ms max_ms input_tokens output_tokens ts duration_ms cache_read_tokens session_id agent_id finish_reason cost_usd is_error"),
    "analytics.memory": (f"{_TIME} restrict_tools requested_tools", "row_type hidden count path ts size_bytes tokens growth_bytes"),
    "analytics.tools": (f"{_TIME} restrict_tools requested_tools", "row_type hidden count tool_name cli_tool avg_ms p95_ms error_count"),
    "analytics.profiles": (_TIME, "session_id tool project_path model started_at input_tokens output_tokens cache_read_tokens cache_creation_tokens cost_usd request_count tool_call_count tokens_source tokens_quality cost_quality"),
    "health.nodes": ("requested_project requested_node", "node_id samples last_sample"),
    "health.totals": ("all_nodes requested_node", "table rows earliest_ts latest_ts files_total_bytes files_total_tokens"),
    "health.sample_buckets": ("", "start"),
    "health.sample_count": ("since until null_timestamp", "rows"),
    "health.quality": ("all_nodes requested_node", "component source kind status severity message updated_at last_ok_at count detail"),
    "health.series": (
        f"{_TIME} step",
        "node_id t samples restarts host_cpu host_cpu_max host_mem_mb host_mem_total_mb tools_cpu tools_mem_mb "
        "daemon_cpu daemon_cpu_max daemon_rss_mb daemon_threads sessions processes in_rate out_rate reads_per_s "
        "writes_per_s commands_per_s read_ms read_ms_max write_ms write_ms_max reads_in_flight writes_in_flight "
        "query_cpu bytes_per_s streaming_rows_per_s queued_rows_per_s inline_rows_per_s otel_metrics_per_s "
        "otel_events_per_s queue_depth queue_bytes read_failures write_failures command_failures ingest_failures "
        "rows_dropped otel_errors otel_dropped sink_dropped",
    ),
    "health.flows": (
        f"{_TIME} step",
        "row_type node_id table t mode rows_per_s bytes_per_s requests_per_s failures rows_dropped queue_depth nodes "
        "rows bytes requests peak_rows_per_s last_at",
    ),
    "nodes.reports": (f"{_TIME} report_mode include_unreported", "node_id captured_at"),
    "runtime.processes": ("all_nodes requested_node restrict_tools requested_tools", "row_type node_id session_id pid tool role joined_at total"),
    "runtime.resources": (f"{_WINDOW} restrict_tools requested_tools", "tool b cpu mem"),
    "hooks.activity": (f"{_TIME} counts_only", "row_type tool kind count last_ts ts agent_id agent_type name starts stops"),
    "board.revision": ("all_nodes requested_node", "rows version"),
    "history.system": (f"{_TIME}", "ts files tokens cpu mem_mb mcp mem_tokens memory_entries live_sessions live_tokens live_in_rate live_out_rate"),
    "history.tools": (f"{_TIME} requested_tool", "ts tool cpu mem_mb"),
    "samples.page": (f"{_TIME} requested_metric metric_prefix tag_filter ascending", "ts metric value tags"),
    "samples.metrics": ("all_nodes requested_node metric_prefix", "metric count latest_ts last_value"),
    "catalog.entries": (
        "all_nodes requested_node requested_tab requested_key requested_source_type",
        "key label tab section explanation source_static source_type unit update_freq otel_metric dynamic_source source_dynamic query calc updated_at",
    ),
    "nodes.inventory": ("all_nodes requested_node", "node_id captured_at"),
    "nodes.first_seen": ("all_nodes requested_node", "node_id first_seen"),
    "nodes.sessions": (
        f"{_SCOPE} since until node_limit session_limit",
        f"row_type node_id {_SESSION} sessions requests",
    ),
    "sessions.lookup": (
        f"{_SCOPE} requested_session session_fragment",
        f"node_id {_SESSION} pid git_branch git_commit source cache_read_tokens cache_creation_tokens tool_call_count files_modified",
    ),
    "sessions.processes": (
        f"{_SCOPE} requested_session", "row_type pid tool role joined_at count",
    ),
    "sessions.first_activity": (f"{_SCOPE} requested_session", "first_ts"),
    "sessions.first_activities": ("all_nodes requested_node session_keys", "node_id session_id first_ts"),
    "agents.resolve": (f"{_SCOPE} requested_agent requested_session", "node_id session_id agent_id priority"),
    "agents.stored": (
        "all_nodes requested_node session_keys",
        "agent_id session_id tool model is_sidechain started_at ended_at completed input_tokens output_tokens "
        "cache_read_tokens cache_creation_tokens cost_usd description spawn_depth parent_agent_id parent_tool_use_id "
        "resolved_model status project cwd git_branch worktree_path observed_at",
    ),
    "events.page": (_EVENT, "ts tool kind detail session_id pid seq"),
    "events.count": (_EVENT, "count"),
    "events.lm_usage": (f"{_SCOPE} requested_session raw_session", "ts tool kind detail session_id pid seq"),
    "requests.models": (
        f"{_SCOPE} requested_session requested_agent since until",
        "model calls input_tokens output_tokens cache_read_tokens cache_creation_tokens last_ts cost_usd",
    ),
    "requests.loop_models": (
        "all_nodes requested_node spans",
        "span_index model calls input_tokens output_tokens cache_read_tokens cache_creation_tokens last_ts cost_usd",
    ),
    "usage.sessions": (
        f"{_SCOPE} since until requested_session without_requests session_keys",
        "node_id session_id tool project_path model models_json daily_json input_tokens output_tokens cache_read_tokens "
        "cache_creation_tokens request_count tool_call_count turn_count started_at last_activity_at cost_usd billing_unit "
        "billing_amount premium_requests",
    ),
    "requests.cells": (
        f"{_WINDOW} requested_session session_keys",
        f"{_BOARD_ID} model g tool project_path calls input_tokens output_tokens cache_read_tokens cache_creation_tokens "
        "errors first_ts last_ts last_error duration_count max_duration ttft_count max_ttft cost_usd",
    ),
    "requests.long": (
        f"{_WINDOW} requested_session session_keys requested_models min_tokens after_row",
        f"{_BOARD_ID} model g input_tokens output_tokens cache_read_tokens cache_creation_tokens ts",
    ),
    "tools.agent_totals": (
        f"{_TIME} requested_session session_keys",
        f"{_BOARD_ID} calls failures asked denied pending first_ts last_ts last_error tool project_path",
    ),
    "prompts.series": (f"{_WINDOW} requested_session session_keys", f"{_BOARD_ID} g prompts tool project_path"),
    "board.sessions": ("all_nodes requested_node session_keys", "node_id session_id tool project_path model pid started_at ended_at last_activity_at end_reason title title_source"),
    "board.agents": (
        "all_nodes requested_node session_keys",
        f"{_BOARD_ID} row_kind task model started_at ended_at completed description spawn_depth parent_agent_id "
        "parent_tool_use_id resolved_model agent_status last_call_ts last_call_name last_call_target last_call_open "
        "agent_type spawn_model spawn_prompt spawned_by spawn_tool_use_id",
    ),
    "requests.ended": ("all_nodes requested_node session_keys", "node_id session_id"),
    "tools.activity": (f"{_WINDOW} session_keys", f"{_BOARD_ID} g calls"),
    "tools.series": (
        f"{_WINDOW} session_keys",
        "tool_name g calls failures max_duration timed durations input_bytes input_count output_bytes output_count",
    ),
    "requests.latency": (
        f"{_WINDOW} session_keys requested_model", "node_id session_id model g durations firsts duration_count first_count",
    ),
    "requests.error_series": (
        f"{_WINDOW} session_keys requested_model", "node_id session_id error_type http_status g calls last_ts",
    ),
    "requests.live_owner": (
        "all_nodes requested_node requested_tool project_path_key fold_project", "node_id session_id",
    ),
    "sessions.pid_owners": ("all_nodes requested_node session_keys pids", "node_id session_id pid"),
    "sessions.runs": (
        "all_nodes requested_node requested_tool requested_path since until",
        "node_id session_id started_at ended_at input_tokens output_tokens files_modified cost_usd",
    ),
    "tools.activity_rows": (
        f"{_TIME} requested_session kind_filter session_keys after_row",
        f"{_BOARD_ID} ts tool_name target is_error exit_code duration_ms confirm confirm_wait_ms result_summary input_signature",
    ),
    "tools.confirm_counts": (
        f"{_TIME} requested_session session_keys", "node_id session_id tool_name confirm calls wait_count waits",
    ),
    "board.previous": (
        f"{_TIME} requested_model project_path_key fold_project restrict_tools requested_tools restrict_sessions session_keys",
        "row_type model calls input_tokens output_tokens cache_read_tokens cache_creation_tokens last_ts cost_usd tool_calls prompts",
    ),
    "prompts.page": (
        f"{_TIME} session_keys preview after_row", f"{_BOARD_ID} id ts project_path text prompt_file",
    ),
    "requests.intervals": (
        "all_nodes requested_node requested_model intervals", "node_id session_id start_ts end_ts tokens",
    ),
    "skills.window": (f"{_TIME} session_keys after_row", f"{_BOARD_ID} name ts"),
    "prompts.titles": ("all_nodes requested_node session_keys", f"{_BOARD_ID} text"),
    "board.search_hits": (f"{_TIME} session_keys search_text extended", "node_id session_id"),
    "prompts.detail": (
        "all_nodes requested_node requested_session prompt_ts open_end",
        "text prompt_file project_path input_tokens output_tokens cache_read_tokens cache_creation_tokens "
        "reply_ms cost_usd calls subagent_calls tool_calls",
    ),
    "prompts.turns": (
        "all_nodes requested_node requested_session requested_agent",
        "ts text tools model input_tokens output_tokens cache_read_tokens cache_creation_tokens cost_usd subagent_calls reply_ms",
    ),
    "tools.detail": (
        f"{_TIME} requested_session requested_agent requested_tool_name query_mode restrict_sessions session_keys real_calls inclusive_end "
        "requested_skill restrict_tools requested_tools after_row",
        f"{_BOARD_ID} row_type total ts tool tool_name target project_path duration_ms is_error confirm input_bytes output_bytes result_summary exit_code",
    ),
    "requests.errors": (
        f"{_TIME} requested_session requested_agent requested_model requested_error restrict_error restrict_sessions session_keys",
        f"{_BOARD_ID} ts error_type http_status",
    ),
    "tools.totals": (
        "all_nodes requested_node requested_session requested_agent",
        "tool_name calls failures timed durations input_bytes input_count output_bytes output_count max_output_bytes total_duration last_ts",
    ),
    "sessions.commits": (f"{_SCOPE} requested_session after_row", "sha author_name author_email ts subject"),
    "memory.changes": (
        f"{_SCOPE} requested_session requested_agent after_row",
        "node_id ts key path mechanism operation tool tool_name agent_id actor prompt_id turn_index lines_added "
        "lines_removed before_hash after_hash before_bytes after_bytes before_source after_source source_event_id "
        "source_event_kind",
    ),
    "memory.versions": (
        "all_nodes requested_node requested_path after_row",
        "node_id ts origin session_id agent_id actor operation content_hash size_bytes before_hash before_source "
        "after_source lines_added lines_removed source_event_id state",
    ),
    "memory.diff": ("all_nodes requested_node keep_text first_hash second_hash", "side hash content size_bytes"),
    "memory.recalls": (
        f"{_SCOPE} requested_session after_row",
        "node_id ts key agent_id tool trigger path content_hash tool_call_id prompt_id turn_index detail",
    ),
    "checkpoints.session": (
        f"{_SCOPE} requested_session after_row",
        "node_id ts key kind agent_id tool trigger checkpoint_no message_id files_count lines_added lines_removed "
        "before_tokens after_tokens dropped_messages dropped_tokens cumulative_dropped_tokens preserved_messages path "
        "tool_call_id prompt_id turn_index detail summary_kind summary_seq summary_title summary summary_hash "
        "summary_bytes",
    ),
    "sessions.config": (
        f"{_SCOPE} requested_session after_row",
        "node_id ts key kind agent_id tool source setting previous_value new_value previous_effort new_effort "
        "turn_index prompt_id detail",
    ),
    "checkpoints.files": (
        "all_nodes requested_node requested_session requested_message after_row",
        "node_id path ts origin mechanism version state blob_hash size_bytes lines lines_added lines_removed",
    ),
    "sessions.commit_counts": ("all_nodes requested_node session_keys", "node_id session_id count"),
    "skills.agents": ("all_nodes requested_node requested_session requested_agent", "name uses agents started_by first_ts last_ts"),
    "skills.detail": (
        f"{_TIME} requested_skill requested_tools restrict_tools query_mode session_keys after_row",
        f"{_BOARD_ID} row_type ts tool project_path trigger uses agents total first_ts last_ts projects",
    ),
    "board.activity_facts": ("all_nodes requested_node", "tool fact"),
    "board.sources": ("all_nodes requested_node", "tool source last_ts"),
    "prompts.files": (f"{_TIME} restrict_sessions session_keys", "node_id session_id path project_path uses last_ts"),
    "requests.records": (
        f"{_SCOPE} requested_session example_limit",
        "row_type ts session_id model input_tokens output_tokens duration_ms is_error error_type http_status finish_reason "
        "calls errors times timed",
    ),
    "sequence.flow": (f"{_TIME} requested_session keep_text text_floor after_row", "row_type values"),
    "sequence.stamp": (f"{_TIME} requested_session", "versions newest in_window"),
    "sequence.event_log": (f"{_TIME} requested_session requested_tool requested_pid requested_kinds",
                           "ts tool kind detail session_id pid"),
    "sequence.pid_sessions": (f"{_TIME} requested_pid", "node_id session_id"),
    "sequence.skills": (f"{_TIME} requested_session after_row", "row_type values"),
    "sequence.evidence": (
        f"{_TIME} requested_session keep_text text_floor evidence_filters search_terms context_group "
        "page_offset include_detail include_spans", "data",
    ),
    "sequence.evidence_counts": ("all_nodes requested_node requested_session", "step_kind steps"),
    "sequence.otel": (f"{_TIME} requested_session after_row", "row_type values"),
    "sequence.context": (f"{_TIME} requested_session after_row", "row_type values"),
    "files.changes": (
        f"{_TIME} requested_session session_keys restrict_sessions requested_paths",
        "node_id path project_path session_id edits sessions added removed last_ts tool",
    ),
    "files.inventory": (
        f"{_TIME} requested_tool requested_path requested_paths inventory_mode project_path_key fold_project after_row",
        "node_id path tool category scope size_bytes tokens lines mtime meta last_changed",
    ),
    "files.session_inventory": ("all_nodes requested_node requested_tool requested_path", "path tool category scope meta"),
    "files.artifacts": (
        f"{_TIME} session_keys counts_only after_row", "row_type node_id session_id values",
    ),
    "files.recorded": (f"{_TIME} requested_paths", "found"),
    "files.loaded": (f"{_TIME} requested_paths", "node_id path sessions tools last_ts"),
    "files.detail": (
        f"{_TIME} requested_path keep_text edit_limit",
        "row_type node_id ts session_id detail source_event_id input content found_blob",
    ),
    "files.recent_writes": (f"{_TIME}", "ts session_id tool tool_name path"),
    "context.daily": (
        f"{_TIME} calendar_starts calendar_days requested_tools restrict_tools",
        "node_id day model tool calls input output cache_read cache_write stored ri ro rcr rcw last_ts",
    ),
    "context.growth": (f"{_TIME} growth_points calendar_bins", "node_id ts mem_tokens memory_entries"),
    "context.telemetry": (f"{_TIME}", "node_id ts tool source confidence"),
    "tools.mcp": (
        f"{_TIME} restrict_sessions session_keys restrict_tools requested_tools",
        "row_type tool_name calls failures sessions session_set builtin_sessions timed total_ms output_bytes output_count "
        "first_ts last_ts hist tool_names named_server",
    ),
    "tools.mcp_detail": (
        f"{_WINDOW} restrict_sessions session_keys restrict_tools requested_tools requested_tool_names",
        "row_type g node_id session_id agent_id tool_name ts calls failures total_ms output_bytes first_ts last_ts tool_list "
        "result_summary",
    ),
    "sessions.convergence": (
        f"{_TIME} restrict_sessions session_keys restrict_tools requested_tools",
        "node_id session_id tool project_path model requests tokens output_tokens cost_usd first_ts last_ts calls errors "
        "repeats retries failed_retries edits accepted commits last_change top_rep top_rep_calls top_rep_first top_rep_last "
        "top_rep_label top_file top_file_edits longest_dry dry_start dry_end tokens_late out_early out_late files_new "
        "files_new_late compactions tail_dry rank_hint",
    ),
    "sessions.convergence_turns": (
        f"{_TIME} requested_session",
        "row_type rn ts agent_id model tokens output_tokens cost_usd calls errors repeats retries edits accepted commits "
        "new_files sig n reps failed first_rn last_rn tool_name label rns file before_tokens after_tokens",
    ),
    "sessions.search": (
        f"{_TIME} restrict_tools requested_tools search_text moving_sessions page_offset page_size live_sessions "
        "requested_project requested_model requested_status requested_name_source errors_only min_tokens min_cost "
        "sort_key ascending now_ts idle_window end_grace observed_ends model_prices",
        "row_type total node_id session_id data",
    ),
}
_PARAMETER_TYPES = {
    "null_timestamp": bool,
    "include_unreported": bool,
    "ascending": bool,
    "all_nodes": bool,
    "without_requests": bool,
    "fold_project": bool,
    "restrict_tools": bool,
    "restrict_sessions": bool,
    "preview": bool,
    "real_calls": bool,
    "inclusive_end": bool,
    "restrict_error": bool,
    "extended": bool,
    "raw_session": bool,
    "keep_text": bool,
    "include_detail": bool,
    "include_spans": bool,
    "calendar_bins": bool,
    "counts_only": bool,
    "errors_only": bool,
    "since": float,
    "until": float,
    "step": float,
    "min_cost": float,
    "now_ts": float,
    "idle_window": float,
    "end_grace": float,
    "text_floor": float,
    "prompt_ts": float,
    "open_end": float,
    "node_limit": int,
    "session_limit": int,
    "grid": int,
    "min_tokens": int,
    "example_limit": int,
    "growth_points": int,
    "edit_limit": int,
    "page_size": int,
    "requested_pid": int,
    "requested_kinds": list,
    "requested_models": list,
    "requested_tools": list,
    "session_keys": list,
    "requested_paths": list,
    "requested_tool_names": list,
    "moving_sessions": list,
    "live_sessions": list,
    "observed_ends": list,
    "search_terms": list,
    "calendar_days": list,
    "pids": tuple,
}
_MAX_ROWS = 20_000
# Each page of these views runs the whole query again, so one large page costs much less
# than many small ones.
_VIEW_MAX_ROWS = {"tools.activity_rows": 100_000}
_CACHE_TTL_S = {"health.totals": 300.0, "health.series": 30.0, "health.flows": 30.0, "nodes.reports": 5.0}
_NODE_STALE_MAX_S = 300.0
_FAILURE_COOLDOWN_S = 5.0
_CACHE_SIZE = 64
# These views had lower measured peaks with reduced fanout; other reads keep the service default.
_LOW_FANOUT_VIEWS = {"health.totals", "nodes.reports", "tools.activity_rows"}
_PAGED_VIEWS = {
    "files.artifacts", "files.inventory", "prompts.page", "requests.long", "sequence.context", "sequence.flow", "sequence.otel",
    "sequence.skills", "sessions.commits", "skills.detail", "skills.window", "tools.activity_rows", "tools.detail",
    "memory.changes", "memory.versions", "memory.recalls", "checkpoints.session", "checkpoints.files", "sessions.config",
}


@dataclass
class _CachedRead:
    result: ReadResult | None = None
    saved_at: float = 0.0
    error: str | None = None
    retry_at: float = 0.0


def _parameter(name: str, value: Any) -> str:
    if name == "tag_filter" and isinstance(value, (tuple, list)) and all(
        isinstance(item, (list, tuple)) and len(item) == 2 and all(isinstance(s, str) for s in item)
        for item in value
    ):
        return f"dynamic({json.dumps(value)})"
    if name == "page_offset" and type(value) is int and 0 <= value <= 20_000:
        return str(value)
    if name == "calendar_starts" and isinstance(value, (tuple, list)) and all(
        type(item) in (float, int) and math.isfinite(item) for item in value
    ):
        return f"dynamic({json.dumps(value)})"
    if name == "model_prices" and isinstance(value, Mapping) and all(
        isinstance(k, str) and isinstance(v, (list, tuple)) and len(v) == 4
        and all(type(x) in (float, int) and math.isfinite(x) for x in v)
        for k, v in value.items()
    ):
        return f"dynamic({json.dumps(dict(value))})"
    if name == "evidence_filters" and isinstance(value, Mapping) and all(
        isinstance(k, str) and isinstance(v, str) for k, v in value.items()
    ):
        return f"dynamic({json.dumps(dict(value))})"
    if name == "spans":
        if isinstance(value, (tuple, list)) and all(
            isinstance(item, (tuple, list)) and len(item) == 5 and
            all(isinstance(s, str) for s in item[:3]) and
            all(type(t) in (float, int) and math.isfinite(t) for t in item[3:])
            for item in value
        ):
            return f"dynamic({json.dumps(value)})"
        raise ValueError("spans must contain a node, session, agent and two finite timestamps")
    if name == "intervals":
        if isinstance(value, (tuple, list)) and all(
            isinstance(item, (tuple, list)) and len(item) == 4 and
            all(isinstance(s, str) for s in item[:2]) and
            all(type(t) in (float, int) and math.isfinite(t) for t in item[2:])
            for item in value
        ):
            return f"dynamic({json.dumps(value)})"
        raise ValueError("intervals must contain a node, session and two finite timestamps")
    expected = _PARAMETER_TYPES.get(name, str)
    if expected is float and type(value) in (float, int) and math.isfinite(value):
        return str(float(value))
    if expected is int and type(value) is int and 1 <= value < 2**63:
        return str(value)
    if expected is bool and type(value) is bool:
        return "true" if value else "false"
    if expected is list and isinstance(value, (list, tuple)) and all(isinstance(item, str) for item in value):
        return f"dynamic({json.dumps(value)})"
    if expected is tuple and isinstance(value, (list, tuple)) and all(type(item) is int for item in value):
        return f"dynamic({json.dumps(value)})"
    if expected is str and isinstance(value, str):
        return value
    raise ValueError(f"{name} must be a valid {expected.__name__} parameter")


@lru_cache
def _query(view: str) -> str:
    return files(__package__).joinpath("queries", view + ".kql").read_text(encoding="utf-8").strip()


class KustoReader:
    def __init__(self, client: Any, database: str, *, settings=None) -> None:
        from ...health import ObservedKustoClient
        from .query_cpu import QueryCpuStats

        self._client = client
        # The daemon client also sees live polling queries. Count each attempt once.
        self._observed = isinstance(client, ObservedKustoClient)
        self._query_cpu = client.query_cpu if self._observed else QueryCpuStats()
        self._database = database
        self._settings = settings
        self._lock = threading.Lock()
        self._cache: OrderedDict[tuple, _CachedRead] = OrderedDict()
        self._inflight: dict[tuple, Future[ReadResult]] = {}
        self._queries = 0
        self._failures = 0
        self._last_latency_ms: float | None = None
        self._error: str | None = None
        # Per view: queries, failures, total ms, slowest ms, rows returned, CPU ticks the cluster reported.
        self._view_timings: dict[str, list] = {}

    def view_timings(self) -> list[dict[str, Any]]:
        """What each view cost since the daemon started, the most expensive first.

        Cached answers are not counted: these are the queries that reached the cluster.
        """
        with self._lock:
            timings = {view: list(values) for view, values in self._view_timings.items()}
        return sorted(
            (
                {
                    "view": view, "queries": queries, "failures": failures,
                    "total_ms": round(total, 1), "avg_ms": round(total / queries, 1), "max_ms": round(slowest, 1),
                    "rows": rows, "cluster_cpu_s": round(ticks / 10_000_000, 3),
                }
                for view, (queries, failures, total, slowest, rows, ticks) in timings.items()
            ),
            key=lambda row: -row["total_ms"],
        )

    def connection_info(self):
        if self._settings is not None:
            return self._settings
        from ...kusto import kusto_settings
        from .client import KustoClientFactory

        # A replay reader must not inherit the daemon's destination.
        with KustoClientFactory._lock:
            if not any(self._client is client for client in KustoClientFactory._clients.values()):
                return None
        settings = kusto_settings()
        if settings is not None and settings.database == self._database:
            return settings
        return None

    def health_metadata(self):
        from .health_metadata import HealthMetadata

        settings = self.connection_info()
        return HealthMetadata.initialized(settings) if settings is not None else None

    def cluster_resources(self, previous):
        from .health_metrics import read_cluster_metrics

        return read_cluster_metrics(self.connection_info(), previous)

    def live_feed(self):
        from .live_reader import shared_reader

        settings = self.connection_info()
        return shared_reader(settings) if settings is not None else None

    def transport_diagnostics(self, writer):
        from .ingest import INLINE_MAX_BYTES, QUEUED_MAX_BYTES, QUEUED_PENDING_ROWS, STREAMING_MAX_BYTES
        from .otel_sink import LINGER_S, MAX_PENDING_BYTES

        return {
            "reads": getattr(self._client, "reads", None),
            "commands": getattr(self._client, "commands", None),
            "query_cpu": self._query_cpu.snapshot(),
            "ingester": getattr(writer, "_ingester", None),
            "client_limits": {
                "inline_max_bytes": INLINE_MAX_BYTES,
                "streaming_max_bytes": STREAMING_MAX_BYTES,
                "queued_max_bytes": QUEUED_MAX_BYTES,
                "queued_pending_rows": QUEUED_PENDING_ROWS,
                "otel_linger_s": LINGER_S,
                "otel_max_pending_bytes": MAX_PENDING_BYTES,
            },
        }

    def capabilities(self) -> dict[str, Any]:
        return {
            "views": {name: {"fields": fields.split()} for name, (_, fields) in _VIEWS.items()},
            "topics": [],
            "detail_routes": [],
            "change_feed": False,
            "query_languages": ["kql"],
        }

    def read(self, view: str, params: Mapping[str, Any]) -> ReadResult:
        from azure.kusto.data import ClientRequestProperties

        if view not in _VIEWS:
            raise UnknownViewError(f"Unknown Kusto view {view!r}")
        names, _ = _VIEWS[view]
        allowed = names.split()
        if unexpected := params.keys() - {*allowed, "limit"}:
            raise ValueError(f"{view}: unexpected parameters: {', '.join(sorted(unexpected))}")
        limit = params.get("limit", 100)
        most = _VIEW_MAX_ROWS.get(view, _MAX_ROWS)
        if type(limit) is not int or not 1 <= limit <= most:
            raise ValueError(f"{view}: limit must be an integer from 1 to {most}")
        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.request_timeout_option_name, QUERY_TIMEOUT)
        props.set_option("request_readonly", True)
        props.set_option("request_readonly_hardline", True)
        props.set_option("deferpartialqueryfailures", False)
        if view in _LOW_FANOUT_VIEWS:
            props.set_option("query_fanout_threads_percent", 1)
        if view == "nodes.reports" or view.startswith("health.sample_"):
            props.set_option(ClientRequestProperties.request_timeout_option_name, timedelta(seconds=15))
        bound = {key: _parameter(key, value) for key, value in params.items() if key != "limit"}
        bound["row_limit"] = str(limit + 1)
        for key, value in bound.items():
            props.set_parameter(key, value)

        ttl = _CACHE_TTL_S.get(view)
        if ttl is None:
            return self._execute(view, props, limit)
        return self._cached_read(view, tuple(sorted(bound.items())), ttl, props, limit)

    def _cached_read(self, view: str, bound: tuple, ttl: float, props, limit: int) -> ReadResult:
        key = (view, bound)

        def stale(entry: _CachedRead, now: float) -> ReadResult | None:
            if (view == "nodes.reports" and entry.result is not None and entry.result.rows
                    and now - entry.saved_at <= _NODE_STALE_MAX_S):
                return replace(entry.result, stale=True)
            return None

        with self._lock:
            now = time.monotonic()
            entry = self._cache.get(key)
            if entry is not None:
                self._cache.move_to_end(key)
                if entry.result is not None and entry.error is None and now - entry.saved_at < ttl:
                    return deepcopy(entry.result)
                if entry.error is not None and now < entry.retry_at:
                    fallback = stale(entry, now)
                    if fallback is not None:
                        return deepcopy(fallback)
                    raise StoreError(entry.error)
            pending = self._inflight.get(key)
            leader = pending is None
            if pending is None:
                pending = self._inflight[key] = Future()
        if not leader:
            return deepcopy(pending.result())

        entry = entry or _CachedRead()
        try:
            result = self._execute(view, props, limit)
        except BaseException as exc:  # noqa: BLE001 - resolve waiters even if the leader is interrupted
            now = time.monotonic()
            if isinstance(exc, StoreError):
                entry = replace(entry, error=str(exc), retry_at=now + _FAILURE_COOLDOWN_S)
                fallback = stale(entry, now)
            else:
                fallback = None
            if fallback is None:
                pending.set_exception(exc)
            else:
                pending.set_result(fallback)
        else:
            entry = _CachedRead(result=result, saved_at=time.monotonic())
            pending.set_result(result)
        finally:
            with self._lock:
                self._cache[key] = entry
                self._cache.move_to_end(key)
                while len(self._cache) > _CACHE_SIZE:
                    self._cache.popitem(last=False)
                del self._inflight[key]
        return deepcopy(pending.result())

    def _execute(self, view: str, props, limit: int) -> ReadResult:
        start = time.monotonic()
        error = None
        returned = ticks = 0
        try:
            text = _query(view)

            def execute():
                props.client_request_id = f"aictl.{view};{uuid.uuid4()}"
                return self._client.execute_query(self._database, text, props)

            response = retrying(
                execute if self._observed else lambda: self._query_cpu.call(execute),
                f"read {view}",
                budget=4.0 if view == "nodes.reports" else None,
                stop=query_memory_error,
            )
            if getattr(response, "errors_count", 0):
                raise StoreError("Kusto returned an incomplete result")
            try:
                ticks = _cpu_ticks(response) or 0
            except Exception:  # noqa: BLE001 - optional SDK metadata must not fail a read
                ticks = 0
            tables = response.primary_results
            if not tables:
                if view in _CACHE_TTL_S or view in _PAGED_VIEWS or view.startswith("health.sample_"):
                    raise StoreError("Kusto returned no result table")
                return ReadResult([])
            table = tables[0]
            names = tuple(c.column_name for c in table.columns)
            real = {c.column_name for c in table.columns if c.column_type == "real"}
            rows = [
                {name: None if name in real and (value == "NaN" or isinstance(value, float) and not math.isfinite(value))
                 else value for name, value in zip(names, row, strict=True)}
                for row in islice(table, limit + 1)
            ]
            more = len(rows) > limit
            page = rows[:limit]
            returned = len(page)
            cursor = None
            if view in _PAGED_VIEWS:
                for row in page:
                    cursor = row.pop("_page_cursor", None)
            return ReadResult(page, truncated=more, next_page=cursor if more else None)
        except Exception as exc:  # noqa: BLE001 - treat SDK and transport errors as read failures
            error = f"{exc} (client request ID: {props.client_request_id})"
            raise StoreError(f"Kusto view {view} failed: {error}") from exc
        finally:
            with self._lock:
                self._queries += 1
                self._failures += error is not None
                self._error = error
                elapsed = self._last_latency_ms = (time.monotonic() - start) * 1000
                timing = self._view_timings.setdefault(view, [0, 0, 0.0, 0.0, 0, 0])
                timing[0] += 1
                timing[1] += error is not None
                timing[2] += elapsed
                timing[3] = max(timing[3], elapsed)
                timing[4] += returned
                timing[5] += ticks

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "status": "unavailable" if self._error is not None else "ready" if self._queries else "not checked",
                "queries": self._queries,
                "query_failures": self._failures,
                "query_cpu": self._query_cpu.snapshot(),
                "last_latency_ms": self._last_latency_ms,
                "last_error": self._error,
            }
