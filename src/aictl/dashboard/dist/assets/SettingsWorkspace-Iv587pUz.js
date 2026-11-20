import{c as e,i as t,l as n,n as r,o as i,p as a,t as o}from"./hooks.module-tDeaYiaE.js";import{$ as s,$t as c,A as l,B as u,C as d,D as f,Dn as p,E as m,En as ee,F as h,G as g,H as _,I as v,J as te,K as y,L as b,M as x,Mn as S,N as ne,Nn as C,O as w,P as T,Q as re,Qt as E,R as ie,S as D,T as ae,U as oe,V as se,W as ce,X as O,Xt as le,Y as ue,Yt as de,Z as fe,Zt as k,_ as A,a as pe,at as j,b as M,c as N,d as P,en as me,et as F,f as he,g as ge,h as _e,i as I,it as ve,j as ye,jn as be,k as L,kn as xe,l as Se,m as R,n as Ce,nn as we,nt as Te,o as Ee,p as z,q as De,r as Oe,rt as ke,s as Ae,t as je,tn as B,tt as Me,u as Ne,v as Pe,vt as V,w as H,x as U,y as Fe,z as Ie}from"./index-Dh5zLRcX.js";import{t as Le}from"./LoadedConfiguration-C1h60dZr.js";import{t as Re}from"./Icon-y3iKVXqH.js";import{i as ze,r as W,t as Be}from"./tableGrid-DqlH5O9W.js";function Ve({options:e=[],value:t,onChange:r,ariaLabel:i,class:a,className:s,...c}){let l=[`aictl-ui-segmented`,a,s].filter(Boolean).join(` `),u=o([]),d=n=>{if(!e.length)return;let i=Math.max(0,e.findIndex(e=>e.value===t)),a=null;n.key===`ArrowRight`||n.key===`ArrowDown`?a=(i+1)%e.length:n.key===`ArrowLeft`||n.key===`ArrowUp`?a=(i-1+e.length)%e.length:n.key===`Home`?a=0:n.key===`End`&&(a=e.length-1),a!=null&&(n.preventDefault(),r&&r(e[a].value),u.current[a]?.focus())};return n`<div
    class=${l}
    role="radiogroup"
    aria-label=${i||null}
    ...${c}
  >${e.map((e,i)=>{let a=e.value===t;return n`<button
      key=${e.value}
      ref=${e=>{u.current[i]=e}}
      type="button"
      class="aictl-ui-segmented__btn"
      role="radio"
      aria-checked=${a?`true`:`false`}
      tabindex=${a?`0`:`-1`}
      onClick=${()=>r&&r(e.value)}
      onKeyDown=${d}
    >${e.icon?n`<${Re} name=${e.icon} size="0.9em"/>`:null}${e.label}</button>`})}</div>`}function He({enabledTools:e,snap:t,what:r=`this screen`}){let i=k(e),a=E(e,t);return n`<div class="panel-state panel-state--empty" role="status" data-testid="tool-scope-empty">
    <${Re} name="filter" size="14"/>
    <div>
      <div class="panel-state__title">${i?`No tools are selected`:`The selected tools have no data here`}</div>
      <div class="panel-state__hint">${i?`The tool filter in the header has no tool ticked, so ${r} shows nothing. Tick a tool, or choose All tools.`:`${a.join(`, `)} ${a.length===1?`has`:`have`} nothing to show on ${r}. Tick more tools in the header filter, or choose All tools.`}</div>
    </div>
  </div>`}function Ue(e){return e==null?`—`:typeof e==`object`?JSON.stringify(e):String(e)}function G({value:e,compact:r}){let[i,a]=t(!1),o=Array.isArray(e),s=o?e.map((e,t)=>[t,e]):Object.entries(e||{}),c=s.length;if(!c)return n`<span class="st-none">none</span>`;let l=n`<span class="st-chip st-chip--mono st-items">${c} ${c===1?`item`:`items`}</span>`;return r?l:n`<span class="st-itemsbox">
    ${l}
    <button type="button" class="st-link" aria-expanded=${i?`true`:`false`}
      onClick=${e=>{e.stopPropagation(),a(!i)}}>${i?`hide`:`show`}</button>
    ${i&&n`<ul class="st-itemlist">
      ${s.map(([e,t])=>n`<li key=${e} class="st-mono" title=${o?Ue(t):`${e}: ${Ue(t)}`}>
        ${o?Ue(t):n`<span class="st-itemkey">${e}:</span> ${Ue(t)}`}</li>`)}
    </ul>`}
  </span>`}function K({row:e,value:t,compact:r=!1}){let i=t===void 0?e.value:t,a=e.kind||f(i),o=!!e.risky;if(a===`flag`||typeof i==`boolean`){if(i==null)return n`<span class="st-none">${`—`}</span>`;let e=ye(i);return n`<span class=${`st-flag`+(e?` is-on`:``)+(o?` is-risky`:``)}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${e?`on`:`off`}</span>
    </span>`}if(i==null||i===``)return n`<span class="st-none">${`—`}</span>`;if(a===`list`||a===`map`||typeof i==`object`)return n`<${G} value=${i} compact=${r}/>`;let s=String(i),c=u({...e,value:i});return c?n`<span class=${`st-select`+(o?` is-risky`:``)} title=${`Options: `+c.join(`, `)}>${s}</span>`:a===`path`?n`<span class="st-v st-path" title=${s}>${s}</span>`:n`<span class=${`st-v`+(o?` is-risky`:``)} title=${s}>${s}</span>`}function q({scope:e,locked:t=!1,label:r=``}){let i=e||`default`,a=n`<span class=${`st-chip st-scope st-scope--`+i.replace(/[^a-z-]/gi,``)+(t?` st-scope--locked`:``)}
    title=${t?`Set by ${r||i}; cannot be changed here`:void 0}>${i}${t?n`<span class="st-sr"> (locked)</span>`:``}</span>`;return t?n`<span class="st-scopewrap"><${We}/>${a}</span>`:a}function We({label:e=``}){return e?n`<span class="st-lock" role="img" aria-label=${e} title=${e}><${Re} name="lock" size="11"/></span>`:n`<span class="st-lock" aria-hidden="true"><${Re} name="lock" size="11"/></span>`}function J({id:e,big:t=!1}){return n`<span class=${`st-sw`+(t?` st-sw--big`:``)} aria-hidden="true"
    style=${{background:me[e]||`var(--st-fg2)`}}></span>`}function Ge({label:e}){return n`<span class="st-dot" role="img" aria-label=${e} title=${e}></span>`}function Y({children:e}){return n`<div class="st-nav__h">${e}</div>`}function X({id:e,label:t}){return n`<span class="st-chip st-toolchip"><${J} id=${e}/>${t}</span>`}function Ke({path:e,line:t,w:r,tool:i=``}){if(!e)return n`<span class="st-none">—</span>`;if(L(e)){let t=A(e);return t?n`<button type="button" class="st-src st-src--env" data-env=${t}
      title=${`Environment variable `+t+`: where it is set and what it drives`}
      onClick=${e=>{e.stopPropagation(),r.openEnv(t,i)}}><b>${t}</b></button>`:n`<span class="st-src st-src--env" title="An environment variable; this aictl version did not name it">environment</span>`}let a=e+(t>0?`:`+t:``);return n`<button type="button" class="st-src" title=${a}
    onClick=${n=>{n.stopPropagation(),r.openAt(e,t)}}>
    <b>${V(e)}</b>${t>0?`:`+t:``}</button>`}var qe=`aictl has no description for this key; the value is shown as found in the file`;function Je(){return n`<span class="st-chip st-chip--muted st-undoc" title=${qe}>undocumented</span>`}var Ye=(e,t,n)=>[t&&{k:`tool`,l:`Tool`,get:t=>e.labelOf(t.tool)},{k:`agent`,l:`Agent`,cls:`st-c-agent`,get:e=>nt(e)},{k:`model`,l:`Model`,get:e=>R(e)?void 0:String(e.value)},{k:`effort`,l:`Effort`,get:e=>e.agent?.effort},n&&{k:`context`,l:`Context`,get:e=>e.agent?.context_tier},{k:`tools`,l:`Tools`,n:!0,get:e=>e.agent?.tools?.length||void 0},{k:`defined`,l:`Defined in`,cls:`st-c-src`,get:e=>e.agent?.defined_in},{k:`pinned`,l:`Pinned in`,cls:`st-c-src`,get:e=>e.agent?.pinned_in}].filter(Boolean);function Xe(e,t){return`Set by ${O(e.scope,t.scopesOf(e.tool))}; cannot be changed here`}function Ze({row:e,w:t}){let r=e.agent,i=R(e);return n`<span class="st-agentmodel">
    ${e.locked&&n`<${We} label=${Xe(e,t)}/>`}
    ${i?n`<span class="st-inherit" title=${e.note||`Runs on the session model`}>inherits</span>`:n`<span class="st-v" title=${String(e.value)}>${String(e.value)}</span>`}
    ${r.model_policy===`required`&&n`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${se(e)&&n`<span class="st-badge st-badge--pin" title=${`A settings pin decides the model: `+r.pinned_in}>pinned</span>`}
  </span>`}function Qe({tools:e,all:t=!1}){if(!e||!e.length)return n`<span class="st-none" title="The agent file lists no tools">—</span>`;let r=t?e:e.slice(0,4),i=e.length-r.length;return n`<span class="st-tools">
    ${r.map(e=>n`<span key=${e} class="st-chip st-chip--mono" title=${e}>${e}</span>`)}
    ${i>0&&n`<span class="st-chip st-more-tools" title=${e.slice(r.length).join(`, `)}>+${i}</span>`}
  </span>`}function $e({row:e,w:t,withTool:r,withContext:i}){let a=e.agent,o=t.selected?.uid===e.uid,s=()=>t.select({tool:e.tool,row:e.key}),c=e=>Number(e)>0?Number(e):0;return n`<tr class=${`st-row st-agentrow`+(o?` is-sel`:``)} data-key=${e.key} data-tool=${e.tool}
    tabindex="0" onClick=${s}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),s())}}>
    ${r&&n`<td class="st-c-tool"><span class="st-matrix__toolname"><${J} id=${e.tool}/>${t.labelOf(e.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${a.name||e.label}</div>
      ${a.description&&n`<div class="st-agentdesc" title=${a.description}>${a.description}</div>`}
    </td>
    <td class="st-c-model"><${Ze} row=${e} w=${t}/></td>
    <td class="st-mono">${a.effort||n`<span class="st-none">—</span>`}</td>
    ${i&&n`<td class="st-mono">${a.context_tier||n`<span class="st-none">—</span>`}</td>`}
    <td><${Qe} tools=${a.tools}/></td>
    <td class="st-c-src"><${Ke} path=${a.defined_in} line=${c(a.defined_line)} w=${t}/></td>
    <td class="st-c-src"><${Ke} path=${a.pinned_in} line=${c(a.pinned_line)} w=${t}/></td>
  </tr>`}function et({w:e,section:t}){let r=t.shown,i=r.filter(R).length,a=W(`settings.agents`,Ye(e,!1,!0)),o=Ye(e,!1,!0);return n`<table class=${`st-table st-agents `+a.tableProps.class} style=${a.tableProps.style} data-section="agents">
    <thead><tr>${o.map(a.th)}</tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${t.title}
        <span class="st-group__meta">${r.length}${i?` · ${i} inherit the session model`:``}</span></th></tr>
      ${a.order(r).map(t=>n`<${$e} key=${t.uid} row=${t} w=${e} withContext/>`)}
    </tbody>
  </table>`}var tt={tool:e=>(t,n)=>e.labelOf(t.tool).localeCompare(e.labelOf(n.tool))||nt(t).localeCompare(nt(n)),agent:e=>(t,n)=>nt(t).localeCompare(nt(n))||e.labelOf(t.tool).localeCompare(e.labelOf(n.tool)),model:e=>(t,n)=>rt(t).localeCompare(rt(n))||tt.tool(e)(t,n)};function nt(e){return String(e.agent?.name||e.label||``)}function rt(e){return R(e)?`￿`:String(e.value)}function it(e,t,n){return[...e].sort((tt[t]||tt.tool)(n))}function at({w:e,rows:t,sort:r}){let i=Ye(e,!0,!1),a=W(`settings.agents.all`,i),o=a.order(it(t,r,e));return n`<div class="st-scroll"><table class=${`st-table st-agents st-agents--all `+a.tableProps.class} style=${a.tableProps.style}>
    <thead><tr>${i.map(a.th)}</tr></thead>
    <tbody>${o.map(t=>n`<${$e} key=${t.uid} row=${t} w=${e} withTool/>`)}</tbody>
  </table></div>`}var ot=[{id:`mcp`,label:`MCP`},{id:`read`,label:`Read files`},{id:`write`,label:`Write files`},{id:`shell`,label:`Shell`},{id:`web`,label:`Web`}],st={allowed:`allow`,asks:`ask`,denied:`deny`},ct={denied:3,asks:2,allowed:1},lt=(e,t,n=``)=>Object.fromEntries(ot.map(r=>[r.id,{state:e,why:t,key:n}]));function ut(e){let t=String(e||``).split(`.`);return t[t.length-1]}function dt(e){let t=new Map;for(let n of e?.rows||[])t.has(n.key)||t.set(n.key,n);return t}var Z=e=>e&&e.value!==null&&e.value!==void 0&&e.value!==``?e.value:void 0,ft=e=>Array.isArray(e)?e.filter(e=>typeof e==`string`&&e):[];function pt(e){let t=/^\s*([^()\s]+)\s*(?:\((.*)\))?\s*$/.exec(String(e));return t?{name:t[1].toLowerCase(),spec:t[2]===void 0?null:t[2].trim()}:{name:String(e).toLowerCase(),spec:null}}var mt=new Set([``,`*`,`:*`,`**`]),ht={read:[`read`,`glob`,`grep`,`ls`,`notebookread`],write:[`write`,`edit`,`multiedit`,`notebookedit`],shell:[`bash`,`powershell`],web:[`webfetch`,`websearch`]};function gt(e){if(e===`mcp`||e.startsWith(`mcp__`))return`mcp`;for(let[t,n]of Object.entries(ht))if(n.includes(e))return t;return``}function _t(e,t){return e.startsWith(`mcp__`)?e===`mcp__*`:t===null||mt.has(t)}function vt(e,t){let n=[],r=(e,r,i,a)=>{let o={allow:`allowed`,deny:`denied`,ask:`asks`}[e],s=e+``+r,c=i?O(i,t):``,l=n.find(e=>e.id===s);if(l){c&&!l.where.includes(c)&&l.where.push(c);return}let{name:u,spec:d}=pt(r);n.push({id:s,rule:r,effect:o,cap:gt(u),whole:_t(u,d),where:c?[c]:[],key:a})},i=(e,t,n)=>{if(e&&typeof e==`object`&&!Array.isArray(e))for(let i of[`allow`,`deny`,`ask`])for(let a of ft(e[i]))r(i,a,t,n)},a=e.get(`permissions`);if(a){let e=(a.chain||[]).filter(e=>e&&e.value&&typeof e.value==`object`&&e.set!==!1);if(e.length)for(let t of e)i(t.value,t.scope,`permissions`);else i(Z(a),a.scope,`permissions`)}for(let t of[`allow`,`deny`,`ask`]){let n=e.get(`permissions.`+t);for(let e of ft(Z(n)))r(t,e,n.scope,n.key)}return n}var yt={shell:`shell`,write:`write`,read:`read`,url:`web`,fetch:`web`,web_fetch:`web`};function bt(e){let t=[];for(let n of[`allow`,`deny`,`ask`]){let r=e.get(`permissions.`+n);for(let e of ft(Z(r))){let{name:i,spec:a}=pt(e);t.push({rule:e,effect:{allow:`allowed`,deny:`denied`,ask:`asks`}[n],cap:yt[i]||`mcp`,whole:a===null||mt.has(a),where:r.scope?[O(r.scope)]:[],key:r.key})}}return t}function xt(e){let t=[];for(let n of e.values()){let e=Z(n);if(!e||typeof e!=`object`||Array.isArray(e))continue;let r=n.key,i=``;if(/(^|\.)urls\.autoApprove$/.test(r)?i=`web`:/(^|\.)edits\.autoApprove$/.test(r)?i=`write`:(r===`autoApprove`||/(^|\.)terminal\.autoApprove$/.test(r))&&(i=`shell`),i)for(let[a,o]of Object.entries(e)){let e;if(i===`web`?e=o===!0||o?.approveRequest===!0?`allowed`:`asks`:i===`write`?e=o===!1?`asks`:`allowed`:o===!0||o?.approve===!0?e=`allowed`:(o===!1||o?.approve===!1)&&(e=`denied`),!e)continue;let s=i===`write`?a===`**/*`||a===`**`:!1;t.push({rule:a,effect:e,cap:i,whole:s,where:n.scope?[O(n.scope)]:[],key:r})}}return t}var St={read:[`read_file`,`read_many_files`,`glob`,`grep`,`search_file_content`,`list_directory`,`readfiletool`,`readmanyfilestool`,`globtool`,`greptool`,`lstool`],write:[`write_file`,`replace`,`edit`,`writefiletool`,`edittool`],shell:[`run_shell_command`,`shelltool`],web:[`web_fetch`,`google_web_search`,`webfetchtool`,`websearchtool`]};function Ct(e){let t=[];for(let[n,r]of[[`tools.allowed`,`allowed`],[`tools.exclude`,`denied`]]){let i=e.get(n);for(let e of ft(Z(i))){let{name:a,spec:o}=pt(e),s=Object.entries(St).find(([,e])=>e.includes(a))?.[0]||``;!s&&a.includes(`__`)&&(s=`mcp`),s&&t.push({rule:e,effect:r,cap:s,whole:o===null,where:i.scope?[O(i.scope)]:[],key:n})}}return t}function wt(e){let t=e.get(`permissions.defaultMode`),n=Z(t)??`default`,r=t&&Z(t)!==void 0?t.key:``,i=`default mode ${n}`;if(n===`bypassPermissions`)return lt(`allowed`,i+`: no permission prompts`,r);let a={mcp:{state:`asks`,why:`Claude Code asks before an MCP tool runs`,key:r},read:{state:`allowed`,why:`Claude Code reads files without asking`,key:r},write:{state:`asks`,why:`Claude Code asks before it edits a file`,key:r},shell:{state:`asks`,why:`Claude Code asks before it runs a command`,key:r},web:{state:`asks`,why:`Claude Code asks before it fetches a URL`,key:r}};if(n===`acceptEdits`&&(a.write={state:`allowed`,why:i+`: edits apply without asking`,key:r}),n===`plan`&&(a.write={state:`denied`,why:i+`: read-only, no edits`,key:r},a.shell={state:`denied`,why:i+`: read-only, no commands that change anything`,key:r}),n===`dontAsk`)for(let e of[`mcp`,`write`,`shell`,`web`])a[e]={state:`denied`,why:i+`: anything not allowed by a rule is refused`,key:r};return a}function Tt(e){let t=e.get(`defaultPermissionMode`),n=Z(t)??`manual`,r=t&&Z(t)!==void 0?t.key:``;if(n===`allow-all`)return lt(`allowed`,`defaultPermissionMode allow-all: every tool call is allowed`,r);let i=n===`assisted`?`asks; in assisted mode a model answers the request`:`asks before it runs`;return{mcp:{state:`asks`,why:`an MCP tool `+i,key:r},read:{state:`allowed`,why:`reads in trusted folders run without asking`,key:r},write:{state:`asks`,why:`a file write `+i,key:r},shell:{state:`asks`,why:`a shell command `+i,key:r},web:{state:`asks`,why:`a URL fetch `+i,key:r}}}function Et(e){for(let t of e.values()){let e=Z(t);if((ut(t.key)===`globalAutoApprove`||t.key===`chat.tools.global.autoApprove`)&&e===!0)return lt(`allowed`,t.label+` is on: every tool call runs without asking`,t.key);if(t.key===`skipPermissions`&&e===!0)return lt(`allowed`,t.label+` is on: no permission checks`,t.key);if(t.key===`chat.permissions.default`&&[`autoApprove`,`autopilot`,`bypass`].includes(e))return lt(`allowed`,`chat.permissions.default ${e}: sessions start without approval prompts`,t.key)}return{mcp:{state:`asks`,why:`VS Code asks before an MCP tool runs`},read:{state:`allowed`,why:`VS Code reads workspace files without asking`},write:{state:`allowed`,why:`VS Code applies edits in the workspace without asking`},shell:{state:`asks`,why:`VS Code asks before a terminal command runs`},web:{state:`asks`,why:`VS Code asks before it fetches a URL`}}}function Dt(e){let t=e.get(`approval_policy`),n=e.get(`sandbox_mode`),r=Z(e.get(`sandbox_workspace_write.network_access`))===!0,i=Z(t);i&&typeof i==`object`&&(i=`granular`),i||=`on-request`;let a=Z(n)||`read-only`,o=t&&Z(t)!==void 0?t.key:``,s=n&&Z(n)!==void 0?n.key:``,c=`approval_policy ${i}${Z(t)===void 0?` (not set)`:``}`,l=`sandbox_mode ${a}${Z(n)===void 0?` (not set)`:``}`,u=i===`never`,d=a===`danger-full-access`,f=d?{state:`allowed`,why:l+`: no sandbox`}:a===`workspace-write`?{state:`allowed`,why:l+`: writes in the workspace run without asking`}:u?{state:`denied`,why:`${l}, ${c}: no writes and no way to ask`}:{state:`asks`,why:`${l}: a write needs your approval`},p=u?{state:`allowed`,why:c+`: commands never ask`}:i===`untrusted`?{state:`asks`,why:c+`: commands outside the trusted set ask`}:{state:`allowed`,why:`${c}: commands run in the sandbox (${a}) and ask to leave it`},m=d||a===`workspace-write`&&r?{state:`allowed`,why:d?l+`: network open`:`sandbox_workspace_write.network_access is on`}:u?{state:`denied`,why:`${l}, ${c}: no network and no way to ask`}:{state:`asks`,why:`${l}: network access needs your approval`};return{mcp:{state:u?`allowed`:`asks`,why:u?c+`: MCP tools never ask`:c+`: MCP tool calls ask`,key:o},read:{state:`allowed`,why:l+`: reads are allowed`,key:s},write:{...f,key:s||o},shell:{...p,key:o||s},web:{...m,key:s||o}}}function Ot(e){let t=e.get(`general.defaultApprovalMode`)||e.get(`approvalMode`)||e.get(`approval_mode`)||e.get(`general.approvalMode`),n=Z(t)??`default`,r=t&&Z(t)!==void 0?t.key:``,i=`approval mode `+n;if(n===`yolo`)return lt(`allowed`,i+`: every tool call runs without asking`,r);let a={mcp:{state:`asks`,why:i+`: MCP tools ask`,key:r},read:{state:`allowed`,why:`reads run without asking`,key:r},write:{state:`asks`,why:i+`: edits ask`,key:r},shell:{state:`asks`,why:i+`: shell commands ask`,key:r},web:{state:`asks`,why:i+`: web fetches ask`,key:r}};return n===`auto_edit`&&(a.write={state:`allowed`,why:i+`: edits run without asking`,key:r}),n===`plan`&&(a.write={state:`denied`,why:i+`: read-only`,key:r},a.shell={state:`denied`,why:i+`: read-only`,key:r}),a}var kt=(e,t)=>[...e.keys()].some(e=>t.test(e)),At=[{id:`claude`,tools:[`claude-code`],applies:e=>kt(e,/^permissions(\.(allow|deny|ask|defaultMode))?$/),base:wt,rules:vt,wholeName:`the whole tool`},{id:`copilot-cli`,tools:[`copilot-cli`,`copilot-desktop`],applies:e=>kt(e,/^(defaultPermissionMode|savedToolApprovals|permissions\.(allow|deny|ask))$/),base:Tt,rules:bt,notes:e=>{let t=Z(e.get(`savedToolApprovals`));if(!t||typeof t!=`object`)return[];let n=Object.values(t).reduce((e,t)=>e+(Number(t)||0),0),r=Object.keys(t).length;return n?[`${n} saved tool ${n===1?`approval`:`approvals`} in ${r} ${r===1?`folder`:`folders`} (permissions-config.json)`]:[]}},{id:`vscode`,tools:[`vscode`,`copilot`],applies:e=>kt(e,/(autoApprove|^chat\.permissions\.default$|^skipPermissions$)/i),base:Et,rules:xt},{id:`codex`,tools:[`codex-cli`,`codex`],applies:e=>kt(e,/^(approval_policy|sandbox_mode)$/),base:Dt,rules:()=>[]},{id:`gemini`,tools:[`gemini-cli`,`gemini`],applies:e=>kt(e,/(^|\.)(defaultApprovalMode|approvalMode|approval_mode)$|^tools\.(allowed|exclude)$/),base:Ot,rules:Ct}];function jt(e,t){return e===`mixed`?`mixed (${t} ${t===1?`rule`:`rules`})`:e}function Mt(e){return`${st[e.effect]} ${e.rule}${e.where.length?` (`+e.where.join(`, `)+`)`:``}`}function Nt(e,t,n){let r=n.filter(t=>t.cap===e.id),i=r.filter(e=>e.whole),a=t.state,o=t.why;if(i.length){let e=i.reduce((e,t)=>ct[t.effect]>ct[e.effect]?t:e);a=e.effect,o=`rule `+Mt(e)}let s=r.some(e=>!e.whole&&e.effect!==a),c=s?`mixed`:a,l=jt(c,r.length),u=[`${e.label}: ${l}`];return!r.length||!i.length?u.push(`Without a rule: `+t.state+` (`+t.why+`)`):u.push((s?`For the whole tool: `:`Decided by: `)+a+` (`+o+`)`),r.length&&u.push(...r.map(e=>`• `+Mt(e))),{cap:e.id,label:e.label,state:c,text:l,title:u.join(`
`),rules:r.map(e=>({rule:e.rule,effect:e.effect,where:e.where})),key:r[0]?.key||t.key||``}}function Pt(e){if(!e)return null;let t=At.find(t=>t.tools.includes(e.id));if(!t)return null;let n=dt(e);if(!t.applies(n))return null;let r=t.base(n),i=t.rules(n,e.scopes||[]);return{tool:e.id,cells:ot.map(e=>Nt(e,r[e.id],i)),notes:t.notes?t.notes(n):[]}}function Ft(e){return(e||[]).map(e=>({entry:e,perms:Pt(e)})).filter(e=>e.perms)}var It=[`project`,`project-local`],Lt=new Set([`permissions`,`permissions.allow`,`permissions.deny`,`permissions.ask`,`project_permissions`]),Rt=`No form for this value. Open the file and use Edit file`;function zt(e){return!!e&&e.tool===`claude-code`&&Lt.has(e.key)}function Bt(e){return e?.chain?.[e.wins]?.scope||e?.scope||`default`}function Vt(e,t=[]){let n=e?.chain?.[e.wins];if(e?.locked||l(n,t))return{ok:!1,hint:`Locked by `+O(e.locked?e.scope:n.scope,t)};if(!zt(e))return{ok:!1,hint:Rt};let r=Bt(e);if(!It.includes(r))return{ok:!1,hint:`The value comes from ${O(r,t)}. Project and Project local permissions have a form here; for another file, open it and use Edit file.`};let i=(t||[]).find(e=>e.id===r);return{ok:!0,scope:r,label:O(r,t),path:n&&n.source||i?.path||``}}var Ht=e=>(e||[]).join(`
`),Ut=e=>String(e||``).split(`
`).map(e=>e.trim()).filter(Boolean);function Wt(e,t){let n=new Set(e||[]),r=new Set(t||[]);return{added:[...r].filter(e=>!n.has(e)),removed:[...n].filter(e=>!r.has(e))}}function Gt({cell:e,onPick:t}){let r=e.key&&t?()=>t(e.key):null;return n`<td class=${`st-perm st-perm--`+e.state} data-cap=${e.cap} data-state=${e.state} title=${e.title}>
    ${r?n`<button type="button" class="st-perm__btn" aria-label=${`${e.label}: ${e.text}`} onClick=${r}>${e.text}</button>`:n`<span class="st-perm__text">${e.text}</span>`}
  </td>`}var Kt=(e,t)=>[...e?[{k:`tool`,l:e,get:t?e=>e.entry.label:void 0}]:[],...ot.map(e=>({k:e.id,l:e.label,attrs:{"data-cap":e.id},get:t?t=>t.perms.cells.find(t=>t.cap===e.id)?.text:void 0}))];function qt({w:e,entry:t,perms:r}){let i=n=>e.select({tool:t.id,row:n}),a=Kt(``,!1),o=W(`settings.perms`,a);return n`<div class="st-perms" data-testid="st-perms" data-tool=${t.id}>
    <table class=${`st-permtable `+o.tableProps.class} style=${o.tableProps.style}>
      <caption class="st-perms__cap">What the agent can do without asking</caption>
      <thead><tr>${a.map(o.th)}</tr></thead>
      <tbody><tr>${r.cells.map(e=>n`<${Gt} key=${e.cap} cell=${e} onPick=${i}/>`)}</tr></tbody>
    </table>
    ${r.notes.map((e,t)=>n`<p key=${t} class="st-hint st-perms__note">${e}</p>`)}
  </div>`}function Jt({w:e,mats:t}){let r=Kt(`Tool`,!0),i=W(`settings.perms.all`,r);return t.length?n`<div class="st-perms st-perms--topic" data-testid="st-perms-topic">
    <div class="st-scroll"><table class=${`st-permtable `+i.tableProps.class} style=${i.tableProps.style}>
      <caption class="st-perms__cap">What each tool's agent can do without asking</caption>
      <thead><tr>${r.map(i.th)}</tr></thead>
      <tbody>
        ${i.order(t).map(({entry:t,perms:r})=>n`<tr key=${t.id} data-tool=${t.id}>
          <th scope="row" class="st-perms__tool"><span class="st-matrix__toolname"><${J} id=${t.id}/>${t.label}</span></th>
          ${r.cells.map(r=>n`<${Gt} key=${r.cap} cell=${r} onPick=${n=>e.select({tool:t.id,row:n})}/>`)}
        </tr>`)}
      </tbody>
    </table></div>
    ${t.flatMap(({entry:e,perms:t})=>t.notes.map((t,r)=>n`<p key=${e.id+r} class="st-hint st-perms__note">${e.label}: ${t}</p>`))}
  </div>`:null}var Yt={copilot:`copilot-vscode`,vscode:`copilot-vscode`};function Xt(e,t){let n=e?.tools;return!n||typeof n!=`object`?null:n[t]||n[Yt[t]]||null}function Zt(e){return{active:`active`,configured:`configured`,disabled:`host-disabled`,misconfigured:`wrong port`,observed:`observed`,missing:`missing`}[e]||e||`unknown`}function Qt(e){let t=e?.message||``;return t.includes(`~/.copilot/hooks`)?`"chat.hookFilesLocations": { "~/.copilot/hooks": true }`:t.includes(`.github/hooks`)?`"chat.hookFilesLocations": { ".github/hooks": true }`:t.includes(`chat.useHooks`)?`"chat.useHooks": true`:``}var $t={active:`is-ok`,configured:`is-ok`,disabled:`is-warn`,misconfigured:`is-warn`,missing:`is-warn`};function en({status:e}){let t=e.configured_events||[],r=e.missing_events||[],i=e.sources||[],a=e.warnings||[];return n`<div class="st-hookstat" data-testid="st-hookstat">
    <div class="st-hookstat__head">
      <span class=${`st-status `+($t[e.status]||``)} data-testid="st-hookstat-status"
        title=${e.status===`misconfigured`?`The hook commands post to a different port than this dashboard`:void 0}>${Zt(e.status)}</span>
      <span>${e.configured_count||t.length} configured</span>
      ${r.length>0&&n`<span class="st-warn" title=${r.join(`, `)}>${r.length} missing: ${r.join(`, `)}</span>`}
      <span>${e.fired_24h||0} fired in 24 h</span>
      <span title=${e.last_fire_ts?new Date(e.last_fire_ts*1e3).toLocaleString():void 0}>last ${e.last_fire_ts?B(e.last_fire_ts):`never`}</span>
    </div>
    <div class="st-tools st-hookstat__events">
      ${t.length?t.map(e=>n`<span key=${e} class="st-chip st-chip--mono st-hookstat__ev">${e}</span>`):n`<span class="st-dim">No aictl hooks configured</span>`}
    </div>
    ${i.length>0&&n`<ul class="st-hookstat__sources">
      ${i.map(e=>n`<li key=${e.path} title=${e.path}>
        <span class="st-mono">${e.scope}</span>
        <span>${e.configured_count||0} ${e.configured_count===1?`event`:`events`}</span>
        <span class=${e.host_enabled===!1?`st-warn`:`st-dim`}>${e.host_enabled===!1?`ignored by the host`:`loaded`}</span>
      </li>`)}
    </ul>`}
    ${a.map(e=>{let t=Qt(e);return n`<div key=${(e.path||``)+e.message} class="st-hookstat__warn" role="note">
        ${e.message}${t&&n`<code class="st-hookstat__snippet">${t}</code>`}
      </div>`})}
  </div>`}function tn(e,t){let n=V(e);if(t.filter(e=>V(e)===n).length<2)return n;let r=String(e).split(/[\\/]/).filter(Boolean);return r.length<2?n:(/^(Users|home)$/.test(r[0])&&r.length===4?`~/`:``)+r[r.length-2]+`/`+n}function nn({w:e}){let{entries:t,aictl:r,st:i}=e;return n`<nav class="st-nav" aria-label="Tools">
    <${Y}>Tools</${Y}>
    <ul class="st-nav__list">
      ${t.map(t=>{let r=t.id===e.toolId,a=t.rows.filter(r?e.passTool:e.pass),o=a.some(e=>e.risky);return n`<li key=${t.id}>
          <button type="button" class=${`st-nav__item`+(r?` is-on`:``)+(a.length?``:` is-empty`)}
            aria-current=${r?`true`:void 0} data-tool=${t.id}
            onClick=${()=>e.set({tool:t.id,sec:``,row:``,scope:r?e.st.scope:``})}>
            <${J} id=${t.id}/><span class="st-nav__label">${t.label}</span>
            ${o&&n`<${Ge} label="A risky setting is on"/>`}
            <span class="st-nav__n">${a.length}</span>
          </button>
          ${r&&n`<ul class="st-nav__subs">
            ${t.sections.map(t=>{let r=t.rows.filter(e.passTool),a=i.sec===t.id,o=t.id===`agents`?ge(r):``;return n`<li key=${t.id}><button type="button" class=${`st-nav__sub`+(a?` is-on`:``)}
                aria-current=${a?`true`:void 0}
                onClick=${()=>e.set({sec:a?``:t.id})}>
                <span class="st-nav__label">${t.title}</span>
                ${r.some(e=>e.risky)&&n`<${Ge} label="A risky setting is on"/>`}
                <span class="st-nav__n">${r.length}</span>
                ${o&&n`<span class="st-nav__model" title=${`Every agent runs on `+o}>${o}</span>`}
              </button></li>`})}
            ${t.envVars.length>0&&(()=>{let r=i.sec===`env`,a=t.envVars.filter(t=>t.set&&v(t,e.q)).length;return n`<li key="env"><button type="button" class=${`st-nav__sub`+(r?` is-on`:``)}
                aria-current=${r?`true`:void 0} data-sec="env"
                onClick=${()=>e.set({sec:r?``:`env`})}>
                <span class="st-nav__label">Environment variables</span>
                <span class="st-nav__n">${a}</span>
              </button></li>`})()}
          </ul>`}
        </li>`})}
      ${r&&n`<li key="aictl">
        <button type="button" class=${`st-nav__item`+(e.toolId===`aictl`?` is-on`:``)}
          aria-current=${e.toolId===`aictl`?`true`:void 0} data-tool="aictl"
          onClick=${()=>e.set({tool:`aictl`,sec:``,row:``,scope:``})}>
          <${J} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${r.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function rn({row:e,w:t,scopes:r}){let i=t.selected?.uid===e.uid,a=()=>t.select({tool:e.tool,row:e.key});return n`<tr class=${`st-row`+(e.risky?` st-row--risky`:``)+(e.unset?` st-row--unset`:``)+(i?` is-sel`:``)}
    data-key=${e.key} tabindex="0" onClick=${a}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),a())}}>
    <td class="st-c-set">
      <div class="st-label">${e.label}${e.undocumented&&n` <${Je}/>`}</div>
      ${e.risky&&e.tip&&n`<div class="st-risknote">${e.tip}</div>`}
    </td>
    <td class="st-c-val"><${K} row=${e}/></td>
    <td class="st-c-scope"><${q} scope=${e.scope} locked=${e.locked} label=${O(e.scope,r)}/></td>
    <td class="st-c-src"><${Ke} path=${e.source} line=${e.line} w=${t} tool=${e.tool}/></td>
    <td class="st-c-what" title=${e.tip||void 0}>${e.tip}</td>
  </tr>`}function an({w:e,entry:t}){let r=t.scopes||[];if(!r.length)return null;let i=t.rows.filter(e.pass);return n`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${r.map((t,r)=>{let a=i.filter(e=>e.scope===t.id).length,o=e.st.scope===t.id,s=t.path?V(t.path):``,c=t.vars||[],l=c.length?c.slice(0,2).join(`, `)+(c.length>2?` +${c.length-2}`:``):s||t.note,u=[t.label,t.paths.length?t.paths.join(`
`):``,c.length?`Set: `+c.join(`, `):``,t.exists?``:`not present`,t.note,t.changeable?``:`Locked: cannot be changed from this machine`].filter(Boolean).join(`
`);return n`<li key=${t.id} class="st-scopes__item">
          ${r>0&&n`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${`st-scopechip`+(o?` is-on`:``)+(t.changeable?``:` is-locked`)+(t.exists?``:` is-absent`)}
            data-scope=${t.id} aria-pressed=${o?`true`:`false`} title=${u}
            onClick=${()=>e.set({scope:o?``:t.id})}>
            <span class="st-scopechip__top">
              ${!t.changeable&&n`<${We}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${t.label}</span>
              <span class="st-scopechip__n">${a}<span class="st-sr"> ${a===1?`setting wins`:`settings win`} here</span></span>
            </span>
            <span class=${`st-scopechip__file`+(c.length?` st-mono`:``)} data-vars=${c.length?c.join(`,`):void 0}>${t.exists?l:t.id===`env`?`none set`:`not present`}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function on({children:e,section:t}){return n`<tr class="st-extra" data-extra=${t}><td colspan="5">${e}</td></tr>`}var sn=e=>typeof e.value==`number`?e.value:e.value==null||e.value===``?void 0:_(e.value);function cn(e,t){return[{k:`setting`,l:`Setting`,cls:`st-c-set`,get:e=>e.label},{k:`value`,l:`Value`,cls:`st-c-val`,n:Be(e,sn),get:sn},{k:`scope`,l:`Scope`,cls:`st-c-scope`,get:e=>e.scope?O(e.scope,t):void 0},{k:`source`,l:`Set in`,cls:`st-c-src`,get:e=>e.source},{k:`what`,l:`What it does`,get:e=>e.tip}]}function ln({w:e,sections:t,scopes:r,shared:i,extras:a={}}){let o=cn(t.flatMap(e=>e.shown),r),s=W(`settings.tool`,o,i);return n`<table class=${`st-table `+s.tableProps.class} style=${s.tableProps.style}>
    <thead><tr>${o.map(s.th)}</tr></thead>
    ${t.map(t=>{let i=t.shown.filter(e=>e.risky).length;return n`<tbody key=${t.id} data-section=${t.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${t.title}
          <span class="st-group__meta">${t.shown.length}${i?n` · <span class="st-red">${i} risky</span>`:``}${t.hidden?n` · <span class="st-unsetn">+${t.hidden} unset</span>`:``}</span></th></tr>
        ${a[t.id]&&n`<${on} section=${t.id}>${a[t.id]}</${on}>`}
        ${s.order(t.shown).map(t=>n`<${rn} key=${t.uid} row=${t} w=${e} scopes=${r}/>`)}
      </tbody>`})}
  </table>`}function un(e){let t=[];for(let n of e){let e=n.id===`agents`&&n.shown.every(e=>e.kind===`agent`&&e.agent),r=t[t.length-1];e?t.push({agents:!0,sections:[n]}):r&&!r.agents?r.sections.push(n):t.push({agents:!1,sections:[n]})}return t}function dn({w:e,entry:t}){let r=t.envVars.filter(t=>v(t,e.q)),i=r.filter(e=>e.set),a=e.showUnset?r:i,o=r.length-a.length;if(!a.length&&!o)return null;let s=e.selectedEnv;return n`<table class="st-table st-envtable" data-testid="st-env-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Where</th><th>Drives</th><th>What it does</th></tr></thead>
    <tbody data-section="env">
      <tr class="st-group"><th scope="colgroup" colspan="5">Environment variables
        <span class="st-group__meta">${i.length} set${o?n` · <span class="st-unsetn">+${o} unset</span>`:``}</span></th></tr>
      ${a.map(r=>{let i=()=>e.openEnv(r.name,t.id);return n`<tr key=${r.name} class=${`st-row`+(r.set?``:` st-row--unset`)+(s&&s.uid===r.uid?` is-sel`:``)}
          data-env=${r.name} tabindex="0" onClick=${i}
          onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),i())}}>
          <td class="st-c-set"><div class="st-label st-mono">${r.name}</div>${!r.documented&&n` <${Je}/>`}</td>
          <td class="st-c-val">${r.set?r.masked?n`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:n`<span class="st-v st-mono" title=${r.value}>${r.value===``?`(empty)`:r.value}</span>`:n`<span class="st-none">not set</span>`}</td>
          <td class="st-c-src st-mono">${Fe(r)||n`<span class="st-none">—</span>`}</td>
          <td>${r.drives.length?r.drives.map(e=>e.label).join(`, `):n`<span class="st-none">—</span>`}</td>
          <td class="st-c-what" title=${r.description||void 0}>${r.description}</td>
        </tr>`})}
    </tbody>
  </table>`}function fn({w:e,entry:t}){let r=ze(`settings.tool`),i=(!e.st.sec||e.st.sec===`env`)&&(!e.st.scope||e.st.scope===`env`),a=i&&t.envVars.some(t=>(t.set||e.showUnset)&&v(t,e.q)),o=t.sections.filter(t=>!e.st.sec||t.id===e.st.sec).map(t=>({...t,shown:t.rows.filter(e.passTool),hidden:e.showUnset?0:t.rows.filter(t=>t.unset&&e.passAll(t)&&(!e.st.scope||t.scope===e.st.scope)).length})).filter(e=>e.shown.length||e.hidden),s=t.rows.length,c=Pt(t),l=Xt(e.hooks,t.id),u={autonomy:c&&n`<${qt} w=${e} entry=${t} perms=${c}/>`,hooks:l&&n`<${en} status=${l}/>`},d=e.st.scope?O(e.st.scope,t.scopes):``;return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${J} id=${t.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${t.label}</h2>
      <span class="st-bar__sub">${s} ${s===1?`setting`:`settings`} in ${t.files.length} ${t.files.length===1?`file`:`files`}${t.envUsed.length?` and ${t.envUsed.length} ${t.envUsed.length===1?`variable`:`variables`}`:``}${t.risky?n` · <span class="st-red">${t.risky} risky</span>`:``}</span>
      <span class="st-bar__files">
        ${t.files.map(r=>n`<button type="button" key=${r} class="st-chip st-chip--mono st-chip--btn" title=${r}
          onClick=${()=>e.openAt(r)}>${tn(r,t.files)}</button>`)}
        ${t.envUsed.map(r=>n`<button type="button" key=${`env:`+r.name} class="st-chip st-chip--mono st-chip--btn st-chip--env"
          data-env=${r.name} title=${`Environment variable `+r.name+(r.drives.length?`: sets `+r.drives.map(e=>e.label).join(`, `):``)}
          onClick=${()=>e.openEnv(r.name,t.id)}><span class="st-chip__pre" aria-hidden="true">$</span>${r.name}</button>`)}
      </span>
    </div>
    ${t.id===`vscode`&&n`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${t.hints.map((e,t)=>n`<p key=${t} class="st-note">${e}</p>`)}
    <${an} w=${e} entry=${t}/>
    ${o.length?un(o).map((i,a)=>i.agents?n`<${et} key=${`a`+a} w=${e} section=${i.sections[0]}/>`:n`<${ln} key=${`g`+a} w=${e} sections=${i.sections} scopes=${t.scopes} shared=${r} extras=${u}/>`):a?null:n`<p class="st-empty">${s?d?`No setting shown here is set at the ${d} layer.`:`No setting matches the search or the toggles.`:`No settings were read for this tool.`}</p>`}
    ${i&&n`<${dn} w=${e} entry=${t}/>`}
  </section>`}var pn=[{k:`collector`,l:`Collector`,cls:`st-c-set`,get:e=>e.name},{k:`mode`,l:`Mode`,get:e=>e.mode},{k:`status`,l:`Status`,get:e=>e.status},{k:`detail`,l:`Detail`,get:e=>e.detail}];function mn({w:e,aictl:t}){let r=W(`settings.collectors`,pn),i=e.q.trim().toLowerCase(),a=t.collectors.filter(e=>!i||[e.name,e.mode,e.status,e.detail].join(` `).toLowerCase().includes(i)),o=t.roots.filter(e=>!i||e.toLowerCase().includes(i));return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${J} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${t.collectors.length} collectors · ${t.roots.length} monitored roots</span>
    </div>
    ${a.length>0&&n`<table class=${`st-table `+r.tableProps.class} style=${r.tableProps.style}>
      <thead><tr>${pn.map(r.th)}</tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${a.length}</span></th></tr>
        ${r.order(a).map(e=>n`<tr key=${e.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${e.name}</td>
          <td class="st-mono">${e.mode||`—`}</td>
          <td><span class=${`st-status `+(e.status===`active`?`is-ok`:`is-warn`)}>${e.status}</span></td>
          <td class="st-c-what" title=${e.detail||void 0}>${e.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${o.length>0&&n`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${o.map((e,t)=>n`<li key=${t} class="st-mono" title=${e}>${e}</li>`)}</ul>`}
    ${!a.length&&!o.length&&n`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function hn(e){if(e.st.sec&&Ne.includes(e.st.sec))return e.st.sec;let t=t=>e.entries.some(e=>e.rows.some(e=>e.sec===t));return t(`autonomy`)?`autonomy`:Ne.find(t)||`autonomy`}function gn({w:e}){let t=hn(e);return n`<nav class="st-nav" aria-label="Topics">
    <${Y}>Topics</${Y}>
    <ul class="st-nav__list">
      ${Ne.map(r=>{let i=e.entries.filter(t=>t.rows.some(t=>t.sec===r&&e.pass(t))),a=i.some(t=>t.rows.some(t=>t.sec===r&&t.risky&&e.pass(t))),o=r===t;return n`<li key=${r}><button type="button" class=${`st-nav__item`+(o?` is-on`:``)+(i.length?``:` is-empty`)}
          aria-current=${o?`true`:void 0} data-sec=${r}
          onClick=${()=>e.set({sec:r})}>
          <span class="st-nav__label">${P[r]}</span>
          ${a&&n`<${Ge} label="A risky setting is on"/>`}
          <span class="st-nav__n">${i.length} ${i.length===1?`tool`:`tools`}</span>
        </button></li>`})}
    </ul>
  </nav>`}function _n({w:e}){let[r,i]=t(`tool`),a=e.entries.flatMap(e=>e.rows.filter(e=>e.sec===`agents`&&w(e))),o=a.filter(e.pass),s=new Set(o.map(e=>e.tool)).size,c=o.filter(R).length;return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${P.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${o.length} ${o.length===1?`agent`:`agents`} in ${s} ${s===1?`tool`:`tools`}, ${c} inherit the session model</span>
    </div>
    ${o.length?n`<${at} w=${e} rows=${o} sort=${r} onSort=${i}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:n`<p class="st-empty">${a.length?`No agent matches the search or the toggles.`:`No tool reports agents.`}</p>`}
  </section>`}function vn(e,t,n){let r=e.cells[t];if(!(!r||r.unset&&!n))return typeof r.value==`number`?r.value:r.value==null||r.value===``?void 0:_(r.value)}function yn({w:e,tools:t,rows:r}){let i=[{k:`setting`,l:`Setting`,cls:`st-c-set`,get:e=>e.label},...t.map(t=>({k:t.id,cls:`st-matrix__tool`,attrs:{"data-tool":t.id},n:Be(r,n=>vn(n,t.id,e.showUnset)),l:n`<span class="st-matrix__toolname"><${J} id=${t.id}/>${t.label}</span>`,get:n=>vn(n,t.id,e.showUnset)}))],a=W(`settings.topic`,i);return n`<div class="st-scroll"><table class=${`st-table st-matrix `+a.tableProps.class} style=${a.tableProps.style}>
      <thead><tr>${i.map(a.th)}</tr></thead>
      <tbody>
        ${a.order(r).map(r=>n`<tr key=${r.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${r.keys.join(`
`)}>${r.label}</th>
          ${t.map(t=>{let i=r.cells[t.id];if(!i||i.unset&&!e.showUnset)return n`<td key=${t.id} class="st-cell st-cell--none">—</td>`;let a=e.selected?.uid===i.uid;return n`<td key=${t.id} class=${`st-cell`+(i.risky?` is-risky`:``)+(i.unset?` is-unset`:``)+(a?` is-sel`:``)}>
              <button type="button" class="st-cellbtn" data-key=${i.key}
                aria-label=${`${r.label}, ${t.label}: ${_(i.value)}${i.unset?` (not set, default)`:``}`}
                onClick=${()=>e.select({tool:t.id,row:i.key})}>
                <${K} row=${i} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>`}function bn({w:e}){let t=hn(e);if(t===`agents`)return n`<${_n} w=${e}/>`;let{tools:r,rows:i}=Te(e.entries,t,e.pass),a=i.reduce((e,t)=>e+Object.values(t.cells).filter(e=>e.risky).length,0),o=t===`autonomy`?Ft(e.entries):[];return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${P[t]}</h2>
      <span class="st-bar__sub">every tool, side by side${a?n` · <span class="st-red">${a} risky ${a===1?`value`:`values`}</span>`:``}</span>
    </div>
    <${Jt} w=${e} mats=${o}/>
    ${i.length?n`<${yn} w=${e} tools=${r} rows=${i}/>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:n`<p class="st-empty">${r.length?`No setting matches the search or the toggles.`:`No tool has settings in this section.`}</p>`}
  </section>`}var xn=86400,Sn=8;function Cn(e){let t=e.cell?e.cell.split(`:`):null;return{loc:T(e.sec),tools:T(e.tool),purpose:T(e.purpose),scope:T(e.fscope),git:T(e.git),recent:!!e.recent,cell:t&&t.length===2?t:null}}function wn(e,t,n,r){return!(n!==`loc`&&t.loc.length&&!t.loc.includes(e.location)||n!==`tools`&&t.tools.length&&!e.tools.some(e=>t.tools.includes(e))||n!==`purpose`&&t.purpose.length&&!t.purpose.includes(g(e))||n!==`scope`&&t.scope.length&&!t.scope.includes(e.scope)||n!==`git`&&t.git.length&&!t.git.includes(ae(e))||n!==`recent`&&t.recent&&!(e.mtime&&e.mtime>=r-xn)||n!==`cell`&&t.cell&&(g(e)!==t.cell[0]||e.location!==t.cell[1]))}function Tn(e,t=null,n=Date.now()/1e3){let r=Cn(e.st);return e.files.filter(i=>b(i,e.q)&&wn(i,r,t,n))}function En(e,t,n){let r=T(e.st[t]);e.set({[t]:h(r.includes(n)?r.filter(e=>e!==n):[...r,n]),row:``})}function Dn({w:e,title:t,fkey:r,skip:i,options:a,valueOf:o,attr:s,swatch:c}){let l=Tn(e,i),u=T(e.st[r]),d=a.map(e=>({...e,n:l.filter(t=>o(t).includes(e.id)).length})).filter(e=>e.n||u.includes(e.id)||e.always);return d.length?n`<${Y}>${t}</${Y}>
    <ul class="st-nav__list" aria-label=${t}>
      ${d.map(t=>{let i=u.includes(t.id);return n`<li key=${t.id}><button type="button" class=${`st-nav__item`+(i?` is-on`:``)+(t.n?``:` is-empty`)}
          aria-pressed=${i?`true`:`false`} ...${{[s]:t.id}} onClick=${()=>En(e,r,t.id)}>
          ${c?n`<${J} id=${t.id}/>`:null}<span class="st-nav__label">${t.label}</span><span class="st-nav__n">${t.n}</span></button></li>`})}
    </ul>`:null}function On({w:e}){let t=[...new Set(e.files.flatMap(e=>e.tools))],r=[...new Set(e.files.map(e=>e.scope).filter(Boolean))],i=Tn(e,`recent`).filter(e=>e.mtime&&e.mtime>=Date.now()/1e3-xn).length;return n`<nav class="st-nav" aria-label="File filters">
    <${Dn} w=${e} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${I.map(e=>({...e,always:!0}))} valueOf=${e=>[e.location]}/>
    <${Dn} w=${e} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${Ae} valueOf=${e=>[g(e)]}/>
    <${Dn} w=${e} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${t.map(t=>({id:t,label:e.labelOf(t)}))} valueOf=${e=>e.tools}/>
    <${Dn} w=${e} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${r.map(e=>({id:e,label:Se[e]||e}))} valueOf=${e=>[e.scope]}/>
    <${Dn} w=${e} title="Git" fkey="git" skip="git" attr="data-git" options=${Oe} valueOf=${e=>[ae(e)]}/>
    <${Y}>Changes</${Y}>
    <ul class="st-nav__list">
      <li><button type="button" class=${`st-nav__item`+(e.st.recent?` is-on`:``)} aria-pressed=${e.st.recent?`true`:`false`}
        data-recent="1" onClick=${()=>e.set({recent:!e.st.recent,row:``})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${i}</span></button></li>
    </ul>
  </nav>`}function kn({w:e}){let t=Cn(e.st),r=[...t.loc.map(t=>({k:`sec:`+t,label:`Location: `+(Ee[t]||t),drop:()=>En(e,`sec`,t)})),...t.purpose.map(t=>({k:`purpose:`+t,label:`Purpose: `+(N[t]||t),drop:()=>En(e,`purpose`,t)})),...t.tools.map(t=>({k:`tool:`+t,label:`Read by: `+e.labelOf(t),drop:()=>En(e,`tool`,t)})),...t.scope.map(t=>({k:`fscope:`+t,label:`Scope: `+(Se[t]||t),drop:()=>En(e,`fscope`,t)})),...t.git.map(t=>({k:`git:`+t,label:`Git: `+(Oe.find(e=>e.id===t)?.label||t),drop:()=>En(e,`git`,t)})),...t.recent?[{k:`recent`,label:`Changed in the last 24 h`,drop:()=>e.set({recent:!1,row:``})}]:[],...t.cell?[{k:`cell`,label:(N[t.cell[0]]||t.cell[0])+` in `+(Ee[t.cell[1]]||t.cell[1]),drop:()=>e.set({cell:``,row:``})}]:[]];return r.length?n`<div class="st-fchips" data-testid="st-file-chips">
    ${r.map(e=>n`<button key=${e.k} type="button" class="st-chip st-chip--btn" data-chip=${e.k}
      aria-label=${`Remove the filter `+e.label} onClick=${e.drop}>${e.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>e.set({sec:``,tool:``,purpose:``,fscope:``,git:``,recent:!1,cell:``,row:``})}>Clear filters</button>
  </div>`:null}function An({w:e}){let t=D(Tn(e,`cell`).filter(e=>!e.is_dir)),r=[{k:`purpose`,l:`Purpose`,get:e=>e.label},...t.cols.map(e=>({k:e.id,l:e.label,cls:`st-num`,n:!0,get:t=>t.cells[e.id]||void 0})),{k:`all`,l:`All`,cls:`st-num`,n:!0,get:e=>e.total||void 0}],i=W(`settings.files.matrix`,r);return t.rows.length?n`<div class="st-scroll"><table class=${`st-table st-fmatrix `+i.tableProps.class} style=${i.tableProps.style} data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr>${r.map(i.th)}</tr></thead>
    <tbody>${i.order(t.rows).map(r=>n`<tr key=${r.id}>
      <th scope="row">${r.label}</th>
      ${t.cols.map(t=>{let i=r.cells[t.id]||0,a=r.id+`:`+t.id,o=e.st.cell===a;return n`<td key=${t.id} class=${`st-cell st-num`+(o?` is-sel`:``)}>${i?n`<button type="button" class="st-cellbtn" data-cell=${a} aria-pressed=${o?`true`:`false`}
              aria-label=${i+` `+r.label+` `+(i===1?`file`:`files`)+` in `+t.label}
              onClick=${()=>e.set({cell:o?``:a,row:``})}>${i}</button>`:n`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${r.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function jn({f:e,w:t}){let r=t.selectedFile&&t.selectedFile.path===e.path,i=()=>t.select({row:e.path}),a=m(e);return n`<tr class=${`st-row`+(r?` is-sel`:``)+(e.exists===!1?` is-missing`:``)}
    data-path=${e.path} tabindex="0" onClick=${i}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),i())}}>
    <td class="st-c-file">
      ${e.is_dir?n`<span class="st-fname" title=${e.path}>${e.name}/</span>`:n`<button type="button" class="st-fname st-link" title=${`Open `+e.path}
            onClick=${n=>{n.stopPropagation(),t.openAt(e.path)}}>${e.name}</button>`}
      ${e.exists===!1&&n`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${g(e)}>${e.is_dir?`Folder`:N[g(e)]}</span></td>
    <td><${q} scope=${e.scope}/></td>
    <td><span class="st-tools">${e.tools.map(e=>n`<${X} key=${e} id=${e} label=${t.labelOf(e)}/>`)}</span></td>
    <td class="st-mono st-num">${e.settings?e.settings:`—`}</td>
    <td class="st-mono st-num">${!e.is_dir&&e.bytes!=null?we(e.bytes):`—`}</td>
    <td class=${a?`st-warn`:`st-dim`} data-git=${ae(e)||void 0}
      title=${a?`A tool always loads this file, and git does not track it`:void 0}>${e.git_state||`—`}</td>
    <td class="st-dim">${e.mtime?B(e.mtime):`—`}</td>
  </tr>`}function Mn(e){let t=Cn(e.st);if(t.loc.length||t.purpose.length||t.scope.length||t.git.length||t.recent||t.cell)return[];let n=e.q.trim().toLowerCase();return(e.managedAbsent||[]).filter(e=>(!n||[e.path,e.label,e.note].join(`
`).toLowerCase().includes(n))&&(!t.tools.length||e.tools.some(e=>t.tools.includes(e))))}function Nn({w:e,items:r}){let[i,a]=t(!1);return n`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${Sn}>
      <button type="button" class="st-fold" aria-expanded=${i?`true`:`false`} onClick=${()=>a(!i)}>
        <span aria-hidden="true">${i?`▾`:`▸`}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${r.length} ${r.length===1?`location`:`locations`} · where a policy would come from</span>
    </th></tr>
    ${i&&r.map(t=>n`<tr key=${t.path} class="st-row st-row--static st-row--absent" data-path=${t.path}>
      <td class="st-c-file"><span class="st-fname" title=${t.path+(t.note?`
`+t.note:``)}>${F(t.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${We} label="Cannot be changed from this machine"/><${q} scope=${t.scope}/></span></td>
      <td><span class="st-tools">${t.tools.map(t=>n`<${X} key=${t} id=${t} label=${e.labelOf(t)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function Pn(e,t){let n=e.filter(e=>!e.is_dir),r=e.filter(e=>e.is_dir),i=t===`purpose`?ce(n).map(e=>({key:`purpose:`+e.id,attrs:{"data-purpose":e.id},title:e.label,mono:!1,root:null,files:e.files})):U(n).map(e=>({key:e.root,attrs:{"data-root":e.root},title:F(e.root),full:e.root,mono:!0,root:e.root,sub:pe[e.location]||`Other`,files:e.files}));return r.length&&i.push({key:`watched`,attrs:{"data-root":`watched`},title:`Watched folders`,mono:!1,root:null,flat:!0,sub:`folders the monitor reads`,files:r}),i}function Fn({g:e,w:t,open:r,setOpen:i,shut:o,setShut:s,grid:c}){let l=!!o[e.key],u=[...new Set(e.files.flatMap(e=>e.tools))],d=e.files.reduce((e,t)=>e+(t.is_dir?0:Number(t.bytes)||0),0),f=(e.flat?[{dir:``,files:e.files}]:M(e.files)).map(e=>({...e,files:c.order(e.files)}));return e.root&&f.sort((t,n)=>(n.dir===e.root)-(t.dir===e.root)),n`<tbody ...${e.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${Sn}>
      <button type="button" class="st-fold" aria-expanded=${l?`false`:`true`}
        onClick=${()=>s({...o,[e.key]:!l})}>
        <span aria-hidden="true">${l?`▸`:`▾`}</span>
        <span class=${e.mono?`st-mono`:``} title=${e.full||void 0}>${e.title}</span></button>
      <span class="st-group__meta">${e.sub?e.sub+` · `:``}${e.files.length} ${e.files.length===1?`file`:`files`}${d?` · `+we(d):``}</span>
      ${u.length>0&&n`<span class="st-tools st-group__tools">${u.map(e=>n`<${X} key=${e} id=${e} label=${t.labelOf(e)}/>`)}</span>`}
    </th></tr>
    ${!l&&f.map(o=>{let s=e.key+`|`+o.dir,c=r[s]?o.files:o.files.slice(0,8),l=o.files.length-c.length;return n`<${a} key=${s}>
        ${o.dir&&o.dir!==e.root&&n`<tr class="st-folder" data-dir=${o.dir}><td colspan=${Sn}>
          <span class="st-mono st-path" title=${o.dir}>${F(o.dir)}</span><span class="st-dim"> · ${o.files.length}</span></td></tr>`}
        ${c.map(e=>n`<${jn} key=${e.path} f=${e} w=${t}/>`)}
        ${l>0&&n`<tr class="st-morerow"><td colspan=${Sn}>
          <button type="button" class="st-link st-more" onClick=${()=>i({...r,[s]:!0})}>▸ ${l} more</button>
        </td></tr>`}
      </${a}>`})}
  </tbody>`}var In=[{value:`location`,label:`By location`},{value:`purpose`,label:`By purpose`}],Ln=e=>{if(!e.mtime)return;let t=Number(e.mtime);return t>0?t:typeof e.mtime==`string`&&Date.parse(e.mtime)||void 0};function Rn(e){return[{k:`file`,l:`File`,cls:`st-c-file`,get:e=>e.name},{k:`purpose`,l:`Purpose`,get:e=>e.is_dir?`Folder`:N[g(e)]},{k:`scope`,l:`Scope`,get:e=>e.scope},{k:`readby`,l:`Read by`,get:t=>t.tools.map(e.labelOf).join(`, `)},{k:`settings`,l:`Settings`,cls:`st-num`,n:!0,get:e=>e.settings||void 0},{k:`size`,l:`Size`,cls:`st-num`,n:!0,get:e=>e.is_dir||e.bytes==null?void 0:Number(e.bytes)},{k:`git`,l:`Git`,get:e=>e.git_state},{k:`changed`,l:`Last change`,n:!0,get:Ln}]}function zn({w:e}){let r=W(`settings.files`,Rn(e)),[i,a]=t({}),[o,s]=t({}),c=Tn(e),l=e.st.group===`purpose`?`purpose`:`location`,u=Pn(c,l),d=Mn(e);return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${c.length} ${c.length===1?`file`:`files`} · grouped by ${l===`purpose`?`what they are for`:`where they live`}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${In.map(t=>n`<button key=${t.value} type="button" class="st-seg__btn" aria-pressed=${l===t.value?`true`:`false`}
          onClick=${()=>e.set({group:t.value})}>${t.label}</button>`)}
      </div>
    </div>
    ${e.filesStatus!==`ready`&&n`<p class="st-note" role="status">${e.readonly?`File details are not reported for the selected nodes.`:`File details are loading`}</p>`}
    <${An} w=${e}/>
    <${kn} w=${e}/>
    ${u.length||d.length?n`<div class="st-scroll"><table class=${`st-table st-files `+r.tableProps.class} style=${r.tableProps.style}>
      <thead><tr>${Rn(e).map(r.th)}</tr></thead>
      ${u.map(t=>n`<${Fn} key=${t.key} g=${t} w=${e} open=${i} setOpen=${a} shut=${o} setShut=${s} grid=${r}/>`)}
      ${d.length>0&&n`<${Nn} w=${e} items=${d}/>`}
    </table></div>`:n`<p class="st-empty">${e.readonly?`No settings file records for this scope.`:e.files.length?`No file matches the search or the filters.`:`No settings files were found.`}</p>`}
  </section>`}function Bn(e,t){return e?F(e)+(t>0?`:`+t:``):`—`}function Vn({w:e}){let t=d(e.findings.filter(t=>ie(t,e.q)));return n`<nav class="st-nav" aria-label="Finding rules">
    <${Y}>Finding rules</${Y}>
    <ul class="st-nav__list">
      <li><button type="button" class=${`st-nav__item`+(e.st.sec?``:` is-on`)} aria-current=${e.st.sec?void 0:`true`}
        onClick=${()=>e.set({sec:``,row:``})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${t.reduce((e,t)=>e+t.count,0)}</span></button></li>
      ${t.map(t=>{let r=e.st.sec===t.rule;return n`<li key=${t.rule}><button type="button" class=${`st-nav__item`+(r?` is-on`:``)}
          aria-current=${r?`true`:void 0} data-rule=${t.rule}
          onClick=${()=>e.set({sec:r?``:t.rule,row:``})}>
          ${t.alarm?n`<${Ge} label=${t.severity+` severity`}/>`:n`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${t.label}</span><span class="st-nav__n">${t.count}</span></button></li>`})}
    </ul>
  </nav>`}function Hn({f:e,group:t,w:r}){let i=r.selectedFinding&&r.selectedFinding.id===e.id,a=()=>r.select({row:e.id,sec:r.st.sec}),o=t.why&&e.why===t.why?e.action||``:e.why||e.action||``,s=H(e).map(r.labelOf).join(`, `)||(e.session_id?`session `+e.session_id:`—`);return n`<tr class=${`st-row`+(i?` is-sel`:``)+(e.severity===`high`||e.severity===`medium`?` st-row--risky`:``)}
    data-id=${e.id} tabindex="0" onClick=${a}
    onKeyDown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),a())}}>
    <td class="st-c-tool">${s}</td>
    <td class="st-c-where st-mono" title=${e.path?e.path+(e.line>0?`:`+e.line:``):void 0}>
      ${Bn(e.path,e.line)}${e.count>1?n` <span class="st-dim">×${e.count}</span>`:``}</td>
    <td class="st-c-what" title=${[e.why,e.action].filter(Boolean).join(`
`)||void 0}>${o}</td>
    <td class="st-c-act">${e.path&&(L(e.path)?n`<button type="button" class="st-chip st-chip--btn"
        onClick=${t=>{t.stopPropagation(),r.openEnv(A(e.path),H(e)[0]||``)}}>Show the variable</button>`:n`<button type="button" class="st-chip st-chip--btn"
        onClick=${t=>{t.stopPropagation(),r.openAt(e.path,e.line)}}>Show the line</button>`)}</td>
  </tr>`}function Un(e){return[{k:`tool`,l:`Tool`,cls:`st-c-tool`,get:t=>H(t).map(e.labelOf).join(`, `)},{k:`where`,l:`Where`,cls:`st-c-where`,get:e=>e.path?F(e.path)+String(e.line>0?e.line:0).padStart(8,`0`):void 0},{k:`what`,l:`What it does`,get:e=>e.why||e.action},{k:`action`,l:n`<span class="st-sr">Action</span>`,cls:`st-c-act`}]}function Wn({w:e}){let r=W(`settings.findings`,Un(e)),[i,a]=t({});if(e.auditStatus===`loading`&&!e.audit){let t=e.scan;return n`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${t?` `+(t.step||``)+(t.elapsed_s==null?``:`, `+Math.round(t.elapsed_s)+` s`):``}</p>
    </section>`}if(e.auditStatus===`error`&&!e.audit)return n`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${e.auditError}
        ${e.rescan&&n` <button type="button" class="st-btn" onClick=${()=>e.rescan()}>Retry</button>`}</p>
    </section>`;let o=e.findings.filter(t=>ie(t,e.q)),s=d(o).filter(t=>!e.st.sec||t.rule===e.st.sec),c=s.reduce((e,t)=>e+t.count,0),l=e.auditStatus===`loading`,u=e.audit?.incomplete||[],f=e.audit?.failed_steps||[];return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${c} in ${s.length} ${s.length===1?`rule`:`rules`} · hidden changes, conflicts and settings outside this project</span>
      ${e.rescan&&n`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${l}
        onClick=${()=>e.rescan()}>${l?`Scanning…`:`Rescan`}</button>`}
    </div>
    ${l&&n`<p class="st-note" role="status" data-state="rescanning">Scanning again…${e.scan?` `+(e.scan.step||``)+(e.scan.elapsed_s==null?``:`, `+Math.round(e.scan.elapsed_s)+` s`):``} The last results stay until it ends.</p>`}
    ${e.auditStatus===`error`&&n`<p class="st-note st-red" role="alert">The last scan failed: ${e.auditError}. These are the earlier results.</p>`}
    ${u.length>0&&n`<p class="st-note st-warn">The scan reached its time limit and skipped: ${u.join(`, `)}.</p>`}
    ${f.length>0&&n`<p class="st-note st-warn">The scan could not read: ${f.map(e=>e.step+` (`+e.error+`)`).join(`, `)}.</p>`}
    ${s.length?n`<table class=${`st-table st-findings `+r.tableProps.class} style=${r.tableProps.style}>
      <thead><tr>${Un(e).map(r.th)}</tr></thead>
      ${s.map(t=>{let o=!!i[t.rule],s=r.order(t.items),c=o?s:s.slice(0,5),l=s.length-c.length;return n`<tbody key=${t.rule} data-rule=${t.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${t.alarm&&n`<${Ge} label=${t.severity+` severity`}/>`} ${t.label}
            <span class="st-group__meta">${t.count} · ${t.tools.map(e.labelOf).join(`, `)||`no tool`}${t.why?` · `+t.why:``}</span>
          </th></tr>
          ${c.map(r=>n`<${Hn} key=${r.id} f=${r} group=${t} w=${e}/>`)}
          ${l>0&&n`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>a({...i,[t.rule]:!0})}>▸ ${l} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:n`<p class="st-empty">${e.findings.length?`No finding matches the search.`:`No findings for the selected tools.`}</p>`}
  </section>`}var Q=[{id:`allow`,label:`Allow`,hint:`run without asking`},{id:`deny`,label:`Deny`,hint:`always refused`},{id:`ask`,label:`Ask`,hint:`always ask first`}];function Gn(e){return String(e?.message||e||``).replace(/^HTTP \d+ \S+: /,``)||`The request failed`}var Kn=e=>Object.fromEntries(Q.map(t=>[t.id,Ht(e?.permissions?.[t.id])]));function qn({title:e,diff:t}){let r=t.added.length||t.removed.length;return n`<div class="st-diff" data-bucket=${e}>
    <span class="st-diff__name">${e}</span>
    <span class="st-diff__chips">
      ${r?n`${t.added.map(e=>n`<code key=${`a`+e} class="st-diff__chip is-added">+ ${e}</code>`)}
          ${t.removed.map(e=>n`<code key=${`r`+e} class="st-diff__chip is-removed">- ${e}</code>`)}`:n`<span class="st-dim">no change</span>`}
    </span>
  </div>`}function Jn({tool:r,target:a,refresh:o,onClose:s}){let[c,l]=t(null),[u,d]=t(()=>Kn(null)),[f,m]=t(!0),[ee,h]=t(!1),[g,_]=t(null),[v,te]=t(null),y=i(()=>{let e=!0;return m(!0),_(null),p(r,a.scope).then(t=>{e&&(l(t),d(Kn(t)),m(!1))},t=>{e&&(_({message:Gn(t),conflict:!0}),m(!1))}),()=>{e=!1}},[r,a.scope]);e(()=>y(),[y]);let b=Object.fromEntries(Q.map(e=>[e.id,Ut(u[e.id])])),x=Object.fromEntries(Q.map(e=>[e.id,c?.permissions?.[e.id]||[]])),S=Object.fromEntries(Q.map(e=>[e.id,Wt(x[e.id],b[e.id])])),ne=Q.some(e=>JSON.stringify(x[e.id])!==JSON.stringify(b[e.id])),C=JSON.stringify({permissions:b},null,2),w=c?.path||a.path;return n`<section class="st-insp__sec st-editor" data-testid="st-perm-editor" aria-label="Edit permissions">
    <h4 class="st-insp__h">Edit permissions · ${a.label}</h4>
    <p class="st-hint st-editor__target" data-testid="st-editor-target">
      Writes <span class="st-mono" title=${w}>${w}</span> (${a.label})${c&&!c.exists?`, a new file`:``}
    </p>
    ${g&&n`<div class="st-editor__error" role="alert" data-testid="st-editor-error">
      <span>${g.message}</span>
      ${g.conflict&&n`<button type="button" class="st-btn" onClick=${()=>{te(null),y()}}>Reload</button>`}
    </div>`}
    ${v&&n`<div class="st-editor__saved" role="status" data-testid="st-editor-saved">
      ${v.backup?n`Saved. Backup: <span class="st-mono" title=${v.backup}>${v.backup}</span>`:`Saved. The file was new, so there is no backup.`}
    </div>`}
    ${f?n`<p class="st-hint">Loading the file…</p>`:c&&n`
      <div class="st-editor__fields">
        ${Q.map(e=>n`<label key=${e.id} class="st-editor__field">
          <span class="st-editor__label">${e.label} <span class="st-dim">· ${e.hint}, one rule per line</span></span>
          <textarea class="st-editor__area" data-bucket=${e.id} rows="4" spellcheck="false" value=${u[e.id]}
            onInput=${t=>d({...u,[e.id]:t.currentTarget.value})}></textarea>
        </label>`)}
      </div>
      <div class="st-editor__diff" data-testid="st-editor-diff">
        <div class="st-insp__h">Pending diff</div>
        ${Q.map(e=>n`<${qn} key=${e.id} title=${e.id} diff=${S[e.id]}/>`)}
      </div>
      <pre class="st-editor__json" data-testid="st-editor-json">${C}</pre>`}
    <div class="st-actions">
      <button type="button" class="st-btn st-btn--primary" onClick=${()=>{h(!0),_(null),te(null),xe(r,{scope:a.scope,expected_mtime:c?.mtime??null,permissions:b}).then(e=>{l(e),d(Kn(e)),te({backup:e?.backup_path||``}),h(!1),typeof o==`function`&&o()},e=>{_({message:Gn(e),conflict:e?.status===409}),h(!1)})}} disabled=${f||ee||!c||!ne}>${ee?`Saving…`:`Save`}</button>
      <button type="button" class="st-btn" onClick=${s}>Cancel</button>
    </div>
  </section>`}function $({title:e,children:t}){return n`<section class="st-insp__sec"><h4 class="st-insp__h">${e}</h4>${t}</section>`}function Yn(e,t){return`Open `+V(e)+(t>0?` at line `+t:``)}function Xn(e,t){return t?e.findings.filter(e=>ue(e.path,t)):[]}function Zn(e,t){e.set({view:`findings`,sec:t.rule||``,row:t.id,tool:``})}function Qn({w:e,path:t}){let r=t&&e.recentFiles&&typeof e.recentFiles.get==`function`?e.recentFiles.get(t):null,i=t?e.mtimeOf(t):null,a=[];return r?a.push(`File changed ${B(r.ts)}${r.tool?` by `+e.labelOf(r.tool):``} (file history)`):i&&a.push(`File last changed ${B(i)} (file history)`),n`<div class="st-hint" data-testid="st-history">${a.length?a.join(` · `)+` · no aictl change recorded`:`No aictl change recorded`}</div>`}function $n(e,t){let n=e.chain?.[e.wins];return e.locked||l(n,t)?`Locked by `+O(e.locked?e.scope:n.scope,t):Rt}function er(e,t){let n=j(t);return`Not set in any file. Default: ${_(e.value)}.`+(n?` Set it in ${F(n.path)} (${n.label}).`:``)}function tr({w:e,row:r}){let i=e.scopesOf(r.tool),a=e.entries.filter(e=>e.id!==r.tool&&r.source&&e.files.some(e=>ue(e,r.source))).map(e=>e.label),o=r.source?e.files.find(e=>ue(e.path,r.source)):null;for(let t of o?.tools||[]){let n=e.labelOf(t);t!==r.tool&&!a.includes(n)&&a.push(n)}let s=Xn(e,r.source),{chain:c,wins:u}=r,d=Vt(r,i),[f,p]=t(!1);return n`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${r.label}</h3>
    <div class="st-insp__key st-mono">${r.key}</div>
    ${r.tip&&n`<p class="st-insp__tip">${r.tip}</p>`}
    <div class="st-insp__chips">
      ${r.risky&&n`<span class="st-chip st-chip--risky">risky</span>`}
      <${X} id=${r.tool} label=${e.labelOf(r.tool)}/>
      <${q} scope=${r.scope} locked=${r.locked} label=${O(r.scope,i)}/>
      ${r.undocumented&&n`<${Je}/>`}
      ${a.length>0&&n`<span class="st-chip">also read by ${a.join(`, `)}</span>`}
    </div>
    <div class=${`st-insp__value`+(r.unset?` is-unset`:``)}><${K} row=${r}/></div>
    ${r.unset&&n`<p class="st-insp__tip" data-testid="st-unset-text">${er(r,i)}</p>`}
    <${$} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${c.map((t,a)=>{let o=a===u,s=l(t,i);return n`<li key=${a} class=${`st-chain__lv`+(o?` is-win`:``)+(s?` is-locked`:``)} aria-current=${o?`true`:void 0}>
            <span class="st-chain__sc">${s&&n`<${We} label=${`Locked: `+O(t.scope,i)+` cannot be changed here`}/>`}${t.scope||`default`}</span>
            <span class="st-chain__v">${x(t)?n`<span class="st-dim">not set</span>`:n`<${K} row=${r} value=${t.value} compact/>`}</span>
            <span class="st-chain__src">${t.source?n`<${Ke} path=${t.source} line=${Number(t.line)>0?Number(t.line):0} w=${e} tool=${r.tool}/>`:n`<span class="st-dim">${t.note||(t.scope==="default"?e.labelOf(r.tool):`—`)}</span>`}</span>
            ${o&&n`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${ke(c,u)}</p>
    </${$}>
    ${!L(r.source)&&n`<${$} title="History"><${Qn} w=${e} path=${r.source}/></${$}>`}
    <${$} title="Actions">
      <div class="st-actions">
        ${r.source&&(L(r.source)?n`<button type="button" class="st-btn" onClick=${()=>e.openEnv(A(r.source),r.tool)}>Show ${A(r.source)||`the variable`}</button>`:n`<button type="button" class="st-btn" onClick=${()=>e.openAt(r.source,r.line)}>${Yn(r.source,r.line)}</button>`)}
        ${s.length>0&&n`<button type="button" class="st-btn" onClick=${()=>Zn(e,s[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled=${!d.ok||f}
          aria-expanded=${d.ok?f?`true`:`false`:void 0}
          onClick=${()=>p(!0)}>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${d.ok?`Edits ${F(d.path)||`the `+d.label+` file`} (${d.label})`:d.hint}</span>
      </div>
    </${$}>
    ${f&&n`<${Jn} tool=${r.tool} target=${d} refresh=${e.refresh}
      onClose=${()=>p(!1)}/>`}
  </div>`}function nr({w:e,row:t}){let r=t.agent,i=e.scopesOf(t.tool),{steps:a,wins:o,why:s}=z(t),c=e=>Number(e)>0?Number(e):0,l=[{label:`Defined in`,path:r.defined_in,line:c(r.defined_line),scope:r.scope_defined},{label:`Pinned in`,path:r.pinned_in,line:c(r.pinned_line),scope:r.scope_pinned}],u=$n(t,i);return n`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${r.name||t.label}</h3>
    <div class="st-insp__key st-mono">${t.key}</div>
    ${r.description&&n`<p class="st-insp__tip">${r.description}</p>`}
    <div class="st-insp__chips">
      <${X} id=${t.tool} label=${e.labelOf(t.tool)}/>
      <${q} scope=${t.scope} locked=${t.locked} label=${O(t.scope,i)}/>
    </div>
    <div class="st-insp__value"><${Ze} row=${t} w=${e}/></div>
    <${$} title="Model · what decides it">
      <ol class="st-chain">
        ${a.map((t,r)=>{let i=r===o;return n`<li key=${t.id} class=${`st-chain__lv`+(i?` is-win`:``)} aria-current=${i?`true`:void 0}>
            <span class="st-chain__sc">${t.label}</span>
            <span class="st-chain__v">${t.value===void 0||t.value===null||t.value===``?n`<span class="st-dim">${t.id===`pin`&&t.present?`set`:`not set`}</span>`:t.value===`inherits`?n`<span class="st-inherit">inherits</span>`:n`<span class="st-v">${String(t.value)}</span>`}</span>
            <span class="st-chain__src">${t.source?n`<${Ke} path=${t.source} line=${t.line} w=${e}/>`:n`<span class="st-dim">${t.id===`effective`?o===2?`session model`:``:`—`}</span>`}</span>
            ${i&&n`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${s}</p>
    </${$}>
    <${$} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${r.effort||`—`}</dd>
        <dt>Context</dt><dd>${r.context_tier||`—`}</dd>
        <dt>Target</dt><dd>${r.target||`—`}</dd>
        <dt>Model policy</dt><dd>${r.model_policy||`—`}</dd>
      </dl>
    </${$}>
    <${$} title=${`Tools`+(r.tools.length?` · `+r.tools.length:``)}><${Qe} tools=${r.tools} all/></${$}>
    <${$} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${l.map(t=>n`<dt key=${t.label+`t`}>${t.label}</dt><dd key=${t.label+`d`}>
          ${t.path?n`<span class="st-mono" title=${t.path+(t.line?`:`+t.line:``)}>${V(t.path)}${t.line?`:`+t.line:``}</span>
            ${t.scope&&n` <span class="st-dim">· ${O(t.scope,i)}</span>`}
            <button type="button" class="st-link" onClick=${()=>e.openAt(t.path,t.line)}
              aria-label=${Yn(t.path,t.line)}>Open</button>`:n`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${$}>
    <${$} title="History"><${Qn} w=${e} path=${r.defined_in||t.source}/></${$}>
    <${$} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${u}</span>
      </div>
    </${$}>
  </div>`}function rr({w:e,file:t}){let r=Xn(e,t.path),i=t.rows||[];return n`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${t.name}</h3>
    <div class="st-insp__key st-mono">${t.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${t.is_dir?`Watched folder`:N[g(t)]}</span>
      <${q} scope=${t.scope}/>
      <span class="st-chip">${pe[t.location]||`Other`}</span>
      ${t.tools.map(t=>n`<${X} key=${t} id=${t} label=${e.labelOf(t)}/>`)}
    </div>
    <${$} title=${`Settings from this file`+(i.length?` · `+i.length:``)}>
      ${i.length?n`<ul class="st-insp__list">
        ${i.map(t=>n`<li key=${t.uid}><button type="button" class="st-link"
          onClick=${()=>e.set({view:`tool`,tool:t.tool,sec:``,row:t.key})}>${t.label}</button>
          <span class="st-dim"> · ${e.labelOf(t.tool)}${t.line>0?` · line `+t.line:``}</span></li>`)}
      </ul>`:n`<div class="st-hint">${t.settings?t.settings+` settings`:`No settings are read from this file.`}</div>`}
    </${$}>
    <${$} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${t.path}</dd>
        <dt>Purpose</dt><dd>${t.is_dir?`Watched folder`:N[g(t)]}${t.kind&&t.kind!==g(t)?` (`+t.kind+`)`:``}</dd>
        <dt>Scope</dt><dd>${t.scope||`—`}</dd>
        <dt>Git</dt><dd>${t.git_state||`—`}</dd>
        <dt>Size</dt><dd>${t.bytes!=null&&!t.is_dir?we(t.bytes):`—`}</dd>
        <dt>Last change</dt><dd>${t.mtime?B(t.mtime):`—`}</dd>
        ${t.mtime?n`<dt>Modified</dt><dd>${new Date(t.mtime*1e3).toLocaleString()}</dd>`:null}
        ${t.loading&&n`<dt>Loading</dt><dd>${t.loading}</dd>`}
        ${t.exists===!1&&n`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${!t.is_dir&&n`<button type="button" class="st-btn" onClick=${()=>e.openAt(t.path)}>Open file</button>`}
        ${r.length>0&&n`<button type="button" class="st-btn" onClick=${()=>Zn(e,r[0])}>Show finding</button>`}
      </div>
    </${$}>
  </div>`}function ir({w:e,v:t}){let r=Pe(t),i=Xn(e,t.source);return n`<div class="st-insp__body" data-testid="st-inspector-env">
    <h3 class="st-insp__title st-mono">${t.name||`Environment variable`}</h3>
    <div class="st-insp__key">Environment variable${t.name?``:` (this aictl version did not name it)`}</div>
    ${t.description&&n`<p class="st-insp__tip">${t.description}</p>`}
    <div class="st-insp__chips">
      <${X} id=${t.tool} label=${e.labelOf(t.tool)}/>
      <${q} scope="env" label=${O(`env`,e.scopesOf(t.tool))}/>
      ${t.masked&&n`<span class="st-chip st-chip--muted">value hidden</span>`}
      ${!t.documented&&n`<${Je}/>`}
    </div>
    <div class=${`st-insp__value`+(t.set?``:` is-unset`)} data-testid="st-env-value">${t.set?t.masked?n`<span class="st-dim" title="The name says it holds a credential, so the value is not shown">hidden</span>`:n`<span class="st-v st-mono">${t.value===``?`(empty)`:t.value}</span>`:n`<span class="st-dim">not set</span>`}</div>
    <${$} title="Where it is set">
      ${r.length?n`<ul class="st-insp__list" data-testid="st-env-where">
        ${r.map(r=>n`<li key=${r.id}>
          <b>${r.label}</b>${r.origin&&n` <span class="st-mono" title=${r.origin}>${F(r.origin)}</span>`}
          ${r.value!==t.value&&n` <span class="st-dim">= ${r.value}</span>`}
          ${r.file&&n` <button type="button" class="st-link" onClick=${()=>e.openAt(r.file)}
            aria-label=${`Open `+V(r.file)}>Open</button>`}
          <div class="st-hint">${r.note}</div>
        </li>`)}
      </ul>`:n`<div class="st-hint">Not set in aictl's environment, in a shell profile or in the registry.</div>`}
    </${$}>
    <${$} title=${`What it drives`+(t.drives.length?` · `+t.drives.length:``)}>
      ${t.drives.length?n`<ul class="st-insp__list" data-testid="st-env-drives">
        ${t.drives.map(r=>n`<li key=${r.key}><button type="button" class="st-link"
          onClick=${()=>e.set({view:`tool`,tool:t.tool,sec:``,row:r.key})}>${r.label}</button>
          <span class="st-dim st-mono"> · ${r.key}</span></li>`)}
      </ul>`:n`<div class="st-hint">No setting shown here reads it; ${e.labelOf(t.tool)} reads it when it starts.</div>`}
    </${$}>
    <${$} title="Actions">
      <div class="st-actions">
        ${i.length>0&&n`<button type="button" class="st-btn" onClick=${()=>Zn(e,i[0])}>Show finding</button>`}
        <span class="st-hint">A change applies to sessions started after it, from a shell that has the new value.</span>
      </div>
    </${$}>
  </div>`}function ar({w:e,f:t}){return n`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${te(t.rule)}</h3>
    <div class="st-insp__key st-mono">${Bn(t.path,t.line)}</div>
    <div class="st-insp__chips">
      <span class=${`st-chip`+(t.severity===`high`||t.severity===`medium`?` st-chip--risky`:``)}>${t.severity||`info`}</span>
      ${H(t).map(t=>n`<${X} key=${t} id=${t} label=${e.labelOf(t)}/>`)}
      ${t.session_id&&n`<span class="st-chip st-chip--mono">session ${t.session_id}</span>`}
    </div>
    ${t.why&&n`<${$} title="Why it matters"><p class="st-insp__tip">${t.why}</p></${$}>`}
    ${t.action&&n`<${$} title="What to do"><p class="st-insp__tip">${t.action}</p></${$}>`}
    <${$} title="Actions">
      <div class="st-actions">
        ${t.path&&(L(t.path)?n`<button type="button" class="st-btn" onClick=${()=>e.openEnv(A(t.path),H(t)[0]||``)}>Show ${A(t.path)||`the variable`}</button>`:n`<button type="button" class="st-btn" onClick=${()=>e.openAt(t.path,t.line)}>${t.line>0?Yn(t.path,t.line):`Show the line`}</button>`)}
      </div>
    </${$}>
  </div>`}function or({w:e}){let{view:t}=e.st,r=null;return(t===`tool`||t===`topic`)&&e.selectedEnv?r=n`<${ir} key=${e.selectedEnv.uid} w=${e} v=${e.selectedEnv}/>`:(t===`tool`||t===`topic`)&&e.selected?r=w(e.selected)?n`<${nr} key=${e.selected.uid} w=${e} row=${e.selected}/>`:n`<${tr} key=${e.selected.uid} w=${e} row=${e.selected}/>`:t===`files`&&e.selectedFile?r=n`<${rr} w=${e} file=${e.selectedFile}/>`:t===`findings`&&e.selectedFinding&&(r=n`<${ar} w=${e} f=${e.selectedFinding}/>`),n`<aside class=${`st-insp`+(e.drawer?` is-open`:``)} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${e.closeDrawer} aria-label="Close the inspector">Close</button>
    ${r||n`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${t===`files`?`Click a file for its details.`:t===`findings`?`Click a finding for its details.`:`Click a setting to see where it is set, what wins and why, and what you can do with it.`}</p>
    </div>`}
  </aside>`}var sr=[{value:`tool`,label:`By tool`},{value:`topic`,label:`By topic`},{value:`files`,label:`Files`},{value:`findings`,label:`Findings`}],cr=new Set([`tool`,`topic`]);function lr(){return typeof window<`u`?window.location.search:``}function ur(n){let[r,a]=t(()=>y(lr())),o=i(e=>a(t=>{let n={...t,...e};if(e.view&&e.view!==t.view&&!(cr.has(t.view)&&cr.has(e.view)))for(let t of[`tool`,`sec`,`row`])t in e||(n[t]=``);if(e.view&&e.view!==t.view&&!(`scope`in e)&&(n.scope=``),e.view&&e.view!==t.view)for(let t of Ce)t in e||(n[t]=t!==`recent`&&``);return n}),[]);return e(()=>{let e=fe(r);S(lr())!==`local`&&delete e.scope,C(e)},[r]),e(()=>{let e=()=>a(y(lr()));return window.addEventListener(`popstate`,e),()=>{window.removeEventListener(`popstate`,e),S(lr())===`local`&&C(be)}},[]),e(()=>{a(y(lr()))},[n]),[r,o]}function dr(n){let[r,i]=t({status:`loading`,files:null});return e(()=>{if(n)return;let e=new AbortController;return ee({signal:e.signal}).then(t=>{e.signal.aborted||i(Array.isArray(t?.files)?{status:`ready`,files:t.files}:{status:`unavailable`,files:null})},()=>{e.signal.aborted||i({status:`unavailable`,files:null})}),()=>e.abort()},[n]),n?{status:`unavailable`,files:null}:r}function fr(e){let t=e||{},n=t.audit||null;return{status:t.loading?`loading`:t.error?`error`:n||t.loading===!1?`ready`:`loading`,audit:n,scan:t.scan||null,error:t.error?String(t.error):null}}function pr({records:e=[]}){return n`<section class="st-wsnote" aria-label="Loaded configuration evidence">
    <h3>Configured on disk is not effective runtime configuration</h3>
    <${Le} records=${e}/>
  </section>`}function mr({source:a={},note:l=``}){let{toolConfigs:u,tools:d,monitor:f,root:p,enabledTools:m=null,recentFiles:ee,toolName:h,openFile:g,findings:_,refresh:v,hooks:te,configuredOnly:y,runtimeConfiguration:b}=a,x=r(()=>s({toolConfigs:u,tools:d,monitor:f,root:p,enabledTools:m}),[u,d,f,p,m]),[S,C]=ur(a.readonly),[w,T]=t(``),[E,ie]=t(!1),[D,ae]=t(!1),[se,ce]=t(!1),O=o(null),fe=dr(a.readonly),k=fr(_),pe=_?.rescan;e(()=>{let e=e=>{e.key===`/`&&!c(e.target)&&!e.metaKey&&!e.ctrlKey&&!e.altKey?(e.preventDefault(),O.current?.focus()):e.key===`Escape`&&ce(!1)};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[]);let j=r(()=>Me(x),[x]),M=r(()=>_e(x),[x]),N=r(()=>oe(x),[x]),P=r(()=>De({q:w,nonDefault:E,risky:D,unset:S.unset}),[w,E,D,S.unset]),me=r(()=>De({q:w,nonDefault:E,risky:D,unset:!0}),[w,E,D]),F=i(e=>P(e)&&(!S.scope||e.scope===S.scope),[P,S.scope]),ge=r(()=>he(j),[j]),I=r(()=>Ie(fe.files,j,N,m),[fe.files,j,N,m]),ye=r(()=>de(k.audit,m),[k.audit,m]),be=r(()=>ve(ye?.findings||[]),[ye]),xe=i((e,t=0)=>{e&&g&&g(e,t>0?t:0)},[g]),Se=i(e=>{C(e),ce(!0)},[C]),R=i(()=>ce(!1),[]),Ce=i(e=>{let t=ne(e,x);return t===e&&h?h(e):t},[x,h]),we=i(e=>j.find(t=>t.id===e)?.scopes||[],[j]),Te=i(e=>{let t=I.find(t=>ue(t.path,e));if(t?.mtime)return t.mtime;for(let t of x?.tools||[])for(let n of t.files||[])if(ue(n.path,e)&&n.mtime)return n.mtime;return null},[I,x]);if(!x)return n`<p class="loading-state">Loading...</p>`;if(!j.length&&!M&&!le(m)&&!a.readonly)return n`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;let Ee=j.some(e=>e.id===S.tool)||S.tool===`aictl`&&M?S.tool:j[0]?.id||(M?`aictl`:``),z=j.find(e=>e.id===Ee)||null,Oe=(e,t)=>t&&j.find(t=>t.id===e)?.rows.find(e=>e.key===t)||null,ke=S.view===`tool`?z?Oe(z.id,S.row):null:S.view===`topic`?Oe(S.tool,S.row):null,Ae=S.view===`files`&&S.row&&I.find(e=>e.path===S.row)||null,B=(e,t)=>{if(!String(t).startsWith(`env:`))return null;let n=j.find(t=>t.id===e);if(!n)return null;let r=A(t);return n.envVars.find(e=>e.name===r)||{name:r,tool:n.id,uid:n.id+``+t,source:t,set:!1,value:``,masked:!1,in_process:!1,persisted:[],drives:[],label:r,description:``,section:``,documented:!1}},Ne=S.view===`tool`?z?B(z.id,S.row):null:S.view===`topic`?B(S.tool,S.row):null,Pe=(e,t=``)=>{let n=j.some(e=>e.id===t)?t:z?.id||j[0]?.id||``;Se({view:cr.has(S.view)?S.view:`tool`,tool:n,row:je+e})},V=(e,t=0)=>L(e)?Pe(A(e)):xe(e,t),H=S.view===`findings`&&S.row&&be.find(e=>e.id===S.row)||null,U={st:S,set:C,select:Se,q:w,pass:P,passAll:me,passTool:F,showUnset:S.unset,scopesOf:we,managedAbsent:ge,entries:j,aictl:M,toolId:Ee,files:I,filesStatus:fe.status,findings:be,audit:ye,auditStatus:k.status,auditError:k.error,scan:k.scan,rescan:pe,readonly:a.readonly,selected:ke,selectedFile:Ae,selectedFinding:H,selectedEnv:Ne,openAt:V,openEnv:Pe,labelOf:Ce,mtimeOf:Te,recentFiles:ee,drawer:se,closeDrawer:R,refresh:v,hooks:te},{set:Fe,agents:Le,knowsSet:ze,unset:W,risky:Be}=re(j),Ue=le(m)&&!j.some(e=>e.id!==`vscode`),G,K;return S.view===`topic`?(G=n`<${gn} w=${U}/>`,K=n`<${bn} w=${U}/>`):S.view===`files`?(G=n`<${On} w=${U}/>`,K=n`<${zn} w=${U}/>`):S.view===`findings`?(G=n`<${Vn} w=${U}/>`,K=n`<${Wn} w=${U}/>`):(G=n`<${nn} w=${U}/>`,K=z?n`<${fn} w=${U} entry=${z}/>`:Ee===`aictl`&&M?n`<${mn} w=${U} aictl=${M}/>`:n`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),n`<div class="st-ws" data-view=${S.view}>
    <div class="st-head">
      <${Ve} class="st-pivot" options=${sr} value=${S.view} ariaLabel="Settings view"
        onChange=${e=>C({view:e})}/>
      <label class="st-searchbox">
        <${Re} name="search" size="14"/>
        <input ref=${O} type="search" class="st-search" value=${w}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${e=>T(e.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${`st-toggle`+(E?` is-on`:``)} aria-pressed=${E?`true`:`false`}
        onClick=${()=>ie(!E)}>Only non-default</button>
      <button type="button" class=${`st-toggle st-toggle--risky`+(D?` is-on`:``)} aria-pressed=${D?`true`:`false`}
        onClick=${()=>ae(!D)}>Only risky</button>
      ${(ze||a.keepUnsetControl)&&n`<button type="button" class=${`st-toggle`+(S.unset?` is-on`:``)} disabled=${!ze} aria-pressed=${S.unset?`true`:`false`}
        onClick=${()=>C({unset:!S.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${j.length}</b> tools</span>
        <span><b>${I.length}</b> files</span>
        <span><b>${Fe}</b> settings</span>
        <span data-kpi="agents"><b>${Le}</b> agents</span>
        ${ze&&n`<span data-kpi="unset"><b>${W}</b> unset</span>`}
        <span class=${Be?`st-red`:``}><b>${Be}</b> risky</span>
        <span><b>${k.status===`loading`&&!k.audit?`…`:be.length}</b> findings</span>
      </div>
    </div>
    ${l&&n`<p class="st-wsnote" data-testid="st-wsnote">${l}</p>`}
    ${a.unavailable&&n`<p class="st-wsnote" role="status">${a.unavailable}</p>`}
    ${y?n`<${pr} records=${b}/>`:null}
    ${Ue&&n`<div class="st-scope-empty"><${He} enabledTools=${m} snap=${x} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${G}</div>
      <div class="st-col st-col--main">${K}</div>
      <${or} w=${U}/>
    </div>
  </div>`}export{fr as auditState,mr as default};