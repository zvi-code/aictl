"""HTTP scope and node-qualified identities, independent of the store."""

import json
from dataclasses import dataclass

from ..stores import normalize_node_id


class ScopeError(ValueError):
    def __init__(self, message: str, status: int = 400, reason: str = "invalid_scope") -> None:
        super().__init__(message)
        self.status = status
        self.reason = reason


@dataclass(frozen=True)
class Scope:
    kind: str = "local"
    node: str | None = None  # None = all; '' = untagged history

    def contains(self, node: str) -> bool:
        return self.kind == "fleet" or self.node == node


def _node(label: str) -> str:
    if label == "legacy":
        return ""
    try:
        return normalize_node_id(label)
    except ValueError as exc:
        raise ScopeError("Invalid node_id") from exc


def parse_scope(params: dict[str, list[str]]) -> Scope:
    scopes, nodes = params.get("scope", ["local"]), params.get("node_id", [])
    if len(scopes) != 1 or len(nodes) > 1 or scopes[0] not in {"local", "node", "fleet"}:
        raise ScopeError("Unknown or repeated node scope")
    kind = scopes[0]
    if (kind == "node") != bool(nodes):
        raise ScopeError("Only named node scope takes a node_id, and it requires one")
    if kind == "local":
        return Scope()
    return Scope(kind, _node(nodes[0].strip().lower()) if nodes else None)


def label(node: str) -> str:
    return node or "legacy"


def identity(node: str, value: str) -> str:
    return json.dumps([label(node), value], ensure_ascii=False, separators=(",", ":")) if value else ""


def parse_identity(value: str, scope: Scope, *, max_length: int = 384) -> tuple[str, str]:
    try:
        parts = json.loads(value)
        if not isinstance(parts, list) or len(parts) != 2 or not all(isinstance(p, str) for p in parts):
            raise ValueError
        node, raw = _node(parts[0]), parts[1]
        if identity(node, raw) != value or not 1 <= len(raw) <= max_length or any(ord(c) < 32 for c in raw):
            raise ValueError
    except ValueError as exc:
        raise ScopeError("A valid node-qualified identity is required") from exc
    if not scope.contains(node):
        raise ScopeError("The record does not belong to the selected node")
    return node, raw


def identity_parts(value: str | None) -> tuple[str, str] | None:
    if not value or not value.startswith("["):
        return None
    try:
        return parse_identity(value, Scope("fleet"))
    except ScopeError:
        return None
