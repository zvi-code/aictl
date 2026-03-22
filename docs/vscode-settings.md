## Complete VS Code `settings.json` Configuration for GitHub Copilot

### 1. General Settings

| Setting | Default | Description |
|---|---|---|
| `chat.commandCenter.enabled` | `true` | Show Chat menu in title bar |
| `workbench.settings.showAISearchToggle` | `true` | AI search in Settings editor |
| `workbench.commandPalette.experimental.askChatLocation` | `"chatView"` | Where Command Palette asks chat questions *(Experimental)* |
| `search.searchView.semanticSearchBehavior` | `"manual"` | When to run semantic search *(Preview)* |
| `search.searchView.keywordSuggestions` | `false` | Keyword suggestions in Search view *(Preview)* |
| `chat.disableAIFeatures` | `false` | Kill switch for all built-in AI features |

### 2. Code Editing / Inline Suggestions

| Setting | Default | Description |
|---|---|---|
| `github.copilot.editor.enableCodeActions` | `true` | Show Copilot commands as Code Actions |
| `github.copilot.renameSuggestions.triggerAutomatically` | `true` | Generate rename suggestions |
| `github.copilot.enable` | `{ "*": true, "plaintext": false, "markdown": false, "scminput": false }` | Per-language enable/disable of inline suggestions |
| `github.copilot.nextEditSuggestions.enabled` | `true` | Enable Next Edit Suggestions (NES) |
| `editor.inlineSuggest.edits.allowCodeShifting` | `"always"` | Allow NES to shift code |
| `editor.inlineSuggest.edits.renderSideBySide` | `"auto"` | Side-by-side vs. below rendering for NES |
| `github.copilot.nextEditSuggestions.fixes` | `true` | NES based on diagnostics/squiggles |
| `editor.inlineSuggest.minShowDelay` | `0` | Delay (ms) before showing inline suggestions |

### 3. Chat Settings

| Setting | Default | Description |
|---|---|---|
| `github.copilot.chat.localeOverride` | `"auto"` | Override chat response locale |
| `github.copilot.chat.useProjectTemplates` | `true` | Use GitHub projects as starters for `/new` |
| `github.copilot.chat.scopeSelection` | `false` | Prompt for symbol scope with `/explain` |
| `github.copilot.chat.terminalChatLocation` | `"chatView"` | Where terminal chat opens |
| `chat.detectParticipant.enabled` | `true` | Chat participant detection |
| `chat.checkpoints.enabled` | `true` | Enable checkpoints |
| `chat.checkpoints.showFileChanges` | `false` | Show file change summary per request |
| `chat.editRequests` | `"inline"` | Editing previous chat requests |
| `chat.editor.fontFamily` | `"default"` | Font in chat code blocks |
| `chat.editor.fontSize` | `14` | Font size (px) in chat code blocks |
| `chat.editor.fontWeight` | `"default"` | Font weight in chat code blocks |
| `chat.editor.lineHeight` | `0` | Line height (px) in chat code blocks |
| `chat.editor.wordWrap` | `"off"` | Word wrap in chat code blocks |
| `chat.editing.confirmEditRequestRemoval` | `true` | Confirm before undoing an edit |
| `chat.editing.confirmEditRequestRetry` | `true` | Confirm before redoing last edit |
| `chat.editing.autoAcceptDelay` | `0` | Auto-accept delay (ms), 0 = disabled |
| `chat.fontFamily` | `"default"` | Font for Markdown in chat |
| `chat.fontSize` | `13` | Font size (px) for Markdown in chat |
| `chat.notifyWindowOnConfirmation` | `true` | OS notification when user input needed |
| `chat.notifyWindowOnResponseReceived` | `true` | OS notification on response |
| `chat.requestQueuing.enabled` | `true` | Queue messages while request in progress *(Experimental)* |
| `chat.requestQueuing.defaultAction` | `"queue"` | Default action: `queue` or `steer` |
| `chat.tools.terminal.autoReplyToPrompts` | `false` | Auto-reply to terminal prompts |
| `chat.tools.terminal.terminalProfile.<platform>` | `""` | Terminal profile for chat commands |
| `chat.useAgentsMdFile` | `true` | Use `AGENTS.md` as context |
| `chat.math.enabled` | `false` | KaTeX math rendering *(Preview)* |
| `chat.viewTitle.enabled` | `true` | Show session title in header *(Preview)* |
| `github.copilot.chat.codesearch.enabled` | `false` | `#codebase` auto-discovers files *(Preview)* |
| `chat.emptyState.history.enabled` | `false` | Recent history in empty chat *(Experimental)* |
| `chat.sendElementsToChat.enabled` | `true` | Send browser elements to chat *(Experimental)* |
| `chat.useNestedAgentsMdFiles` | `false` | Use `AGENTS.md` in subfolders *(Experimental)* |
| `github.copilot.chat.customOAIModels` | `[]` | Custom OpenAI-compatible models *(Experimental)* |
| `github.copilot.chat.edits.suggestRelatedFilesFromGitHistory` | `true` | Suggest related files from git *(Experimental)* |
| `chat.tips.enabled` | — | Contextual tips in Chat view *(Experimental)* |

