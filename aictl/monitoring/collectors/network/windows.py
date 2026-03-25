"""Windows degraded adapter until ETW/WFP bindings are added."""

from __future__ import annotations

from .fallback import PsutilFallbackNetworkCollector


class WindowsNetworkCollector(PsutilFallbackNetworkCollector):
    """Connection-weighted fallback for Windows."""

    def __init__(self, interval: float) -> None:
        super().__init__(
            interval=interval,
            name="network:windows-etw",
            status="degraded",
            mode="etw-fallback",
            detail="ETW/WFP bindings are not bundled yet; using weighted fallback sampling",
        )
