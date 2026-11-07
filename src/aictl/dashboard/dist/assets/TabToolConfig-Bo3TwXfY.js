import{m as a,d as y,x as Te,A as we,y as U,T as O,q as T,w as jt}from"./index-DyDyJAkK.js";import{I as gt,S as Le,k as Ne,m as je,a as Ee}from"./app-CcuDFzdW.js";import{V as b,O as Et,U as Fe,b2 as Ie,C as Me,B as et,q as Re,s as Pe,L as Ft,b3 as De,h as qe}from"./useSse-DFs1a0pz.js";import"./TextView-DRRCCuem.js";const M={OTel:{enabled:"Whether OpenTelemetry export is active. Required for verified token counts and session traces.",exporter:"Export destination: otlp-http sends to an OTLP-compatible collector (e.g. aictl), console logs to stdout, file writes JSON-lines locally.",endpoint:"OTLP collector endpoint receiving telemetry data.",file_path:"Local file path for telemetry output (file exporter).",capture_content:"When enabled, full prompt and response text is included in OTel spans. Useful for debugging but exposes all LLM content to the collector.",source:"How aictl detected this OTel configuration (vscode-settings, env-var, codex-toml, claude-stats)."},"Agent Mode":{enabled:"Whether agent/agentic mode is active."},Agent:{enabled:"Whether agent/agentic mode is active."},"Claude (Anthropic)":{temperature:"Sampling temperature for Claude agent requests. 0 = deterministic; higher values increase randomness.",webSearch:"Allows Claude to perform live web searches during agent runs. Adds external network calls and potential data leakage."},"Cowork (Autonomous)":{webSearch:"Allows Cowork mode to perform live web searches as part of autonomous tasks.",scheduledTasks:"Enables Cowork mode to schedule and run tasks on a timer.",allowAllBrowserActions:"Grants Cowork mode permission to take any browser action without per-action confirmation."}},We={autoFix:"When on, the agent automatically attempts to fix errors it detects during a run without asking.",editorContext:"Ensures the agent always includes your active editor file as primary context for every request.",largeResultsToDisk:"Redirects oversized tool results (e.g. large directory listings) to disk instead of sending them into the LLM context window.",historySummarizationMode:'Controls how prior conversation turns are compressed before re-sending to the model. "auto" lets the model decide; "always" forces summarization.',maxRequests:"Maximum number of agentic tool calls allowed in a single turn before the agent pauses and asks for confirmation.",plugins:"Enables the VS Code chat plugin system, allowing third-party extensions to add tools and context providers.",fileLogging:"Writes agent debug events to disk. Required for the /troubleshoot command to produce a diagnostic report.",requestLoggerMaxEntries:"Number of recent LLM requests retained in the in-memory request logger for debugging.",mcp:"Enables MCP server support when running in CLI/autonomous mode.",worktreeIsolation:"When enabled, the CLI agent works in a separate git worktree so its edits cannot affect your active branch until you review them.",autoCommit:"The agent automatically commits its changes to git after completing a tool run. Only safe when combined with worktree isolation.",branchSupport:"Allows the CLI agent to create and switch git branches during a task.",local:"Local in-process memory tool — agent can store and recall facts within a session.",github:"GitHub-hosted Copilot memory — cross-session memory stored on GitHub servers (expires after 28 days).",viewImage:"Allows the agent to read and process image files (requires a multimodal model).",claudeTarget:'The "Claude" session target in Copilot Chat delegates requests to the local Claude Code harness.',autopilot:"Autopilot mode lets the agent execute tool calls without per-action confirmation prompts.",autoReply:"Auto-answers agent questions without human input — agent never pauses for confirmation. Use with extreme caution.",terminalSandbox:"Runs terminal commands in a sandbox (macOS/Linux). Prevents agent commands from accessing files outside the workspace.",terminalAutoApprove:"Org-managed master switch — disables all terminal auto-approve when off, regardless of per-command settings.",autoApproveNpmScripts:"Auto-approves npm scripts defined in the workspace package.json without requiring per-script confirmation.",globalAutoApprove:"YOLO mode — disables ALL tool confirmation prompts across every tool and workspace. Extremely dangerous; agent acts fully autonomously with no human oversight.",autoApprove:"Auto-approves all tool calls of this type without prompting. Removes the human-in-the-loop safety check.",terminal_sandbox:"Runs terminal commands in a sandboxed environment to prevent destructive operations.",applyingInstructions:"Auto-attaches instruction files whose applyTo glob matches the current file. Controls which instructions are automatically injected.",claudeMd:"Controls whether CLAUDE.md files are loaded into agent context on every request. Disabling removes custom instructions from all Claude sessions.",agentsMd:"Controls whether AGENTS.md is loaded as always-on context. Disabling removes the top-level agent instruction file.",nestedAgentsMd:"When on, AGENTS.md files in sub-folders are also loaded, scoping instructions to sub-trees of the workspace.",instructions:"Search locations for .instructions.md files that are automatically attached to matching requests.",agents:"Search locations for .agent.md custom agent definition files.",skills:"Search locations for SKILL.md agent skill files.",prompts:"Search locations for .prompt.md reusable prompt files.",access:'Controls which MCP tools are accessible to agents. "all" = unrestricted; can be set to allowlist by org policy.',autostart:'"newAndOutdated" starts MCP servers when config changes; "always" starts on every window open.',discovery:"Auto-discovers and imports MCP server configs from other installed apps (e.g. Claude Desktop, Cursor).",claudeHooks:"When on, Claude Code-format hooks in settings.json are executed at agent lifecycle events (pre/post tool use, session start/end).",customAgentHooks:"When on, hooks defined in .agent.md frontmatter are parsed and executed during agent runs.",locations:"File paths where hook configuration files are loaded from. Relative to workspace root.",thinkingBudget:"Token budget for Claude extended thinking. Higher = more reasoning compute = higher cost per request.",thinkingEffort:'Reasoning effort level for Claude. "high" uses extended thinking (expensive); "default" is standard.',skipPermissions:"Bypasses all Claude Code permission checks when running as a VS Code agent session. Equivalent to --dangerously-skip-permissions flag.",effortLevel:'Controls how much compute Claude spends on reasoning. "high" uses extended thinking; "default" is standard.',hooks:"Claude Code hooks are configured — shell commands that run at lifecycle events (pre/post tool use, session start/end).",installMethod:"How Claude Code was installed (native, npm, homebrew, etc.).",hasCompletedOnboarding:"Whether the initial Claude Code onboarding flow has been completed.",project_settings:"A .claude/settings.json exists in this project with project-specific configuration.",project_permissions:"Project settings include a permissions block controlling tool access.",vimMode:"Enables Vim-style keybindings in the Gemini CLI.",approvalMode:"Tool execution mode: default (prompt), auto_edit (auto-approve edits), or plan (read-only).",notifications:"Enables OS notifications for prompt alerts and session completion.",respectGeminiIgnore:"Controls whether the CLI respects patterns in .geminiignore files.",additionalIgnores:"Number of extra patterns added to the global file ignore list.",lineNumbers:"Shows line numbers in code blocks within the chat interface.",alternateScreen:"Uses the terminal alternate buffer to preserve shell scrollback history.",hideContext:"Hides the summary of attached files/context above the input prompt.",effort:"Reasoning effort level for the model (e.g., standard, high).",temperature:"Sampling temperature for model requests. 0 = deterministic; higher = more creative.",budget:"Maximum token budget for reasoning/extended thinking.",coreTools:"Number of built-in tools explicitly enabled for the agent.",excludeTools:"Number of tools explicitly disabled for safety or cost control.",customAgents:"Number of custom agent definitions discovered (.agent.md, AGENTS.md, or .gemini/agents/*.md).",sidebarMode:"Controls whether Claude Desktop opens as a sidebar or full window.",trustedFolders:"Number of directories where Claude Code (embedded in Desktop) can run without additional permission prompts.",livePreview:"Enables the live preview pane that shows rendered output during Code mode tasks."};function Ge(t,e){return e&&M[e]&&M[e][t]||We[t]||""}function Ue(t){const e=String(t||"").split(".");return e[e.length-1]}function He(t,e){const s=Ue(t.key);return t.note||t.group&&M[t.group]&&M[t.group][s]||e==="telemetry"&&M.OTel[s.replace(/^otel_?/,"")]||Ge(s,t.group)||""}const E=["model","agents","telemetry","autonomy","context","hooks","mcp","extensions","startup","other"],B={model:"Model",agents:"Agents",telemetry:"Telemetry",autonomy:"Autonomy and safety",context:"Context files",hooks:"Hooks",mcp:"MCP servers",extensions:"Extensions and plugins",startup:"Updates and startup",other:"Other settings"},ze={Agent:"autonomy","Agent Mode":"autonomy","Code (Agent)":"autonomy","Cowork (Autonomous)":"autonomy",Safety:"autonomy","Claude (Anthropic)":"autonomy",Hooks:"hooks","Context Files":"context","File Locations":"context",MCP:"mcp"},Ke=new Set(["globalAutoApprove","autoApprove","autoReply","autopilot","skipPermissions","allowAllBrowserActions","autoCommit","dangerouslySkipPermissions","yolo"]),st="—";function Be(t){const e=String(t||"").split(".");return e[e.length-1]}function vt(t){return String(t||"").replace(/^github\.copilot\./,"").toLowerCase().replace(/[^a-z0-9]/g,"")}function It(t){const e=String(t||"").split(/[._]/).filter(Boolean);return vt(e[e.length-1])}function Ve(t){return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"")}function it(t){const e=String(t||"").replace(/^github\.copilot\./,"").replace(/^chat\./,"").replace(/[._-]+/g," ").replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/\?+$/,"").trim().toLowerCase();return e?e[0].toUpperCase()+e.slice(1):""}function at(t){return typeof t=="boolean"?"flag":typeof t=="number"?"number":Array.isArray(t)?"list":t&&typeof t=="object"?"map":typeof t=="string"&&/^(~|\/|[A-Za-z]:\\)/.test(t)?"path":"text"}function Ut(t){return t===!0?!0:Array.isArray(t)?t.length>0:t&&typeof t=="object"?Object.keys(t).length>0:typeof t=="number"?t>0:typeof t=="string"?!!t&&!["false","off","no","0","none","default","never"].includes(t.toLowerCase()):!1}function Je(t){const e=String(t).toLowerCase();return/otel|telemetry/.test(e)?"telemetry":/model|effort|thinking|reasoning/.test(e)?"model":/hook/.test(e)?"hooks":/mcp/.test(e)?"mcp":/update|startup|launch/.test(e)?"startup":"other"}function nt(t){return Array.isArray(t)?"["+t.map(nt).join(",")+"]":t&&typeof t=="object"?"{"+Object.keys(t).sort().map(e=>JSON.stringify(e)+":"+nt(t[e])).join(",")+"}":JSON.stringify(t??null)}function v(t,e,s={}){const n=e===void 0?null:e;return{key:t,label:s.label||it(t),value:n,kind:s.kind||at(e),source:s.source||"",danger:s.danger??(Ke.has(Be(t))&&Ut(n)),note:s.note||"",group:s.group}}function Ze(t){const e=t.config_files||[],s=e[0]||"",n=Object.fromEntries(E.map(u=>[u,[]])),o=new Set,i=new Map,l=(u,d)=>{const p=vt(d.key);p&&o.has(p)||(p&&o.add(p),i.set(It(d.key)+"="+nt(d.value),!0),n[u].push(d))};t.model&&l("model",v("model",t.model,{label:"Model",kind:"text",source:s}));for(const u of t.configurable_models||[]){if(!u||!u.key)continue;const d=u.source&&u.source!=="default",p=u.source==="workspace"?e.find($=>/[\\/]\.vscode[\\/]/.test($))||s:e.find($=>!/[\\/]\.vscode[\\/]/.test($))||s;l("model",v(u.key,d?u.value:null,{label:u.label,kind:"text",source:d?p:"",note:[u.description,d?"":u.default_hint?`Default: ${u.default_hint}`:""].filter(Boolean).join(" ")}))}const c=t.otel||{};(c.enabled!==void 0||c.source)&&(l("telemetry",v("otel.enabled",!!c.enabled,{label:"OpenTelemetry export",kind:"flag",note:M.OTel.enabled})),c.exporter&&l("telemetry",v("otel.exporter",c.exporter,{label:"Exporter",kind:"text",group:"OTel"})),c.endpoint&&l("telemetry",v("otel.endpoint",c.endpoint,{label:"Endpoint",kind:"text",group:"OTel"})),c.file_path&&l("telemetry",v("otel.file_path",c.file_path,{label:"Output file",kind:"path",group:"OTel"})),c.capture_content!==void 0&&l("telemetry",v("otel.capture_content",!!c.capture_content,{label:"Capture content",kind:"flag",group:"OTel"})));for(const[u,d]of Object.entries(t.feature_groups||{})){const p=ze[u]||"other";for(const[$,F]of Object.entries(d||{}))l(p,v($,F,{source:s,group:u}))}const r=c.enabled!==void 0||!!c.source;for(const[u,d]of Object.entries(t.settings||{})){const p=Je(u);p==="telemetry"&&r||i.has(It(u)+"="+nt(d))||l(p,v(u,d,{source:s}))}return(t.mcp_servers||[]).length&&l("mcp",v("mcp_servers",t.mcp_servers,{label:"Servers",kind:"list",source:s})),(t.extensions||[]).length&&l("extensions",v("extensions",t.extensions,{label:"Installed",kind:"list"})),(t.auto_update===!0||t.auto_update===!1)&&l("startup",v("auto_update",t.auto_update,{label:"Automatic updates",kind:"flag"})),(t.launch_at_startup===!0||t.launch_at_startup===!1)&&l("startup",v("launch_at_startup",t.launch_at_startup,{label:"Start at login",kind:"flag"})),E.filter(u=>n[u].length).map(u=>({id:u,title:B[u],rows:n[u]}))}function Mt(t){const e=E.indexOf(t);return e<0?E.length:e}function Ye(t){return(Array.isArray(t==null?void 0:t.sections)?t.sections:Ze(t||{})).filter(s=>s&&Array.isArray(s.rows)&&s.rows.length).map(s=>({...s,title:s.title||B[s.id]||it(s.id)})).sort((s,n)=>Mt(s.id)-Mt(n.id))}const Qe=/^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/i;function A(t){return String(t||"").replace(/\\/g,"/").replace(/(.)\/+$/,"$1")}function _(t,e){return!!t&&!!e&&A(t)===A(e)}function lt(t){const e=String(t||"");if(e.startsWith("~"))return"~";const s=Qe.exec(A(e));return s?e.slice(0,s[1].length):""}function Ht(t,e){const s=A(t),n=A(e);return!!n&&(s===n||s.startsWith(n+"/"))}function ct(t){const e=String(t||""),s=lt(e);return!s||s==="~"||Ie(e)?e:"~"+e.slice(s.length)}function zt(t){var n;const e=[t==null?void 0:t.root,...((n=t==null?void 0:t.live_monitor)==null?void 0:n.workspace_paths)||[]],s=[];for(const o of e){if(!o||typeof o!="string")continue;const i=A(o);i==="/"||A(lt(o))===i||/^[A-Za-z]:$/.test(i)||s.some(l=>A(l)===i)||s.push(o)}return s}const Xe={default:"Default",system:"System",managed:"Managed",policy:"Policy",user:"User",profile:"Profile",project:"Project","project-local":"Project local",workspace:"Workspace",env:"Env",cli:"CLI"},Rt=["system","user","profile","project","project-local","workspace","env","cli","managed","policy"],ts=new Set(["system","managed","policy"]);function x(t,e=[]){const s=(e||[]).find(n=>n.id===t);return s&&s.label||Xe[t]||it(t||"default")}function es(t,e){const s=(e||[]).filter(i=>i.scopeGiven&&i.scope!=="default");if(Array.isArray(t==null?void 0:t.scopes)&&t.scopes.length)return t.scopes.filter(i=>i&&i.id).map(i=>({id:i.id,label:i.label||x(i.id),path:i.path||"",paths:i.path?[i.path]:[],exists:i.exists!==!1,changeable:i.changeable!==!1,note:i.note||"",given:!0}));const n=[...new Set(s.map(i=>i.scope))],o=i=>{const l=Rt.indexOf(i);return l<0?Rt.indexOf("cli"):l};return n.sort((i,l)=>o(i)-o(l)),n.map(i=>{const l=[];for(const c of s)c.scope===i&&c.source&&!l.some(r=>_(r,c.source))&&l.push(c.source);return{id:i,label:x(i),path:l[0]||"",paths:l,exists:!0,changeable:!ts.has(i)&&!s.some(c=>c.scope===i&&c.locked),note:"",given:!1}})}function Kt(t,e=[]){if(!t)return!1;if(t.locked===!0)return!0;const s=(e||[]).find(n=>n.id===t.scope);return!!s&&s.changeable===!1}function ss(t=[]){for(let e=t.length-1;e>=0;e-=1){const s=t[e];if(s.changeable!==!1&&s.path)return s}return null}function Bt(t,e=[]){const s=String(t||"");return s?/[\\/]\.vscode[\\/]/.test(s)?"workspace":e.some(n=>Ht(s,n))?"project":lt(s)?"user":"project":"default"}function ns(t,e=[]){return t&&typeof t.scope=="string"&&t.scope?t.scope:Bt(t==null?void 0:t.source,e)}function Vt(t){const e=Number(t==null?void 0:t.line);return Number.isFinite(e)&&e>0?Math.floor(e):0}function H(t){return!t||t.set===!1||t.value===void 0}function os(t,e){const s=Array.isArray(t==null?void 0:t.chain)?t.chain.filter(o=>o&&typeof o=="object"):[];if(!s.length)return{chain:[{scope:e,value:t==null?void 0:t.value,source:(t==null?void 0:t.source)||"",line:Vt(t)}],wins:0};let n=Number.isInteger(t.wins)&&t.wins>=0&&t.wins<s.length?t.wins:-1;if(n<0&&(n=s.findIndex(o=>o.wins===!0)),n<0&&(n=s.findIndex(o=>o.scope===e&&_(o.source,t.source))),n<0){for(let o=s.length-1;o>=0;o-=1)if(!H(s[o])){n=o;break}}return{chain:s,wins:n<0?s.length-1:n}}function $t(t,e){return t.length<=1?t.join(""):t.slice(0,-1).join(", ")+" "+e+" "+t[t.length-1]}function is(t,e){const s=t==null?void 0:t[e];if(!s)return"";const n=s.scope==="default"?"The default":`The ${s.scope} ${s.source?"file":"value"}`;if(t.length===1)return s.scope==="default"?"No file sets this, so the default applies.":`Only the ${s.scope} level sets this, so its value applies.`;const o=t.slice(e+1),i=o.filter(c=>!H(c)),l=t.slice(0,e).filter(c=>!H(c)).map(c=>c.scope);return o.length?i.length?`${n} wins over the ${$t(i.map(c=>c.scope),"and")} value: ${s.scope} takes precedence for this setting.`:`${n} wins because no ${$t(o.map(c=>c.scope),"or")} value is set.`:`${n} wins: ${s.scope} is the highest level that sets it${l.length?", above "+$t(l,"and"):""}.`}function bt(t){return t==null||t===""?"":t===!0?"on true":t===!1?"off false":Array.isArray(t)?t.map(bt).join(" "):typeof t=="object"?Object.entries(t).map(([e,s])=>e+" "+bt(s)).join(" "):String(t)}function Jt(t){if(t==null||t==="")return st;if(t===!0)return"on";if(t===!1)return"off";if(Array.isArray(t))return t.length+(t.length===1?" item":" items");if(typeof t=="object"){const e=Object.keys(t).length;return e+(e===1?" item":" items")}return String(t)}const as=[[/exporter$/i,["otlp-http","otlp-grpc","console","file"]],[/effort(level)?$/i,["minimal","low","medium","high","xhigh","max"]],[/approval[._]?policy$|askforapproval$/i,["untrusted","on-failure","on-request","never"]],[/approval[._]?mode$/i,["default","auto_edit","plan","yolo"]],[/sandbox[._]?mode$/i,["read-only","workspace-write","danger-full-access"]],[/(^|\.)access$/i,["all","registry","none"]],[/autostart$/i,["never","onlyNew","newAndOutdated"]]];function ls(t){if(!t)return null;if(Array.isArray(t.options)&&t.options.length)return t.options.map(String);if((t.kind||at(t.value))!=="text"||typeof t.value!="string"||!t.value)return null;const s=String(t.key||""),n=String(t.label||"").replace(/\s+/g,"");for(const[o,i]of as)if(o.test(s)||o.test(n))return i.includes(t.value)?i:[t.value,...i];return null}function Zt(t,e){return t==="vscode"?"VS Code":t==="aictl"?"aictl":Fe(t,e)}function cs(t,e,s,n){const o=ns(t,n),i=t.agent&&typeof t.agent=="object"?t.agent:null,{chain:l,wins:c}=os(t,o);return{...t,uid:e+""+t.key,tool:e,sec:s.id,secTitle:s.title,label:t.label||it(t.key),kind:t.kind||at(t.value),source:t.source||"",line:Vt(t),scope:o,chain:l,wins:c,risky:!!t.danger,tip:He(t,s.id),scopeGiven:typeof t.scope=="string"&&!!t.scope,locked:t.locked===!0,unset:t.set===!1,undocumented:t.documented===!1,agent:i?{...i,tools:Array.isArray(i.tools)?i.tools.map(String):[]}:null}}function rt(t){return!!t&&t.kind==="agent"&&!!t.agent}function N(t){const e=t==null?void 0:t.agent;return e&&typeof e.inherits=="boolean"?e.inherits:(t==null?void 0:t.value)==="inherits"||(t==null?void 0:t.value)===null||(t==null?void 0:t.value)===void 0||(t==null?void 0:t.value)===""}function Yt(t){var o;const e=t==null?void 0:t.agent;if(!e||!e.pinned_in||N(t))return!1;const s=(o=t.chain)==null?void 0:o[t.wins],n=s&&s.source||t.source;return!n||_(n,e.pinned_in)}function rs(t){if(!t.length||t.some(N))return"";const e=new Set(t.map(s=>String(s.value)));return e.size===1?[...e][0]:""}function us(t){const e=t.agent||{},s=N(t),n=Yt(t),o=e.pinned_in?(t.chain||[]).find(u=>_(u.source,e.pinned_in)):null,i=o&&!H(o)?o.value:n?t.value:void 0,l=[{id:"file",label:"Agent file",value:e.model||void 0,source:e.defined_in||"",line:Number(e.defined_line)>0?Number(e.defined_line):0},{id:"pin",label:"Settings pin",value:i,source:e.pinned_in||"",line:Number(e.pinned_line)>0?Number(e.pinned_line):0,present:!!e.pinned_in},{id:"effective",label:"Effective",value:s?"inherits":t.value}];let c=2,r;return s?r="Neither the agent file nor a settings pin names a model, so the agent runs on the session model.":n?(c=1,r=`The pin in ${b(e.pinned_in)} wins over ${e.model?"the model in the agent file":"the agent file, which names no model"}.`):(c=0,r=e.pinned_in?e.model_policy==="required"?"The agent file requires its model, so it wins over the settings pin.":`The model in the agent file applies; the pin in ${b(e.pinned_in)} does not decide it.`:"The agent file names the model and no settings pin applies."),t.note&&(r+=" "+t.note),{steps:l,wins:c,why:r}}function ds(t){const e=Array.isArray(t==null?void 0:t.tool_configs)?t.tool_configs:[],s=((t==null?void 0:t.tools)||[]).map(l=>l.tool),n=zt(t),o=e.filter(l=>l&&l.tool).map(l=>{const c=Ye(l).map(d=>({id:d.id,title:d.title,rows:d.rows.map(p=>cs(p,l.tool,d,n))})),r=c.flatMap(d=>d.rows),u=[];for(const d of[...l.config_files||[],...r.map(p=>p.source)])d&&!u.some(p=>_(p,d))&&u.push(d);return{id:l.tool,label:Zt(l.tool,t),cfg:l,sections:c,rows:r,files:u,risky:r.filter(d=>d.risky).length,hints:l.hints||[],scopes:es(l,r)}}),i=l=>{const c=s.indexOf(l);return c<0?s.length+(l==="vscode"?1:0):c};return o.map((l,c)=>({e:l,i:c})).sort((l,c)=>i(l.e.id)-i(c.e.id)||l.i-c.i).map(l=>l.e)}function ps(t){const e=(t==null?void 0:t.live_monitor)||{},s=Object.entries(e.diagnostics||{}).map(([o,i])=>({name:o,mode:(i==null?void 0:i.mode)||"",status:(i==null?void 0:i.status)||"unknown",detail:(i==null?void 0:i.detail)||""})),n=[...e.workspace_paths||[],...e.state_paths||[]].filter(Boolean);return!s.length&&!n.length?null:{id:"aictl",label:"aictl",collectors:s,roots:n}}function hs(t,e){if(!e)return!0;const s=[t.label,t.key,bt(t.value),b(t.source)],n=t.agent;return n&&s.push(n.name,n.model,...n.tools||[],b(n.defined_in),b(n.pinned_in)),s.filter(Boolean).join(`
`).toLowerCase().includes(e.toLowerCase())}function Pt({q:t="",nonDefault:e=!1,risky:s=!1,unset:n=!1}={}){const o=t.trim().toLowerCase();return i=>hs(i,o)&&(!e||i.scope!=="default"&&!i.unset&&!(rt(i)&&N(i)))&&(!s||i.risky)&&(n||!i.unset)}function fs(t,e,s=()=>!0){const n=t.filter(r=>r.rows&&r.rows.some(u=>u.sec===e)),o=[],i=new Map,l=new Map;for(const r of n)for(const u of r.rows){if(u.sec!==e)continue;const d=Ve(u.label),p=vt(u.key);let $=i.get(d)||l.get(p);$&&$.cells[r.id]&&($=null),$||($={id:"g"+o.length,label:u.label,keys:[],cells:{}},o.push($)),i.has(d)||i.set(d,$),l.has(p)||l.set(p,$),$.cells[r.id]=u,$.keys.includes(u.key)||$.keys.push(u.key)}const c=o.filter(r=>Object.values(r.cells).some(s));return{tools:n,rows:c}}const _t=[{id:"home",label:"Home folder"},{id:"tool-home",label:"Tool folders"},{id:"project",label:"This project"},{id:"vscode-user",label:"VS Code user folder"},{id:"other",label:"Other"}],kt=Object.fromEntries(_t.map(t=>[t.id,t.label])),$s=new Set([".claude",".github",".vscode",".cursor",".codex",".gemini",".copilot",".windsurf"]);function tt(t){const e=Math.max(t.lastIndexOf("/"),t.lastIndexOf("\\"));return e>0?t.slice(0,e):t}function ms(t,e=[]){const s=String(t||""),n=A(s),o=n.indexOf("/.vscode/"),i=e.find(u=>Ht(n,u));if(i)return{location:"project",location_root:i};if(o>0)return{location:"project",location_root:s.slice(0,o)};const l=/^(.*\/(?:Code|Code - Insiders|VSCodium)\/User)(\/|$)/.exec(n);if(l)return{location:"vscode-user",location_root:s.slice(0,l[1].length)};const c=lt(s);if(c){const u=n.slice(A(c).length+1).split("/").filter(Boolean);if(u.length>1&&u[0].startsWith("."))return{location:"tool-home",location_root:s.slice(0,c.length+1+u[0].length)};if(u.length>3&&(u[0]==="Library"||u[0]==="AppData")){const d=c.length+1+u.slice(0,3).join("/").length;return{location:"tool-home",location_root:s.slice(0,d)}}if(u.length<=1)return{location:"home",location_root:c}}let r=tt(s);for(;$s.has(b(r))&&tt(r)!==r;)r=tt(r);return{location:"other",location_root:r}}function gs(t){const e=b(t).toLowerCase();return/mcp/.test(e)?"mcp":/^(agents|claude|gemini|copilot-instructions)\.md$|\.instructions\.md$/.test(e)?"instructions":/\.agent\.md$/.test(e)?"agents":/\.prompt\.md$/.test(e)?"prompts":/\.md$/.test(e)?"memory":"settings"}function bs(t,e,s=[],n=null){const o=[],i=c=>o.find(r=>_(r.path,c)),l=c=>{const r=i(c.path);if(r){for(const p of c.tools||[])r.tools.includes(p)||r.tools.push(p);return r}const u=ms(c.path,s),d={name:b(c.path),location:u.location,location_root:u.location_root,scope:Bt(c.path,s),kind:gs(c.path),settings:null,bytes:null,mtime:null,git_state:"",exists:!0,...c,tools:[...c.tools||[]]};return d.location_root||(d.location_root=u.location_root),kt[d.location]||(d.location="other"),o.push(d),d};for(const c of Array.isArray(t)?t:[])c&&c.path&&l(c);for(const c of e)for(const r of c.files)l({path:r,tools:[c.id]});for(const c of o){const r=e.flatMap(u=>u.rows.filter(d=>_(d.source,c.path)));c.rows=r,(c.settings===null||c.settings===void 0)&&(c.settings=r.length)}return o.filter(c=>!c.tools.length||c.tools.some(r=>Et(r,n))).map(c=>({...c,tools:c.tools.filter(r=>Et(r,n))}))}function ys(t){const e=[];for(const s of t||[])for(const n of s.scopes||[]){if(!n.given||n.exists||n.changeable||!n.path)continue;const o=e.find(i=>_(i.path,n.path));if(o){o.tools.includes(s.id)||o.tools.push(s.id);continue}e.push({path:n.path,name:b(n.path),scope:n.id,label:n.label,note:n.note,tools:[s.id]})}return e}function Qt(t,e){if(!e)return!0;const s=e.trim().toLowerCase();return!s||[t.name,t.path,t.kind,...(t.rows||[]).map(n=>n.label)].join(`
`).toLowerCase().includes(s)}function vs(t){const e=new Map;for(const n of t){const o=n.location_root||tt(n.path);e.has(o)||e.set(o,{root:o,location:n.location,files:[]}),e.get(o).files.push(n)}const s=n=>_t.findIndex(o=>o.id===n);return[...e.values()].sort((n,o)=>s(n.location)-s(o.location)||n.root.localeCompare(o.root))}const Y={high:0,medium:1,low:2,info:3};function Xt(t){return[t.rule||"",t.path||"",t.line||0,t.tool||"",t.session_id||""].join("|")}function _s(t){const e=new Map;return(t||[]).map(s=>{const n=Xt(s),o=e.get(n)||0;return e.set(n,o+1),{...s,id:o?n+"#"+o:n}})}function Ct(t){return Array.isArray(t==null?void 0:t.tools)&&t.tools.length?t.tools:t!=null&&t.tool?[t.tool]:[]}function St(t){const e=String(t||"other").replace(/[_-]+/g," ").trim();return e?e[0].toUpperCase()+e.slice(1):"Other"}function te(t,e){if(!e)return!0;const s=e.trim().toLowerCase();return!s||[t.rule,St(t.rule),t.path,t.why,t.action,b(t.path)].join(`
`).toLowerCase().includes(s)}function ee(t){const e=new Map;for(const s of t||[]){const n=s.rule||"other";e.has(n)||e.set(n,{rule:n,label:St(n),items:[]}),e.get(n).items.push(s.id?s:{...s,id:Xt(s)})}return[...e.values()].map(s=>{const n=[...new Set(s.items.map(l=>l.why||""))],o=[...new Set(s.items.flatMap(Ct))],i=s.items.reduce((l,c)=>(Y[c.severity]??9)<(Y[l]??9)?c.severity:l,"info");return{...s,count:s.items.length,why:n.length===1?n[0]:"",tools:o,severity:i,alarm:i==="high"||i==="medium"}}).sort((s,n)=>(Y[s.severity]??9)-(Y[n.severity]??9)||n.count-s.count)}const ks=["tool","topic","files","findings"];function Dt(t){const e=new URLSearchParams(t||""),s=e.get("pivot");return{view:ks.includes(s)?s:"tool",tool:e.get("tool")||"",sec:e.get("sec")||"",row:e.get("row")||"",scope:e.get("scope")||"",unset:e.get("unset")==="1"}}function Cs(t){return{pivot:t.view&&t.view!=="tool"?t.view:null,tool:t.tool||null,sec:t.sec||null,row:t.row||null,scope:t.scope||null,unset:t.unset?"1":null}}const Ss={pivot:null,tool:null,sec:null,row:null,scope:null,unset:null};function Q(t){return t==null?st:typeof t=="object"?JSON.stringify(t):String(t)}function As({value:t,compact:e}){const[s,n]=y(!1),o=Array.isArray(t),i=o?t.map((r,u)=>[u,r]):Object.entries(t||{}),l=i.length;if(!l)return a`<span class="st-none">none</span>`;const c=a`<span class="st-chip st-chip--mono st-items">${l} ${l===1?"item":"items"}</span>`;return e?c:a`<span class="st-itemsbox">
    ${c}
    <button type="button" class="st-link" aria-expanded=${s?"true":"false"}
      onClick=${r=>{r.stopPropagation(),n(!s)}}>${s?"hide":"show"}</button>
    ${s&&a`<ul class="st-itemlist">
      ${i.map(([r,u])=>a`<li key=${r} class="st-mono" title=${o?Q(u):`${r}: ${Q(u)}`}>
        ${o?Q(u):a`<span class="st-itemkey">${r}:</span> ${Q(u)}`}</li>`)}
    </ul>`}
  </span>`}function ot({row:t,value:e,compact:s=!1}){const n=e!==void 0?e:t.value,o=t.kind||at(n),i=!!t.risky;if(o==="flag"||typeof n=="boolean"){if(n==null)return a`<span class="st-none">${st}</span>`;const r=Ut(n);return a`<span class=${"st-flag"+(r?" is-on":"")+(i?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${r?"on":"off"}</span>
    </span>`}if(n==null||n==="")return a`<span class="st-none">${st}</span>`;if(o==="list"||o==="map"||typeof n=="object")return a`<${As} value=${n} compact=${s}/>`;const l=String(n),c=ls({...t,value:n});return c?a`<span class=${"st-select"+(i?" is-risky":"")} title=${"Options: "+c.join(", ")}>${l}</span>`:o==="path"?a`<span class="st-v st-path" title=${l}>${l}</span>`:a`<span class=${"st-v"+(i?" is-risky":"")} title=${l}>${l}</span>`}function R({scope:t,locked:e=!1,label:s=""}){const n=t||"default",o=a`<span class=${"st-chip st-scope st-scope--"+n.replace(/[^a-z-]/gi,"")+(e?" st-scope--locked":"")}
    title=${e?`Set by ${s||n}; cannot be changed here`:void 0}>${n}${e?a`<span class="st-sr"> (locked)</span>`:""}</span>`;return e?a`<span class="st-scopewrap"><${V}/>${o}</span>`:o}function V({label:t=""}){return t?a`<span class="st-lock" role="img" aria-label=${t} title=${t}><${gt} name="lock" size="11"/></span>`:a`<span class="st-lock" aria-hidden="true"><${gt} name="lock" size="11"/></span>`}function L({id:t,big:e=!1}){return a`<span class=${"st-sw"+(e?" st-sw--big":"")} aria-hidden="true"
    style=${{background:Me[t]||"var(--fg2)"}}></span>`}function z({label:t}){return a`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function S({children:t}){return a`<div class="st-nav__h">${t}</div>`}function P({id:t,label:e}){return a`<span class="st-chip st-toolchip"><${L} id=${t}/>${e}</span>`}function K({path:t,line:e,w:s}){if(!t)return a`<span class="st-none">—</span>`;const n=t+(e>0?":"+e:"");return a`<button type="button" class="st-src" title=${n}
    onClick=${o=>{o.stopPropagation(),s.openAt(t,e)}}>
    <b>${b(t)}</b>${e>0?":"+e:""}</button>`}const xs="aictl has no description for this key; the value is shown as found in the file";function se(){return a`<span class="st-chip st-chip--muted st-undoc" title=${xs}>undocumented</span>`}const Os=4;function Ts(t,e){return`Set by ${x(t.scope,e.scopesOf(t.tool))}; cannot be changed here`}function ne({row:t,w:e}){const s=t.agent,n=N(t);return a`<span class="st-agentmodel">
    ${t.locked&&a`<${V} label=${Ts(t,e)}/>`}
    ${n?a`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:a`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${s.model_policy==="required"&&a`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${Yt(t)&&a`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+s.pinned_in}>pinned</span>`}
  </span>`}function oe({tools:t,all:e=!1}){if(!t||!t.length)return a`<span class="st-none" title="The agent file lists no tools">—</span>`;const s=e?t:t.slice(0,Os),n=t.length-s.length;return a`<span class="st-tools">
    ${s.map(o=>a`<span key=${o} class="st-chip st-chip--mono" title=${o}>${o}</span>`)}
    ${n>0&&a`<span class="st-chip st-more-tools" title=${t.slice(s.length).join(", ")}>+${n}</span>`}
  </span>`}function ie({row:t,w:e,withTool:s,withContext:n}){var r;const o=t.agent,i=((r=e.selected)==null?void 0:r.uid)===t.uid,l=()=>e.select({tool:t.tool,row:t.key}),c=u=>Number(u)>0?Number(u):0;return a`<tr class=${"st-row st-agentrow"+(i?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${l}
    onKeyDown=${u=>{(u.key==="Enter"||u.key===" ")&&(u.preventDefault(),l())}}>
    ${s&&a`<td class="st-c-tool"><span class="st-matrix__toolname"><${L} id=${t.tool}/>${e.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${o.name||t.label}</div>
      ${o.description&&a`<div class="st-agentdesc" title=${o.description}>${o.description}</div>`}
    </td>
    <td class="st-c-model"><${ne} row=${t} w=${e}/></td>
    <td class="st-mono">${o.effort||a`<span class="st-none">—</span>`}</td>
    ${n&&a`<td class="st-mono">${o.context_tier||a`<span class="st-none">—</span>`}</td>`}
    <td><${oe} tools=${o.tools}/></td>
    <td class="st-c-src"><${K} path=${o.defined_in} line=${c(o.defined_line)} w=${e}/></td>
    <td class="st-c-src"><${K} path=${o.pinned_in} line=${c(o.pinned_line)} w=${e}/></td>
  </tr>`}function ws({w:t,section:e}){const s=e.shown,n=s.filter(N).length;return a`<table class="st-table st-agents" data-section="agents">
    <thead><tr>
      <th scope="col" class="st-c-agent">Agent</th><th scope="col">Model</th><th scope="col">Effort</th>
      <th scope="col">Context</th><th scope="col">Tools</th><th scope="col" class="st-c-src">Defined in</th>
      <th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${e.title}
        <span class="st-group__meta">${s.length}${n?` · ${n} inherit the session model`:""}</span></th></tr>
      ${s.map(o=>a`<${ie} key=${o.uid} row=${o} w=${t} withContext/>`)}
    </tbody>
  </table>`}const yt={tool:t=>(e,s)=>t.labelOf(e.tool).localeCompare(t.labelOf(s.tool))||X(e).localeCompare(X(s)),agent:t=>(e,s)=>X(e).localeCompare(X(s))||t.labelOf(e.tool).localeCompare(t.labelOf(s.tool)),model:t=>(e,s)=>qt(e).localeCompare(qt(s))||yt.tool(t)(e,s)};function X(t){var e;return String(((e=t.agent)==null?void 0:e.name)||t.label||"")}function qt(t){return N(t)?"￿":String(t.value)}function Ls(t,e,s){return[...t].sort((yt[e]||yt.tool)(s))}function mt({id:t,label:e,sort:s,onSort:n}){const o=s===t;return a`<th scope="col" aria-sort=${o?"ascending":"none"}>
    <button type="button" class=${"st-sort"+(o?" is-on":"")} onClick=${()=>n(t)}>
      ${e}<span aria-hidden="true">${o?" ▴":""}</span></button></th>`}function Ns({w:t,rows:e,sort:s,onSort:n}){const o=Ls(e,s,t);return a`<div class="st-scroll"><table class="st-table st-agents st-agents--all">
    <thead><tr>
      <${mt} id="tool" label="Tool" sort=${s} onSort=${n}/>
      <${mt} id="agent" label="Agent" sort=${s} onSort=${n}/>
      <${mt} id="model" label="Model" sort=${s} onSort=${n}/>
      <th scope="col">Effort</th><th scope="col">Tools</th>
      <th scope="col" class="st-c-src">Defined in</th><th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>${o.map(i=>a`<${ie} key=${i.uid} row=${i} w=${t} withTool/>`)}</tbody>
  </table></div>`}function js(t,e){const s=b(t);if(e.filter(i=>b(i)===s).length<2)return s;const n=String(t).split(/[\\/]/).filter(Boolean);return n.length<2?s:(/^(Users|home)$/.test(n[0])&&n.length===4?"~/":"")+n[n.length-2]+"/"+s}function Es({w:t}){const{entries:e,aictl:s,st:n}=t;return a`<nav class="st-nav" aria-label="Tools">
    <${S}>Tools</${S}>
    <ul class="st-nav__list">
      ${e.map(o=>{const i=o.id===t.toolId,l=o.rows.filter(i?t.passTool:t.pass),c=l.some(r=>r.risky);return a`<li key=${o.id}>
          <button type="button" class=${"st-nav__item"+(i?" is-on":"")+(l.length?"":" is-empty")}
            aria-current=${i?"true":void 0} data-tool=${o.id}
            onClick=${()=>t.set({tool:o.id,sec:"",row:"",scope:i?t.st.scope:""})}>
            <${L} id=${o.id}/><span class="st-nav__label">${o.label}</span>
            ${c&&a`<${z} label="A risky setting is on"/>`}
            <span class="st-nav__n">${l.length}</span>
          </button>
          ${i&&a`<ul class="st-nav__subs">
            ${o.sections.map(r=>{const u=r.rows.filter(t.passTool),d=n.sec===r.id,p=r.id==="agents"?rs(u):"";return a`<li key=${r.id}><button type="button" class=${"st-nav__sub"+(d?" is-on":"")}
                aria-current=${d?"true":void 0}
                onClick=${()=>t.set({sec:d?"":r.id})}>
                <span class="st-nav__label">${r.title}</span>
                ${u.some($=>$.risky)&&a`<${z} label="A risky setting is on"/>`}
                <span class="st-nav__n">${u.length}</span>
                ${p&&a`<span class="st-nav__model" title=${"Every agent runs on "+p}>${p}</span>`}
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${s&&a`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${L} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${s.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function Fs({row:t,w:e,scopes:s}){var i;const n=((i=e.selected)==null?void 0:i.uid)===t.uid,o=()=>e.select({tool:t.tool,row:t.key});return a`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(n?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${o}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),o())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&a` <${se}/>`}</div>
      ${t.risky&&t.tip&&a`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${ot} row=${t}/></td>
    <td class="st-c-scope"><${R} scope=${t.scope} locked=${t.locked} label=${x(t.scope,s)}/></td>
    <td class="st-c-src"><${K} path=${t.source} line=${t.line} w=${e}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function Is({w:t,entry:e}){const s=e.scopes||[];if(!s.length)return null;const n=e.rows.filter(t.pass);return a`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${s.map((o,i)=>{const l=n.filter(d=>d.scope===o.id).length,c=t.st.scope===o.id,r=o.path?b(o.path):"",u=[o.label,o.paths.length?o.paths.join(`
`):"",o.exists?"":"not present",o.note,o.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return a`<li key=${o.id} class="st-scopes__item">
          ${i>0&&a`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(c?" is-on":"")+(o.changeable?"":" is-locked")+(o.exists?"":" is-absent")}
            data-scope=${o.id} aria-pressed=${c?"true":"false"} title=${u}
            onClick=${()=>t.set({scope:c?"":o.id})}>
            <span class="st-scopechip__top">
              ${!o.changeable&&a`<${V}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${o.label}</span>
              <span class="st-scopechip__n">${l}<span class="st-sr"> ${l===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class="st-scopechip__file">${o.exists?r||o.note:"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function Ms({w:t,sections:e,scopes:s}){return a`<table class="st-table">
    <thead><tr>
      <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
      <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
      <th scope="col">What it does</th>
    </tr></thead>
    ${e.map(n=>{const o=n.shown.filter(i=>i.risky).length;return a`<tbody key=${n.id} data-section=${n.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${n.title}
          <span class="st-group__meta">${n.shown.length}${o?a` · <span class="st-red">${o} risky</span>`:""}${n.hidden?a` · <span class="st-unsetn">+${n.hidden} unset</span>`:""}</span></th></tr>
        ${n.shown.map(i=>a`<${Fs} key=${i.uid} row=${i} w=${t} scopes=${s}/>`)}
      </tbody>`})}
  </table>`}function Rs(t){const e=[];for(const s of t){const n=s.id==="agents"&&s.shown.every(i=>i.kind==="agent"&&i.agent),o=e[e.length-1];n?e.push({agents:!0,sections:[s]}):o&&!o.agents?o.sections.push(s):e.push({agents:!1,sections:[s]})}return e}function Ps({w:t,entry:e}){const s=e.sections.filter(i=>!t.st.sec||i.id===t.st.sec).map(i=>({...i,shown:i.rows.filter(t.passTool),hidden:t.showUnset?0:i.rows.filter(l=>l.unset&&t.passAll(l)&&(!t.st.scope||l.scope===t.st.scope)).length})).filter(i=>i.shown.length||i.hidden),n=e.rows.length,o=t.st.scope?x(t.st.scope,e.scopes):"";return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${L} id=${e.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${e.label}</h2>
      <span class="st-bar__sub">${n} ${n===1?"setting":"settings"} in ${e.files.length} ${e.files.length===1?"file":"files"}${e.risky?a` · <span class="st-red">${e.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${e.files.map(i=>a`<button type="button" key=${i} class="st-chip st-chip--mono st-chip--btn" title=${i}
          onClick=${()=>t.openAt(i)}>${js(i,e.files)}</button>`)}
      </span>
    </div>
    ${e.id==="vscode"&&a`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${e.hints.map((i,l)=>a`<p key=${l} class="st-note">${i}</p>`)}
    <${Is} w=${t} entry=${e}/>
    ${s.length?Rs(s).map((i,l)=>i.agents?a`<${ws} key=${"a"+l} w=${t} section=${i.sections[0]}/>`:a`<${Ms} key=${"g"+l} w=${t} sections=${i.sections} scopes=${e.scopes}/>`):a`<p class="st-empty">${n?o?`No setting shown here is set at the ${o} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}function Ds({w:t,aictl:e}){const s=t.q.trim().toLowerCase(),n=e.collectors.filter(i=>!s||[i.name,i.mode,i.status,i.detail].join(" ").toLowerCase().includes(s)),o=e.roots.filter(i=>!s||i.toLowerCase().includes(s));return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${L} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${e.collectors.length} collectors · ${e.roots.length} monitored roots</span>
    </div>
    ${n.length>0&&a`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${n.length}</span></th></tr>
        ${n.map(i=>a`<tr key=${i.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${i.name}</td>
          <td class="st-mono">${i.mode||"—"}</td>
          <td><span class=${"st-status "+(i.status==="active"?"is-ok":"is-warn")}>${i.status}</span></td>
          <td class="st-c-what" title=${i.detail||void 0}>${i.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${o.length>0&&a`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${o.map((i,l)=>a`<li key=${l} class="st-mono" title=${i}>${i}</li>`)}</ul>`}
    ${!n.length&&!o.length&&a`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function ae(t){if(t.st.sec&&E.includes(t.st.sec))return t.st.sec;const e=s=>t.entries.some(n=>n.rows.some(o=>o.sec===s));return e("autonomy")?"autonomy":E.find(e)||"autonomy"}function qs({w:t}){const e=ae(t);return a`<nav class="st-nav" aria-label="Topics">
    <${S}>Topics</${S}>
    <ul class="st-nav__list">
      ${E.map(s=>{const n=t.entries.filter(l=>l.rows.some(c=>c.sec===s&&t.pass(c))),o=n.some(l=>l.rows.some(c=>c.sec===s&&c.risky&&t.pass(c))),i=s===e;return a`<li key=${s}><button type="button" class=${"st-nav__item"+(i?" is-on":"")+(n.length?"":" is-empty")}
          aria-current=${i?"true":void 0} data-sec=${s}
          onClick=${()=>t.set({sec:s})}>
          <span class="st-nav__label">${B[s]}</span>
          ${o&&a`<${z} label="A risky setting is on"/>`}
          <span class="st-nav__n">${n.length} ${n.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function Ws({w:t}){const[e,s]=y("tool"),n=t.entries.flatMap(c=>c.rows.filter(r=>r.sec==="agents"&&rt(r))),o=n.filter(t.pass),i=new Set(o.map(c=>c.tool)).size,l=o.filter(N).length;return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${B.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${o.length} ${o.length===1?"agent":"agents"} in ${i} ${i===1?"tool":"tools"}, ${l} inherit the session model</span>
    </div>
    ${o.length?a`<${Ns} w=${t} rows=${o} sort=${e} onSort=${s}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:a`<p class="st-empty">${n.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function Gs({w:t}){const e=ae(t);if(e==="agents")return a`<${Ws} w=${t}/>`;const{tools:s,rows:n}=fs(t.entries,e,t.pass),o=n.reduce((i,l)=>i+Object.values(l.cells).filter(c=>c.risky).length,0);return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${B[e]}</h2>
      <span class="st-bar__sub">every tool, side by side${o?a` · <span class="st-red">${o} risky ${o===1?"value":"values"}</span>`:""}</span>
    </div>
    ${n.length?a`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${s.map(i=>a`<th scope="col" key=${i.id} class="st-matrix__tool" data-tool=${i.id}>
          <span class="st-matrix__toolname"><${L} id=${i.id}/>${i.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${n.map(i=>a`<tr key=${i.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${i.keys.join(`
`)}>${i.label}</th>
          ${s.map(l=>{var u;const c=i.cells[l.id];if(!c||c.unset&&!t.showUnset)return a`<td key=${l.id} class="st-cell st-cell--none">—</td>`;const r=((u=t.selected)==null?void 0:u.uid)===c.uid;return a`<td key=${l.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(r?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${i.label}, ${l.label}: ${Jt(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:l.id,row:c.key})}>
                <${ot} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:a`<p class="st-empty">${s.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const Us=8;function Hs(t){return t.files.filter(e=>Qt(e,t.q)&&(!t.st.sec||e.location===t.st.sec)&&(!t.st.tool||e.tools.includes(t.st.tool)))}function zs({w:t}){const e=t.files.filter(n=>Qt(n,t.q)&&(!t.st.tool||n.tools.includes(t.st.tool))),s=[...new Set(t.files.flatMap(n=>n.tools))];return a`<nav class="st-nav" aria-label="File locations">
    <${S}>Locations</${S}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-nav__label">All locations</span><span class="st-nav__n">${e.length}</span></button></li>
      ${_t.map(n=>{const o=e.filter(l=>l.location===n.id).length,i=t.st.sec===n.id;return a`<li key=${n.id}><button type="button" class=${"st-nav__item"+(i?" is-on":"")+(o?"":" is-empty")}
          aria-current=${i?"true":void 0} data-loc=${n.id}
          onClick=${()=>t.set({sec:i?"":n.id,row:""})}>
          <span class="st-nav__label">${n.label}</span><span class="st-nav__n">${o}</span></button></li>`})}
    </ul>
    ${s.length>0&&a`<${S}>Read by</${S}>
      <ul class="st-nav__list">
        ${s.map(n=>{const o=t.st.tool===n;return a`<li key=${n}><button type="button" class=${"st-nav__item"+(o?" is-on":"")}
            aria-pressed=${o?"true":"false"} data-tool=${n}
            onClick=${()=>t.set({tool:o?"":n,row:""})}>
            <${L} id=${n}/><span class="st-nav__label">${t.labelOf(n)}</span>
            <span class="st-nav__n">${t.files.filter(i=>i.tools.includes(n)).length}</span></button></li>`})}
      </ul>`}
  </nav>`}function Ks({f:t,w:e}){const s=e.selectedFile&&e.selectedFile.path===t.path,n=()=>e.select({row:t.path});return a`<tr class=${"st-row"+(s?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${n}
    onKeyDown=${o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),n())}}>
    <td class="st-c-file">
      ${t.is_dir?a`<span class="st-fname" title=${t.path}>${t.name}/</span>`:a`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${o=>{o.stopPropagation(),e.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&a`<span class="st-hint"> missing</span>`}
    </td>
    <td><${R} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(o=>a`<${P} key=${o} id=${o} label=${e.labelOf(o)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class=${/ignored|untracked|modified/i.test(t.git_state||"")?"st-warn":"st-dim"}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?et(t.mtime):"—"}</td>
  </tr>`}function Bs(t){if(t.st.sec)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(s=>(!e||[s.path,s.label,s.note].join(`
`).toLowerCase().includes(e))&&(!t.st.tool||s.tools.includes(t.st.tool)))}function Vs({w:t,items:e}){const[s,n]=y(!1);return a`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan="6">
      <button type="button" class="st-fold" aria-expanded=${s?"true":"false"} onClick=${()=>n(!s)}>
        <span aria-hidden="true">${s?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${e.length} ${e.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${s&&e.map(o=>a`<tr key=${o.path} class="st-row st-row--static st-row--absent" data-path=${o.path}>
      <td class="st-c-file"><span class="st-fname" title=${o.path+(o.note?`
`+o.note:"")}>${ct(o.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td><span class="st-scopewrap"><${V} label="Cannot be changed from this machine"/><${R} scope=${o.scope}/></span></td>
      <td><span class="st-tools">${o.tools.map(i=>a`<${P} key=${i} id=${i} label=${t.labelOf(i)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function Js({w:t}){const[e,s]=y({}),[n,o]=y({}),i=Hs(t),l=vs(i),c=Bs(t);return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${i.length} ${i.length===1?"file":"files"} · grouped by where they live</span>
    </div>
    ${t.filesStatus!=="ready"&&a`<p class="st-note" role="status">File details are loading</p>`}
    ${l.length||c.length?a`<table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col">Settings</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${l.map(r=>{const u=!!n[r.root],d=!!e[r.root],p=u?[]:d?r.files:r.files.slice(0,Us),$=u?0:r.files.length-p.length;return a`<tbody key=${r.root} data-root=${r.root}>
          <tr class="st-group"><th scope="colgroup" colspan="6">
            <button type="button" class="st-fold" aria-expanded=${u?"false":"true"}
              onClick=${()=>o({...n,[r.root]:!u})}>
              <span aria-hidden="true">${u?"▸":"▾"}</span>
              <span class="st-mono" title=${r.root}>${ct(r.root)}</span></button>
            <span class="st-group__meta">${kt[r.location]||"Other"} · ${r.files.length} ${r.files.length===1?"file":"files"}</span>
          </th></tr>
          ${p.map(F=>a`<${Ks} key=${F.path} f=${F} w=${t}/>`)}
          ${$>0&&a`<tr class="st-morerow"><td colspan="6">
            <button type="button" class="st-link st-more" onClick=${()=>s({...e,[r.root]:!0})}>▸ ${$} more</button>
          </td></tr>`}
        </tbody>`})}
      ${c.length>0&&a`<${Vs} w=${t} items=${c}/>`}
    </table>`:a`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const Zs=5;function le(t,e){return t?ct(t)+(e>0?":"+e:""):"—"}function Ys({w:t}){const e=ee(t.findings.filter(s=>te(s,t.q)));return a`<nav class="st-nav" aria-label="Finding rules">
    <${S}>Finding rules</${S}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${e.reduce((s,n)=>s+n.count,0)}</span></button></li>
      ${e.map(s=>{const n=t.st.sec===s.rule;return a`<li key=${s.rule}><button type="button" class=${"st-nav__item"+(n?" is-on":"")}
          aria-current=${n?"true":void 0} data-rule=${s.rule}
          onClick=${()=>t.set({sec:n?"":s.rule,row:""})}>
          ${s.alarm?a`<${z} label=${s.severity+" severity"}/>`:a`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${s.label}</span><span class="st-nav__n">${s.count}</span></button></li>`})}
    </ul>
  </nav>`}function Qs({f:t,group:e,w:s}){const n=s.selectedFinding&&s.selectedFinding.id===t.id,o=()=>s.select({row:t.id,sec:s.st.sec}),i=e.why&&t.why===e.why?t.action||"":t.why||t.action||"",l=Ct(t).map(s.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return a`<tr class=${"st-row"+(n?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${o}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),o())}}>
    <td class="st-c-tool">${l}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${le(t.path,t.line)}${t.count>1?a` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${i}</td>
    <td class="st-c-act">${t.path&&a`<button type="button" class="st-chip st-chip--btn"
      onClick=${c=>{c.stopPropagation(),s.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function Xs({w:t}){const[e,s]=y({});if(t.auditStatus==="loading"&&!t.audit){const l=t.scan;return a`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${l?" "+(l.step||"")+(l.elapsed_s!=null?", "+Math.round(l.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return a`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        <button type="button" class="st-btn" onClick=${t.rescan}>Retry</button></p>
    </section>`;const n=t.findings.filter(l=>te(l,t.q)),o=ee(n).filter(l=>!t.st.sec||l.rule===t.st.sec),i=o.reduce((l,c)=>l+c.count,0);return a`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${i} in ${o.length} ${o.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      <button type="button" class="st-chip st-chip--btn st-bar__end" onClick=${t.rescan}>Rescan</button>
    </div>
    ${o.length?a`<table class="st-table st-findings">
      <thead><tr>
        <th scope="col" class="st-c-tool">Tool</th><th scope="col" class="st-c-where">Where</th>
        <th scope="col">What it does</th><th scope="col" class="st-c-act"><span class="st-sr">Action</span></th>
      </tr></thead>
      ${o.map(l=>{const r=!!e[l.rule]?l.items:l.items.slice(0,Zs),u=l.items.length-r.length;return a`<tbody key=${l.rule} data-rule=${l.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${l.alarm&&a`<${z} label=${l.severity+" severity"}/>`} ${l.label}
            <span class="st-group__meta">${l.count} · ${l.tools.map(t.labelOf).join(", ")||"no tool"}${l.why?" · "+l.why:""}</span>
          </th></tr>
          ${r.map(d=>a`<${Qs} key=${d.id} f=${d} group=${l} w=${t}/>`)}
          ${u>0&&a`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>s({...e,[l.rule]:!0})}>▸ ${u} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:a`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}function f({title:t,children:e}){return a`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${e}</section>`}function At(t,e){return"Open "+b(t)+(e>0?" at line "+e:"")}function ce(t,e){return e?t.findings.filter(s=>_(s.path,e)):[]}function re(t,e){t.set({view:"findings",sec:e.rule||"",row:e.id,tool:""})}function ue({w:t,path:e}){const s=e&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(e):null,n=e?t.mtimeOf(e):null,o=[];return s?o.push(`File changed ${et(s.ts)}${s.tool?" by "+t.labelOf(s.tool):""} (file history)`):n&&o.push(`File last changed ${et(n)} (file history)`),a`<div class="st-hint" data-testid="st-history">${o.length?o.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}const tn="phase 2: diff preview, backup, change log";function de(t,e){var n;const s=(n=t.chain)==null?void 0:n[t.wins];return t.locked||Kt(s,e)?"Locked by "+x(t.locked?t.scope:s.scope,e):tn}function en(t,e){const s=ss(e);return`Not set in any file. Default: ${Jt(t.value)}.`+(s?` Set it in ${ct(s.path)} (${s.label}).`:"")}function sn({w:t,row:e}){if(rt(e))return a`<${nn} w=${t} row=${e}/>`;const s=t.scopesOf(e.tool),n=t.entries.filter(r=>r.id!==e.tool&&e.source&&r.files.some(u=>_(u,e.source))).map(r=>r.label),o=e.source?t.files.find(r=>_(r.path,e.source)):null;for(const r of(o==null?void 0:o.tools)||[]){const u=t.labelOf(r);r!==e.tool&&!n.includes(u)&&n.push(u)}const i=ce(t,e.source),{chain:l,wins:c}=e;return a`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${e.label}</h3>
    <div class="st-insp__key st-mono">${e.key}</div>
    ${e.tip&&a`<p class="st-insp__tip">${e.tip}</p>`}
    <div class="st-insp__chips">
      ${e.risky&&a`<span class="st-chip st-chip--risky">risky</span>`}
      <${P} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${R} scope=${e.scope} locked=${e.locked} label=${x(e.scope,s)}/>
      ${e.undocumented&&a`<${se}/>`}
      ${n.length>0&&a`<span class="st-chip">also read by ${n.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(e.unset?" is-unset":"")}><${ot} row=${e}/></div>
    ${e.unset&&a`<p class="st-insp__tip" data-testid="st-unset-text">${en(e,s)}</p>`}
    <${f} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${l.map((r,u)=>{const d=u===c,p=Kt(r,s);return a`<li key=${u} class=${"st-chain__lv"+(d?" is-win":"")+(p?" is-locked":"")} aria-current=${d?"true":void 0}>
            <span class="st-chain__sc">${p&&a`<${V} label=${"Locked: "+x(r.scope,s)+" cannot be changed here"}/>`}${r.scope||"default"}</span>
            <span class="st-chain__v">${H(r)?a`<span class="st-dim">not set</span>`:a`<${ot} row=${e} value=${r.value} compact/>`}</span>
            <span class="st-chain__src">${r.source?a`<${K} path=${r.source} line=${Number(r.line)>0?Number(r.line):0} w=${t}/>`:a`<span class="st-dim">${r.note||(r.scope==="default"?t.labelOf(e.tool):"—")}</span>`}</span>
            ${d&&a`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${is(l,c)}</p>
    </${f}>
    <${f} title="History"><${ue} w=${t} path=${e.source}/></${f}>
    <${f} title="Actions">
      <div class="st-actions">
        ${e.source&&a`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.source,e.line)}>${At(e.source,e.line)}</button>`}
        ${i.length>0&&a`<button type="button" class="st-btn" onClick=${()=>re(t,i[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${de(e,s)}</span>
      </div>
    </${f}>
  </div>`}function nn({w:t,row:e}){const s=e.agent,n=t.scopesOf(e.tool),{steps:o,wins:i,why:l}=us(e),c=d=>Number(d)>0?Number(d):0,r=[{label:"Defined in",path:s.defined_in,line:c(s.defined_line),scope:s.scope_defined},{label:"Pinned in",path:s.pinned_in,line:c(s.pinned_line),scope:s.scope_pinned}],u=de(e,n);return a`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${s.name||e.label}</h3>
    <div class="st-insp__key st-mono">${e.key}</div>
    ${s.description&&a`<p class="st-insp__tip">${s.description}</p>`}
    <div class="st-insp__chips">
      <${P} id=${e.tool} label=${t.labelOf(e.tool)}/>
      <${R} scope=${e.scope} locked=${e.locked} label=${x(e.scope,n)}/>
    </div>
    <div class="st-insp__value"><${ne} row=${e} w=${t}/></div>
    <${f} title="Model · what decides it">
      <ol class="st-chain">
        ${o.map((d,p)=>{const $=p===i;return a`<li key=${d.id} class=${"st-chain__lv"+($?" is-win":"")} aria-current=${$?"true":void 0}>
            <span class="st-chain__sc">${d.label}</span>
            <span class="st-chain__v">${d.value===void 0||d.value===null||d.value===""?a`<span class="st-dim">${d.id==="pin"&&d.present?"set":"not set"}</span>`:d.value==="inherits"?a`<span class="st-inherit">inherits</span>`:a`<span class="st-v">${String(d.value)}</span>`}</span>
            <span class="st-chain__src">${d.source?a`<${K} path=${d.source} line=${d.line} w=${t}/>`:a`<span class="st-dim">${d.id==="effective"?i===2?"session model":"":"—"}</span>`}</span>
            ${$&&a`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${l}</p>
    </${f}>
    <${f} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${s.effort||"—"}</dd>
        <dt>Context</dt><dd>${s.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${s.target||"—"}</dd>
        <dt>Model policy</dt><dd>${s.model_policy||"—"}</dd>
      </dl>
    </${f}>
    <${f} title=${"Tools"+(s.tools.length?" · "+s.tools.length:"")}><${oe} tools=${s.tools} all/></${f}>
    <${f} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${r.map(d=>a`<dt key=${d.label+"t"}>${d.label}</dt><dd key=${d.label+"d"}>
          ${d.path?a`<span class="st-mono" title=${d.path+(d.line?":"+d.line:"")}>${b(d.path)}${d.line?":"+d.line:""}</span>
            ${d.scope&&a` <span class="st-dim">· ${x(d.scope,n)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(d.path,d.line)}
              aria-label=${At(d.path,d.line)}>Open</button>`:a`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${f}>
    <${f} title="History"><${ue} w=${t} path=${s.defined_in||e.source}/></${f}>
    <${f} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${u}</span>
      </div>
    </${f}>
  </div>`}function on({w:t,file:e}){const s=ce(t,e.path),n=e.rows||[];return a`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${e.name}</h3>
    <div class="st-insp__key st-mono">${e.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${e.kind||"other"}</span>
      <${R} scope=${e.scope}/>
      <span class="st-chip">${kt[e.location]||"Other"}</span>
      ${e.tools.map(o=>a`<${P} key=${o} id=${o} label=${t.labelOf(o)}/>`)}
    </div>
    <${f} title=${"Settings from this file"+(n.length?" · "+n.length:"")}>
      ${n.length?a`<ul class="st-insp__list">
        ${n.map(o=>a`<li key=${o.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:o.tool,sec:"",row:o.key})}>${o.label}</button>
          <span class="st-dim"> · ${t.labelOf(o.tool)}${o.line>0?" · line "+o.line:""}</span></li>`)}
      </ul>`:a`<div class="st-hint">${e.settings?e.settings+" settings":"No settings are read from this file."}</div>`}
    </${f}>
    <${f} title="File">
      <dl class="st-insp__dl">
        <dt>Git</dt><dd>${e.git_state||"—"}</dd>
        <dt>Size</dt><dd>${e.bytes!=null?Re(e.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${e.mtime?et(e.mtime):"—"}</dd>
        ${e.loading&&a`<dt>Loading</dt><dd>${e.loading}</dd>`}
        ${e.exists===!1&&a`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${f}>
    <${f} title="Actions">
      <div class="st-actions">
        ${!e.is_dir&&a`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path)}>Open file</button>`}
        ${s.length>0&&a`<button type="button" class="st-btn" onClick=${()=>re(t,s[0])}>Show finding</button>`}
      </div>
    </${f}>
  </div>`}function an({w:t,f:e}){return a`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${St(e.rule)}</h3>
    <div class="st-insp__key st-mono">${le(e.path,e.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(e.severity==="high"||e.severity==="medium"?" st-chip--risky":"")}>${e.severity||"info"}</span>
      ${Ct(e).map(s=>a`<${P} key=${s} id=${s} label=${t.labelOf(s)}/>`)}
      ${e.session_id&&a`<span class="st-chip st-chip--mono">session ${e.session_id}</span>`}
    </div>
    ${e.why&&a`<${f} title="Why it matters"><p class="st-insp__tip">${e.why}</p></${f}>`}
    ${e.action&&a`<${f} title="What to do"><p class="st-insp__tip">${e.action}</p></${f}>`}
    <${f} title="Actions">
      <div class="st-actions">
        ${e.path&&a`<button type="button" class="st-btn" onClick=${()=>t.openAt(e.path,e.line)}>${e.line>0?At(e.path,e.line):"Show the line"}</button>`}
      </div>
    </${f}>
  </div>`}function ln({w:t}){const{view:e}=t.st;let s=null;return(e==="tool"||e==="topic")&&t.selected?s=a`<${sn} w=${t} row=${t.selected}/>`:e==="files"&&t.selectedFile?s=a`<${on} w=${t} file=${t.selectedFile}/>`:e==="findings"&&t.selectedFinding&&(s=a`<${an} w=${t} f=${t.selectedFinding}/>`),a`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${s||a`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${e==="files"?"Click a file for its details.":e==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const cn=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Wt=new Set(["tool","topic"]);function Gt(){return typeof window<"u"?window.location.search:""}function rn(){const[t,e]=y(()=>Dt(Gt())),s=T(n=>e(o=>{const i={...o,...n};if(n.view&&n.view!==o.view&&!(Wt.has(o.view)&&Wt.has(n.view)))for(const l of["tool","sec","row"])l in n||(i[l]="");return n.view&&n.view!==o.view&&!("scope"in n)&&(i.scope=""),i}),[]);return U(()=>{jt(Cs(t))},[t]),U(()=>{const n=()=>e(Dt(Gt()));return window.addEventListener("popstate",n),()=>{window.removeEventListener("popstate",n),jt(Ss)}},[]),[t,s]}function un(){const[t,e]=y({status:"loading",files:null});return U(()=>{let s=!0;return De().then(n=>{s&&e(Array.isArray(n==null?void 0:n.files)?{status:"ready",files:n.files}:{status:"unavailable",files:null})},()=>{s&&e({status:"unavailable",files:null})}),()=>{s=!1}},[]),t}function dn(){const[t,e]=y(0),[s,n]=y({status:"loading",audit:null,scan:null,error:null});U(()=>{let i=!0;return n(l=>({...l,status:"loading",error:null})),qe(t>0,l=>{i&&n(c=>({...c,scan:l}))}).then(l=>{i&&n({status:"ready",audit:l,scan:null,error:null})},l=>{i&&n(c=>({...c,status:"error",scan:null,error:String((l==null?void 0:l.message)||l)}))}),()=>{i=!1}},[t]);const o=T(()=>e(i=>i+1),[]);return{...s,rescan:o}}function pn(){var Nt;const t=Te(Le)||{},{snap:e,openViewer:s,enabledTools:n=null,recentFiles:o}=t,[i,l]=rn(),[c,r]=y(""),[u,d]=y(!1),[p,$]=y(!1),[F,ut]=y(!1),xt=we(null),dt=un(),w=dn();U(()=>{const h=m=>{var k;m.key==="/"&&!Ne(m.target)&&!m.metaKey&&!m.ctrlKey&&!m.altKey?(m.preventDefault(),(k=xt.current)==null||k.focus()):m.key==="Escape"&&ut(!1)};return window.addEventListener("keydown",h),()=>window.removeEventListener("keydown",h)},[]);const g=O(()=>ds(e),[e]),I=O(()=>ps(e),[e]),Ot=O(()=>zt(e),[e]),pt=O(()=>Pt({q:c,nonDefault:u,risky:p,unset:i.unset}),[c,u,p,i.unset]),pe=O(()=>Pt({q:c,nonDefault:u,risky:p,unset:!0}),[c,u,p]),he=T(h=>pt(h)&&(!i.scope||h.scope===i.scope),[pt,i.scope]),fe=O(()=>ys(g),[g]),D=O(()=>bs(dt.files,g,Ot,n),[dt.files,g,Ot,n]),q=O(()=>Pe(w.audit,n),[w.audit,n]),ht=O(()=>_s((q==null?void 0:q.findings)||[]),[q]),$e=T((h,m=0)=>{!h||!s||s(h,m>0?{line:m}:{})},[s]),me=T(h=>{l(h),ut(!0)},[l]),ge=T(()=>ut(!1),[]),be=T(h=>Zt(h,e),[e]),ye=T(h=>{var m;return((m=g.find(k=>k.id===h))==null?void 0:m.scopes)||[]},[g]),ve=T(h=>{const m=D.find(k=>_(k.path,h));if(m!=null&&m.mtime)return m.mtime;for(const k of(e==null?void 0:e.tools)||[])for(const j of k.files||[])if(_(j.path,h)&&j.mtime)return j.mtime;return null},[D,e]);if(!e)return a`<p class="loading-state">Loading...</p>`;if(!g.length&&!I&&!Ft(n))return a`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const ft=g.some(h=>h.id===i.tool)||i.tool==="aictl"&&I?i.tool:((Nt=g[0])==null?void 0:Nt.id)||(I?"aictl":""),J=g.find(h=>h.id===ft)||null,Tt=(h,m)=>{var k;return m&&((k=g.find(j=>j.id===h))==null?void 0:k.rows.find(j=>j.key===m))||null},_e=i.view==="tool"?J?Tt(J.id,i.row):null:i.view==="topic"?Tt(i.tool,i.row):null,ke=i.view==="files"&&i.row&&D.find(h=>h.path===i.row)||null,Ce=i.view==="findings"&&i.row&&ht.find(h=>h.id===i.row)||null,C={st:i,set:l,select:me,q:c,pass:pt,passAll:pe,passTool:he,showUnset:i.unset,scopesOf:ye,managedAbsent:fe,entries:g,aictl:I,toolId:ft,files:D,filesStatus:dt.status,findings:ht,audit:q,auditStatus:w.status,auditError:w.error,scan:w.scan,rescan:w.rescan,selected:_e,selectedFile:ke,selectedFinding:Ce,openAt:$e,labelOf:be,mtimeOf:ve,recentFiles:o,drawer:F,closeDrawer:ge},Z=g.flatMap(h=>h.rows),Se=Z.filter(h=>!h.unset).length,Ae=Z.filter(rt).length,wt=Z.some(h=>typeof h.set=="boolean"),xe=Z.filter(h=>h.unset).length,Lt=g.reduce((h,m)=>h+m.risky,0),Oe=Ft(n)&&!g.some(h=>h.id!=="vscode");let W,G;return i.view==="topic"?(W=a`<${qs} w=${C}/>`,G=a`<${Gs} w=${C}/>`):i.view==="files"?(W=a`<${zs} w=${C}/>`,G=a`<${Js} w=${C}/>`):i.view==="findings"?(W=a`<${Ys} w=${C}/>`,G=a`<${Xs} w=${C}/>`):(W=a`<${Es} w=${C}/>`,G=J?a`<${Ps} w=${C} entry=${J}/>`:ft==="aictl"&&I?a`<${Ds} w=${C} aictl=${I}/>`:a`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),a`<div class="st-ws" data-view=${i.view}>
    <div class="st-head">
      <${je} class="st-pivot" options=${cn} value=${i.view} ariaLabel="Settings view"
        onChange=${h=>l({view:h})}/>
      <label class="st-searchbox">
        <${gt} name="search" size="14"/>
        <input ref=${xt} type="search" class="st-search" value=${c}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${h=>r(h.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(u?" is-on":"")} aria-pressed=${u?"true":"false"}
        onClick=${()=>d(!u)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(p?" is-on":"")} aria-pressed=${p?"true":"false"}
        onClick=${()=>$(!p)}>Only risky</button>
      ${wt&&a`<button type="button" class=${"st-toggle"+(i.unset?" is-on":"")} aria-pressed=${i.unset?"true":"false"}
        onClick=${()=>l({unset:!i.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${g.length}</b> tools</span>
        <span><b>${D.length}</b> files</span>
        <span><b>${Se}</b> settings</span>
        <span data-kpi="agents"><b>${Ae}</b> agents</span>
        ${wt&&a`<span data-kpi="unset"><b>${xe}</b> unset</span>`}
        <span class=${Lt?"st-red":""}><b>${Lt}</b> risky</span>
        <span><b>${w.status==="loading"&&!w.audit?"…":ht.length}</b> findings</span>
      </div>
    </div>
    ${Oe&&a`<div class="st-scope-empty"><${Ee} enabledTools=${n} snap=${e} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${W}</div>
      <div class="st-col st-col--main">${G}</div>
      <${ln} w=${C}/>
    </div>
  </div>`}function gn(){return a`<${pn}/>`}export{gn as default};
