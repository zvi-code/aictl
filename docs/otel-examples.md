# OpenTelemetry examples

The values below are synthetic. They demonstrate the receiver's normalized
records, not measured usage or a captured conversation. Raw OTLP envelopes use
the standard resource, scope, span, log and metric structures.

## Usage metric

```json
{
  "ts": 1700000000.0,
  "metric": "otel.token.usage",
  "value": 1000,
  "tags": {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.request.model": "example-model",
    "gen_ai.token.type": "input",
    "tool": "copilot-vscode",
    "otel_metric": "gen_ai.client.token.usage"
  }
}
```

Metrics do not necessarily identify a session. A span's conversation or trace
identity must not be assigned to an unrelated aggregate metric.

## Session span

```json
{
  "ts": 1700000001.0,
  "tool": "copilot-cli",
  "kind": "otel:chat example-model",
  "session_id": "00000000-0000-4000-8000-000000000001",
  "detail": {
    "span.name": "chat example-model",
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "github",
    "gen_ai.conversation.id": "00000000-0000-4000-8000-000000000001",
    "gen_ai.request.model": "example-model",
    "gen_ai.response.model": "example-model",
    "gen_ai.response.id": "example-response-1",
    "gen_ai.usage.input_tokens": 1000,
    "gen_ai.usage.output_tokens": 100,
    "duration_ms": 2000
  }
}
```

The fixture in `test/fixtures/otel/copilot_cli_synthetic_session.jsonl` uses
synthetic identifiers, timestamps, counters, model labels and installed-tool
names. It retains the relationships needed to test span/session association,
MCP lifecycle events and usage reconciliation.

## Publishing examples

Do not publish a live telemetry export or dashboard capture merely because
passwords are absent. Account IDs, response IDs, session IDs, local paths,
hostnames, installed agents, prompts and operational measurements can identify
a person or disclose private work. Hashing a name does not make the inventory
public information.

Keep local reports and screenshots under ignored `wip/` paths. Public examples
must use explicitly synthetic data. Removing an artifact from the latest tree
does not remove earlier copies from Git history.
