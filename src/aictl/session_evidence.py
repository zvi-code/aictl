"""Publish evidence collected from session folders, Git, and memory files."""

import time
from pathlib import Path

from .collection_status import load_state
from .ingesters._common import project_root


class SessionEvidence:
    def __init__(self, sessions, state=None, quality=None) -> None:
        self.sessions = sessions
        self.writer = sessions.writer
        self.state = state
        self.quality = quality
        self.manifests = load_state(state)

    def artifact_scans(self) -> dict:
        return {sid: value["folder"]["signature"] for sid, value in self.manifests.items()}

    def scan_recently(self, sid, now) -> bool:
        return now - self.manifests.get(sid, {}).get("scanned_at", 0) < 300

    def replace_session_artifacts(self, sid, tool, folder, signature, files, total, size) -> bool:
        old = self.manifests.get(sid, {})
        previous = old.get("files", {})
        project = self.sessions.project_for(sid) or old.get("folder", {}).get("project", "")
        current = {path: [part, length, mtime] for path, part, length, mtime in files}
        summary = dict(project=project, session_id=sid, tool=tool, folder=folder, signature=signature,
                       files_total=total, bytes_total=size)
        changed = [dict(project=project, session_id=sid, path=path, folder=part, size_bytes=length, mtime=mtime)
                   for path, (part, length, mtime) in current.items()
                   if previous.get(path) != current[path] or old.get("folder", {}).get("project") != project]
        removed = [dict(project=old["folder"]["project"], session_id=sid, path=path) for path in previous
                   if path not in current or old["folder"]["project"] != project]
        now = time.time()
        if changed:
            self.writer.upsert("session_artifacts", changed)
        if removed:
            self.writer.delete("session_artifacts", removed)
        if summary != old.get("folder"):
            self.writer.upsert("session_folders", [dict(summary, scanned_at=now)])
            if old and old["folder"]["project"] != project:
                self.writer.delete("session_folders", [dict(project=old["folder"]["project"], session_id=sid)])
        self.manifests[sid] = {"files": current, "folder": summary, "scanned_at": now}
        return bool(changed or removed or summary != old.get("folder"))

    def save(self) -> None:
        if self.state is not None:
            self.state.replace(self.manifests)

    def remove_missing_folders(self) -> list[str]:
        removed = []
        for sid, value in list(self.manifests.items()):
            folder = Path(value["folder"]["folder"])
            try:
                folder.stat()
            except FileNotFoundError:
                try:
                    if not folder.parent.is_dir():
                        continue  # The source root is unavailable.
                except OSError:
                    continue
                key = dict(session_id=sid, project=value["folder"]["project"])
                self.writer.delete("session_artifacts", [dict(key, path=path) for path in value["files"]])
                self.writer.delete("session_folders", [key])
                del self.manifests[sid]
                removed.append(sid)
            except OSError:
                continue
        return removed

    def record_data_quality(self, *args, **kwargs) -> None:
        if self.quality is not None:
            self.quality.record_data_quality(*args, **kwargs)

    def commits(self, sid, cwd, started_at, ended_at) -> None:
        from .analysis.git_attribution import commits_in_window

        rows = commits_in_window(cwd, started_at, ended_at)
        self.publish_commits(sid, cwd, rows)

    def publish_commits(self, sid, cwd, rows) -> None:
        if rows:
            project = project_root(cwd)
            self.writer.append("session_commits", [
                dict(row, session_id=sid, project=project) for row in rows
            ])

    def memory(self, sid, project_hash, phase, ts, cwd) -> int:
        from .memory_snapshot import _iter_memory_files, _read_text, _sha256

        project = project_root(cwd)
        keep = self.sessions.allows_text(ts)
        metadata, text = [], []
        for path, source in _iter_memory_files(project_hash):
            content = _read_text(source)
            sha = _sha256(content)
            row = dict(project=project, session_id=sid, phase=phase, path=path, sha=sha, ts=ts)
            metadata.append(row)
            if keep:
                text.append(dict(row, content=content))
        if metadata:
            self.writer.upsert("memory_snapshots", metadata)
        if text:
            self.writer.upsert("memory_snapshots_text", text)
        return len(metadata)