### 4. Agent Settings

| Setting | Default | Description |
|---|---|---|
| `chat.agent.enabled` | `true` | Enable agents (ORG-manageable) |
| `chat.agent.maxRequests` | `25` | Max requests per agent session |
| `github.copilot.chat.agent.autoFix` | `true` | Auto-diagnose and fix generated code |
| `chat.mcp.access` | `true` | MCP server access control (ORG) |
| `chat.mcp.discovery.enabled` | `false` | Auto-discover MCP configs from other apps |
| `chat.mcp.serverSampling` | `{}` | Models exposed to MCP servers for sampling |
| `chat.mcp.apps.enabled` | `true` | MCP Apps rich UIs *(Experimental)* |
| `chat.mcp.autoStart` | `"newAndOutdated"` | Auto-start MCP servers on config change *(Experimental)* |
| `chat.tools.terminal.autoApprove` | `{ "rm": false, ... }` | Per-command auto-approve rules |
| `chat.tools.terminal.enableAutoApprove` | `true` | Enable terminal auto-approve (ORG) |
| `chat.tools.terminal.enforceTimeoutFromModel` | `true` | Enforce model-specified timeouts *(Experimental)* |
| `chat.tools.terminal.ignoreDefaultAutoApproveRules` | `false` | Ignore default auto-approve rules |
| `chat.tools.global.autoApprove` | `false` | Auto-approve ALL tools (ORG, security risk) |
| `chat.tools.urls.autoApprove` | `[]` | URL request/response auto-approve |
| `chat.tools.eligibleForAutoApproval` | `[]` | Tools eligible for auto-approval (ORG) *(Experimental)* |
| `chat.tools.terminal.blockDetectedFileWrites` | `"outsideWorkspace"` | Require approval for file writes *(Experimental)* |
| `chat.tools.terminal.sandbox.enabled` | `false` | Sandbox for terminal commands (macOS/Linux) *(Experimental)* |
| `chat.tools.terminal.sandbox.linuxFileSystem` | `{}` | Linux sandbox filesystem rules *(Experimental)* |
| `chat.tools.terminal.sandbox.macFileSystem` | `{}` | macOS sandbox filesystem rules *(Experimental)* |
| `chat.tools.terminal.sandbox.network` | `{}` | Sandbox network rules *(Experimental)* |
| `chat.agent.thinking.collapsedTools` | `"always"` | Collapse/expand tool call details *(Experimental)* |
| `chat.agent.thinkingStyle` | `"fixedScrolling"` | How thinking tokens display *(Experimental)* |
| `github.copilot.chat.newWorkspaceCreation.enabled` | `true` | Scaffold new workspace tool *(Experimental)* |
| `github.copilot.chat.agent.thinkingTool` | `false` | Thinking tool for agents *(Experimental)* |
| `github.copilot.chat.summarizeAgentConversationHistory.enabled` | `true` | Auto-summarize when context full *(Experimental)* |
| `github.copilot.chat.virtualTools.threshold` | `128` | Tool count for virtual tool grouping *(Experimental)* |

