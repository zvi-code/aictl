# AI Tools — Traffic Monitoring & Inspection Guide

> How to observe, intercept, and analyze the actual HTTP traffic flowing between
> AI coding tools and LLM provider APIs (Anthropic, OpenAI, Google, etc.).
> Companion to `ai-tools-config-paths.md` and `ai-tools-runtime-processes.md`.
> Compiled March 2026.

---

## Table of Contents

1. [Overview: What You Can See](#1-overview-what-you-can-see)
2. [Approach 1: MITM Proxy (mitmproxy / Proxyman)](#2-approach-1-mitm-proxy)
3. [Approach 2: LLM Interceptor (llm-interceptor)](#3-approach-2-llm-interceptor)
4. [Approach 3: LLM Gateway Proxy (LiteLLM)](#4-approach-3-llm-gateway-proxy)
5. [Approach 4: Environment Variable Redirect](#5-approach-4-environment-variable-redirect)
6. [Approach 5: Network-Level Capture (tcpdump / Wireshark)](#6-approach-5-network-level-capture)
7. [Approach 6: Built-In Logging & Telemetry](#7-approach-6-built-in-logging--telemetry)
8. [Per-Tool Configuration](#8-per-tool-configuration)
9. [What the Traffic Looks Like](#9-what-the-traffic-looks-like)
10. [Security & Legal Considerations](#10-security--legal-considerations)

---

## 1. Overview: What You Can See

When an AI tool sends a request to an LLM API, the HTTP traffic contains:

**Request (what the tool sends):**
- Full system prompt (including CLAUDE.md contents, tool definitions, MCP tool schemas)
- Conversation history (all messages in context window)
- Tool call results (file contents read, bash output, MCP responses)
- Model parameters (temperature, max_tokens, top_p, etc.)
- API key (in Authorization header)
- Client metadata (user-agent, SDK version, beta feature flags)

**Response (what comes back):**
- Generated text (streamed as SSE chunks or complete JSON)
- Tool use requests (function calls the model wants to make)
- Token usage (input tokens, output tokens, cache read/write tokens)
- Model ID (exact model version used)
- Stop reason (end_turn, tool_use, max_tokens)

**What you learn from observing this:**
- Exactly what context/instructions are sent (full system prompt visibility)
- How many tokens each interaction costs
- What the model "sees" (files, code, conversation history)
- Cache behavior (cache hits/misses, write vs read tokens)
- Latency breakdown (time to first token, total response time)
- Whether your ignore rules actually work (is .env content in the prompt?)

---

## 2. Approach 1: MITM Proxy

**Best for:** Full visibility into every byte. Development/debugging. Understanding what tools actually send.

A MITM (Man-in-the-Middle) proxy sits between the AI tool and the internet, intercepting HTTPS traffic by acting as a trusted certificate authority.

### 2.1 mitmproxy (Free, Open Source)

**Install:**
```bash
# macOS
brew install mitmproxy

# pip
pip install mitmproxy

# Windows
winget install mitmproxy
```

**Setup (one-time):**
```bash
# 1. Start mitmproxy to generate CA certificate
mitmproxy --listen-port 9090
# (Ctrl+C to stop after it creates the cert)

# 2. Trust the CA certificate
# macOS:
open ~/.mitmproxy/mitmproxy-ca-cert.pem
# → Keychain Access opens → double-click cert → Trust → "Always Trust"

# Linux:
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates

# Windows:
# Open %USERPROFILE%\.mitmproxy\mitmproxy-ca-cert.p12
# → Certificate Import Wizard → Local Machine → Trusted Root CAs → Finish
```

**Run with AI tools:**
```bash
# Terminal 1: Start mitmproxy with web UI
mitmweb --listen-port 9090

# Terminal 2: Run Claude Code through the proxy
HTTP_PROXY=http://127.0.0.1:9090 \
HTTPS_PROXY=http://127.0.0.1:9090 \
NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
claude

# Web UI at http://127.0.0.1:8081 — see all traffic in real-time
```

**Filter to only LLM API traffic:**
```bash
# Only show Anthropic + OpenAI + Google traffic
mitmweb --listen-port 9090 \
  --set "view_filter=~d api.anthropic.com | ~d api.openai.com | ~d generativelanguage.googleapis.com"
```

**Save traffic to file:**
```bash
# Save all flows to a file for later analysis
mitmdump --listen-port 9090 \
  -w llm-traffic.flow \
  --set "flow_detail=3"

# Replay/inspect later
mitmweb -r llm-traffic.flow
```

### 2.2 Proxyman (macOS, Paid — Easier UI)

```bash
# Install
brew install --cask proxyman

# Proxyman auto-installs its CA certificate
# Then: enable "SSL Proxying" for api.anthropic.com, api.openai.com, etc.
# All Claude/OpenAI traffic appears in the GUI with parsed JSON bodies
```

### 2.3 HTTP Toolkit (Cross-Platform, Free Tier)

```bash
# Install
brew install --cask httptoolkit  # macOS
# or download from httptoolkit.com

# It can auto-intercept specific processes — click "Intercept" on a terminal
# All traffic from that terminal is captured
```

---

## 3. Approach 2: LLM Interceptor

**Best for:** Purpose-built for AI tools. Auto-masks API keys. Session-based recording. Lowest setup friction.

[llm-interceptor](https://github.com/chouzz/llm-interceptor) is a MITM proxy specifically designed for intercepting AI coding tool traffic.

**Install:**
```bash
git clone https://github.com/chouzz/llm-interceptor.git
cd llm-interceptor
uv sync --dev
uv run lli-dev-setup
```

**Setup CA cert (same as mitmproxy — it uses mitmproxy under the hood):**
```bash
lli watch &
sleep 2
kill %1
# Then trust ~/.mitmproxy/mitmproxy-ca-cert.pem (same as above)
```

**Run in watch mode:**
```bash
# Terminal 1: Start interceptor
lli watch
# → Press Enter to START a recording session
# → Press Enter again to STOP and process

# Terminal 2: Run Claude Code through it
HTTP_PROXY=http://127.0.0.1:9090 \
HTTPS_PROXY=http://127.0.0.1:9090 \
NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
claude
```

**Output structure:**
```
./traces/
├── all_captured_20260325_220000.jsonl     # Global log (all traffic)
├── 01_session_20260325_223010/            # Session 1
│   ├── merged_requests.jsonl              # Merged request/response pairs
│   ├── raw/                               # Raw mitmproxy flows
│   └── summary.md                         # Human-readable summary
└── 02_session_20260325_224500/            # Session 2
```

**Key features:**
- Auto-masks API keys in logs
- Auto-splits by session
- Works with Anthropic, OpenAI, Google, Groq, Together, Mistral, and more
- Produces JSONL output for easy parsing
- Supports corporate proxy environments (`--upstream-ca-cert`)

---

## 4. Approach 3: LLM Gateway Proxy

**Best for:** Production environments. Cost tracking. Multi-provider routing. Team-wide observability.

Instead of intercepting traffic passively, you route ALL LLM traffic through a local gateway that logs, tracks costs, and optionally routes to different providers.

### 4.1 LiteLLM Proxy

```bash
# Install
pip install 'litellm[proxy]'

# Start proxy
litellm --model anthropic/claude-sonnet-4-5 --port 4000

# Configure Claude Code to use it
ANTHROPIC_BASE_URL=http://localhost:4000 \
ANTHROPIC_API_KEY=sk-ant-... \
claude
```

**LiteLLM config (litellm_config.yaml):**
```yaml
model_list:
  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-5
      api_key: sk-ant-...

  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-...

litellm_settings:
  success_callback: ["langfuse"]    # Log to observability platform
  set_verbose: true                  # Console logging
```

**What LiteLLM gives you:**
- Cost tracking per request, per key, per team
- Token usage analytics
- Latency metrics
- Request/response logging
- Rate limiting
- Fallback between providers
- Admin UI at `/ui`

### 4.2 Kong AI Gateway

For enterprise setups — route through Kong with the AI Proxy plugin:

```bash
# All Claude Code traffic gets logged to /tmp/claude.json
# with full token usage, latency, model info
```

---

## 5. Approach 4: Environment Variable Redirect

**Best for:** Quick and dirty. No proxy setup. Works with any tool that respects `*_BASE_URL`.

Most AI tools let you override the API endpoint via environment variables. Point it at a logging proxy or even `localhost` to see what's sent.

### 5.1 Per-Tool Base URL Override

| Tool | Variable | Example |
|------|----------|---------|
| **Claude Code** | `ANTHROPIC_BASE_URL` | `http://localhost:8082` |
| **Claude Code (API key)** | `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL` | Direct API redirect |
| **Claude Code (auth token)** | `ANTHROPIC_AUTH_TOKEN` | Used with LLM gateways |
| **OpenAI SDK** | `OPENAI_BASE_URL` | `http://localhost:4000/v1` |
| **OpenAI Codex CLI** | `OPENAI_BASE_URL` | Same |
| **Gemini CLI** | `GOOGLE_API_KEY` + custom endpoint | Via Vertex AI proxy |
| **Cursor** | Settings → Models → Override endpoint | UI-based |
| **Windsurf** | Model provider config | In Windsurf settings |

### 5.2 Simple Logging Proxy (Python, 20 Lines)

```python
#!/usr/bin/env python3
"""Minimal HTTPS-to-HTTPS logging proxy for LLM API calls."""
import json, sys, datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

UPSTREAM = "https://api.anthropic.com"  # or api.openai.com
LOG_FILE = "llm-traffic.jsonl"

class LoggingProxy(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        
        # Log request
        req = json.loads(body)
        entry = {
            "ts": datetime.datetime.utcnow().isoformat(),
            "direction": "request",
            "path": self.path,
            "model": req.get("model", "?"),
            "messages_count": len(req.get("messages", [])),
            "system_prompt_len": len(str(req.get("system", ""))),
        }
        
        # Forward to real API
        headers = {k: v for k, v in self.headers.items() if k.lower() != "host"}
        resp = requests.post(f"{UPSTREAM}{self.path}", data=body, headers=headers, stream=True)
        
        # Log response basics
        entry["status"] = resp.status_code
        entry["response_headers"] = dict(resp.headers)
        
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
        
        # Forward response
        self.send_response(resp.status_code)
        for k, v in resp.headers.items():
            if k.lower() not in ("transfer-encoding", "content-encoding"):
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(resp.content)

HTTPServer(("127.0.0.1", 8082), LoggingProxy).serve_forever()
```

**Usage:**
```bash
# Terminal 1
python3 logging_proxy.py

# Terminal 2
ANTHROPIC_BASE_URL=http://localhost:8082 claude

# Check logs
tail -f llm-traffic.jsonl | python3 -m json.tool
```

---

## 6. Approach 5: Network-Level Capture

**Best for:** When you can't modify the tool's environment. Raw packet analysis. Forensic investigation.

### 6.1 tcpdump (Raw Packets)

```bash
# Capture all traffic to Anthropic API (will be encrypted — TLS)
sudo tcpdump -i any host api.anthropic.com -w anthropic-traffic.pcap

# See DNS lookups + connection metadata (no decryption)
sudo tcpdump -i any host api.anthropic.com -nn -v
```

**Limitation:** Traffic is TLS-encrypted. You see connection metadata (IPs, ports, timing, packet sizes) but not content. Useful for timing analysis and verifying *where* traffic goes, not *what* it contains.

### 6.2 Wireshark with TLS Key Log

```bash
# Tell Node.js to dump TLS session keys (enables Wireshark decryption)
SSLKEYLOGFILE=/tmp/tls-keys.log claude

# Open in Wireshark:
# → Edit → Preferences → Protocols → TLS → (Pre)-Master-Secret log filename → /tmp/tls-keys.log
# → Now you can see decrypted HTTPS content
```

### 6.3 macOS Network Monitor

```bash
# See all network connections by process name
nettop -p $(pgrep -f claude) -m tcp

# One-shot connection list
lsof -i -P | grep claude
```

---

## 7. Approach 6: Built-In Logging & Telemetry

### 7.1 Claude Code

```bash
# Verbose logging (shows API call metadata)
claude --verbose

# OpenTelemetry export (Copilot CLI — works with Claude via SDK too)
# Emits spans for each LLM call with token counts, latency, model name

# Session transcripts contain full conversation history
cat ~/.claude/projects/<project>/session-*.jsonl | python3 -m json.tool | head -100
```

### 7.2 Copilot CLI

```bash
# Built-in OTel support — activate with env vars
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_TRACES_EXPORTER=otlp \
copilot

# Emits spans: invoke_agent → chat (LLM call) → execute_tool
# Attributes: model name, token counts, durations

# Debug logs
copilot --debug 2>&1 | tee copilot-debug.log
```

### 7.3 Cursor

```bash
# Developer tools (Chromium DevTools inside Cursor)
# Help → Toggle Developer Tools → Network tab
# Filter by "api.anthropic.com" or "api.openai.com"
# See full request/response JSON in the Network panel
```

### 7.4 OpenClaw

```bash
# Gateway logs
openclaw channels logs

# Full request/response logging in config
# openclaw.json → agents.defaults.logging.level: "debug"
```

---

## 8. Per-Tool Configuration

### 8.1 Claude Code Through a Proxy

```bash
# Method 1: Environment variables (recommended)
export HTTP_PROXY=http://127.0.0.1:9090
export HTTPS_PROXY=http://127.0.0.1:9090
export NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem
claude

# Method 2: Base URL redirect (to logging proxy or LiteLLM)
export ANTHROPIC_BASE_URL=http://localhost:8082
claude

# Method 3: LLM Gateway with auth token
export ANTHROPIC_BASE_URL=http://localhost:4000
export ANTHROPIC_AUTH_TOKEN=sk-litellm-key
claude
```

### 8.2 Cursor Through a Proxy

```bash
# Cursor respects VS Code proxy settings
# Settings → search "proxy" → set HTTP Proxy to http://127.0.0.1:9090
# Also set: "http.proxyStrictSSL": false (or install CA cert)
```

### 8.3 Copilot CLI Through a Proxy

```bash
HTTP_PROXY=http://127.0.0.1:9090 \
HTTPS_PROXY=http://127.0.0.1:9090 \
NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
copilot
```

### 8.4 Windsurf Through a Proxy

```bash
# Same VS Code proxy mechanism as Cursor
# Settings → search "proxy" → HTTP Proxy → http://127.0.0.1:9090
```

### 8.5 Gemini CLI Through a Proxy

```bash
HTTP_PROXY=http://127.0.0.1:9090 \
HTTPS_PROXY=http://127.0.0.1:9090 \
NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem \
gemini
```

### 8.6 OpenAI / Codex CLI Through a Proxy

```bash
HTTP_PROXY=http://127.0.0.1:9090 \
HTTPS_PROXY=http://127.0.0.1:9090 \
OPENAI_BASE_URL=http://localhost:4000/v1 \
codex
```

---

## 9. What the Traffic Looks Like

### 9.1 Anthropic (Claude) — Request

```
POST /v1/messages HTTP/1.1
Host: api.anthropic.com
anthropic-version: 2023-06-01
anthropic-beta: prompt-caching-2024-07-31,token-counting-2024-11-01
x-api-key: sk-ant-...
content-type: application/json
user-agent: claude-code/2.1.x

{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 16384,
  "system": [
    {
      "type": "text",
      "text": "You are Claude Code, an AI assistant...\n\n<CLAUDE.md contents>\n...",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {"role": "user", "content": "fix the bug in auth.ts"},
    {"role": "assistant", "content": "I'll look at the file..."},
    {"role": "user", "content": [
      {"type": "tool_result", "tool_use_id": "toolu_01X...", "content": "<file contents>"}
    ]}
  ],
  "tools": [
    {"name": "Read", "description": "Read a file...", "input_schema": {...}},
    {"name": "Write", "description": "Write to a file...", "input_schema": {...}},
    {"name": "Bash", "description": "Run a bash command...", "input_schema": {...}},
    ...
  ],
  "stream": true
}
```

### 9.2 Anthropic (Claude) — Response (Streamed SSE)

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01X...","model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":12847,"cache_creation_input_tokens":4521,"cache_read_input_tokens":8326,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_01Y...","name":"Read","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"file_path\":\"src/auth.ts\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":47}}

event: message_stop
data: {"type":"message_stop"}
```

### 9.3 OpenAI — Request

```
POST /v1/chat/completions HTTP/1.1
Host: api.openai.com
Authorization: Bearer sk-...
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [...],
  "tools": [...],
  "stream": true
}
```

### 9.4 Key Fields to Watch

| Field | Why it matters |
|-------|----------------|
| `system` prompt text | See exactly what instructions the tool injects (CLAUDE.md, tool definitions, etc.) |
| `messages` array | Full conversation history — see what files/code the model has seen |
| `tools` array | All available tools and their schemas |
| `cache_creation_input_tokens` | How many tokens were written to cache (costs 1.25x) |
| `cache_read_input_tokens` | How many tokens were read from cache (costs 0.1x) |
| `input_tokens` | Non-cached input tokens (full price) |
| `output_tokens` | Response tokens (most expensive) |
| `model` | Exact model version used |
| `stop_reason` | Why the model stopped (end_turn, tool_use, max_tokens) |
| `user-agent` header | Tool name + version |
| `anthropic-beta` header | Which beta features are active |

### 9.5 Context Window Token Inventory (Claude Code)

Every API call Claude Code makes carries a fixed "tax" of infrastructure tokens before your actual conversation. The `/context` command reveals this breakdown. Here are real-world measured values:

```
/context
Context Usage  claude-opus-4-5-20251101
51k/200k tokens (26%)

Estimated usage by category:
  System prompt:      2.6k tokens   (1.3%)    ← Claude Code's personality/instructions
  System tools:      16.8k tokens   (8.4%)    ← Built-in tools (Read, Write, Bash, etc.)
  MCP tools:          0.9k tokens   (0.5%)    ← Per MCP server tool schemas
  Custom agents:      0.9k tokens   (0.5%)    ← .claude/agents/*.md definitions
  Memory files:       0.3k tokens   (0.2%)    ← CLAUDE.md + auto-memory MEMORY.md
  Skills:             0.1k tokens   (0.0%)    ← Skill descriptions (lazy-loaded)
  Messages:          30.5k tokens  (15.3%)    ← Your actual conversation
  Autocompact buffer: 33.0k tokens (16.5%)    ← Reserved, cannot be used
  Free space:        114k tokens   (57.0%)    ← Available for work
```

**Fixed overhead (loaded on every single API call):**

| Component | Typical Tokens | Source Files | Notes |
|-----------|---------------|--------------|-------|
| System prompt | ~2,600-3,000 | (built-in, not a file) | Claude Code's core personality + safety instructions |
| System tools (built-in) | ~14,000-17,000 | (built-in) | Read, Write, Edit, Bash, Glob, Grep, WebFetch, etc. — ~20 tool schemas |
| Autocompact buffer | ~33,000 | (reserved) | Cannot be used — reserved for compaction summarization |
| **Subtotal (minimum overhead)** | **~50,000** | | **25% of 200k window is gone before you type anything** |

**Variable overhead (depends on your project config):**

| Component | Tokens Per | Source Files | Loaded When |
|-----------|-----------|--------------|-------------|
| CLAUDE.md (project) | ~100-5,000+ | `./CLAUDE.md`, `.claude/CLAUDE.md` | Every API call, survives compaction |
| CLAUDE.md (global) | ~100-2,000 | `~/.claude/CLAUDE.md` | Every API call |
| CLAUDE.local.md | ~100-1,000 | `./CLAUDE.local.md` | Every API call |
| Auto-memory (MEMORY.md) | ~100-3,000 | `~/.claude/projects/<p>/memory/MEMORY.md` | Every API call (first 200 lines) |
| .claude/rules/*.md | ~50-500 each | `.claude/rules/<name>.md` | When matching files referenced |
| Custom agents | ~200-500 each | `.claude/agents/<name>.md` | Every API call (descriptions only) |
| Skills | ~50-100 each | `.claude/skills/<name>/SKILL.md` | Descriptions always; full content on-demand |
| MCP server tools | ~200-2,000 per server | Configured MCP servers | Every API call (schemas loaded) |
| MCP server (deferred) | ~0 (saved) | Large MCP servers | Auto-deferred when tools exceed threshold |
| Conversation history | grows with session | In-memory | Every API call; compacted when ~83.5% full |
| Tool results (file reads) | ~1 token per 4 chars | Files read by agent | In conversation history until compacted |

**Known token costs for common MCP servers:**

| MCP Server | Approx. Tokens | Number of Tools |
|------------|---------------|-----------------|
| GitHub | ~2,000-3,000 | 15-20 tools |
| Playwright | ~1,500-2,500 | 10-15 tools |
| Gmail | ~2,000-4,000 | 7+ tools |
| Filesystem | ~500-1,000 | 5 tools |
| Sentry | ~1,000-2,000 | 8-12 tools |
| PostgreSQL | ~500-1,500 | 5-8 tools |
| Fetch (built-in) | ~300-500 | 1-2 tools |

### 9.6 Structured Token Assessment Format

The following JSON schema can be used to inventory your project's token footprint and estimate per-session costs. Generate this from your project root to understand your baseline token "tax."

**Schema:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AI Tool Token Inventory",
  "description": "Structured inventory of files contributing to LLM context window consumption",
  "type": "object",
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "project": { "type": "string", "description": "Project name or path" },
        "tool": { "type": "string", "enum": ["claude-code", "cursor", "copilot-cli", "gemini-cli", "windsurf", "opencode"] },
        "model": { "type": "string", "description": "Model ID (e.g., claude-sonnet-4-5)" },
        "context_window": { "type": "integer", "description": "Total context window in tokens" },
        "captured_at": { "type": "string", "format": "date-time" },
        "captured_via": { "type": "string", "enum": ["/context", "mitmproxy", "litellm", "session-transcript", "manual"] }
      }
    },
    "fixed_overhead": {
      "type": "object",
      "description": "Tokens consumed on every API call regardless of conversation",
      "properties": {
        "system_prompt": { "type": "integer" },
        "system_tools": { "type": "integer" },
        "autocompact_buffer": { "type": "integer" }
      }
    },
    "project_config": {
      "type": "array",
      "description": "Files loaded from your project that consume tokens",
      "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string", "description": "Relative or absolute path" },
          "type": { "type": "string", "enum": [
            "instructions", "memory", "rules", "agent", "skill", "mcp-schema",
            "ignore-file", "settings", "env"
          ]},
          "tokens": { "type": "integer", "description": "Estimated token count" },
          "bytes": { "type": "integer", "description": "File size in bytes" },
          "loaded": { "type": "string", "enum": ["always", "on-demand", "on-file-match", "deferred"],
            "description": "When this file is loaded into context" },
          "survives_compaction": { "type": "boolean",
            "description": "Whether this survives /compact (CLAUDE.md does, conversation doesn't)" },
          "cacheable": { "type": "boolean",
            "description": "Whether this benefits from prompt caching" }
        },
        "required": ["file", "type", "tokens", "loaded"]
      }
    },
    "mcp_servers": {
      "type": "array",
      "description": "MCP servers and their tool schema token costs",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "transport": { "type": "string", "enum": ["stdio", "http", "sse"] },
          "tool_count": { "type": "integer" },
          "schema_tokens": { "type": "integer", "description": "Tokens consumed by tool schemas" },
          "deferred": { "type": "boolean", "description": "Whether tools are deferred (loaded on-demand)" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total_fixed_tokens": { "type": "integer" },
        "total_config_tokens": { "type": "integer" },
        "total_mcp_tokens": { "type": "integer" },
        "total_overhead": { "type": "integer", "description": "Fixed + config + MCP" },
        "available_for_conversation": { "type": "integer" },
        "overhead_percentage": { "type": "number" },
        "estimated_cost_per_call_usd": { "type": "number",
          "description": "Estimated cost of the overhead alone per API call" }
      }
    }
  }
}
```

**Example inventory for a real project:**
```json
{
  "meta": {
    "project": "my-project",
    "tool": "claude-code",
    "model": "claude-sonnet-4-5",
    "context_window": 200000,
    "captured_at": "2026-03-25T10:00:00Z",
    "captured_via": "/context"
  },
  "fixed_overhead": {
    "system_prompt": 2700,
    "system_tools": 16800,
    "autocompact_buffer": 33000
  },
  "project_config": [
    { "file": "CLAUDE.md", "type": "instructions", "tokens": 1200, "bytes": 4800, "loaded": "always", "survives_compaction": true, "cacheable": true },
    { "file": "~/.claude/CLAUDE.md", "type": "instructions", "tokens": 300, "bytes": 1200, "loaded": "always", "survives_compaction": true, "cacheable": true },
    { "file": "~/.claude/projects/.../memory/MEMORY.md", "type": "memory", "tokens": 800, "bytes": 3200, "loaded": "always", "survives_compaction": true, "cacheable": true },
    { "file": ".claude/rules/testing.md", "type": "rules", "tokens": 150, "bytes": 600, "loaded": "on-file-match", "survives_compaction": true, "cacheable": true },
    { "file": ".claude/agents/code-reviewer.md", "type": "agent", "tokens": 250, "bytes": 1000, "loaded": "always", "survives_compaction": true, "cacheable": true }
  ],
  "mcp_servers": [
    { "name": "github", "transport": "http", "tool_count": 18, "schema_tokens": 2500, "deferred": false },
    { "name": "filesystem", "transport": "stdio", "tool_count": 5, "schema_tokens": 800, "deferred": false }
  ],
  "summary": {
    "total_fixed_tokens": 52500,
    "total_config_tokens": 2700,
    "total_mcp_tokens": 3300,
    "total_overhead": 58500,
    "available_for_conversation": 141500,
    "overhead_percentage": 29.25,
    "estimated_cost_per_call_usd": 0.0029
  }
}
```

### 9.7 Generating the Token Inventory

**From Claude Code (quickest):**
```bash
# Inside Claude Code session:
/context
# → Copy the output

# Or parse session transcripts for usage data:
cat ~/.claude/projects/<project>/session-*.jsonl | \
  python3 -c "
import json, sys
for line in sys.stdin:
    msg = json.loads(line)
    if 'usage' in str(msg):
        usage = msg.get('message', {}).get('usage', {})
        if usage:
            print(json.dumps(usage, indent=2))
" | head -50
```

**From mitmproxy captures:**
```bash
# Extract token usage from captured traffic
mitmdump -r llm-traffic.flow -q --set flow_detail=0 \
  -s 'import json
def response(flow):
    if "anthropic.com" in flow.request.host:
        for line in flow.response.text.split("\n"):
            if "usage" in line and "input_tokens" in line:
                data = json.loads(line.split("data: ")[1])
                if "usage" in data:
                    print(json.dumps(data["usage"]))
'
```

**Estimate tokens from file sizes (rule of thumb):**
```bash
# ~1 token per 4 characters for English text
# ~1 token per 3 characters for code
# Markdown: multiply byte count by 0.28 for approximate token count

# Quick estimate for your project's CLAUDE.md + memory files
find . -name 'CLAUDE.md' -o -name 'CLAUDE.local.md' -o -name 'MEMORY.md' | \
  while read f; do
    bytes=$(wc -c < "$f")
    tokens=$((bytes / 4))
    printf "%-50s %6d bytes  ~%5d tokens\n" "$f" "$bytes" "$tokens"
  done

# Estimate for all .claude/ config files
find .claude/ -name '*.md' -o -name '*.json' 2>/dev/null | \
  while read f; do
    bytes=$(wc -c < "$f")
    tokens=$((bytes / 4))
    printf "%-50s %6d bytes  ~%5d tokens\n" "$f" "$bytes" "$tokens"
  done
```

---

## 10. Security & Legal Considerations

**What you're seeing:**
- Your own API key traffic to services you pay for — this is your data
- System prompts that are partially proprietary (Claude Code's system prompt is Anthropic's IP)
- Tool definitions and schemas

**Cautions:**
- **Don't share captured system prompts publicly** — they may contain proprietary instructions
- **API keys are visible** in intercepted traffic — ensure captures are stored securely
- **Credentials in MCP server env vars** may appear in tool_result messages
- **Corporate environments** may have policies against MITM proxying — check with your IT team
- **Rate limiting:** Some providers may detect proxy patterns and flag them
- **TOS:** Intercepting your own traffic for debugging is generally acceptable; redistributing captured system prompts may violate TOS

**Best practices:**
- Use `llm-interceptor` which auto-masks API keys
- Store captures in a private, encrypted location
- Delete captures after analysis
- Never commit traffic captures to version control

---

## Quick Decision Guide

| Goal | Recommended Approach | Effort |
|------|---------------------|--------|
| "What prompt is Claude Code actually sending?" | mitmproxy or llm-interceptor | 10 min setup |
| "How many tokens am I using per session?" | Session transcript parsing or LiteLLM | 5-30 min |
| "Route all AI traffic through a single gateway" | LiteLLM Proxy | 30 min setup |
| "Quick peek at what's going over the wire" | `SSLKEYLOGFILE` + Wireshark | 5 min |
| "See if my .env contents are leaking into prompts" | mitmproxy, search for env values | 10 min |
| "Cost tracking across my team" | LiteLLM with Langfuse/Helicone | 1 hour setup |
| "I can't modify the tool's environment" | tcpdump / nettop (metadata only) | 2 min |
| "Full forensic capture for later analysis" | mitmdump to .flow file | 10 min |
