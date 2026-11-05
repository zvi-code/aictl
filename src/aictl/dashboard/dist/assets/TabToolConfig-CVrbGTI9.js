import{x as w,T as f,m as t}from"./index-CCFR6Z_S.js";import{S as $,a as k,I as m,T as C}from"./app-Cv8UlFCj.js";import{L as h,C as y}from"./useSse-BxCm98rI.js";const b={OTel:{enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats)."},"Agent Mode":{enabled:"Whether agent/agentic mode is active."},Agent:{enabled:"Whether agent/agentic mode is active."},"Claude (Anthropic)":{temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage."},"Cowork (Autonomous)":{webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."}},A={autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks."};function S(e,s){return s&&b[s]&&b[s][e]||A[e]||""}function _({v:e}){if(e===!0)return t`<span style="color:var(--green);font-weight:600">on</span>`;if(e===!1)return t`<span style="color:var(--red)">off</span>`;if(e==null||e==="")return t`<span class="text-muted">—</span>`;if(Array.isArray(e))return t`<span class="mono text-muted" style="font-size:var(--fs-xs)"
      title=${JSON.stringify(e)}>${e.length} item${e.length===1?"":"s"}</span>`;if(typeof e=="object"){const s=Object.keys(e).length,r=Object.keys(e).slice(0,3).join(", ");return t`<span class="mono text-muted" style="font-size:var(--fs-xs);max-width:20ch;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
      title=${JSON.stringify(e,null,2)}>${s} key${s===1?"":"s"}${r?": "+r+(s>3?"…":""):""}</span>`}return t`<span class="mono">${String(e)}</span>`}function u({k:e,v:s,indent:r,group:l}){const o=e.replace(/([A-Z])/g," $1").replace(/^./,n=>n.toUpperCase()),i=S(e,l);return t`<div
    title=${i}
    style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);
           padding:3px ${r?"var(--sp-6)":"var(--sp-4)"};font-size:var(--fs-sm);
           border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
           cursor:${i?"help":"default"}">
    <span style="color:var(--fg2)">${o}${i?t`<span style="color:var(--fg3);margin-left:3px;font-size:var(--fs-xs)">?</span>`:""}</span>
    <${_} v=${s}/>
  </div>`}function x({otel:e}){if(!e||!e.enabled&&!e.source)return null;const s=e.enabled;return t`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:${s?"var(--green)":"var(--fg3)"};padding:var(--sp-2) var(--sp-4) var(--sp-1)">
      OpenTelemetry ${s?"● on":"○ off"}
    </div>
    <div style="border:1px solid ${s?"var(--green)":"var(--bg2)"};border-radius:4px;overflow:hidden;
                background:${s?"color-mix(in srgb,var(--green) 4%,transparent)":"transparent"}">
      ${s&&t`<${u} group="OTel" k="exporter" v=${e.exporter||"—"}/>`}
      ${e.endpoint&&t`<${u} group="OTel" k="endpoint" v=${e.endpoint}/>`}
      ${e.file_path&&t`<${u} group="OTel" k="file_path" v=${e.file_path}/>`}
      ${e.capture_content!==void 0&&t`<${u} group="OTel" k="capture_content" v=${!!e.capture_content}/>`}
      ${!s&&e.source&&t`<${u} group="OTel" k="source" v=${e.source}/>`}
    </div>
  </div>`}function v({name:e,items:s}){const r=Object.entries(s);return r.length?t`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">${e}</div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${r.map(([l,o])=>t`<${u} key=${l} k=${l} v=${o} group=${e}/>`)}
    </div>
  </div>`:null}function O({models:e,configFiles:s}){if(!e||!e.length)return null;const r={workspace:"var(--accent)",user:"var(--green)",default:"var(--fg3)"},l={workspace:"workspace",user:"user",default:"default"};return t`<div style="margin-bottom:var(--sp-4)">
    <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
                color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1);
                display:flex;align-items:baseline;gap:var(--sp-2)">
      <span>Configurable Models</span>
      <span class="text-muted" style="font-weight:400;text-transform:none;letter-spacing:normal;font-size:var(--fs-xs)">
        — VS Code settings the user can override
      </span>
    </div>
    <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
      ${e.map(o=>t`<div key=${o.key} title=${o.description||""}
        style="display:flex;flex-direction:column;gap:2px;padding:var(--sp-2) var(--sp-4);
               border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);
               cursor:${o.description?"help":"default"}">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-4);font-size:var(--fs-sm)">
          <span style="color:var(--fg2);font-weight:500">${o.label}</span>
          <span style="display:flex;align-items:baseline;gap:var(--sp-2)">
            ${o.source!=="default"?t`<span class="mono" style="font-weight:600">${o.value}</span>`:t`<span class="text-muted">— ${o.default_hint||"default"}</span>`}
            <span class="badge" style="background:${r[o.source]||"var(--fg3)"};
                  color:var(--on-status);font-size:var(--fs-2xs)">${l[o.source]||o.source}</span>
          </span>
        </div>
        <div class="mono text-muted" style="font-size:var(--fs-2xs);overflow:hidden;
             text-overflow:ellipsis;white-space:nowrap" title=${o.key}>${o.key}</div>
      </div>`)}
      ${s&&s.length>0&&t`<div style="padding:var(--sp-2) var(--sp-4);
        background:color-mix(in srgb,var(--bg2) 40%,transparent);font-size:var(--fs-2xs);color:var(--fg3)">
        <span style="text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-right:var(--sp-2)">
          Edit in
        </span>
        ${s.map((o,i)=>t`<span key=${o} class="mono" title=${o}
          style="margin-right:var(--sp-2)">${o}${i<s.length-1?",":""}</span>`)}
      </div>`}
    </div>
  </div>`}function T({cfg:e,label:s}){var p,c;const r=y[e.tool]||"var(--fg2)",l=Object.entries(e.feature_groups||{}),o=new Set(["agent_historySummarizationMode","agent_maxRequests","debug_requestLoggerMaxEntries","planModel","implementModel"]);for(const a of e.configurable_models||[])typeof(a==null?void 0:a.key)=="string"&&a.key.startsWith("github.copilot.")&&o.add(a.key.replace("github.copilot.",""));const i=Object.entries(e.settings||{}).filter(([a])=>!o.has(a)),n=(e.configurable_models||[]).some(a=>a&&a.source!=="default");return((p=e.otel)==null?void 0:p.enabled)||((c=e.otel)==null?void 0:c.source)||l.length||i.length||(e.hints||[]).length||(e.mcp_servers||[]).length||(e.extensions||[]).length||n?t`<div style="background:var(--bg);border:2px solid ${r};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${r} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${r}">
      <span><${C} tool=${e.tool} size="1em"/></span>
      <span style="font-weight:700;font-size:var(--fs-base);color:var(--fg)">${s||e.tool}</span>
      ${e.model&&t`<span class="badge mono">${e.model}</span>`}
      ${e.auto_update===!0&&t`<span class="badge">auto-update on</span>`}
      ${e.auto_update===!1&&t`<span class="badge badge--muted">auto-update off</span>`}
      ${e.launch_at_startup===!0&&t`<span class="badge" style="background:var(--green);color:var(--on-status)">auto-start</span>`}
      ${e.launch_at_startup===!1&&t`<span class="badge badge--muted">no auto-start</span>`}
    </div>
    <div style="padding:var(--sp-4);flex:1">
      <${x} otel=${e.otel}/>
      ${l.map(([a,g])=>t`<${v} key=${a} name=${a} items=${g}/>`)}
      <${O} models=${e.configurable_models} configFiles=${e.config_files}/>
      ${i.length>0&&t`<${v} name="Settings" items=${Object.fromEntries(i)}/>`}
      ${(e.mcp_servers||[]).length>0&&t`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">MCP Servers</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.mcp_servers.map(a=>t`<span key=${a} class="pill mono">${a}</span>`)}
        </div>
      </div>`}
      ${(e.extensions||[]).length>0&&t`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Extensions</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4);display:flex;flex-wrap:wrap;gap:var(--sp-2)">
          ${e.extensions.map(a=>t`<span key=${a} class="pill mono" style="font-size:var(--fs-2xs)">${a}</span>`)}
        </div>
      </div>`}
      ${(e.hints||[]).length>0&&t`<div style="padding:var(--sp-3) var(--sp-4);border-left:3px solid var(--orange);
          background:color-mix(in srgb,var(--orange) 8%,transparent);border-radius:0 4px 4px 0">
        ${e.hints.map((a,g)=>t`<div key=${g} class="text-orange" style="font-size:var(--fs-sm);padding:1px 0">
          <span style="margin-right:var(--sp-2)">💡</span>${a}
        </div>`)}
      </div>`}
    </div>
  </div>`:null}function z({cfg:e}){var i,n,d,p;if(!e)return null;const s=Object.entries(e.feature_groups||{});if(!s.length&&!((i=e.otel)!=null&&i.enabled)&&!((n=e.otel)!=null&&n.source))return null;const l=(((d=e.feature_groups)==null?void 0:d.Safety)||{}).globalAutoApprove===!0,o=(((p=e.feature_groups)==null?void 0:p.Agent)||{}).autoReply===!0;return t`<div style="background:var(--bg);border:2px solid var(--vscode);border-radius:6px;overflow:hidden;grid-column:span 2">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,var(--vscode) 12%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid var(--vscode)">
      <span>🔷</span>
      <span style="font-weight:700;font-size:var(--fs-base);color:var(--vscode)">VS Code — AI Platform Settings</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">chat.* — applies to all AI tools</span>
      ${l&&t`<span class="badge" style="margin-left:auto;background:var(--red);color:var(--on-status);font-weight:700"><${m} name="alert-triangle" size="0.9em"/> YOLO MODE ON</span>`}
      ${!l&&o&&t`<span class="badge" style="margin-left:auto;background:var(--orange);color:var(--on-status)"><${m} name="alert-triangle" size="0.9em"/> auto-reply on</span>`}
    </div>
    <div style="padding:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--sp-4)">
      <${x} otel=${e.otel}/>
      ${s.map(([c,a])=>t`<${v} key=${c} name=${c} items=${a}/>`)}
    </div>
  </div>`}function L({snap:e}){var o,i,n;const s=y.aictl||"var(--fg2)",r=Object.entries(((o=e==null?void 0:e.live_monitor)==null?void 0:o.diagnostics)||{}),l=[...((i=e==null?void 0:e.live_monitor)==null?void 0:i.workspace_paths)||[],...((n=e==null?void 0:e.live_monitor)==null?void 0:n.state_paths)||[]];return!r.length&&!l.length?null:t`<div style="background:var(--bg);border:2px solid ${s};border-radius:6px;overflow:hidden;
                           display:flex;flex-direction:column;height:100%">
    <div style="padding:var(--sp-4) var(--sp-5);background:color-mix(in srgb,${s} 10%,var(--bg2));
                display:flex;align-items:center;gap:var(--sp-3);border-bottom:2px solid ${s}">
      <span><${m} name="settings" size="1em"/></span>
      <span style="font-weight:700;font-size:var(--fs-base);color:var(--fg)">aictl</span>
      <span class="text-muted" style="font-size:var(--fs-sm)">monitoring engine</span>
    </div>
    <div style="padding:var(--sp-4);flex:1">
      ${r.length>0&&t`<div style="margin-bottom:var(--sp-4)">
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Collectors</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden">
          ${r.map(([d,p])=>{const c=p.status==="active";return t`<div key=${d} title=${p.detail||""} style="display:flex;align-items:baseline;gap:var(--sp-4);padding:3px var(--sp-4);
                font-size:var(--fs-sm);border-bottom:1px solid color-mix(in srgb,var(--bg2) 60%,transparent);cursor:help">
              <span class="mono" style="flex:1">${d}</span>
              <span style="color:var(--fg3)">${p.mode||""}</span>
              <span style="color:${c?"var(--green)":"var(--orange)"}">
                ${c?"●":"○"} ${p.status||"unknown"}
              </span>
            </div>`})}
        </div>
      </div>`}
      ${l.length>0&&t`<div>
        <div style="font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg3);padding:var(--sp-2) var(--sp-4) var(--sp-1)">Monitored Roots</div>
        <div style="border:1px solid var(--bg2);border-radius:4px;padding:var(--sp-3) var(--sp-4)">
          ${l.map((d,p)=>t`<div key=${p} class="mono text-muted" style="font-size:var(--fs-xs);padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${d}>${d}</div>`)}
        </div>
      </div>`}
    </div>
  </div>`}function q(){const{snap:e,enabledTools:s=null}=w($),r=f(()=>e!=null&&e.tool_configs?e.tool_configs:[],[e]),l=f(()=>{const n={};return((e==null?void 0:e.tools)||[]).forEach(d=>{n[d.tool]=d.label}),n},[e]);if(!e)return t`<p class="loading-state">Loading...</p>`;const o=r.find(n=>n.tool==="vscode"),i=r.filter(n=>n.tool!=="vscode");return!i.length&&!o&&!h(s)?t`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`:t`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-5)">
    ${!i.length&&h(s)&&t`<div style="grid-column:1/-1">
      <${k} enabledTools=${s} snap=${e} what="tool configuration cards"/>
    </div>`}
    ${o&&t`<${z} cfg=${o}/>`}
    ${i.map(n=>t`<${T} key=${n.tool} cfg=${n} label=${l[n.tool]||n.tool}/>`)}
    <${L} snap=${e}/>
  </div>`}export{q as default};
