import{m as r,d as y,x as te,A as ee,y as P,T as O,q as L,w as bt}from"./index-9VorCZJ6.js";import{S as se,k as ne,m as oe,I as ie,a as le}from"./app-D3wCu1uJ.js";import{O as yt,U as ae,V as C,b2 as re,C as ce,B as U,q as ue,s as de,L as vt,b3 as pe,h as he}from"./useSse-eOqpz3HG.js";import"./TextView-B6XMkVXA.js";const N={OTel:{enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats)."},"Agent Mode":{enabled:"Whether agent/agentic mode is active."},Agent:{enabled:"Whether agent/agentic mode is active."},"Claude (Anthropic)":{temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage."},"Cowork (Autonomous)":{webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."}},fe={autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks."};function me(t,e){return e&&N[e]&&N[e][t]||fe[t]||""}function $e(t){const e=String(t||"").split(".");return e[e.length-1]}function ge(t,e){const s=$e(t.key);return t.note||t.group&&N[t.group]&&N[t.group][s]||e==="telemetry"&&N.OTel[s.replace(/^otel_?/,"")]||me(s,t.group)||""}const T=["model","telemetry","autonomy","context","hooks","mcp","extensions","startup","other"],J={model:"Model",telemetry:"Telemetry",autonomy:"Autonomy and safety",context:"Context files",hooks:"Hooks",mcp:"MCP servers",extensions:"Extensions and plugins",startup:"Updates and startup",other:"Other settings"},be={Agent:"autonomy","Agent Mode":"autonomy","Code (Agent)":"autonomy","Cowork (Autonomous)":"autonomy",Safety:"autonomy","Claude (Anthropic)":"autonomy",Hooks:"hooks","Context Files":"context","File Locations":"context",MCP:"mcp"},ye=new Set(["globalAutoApprove","autoApprove","autoReply","autopilot","skipPermissions","allowAllBrowserActions","autoCommit","dangerouslySkipPermissions","yolo"]),V="—";function ve(t){const e=String(t||"").split(".");return e[e.length-1]}function at(t){return String(t||"").replace(/^github\.copilot\./,"").toLowerCase().replace(/[^a-z0-9]/g,"")}function kt(t){const e=String(t||"").split(/[._]/).filter(Boolean);return at(e[e.length-1])}function ke(t){return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"")}function rt(t){const e=String(t||"").replace(/^github\.copilot\./,"").replace(/^chat\./,"").replace(/[._-]+/g," ").replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/\?+$/,"").trim().toLowerCase();return e?e[0].toUpperCase()+e.slice(1):""}function Z(t){return typeof t=="boolean"?"flag":typeof t=="number"?"number":Array.isArray(t)?"list":t&&typeof t=="object"?"map":typeof t=="string"&&/^(~|\/|[A-Za-z]:\\)/.test(t)?"path":"text"}function At(t){return t===!0?!0:Array.isArray(t)?t.length>0:t&&typeof t=="object"?Object.keys(t).length>0:typeof t=="number"?t>0:typeof t=="string"?!!t&&!["false","off","no","0","none","default","never"].includes(t.toLowerCase()):!1}function _e(t){const e=String(t).toLowerCase();return/otel|telemetry/.test(e)?"telemetry":/model|effort|thinking|reasoning/.test(e)?"model":/hook/.test(e)?"hooks":/mcp/.test(e)?"mcp":/update|startup|launch/.test(e)?"startup":"other"}function K(t){return Array.isArray(t)?"["+t.map(K).join(",")+"]":t&&typeof t=="object"?"{"+Object.keys(t).sort().map(e=>JSON.stringify(e)+":"+K(t[e])).join(",")+"}":JSON.stringify(t??null)}function g(t,e,s={}){const n=e===void 0?null:e;return{key:t,label:s.label||rt(t),value:n,kind:s.kind||Z(e),source:s.source||"",danger:s.danger??(ye.has(ve(t))&&At(n)),note:s.note||"",group:s.group}}function we(t){const e=t.config_files||[],s=e[0]||"",n=Object.fromEntries(T.map(c=>[c,[]])),o=new Set,a=new Map,l=(c,d)=>{const p=at(d.key);p&&o.has(p)||(p&&o.add(p),a.set(kt(d.key)+"="+K(d.value),!0),n[c].push(d))};t.model&&l("model",g("model",t.model,{label:"Model",kind:"text",source:s}));for(const c of t.configurable_models||[]){if(!c||!c.key)continue;const d=c.source&&c.source!=="default",p=c.source==="workspace"?e.find(f=>/[\\/]\.vscode[\\/]/.test(f))||s:e.find(f=>!/[\\/]\.vscode[\\/]/.test(f))||s;l("model",g(c.key,d?c.value:null,{label:c.label,kind:"text",source:d?p:"",note:[c.description,d?"":c.default_hint?`Default: ${c.default_hint}`:""].filter(Boolean).join(" ")}))}const i=t.otel||{};(i.enabled!==void 0||i.source)&&(l("telemetry",g("otel.enabled",!!i.enabled,{label:"OpenTelemetry export",kind:"flag",note:N.OTel.enabled})),i.exporter&&l("telemetry",g("otel.exporter",i.exporter,{label:"Exporter",kind:"text",group:"OTel"})),i.endpoint&&l("telemetry",g("otel.endpoint",i.endpoint,{label:"Endpoint",kind:"text",group:"OTel"})),i.file_path&&l("telemetry",g("otel.file_path",i.file_path,{label:"Output file",kind:"path",group:"OTel"})),i.capture_content!==void 0&&l("telemetry",g("otel.capture_content",!!i.capture_content,{label:"Capture content",kind:"flag",group:"OTel"})));for(const[c,d]of Object.entries(t.feature_groups||{})){const p=be[c]||"other";for(const[f,tt]of Object.entries(d||{}))l(p,g(f,tt,{source:s,group:c}))}const u=i.enabled!==void 0||!!i.source;for(const[c,d]of Object.entries(t.settings||{})){const p=_e(c);p==="telemetry"&&u||a.has(kt(c)+"="+K(d))||l(p,g(c,d,{source:s}))}return(t.mcp_servers||[]).length&&l("mcp",g("mcp_servers",t.mcp_servers,{label:"Servers",kind:"list",source:s})),(t.extensions||[]).length&&l("extensions",g("extensions",t.extensions,{label:"Installed",kind:"list"})),(t.auto_update===!0||t.auto_update===!1)&&l("startup",g("auto_update",t.auto_update,{label:"Automatic updates",kind:"flag"})),(t.launch_at_startup===!0||t.launch_at_startup===!1)&&l("startup",g("launch_at_startup",t.launch_at_startup,{label:"Start at login",kind:"flag"})),T.filter(c=>n[c].length).map(c=>({id:c,title:J[c],rows:n[c]}))}function _t(t){const e=T.indexOf(t);return e<0?T.length:e}function Ce(t){return(Array.isArray(t==null?void 0:t.sections)?t.sections:we(t||{})).filter(s=>s&&Array.isArray(s.rows)&&s.rows.length).map(s=>({...s,title:s.title||J[s.id]||rt(s.id)})).sort((s,n)=>_t(s.id)-_t(n.id))}const Se=/^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/i;function _(t){return String(t||"").replace(/\\/g,"/").replace(/(.)\/+$/,"$1")}function S(t,e){return!!t&&!!e&&_(t)===_(e)}function Y(t){const e=String(t||"");if(e.startsWith("~"))return"~";const s=Se.exec(_(e));return s?e.slice(0,s[1].length):""}function xt(t,e){const s=_(t),n=_(e);return!!n&&(s===n||s.startsWith(n+"/"))}function Ot(t){const e=String(t||""),s=Y(e);return!s||s==="~"||re(e)?e:"~"+e.slice(s.length)}function Lt(t){var n;const e=[t==null?void 0:t.root,...((n=t==null?void 0:t.live_monitor)==null?void 0:n.workspace_paths)||[]],s=[];for(const o of e){if(!o||typeof o!="string")continue;const a=_(o);a==="/"||_(Y(o))===a||/^[A-Za-z]:$/.test(a)||s.some(l=>_(l)===a)||s.push(o)}return s}function Tt(t,e=[]){const s=String(t||"");return s?/[\\/]\.vscode[\\/]/.test(s)?"workspace":e.some(n=>xt(s,n))?"project":Y(s)?"user":"project":"default"}function Ae(t,e=[]){return t&&typeof t.scope=="string"&&t.scope?t.scope:Tt(t==null?void 0:t.source,e)}function Ft(t){const e=Number(t==null?void 0:t.line);return Number.isFinite(e)&&e>0?Math.floor(e):0}function z(t){return!t||t.set===!1||t.value===void 0}function xe(t,e){const s=Array.isArray(t==null?void 0:t.chain)?t.chain.filter(o=>o&&typeof o=="object"):[];if(!s.length)return{chain:[{scope:e,value:t==null?void 0:t.value,source:(t==null?void 0:t.source)||"",line:Ft(t)}],wins:0};let n=Number.isInteger(t.wins)&&t.wins>=0&&t.wins<s.length?t.wins:-1;if(n<0&&(n=s.findIndex(o=>o.wins===!0)),n<0&&(n=s.findIndex(o=>o.scope===e&&S(o.source,t.source))),n<0){for(let o=s.length-1;o>=0;o-=1)if(!z(s[o])){n=o;break}}return{chain:s,wins:n<0?s.length-1:n}}function it(t,e){return t.length<=1?t.join(""):t.slice(0,-1).join(", ")+" "+e+" "+t[t.length-1]}function Oe(t,e){const s=t==null?void 0:t[e];if(!s)return"";const n=s.scope==="default"?"The default":`The ${s.scope} ${s.source?"file":"value"}`;if(t.length===1)return s.scope==="default"?"No file sets this, so the default applies.":`Only the ${s.scope} level sets this, so its value applies.`;const o=t.slice(e+1),a=o.filter(i=>!z(i)),l=t.slice(0,e).filter(i=>!z(i)).map(i=>i.scope);return o.length?a.length?`${n} wins over the ${it(a.map(i=>i.scope),"and")} value: ${s.scope} takes precedence for this setting.`:`${n} wins because no ${it(o.map(i=>i.scope),"or")} value is set.`:`${n} wins: ${s.scope} is the highest level that sets it${l.length?", above "+it(l,"and"):""}.`}function lt(t){return t==null||t===""?"":t===!0?"on true":t===!1?"off false":Array.isArray(t)?t.map(lt).join(" "):typeof t=="object"?Object.entries(t).map(([e,s])=>e+" "+lt(s)).join(" "):String(t)}function Le(t){if(t==null||t==="")return V;if(t===!0)return"on";if(t===!1)return"off";if(Array.isArray(t))return t.length+(t.length===1?" item":" items");if(typeof t=="object"){const e=Object.keys(t).length;return e+(e===1?" item":" items")}return String(t)}const Te=[[/exporter$/i,["otlp-http","otlp-grpc","console","file"]],[/effort(level)?$/i,["minimal","low","medium","high","xhigh","max"]],[/approval[._]?policy$|askforapproval$/i,["untrusted","on-failure","on-request","never"]],[/approval[._]?mode$/i,["default","auto_edit","plan","yolo"]],[/sandbox[._]?mode$/i,["read-only","workspace-write","danger-full-access"]],[/(^|\.)access$/i,["all","registry","none"]],[/autostart$/i,["never","onlyNew","newAndOutdated"]]];function Fe(t){if(!t)return null;if(Array.isArray(t.options)&&t.options.length)return t.options.map(String);if((t.kind||Z(t.value))!=="text"||typeof t.value!="string"||!t.value)return null;const s=String(t.key||""),n=String(t.label||"").replace(/\s+/g,"");for(const[o,a]of Te)if(o.test(s)||o.test(n))return a.includes(t.value)?a:[t.value,...a];return null}function jt(t,e){return t==="vscode"?"VS Code":t==="aictl"?"aictl":ae(t,e)}function je(t,e,s,n){const o=Ae(t,n),{chain:a,wins:l}=xe(t,o);return{...t,uid:e+""+t.key,tool:e,sec:s.id,secTitle:s.title,label:t.label||rt(t.key),kind:t.kind||Z(t.value),source:t.source||"",line:Ft(t),scope:o,chain:a,wins:l,risky:!!t.danger,tip:ge(t,s.id)}}function Ne(t){const e=Array.isArray(t==null?void 0:t.tool_configs)?t.tool_configs:[],s=((t==null?void 0:t.tools)||[]).map(l=>l.tool),n=Lt(t),o=e.filter(l=>l&&l.tool).map(l=>{const i=Ce(l).map(d=>({id:d.id,title:d.title,rows:d.rows.map(p=>je(p,l.tool,d,n))})),u=i.flatMap(d=>d.rows),c=[];for(const d of[...l.config_files||[],...u.map(p=>p.source)])d&&!c.some(p=>S(p,d))&&c.push(d);return{id:l.tool,label:jt(l.tool,t),cfg:l,sections:i,rows:u,files:c,risky:u.filter(d=>d.risky).length,hints:l.hints||[]}}),a=l=>{const i=s.indexOf(l);return i<0?s.length+(l==="vscode"?1:0):i};return o.map((l,i)=>({e:l,i})).sort((l,i)=>a(l.e.id)-a(i.e.id)||l.i-i.i).map(l=>l.e)}function Ie(t){const e=(t==null?void 0:t.live_monitor)||{},s=Object.entries(e.diagnostics||{}).map(([o,a])=>({name:o,mode:(a==null?void 0:a.mode)||"",status:(a==null?void 0:a.status)||"unknown",detail:(a==null?void 0:a.detail)||""})),n=[...e.workspace_paths||[],...e.state_paths||[]].filter(Boolean);return!s.length&&!n.length?null:{id:"aictl",label:"aictl",collectors:s,roots:n}}function Ee(t,e){return e?[t.label,t.key,lt(t.value),C(t.source)].join(`
`).toLowerCase().includes(e.toLowerCase()):!0}function Me({q:t="",nonDefault:e=!1,risky:s=!1}={}){const n=t.trim().toLowerCase();return o=>Ee(o,n)&&(!e||o.scope!=="default")&&(!s||o.risky)}function Re(t,e,s=()=>!0){const n=t.filter(u=>u.rows&&u.rows.some(c=>c.sec===e)),o=[],a=new Map,l=new Map;for(const u of n)for(const c of u.rows){if(c.sec!==e)continue;const d=ke(c.label),p=at(c.key);let f=a.get(d)||l.get(p);f&&f.cells[u.id]&&(f=null),f||(f={id:"g"+o.length,label:c.label,keys:[],cells:{}},o.push(f)),a.has(d)||a.set(d,f),l.has(p)||l.set(p,f),f.cells[u.id]=c,f.keys.includes(c.key)||f.keys.push(c.key)}const i=o.filter(u=>Object.values(u.cells).some(s));return{tools:n,rows:i}}const ct=[{id:"home",label:"Home folder"},{id:"tool-home",label:"Tool folders"},{id:"project",label:"This project"},{id:"vscode-user",label:"VS Code user folder"},{id:"other",label:"Other"}],ut=Object.fromEntries(ct.map(t=>[t.id,t.label])),Pe=new Set([".claude",".github",".vscode",".cursor",".codex",".gemini",".copilot",".windsurf"]);function G(t){const e=Math.max(t.lastIndexOf("/"),t.lastIndexOf("\\"));return e>0?t.slice(0,e):t}function De(t,e=[]){const s=String(t||""),n=_(s),o=n.indexOf("/.vscode/"),a=e.find(c=>xt(n,c));if(a)return{location:"project",location_root:a};if(o>0)return{location:"project",location_root:s.slice(0,o)};const l=/^(.*\/(?:Code|Code - Insiders|VSCodium)\/User)(\/|$)/.exec(n);if(l)return{location:"vscode-user",location_root:s.slice(0,l[1].length)};const i=Y(s);if(i){const c=n.slice(_(i).length+1).split("/").filter(Boolean);if(c.length>1&&c[0].startsWith("."))return{location:"tool-home",location_root:s.slice(0,i.length+1+c[0].length)};if(c.length>3&&(c[0]==="Library"||c[0]==="AppData")){const d=i.length+1+c.slice(0,3).join("/").length;return{location:"tool-home",location_root:s.slice(0,d)}}if(c.length<=1)return{location:"home",location_root:i}}let u=G(s);for(;Pe.has(C(u))&&G(u)!==u;)u=G(u);return{location:"other",location_root:u}}function qe(t){const e=C(t).toLowerCase();return/mcp/.test(e)?"mcp":/^(agents|claude|gemini|copilot-instructions)\.md$|\.instructions\.md$/.test(e)?"instructions":/\.agent\.md$/.test(e)?"agents":/\.prompt\.md$/.test(e)?"prompts":/\.md$/.test(e)?"memory":"settings"}function We(t,e,s=[],n=null){const o=[],a=i=>o.find(u=>S(u.path,i)),l=i=>{const u=a(i.path);if(u){for(const p of i.tools||[])u.tools.includes(p)||u.tools.push(p);return u}const c=De(i.path,s),d={name:C(i.path),location:c.location,location_root:c.location_root,scope:Tt(i.path,s),kind:qe(i.path),settings:null,bytes:null,mtime:null,git_state:"",exists:!0,...i,tools:[...i.tools||[]]};return d.location_root||(d.location_root=c.location_root),ut[d.location]||(d.location="other"),o.push(d),d};for(const i of Array.isArray(t)?t:[])i&&i.path&&l(i);for(const i of e)for(const u of i.files)l({path:u,tools:[i.id]});for(const i of o){const u=e.flatMap(c=>c.rows.filter(d=>S(d.source,i.path)));i.rows=u,(i.settings===null||i.settings===void 0)&&(i.settings=u.length)}return o.filter(i=>!i.tools.length||i.tools.some(u=>yt(u,n))).map(i=>({...i,tools:i.tools.filter(u=>yt(u,n))}))}function Nt(t,e){if(!e)return!0;const s=e.trim().toLowerCase();return!s||[t.name,t.path,t.kind,...(t.rows||[]).map(n=>n.label)].join(`
`).toLowerCase().includes(s)}function He(t){const e=new Map;for(const n of t){const o=n.location_root||G(n.path);e.has(o)||e.set(o,{root:o,location:n.location,files:[]}),e.get(o).files.push(n)}const s=n=>ct.findIndex(o=>o.id===n);return[...e.values()].sort((n,o)=>s(n.location)-s(o.location)||n.root.localeCompare(o.root))}const W={high:0,medium:1,low:2,info:3};function It(t){return[t.rule||"",t.path||"",t.line||0,t.tool||"",t.session_id||""].join("|")}function Ge(t){const e=new Map;return(t||[]).map(s=>{const n=It(s),o=e.get(n)||0;return e.set(n,o+1),{...s,id:o?n+"#"+o:n}})}function dt(t){return Array.isArray(t==null?void 0:t.tools)&&t.tools.length?t.tools:t!=null&&t.tool?[t.tool]:[]}function pt(t){const e=String(t||"other").replace(/[_-]+/g," ").trim();return e?e[0].toUpperCase()+e.slice(1):"Other"}function Et(t,e){if(!e)return!0;const s=e.trim().toLowerCase();return!s||[t.rule,pt(t.rule),t.path,t.why,t.action,C(t.path)].join(`
`).toLowerCase().includes(s)}function Mt(t){const e=new Map;for(const s of t||[]){const n=s.rule||"other";e.has(n)||e.set(n,{rule:n,label:pt(n),items:[]}),e.get(n).items.push(s.id?s:{...s,id:It(s)})}return[...e.values()].map(s=>{const n=[...new Set(s.items.map(l=>l.why||""))],o=[...new Set(s.items.flatMap(dt))],a=s.items.reduce((l,i)=>(W[i.severity]??9)<(W[l]??9)?i.severity:l,"info");return{...s,count:s.items.length,why:n.length===1?n[0]:"",tools:o,severity:a,alarm:a==="high"||a==="medium"}}).sort((s,n)=>(W[s.severity]??9)-(W[n.severity]??9)||n.count-s.count)}const Ue=["tool","topic","files","findings"];function wt(t){const e=new URLSearchParams(t||""),s=e.get("pivot");return{view:Ue.includes(s)?s:"tool",tool:e.get("tool")||"",sec:e.get("sec")||"",row:e.get("row")||""}}function Ve(t){return{pivot:t.view&&t.view!=="tool"?t.view:null,tool:t.tool||null,sec:t.sec||null,row:t.row||null}}const Ke={pivot:null,tool:null,sec:null,row:null};function H(t){return t==null?V:typeof t=="object"?JSON.stringify(t):String(t)}function ze({value:t,compact:e}){const[s,n]=y(!1),o=Array.isArray(t),a=o?t.map((u,c)=>[c,u]):Object.entries(t||{}),l=a.length;if(!l)return r`<span class="st-none">none</span>`;const i=r`<span class="st-chip st-chip--mono st-items">${l} ${l===1?"item":"items"}</span>`;return e?i:r`<span class="st-itemsbox">
    ${i}
    <button type="button" class="st-link" aria-expanded=${s?"true":"false"}
      onClick=${u=>{u.stopPropagation(),n(!s)}}>${s?"hide":"show"}</button>
    ${s&&r`<ul class="st-itemlist">
      ${a.map(([u,c])=>r`<li key=${u} class="st-mono" title=${o?H(c):`${u}: ${H(c)}`}>
        ${o?H(c):r`<span class="st-itemkey">${u}:</span> ${H(c)}`}</li>`)}
    </ul>`}
  </span>`}function B({row:t,value:e,compact:s=!1}){const n=e!==void 0?e:t.value,o=t.kind||Z(n),a=!!t.risky;if(o==="flag"||typeof n=="boolean"){if(n==null)return r`<span class="st-none">${V}</span>`;const u=At(n);return r`<span class=${"st-flag"+(u?" is-on":"")+(a?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${u?"on":"off"}</span>
    </span>`}if(n==null||n==="")return r`<span class="st-none">${V}</span>`;if(o==="list"||o==="map"||typeof n=="object")return r`<${ze} value=${n} compact=${s}/>`;const l=String(n),i=Fe({...t,value:n});return i?r`<span class=${"st-select"+(a?" is-risky":"")} title=${"Options: "+i.join(", ")}>${l}</span>`:o==="path"?r`<span class="st-v st-path" title=${l}>${l}</span>`:r`<span class=${"st-v"+(a?" is-risky":"")} title=${l}>${l}</span>`}function Q({scope:t}){const e=t||"default";return r`<span class=${"st-chip st-scope st-scope--"+e.replace(/[^a-z-]/gi,"")}>${e}</span>`}function F({id:t,big:e=!1}){return r`<span class=${"st-sw"+(e?" st-sw--big":"")} aria-hidden="true"
    style=${{background:ce[t]||"var(--fg2)"}}></span>`}function D({label:t}){return r`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function k({children:t}){return r`<div class="st-nav__h">${t}</div>`}function X({id:t,label:e}){return r`<span class="st-chip st-toolchip"><${F} id=${t}/>${e}</span>`}function Rt({path:t,line:e,w:s}){if(!t)return r`<span class="st-none">—</span>`;const n=t+(e>0?":"+e:"");return r`<button type="button" class="st-src" title=${n}
    onClick=${o=>{o.stopPropagation(),s.openAt(t,e)}}>
    <b>${C(t)}</b>${e>0?":"+e:""}</button>`}function Be(t,e){const s=C(t);if(e.filter(a=>C(a)===s).length<2)return s;const n=String(t).split(/[\\/]/).filter(Boolean);return n.length<2?s:(/^(Users|home)$/.test(n[0])&&n.length===4?"~/":"")+n[n.length-2]+"/"+s}function Je({w:t}){const{entries:e,aictl:s,st:n}=t;return r`<nav class="st-nav" aria-label="Tools">
    <${k}>Tools</${k}>
    <ul class="st-nav__list">
      ${e.map(o=>{const a=o.id===t.toolId,l=o.rows.filter(t.pass),i=l.some(u=>u.risky);return r`<li key=${o.id}>
          <button type="button" class=${"st-nav__item"+(a?" is-on":"")+(l.length?"":" is-empty")}
            aria-current=${a?"true":void 0} data-tool=${o.id}
            onClick=${()=>t.set({tool:o.id,sec:"",row:""})}>
            <${F} id=${o.id}/><span class="st-nav__label">${o.label}</span>
            ${i&&r`<${D} label="A risky setting is on"/>`}
            <span class="st-nav__n">${l.length}</span>
          </button>
          ${a&&r`<ul class="st-nav__subs">
            ${o.sections.map(u=>{const c=u.rows.filter(t.pass),d=n.sec===u.id;return r`<li key=${u.id}><button type="button" class=${"st-nav__sub"+(d?" is-on":"")}
                aria-current=${d?"true":void 0}
                onClick=${()=>t.set({sec:d?"":u.id})}>
                <span class="st-nav__label">${u.title}</span>
                ${c.some(p=>p.risky)&&r`<${D} label="A risky setting is on"/>`}
                <span class="st-nav__n">${c.length}</span>
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${s&&r`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:""})}>
          <${F} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${s.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Ze({row:t,w:e}){var o;const s=((o=e.selected)==null?void 0:o.uid)===t.uid,n=()=>e.select({tool:t.tool,row:t.key});return r`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(s?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}</div>
      ${t.risky&&t.tip&&r`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${B} row=${t}/></td>
    <td class="st-c-scope"><${Q} scope=${t.scope}/></td>
    <td class="st-c-src"><${Rt} path=${t.source} line=${t.line} w=${e}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Ye({w:t,entry:e}){const s=e.sections.filter(o=>!t.st.sec||o.id===t.st.sec).map(o=>({...o,shown:o.rows.filter(t.pass)})).filter(o=>o.shown.length),n=e.rows.length;return r`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id=${e.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${e.label}</h2>
      <span class="st-bar__sub">${n} ${n===1?"setting":"settings"} in ${e.files.length} ${e.files.length===1?"file":"files"}${e.risky?r` · <span class="st-red">${e.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${e.files.map(o=>r`<button type="button" key=${o} class="st-chip st-chip--mono st-chip--btn" title=${o}
          onClick=${()=>t.openAt(o)}>${Be(o,e.files)}</button>`)}
      </span>
    </div>
    ${e.id==="vscode"&&r`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${e.hints.map((o,a)=>r`<p key=${a} class="st-note">${o}</p>`)}
    ${s.length?r`<table class="st-table">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
        <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
        <th scope="col">What it does</th>
      </tr></thead>
      ${s.map(o=>{const a=o.shown.filter(l=>l.risky).length;return r`<tbody key=${o.id} data-section=${o.id}>
          <tr class="st-group"><th scope="colgroup" colspan="5">${o.title}
            <span class="st-group__meta">${o.shown.length}${a?r` · <span class="st-red">${a} risky</span>`:""}</span></th></tr>
          ${o.shown.map(l=>r`<${Ze} key=${l.uid} row=${l} w=${t}/>`)}
        </tbody>`})}
    </table>`:r`<p class="st-empty">${n?"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}function Qe({w:t,aictl:e}){const s=t.q.trim().toLowerCase(),n=e.collectors.filter(a=>!s||[a.name,a.mode,a.status,a.detail].join(" ").toLowerCase().includes(s)),o=e.roots.filter(a=>!s||a.toLowerCase().includes(s));return r`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${e.collectors.length} collectors · ${e.roots.length} monitored roots</span>
    </div>
    ${n.length>0&&r`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${n.length}</span></th></tr>
        ${n.map(a=>r`<tr key=${a.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${a.name}</td>
          <td class="st-mono">${a.mode||"—"}</td>
          <td><span class=${"st-status "+(a.status==="active"?"is-ok":"is-warn")}>${a.status}</span></td>
          <td class="st-c-what" title=${a.detail||void 0}>${a.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${o.length>0&&r`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${o.map((a,l)=>r`<li key=${l} class="st-mono" title=${a}>${a}</li>`)}</ul>`}
    ${!n.length&&!o.length&&r`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function Pt(t){if(t.st.sec&&T.includes(t.st.sec))return t.st.sec;const e=s=>t.entries.some(n=>n.rows.some(o=>o.sec===s));return e("autonomy")?"autonomy":T.find(e)||"autonomy"}function Xe({w:t}){const e=Pt(t);return r`<nav class="st-nav" aria-label="Topics">
    <${k}>Topics</${k}>
    <ul class="st-nav__list">
      ${T.map(s=>{const n=t.entries.filter(l=>l.rows.some(i=>i.sec===s&&t.pass(i))),o=n.some(l=>l.rows.some(i=>i.sec===s&&i.risky&&t.pass(i))),a=s===e;return r`<li key=${s}><button type="button" class=${"st-nav__item"+(a?" is-on":"")+(n.length?"":" is-empty")}
          aria-current=${a?"true":void 0} data-sec=${s}
          onClick=${()=>t.set({sec:s})}>
          <span class="st-nav__label">${J[s]}</span>
          ${o&&r`<${D} label="A risky setting is on"/>`}
          <span class="st-nav__n">${n.length} ${n.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function ts({w:t}){const e=Pt(t),{tools:s,rows:n}=Re(t.entries,e,t.pass),o=n.reduce((a,l)=>a+Object.values(l.cells).filter(i=>i.risky).length,0);return r`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${J[e]}</h2>
      <span class="st-bar__sub">every tool, side by side${o?r` · <span class="st-red">${o} risky ${o===1?"value":"values"}</span>`:""}</span>
    </div>
    ${n.length?r`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${s.map(a=>r`<th scope="col" key=${a.id} class="st-matrix__tool" data-tool=${a.id}>
          <span class="st-matrix__toolname"><${F} id=${a.id}/>${a.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${n.map(a=>r`<tr key=${a.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${a.keys.join(`
`)}>${a.label}</th>
          ${s.map(l=>{var c;const i=a.cells[l.id];if(!i)return r`<td key=${l.id} class="st-cell st-cell--none">—</td>`;const u=((c=t.selected)==null?void 0:c.uid)===i.uid;return r`<td key=${l.id} class=${"st-cell"+(i.risky?" is-risky":"")+(u?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${i.key}
                aria-label=${`${a.label}, ${l.label}: ${Le(i.value)}`}
                onClick=${()=>t.select({tool:l.id,row:i.key})}>
                <${B} row=${i} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:r`<p class="st-empty">${s.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const es=8;function ss(t){return t.files.filter(e=>Nt(e,t.q)&&(!t.st.sec||e.location===t.st.sec)&&(!t.st.tool||e.tools.includes(t.st.tool)))}function ns({w:t}){const e=t.files.filter(n=>Nt(n,t.q)&&(!t.st.tool||n.tools.includes(t.st.tool))),s=[...new Set(t.files.flatMap(n=>n.tools))];return r`<nav class="st-nav" aria-label="File locations">
    <${k}>Locations</${k}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-nav__label">All locations</span><span class="st-nav__n">${e.length}</span></button></li>
      ${ct.map(n=>{const o=e.filter(l=>l.location===n.id).length,a=t.st.sec===n.id;return r`<li key=${n.id}><button type="button" class=${"st-nav__item"+(a?" is-on":"")+(o?"":" is-empty")}
          aria-current=${a?"true":void 0} data-loc=${n.id}
          onClick=${()=>t.set({sec:a?"":n.id,row:""})}>
          <span class="st-nav__label">${n.label}</span><span class="st-nav__n">${o}</span></button></li>`})}
    </ul>
    ${s.length>0&&r`<${k}>Read by</${k}>
      <ul class="st-nav__list">
        ${s.map(n=>{const o=t.st.tool===n;return r`<li key=${n}><button type="button" class=${"st-nav__item"+(o?" is-on":"")}
            aria-pressed=${o?"true":"false"} data-tool=${n}
            onClick=${()=>t.set({tool:o?"":n,row:""})}>
            <${F} id=${n}/><span class="st-nav__label">${t.labelOf(n)}</span>
            <span class="st-nav__n">${t.files.filter(a=>a.tools.includes(n)).length}</span></button></li>`})}
      </ul>`}
  </nav>`}function os({f:t,w:e}){const s=e.selectedFile&&e.selectedFile.path===t.path,n=()=>e.select({row:t.path});return r`<tr class=${"st-row"+(s?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${n}
    onKeyDown=${o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),n())}}>
    <td class="st-c-file">
      ${t.is_dir?r`<span class="st-fname" title=${t.path}>${t.name}/</span>`:r`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${o=>{o.stopPropagation(),e.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&r`<span class="st-hint"> missing</span>`}
    </td>
    <td><${Q} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(o=>r`<${X} key=${o} id=${o} label=${e.labelOf(o)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class=${/ignored|untracked|modified/i.test(t.git_state||"")?"st-warn":"st-dim"}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?U(t.mtime):"—"}</td>
  </tr>`}function is({w:t}){const[e,s]=y({}),[n,o]=y({}),a=ss(t),l=He(a);return r`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${a.length} ${a.length===1?"file":"files"} · grouped by where they live</span>
    </div>
    ${t.filesStatus!=="ready"&&r`<p class="st-note" role="status">File details are loading</p>`}
    ${l.length?r`<table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col">Settings</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${l.map(i=>{const u=!!n[i.root],c=!!e[i.root],d=u?[]:c?i.files:i.files.slice(0,es),p=u?0:i.files.length-d.length;return r`<tbody key=${i.root} data-root=${i.root}>
          <tr class="st-group"><th scope="colgroup" colspan="6">
            <button type="button" class="st-fold" aria-expanded=${u?"false":"true"}
              onClick=${()=>o({...n,[i.root]:!u})}>
              <span aria-hidden="true">${u?"▸":"▾"}</span>
              <span class="st-mono" title=${i.root}>${Ot(i.root)}</span></button>
            <span class="st-group__meta">${ut[i.location]||"Other"} · ${i.files.length} ${i.files.length===1?"file":"files"}</span>
          </th></tr>
          ${d.map(f=>r`<${os} key=${f.path} f=${f} w=${t}/>`)}
          ${p>0&&r`<tr class="st-morerow"><td colspan="6">
            <button type="button" class="st-link st-more" onClick=${()=>s({...e,[i.root]:!0})}>▸ ${p} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:r`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const ls=5;function Dt(t,e){return t?Ot(t)+(e>0?":"+e:""):"—"}function as({w:t}){const e=Mt(t.findings.filter(s=>Et(s,t.q)));return r`<nav class="st-nav" aria-label="Finding rules">
    <${k}>Finding rules</${k}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${e.reduce((s,n)=>s+n.count,0)}</span></button></li>
      ${e.map(s=>{const n=t.st.sec===s.rule;return r`<li key=${s.rule}><button type="button" class=${"st-nav__item"+(n?" is-on":"")}
          aria-current=${n?"true":void 0} data-rule=${s.rule}
          onClick=${()=>t.set({sec:n?"":s.rule,row:""})}>
          ${s.alarm?r`<${D} label=${s.severity+" severity"}/>`:r`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${s.label}</span><span class="st-nav__n">${s.count}</span></button></li>`})}
    </ul>
  </nav>`}function rs({f:t,group:e,w:s}){const n=s.selectedFinding&&s.selectedFinding.id===t.id,o=()=>s.select({row:t.id,sec:s.st.sec}),a=e.why&&t.why===e.why?t.action||"":t.why||t.action||"",l=dt(t).map(s.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return r`<tr class=${"st-row"+(n?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${o}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),o())}}>
    <td class="st-c-tool">${l}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Dt(t.path,t.line)}${t.count>1?r` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${a}</td>
    <td class="st-c-act">${t.path&&r`<button type="button" class="st-chip st-chip--btn"
      onClick=${i=>{i.stopPropagation(),s.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function cs({w:t}){const[e,s]=y({});if(t.auditStatus==="loading"&&!t.audit){const l=t.scan;return r`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${l?" "+(l.step||"")+(l.elapsed_s!=null?", "+Math.round(l.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return r`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        <button type="button" class="st-btn" onClick=${t.rescan}>Retry</button></p>
    </section>`;const n=t.findings.filter(l=>Et(l,t.q)),o=Mt(n).filter(l=>!t.st.sec||l.rule===t.st.sec),a=o.reduce((l,i)=>l+i.count,0);return r`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${a} in ${o.length} ${o.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      <button type="button" class="st-chip st-chip--btn st-bar__end" onClick=${t.rescan}>Rescan</button>
    </div>
    ${o.length?r`<table class="st-table st-findings">
      <thead><tr>
        <th scope="col" class="st-c-tool">Tool</th><th scope="col" class="st-c-where">Where</th>
        <th scope="col">What it does</th><th scope="col" class="st-c-act"><span class="st-sr">Action</span></th>
      </tr></thead>
      ${o.map(l=>{const u=!!e[l.rule]?l.items:l.items.slice(0,ls),c=l.items.length-u.length;return r`<tbody key=${l.rule} data-rule=${l.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${l.alarm&&r`<${D} label=${l.severity+" severity"}/>`} ${l.label}
            <span class="st-group__meta">${l.count} · ${l.tools.map(t.labelOf).join(", ")||"no tool"}${l.why?" · "+l.why:""}</span>
          </th></tr>
          ${u.map(d=>r`<${rs} key=${d.id} f=${d} group=${l} w=${t}/>`)}
          ${c>0&&r`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>s({...e,[l.rule]:!0})}>▸ ${c} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:r`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}function $({title:t,children:e}){return r`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${e}</section>`}function qt(t,e){return"Open "+C(t)+(e>0?" at line "+e:"")}function Wt(t,e){return e?t.findings.filter(s=>S(s.path,e)):[]}function Ht(t,e){t.set({view:"findings",sec:e.rule||"",row:e.id,tool:""})}function us({w:t,path:e}){const s=e&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(e):null,n=e?t.mtimeOf(e):null,o=[];return s?o.push(`File changed ${U(s.ts)}${s.tool?" by "+t.labelOf(s.tool):""} (file history)`):n&&o.push(`File last changed ${U(n)} (file history)`),r`<div class="st-hint" data-testid="st-history">${o.length?o.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function ds({w:t,row:e}){const s=t.entries.filter(i=>i.id!==e.tool&&e.source&&i.files.some(u=>S(u,e.source))).map(i=>i.label),n=e.source?t.files.find(i=>S(i.path,e.source)):null;for(const i of(n==null?void 0:n.tools)||[]){const u=t.labelOf(i);i!==e.tool&&!s.includes(u)&&s.push(u)}const o=Wt(t,e.source),{chain:a,wins:l}=e;return r`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${e.label}</h3>
    <div class="st-insp__key st-mono">${e.key}</div>
    ${e.tip&&r`<p class="st-insp__tip">${e.tip}</p>`}
    <div class="st-insp__chips">
      ${e.risky&&r`<span class="st-chip st-chip--risky">risky</span>`}
      <${X} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${Q} scope=${e.scope}/>
      ${s.length>0&&r`<span class="st-chip">also read by ${s.join(", ")}</span>`}
    </div>
    <div class="st-insp__value"><${B} row=${e}/></div>
    <${$} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${a.map((i,u)=>{const c=u===l;return r`<li key=${u} class=${"st-chain__lv"+(c?" is-win":"")} aria-current=${c?"true":void 0}>
            <span class="st-chain__sc">${i.scope||"default"}</span>
            <span class="st-chain__v">${z(i)?r`<span class="st-dim">not set</span>`:r`<${B} row=${e} value=${i.value} compact/>`}</span>
            <span class="st-chain__src">${i.source?r`<${Rt} path=${i.source} line=${Number(i.line)>0?Number(i.line):0} w=${t}/>`:r`<span class="st-dim">${i.note||(i.scope==="default"?t.labelOf(e.tool):"—")}</span>`}</span>
            ${c&&r`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${Oe(a,l)}</p>
    </${$}>
    <${$} title="History"><${us} w=${t} path=${e.source}/></${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${e.source&&r`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.source,e.line)}>${qt(e.source,e.line)}</button>`}
        ${o.length>0&&r`<button type="button" class="st-btn" onClick=${()=>Ht(t,o[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change value…</button>
        <span class="st-hint">phase 2: diff preview, backup, change log</span>
      </div>
    </${$}>
  </div>`}function ps({w:t,file:e}){const s=Wt(t,e.path),n=e.rows||[];return r`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${e.name}</h3>
    <div class="st-insp__key st-mono">${e.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${e.kind||"other"}</span>
      <${Q} scope=${e.scope}/>
      <span class="st-chip">${ut[e.location]||"Other"}</span>
      ${e.tools.map(o=>r`<${X} key=${o} id=${o} label=${t.labelOf(o)}/>`)}
    </div>
    <${$} title=${"Settings from this file"+(n.length?" · "+n.length:"")}>
      ${n.length?r`<ul class="st-insp__list">
        ${n.map(o=>r`<li key=${o.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:o.tool,sec:"",row:o.key})}>${o.label}</button>
          <span class="st-dim"> · ${t.labelOf(o.tool)}${o.line>0?" · line "+o.line:""}</span></li>`)}
      </ul>`:r`<div class="st-hint">${e.settings?e.settings+" settings":"No settings are read from this file."}</div>`}
    </${$}>
    <${$} title="File">
      <dl class="st-insp__dl">
        <dt>Git</dt><dd>${e.git_state||"—"}</dd>
        <dt>Size</dt><dd>${e.bytes!=null?ue(e.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${e.mtime?U(e.mtime):"—"}</dd>
        ${e.loading&&r`<dt>Loading</dt><dd>${e.loading}</dd>`}
        ${e.exists===!1&&r`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${!e.is_dir&&r`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path)}>Open file</button>`}
        ${s.length>0&&r`<button type="button" class="st-btn" onClick=${()=>Ht(t,s[0])}>Show finding</button>`}
      </div>
    </${$}>
  </div>`}function hs({w:t,f:e}){return r`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${pt(e.rule)}</h3>
    <div class="st-insp__key st-mono">${Dt(e.path,e.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(e.severity==="high"||e.severity==="medium"?" st-chip--risky":"")}>${e.severity||"info"}</span>
      ${dt(e).map(s=>r`<${X} key=${s} id=${s} label=${t.labelOf(s)}/>`)}
      ${e.session_id&&r`<span class="st-chip st-chip--mono">session ${e.session_id}</span>`}
    </div>
    ${e.why&&r`<${$} title="Why it matters"><p class="st-insp__tip">${e.why}</p></${$}>`}
    ${e.action&&r`<${$} title="What to do"><p class="st-insp__tip">${e.action}</p></${$}>`}
    <${$} title="Actions">
      <div class="st-actions">
        ${e.path&&r`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path,e.line)}>${e.line>0?qt(e.path,e.line):"Show the line"}</button>`}
      </div>
    </${$}>
  </div>`}function fs({w:t}){const{view:e}=t.st;let s=null;return(e==="tool"||e==="topic")&&t.selected?s=r`<${ds} w=${t} row=${t.selected}/>`:e==="files"&&t.selectedFile?s=r`<${ps} w=${t} file=${t.selectedFile}/>`:e==="findings"&&t.selectedFinding&&(s=r`<${hs} w=${t} f=${t.selectedFinding}/>`),r`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${s||r`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${e==="files"?"Click a file for its details.":e==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const ms=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Ct=new Set(["tool","topic"]);function St(){return typeof window<"u"?window.location.search:""}function $s(){const[t,e]=y(()=>wt(St())),s=L(n=>e(o=>{const a={...o,...n};if(n.view&&n.view!==o.view&&!(Ct.has(o.view)&&Ct.has(n.view)))for(const l of["tool","sec","row"])l in n||(a[l]="");return a}),[]);return P(()=>{bt(Ve(t))},[t]),P(()=>{const n=()=>e(wt(St()));return window.addEventListener("popstate",n),()=>{window.removeEventListener("popstate",n),bt(Ke)}},[]),[t,s]}function gs(){const[t,e]=y({status:"loading",files:null});return P(()=>{let s=!0;return pe().then(n=>{s&&e(Array.isArray(n==null?void 0:n.files)?{status:"ready",files:n.files}:{status:"unavailable",files:null})},()=>{s&&e({status:"unavailable",files:null})}),()=>{s=!1}},[]),t}function bs(){const[t,e]=y(0),[s,n]=y({status:"loading",audit:null,scan:null,error:null});P(()=>{let a=!0;return n(l=>({...l,status:"loading",error:null})),he(t>0,l=>{a&&n(i=>({...i,scan:l}))}).then(l=>{a&&n({status:"ready",audit:l,scan:null,error:null})},l=>{a&&n(i=>({...i,status:"error",scan:null,error:String((l==null?void 0:l.message)||l)}))}),()=>{a=!1}},[t]);const o=L(()=>e(a=>a+1),[]);return{...s,rescan:o}}function ys(){var gt;const t=te(se)||{},{snap:e,openViewer:s,enabledTools:n=null,recentFiles:o}=t,[a,l]=$s(),[i,u]=y(""),[c,d]=y(!1),[p,f]=y(!1),[tt,et]=y(!1),ht=ee(null),st=gs(),A=bs();P(()=>{const h=m=>{var w;m.key==="/"&&!ne(m.target)&&!m.metaKey&&!m.ctrlKey&&!m.altKey?(m.preventDefault(),(w=ht.current)==null||w.focus()):m.key==="Escape"&&et(!1)};return window.addEventListener("keydown",h),()=>window.removeEventListener("keydown",h)},[]);const b=O(()=>Ne(e),[e]),j=O(()=>Ie(e),[e]),ft=O(()=>Lt(e),[e]),Gt=O(()=>Me({q:i,nonDefault:c,risky:p}),[i,c,p]),I=O(()=>We(st.files,b,ft,n),[st.files,b,ft,n]),E=O(()=>de(A.audit,n),[A.audit,n]),nt=O(()=>Ge((E==null?void 0:E.findings)||[]),[E]),Ut=L((h,m=0)=>{!h||!s||s(h,m>0?{line:m}:{})},[s]),Vt=L(h=>{l(h),et(!0)},[l]),Kt=L(()=>et(!1),[]),zt=L(h=>jt(h,e),[e]),Bt=L(h=>{const m=I.find(w=>S(w.path,h));if(m!=null&&m.mtime)return m.mtime;for(const w of(e==null?void 0:e.tools)||[])for(const x of w.files||[])if(S(x.path,h)&&x.mtime)return x.mtime;return null},[I,e]);if(!e)return r`<p class="loading-state">Loading...</p>`;if(!b.length&&!j&&!vt(n))return r`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const ot=b.some(h=>h.id===a.tool)||a.tool==="aictl"&&j?a.tool:((gt=b[0])==null?void 0:gt.id)||(j?"aictl":""),q=b.find(h=>h.id===ot)||null,mt=(h,m)=>{var w;return m&&((w=b.find(x=>x.id===h))==null?void 0:w.rows.find(x=>x.key===m))||null},Jt=a.view==="tool"?q?mt(q.id,a.row):null:a.view==="topic"?mt(a.tool,a.row):null,Zt=a.view==="files"&&a.row&&I.find(h=>h.path===a.row)||null,Yt=a.view==="findings"&&a.row&&nt.find(h=>h.id===a.row)||null,v={st:a,set:l,select:Vt,q:i,pass:Gt,entries:b,aictl:j,toolId:ot,files:I,filesStatus:st.status,findings:nt,audit:E,auditStatus:A.status,auditError:A.error,scan:A.scan,rescan:A.rescan,selected:Jt,selectedFile:Zt,selectedFinding:Yt,openAt:Ut,labelOf:zt,mtimeOf:Bt,recentFiles:o,drawer:tt,closeDrawer:Kt},Qt=b.reduce((h,m)=>h+m.rows.length,0),$t=b.reduce((h,m)=>h+m.risky,0),Xt=vt(n)&&!b.some(h=>h.id!=="vscode");let M,R;return a.view==="topic"?(M=r`<${Xe} w=${v}/>`,R=r`<${ts} w=${v}/>`):a.view==="files"?(M=r`<${ns} w=${v}/>`,R=r`<${is} w=${v}/>`):a.view==="findings"?(M=r`<${as} w=${v}/>`,R=r`<${cs} w=${v}/>`):(M=r`<${Je} w=${v}/>`,R=q?r`<${Ye} w=${v} entry=${q}/>`:ot==="aictl"&&j?r`<${Qe} w=${v} aictl=${j}/>`:r`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),r`<div class="st-ws" data-view=${a.view}>
    <div class="st-head">
      <${oe} class="st-pivot" options=${ms} value=${a.view} ariaLabel="Settings view"
        onChange=${h=>l({view:h})}/>
      <label class="st-searchbox">
        <${ie} name="search" size="14"/>
        <input ref=${ht} type="search" class="st-search" value=${i}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${h=>u(h.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(c?" is-on":"")} aria-pressed=${c?"true":"false"}
        onClick=${()=>d(!c)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(p?" is-on":"")} aria-pressed=${p?"true":"false"}
        onClick=${()=>f(!p)}>Only risky</button>
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${b.length}</b> tools</span>
        <span><b>${I.length}</b> files</span>
        <span><b>${Qt}</b> settings</span>
        <span class=${$t?"st-red":""}><b>${$t}</b> risky</span>
        <span><b>${A.status==="loading"&&!A.audit?"…":nt.length}</b> findings</span>
      </div>
    </div>
    ${Xt&&r`<div class="st-scope-empty"><${le} enabledTools=${n} snap=${e} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${M}</div>
      <div class="st-col st-col--main">${R}</div>
      <${fs} w=${v}/>
    </div>
  </div>`}function Cs(){return r`<${ys}/>`}export{Cs as default};
