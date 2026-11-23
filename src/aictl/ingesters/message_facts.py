"""Publish message versions and resolve currently known sessions from local state."""

from ..collection_status import load_state
from ..state_file import StateFile
from ..tool_calls import call_key


def load_checkpoint(state, source) -> dict:
    saved = load_state(state)
    data = saved.get("data")
    return data if saved.get("source") == str(source) and isinstance(data, dict) else {}


def save_checkpoint(state, source, data) -> None:
    if state is not None:
        state.replace({"source": str(source), "data": data})


class MessageFacts:
    def __init__(self, sessions, quality, state: StateFile | None = None) -> None:
        self.sessions = sessions
        self.writer = sessions.writer
        self.state = state
        self.quality = quality

    def load(self, source) -> dict:
        return load_checkpoint(self.state, source)

    def save(self, source, data) -> None:
        save_checkpoint(self.state, source, data)

    def _keeps_text(self) -> bool:
        return self.sessions.keeps_text()

    def text(self, ts, content) -> str:
        return content[:20_000] if self.sessions.allows_text(ts, "message") else ""

    def record_data_quality(self, *args, **kwargs) -> None:
        self.quality.record_data_quality(*args, **kwargs)

    def conversation(self, session_id, tool, ts, source, project="") -> str:
        """Record that the source names a session *session_id* (its own id, never an invented one)
        in *project*, and return the id. An empty id stays empty: the content is unattributed."""
        from ..records import SessionRow

        if session_id:
            self.sessions.session(SessionRow(session_id, tool, project_path=project, started_at=ts, source=source))
        return session_id

    def append(self, table, row, *, project="") -> None:
        row = dict(row, project=project, content=self.text(row["ts"], row["content"]))
        if table == "cursor_session_messages":
            row["source_key"] = call_key(row["session_id"], str(row["source_row_id"]))
        self.writer.append(table, [row])

    @staticmethod
    def status(ingester, reason) -> int:
        ingester.unavailable = reason
        ingester.last_poll_inserted = 0
        ingester._quality("unavailable", severity="warning", message=reason)
        return 0
