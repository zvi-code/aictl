import{x as N,d as S,y as q,T as M,m as a}from"./index-pAYO6Exu.js";import{e as X,ap as Z,L as U,M as ee,r as Y,af as G,ah as O,b1 as se,b2 as I,b3 as te}from"./useSse-DQLBdxds.js";import{S as P,a as ne,T as ae,c as oe,D as W,k as B}from"./app-CpR1BSrN.js";function E(e){const n=e.live||{};return n.pid_count>0||n.session_count>0||(e.processes||[]).length>0}function L({label:e}){return a`<div class="c-overline cagents-rule">
    <div class="cagents-rule-line"></div>
    <div class="cagents-rule-label">${e}</div>
    <div class="cagents-rule-line"></div>
  </div>`}function le({label:e,value:n}){return a`<div class="cagents-stat">
    <div class="c-overline">${e}</div>
    <div class="c-stat-value cagents-stat-value">${n}</div>
  </div>`}function ie(e){return e?new Date(e*1e3).toLocaleString():"—"}function ce(e){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[e]||e||"unknown"}function re(e){return e!=null&&e.message?e.message.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':e.message.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':e.message.includes("chat.useHooks")?'"chat.useHooks": true':e.message:""}function A(e){return(e||[]).join(`
`)}function J(e){return e.split(`
`).map(n=>n.trim()).filter(Boolean)}function K(e,n){const s=new Set(e||[]),t=new Set(n||[]);return{added:[...t].filter(c=>!s.has(c)),removed:[...s].filter(c=>!t.has(c))}}function V({title:e,diff:n}){const s=n.added.length||n.removed.length;return a`<div class="cagents-editor-diff-row">
    <span>${e}</span>
    <div>
      ${s?a`${n.added.map(t=>a`<code key=${"a"+t} class="is-added">+ ${t}</code>`)}
          ${n.removed.map(t=>a`<code key=${"r"+t} class="is-removed">- ${t}</code>`)}`:a`<code>no change</code>`}
    </div>
  </div>`}function de({tool:e,label:n,onClose:s}){var R,j;const[t,c]=S(null),[u,r]=S(""),[d,l]=S(""),[g,$]=S(!0),[i,f]=S(!1),[w,m]=S(""),[h,T]=S("");q(()=>{let k=!0;return $(!0),m(""),T(""),se(e).then(D=>{var F,H;k&&(c(D),r(A((F=D.permissions)==null?void 0:F.allow)),l(A((H=D.permissions)==null?void 0:H.deny)),$(!1))}).catch(D=>{k&&(m(D.message||"Failed to load config"),$(!1))}),()=>{k=!1}},[e]);const _=J(u),o=J(d),b=((R=t==null?void 0:t.permissions)==null?void 0:R.allow)||[],p=((j=t==null?void 0:t.permissions)==null?void 0:j.deny)||[],y=K(b,_),x=K(p,o),v=JSON.stringify(b)!==JSON.stringify(_)||JSON.stringify(p)!==JSON.stringify(o),C=JSON.stringify({permissions:{allow:_,deny:o}},null,2),Q=()=>{f(!0),m(""),T(""),te(e,{expected_mtime:t==null?void 0:t.mtime,permissions:{allow:_,deny:o}}).then(k=>{var D,F;c(k),r(A((D=k.permissions)==null?void 0:D.allow)),l(A((F=k.permissions)==null?void 0:F.deny)),T(k.backup_path||""),f(!1),B.success("Configuration saved")}).catch(k=>{m(k.message||"Failed to save config"),f(!1),B.error("Configuration save failed")})};return a`<${W} open=${!0} onClose=${s} ariaLabel=${"Edit "+n+" configuration"} class="cagents-editor-dialog">
    <div class="cagents-editor-head">
      <div>
        <div class="c-overline c-overline--wide">Project configuration</div>
        <div class="cagents-editor-title">${n} permissions</div>
        ${(t==null?void 0:t.path)&&a`<div class="cagents-editor-path">${t.path}</div>`}
      </div>
      <button class="cagents-editor-close" onClick=${s} aria-label="Close">x</button>
    </div>
    ${g?a`<div class="cagents-editor-state">Loading...</div>`:w&&!t?a`<div class="cagents-editor-error">${w}</div>`:a`<div class="cagents-editor-body">
          ${w&&a`<div class="cagents-editor-error">${w}</div>`}
          ${h&&a`<div class="cagents-editor-saved">Saved - backup ${h}</div>`}
          <div class="cagents-editor-fields">
            <label>
              <span>Allowed tools</span>
              <textarea value=${u} onInput=${k=>r(k.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
            <label>
              <span>Denied tools</span>
              <textarea value=${d} onInput=${k=>l(k.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
          </div>
          <div class="cagents-editor-preview">
            <div class="cagents-editor-subtitle">Pending diff</div>
            <${V} title="allow" diff=${y}/>
            <${V} title="deny" diff=${x}/>
            <pre>${C}</pre>
          </div>
        </div>`}
    <div class="cagents-editor-actions">
      <button class="c-btn cagents-btn" onClick=${s}>Cancel</button>
      <button class="c-btn cagents-btn c-btn--primary" onClick=${Q} disabled=${g||i||!v}>
        ${i?"Saving...":"Save changes"}
      </button>
    </div>
  </${W}>`}function ve({tool:e,hooksStatus:n}){var l,g,$;const s=((l=n==null?void 0:n.tools)==null?void 0:l[e.tool])||null,t=((g=n==null?void 0:n.counts_by_tool_kind)==null?void 0:g[e.tool])||{},c=(s==null?void 0:s.warnings)||[],u=(s==null?void 0:s.configured_events)||[],r=(s==null?void 0:s.missing_events)||[],d=(s==null?void 0:s.status)==="active"?"is-active":(s==null?void 0:s.status)==="disabled"||(s==null?void 0:s.status)==="misconfigured"?"is-disabled":"";return a`<div>
    <div class="cagents-hook-summary">
      <div class=${"cagents-hook-status "+d} title=${(s==null?void 0:s.status)==="misconfigured"?"hook commands post to a different port than this dashboard":""}>
        ${ce(s==null?void 0:s.status)}
      </div>
      <div class="cagents-hook-metrics">
        <span title=${r.length?"missing: "+r.join(", "):"all expected events registered"}>${(s==null?void 0:s.configured_count)||0} configured${r.length?` (${r.length} missing)`:""}</span>
        <span>${(s==null?void 0:s.fired_24h)||0} fired / 24h</span>
        <span>last ${ie(s==null?void 0:s.last_fire_ts)}</span>
      </div>
    </div>
    ${c.map(i=>a`<div key=${i.path+i.message} class="cagents-hook-warning">
      ${i.message}<br/>
      <code>${re(i)}</code>
    </div>`)}
    <div class="cagents-hook-events">
      ${u.length>0?u.slice(0,10).map(i=>a`<span key=${i} class="cagents-hook-chip">${i}</span>`):a`<span class="cagents-hook-muted">no aictl-owned hooks configured</span>`}
    </div>
    ${Object.keys(t).length>0&&a`<div class="cagents-hook-counts">
      ${Object.entries(t).sort((i,f)=>f[1]-i[1]).slice(0,8).map(([i,f])=>a`<span key=${i}>${i} ${f}</span>`)}
    </div>`}
    ${(($=s==null?void 0:s.sources)==null?void 0:$.length)>0&&a`<div class="cagents-hook-sources">
      ${s.sources.map(i=>a`<div key=${i.path} class="cagents-hook-source">
        <span>${i.scope}</span>
        <span>${i.configured_count||0} events</span>
        <span class=${i.host_enabled?"":"is-disabled"}>${i.host_enabled?"loaded":"ignored"}</span>
      </div>`)}
    </div>`}
  </div>`}function ue({tool:e,hooksStatus:n}){var o,b,p,y,x;const s=((o=N(P))==null?void 0:o.enabledTools)??null,t=U(s),c=(n==null?void 0:n.skill_usage)||{},u=(n==null?void 0:n.subagents)||{},r=(n==null?void 0:n.tool_calls)||{},d=t?I(r.by_tool,s):null,l=t?I(c.by_tool,s):null,g=t?I(u.by_tool,s,v=>v==null?void 0:v.starts):null,$=t?"selected tools":"all tools",i=v=>v&&v.hidden?`${v.hidden} from tools that could not be identified are not counted`:void 0,f=c.by_tool_skill?Object.entries(c.by_tool_skill[e.tool]||{}).map(([v,C])=>({skill:v,count:C})).sort((v,C)=>C.count-v.count||v.skill.localeCompare(C.skill)):c.by_skill||[],w=((b=c.by_tool)==null?void 0:b[e.tool])||0,m=((p=u.by_tool)==null?void 0:p[e.tool])||{starts:0},h=((y=r.by_tool)==null?void 0:y[e.tool])||0,T=Object.entries(((x=r.by_tool_name)==null?void 0:x[e.tool])||{}).sort((v,C)=>C[1]-v[1]).slice(0,6),_=w===0&&(m.starts||0)===0&&h===0;return a`<div class="cagents-activity-report">
    <div class="cagents-activity-row">
      <span>Tool calls</span>
      <strong>${h}</strong>
      <span class="cagents-hook-muted" title=${i(d)} data-testid="agents-calls-total">${t?d.total:r.total_calls_24h||0} ${$} / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Skill calls</span>
      <strong>${w}</strong>
      <span class="cagents-hook-muted" title=${i(l)}>${t?l.total:c.total_calls_24h||0} ${$} / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Subagents</span>
      <strong>${m.starts||0}</strong>
      <span class="cagents-hook-muted" title=${i(g)}>${t?g.total:u.starts_24h||0} starts${t?", selected tools":""} / 24h</span>
    </div>
    ${T.length>0&&a`<div class="cagents-skill-list">
      ${T.map(([v,C])=>a`<span key=${v}>${v} ${C}</span>`)}
    </div>`}
    ${f.length>0&&a`<div class="cagents-skill-list">
      ${f.slice(0,6).map(v=>a`<span key=${v.skill}>${v.skill} ${v.count}</span>`)}
    </div>`}
    ${_&&a`<div class="cagents-hook-muted" style="margin-top:8px">
      No hook activity in the last 24h. Tool, skill, and subagent counts require
      aictl lifecycle hooks — agents that report only via OTel will show zero here.
    </div>`}
  </div>`}const z={auto:{color:"var(--green)",bg:"var(--green-soft, #E6EFE3)",border:"var(--green)"},ask:{color:"var(--orange)",bg:"transparent",border:"var(--orange)"},deny:{color:"var(--accent)",bg:"var(--accent-soft)",border:"var(--accent)"},"n/a":{color:"var(--fg3)",bg:"transparent",border:"var(--border)"}};function ge({val:e}){const n=z[e]||z["n/a"];return a`<span class="cagents-perm-badge"
    style="color:${n.color};background:${n.bg};border-color:${n.border}">${e}</span>`}function pe(e){if(((e==null?void 0:e.features)||{}).global_autoApprove)return[["MCP Servers","auto"],["File Reads","auto"],["File Writes","auto"],["Shell","auto"],["Web Fetch","auto"],["Network","auto"]];const t=((e==null?void 0:e.settings)||{}).permissions||{},c=(t.allow||[]).map(l=>l.toLowerCase()),u=(t.deny||[]).map(l=>l.toLowerCase()),r=(t.ask||[]).map(l=>l.toLowerCase()),d=(...l)=>l.some(g=>u.some($=>$.startsWith(g)))?"deny":l.some(g=>c.some($=>$.startsWith(g)))?"auto":l.some(g=>r.some($=>$.startsWith(g)))?"ask":c.length===0&&u.length===0&&r.length===0?"n/a":"ask";return[["MCP Servers",d("mcp")],["File Reads",d("read","glob","grep","ls")],["File Writes",d("write","edit","create","multiedit")],["Shell",d("bash","execute")],["Web Fetch",d("webfetch","fetch")],["Network","n/a"]]}function $e({tool:e,toolConfig:n,hooksStatus:s,onViewSessions:t,onViewConfig:c,onEditConfig:u}){var b;const r=(b=N(P))==null?void 0:b.snap,d=e.live||{},l=e.processes||[],g=e.mcp_servers||[];l.reduce((p,y)=>p+(parseFloat(y.cpu_pct)||0),0);const i=(l.length>0&&(l[0].cmdline||l[0].name)||"").split(" ")[0]||null,f=(n==null?void 0:n.version)||null,w=(n==null?void 0:n.notes)||null,m=(n==null?void 0:n.otel)||{},h=m.enabled?["events","tokens","timing",...m.capture_content?["prompts","responses"]:[]]:[],T=[["Sessions",d.session_count??0],["Tokens",Y(G(d))],["Processes",d.pid_count??l.length],["MCP servers",g.length],["Captured fields",h.length>0?h.length:"—"],["OTel",m.enabled?"active":"off"]],_=pe(n),o=[i?["binary",i]:null,f?["version",f]:null,h.length>0?["capture","["+h.map(p=>`"${p}"`).join(", ")+"]"]:["capture","—"],["enabled",E(e)?"true":"false"]].filter(Boolean);return a`<div class="cagents-detail">
    <div class="c-overline c-overline--wide">Agent profile</div>
    <div class="cagents-detail-headline">
      <span class="cagents-detail-title">${e.label}</span>
      ${f&&a`<span class="cagents-detail-version">v${f}</span>`}
      <span class="cagents-detail-id">${e.tool}</span>
    </div>
    ${w&&a`<div class="cagents-detail-notes">${w}</div>`}

    ${O(e,r)&&a`<${oe} tool=${e}/>`}
    <div class="cagents-detail-section" hidden=${O(e,r)}><${L} label="Stats"/></div>
    <div class="cagents-stats-grid" hidden=${O(e,r)}>
      ${T.map(([p,y])=>a`<${le} key=${p} label=${p} value=${y}/>`)}
    </div>

    <div class="cagents-detail-section"><${L} label="Permissions"/></div>
    <div class="cagents-perms-grid">
      ${_.map(([p,y],x)=>a`<div key=${p}
        class=${"cagents-perm-row"+(x>=2?" cagents-perm-row--top":"")+(x%2===0?" cagents-perm-row--left":"")}>
        <span class="cagents-perm-key">${p}</span>
        <${ge} val=${y}/>
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${L} label="Configuration"/></div>
    <div class="cagents-config-block">
      ${o.map(([p,y])=>a`<div key=${p}>
        <span class="cagents-config-key">${p}</span> = ${y}
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${L} label="Hooks"/></div>
    <${ve} tool=${e} hooksStatus=${s}/>

    <div class="cagents-detail-section"><${L} label="Tool & skill activity"/></div>
    <${ue} tool=${e} hooksStatus=${s}/>

    <div class="cagents-actions">
      ${e.tool==="claude-code"?a`<button class="c-btn cagents-btn c-btn--primary" onClick=${u}>Edit permissions</button>`:a`<button class="c-btn cagents-btn c-btn--primary" onClick=${c}>Open configuration</button>`}
      <button class="c-btn cagents-btn"
        onClick=${t}>View sessions</button>
    </div>
  </div>`}function be({tool:e,selected:n,onSelect:s}){const t=e.live||{};ee(e.tool);const c=E(e),u=n===e.tool;return a`<div class=${"c-row c-row--list"+(u?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${u?"true":"false"}
    onKeyDown=${r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <${ae} tool=${e.tool} size="12px"/>
      <span class="cagents-row-label">${e.label}</span>
      <span class=${"c-overline cagents-row-status"+(c?" is-on":"")}>
        ${c?"● on":"off"}
      </span>
    </div>
    <div class="cagents-row-meta">
      ${Y(G(t))} tok \u00b7 ${t.session_count||0} sessions
    </div>
  </div>`}function fe({tool:e,selected:n,onSelect:s}){const t=n===e.tool;return a`<div class=${"c-row c-row--list cagents-row--inactive"+(t?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${t?"true":"false"}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${e.label}</span>
      <span class="c-overline">view</span>
    </div>
  </div>`}function ke({onViewSessions:e,onViewConfig:n}){const s=N(P),t=s==null?void 0:s.snap,[c,u]=S(null);q(()=>{let o=!0;const b=()=>{X().then(y=>{o&&u(y)}).catch(()=>{o&&u(null)})};b();const p=setInterval(b,15e3);return()=>{o=!1,clearInterval(p)}},[]);const r=M(()=>{const o={};for(const b of(t==null?void 0:t.tool_configs)||[])b.tool&&(o[b.tool]=b);return o},[t]),{active:d,inactive:l}=M(()=>{const o=((t==null?void 0:t.tools)||[]).filter(b=>b.tool!=="aictl");return{active:o.filter(E),inactive:o.filter(b=>!E(b))}},[t]),[g,$]=S(null),[i,f]=S(null),w=[...d,...l].map(o=>o.tool),m=g&&w.includes(g)?g:Z(d.map(o=>o.tool),null)??w[0]??null,h=d.find(o=>o.tool===m)??l.find(o=>o.tool===m),T=m?r[m]:null,_=(s==null?void 0:s.enabledTools)??null;return!d.length&&!l.length&&U(_)?a`<div class="c-shell"><${ne} enabledTools=${_} snap=${t} what="agents"/></div>`:a`<div class="c-shell">
    <div class="cagents-toolbar">
      <span class="c-overline">
        ${d.length} of ${d.length+l.length} agents active
      </span>
    </div>
    <div class="cagents-body">
      <div class="cagents-list">
        ${d.length>0&&a`<div class="c-overline cagents-list-heading">Active</div>`}
        ${d.map(o=>a`<${be} key=${o.tool}
          tool=${o} selected=${m} onSelect=${$}/>`)}

        ${l.length>0&&a`<div class="c-overline cagents-list-heading">Detected, not active</div>`}
        ${l.map(o=>a`<${fe} key=${o.tool}
          tool=${o} selected=${m} onSelect=${$}/>`)}
      </div>
      <div class="cagents-detail-pane">
        ${h?a`<${$e}
              tool=${h}
              toolConfig=${T}
              hooksStatus=${c}
              onViewSessions=${e??(()=>{})}
              onViewConfig=${n??(()=>{})}
              onEditConfig=${()=>f({tool:h.tool,label:h.label})}
            />`:a`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
    ${i&&a`<${de}
      tool=${i.tool}
      label=${i.label}
      onClose=${()=>f(null)}/>`}
  </div>`}export{ke as default};
