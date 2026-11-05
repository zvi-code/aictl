import{x as J,S as B,d as w,y as K,aI as G,T as N,m as a,aq as Q,p as X,b as V,l as q,t as L,E as Z,aJ as ee,aK as P,aL as se,aM as R}from"./index-DZ1nb8NJ.js";function F(e){const t=e.live||{};return t.pid_count>0||t.session_count>0||(e.processes||[]).length>0}function S({label:e}){return a`<div class="c-overline cagents-rule">
    <div class="cagents-rule-line"></div>
    <div class="cagents-rule-label">${e}</div>
    <div class="cagents-rule-line"></div>
  </div>`}function te({label:e,value:t}){return a`<div class="cagents-stat">
    <div class="c-overline">${e}</div>
    <div class="c-stat-value cagents-stat-value">${t}</div>
  </div>`}function ne(e){return e?new Date(e*1e3).toLocaleString():"—"}function ae(e){return{active:"active",configured:"configured",disabled:"host-disabled",misconfigured:"wrong port",observed:"observed",missing:"missing"}[e]||e||"unknown"}function oe(e){return e!=null&&e.message?e.message.includes("~/.copilot/hooks")?'"chat.hookFilesLocations": { "~/.copilot/hooks": true }':e.message.includes(".github/hooks")?'"chat.hookFilesLocations": { ".github/hooks": true }':e.message.includes("chat.useHooks")?'"chat.useHooks": true':e.message:""}function E(e){return(e||[]).join(`
`)}function j(e){return e.split(`
`).map(t=>t.trim()).filter(Boolean)}function H(e,t){const s=new Set(e||[]),n=new Set(t||[]);return{added:[...n].filter(i=>!s.has(i)),removed:[...s].filter(i=>!n.has(i))}}function M({title:e,diff:t}){const s=t.added.length||t.removed.length;return a`<div class="cagents-editor-diff-row">
    <span>${e}</span>
    <div>
      ${s?a`${t.added.map(n=>a`<code key=${"a"+n} class="is-added">+ ${n}</code>`)}
          ${t.removed.map(n=>a`<code key=${"r"+n} class="is-removed">- ${n}</code>`)}`:a`<code>no change</code>`}
    </div>
  </div>`}function le({tool:e,label:t,onClose:s}){var A,O;const[n,i]=w(null),[v,r]=w(""),[d,l]=w(""),[u,g]=w(!0),[o,p]=w(!1),[b,y]=w(""),[$,k]=w("");K(()=>{let h=!0;return g(!0),y(""),k(""),ee(e).then(T=>{var C,I;h&&(i(T),r(E((C=T.permissions)==null?void 0:C.allow)),l(E((I=T.permissions)==null?void 0:I.deny)),g(!1))}).catch(T=>{h&&(y(T.message||"Failed to load config"),g(!1))}),()=>{h=!1}},[e]);const c=j(v),f=j(d),x=((A=n==null?void 0:n.permissions)==null?void 0:A.allow)||[],m=((O=n==null?void 0:n.permissions)==null?void 0:O.deny)||[],_=H(x,c),D=H(m,f),z=JSON.stringify(x)!==JSON.stringify(c)||JSON.stringify(m)!==JSON.stringify(f),U=JSON.stringify({permissions:{allow:c,deny:f}},null,2),Y=()=>{p(!0),y(""),k(""),se(e,{expected_mtime:n==null?void 0:n.mtime,permissions:{allow:c,deny:f}}).then(h=>{var T,C;i(h),r(E((T=h.permissions)==null?void 0:T.allow)),l(E((C=h.permissions)==null?void 0:C.deny)),k(h.backup_path||""),p(!1),R.success("Configuration saved")}).catch(h=>{y(h.message||"Failed to save config"),p(!1),R.error("Configuration save failed")})};return a`<${P} open=${!0} onClose=${s} ariaLabel=${"Edit "+t+" configuration"} class="cagents-editor-dialog">
    <div class="cagents-editor-head">
      <div>
        <div class="c-overline c-overline--wide">Project configuration</div>
        <div class="cagents-editor-title">${t} permissions</div>
        ${(n==null?void 0:n.path)&&a`<div class="cagents-editor-path">${n.path}</div>`}
      </div>
      <button class="cagents-editor-close" onClick=${s} aria-label="Close">x</button>
    </div>
    ${u?a`<div class="cagents-editor-state">Loading...</div>`:b&&!n?a`<div class="cagents-editor-error">${b}</div>`:a`<div class="cagents-editor-body">
          ${b&&a`<div class="cagents-editor-error">${b}</div>`}
          ${$&&a`<div class="cagents-editor-saved">Saved - backup ${$}</div>`}
          <div class="cagents-editor-fields">
            <label>
              <span>Allowed tools</span>
              <textarea value=${v} onInput=${h=>r(h.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
            <label>
              <span>Denied tools</span>
              <textarea value=${d} onInput=${h=>l(h.target.value)} spellcheck="false" rows="7"></textarea>
            </label>
          </div>
          <div class="cagents-editor-preview">
            <div class="cagents-editor-subtitle">Pending diff</div>
            <${M} title="allow" diff=${_}/>
            <${M} title="deny" diff=${D}/>
            <pre>${U}</pre>
          </div>
        </div>`}
    <div class="cagents-editor-actions">
      <button class="c-btn cagents-btn" onClick=${s}>Cancel</button>
      <button class="c-btn cagents-btn c-btn--primary" onClick=${Y} disabled=${u||o||!z}>
        ${o?"Saving...":"Save changes"}
      </button>
    </div>
  </${P}>`}function ie({tool:e,hooksStatus:t}){var l,u,g;const s=((l=t==null?void 0:t.tools)==null?void 0:l[e.tool])||null,n=((u=t==null?void 0:t.counts_by_tool_kind)==null?void 0:u[e.tool])||{},i=(s==null?void 0:s.warnings)||[],v=(s==null?void 0:s.configured_events)||[],r=(s==null?void 0:s.missing_events)||[],d=(s==null?void 0:s.status)==="active"?"is-active":(s==null?void 0:s.status)==="disabled"||(s==null?void 0:s.status)==="misconfigured"?"is-disabled":"";return a`<div>
    <div class="cagents-hook-summary">
      <div class=${"cagents-hook-status "+d} title=${(s==null?void 0:s.status)==="misconfigured"?"hook commands post to a different port than this dashboard":""}>
        ${ae(s==null?void 0:s.status)}
      </div>
      <div class="cagents-hook-metrics">
        <span title=${r.length?"missing: "+r.join(", "):"all expected events registered"}>${(s==null?void 0:s.configured_count)||0} configured${r.length?` (${r.length} missing)`:""}</span>
        <span>${(s==null?void 0:s.fired_24h)||0} fired / 24h</span>
        <span>last ${ne(s==null?void 0:s.last_fire_ts)}</span>
      </div>
    </div>
    ${i.map(o=>a`<div key=${o.path+o.message} class="cagents-hook-warning">
      ${o.message}<br/>
      <code>${oe(o)}</code>
    </div>`)}
    <div class="cagents-hook-events">
      ${v.length>0?v.slice(0,10).map(o=>a`<span key=${o} class="cagents-hook-chip">${o}</span>`):a`<span class="cagents-hook-muted">no aictl-owned hooks configured</span>`}
    </div>
    ${Object.keys(n).length>0&&a`<div class="cagents-hook-counts">
      ${Object.entries(n).sort((o,p)=>p[1]-o[1]).slice(0,8).map(([o,p])=>a`<span key=${o}>${o} ${p}</span>`)}
    </div>`}
    ${((g=s==null?void 0:s.sources)==null?void 0:g.length)>0&&a`<div class="cagents-hook-sources">
      ${s.sources.map(o=>a`<div key=${o.path} class="cagents-hook-source">
        <span>${o.scope}</span>
        <span>${o.configured_count||0} events</span>
        <span class=${o.host_enabled?"":"is-disabled"}>${o.host_enabled?"loaded":"ignored"}</span>
      </div>`)}
    </div>`}
  </div>`}function ce({tool:e,hooksStatus:t}){var o,p,b,y;const s=(t==null?void 0:t.skill_usage)||{},n=(t==null?void 0:t.subagents)||{},i=(t==null?void 0:t.tool_calls)||{},v=s.by_skill||[],r=((o=s.by_tool)==null?void 0:o[e.tool])||0,d=((p=n.by_tool)==null?void 0:p[e.tool])||{starts:0},l=((b=i.by_tool)==null?void 0:b[e.tool])||0,u=Object.entries(((y=i.by_tool_name)==null?void 0:y[e.tool])||{}).sort(($,k)=>k[1]-$[1]).slice(0,6),g=r===0&&(d.starts||0)===0&&l===0;return a`<div class="cagents-activity-report">
    <div class="cagents-activity-row">
      <span>Tool calls</span>
      <strong>${l}</strong>
      <span class="cagents-hook-muted">${i.total_calls_24h||0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Skill calls</span>
      <strong>${r}</strong>
      <span class="cagents-hook-muted">${s.total_calls_24h||0} all tools / 24h</span>
    </div>
    <div class="cagents-activity-row">
      <span>Subagents</span>
      <strong>${d.starts||0}</strong>
      <span class="cagents-hook-muted">${n.starts_24h||0} starts / 24h</span>
    </div>
    ${u.length>0&&a`<div class="cagents-skill-list">
      ${u.map(([$,k])=>a`<span key=${$}>${$} ${k}</span>`)}
    </div>`}
    ${v.length>0&&a`<div class="cagents-skill-list">
      ${v.slice(0,6).map($=>a`<span key=${$.skill}>${$.skill} ${$.count}</span>`)}
    </div>`}
    ${g&&a`<div class="cagents-hook-muted" style="margin-top:8px">
      No hook activity in the last 24h. Tool, skill, and subagent counts require
      aictl lifecycle hooks — agents that report only via OTel will show zero here.
    </div>`}
  </div>`}const W={auto:{color:"var(--green)",bg:"var(--green-soft, #E6EFE3)",border:"var(--green)"},ask:{color:"var(--orange)",bg:"transparent",border:"var(--orange)"},deny:{color:"var(--accent)",bg:"var(--accent-soft)",border:"var(--accent)"},"n/a":{color:"var(--fg3)",bg:"transparent",border:"var(--border)"}};function re({val:e}){const t=W[e]||W["n/a"];return a`<span class="cagents-perm-badge"
    style="color:${t.color};background:${t.bg};border-color:${t.border}">${e}</span>`}function de(e){if(((e==null?void 0:e.features)||{}).global_autoApprove)return[["MCP Servers","auto"],["File Reads","auto"],["File Writes","auto"],["Shell","auto"],["Web Fetch","auto"],["Network","auto"]];const n=((e==null?void 0:e.settings)||{}).permissions||{},i=(n.allow||[]).map(l=>l.toLowerCase()),v=(n.deny||[]).map(l=>l.toLowerCase()),r=(n.ask||[]).map(l=>l.toLowerCase()),d=(...l)=>l.some(u=>v.some(g=>g.startsWith(u)))?"deny":l.some(u=>i.some(g=>g.startsWith(u)))?"auto":l.some(u=>r.some(g=>g.startsWith(u)))?"ask":i.length===0&&v.length===0&&r.length===0?"n/a":"ask";return[["MCP Servers",d("mcp")],["File Reads",d("read","glob","grep","ls")],["File Writes",d("write","edit","create","multiedit")],["Shell",d("bash","execute")],["Web Fetch",d("webfetch","fetch")],["Network","n/a"]]}function ve({tool:e,toolConfig:t,hooksStatus:s,onViewSessions:n,onViewConfig:i,onEditConfig:v}){var x;const r=(x=J(B))==null?void 0:x.snap,d=e.live||{},l=e.processes||[],u=e.mcp_servers||[];l.reduce((m,_)=>m+(parseFloat(_.cpu_pct)||0),0);const o=(l.length>0&&(l[0].cmdline||l[0].name)||"").split(" ")[0]||null,p=(t==null?void 0:t.version)||null,b=(t==null?void 0:t.notes)||null,y=(t==null?void 0:t.otel)||{},$=y.enabled?["events","tokens","timing",...y.capture_content?["prompts","responses"]:[]]:[],k=[["Sessions",d.session_count??0],["Tokens",V(q(d))],["Processes",d.pid_count??l.length],["MCP servers",u.length],["Captured fields",$.length>0?$.length:"—"],["OTel",y.enabled?"active":"off"]],c=de(t),f=[o?["binary",o]:null,p?["version",p]:null,$.length>0?["capture","["+$.map(m=>`"${m}"`).join(", ")+"]"]:["capture","—"],["enabled",F(e)?"true":"false"]].filter(Boolean);return a`<div class="cagents-detail">
    <div class="c-overline c-overline--wide">Agent profile</div>
    <div class="cagents-detail-headline">
      <span class="cagents-detail-title">${e.label}</span>
      ${p&&a`<span class="cagents-detail-version">v${p}</span>`}
      <span class="cagents-detail-id">${e.tool}</span>
    </div>
    ${b&&a`<div class="cagents-detail-notes">${b}</div>`}

    ${L(e,r)&&a`<${Z} tool=${e}/>`}
    <div class="cagents-detail-section" hidden=${L(e,r)}><${S} label="Stats"/></div>
    <div class="cagents-stats-grid" hidden=${L(e,r)}>
      ${k.map(([m,_])=>a`<${te} key=${m} label=${m} value=${_}/>`)}
    </div>

    <div class="cagents-detail-section"><${S} label="Permissions"/></div>
    <div class="cagents-perms-grid">
      ${c.map(([m,_],D)=>a`<div key=${m}
        class=${"cagents-perm-row"+(D>=2?" cagents-perm-row--top":"")+(D%2===0?" cagents-perm-row--left":"")}>
        <span class="cagents-perm-key">${m}</span>
        <${re} val=${_}/>
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${S} label="Configuration"/></div>
    <div class="cagents-config-block">
      ${f.map(([m,_])=>a`<div key=${m}>
        <span class="cagents-config-key">${m}</span> = ${_}
      </div>`)}
    </div>

    <div class="cagents-detail-section"><${S} label="Hooks"/></div>
    <${ie} tool=${e} hooksStatus=${s}/>

    <div class="cagents-detail-section"><${S} label="Tool & skill activity"/></div>
    <${ce} tool=${e} hooksStatus=${s}/>

    <div class="cagents-actions">
      ${e.tool==="claude-code"?a`<button class="c-btn cagents-btn c-btn--primary" onClick=${v}>Edit permissions</button>`:a`<button class="c-btn cagents-btn c-btn--primary" onClick=${i}>Open configuration</button>`}
      <button class="c-btn cagents-btn"
        onClick=${n}>View sessions</button>
    </div>
  </div>`}function ue({tool:e,selected:t,onSelect:s}){const n=e.live||{};Q(e.tool);const i=F(e),v=t===e.tool;return a`<div class=${"c-row c-row--list"+(v?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${v?"true":"false"}
    onKeyDown=${r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <${X} tool=${e.tool} size="12px"/>
      <span class="cagents-row-label">${e.label}</span>
      <span class=${"c-overline cagents-row-status"+(i?" is-on":"")}>
        ${i?"● on":"off"}
      </span>
    </div>
    <div class="cagents-row-meta">
      ${V(q(n))} tok \u00b7 ${n.session_count||0} sessions
    </div>
  </div>`}function ge({tool:e,selected:t,onSelect:s}){const n=t===e.tool;return a`<div class=${"c-row c-row--list cagents-row--inactive"+(n?" is-selected":"")}
    onClick=${()=>s(e.tool)}
    role="button" tabIndex=${0} aria-pressed=${n?"true":"false"}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),s(e.tool))}}>
    <div class="cagents-row-head">
      <span class="cagents-row-dot cagents-row-dot--empty"></span>
      <span class="cagents-row-label" style="color:var(--fg2)">${e.label}</span>
      <span class="c-overline">view</span>
    </div>
  </div>`}function $e({onViewSessions:e,onViewConfig:t}){var k;const s=J(B),n=s==null?void 0:s.snap,[i,v]=w(null);K(()=>{let c=!0;const f=()=>{G().then(m=>{c&&v(m)}).catch(()=>{c&&v(null)})};f();const x=setInterval(f,15e3);return()=>{c=!1,clearInterval(x)}},[]);const r=N(()=>{const c={};for(const f of(n==null?void 0:n.tool_configs)||[])f.tool&&(c[f.tool]=f);return c},[n]),{active:d,inactive:l}=N(()=>{const c=((n==null?void 0:n.tools)||[]).filter(f=>f.tool!=="aictl");return{active:c.filter(F),inactive:c.filter(f=>!F(f))}},[n]),[u,g]=w(null),[o,p]=w(null),b=u??((k=d[0])==null?void 0:k.tool)??null,y=d.find(c=>c.tool===b)??l.find(c=>c.tool===b),$=b?r[b]:null;return a`<div class="c-shell">
    <div class="cagents-toolbar">
      <span class="c-overline">
        ${d.length} of ${d.length+l.length} agents active
      </span>
    </div>
    <div class="cagents-body">
      <div class="cagents-list">
        ${d.length>0&&a`<div class="c-overline cagents-list-heading">Active</div>`}
        ${d.map(c=>a`<${ue} key=${c.tool}
          tool=${c} selected=${b} onSelect=${g}/>`)}

        ${l.length>0&&a`<div class="c-overline cagents-list-heading">Detected, not active</div>`}
        ${l.map(c=>a`<${ge} key=${c.tool}
          tool=${c} selected=${b} onSelect=${g}/>`)}
      </div>
      <div class="cagents-detail-pane">
        ${y?a`<${ve}
              tool=${y}
              toolConfig=${$}
              hooksStatus=${i}
              onViewSessions=${e??(()=>{})}
              onViewConfig=${t??(()=>{})}
              onEditConfig=${()=>p({tool:y.tool,label:y.label})}
            />`:a`<div class="cagents-empty">Select an agent to view its profile.</div>`}
      </div>
    </div>
    ${o&&a`<${le}
      tool=${o.tool}
      label=${o.label}
      onClose=${()=>p(null)}/>`}
  </div>`}export{$e as default};
