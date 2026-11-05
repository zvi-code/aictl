import{x as X,S as Y,d as h,T,ay as x,q as A,b,ag as M,l as Z,ad as ee,af as q,y as se,az as le,aF as te,w as ie,z as ne,m as i,p as oe,h as ae,a as j}from"./index-DsPuVcci.js";const ce={user:"var(--fg)",api:"#B26B1B",agent:"var(--green)",bash:"var(--fg)",read:"#1F6E78",write:"#1F6E78",edit:"#1F6E78",glob:"var(--green)",grep:"var(--green)",skill:"#2E5BA6"};function G(t){const s=(t||"").toLowerCase();return ce[s]||"var(--fg2)"}function de(t){return t?new Date(t*1e3).toTimeString().slice(0,8):"—"}function re(t){return t?new Date(t*1e3).toISOString().replace("T"," ").slice(0,23):"—"}function ue(t){const s=[];let a=0;return(t||[]).forEach((l,c)=>{var g;const r=de(l.ts),u=l.tokens;if(l.type==="session_start")s.push({id:`t${c}`,lane:"agent",kind:"call",t:r,label:"session opened",meta:null,size:null,raw:l});else if(l.type==="session_end")s.push({id:`t${c}`,lane:"agent",kind:"return",t:r,label:"session closed",meta:null,size:null,raw:l});else if(l.type==="user_message"){const d=(u==null?void 0:u.output)||0;a+=d,s.push({id:`t${c}`,lane:"user",kind:"call",t:r,label:l.preview||(l.message||"").slice(0,120),meta:l.model?`${l.model} · ${b((u==null?void 0:u.input)||0)} in / ${b(d)} out`:null,size:null,cum:(a/1e3).toFixed(1),raw:l})}else if(l.type==="api_call"){const d=((g=l.tokens)==null?void 0:g.output)||0;a+=d,s.push({id:`t${c}`,lane:"api",kind:"recv",t:r,label:`← ${b(d)}t`,meta:l.model||null,size:null,cum:(a/1e3).toFixed(1),raw:l})}else if(l.type==="tool_use"){const d=l.to||"tool",_=d.toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,24)||"tool";if(l.subtype==="decision")s.push({id:`t${c}`,lane:_,kind:"call",t:r,label:d+(l.input_preview?": "+l.input_preview.slice(0,80):""),meta:l.decision||null,size:null,raw:l});else{const $=l.result_size?j(l.result_size):null;s.push({id:`t${c}`,lane:_,kind:"return",t:r,label:d+(l.result_summary?": "+l.result_summary.slice(0,80):""),meta:l.success!==!1?`✓ ${l.duration_ms!=null?l.duration_ms+"ms":""}`:"✗ failed",size:$,raw:l})}}else l.type==="compaction"&&s.push({id:`t${c}`,lane:"agent",kind:"call",t:r,label:`Compaction #${l.compaction_count}`,meta:null,size:null,raw:l})}),s}function ve({label:t,value:s,sub:a}){return i`<div class="cdb-stat">
    <div class="c-overline">${t}</div>
    <div class="cdb-stat-row">
      <span class="c-stat-value">${s}</span>
      ${a&&i`<span class="cdb-stat-sub">${a}</span>`}
    </div>
  </div>`}function pe({tool:t,label:s,color:a,active:l,onToggle:c}){return i`<div class="cdb-agent-row" onClick=${c} role="button" tabIndex=${0}
    onKeyDown=${r=>r.key==="Enter"&&c()}
    style="opacity:${l?1:.45}">
    <div class=${"cdb-agent-check"+(l?" is-active":"")}
      style="background:${l?a:"transparent"};border-color:${l?a:"var(--fg3)"}">
      ${l?"✓":""}
    </div>
    <span class="cdb-agent-label">${s}</span>
  </div>`}function be({ev:t,selected:s,onClick:a,isLast:l}){const c=G(t.lane),r=t.kind==="return"?"◆":t.kind==="call"?"◇":"◌";return i`<div
    class=${"cdb-ev-row"+(s?" is-selected":"")}
    onClick=${a}
    role="button" tabIndex=${0}
    onKeyDown=${u=>u.key==="Enter"&&a()}>

    <!-- Time + cumulative tokens -->
    <div class="cdb-ev-time">
      <div class="cdb-ev-ts">${t.t}</div>
      ${t.cum&&i`<div class="cdb-ev-cum">${t.cum}K cum</div>`}
    </div>

    <!-- Spine + dot -->
    <div class="cdb-ev-spine">
      <div class=${"cdb-ev-spine-line"+(l?" cdb-ev-spine-line--last":"")}></div>
      <div class="cdb-ev-dot" style="border-color:${c};color:${c}">${r}</div>
    </div>

    <!-- Body -->
    <div class="cdb-ev-body">
      <div class="cdb-ev-lane-row">
        <span class="cdb-ev-lane" style="color:${c}">${t.lane}</span>
        ${t.kind==="return"&&i`<span class="cdb-ev-kindlabel cdb-ev-kindlabel--return">returned</span>`}
        ${t.kind==="call"&&i`<span class="cdb-ev-kindlabel">requested</span>`}
        ${t.kind==="recv"&&i`<span class="cdb-ev-kindlabel">tokens</span>`}
      </div>
      <div class="cdb-ev-label">${t.label}</div>
      ${t.meta&&i`<div class="cdb-ev-meta">${t.meta}</div>`}
    </div>

    <!-- Size badge -->
    <div class="cdb-ev-right">
      ${t.size&&i`<span class="cdb-ev-size">${t.size}</span>`}
    </div>
  </div>`}function $e({event:t}){var u,g,d;if(!t)return i`<div class="cdb-inspector cdb-inspector--empty">
      <div class="c-overline cdb-inspector-empty-label">No selection</div>
      <div>Choose an event in the timeline to read its payload.</div>
    </div>`;const s=t.raw,a=[];s.model&&a.push(["Model",s.model]),s.ts&&a.push(["Started",re(s.ts)]),s.duration_ms!=null&&a.push(["Duration",s.duration_ms+"ms"]),((u=s.tokens)!=null&&u.input||(g=s.tokens)!=null&&g.output)&&a.push(["Tokens",`${b(s.tokens.input||0)} in / ${b(s.tokens.output||0)} out`]),s.result_size&&a.push(["Output size",j(s.result_size)]),s.decision&&a.push(["Permission",s.decision]);const l=s.message||(s.params?JSON.stringify(s.params,null,2):null)||s.input_preview||"—",c=s.result_summary||(s.type==="api_call"&&((d=s.tokens)!=null&&d.output)?`${b(s.tokens.output)} tokens`:null)||"—",r=G(t.lane);return i`<div class="cdb-inspector">
    <div class="cdb-inspector-head">
      <div class="c-overline c-overline--wide" style="color:${r}">
        ${t.lane} \u00b7 ${t.kind}
      </div>
      <div class="cdb-inspector-title">${t.label}</div>
    </div>
    <div class="cdb-inspector-body">
      ${a.length>0&&i`<div class="cdb-inspector-meta">
        ${a.map(([_,$])=>i`<div key=${_} class="cdb-inspector-row">
          <span class="cdb-inspector-key">${_}</span>
          <span class="cdb-inspector-val">${$}</span>
        </div>`)}
      </div>`}

      <div class="c-overline cdb-inspector-section-head">Input</div>
      <pre class="cdb-inspector-code">${l}</pre>

      <div class="c-overline cdb-inspector-section-head">Output</div>
      <pre class="cdb-inspector-code">${c}</pre>
    </div>
  </div>`}const fe=["Live","1h","6h","24h","7d"];function ge(){var R,B;const t=X(Y),s=t==null?void 0:t.snap,[a,l]=h("Live"),[c,r]=h(""),[u,g]=h(null),[d,_]=h(""),[$,N]=h(null),[f,I]=h(null),[J,D]=h(!1),[k,H]=h(null),S=T(()=>{var o;const e=new Map;for(const n of(s==null?void 0:s.tools)||[])(((o=n.live)==null?void 0:o.sessions)||[]).length>0&&e.set(n.tool,{tool:n.tool,label:n.label,color:x(n.tool)});return[...e.values()]},[s]),Q=A(e=>{H(o=>{const n=new Set(S.map(F=>F.tool)),p=o??n,v=new Set(p);return v.has(e)?v.delete(e):v.add(e),v.size===n.size?null:v})},[S]),U=T(()=>{const e=f==null?void 0:f.summary;if(e){const E=(e.total_input_tokens||0)+(e.total_output_tokens||0),y=`${b(e.total_input_tokens||0)}/${b(e.total_output_tokens||0)}`;return[{label:"Prompts",value:e.total_turns??0},{label:"API calls",value:e.total_api_calls??0},{label:"Tools",value:e.total_tool_uses??0},{label:"Tokens",value:b(E),sub:y},{label:"Duration",value:M(e.duration_s)},{label:"Events",value:e.event_count??0}]}if(!s)return[{label:"Live sessions",value:0},{label:"Processes",value:0},{label:"Est. tokens",value:0},{label:"Active tools",value:0},{label:"Files touched",value:0},{label:"MCP servers",value:0}];let o=0,n=0,p=0,v=0,F=0,K=0;for(const E of s.tools||[]){const y=E.live||{};o+=y.session_count||0,n+=y.pid_count||(E.processes||[]).length||0,p+=Z(y),(y.pid_count||0)>0&&v++,F+=y.files_touched||0,K+=(E.mcp_servers||[]).length}return[{label:"Live sessions",value:o},{label:"Processes",value:n},{label:"Est. tokens",value:b(p)},{label:"Active tools",value:v},{label:"Files touched",value:F},{label:"MCP servers",value:K}]},[s,f]),O=T(()=>{var o;const e=[];for(const n of(s==null?void 0:s.tools)||[])for(const p of((o=n.live)==null?void 0:o.sessions)||[])e.push({...p,_tool:n.tool,_toolLabel:n.label});return ee(e)},[s]),w=T(()=>{let e=O;if(k!==null&&(e=e.filter(n=>k.has(n._tool))),!c)return e;const o=c.toLowerCase();return e.filter(n=>String(n.session_id||n.id||"").toLowerCase().includes(o)||(n._toolLabel||"").toLowerCase().includes(o)||(n.workspace||n.project||"").toLowerCase().includes(o))},[O,c,k]),L=(u&&!!q(w,u)?u:null)??((R=w[0])==null?void 0:R.session_id)??((B=w[0])==null?void 0:B.id)??null,m=q(w,L)??null;se(()=>{if(!L){I(null);return}let e=!0;D(!0),I(null),N(null);const o=0,n=Math.floor(Date.now()/1e3)+3600,p=m?le(m):[L];return te(p,o,n).then(v=>{e&&(I(v),D(!1))}).catch(()=>{e&&D(!1)}),()=>{e=!1}},[L]);const C=T(()=>ue(f==null?void 0:f.turns),[f]),z=T(()=>{if(!d)return C;const e=d.toLowerCase();return C.filter(o=>o.label.toLowerCase().includes(e)||o.lane.toLowerCase().includes(e)||(o.meta||"").toLowerCase().includes(e))},[C,d]),V=$?z.find(e=>e.id===$)??null:null,P=A(e=>{g(e.session_id||e.id)},[]),W=A(e=>{N(e.id===$?null:e.id)},[$]);return ie(t==null?void 0:t.enabledTools)&&!((s==null?void 0:s.tools)||[]).some(e=>e.tool!=="aictl")?i`<div class="c-shell"><${ne} enabledTools=${t.enabledTools} snap=${s} what="the overview"/></div>`:i`<div class="c-shell">
    <!-- Stats strip -->
    <div class="cdb-stats-strip">
      ${U.map(e=>i`<${ve} key=${e.label} label=${e.label} value=${e.value} sub=${e.sub}/>`)}
    </div>

    <!-- Body: 3-col -->
    <div class="cdb-body">

      <!-- Left: range + sessions -->
      <div class="cdb-left">
        <div class="c-overline cdb-left-heading">Range</div>
        <div class="cdb-range-btns">
          ${fe.map(e=>i`<button key=${e} type="button"
            class=${"cdb-range-btn"+(a===e?" is-active":"")}
            onClick=${()=>l(e)}>${e}</button>`)}
        </div>

        ${S.length>0&&i`<div>
          <div class="c-overline cdb-left-heading" style="margin-top:var(--sp-8)">
            Agents
            <span class="cdb-count-badge">
              ${k===null?S.length:k.size}/${S.length}
            </span>
          </div>
          <div class="cdb-agents-list">
            ${S.map(e=>i`<${pe}
              key=${e.tool} tool=${e.tool} label=${e.label} color=${e.color}
              active=${k===null||k.has(e.tool)}
              onToggle=${()=>Q(e.tool)}/>`)}
          </div>
        </div>`}

        <div class="c-overline cdb-left-heading" style="margin-top:var(--sp-8)">
          Sessions
          <span class="cdb-count-badge">${w.length}</span>
        </div>
        <div class="c-filter-wrap cdb-filter-wrap cdb-filter-wrap--sm">
          <span class="c-filter-icon" aria-hidden="true">\u2315</span>
          <input class="c-filter-input" type="text" placeholder="Filter\u2026"
            aria-label="Filter sessions"
            value=${c} onInput=${e=>r(e.target.value)}/>
        </div>
        <div class="cdb-sessions-list">
          ${w.length===0?i`<div class="cdb-empty-list">No active sessions</div>`:w.map(e=>{const o=e.session_id||e.id||"",n=String(o).split(":").pop(),p=o===L;return x(e._tool),i`<div key=${o}
                  class=${"c-row c-row--list"+(p?" is-selected":"")}
                  onClick=${()=>P(e)}
                  role="button" tabIndex=${0}
                  onKeyDown=${v=>v.key==="Enter"&&P(e)}>
                  <div class="cdb-session-row-head">
                    <${oe} tool=${e._tool} size="0.85em"/>
                    <span class="cdb-session-id">${n}</span>
                    ${e.active!==!1&&i`<span class="cdb-live-badge">\u25CF Live</span>`}
                  </div>
                  <div class="cdb-session-meta">
                    ${e._toolLabel} \u00b7 ${b(e.estimated_tokens||e.tokens||0)} tok
                    ${e.files_modified>0?` · ${e.files_modified}f`:""}
                    ${e.duration_s>0?` · ${M(e.duration_s)}`:""}
                    \u00b7 ${ae(e.last_seen_at||e.started_at)||"—"}
                  </div>
                </div>`})}
        </div>
      </div>

      <!-- Center: event timeline -->
      <div class="cdb-center">
        <div class="cdb-center-head">
          <div>
            <div class="c-overline c-overline--wide">The session</div>
            ${m?i`<div class="cdb-center-title">
                  <span style="color:${x(m._tool)}">\u25CF</span>
                  ${" "}${m._toolLabel}
                  ${" "}
                  <span class="cdb-center-id">
                    ${String(m.session_id||m.id||"").split(":").pop()}
                  </span>
                </div>`:i`<div class="cdb-center-title cdb-center-title--empty">Select a session</div>`}
          </div>
          <div class="c-filter-wrap cdb-filter-wrap">
            <span class="c-filter-icon" aria-hidden="true">\u2315</span>
            <input class="c-filter-input" type="text" placeholder="Filter events\u2026"
              aria-label="Filter events"
              value=${d} onInput=${e=>_(e.target.value)}/>
            ${C.length>0&&i`<span class="cdb-ev-count">
              ${z.length}/${C.length}
            </span>`}
          </div>
        </div>

        <div class="cdb-timeline">
          ${m?J?i`<div class="cdb-timeline-loading">Loading events\u2026</div>`:z.length===0?i`<div class="cdb-timeline-loading">
                    ${C.length===0?"No event data for this session.":"No events match filter."}
                  </div>`:i`<div>
                    ${z.map((e,o)=>i`<${be}
                      key=${e.id} ev=${e}
                      selected=${e.id===$}
                      onClick=${()=>W(e)}
                      isLast=${o===z.length-1}/>`)}
                    <div class="c-overline c-overline--wide cdb-timeline-end">\u00b7 end of session \u00b7</div>
                  </div>`:i`<div class="cdb-empty-center">
                <div class="c-overline cdb-empty-center-label">No session selected</div>
                <div>Choose a session in the left pane.</div>
              </div>`}
        </div>
      </div>

      <!-- Right: event inspector -->
      <div class="cdb-right">
        <${$e} event=${V}/>
      </div>
    </div>
  </div>`}export{ge as default};
