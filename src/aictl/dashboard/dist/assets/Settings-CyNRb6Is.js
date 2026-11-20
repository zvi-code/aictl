import{c as e,g as t}from"./web-DoRvYF5e.js";import{A as n,E as r,O as i,P as a,Y as o,f as s,j as c,m as l,y as u}from"./index-DaFMbGSN.js";import{B as d,F as f,G as p,H as m,I as h,M as ee,P as te,R as g,U as _,j as ne,n as v,t as y,y as b}from"./PreactIsland-9I1yQL0i.js";import{t as re}from"./auditScope-2fHCFYu7.js";import{a as x,i as ie,n as ae,o as S,r as oe,s as C,t as se}from"./toolScope-CJVQtEbx.js";import{t as ce}from"./Icon-BTVhfeEw.js";import{n as le,t as w}from"./paths-B7l5ztsy.js";import{i as ue,r as T,t as E}from"./tableGrid-CU4JKFQo.js";import{i as de,l as D}from"./data-CONTHzn4.js";import{m as O}from"./Shell-BoC27wSP.js";function fe(e){if(!e)return!1;let t=(e.tagName||``).toLowerCase();return t===`input`||t===`textarea`||t===`select`||e.isContentEditable===!0}function pe({options:e=[],value:t,onChange:n,ariaLabel:r,class:i,className:a,...o}){let s=[`aictl-ui-segmented`,i,a].filter(Boolean).join(` `),c=f([]),l=r=>{if(!e.length)return;let i=Math.max(0,e.findIndex(e=>e.value===t)),a=null;r.key===`ArrowRight`||r.key===`ArrowDown`?a=(i+1)%e.length:r.key===`ArrowLeft`||r.key===`ArrowUp`?a=(i-1+e.length)%e.length:r.key===`Home`?a=0:r.key===`End`&&(a=e.length-1),a!=null&&(r.preventDefault(),n&&n(e[a].value),c.current[a]?.focus())};return _`<div
    class=${s}
    role="radiogroup"
    aria-label=${r||null}
    ...${o}
  >${e.map((e,r)=>{let i=e.value===t;return _`<button
      key=${e.value}
      ref=${e=>{c.current[r]=e}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${i?`true`:`false`}
      tabindex=${i?`0`:`-1`}
      onClick=${()=>n&&n(e.value)}
      onKeyDown=${l}
    >${e.icon?_`<${ce} name=${e.icon} size="0.9em"/>`:null}${e.label}</button>`})}</div>`}function me({enabledTools:e,snap:t,what:n=`this screen`}){let r=oe(e),i=S(e,t);return _`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${ce} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${r?`No tools are selected`:`The selected tools have no data here`}</div>
      <div class="panel-state__hint">${r?`The tool filter in the header has no tool ticked, so ${n} shows nothing. Tick a tool, or choose All tools.`:`${i.join(`, `)} ${i.length===1?`has`:`have`} nothing to show on ${n}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}var k={OTel:{enabled:`Whether OpenTelemetry export is active. Required for verified token counts and session traces.`,exporter:`Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.`,endpoint:`OTLP collector endpoint receiving telemetry data.`,file_path:`Local file path for telemetry output (file exporter).`,capture_content:`When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.`,source:`How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats).`},"Agent Mode":{enabled:`Whether agent/agentic mode is active.`},Agent:{enabled:`Whether agent/agentic mode is active.`},"Claude (Anthropic)":{temperature:`Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.`,webSearch:`Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage.`},"Cowork (Autonomous)":{webSearch:`Allows Cowork mode to perform live web searches as part of autonomous tasks.`,scheduledTasks:`Enables Cowork mode to schedule and run tasks on a timer.`,allowAllBrowserActions:`Grants Cowork mode permission to take any browser action without per-action confirmation.`}},he={autoFix:`When on, the agent automatically attempts to fix errors it detects during a run without asking.`,editorContext:`Ensures the agent always includes your active editor file as primary context for every request.`,largeResultsToDisk:`Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.`,historySummarizationMode:`Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.`,maxRequests:`Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.`,plugins:`Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.`,fileLogging:`Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.`,requestLoggerMaxEntries:`Number of recent LLM requests retained in the in-memory request logger for debugging.`,mcp:`Enables MCP server support when running in CLI/autonomous mode.`,worktreeIsolation:`When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.`,autoCommit:`The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.`,branchSupport:`Allows the CLI agent to create and switch git branches during a task.`,local:`Local in-process memory tool — agent can store and recall facts within a session.`,github:`GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).`,viewImage:`Allows the agent to read and process image files (requires a multimodal model).`,claudeTarget:`The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.`,autopilot:`Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.`,autoReply:`Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.`,terminalSandbox:`Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.`,terminalAutoApprove:`Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.`,autoApproveNpmScripts:`Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.`,globalAutoApprove:`YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.`,autoApprove:`Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.`,terminal_sandbox:`Runs terminal commands in a sandboxed environment to prevent destructive operations.`,applyingInstructions:`Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.`,claudeMd:`Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.`,agentsMd:`Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.`,nestedAgentsMd:`When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.`,instructions:`Search locations for .instructions.md files that are automatically attached to matching requests.`,agents:`Search locations for .agent.md custom agent definition files.`,skills:`Search locations for SKILL.md agent skill files.`,prompts:`Search locations for .prompt.md reusable prompt files.`,access:`Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.`,autostart:`"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.`,discovery:`Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).`,claudeHooks:`When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).`,customAgentHooks:`When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.`,locations:`File paths where hook configuration files are loaded from. Relative to workspace root.`,thinkingBudget:`Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.`,thinkingEffort:`Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.`,skipPermissions:`Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.`,effortLevel:`Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.`,hooks:`Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).`,installMethod:`How Claude Code was installed (native, npm, homebrew, etc.).`,hasCompletedOnboarding:`Whether the initial Claude Code onboarding flow has been completed.`,project_settings:`A .claude/settings.json exists in this project with project-specific configuration.`,project_permissions:`Project settings include a permissions block controlling tool access.`,vimMode:`Enables Vim-style keybindings in the Gemini CLI.`,approvalMode:`Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).`,notifications:`Enables OS notifications for prompt alerts and session completion.`,respectGeminiIgnore:`Controls whether the CLI respects patterns in .geminiignore files.`,additionalIgnores:`Number of extra patterns added to the global file ignore list.`,lineNumbers:`Shows line numbers in code blocks within the chat interface.`,alternateScreen:`Uses the terminal alternate buffer to preserve shell scrollback history.`,hideContext:`Hides the summary of attached files/context above the input prompt.`,effort:`Reasoning effort level for the model (e.g., standard, high).`,temperature:`Sampling temperature for model requests. 0 = deterministic; higher = more creative.`,budget:`Maximum token budget for reasoning/extended thinking.`,coreTools:`Number of built-in tools explicitly enabled for the agent.`,excludeTools:`Number of tools explicitly disabled for safety or cost control.`,customAgents:`Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).`,sidebarMode:`Controls whether Claude Desktop opens as a sidebar or full window.`,trustedFolders:`Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.`,livePreview:`Enables the live preview pane that shows rendered output during Code mode tasks.`};function ge(e,t){return t&&k[t]&&k[t][e]||he[e]||``}function _e(e){let t=String(e||``).split(`.`);return t[t.length-1]}function ve(e,t){let n=_e(e.key);return e.note||e.group&&k[e.group]&&k[e.group][n]||t===`telemetry`&&k.OTel[n.replace(/^otel_?/,``)]||ge(n,e.group)||``}var A=[`model`,`agents`,`telemetry`,`autonomy`,`context`,`hooks`,`mcp`,`extensions`,`startup`,`other`],j={model:`Model`,agents:`Agents`,telemetry:`Telemetry`,autonomy:`Autonomy and safety`,context:`Context files`,hooks:`Hooks`,mcp:`MCP servers`,extensions:`Extensions and plugins`,startup:`Updates and startup`,other:`Other settings`},ye={Agent:`autonomy`,"Agent Mode":`autonomy`,"Code (Agent)":`autonomy`,"Cowork (Autonomous)":`autonomy`,Safety:`autonomy`,"Claude (Anthropic)":`autonomy`,Hooks:`hooks`,"Context Files":`context`,"File Locations":`context`,MCP:`mcp`},be=new Set([`globalAutoApprove`,`autoApprove`,`autoReply`,`autopilot`,`skipPermissions`,`allowAllBrowserActions`,`autoCommit`,`dangerouslySkipPermissions`,`yolo`]);function xe(e){let t=String(e||``).split(`.`);return t[t.length-1]}function Se(e){return String(e||``).replace(/^github\.copilot\./,``).toLowerCase().replace(/[^a-z0-9]/g,``)}function Ce(e){let t=String(e||``).split(/[._]/).filter(Boolean);return Se(t[t.length-1])}function we(e){return String(e||``).toLowerCase().replace(/[^a-z0-9]/g,``)}function Te(e){let t=String(e||``).replace(/^github\.copilot\./,``).replace(/^chat\./,``).replace(/[._-]+/g,` `).replace(/([a-z0-9])([A-Z])/g,`$1 $2`).replace(/\?+$/,``).trim().toLowerCase();return t?t[0].toUpperCase()+t.slice(1):``}function M(e){return typeof e==`boolean`?`flag`:typeof e==`number`?`number`:Array.isArray(e)?`list`:e&&typeof e==`object`?`map`:typeof e==`string`&&/^(~|\/|[A-Za-z]:\\)/.test(e)?`path`:`text`}function N(e){return e===!0?!0:Array.isArray(e)?e.length>0:e&&typeof e==`object`?Object.keys(e).length>0:typeof e==`number`?e>0:typeof e==`string`&&!!e&&![`false`,`off`,`no`,`0`,`none`,`default`,`never`].includes(e.toLowerCase())}function Ee(e){let t=String(e).toLowerCase();return/otel|telemetry/.test(t)?`telemetry`:/model|effort|thinking|reasoning/.test(t)?`model`:/hook/.test(t)?`hooks`:/mcp/.test(t)?`mcp`:/update|startup|launch/.test(t)?`startup`:`other`}function De(e){return Array.isArray(e)?`[`+e.map(De).join(`,`)+`]`:e&&typeof e==`object`?`{`+Object.keys(e).sort().map(t=>JSON.stringify(t)+`:`+De(e[t])).join(`,`)+`}`:JSON.stringify(e??null)}function P(e,t,n={}){let r=t===void 0?null:t;return{key:e,label:n.label||Te(e),value:r,kind:n.kind||M(t),source:n.source||``,danger:n.danger??(be.has(xe(e))&&N(r)),note:n.note||``,group:n.group}}function Oe(e){let t=e.config_files||[],n=t[0]||``,r=Object.fromEntries(A.map(e=>[e,[]])),i=new Set,a=new Map,o=(e,t)=>{let n=Se(t.key);n&&i.has(n)||(n&&i.add(n),a.set(Ce(t.key)+`=`+De(t.value),!0),r[e].push(t))};e.model&&o(`model`,P(`model`,e.model,{label:`Model`,kind:`text`,source:n}));for(let r of e.configurable_models||[]){if(!r||!r.key)continue;let e=r.source&&r.source!=="default",i=r.source===`workspace`?t.find(e=>/[\\/]\.vscode[\\/]/.test(e))||n:t.find(e=>!/[\\/]\.vscode[\\/]/.test(e))||n;o(`model`,P(r.key,e?r.value:null,{label:r.label,kind:`text`,source:e?i:``,note:[r.description,e?``:r.default_hint?`Default: ${r.default_hint}`:``].filter(Boolean).join(` `)}))}let s=e.otel||{};(s.enabled!==void 0||s.source)&&(o(`telemetry`,P(`otel.enabled`,!!s.enabled,{label:`OpenTelemetry export`,kind:`flag`,note:k.OTel.enabled})),s.exporter&&o(`telemetry`,P(`otel.exporter`,s.exporter,{label:`Exporter`,kind:`text`,group:`OTel`})),s.endpoint&&o(`telemetry`,P(`otel.endpoint`,s.endpoint,{label:`Endpoint`,kind:`text`,group:`OTel`})),s.file_path&&o(`telemetry`,P(`otel.file_path`,s.file_path,{label:`Output file`,kind:`path`,group:`OTel`})),s.capture_content!==void 0&&o(`telemetry`,P(`otel.capture_content`,!!s.capture_content,{label:`Capture content`,kind:`flag`,group:`OTel`})));for(let[t,r]of Object.entries(e.feature_groups||{})){let e=ye[t]||`other`;for(let[i,a]of Object.entries(r||{}))o(e,P(i,a,{source:n,group:t}))}let c=s.enabled!==void 0||!!s.source;for(let[t,r]of Object.entries(e.settings||{})){let e=Ee(t);e===`telemetry`&&c||a.has(Ce(t)+`=`+De(r))||o(e,P(t,r,{source:n}))}return(e.mcp_servers||[]).length&&o(`mcp`,P(`mcp_servers`,e.mcp_servers,{label:`Servers`,kind:`list`,source:n})),(e.extensions||[]).length&&o(`extensions`,P(`extensions`,e.extensions,{label:`Installed`,kind:`list`})),(e.auto_update===!0||e.auto_update===!1)&&o(`startup`,P(`auto_update`,e.auto_update,{label:`Automatic updates`,kind:`flag`})),(e.launch_at_startup===!0||e.launch_at_startup===!1)&&o(`startup`,P(`launch_at_startup`,e.launch_at_startup,{label:`Start at login`,kind:`flag`})),A.filter(e=>r[e].length).map(e=>({id:e,title:j[e],rows:r[e]}))}function ke(e){let t=A.indexOf(e);return t<0?A.length:t}function Ae(e){return(Array.isArray(e?.sections)?e.sections:Oe(e||{})).filter(e=>e&&Array.isArray(e.rows)&&e.rows.length).map(e=>({...e,title:e.title||j[e.id]||Te(e.id)})).sort((e,t)=>ke(e.id)-ke(t.id))}var je=/^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/i;function F(e){return String(e||``).replace(/\\/g,`/`).replace(/(.)\/+$/,`$1`)}function I(e,t){return!!e&&!!t&&F(e)===F(t)}var Me=`env:`;function L(e){let t=String(e||``);return t===`env`||t.startsWith(`env:`)}function R(e){let t=String(e||``);return t.startsWith(`env:`)?t.slice(4):``}function z(e){let t=String(e||``);return!!t&&!L(t)&&!Ve.includes(t)&&t!=="default"}var Ne={settings:`Settings file`,persisted:`New shells`};function Pe(e){let t=[];e?.in_process&&t.push({id:`process`,label:`aictl's environment`,origin:``,value:e.process??e.value,note:`The process aictl runs in, as it was when aictl started; a tool started from that shell sees the same value.`});for(let n of e?.persisted||[]){let e=/^registry:/.test(n.origin||``);t.push({id:n.origin,label:e?`Registry`:Ne[n.kind]||`Profile`,origin:n.origin||``,value:n.value,file:e?``:n.origin||``,note:n.kind===`settings`?`The tool sets it for its own sessions.`:`Set for every new shell.`})}return t}function Fe(e){return Pe(e).map(e=>e.id===`process`?`process`:e.file?w(e.file):String(e.origin).replace(/^registry:/,``)).join(` · `)}function Ie(e,t){let n=String(e?.name||``);return{name:n,tool:t,uid:t+`env:`+n,source:Me+n,set:e?.set===!0,value:e?.value==null?``:String(e.value),masked:e?.masked===!0,in_process:e?.in_process===!0,process:e?.process==null?``:String(e.process),persisted:Array.isArray(e?.persisted)?e.persisted:[],drives:Array.isArray(e?.drives)?e.drives:[],label:e?.label||n,description:e?.description||``,section:e?.section||``,documented:e?.documented!==!1}}function Le(e,t){let n=(Array.isArray(e?.env_vars)?e.env_vars:[]).filter(e=>e&&e.name).map(t=>Ie(t,e.tool));for(let r of t||[])for(let t of[r.source,...(r.chain||[]).map(e=>e.source)]){let i=R(t);if(!i)continue;let a=n.find(e=>e.name===i);if(!a){let o=(r.chain||[]).find(e=>e.source===t);a=Ie({name:i,set:!0,value:o?$e(o.value):``,documented:!1},e.tool),n.push(a)}a.drives.some(e=>e.key===r.key)||(a.drives=[...a.drives,{key:r.key,label:r.label}])}return[...n.filter(e=>e.set),...n.filter(e=>!e.set)]}function Re(e,t){let n=String(t||``).trim().toLowerCase();return!n||[e.name,e.label,e.description,e.masked?``:e.value,...e.drives.map(e=>e.label)].join(`
`).toLowerCase().includes(n)}function B(e){let t=String(e||``);if(t.startsWith(`~`))return`~`;let n=je.exec(F(t));return n?t.slice(0,n[1].length):``}function V(e,t){let n=F(e),r=F(t);return!!r&&(n===r||n.startsWith(r+`/`))}function H(e){let t=String(e||``),n=B(t);return!n||n===`~`||le(t)?t:`~`+t.slice(n.length)}function ze(e){let t=[e?.root,...e?.live_monitor?.workspace_paths||[]],n=[];for(let e of t){if(!e||typeof e!=`string`)continue;let t=F(e);t===`/`||F(B(e))===t||/^[A-Za-z]:$/.test(t)||n.some(e=>F(e)===t)||n.push(e)}return n}var Be={default:`Default`,system:`System`,managed:`Managed`,policy:`Policy`,user:`User`,profile:`Profile`,project:`Project`,"project-local":`Project local`,workspace:`Workspace`,env:`Env`,cli:`CLI`},Ve=[`system`,`user`,`profile`,`project`,`project-local`,`workspace`,`env`,`cli`,`managed`,`policy`],He=new Set([`system`,`managed`,`policy`]);function U(e,t=[]){let n=(t||[]).find(t=>t.id===e);return n&&n.label||Be[e]||Te(e||`default`)}function Ue(e,t){let n=(t||[]).filter(e=>e.scopeGiven&&e.scope!=="default");if(Array.isArray(e?.scopes)&&e.scopes.length)return e.scopes.filter(e=>e&&e.id).map(e=>({id:e.id,label:e.label||U(e.id),path:e.path||``,paths:e.path?[e.path]:[],exists:e.exists!==!1,changeable:e.changeable!==!1,note:e.note||``,given:!0,vars:Array.isArray(e.vars)?e.vars.map(String):[]}));let r=[...new Set(n.map(e=>e.scope))],i=e=>{let t=Ve.indexOf(e);return t<0?Ve.indexOf(`cli`):t};return r.sort((e,t)=>i(e)-i(t)),r.map(e=>{let t=[],r=[];for(let i of n){if(i.scope!==e||!i.source)continue;let n=R(i.source);n?r.includes(n)||r.push(n):z(i.source)&&!t.some(e=>I(e,i.source))&&t.push(i.source)}return{id:e,label:U(e),path:t[0]||``,paths:t,exists:!0,changeable:!He.has(e)&&!n.some(t=>t.scope===e&&t.locked),note:``,given:!1,vars:r}})}function We(e,t=[]){if(!e)return!1;if(e.locked===!0)return!0;let n=(t||[]).find(t=>t.id===e.scope);return!!n&&n.changeable===!1}function Ge(e=[]){for(let t=e.length-1;t>=0;--t){let n=e[t];if(n.changeable!==!1&&n.path)return n}return null}function Ke(e,t=[]){let n=String(e||``);return n?/[\\/]\.vscode[\\/]/.test(n)?`workspace`:t.some(e=>V(n,e))?`project`:B(n)?`user`:`project`:`default`}function qe(e,t=[]){return e&&typeof e.scope==`string`&&e.scope?e.scope:Ke(e?.source,t)}function Je(e){let t=Number(e?.line);return Number.isFinite(t)&&t>0?Math.floor(t):0}function Ye(e){return!e||e.set===!1||e.value===void 0}function Xe(e,t){let n=Array.isArray(e?.chain)?e.chain.filter(e=>e&&typeof e==`object`):[];if(!n.length)return{chain:[{scope:t,value:e?.value,source:e?.source||``,line:Je(e)}],wins:0};let r=Number.isInteger(e.wins)&&e.wins>=0&&e.wins<n.length?e.wins:-1;if(r<0&&(r=n.findIndex(e=>e.wins===!0)),r<0&&(r=n.findIndex(n=>n.scope===t&&I(n.source,e.source))),r<0){for(let e=n.length-1;e>=0;--e)if(!Ye(n[e])){r=e;break}}return{chain:n,wins:r<0?n.length-1:r}}function Ze(e,t){return e.length<=1?e.join(``):e.slice(0,-1).join(`, `)+` `+t+` `+e[e.length-1]}function Qe(e,t){let n=e?.[t];if(!n)return``;let r=R(n.source),i=n.scope==="default"?`The default`:r?`The variable ${r}`:`The ${n.scope} ${z(n.source)?`file`:`value`}`;if(e.length===1)return n.scope==="default"?`No file sets this, so the default applies.`:`Only the ${n.scope} level sets this, so its value applies.`;let a=e.slice(t+1),o=a.filter(e=>!Ye(e)),s=e.slice(0,t).filter(e=>!Ye(e)).map(e=>e.scope);return a.length?o.length?`${i} wins over the ${Ze(o.map(e=>e.scope),`and`)} value: ${n.scope} takes precedence for this setting.`:`${i} wins because no ${Ze(a.map(e=>e.scope),`or`)} value is set.`:`${i} wins: ${n.scope} is the highest level that sets it${s.length?`, above `+Ze(s,`and`):``}.`}function $e(e){return e==null||e===``?``:e===!0?`on true`:e===!1?`off false`:Array.isArray(e)?e.map($e).join(` `):typeof e==`object`?Object.entries(e).map(([e,t])=>e+` `+$e(t)).join(` `):String(e)}function et(e){if(e==null||e===``)return`—`;if(e===!0)return`on`;if(e===!1)return`off`;if(Array.isArray(e))return e.length+(e.length===1?` item`:` items`);if(typeof e==`object`){let t=Object.keys(e).length;return t+(t===1?` item`:` items`)}return String(e)}var tt=[[/exporter$/i,[`otlp-http`,`otlp-grpc`,`console`,`file`]],[/effort(level)?$/i,[`minimal`,`low`,`medium`,`high`,`xhigh`,`max`]],[/approval[._]?policy$|askforapproval$/i,[`untrusted`,`on-failure`,`on-request`,`never`]],[/approval[._]?mode$/i,[`default`,`auto_edit`,`plan`,`yolo`]],[/sandbox[._]?mode$/i,[`read-only`,`workspace-write`,`danger-full-access`]],[/(^|\.)access$/i,[`all`,`registry`,`none`]],[/autostart$/i,[`never`,`onlyNew`,`newAndOutdated`]]];function nt(e){if(!e)return null;if(Array.isArray(e.options)&&e.options.length)return e.options.map(String);if((e.kind||M(e.value))!==`text`||typeof e.value!=`string`||!e.value)return null;let t=String(e.key||``),n=String(e.label||``).replace(/\s+/g,``);for(let[r,i]of tt)if(r.test(t)||r.test(n))return i.includes(e.value)?i:[e.value,...i];return null}function rt(e,t){return e===`vscode`?`VS Code`:e===`aictl`?`aictl`:C(e,t)}function it(e,t,n,r){let i=qe(e,r),a=e.agent&&typeof e.agent==`object`?e.agent:null,{chain:o,wins:s}=Xe(e,i);return{...e,uid:t+``+e.key,tool:t,sec:n.id,secTitle:n.title,label:e.label||Te(e.key),kind:e.kind||M(e.value),source:e.source||``,line:Je(e),scope:i,chain:o,wins:s,risky:!!e.danger,tip:ve(e,n.id),scopeGiven:typeof e.scope==`string`&&!!e.scope,locked:e.locked===!0,unset:e.set===!1,undocumented:e.documented===!1,agent:a?{...a,tools:Array.isArray(a.tools)?a.tools.map(String):[]}:null}}function at(e){return!!e&&e.kind===`agent`&&!!e.agent}function W(e){let t=e?.agent;return t&&typeof t.inherits==`boolean`?t.inherits:e?.value===`inherits`||e?.value===null||e?.value===void 0||e?.value===``}function ot(e){let t=e?.agent;if(!t||!t.pinned_in||W(e))return!1;let n=e.chain?.[e.wins],r=n&&n.source||e.source;return!r||I(r,t.pinned_in)}function st(e){if(!e.length||e.some(W))return``;let t=new Set(e.map(e=>String(e.value)));return t.size===1?[...t][0]:``}function ct(e){let t=e.agent||{},n=W(e),r=ot(e),i=t.pinned_in?(e.chain||[]).find(e=>I(e.source,t.pinned_in)):null,a=i&&!Ye(i)?i.value:r?e.value:void 0,o=[{id:`file`,label:`Agent file`,value:t.model||void 0,source:t.defined_in||``,line:Number(t.defined_line)>0?Number(t.defined_line):0},{id:`pin`,label:`Settings pin`,value:a,source:t.pinned_in||``,line:Number(t.pinned_line)>0?Number(t.pinned_line):0,present:!!t.pinned_in},{id:`effective`,label:`Effective`,value:n?`inherits`:e.value}],s=2,c;return n?c=`Neither the agent file nor a settings pin names a model, so the agent runs on the session model.`:r?(s=1,c=`The pin in ${w(t.pinned_in)} wins over ${t.model?`the model in the agent file`:`the agent file, which names no model`}.`):(s=0,c=t.pinned_in?t.model_policy===`required`?`The agent file requires its model, so it wins over the settings pin.`:`The model in the agent file applies; the pin in ${w(t.pinned_in)} does not decide it.`:`The agent file names the model and no settings pin applies.`),e.note&&(c+=` `+e.note),{steps:o,wins:s,why:c}}function lt(e){let t=Array.isArray(e?.tool_configs)?e.tool_configs:[],n=(e?.tools||[]).map(e=>e.tool),r=ze(e),i=t.filter(e=>e&&e.tool).map(t=>{let n=Ae(t).map(e=>({id:e.id,title:e.title,rows:e.rows.map(n=>it(n,t.tool,e,r))})),i=n.flatMap(e=>e.rows),a=[];for(let e of[...t.config_files||[],...i.map(e=>e.source)])z(e)&&!a.some(t=>I(t,e))&&a.push(e);let o=Le(t,i);return{id:t.tool,label:rt(t.tool,e),cfg:t,sections:n,rows:i,files:a,envVars:o,envUsed:o.filter(e=>e.drives.length),risky:i.filter(e=>e.risky).length,hints:t.hints||[],scopes:Ue(t,i)}}),a=e=>{let t=n.indexOf(e);return t<0?n.length+ +(e===`vscode`):t};return i.map((e,t)=>({e,i:t})).sort((e,t)=>a(e.e.id)-a(t.e.id)||e.i-t.i).map(e=>e.e)}function ut({toolConfigs:e,tools:t,monitor:n,root:r=``,enabledTools:i=null}={}){return Array.isArray(e)?{root:r,tools:Array.isArray(t)?t:[],tool_configs:e.filter(e=>se(e,i)),live_monitor:n||{}}:null}function dt(e){let t=e.flatMap(e=>e.rows);return{set:t.filter(e=>!e.unset).length,unset:t.filter(e=>e.unset).length,knowsSet:t.some(e=>typeof e.set==`boolean`),risky:e.reduce((e,t)=>e+t.risky,0),agents:t.filter(at).length}}function ft(e){let t=e?.live_monitor||{},n=Object.entries(t.diagnostics||{}).map(([e,t])=>({name:e,mode:t?.mode||``,status:t?.status||`unknown`,detail:t?.detail||``})),r=[...t.workspace_paths||[],...t.state_paths||[]].filter(Boolean);return!n.length&&!r.length?null:{id:`aictl`,label:`aictl`,collectors:n,roots:r}}function pt(e,t){if(!t)return!0;let n=[e.label,e.key,$e(e.value),w(e.source)],r=e.agent;return r&&n.push(r.name,r.model,...r.tools||[],w(r.defined_in),w(r.pinned_in)),n.filter(Boolean).join(`
`).toLowerCase().includes(t.toLowerCase())}function mt({q:e=``,nonDefault:t=!1,risky:n=!1,unset:r=!1}={}){let i=e.trim().toLowerCase();return e=>pt(e,i)&&(!t||e.scope!=="default"&&!e.unset&&!(at(e)&&W(e)))&&(!n||e.risky)&&(r||!e.unset)}function ht(e,t,n=()=>!0){let r=e.filter(e=>e.rows&&e.rows.some(e=>e.sec===t)),i=[],a=new Map,o=new Map;for(let e of r)for(let n of e.rows){if(n.sec!==t)continue;let r=we(n.label),s=Se(n.key),c=a.get(r)||o.get(s);c&&c.cells[e.id]&&(c=null),c||(c={id:`g`+i.length,label:n.label,keys:[],cells:{}},i.push(c)),a.has(r)||a.set(r,c),o.has(s)||o.set(s,c),c.cells[e.id]=n,c.keys.includes(n.key)||c.keys.push(n.key)}return{tools:r,rows:i.filter(e=>Object.values(e.cells).some(n))}}var gt=[{id:`home`,label:`Home folder`},{id:`tool-home`,label:`Tool folders`},{id:`project`,label:`This project`},{id:`vscode-user`,label:`VS Code user folder`},{id:`other`,label:`Other`}],_t=Object.fromEntries(gt.map(e=>[e.id,e.label])),vt={home:`Home`,"tool-home":`Tool folders`,project:`This project`,"vscode-user":`VS Code user`,other:`Other`},yt=[{id:`settings`,label:`Settings`},{id:`instructions`,label:`Instructions`},{id:`agents`,label:`Agents`},{id:`skills`,label:`Skills`},{id:`prompts`,label:`Prompts`},{id:`memory`,label:`Memory`},{id:`hooks`,label:`Hooks`},{id:`mcp`,label:`MCP`},{id:`other`,label:`Other`}],G=Object.fromEntries(yt.map(e=>[e.id,e.label]));function K(e){return G[e?.kind]?e.kind:`other`}var bt=[{id:`tracked`,label:`Tracked`},{id:`ignored`,label:`Ignored`},{id:`untracked`,label:`Untracked`},{id:`outside`,label:`Outside a repository`}];function xt(e){let t=String(e?.git_state||``).toLowerCase();return t?t.includes(`ignored`)?`ignored`:t.includes(`untracked`)||t.includes(`not tracked`)?`untracked`:t.includes(`outside`)?`outside`:t.includes(`tracked`)||t.includes(`modified`)?`tracked`:``:``}function St(e){let t=xt(e);return(t===`ignored`||t===`untracked`)&&e?.loading===`always`}var Ct=new Set([`.claude`,`.github`,`.vscode`,`.cursor`,`.codex`,`.gemini`,`.copilot`,`.windsurf`]);function wt(e){let t=Math.max(e.lastIndexOf(`/`),e.lastIndexOf(`\\`));return t>0?e.slice(0,t):e}function Tt(e,t=[]){let n=String(e||``),r=F(n),i=r.indexOf(`/.vscode/`),a=t.find(e=>V(r,e));if(a)return{location:`project`,location_root:a};if(i>0)return{location:`project`,location_root:n.slice(0,i)};let o=/^(.*\/(?:Code|Code - Insiders|VSCodium)\/User)(\/|$)/.exec(r);if(o)return{location:`vscode-user`,location_root:n.slice(0,o[1].length)};let s=B(n);if(s){let e=r.slice(F(s).length+1).split(`/`).filter(Boolean);if(e.length>1&&e[0].startsWith(`.`))return{location:`tool-home`,location_root:n.slice(0,s.length+1+e[0].length)};if(e.length>3&&(e[0]===`Library`||e[0]===`AppData`)){let t=s.length+1+e.slice(0,3).join(`/`).length;return{location:`tool-home`,location_root:n.slice(0,t)}}if(e.length<=1)return{location:`home`,location_root:s}}let c=wt(n);for(;Ct.has(w(c))&&wt(c)!==c;)c=wt(c);return{location:`other`,location_root:c}}function Et(e){let t=w(e).toLowerCase();return/mcp/.test(t)?`mcp`:/^(agents|claude|gemini|copilot-instructions)\.md$|\.instructions\.md$/.test(t)?`instructions`:/\.agent\.md$/.test(t)?`agents`:/\.prompt\.md$/.test(t)?`prompts`:/\.md$/.test(t)?`memory`:`settings`}function Dt(e,t,n=[],r=null){let i=[],a=e=>i.find(t=>I(t.path,e)),o=e=>{let t=a(e.path);if(t){for(let n of e.tools||[])t.tools.includes(n)||t.tools.push(n);return t}let r=Tt(e.path,n),o={name:w(e.path),location:r.location,location_root:r.location_root,scope:Ke(e.path,n),kind:Et(e.path),settings:null,bytes:null,mtime:null,git_state:``,exists:!0,...e,tools:[...e.tools||[]]};return o.location_root||=r.location_root,_t[o.location]||(o.location=`other`),i.push(o),o};for(let t of Array.isArray(e)?e:[])t&&t.path&&o(t);for(let e of t)for(let t of e.files)o({path:t,tools:[e.id]});for(let e of i){let n=t.flatMap(t=>t.rows.filter(t=>I(t.source,e.path)));e.rows=n,(e.settings===null||e.settings===void 0)&&(e.settings=n.length)}return i.filter(e=>!e.tools.length||e.tools.some(e=>x(e,r))).map(e=>({...e,tools:e.tools.filter(e=>x(e,r))}))}function Ot(e){let t=[];for(let n of e||[])for(let e of n.scopes||[]){if(!e.given||e.exists||e.changeable||!e.path)continue;let r=t.find(t=>I(t.path,e.path));r?r.tools.includes(n.id)||r.tools.push(n.id):t.push({path:e.path,name:w(e.path),scope:e.id,label:e.label,note:e.note,tools:[n.id]})}return t}function kt(e,t){if(!t)return!0;let n=t.trim().toLowerCase();return!n||[e.name,e.path,e.kind,...(e.rows||[]).map(e=>e.label)].join(`
`).toLowerCase().includes(n)}function At(e){let t=new Map;for(let n of e){let e=wt(n.path);t.has(e)||t.set(e,{dir:e,files:[]}),t.get(e).files.push(n)}let n=[...t.values()].sort((e,t)=>e.dir.localeCompare(t.dir));for(let e of n)e.files.sort((e,t)=>e.name.localeCompare(t.name));return n}function jt(e){return yt.map(t=>({id:t.id,label:t.label,files:e.filter(e=>K(e)===t.id)})).filter(e=>e.files.length)}function Mt(e){let t={};for(let n of e){let e=K(n),r=_t[n.location]?n.location:`other`;t[e]=t[e]||{},t[e][r]=(t[e][r]||0)+1}return{rows:yt.filter(e=>t[e.id]).map(e=>({...e,cells:t[e.id],total:Object.values(t[e.id]).reduce((e,t)=>e+t,0)})),cols:gt.map(e=>({id:e.id,label:vt[e.id]}))}}function Nt(e){let t=new Map;for(let n of e){let e=n.location_root||wt(n.path);t.has(e)||t.set(e,{root:e,location:n.location,files:[]}),t.get(e).files.push(n)}let n=e=>gt.findIndex(t=>t.id===e);return[...t.values()].sort((e,t)=>n(e.location)-n(t.location)||e.root.localeCompare(t.root))}var Pt={high:0,medium:1,low:2,info:3};function Ft(e){return[e.rule||``,e.path||``,e.line||0,e.tool||``,e.session_id||``].join(`|`)}function It(e){let t=new Map;return(e||[]).map(e=>{let n=Ft(e),r=t.get(n)||0;return t.set(n,r+1),{...e,id:r?n+`#`+r:n}})}function Lt(e){return Array.isArray(e?.tools)&&e.tools.length?e.tools:e?.tool?[e.tool]:[]}function Rt(e){let t=String(e||`other`).replace(/[_-]+/g,` `).trim();return t?t[0].toUpperCase()+t.slice(1):`Other`}function zt(e,t){if(!t)return!0;let n=t.trim().toLowerCase();return!n||[e.rule,Rt(e.rule),e.path,e.why,e.action,w(e.path)].join(`
`).toLowerCase().includes(n)}function Bt(e){let t=new Map;for(let n of e||[]){let e=n.rule||`other`;t.has(e)||t.set(e,{rule:e,label:Rt(e),items:[]}),t.get(e).items.push(n.id?n:{...n,id:Ft(n)})}return[...t.values()].map(e=>{let t=[...new Set(e.items.map(e=>e.why||``))],n=[...new Set(e.items.flatMap(Lt))],r=e.items.reduce((e,t)=>(Pt[t.severity]??9)<(Pt[e]??9)?t.severity:e,`info`);return{...e,count:e.items.length,why:t.length===1?t[0]:``,tools:n,severity:r,alarm:r===`high`||r===`medium`}}).sort((e,t)=>(Pt[e.severity]??9)-(Pt[t.severity]??9)||t.count-e.count)}var Vt=[`tool`,`topic`,`files`,`findings`],Ht=[`purpose`,`fscope`,`git`,`recent`,`cell`];function Ut(e){let t=new URLSearchParams(e||``),n=t.get(`pivot`);return{view:Vt.includes(n)?n:`tool`,tool:t.get(`tool`)||``,sec:t.get(`sec`)||``,row:t.get(`row`)||``,scope:[`local`,`node`,`fleet`].includes(t.get(`scope`))?``:t.get(`scope`)||``,unset:t.get(`unset`)===`1`,group:t.get(`group`)===`purpose`?`purpose`:`location`,purpose:t.get(`purpose`)||``,fscope:t.get(`fscope`)||``,git:t.get(`git`)||``,recent:t.get(`recent`)===`1`,cell:t.get(`cell`)||``}}function Wt(e){return{pivot:e.view&&e.view!==`tool`?e.view:null,tool:e.tool||null,sec:e.sec||null,row:e.row||null,scope:e.scope||null,unset:e.unset?`1`:null,group:e.group===`purpose`?`purpose`:null,purpose:e.purpose||null,fscope:e.fscope||null,git:e.git||null,recent:e.recent?`1`:null,cell:e.cell||null}}var q=e=>e?String(e).split(`,`).filter(Boolean):[],Gt=e=>e.join(`,`);function Kt(e){return e==null?`—`:typeof e==`object`?JSON.stringify(e):String(e)}function qt({value:e,compact:t}){let[n,r]=g(!1),i=Array.isArray(e),a=i?e.map((e,t)=>[t,e]):Object.entries(e||{}),o=a.length;if(!o)return _`<span class="st-none">none</span>`;let s=_`<span class="st-chip st-chip--mono st-items">${o} ${o===1?`item`:`items`}</span>`;return t?s:_`<span class="st-itemsbox">
    ${s}
    <button type="button" class="st-link" aria-expanded=${n?`true`:`false`}
      onClick=${e=>{e.stopPropagation(),r(!n)}}>${n?`hide`:`show`}</button>
    ${n&&_`<ul class="st-itemlist">
      ${a.map(([e,t])=>_`<li key=${e} class="st-mono" title=${i?Kt(t):`${e}: ${Kt(t)}`}>
        ${i?Kt(t):_`<span class="st-itemkey">${e}:</span> ${Kt(t)}`}</li>`)}
    </ul>`}
  </span>`}function Jt({row:e,value:t,compact:n=!1}){let r=t===void 0?e.value:t,i=e.kind||M(r),a=!!e.risky;if(i===`flag`||typeof r==`boolean`){if(r==null)return _`<span class="st-none">${`—`}</span>`;let e=N(r);return _`<span class=${`st-flag`+(e?` is-on`:``)+(a?` is-risky`:``)}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${e?`on`:`off`}</span>
    </span>`}if(r==null||r===``)return _`<span class="st-none">${`—`}</span>`;if(i===`list`||i===`map`||typeof r==`object`)return _`<${qt} value=${r} compact=${n}/>`;let o=String(r),s=nt({...e,value:r});return s?_`<span class=${`st-select`+(a?` is-risky`:``)} title=${`Options: `+s.join(`, `)}>${o}</span>`:i===`path`?_`<span class="st-v st-path" title=${o}>${o}</span>`:_`<span class=${`st-v`+(a?` is-risky`:``)} title=${o}>${o}</span>`}function J({scope:e,locked:t=!1,label:n=``}){let r=e||`default`,i=_`<span class=${`st-chip st-scope st-scope--`+r.replace(/[^a-z-]/gi,``)+(t?` st-scope--locked`:``)}
    title=${t?`Set by ${n||r}; cannot be changed here`:void 0}>${r}${t?_`<span class="st-sr"> (locked)</span>`:``}</span>`;return t?_`<span class="st-scopewrap"><${Yt}/>${i}</span>`:i}function Yt({label:e=``}){return e?_`<span class="st-lock" role="img" aria-label=${e} title=${e}><${ce} name="lock" size="11"/></span>`:_`<span class="st-lock" aria-hidden="true"><${ce} name="lock" size="11"/></span>`}var Xt=window.COLORS??{};function Zt(e){if(e>=10)return String(Math.round(e));let t=e.toFixed(1);return t.endsWith(`.0`)?t.slice(0,-2):t}function Qt(e,t,n){for(let n=t.length-1;n>=0;n--){let[r,i]=t[n],a=e/r;if(a>=1)return Zt(a)+i}return Math.round(e)+n}var $t=[[1024,`KB`],[1048576,`MB`],[1073741824,`GB`],[1099511627776,`TB`]];function en(e){return Qt(e,$t,`B`)}function tn(e){if(!e)return``;let t=Math.floor(Date.now()/1e3-e);return t<0?``:t<60?t+`s ago`:t<3600?Math.floor(t/60)+`m ago`:t<86400?Math.floor(t/3600)+`h ago`:Math.floor(t/86400)+`d ago`}function Y({id:e,big:t=!1}){return _`<span class=${`st-sw`+(t?` st-sw--big`:``)} aria-hidden="true"
    style=${{background:Xt[e]||`var(--st-fg2)`}}></span>`}function nn({label:e}){return _`<span class="st-dot" role="img" aria-label=${e} title=${e}></span>`}function X({children:e}){return _`<div class="st-nav__h">${e}</div>`}function Z({id:e,label:t}){return _`<span class="st-chip st-toolchip"><${Y} id=${e}/>${t}</span>`}function rn({path:e,line:t,w:n,tool:r=``}){if(!e)return _`<span class="st-none">—</span>`;if(L(e)){let t=R(e);return t?_`<button type="button" class="st-src st-src--env" data-env=${t}
      title=${`Environment variable `+t+`: where it is set and what it drives`}
      onClick=${e=>{e.stopPropagation(),n.openEnv(t,r)}}><b>${t}</b></button>`:_`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`}let i=e+(t>0?`:`+t:``);return _`<button type="button" class="st-src" title=${i}
    onClick=${r=>{r.stopPropagation(),n.openAt(e,t)}}>
    <b>${w(e)}</b>${t>0?`:`+t:``}</button>`}var an=`aictl has no description for this key; the value is shown as found in the file`;function on(){return _`<span class="st-chip st-chip--muted st-undoc" title=${an}>undocumented</span>`}var sn=4,cn=(e,t,n)=>[t&&{k:`tool`,l:`Tool`,get:t=>e.labelOf(t.tool)},{k:`agent`,l:`Agent`,cls:`st-c-agent`,get:e=>hn(e)},{k:`model`,l:`Model`,get:e=>W(e)?void 0:String(e.value)},{k:`effort`,l:`Effort`,get:e=>e.agent?.effort},n&&{k:`context`,l:`Context`,get:e=>e.agent?.context_tier},{k:`tools`,l:`Tools`,n:!0,get:e=>e.agent?.tools?.length||void 0},{k:`defined`,l:`Defined in`,cls:`st-c-src`,get:e=>e.agent?.defined_in},{k:`pinned`,l:`Pinned in`,cls:`st-c-src`,get:e=>e.agent?.pinned_in}].filter(Boolean);function ln(e,t){return`Set by ${U(e.scope,t.scopesOf(e.tool))}; cannot be changed here`}function un({row:e,w:t}){let n=e.agent,r=W(e);return _`<span class="st-agentmodel">
    ${e.locked&&_`<${Yt} label=${ln(e,t)}/>`}
    ${r?_`<span class="st-inherit" title=${e.note||`Runs on the session model`}>inherits</span>`:_`<span class="st-v" title=${String(e.value)}>${String(e.value)}</span>`}
    ${n.model_policy===`required`&&_`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${ot(e)&&_`<span class="st-badge st-badge--pin" title=${`A settings pin decides the model: `+n.pinned_in}>pinned</span>`}
  </span>`}function dn({tools:e,all:t=!1}){if(!e||!e.length)return _`<span class="st-none" title="The agent file lists no tools">—</span>`;let n=t?e:e.slice(0,sn),r=e.length-n.length;return _`<span class="st-tools">
    ${n.map(e=>_`<span key=${e} class="st-chip st-chip--mono" title=${e}>${e}</span>`)}
    ${r>0&&_`<span class="st-chip st-more-tools" title=${e.slice(n.length).join(`, `)}>+${r}</span>`}
  </span>`}function fn({row:e,w:t,withTool:n,withContext:r}){let i=e.agent,a=t.selected?.uid===e.uid,o=()=>t.select({tool:e.tool,row:e.key}),s=e=>Number(e)>0?Number(e):0;return _`<tr class=${`st-row st-agentrow`+(a?` is-sel`:``)} data-key=${e.key} data-tool=${e.tool}
    tabindex="0" onClick=${o}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),o())}}>
    ${n&&_`<td class="st-c-tool"><span class="st-matrix__toolname"><${Y} id=${e.tool}/>${t.labelOf(e.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${i.name||e.label}</div>
      ${i.description&&_`<div class="st-agentdesc" title=${i.description}>${i.description}</div>`}
    </td>
    <td class="st-c-model"><${un} row=${e} w=${t}/></td>
    <td class="st-mono">${i.effort||_`<span class="st-none">—</span>`}</td>
    ${r&&_`<td class="st-mono">${i.context_tier||_`<span class="st-none">—</span>`}</td>`}
    <td><${dn} tools=${i.tools}/></td>
    <td class="st-c-src"><${rn} path=${i.defined_in} line=${s(i.defined_line)} w=${t}/></td>
    <td class="st-c-src"><${rn} path=${i.pinned_in} line=${s(i.pinned_line)} w=${t}/></td>
  </tr>`}function pn({w:e,section:t}){let n=t.shown,r=n.filter(W).length,i=T(`settings.agents`,cn(e,!1,!0)),a=cn(e,!1,!0);return _`<table class=${`st-table st-agents `+i.tableProps.class} style=${i.tableProps.style} data-section="agents">
    <thead><tr>${a.map(i.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${t.title}
        <span class="st-group__meta">${n.length}${r?` · ${r} inherit the session model`:``}</span></th></tr>
      ${i.order(n).map(t=>_`<${fn} key=${t.uid} row=${t} w=${e} withContext/>`)}
    </tbody>
  </table>`}var mn={tool:e=>(t,n)=>e.labelOf(t.tool).localeCompare(e.labelOf(n.tool))||hn(t).localeCompare(hn(n)),agent:e=>(t,n)=>hn(t).localeCompare(hn(n))||e.labelOf(t.tool).localeCompare(e.labelOf(n.tool)),model:e=>(t,n)=>gn(t).localeCompare(gn(n))||mn.tool(e)(t,n)};function hn(e){return String(e.agent?.name||e.label||``)}function gn(e){return W(e)?`￿`:String(e.value)}function _n(e,t,n){return[...e].sort((mn[t]||mn.tool)(n))}function vn({w:e,rows:t,sort:n}){let r=cn(e,!0,!1),i=T(`settings.agents.all`,r),a=i.order(_n(t,n,e));return _`<div class="st-scroll"><table class=${`st-table st-agents st-agents--all `+i.tableProps.class} style=${i.tableProps.style}>
    <thead><tr>${r.map(i.th)}</tr></thead>
    <tbody>${a.map(t=>_`<${fn} key=${t.uid} row=${t} w=${e} withTool/>`)}</tbody>
  </table></div>`}var yn=[{id:`mcp`,label:`MCP`},{id:`read`,label:`Read files`},{id:`write`,label:`Write files`},{id:`shell`,label:`Shell`},{id:`web`,label:`Web`}],bn={allowed:`allow`,asks:`ask`,denied:`deny`},xn={denied:3,asks:2,allowed:1},Sn=(e,t,n=``)=>Object.fromEntries(yn.map(r=>[r.id,{state:e,why:t,key:n}]));function Cn(e){let t=String(e||``).split(`.`);return t[t.length-1]}function wn(e){let t=new Map;for(let n of e?.rows||[])t.has(n.key)||t.set(n.key,n);return t}var Q=e=>e&&e.value!==null&&e.value!==void 0&&e.value!==``?e.value:void 0,Tn=e=>Array.isArray(e)?e.filter(e=>typeof e==`string`&&e):[];function En(e){let t=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(e));return t?{name:t[1].toLowerCase(),spec:t[2]===void 0?null:t[2].trim()}:{name:String(e).toLowerCase(),spec:null}}var Dn=new Set([``,`*`,`:*`,`**`]),On={read:[`read`,`glob`,`grep`,`ls`,`notebookread`],write:[`write`,`edit`,`multiedit`,`notebookedit`],shell:[`bash`,`powershell`],web:[`webfetch`,`websearch`]};function kn(e){if(e===`mcp`||e.startsWith(`mcp__`))return`mcp`;for(let[t,n]of Object.entries(On))if(n.includes(e))return t;return``}function An(e,t){return e.startsWith(`mcp__`)?e===`mcp__*`:t===null||Dn.has(t)}function jn(e,t){let n=[],r=(e,r,i,a)=>{let o={allow:`allowed`,deny:`denied`,ask:`asks`}[e],s=e+``+r,c=i?U(i,t):``,l=n.find(e=>e.id===s);if(l){c&&!l.where.includes(c)&&l.where.push(c);return}let{name:u,spec:d}=En(r);n.push({id:s,rule:r,effect:o,cap:kn(u),whole:An(u,d),where:c?[c]:[],key:a})},i=(e,t,n)=>{if(e&&typeof e==`object`&&!Array.isArray(e))for(let i of[`allow`,`deny`,`ask`])for(let a of Tn(e[i]))r(i,a,t,n)},a=e.get(`permissions`);if(a){let e=(a.chain||[]).filter(e=>e&&e.value&&typeof e.value==`object`&&e.set!==!1);if(e.length)for(let t of e)i(t.value,t.scope,`permissions`);else i(Q(a),a.scope,`permissions`)}for(let t of[`allow`,`deny`,`ask`]){let n=e.get(`permissions.`+t);for(let e of Tn(Q(n)))r(t,e,n.scope,n.key)}return n}var Mn={shell:`shell`,write:`write`,read:`read`,url:`web`,fetch:`web`,web_fetch:`web`};function Nn(e){let t=[];for(let n of[`allow`,`deny`,`ask`]){let r=e.get(`permissions.`+n);for(let e of Tn(Q(r))){let{name:i,spec:a}=En(e);t.push({rule:e,effect:{allow:`allowed`,deny:`denied`,ask:`asks`}[n],cap:Mn[i]||`mcp`,whole:a===null||Dn.has(a),where:r.scope?[U(r.scope)]:[],key:r.key})}}return t}function Pn(e){let t=[];for(let n of e.values()){let e=Q(n);if(!e||typeof e!=`object`||Array.isArray(e))continue;let r=n.key,i=``;if(/(^|\.)urls\.autoApprove$/.test(r)?i=`web`:/(^|\.)edits\.autoApprove$/.test(r)?i=`write`:(r===`autoApprove`||/(^|\.)terminal\.autoApprove$/.test(r))&&(i=`shell`),i)for(let[a,o]of Object.entries(e)){let e;if(i===`web`?e=o===!0||o?.approveRequest===!0?`allowed`:`asks`:i===`write`?e=o===!1?`asks`:`allowed`:o===!0||o?.approve===!0?e=`allowed`:(o===!1||o?.approve===!1)&&(e=`denied`),!e)continue;let s=i===`write`?a===`**/*`||a===`**`:!1;t.push({rule:a,effect:e,cap:i,whole:s,where:n.scope?[U(n.scope)]:[],key:r})}}return t}var Fn={read:[`read_file`,`read_many_files`,`glob`,`grep`,`search_file_content`,`list_directory`,`readfiletool`,`readmanyfilestool`,`globtool`,`greptool`,`lstool`],write:[`write_file`,`replace`,`edit`,`writefiletool`,`edittool`],shell:[`run_shell_command`,`shelltool`],web:[`web_fetch`,`google_web_search`,`webfetchtool`,`websearchtool`]};function In(e){let t=[];for(let[n,r]of[[`tools.allowed`,`allowed`],[`tools.exclude`,`denied`]]){let i=e.get(n);for(let e of Tn(Q(i))){let{name:a,spec:o}=En(e),s=Object.entries(Fn).find(([,e])=>e.includes(a))?.[0]||``;!s&&a.includes(`__`)&&(s=`mcp`),s&&t.push({rule:e,effect:r,cap:s,whole:o===null,where:i.scope?[U(i.scope)]:[],key:n})}}return t}function Ln(e){let t=e.get(`permissions.defaultMode`),n=Q(t)??`default`,r=t&&Q(t)!==void 0?t.key:``,i=`default mode ${n}`;if(n===`bypassPermissions`)return Sn(`allowed`,i+`: no permission prompts`,r);let a={mcp:{state:`asks`,why:`Claude Code asks before an MCP tool runs`,key:r},read:{state:`allowed`,why:`Claude Code reads files without asking`,key:r},write:{state:`asks`,why:`Claude Code asks before it edits a file`,key:r},shell:{state:`asks`,why:`Claude Code asks before it runs a command`,key:r},web:{state:`asks`,why:`Claude Code asks before it fetches a URL`,key:r}};if(n===`acceptEdits`&&(a.write={state:`allowed`,why:i+`: edits apply without asking`,key:r}),n===`plan`&&(a.write={state:`denied`,why:i+`: read-only, no edits`,key:r},a.shell={state:`denied`,why:i+`: read-only, no commands that change anything`,key:r}),n===`dontAsk`)for(let e of[`mcp`,`write`,`shell`,`web`])a[e]={state:`denied`,why:i+`: anything not allowed by a rule is refused`,key:r};return a}function Rn(e){let t=e.get(`defaultPermissionMode`),n=Q(t)??`manual`,r=t&&Q(t)!==void 0?t.key:``;if(n===`allow-all`)return Sn(`allowed`,`defaultPermissionMode allow-all: every tool call is allowed`,r);let i=n===`assisted`?`asks; in assisted mode a model answers the request`:`asks before it runs`;return{mcp:{state:`asks`,why:`an MCP tool `+i,key:r},read:{state:`allowed`,why:`reads in trusted folders run without asking`,key:r},write:{state:`asks`,why:`a file write `+i,key:r},shell:{state:`asks`,why:`a shell command `+i,key:r},web:{state:`asks`,why:`a URL fetch `+i,key:r}}}function zn(e){for(let t of e.values()){let e=Q(t);if((Cn(t.key)===`globalAutoApprove`||t.key===`chat.tools.global.autoApprove`)&&e===!0)return Sn(`allowed`,t.label+` is on: every tool call runs without asking`,t.key);if(t.key===`skipPermissions`&&e===!0)return Sn(`allowed`,t.label+` is on: no permission checks`,t.key);if(t.key===`chat.permissions.default`&&[`autoApprove`,`autopilot`,`bypass`].includes(e))return Sn(`allowed`,`chat.permissions.default ${e}: sessions start without approval prompts`,t.key)}return{mcp:{state:`asks`,why:`VS Code asks before an MCP tool runs`},read:{state:`allowed`,why:`VS Code reads workspace files without asking`},write:{state:`allowed`,why:`VS Code applies edits in the workspace without asking`},shell:{state:`asks`,why:`VS Code asks before a terminal command runs`},web:{state:`asks`,why:`VS Code asks before it fetches a URL`}}}function Bn(e){let t=e.get(`approval_policy`),n=e.get(`sandbox_mode`),r=Q(e.get(`sandbox_workspace_write.network_access`))===!0,i=Q(t);i&&typeof i==`object`&&(i=`granular`),i||=`on-request`;let a=Q(n)||`read-only`,o=t&&Q(t)!==void 0?t.key:``,s=n&&Q(n)!==void 0?n.key:``,c=`approval_policy ${i}${Q(t)===void 0?` (not set)`:``}`,l=`sandbox_mode ${a}${Q(n)===void 0?` (not set)`:``}`,u=i===`never`,d=a===`danger-full-access`,f=d?{state:`allowed`,why:l+`: no sandbox`}:a===`workspace-write`?{state:`allowed`,why:l+`: writes in the workspace run without asking`}:u?{state:`denied`,why:`${l}, ${c}: no writes and no way to ask`}:{state:`asks`,why:`${l}: a write needs your approval`},p=u?{state:`allowed`,why:c+`: commands never ask`}:i===`untrusted`?{state:`asks`,why:c+`: commands outside the trusted set ask`}:{state:`allowed`,why:`${c}: commands run in the sandbox (${a}) and ask to leave it`},m=d||a===`workspace-write`&&r?{state:`allowed`,why:d?l+`: network open`:`sandbox_workspace_write.network_access is on`}:u?{state:`denied`,why:`${l}, ${c}: no network and no way to ask`}:{state:`asks`,why:`${l}: network access needs your approval`};return{mcp:{state:u?`allowed`:`asks`,why:u?c+`: MCP tools never ask`:c+`: MCP tool calls ask`,key:o},read:{state:`allowed`,why:l+`: reads are allowed`,key:s},write:{...f,key:s||o},shell:{...p,key:o||s},web:{...m,key:s||o}}}function Vn(e){let t=e.get(`general.defaultApprovalMode`)||e.get(`approvalMode`)||e.get(`approval_mode`)||e.get(`general.approvalMode`),n=Q(t)??`default`,r=t&&Q(t)!==void 0?t.key:``,i=`approval mode `+n;if(n===`yolo`)return Sn(`allowed`,i+`: every tool call runs without asking`,r);let a={mcp:{state:`asks`,why:i+`: MCP tools ask`,key:r},read:{state:`allowed`,why:`reads run without asking`,key:r},write:{state:`asks`,why:i+`: edits ask`,key:r},shell:{state:`asks`,why:i+`: shell commands ask`,key:r},web:{state:`asks`,why:i+`: web fetches ask`,key:r}};return n===`auto_edit`&&(a.write={state:`allowed`,why:i+`: edits run without asking`,key:r}),n===`plan`&&(a.write={state:`denied`,why:i+`: read-only`,key:r},a.shell={state:`denied`,why:i+`: read-only`,key:r}),a}var Hn=(e,t)=>[...e.keys()].some(e=>t.test(e)),Un=[{id:`claude`,tools:[`claude-code`],applies:e=>Hn(e,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:Ln,rules:jn,wholeName:`the whole tool`},{id:`copilot-cli`,tools:[`copilot-cli`,`copilot-desktop`],applies:e=>Hn(e,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:Rn,rules:Nn,notes:e=>{let t=Q(e.get(`savedToolApprovals`));if(!t||typeof t!=`object`)return[];let n=Object.values(t).reduce((e,t)=>e+(Number(t)||0),0),r=Object.keys(t).length;return n?[`${n} saved tool ${n===1?`approval`:`approvals`} in ${r} ${r===1?`folder`:`folders`} (permissions-config.json)`]:[]}},{id:`vscode`,tools:[`vscode`,`copilot`],applies:e=>Hn(e,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:zn,rules:Pn},{id:`codex`,tools:[`codex-cli`,`codex`],applies:e=>Hn(e,/^(approval_policy|sandbox_mode)$/),base:Bn,rules:()=>[]},{id:`gemini`,tools:[`gemini-cli`,`gemini`],applies:e=>Hn(e,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:Vn,rules:In}];function Wn(e,t){return e===`mixed`?`mixed (${t} ${t===1?`rule`:`rules`})`:e}function Gn(e){return`${bn[e.effect]} ${e.rule}${e.where.length?` (`+e.where.join(`, `)+`)`:``}`}function Kn(e,t,n){let r=n.filter(t=>t.cap===e.id),i=r.filter(e=>e.whole),a=t.state,o=t.why;if(i.length){let e=i.reduce((e,t)=>xn[t.effect]>xn[e.effect]?t:e);a=e.effect,o=`rule `+Gn(e)}let s=r.some(e=>!e.whole&&e.effect!==a),c=s?`mixed`:a,l=Wn(c,r.length),u=[`${e.label}: ${l}`];return!r.length||!i.length?u.push(`Without a rule: `+t.state+` (`+t.why+`)`):u.push((s?`For the whole tool: `:`Decided by: `)+a+` (`+o+`)`),r.length&&u.push(...r.map(e=>`• `+Gn(e))),{cap:e.id,label:e.label,state:c,text:l,title:u.join(`
`),rules:r.map(e=>({rule:e.rule,effect:e.effect,where:e.where})),key:r[0]?.key||t.key||``}}function qn(e){if(!e)return null;let t=Un.find(t=>t.tools.includes(e.id));if(!t)return null;let n=wn(e);if(!t.applies(n))return null;let r=t.base(n),i=t.rules(n,e.scopes||[]);return{tool:e.id,cells:yn.map(e=>Kn(e,r[e.id],i)),notes:t.notes?t.notes(n):[]}}function Jn(e){return(e||[]).map(e=>({entry:e,perms:qn(e)})).filter(e=>e.perms)}var Yn=[`project`,`project-local`],Xn=new Set([`permissions`,`permissions.allow`,`permissions.deny`,`permissions.ask`,`project_permissions`]),Zn=`No form for this value. Open the file and use Edit file`;function Qn(e){return!!e&&e.tool===`claude-code`&&Xn.has(e.key)}function $n(e){return e?.chain?.[e.wins]?.scope||e?.scope||`default`}function er(e,t=[]){let n=e?.chain?.[e.wins];if(e?.locked||We(n,t))return{ok:!1,hint:`Locked by `+U(e.locked?e.scope:n.scope,t)};if(!Qn(e))return{ok:!1,hint:Zn};let r=$n(e);if(!Yn.includes(r))return{ok:!1,hint:`The value comes from ${U(r,t)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};let i=(t||[]).find(e=>e.id===r);return{ok:!0,scope:r,label:U(r,t),path:n&&n.source||i?.path||``}}var tr=e=>(e||[]).join(`
`),nr=e=>String(e||``).split(`
`).map(e=>e.trim()).filter(Boolean);function rr(e,t){let n=new Set(e||[]),r=new Set(t||[]);return{added:[...r].filter(e=>!n.has(e)),removed:[...n].filter(e=>!r.has(e))}}function ir({cell:e,onPick:t}){let n=e.key&&t?()=>t(e.key):null;return _`<td class=${`st-perm st-perm--`+e.state} data-cap=${e.cap} data-state=${e.state} title=${e.title}>
    ${n?_`<button type="button" class="st-perm__btn" aria-label=${`${e.label}: ${e.text}`} onClick=${n}>${e.text}</button>`:_`<span class="st-perm__text">${e.text}</span>`}
  </td>`}var ar=(e,t)=>[...e?[{k:`tool`,l:e,get:t?e=>e.entry.label:void 0}]:[],...yn.map(e=>({k:e.id,l:e.label,attrs:{"data-cap":e.id},get:t?t=>t.perms.cells.find(t=>t.cap===e.id)?.text:void 0}))];function or({w:e,entry:t,perms:n}){let r=n=>e.select({tool:t.id,row:n}),i=ar(``,!1),a=T(`settings.perms`,i);return _`<div class="st-perms" data-testid="st-perms" data-tool=${t.id}>
    <table class=${`st-permtable `+a.tableProps.class} style=${a.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${i.map(a.th)}</tr></thead>
      <tbody><tr>${n.cells.map(e=>_`<${ir} key=${e.cap} cell=${e} onPick=${r}/>`)}</tr></tbody>
    </table>
    ${n.notes.map((e,t)=>_`<p key=${t} class="st-hint st-perms__note">${e}</p>`)}
  </div>`}function sr({w:e,mats:t}){let n=ar(`Tool`,!0),r=T(`settings.perms.all`,n);return t.length?_`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${`st-permtable `+r.tableProps.class} style=${r.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${n.map(r.th)}</tr></thead>
      <tbody>
        ${r.order(t).map(({entry:t,perms:n})=>_`<tr key=${t.id} data-tool=${t.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${Y} id=${t.id}/>${t.label}</span></th>
          ${n.cells.map(n=>_`<${ir} key=${n.cap} cell=${n} onPick=${n=>e.select({tool:t.id,row:n})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${t.flatMap(({entry:e,perms:t})=>t.notes.map((t,n)=>_`<p key=${e.id+n} class="st-hint st-perms__note">${e.label}: ${t}</p>`))}
  </div>`:null}var cr={copilot:`copilot-vscode`,vscode:`copilot-vscode`};function lr(e,t){let n=e?.tools;return!n||typeof n!=`object`?null:n[t]||n[cr[t]]||null}function ur(e){return{active:`active`,configured:`configured`,disabled:`host-disabled`,misconfigured:`wrong port`,observed:`observed`,missing:`missing`}[e]||e||`unknown`}function dr(e){let t=e?.message||``;return t.includes(`~/.copilot/hooks`)?`"chat.hookFilesLocations": { "~/.copilot/hooks": true }`:t.includes(`.github/hooks`)?`"chat.hookFilesLocations": { ".github/hooks": true }`:t.includes(`chat.useHooks`)?`"chat.useHooks": true`:``}var fr={active:`is-ok`,configured:`is-ok`,disabled:`is-warn`,misconfigured:`is-warn`,missing:`is-warn`};function pr({status:e}){let t=e.configured_events||[],n=e.missing_events||[],r=e.sources||[],i=e.warnings||[];return _`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${`st-status `+(fr[e.status]||``)} data-testid="st-hookstat-status"
        title=${e.status===`misconfigured`?`The hook commands post to a different port than this dashboard`:void 0}>${ur(e.status)}</span>
      <span>${e.configured_count||t.length} configured</span>
      ${n.length>0&&_`<span class="st-warn" title=${n.join(`, `)}>${n.length} missing: ${n.join(`, `)}</span>`}
      <span>${e.fired_24h||0} fired in 24 h</span>
      <span title=${e.last_fire_ts?new Date(e.last_fire_ts*1e3).toLocaleString():void 0}>last ${e.last_fire_ts?tn(e.last_fire_ts):`never`}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${t.length?t.map(e=>_`<span key=${e} class="st-chip st-chip--mono st-hookstat__ev">${e}</span>`):_`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${r.length>0&&_`<ul class="st-hookstat__sources">
      ${r.map(e=>_`<li key=${e.path} title=${e.path}>
        <span class="st-mono">${e.scope}</span>
        <span>${e.configured_count||0} ${e.configured_count===1?`event`:`events`}</span>
        <span class=${e.host_enabled===!1?`st-warn`:`st-dim`}>${e.host_enabled===!1?`ignored by the host`:`loaded`}</span>
      </li>`)}
    </ul>`}
    ${i.map(e=>{let t=dr(e);return _`<div key=${(e.path||``)+e.message} class="st-hookstat__warn" role="note">
        ${e.message}${t&&_`<code class="st-hookstat__snippet">${t}</code>`}
      </div>`})}
  </div>`}function mr(e,t){let n=w(e);if(t.filter(e=>w(e)===n).length<2)return n;let r=String(e).split(/[\\/]/).filter(Boolean);return r.length<2?n:(/^(Users|home)$/.test(r[0])&&r.length===4?`~/`:``)+r[r.length-2]+`/`+n}function hr({w:e}){let{entries:t,aictl:n,st:r}=e;return _`<nav class="st-nav" aria-label="Tools">
    <${X}>Tools</${X}>
    <ul class="st-nav__list">
      ${t.map(t=>{let n=t.id===e.toolId,i=t.rows.filter(n?e.passTool:e.pass),a=i.some(e=>e.risky);return _`<li key=${t.id}>
          <button type="button" class=${`st-nav__item`+(n?` is-on`:``)+(i.length?``:` is-empty`)}
            aria-current=${n?`true`:void 0} data-tool=${t.id}
            onClick=${()=>e.set({tool:t.id,sec:``,row:``,scope:n?e.st.scope:``})}>
            <${Y} id=${t.id}/><span class="st-nav__label">${t.label}</span>
            ${a&&_`<${nn} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${n&&_`<ul class="st-nav__subs">
            ${t.sections.map(t=>{let n=t.rows.filter(e.passTool),i=r.sec===t.id,a=t.id===`agents`?st(n):``;return _`<li key=${t.id}><button type="button" class=${`st-nav__sub`+(i?` is-on`:``)}
                aria-current=${i?`true`:void 0}
                onClick=${()=>e.set({sec:i?``:t.id})}>
                <span class="st-nav__label">${t.title}</span>
                ${n.some(e=>e.risky)&&_`<${nn} label="A risky setting is on"/>`}
                <span class="st-nav__n">${n.length}</span>
                ${a&&_`<span class="st-nav__model" title=${`Every agent runs on `+a}>${a}</span>`}
              </button></li>`})}
            ${t.envVars.length>0&&(()=>{let n=r.sec===`env`,i=t.envVars.filter(t=>t.set&&Re(t,e.q)).length;return _`<li key="env"><button type="button" class=${`st-nav__sub`+(n?` is-on`:``)}
                aria-current=${n?`true`:void 0} data-sec="env"
                onClick=${()=>e.set({sec:n?``:`env`})}>
                <span class="st-nav__label">Environment variables</span>
                <span class="st-nav__n">${i}</span>
              </button></li>`})()}
          </ul>`}
        </li>`})}
      ${n&&_`<li key="aictl">
        <button type="button" class=${`st-nav__item`+(e.toolId===`aictl`?` is-on`:``)}
          aria-current=${e.toolId===`aictl`?`true`:void 0} data-tool="aictl"
          onClick=${()=>e.set({tool:`aictl`,sec:``,row:``,scope:``})}>
          <${Y} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${n.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function gr({row:e,w:t,scopes:n}){let r=t.selected?.uid===e.uid,i=()=>t.select({tool:e.tool,row:e.key});return _`<tr class=${`st-row`+(e.risky?` st-row--risky`:``)+(e.unset?` st-row--unset`:``)+(r?` is-sel`:``)}
    data-key=${e.key} tabindex="0" onClick=${i}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),i())}}>
    <td class="st-c-set">
      <div class="st-label">${e.label}${e.undocumented&&_` <${on}/>`}</div>
      ${e.risky&&e.tip&&_`<div class="st-risknote">${e.tip}</div>`}
    </td>
    <td class="st-c-val"><${Jt} row=${e}/></td>
    <td class="st-c-scope"><${J} scope=${e.scope} locked=${e.locked} label=${U(e.scope,n)}/></td>
    <td class="st-c-src"><${rn} path=${e.source} line=${e.line} w=${t} tool=${e.tool}/></td>
    <td class="st-c-what" title=${e.tip||void 0}>${e.tip}</td>
  </tr>`}function _r({w:e,entry:t}){let n=t.scopes||[];if(!n.length)return null;let r=t.rows.filter(e.pass);return _`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${n.map((t,n)=>{let i=r.filter(e=>e.scope===t.id).length,a=e.st.scope===t.id,o=t.path?w(t.path):``,s=t.vars||[],c=s.length?s.slice(0,2).join(`, `)+(s.length>2?` +${s.length-2}`:``):o||t.note,l=[t.label,t.paths.length?t.paths.join(`
`):``,s.length?`Set: `+s.join(`, `):``,t.exists?``:`not present`,t.note,t.changeable?``:`Locked: cannot be changed from this machine`].filter(Boolean).join(`
`);return _`<li key=${t.id} class="st-scopes__item">
          ${n>0&&_`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${`st-scopechip`+(a?` is-on`:``)+(t.changeable?``:` is-locked`)+(t.exists?``:` is-absent`)}
            data-scope=${t.id} aria-pressed=${a?`true`:`false`} title=${l}
            onClick=${()=>e.set({scope:a?``:t.id})}>
            <span class="st-scopechip__top">
              ${!t.changeable&&_`<${Yt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${t.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?`setting wins`:`settings win`} here</span></span>
            </span>
            <span class=${`st-scopechip__file`+(s.length?` st-mono`:``)} data-vars=${s.length?s.join(`,`):void 0}>${t.exists?c:t.id===`env`?`none set`:`not present`}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function vr({children:e,section:t}){return _`<tr class="st-extra" data-extra=${t}><td colspan="5">${e}</td></tr>`}var yr=e=>typeof e.value==`number`?e.value:e.value==null||e.value===``?void 0:et(e.value);function br(e,t){return[{k:`setting`,l:`Setting`,cls:`st-c-set`,get:e=>e.label},{k:`value`,l:`Value`,cls:`st-c-val`,n:E(e,yr),get:yr},{k:`scope`,l:`Scope`,cls:`st-c-scope`,get:e=>e.scope?U(e.scope,t):void 0},{k:`source`,l:`Set in`,cls:`st-c-src`,get:e=>e.source},{k:`what`,l:`What it does`,get:e=>e.tip}]}function xr({w:e,sections:t,scopes:n,shared:r,extras:i={}}){let a=br(t.flatMap(e=>e.shown),n),o=T(`settings.tool`,a,r);return _`<table class=${`st-table `+o.tableProps.class} style=${o.tableProps.style}>
    <thead><tr>${a.map(o.th)}</tr></thead>
    ${t.map(t=>{let r=t.shown.filter(e=>e.risky).length;return _`<tbody key=${t.id} data-section=${t.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${t.title}
          <span class="st-group__meta">${t.shown.length}${r?_` · <span class="st-red">${r} risky</span>`:``}${t.hidden?_` · <span class="st-unsetn">+${t.hidden} unset</span>`:``}</span></th></tr>
        ${i[t.id]&&_`<${vr} section=${t.id}>${i[t.id]}</${vr}>`}
        ${o.order(t.shown).map(t=>_`<${gr} key=${t.uid} row=${t} w=${e} scopes=${n}/>`)}
      </tbody>`})}
  </table>`}function Sr(e){let t=[];for(let n of e){let e=n.id===`agents`&&n.shown.every(e=>e.kind===`agent`&&e.agent),r=t[t.length-1];e?t.push({agents:!0,sections:[n]}):r&&!r.agents?r.sections.push(n):t.push({agents:!1,sections:[n]})}return t}function Cr({w:e,entry:t}){let n=t.envVars.filter(t=>Re(t,e.q)),r=n.filter(e=>e.set),i=e.showUnset?n:r,a=n.length-i.length;if(!i.length&&!a)return null;let o=e.selectedEnv;return _`<table class="st-table st-envtable" data-testid="st-env-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Where</th><th>Drives</th><th>What it does</th></tr></thead>
    <tbody data-section="env">
      <tr class="st-group"><th scope="colgroup" colspan="5">Environment variables
        <span class="st-group__meta">${r.length} set${a?_` · <span class="st-unsetn">+${a} unset</span>`:``}</span></th></tr>
      ${i.map(n=>{let r=()=>e.openEnv(n.name,t.id);return _`<tr key=${n.name} class=${`st-row`+(n.set?``:` st-row--unset`)+(o&&o.uid===n.uid?` is-sel`:``)}
          data-env=${n.name} tabindex="0" onClick=${r}
          onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),r())}}>
          <td class="st-c-set"><div class="st-label st-mono">${n.name}</div>${!n.documented&&_` <${on}/>`}</td>
          <td class="st-c-val">${n.set?n.masked?_`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:_`<span class="st-v st-mono" title=${n.value}>${n.value===``?`(empty)`:n.value}</span>`:_`<span class="st-none">not set</span>`}</td>
          <td class="st-c-src st-mono">${Fe(n)||_`<span class="st-none">—</span>`}</td>
          <td>${n.drives.length?n.drives.map(e=>e.label).join(`, `):_`<span class="st-none">—</span>`}</td>
          <td class="st-c-what" title=${n.description||void 0}>${n.description}</td>
        </tr>`})}
    </tbody>
  </table>`}function wr({w:e,entry:t}){let n=ue(`settings.tool`),r=(!e.st.sec||e.st.sec===`env`)&&(!e.st.scope||e.st.scope===`env`),i=r&&t.envVars.some(t=>(t.set||e.showUnset)&&Re(t,e.q)),a=t.sections.filter(t=>!e.st.sec||t.id===e.st.sec).map(t=>({...t,shown:t.rows.filter(e.passTool),hidden:e.showUnset?0:t.rows.filter(t=>t.unset&&e.passAll(t)&&(!e.st.scope||t.scope===e.st.scope)).length})).filter(e=>e.shown.length||e.hidden),o=t.rows.length,s=qn(t),c=lr(e.hooks,t.id),l={autonomy:s&&_`<${or} w=${e} entry=${t} perms=${s}/>`,hooks:c&&_`<${pr} status=${c}/>`},u=e.st.scope?U(e.st.scope,t.scopes):``;return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${Y} id=${t.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${t.label}</h2>
      <span class="st-bar__sub">${o} ${o===1?`setting`:`settings`} in ${t.files.length} ${t.files.length===1?`file`:`files`}${t.envUsed.length?` and ${t.envUsed.length} ${t.envUsed.length===1?`variable`:`variables`}`:``}${t.risky?_` · <span class="st-red">${t.risky} risky</span>`:``}</span>
      <span class="st-bar__files">
        ${t.files.map(n=>_`<button type="button" key=${n} class="st-chip st-chip--mono st-chip--btn" title=${n}
          onClick=${()=>e.openAt(n)}>${mr(n,t.files)}</button>`)}
        ${t.envUsed.map(n=>_`<button type="button" key=${`env:`+n.name} class="st-chip st-chip--mono st-chip--btn st-chip--env"
          data-env=${n.name} title=${`Environment variable `+n.name+(n.drives.length?`: sets `+n.drives.map(e=>e.label).join(`, `):``)}
          onClick=${()=>e.openEnv(n.name,t.id)}><span class="st-chip__pre" aria-hidden="true">$</span>${n.name}</button>`)}
      </span>
    </div>
    ${t.id===`vscode`&&_`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${t.hints.map((e,t)=>_`<p key=${t} class="st-note">${e}</p>`)}
    <${_r} w=${e} entry=${t}/>
    ${a.length?Sr(a).map((r,i)=>r.agents?_`<${pn} key=${`a`+i} w=${e} section=${r.sections[0]}/>`:_`<${xr} key=${`g`+i} w=${e} sections=${r.sections} scopes=${t.scopes} shared=${n} extras=${l}/>`):i?null:_`<p class="st-empty">${o?u?`No setting shown here is set at the ${u} layer.`:`No setting matches the search or the toggles.`:`No settings were read for this tool.`}</p>`}
    ${r&&_`<${Cr} w=${e} entry=${t}/>`}
  </section>`}var Tr=[{k:`collector`,l:`Collector`,cls:`st-c-set`,get:e=>e.name},{k:`mode`,l:`Mode`,get:e=>e.mode},{k:`status`,l:`Status`,get:e=>e.status},{k:`detail`,l:`Detail`,get:e=>e.detail}];function Er({w:e,aictl:t}){let n=T(`settings.collectors`,Tr),r=e.q.trim().toLowerCase(),i=t.collectors.filter(e=>!r||[e.name,e.mode,e.status,e.detail].join(` `).toLowerCase().includes(r)),a=t.roots.filter(e=>!r||e.toLowerCase().includes(r));return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${Y} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${t.collectors.length} collectors · ${t.roots.length} monitored roots</span>
    </div>
    ${i.length>0&&_`<table class=${`st-table `+n.tableProps.class} style=${n.tableProps.style}>
      <thead><tr>${Tr.map(n.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${i.length}</span></th></tr>
        ${n.order(i).map(e=>_`<tr key=${e.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${e.name}</td>
          <td class="st-mono">${e.mode||`—`}</td>
          <td><span class=${`st-status `+(e.status===`active`?`is-ok`:`is-warn`)}>${e.status}</span></td>
          <td class="st-c-what" title=${e.detail||void 0}>${e.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${a.length>0&&_`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${a.map((e,t)=>_`<li key=${t} class="st-mono" title=${e}>${e}</li>`)}</ul>`}
    ${!i.length&&!a.length&&_`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function Dr(e){if(e.st.sec&&A.includes(e.st.sec))return e.st.sec;let t=t=>e.entries.some(e=>e.rows.some(e=>e.sec===t));return t(`autonomy`)?`autonomy`:A.find(t)||`autonomy`}function Or({w:e}){let t=Dr(e);return _`<nav class="st-nav" aria-label="Topics">
    <${X}>Topics</${X}>
    <ul class="st-nav__list">
      ${A.map(n=>{let r=e.entries.filter(t=>t.rows.some(t=>t.sec===n&&e.pass(t))),i=r.some(t=>t.rows.some(t=>t.sec===n&&t.risky&&e.pass(t))),a=n===t;return _`<li key=${n}><button type="button" class=${`st-nav__item`+(a?` is-on`:``)+(r.length?``:` is-empty`)}
          aria-current=${a?`true`:void 0} data-sec=${n}
          onClick=${()=>e.set({sec:n})}>
          <span class="st-nav__label">${j[n]}</span>
          ${i&&_`<${nn} label="A risky setting is on"/>`}
          <span class="st-nav__n">${r.length} ${r.length===1?`tool`:`tools`}</span>
        </button></li>`})}
    </ul>
  </nav>`}function kr({w:e}){let[t,n]=g(`tool`),r=e.entries.flatMap(e=>e.rows.filter(e=>e.sec===`agents`&&at(e))),i=r.filter(e.pass),a=new Set(i.map(e=>e.tool)).size,o=i.filter(W).length;return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${j.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${i.length} ${i.length===1?`agent`:`agents`} in ${a} ${a===1?`tool`:`tools`}, ${o} inherit the session model</span>
    </div>
    ${i.length?_`<${vn} w=${e} rows=${i} sort=${t} onSort=${n}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:_`<p class="st-empty">${r.length?`No agent matches the search or the toggles.`:`No tool reports agents.`}</p>`}
  </section>`}function Ar(e,t,n){let r=e.cells[t];if(!(!r||r.unset&&!n))return typeof r.value==`number`?r.value:r.value==null||r.value===``?void 0:et(r.value)}function jr({w:e,tools:t,rows:n}){let r=[{k:`setting`,l:`Setting`,cls:`st-c-set`,get:e=>e.label},...t.map(t=>({k:t.id,cls:`st-matrix__tool`,attrs:{"data-tool":t.id},n:E(n,n=>Ar(n,t.id,e.showUnset)),l:_`<span class="st-matrix__toolname"><${Y} id=${t.id}/>${t.label}</span>`,get:n=>Ar(n,t.id,e.showUnset)}))],i=T(`settings.topic`,r);return _`<div class="st-scroll"><table class=${`st-table st-matrix `+i.tableProps.class} style=${i.tableProps.style}>
      <thead><tr>${r.map(i.th)}</tr></thead>
      <tbody>
        ${i.order(n).map(n=>_`<tr key=${n.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${n.keys.join(`
`)}>${n.label}</th>
          ${t.map(t=>{let r=n.cells[t.id];if(!r||r.unset&&!e.showUnset)return _`<td key=${t.id} class="st-cell st-cell--none">—</td>`;let i=e.selected?.uid===r.uid;return _`<td key=${t.id} class=${`st-cell`+(r.risky?` is-risky`:``)+(r.unset?` is-unset`:``)+(i?` is-sel`:``)}>
              <button type="button" class="st-cellbtn" data-key=${r.key}
                aria-label=${`${n.label}, ${t.label}: ${et(r.value)}${r.unset?` (not set, default)`:``}`}
                onClick=${()=>e.select({tool:t.id,row:r.key})}>
                <${Jt} row=${r} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function Mr({w:e}){let t=Dr(e);if(t===`agents`)return _`<${kr} w=${e}/>`;let{tools:n,rows:r}=ht(e.entries,t,e.pass),i=r.reduce((e,t)=>e+Object.values(t.cells).filter(e=>e.risky).length,0),a=t===`autonomy`?Jn(e.entries):[];return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${j[t]}</h2>
      <span class="st-bar__sub">every tool, side by side${i?_` · <span class="st-red">${i} risky ${i===1?`value`:`values`}</span>`:``}</span>
    </div>
    <${sr} w=${e} mats=${a}/>
    ${r.length?_`<${jr} w=${e} tools=${n} rows=${r}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:_`<p class="st-empty">${n.length?`No setting matches the search or the toggles.`:`No tool has settings in this section.`}</p>`}
  </section>`}var Nr=8,Pr=86400,Fr=8;function Ir(e){let t=e.cell?e.cell.split(`:`):null;return{loc:q(e.sec),tools:q(e.tool),purpose:q(e.purpose),scope:q(e.fscope),git:q(e.git),recent:!!e.recent,cell:t&&t.length===2?t:null}}function Lr(e,t,n,r){return!(n!==`loc`&&t.loc.length&&!t.loc.includes(e.location)||n!==`tools`&&t.tools.length&&!e.tools.some(e=>t.tools.includes(e))||n!==`purpose`&&t.purpose.length&&!t.purpose.includes(K(e))||n!==`scope`&&t.scope.length&&!t.scope.includes(e.scope)||n!==`git`&&t.git.length&&!t.git.includes(xt(e))||n!==`recent`&&t.recent&&!(e.mtime&&e.mtime>=r-Pr)||n!==`cell`&&t.cell&&(K(e)!==t.cell[0]||e.location!==t.cell[1]))}function Rr(e,t=null,n=Date.now()/1e3){let r=Ir(e.st);return e.files.filter(i=>kt(i,e.q)&&Lr(i,r,t,n))}function zr(e,t,n){let r=q(e.st[t]);e.set({[t]:Gt(r.includes(n)?r.filter(e=>e!==n):[...r,n]),row:``})}function Br({w:e,title:t,fkey:n,skip:r,options:i,valueOf:a,attr:o,swatch:s}){let c=Rr(e,r),l=q(e.st[n]),u=i.map(e=>({...e,n:c.filter(t=>a(t).includes(e.id)).length})).filter(e=>e.n||l.includes(e.id)||e.always);return u.length?_`<${X}>${t}</${X}>
    <ul class="st-nav__list" aria-label=${t}>
      ${u.map(t=>{let r=l.includes(t.id);return _`<li key=${t.id}><button type="button" class=${`st-nav__item`+(r?` is-on`:``)+(t.n?``:` is-empty`)}
          aria-pressed=${r?`true`:`false`} ...${{[o]:t.id}} onClick=${()=>zr(e,n,t.id)}>
          ${s?_`<${Y} id=${t.id}/>`:null}<span class="st-nav__label">${t.label}</span><span class="st-nav__n">${t.n}</span></button></li>`})}
    </ul>`:null}function Vr({w:e}){let t=[...new Set(e.files.flatMap(e=>e.tools))],n=[...new Set(e.files.map(e=>e.scope).filter(Boolean))],r=Rr(e,`recent`).filter(e=>e.mtime&&e.mtime>=Date.now()/1e3-Pr).length;return _`<nav class="st-nav" aria-label="File filters">
    <${Br} w=${e} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${gt.map(e=>({...e,always:!0}))} valueOf=${e=>[e.location]}/>
    <${Br} w=${e} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${yt} valueOf=${e=>[K(e)]}/>
    <${Br} w=${e} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${t.map(t=>({id:t,label:e.labelOf(t)}))} valueOf=${e=>e.tools}/>
    <${Br} w=${e} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${n.map(e=>({id:e,label:Be[e]||e}))} valueOf=${e=>[e.scope]}/>
    <${Br} w=${e} title="Git" fkey="git" skip="git" attr="data-git" options=${bt} valueOf=${e=>[xt(e)]}/>
    <${X}>Changes</${X}>
    <ul class="st-nav__list">
      <li><button type="button" class=${`st-nav__item`+(e.st.recent?` is-on`:``)} aria-pressed=${e.st.recent?`true`:`false`}
        data-recent="1" onClick=${()=>e.set({recent:!e.st.recent,row:``})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${r}</span></button></li>
    </ul>
  </nav>`}function Hr({w:e}){let t=Ir(e.st),n=[...t.loc.map(t=>({k:`sec:`+t,label:`Location: `+(vt[t]||t),drop:()=>zr(e,`sec`,t)})),...t.purpose.map(t=>({k:`purpose:`+t,label:`Purpose: `+(G[t]||t),drop:()=>zr(e,`purpose`,t)})),...t.tools.map(t=>({k:`tool:`+t,label:`Read by: `+e.labelOf(t),drop:()=>zr(e,`tool`,t)})),...t.scope.map(t=>({k:`fscope:`+t,label:`Scope: `+(Be[t]||t),drop:()=>zr(e,`fscope`,t)})),...t.git.map(t=>({k:`git:`+t,label:`Git: `+(bt.find(e=>e.id===t)?.label||t),drop:()=>zr(e,`git`,t)})),...t.recent?[{k:`recent`,label:`Changed in the last 24 h`,drop:()=>e.set({recent:!1,row:``})}]:[],...t.cell?[{k:`cell`,label:(G[t.cell[0]]||t.cell[0])+` in `+(vt[t.cell[1]]||t.cell[1]),drop:()=>e.set({cell:``,row:``})}]:[]];return n.length?_`<div class="st-fchips" data-testid="st-file-chips">
    ${n.map(e=>_`<button key=${e.k} type="button" class="st-chip st-chip--btn" data-chip=${e.k}
      aria-label=${`Remove the filter `+e.label} onClick=${e.drop}>${e.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>e.set({sec:``,tool:``,purpose:``,fscope:``,git:``,recent:!1,cell:``,row:``})}>Clear filters</button>
  </div>`:null}function Ur({w:e}){let t=Mt(Rr(e,`cell`).filter(e=>!e.is_dir)),n=[{k:`purpose`,l:`Purpose`,get:e=>e.label},...t.cols.map(e=>({k:e.id,l:e.label,cls:`st-num`,n:!0,get:t=>t.cells[e.id]||void 0})),{k:`all`,l:`All`,cls:`st-num`,n:!0,get:e=>e.total||void 0}],r=T(`settings.files.matrix`,n);return t.rows.length?_`<div class="st-scroll"><table class=${`st-table st-fmatrix `+r.tableProps.class} style=${r.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${n.map(r.th)}</tr></thead>
    <tbody>${r.order(t.rows).map(n=>_`<tr key=${n.id}>
      <th scope="row">${n.label}</th>
      ${t.cols.map(t=>{let r=n.cells[t.id]||0,i=n.id+`:`+t.id,a=e.st.cell===i;return _`<td key=${t.id} class=${`st-cell st-num`+(a?` is-sel`:``)}>${r?_`<button type="button" class="st-cellbtn" data-cell=${i} aria-pressed=${a?`true`:`false`}
              aria-label=${r+` `+n.label+` `+(r===1?`file`:`files`)+` in `+t.label}
              onClick=${()=>e.set({cell:a?``:i,row:``})}>${r}</button>`:_`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${n.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function Wr({f:e,w:t}){let n=t.selectedFile&&t.selectedFile.path===e.path,r=()=>t.select({row:e.path}),i=St(e);return _`<tr class=${`st-row`+(n?` is-sel`:``)+(e.exists===!1?` is-missing`:``)}
    data-path=${e.path} tabindex="0" onClick=${r}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),r())}}>
    <td class="st-c-file">
      ${e.is_dir?_`<span class="st-fname" title=${e.path}>${e.name}/</span>`:_`<button type="button" class="st-fname st-link" title=${`Open `+e.path}
            onClick=${n=>{n.stopPropagation(),t.openAt(e.path)}}>${e.name}</button>`}
      ${e.exists===!1&&_`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${K(e)}>${e.is_dir?`Folder`:G[K(e)]}</span></td>
    <td><${J} scope=${e.scope}/></td>
    <td><span class="st-tools">${e.tools.map(e=>_`<${Z} key=${e} id=${e} label=${t.labelOf(e)}/>`)}</span></td>
    <td class="st-mono st-num">${e.settings?e.settings:`—`}</td>
    <td class="st-mono st-num">${!e.is_dir&&e.bytes!=null?en(e.bytes):`—`}</td>
    <td class=${i?`st-warn`:`st-dim`} data-git=${xt(e)||void 0}
      title=${i?`A tool always loads this file, and git does not track it`:void 0}>${e.git_state||`—`}</td>
    <td class="st-dim">${e.mtime?tn(e.mtime):`—`}</td>
  </tr>`}function Gr(e){let t=Ir(e.st);if(t.loc.length||t.purpose.length||t.scope.length||t.git.length||t.recent||t.cell)return[];let n=e.q.trim().toLowerCase();return(e.managedAbsent||[]).filter(e=>(!n||[e.path,e.label,e.note].join(`
`).toLowerCase().includes(n))&&(!t.tools.length||e.tools.some(e=>t.tools.includes(e))))}function Kr({w:e,items:t}){let[n,r]=g(!1);return _`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${Fr}>
      <button type="button" class="st-fold" aria-expanded=${n?`true`:`false`} onClick=${()=>r(!n)}>
        <span aria-hidden="true">${n?`▾`:`▸`}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${t.length} ${t.length===1?`location`:`locations`} · where a policy would come from</span>
    </th></tr>
    ${n&&t.map(t=>_`<tr key=${t.path} class="st-row st-row--static st-row--absent" data-path=${t.path}>
      <td class="st-c-file"><span class="st-fname" title=${t.path+(t.note?`
`+t.note:``)}>${H(t.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${Yt} label="Cannot be changed from this machine"/><${J} scope=${t.scope}/></span></td>
      <td><span class="st-tools">${t.tools.map(t=>_`<${Z} key=${t} id=${t} label=${e.labelOf(t)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function qr(e,t){let n=e.filter(e=>!e.is_dir),r=e.filter(e=>e.is_dir),i=t===`purpose`?jt(n).map(e=>({key:`purpose:`+e.id,attrs:{"data-purpose":e.id},title:e.label,mono:!1,root:null,files:e.files})):Nt(n).map(e=>({key:e.root,attrs:{"data-root":e.root},title:H(e.root),full:e.root,mono:!0,root:e.root,sub:_t[e.location]||`Other`,files:e.files}));return r.length&&i.push({key:`watched`,attrs:{"data-root":`watched`},title:`Watched folders`,mono:!1,root:null,flat:!0,sub:`folders the monitor reads`,files:r}),i}function Jr({g:e,w:t,open:n,setOpen:r,shut:i,setShut:a,grid:o}){let s=!!i[e.key],c=[...new Set(e.files.flatMap(e=>e.tools))],l=e.files.reduce((e,t)=>e+(t.is_dir?0:Number(t.bytes)||0),0),u=(e.flat?[{dir:``,files:e.files}]:At(e.files)).map(e=>({...e,files:o.order(e.files)}));return e.root&&u.sort((t,n)=>(n.dir===e.root)-(t.dir===e.root)),_`<tbody ...${e.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${Fr}>
      <button type="button" class="st-fold" aria-expanded=${s?`false`:`true`}
        onClick=${()=>a({...i,[e.key]:!s})}>
        <span aria-hidden="true">${s?`▸`:`▾`}</span>
        <span class=${e.mono?`st-mono`:``} title=${e.full||void 0}>${e.title}</span></button>
      <span class="st-group__meta">${e.sub?e.sub+` · `:``}${e.files.length} ${e.files.length===1?`file`:`files`}${l?` · `+en(l):``}</span>
      ${c.length>0&&_`<span class="st-tools st-group__tools">${c.map(e=>_`<${Z} key=${e} id=${e} label=${t.labelOf(e)}/>`)}</span>`}
    </th></tr>
    ${!s&&u.map(i=>{let a=e.key+`|`+i.dir,o=n[a]?i.files:i.files.slice(0,Nr),s=i.files.length-o.length;return _`<${p} key=${a}>
        ${i.dir&&i.dir!==e.root&&_`<tr class="st-folder" data-dir=${i.dir}><td colspan=${Fr}>
          <span class="st-mono st-path" title=${i.dir}>${H(i.dir)}</span><span class="st-dim"> · ${i.files.length}</span></td></tr>`}
        ${o.map(e=>_`<${Wr} key=${e.path} f=${e} w=${t}/>`)}
        ${s>0&&_`<tr class="st-morerow"><td colspan=${Fr}>
          <button type="button" class="st-link st-more" onClick=${()=>r({...n,[a]:!0})}>▸ ${s} more</button>
        </td></tr>`}
      </${p}>`})}
  </tbody>`}var Yr=[{value:`location`,label:`By location`},{value:`purpose`,label:`By purpose`}],Xr=e=>{if(!e.mtime)return;let t=Number(e.mtime);return t>0?t:typeof e.mtime==`string`&&Date.parse(e.mtime)||void 0};function Zr(e){return[{k:`file`,l:`File`,cls:`st-c-file`,get:e=>e.name},{k:`purpose`,l:`Purpose`,get:e=>e.is_dir?`Folder`:G[K(e)]},{k:`scope`,l:`Scope`,get:e=>e.scope},{k:`readby`,l:`Read by`,get:t=>t.tools.map(e.labelOf).join(`, `)},{k:`settings`,l:`Settings`,cls:`st-num`,n:!0,get:e=>e.settings||void 0},{k:`size`,l:`Size`,cls:`st-num`,n:!0,get:e=>e.is_dir||e.bytes==null?void 0:Number(e.bytes)},{k:`git`,l:`Git`,get:e=>e.git_state},{k:`changed`,l:`Last change`,n:!0,get:Xr}]}function Qr({w:e}){let t=T(`settings.files`,Zr(e)),[n,r]=g({}),[i,a]=g({}),o=Rr(e),s=e.st.group===`purpose`?`purpose`:`location`,c=qr(o,s),l=Gr(e);return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${o.length} ${o.length===1?`file`:`files`} · grouped by ${s===`purpose`?`what they are for`:`where they live`}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${Yr.map(t=>_`<button key=${t.value} type="button" class="st-seg__btn" aria-pressed=${s===t.value?`true`:`false`}
          onClick=${()=>e.set({group:t.value})}>${t.label}</button>`)}
      </div>
    </div>
    ${e.filesStatus!==`ready`&&_`<p class="st-note" role="status">${e.readonly?`File details are not reported for the selected nodes.`:`File details are loading`}</p>`}
    <${Ur} w=${e}/>
    <${Hr} w=${e}/>
    ${c.length||l.length?_`<div class="st-scroll"><table class=${`st-table st-files `+t.tableProps.class} style=${t.tableProps.style}>
      <thead><tr>${Zr(e).map(t.th)}</tr></thead>
      ${c.map(o=>_`<${Jr} key=${o.key} g=${o} w=${e} open=${n} setOpen=${r} shut=${i} setShut=${a} grid=${t}/>`)}
      ${l.length>0&&_`<${Kr} w=${e} items=${l}/>`}
    </table></div>`:_`<p class="st-empty">${e.readonly?`No settings file records for this scope.`:e.files.length?`No file matches the search or the filters.`:`No settings files were found.`}</p>`}
  </section>`}var $r=5;function ei(e,t){return e?H(e)+(t>0?`:`+t:``):`—`}function ti({w:e}){let t=Bt(e.findings.filter(t=>zt(t,e.q)));return _`<nav class="st-nav" aria-label="Finding rules">
    <${X}>Finding rules</${X}>
    <ul class="st-nav__list">
      <li><button type="button" class=${`st-nav__item`+(e.st.sec?``:` is-on`)} aria-current=${e.st.sec?void 0:`true`}
        onClick=${()=>e.set({sec:``,row:``})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${t.reduce((e,t)=>e+t.count,0)}</span></button></li>
      ${t.map(t=>{let n=e.st.sec===t.rule;return _`<li key=${t.rule}><button type="button" class=${`st-nav__item`+(n?` is-on`:``)}
          aria-current=${n?`true`:void 0} data-rule=${t.rule}
          onClick=${()=>e.set({sec:n?``:t.rule,row:``})}>
          ${t.alarm?_`<${nn} label=${t.severity+` severity`}/>`:_`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${t.label}</span><span class="st-nav__n">${t.count}</span></button></li>`})}
    </ul>
  </nav>`}function ni({f:e,group:t,w:n}){let r=n.selectedFinding&&n.selectedFinding.id===e.id,i=()=>n.select({row:e.id,sec:n.st.sec}),a=t.why&&e.why===t.why?e.action||``:e.why||e.action||``,o=Lt(e).map(n.labelOf).join(`, `)||(e.session_id?`session `+e.session_id:`—`);return _`<tr class=${`st-row`+(r?` is-sel`:``)+(e.severity===`high`||e.severity===`medium`?` st-row--risky`:``)}
    data-id=${e.id} tabindex="0" onClick=${i}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),i())}}>
    <td class="st-c-tool">${o}</td>
    <td class="st-c-where st-mono" title=${e.path?e.path+(e.line>0?`:`+e.line:``):void 0}>
      ${ei(e.path,e.line)}${e.count>1?_` <span class="st-dim">×${e.count}</span>`:``}</td>
    <td class="st-c-what" title=${[e.why,e.action].filter(Boolean).join(`
`)||void 0}>${a}</td>
    <td class="st-c-act">${e.path&&(L(e.path)?_`<button type="button" class="st-chip st-chip--btn"
        onClick=${t=>{t.stopPropagation(),n.openEnv(R(e.path),Lt(e)[0]||``)}}>Show the variable</button>`:_`<button type="button" class="st-chip st-chip--btn"
        onClick=${t=>{t.stopPropagation(),n.openAt(e.path,e.line)}}>Show the line</button>`)}</td>
  </tr>`}function ri(e){return[{k:`tool`,l:`Tool`,cls:`st-c-tool`,get:t=>Lt(t).map(e.labelOf).join(`, `)},{k:`where`,l:`Where`,cls:`st-c-where`,get:e=>e.path?H(e.path)+String(e.line>0?e.line:0).padStart(8,`0`):void 0},{k:`what`,l:`What it does`,get:e=>e.why||e.action},{k:`action`,l:_`<span class="st-sr">Action</span>`,cls:`st-c-act`}]}function ii({w:e}){let t=T(`settings.findings`,ri(e)),[n,r]=g({});if(e.auditStatus===`loading`&&!e.audit){let t=e.scan;return _`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${t?` `+(t.step||``)+(t.elapsed_s==null?``:`, `+Math.round(t.elapsed_s)+` s`):``}</p>
    </section>`}if(e.auditStatus===`error`&&!e.audit)return _`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${e.auditError}
        ${e.rescan&&_` <button type="button" class="st-btn" onClick=${()=>e.rescan()}>Retry</button>`}</p>
    </section>`;let i=Bt(e.findings.filter(t=>zt(t,e.q))).filter(t=>!e.st.sec||t.rule===e.st.sec),a=i.reduce((e,t)=>e+t.count,0),o=e.auditStatus===`loading`,s=e.audit?.incomplete||[],c=e.audit?.failed_steps||[];return _`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${a} in ${i.length} ${i.length===1?`rule`:`rules`} · hidden changes, conflicts and settings outside this project</span>
      ${e.rescan&&_`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${o}
        onClick=${()=>e.rescan()}>${o?`Scanning…`:`Rescan`}</button>`}
    </div>
    ${o&&_`<p class="st-note" role="status" data-state="rescanning">Scanning again…${e.scan?` `+(e.scan.step||``)+(e.scan.elapsed_s==null?``:`, `+Math.round(e.scan.elapsed_s)+` s`):``} The last results stay until it ends.</p>`}
    ${e.auditStatus===`error`&&_`<p class="st-note st-red" role="alert">The last scan failed: ${e.auditError}. These are the earlier results.</p>`}
    ${s.length>0&&_`<p class="st-note st-warn">The scan reached its time limit and skipped: ${s.join(`, `)}.</p>`}
    ${c.length>0&&_`<p class="st-note st-warn">The scan could not read: ${c.map(e=>e.step+` (`+e.error+`)`).join(`, `)}.</p>`}
    ${i.length?_`<table class=${`st-table st-findings `+t.tableProps.class} style=${t.tableProps.style}>
      <thead><tr>${ri(e).map(t.th)}</tr></thead>
      ${i.map(i=>{let a=!!n[i.rule],o=t.order(i.items),s=a?o:o.slice(0,$r),c=o.length-s.length;return _`<tbody key=${i.rule} data-rule=${i.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${i.alarm&&_`<${nn} label=${i.severity+` severity`}/>`} ${i.label}
            <span class="st-group__meta">${i.count} · ${i.tools.map(e.labelOf).join(`, `)||`no tool`}${i.why?` · `+i.why:``}</span>
          </th></tr>
          ${s.map(t=>_`<${ni} key=${t.id} f=${t} group=${i} w=${e}/>`)}
          ${c>0&&_`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>r({...n,[i.rule]:!0})}>▸ ${c} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:_`<p class="st-empty">${e.findings.length?`No finding matches the search.`:`No findings for the selected tools.`}</p>`}
  </section>`}var ai=[{id:`allow`,label:`Allow`,hint:`run without asking`},{id:`deny`,label:`Deny`,hint:`always refused`},{id:`ask`,label:`Ask`,hint:`always ask first`}];function oi(e){return String(e?.message||e||``).replace(/^HTTP \d+ \S+: /,``)||`The request failed`}var si=e=>Object.fromEntries(ai.map(t=>[t.id,tr(e?.permissions?.[t.id])]));function ci({title:e,diff:t}){let n=t.added.length||t.removed.length;return _`<div class="st-diff" data-bucket=${e}>
    <span class="st-diff__name">${e}</span>
    <span class="st-diff__chips">
      ${n?_`${t.added.map(e=>_`<code key=${`a`+e} class="st-diff__chip is-added">+ ${e}</code>`)}
          ${t.removed.map(e=>_`<code key=${`r`+e} class="st-diff__chip is-removed">- ${e}</code>`)}`:_`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function li({tool:e,target:t,refresh:n,onClose:r}){let[i,a]=g(null),[o,s]=g(()=>si(null)),[c,l]=g(!0),[u,f]=g(!1),[p,h]=g(null),[ne,v]=g(null),y=d(()=>{let n=!0;return l(!0),h(null),ee(e,t.scope).then(e=>{n&&(a(e),s(si(e)),l(!1))},e=>{n&&(h({message:oi(e),conflict:!0}),l(!1))}),()=>{n=!1}},[e,t.scope]);m(()=>y(),[y]);let b=Object.fromEntries(ai.map(e=>[e.id,nr(o[e.id])])),re=Object.fromEntries(ai.map(e=>[e.id,i?.permissions?.[e.id]||[]])),x=Object.fromEntries(ai.map(e=>[e.id,rr(re[e.id],b[e.id])])),ie=ai.some(e=>JSON.stringify(re[e.id])!==JSON.stringify(b[e.id])),ae=JSON.stringify({permissions:b},null,2),S=i?.path||t.path;return _`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${t.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${S}>${S}</span> (${t.label})${i&&!i.exists?`, a new file`:``}
    </p>
    ${p&&_`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${p.message}</span>
      ${p.conflict&&_`<button type="button" class="st-btn" onClick=${()=>{v(null),y()}}>Reload</button>`}
    </div>`}
    ${ne&&_`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${ne.backup?_`Saved. Backup: <span class="st-mono" title=${ne.backup}>${ne.backup}</span>`:`Saved. The file was new, so there is no backup.`}
    </div>`}
    ${c?_`<p class="st-hint">Loading the file…</p>`:i&&_`
      <div class="st-editor__fields">
        ${ai.map(e=>_`<label key=${e.id} class="st-editor__field">
          <span class="st-editor__label">${e.label} <span class="st-dim">· ${e.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${e.id} rows="4" spellcheck="false" value=${o[e.id]}
            onInput=${t=>s({...o,[e.id]:t.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${ai.map(e=>_`<${ci} key=${e.id} title=${e.id} diff=${x[e.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${ae}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${()=>{f(!0),h(null),v(null),te(e,{scope:t.scope,expected_mtime:i?.mtime??null,permissions:b}).then(e=>{a(e),s(si(e)),v({backup:e?.backup_path||``}),f(!1),typeof n==`function`&&n()},e=>{h({message:oi(e),conflict:e?.status===409}),f(!1)})}} disabled=${c||u||!i||!ie}>${u?`Saving…`:`Save`}</button>
      <button type="button" class="st-btn" onClick=${r}>Cancel</button>
    </div>
  </section>`}function $({title:e,children:t}){return _`<section class="st-insp__sec"><h4 class="st-insp__h">${e}</h4>${t}</section>`}function ui(e,t){return`Open `+w(e)+(t>0?` at line `+t:``)}function di(e,t){return t?e.findings.filter(e=>I(e.path,t)):[]}function fi(e,t){e.set({view:`findings`,sec:t.rule||``,row:t.id,tool:``})}function pi({w:e,path:t}){let n=t&&e.recentFiles&&typeof e.recentFiles.get==`function`?e.recentFiles.get(t):null,r=t?e.mtimeOf(t):null,i=[];return n?i.push(`File changed ${tn(n.ts)}${n.tool?` by `+e.labelOf(n.tool):``} (file history)`):r&&i.push(`File last changed ${tn(r)} (file history)`),_`<div class="st-hint" data-testid="st-history">${i.length?i.join(` · `)+` · no aictl change recorded`:`No aictl change recorded`}</div>`}function mi(e,t){let n=e.chain?.[e.wins];return e.locked||We(n,t)?`Locked by `+U(e.locked?e.scope:n.scope,t):Zn}function hi(e,t){let n=Ge(t);return`Not set in any file. Default: ${et(e.value)}.`+(n?` Set it in ${H(n.path)} (${n.label}).`:``)}function gi({w:e,row:t}){let n=e.scopesOf(t.tool),r=e.entries.filter(e=>e.id!==t.tool&&t.source&&e.files.some(e=>I(e,t.source))).map(e=>e.label),i=t.source?e.files.find(e=>I(e.path,t.source)):null;for(let n of i?.tools||[]){let i=e.labelOf(n);n!==t.tool&&!r.includes(i)&&r.push(i)}let a=di(e,t.source),{chain:o,wins:s}=t,c=er(t,n),[l,u]=g(!1);return _`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${t.label}</h3>
    <div class="st-insp__key st-mono">${t.key}</div>
    ${t.tip&&_`<p class="st-insp__tip">${t.tip}</p>`}
    <div class="st-insp__chips">
      ${t.risky&&_`<span class="st-chip st-chip--risky">risky</span>`}
      <${Z} id=${t.tool} label=${e.labelOf(t.tool)}/>
      <${J} scope=${t.scope} locked=${t.locked} label=${U(t.scope,n)}/>
      ${t.undocumented&&_`<${on}/>`}
      ${r.length>0&&_`<span class="st-chip">also read by ${r.join(`, `)}</span>`}
    </div>
    <div class=${`st-insp__value`+(t.unset?` is-unset`:``)}><${Jt} row=${t}/></div>
    ${t.unset&&_`<p class="st-insp__tip" data-testid="st-unset-text">${hi(t,n)}</p>`}
    <${$} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${o.map((r,i)=>{let a=i===s,o=We(r,n);return _`<li key=${i} class=${`st-chain__lv`+(a?` is-win`:``)+(o?` is-locked`:``)} aria-current=${a?`true`:void 0}>
            <span class="st-chain__sc">${o&&_`<${Yt} label=${`Locked: `+U(r.scope,n)+` cannot be changed here`}/>`}${r.scope||`default`}</span>
            <span class="st-chain__v">${Ye(r)?_`<span class="st-dim">not set</span>`:_`<${Jt} row=${t} value=${r.value} compact/>`}</span>
            <span class="st-chain__src">${r.source?_`<${rn} path=${r.source} line=${Number(r.line)>0?Number(r.line):0} w=${e} tool=${t.tool}/>`:_`<span class="st-dim">${r.note||(r.scope==="default"?e.labelOf(t.tool):`—`)}</span>`}</span>
            ${a&&_`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${Qe(o,s)}</p>
    </${$}>
    ${!L(t.source)&&_`<${$} title="History"><${pi} w=${e} path=${t.source}/></${$}>`}
    <${$} title="Actions">
      <div class="st-actions">
        ${t.source&&(L(t.source)?_`<button type="button" class="st-btn" onClick=${()=>e.openEnv(R(t.source),t.tool)}>Show ${R(t.source)||`the variable`}</button>`:_`<button type="button" class="st-btn" onClick=${()=>e.openAt(t.source,t.line)}>${ui(t.source,t.line)}</button>`)}
        ${a.length>0&&_`<button type="button" class="st-btn" onClick=${()=>fi(e,a[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!c.ok||l}
          aria-expanded=${c.ok?l?`true`:`false`:void 0}
          onClick=${()=>u(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${c.ok?`Edits ${H(c.path)||`the `+c.label+` file`} (${c.label})`:c.hint}</span>
      </div>
    </${$}>
    ${l&&_`<${li} tool=${t.tool} target=${c} refresh=${e.refresh}
      onClose=${()=>u(!1)}/>`}
  </div>`}function _i({w:e,row:t}){let n=t.agent,r=e.scopesOf(t.tool),{steps:i,wins:a,why:o}=ct(t),s=e=>Number(e)>0?Number(e):0,c=[{label:`Defined in`,path:n.defined_in,line:s(n.defined_line),scope:n.scope_defined},{label:`Pinned in`,path:n.pinned_in,line:s(n.pinned_line),scope:n.scope_pinned}],l=mi(t,r);return _`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${n.name||t.label}</h3>
    <div class="st-insp__key st-mono">${t.key}</div>
    ${n.description&&_`<p class="st-insp__tip">${n.description}</p>`}
    <div class="st-insp__chips">
      <${Z} id=${t.tool} label=${e.labelOf(t.tool)}/>
      <${J} scope=${t.scope} locked=${t.locked} label=${U(t.scope,r)}/>
    </div>
    <div class="st-insp__value"><${un} row=${t} w=${e}/></div>
    <${$} title="Model · what decides it">
      <ol class="st-chain">
        ${i.map((t,n)=>{let r=n===a;return _`<li key=${t.id} class=${`st-chain__lv`+(r?` is-win`:``)} aria-current=${r?`true`:void 0}>
            <span class="st-chain__sc">${t.label}</span>
            <span class="st-chain__v">${t.value===void 0||t.value===null||t.value===``?_`<span class="st-dim">${t.id===`pin`&&t.present?`set`:`not set`}</span>`:t.value===`inherits`?_`<span class="st-inherit">inherits</span>`:_`<span class="st-v">${String(t.value)}</span>`}</span>
            <span class="st-chain__src">${t.source?_`<${rn} path=${t.source} line=${t.line} w=${e}/>`:_`<span class="st-dim">${t.id===`effective`?a===2?`session model`:``:`—`}</span>`}</span>
            ${r&&_`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${o}</p>
    </${$}>
    <${$} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${n.effort||`—`}</dd>
        <dt>Context</dt><dd>${n.context_tier||`—`}</dd>
        <dt>Target</dt><dd>${n.target||`—`}</dd>
        <dt>Model policy</dt><dd>${n.model_policy||`—`}</dd>
      </dl>
    </${$}>
    <${$} title=${`Tools`+(n.tools.length?` · `+n.tools.length:``)}><${dn} tools=${n.tools} all/></${$}>
    <${$} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${c.map(t=>_`<dt key=${t.label+`t`}>${t.label}</dt><dd key=${t.label+`d`}>
          ${t.path?_`<span class="st-mono" title=${t.path+(t.line?`:`+t.line:``)}>${w(t.path)}${t.line?`:`+t.line:``}</span>
            ${t.scope&&_` <span class="st-dim">· ${U(t.scope,r)}</span>`}
            <button type="button" class="st-link" onClick=${()=>e.openAt(t.path,t.line)}
              aria-label=${ui(t.path,t.line)}>Open</button>`:_`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${$}>
    <${$} title="History"><${pi} w=${e} path=${n.defined_in||t.source}/></${$}>
    <${$} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${l}</span>
      </div>
    </${$}>
  </div>`}function vi({w:e,file:t}){let n=di(e,t.path),r=t.rows||[];return _`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${t.name}</h3>
    <div class="st-insp__key st-mono">${t.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${t.is_dir?`Watched folder`:G[K(t)]}</span>
      <${J} scope=${t.scope}/>
      <span class="st-chip">${_t[t.location]||`Other`}</span>
      ${t.tools.map(t=>_`<${Z} key=${t} id=${t} label=${e.labelOf(t)}/>`)}
    </div>
    <${$} title=${`Settings from this file`+(r.length?` · `+r.length:``)}>
      ${r.length?_`<ul class="st-insp__list">
        ${r.map(t=>_`<li key=${t.uid}><button type="button" class="st-link"
          onClick=${()=>e.set({view:`tool`,tool:t.tool,sec:``,row:t.key})}>${t.label}</button>
          <span class="st-dim"> · ${e.labelOf(t.tool)}${t.line>0?` · line `+t.line:``}</span></li>`)}
      </ul>`:_`<div class="st-hint">${t.settings?t.settings+` settings`:`No settings are read from this file.`}</div>`}
    </${$}>
    <${$} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${t.path}</dd>
        <dt>Purpose</dt><dd>${t.is_dir?`Watched folder`:G[K(t)]}${t.kind&&t.kind!==K(t)?` (`+t.kind+`)`:``}</dd>
        <dt>Scope</dt><dd>${t.scope||`—`}</dd>
        <dt>Git</dt><dd>${t.git_state||`—`}</dd>
        <dt>Size</dt><dd>${t.bytes!=null&&!t.is_dir?en(t.bytes):`—`}</dd>
        <dt>Last change</dt><dd>${t.mtime?tn(t.mtime):`—`}</dd>
        ${t.mtime?_`<dt>Modified</dt><dd>${new Date(t.mtime*1e3).toLocaleString()}</dd>`:null}
        ${t.loading&&_`<dt>Loading</dt><dd>${t.loading}</dd>`}
        ${t.exists===!1&&_`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${!t.is_dir&&_`<button type="button" class="st-btn" onClick=${()=>e.openAt(t.path)}>Open file</button>`}
        ${n.length>0&&_`<button type="button" class="st-btn" onClick=${()=>fi(e,n[0])}>Show finding</button>`}
      </div>
    </${$}>
  </div>`}function yi({w:e,v:t}){let n=Pe(t),r=di(e,t.source);return _`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${t.name||`Environment variable`}</h3>
    <div class="st-insp__key">Environment variable${t.name?``:` (this aictl version did not name it)`}</div>
    ${t.description&&_`<p class="st-insp__tip">${t.description}</p>`}
    <div class="st-insp__chips">
      <${Z} id=${t.tool} label=${e.labelOf(t.tool)}/>
      <${J} scope="env" label=${U(`env`,e.scopesOf(t.tool))}/>
      ${t.masked&&_`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!t.documented&&_`<${on}/>`}
    </div>
    <div class=${`st-insp__value`+(t.set?``:` is-unset`)} data-testid="st-env-value">${t.set?t.masked?_`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:_`<span class="st-v st-mono">${t.value===``?`(empty)`:t.value}</span>`:_`<span class="st-dim">not set</span>`}</div>
    <${$} title="Where it is set">
      ${n.length?_`<ul class="st-insp__list" data-testid="st-env-where">
        ${n.map(n=>_`<li key=${n.id}>
          <b>${n.label}</b>${n.origin&&_` <span class="st-mono" title=${n.origin}>${H(n.origin)}</span>`}
          ${n.value!==t.value&&_` <span class="st-dim">= ${n.value}</span>`}
          ${n.file&&_` <button type="button" class="st-link" onClick=${()=>e.openAt(n.file)}
            aria-label=${`Open `+w(n.file)}>Open</button>`}
          <div class="st-hint">${n.note}</div>
        </li>`)}
      </ul>`:_`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${$}>
    <${$} title=${`What it drives`+(t.drives.length?` · `+t.drives.length:``)}>
      ${t.drives.length?_`<ul class="st-insp__list" data-testid="st-env-drives">
        ${t.drives.map(n=>_`<li key=${n.key}><button type="button" class="st-link"
          onClick=${()=>e.set({view:`tool`,tool:t.tool,sec:``,row:n.key})}>${n.label}</button>
          <span class="st-dim st-mono"> · ${n.key}</span></li>`)}
      </ul>`:_`<div class="st-hint">No setting shown here reads it; ${e.labelOf(t.tool)} reads it when it starts.</div>`}
    </${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${r.length>0&&_`<button type="button" class="st-btn" onClick=${()=>fi(e,r[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
      </div>
    </${$}>
  </div>`}function bi({w:e,f:t}){return _`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Rt(t.rule)}</h3>
    <div class="st-insp__key st-mono">${ei(t.path,t.line)}</div>
    <div class="st-insp__chips">
      <span class=${`st-chip`+(t.severity===`high`||t.severity===`medium`?` st-chip--risky`:``)}>${t.severity||`info`}</span>
      ${Lt(t).map(t=>_`<${Z} key=${t} id=${t} label=${e.labelOf(t)}/>`)}
      ${t.session_id&&_`<span class="st-chip st-chip--mono">session ${t.session_id}</span>`}
    </div>
    ${t.why&&_`<${$} title="Why it matters"><p class="st-insp__tip">${t.why}</p></${$}>`}
    ${t.action&&_`<${$} title="What to do"><p class="st-insp__tip">${t.action}</p></${$}>`}
    <${$} title="Actions">
      <div class="st-actions">
        ${t.path&&(L(t.path)?_`<button type="button" class="st-btn" onClick=${()=>e.openEnv(R(t.path),Lt(t)[0]||``)}>Show ${R(t.path)||`the variable`}</button>`:_`<button type="button" class="st-btn" onClick=${()=>e.openAt(t.path,t.line)}>${t.line>0?ui(t.path,t.line):`Show the line`}</button>`)}
      </div>
    </${$}>
  </div>`}function xi({w:e}){let{view:t}=e.st,n=null;return(t===`tool`||t===`topic`)&&e.selectedEnv?n=_`<${yi} key=${e.selectedEnv.uid} w=${e} v=${e.selectedEnv}/>`:(t===`tool`||t===`topic`)&&e.selected?n=at(e.selected)?_`<${_i} key=${e.selected.uid} w=${e} row=${e.selected}/>`:_`<${gi} key=${e.selected.uid} w=${e} row=${e.selected}/>`:t===`files`&&e.selectedFile?n=_`<${vi} w=${e} file=${e.selectedFile}/>`:t===`findings`&&e.selectedFinding&&(n=_`<${bi} w=${e} f=${e.selectedFinding}/>`),_`<aside class=${`st-insp`+(e.drawer?` is-open`:``)} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${e.closeDrawer} aria-label="Close the inspector">Close</button>
    ${n||_`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${t===`files`?`Click a file for its details.`:t===`findings`?`Click a finding for its details.`:`Click a setting to see where it is set, what wins and why, and what you can do with it.`}</p>
    </div>`}
  </aside>`}var Si=[{value:`tool`,label:`By tool`},{value:`topic`,label:`By topic`},{value:`files`,label:`Files`},{value:`findings`,label:`Findings`}],Ci=new Set([`tool`,`topic`]);function wi(){return typeof window<`u`?window.location.search:``}function Ti(e){let[t,n]=g(()=>Ut(wi())),r=d(e=>n(t=>{let n={...t,...e};if(e.view&&e.view!==t.view&&!(Ci.has(t.view)&&Ci.has(e.view)))for(let t of[`tool`,`sec`,`row`])t in e||(n[t]=``);if(e.view&&e.view!==t.view&&!(`scope`in e)&&(n.scope=``),e.view&&e.view!==t.view)for(let t of Ht)t in e||(n[t]=t!==`recent`&&``);return n}),[]);return m(()=>{let e=Wt(t);l(wi())!==`local`&&delete e.scope,u(e)},[t]),m(()=>{let e=()=>n(Ut(wi()));return window.addEventListener(`popstate`,e),()=>{window.removeEventListener(`popstate`,e),l(wi())===`local`&&u(s)}},[]),m(()=>{n(Ut(wi()))},[e]),[t,r]}function Ei(e){let[t,n]=g({status:`loading`,files:null});return m(()=>{if(e)return;let t=new AbortController;return ne({signal:t.signal}).then(e=>{t.signal.aborted||n(Array.isArray(e?.files)?{status:`ready`,files:e.files}:{status:`unavailable`,files:null})},()=>{t.signal.aborted||n({status:`unavailable`,files:null})}),()=>t.abort()},[e]),e?{status:`unavailable`,files:null}:t}function Di(e){let t=e||{},n=t.audit||null;return{status:t.loading?`loading`:t.error?`error`:n||t.loading===!1?`ready`:`loading`,audit:n,scan:t.scan||null,error:t.error?String(t.error):null}}function Oi({records:e=[]}){return _`<section class="st-wsnote" aria-label="Loaded configuration evidence">
    <h3>Configured on disk is not effective runtime configuration</h3>
    <${v} records=${e}/>
  </section>`}function ki({source:e={},note:t=``}){let{toolConfigs:n,tools:r,monitor:i,root:a,enabledTools:o=null,recentFiles:s,toolName:c,openFile:l,findings:u,refresh:p,hooks:ee,configuredOnly:te,runtimeConfiguration:ne}=e,v=h(()=>ut({toolConfigs:n,tools:r,monitor:i,root:a,enabledTools:o}),[n,r,i,a,o]),[y,b]=Ti(e.readonly),[x,ie]=g(``),[S,oe]=g(!1),[C,se]=g(!1),[le,w]=g(!1),ue=f(null),T=Ei(e.readonly),E=Di(u),de=u?.rescan;m(()=>{let e=e=>{e.key===`/`&&!fe(e.target)&&!e.metaKey&&!e.ctrlKey&&!e.altKey?(e.preventDefault(),ue.current?.focus()):e.key===`Escape`&&w(!1)};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[]);let D=h(()=>lt(v),[v]),O=h(()=>ft(v),[v]),k=h(()=>ze(v),[v]),he=h(()=>mt({q:x,nonDefault:S,risky:C,unset:y.unset}),[x,S,C,y.unset]),ge=h(()=>mt({q:x,nonDefault:S,risky:C,unset:!0}),[x,S,C]),_e=d(e=>he(e)&&(!y.scope||e.scope===y.scope),[he,y.scope]),ve=h(()=>Ot(D),[D]),A=h(()=>Dt(T.files,D,k,o),[T.files,D,k,o]),j=h(()=>re(E.audit,o),[E.audit,o]),ye=h(()=>It(j?.findings||[]),[j]),be=d((e,t=0)=>{e&&l&&l(e,t>0?t:0)},[l]),xe=d(e=>{b(e),w(!0)},[b]),Se=d(()=>w(!1),[]),Ce=d(e=>{let t=rt(e,v);return t===e&&c?c(e):t},[v,c]),we=d(e=>D.find(t=>t.id===e)?.scopes||[],[D]),Te=d(e=>{let t=A.find(t=>I(t.path,e));if(t?.mtime)return t.mtime;for(let t of v?.tools||[])for(let n of t.files||[])if(I(n.path,e)&&n.mtime)return n.mtime;return null},[A,v]);if(!v)return _`<p class="loading-state">Loading...</p>`;if(!D.length&&!O&&!ae(o)&&!e.readonly)return _`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;let M=D.some(e=>e.id===y.tool)||y.tool===`aictl`&&O?y.tool:D[0]?.id||(O?`aictl`:``),N=D.find(e=>e.id===M)||null,Ee=(e,t)=>t&&D.find(t=>t.id===e)?.rows.find(e=>e.key===t)||null,De=y.view===`tool`?N?Ee(N.id,y.row):null:y.view===`topic`?Ee(y.tool,y.row):null,P=y.view===`files`&&y.row&&A.find(e=>e.path===y.row)||null,Oe=(e,t)=>{if(!String(t).startsWith(`env:`))return null;let n=D.find(t=>t.id===e);if(!n)return null;let r=R(t);return n.envVars.find(e=>e.name===r)||{name:r,tool:n.id,uid:n.id+``+t,source:t,set:!1,value:``,masked:!1,in_process:!1,persisted:[],drives:[],label:r,description:``,section:``,documented:!1}},ke=y.view===`tool`?N?Oe(N.id,y.row):null:y.view===`topic`?Oe(y.tool,y.row):null,Ae=(e,t=``)=>{let n=D.some(e=>e.id===t)?t:N?.id||D[0]?.id||``;xe({view:Ci.has(y.view)?y.view:`tool`,tool:n,row:Me+e})},je=(e,t=0)=>L(e)?Ae(R(e)):be(e,t),F=y.view===`findings`&&y.row&&ye.find(e=>e.id===y.row)||null,z={st:y,set:b,select:xe,q:x,pass:he,passAll:ge,passTool:_e,showUnset:y.unset,scopesOf:we,managedAbsent:ve,entries:D,aictl:O,toolId:M,files:A,filesStatus:T.status,findings:ye,audit:j,auditStatus:E.status,auditError:E.error,scan:E.scan,rescan:de,readonly:e.readonly,selected:De,selectedFile:P,selectedFinding:F,selectedEnv:ke,openAt:je,openEnv:Ae,labelOf:Ce,mtimeOf:Te,recentFiles:s,drawer:le,closeDrawer:Se,refresh:p,hooks:ee},{set:Ne,agents:Pe,knowsSet:Fe,unset:Ie,risky:Le}=dt(D),Re=ae(o)&&!D.some(e=>e.id!==`vscode`),B,V;return y.view===`topic`?(B=_`<${Or} w=${z}/>`,V=_`<${Mr} w=${z}/>`):y.view===`files`?(B=_`<${Vr} w=${z}/>`,V=_`<${Qr} w=${z}/>`):y.view===`findings`?(B=_`<${ti} w=${z}/>`,V=_`<${ii} w=${z}/>`):(B=_`<${hr} w=${z}/>`,V=N?_`<${wr} w=${z} entry=${N}/>`:M===`aictl`&&O?_`<${Er} w=${z} aictl=${O}/>`:_`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),_`<div class="st-ws" data-view=${y.view}>
    <div class="st-head">
      <${pe} class="st-pivot" options=${Si} value=${y.view} ariaLabel="Settings view"
        onChange=${e=>b({view:e})}/>
      <label class="st-searchbox">
        <${ce} name="search" size="14"/>
        <input ref=${ue} type="search" class="st-search" value=${x}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${e=>ie(e.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${`st-toggle`+(S?` is-on`:``)} aria-pressed=${S?`true`:`false`}
        onClick=${()=>oe(!S)}>Only non-default</button>
      <button type="button" class=${`st-toggle st-toggle--risky`+(C?` is-on`:``)} aria-pressed=${C?`true`:`false`}
        onClick=${()=>se(!C)}>Only risky</button>
      ${(Fe||e.keepUnsetControl)&&_`<button type="button" class=${`st-toggle`+(y.unset?` is-on`:``)} disabled=${!Fe} aria-pressed=${y.unset?`true`:`false`}
        onClick=${()=>b({unset:!y.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${D.length}</b> tools</span>
        <span><b>${A.length}</b> files</span>
        <span><b>${Ne}</b> settings</span>
        <span data-kpi="agents"><b>${Pe}</b> agents</span>
        ${Fe&&_`<span data-kpi="unset"><b>${Ie}</b> unset</span>`}
        <span class=${Le?`st-red`:``}><b>${Le}</b> risky</span>
        <span><b>${E.status===`loading`&&!E.audit?`…`:ye.length}</b> findings</span>
      </div>
    </div>
    ${t&&_`<p class="st-wsnote" data-testid="st-wsnote">${t}</p>`}
    ${e.unavailable&&_`<p class="st-wsnote" role="status">${e.unavailable}</p>`}
    ${te?_`<${Oi} records=${ne}/>`:null}
    ${Re&&_`<div class="st-scope-empty"><${me} enabledTools=${o} snap=${v} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${B}</div>
      <div class="st-col st-col--main">${V}</div>
      <${xi} w=${z}/>
    </div>
  </div>`}var Ai=t(`<h1>Settings`);function ji(t){let s=o(()=>t.ctx),l=()=>s.scope()===`local`,u=()=>l()?D(s.client,`configuration.file`,`current`):void 0,d=()=>s.read({topic:`configuration.file`,entity:`current`}),[f,p]=a(),[m,h]=a({}),[ee,te]=a(0);n(l,e=>{if(p(void 0),!e)return;let t=new AbortController;return de(`/api/hooks-status`,{signal:t.signal}).then(p,()=>{}),()=>t.abort()}),n(()=>l()?ee():0,e=>{if(h({}),!e)return;let t=new AbortController;return h({loading:!0}),b(!0,e=>{t.signal.aborted||h(t=>({...t,scan:e}))},{signal:t.signal}).then(e=>{t.signal.aborted||h({audit:e})},e=>{t.signal.aborted||h({error:String(e)})}),()=>t.abort()});let g=c(()=>({note:``,source:l()?{...u(),toolConfigs:u()?.tool_configs??[],configuredOnly:!0,keepUnsetControl:!0,enabledTools:s.tools(),hooks:f(),refresh:s.refresh,openFile:(e,t)=>s.openDetail({type:`file`,path:e,line:t}),findings:{...m(),rescan:()=>te(e=>e+1)},runtimeConfiguration:[...s.client.store.topic(`configuration.loaded`)?.values()??[]].map(e=>({id:e.id,...e.data})).filter(e=>ie(`tool`in e?e.tool:void 0,s.tools()))}:{toolConfigs:[],readonly:!0,configuredOnly:!0,keepUnsetControl:!0,unavailable:`Tool configuration files and policy findings are not reported for this scope.`}}));return[Ai(),i(r,{get when(){return!l()||u()},get fallback(){return i(O,{get state(){return e(()=>d().state===`error`)()?`error`:d().state===`unavailable`?`unavailable`:`loading`},get message(){return d().message},get onRetry(){return s.refresh}})},get children(){return[i(r,{get when(){return e(()=>!!l())()?d().state===`stale`:l()},get children(){return i(O,{state:`stale`,get message(){return d().message}})}}),i(y,{component:ki,get values(){return g()},get client(){return s.client},get local(){return l()},get theme(){return t.theme},get density(){return t.density}})]}})]}export{ji as default};