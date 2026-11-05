import{x as B,S as J,d as _,y as K,aL as G,T as P,F as Q,w as X,z as Z,m as a,at as ee,p as se,b as z,l as V,t as E,K as te,aM as ne,aN as I,aO as ae,aP as R}from"./index-cRmfUh63.js";function A(e){const t=e.live||{};return t.pid_count>0||t.session_count>0||(e.processes||[]).length>0}function x({label:e}){return a`<div class="c-overline cagents-rule">
    <div class="cagents-rule-line"></div>
    <div class="cagents-rule-label">${e}</div>
    <div class="cagents-rule-line"></div>
  </div>`}function oe({label:e,value:t}){return a`<div class="cagents-stat">
    <div class="c-overline">${e}</div>
    <div class="c-stat-value cagents-stat-value">${t}</div>
  </div>`}function le(e){return e?new Date(e*1e3).toLocaleString():"—"}function ie(e){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[e]||e||"unknown"}function ce(e){return e!=null&&e.message?e.message.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':e.message.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':e.message.includes("chat.useHooks")?'"chat.useHooks": true':e.message:""}function F(e){return(e||[]).join(`
`)}function j(e){return e.split(`
`).map(t=>t.trim()).filter(Boolean)}function H(e,t){const s=new Set(e||[]),n=new Set(t||[]);return{added:[...n].filter(c=>!s.has(c)),removed:[...s].filter(c=>!n.has(c))}}function M({title:e,diff:t}){const s=t.added.length||t.removed.length;return a`<div class="cagents-editor-diff-row">
    <span>${e}</span>
    <div>
      ${s?a`${t.added.map(n=>a`<code key=${"a"+n} class="is-added">+ ${n}</code>`)}
          ${t.removed.map(n=>a`<code key=${"r"+n} class="is-removed">- ${n}</code>`)}`:a`<code>no change</code>`}
    </div>
  </div>`}function re({tool:e,label:t,onClose:s}){var L,O;const[n,c]=_(null),[g,d]=_(""),[r,o]=_(""),[u,p]=_(!0),[l,$]=_(!1),[y,b]=_(""),[v,k]=_("");K(()=>{let h=!0;return p(!0),b(""),k(""),ne(e).then(S=>{var C,N;h&&(c(S),d(F((C=S.permissions)==null?void 0:C.allow)),o(F((N=S.permissions)==null?void 0:N.deny)),p(!1))}).catch(S=>{h&&(b(S.message||"Failed to load config"),p(!1))}),()=>{h=!1}},[e]);const T=j(g),i=j(r),m=((L=n==null?void 0:n.permissions)==null?void 0:L.allow)||[],f=((O=n==null?void 0:n.permissions)==null?void 0:O.deny)||[],w=H(m,T),D=H(f,i),q=JSON.stringify(m)!==JSON.stringify(T)||JSON.stringify(f)!==JSON.stringify(i),U=JSON.stringify({permissions:{allow:T,deny:i}},null,2),Y=()=>{$(!0),b(""),k(""),ae(e,{expected_mtime:n==null?void 0:n.mtime,permissions:{allow:T,deny:i}}).then(h=>{var S,C;c(h),d(F((S=h.permissions)==null?void 0:S.allow)),o(F((C=h.permissions)==null?void 0:C.deny)),k(h.backup_path||""),$(!1),R.success("Configuration saved")}).catch(h=>{b(h.message||"Failed to save config"),$(!1),R.error("Configuration save failed")})};return a`<${I} open=${!0} onClose=${s} ariaLabel=${"Edit "+t+" configuration"} class="cagents-editor-dialog">
    <div class="cagents-editor-head">
      <div>
        <div class="c-overline c-overline--wide">Project configuration</div>
        <div class="cagents-editor-title">${t} permissions</div>
        ${(n==null?void 0:n.path)&&a`<div class="cagents-editor-path">${n.path}</div>`}
      </div>
      <button class="cagents-editor-close" onClick=${s} aria-label="Close">x</button>
    </div>
    ${u?a`<div class="cagents-editor-state">Loading...</div>`:y&&!n?a`<div class="cagents-editor-error">${y}</div>`:a`<div class="cagents-editor-body">
          ${y&&a`<div class="cagents-editor-error">${y}</div>`}
          ${v&&a`<div class="cagents-editor-saved">Saved - backup ${v}</div>`}
          <div class="cagents-editor-fields">
            <label>
              <span>Allowed tools</span>
              <textarea value=${g} onInput=${h=>d(h.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
            <label>
              <span>Denied tools</span>
              <textarea value=${r} onInput=${h=>o(h.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
          </div>
          <div class="cagents-editor-preview">
            <div class="cagents-editor-subtitle">Pending diff</div>
            <${M} title="allow" diff=${w}/>
            <${M} title="deny" diff=${D}/>
            <pre>${U}</pre>
          </div>
        </div>`}
    <div class="cagents-editor-actions">
      <button class="c-btn cagents-btn" onClick=${s}>Cancel</button>
      <button class="c-btn cagents-btn c-btn--primary" onClick=${Y} disabled=${u||l||!q}>
        ${l?"Saving...":"Save changes"}
      </button>
    </div>
  </${I}>`}function de({tool:e,hooksStatus:t}){var o,u,p;const s=((o=t==null?void 0:t.tools)==null?void 0:o[e.tool])||null,n=((u=t==null?void 0:t.counts_by_tool_kind)==null?void 0:u[e.tool])||{},c=(s==null?void 0:s.warnings)||[],g=(s==null?void 0:s.configured_events)||[],d=(s==null?void 0:s.missing_events)||[],r=(s==null?void 0:s.status)==="active"?"is-active":(s==null?void 0:s.status)==="disabled"||(s==null?void 0:s.status)==="misconfigured"?"is-disabled":"";return a`<div>
    <div class="cagents-hook-summary">
      <div class=${"cagents-hook-status "+r} title=${(s==null?void 0:s.status)==="misconfigured"?"hook commands post to a different port than this dashboard":""}>
        ${ie(s==null?void 0:s.status)}
      </div>
      <div class="cagents-hook-metrics">
        <span title=${d.length?"missing: "+d.join(", "):"all expected events registered"}>${(s==null?void 0:s.configured_count)||0} configured${d.length?` (${d.length} missing)`:""}</span>
        <span>${(s==null?void 0:s.fired_24h)||0} fired / 24h</span>
        <span>last ${le(s==null?void 0:s.last_fire_ts)}</span>
      </div>
    </div>
    ${c.map(l=>a`<div key=${l.path+l.message} class="cagents-hook-warning">
      ${l.message}<br/>
      <code>${ce(l)}</code>
    </div>`)}
    <div class="cagents-hook-events">
      ${g.length>0?g.slice(0,10).map(l=>a`<span key=${l} class="cagents-hook-chip">${l}</span>`):a`<span class="cagents-hook-muted">no aictl-owned hooks configured</span>`}
    </div>
    ${Object.keys(n).length>0&&a`<div class="cagents-hook-counts">
      ${Object.entries(n).sort((l,$)=>$[1]-l[1]).slice(0,8).map(([l,$])=>a`<span key=${l}>${l} ${$}</span>`)}
    </div>`}
    ${((p=s==null?void 0:s.sources)==null?void 0:p.length)>0&&a`<div class="cagents-hook-sources">
      ${s.sources.map(l=>a`<div key=${l.path} class="cagents-hook-source">
        <span>${l.scope}</span>
        <span>${l.configured_count||0} events</span>
        <span class=${l.host_enabled?"":"is-disabled"}>${l.host_enabled?"loaded":"ignored"}</span>
      </div>`)}
    </div>`}
  </div>`}function ve({tool:e,hooksStatus:t}){var l,$,y,b;const s=(t==null?void 0:t.skill_usage)||{},n=(t==null?void 0:t.subagents)||{},c=(t==null?void 0:t.tool_calls)||{},g=s.by_skill||[],d=((l=s.by_tool)==null?void 0:l[e.tool])||0,r=(($=n.by_tool)==null?void 0:$[e.tool])||{starts:0},o=((y=c.by_tool)==null?void 0:y[e.tool])||0,u=Object.entries(((b=c.by_tool_name)==null?void 0:b[e.tool])||{}).sort((v,k)=>k[1]-v[1]).slice(0,6),p=d===0&&(r.starts||0)===0&&o===0;return a`<div class="cagents-activity-report">
    <div class="cagents-activity-row">
      <span>Tool calls</span>
      <strong>${o}</strong>
      <span class="cagents-hook-muted">${c.total_calls_24h||0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Skill calls</span>
      <strong>${d}</strong>
      <span class="cagents-hook-muted">${s.total_calls_24h||0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Subagents</span>
      <strong>${r.starts||0}</strong>
      <span class="cagents-hook-muted">${n.starts_24h||0} starts / 24h</span>
    </div>
    ${u.length>0&&a`<div class="cagents-skill-list">
      ${u.map(([v,k])=>a`<span key=${v}>${v} ${k}</span>`)}
    </div>`}
    ${g.length>0&&a`<div class="cagents-skill-list">
      ${g.slice(0,6).map(v=>a`<span key=${v.skill}>${v.skill} ${v.count}</span>`)}
    </div>`}
    ${p&&a`<div class="cagents-hook-muted" style="margin-top:8px">
      No hook activity in the last 24h. Tool, skill, and subagent counts require
      aictl lifecycle hooks — agents that report only via OTel will show zero here.
    </div>`}
  </div>`}const W={auto:{color:"var(--green)",bg:"var(--green-soft, #E6EFE3)",border:"var(--green)"},ask:{color:"var(--orange)",bg:"transparent",border:"var(--orange)"},deny:{color:"var(--accent)",bg:"var(--accent-soft)",border:"var(--accent)"},"n/a":{color:"var(--fg3)",bg:"transparent",border:"var(--border)"}};function ue({val:e}){const t=W[e]||W["n/a"];return a`<span class="cagents-perm-badge"
    style="color:${t.color};background:${t.bg};border-color:${t.border}">${e}</span>`}function ge(e){if(((e==null?void 0:e.features)||{}).global_autoApprove)return[["MCP Servers","auto"],["File Reads","auto"],["File Writes","auto"],["Shell","auto"],["Web Fetch","auto"],["Network","auto"]];const n=((e==null?void 0:e.settings)||{}).permissions||{},c=(n.allow||[]).map(o=>o.toLowerCase()),g=(n.deny||[]).map(o=>o.toLowerCase()),d=(n.ask||[]).map(o=>o.toLowerCase()),r=(...o)=>o.some(u=>g.some(p=>p.startsWith(u)))?"deny":o.some(u=>c.some(p=>p.startsWith(u)))?"auto":o.some(u=>d.some(p=>p.startsWith(u)))?"ask":c.length===0&&g.length===0&&d.length===0?"n/a":"ask";return[["MCP Servers",r("mcp")],["File Reads",r("read","glob","grep","ls")],["File Writes",r("write","edit","create","multiedit")],["Shell",r("bash","execute")],["Web Fetch",r("webfetch","fetch")],["Network","n/a"]]}function pe({tool:e,toolConfig:t,hooksStatus:s,onViewSessions:n,onViewConfig:c,onEditConfig:g}){var m;const d=(m=B(J))==null?void 0:m.snap,r=e.live||{},o=e.processes||[],u=e.mcp_servers||[];o.reduce((f,w)=>f+(parseFloat(w.cpu_pct)||0),0);const l=(o.length>0&&(o[0].cmdline||o[0].name)||"").split(" ")[0]||null,$=(t==null?void 0:t.version)||null,y=(t==null?void 0:t.notes)||null,b=(t==null?void 0:t.otel)||{},v=b.enabled?["events","tokens","timing",...b.capture_content?["prompts","responses"]:[]]:[],k=[["Sessions",r.session_count??0],["Tokens",z(V(r))],["Processes",r.pid_count??o.length],["MCP servers",u.length],["Captured fields",v.length>0?v.length:"—"],["OTel",b.enabled?"active":"off"]],T=ge(t),i=[l?["binary",l]:null,$?["version",$]:null,v.length>0?["capture","["+v.map(f=>`"${f}"`).join(", ")+"]"]:["capture","—"],["enabled",A(e)?"true":"false"]].filter(Boolean);return a`<div class="cagents-detail">
    <div class="c-overline c-overline--wide">Agent profile</div>
    <div class="cagents-detail-headline">
      <span class="cagents-detail-title">${e.label}</span>
      ${$&&a`<span class="cagents-detail-version">v${$}</span>`}
      <span class="cagents-detail-id">${e.tool}</span>
    </div>
    ${y&&a`<div class="cagents-detail-notes">${y}</div>`}

    ${E(e,d)&&a`<${te} tool=${e}/>`}
    <div class="cagents-detail-section" hidden=${E(e,d)}><${x} label="Stats"/></div>
    <div class="cagents-stats-grid" hidden=${E(e,d)}>
      ${k.map(([f,w])=>a`<${oe} key=${f} label=${f} value=${w}/>`)}
    </div>

    <div class="cagents-detail-section"><${x} label="Permissions"/></div>
    <div class="cagents-perms-grid">
      ${T.map(([f,w],D)=>a`<div key=${f}
        class=${"cagents-perm-row"+(D>=2?" cagents-perm-row--top":"")+(D%2===0?" cagents-perm-row--left":"")}>
        <span class="cagents-perm-key">${f}</span>
        <${ue} val=${w}/>
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${x} label="Configuration"/></div>
    <div class="cagents-config-block">
      ${i.map(([f,w])=>a`<div key=${f}>
        <span class="cagents-config-key">${f}</span> = ${w}
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${x} label="Hooks"/></div>
    <${de} tool=${e} hooksStatus=${s}/>

    <div class="cagents-detail-section"><${x} label="Tool & skill activity"/></div>
    <${ve} tool=${e} hooksStatus=${s}/>

    <div class="cagents-actions">
      ${e.tool==="claude-code"?a`<button class="c-btn cagents-btn c-btn--primary" onClick=${g}>Edit permissions</button>`:a`<button class="c-btn cagents-btn c-btn--primary" onClick=${c}>Open configuration</button>`}
      <button class="c-btn cagents-btn"
        onClick=${n}>View sessions</button>
    </div>
  </div>`}function $e({tool:e,selected:t,onSelect:s}){const n=e.live||{};ee(e.tool);const c=A(e),g=t===e.tool;return a`<div class=${"c-row c-row--list"+(g?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${g?"true":"false"}
    onKeyDown=${d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <${se} tool=${e.tool} size="12px"/>
      <span class="cagents-row-label">${e.label}</span>
      <span class=${"c-overline cagents-row-status"+(c?" is-on":"")}>
        ${c?"● on":"off"}
      </span>
    </div>
    <div class="cagents-row-meta">
      ${z(V(n))} tok \u00b7 ${n.session_count||0} sessions
    </div>
  </div>`}function be({tool:e,selected:t,onSelect:s}){const n=t===e.tool;return a`<div class=${"c-row c-row--list cagents-row--inactive"+(n?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${n?"true":"false"}
    onKeyDown=${c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${e.label}</span>
      <span class="c-overline">view</span>
    </div>
  </div>`}function me({onViewSessions:e,onViewConfig:t}){const s=B(J),n=s==null?void 0:s.snap,[c,g]=_(null);K(()=>{let i=!0;const m=()=>{G().then(w=>{i&&g(w)}).catch(()=>{i&&g(null)})};m();const f=setInterval(m,15e3);return()=>{i=!1,clearInterval(f)}},[]);const d=P(()=>{const i={};for(const m of(n==null?void 0:n.tool_configs)||[])m.tool&&(i[m.tool]=m);return i},[n]),{active:r,inactive:o}=P(()=>{const i=((n==null?void 0:n.tools)||[]).filter(m=>m.tool!=="aictl");return{active:i.filter(A),inactive:i.filter(m=>!A(m))}},[n]),[u,p]=_(null),[l,$]=_(null),y=[...r,...o].map(i=>i.tool),b=u&&y.includes(u)?u:Q(r.map(i=>i.tool),null)??y[0]??null,v=r.find(i=>i.tool===b)??o.find(i=>i.tool===b),k=b?d[b]:null,T=(s==null?void 0:s.enabledTools)??null;return!r.length&&!o.length&&X(T)?a`<div class="c-shell"><${Z} enabledTools=${T} snap=${n} what="agents"/></div>`:a`<div class="c-shell">
    <div class="cagents-toolbar">
      <span class="c-overline">
        ${r.length} of ${r.length+o.length} agents active
      </span>
    </div>
    <div class="cagents-body">
      <div class="cagents-list">
        ${r.length>0&&a`<div class="c-overline cagents-list-heading">Active</div>`}
        ${r.map(i=>a`<${$e} key=${i.tool}
          tool=${i} selected=${b} onSelect=${p}/>`)}

        ${o.length>0&&a`<div class="c-overline cagents-list-heading">Detected, not active</div>`}
        ${o.map(i=>a`<${be} key=${i.tool}
          tool=${i} selected=${b} onSelect=${p}/>`)}
      </div>
      <div class="cagents-detail-pane">
        ${v?a`<${pe}
              tool=${v}
              toolConfig=${k}
              hooksStatus=${c}
              onViewSessions=${e??(()=>{})}
              onViewConfig=${t??(()=>{})}
              onEditConfig=${()=>$({tool:v.tool,label:v.label})}
            />`:a`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
    ${l&&a`<${re}
      tool=${l.tool}
      label=${l.label}
      onClose=${()=>$(null)}/>`}
  </div>`}export{me as default};
