# TODO — Missing Claude Code Capabilities

Features from Claude Code that aictl doesn't yet cover.

## Agent Teams

Claude Code supports multi-agent coordination where a team lead manages teammates working independently in their own context windows. Key configuration surfaces:

- [ ] **`teammateMode` setting** — `in-process` | `auto` | `tmux`. Could be a `[setting:profile:key]` section in `.aictx`, emitting to `.claude/settings.local.json`.
- [ ] **Team-specific hooks** — `TeammateIdle` and `TaskCompleted` hook events. The hook event names are already supported by our generic hook system, but we could add fixture examples and documentation.
- [ ] **Quality gates** — Common pattern: `TeammateIdle` runs linters, `TaskCompleted` verifies completion with an agent hook. Could ship as a template/example `.aictx`.
- [ ] **Team templates** — Pre-configured team compositions (e.g., "research team", "refactor team") as `.aictx` examples or plugin presets.

## Plugin Ecosystem

`aictl plugin build` generates the structure, but more integration is possible:

- [ ] **Plugin import** — `aictl import` should detect and read from `.claude-plugin/` directories, importing their skills, commands, hooks, and MCP configs back into `.aictx`.
- [ ] **Plugin test harness** — Run `claude --plugin-dir ./plugin` and verify the plugin loads correctly, skills are registered, and hooks fire.
- [ ] **Plugin metadata from `.aictx`** — Allow plugin manifest fields (name, version, author, description) to be specified in a `[plugin]` section in `.aictx` rather than only via CLI flags.
- [ ] **Plugin marketplace integration** — `aictl plugin publish` to submit to the official marketplace via the Console/Claude.ai submission endpoints.

## Hook Enhancements

