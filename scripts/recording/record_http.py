"""GET the UI's resources and record SSE without storing raw data."""

import gzip
import http.client
import json
import os
import socket
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import quote, urlencode

from scrub import verify_text

BODY_LIMIT = 12 * 1024 * 1024


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class Jsonl:
    def __init__(self, path, byte_limit):
        self.path = path
        self.byte_limit = byte_limit
        self.raw = path.open("xb")
        self.gzip = gzip.GzipFile(fileobj=self.raw, mode="wb", compresslevel=7, mtime=0)
        self.lock = threading.Lock()
        self.dropped = 0
        self.privacy_rejected = 0
        self.identities = (os.getenv("USERNAME"), os.getenv("USER"), os.getenv("COMPUTERNAME"))

    def write(self, record):
        with self.lock:
            if self.raw.tell() >= self.byte_limit:
                self.dropped += 1
                return
            data = json.dumps(record, ensure_ascii=True, separators=(",", ":"), default=str)
            if verify_text(data, self.identities):
                self.privacy_rejected += 1
                return
            self.gzip.write(data.encode("ascii") + b"\n")

    def close(self):
        with self.lock:
            self.gzip.close()
            self.raw.close()


class Dashboard:
    def __init__(self, port, scrubber):
        self.port = port
        self.scrubber = scrubber
        self.recent_session = None

    def read(self, path, name, phase, writer):
        """Return the raw parsed body only to choose the next GET. Never follow redirects."""
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=30)
        label = self.scrubber.route(name.split("#")[0]) + ("#" + name.split("#")[1] if "#" in name else "")
        record = {"kind": "rest", "phase": phase, "route": label, "path": self.scrubber.route(path),
                  "requested_at": utc_now()}
        result = None
        try:
            conn.request("GET", path, headers={"Accept-Encoding": "identity"})
            with conn.getresponse() as res:
                content_type = res.getheader("Content-Type", "").split(";")[0]
                record.update(status=res.status, content_type=content_type)
                body = res.read(BODY_LIMIT + 1)
                if len(body) > BODY_LIMIT:
                    record["capture_error"] = "body_limit"
                elif "json" in content_type or body.startswith((b"{", b"[")):
                    result = json.loads(body)
                    record["body"] = self.scrubber.scrub(result)
                else:
                    record["body"] = self.scrubber.string(body.decode("utf-8", "replace"), "body")
                if etag := res.getheader("ETag"):
                    record["etag"] = self.scrubber.string(etag)
        except (OSError, ValueError, http.client.HTTPException) as exc:
            record["capture_error"] = type(exc).__name__
        finally:
            conn.close()
            record["received_at"] = utc_now()
            writer.write(record)
        return result

    def snapshot(self, phase, writer):
        def get(route_label, **params):
            route = route_label.split("#")[0]
            path = route + ("?" + urlencode(params) if params else "")
            return self.read(path, route_label, phase, writer)

        with ThreadPoolExecutor(max_workers=3) as pool:
            sessions = pool.submit(get, "/api/board/sessions", q="", limit=20, offset=0)
            settings = pool.submit(get, "/api/settings/files")
            identity = get("/api/board/nodes#identity", view="identity", scope="local") or {}
            node = (identity.get("local_node") or {}).get("node_id", "capture-missing-node")
            board = pool.submit(get, "/api/history/board", since=round(time.time() - 900), scope="node", node_id=node)
            base = [pool.submit(get, name) for name in (
                "/api/live/capabilities", "/api/board/context",
                "/api/settings/tools", "/api/effective-models", "/api/otel-status", "/api/hooks-status",
            )]
            base += [
                pool.submit(get, "/api/context-audit", nowait=1),
                pool.submit(get, "/api/board/machine", scope="fleet"),
                pool.submit(get, "/api/board/nodes#overview", view="overview", scope="fleet"),
                pool.submit(get, "/api/board/nodes#health", view="health", scope="fleet"),
            ]
            found = sessions.result() or {}
            entries = (found.get("rows") or found.get("sessions") or []) if isinstance(found, dict) else []
            session = next((entry for entry in entries if isinstance(entry, dict)
                            and (entry.get("session_id") or entry.get("id"))), {})
            sid = session.get("session_id") or session.get("id") or self.recent_session or "capture-missing-session"
            files = settings.result() or {}
            items = files.get("files", []) if isinstance(files, dict) else []
            item = next((row for row in items if isinstance(row, dict) and row.get("exists")
                         and not row.get("is_dir") and row.get("path")), {})
            path = item.get("path", "capture-missing-file")
            tool = session.get("tool") or "copilot-cli"
            board_data = board.result() or {}
            agents = board_data.get("agents", []) if isinstance(board_data, dict) else []
            agent = next((entry for entry in agents if isinstance(entry, dict) and entry.get("id")), {})
            agent_id = json.loads(agent["id"])[1] if agent else session.get("agent_id") or session.get("id") or sid
            errors = board_data.get("errors", []) if isinstance(board_data, dict) else []
            error = next((entry.get("key") for entry in errors if isinstance(entry, dict) and entry.get("key")),
                         "capture-missing-error")
            skills = board_data.get("skills", []) if isinstance(board_data, dict) else []
            skill = next((entry.get("name") for entry in skills if isinstance(entry, dict) and entry.get("name")),
                         "capture-missing-skill")
            values = {
                "/api/events": {"session_id": sid, "limit": 100},
                "/api/events/count": {"session_id": sid},
                "/api/session-evidence": {"session_id": sid, "limit": 100, "offset": 0},
                "/api/samples": {"metric": "process.cpu.percent", "limit": 100, "tag.session_id": sid},
                "/api/api-calls": {"session_id": sid, "since": 0, "limit": 100},
                "/api/file": {"path": path},
                "/api/settings/file": {"path": path},
                "/api/board/file": {"path": path},
                "/api/board/excerpt": {"path": path, "line": 1},
                "/api/board/agent": {"id": agent_id},
                "/api/board/agent/flow": {"id": agent_id, "since": round(time.time() - 3600)},
                "/api/board/agent/transcript": {"id": agent_id},
                "/api/board/tool": {"name": tool},
                "/api/board/error": {"key": error},
                "/api/board/skill": {"name": skill},
            }
            for name in ("session-processes", "session-stats", "session-commits", "session-mcp-usage"):
                values[f"/api/{name}"] = {"session_id": sid}
            qualified = json.dumps([node, sid], ensure_ascii=True, separators=(",", ":"))
            values["/api/board/nodes#session"] = {
                "view": "session", "scope": "node", "node_id": node, "session_id": sid,
            }
            for view in ("nodes", "runtime", "settings"):
                values[f"/api/board/nodes#{view}"] = {"view": view, "scope": "fleet"}
            for part in ("events", "processes", "mcp", "calls"):
                values[f"/api/board/session/records#{part}"] = {
                    "session_id": qualified, "part": part, "scope": "node", "node_id": node,
                }
            for name, params in values.items():
                base.append(pool.submit(get, name, **params))
            base.append(pool.submit(get, "/api/tool-config/" + quote(tool, safe="")))
            artifacts = pool.submit(get, "/api/copilot-sessions/" + quote(sid, safe="") + "/artifacts")
            prompts = pool.submit(get, "/api/board/prompt", ts=agent.get("last_ts") or time.time(), session_id=sid)
            listing = artifacts.result() or {}
            entries = listing.get("artifacts", []) if isinstance(listing, dict) else []
            path = next((e["path"] for e in entries if isinstance(e, dict) and e.get("path")),
                        "capture-missing-artifact")
            get("/api/copilot-sessions/" + quote(sid, safe="") + "/artifact", path=path)
            prompts.result()
            for request in base:
                request.result()

    def stream(self, path, start, duration, writer, messages, stop):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=35)
        def end_stream():
            stop.wait(duration)
            try:
                if sock is not None:
                    sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

        watcher = None
        try:
            conn.connect()
            sock = conn.sock
            watcher = threading.Thread(target=end_stream, daemon=True)
            watcher.start()
            conn.request("GET", path, headers={"Accept": "text/event-stream"})
            with conn.getresponse() as response:
                writer.write({"kind": "sse_open", "path": path, "status": response.status,
                              "received_at": utc_now(), "offset_ms": round((time.monotonic() - start) * 1000)})
                if response.status != 200:
                    return
                for frame in frames(response):
                    now = time.monotonic()
                    received_at = utc_now()
                    if stop.is_set() or now >= start + duration:
                        break
                    kind = frame.get("event", "message") if "data" in frame else "keepalive"
                    event = self.scrubber.string(kind) if kind != "message" else kind
                    data = frame.get("data")
                    if isinstance(data, dict):
                        for item in (data.get("entities") or data.get("upserts") or []):
                            if not isinstance(item, dict):
                                continue
                            entry = item.get("data")
                            if isinstance(entry, dict) and isinstance(entry.get("session_id"), str):
                                self.recent_session = entry["session_id"]
                                break
                    messages[event] += 1
                    clean = self.scrubber.envelope(data)
                    writer.write({
                        "kind": "sse", "event": event,
                        "id": clean.get("cursor", "") if isinstance(clean, dict) else "",
                        "data": clean, "received_at": received_at,
                        "offset_ms": round((now - start) * 1000),
                    })
        except (OSError, ValueError, http.client.HTTPException) as exc:
            if not stop.is_set() and time.monotonic() < start + duration:
                writer.write({"kind": "sse_error", "error_type": type(exc).__name__, "received_at": utc_now()})
        finally:
            conn.close()


def frames(response):
    """Parse complete frames; combine multiple data lines as EventSource does."""
    frame = {}
    data = []
    for line in iter(lambda: response.readline(BODY_LIMIT + 1), b""):
        if len(line) > BODY_LIMIT:
            raise ValueError("SSE line too long")
        line = line.rstrip(b"\r\n").decode("utf-8")
        if not line:
            if data:
                value = "\n".join(data)
                try:
                    frame["data"] = json.loads(value)
                except ValueError:
                    frame["data"] = value
            if frame:
                yield frame
            frame, data = {}, []
        elif line.startswith(":"):
            frame["comment"] = True
        else:
            name, _, value = line.partition(":")
            if name == "data":
                data.append(value.removeprefix(" "))
            elif name in ("event", "id"):
                frame[name] = value.removeprefix(" ")
