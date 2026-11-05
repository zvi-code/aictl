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