### 5. Agent Sessions

| Setting | Default | Description |
|---|---|---|
| `workbench.startupEditor` | — | Set to `"agentSessionsWelcomePage"` for agent sessions entry |
| `chat.viewSessions.enabled` | `true` | Show sessions list in Chat view |
| `chat.agentsControl.enabled` | `true` | Agent status indicator in command center *(Experimental)* |
| `chat.agentsControl.clickBehavior` | `"cycle"` / `"default"` | Click behavior on agent indicator *(Experimental)* |
| `chat.unifiedAgentsBar.enabled` | `false` | Unified chat+search control *(Experimental)* |

### 6. Inline Chat

| Setting | Default | Description |
|---|---|---|
| `inlineChat.defaultModel` | — | Default model for inline chat |
| `inlineChat.renderMode` | `"hover"` | `hover` or `zone` display *(Experimental)* |
| `inlineChat.finishOnType` | `false` | Finish session on typing outside |
| `inlineChat.holdToSpeech` | `true` | Hold shortcut for speech |
| `editor.inlineSuggest.syntaxHighlightingEnabled` | `true` | Syntax highlighting for inline suggestions |
| `inlineChat.affordance` | `"off"` | Visual hint on text selection *(Experimental)* |
| `inlineChat.lineEmptyHint` | `false` | Hint on empty line *(Experimental)* |
| `inlineChat.lineNaturalLanguageHint` | `true` | Trigger on natural-language lines *(Experimental)* |
| `github.copilot.chat.editor.temporalContext.enabled` | `false` | Include recently viewed files *(Experimental)* |

### 7. Code Review

| Setting | Default | Description |
|---|---|---|
| `github.copilot.chat.reviewSelection.enabled` | `true` | AI code review for selection *(Preview)* |
| `github.copilot.chat.reviewSelection.instructions` | `[]` | Custom review instructions *(Preview)* |

### 8. Custom Instructions

| Setting | Default | Description |
|---|---|---|
| `chat.instructionsFilesLocations` | `{ ".github/instructions": true }` | Instruction file search locations |
| `chat.includeApplyingInstructions` | `true` | Auto-add matching `applyTo` instructions |
| `chat.includeReferencedInstructions` | `false` | Auto-add Markdown-linked instructions |
| `github.copilot.chat.codeGeneration.useInstructionFiles` | `true` | Use `.github/copilot-instructions.md` |
| `github.copilot.chat.commitMessageGeneration.instructions` | `[]` | Custom commit message instructions *(Experimental)* |
| `github.copilot.chat.pullRequestDescriptionGeneration.instructions` | `[]` | Custom PR description instructions *(Experimental)* |

### 9. Prompt Files

| Setting | Default | Description |
|---|---|---|
| `chat.promptFilesLocations` | `{ ".github/prompts": true }` | Prompt file search locations |
| `chat.promptFilesRecommendations` | `[]` | Prompt file recommendations on new session |

### 10. Custom Agents

| Setting | Default | Description |
|---|---|---|
| `chat.agentFilesLocations` | `{ ".github/agents": true }` | Agent file search locations |
| `chat.customAgentInSubagent.enabled` | `false` | Custom agent with subagents *(Experimental)* |
| `github.copilot.chat.cli.customAgents.enabled` | `false` | Custom agents from background sessions *(Experimental)* |

### 11. Agent Skills

| Setting | Default | Description |
|---|---|---|
| `chat.useAgentSkills` | `true` | Enable agent skills |
| `chat.agentSkillsLocations` | `{ ".github/skills": true, ".claude/skills": true, "~/.copilot/skills": true, "~/.claude/skills": true }` | Skills search locations |

### 12. Debugging

| Setting | Default | Description |
|---|---|---|
| `github.copilot.chat.startDebugging.enabled` | `true` | `/startDebugging` intent *(Preview)* |
| `github.copilot.chat.copilotDebugCommand.enabled` | `true` | `copilot-debug` terminal command *(Preview)* |

