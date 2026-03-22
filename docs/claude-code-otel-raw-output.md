# Claude Code OTel — Raw Output Example

Captured from a live aictl receiver on 2026-03-29.
Claude Code 2.1.87, OTLP HTTP/JSON exporter.

## Receiver Status

```json
{
  "active": true,
  "metrics_received": 1600,
  "events_received": 49,
  "api_calls_total": 7,
  "api_errors_total": 0,
  "last_receive_at": 1774779848.085856,
  "errors": 0
}
```

## Configuration

Claude Code requires explicit exporter selection:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:8484"
```

Without `OTEL_METRICS_EXPORTER=otlp` and `OTEL_LOGS_EXPORTER=otlp`,
Claude Code will not export any telemetry even with the enable flag set.
The default protocol is gRPC; `http/json` must be set explicitly for aictl.

## OTel Samples (Metrics)

2 samples captured.

### `otel.cost.usage` (1 data points)

```json
{
  "ts": 1774779824.681,
  "metric": "otel.cost.usage",
  "value": 0.04253925,
  "tags": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "model": "claude-opus-4-6[1m]",
    "tool": "claude-code",
    "otel_metric": "claude_code.cost.usage"
  }
}
```

### `otel.token.usage` (1 data points)

```json
{
  "ts": 1774779824.681,
  "metric": "otel.token.usage",
  "value": 1.0,
  "tags": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "model": "claude-opus-4-6[1m]",
    "type": "input",
    "tool": "claude-code",
    "otel_metric": "claude_code.token.usage"
  }
}
```

## OTel Events

31 events captured. Events arrive via the OTLP logs endpoint
and include per-request API details, user prompts, tool results, and tool decisions.

### `otel:api_request`

```json
{
  "ts": 1774779821.214,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:41.214Z",
    "event.sequence": 20,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-opus-4-6",
    "input_tokens": "1",
    "output_tokens": "657",
    "cache_read_tokens": "45406",
    "cache_creation_tokens": "545",
    "cost_usd": "0.04253925",
    "duration_ms": "11797",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779821.201,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:41.201Z",
    "event.sequence": 19,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Bash",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779821.114,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:41.114Z",
    "event.sequence": 18,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "tool_name": "Bash",
    "success": "true",
    "duration_ms": "18",
    "tool_parameters": "{\"bash_command\":\"git\",\"full_command\":\"git log --oneline -30\",\"description\":\"Check recent commits for project direction\"}",
    "tool_result_size_bytes": "2297",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779821.096,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:41.096Z",
    "event.sequence": 17,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Bash",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779810.171,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:30.171Z",
    "event.sequence": 16,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": "360",
    "output_tokens": "14",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "0",
    "cost_usd": "0.00043000000000000004",
    "duration_ms": "755",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779809.414,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:29.414Z",
    "event.sequence": 15,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-opus-4-6",
    "input_tokens": "1",
    "output_tokens": "75",
    "cache_read_tokens": "44028",
    "cache_creation_tokens": "1378",
    "cost_usd": "0.0325065",
    "duration_ms": "2885",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779809.387,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:29.387Z",
    "event.sequence": 14,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "tool_name": "Read",
    "success": "true",
    "duration_ms": "0",
    "tool_result_size_bytes": "1265",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779809.386,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:29.386Z",
    "event.sequence": 13,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Read",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779807.392,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:27.392Z",
    "event.sequence": 12,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": "375",
    "output_tokens": "12",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "0",
    "cost_usd": "0.000435",
    "duration_ms": "866",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779806.525,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:26.524Z",
    "event.sequence": 11,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "tool_name": "Read",
    "success": "true",
    "duration_ms": "1",
    "tool_result_size_bytes": "4023",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779806.524,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:26.524Z",
    "event.sequence": 10,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-opus-4-6",
    "input_tokens": "1",
    "output_tokens": "72",
    "cache_read_tokens": "43841",
    "cache_creation_tokens": "187",
    "cost_usd": "0.02489425",
    "duration_ms": "2752",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779806.523,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:26.523Z",
    "event.sequence": 9,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Read",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779804.732,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:24.732Z",
    "event.sequence": 8,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": "270",
    "output_tokens": "12",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "0",
    "cost_usd": "0.00033",
    "duration_ms": "960",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779803.77,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:23.770Z",
    "event.sequence": 7,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "tool_name": "Bash",
    "success": "true",
    "duration_ms": "226",
    "tool_parameters": "{\"bash_command\":\"./scripts/backlog-state.sh\",\"full_command\":\"./scripts/backlog-state.sh 2>&1\",\"timeout\":30000,\"description\":\"Run backlog pre-startup script\"}",
    "tool_result_size_bytes": "77",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779803.558,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:23.558Z",
    "event.sequence": 6,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-opus-4-6",
    "input_tokens": "2",
    "output_tokens": "163",
    "cache_read_tokens": "39283",
    "cache_creation_tokens": "4558",
    "cost_usd": "0.052213999999999997",
    "duration_ms": "4167",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779803.543,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:23.543Z",
    "event.sequence": 5,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Bash",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779800.379,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:20.379Z",
    "event.sequence": 4,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": "232",
    "output_tokens": "15",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "0",
    "cost_usd": "0.000307",
    "duration_ms": "991",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779799.387,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:19.387Z",
    "event.sequence": 3,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "model": "claude-opus-4-6",
    "input_tokens": "3",
    "output_tokens": "91",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "39283",
    "cost_usd": "0.24780874999999997",
    "duration_ms": "4262",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779799.325,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:19.325Z",
    "event.sequence": 2,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "tool_name": "Skill",
    "success": "true",
    "duration_ms": "2",
    "tool_result_size_bytes": "32",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779799.322,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:19.322Z",
    "event.sequence": 1,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "decision": "accept",
    "source": "config",
    "tool_name": "Skill",
    "tool": "claude-code"
  }
}
```

### `otel:user_prompt`

```json
{
  "ts": 1774779794.713,
  "tool": "claude-code",
  "kind": "otel:user_prompt",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "00000000-0000-0000-0000-000000000003",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "non-interactive",
    "event.timestamp": "2026-03-29T10:23:14.713Z",
    "event.sequence": 0,
    "prompt.id": "d52dca0b-2a79-498d-bd05-9209ba79e82b",
    "prompt_length": "906",
    "prompt": "<REDACTED>",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779758.288,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:38.288Z",
    "event.sequence": 9,
    "prompt.id": "6d98009e-32c3-4e96-a9fe-86354961cad2",
    "model": "claude-opus-4-6",
    "input_tokens": "3",
    "output_tokens": "54",
    "cache_read_tokens": "16010",
    "cache_creation_tokens": "127",
    "cost_usd": "0.01016375",
    "duration_ms": "4903",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:user_prompt`

```json
{
  "ts": 1774779753.384,
  "tool": "claude-code",
  "kind": "otel:user_prompt",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:33.384Z",
    "event.sequence": 8,
    "prompt.id": "6d98009e-32c3-4e96-a9fe-86354961cad2",
    "prompt_length": "27",
    "prompt": "<REDACTED>",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779753.375,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:33.375Z",
    "event.sequence": 7,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "model": "claude-opus-4-6",
    "input_tokens": "1",
    "output_tokens": "119",
    "cache_read_tokens": "15622",
    "cache_creation_tokens": "388",
    "cost_usd": "0.013216",
    "duration_ms": "5734",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779747.639,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:27.639Z",
    "event.sequence": 6,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "model": "claude-opus-4-6",
    "input_tokens": "3",
    "output_tokens": "204",
    "cache_read_tokens": "11374",
    "cache_creation_tokens": "4248",
    "cost_usd": "0.037352",
    "duration_ms": "7942",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779747.616,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:27.616Z",
    "event.sequence": 5,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "tool_name": "Bash",
    "success": "true",
    "duration_ms": "70",
    "tool_result_size_bytes": "258",
    "decision_source": "config",
    "decision_type": "accept",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779747.546,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:27.546Z",
    "event.sequence": 4,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "decision": "accept",
    "source": "config",
    "tool_name": "Bash",
    "tool": "claude-code"
  }
}
```

### `otel:tool_result`

```json
{
  "ts": 1774779746.843,
  "tool": "claude-code",
  "kind": "otel:tool_result",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:26.843Z",
    "event.sequence": 3,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "tool_name": "Read",
    "use_id": "toolu_01GGHYTBovagvFk1QhC8xhRq",
    "success": "false",
    "duration_ms": "3",
    "error": "File does not exist. Note: your current working directory is /Users/user/Projects.",
    "decision_source": "config",
    "decision_type": "accept",
    "tool": "claude-code"
  }
}
```

### `otel:tool_decision`

```json
{
  "ts": 1774779746.84,
  "tool": "claude-code",
  "kind": "otel:tool_decision",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:26.840Z",
    "event.sequence": 2,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "decision": "accept",
    "source": "config",
    "tool_name": "Read",
    "tool": "claude-code"
  }
}
```

### `otel:api_request`

```json
{
  "ts": 1774779740.323,
  "tool": "claude-code",
  "kind": "otel:api_request",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:20.323Z",
    "event.sequence": 1,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": "342",
    "output_tokens": "15",
    "cache_read_tokens": "0",
    "cache_creation_tokens": "0",
    "cost_usd": "0.00041700000000000005",
    "duration_ms": "628",
    "speed": "normal",
    "tool": "claude-code"
  }
}
```

### `otel:user_prompt`

```json
{
  "ts": 1774779739.693,
  "tool": "claude-code",
  "kind": "otel:user_prompt",
  "detail": {
    "user.id": "b368f34935244b67a6b64349397220ec3f11d926a7f876ad2af444de58f7e1b1",
    "session.id": "431a6e90-bd43-4144-b3de-cf9b38c6594c",
    "organization.id": "00000000-0000-0000-0000-000000000002",
    "user.email": "user@example.com",
    "user.account_uuid": "00000000-0000-0000-0000-000000000001",
    "user.account_id": "user_01HDP4m4PQ8gCErsCVxjkT1S",
    "terminal.type": "iTerm.app",
    "event.timestamp": "2026-03-29T10:22:19.693Z",
    "event.sequence": 0,
    "prompt.id": "44f94e8c-51e3-44d7-ad1d-b3162f22e0e5",
    "prompt_length": "28",
    "prompt": "<REDACTED>",
    "tool": "claude-code"
  }
}
```
