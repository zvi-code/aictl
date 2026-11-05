# Microsoft 365 Copilot (`copilot365`)

Checked 2026-11-05 against Microsoft Learn. Status per row: documented (primary source given) or unverified.

Microsoft 365 Copilot is a cloud service. Conversations, model calls and usage live in the Microsoft 365 tenant, so aictl reports `copilot365` as a project/install detector only. The tool-config output carries `local_data` (sessions, tokens, cost, prompts, responses all `false`): "not available from this machine", not zero.

## Observable locally

| Item | Status | Source |
|---|---|---|
| Agent project files: `appPackage/manifest.json` (`copilotAgents.declarativeAgents[].file`), declarative agent manifest, `m365agents.yml` | documented | learn.microsoft.com/microsoft-365/extensibility/schema/ ; .../copilot/extensibility/declarative-agent-manifest-1.9 ; .../microsoftteams/platform/toolkit/create-new-project |
| Declarative agent rules: `version`, `name` (100), `description` (1000), `instructions` (8000) required; latest schema v1.9 | documented | declarative-agent-manifest-1.9 and -1.6 |
| App name: now "Microsoft Copilot" (was Microsoft 365 Copilot app); desktop on Windows and macOS | documented | learn.microsoft.com/copilot/plan/copilot-app-overview |
| Package name `MICROSOFT.COPILOT` (AppLocker rule) | documented | learn.microsoft.com/windows/client-management/manage-windows-copilot |
| Install check: folder `%LOCALAPPDATA%\Packages\Microsoft.Copilot_8wekyb3d8bbwe` | unverified (family name built from the documented package name and publisher id seen in a Q&A event log) | learn.microsoft.com/answers/a/12220711 |
| Process `Copilot.exe` | unverified (community Q&A log, consumer package) | same |
| Network hosts: `*.cloud.microsoft`, `copilot.cloud.microsoft`, `*.office.com` (WSS), `msedge.api.cdp.microsoft.com`, `config.edge.skype.com`, `*.office.net`, `login.microsoftonline.com` | documented as required allow-list entries; which process uses which is unverified | learn.microsoft.com/copilot/plan/add-copilot-endpoints-allowlist ; .../copilot/implement/faq-deploy-microsoft-365-copilot-app |
| Copilot inside Word/Excel/Outlook/Teams | documented to exist; no local files or processes identified | learn.microsoft.com/copilot/plan/copilot-overview |

## Not available from this machine

| Item | Why |
|---|---|
| Prompts, responses, sessions | Stored in the tenant. |
| Tokens, cost | Not exposed locally. |
| Admin usage reports, audit logs | Tenant-side; need admin access. Out of scope for local aictl. |

## Gaps

- No `copilot365` emitter is registered (`aictl ctx deploy` cannot write agent packages).
- Windows paths and process names above must be checked on a real Windows machine with the app installed.
- The `teamsapp.yml` sunset date "July 2026" in older notes has no source; the documented fact is that the toolkit was renamed and uses `m365agents.yml`.
