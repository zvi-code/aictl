# How to use aictl

Short, task-by-task steps. Commands work the same on macOS, Linux and Windows unless a step
shows a separate PowerShell form. [README.md](../README.md) has the full reference.

**Status on Windows:** the recent changes to hooks, the daemon, process tables, `aictl ps` and storage
were tested by simulating Windows on macOS. They have not been run on a real Windows machine yet.
[Check a Windows install](#check-a-windows-install) lists what to confirm.

## Install

If packages must come from a private index, read
[Install from a private package index](../README.md#install-from-a-private-package-index) first. The commands
below can reach PyPI.

From a clone, which you can update with `git pull`:

```bash
git clone https://github.com/zvi-code/aictl.git
cd aictl
pipx install -e ".[all]"
aictl --version
```

Without a clone:

```bash
pipx install "aictl[all] @ git+https://github.com/zvi-code/aictl.git"
aictl --version
```

The built dashboard ships with the package, so Node.js is only needed to change the UI. No `pipx`
yet? See [Install](../README.md#install), or [Windows prerequisites](../README.md#prerequisites).

### Install with a private package index

Use these steps when Python packages must come from your organization's index and not from PyPI.
The index URL is the `simple` URL of the feed, for example `https://packages.example/simple`. It
can hold credentials; do not write it into a file in the repository.

1. Install pipx from the index, then open a new terminal:

   ```powershell
   python -m pip install --index-url https://packages.example/simple pipx
   python -m pipx ensurepath
   ```

2. In the new terminal, name the index for both installers pipx can use. `pip` reads
   `PIP_INDEX_URL`; `uv`, which pipx uses when it is on `PATH`, reads `UV_DEFAULT_INDEX`.
   PowerShell:

   ```powershell
   $env:PIP_INDEX_URL = "https://packages.example/simple"
   $env:UV_DEFAULT_INDEX = $env:PIP_INDEX_URL
   ```

   bash or zsh:

   ```bash
   export PIP_INDEX_URL=https://packages.example/simple
   export UV_DEFAULT_INDEX=$PIP_INDEX_URL
   ```

3. Install from the clone in that same terminal:

   ```bash
   git clone https://github.com/zvi-code/aictl.git
   cd aictl
   pipx install -e ".[all]"
   aictl --version
   ```

   `pipx install --pip-args="--index-url https://packages.example/simple" -e ".[all]"` does the same for the
   `pip` backend only.

4. Check which source the packages came from. The install fails, and installs nothing, when the index
   cannot be reached; it does not fall back to PyPI while the variables are set. On Windows, this prints
   `pip` or `uv`:

   ```powershell
   Get-Content "$(pipx environment --value PIPX_HOME)\venvs\aictl\Lib\site-packages\click-*.dist-info\INSTALLER"
   ```

5. For every later update, pull the clone and name the index on the reinstall command. It prints
   `Python packages:` and the host name of the source it uses:

   ```bash
   git pull
   aictl reinstall --index-url https://packages.example/simple
   ```

   `AICTL_INDEX_URL` in the environment does the same as `--index-url`.

The variables of step 2 last for that terminal only. To keep them, set them for the user in Windows
(`[Environment]::SetEnvironmentVariable("PIP_INDEX_URL", "...", "User")`, and the same for
`UV_DEFAULT_INDEX`) or in the shell profile. [Install from a private package
index](../README.md#install-from-a-private-package-index) explains how `pip` and `uv` differ, and how to keep
pipx on `pip`.

## Run aictl

| To | Run |
|---|---|
| Check the install | `aictl --version` |
| See running tools and sessions | `aictl ps` |
| Watch the same view live (`q` quits) | `aictl top` |
| Open the dashboard (Ctrl+C stops it) | `aictl daemon serve` |
| List recent Copilot sessions | `aictl session list --limit 20` |
| See the settings and model pins in effect | `aictl ctx effective --search-path` |
| See the state of the hooks | `aictl hooks status` |

The sections below explain each command. These commands do not change your tool settings. `aictl enable` does:
see [Connect Copilot CLI, the desktop app and VS Code](#connect-copilot-cli-the-desktop-app-and-vs-code).

## Update aictl

After an install from a clone with `-e`, the `aictl` command runs the code in the clone. For most updates, pull
the changes in the clone:

```bash
git pull
```

The version number does not change with each commit. To see which code you have, run `git log -1 --oneline` in the
clone.

Run `aictl reinstall` in the clone if the update adds a dependency, or if you installed without `-e`:

```bash
aictl reinstall                # reinstalls, and builds the UI only if its source has local changes
aictl reinstall --build-ui     # also builds the UI with no local changes
aictl reinstall --skip-ui      # never builds the UI
aictl reinstall --index-url https://packages.example/simple    # uses only this package index, with no npm build
```

The command prints `Python packages:` and the host name of the package source. Check this line.

On Windows, the install continues in a new window, because a running `aictl.exe` cannot replace itself. That
window tries up to 5 times. An error along the way is fine if a later attempt succeeds. The last message
gives the result:

| The window shows | Meaning | Do this |
|---|---|---|
| `Attempt 1 of 5 did not finish` after `os error 32` | Another process has the aictl folder open. This usually clears within seconds | Wait. The window tries again |
| `DONE: aictl is reinstalled.` | The install finished | Run `aictl --version` |
| `FAILED: aictl was not reinstalled after 5 attempts.` | The last error is above this message, and `aictl` may not start | See [Common errors](../README.md#common-errors) |

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

VS Code's `state.vscdb` files add links, read by named key only:

| Evidence | Effect |
|----------|--------|
| `agent-host-copilotcli:/<id>` in `agentSessions.model.cache` | Surface `copilot-vscode`: the session ran in VS Code's agent host |
| `copilotcli:/<id>` in `chat.ChatSessionStore.index` | Alias, title, timing; surface `copilot-vscode` only if it was unknown |
| `copilotcli:/<id>` in `agentSessions.model.cache` | Alias, title, timing; no surface, since VS Code lists sessions from any client |
| `chatEditingSessions/<SHA-1 of the resource>/` | Alias and artifacts for that CLI session; surface `copilot-vscode` only if it was unknown |

`vscode.metadata.json` with `origin: other` shows that VS Code listed a session, not that
it started it, so the surface stays as `workspace.yaml` says. Text in a chat that mentions
a session id creates no link. Any of these aliases works as a session name. A chat's
`chatEditingSessions`, `transcripts`, `debug-logs` and `chat-session-resources` entries are
its artifacts. Title and creation time of a chat file come from a bounded head and tail, at
any file size.

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

The dashboard scans and watches the folder where you start it. Start it in one project, or name the project:

```bash
aictl daemon serve --root ~/Projects/my-project
```

A parent folder of many projects works, but costs more:

- Above 50,000 folders, aictl scans only part of the folder and says so once.
- A scan that takes 1 second or more waits 20 times its own duration before it repeats, so a new file can take longer to appear.
- aictl lists the first 2,000 config files from hidden folders, and keeps samples for the 500 largest files of each tool. Totals per tool still count every file it found.
- Changes under `.git`, `node_modules`, `target`, `bin`, `obj`, `build` and `dist` do not count as file activity.

### Filter by tool

The tool filter in the top bar applies to every screen. `Copilot VS Code` also keeps the `copilot` settings card,
because that card holds the VS Code settings. These stay visible because they belong to no single tool: the
VS Code settings panel, the aictl monitoring card, Project Environment, Collector Health and the monitored folders.

The context-window figures on Budget are computed by the server for the tools you ticked
(`/api/budget?tools=a,b`; no parameter is all tools, and an empty `tools=` is none).
After you change the filter, these screens show the loading state until the server has the figures for the new
selection. They never show the figures of the previous selection. Totals, averages and percentiles come from the
selected tools' own rows. A row that stored no tool takes the tool of its session. A note counts the rows that no
tool can be found for, because no selection includes them, and rows whose tool is not in the filter list. Ids match
exactly: `copilot` and `copilot-vscode` are different tools, except that settings stored under `copilot` belong to
Copilot in VS Code.

Two things still cover all tools, and say so on the screen: the raw metrics explorer on Analytics, and the memory
growth chart on Memory (aictl records those series for the whole machine, with no tool).

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

`aictl enable` registers hooks only for tools that are installed. If `~/.claude`, `~/.gemini` or the VS Code
user folder does not exist, that step is listed as skipped, with the folder it checked, and nothing is
created there. The Copilot hook folder `~/.copilot/hooks` is the exception, because VS Code reads it
without the CLI. `aictl hooks status` shows a skipped tool as `not-installed`, which is not a failure.
`aictl otel enable --tool copilot` names the tool, so it may create the VS Code settings file.

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
A settings file that holds nothing once the rules are gone (`{}`) is deleted, and its folder too if that
is now empty. A file with any other key, or with comments, is kept. `--dry-run` lists these deletions.

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

## Remove the aictl program

**Warning:** if you do not plan to install aictl again, first do
[Remove aictl from your tools](#remove-aictl-from-your-tools). If you skip it, your tools keep hooks that point
to a program that is gone.

1. Stop the dashboard:

   ```bash
   aictl daemon serve --stop
   ```

2. Remove the program. If `pipx` says that there is nothing to uninstall, go to step 3:

   ```bash
   pipx uninstall aictl
   ```

3. Do [Find a leftover copy](#find-a-leftover-copy).

These steps remove the program only. Your settings and history stay in `%APPDATA%\aictl` on Windows and in
`~/.config/aictl` on macOS and Linux. Registered hooks also stay. To replace the program, go to [Install](#install).

## Find a leftover copy

`pipx uninstall` cleans only the location that `pipx` uses now. A copy in another location stays. A process that
started before an update keeps running the old code.

This check changes nothing. On Windows, in PowerShell:

```powershell
"--- on PATH"
Get-Command aictl -All -ErrorAction SilentlyContinue | ForEach-Object Source
"--- pipx location in use"
pipx environment --value PIPX_HOME
"--- install folders"
"$env:USERPROFILE\pipx\venvs\aictl", "$env:USERPROFILE\.local\pipx\venvs\aictl", "$env:LOCALAPPDATA\pipx\pipx\venvs\aictl", "$env:APPDATA\uv\tools\aictl" | ForEach-Object { "$(Test-Path $_)  $_" }
"--- pip"
python -m pip show aictl 2>$null | Select-String "^(Version|Location|Editable project location):"
"--- running"
aictl daemon serve --status
Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='aictl.exe'" | Where-Object CommandLine -match 'aictl' | Select-Object ProcessId, CommandLine | Format-List
```

On macOS and Linux:

```bash
which -a aictl
pipx environment --value PIPX_HOME
python3 -m pip show aictl
aictl daemon serve --status
pgrep -fl aictl
```

The current install is 1 launcher, normally in `.local\bin` (`.local/bin` on macOS and Linux), and 1 folder in the
`pipx` location. Anything else can be a leftover:

| You see | Meaning | Do this |
|---|---|---|
| A path in the `Scripts` or `bin` folder of Python, or a version under `pip` | A separate `pip` install | Run `python -m pip uninstall aictl` |
| `True` for a folder outside the `pipx` location | An old install in another location | Stop what runs from the folder, then delete the folder |
| `True` for `uv\tools\aictl` | A `uv` tool install | Run `uv tool uninstall aictl` |
| A dashboard or another aictl process | The process can be older than the update | Run `aictl daemon serve --stop`. If the process stays, end it |

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

It is read-only: it runs no tool and writes nothing. `aictl ps`, `aictl top` and the first dashboard screen show
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

## Change a settings file from the dashboard

In the Settings screen, every setting row and every file row has an Open file button. The file
drawer shows the file and offers **Edit file**: the whole text, a Save button and a Discard button.
Save writes the file in place, keeps a backup next to it (`<name>.bak.<time>`), and records the
change in aictl's mutation ledger. A JSON, TOML or YAML text that does not parse is refused and the
file stays as it was. A file changed by another program while you edited it is refused too, with a
Reload. Values that look like secrets are shown as `<redacted>`; a line you leave as shown keeps
its real value. Only files that aictl found in a scan can be edited, and only from this machine.
A `.context.toml` also offers **Deploy the context**, which runs `aictl ctx deploy` after you
confirm it. The Claude Code permission lists keep their own form (Change value) as well.

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
| The install window shows `os error 32` or `Attempt 1 of 5 did not finish` | Wait for the last message. See [Update aictl](#update-aictl) |
| `FAILED: aictl was not reinstalled`, or `A virtual environment already exists` | See [Common errors](../README.md#common-errors) |
| `Python packages:` shows the wrong source | See [Install from a private package index](../README.md#install-from-a-private-package-index) |
| `No such option: --index-url` | The `aictl` that ran is older than the option. Run `git pull`, then [Find a leftover copy](#find-a-leftover-copy) |
| An old version is still there after `pipx uninstall` | [Find a leftover copy](#find-a-leftover-copy) |
| `has more than 50000 folders` | aictl scans only part of that folder. Start the dashboard in one project, or use `--root` |
| `Too many samples: dropping those over 5000 per second` | Many samples arrived at once, so some data for that moment is missing. The message names the first metric dropped. If it repeats, start the dashboard in one project |
| The top bar shows `stale` | The refresh is behind, which a very large folder can cause. Start the dashboard in one project |
| The dashboard still shows the old version | Run `aictl daemon serve --stop`, start the dashboard again, then press Ctrl+F5 in the browser |
| `Cannot record health of …: database is locked. Writes running in this process: flush (N s)` | One write to the history has run for N seconds and the health record waited for it. The board shows the write under Machine, "aictl itself", and warns past a minute. The board still reads while a write runs. On Windows, a virus scanner that reads the history file on every write makes a flush take minutes: exclude the `aictl` folder under `%APPDATA%` from real-time scanning. That folder is in the roaming profile, so a large history also syncs at sign-in and sign-out; `[storage] db_path` in `config.toml` moves the history elsewhere, for example under `%LOCALAPPDATA%` |
