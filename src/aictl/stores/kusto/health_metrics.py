"""Optional, read-only Azure Monitor measurements for the configured ADX cluster."""

from __future__ import annotations

import math
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

RESOURCE_ID_ENV = "AICTL_KUSTO_ARM_RESOURCE_ID"
REFRESH_S = 300
_RESOURCE = re.compile(
    r"/subscriptions/[0-9a-f-]{36}/resourceGroups/[\w.()-]+/providers/Microsoft\.Kusto/clusters/([a-z0-9-]+)", re.I
)
_METRICS = {
    "CPU": "cpu_percent", "CacheUtilizationFactor": "cache_percent",
    "IngestionUtilization": "ingestion_percent", "StreamingIngestUtilization": "streaming_percent",
}


def _read(resource_id: str, end: datetime) -> dict:
    import requests
    from azure.identity import AzureCliCredential

    token = AzureCliCredential(process_timeout=8).get_token("https://management.azure.com/.default")
    response = requests.get(
        "https://management.azure.com" + resource_id + "/providers/Microsoft.Insights/metrics",
        headers={"Authorization": "Bearer " + token.token},
        params={"api-version": "2018-01-01", "interval": "PT1M", "aggregation": "Average",
                "metricnames": ",".join(_METRICS), "timespan": f"{end-timedelta(minutes=20):%Y-%m-%dT%H:%M:%SZ}/{end:%Y-%m-%dT%H:%M:%SZ}"},
        timeout=(3, 8), allow_redirects=False,
    )
    response.raise_for_status()
    return response.json()


def _samples(payload: dict, end: datetime) -> dict:
    samples = {}
    for metric in payload.get("value", []):
        key = _METRICS.get(metric.get("name", {}).get("value"))
        if not key or metric.get("unit") != "Percent":
            continue
        series = [s for s in metric.get("timeseries", []) if not s.get("metadatavalues")]
        if len(series) != 1:
            continue  # Do not present one shard or dimension as the whole cluster.
        for point in series[0].get("data", []):
            v, ts = point.get("average"), point.get("timeStamp")
            if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or not ts:
                continue
            stamp = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
            if end.timestamp()-1200 <= stamp < end.timestamp() and stamp > samples.get(key, {}).get("at", 0):
                samples[key] = {"value": v, "at": stamp}
    return samples


def read_cluster_metrics(settings, previous: dict | None = None) -> dict | None:
    """Called by the shared background refresh, never by an HTTP or collector hot path."""
    rid = os.environ.get(RESOURCE_ID_ENV, "").strip().rstrip("/")
    if not settings:
        return None
    now = time.time()
    result = dict(previous or {})
    if result.get("resource_id") != rid:
        result = {}
    if now - result.get("attempted_at", 0) < REFRESH_S:
        return result
    from .health_metadata import HealthMetadata

    metadata = HealthMetadata.initialized(settings)
    result.update(resource_id=rid, attempted_at=now, refresh_interval_s=REFRESH_S, source="ADX cluster diagnostics")
    if metadata is not None:
        try:
            result.update(native=metadata.diagnostics(), checked_at=time.time(), status="cached", last_error=None)
        except Exception as exc:  # noqa: BLE001 - optional management permission; keep prior measurement
            result.update(status="stale" if result.get("native") else "error",
                          last_error=f"ADX cluster diagnostics unavailable ({type(exc).__name__}).")
    else:
        result.update(status="stale" if result.get("native") else "pending")
    if not rid:
        return result
    match = _RESOURCE.fullmatch(rid)
    cluster = (urlsplit(settings.cluster).hostname or "").split(".")[0]
    if not match or match[1].lower() != cluster.lower() or settings.auth_mode != "azcli":
        return {**result, "monitor_status": "error", "samples": {},
                "monitor_error": "Azure Monitor requires a matching resource ID and Azure CLI authentication."}
    from azure.core.exceptions import ClientAuthenticationError
    from requests import RequestException

    try:
        end = datetime.fromtimestamp(now, timezone.utc).replace(second=0, microsecond=0)
        samples = _samples(_read(rid, end), end)
    except (ClientAuthenticationError, RequestException, ValueError, TypeError, KeyError) as exc:
        code = getattr(getattr(exc, "response", None), "status_code", None)
        return {**result, "monitor_status": "stale" if result.get("samples") else "error",
                "monitor_error": f"Azure Monitor metrics unavailable ({code or type(exc).__name__})."}
    return {**result, "monitor_status": "cached" if len(samples) == len(_METRICS) else "partial" if samples else "empty",
            "samples": samples, "monitor_error": None}
