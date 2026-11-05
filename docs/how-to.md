# How to use aictl

Short, task-by-task steps. Commands work the same on macOS, Linux and Windows unless a step
shows a separate PowerShell form. [README.md](../README.md) has the full reference.

**Status on Windows:** the recent changes to hooks, the daemon, process tables, `aictl ps` and storage
were tested by simulating Windows on macOS. They have not been run on a real Windows machine yet.
[Check a Windows install](#check-a-windows-install) lists what to confirm.

## Install

```bash
pipx install "aictl[all] @ git+https://github.com/zvi-code/aictl.git"
aictl --version
```

The built dashboard ships with the package, so Node.js is only needed to change the UI. No `pipx`
yet? See [Install](../README.md#install), or [Windows prerequisites](../README.md#prerequisites).

## See what is running

No daemon is needed, and these commands write nothing.

```bash
aictl ps                  # tree of tools, sessions, sub-agents and processes
aictl top                 # the same view, refreshing
```

Look closer at one session, or filter:

```bash
aictl ps 7f3a9c1e         # one session by id prefix, or a pid
aictl ps --tool copilot-cli --all
aictl ps --json
```

Each session shows:

| Area | Details |
|---|---|
| Memory | Process RAM, and the instruction and memory files in effect |
| Tools | Calls, failures, durations, what is running now, MCP servers |
| Prompts | Count and short previews, or length only under `capture = "metadata"` or `"off"` |
| Files | Files read and written, inferred from tool-call arguments, so shell commands are not covered |
| Activity | Turns, tokens, requests, duration |

A figure with no data shows `n/a` with the reason, never 0.

In `aictl top`: `j`/`k` or the arrow keys move, Enter expands, `/` filters, `a` toggles ended
sessions, `q` quits.

## Find a Copilot session and its files

`aictl session` reads Copilot's session folders and stores directly. It needs no
daemon and no database, and it writes nothing.

```bash
aictl session list --limit 20         # newest sessions, with folder size and project
aictl session list --all --json       # every session, including ones with no folder left
aictl session find "billing"          # by id, alias, project path, repository, branch or title
aictl session show 1a2b3c4d           # everything about one session; the folder comes first
aictl session path 1a2b3c4d           # only the folder, for scripts
aictl session artifacts 1a2b3c4d --type checkpoint
aictl session cat 1a2b3c4d checkpoints/index.md
```

A session can be named by its full id, an id prefix, a live PID, a folder or
transcript path, an aictl `tool:pid:timestamp` id, or a VS Code chat session id.
If more than one session matches, aictl lists them. If none does, it lists each
location it searched, expanded.

The index searches:

| Surface | Location |
|---------|----------|
| CLI and desktop app | `~/.copilot/session-state/<id>/`, `session-store.db`, `data.db` (`COPILOT_HOME` moves them; `%USERPROFILE%\.copilot` on Windows) |
| VS Code, stable and Insiders | `Code/User/workspaceStorage/<hash>/` and `Code/User/globalStorage/` of each profile (under `%APPDATA%` on Windows) |

`surface_source` in the output says how a session's surface was decided. A session
known only from `session-store.db` has surface `unknown`, since that store does not
record the client. A VS Code session's project comes from `workspace.json`.

Artifact types are `event_log`, `plan`, `checkpoint`, `file_snapshot`, `snapshot_index`,
`tool_output`, `attachment`, `research`, `metadata`, `database`, `lock` and `unknown`.
A file of a new kind is listed as `unknown`, not hidden.

`aictl session cat` reads only inside that session's folders, stops at 256 KiB unless
`--max-bytes` is given, and refuses binary files unless `--binary` is given. It never
reads `data.db` or credential files. The same limits apply to
`GET /api/copilot-sessions/<id>/artifact?path=`. Stores opened read-only do not show rows
still in a tool's write-ahead log until that tool checkpoints. Titles are hidden when
`[storage] capture` is not `full`.

`capture` decides what aictl stores. Reading a file on request stores nothing, so `aictl session cat`
and the dashboard's file view work under every mode. The `/api/copilot-sessions` routes answer
requests from this machine only, even when the dashboard is bound to another interface.

Plain `aictl session list` shows the daemon's live sessions when a daemon is running;
any of `--all`, `--project` or `--limit` reads the index instead.

## Open the dashboard

```bash
aictl daemon serve                  # opens http://127.0.0.1:8484
aictl daemon serve --no-open --port 8599
```

Run it in the background:

```bash
aictl daemon serve --daemon
aictl daemon serve --status
aictl daemon serve --stop
```

## Connect Copilot CLI, the desktop app and VS Code

Preview first. `--dry-run` writes nothing.

```bash
aictl enable --dry-run
aictl enable
aictl daemon serve
```

Check that it worked:

```bash
aictl hooks status          # real state per tool, and the command that fixes it
aictl hooks verify          # sends a test event through each installed hook
aictl otel status           # what the receiver has seen; needs a running server
aictl status --tool copilot
```

aictl tracks three separate tools: `copilot-cli`, `copilot-desktop` and `copilot-vscode`.

- **Shared hook file:** all three read `~/.copilot/hooks/aictl.json`
  (`%USERPROFILE%\.copilot\hooks\aictl.json` on Windows). aictl works out which one sent an event
  from the transcript path, then from the calling processes. If neither settles it, the event is
  recorded as `copilot-vscode`.
- **Desktop app:** GitHub documents that directory for the CLI and VS Code, not for the desktop app, so
  hooks may not fire there. Its sessions and usage are still read from `~/.copilot`.
- **Cost:** Copilot shows its own billing units. Any dollar figure is a list-price estimate and is
  labelled as one.

### Known limits

- Token metrics sent over OTLP alone do not create a session row
  ([zvi-code/aictl#4](https://github.com/zvi-code/aictl/issues/4)). Usage comes from the tools' own stores.
- Copilot CLI sessions started from a VS Code terminal look like CLI sessions.
- Premium requests are counted from usage checkpoints and shutdown events, so a running session can
  read low.

## See Microsoft 365 Copilot

Microsoft 365 Copilot runs in the cloud. Prompts, responses, sessions, tokens and cost stay in the
tenant, so aictl shows them as not available from this machine, never as 0.

What aictl can see locally:

- the app's install folder and process, where detected
- agent packages in a project (`appPackage/manifest.json` and declarative agent manifests)

```bash
aictl status --tool copilot365
aictl ctx audit --tool copilot365
```

Sources and what is unverified: [tool-copilot365.md](tool-copilot365.md).

## Remove aictl from your tools

```bash
aictl hooks status          # lists what is installed and any leftovers
aictl disable --dry-run
aictl disable
```

This removes hooks, the OTel environment and its shell-profile blocks. Your own hook rules stay.

- **Another repository:** add `--project PATH`. The current directory is always cleaned.
- **VS Code toggles from an older aictl:** add `--include-vscode-toggles`.
- **Afterwards:** open a new terminal and restart GUI apps. Running processes keep the old variables.

If aictl itself will not start, use the standalone script. It needs only Python:

```bash
python3 ~/.config/aictl/remove-hooks.py --dry-run
```

```powershell
python "$env:APPDATA\aictl\remove-hooks.py" --dry-run
```

**A hook file you renamed by hand:** `aictl enable` will not overwrite `aictl.json.disabled`. Run
`aictl disable` to remove it, or `aictl enable --replace-disabled` to turn hooks back on.

## Control how much is stored

aictl treats storage as a disposable cache. Set `[storage]` in `aictl config path`:

```toml
[storage]
capture = "full"             # full, metadata or off
max_total_mb = 1024          # budget for the database, its journal and logs
content_retention_days = 14  # with full: blank conversation text older than this
```

| `capture` | What is kept |
|---|---|
| `full` | Conversation text within the limits above. Session metadata stays after its text is trimmed. |
| `metadata` | Sessions, tokens, cost, timings, tool names and sizes. No prompt, response or tool payload text. |
| `off` | Nothing on disk: no database, journal or log files. The live dashboard runs from memory, and history resets on restart. |

To try a mode for one run:

```bash
aictl daemon serve --capture off
```

If the database is corrupt, full or stays locked, the daemon continues in memory and the dashboard
reports it.

### Shrink an existing database

Stop the daemon first, and look before you delete:

```bash
aictl db stats
aictl db compact --dry-run
```

- **Remove text, keep every number:**

  ```bash
  aictl db trim-text --dry-run
  aictl db trim-text
  ```

- **Delete old rows and reclaim the space:**

  ```bash
  aictl db compact --retention-days 90
  ```

**Compact deletes history.** It removes `requests` and `events` older than the retention window, and
session rows stay. On a database whose last data is older than the window, that means all of those
rows. Check `--dry-run` and pick the window on purpose. The default is 30 days.

## See which model and settings are really in force

A model can be pinned far from the project, and stay pinned after everyone has forgotten it. This
command shows the value in force, its file and line, its scope, and what it overrode. A source that
is outside the project root says so: "not in this project, still in effect".

```bash
aictl ctx effective
aictl ctx effective --tool copilot-cli
aictl ctx effective --json
aictl ctx effective --search-path   # also every location checked, including absent ones
```

It is read-only: it runs no tool and writes nothing. `aictl ps` and the dashboard's first screen show
the pinned model with its file and line. `aictl ctx audit` and the dashboard's hidden context panel show
the same model findings:

| Finding | Severity | Meaning |
|---------|----------|---------|
| `model.pin-conflicts-request` | high | A pin differs from a model asked for in agent frontmatter, an instruction, `--model` or a subagent call. Both sides are shown |
| `model.request-failed` | high | A session log has a model error. It shows the session id, the model and the error category, never prompt text |
| `model.ran-differently` | medium | The model in a session's replies differs from the one selected |
| `model.outside-project` | medium | A pin in force comes from outside the project root |
| `model.unrecognized` | medium | A pinned id is not in aictl's table. This does not mean the model is retired |
| `model.pin-agrees` | info | A request and the pin name the same model |
| `source.user-level-outside-root` | low, or medium when it differs from a repo file | A user-level source changes behaviour here |

The Copilot CLI order is: custom agent `model`, `--model`, `COPILOT_MODEL`, `model` in `settings.json`,
then the CLI default. An agent's model that is not available falls back to the current model with a
warning. `subagents.agents.<name>.model` applies to that subagent.

A `model` key in `.github/copilot/settings.json` or `settings.local.json` is confirmed: the Copilot CLI
config directory reference lists `model` as repo-overridable (repository replaces user, local replaces
repository). The `basis` field cites this.

What could not be confirmed is marked `unverified` in the output:

- The order in the Copilot desktop app, and `planModel`, which no reference or CLI reader mentions.
- MDM managed settings. The documented files are `managed-settings.json` under
  `/Library/Application Support/GitHubCopilot`, `%ProgramFiles%\GitHubCopilot` and
  `/etc/github-copilot` (Windows registry: `HKLM\SOFTWARE\Policies\GitHubCopilot`). They are listed
  under `--search-path` but not read.

For `copilot-vscode`, the output adds "picker selects", read from `chat.currentLanguageModel.<location>`
keys in `state.vscdb` (global: `globalStorage`; workspace: `workspaceStorage/<hash>`, matched to the
project through `workspace.json`). Only those keys are queried and `secret://` keys are never read.
The picker is shown apart from pinned settings, and `model.differs-from-picker` (medium) fires when a
setting or agent file asks for a different model. The key names are not documented. A corrupt or
locked database shows as "not readable". Models that can be selected or added come from
`chatLanguageModels.json` (names only, never keys). An organization's allow-list is held by the
service, so it shows only as an error in a session log.

On Windows, `--search-path` shows raw and expanded forms for `%APPDATA%`, `%LOCALAPPDATA%`,
`%USERPROFILE%`, `%PROGRAMDATA%`, `COPILOT_HOME`, MSIX `LocalCache` copies of AppData, OneDrive
`Documents`, VS Code profiles, Insiders and portable data, policy registry keys, and parent folders
up to the drive root. These were tested by simulation, not on a Windows machine.

## Find hidden context

Lists every source that can reach the model, including ones you never open: parent-directory files,
transitive imports, plugin content, memory files, settings that move instruction locations, hook
output, CLI flags and API base URL overrides.

```bash
aictl ctx audit
aictl ctx audit --tool copilot --all
aictl ctx audit --json
aictl ctx audit --fail-on high     # exit 1 for CI
aictl ctx audit --update-baseline  # accept the current state
```

It reads files and never runs a hook or MCP server. It flags:

- **Concealment:** invisible and Unicode tag characters, hidden HTML, encoded blobs, wording that tells
  an agent to hide something.
- **Drift:** what changed since the baseline, especially an agent writing to its own future context.
- **Visibility gaps:** sources that were loaded but are not in the inventory.

Limits:

- Text kept on the service side cannot be seen.
- The check for tokens no known source explains covers Claude Code only.
- Writes made through shell commands are caught only as redirects or `tee`.
- Phrase rules can flag ordinary guidance at medium
  ([zvi-code/aictl#6](https://github.com/zvi-code/aictl/issues/6)). Severity high is kept narrow.

The baseline is a small capped file of hashes and metadata, separate from `history.db`, so trimming
history does not affect it. Under `capture = "off"` it stays in memory.

## Fix a broken config

```bash
aictl hooks doctor
aictl hooks repair --dry-run
aictl hooks repair
```

`aictl hooks repair` fixes a Codex `config.toml` that an older `aictl enable` made invalid. Codex OTel
setup is disabled for now ([zvi-code/aictl#2](https://github.com/zvi-code/aictl/issues/2)): `aictl otel enable`
leaves that file alone and says so. Config writers refuse to replace a file with content that does not parse.

## Check a Windows install

Run these on a real Windows machine, in PowerShell, and note anything that differs:

1. **Install and update**

   ```powershell
   pipx install "aictl[all] @ git+https://github.com/zvi-code/aictl.git"
   aictl --version
   aictl reinstall --skip-ui
   ```

2. **Background daemon.** Start, check and stop it, then start two on one port. The second should
   refuse with a clear message.

   ```powershell
   aictl daemon serve --daemon
   aictl daemon serve --status
   aictl daemon serve --stop
   ```

3. **Live view.** Run `aictl ps` in Windows Terminal, PowerShell and `cmd`, and piped to a file. In
   `aictl top`, check the keys. Check that process names are right, including Copilot CLI's `.cmd` shim
   and the desktop app with its runtime.
4. **Desktop app.** `aictl status --tool copilot` should show the right data path and version. These
   locations are marked unverified in `paths-windows.csv`.
5. **Hooks.** Run `aictl enable --dry-run`, `aictl enable` and `aictl hooks verify`. Then use each of
   Copilot CLI, the desktop app and VS Code once, and confirm each session lands under its own tool.
6. **Microsoft 365 Copilot.** Check whether the app is at
   `%LOCALAPPDATA%\Packages\Microsoft.Copilot_8wekyb3d8bbwe`, whether its process is `Copilot.exe`, and
   whether a work account uses that same package. aictl currently labels `Copilot.exe` as `copilot365`.
7. **No files under `capture = "off"`.** Run `aictl daemon serve --capture off`, stop it, and confirm no
   database or log appeared in `%APPDATA%\aictl`.
8. **Removal.** Run `aictl disable --dry-run` and `aictl disable`. Confirm the `HKCU\Environment` values
   and PowerShell profile lines are gone, then open a new terminal.

## Troubleshooting

| Symptom | Try |
|---|---|
| A panel or `aictl ps` shows nothing for a tool | `aictl hooks status`, then `aictl status --tool NAME` |
| The dashboard warns that storage is over budget | [Shrink an existing database](#shrink-an-existing-database) |
| The port is in use | `aictl daemon serve --status`, or pick another with `--port` |
| Telemetry to a dead port after removing aictl | Open a new terminal and restart GUI apps |
| `aictl` not found after install | `python -m pipx ensurepath`, then open a new terminal |