### 13. Testing

| Setting | Default | Description |
|---|---|---|
| `github.copilot.chat.generateTests.codeLens` | `false` | Generate tests CodeLens *(Experimental)* |
| `github.copilot.chat.setupTests.enabled` | `true` | `/setupTests` intent *(Experimental)* |

### 14. Notebook

| Setting | Default | Description |
|---|---|---|
| `notebook.experimental.generate` | `true` | Generate action for code cells *(Experimental)* |
| `github.copilot.chat.edits.newNotebook.enabled` | `true` | Notebook tool in edit mode *(Experimental)* |
| `github.copilot.chat.notebook.followCellExecution.enabled` | `false` | Follow executing cell *(Experimental)* |

### 15. Accessibility

| Setting | Default | Description |
|---|---|---|
| `inlineChat.accessibleDiffView` | `"auto"` | Accessible diff viewer |
| `accessibility.signals.chatRequestSent` | `{ "sound": "auto", "announcement": "auto" }` | Signal on request sent |
| `accessibility.signals.chatResponseReceived` | `{ "sound": "auto" }` | Signal on response |
| `accessibility.signals.chatEditModifiedFile` | `{ "sound": "auto" }` | Signal on file modified by edit |
| `accessibility.signals.chatUserActionRequired` | `{ "sound": "auto", "announcement": "auto" }` | Signal when action needed |
| `accessibility.signals.lineHasInlineSuggestion` | `{ "sound": "auto" }` | Signal for inline suggestion |
| `accessibility.signals.nextEditSuggestion` | `{ "sound": "auto", "announcement": "auto" }` | Signal for NES available |
| `accessibility.verboseChatProgressUpdates` | `true` | Verbose chat progress |
| `accessibility.verbosity.inlineChat` | `true` | Inline chat help info |
| `accessibility.verbosity.inlineCompletions` | `true` | Inline completions info |
| `accessibility.verbosity.panelChat` | `true` | Panel chat help info |
| `accessibility.voice.keywordActivation` | `"off"` | "Hey Code" activation |
| `accessibility.voice.autoSynthesize` | `"off"` | Auto read-aloud responses |
| `accessibility.voice.speechTimeout` | `1200` | Speech recognition timeout (ms) |

### 16. Additional / Advanced Settings (from other sources)

| Setting | Default | Description |
|---|---|---|
| `github.copilot.advanced.authProvider` | — | Set to `"github-enterprise"` for GHE auth |
| `github.copilot.chat.otel.outfile` | — | OTel JSON-lines output file path |
| `github.copilot.chat.otel.captureContent` | — | Capture prompts/responses in OTel spans |
| `github.copilot.chat.agentDebugLog.enabled` | — | Enable agent debug logs + `/troubleshoot` |
| `github.copilot.chat.agentDebugLog.fileLogging.enabled` | — | Write debug events to disk |
| `chat.hookFilesLocations` | — | Additional hook file locations *(Preview)* |
| `chat.useCustomAgentHooks` | — | Hooks in `.agent.md` frontmatter *(Preview)* |
| `chat.plugins.marketplaces` | `["github/copilot-plugins", "github/awesome-copilot"]` | Plugin marketplace repos *(Experimental)* |
| `chat.pluginLocations` | — | Local agent plugins *(Experimental)* |
| `imageCarousel.chat.enabled` | — | Image carousel in chat *(Experimental)* |

---

A few notes relevant to your aictl and reference library work:

**MCP config is separate** — MCP config lives in `mcp.json`, not `settings.json`. The root key is `"servers"`, not `"mcpServers"` — copy-pasting a Cursor config without changing this key is the most common setup mistake.

**Deprecated settings** — `github.copilot.chat.anthropic.thinking.effort` and `github.copilot.chat.responsesApiReasoningEffort` have been deprecated in favor of per-model thinking effort in the model picker.

**Skills cross-pollination** — the `chat.agentSkillsLocations` default now includes both `.github/skills` and `.claude/skills` paths, which is interesting for your context file design since it means VS Code Copilot and Claude Code can share skill definitions from the same repo structure.