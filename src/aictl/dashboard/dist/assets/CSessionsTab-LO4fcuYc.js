import{x as P,S as U,d as r,y as L,a4 as R,a5 as W,T as C,m as n,aq as I,p as j,b as h,a8 as A}from"./index-bTWi6ueq.js";function T(e){return e.project?e.project.replace(/\\/g,"/").split("/").filter(Boolean).slice(-2).join("/"):String(e.session_id).split(":").slice(-1)[0]||e.session_id}const Y=new Set(["claude-code-jsonl","copilot-session-store","cursor-ingester","vscode-chat-logs"]);function S(e){return e.lifecycle_status?e.lifecycle_status:e.ended_at?"ended":e.active?"active":Y.has(e.source||"")?"imported":"open"}function w(e){return(e.exact_input_tokens||e.input_tokens||0)+(e.exact_output_tokens||e.output_tokens||0)}function F(e){if(!e)return"—";const i=new Date(e*1e3),a=new Date;if(i.toDateString()===a.toDateString())return i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});const l=new Date(a);return l.setDate(a.getDate()-1),(i.toDateString()===l.toDateString()?"Yesterday ":"")+i.toLocaleDateString([],{month:"short",day:"numeric"})+" "+i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}const G={active:"csessions-status--active",open:"csessions-status--open",ended:"csessions-status--ended",imported:"csessions-status--imported"};function H({status:e}){const i=G[e]||"csessions-status--ended";return n`<span class=${"csessions-status "+i}>${(e==="active"?"● ":"")+e}</span>`}function J({session:e,onInspect:i}){if(!e)return n`<div class="csessions-detail-empty">
      <div class="csessions-detail-empty-label">No session selected</div>
      <div>Click a row to view details.</div>
    </div>`;I(e.tool);const a=w(e),l=e.exact_input_tokens||e.input_tokens||0,g=e.exact_output_tokens||e.output_tokens||0,u=e.duration_s||(e.ended_at&&e.started_at?e.ended_at-e.started_at:0),b=[["Tokens",h(a)],["In / Out",`${h(l)} / ${h(g)}`],["Files",e.files_modified||"—"],["Duration",u>=1?A(u):"—"],["Status",S(e)],["Started",F(e.started_at)]],y=String(e.session_id).split(":").slice(-1)[0]||e.session_id;return n`<div class="csessions-detail-view">
    <div class="c-overline c-overline--wide csessions-detail-overline">Session · ${F(e.started_at)}</div>
    <div class="csessions-detail-title">${T(e)}</div>
    <div class="csessions-detail-agent">
      <${j} tool=${e.tool} size="1em"/>
      <span class="csessions-agent-label">${e.tool}</span>
      ${e.git_branch&&n`<span class="csessions-git-badge">⎇ ${e.git_branch}</span>`}
    </div>
    <div class="csessions-detail-rule">
      <div></div><span>Summary</span><div></div>
    </div>
    <div class="csessions-stats-grid">
      ${b.map(([v,p])=>n`<div key=${v} class="csessions-stat">
        <div class="c-overline csessions-stat-label">${v}</div>
        <div class="c-stat-value csessions-stat-value">${p}</div>
      </div>`)}
    </div>
    <div class="csessions-detail-id" title=${e.session_id}>${y}</div>
    <div class="csessions-detail-actions">
      <button class="c-btn csessions-btn c-btn--primary"
        onClick=${()=>i==null?void 0:i(e.session_id,e.tool)}>
        Inspect session →</button>
    </div>
  </div>`}function V({onInspect:e}){const{globalRange:i,enabledTools:a}=P(U),[l,g]=r([]),[u,b]=r(0),[y,v]=r(!0),[p,E]=r(""),[f,z]=r("all"),[m,M]=r("all"),[$,O]=r("time-desc"),[_,k]=r(null);L(()=>{v(!0);const s=i?Math.min(i.since,Date.now()/1e3-86400):Date.now()/1e3-86400,t=i==null?void 0:i.until;R(null,{since:s,until:t}).then(o=>{const c=W(o);c.sort((D,N)=>(N.started_at||0)-(D.started_at||0)),g(c),b(o.filtered_count||0),v(!1)}).catch(()=>v(!1))},[i]);const x=s=>a===null||a.includes(s),q=C(()=>{const s=new Set;return l.filter(t=>x(t.tool)&&!s.has(t.tool)&&s.add(t.tool)).map(t=>t.tool)},[l,a]),B=C(()=>{const s=new Set;let t=!1;for(const c of l)x(c.tool)&&(s.add(S(c)),(c.error_count||0)>0&&(t=!0));const o=["active","open","ended","imported"].filter(c=>s.has(c));return t?[...o,"error"]:o},[l,a]),d=C(()=>{let s=l.filter(t=>x(t.tool));if(f==="error"?s=s.filter(t=>(t.error_count||0)>0):f!=="all"&&(s=s.filter(t=>S(t)===f)),m!=="all"&&(s=s.filter(t=>t.tool===m)),p){const t=p.toLowerCase();s=s.filter(o=>T(o).toLowerCase().includes(t)||o.tool.toLowerCase().includes(t)||String(o.session_id).toLowerCase().includes(t))}return $==="time-asc"?[...s].sort((t,o)=>(t.started_at||0)-(o.started_at||0)):$==="tokens-desc"?[...s].sort((t,o)=>w(o)-w(t)):$==="files-desc"?[...s].sort((t,o)=>(o.files_modified||0)-(t.files_modified||0)):s},[l,p,f,m,$,a]),K=_?d.find(s=>s.session_id===_)??null:null;return L(()=>{!_&&d.length>0&&k(d[0].session_id)},[d.length,_]),n`<div class="c-shell csessions-shell">
    <div class="csessions-toolbar">
      <div class="c-filter-wrap csessions-filter-wrap">
        <span class="c-filter-icon csessions-filter-icon" aria-hidden="true">⌕</span>
        <input class="c-filter-input csessions-filter-input" type="text"
          placeholder="Search sessions, titles, agents…"
          aria-label="Filter sessions"
          value=${p}
          onInput=${s=>E(s.target.value)}/>
      </div>
      <select class="csessions-select" value=${f}
        aria-label="Filter by status"
        onChange=${s=>z(s.target.value)}>
        <option value="all">all status</option>
        ${B.map(s=>n`<option key=${s} value=${s}>${s}</option>`)}
      </select>
      <select class="csessions-select" value=${m}
        aria-label="Filter by agent"
        onChange=${s=>M(s.target.value)}>
        <option value="all">all agents</option>
        ${q.map(s=>n`<option key=${s} value=${s}>${s}</option>`)}
      </select>
      <span style="flex:1"></span>
      <select class="csessions-select" value=${$}
        aria-label="Sort sessions"
        onChange=${s=>O(s.target.value)}>
        <option value="time-desc">newest first</option>
        <option value="time-asc">oldest first</option>
        <option value="tokens-desc">most tokens</option>
        <option value="files-desc">most files</option>
      </select>
      <span class="csessions-toolbar-count">${d.length} sessions</span>
      ${u>0?n`<span class="text-muted text-xs" style="margin-left:var(--sp-2)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${u} short session${u===1?"":"s"} hidden</span>`:null}
    </div>

    <div class="csessions-body">
      <div class="csessions-table-wrap">
        ${y?n`<div class="csessions-loading">Loading sessions…</div>`:d.length===0?n`<div class="csessions-empty">No sessions match the current filter.</div>`:n`<div class="csessions-table">
                <div class="csessions-thead">
                  <div class="c-overline csessions-th">When</div>
                  <div class="c-overline csessions-th">Status</div>
                  <div class="c-overline csessions-th">Title</div>
                  <div class="c-overline csessions-th">Agent</div>
                  <div class="c-overline csessions-th csessions-th--r">Tokens</div>
                  <div class="c-overline csessions-th csessions-th--r">Files</div>
                  <div class="c-overline csessions-th csessions-th--r">Duration</div>
                </div>
                ${d.map(s=>{const t=s.session_id===_;I(s.tool);const o=S(s),c=s.duration_s||(s.ended_at&&s.started_at?s.ended_at-s.started_at:0);return n`<div key=${s.session_id}
                    class=${"c-row csessions-row"+(t?" is-selected":"")}
                    onClick=${()=>k(s.session_id)}
                    role="row" tabIndex=${0}
                    onKeyDown=${D=>D.key==="Enter"&&k(s.session_id)}>
                    <div class="csessions-cell-time">${F(s.started_at)}</div>
                    <div class="flex-row gap-sm" style="align-items:center">
                      <${H} status=${o}/>
                      ${(s.error_count||0)>0?n`<span
                        title=${s.error_count+" error"+(s.error_count===1?"":"s")}
                        style="background:var(--red);color:var(--on-status);border-radius:8px;padding:0 6px;font-size:var(--fs-2xs);font-weight:600">
                        ${s.error_count}</span>`:null}
                    </div>
                    <div class="csessions-cell-title">${T(s)}</div>
                    <div class="csessions-col-agent">
                      <${j} tool=${s.tool} size="0.85em"/>
                      <span class="csessions-cell-agent">${s.tool}</span>
                    </div>
                    <div class="csessions-cell-num">${h(w(s))}</div>
                    <div class="csessions-cell-num">${s.files_modified||"—"}</div>
                    <div class="csessions-cell-num">${c>=1?A(c):"—"}</div>
                  </div>`})}
              </div>`}
      </div>

      <div class="csessions-detail-pane">
        <${J} session=${K} onInspect=${e}/>
      </div>
    </div>
  </div>`}export{V as default};
