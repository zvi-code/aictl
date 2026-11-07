import{x as q,d as r,y as I,T as C,m as n}from"./index-DyDyJAkK.js";import{S as R,e as W,a as Y,T as A}from"./app-CcuDFzdW.js";import{aD as G,L as H,M as E,r as b,A as j,O as J}from"./useSse-DFs1a0pz.js";import"./TextView-DRRCCuem.js";function F(e){return e.project?e.project.replace(/\\/g,"/").split("/").filter(Boolean).slice(-2).join("/"):String(e.session_id).split(":").slice(-1)[0]||e.session_id}const Q=new Set(["claude-code-jsonl","copilot-session-store","cursor-ingester","vscode-chat-logs"]);function y(e){return e.lifecycle_status?e.lifecycle_status:e.ended_at?"ended":e.active?"active":Q.has(e.source||"")?"imported":"open"}function k(e){return(e.exact_input_tokens||e.input_tokens||0)+(e.exact_output_tokens||e.output_tokens||0)}function L(e){if(!e)return"—";const i=new Date(e*1e3),a=new Date;if(i.toDateString()===a.toDateString())return i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});const u=new Date(a);return u.setDate(a.getDate()-1),(i.toDateString()===u.toDateString()?"Yesterday ":"")+i.toLocaleDateString([],{month:"short",day:"numeric"})+" "+i.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}const V={active:"csessions-status--active",open:"csessions-status--open",ended:"csessions-status--ended",imported:"csessions-status--imported"};function X({status:e}){const i=V[e]||"csessions-status--ended";return n`<span class=${"csessions-status "+i}>${(e==="active"?"● ":"")+e}</span>`}function Z({session:e,onInspect:i}){if(!e)return n`<div class="csessions-detail-empty">
      <div class="csessions-detail-empty-label">No session selected</div>
      <div>Click a row to view details.</div>
    </div>`;E(e.tool);const a=k(e),u=e.exact_input_tokens||e.input_tokens||0,c=e.exact_output_tokens||e.output_tokens||0,h=e.duration_s||(e.ended_at&&e.started_at?e.ended_at-e.started_at:0),p=[["Tokens",b(a)],["In / Out",`${b(u)} / ${b(c)}`],["Files",e.files_modified||"—"],["Duration",h>=1?j(h):"—"],["Status",y(e)],["Started",L(e.started_at)]],T=String(e.session_id).split(":").slice(-1)[0]||e.session_id;return n`<div class="csessions-detail-view">
    <div class="c-overline c-overline--wide csessions-detail-overline">Session · ${L(e.started_at)}</div>
    <div class="csessions-detail-title">${F(e)}</div>
    <div class="csessions-detail-agent">
      <${A} tool=${e.tool} size="1em"/>
      <span class="csessions-agent-label">${e.tool}</span>
      ${e.git_branch&&n`<span class="csessions-git-badge">⎇ ${e.git_branch}</span>`}
    </div>
    <div class="csessions-detail-rule">
      <div></div><span>Summary</span><div></div>
    </div>
    <div class="csessions-stats-grid">
      ${p.map(([S,f])=>n`<div key=${S} class="csessions-stat">
        <div class="c-overline csessions-stat-label">${S}</div>
        <div class="c-stat-value csessions-stat-value">${f}</div>
      </div>`)}
    </div>
    <div class="csessions-detail-id" title=${e.session_id}>${T}</div>
    <div class="csessions-detail-actions">
      <button class="c-btn csessions-btn c-btn--primary"
        onClick=${()=>i==null?void 0:i(e.session_id,e.tool)}>
        Inspect session →</button>
    </div>
  </div>`}function os({onInspect:e}){const{globalRange:i,enabledTools:a,snap:u}=q(R),[c,h]=r([]),[p,T]=r(0),[S,f]=r(!0),[$,M]=r(""),[v,O]=r("all"),[_,z]=r("all"),[m,B]=r("time-desc"),[g,D]=r(null);I(()=>{f(!0);const s=i?Math.min(i.since,Date.now()/1e3-86400):Date.now()/1e3-86400,t=i==null?void 0:i.until;G(null,{since:s,until:t}).then(o=>{const l=W(o);l.sort((x,U)=>(U.started_at||0)-(x.started_at||0)),h(l),T(o.filtered_count||0),f(!1)}).catch(()=>f(!1))},[i]);const w=s=>J(s,a),K=C(()=>{const s=new Set;return c.filter(t=>w(t.tool)&&!s.has(t.tool)&&s.add(t.tool)).map(t=>t.tool)},[c,a]),N=C(()=>{const s=new Set;let t=!1;for(const l of c)w(l.tool)&&(s.add(y(l)),(l.error_count||0)>0&&(t=!0));const o=["active","open","ended","imported"].filter(l=>s.has(l));return t?[...o,"error"]:o},[c,a]),d=C(()=>{let s=c.filter(t=>w(t.tool));if(v==="error"?s=s.filter(t=>(t.error_count||0)>0):v!=="all"&&(s=s.filter(t=>y(t)===v)),_!=="all"&&w(_)&&(s=s.filter(t=>t.tool===_)),$){const t=$.toLowerCase();s=s.filter(o=>F(o).toLowerCase().includes(t)||o.tool.toLowerCase().includes(t)||String(o.session_id).toLowerCase().includes(t))}return m==="time-asc"?[...s].sort((t,o)=>(t.started_at||0)-(o.started_at||0)):m==="tokens-desc"?[...s].sort((t,o)=>k(o)-k(t)):m==="files-desc"?[...s].sort((t,o)=>(o.files_modified||0)-(t.files_modified||0)):s},[c,$,v,_,m,a]),P=g?d.find(s=>s.session_id===g)??null:null;return I(()=>{!g&&d.length>0&&D(d[0].session_id)},[d.length,g]),n`<div class="c-shell csessions-shell">
    <div class="csessions-toolbar">
      <div class="c-filter-wrap csessions-filter-wrap">
        <span class="c-filter-icon csessions-filter-icon" aria-hidden="true">⌕</span>
        <input class="c-filter-input csessions-filter-input" type="text"
          placeholder="Search sessions, titles, agents…"
          aria-label="Filter sessions"
          value=${$}
          onInput=${s=>M(s.target.value)}/>
      </div>
      <select class="csessions-select" value=${v}
        aria-label="Filter by status"
        onChange=${s=>O(s.target.value)}>
        <option value="all">all status</option>
        ${N.map(s=>n`<option key=${s} value=${s}>${s}</option>`)}
      </select>
      <select class="csessions-select" value=${_}
        aria-label="Filter by agent"
        onChange=${s=>z(s.target.value)}>
        <option value="all">all agents</option>
        ${K.map(s=>n`<option key=${s} value=${s}>${s}</option>`)}
      </select>
      <span style="flex:1"></span>
      <select class="csessions-select" value=${m}
        aria-label="Sort sessions"
        onChange=${s=>B(s.target.value)}>
        <option value="time-desc">newest first</option>
        <option value="time-asc">oldest first</option>
        <option value="tokens-desc">most tokens</option>
        <option value="files-desc">most files</option>
      </select>
      <span class="csessions-toolbar-count">${d.length} sessions</span>
      ${p>0?n`<span class="text-muted text-xs" style="margin-left:var(--sp-2)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${p} short session${p===1?"":"s"} hidden</span>`:null}
    </div>

    <div class="csessions-body">
      <div class="csessions-table-wrap">
        ${S?n`<div class="csessions-loading">Loading sessions…</div>`:d.length===0?H(a)&&!$&&v==="all"?n`<${Y} enabledTools=${a} snap=${u} what="sessions"/>`:n`<div class="csessions-empty">No sessions match the current filter.</div>`:n`<div class="csessions-table">
                <div class="csessions-thead">
                  <div class="c-overline csessions-th">When</div>
                  <div class="c-overline csessions-th">Status</div>
                  <div class="c-overline csessions-th">Title</div>
                  <div class="c-overline csessions-th">Agent</div>
                  <div class="c-overline csessions-th csessions-th--r">Tokens</div>
                  <div class="c-overline csessions-th csessions-th--r">Files</div>
                  <div class="c-overline csessions-th csessions-th--r">Duration</div>
                </div>
                ${d.map(s=>{const t=s.session_id===g;E(s.tool);const o=y(s),l=s.duration_s||(s.ended_at&&s.started_at?s.ended_at-s.started_at:0);return n`<div key=${s.session_id}
                    class=${"c-row csessions-row"+(t?" is-selected":"")}
                    onClick=${()=>D(s.session_id)}
                    role="row" tabIndex=${0}
                    onKeyDown=${x=>x.key==="Enter"&&D(s.session_id)}>
                    <div class="csessions-cell-time">${L(s.started_at)}</div>
                    <div class="flex-row gap-sm" style="align-items:center">
                      <${X} status=${o}/>
                      ${(s.error_count||0)>0?n`<span
                        title=${s.error_count+" error"+(s.error_count===1?"":"s")}
                        style="background:var(--red);color:var(--on-status);border-radius:8px;padding:0 6px;font-size:var(--fs-2xs);font-weight:600">
                        ${s.error_count}</span>`:null}
                    </div>
                    <div class="csessions-cell-title">${F(s)}</div>
                    <div class="csessions-col-agent">
                      <${A} tool=${s.tool} size="0.85em"/>
                      <span class="csessions-cell-agent">${s.tool}</span>
                    </div>
                    <div class="csessions-cell-num">${b(k(s))}</div>
                    <div class="csessions-cell-num">${s.files_modified||"—"}</div>
                    <div class="csessions-cell-num">${l>=1?j(l):"—"}</div>
                  </div>`})}
              </div>`}
      </div>

      <div class="csessions-detail-pane">
        <${Z} session=${P} onInspect=${e}/>
      </div>
    </div>
  </div>`}export{os as default};
