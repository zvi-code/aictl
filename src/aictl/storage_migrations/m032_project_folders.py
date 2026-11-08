# aictl - Cross-platform AI Tool Context Control + Dashboard
# Copyright (c) 2026 Zvi Schneider. MIT License.
"""v32: project folders that name a project.

File-change events stored the changed file as their project folder, so every
changed file counted as a project. Their folder is cleared; new events carry
their session's project. Model calls, tool calls and file writes with no
folder take their session's folder. Idempotent, like every migration here.
"""

from __future__ import annotations

import sqlite3

_FROM_SESSION = (
    "UPDATE {t} SET project_path = (SELECT s.project_path FROM sessions s"
    " WHERE s.session_id = {t}.session_id AND s.project_path != '')"
    " WHERE COALESCE(project_path, '') = '' AND COALESCE(session_id, '') != ''"
    " AND EXISTS (SELECT 1 FROM sessions s WHERE s.session_id = {t}.session_id AND s.project_path != '')"
)


def apply(conn: sqlite3.Connection) -> None:
    try:
        conn.execute(
            "UPDATE events SET project_path = '' WHERE kind = 'file_modified'"
            " AND project_path != '' AND project_path = json_extract(detail, '$.path')"
        )
        for table in ("requests", "tool_invocations", "file_write_events"):
            conn.execute(_FROM_SESSION.format(t=table))
    except sqlite3.OperationalError as exc:
        # The baseline schema is still to run on a new database.
        if "no such table" not in str(exc).lower() and "no such column" not in str(exc).lower():
            raise
