"""Queries for the selected agent view, using the same projections as detail reads."""

from typing import Any


def project_agent(db: Any, store: Any, watch: tuple[str, str]) -> tuple[int, dict]:
    from ..board_api import agent_detail, agent_flow, agent_transcript
    from ..projections.history import HistoryScope

    view, agent_id = watch
    history = HistoryScope.local(store)
    if view == "detail":
        return agent_detail(db, agent_id, history=history)
    if view == "flow":
        return agent_flow(db, agent_id, history=history, limit=500)
    return agent_transcript(db, agent_id, history=history)
