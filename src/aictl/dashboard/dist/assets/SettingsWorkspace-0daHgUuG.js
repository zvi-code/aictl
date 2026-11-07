import{m as o,d as _,k as Ut,q as P,y as tt,T as L,A as Ws,w as Gt}from"./index-0APVtqay.js";import{C as Bs,W as q,F as st,w as xt,b4 as Us,b5 as Gs,s as qs,M as qt,b6 as Hs}from"./useSse-Dcx1BuKe.js";import{i as Ks,S as Vs,T as zs}from"./ToolScopeEmpty-CzCb5Yvm.js";import{I as St}from"./Icon-1my9WQDm.js";import{inferKind as Js,DASH as Ct,isOn as Ys,optionsFor as Qs,agentInherits as ft,pinWins as Xs,scopeLabel as S,isLockedEntry as Lt,commonModel as Zs,SECTION_ORDER as Ot,SECTION_TITLES as Et,topicMatrix as te,plainValue as ss,isAgentRow as es,PURPOSES as se,GIT_STATES as ns,LOCATIONS as ee,purposeOf as M,SCOPE_LABELS as as,gitCategory as Nt,matchFile as ne,listOf as I,purposeGroups as ae,fileGroups as oe,LOCATION_LABELS as os,tildePath as H,fileMatrix as le,LOCATION_SHORT as Ht,PURPOSE_LABELS as et,fileFolders as ie,listParam as ce,gitRisk as re,findingGroups as ls,matchFinding as is,findingTools as cs,agentDecision as de,samePath as nt,isUnset as pe,whyWins as ue,ruleLabel as $e,writableScope as he,rowFilter as Kt,mergeFiles as fe,settingsSummary as be,snapOf as me,toolEntries as ye,aictlEntry as ge,projectRoots as ke,absentManaged as _e,withFindingIds as ve,labelOf as we,FILE_PARAMS as Se,settingsParams as Ce,readSettingsUrl as Vt,CLEAR_PARAMS as Oe}from"./model-CTjycHkR.js";function dt(t){return t==null?Ct:typeof t=="object"?JSON.stringify(t):String(t)}function Ae({value:t,compact:s}){const[e,a]=_(!1),n=Array.isArray(t),l=n?t.map((c,u)=>[u,c]):Object.entries(t||{}),i=l.length;if(!i)return o`<span class="st-none">none</span>`;const r=o`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return s?r:o`<span class="st-itemsbox">
    ${r}
    <button type="button" class="st-link" aria-expanded=${e?"true":"false"}
      onClick=${c=>{c.stopPropagation(),a(!e)}}>${e?"hide":"show"}</button>
    ${e&&o`<ul class="st-itemlist">
      ${l.map(([c,u])=>o`<li key=${c} class="st-mono" title=${n?dt(u):`${c}: ${dt(u)}`}>
        ${n?dt(u):o`<span class="st-itemkey">${c}:</span> ${dt(u)}`}</li>`)}
    </ul>`}
  </span>`}function $t({row:t,value:s,compact:e=!1}){const a=s!==void 0?s:t.value,n=t.kind||Js(a),l=!!t.risky;if(n==="flag"||typeof a=="boolean"){if(a==null)return o`<span class="st-none">${Ct}</span>`;const c=Ys(a);return o`<span class=${"st-flag"+(c?" is-on":"")+(l?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${c?"on":"off"}</span>
    </span>`}if(a==null||a==="")return o`<span class="st-none">${Ct}</span>`;if(n==="list"||n==="map"||typeof a=="object")return o`<${Ae} value=${a} compact=${e}/>`;const i=String(a),r=Qs({...t,value:a});return r?o`<span class=${"st-select"+(l?" is-risky":"")} title=${"Options: "+r.join(", ")}>${i}</span>`:n==="path"?o`<span class="st-v st-path" title=${i}>${i}</span>`:o`<span class=${"st-v"+(l?" is-risky":"")} title=${i}>${i}</span>`}function K({scope:t,locked:s=!1,label:e=""}){const a=t||"default",n=o`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${e||a}; cannot be changed here`:void 0}>${a}${s?o`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?o`<span class="st-scopewrap"><${lt}/>${n}</span>`:n}function lt({label:t=""}){return t?o`<span class="st-lock" role="img" aria-label=${t} title=${t}><${St} name="lock" size="11"/></span>`:o`<span class="st-lock" aria-hidden="true"><${St} name="lock" size="11"/></span>`}function F({id:t,big:s=!1}){return o`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:Bs[t]||"var(--st-fg2)"}}></span>`}function at({label:t}){return o`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function E({children:t}){return o`<div class="st-nav__h">${t}</div>`}function D({id:t,label:s}){return o`<span class="st-chip st-toolchip"><${F} id=${t}/>${s}</span>`}function ot({path:t,line:s,w:e}){if(!t)return o`<span class="st-none">—</span>`;const a=t+(s>0?":"+s:"");return o`<button type="button" class="st-src" title=${a}
    onClick=${n=>{n.stopPropagation(),e.openAt(t,s)}}>
    <b>${q(t)}</b>${s>0?":"+s:""}</button>`}const Te="aictl has no description for this key; the value is shown as found in the file";function rs(){return o`<span class="st-chip st-chip--muted st-undoc" title=${Te}>undocumented</span>`}const xe=4;function Le(t,s){return`Set by ${S(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function ds({row:t,w:s}){const e=t.agent,a=ft(t);return o`<span class="st-agentmodel">
    ${t.locked&&o`<${lt} label=${Le(t,s)}/>`}
    ${a?o`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:o`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${e.model_policy==="required"&&o`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${Xs(t)&&o`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+e.pinned_in}>pinned</span>`}
  </span>`}function ps({tools:t,all:s=!1}){if(!t||!t.length)return o`<span class="st-none" title="The agent file lists no tools">—</span>`;const e=s?t:t.slice(0,xe),a=t.length-e.length;return o`<span class="st-tools">
    ${e.map(n=>o`<span key=${n} class="st-chip st-chip--mono" title=${n}>${n}</span>`)}
    ${a>0&&o`<span class="st-chip st-more-tools" title=${t.slice(e.length).join(", ")}>+${a}</span>`}
  </span>`}function us({row:t,w:s,withTool:e,withContext:a}){var c;const n=t.agent,l=((c=s.selected)==null?void 0:c.uid)===t.uid,i=()=>s.select({tool:t.tool,row:t.key}),r=u=>Number(u)>0?Number(u):0;return o`<tr class=${"st-row st-agentrow"+(l?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${u=>{(u.key==="Enter"||u.key===" ")&&(u.preventDefault(),i())}}>
    ${e&&o`<td class="st-c-tool"><span class="st-matrix__toolname"><${F} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${n.name||t.label}</div>
      ${n.description&&o`<div class="st-agentdesc" title=${n.description}>${n.description}</div>`}
    </td>
    <td class="st-c-model"><${ds} row=${t} w=${s}/></td>
    <td class="st-mono">${n.effort||o`<span class="st-none">—</span>`}</td>
    ${a&&o`<td class="st-mono">${n.context_tier||o`<span class="st-none">—</span>`}</td>`}
    <td><${ps} tools=${n.tools}/></td>
    <td class="st-c-src"><${ot} path=${n.defined_in} line=${r(n.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${ot} path=${n.pinned_in} line=${r(n.pinned_line)} w=${s}/></td>
  </tr>`}function Ee({w:t,section:s}){const e=s.shown,a=e.filter(ft).length;return o`<table class="st-table st-agents" data-section="agents">
    <thead><tr>
      <th scope="col" class="st-c-agent">Agent</th><th scope="col">Model</th><th scope="col">Effort</th>
      <th scope="col">Context</th><th scope="col">Tools</th><th scope="col" class="st-c-src">Defined in</th>
      <th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${e.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${e.map(n=>o`<${us} key=${n.uid} row=${n} w=${t} withContext/>`)}
    </tbody>
  </table>`}const At={tool:t=>(s,e)=>t.labelOf(s.tool).localeCompare(t.labelOf(e.tool))||pt(s).localeCompare(pt(e)),agent:t=>(s,e)=>pt(s).localeCompare(pt(e))||t.labelOf(s.tool).localeCompare(t.labelOf(e.tool)),model:t=>(s,e)=>zt(s).localeCompare(zt(e))||At.tool(t)(s,e)};function pt(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function zt(t){return ft(t)?"￿":String(t.value)}function Ne(t,s,e){return[...t].sort((At[s]||At.tool)(e))}function vt({id:t,label:s,sort:e,onSort:a}){const n=e===t;return o`<th scope="col" aria-sort=${n?"ascending":"none"}>
    <button type="button" class=${"st-sort"+(n?" is-on":"")} onClick=${()=>a(t)}>
      ${s}<span aria-hidden="true">${n?" ▴":""}</span></button></th>`}function Pe({w:t,rows:s,sort:e,onSort:a}){const n=Ne(s,e,t);return o`<div class="st-scroll"><table class="st-table st-agents st-agents--all">
    <thead><tr>
      <${vt} id="tool" label="Tool" sort=${e} onSort=${a}/>
      <${vt} id="agent" label="Agent" sort=${e} onSort=${a}/>
      <${vt} id="model" label="Model" sort=${e} onSort=${a}/>
      <th scope="col">Effort</th><th scope="col">Tools</th>
      <th scope="col" class="st-c-src">Defined in</th><th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>${n.map(l=>o`<${us} key=${l.uid} row=${l} w=${t} withTool/>`)}</tbody>
  </table></div>`}const Pt=[{id:"mcp",label:"MCP"},{id:"read",label:"Read files"},{id:"write",label:"Write files"},{id:"shell",label:"Shell"},{id:"web",label:"Web"}],Fe={allowed:"allow",asks:"ask",denied:"deny"},Jt={denied:3,asks:2,allowed:1},G=(t,s,e="")=>Object.fromEntries(Pt.map(a=>[a.id,{state:t,why:s,key:e}]));function Me(t){const s=String(t||"").split(".");return s[s.length-1]}function Re(t){const s=new Map;for(const e of(t==null?void 0:t.rows)||[])s.has(e.key)||s.set(e.key,e);return s}const k=t=>t&&t.value!==null&&t.value!==void 0&&t.value!==""?t.value:void 0,ht=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s):[];function Ft(t){const s=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(t));return s?{name:s[1].toLowerCase(),spec:s[2]===void 0?null:s[2].trim()}:{name:String(t).toLowerCase(),spec:null}}const $s=new Set(["","*",":*","**"]),je={read:["read","glob","grep","ls","notebookread"],write:["write","edit","multiedit","notebookedit"],shell:["bash","powershell"],web:["webfetch","websearch"]};function Ie(t){if(t==="mcp"||t.startsWith("mcp__"))return"mcp";for(const[s,e]of Object.entries(je))if(e.includes(t))return s;return""}function De(t,s){return t.startsWith("mcp__")?t==="mcp__*":s===null||$s.has(s)}function We(t,s){const e=[],a=(i,r,c,u)=>{const p={allow:"allowed",deny:"denied",ask:"asks"}[i],d=i+""+r,$=c?S(c,s):"",b=e.find(O=>O.id===d);if(b){$&&!b.where.includes($)&&b.where.push($);return}const{name:h,spec:C}=Ft(r);e.push({id:d,rule:r,effect:p,cap:Ie(h),whole:De(h,C),where:$?[$]:[],key:u})},n=(i,r,c)=>{if(!(!i||typeof i!="object"||Array.isArray(i)))for(const u of["allow","deny","ask"])for(const p of ht(i[u]))a(u,p,r,c)},l=t.get("permissions");if(l){const i=(l.chain||[]).filter(r=>r&&r.value&&typeof r.value=="object"&&r.set!==!1);if(i.length)for(const r of i)n(r.value,r.scope,"permissions");else n(k(l),l.scope,"permissions")}for(const i of["allow","deny","ask"]){const r=t.get("permissions."+i);for(const c of ht(k(r)))a(i,c,r.scope,r.key)}return e}const Be={shell:"shell",write:"write",read:"read",url:"web",fetch:"web",web_fetch:"web"};function Ue(t){const s=[];for(const e of["allow","deny","ask"]){const a=t.get("permissions."+e);for(const n of ht(k(a))){const{name:l,spec:i}=Ft(n);s.push({rule:n,effect:{allow:"allowed",deny:"denied",ask:"asks"}[e],cap:Be[l]||"mcp",whole:i===null||$s.has(i),where:a.scope?[S(a.scope)]:[],key:a.key})}}return s}function Ge(t){const s=[];for(const e of t.values()){const a=k(e);if(!a||typeof a!="object"||Array.isArray(a))continue;const n=e.key;let l="";if(/(^|\.)urls\.autoApprove$/.test(n)?l="web":/(^|\.)edits\.autoApprove$/.test(n)?l="write":(n==="autoApprove"||/(^|\.)terminal\.autoApprove$/.test(n))&&(l="shell"),!!l)for(const[i,r]of Object.entries(a)){let c;if(l==="web"?c=r===!0||(r==null?void 0:r.approveRequest)===!0?"allowed":"asks":l==="write"?c=r===!1?"asks":"allowed":r===!0||(r==null?void 0:r.approve)===!0?c="allowed":(r===!1||(r==null?void 0:r.approve)===!1)&&(c="denied"),!c)continue;const u=l==="write"?i==="**/*"||i==="**":!1;s.push({rule:i,effect:c,cap:l,whole:u,where:e.scope?[S(e.scope)]:[],key:n})}}return s}const qe={read:["read_file","read_many_files","glob","grep","search_file_content","list_directory","readfiletool","readmanyfilestool","globtool","greptool","lstool"],write:["write_file","replace","edit","writefiletool","edittool"],shell:["run_shell_command","shelltool"],web:["web_fetch","google_web_search","webfetchtool","websearchtool"]};function He(t){var e;const s=[];for(const[a,n]of[["tools.allowed","allowed"],["tools.exclude","denied"]]){const l=t.get(a);for(const i of ht(k(l))){const{name:r,spec:c}=Ft(i);let u=((e=Object.entries(qe).find(([,p])=>p.includes(r)))==null?void 0:e[0])||"";!u&&r.includes("__")&&(u="mcp"),u&&s.push({rule:i,effect:n,cap:u,whole:c===null,where:l.scope?[S(l.scope)]:[],key:a})}}return s}function Ke(t){const s=t.get("permissions.defaultMode"),e=k(s)??"default",a=s&&k(s)!==void 0?s.key:"",n=`default mode ${e}`;if(e==="bypassPermissions")return G("allowed",n+": no permission prompts",a);const l={mcp:{state:"asks",why:"Claude Code asks before an MCP tool runs",key:a},read:{state:"allowed",why:"Claude Code reads files without asking",key:a},write:{state:"asks",why:"Claude Code asks before it edits a file",key:a},shell:{state:"asks",why:"Claude Code asks before it runs a command",key:a},web:{state:"asks",why:"Claude Code asks before it fetches a URL",key:a}};if(e==="acceptEdits"&&(l.write={state:"allowed",why:n+": edits apply without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only, no edits",key:a},l.shell={state:"denied",why:n+": read-only, no commands that change anything",key:a}),e==="dontAsk")for(const i of["mcp","write","shell","web"])l[i]={state:"denied",why:n+": anything not allowed by a rule is refused",key:a};return l}function Ve(t){const s=t.get("defaultPermissionMode"),e=k(s)??"manual",a=s&&k(s)!==void 0?s.key:"";if(e==="allow-all")return G("allowed","defaultPermissionMode allow-all: every tool call is allowed",a);const n=e==="assisted"?"asks; in assisted mode a model answers the request":"asks before it runs";return{mcp:{state:"asks",why:"an MCP tool "+n,key:a},read:{state:"allowed",why:"reads in trusted folders run without asking",key:a},write:{state:"asks",why:"a file write "+n,key:a},shell:{state:"asks",why:"a shell command "+n,key:a},web:{state:"asks",why:"a URL fetch "+n,key:a}}}function ze(t){for(const s of t.values()){const e=k(s);if((Me(s.key)==="globalAutoApprove"||s.key==="chat.tools.global.autoApprove")&&e===!0)return G("allowed",s.label+" is on: every tool call runs without asking",s.key);if(s.key==="skipPermissions"&&e===!0)return G("allowed",s.label+" is on: no permission checks",s.key);if(s.key==="chat.permissions.default"&&["autoApprove","autopilot","bypass"].includes(e))return G("allowed",`chat.permissions.default ${e}: sessions start without approval prompts`,s.key)}return{mcp:{state:"asks",why:"VS Code asks before an MCP tool runs"},read:{state:"allowed",why:"VS Code reads workspace files without asking"},write:{state:"allowed",why:"VS Code applies edits in the workspace without asking"},shell:{state:"asks",why:"VS Code asks before a terminal command runs"},web:{state:"asks",why:"VS Code asks before it fetches a URL"}}}function Je(t){const s=t.get("approval_policy"),e=t.get("sandbox_mode"),a=k(t.get("sandbox_workspace_write.network_access"))===!0;let n=k(s);n&&typeof n=="object"&&(n="granular"),n=n||"on-request";const l=k(e)||"read-only",i=s&&k(s)!==void 0?s.key:"",r=e&&k(e)!==void 0?e.key:"",c=`approval_policy ${n}${k(s)===void 0?" (not set)":""}`,u=`sandbox_mode ${l}${k(e)===void 0?" (not set)":""}`,p=n==="never",d=l==="danger-full-access",$=d?{state:"allowed",why:u+": no sandbox"}:l==="workspace-write"?{state:"allowed",why:u+": writes in the workspace run without asking"}:p?{state:"denied",why:`${u}, ${c}: no writes and no way to ask`}:{state:"asks",why:`${u}: a write needs your approval`},b=p?{state:"allowed",why:c+": commands never ask"}:n==="untrusted"?{state:"asks",why:c+": commands outside the trusted set ask"}:{state:"allowed",why:`${c}: commands run in the sandbox (${l}) and ask to leave it`},h=d||l==="workspace-write"&&a?{state:"allowed",why:d?u+": network open":"sandbox_workspace_write.network_access is on"}:p?{state:"denied",why:`${u}, ${c}: no network and no way to ask`}:{state:"asks",why:`${u}: network access needs your approval`};return{mcp:{state:p?"allowed":"asks",why:p?c+": MCP tools never ask":c+": MCP tool calls ask",key:i},read:{state:"allowed",why:u+": reads are allowed",key:r},write:{...$,key:r||i},shell:{...b,key:i||r},web:{...h,key:r||i}}}function Ye(t){const s=t.get("general.defaultApprovalMode")||t.get("approvalMode")||t.get("approval_mode")||t.get("general.approvalMode"),e=k(s)??"default",a=s&&k(s)!==void 0?s.key:"",n="approval mode "+e;if(e==="yolo")return G("allowed",n+": every tool call runs without asking",a);const l={mcp:{state:"asks",why:n+": MCP tools ask",key:a},read:{state:"allowed",why:"reads run without asking",key:a},write:{state:"asks",why:n+": edits ask",key:a},shell:{state:"asks",why:n+": shell commands ask",key:a},web:{state:"asks",why:n+": web fetches ask",key:a}};return e==="auto_edit"&&(l.write={state:"allowed",why:n+": edits run without asking",key:a}),e==="plan"&&(l.write={state:"denied",why:n+": read-only",key:a},l.shell={state:"denied",why:n+": read-only",key:a}),l}const X=(t,s)=>[...t.keys()].some(e=>s.test(e)),Qe=[{id:"claude",tools:["claude-code"],applies:t=>X(t,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:Ke,rules:We,wholeName:"the whole tool"},{id:"copilot-cli",tools:["copilot-cli","copilot-desktop"],applies:t=>X(t,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:Ve,rules:Ue,notes:t=>{const s=k(t.get("savedToolApprovals"));if(!s||typeof s!="object")return[];const e=Object.values(s).reduce((n,l)=>n+(Number(l)||0),0),a=Object.keys(s).length;return e?[`${e} saved tool ${e===1?"approval":"approvals"} in ${a} ${a===1?"folder":"folders"} (permissions-config.json)`]:[]}},{id:"vscode",tools:["vscode","copilot"],applies:t=>X(t,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:ze,rules:Ge},{id:"codex",tools:["codex-cli","codex"],applies:t=>X(t,/^(approval_policy|sandbox_mode)$/),base:Je,rules:()=>[]},{id:"gemini",tools:["gemini-cli","gemini"],applies:t=>X(t,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:Ye,rules:He}];function Xe(t,s){return t==="mixed"?`mixed (${s} ${s===1?"rule":"rules"})`:t}function Yt(t){return`${Fe[t.effect]} ${t.rule}${t.where.length?" ("+t.where.join(", ")+")":""}`}function Ze(t,s,e){var d;const a=e.filter($=>$.cap===t.id),n=a.filter($=>$.whole);let l=s.state,i=s.why;if(n.length){const $=n.reduce((b,h)=>Jt[h.effect]>Jt[b.effect]?h:b);l=$.effect,i="rule "+Yt($)}const r=a.some($=>!$.whole&&$.effect!==l),c=r?"mixed":l,u=Xe(c,a.length),p=[`${t.label}: ${u}`];return!a.length||!n.length?p.push("Without a rule: "+s.state+" ("+s.why+")"):p.push((r?"For the whole tool: ":"Decided by: ")+l+" ("+i+")"),a.length&&p.push(...a.map($=>"• "+Yt($))),{cap:t.id,label:t.label,state:c,text:u,title:p.join(`
`),rules:a.map($=>({rule:$.rule,effect:$.effect,where:$.where})),key:((d=a[0])==null?void 0:d.key)||s.key||""}}function hs(t){if(!t)return null;const s=Qe.find(l=>l.tools.includes(t.id));if(!s)return null;const e=Re(t);if(!s.applies(e))return null;const a=s.base(e),n=s.rules(e,t.scopes||[]);return{tool:t.id,cells:Pt.map(l=>Ze(l,a[l.id],n)),notes:s.notes?s.notes(e):[]}}function tn(t){return(t||[]).map(s=>({entry:s,perms:hs(s)})).filter(s=>s.perms)}const sn=["project","project-local"],en=new Set(["permissions","permissions.allow","permissions.deny","permissions.ask","project_permissions"]),Tt="Editing this file is not supported yet";function nn(t){return!!t&&t.tool==="claude-code"&&en.has(t.key)}function an(t){var s,e;return((e=(s=t==null?void 0:t.chain)==null?void 0:s[t.wins])==null?void 0:e.scope)||(t==null?void 0:t.scope)||"default"}function on(t,s=[]){var l;const e=(l=t==null?void 0:t.chain)==null?void 0:l[t.wins];if(t!=null&&t.locked||Lt(e,s))return{ok:!1,hint:"Locked by "+S(t.locked?t.scope:e.scope,s)};if(!nn(t))return{ok:!1,hint:Tt};const a=an(t);if(!sn.includes(a))return{ok:!1,hint:`${Tt}: the value comes from ${S(a,s)}. Project and Project local permissions can be changed here.`};const n=(s||[]).find(i=>i.id===a);return{ok:!0,scope:a,label:S(a,s),path:e&&e.source||(n==null?void 0:n.path)||""}}const ln=t=>(t||[]).join(`
`),cn=t=>String(t||"").split(`
`).map(s=>s.trim()).filter(Boolean);function rn(t,s){const e=new Set(t||[]),a=new Set(s||[]);return{added:[...a].filter(n=>!e.has(n)),removed:[...e].filter(n=>!a.has(n))}}function fs({cell:t,onPick:s}){const e=t.key&&s?()=>s(t.key):null;return o`<td class=${"st-perm st-perm--"+t.state} data-cap=${t.cap} data-state=${t.state} title=${t.title}>
    ${e?o`<button type="button" class="st-perm__btn" aria-label=${`${t.label}: ${t.text}`} onClick=${e}>${t.text}</button>`:o`<span class="st-perm__text">${t.text}</span>`}
  </td>`}function bs({first:t=""}){return o`<thead><tr>
    ${t&&o`<th scope="col">${t}</th>`}
    ${Pt.map(s=>o`<th scope="col" key=${s.id} data-cap=${s.id}>${s.label}</th>`)}
  </tr></thead>`}function dn({w:t,entry:s,perms:e}){const a=n=>t.select({tool:s.id,row:n});return o`<div class="st-perms" data-testid="st-perms" data-tool=${s.id}>
    <table class="st-permtable">
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <${bs}/>
      <tbody><tr>${e.cells.map(n=>o`<${fs} key=${n.cap} cell=${n} onPick=${a}/>`)}</tr></tbody>
    </table>
    ${e.notes.map((n,l)=>o`<p key=${l} class="st-hint st-perms__note">${n}</p>`)}
  </div>`}function pn({w:t,mats:s}){return s.length?o`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class="st-permtable">
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <${bs} first="Tool"/>
      <tbody>
        ${s.map(({entry:e,perms:a})=>o`<tr key=${e.id} data-tool=${e.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${F} id=${e.id}/>${e.label}</span></th>
          ${a.cells.map(n=>o`<${fs} key=${n.cap} cell=${n} onPick=${l=>t.select({tool:e.id,row:l})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${s.flatMap(({entry:e,perms:a})=>a.notes.map((n,l)=>o`<p key=${e.id+l} class="st-hint st-perms__note">${e.label}: ${n}</p>`))}
  </div>`:null}const un={copilot:"copilot-vscode",vscode:"copilot-vscode"};function $n(t,s){const e=t==null?void 0:t.tools;return!e||typeof e!="object"?null:e[s]||e[un[s]]||null}function hn(t){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[t]||t||"unknown"}function fn(t){const s=(t==null?void 0:t.message)||"";return s.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':s.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':s.includes("chat.useHooks")?'"chat.useHooks": true':""}const bn={active:"is-ok",configured:"is-ok",disabled:"is-warn",misconfigured:"is-warn",missing:"is-warn"};function mn({status:t}){const s=t.configured_events||[],e=t.missing_events||[],a=t.sources||[],n=t.warnings||[];return o`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${"st-status "+(bn[t.status]||"")} data-testid="st-hookstat-status"
        title=${t.status==="misconfigured"?"The hook commands post to a different port than this dashboard":void 0}>${hn(t.status)}</span>
      <span>${t.configured_count||s.length} configured</span>
      ${e.length>0&&o`<span class="st-warn" title=${e.join(", ")}>${e.length} missing: ${e.join(", ")}</span>`}
      <span>${t.fired_24h||0} fired in 24 h</span>
      <span title=${t.last_fire_ts?new Date(t.last_fire_ts*1e3).toLocaleString():void 0}>last ${t.last_fire_ts?st(t.last_fire_ts):"never"}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${s.length?s.map(l=>o`<span key=${l} class="st-chip st-chip--mono st-hookstat__ev">${l}</span>`):o`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${a.length>0&&o`<ul class="st-hookstat__sources">
      ${a.map(l=>o`<li key=${l.path} title=${l.path}>
        <span class="st-mono">${l.scope}</span>
        <span>${l.configured_count||0} ${l.configured_count===1?"event":"events"}</span>
        <span class=${l.host_enabled===!1?"st-warn":"st-dim"}>${l.host_enabled===!1?"ignored by the host":"loaded"}</span>
      </li>`)}
    </ul>`}
    ${n.map(l=>{const i=fn(l);return o`<div key=${(l.path||"")+l.message} class="st-hookstat__warn" role="note">
        ${l.message}${i&&o`<code class="st-hookstat__snippet">${i}</code>`}
      </div>`})}
  </div>`}function yn(t,s){const e=q(t);if(s.filter(l=>q(l)===e).length<2)return e;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?e:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+e}function gn({w:t}){const{entries:s,aictl:e,st:a}=t;return o`<nav class="st-nav" aria-label="Tools">
    <${E}>Tools</${E}>
    <ul class="st-nav__list">
      ${s.map(n=>{const l=n.id===t.toolId,i=n.rows.filter(l?t.passTool:t.pass),r=i.some(c=>c.risky);return o`<li key=${n.id}>
          <button type="button" class=${"st-nav__item"+(l?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${l?"true":void 0} data-tool=${n.id}
            onClick=${()=>t.set({tool:n.id,sec:"",row:"",scope:l?t.st.scope:""})}>
            <${F} id=${n.id}/><span class="st-nav__label">${n.label}</span>
            ${r&&o`<${at} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${l&&o`<ul class="st-nav__subs">
            ${n.sections.map(c=>{const u=c.rows.filter(t.passTool),p=a.sec===c.id,d=c.id==="agents"?Zs(u):"";return o`<li key=${c.id}><button type="button" class=${"st-nav__sub"+(p?" is-on":"")}
                aria-current=${p?"true":void 0}
                onClick=${()=>t.set({sec:p?"":c.id})}>
                <span class="st-nav__label">${c.title}</span>
                ${u.some($=>$.risky)&&o`<${at} label="A risky setting is on"/>`}
                <span class="st-nav__n">${u.length}</span>
                ${d&&o`<span class="st-nav__model" title=${"Every agent runs on "+d}>${d}</span>`}
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${e&&o`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${F} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${e.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function kn({row:t,w:s,scopes:e}){var l;const a=((l=s.selected)==null?void 0:l.uid)===t.uid,n=()=>s.select({tool:t.tool,row:t.key});return o`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${n}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),n())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&o` <${rs}/>`}</div>
      ${t.risky&&t.tip&&o`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${$t} row=${t}/></td>
    <td class="st-c-scope"><${K} scope=${t.scope} locked=${t.locked} label=${S(t.scope,e)}/></td>
    <td class="st-c-src"><${ot} path=${t.source} line=${t.line} w=${s}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function _n({w:t,entry:s}){const e=s.scopes||[];if(!e.length)return null;const a=s.rows.filter(t.pass);return o`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${e.map((n,l)=>{const i=a.filter(p=>p.scope===n.id).length,r=t.st.scope===n.id,c=n.path?q(n.path):"",u=[n.label,n.paths.length?n.paths.join(`
`):"",n.exists?"":"not present",n.note,n.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return o`<li key=${n.id} class="st-scopes__item">
          ${l>0&&o`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(r?" is-on":"")+(n.changeable?"":" is-locked")+(n.exists?"":" is-absent")}
            data-scope=${n.id} aria-pressed=${r?"true":"false"} title=${u}
            onClick=${()=>t.set({scope:r?"":n.id})}>
            <span class="st-scopechip__top">
              ${!n.changeable&&o`<${lt}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${n.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class="st-scopechip__file">${n.exists?c||n.note:"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function Qt({children:t,section:s}){return o`<tr class="st-extra" data-extra=${s}><td colspan="5">${t}</td></tr>`}function vn({w:t,sections:s,scopes:e,extras:a={}}){return o`<table class="st-table">
    <thead><tr>
      <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
      <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
      <th scope="col">What it does</th>
    </tr></thead>
    ${s.map(n=>{const l=n.shown.filter(i=>i.risky).length;return o`<tbody key=${n.id} data-section=${n.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${n.title}
          <span class="st-group__meta">${n.shown.length}${l?o` · <span class="st-red">${l} risky</span>`:""}${n.hidden?o` · <span class="st-unsetn">+${n.hidden} unset</span>`:""}</span></th></tr>
        ${a[n.id]&&o`<${Qt} section=${n.id}>${a[n.id]}</${Qt}>`}
        ${n.shown.map(i=>o`<${kn} key=${i.uid} row=${i} w=${t} scopes=${e}/>`)}
      </tbody>`})}
  </table>`}function wn(t){const s=[];for(const e of t){const a=e.id==="agents"&&e.shown.every(l=>l.kind==="agent"&&l.agent),n=s[s.length-1];a?s.push({agents:!0,sections:[e]}):n&&!n.agents?n.sections.push(e):s.push({agents:!1,sections:[e]})}return s}function Sn({w:t,entry:s}){const e=s.sections.filter(c=>!t.st.sec||c.id===t.st.sec).map(c=>({...c,shown:c.rows.filter(t.passTool),hidden:t.showUnset?0:c.rows.filter(u=>u.unset&&t.passAll(u)&&(!t.st.scope||u.scope===t.st.scope)).length})).filter(c=>c.shown.length||c.hidden),a=s.rows.length,n=hs(s),l=$n(t.hooks,s.id),i={autonomy:n&&o`<${dn} w=${t} entry=${s} perms=${n}/>`,hooks:l&&o`<${mn} status=${l}/>`},r=t.st.scope?S(t.st.scope,s.scopes):"";return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${a} ${a===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.risky?o` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(c=>o`<button type="button" key=${c} class="st-chip st-chip--mono st-chip--btn" title=${c}
          onClick=${()=>t.openAt(c)}>${yn(c,s.files)}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&o`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((c,u)=>o`<p key=${u} class="st-note">${c}</p>`)}
    <${_n} w=${t} entry=${s}/>
    ${e.length?wn(e).map((c,u)=>c.agents?o`<${Ee} key=${"a"+u} w=${t} section=${c.sections[0]}/>`:o`<${vn} key=${"g"+u} w=${t} sections=${c.sections} scopes=${s.scopes} extras=${i}/>`):o`<p class="st-empty">${a?r?`No setting shown here is set at the ${r} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}function Cn({w:t,aictl:s}){const e=t.q.trim().toLowerCase(),a=s.collectors.filter(l=>!e||[l.name,l.mode,l.status,l.detail].join(" ").toLowerCase().includes(e)),n=s.roots.filter(l=>!e||l.toLowerCase().includes(e));return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${a.length>0&&o`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${a.length}</span></th></tr>
        ${a.map(l=>o`<tr key=${l.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${l.name}</td>
          <td class="st-mono">${l.mode||"—"}</td>
          <td><span class=${"st-status "+(l.status==="active"?"is-ok":"is-warn")}>${l.status}</span></td>
          <td class="st-c-what" title=${l.detail||void 0}>${l.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${n.length>0&&o`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${n.map((l,i)=>o`<li key=${i} class="st-mono" title=${l}>${l}</li>`)}</ul>`}
    ${!a.length&&!n.length&&o`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function ms(t){if(t.st.sec&&Ot.includes(t.st.sec))return t.st.sec;const s=e=>t.entries.some(a=>a.rows.some(n=>n.sec===e));return s("autonomy")?"autonomy":Ot.find(s)||"autonomy"}function On({w:t}){const s=ms(t);return o`<nav class="st-nav" aria-label="Topics">
    <${E}>Topics</${E}>
    <ul class="st-nav__list">
      ${Ot.map(e=>{const a=t.entries.filter(i=>i.rows.some(r=>r.sec===e&&t.pass(r))),n=a.some(i=>i.rows.some(r=>r.sec===e&&r.risky&&t.pass(r))),l=e===s;return o`<li key=${e}><button type="button" class=${"st-nav__item"+(l?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${l?"true":void 0} data-sec=${e}
          onClick=${()=>t.set({sec:e})}>
          <span class="st-nav__label">${Et[e]}</span>
          ${n&&o`<${at} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function An({w:t}){const[s,e]=_("tool"),a=t.entries.flatMap(r=>r.rows.filter(c=>c.sec==="agents"&&es(c))),n=a.filter(t.pass),l=new Set(n.map(r=>r.tool)).size,i=n.filter(ft).length;return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Et.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${n.length} ${n.length===1?"agent":"agents"} in ${l} ${l===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${n.length?o`<${Pe} w=${t} rows=${n} sort=${s} onSort=${e}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:o`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function Tn({w:t}){const s=ms(t);if(s==="agents")return o`<${An} w=${t}/>`;const{tools:e,rows:a}=te(t.entries,s,t.pass),n=a.reduce((i,r)=>i+Object.values(r.cells).filter(c=>c.risky).length,0),l=s==="autonomy"?tn(t.entries):[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${Et[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${n?o` · <span class="st-red">${n} risky ${n===1?"value":"values"}</span>`:""}</span>
    </div>
    <${pn} w=${t} mats=${l}/>
    ${a.length?o`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${e.map(i=>o`<th scope="col" key=${i.id} class="st-matrix__tool" data-tool=${i.id}>
          <span class="st-matrix__toolname"><${F} id=${i.id}/>${i.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${a.map(i=>o`<tr key=${i.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${i.keys.join(`
`)}>${i.label}</th>
          ${e.map(r=>{var p;const c=i.cells[r.id];if(!c||c.unset&&!t.showUnset)return o`<td key=${r.id} class="st-cell st-cell--none">—</td>`;const u=((p=t.selected)==null?void 0:p.uid)===c.uid;return o`<td key=${r.id} class=${"st-cell"+(c.risky?" is-risky":"")+(c.unset?" is-unset":"")+(u?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${c.key}
                aria-label=${`${i.label}, ${r.label}: ${ss(c.value)}${c.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:r.id,row:c.key})}>
                <${$t} row=${c} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:o`<p class="st-empty">${e.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const xn=8,ys=86400,ut=8;function Mt(t){const s=t.cell?t.cell.split(":"):null;return{loc:I(t.sec),tools:I(t.tool),purpose:I(t.purpose),scope:I(t.fscope),git:I(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function Ln(t,s,e,a){return!(e!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||e!=="tools"&&s.tools.length&&!t.tools.some(n=>s.tools.includes(n))||e!=="purpose"&&s.purpose.length&&!s.purpose.includes(M(t))||e!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||e!=="git"&&s.git.length&&!s.git.includes(Nt(t))||e!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-ys)||e!=="cell"&&s.cell&&(M(t)!==s.cell[0]||t.location!==s.cell[1]))}function bt(t,s=null,e=Date.now()/1e3){const a=Mt(t.st);return t.files.filter(n=>ne(n,t.q)&&Ln(n,a,s,e))}function U(t,s,e){const a=I(t.st[s]);t.set({[s]:ce(a.includes(e)?a.filter(n=>n!==e):[...a,e]),row:""})}function Z({w:t,title:s,fkey:e,skip:a,options:n,valueOf:l,attr:i,swatch:r}){const c=bt(t,a),u=I(t.st[e]),p=n.map(d=>({...d,n:c.filter($=>l($).includes(d.id)).length})).filter(d=>d.n||u.includes(d.id)||d.always);return p.length?o`<${E}>${s}</${E}>
    <ul class="st-nav__list" aria-label=${s}>
      ${p.map(d=>{const $=u.includes(d.id);return o`<li key=${d.id}><button type="button" class=${"st-nav__item"+($?" is-on":"")+(d.n?"":" is-empty")}
          aria-pressed=${$?"true":"false"} ...${{[i]:d.id}} onClick=${()=>U(t,e,d.id)}>
          ${r?o`<${F} id=${d.id}/>`:null}<span class="st-nav__label">${d.label}</span><span class="st-nav__n">${d.n}</span></button></li>`})}
    </ul>`:null}function En({w:t}){const s=[...new Set(t.files.flatMap(n=>n.tools))],e=[...new Set(t.files.map(n=>n.scope).filter(Boolean))],a=bt(t,"recent").filter(n=>n.mtime&&n.mtime>=Date.now()/1e3-ys).length;return o`<nav class="st-nav" aria-label="File filters">
    <${Z} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${ee.map(n=>({...n,always:!0}))} valueOf=${n=>[n.location]}/>
    <${Z} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${se} valueOf=${n=>[M(n)]}/>
    <${Z} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(n=>({id:n,label:t.labelOf(n)}))} valueOf=${n=>n.tools}/>
    <${Z} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${e.map(n=>({id:n,label:as[n]||n}))} valueOf=${n=>[n.scope]}/>
    <${Z} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${ns} valueOf=${n=>[Nt(n)]}/>
    <${E}>Changes</${E}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function Nn({w:t}){const s=Mt(t.st),e=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(Ht[a]||a),drop:()=>U(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(et[a]||a),drop:()=>U(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>U(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(as[a]||a),drop:()=>U(t,"fscope",a)})),...s.git.map(a=>{var n;return{k:"git:"+a,label:"Git: "+(((n=ns.find(l=>l.id===a))==null?void 0:n.label)||a),drop:()=>U(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(et[s.cell[0]]||s.cell[0])+" in "+(Ht[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return e.length?o`<div class="st-fchips" data-testid="st-file-chips">
    ${e.map(a=>o`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function Pn({w:t}){const s=le(bt(t,"cell").filter(e=>!e.is_dir));return s.rows.length?o`<div class="st-scroll"><table class="st-table st-fmatrix" data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr><th scope="col">Purpose</th>${s.cols.map(e=>o`<th key=${e.id} scope="col" class="st-num">${e.label}</th>`)}<th scope="col" class="st-num">All</th></tr></thead>
    <tbody>${s.rows.map(e=>o`<tr key=${e.id}>
      <th scope="row">${e.label}</th>
      ${s.cols.map(a=>{const n=e.cells[a.id]||0,l=e.id+":"+a.id,i=t.st.cell===l;return o`<td key=${a.id} class=${"st-cell st-num"+(i?" is-sel":"")}>${n?o`<button type="button" class="st-cellbtn" data-cell=${l} aria-pressed=${i?"true":"false"}
              aria-label=${n+" "+e.label+" "+(n===1?"file":"files")+" in "+a.label}
              onClick=${()=>t.set({cell:i?"":l,row:""})}>${n}</button>`:o`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${e.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function Fn({f:t,w:s}){const e=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),n=re(t);return o`<tr class=${"st-row"+(e?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?o`<span class="st-fname" title=${t.path}>${t.name}/</span>`:o`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${l=>{l.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&o`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${M(t)}>${t.is_dir?"Folder":et[M(t)]}</span></td>
    <td><${K} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(l=>o`<${D} key=${l} id=${l} label=${s.labelOf(l)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?xt(t.bytes):"—"}</td>
    <td class=${n?"st-warn":"st-dim"} data-git=${Nt(t)||void 0}
      title=${n?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?st(t.mtime):"—"}</td>
  </tr>`}function Mn(t){const s=Mt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!e||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(e))&&(!s.tools.length||a.tools.some(n=>s.tools.includes(n))))}function Rn({w:t,items:s}){const[e,a]=_(!1);return o`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${ut}>
      <button type="button" class="st-fold" aria-expanded=${e?"true":"false"} onClick=${()=>a(!e)}>
        <span aria-hidden="true">${e?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${e&&s.map(n=>o`<tr key=${n.path} class="st-row st-row--static st-row--absent" data-path=${n.path}>
      <td class="st-c-file"><span class="st-fname" title=${n.path+(n.note?`
`+n.note:"")}>${H(n.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${lt} label="Cannot be changed from this machine"/><${K} scope=${n.scope}/></span></td>
      <td><span class="st-tools">${n.tools.map(l=>o`<${D} key=${l} id=${l} label=${t.labelOf(l)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function jn(t,s){const e=t.filter(l=>!l.is_dir),a=t.filter(l=>l.is_dir),n=s==="purpose"?ae(e).map(l=>({key:"purpose:"+l.id,attrs:{"data-purpose":l.id},title:l.label,mono:!1,root:null,files:l.files})):oe(e).map(l=>({key:l.root,attrs:{"data-root":l.root},title:H(l.root),full:l.root,mono:!0,root:l.root,sub:os[l.location]||"Other",files:l.files}));return a.length&&n.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),n}function In({g:t,w:s,open:e,setOpen:a,shut:n,setShut:l}){const i=!!n[t.key],r=[...new Set(t.files.flatMap(p=>p.tools))],c=t.files.reduce((p,d)=>p+(d.is_dir?0:Number(d.bytes)||0),0),u=t.flat?[{dir:"",files:t.files}]:ie(t.files);return t.root&&u.sort((p,d)=>(d.dir===t.root)-(p.dir===t.root)),o`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${ut}>
      <button type="button" class="st-fold" aria-expanded=${i?"false":"true"}
        onClick=${()=>l({...n,[t.key]:!i})}>
        <span aria-hidden="true">${i?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${c?" · "+xt(c):""}</span>
      ${r.length>0&&o`<span class="st-tools st-group__tools">${r.map(p=>o`<${D} key=${p} id=${p} label=${s.labelOf(p)}/>`)}</span>`}
    </th></tr>
    ${!i&&u.map(p=>{const d=t.key+"|"+p.dir,$=e[d]?p.files:p.files.slice(0,xn),b=p.files.length-$.length;return o`<${Ut} key=${d}>
        ${p.dir&&p.dir!==t.root&&o`<tr class="st-folder" data-dir=${p.dir}><td colspan=${ut}>
          <span class="st-mono st-path" title=${p.dir}>${H(p.dir)}</span><span class="st-dim"> · ${p.files.length}</span></td></tr>`}
        ${$.map(h=>o`<${Fn} key=${h.path} f=${h} w=${s}/>`)}
        ${b>0&&o`<tr class="st-morerow"><td colspan=${ut}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...e,[d]:!0})}>▸ ${b} more</button>
        </td></tr>`}
      </${Ut}>`})}
  </tbody>`}const Dn=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}];function Wn({w:t}){const[s,e]=_({}),[a,n]=_({}),l=bt(t),i=t.st.group==="purpose"?"purpose":"location",r=jn(l,i),c=Mn(t);return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${l.length} ${l.length===1?"file":"files"} · grouped by ${i==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${Dn.map(u=>o`<button key=${u.value} type="button" class="st-seg__btn" aria-pressed=${i===u.value?"true":"false"}
          onClick=${()=>t.set({group:u.value})}>${u.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&o`<p class="st-note" role="status">File details are loading</p>`}
    <${Pn} w=${t}/>
    <${Nn} w=${t}/>
    ${r.length||c.length?o`<div class="st-scroll"><table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Purpose</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col" class="st-num">Settings</th><th scope="col" class="st-num">Size</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${r.map(u=>o`<${In} key=${u.key} g=${u} w=${t} open=${s} setOpen=${e} shut=${a} setShut=${n}/>`)}
      ${c.length>0&&o`<${Rn} w=${t} items=${c}/>`}
    </table></div>`:o`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const Bn=5;function gs(t,s){return t?H(t)+(s>0?":"+s:""):"—"}function Un({w:t}){const s=ls(t.findings.filter(e=>is(e,t.q)));return o`<nav class="st-nav" aria-label="Finding rules">
    <${E}>Finding rules</${E}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((e,a)=>e+a.count,0)}</span></button></li>
      ${s.map(e=>{const a=t.st.sec===e.rule;return o`<li key=${e.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${e.rule}
          onClick=${()=>t.set({sec:a?"":e.rule,row:""})}>
          ${e.alarm?o`<${at} label=${e.severity+" severity"}/>`:o`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${e.label}</span><span class="st-nav__n">${e.count}</span></button></li>`})}
    </ul>
  </nav>`}function Gn({f:t,group:s,w:e}){const a=e.selectedFinding&&e.selectedFinding.id===t.id,n=()=>e.select({row:t.id,sec:e.st.sec}),l=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",i=cs(t).map(e.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return o`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${n}
    onKeyDown=${r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),n())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${gs(t.path,t.line)}${t.count>1?o` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${l}</td>
    <td class="st-c-act">${t.path&&o`<button type="button" class="st-chip st-chip--btn"
      onClick=${r=>{r.stopPropagation(),e.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function qn({w:t}){var u,p;const[s,e]=_({});if(t.auditStatus==="loading"&&!t.audit){const d=t.scan;return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${d?" "+(d.step||"")+(d.elapsed_s!=null?", "+Math.round(d.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return o`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&o` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const a=t.findings.filter(d=>is(d,t.q)),n=ls(a).filter(d=>!t.st.sec||d.rule===t.st.sec),l=n.reduce((d,$)=>d+$.count,0),i=t.auditStatus==="loading",r=((u=t.audit)==null?void 0:u.incomplete)||[],c=((p=t.audit)==null?void 0:p.failed_steps)||[];return o`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${l} in ${n.length} ${n.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&o`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${i}
        onClick=${()=>t.rescan()}>${i?"Scanning…":"Rescan"}</button>`}
    </div>
    ${i&&o`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&o`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${r.length>0&&o`<p class="st-note st-warn">The scan reached its time limit and skipped: ${r.join(", ")}.</p>`}
    ${c.length>0&&o`<p class="st-note st-warn">The scan could not read: ${c.map(d=>d.step+" ("+d.error+")").join(", ")}.</p>`}
    ${n.length?o`<table class="st-table st-findings">
      <thead><tr>
        <th scope="col" class="st-c-tool">Tool</th><th scope="col" class="st-c-where">Where</th>
        <th scope="col">What it does</th><th scope="col" class="st-c-act"><span class="st-sr">Action</span></th>
      </tr></thead>
      ${n.map(d=>{const b=!!s[d.rule]?d.items:d.items.slice(0,Bn),h=d.items.length-b.length;return o`<tbody key=${d.rule} data-rule=${d.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${d.alarm&&o`<${at} label=${d.severity+" severity"}/>`} ${d.label}
            <span class="st-group__meta">${d.count} · ${d.tools.map(t.labelOf).join(", ")||"no tool"}${d.why?" · "+d.why:""}</span>
          </th></tr>
          ${b.map(C=>o`<${Gn} key=${C.id} f=${C} group=${d} w=${t}/>`)}
          ${h>0&&o`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>e({...s,[d.rule]:!0})}>▸ ${h} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:o`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}const j=[{id:"allow",label:"Allow",hint:"run without asking"},{id:"deny",label:"Deny",hint:"always refused"},{id:"ask",label:"Ask",hint:"always ask first"}];function Xt(t){return String((t==null?void 0:t.message)||t||"").replace(/^HTTP \d+ \S+: /,"")||"The request failed"}const wt=t=>Object.fromEntries(j.map(s=>{var e;return[s.id,ln((e=t==null?void 0:t.permissions)==null?void 0:e[s.id])]}));function Hn({title:t,diff:s}){const e=s.added.length||s.removed.length;return o`<div class="st-diff" data-bucket=${t}>
    <span class="st-diff__name">${t}</span>
    <span class="st-diff__chips">
      ${e?o`${s.added.map(a=>o`<code key=${"a"+a} class="st-diff__chip is-added">+ ${a}</code>`)}
          ${s.removed.map(a=>o`<code key=${"r"+a} class="st-diff__chip is-removed">- ${a}</code>`)}`:o`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function Kn({tool:t,target:s,refresh:e,onClose:a}){const[n,l]=_(null),[i,r]=_(()=>wt(null)),[c,u]=_(!0),[p,d]=_(!1),[$,b]=_(null),[h,C]=_(null),O=P(()=>{let f=!0;return u(!0),b(null),Us(t,s.scope).then(v=>{f&&(l(v),r(wt(v)),u(!1))},v=>{f&&(b({message:Xt(v),conflict:!0}),u(!1))}),()=>{f=!1}},[t,s.scope]);tt(()=>O(),[O]);const W=Object.fromEntries(j.map(f=>[f.id,cn(i[f.id])])),T=Object.fromEntries(j.map(f=>{var v;return[f.id,((v=n==null?void 0:n.permissions)==null?void 0:v[f.id])||[]]})),mt=Object.fromEntries(j.map(f=>[f.id,rn(T[f.id],W[f.id])])),N=j.some(f=>JSON.stringify(T[f.id])!==JSON.stringify(W[f.id])),yt=JSON.stringify({permissions:W},null,2),it=(n==null?void 0:n.path)||s.path,V=()=>{d(!0),b(null),C(null),Gs(t,{scope:s.scope,expected_mtime:(n==null?void 0:n.mtime)??null,permissions:W}).then(f=>{l(f),r(wt(f)),C({backup:(f==null?void 0:f.backup_path)||""}),d(!1),typeof e=="function"&&e()},f=>{b({message:Xt(f),conflict:(f==null?void 0:f.status)===409}),d(!1)})},ct=()=>{C(null),O()};return o`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${s.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${it}>${it}</span> (${s.label})${n&&!n.exists?", a new file":""}
    </p>
    ${$&&o`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${$.message}</span>
      ${$.conflict&&o`<button type="button" class="st-btn" onClick=${ct}>Reload</button>`}
    </div>`}
    ${h&&o`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${h.backup?o`Saved. Backup: <span class="st-mono" title=${h.backup}>${h.backup}</span>`:"Saved. The file was new, so there is no backup."}
    </div>`}
    ${c?o`<p class="st-hint">Loading the file…</p>`:n&&o`
      <div class="st-editor__fields">
        ${j.map(f=>o`<label key=${f.id} class="st-editor__field">
          <span class="st-editor__label">${f.label} <span class="st-dim">· ${f.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${f.id} rows="4" spellcheck="false" value=${i[f.id]}
            onInput=${v=>r({...i,[f.id]:v.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${j.map(f=>o`<${Hn} key=${f.id} title=${f.id} diff=${mt[f.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${yt}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${V} disabled=${c||p||!n||!N}>${p?"Saving…":"Save"}</button>
      <button type="button" class="st-btn" onClick=${a}>Cancel</button>
    </div>
  </section>`}function y({title:t,children:s}){return o`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function Rt(t,s){return"Open "+q(t)+(s>0?" at line "+s:"")}function ks(t,s){return s?t.findings.filter(e=>nt(e.path,s)):[]}function _s(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function vs({w:t,path:s}){const e=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,n=[];return e?n.push(`File changed ${st(e.ts)}${e.tool?" by "+t.labelOf(e.tool):""} (file history)`):a&&n.push(`File last changed ${st(a)} (file history)`),o`<div class="st-hint" data-testid="st-history">${n.length?n.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}function Vn(t,s){var a;const e=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Lt(e,s)?"Locked by "+S(t.locked?t.scope:e.scope,s):Tt}function zn(t,s){const e=he(s);return`Not set in any file. Default: ${ss(t.value)}.`+(e?` Set it in ${H(e.path)} (${e.label}).`:"")}function Jn({w:t,row:s}){const e=t.scopesOf(s.tool),a=t.entries.filter(d=>d.id!==s.tool&&s.source&&d.files.some($=>nt($,s.source))).map(d=>d.label),n=s.source?t.files.find(d=>nt(d.path,s.source)):null;for(const d of(n==null?void 0:n.tools)||[]){const $=t.labelOf(d);d!==s.tool&&!a.includes($)&&a.push($)}const l=ks(t,s.source),{chain:i,wins:r}=s,c=on(s,e),[u,p]=_(!1);return o`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&o`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&o`<span class="st-chip st-chip--risky">risky</span>`}
      <${D} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${K} scope=${s.scope} locked=${s.locked} label=${S(s.scope,e)}/>
      ${s.undocumented&&o`<${rs}/>`}
      ${a.length>0&&o`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${$t} row=${s}/></div>
    ${s.unset&&o`<p class="st-insp__tip" data-testid="st-unset-text">${zn(s,e)}</p>`}
    <${y} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((d,$)=>{const b=$===r,h=Lt(d,e);return o`<li key=${$} class=${"st-chain__lv"+(b?" is-win":"")+(h?" is-locked":"")} aria-current=${b?"true":void 0}>
            <span class="st-chain__sc">${h&&o`<${lt} label=${"Locked: "+S(d.scope,e)+" cannot be changed here"}/>`}${d.scope||"default"}</span>
            <span class="st-chain__v">${pe(d)?o`<span class="st-dim">not set</span>`:o`<${$t} row=${s} value=${d.value} compact/>`}</span>
            <span class="st-chain__src">${d.source?o`<${ot} path=${d.source} line=${Number(d.line)>0?Number(d.line):0} w=${t}/>`:o`<span class="st-dim">${d.note||(d.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${b&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${ue(i,r)}</p>
    </${y}>
    <${y} title="History"><${vs} w=${t} path=${s.source}/></${y}>
    <${y} title="Actions">
      <div class="st-actions">
        ${s.source&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${Rt(s.source,s.line)}</button>`}
        ${l.length>0&&o`<button type="button" class="st-btn" onClick=${()=>_s(t,l[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!c.ok||u}
          aria-expanded=${c.ok?u?"true":"false":void 0}
          onClick=${()=>p(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${c.ok?`Edits ${H(c.path)||"the "+c.label+" file"} (${c.label})`:c.hint}</span>
      </div>
    </${y}>
    ${u&&o`<${Kn} tool=${s.tool} target=${c} refresh=${t.refresh}
      onClose=${()=>p(!1)}/>`}
  </div>`}function Yn({w:t,row:s}){const e=s.agent,a=t.scopesOf(s.tool),{steps:n,wins:l,why:i}=de(s),r=p=>Number(p)>0?Number(p):0,c=[{label:"Defined in",path:e.defined_in,line:r(e.defined_line),scope:e.scope_defined},{label:"Pinned in",path:e.pinned_in,line:r(e.pinned_line),scope:e.scope_pinned}],u=Vn(s,a);return o`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${e.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${e.description&&o`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${D} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${K} scope=${s.scope} locked=${s.locked} label=${S(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${ds} row=${s} w=${t}/></div>
    <${y} title="Model · what decides it">
      <ol class="st-chain">
        ${n.map((p,d)=>{const $=d===l;return o`<li key=${p.id} class=${"st-chain__lv"+($?" is-win":"")} aria-current=${$?"true":void 0}>
            <span class="st-chain__sc">${p.label}</span>
            <span class="st-chain__v">${p.value===void 0||p.value===null||p.value===""?o`<span class="st-dim">${p.id==="pin"&&p.present?"set":"not set"}</span>`:p.value==="inherits"?o`<span class="st-inherit">inherits</span>`:o`<span class="st-v">${String(p.value)}</span>`}</span>
            <span class="st-chain__src">${p.source?o`<${ot} path=${p.source} line=${p.line} w=${t}/>`:o`<span class="st-dim">${p.id==="effective"?l===2?"session model":"":"—"}</span>`}</span>
            ${$&&o`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${i}</p>
    </${y}>
    <${y} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${e.effort||"—"}</dd>
        <dt>Context</dt><dd>${e.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${e.target||"—"}</dd>
        <dt>Model policy</dt><dd>${e.model_policy||"—"}</dd>
      </dl>
    </${y}>
    <${y} title=${"Tools"+(e.tools.length?" · "+e.tools.length:"")}><${ps} tools=${e.tools} all/></${y}>
    <${y} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${c.map(p=>o`<dt key=${p.label+"t"}>${p.label}</dt><dd key=${p.label+"d"}>
          ${p.path?o`<span class="st-mono" title=${p.path+(p.line?":"+p.line:"")}>${q(p.path)}${p.line?":"+p.line:""}</span>
            ${p.scope&&o` <span class="st-dim">· ${S(p.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(p.path,p.line)}
              aria-label=${Rt(p.path,p.line)}>Open</button>`:o`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${y}>
    <${y} title="History"><${vs} w=${t} path=${e.defined_in||s.source}/></${y}>
    <${y} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${u}</span>
      </div>
    </${y}>
  </div>`}function Qn({w:t,file:s}){const e=ks(t,s.path),a=s.rows||[];return o`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":et[M(s)]}</span>
      <${K} scope=${s.scope}/>
      <span class="st-chip">${os[s.location]||"Other"}</span>
      ${s.tools.map(n=>o`<${D} key=${n} id=${n} label=${t.labelOf(n)}/>`)}
    </div>
    <${y} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?o`<ul class="st-insp__list">
        ${a.map(n=>o`<li key=${n.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:n.tool,sec:"",row:n.key})}>${n.label}</button>
          <span class="st-dim"> · ${t.labelOf(n.tool)}${n.line>0?" · line "+n.line:""}</span></li>`)}
      </ul>`:o`<div class="st-hint">${s.settings?s.settings+" settings":"No settings are read from this file."}</div>`}
    </${y}>
    <${y} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${s.path}</dd>
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":et[M(s)]}${s.kind&&s.kind!==M(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?xt(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?st(s.mtime):"—"}</dd>
        ${s.mtime?o`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&o`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&o`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${y}>
    <${y} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${e.length>0&&o`<button type="button" class="st-btn" onClick=${()=>_s(t,e[0])}>Show finding</button>`}
      </div>
    </${y}>
  </div>`}function Xn({w:t,f:s}){return o`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${$e(s.rule)}</h3>
    <div class="st-insp__key st-mono">${gs(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${cs(s).map(e=>o`<${D} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
      ${s.session_id&&o`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&o`<${y} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${y}>`}
    ${s.action&&o`<${y} title="What to do"><p class="st-insp__tip">${s.action}</p></${y}>`}
    <${y} title="Actions">
      <div class="st-actions">
        ${s.path&&o`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?Rt(s.path,s.line):"Show the line"}</button>`}
      </div>
    </${y}>
  </div>`}function Zn({w:t}){const{view:s}=t.st;let e=null;return(s==="tool"||s==="topic")&&t.selected?e=es(t.selected)?o`<${Yn} key=${t.selected.uid} w=${t} row=${t.selected}/>`:o`<${Jn} key=${t.selected.uid} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?e=o`<${Qn} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(e=o`<${Xn} w=${t} f=${t.selectedFinding}/>`),o`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${e||o`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const ta=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],Zt=new Set(["tool","topic"]);function ts(){return typeof window<"u"?window.location.search:""}function sa(){const[t,s]=_(()=>Vt(ts())),e=P(a=>s(n=>{const l={...n,...a};if(a.view&&a.view!==n.view&&!(Zt.has(n.view)&&Zt.has(a.view)))for(const i of["tool","sec","row"])i in a||(l[i]="");if(a.view&&a.view!==n.view&&!("scope"in a)&&(l.scope=""),a.view&&a.view!==n.view)for(const i of Se)i in a||(l[i]=i==="recent"?!1:"");return l}),[]);return tt(()=>{Gt(Ce(t))},[t]),tt(()=>{const a=()=>s(Vt(ts()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),Gt(Oe)}},[]),[t,e]}function ea(){const[t,s]=_({status:"loading",files:null});return tt(()=>{let e=!0;return Hs().then(a=>{e&&s(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{e&&s({status:"unavailable",files:null})}),()=>{e=!1}},[]),t}function na(t){const s=t||{},e=s.audit||null;return{status:s.loading?"loading":s.error?"error":e||s.loading===!1?"ready":"loading",audit:e,scan:s.scan||null,error:s.error?String(s.error):null}}function ra({source:t={},note:s=""}){var Bt;const{toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i=null,recentFiles:r,toolName:c,openFile:u,findings:p,refresh:d,hooks:$}=t,b=L(()=>me({toolConfigs:e,tools:a,monitor:n,root:l,enabledTools:i}),[e,a,n,l,i]),[h,C]=sa(),[O,W]=_(""),[T,mt]=_(!1),[N,yt]=_(!1),[it,V]=_(!1),ct=Ws(null),f=ea(),v=na(p),ws=p==null?void 0:p.rescan;tt(()=>{const m=g=>{var A;g.key==="/"&&!Ks(g.target)&&!g.metaKey&&!g.ctrlKey&&!g.altKey?(g.preventDefault(),(A=ct.current)==null||A.focus()):g.key==="Escape"&&V(!1)};return window.addEventListener("keydown",m),()=>window.removeEventListener("keydown",m)},[]);const w=L(()=>ye(b),[b]),B=L(()=>ge(b),[b]),jt=L(()=>ke(b),[b]),gt=L(()=>Kt({q:O,nonDefault:T,risky:N,unset:h.unset}),[O,T,N,h.unset]),Ss=L(()=>Kt({q:O,nonDefault:T,risky:N,unset:!0}),[O,T,N]),Cs=P(m=>gt(m)&&(!h.scope||m.scope===h.scope),[gt,h.scope]),Os=L(()=>_e(w),[w]),z=L(()=>fe(f.files,w,jt,i),[f.files,w,jt,i]),J=L(()=>qs(v.audit,i),[v.audit,i]),kt=L(()=>ve((J==null?void 0:J.findings)||[]),[J]),As=P((m,g=0)=>{!m||!u||u(m,g>0?g:0)},[u]),Ts=P(m=>{C(m),V(!0)},[C]),xs=P(()=>V(!1),[]),Ls=P(m=>{const g=we(m,b);return g===m&&c?c(m):g},[b,c]),Es=P(m=>{var g;return((g=w.find(A=>A.id===m))==null?void 0:g.scopes)||[]},[w]),Ns=P(m=>{const g=z.find(A=>nt(A.path,m));if(g!=null&&g.mtime)return g.mtime;for(const A of(b==null?void 0:b.tools)||[])for(const R of A.files||[])if(nt(R.path,m)&&R.mtime)return R.mtime;return null},[z,b]);if(!b)return o`<p class="loading-state">Loading...</p>`;if(!w.length&&!B&&!qt(i))return o`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const _t=w.some(m=>m.id===h.tool)||h.tool==="aictl"&&B?h.tool:((Bt=w[0])==null?void 0:Bt.id)||(B?"aictl":""),rt=w.find(m=>m.id===_t)||null,It=(m,g)=>{var A;return g&&((A=w.find(R=>R.id===m))==null?void 0:A.rows.find(R=>R.key===g))||null},Ps=h.view==="tool"?rt?It(rt.id,h.row):null:h.view==="topic"?It(h.tool,h.row):null,Fs=h.view==="files"&&h.row&&z.find(m=>m.path===h.row)||null,Ms=h.view==="findings"&&h.row&&kt.find(m=>m.id===h.row)||null,x={st:h,set:C,select:Ts,q:O,pass:gt,passAll:Ss,passTool:Cs,showUnset:h.unset,scopesOf:Es,managedAbsent:Os,entries:w,aictl:B,toolId:_t,files:z,filesStatus:f.status,findings:kt,audit:J,auditStatus:v.status,auditError:v.error,scan:v.scan,rescan:ws,selected:Ps,selectedFile:Fs,selectedFinding:Ms,openAt:As,labelOf:Ls,mtimeOf:Ns,recentFiles:r,drawer:it,closeDrawer:xs,refresh:d,hooks:$},{set:Rs,agents:js,knowsSet:Dt,unset:Is,risky:Wt}=be(w),Ds=qt(i)&&!w.some(m=>m.id!=="vscode");let Y,Q;return h.view==="topic"?(Y=o`<${On} w=${x}/>`,Q=o`<${Tn} w=${x}/>`):h.view==="files"?(Y=o`<${En} w=${x}/>`,Q=o`<${Wn} w=${x}/>`):h.view==="findings"?(Y=o`<${Un} w=${x}/>`,Q=o`<${qn} w=${x}/>`):(Y=o`<${gn} w=${x}/>`,Q=rt?o`<${Sn} w=${x} entry=${rt}/>`:_t==="aictl"&&B?o`<${Cn} w=${x} aictl=${B}/>`:o`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),o`<div class="st-ws" data-view=${h.view}>
    <div class="st-head">
      <${Vs} class="st-pivot" options=${ta} value=${h.view} ariaLabel="Settings view"
        onChange=${m=>C({view:m})}/>
      <label class="st-searchbox">
        <${St} name="search" size="14"/>
        <input ref=${ct} type="search" class="st-search" value=${O}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${m=>W(m.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(T?" is-on":"")} aria-pressed=${T?"true":"false"}
        onClick=${()=>mt(!T)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(N?" is-on":"")} aria-pressed=${N?"true":"false"}
        onClick=${()=>yt(!N)}>Only risky</button>
      ${Dt&&o`<button type="button" class=${"st-toggle"+(h.unset?" is-on":"")} aria-pressed=${h.unset?"true":"false"}
        onClick=${()=>C({unset:!h.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${w.length}</b> tools</span>
        <span><b>${z.length}</b> files</span>
        <span><b>${Rs}</b> settings</span>
        <span data-kpi="agents"><b>${js}</b> agents</span>
        ${Dt&&o`<span data-kpi="unset"><b>${Is}</b> unset</span>`}
        <span class=${Wt?"st-red":""}><b>${Wt}</b> risky</span>
        <span><b>${v.status==="loading"&&!v.audit?"…":kt.length}</b> findings</span>
      </div>
    </div>
    ${s&&o`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${Ds&&o`<div class="st-scope-empty"><${zs} enabledTools=${i} snap=${b} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${Y}</div>
      <div class="st-col st-col--main">${Q}</div>
      <${Zn} w=${x}/>
    </div>
  </div>`}export{na as auditState,ra as default};
