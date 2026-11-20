"""HTTP handlers for datapoints, recorded events, and samples."""

from __future__ import annotations

import time

from ..stores.base import StoreConfigurationError, StoreError
from .projections.history import (
    configured_reader,
    event_params,
    event_rows,
    local_scope,
)
from .projections.metrics import catalog_entries, sample_metrics, sample_page, sample_series


class MetricsRoutes:
    def _serve_samples(self) -> None:
        """Serve universal samples.

        Params: ?metric=X&prefix=X&since=<ts>&tag.tool=X&limit=N
        Or: ?list=1&prefix=X  to list distinct metric names.
        Or: ?series=X&since=<ts>  to get a single metric as time-series.
        """
        reader = configured_reader(self.server.store)

        qs = self._qs
        try:
            prefix = self._qs_get("prefix", "")
            if "list" in qs:
                result = sample_metrics(reader, metric_prefix=prefix)
            elif "series" in qs:
                result = sample_series(reader, requested_metric=qs["series"][0],
                                       since=self._qs_float("since", time.time() - 3600))
            else:
                limit = min(int(self._qs_get("limit", "1000")), 20_000)
                result = sample_page(
                    reader, requested_metric=self._qs_get("metric"), metric_prefix=prefix,
                    since=self._qs_float("since", time.time() - 3600), limit=limit,
                    tags={k[4:]: v[0] for k, v in qs.items() if k.startswith("tag.")},
                )
        except ValueError as exc:
            self._json_response({"error": str(exc)}, status=400)
            return
        except StoreConfigurationError:
            self._json_response([])
            return
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return

        self._json_response(result)

    def _serve_events(self) -> None:
        """Serve a bounded page of recent events.

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>&limit=<n>
        """
        reader = configured_reader(self.server.store)
        limit = max(1, min(int(self._qs_get("limit", "200")), 2000))
        try:
            rows = event_rows(reader.read("events.page", {**self._event_filters(), "limit": limit}))
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        self._json_response(rows)

    def _event_filters(self) -> dict:
        kind = self._qs_get("kind")
        return {
            **local_scope(),
            **event_params(since=self._qs_float("since", time.time() - 3600),
                           until=self._qs_float_opt("until"), tool=self._qs_get("tool"),
                           kinds=[kind] if kind else [], session_id=self._qs_get("session_id")),
        }

    def _serve_events_count(self) -> None:
        """Serve the true number of events for the filters of ``/api/events`` (no limit).

        Params: ?since=<unix_ts>&until=<unix_ts>&tool=<name>&kind=<type>&session_id=<id>
        Returns ``{count: int}``; ``count`` is ``null`` when there is no store.
        """
        reader = configured_reader(self.server.store)
        try:
            count = reader.read("events.count", {**self._event_filters(), "limit": 1}).rows[0]["count"]
        except StoreConfigurationError:
            self._json_response({"count": None})
            return
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return
        self._json_response({"count": count})

    def _serve_datapoint_catalog(self) -> None:
        """Serve the datapoint catalog.

        Params: ?tab=<tab>&key=<key>&source_type=<raw|deduced|aggregated>
        """
        tab = self._qs_get("tab")
        key = self._qs_get("key")
        source_type = self._qs_get("source_type")

        entries = []
        reader = configured_reader(self.server.store)
        try:
            entries = catalog_entries(reader, tab=tab, key=key, source_type=source_type)
        except StoreConfigurationError:
            pass
        except StoreError as exc:
            self._json_response({"error": str(exc)}, status=503)
            return

        self._json_response(entries)