- [ ] **HTTP hooks** — Claude Code supports `type: http` hooks with URL, headers, and `allowedEnvVars`. Document and test this in the `.aictx` format.
- [ ] **Prompt hooks** — `type: prompt` hooks that invoke an LLM to evaluate tool use. Document and add examples.
- [ ] **Hook script scaffolding** — `aictl init hooks` to generate example hook scripts (block-rm.sh, lint-on-write.sh, etc.) alongside the `.aictx` definitions.
- [ ] **Hook events coverage** — Document all supported Claude Code hook events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `Stop`, `SubagentStart`, `SubagentStop`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`.

## Settings Management

- [ ] **`[setting:profile:key]` section** — Deploy arbitrary settings to `.claude/settings.local.json` (permissions, env vars, teammateMode, etc.) beyond just hooks.
- [ ] **Permission rules** — Express allowed tool patterns (e.g., `Bash(npm run *)`) in `.aictx`, emit to settings permissions.
- [ ] **Environment variables** — `[env:profile]` section to set env vars via `SessionStart` hook or `settings.json` `env` field.

## Windsurf Emitter

- [ ] **Windsurf emit** — Currently discovery-only. Add emitter for `.windsurfrules`, `.windsurf/rules/*.md`, and Windsurf MCP config.
- [ ] **Windsurf import** — Read from Windsurf native files.

## Additional Tool Features

- [ ] **Cursor agents** — Cursor reads `AGENTS.md` but doesn't have its own agent system. Track if Cursor adds native agent support.
- [ ] **Copilot hooks** — Track if GitHub Copilot adds a hook/lifecycle system.
- [ ] **Multi-tool hook parity** — When other tools add hooks, extend emitters to support them.

## Developer Experience

- [ ] **`aictl init`** — Scaffold a starter `.context.aictx` with common sections and examples.
- [ ] **`aictl diff`** — Show what would change between current deployed files and a new deploy (useful before profile switches).
- [ ] **`aictl validate`** — Lint `.aictx` files for malformed JSON, unknown section types, missing profiles, etc.
- [ ] **Watch mode** — `aictl deploy --watch` to re-deploy on `.aictx` file changes.


## Using ignore files

Many ai tools support ignore files to exclude certain files or directories from being processed. For example, you could have a `.aictlignore` file that lists patterns of files to ignore when deploying or running hooks. This can help prevent sensitive files from being exposed to the AI, or simply reduce noise by ignoring irrelevant files.

This is also relevant for skipping the files for different tool than the one running. So when we run claude-cli, we should ignore copilot files, and vice versa. This can be achieved by having tool-specific ignore files, like `.claudeignore` and `.copilotignore`, and configuring the tools to respect those when processing files.


## Add per tool enabled features
Some features may only be relevant for certain tools. For example, the `teammateMode` setting is specific to Claude Code. We could add a section in the documentation that lists which features are enabled for which tools, and also add checks in the CLI to warn if a user tries to use a feature that isn't supported by their tool. For example, if a user tries to set `teammateMode` in their `.aictx` but they're using Copilot CLI, we could emit a warning that this setting is only applicable to Claude Code.


## Missing files

While claude was working on a plan, it clearly had plan directory where it was writing, but these files where not seen in the tool live dashboard. We should investigate if there are any files that are being generated by the tools but not being picked up by our dashboard, and add support for those as needed. This could involve adding new emitters to capture those files, or updating our file scanning logic to include additional directories or file patterns. see [`screenshot-plan-files`](/Users/zvi/Projects/aictl/screenshot-plan-files.png) for an example of files that were generated but not seen in the dashboard.


## Telemetry and Usage Tracking (for supported tools)
Some tools support telemetry and usage tracking. Consider also the ability of Claude Code to expose https://code.claude.com/docs/en/monitoring-usage and similar exists for github-copilot-cli and possibly others


## Session state and history
Some tools have the concept of a session with state and history (e.g., Claude Code's session transcripts). We could add support for capturing and displaying this session history in the dashboard, which would provide valuable context for understanding how the AI is being used over time. This could involve adding a new tab for session history, and implementing the necessary backend logic to capture and serve this data.

## Show accumulated token usage over time
The Token Budget tab currently shows a point-in-time snapshot of token usage. It would be valuable to track and visualize token usage over time, so users can see trends and identify when token usage spikes. This could be implemented as a time-series graph in the Token Budget tab, showing the accumulated tokens used over the course of a session or across sessions. This would require changes to the backend to track token usage history, and frontend changes to display the graph.
In same way also network usage, memory usage, and other relevant metrics could be tracked and visualized over time to provide a more comprehensive view of resource consumption by the AI tools.

## Add aipolice
Aipolice is a tool that monitors and enforces policies on AI tool usage. It can be used to set rules around which tools can be used, what actions they can perform, and to track compliance with these rules. Integrating Aipolice into our dashboard would allow users to define and enforce policies for their AI tools directly from the dashboard interface. This could involve adding a new section for policy management, where users can create and manage their Aipolice policies, and also display any policy violations or alerts in the dashboard.
One example: aipolice needs to verify ai-tools are not pushing to git private data, personal names, or secrets. This can be done by setting up an Aipolice policy that scans for sensitive information in the files being processed by the AI tools, and then enforcing rules to block or alert on any violations. This would help users maintain control over their data and ensure that sensitive information is not inadvertently exposed through their AI tool usage.
aipolice can also check for platform independence, ensuring that the AI tools and their configurations work across different operating systems and environments. This can be achieved by defining policies that test the compatibility of tools and configurations in various environments, and then providing feedback or blocking usage if incompatibilities are detected. This would help users ensure that their AI tool setups are robust and portable across different platforms.
aipolice can also enforce acl and per-agent\session policies
aipolice can invoke aiinvestigator for post-hoc analysis of incidents and policy violations, providing insights into what happened and how to prevent it in the future. 

## Agent teams and visualization of agent interactions
If we add support for Claude Code's agent teams, it would be valuable to also visualize the interactions between agents in the dashboard. This could involve showing a graph of agent interactions, where nodes represent agents and edges represent communication or task handoffs between them. This would provide users with a clear view of how their agents are collaborating and coordinating, and could help identify bottlenecks or inefficiencies in their agent teams. Additionally, we could display the status and activity of each agent in the team, allowing users to monitor their performance and identify any issues that arise during their operation. This would enhance the overall visibility and manageability of agent teams within the dashboard, making it easier for users to optimize their AI workflows.
This is also availiable in github-cli and other tools, so we should track and visualize it for those as well if possible.


## Measuring external API calls and their latency
Many AI tools make external API calls (e.g., to language models, databases, or other services). It would be valuable to track and visualize these API calls in the dashboard, including their frequency and latency. This could be implemented by adding instrumentation to the backend to capture API call data, and then displaying this data in a new section of the dashboard. For example, we could show a list of recent API calls, along with their response times and any errors that occurred. We could also provide aggregate metrics, such as the total number of API calls made over a session, average latency, and error rates. This would help users understand the external dependencies of their AI tools and identify any performance issues related to API calls.