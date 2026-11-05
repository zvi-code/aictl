# OpenAI Codex (CLI and desktop app)

Checked 2026-11-05 on macOS: Codex CLI 0.154.0 (npm, `/opt/homebrew/bin/codex`); desktop app
ChatGPT.app 26.1027.30824 (bundle id `com.openai.codex`) with a bundled codex 0.166.0-alpha.
In aictl these are two tools: `codex-cli` and `codex-desktop`. They share one state directory.

## State directory

`$CODEX_HOME`, default `~/.codex` (`platforms.codex_global_dir()` honours `CODEX_HOME`).

| Path | Holds |
|------|-------|
| `config.toml` | User config: model, `[features]`, `[otel]`, `[plugins."<name>@<marketplace>"]`, MCP servers, trusted projects |
| `<profile>.config.toml` | One file per profile since 0.134 (for example `github-copilot.config.toml`) |
| `AGENTS.md` | Global instructions (`instructions.md` is legacy) |
| `auth.json` | Login or API key. Never read its values |
| `sessions/YYYY/MM/DD/rollout-*.jsonl` | Session transcripts; `token_count` events carry cumulative usage |
| `archived_sessions/`, `session_index.jsonl` | Archived rollouts, session index |
| `state_5.sqlite`, `logs_2.sqlite` | Thread/spawn state, structured logs (version number is in the file name) |
| `sqlite/codex.db` | Desktop app: inbox, automations, thread catalog, timeline |
| `skills/`, `plugins/cache/<marketplace>/<plugin>/<version>/` | Skills and installed plugins |
| `memories_v2/` (git repo), `memories/` | Memory store (`memory_summary.md`, `rollout_summaries/`) |
| `worktrees/`, `automations/`, `computer-use/`, `shell_snapshots/` | Desktop/app runtime |

Project level: `.codex/config.toml` (project config cannot set `otel`, `notify`, `model_provider`),
`AGENTS.md`, `.agents/skills/<skill>/SKILL.md`. User skills may also live in `~/.agents/skills/`
(lock file `~/.agents/.skill-lock.json`).

Desktop app data: `~/Library/Application Support/Codex/` (Electron user data, `artifact-sessions/`),
`~/Library/Application Support/com.openai.codex/`, `~/Library/Caches/com.openai.codex/` (Sparkle).

## Telemetry

`[otel]` in `config.toml` enables OTel log export (off by default); `[otel.exporter.otlp-http]` and
`[otel.metrics_exporter.otlp-http]` set endpoints. Token usage is also readable from the rollout files.

## Processes

| Process | Tool |
|---------|------|
| `ChatGPT.app/Contents/MacOS/ChatGPT`, `Codex (Renderer)`, `Codex (Service)` | `codex-desktop` |
| `ChatGPT.app/Contents/Resources/codex-cli/.../codex app-server` / `exec-server`, `codex-code-mode-host` | `codex-desktop` |
| `~/.codex/computer-use/.../SkyComputerUseService`, `~/.codex/plugins/cache/.../ChatGPT for Chrome`, Sparkle `Autoupdate com.openai.codex` | `codex-desktop` |
| `node /opt/homebrew/bin/codex`, native `codex` under `@openai/codex` | `codex-cli` |

Match order matters: the desktop rows precede the `^codex$` CLI row, because the bundled binary is also
named `codex`.

Sources: developers.openai.com/codex (config-reference, config-advanced), local inspection.
