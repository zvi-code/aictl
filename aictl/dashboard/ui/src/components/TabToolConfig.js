import { useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { COLORS, ICONS } from '../utils.js';

// ─── Tooltip descriptions ────────────────────────────────────────
// Keyed by the setting/feature key that appears in feature_groups or settings.
const TIPS = {
  // OTel
  enabled:              'Whether OpenTelemetry export is active. Required for verified token counts and session traces.',
  exporter:             'Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.',
  endpoint:             'OTLP collector endpoint receiving telemetry data.',
  file_path:            'Local file path for telemetry output (file exporter).',
  capture_content:      'When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.',
  source:               'How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).',
  // Agent Mode
  'enabled':            'Whether agent/agentic mode is active.',
  autoFix:              'When on, the agent automatically attempts to fix errors it detects during a run without asking.',
  editorContext:        'Ensures the agent always includes your active editor file as primary context for every request.',
  largeResultsToDisk:   'Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.',
  historySummarizationMode: 'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',
  maxRequests:          'Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.',
  plugins:              'Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.',
  // Debug Logging
  fileLogging:          'Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.',
  requestLoggerMaxEntries: 'Number of recent LLM requests retained in the in-memory request logger for debugging.',
  // CLI Mode
  mcp:                  'Enables MCP server support when running in CLI/autonomous mode.',
  worktreeIsolation:    'When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.',
  autoCommit:           'The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.',
  branchSupport:        'Allows the CLI agent to create and switch git branches during a task.',
  // Memory
  local:                'Local in-process memory tool — agent can store and recall facts within a session.',
  github:               'GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).',
  viewImage:            'Allows the agent to read and process image files (requires a multimodal model).',
  // Session targets
  claudeTarget:         'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',
  autopilot:            'Autopilot mode allows the agent to execute tool calls without confirmation prompts. Use with caution.',
  // VS Code platform — Agent
  autopilot:            'Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.',
  autoReply:            'Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.',
  maxRequests:          'Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.',
  // VS Code platform — Safety
  terminalSandbox:      'Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.',
  terminalAutoApprove:  'Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.',
  autoApproveNpmScripts:'Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.',
  // VS Code platform — Context Files
  applyingInstructions: 'Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.',
  // VS Code platform — File Locations
  instructions:         'Search locations for .instructions.md files that are automatically attached to matching requests.',
  agents:               'Search locations for .agent.md custom agent definition files.',
  skills:               'Search locations for SKILL.md agent skill files.',
  prompts:              'Search locations for .prompt.md reusable prompt files.',
  // VS Code platform — MCP
  access:               'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',
  autostart:            '"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',
  discovery:            'Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).',
  // Hooks
  claudeHooks:          'When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).',
  customAgentHooks:     'When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.',
  locations:            'File paths where hook configuration files are loaded from. Relative to workspace root.',
  // Safety
  globalAutoApprove:    'YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.',
  autoReply:            'Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.',
  autoApprove:          'Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.',
  terminal_sandbox:     'Runs terminal commands in a sandboxed environment to prevent destructive operations.',
  // Context Files
  claudeMd:             'Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.',
  agentsMd:             'Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.',
  nestedAgentsMd:       'When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.',
  // Claude (Anthropic)
  thinkingBudget:       'Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.',
  thinkingEffort:       'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',
  temperature:          'Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.',
  webSearch:            'Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.',
  skipPermissions:      'Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.',
  // Claude Code settings
  effortLevel:          'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',
  hooks:                'Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).',
  installMethod:        'How Claude Code was installed (native, npm, homebrew, etc.).',
  hasCompletedOnboarding: 'Whether the initial Claude Code onboarding flow has been completed.',
  project_settings:     'A .claude/settings.json exists in this project with project-specific configuration.',
  project_permissions:  'Project settings include a permissions block controlling tool access.',
  // Claude Desktop modes
  sidebarMode:          'Controls whether Claude Desktop opens as a sidebar or full window.',
  trustedFolders:       'Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.',
  livePreview:          'Enables the live preview pane that shows rendered output during Code mode tasks.',
  webSearch:            'Allows Cowork mode to perform live web searches as part of autonomous tasks.',
  scheduledTasks:       'Enables Cowork mode to schedule and run tasks on a timer.',
  allowAllBrowserActions: 'Grants Cowork mode permission to take any browser action without per-action confirmation.',
};

function tip(key) {
  return TIPS[key] || '';
}

// ─── Value rendering ─────────────────────────────────────────────
function Val({v}) {
  if (v === true)  return html`<span style="color:var(--green);font-weight:600">on</span>`;
  if (v === false) return html`<span style="color:var(--red);opacity:0.8">off</span>`;
  if (v === null || v === undefined || v === '') return html`<span class="text-muted">—</span>`;
  if (typeof v === 'object') return html`<span class="mono" style="font-size:var(--fs-xs)">${JSON.stringify(v)}</span>`;
  return html`<span class="mono">${String(v)}</span>`;
}

function Row({k, v, indent}) {
  const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  const t = tip(k);
  return html`<div
    title=${t}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${indent?'var(--sp-6)':'var(--sp-4)'};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${t?'help':'default'}">
    <span style="color:var(--fg2)">${label}${t ? html`<span style="color:var(--fg3);margin-left:3px;font-size:0.6em">?</span>` : ''}</span>
    <${Val} v=${v}/>
  </div>`;
}

// ─── OTel block ──────────────────────────────────────────────────
function OTelBlock({otel}) {
  if (!otel || (!otel.enabled && !otel.source)) return null;
  const on = otel.enabled;
  return html`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${on?'var(--green)':'var(--fg3)'};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${on ? '● on' : '○ off'}
    </div>
    <div style="border:1px solid ${on?'var(--green)':'var(--bg2)'};border-radius:4px;overflow:hidden;
                background:${on?'color-mix(in srgb,var(--green) 4%,transparent)':'transparent'}">
      ${on && html`<${Row} k="exporter" v=${otel.exporter||'—'}/>`}
      ${otel.endpoint && html`<${Row} k="endpoint" v=${otel.endpoint}/>`}
      ${otel.file_path && html`<${Row} k="file_path" v=${otel.file_path}/>`}
      ${otel.capture_content !== undefined && html`<${Row} k="capture_content" v=${!!otel.capture_content}/>`}
      ${!on && otel.source && html`<${Row} k="source" v=${otel.source}/>`}
    </div>
  </div>`;
}

// ─── Feature group block ─────────────────────────────────────────
function GroupBlock({name, items}) {
  const entries = Object.entries(items);
  if (!entries.length) return null;
  return html`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${name}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${entries.map(([k,v]) => html`<${Row} key=${k} k=${k} v=${v}/>`)}
    </div>
  </div>`;
}

// ─── Per-tool config card ────────────────────────────────────────
function ToolConfigCard({cfg, label}) {
  const icon = ICONS[cfg.tool] || '🔹';
  const color = COLORS[cfg.tool] || 'var(--fg2)';
  const groups = Object.entries(cfg.feature_groups || {});
  const flatSettings = Object.entries(cfg.settings || {}).filter(([k]) =>
    !['agent_historySummarizationMode','agent_maxRequests','debug_requestLoggerMaxEntries',
      'planModel','implementModel'].includes(k)
  );
  const hasContent = cfg.otel?.enabled || cfg.otel?.source || groups.length ||
                     flatSettings.length || (cfg.hints||[]).length ||
                     (cfg.mcp_servers||[]).length || (cfg.extensions||[]).length;
  if (!hasContent) return null;

  return html`<div style="background:var(--bg);border:2px solid ${color};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${color} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${color}">
      <span>${icon}</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${color}">${label || cfg.tool}</span>
      ${cfg.model && html`<span class="badge mono">${cfg.model}</span>`}
      ${cfg.auto_update===true  && html`<span class="badge">auto-update on</span>`}
      ${cfg.auto_update===false && html`<span class="badge" style="opacity:0.6">auto-update off</span>`}
      ${cfg.launch_at_startup===true  && html`<span class="badge" style="background:var(--green);color:var(--bg)">auto-start</span>`}
      ${cfg.launch_at_startup===false && html`<span class="badge" style="opacity:0.6">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${OTelBlock} otel=${cfg.otel}/>
      ${groups.map(([name, items]) => html`<${GroupBlock} key=${name} name=${name} items=${items}/>`)}
      ${flatSettings.length > 0 && html`<${GroupBlock} name="Settings" items=${Object.fromEntries(flatSettings)}/>`}
      ${(cfg.mcp_servers||[]).length > 0 && html`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${cfg.mcp_servers.map(s => html`<span key=${s} class="pill mono">${s}</span>`)}
        </div>
      </div>`}
      ${(cfg.extensions||[]).length > 0 && html`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${cfg.extensions.map(e => html`<span key=${e} class="pill mono" style="font-size:var(--fs-2xs)">${e}</span>`)}
        </div>
      </div>`}
      ${(cfg.hints||[]).length > 0 && html`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${cfg.hints.map((h,i) => html`<div key=${i} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${h}
        </div>`)}
      </div>`}
    </div>
  </div>`;
}

// ─── VS Code platform card ───────────────────────────────────────
function VsCodeCard({cfg}) {
  if (!cfg) return null;
  const groups = Object.entries(cfg.feature_groups || {});
  if (!groups.length && !cfg.otel?.enabled && !cfg.otel?.source) return null;

  // Safety alerts — highlight dangerous settings
  const safety = cfg.feature_groups?.Safety || {};
  const yolo    = safety.globalAutoApprove === true;
  const noReply = (cfg.feature_groups?.Agent || {}).autoReply === true;

  return html`<div style="background:var(--bg);border:2px solid #007acc;border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,#007acc 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid #007acc">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:#007acc">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${yolo && html`<span class="badge" style="margin-left:auto;background:var(--red);color:#fff;font-weight:700">⚠ YOLO MODE ON</span>`}
      ${!yolo && noReply && html`<span class="badge" style="margin-left:auto;background:var(--orange);color:#fff">⚠ auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${OTelBlock} otel=${cfg.otel}/>
      ${groups.map(([name, items]) => html`<${GroupBlock} key=${name} name=${name} items=${items}/>`)}
    </div>
  </div>`;
}

// ─── aictl collector health card ────────────────────────────────
function AictlCard({snap}) {
  const color = COLORS['aictl'] || '#94a3b8';
  const diag = Object.entries((snap?.live_monitor?.diagnostics) || {});
  const paths = [...(snap?.live_monitor?.workspace_paths||[]), ...(snap?.live_monitor?.state_paths||[])];
  if (!diag.length && !paths.length) return null;
  return html`<div style="background:var(--bg);border:2px solid ${color};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${color} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${color}">
      <span>⚙️</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:${color}">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${diag.length > 0 && html`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${diag.map(([name, d]) => {
            const ok = d.status === 'active';
            return html`<div key=${name} title=${d.detail||''} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${name}</span>
              <span style="color:var(--fg3)">${d.mode||''}</span>
              <span style="color:${ok?'var(--green)':'var(--orange)'}">
                ${ok?'●':'○'} ${d.status||'unknown'}
              </span>
            </div>`;
          })}
        </div>
      </div>`}
      ${paths.length > 0 && html`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${paths.map((p,i) => html`<div key=${i} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${p}>${p}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`;
}

// ─── Tab ─────────────────────────────────────────────────────────
export default function TabToolConfig() {
  const {snap: s} = useContext(SnapContext);

  const configs = useMemo(() => {
    if (!s?.tool_configs) return [];
    return s.tool_configs;
  }, [s]);

  // Build label map from snap.tools
  const labelMap = useMemo(() => {
    const m = {};
    (s?.tools||[]).forEach(t => { m[t.tool] = t.label; });
    return m;
  }, [s]);

  if (!s) return html`<p class="loading-state">Loading...</p>`;
  if (!configs.length) return html`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;

  const vscodeCfg = configs.find(c => c.tool === 'vscode');
  const toolCfgs  = configs.filter(c => c.tool !== 'vscode');

  return html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${vscodeCfg && html`<${VsCodeCard} cfg=${vscodeCfg}/>`}
    ${toolCfgs.map(cfg => html`<${ToolConfigCard} key=${cfg.tool} cfg=${cfg} label=${labelMap[cfg.tool]||cfg.tool}/>`)}
    <${AictlCard} snap=${s}/>
  </div>`;
}
