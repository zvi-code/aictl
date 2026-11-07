import{x as J,d as b,T as H,y as z,m as s,q as Q,A as Kt,w as Pt}from"./index-NixqUkgD.js";import{aE as ls,aF as rs,M as Jt,w as $,B as U,_ as ds,D as ft,aG as cs,aH as Y,v as h,A as et,aI as ps,aJ as us,aK as vs,aL as ms,r as $t,aM as fs,aN as $s,aO as Yt,aP as gs,aQ as hs,aR as ys,aS as _s,k as xs,aT as Xt,L as Qt,T as Tt,C as Zt,aU as xt,aV as bs,aD as ts,aW as ss,aX as N,aY as tt,aZ as St,a_ as ks,x as ws,a$ as es,b0 as Lt,b1 as Ts,K as Ss,b2 as Ot}from"./useSse-WAQ32Qi7.js";import{S as X,d as Cs,f as st,i as As,C as bt,e as Es,g as pt,T as Ms,u as Ps,M as Ls,t as Os,h as zs,r as Is}from"./app-Bkln0yRD.js";import{I as O,T as Ns}from"./ToolScopeEmpty-DM9crnSE.js";import{u as R}from"./useAsyncResource-CCJj418w.js";import{c as Fs}from"./models-DHnW0Za4.js";import"./TextView-C4sLySTP.js";function Ds(t,e){if(!(e!=null&&e.length))return t;const l=e.filter(n=>n.session_id&&n.tool&&!st(t,n.session_id)).map(n=>({...n,active:!0,live:!0}));return l.length?[...t,...l].sort((n,a)=>(a.started_at||0)-(n.started_at||0)):t}function ut({globalRange:t=null,enabledTools:e=null,requestedSession:l=null,onRequestApplied:n=null}={}){var k,L;const a=(L=(k=J(X))==null?void 0:k.snap)==null?void 0:L.sessions,[o,r]=b([]),i=H(()=>Ds(o,a),[o,a]),[d,v]=b(!0),[u,g]=b(null),[c,_]=b(null),[p,m]=b(null);z(()=>{let E=!1;v(!0),g(null);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,M=t==null?void 0:t.until;return ls(null,{since:P,until:M}).then(I=>{if(E)return;const V=Cs(I);V.sort((W,G)=>(G.started_at||0)-(W.started_at||0)),r(V),v(!1)}).catch(I=>{E||(g(I),v(!1))}),()=>{E=!0}},[t]);const y=E=>Jt(E,e),f=H(()=>i.filter(E=>y(E.tool)),[i,e]),S=H(()=>rs(f),[f]);z(()=>{S.length===0?(c&&_(null),p&&m(null)):(!c||!S.includes(c))&&_(S[0])},[S.join(",")]);const x=H(()=>f.filter(E=>E.tool===c),[f,c]);return z(()=>{x.length>0&&(!p||!st(x,p))&&m(x[0].session_id)},[c,x.length]),z(()=>{if(!(l!=null&&l.sessionId))return;const E=st(i,l.sessionId);if(E){if(!y(E.tool)){n==null||n();return}_(E.tool),m(E.session_id),n==null||n()}},[l,i]),{sessions:f,loading:d,error:u,tools:S,toolSessions:x,activeTool:c,setActiveTool:_,activeSessionId:p,setActiveSessionId:m}}const at={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function zt({agent:t,tasks:e,now:l}){const n=at[t.state]||at.active,a=t.ended_at?t.ended_at-t.started_at:l-t.started_at,o=e.filter(r=>r.agent_id===t.agent_id);return s`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${n.bg};color:var(--on-status)">${n.label}</span>
      <strong class="text-sm">${$(t.agent_id)}</strong>
      <span class="text-muted text-xs">${U(a)}</span>
      ${t.task&&s`<span class="text-xs mono text-muted">\u2014 ${$(t.task)}</span>`}
    </div>
    ${o.length>0&&s`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${o.map(r=>{const i=at[r.state]||at.pending;return s`<div key=${r.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${i.bg};color:var(--on-status);font-size:var(--fs-xs);padding:1px 4px">${i.label}</span>
          <span class="mono">${$(r.name||r.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function Bs({entityState:t}){if(!t||!t.agents||!t.agents.length)return null;const e=t.agents,l=t.tasks||[],n=Date.now()/1e3,a=e.filter(r=>r.state==="active"),o=e.filter(r=>r.state!=="active");return s`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${e.length} agent${e.length>1?"s":""}</span>
      ${a.length>0&&s`<span class="badge text-xs" style="background:var(--green);color:var(--on-status)">${a.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${a.map(r=>s`<${zt} key=${r.agent_id} agent=${r} tasks=${l} now=${n}/>`)}
      ${o.map(r=>s`<${zt} key=${r.agent_id} agent=${r} tasks=${l} now=${n}/>`)}
    </div>
  </div>`}function Rs({tasks:t}){if(!t||!t.length)return null;const e=t.filter(o=>o.state==="pending"),l=t.filter(o=>o.state==="active"),n=t.filter(o=>o.state==="done");function a({title:o,items:r,color:i}){return s`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${i}">
        <strong class="text-sm">${o}</strong>
        <span class="text-muted text-xs">${r.length}</span>
      </div>
      <div class="tt-column-body">
        ${r.length?r.map(d=>s`<div key=${d.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${$(d.name||d.task_id)}</div>
              ${d.agent_id&&s`<div class="text-xs text-muted">Agent: ${$(d.agent_id)}</div>`}
            </div>`):s`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return s`<div class="tt-board">
    <${a} title="Pending" items=${e} color="var(--fg3)"/>
    <${a} title="Active" items=${l} color="var(--accent)"/>
    <${a} title="Done" items=${n} color="var(--green)"/>
  </div>`}function B({title:t,icon:e,badge:l,defaultOpen:n,children:a}){const[o,r]=b(n||!1);return s`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>r(i=>!i)}
      aria-expanded=${o}>
      <span class="sd-panel-icon"><${O} name=${e} size="1em"/></span>
      <span class="sd-panel-title">${t}</span>
      ${l!=null&&s`<span class="badge text-xs" style="margin-left:var(--sp-2)">${l}</span>`}
      <span class="sd-panel-arrow" aria-hidden="true">${o?"▲":"▼"}</span>
    </button>
    ${o&&s`<div class="sd-panel-body">${a}</div>`}
  </div>`}const js={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)","hook:PreToolUse":"var(--accent)","hook:PostToolUse":"var(--accent)","hook:tool_use":"var(--accent)"};function it(t){if(t==null||t==="")return"";if(typeof t=="string")return t;try{return JSON.stringify(t)}catch{return String(t)}}function qs(t){const e=[],l=new Set,n=6;for(let a=0;a<t.length;a++){if(l.has(a))continue;const o=t[a];if(o.kind==="hook:PreToolUse"){const r=o.detail&&o.detail.tool_name||"";let i=-1;for(let d=a+1;d<Math.min(t.length,a+1+n);d++){const v=t[d];if(l.has(d)||v.kind!=="hook:PostToolUse")continue;const u=v.detail&&v.detail.tool_name||"";if(!(r&&u&&r!==u)){i=d;break}}if(i>=0){const d=t[i];l.add(i);const v=o.detail||{},u=d.detail||{};e.push({...o,kind:"hook:tool_use",ts:o.ts,end_ts:d.ts,detail:{...v,tool_name:v.tool_name||u.tool_name||"",tool_input:v.tool_input!=null?v.tool_input:v.input,result_summary:u.result_summary!=null?u.result_summary:u.tool_response!=null?u.tool_response:u.result}});continue}}e.push(o)}return e}function Hs(t){const e=a=>{const o=a.detail||{};return String(o.path||o.name||o.tool_name||a.kind)},l=a=>{const o=a.detail||{},r=o.tool_input!=null?o.tool_input:o.input,i=o.result_summary!=null?o.result_summary:o.tool_response!=null?o.tool_response:o.result;return it(r)!==""||it(i)!==""},n=[];for(const a of t){const o=n[n.length-1];if(o&&o.kind===a.kind&&e(o)===e(a)&&!l(o)&&!l(a)){const r=(o.repeat_count||1)+1;n[n.length-1]={...o,repeat_count:r,last_ts:a.ts};continue}n.push(a)}return n}function Vs({sessionId:t}){const[e,l]=b([]),[n,a]=b(!0),[o,r]=b(null),[i,d]=b({});z(()=>{if(!t){l([]),a(!1),r(null);return}let u=!1;return a(!0),r(null),d({}),ds({sessionId:t,limit:200,since:0}).then(c=>{u||(l((Array.isArray(c)?c:[]).reverse()),a(!1))}).catch(c=>{u||(l([]),r(c),a(!1))}),()=>{u=!0}},[t]);const v=H(()=>Hs(qs(e)),[e]);return n?s`<p class="loading-state">Loading events...</p>`:o?s`<p class="error-state">Failed to load session actions${o.message?` (${o.message})`:""}.</p>`:v.length?s`<div class="sd-events">
    ${v.map(u=>{const g=js[u.kind]||"var(--fg3)",c=u.detail||{},_=c.path||c.name||c.tool_name||u.kind,p=c.tool_input!=null?c.tool_input:c.input,m=c.result_summary!=null?c.result_summary:c.tool_response!=null?c.tool_response:c.result,y=it(p),f=it(m),S=y!==""||f!=="",x=`${u.ts}-${u.kind}`,k=!!i[x],L=y?y.slice(0,80)+(y.length>80?"…":""):"",E=f?f.slice(0,80)+(f.length>80?"…":""):"",P=L||E;return s`<div key=${x} class="sd-event-row-wrap">
        <div class="sd-event-row">
          <span class="sd-event-time" title=${u.repeat_count>1?`${ft(u.ts)} → ${ft(u.last_ts)}`:null}>${ft(u.ts)}</span>
          <span class="sd-event-dot" style="background:${g}"></span>
          <span class="sd-event-kind">${u.kind}</span>
          <span class="sd-event-desc mono text-muted">${$(String(_))}</span>
          ${u.repeat_count>1&&s`<span class="badge" title=${`${u.repeat_count} consecutive identical events`}>×${u.repeat_count}</span>`}
        </div>
        ${S&&s`<div class="sd-event-detail">
          <button type="button"
            class="sd-event-toggle"
            aria-expanded=${k?"true":"false"}
            onClick=${()=>d(M=>({...M,[x]:!M[x]}))}
            style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-xs);text-align:left;font-family:inherit">
            <span style="display:inline-block;width:1em">${k?"˅":"›"}</span>
            ${k?s`<span class="text-muted">hide</span>`:s`<span class="mono text-muted" title=${y||f}>${$(P)}</span>`}
          </button>
          ${k&&s`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:var(--sp-1) 0 0 1em;padding:var(--sp-2);background:var(--bg2);border-radius:var(--radius-sm)">${$((y?"input: "+y:"")+(y&&f?`

`:"")+(f?"result: "+f:""))}</pre>`}
        </div>`}
      </div>`})}
  </div>`:s`<p class="empty-state">No events recorded for this session.</p>`}function Us(){return`Set capture = "full" under [storage] in ${As()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function It(t){return(t==null?void 0:t.content_retained)===!1}function Ws(t){return t&&t!=="full"?`Text not retained: capture=${t}`:t==="full"?"Text not retained for this session":"Text not retained: capture mode is not full"}function as({mode:t}){return s`<div class="panel-state panel-state--withheld" role="status">
    <${O} name="file-text" size="14"/>
    <div>
      <div class="panel-state__title">${Ws(t)}</div>
      <div class="panel-state__hint">Prompts and replies for this session were not stored. Counts, timing, models and tool calls are still shown.</div>
      <code class="panel-state__fix">${Us()}</code>
    </div>
  </div>`}const Nt=240,Gs={user:"var(--accent)",assistant:"var(--green)"};function Ks({sessionId:t,withheld:e=!1,captureMode:l=null}){const[n,a]=b({}),{data:o,loading:r,error:i}=R(()=>cs(t),[t],{enabled:!!t});z(()=>{a({})},[t]);const d=Array.isArray(o==null?void 0:o.messages)?o.messages:[];return r?s`<p class="loading-state">Loading conversation...</p>`:i?s`<p class="error-state">Failed to load conversation${i.message?` (${i.message})`:""}.</p>`:d.length?s`<div class="sd-conversation">
    ${d.map((v,u)=>{const g=v.role||"unknown",c=Gs[g]||"var(--fg2)",_=String(v.content||""),p=_.length>Nt,m=`${v.ts}-${g}-${u}`,y=!!n[m];return s`<div key=${m} style="padding:var(--sp-2) 0;border-bottom:1px solid var(--bg3)">
        <div class="flex-row gap-sm" style="align-items:center">
          <span class="badge text-xs" style="background:${c};color:var(--on-status)">${g}</span>
          <span class="badge--muted badge text-xs" title=${"Captured via "+(v.source||"unknown")}>${v.source||"?"}</span>
          <span class="text-xs text-muted mono" style="margin-left:auto">${Y(v.ts)}</span>
        </div>
        <div class="mono" style="font-size:var(--fs-sm);margin-top:var(--sp-1);white-space:pre-wrap;word-break:break-word">
          ${y||!p?_:_.slice(0,Nt)+"…"}
        </div>
        ${p&&s`<button type="button"
          aria-expanded=${y?"true":"false"}
          onClick=${()=>a(f=>({...f,[m]:!f[m]}))}
          style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent);font-size:var(--fs-xs);font-family:inherit">
          ${y?"Show less":`Show all ${_.length} chars`}
        </button>`}
      </div>`})}
  </div>`:e?s`<${as} mode=${l}/>`:s`<p class="empty-state">No conversation captured for this session.</p>`}const Ft=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Js=95;function ns({path:t,session:e,openViewer:l}){if(!t||!e||typeof l!="function")return null;const n=e.started_at,a=e.ended_at;if(!n&&!a)return null;const o=r=>i=>{i.preventDefault(),i.stopPropagation(),l(t,{at:r})};return s`<span class="file-history-btns" aria-label="View file at session start or end">
    ${n&&s`<button type="button" class="file-history-btn"
      title="View at session start"
      aria-label=${"View "+t+" at session start"}
      onClick=${o(n)}>\u25F7 start</button>`}
    ${a&&s`<button type="button" class="file-history-btn"
      title="View at session end"
      aria-label=${"View "+t+" at session end"}
      onClick=${o(a)}>\u25F8 end</button>`}
  </span>`}function Ys({session:t}){const e=J(X),l=e.snap,n=t.files_loaded||[],a=((l==null?void 0:l.tool_configs)||[]).map(p=>p.model).filter(Boolean)[0]||"",o=Fs(a),i=(l&&l.agent_memory||[]).reduce((p,m)=>p+(m.tokens||0),0),d=n.length*150,u=Ft.reduce((p,m)=>p+m.tokens,0)+i+d,g=Math.min(u/o*100,100),c=Js,_=[...Ft,{name:"Memory",tokens:i,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:d,color:"var(--green)"}].filter(p=>p.tokens>0);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${n.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${h(u)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${h(o)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${g>80?"var(--orange)":g>50?"var(--yellow)":"var(--green)"}">${et(g)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${_.map(p=>{const m=(p.tokens/o*100).toFixed(1);return s`<div key=${p.name} style="width:${m}%;background:${p.color};min-width:${p.tokens>0?"1px":"0"}"
              title="${p.name}: ~${h(p.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${c}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${c}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${_.map(p=>s`<span key=${p.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${p.color};margin-right:2px"></span>
          ${p.name} ${h(p.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${c}%</span>
      </div>
    </div>

    ${n.length>0&&s`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${n.map(p=>s`<div key=${p} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${$(p)}</span>
        <${ns} path=${p} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>`}
    ${!n.length&&s`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Xs({mem:t}){const[e,l]=b(!1),n=t.name||(t.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",a=(t.content||"").slice(0,300);return s`<div class="sd-memory-entry">
    <button type="button" class="flex-row gap-sm"
      aria-expanded=${e}
      onClick=${()=>l(!e)}
      style="align-items:center;width:100%;background:none;border:none;padding:0;
        font:inherit;color:inherit;text-align:left;cursor:pointer">
      <span class="badge text-xs">${t.type||t.source||"file"}</span>
      <strong title=${t.file||t.path||""}>${$(n)}</strong>
      ${t.tokens?s`<span class="text-muted">${h(t.tokens)} tok</span>`:null}
      ${t.lines?s`<span class="text-muted">${t.lines}ln</span>`:null}
      ${t.profile?s`<span class="text-muted">${$(t.profile)}</span>`:null}
      <span class="text-muted" aria-hidden="true" style="margin-left:auto;font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&a?s`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${$(t.content)}${t.content&&t.content.length>300,""}</pre>`:null}
  </div>`}function Qs({session:t}){const{snap:e}=J(X),l=e&&e.agent_memory||[],n=t.project||"",a=n?l.filter(o=>{const r=o.project||o.tool||"";return!n||r.includes(n.replace(/\\/g,"/").split("/").pop())}):l;return s`<div>
    <${ee} sessionId=${t.session_id}/>
    ${a.length?s`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
          ${a.map((o,r)=>s`<${Xs} key=${r} mem=${o}/>`)}
        </div>`:s`<p class="empty-state">
          No memory entries found${n?" for this project":""}.
          <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
        </p>`}
  </div>`}const Zs={added:"+",modified:"●",removed:"−"},te={added:"added",modified:"modified",removed:"removed"};function se({file:t}){const[e,l]=b(!1),n=Zs[t.change]||"·";return s`<div class="sd-memdiff-row" data-change=${t.change}>
    <button type="button" class="flex-row gap-sm"
         style="align-items:center;cursor:pointer;padding:var(--sp-1) 0;width:100%;
           background:none;border:none;font:inherit;color:inherit;text-align:left"
         onClick=${()=>l(!e)} aria-expanded=${e}>
      <span class="badge text-xs" title=${te[t.change]||t.change}>${n}</span>
      <code class="text-xs" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${$(t.path)}</code>
      <span class="text-xs" style="color:var(--positive, #4caf50)">+${t.added_lines||0}</span>
      <span class="text-xs" style="color:var(--negative, #f44336)">-${t.removed_lines||0}</span>
      <span class="text-muted" aria-hidden="true" style="font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&t.unified_diff?s`<pre class="diff" style="margin:var(--sp-1) 0 var(--sp-2);padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre;overflow-x:auto;max-height:20rem;overflow-y:auto;
      font-size:var(--fs-xs);line-height:1.4;font-family:var(--font-mono, monospace)">${$(t.unified_diff)}</pre>`:null}
  </div>`}function ee({sessionId:t}){const{data:e,loading:l}=R(()=>ps(t).then(o=>o||{files:[],summary:{}}).catch(()=>({files:[],summary:{}})),[t],{enabled:!!t}),n=e&&e.files||[],a=e&&e.summary||{added:0,modified:0,removed:0};return s`<div class="sd-memdiff" style="margin-bottom:var(--sp-3)">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-2)">
      <strong class="text-sm">Memory changes this session</strong>
      ${!l&&n.length?s`<span class="text-muted text-xs">
        ${a.added||0} added \u00B7 ${a.modified||0} modified \u00B7 ${a.removed||0} removed
      </span>`:null}
    </div>
    ${l?s`<p class="text-muted text-xs">Loading\u2026</p>`:n.length?s`<div class="mono text-xs">${n.map((o,r)=>s`<${se} key=${o.path+r} file=${o}/>`)}</div>`:s`<p class="empty-state text-xs">
          No memory changes recorded for this session.
          <small class="empty-state-source">/api/session-memory-diff · files[]</small>
        </p>`}
  </div>`}function ae({rateLimits:t}){return!t||!Object.keys(t).length?null:s`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(t).map(([e,l])=>{const n=l.used_pct||l.used_percentage||0,a=n>80?"var(--red)":n>60?"var(--orange)":"var(--green)",o=l.resets_at||"";return s`<div key=${e} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${e} window</span>
            <span style="color:${a};font-weight:600">${et(n)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(n,100)}%;background:${a};border-radius:4px"></div>
          </div>
          ${o&&s`<div class="text-xs text-muted" style="margin-top:2px">resets ${o}</div>`}
        </div>`})}
    </div>
  </div>`}function ne({sessionId:t,topN:e=10}){const{data:l,loading:n,error:a}=R(()=>us(t),[t],{enabled:!!t}),o=H(()=>!l||!Array.isArray(l.counts)?[]:l.counts.slice(0,e),[l,e]);if(n)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading subprocesses\u2026</div>`;if(a)return s`<div class="error-state text-xs" style="padding:0">Failed to load subprocess breakdown${a.message?` (${a.message})`:""}.</div>`;if(!o.length)return s`<div class="text-xs text-muted">No subprocess activity recorded
      (live correlator data only; not available for ended sessions).</div>`;const r=Math.max(1,...o.map(i=>i.count));return s`<div class="subprocess-breakdown" aria-label="Top subprocesses by count">
    <div class="text-xs text-muted mb-sm">Top ${Math.min(e,o.length)} subprocesses
      <span class="text-muted">\u00b7 total ${l.total}</span></div>
    <div class="subprocess-rows">
      ${o.map(i=>{const d=i.count/r*100;return s`<div key=${i.name} class="subprocess-row">
          <span class="subprocess-name mono text-xs" title=${i.name}>${$(i.name)}</span>
          <div class="subprocess-bar-track">
            <div class="subprocess-bar" style=${"width:"+d+"%"}></div>
          </div>
          <span class="subprocess-count text-xs mono">${i.count}</span>
        </div>`})}
    </div>
  </div>`}function oe({session:t}){const e=t.exact_input_tokens||0,l=t.exact_output_tokens||0,{data:n}=R(()=>vs({tool:t.tool,active:!1,limit:20}).then(p=>{if(p.length>1){const m=p.filter(f=>f.duration_s>0).map(f=>f.duration_s);return{avgDuration:m.length?m.reduce((f,S)=>f+S,0)/m.length:0,sampleCount:p.length}}return null}).catch(()=>null),[t.tool],{enabled:!!t.tool}),{data:a}=R(()=>ms(t.session_id).then(p=>p&&!p.error?p:null).catch(()=>null),[t.session_id],{enabled:!!t.session_id}),o=t.duration_s||0,r=n&&n.avgDuration>0?o/n.avgDuration:null,i=(a==null?void 0:a.vscode_lm_usage)||null,d=(a==null?void 0:a.skill_call_breakdown)||{},v=Object.entries(d).sort((p,m)=>m[1]-p[1]),u=(a==null?void 0:a.tool_call_breakdown)||{},g=Object.entries(u).sort((p,m)=>m[1]-p[1]),c=(a==null?void 0:a.agents)||[],_=(a==null?void 0:a.context_state)||null;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${h(e)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${h(l)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${h(e+l)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${et(t.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${et(t.peak_cpu_percent||0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${$t(t.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${$t(t.outbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${$t(t.state_bytes_written||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(t.pids)?t.pids.length:t.pids||0}</div></div>
      ${t.cache_hit_ratio!=null&&s`<div class="es-kv-card">
        <div class="label">Cache Hit</div>
        <div class="value" style="color:${t.cache_hit_ratio>=.5?"var(--green)":"var(--fg)"}">${et(t.cache_hit_ratio*100)}</div>
      </div>`}
    </div>
    ${r!=null&&s`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${n.sampleCount} sessions):
      duration ${r>1.2?s`<span class="text-orange">${r.toFixed(1)}x longer</span>`:r<.8?s`<span class="text-green">${(1/r).toFixed(1)}x shorter</span>`:s`<span>similar</span>`}
    </div>`}
    ${t.entity_state&&s`<${ae} rateLimits=${t.entity_state.rate_limits}/>`}
    ${a&&s`<div class="session-agent-report" style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted mb-sm">Skills and subagents
        ${_&&s`<span class="badge" style="margin-left:var(--sp-2);font-size:var(--fs-2xs)"
          title="Deduced context-window state">context: ${_}</span>`}
      </div>
      <div class="es-kv" style="gap:var(--sp-3)">
        <div class="es-kv-card"><div class="label">Skill Calls</div><div class="value">${a.skill_calls||0}</div></div>
        <div class="es-kv-card"><div class="label">Subagents</div><div class="value">${c.length}</div></div>
        <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${a.tool_calls||0}</div></div>
        <div class="es-kv-card"><div class="label">Prompts</div><div class="value">${a.prompt_count||0}</div></div>
        <div class="es-kv-card"><div class="label">Tool calls/min</div><div class="value">${a.tool_call_rate!=null?a.tool_call_rate:"—"}</div></div>
      </div>
      ${g.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        <div class="text-xs text-muted">By tool</div>
        ${g.map(([p,m])=>s`<div key=${p} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1">${p}</span>
          <span class="text-xs mono">${m}</span>
        </div>`)}
      </div>`}
      ${v.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        <div class="text-xs text-muted">By skill</div>
        ${v.map(([p,m])=>s`<div key=${p} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1">${p}</span>
          <span class="text-xs mono">${m}</span>
        </div>`)}
      </div>`}
      ${c.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        ${c.slice(0,8).map(p=>s`<div key=${p.agent_id} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1" title=${p.task||""}>${p.agent_id||"subagent"}</span>
          <span class="text-xs text-muted">${p.state||""}</span>
        </div>`)}
      </div>`}
    </div>`}
    ${i&&Object.keys(i.by_extension||{}).length>0&&s`
      <div class="lm-usage-breakdown" style="margin-top:var(--sp-3)">
        <div class="text-xs text-muted mb-sm">VS Code Language-Model tokens by extension
          <span class="text-muted">\u00b7 total ${h(i.total_tokens||0)}</span></div>
        <div>
          ${Object.entries(i.by_extension).sort((p,m)=>(m[1].total_tokens||0)-(p[1].total_tokens||0)).map(([p,m])=>{const y=i.total_tokens||1,f=(m.total_tokens||0)/y*100;return s`<div key=${p} class="lm-usage-row flex-row gap-sm"
                style="align-items:center;padding:var(--sp-1) 0">
                <span class="mono text-xs" style="flex:1" title=${p}>${p}</span>
                <div style="width:80px;height:6px;background:var(--bg-alt);border-radius:3px;overflow:hidden">
                  <div style=${"width:"+f.toFixed(1)+"%;height:100%;background:var(--accent)"}></div>
                </div>
                <span class="text-xs mono">${h(m.total_tokens||0)}</span>
                <span class="text-xs text-muted mono">(${m.calls||0})</span>
              </div>`})}
        </div>
      </div>`}
    <div style="margin-top:var(--sp-3)">
      <${ne} sessionId=${t.session_id} topN=${10}/>
    </div>
  </div>`}function ie({session:t}){const e=J(X),l=t.files_touched||[],n=t.file_events||0;return l.length?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${l.length}${t.files_touched_limited?"+":""}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${h(n)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${l.map(a=>s`<div key=${a} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${$(a)}</span>
        <${ns} path=${a} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>
  </div>`:s`<p class="empty-state">No file changes recorded.</p>`}function le({sessionId:t}){const{data:e,loading:l,error:n}=R(()=>{const r=t?0:Math.floor(Date.now()/1e3)-3600;return fs(r,100,t)},[t]);if(l)return s`<p class="loading-state">Loading API call data...</p>`;if(n)return s`<p class="error-state">Failed to load API calls${n.message?` (${n.message})`:""}.</p>`;if(!e||!e.calls||!e.calls.length)return s`<p class="empty-state">No OTel API call data. Enable with: <code>aictl otel enable</code></p>`;const{calls:a,summary:o}=e;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${o.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${o.total_errors>0?"var(--red)":"var(--fg)"}">${o.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${o.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${o.p95_latency_ms}ms</div></div>
    </div>
    ${o.by_model&&Object.keys(o.by_model).length>0&&s`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(o.by_model).map(([r,i])=>s`
          <span key=${r} class="badge text-xs">${r}: ${i}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${a.slice(0,30).map((r,i)=>{const d=r.status==="error",v=new Date(r.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),u=Number(r.http_status),g=Number.isFinite(u)&&u>=400;return s`<div key=${i} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:14px;flex-shrink:0;text-align:center;color:${d?"var(--red)":"var(--green)"}">
            <span aria-hidden="true">${d?"✗":"✓"}</span><span class="sr-only">${d?"error":"ok"}</span>
          </span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${r.model||"—"}</span>
          ${!d&&s`<span style="width:50px;flex-shrink:0;text-align:right">${r.duration_ms||0}ms</span>`}
          ${!d&&s`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${h(r.input_tokens||0)}in</span>`}
          ${d&&s`<span style="color:var(--red)">${$(r.error||"error")}</span>`}
          ${r.finish_reason&&s`<span class="badge" style="font-size:var(--fs-xs);color:${r.finish_reason==="length"?"var(--orange)":"var(--fg-muted)"}">${$(String(r.finish_reason))}</span>`}
          ${r.error_type&&s`<span class="badge" style="font-size:var(--fs-xs);color:var(--red)">${$(String(r.error_type))}</span>`}
          ${r.http_status&&s`<span class="badge" style="font-size:var(--fs-xs);color:${g?"var(--red)":"var(--fg-muted)"}">${$(String(r.http_status))}</span>`}
        </div>`})}
    </div>
  </div>`}function re({project:t}){const{data:e,loading:l,error:n}=R(()=>$s(7).then(a=>(Array.isArray(a)?a.find(r=>r.project===t):null)||null),[t],{enabled:!!t});return l?s`<p class="loading-state">Loading project costs...</p>`:n?s`<p class="error-state">Failed to load project costs${n.message?` (${n.message})`:""}.</p>`:e?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${e.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${h(e.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${h(e.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value"><${bt} row=${e}/></div></div>
    </div>
    ${e.daily&&e.daily.length>0&&s`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${e.daily.map(a=>{const o=a.input_tokens+a.output_tokens,r=Math.max(...e.daily.map(v=>v.input_tokens+v.output_tokens),1),i=(o/r*100).toFixed(1),d=new Date(a.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return s`<div key=${a.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${i}%;background:var(--green);border-radius:3px"
              title="${h(o)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${h(o)}</span>
        </div>`})}
    </div>`}
  </div>`:s`<p class="empty-state">No cost data available for this project.</p>`}const de=1e3;function ce({project:t,tool:e}){const{data:l,loading:n,error:a}=R(()=>Yt(t,e,30,de).then(d=>Array.isArray(d)?d:[]),[t,e],{enabled:!!(t&&e)});if(n)return s`<p class="loading-state">Loading run history...</p>`;if(a)return s`<p class="error-state">Failed to load run history${a.message?` (${a.message})`:""}.</p>`;if(!l||l.length<2)return s`<p class="empty-state">Not enough session history for trend analysis.</p>`;const o=Math.max(...l.map(d=>d.total_tokens),1),r=l.reduce((d,v)=>d+v.duration_s,0)/l.length,i=l.reduce((d,v)=>d+v.total_tokens,0)/l.length;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${l.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${U(r)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${h(i)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${l.map(d=>{const v=(d.total_tokens/o*100).toFixed(1),u=new Date(d.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),g=r>0?d.duration_s/r:1;return s`<div key=${d.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${u}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;border-radius:3px;background:${g>1.5?"var(--orange)":g<.7?"var(--green)":"var(--accent)"}" title="${h(d.total_tokens)} tok, ${U(d.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${h(d.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${U(d.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function pe({sessionId:t}){const{data:e,loading:l,error:n}=R(()=>gs(t),[t],{enabled:!!t});if(l)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading MCP usage\u2026</div>`;if(n)return s`<div class="error-state text-xs" style="padding:0">Failed to load MCP usage${n.message?` (${n.message})`:""}.</div>`;const a=e&&Array.isArray(e.servers)?e.servers:[],o=e&&Array.isArray(e.configured_servers)?e.configured_servers:[],r=new Set(a.map(d=>d.server_name)),i=o.filter(d=>!r.has(d));return!a.length&&!o.length?s`<div class="text-xs text-muted">No MCP servers called in this session.</div>`:s`<div class="mcp-usage-panel" aria-label="MCP server usage for session">
    ${a.length>0&&s`
      <div class="text-xs text-muted mb-sm">
        ${a.length} server${a.length===1?"":"s"} called \u00b7
        ${e.total_calls||0} total call${(e.total_calls||0)===1?"":"s"}
      </div>
      <div class="mcp-usage-rows">
        ${a.map(d=>{const v=(d.err_count||0)>0;return s`<div key=${d.server_name} class="mcp-usage-row flex-row gap-sm"
            style="align-items:center;padding:var(--sp-1) 0">
            <span class="mono text-xs" style="flex:1" title=${d.server_name}>${$(d.server_name)}</span>
            <span class="text-xs mono">${d.call_count}</span>
            ${v&&s`<span class="text-xs text-orange" title=${d.err_count+" error(s)"}>!${d.err_count}</span>`}
          </div>`})}
      </div>
    `}
    ${a.length===0&&o.length>0&&s`
      <div class="text-xs text-muted mb-sm">No MCP servers called in this session.</div>
    `}
    ${i.length>0&&s`
      <div class="mcp-usage-unused" style="margin-top:var(--sp-2);opacity:0.55">
        <div class="text-xs text-muted mb-sm">Configured but unused (${i.length})</div>
        <div class="mcp-usage-rows">
          ${i.map(d=>s`<div key=${d} class="mono text-xs"
            style="padding:var(--sp-1) 0">${$(d)}</div>`)}
        </div>
      </div>
    `}
  </div>`}function ue({sessionId:t}){const{data:e,loading:l,error:n}=R(()=>hs(t),[t],{enabled:!!t});if(l||!t)return s`<p class="loading-state">Loading cost breakdown\u2026</p>`;if(n)return s`<p class="empty-state">Failed to load cost data.</p>`;if(!e||!e.models||!e.models.length)return s`<p class="empty-state">No per-model cost data recorded for this session.</p>`;const{models:a,totals:o}=e,r=Math.max(...a.map(i=>i.cost_usd||0),1e-9);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Models</div><div class="value">${a.length}</div></div>
      <div class="es-kv-card"><div class="label">Requests</div><div class="value">${o.requests}</div></div>
      <div class="es-kv-card" title="Estimated from token counts and list prices. Not a billed amount."><div class="label">Estimated total</div><div class="value"><${bt} row=${o} digits=${4}/></div></div>
    </div>
    <div style="margin-top:var(--sp-2)">
      ${a.map((i,d)=>{const v=((i.cost_usd||0)/r*100).toFixed(1),u=(i.input_tokens||0)+(i.output_tokens||0);return s`<div key=${d} style="margin-bottom:var(--sp-2)">
          <div class="flex-row gap-sm" style="align-items:baseline;margin-bottom:2px">
            <span class="mono text-xs text-ellipsis" style="flex:1;min-width:0" title=${i.model}>${$(i.model)}</span>
            <span class="text-xs text-muted" style="flex-shrink:0">${i.requests} req \u00b7 ${h(u)} tok</span>
            <span class="text-xs mono" style="flex-shrink:0;width:64px;text-align:right"><${bt} row=${i} digits=${4} showSub=${!1}/></span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;background:var(--accent);border-radius:3px"
              title=${Es(i,4).main}></div>
          </div>
          <div class="text-muted" style="font-size:var(--fs-xs);margin-top:2px">
            ${h(i.input_tokens||0)} in \u00b7 ${h(i.output_tokens||0)} out
            ${i.cache_read_tokens>0?s` \u00b7 ${h(i.cache_read_tokens)} cache-read`:""}
          </div>
        </div>`})}
    </div>
  </div>`}const Dt={lead:"var(--accent)",subagent:"var(--green)",unknown:"var(--fg-muted)"};function ve({sessionId:t}){const{data:e,loading:l,error:n}=R(()=>ys(t),[t],{enabled:!!t});if(l||!t)return s`<p class="loading-state">Loading process tree\u2026</p>`;if(n)return s`<p class="empty-state">Failed to load process data.</p>`;if(!e||!e.processes||!e.processes.length)return s`<p class="empty-state">No persisted processes recorded for this session.</p>`;const{processes:a,by_role:o,total:r}=e;return s`<div>
    <div class="flex-row gap-sm flex-wrap mb-sm">
      <span class="badge text-xs">${r} process${r===1?"":"es"}</span>
      ${Object.entries(o).map(([i,d])=>s`
        <span key=${i} class="badge text-xs" style="color:${Dt[i]||"var(--fg-muted)"}">
          ${$(i)}: ${d}
        </span>`)}
    </div>
    <div class="mono text-xs">
      ${a.map((i,d)=>{const v=Dt[i.role]||"var(--fg-muted)",u=i.joined_at?Y(i.joined_at):"—";return s`<div key=${d} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${v}"></span>
          <span style="width:64px;flex-shrink:0;text-align:right">${i.pid}</span>
          <span style="width:80px;flex-shrink:0;color:${v}">${$(i.role||"unknown")}</span>
          <span class="text-ellipsis" style="flex:1;min-width:0">${$(i.tool||"")}</span>
          <span class="text-muted" style="flex-shrink:0">${u}</span>
        </div>`})}
    </div>
  </div>`}function me({sessionId:t}){const[e,l]=b({}),n=Array.isArray(t)?t.join("|"):t,{data:a,loading:o,error:r}=R(()=>_s(t),[n],{enabled:!!n});z(()=>{l({})},[n]);const i=p=>l(m=>({...m,[p]:!m[p]}));if(o||!n)return s`<p class="loading-state">Loading tool calls…</p>`;if(r)return s`<p class="empty-state">Failed to load tool-call data.</p>`;if(!a||!a.calls||!a.calls.length)return s`<p class="empty-state">No tool-call data recorded for this session.</p>`;const{calls:d,by_tool:v,total:u,errors:g}=a,c=Object.entries(v).sort((p,m)=>m[1]-p[1]),_=Math.max(...c.map(([,p])=>p),1);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${u}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${g>0?"var(--red)":"var(--fg)"}">${g}</div>
      </div>
      <div class="es-kv-card"><div class="label">Distinct Tools</div><div class="value">${c.length}</div></div>
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By tool</div>
    <div style="margin-bottom:var(--sp-3)">
      ${c.map(([p,m])=>{const y=(m/_*100).toFixed(1);return s`<div key=${p} class="flex-row gap-sm" style="align-items:center;margin-bottom:2px">
          <span class="text-xs text-ellipsis" style="width:120px;flex-shrink:0" title=${p}>${$(p)}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${y}%;background:var(--green);border-radius:3px"></div>
          </div>
          <span class="text-muted text-xs" style="width:32px;flex-shrink:0;text-align:right">${m}</span>
        </div>`})}
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Timeline (newest ${Math.min(60,d.length)} of ${u})</div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${d.slice(0,60).map((p,m)=>{const y=p.ts?Y(p.ts):"—",f=p.input||"",S=!!e[m];return s`<div key=${m} style="padding:2px 0">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="text-muted" style="width:60px;flex-shrink:0">${y}</span>
            <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${p.is_error?"var(--red)":"var(--green)"}"></span>
            <span style="width:14px;flex-shrink:0;text-align:center;color:${p.is_error?"var(--red)":"var(--green)"}">
              <span aria-hidden="true">${p.is_error?"✗":"✓"}</span><span class="sr-only">${p.is_error?"error":"ok"}</span>
            </span>
            <span class="text-ellipsis" style="width:110px;flex-shrink:0" title=${p.tool_name}>${$(p.tool_name)}</span>
            <span style="width:56px;flex-shrink:0;text-align:right">${p.duration_ms?Math.round(p.duration_ms)+"ms":""}</span>
            <span class="text-muted text-ellipsis" style="flex:1;min-width:0">${$(p.result_summary||"")}</span>
          </div>
          ${f?s`<button type="button"
              class="tcp-input mono text-xs text-muted"
              aria-expanded=${S}
              aria-label=${(S?"Collapse":"Expand")+" input for "+p.tool_name}
              title=${S?"Collapse input":"Expand input"}
              onClick=${()=>i(m)}
              style=${"display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:1px 0 3px 74px;"+(S?"white-space:pre-wrap;word-break:break-word":"white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              ${$(f)}${p.input_truncated&&S?"…":""}
            </button>`:null}
        </div>`})}
    </div>
  </div>`}function fe({sessionId:t,onKilled:e}){const[l,n]=b(!1),[a,o]=b(!1),[r,i]=b(null),[d,v]=b(null);async function u(){o(!0),v(null);try{const g=await xs(t,"TERM");i(g),n(!1),e&&e(g)}catch(g){v(g.message||"Failed to signal session")}finally{o(!1)}}return r?s`<span class="text-xs" style="color:var(--green)" title=${JSON.stringify(r)}>
      Signaled ${r.signaled.length} pid${r.signaled.length===1?"":"s"}
      ${r.failed.length?s` \u00b7 ${r.failed.length} failed`:""}
    </span>`:l?s`<span class="flex-row gap-sm" style="align-items:center">
    <span class="text-xs" style="color:var(--red)">Confirm kill?</span>
    <button class="badge" style="background:var(--red);color:var(--on-status);cursor:pointer;font-size:var(--fs-xs)"
      disabled=${a} onClick=${u}>${a?"…":"Yes, SIGTERM"}</button>
    <button class="badge" style="cursor:pointer;font-size:var(--fs-xs)" onClick=${()=>n(!1)}>Cancel</button>
    ${d&&s`<span class="text-xs" style="color:var(--red)">${d}</span>`}
  </span>`:s`<button class="badge" style="background:transparent;border:1px solid var(--red);color:var(--red);cursor:pointer;font-size:var(--fs-xs)"
      onClick=${()=>n(!0)} title="Send SIGTERM to this session's process tree">
      Kill
    </button>`}const kt=t=>t==null?"n/a":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:`${(t/1048576).toFixed(1)} MB`,$e=t=>t?new Date(t*1e3).toLocaleString():"n/a",ge=t=>t&&(t.status===404||/\b404\b/.test(t.message||"")),lt="white-space:pre-wrap;overflow-wrap:anywhere";function he({sessionId:t,artifact:e}){const{data:l,loading:n,error:a}=R(()=>Xt(`/api/copilot-sessions/${encodeURIComponent(t)}/artifact?path=${encodeURIComponent(e.path)}`),[t,e.path]);return n?s`<div class="text-xs text-muted loading-state" style="padding:0">Loading file…</div>`:a?s`<div class="error-state text-xs" style="padding:0">Could not read this file${a.message?` (${a.message})`:""}.</div>`:l.binary?s`<div class="text-xs text-muted">Binary file, ${kt(l.size)}. Not shown.</div>`:s`<div>
    ${l.truncated&&s`<div class="text-xs text-muted">First part of ${kt(l.size)} shown.</div>`}
    <pre class="mono text-xs" style="max-height:320px;overflow:auto;background:var(--bg3);padding:var(--sp-2);${lt}">${l.content}</pre>
  </div>`}function ye({sessionId:t,artifact:e}){const[l,n]=b(!1),a=e.readable&&e.path;return s`<li style="padding:var(--sp-1) 0;border-bottom:1px solid var(--border-subtle)">
    <div class="text-xs" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:baseline">
      <span class="text-muted">${e.type}</span>
      ${a?s`<button type="button" class="mono text-xs" aria-expanded=${l} style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0;text-align:left;${lt}" onClick=${()=>n(!l)}>${e.name}</button>`:s`<span class="mono" style=${lt}>${e.name}</span>`}
      <span class="text-muted">${kt(e.size)}</span>
      <span class="text-muted">${$e(e.modified_at)}</span>
      ${e.checkpoint!==void 0&&s`<span class="text-muted">checkpoint ${e.checkpoint}</span>`}
    </div>
    ${l&&s`<${he} sessionId=${t} artifact=${e}/>`}
  </li>`}function _e({sessionId:t}){const{data:e,loading:l,error:n}=R(()=>Xt(`/api/copilot-sessions/${encodeURIComponent(t)}/artifacts`),[t],{enabled:!!t});if(l)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading session files…</div>`;if(ge(n))return s`<div class="text-xs text-muted">No session folder found for ${t}.</div>`;if(n)return s`<div class="error-state text-xs" style="padding:0">Failed to load session files${n.message?` (${n.message})`:""}.</div>`;const a=e&&Array.isArray(e.artifacts)?e.artifacts:[];return s`<div>
    <div class="mono text-xs" style=${lt} title="Session folder">${e&&e.folder?e.folder:"No folder on disk"}</div>
    ${a.length===0?s`<div class="text-xs text-muted">No files in this session.</div>`:s`<ul style="list-style:none;margin:var(--sp-2) 0 0;padding:0">
          ${a.map(o=>s`<${ye} key=${o.name} sessionId=${t} artifact=${o}/>`)}
        </ul>`}
  </div>`}function xe({session:t,onClose:e}){const l=Qt(t.tool),n=t.files_loaded||[],a=t.files_touched||[],o=t.exact_input_tokens||0,r=t.exact_output_tokens||0,i=t.entity_state||null,d=i&&i.agents&&i.agents.length>0,v=i&&i.tasks&&i.tasks.length>0;return s`<div class="sd-container" style="border-left:3px solid ${l}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)" title=${t.tool}>${$(Tt(t.tool))}</strong>
        ${t.project&&s`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${t.project}>${$(t.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--on-status);font-size:var(--fs-xs)">
          ${U(t.duration_s)}
        </span>
        ${d&&s`<span class="badge" style="background:var(--accent);color:var(--on-status);font-size:var(--fs-xs)">
          Team (${i.agents.length})
        </span>`}
        ${t.active&&s`<${fe} sessionId=${t.session_id}/>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${t.session_id}>
        ${t.session_id}
      </div>
      ${e&&s`<button class="sd-close" onClick=${e} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${B} title="Actions" icon="zap" badge=${null} defaultOpen=${!0}>
      <${Vs} sessionId=${t.session_id}/>
    <//>
    <${B} title="Conversation" icon="message-square" defaultOpen=${!1}>
      <${Ks} sessionId=${t.session_id} withheld=${t.content_retained===!1}/>
    <//>
    ${d&&s`<${B} title="Team" icon="users" badge=${i.agents.length+" agents"} defaultOpen=${!0}>
      <${Bs} entityState=${i}/>
    <//>`}
    ${v&&s`<${B} title="Tasks" icon="clipboard-list" badge=${i.tasks.length} defaultOpen=${!0}>
      <${Rs} tasks=${i.tasks}/>
    <//>`}
    <${B} title="Context" icon="book-open" badge=${n.length||null}>
      <${Ys} session=${t}/>
    <//>
    <${B} title="Memory" icon="brain" defaultOpen=${!1}>
      <${Qs} session=${t}/>
    <//>
    <${B} title="Resources" icon="layers" badge=${h(o+r)+" tok"}>
      <${oe} session=${t}/>
    <//>
    <${B} title="Estimated cost by model" icon="banknote" defaultOpen=${!1}>
      <${ue} sessionId=${t.session_id}/>
    <//>
    ${String(t.tool||"").startsWith("copilot")&&s`<${B} title="Session files" icon="folder" defaultOpen=${!1}>
      <${_e} sessionId=${t.session_id}/>
    <//>`}
    <${B} title="Tool Calls" icon="wrench" defaultOpen=${!1}>
      <${me} sessionId=${pt(t)}/>
    <//>
    <${B} title="Process Tree" icon="git-branch" defaultOpen=${!1}>
      <${ve} sessionId=${t.session_id}/>
    <//>
    <${B} title="MCP Servers" icon="server" defaultOpen=${!1}>
      <${pe} sessionId=${t.session_id}/>
    <//>
    <${B} title="Deliverables" icon="package" badge=${a.length||null}>
      <${ie} session=${t}/>
    <//>
    <${B} title="API Calls" icon="globe" defaultOpen=${!1}>
      <${le} sessionId=${t.session_id}/>
    <//>
    ${t.project&&s`<${B} title="Estimated project costs" icon="banknote" defaultOpen=${!1}>
      <${re} project=${t.project}/>
    <//>`}
    ${t.project&&t.tool&&s`<${B} title="Run History" icon="line-chart" defaultOpen=${!1}>
      <${ce} project=${t.project} tool=${t.tool}/>
    <//>`}
  </div>`}function vt({tools:t,activeTool:e,onSelect:l}){const n=J(X),a=n==null?void 0:n.snap,o=(n==null?void 0:n.enabledTools)??null,r=t.filter(i=>Jt(i,o));return z(()=>{r.length>0&&!r.includes(e)&&l(r[0])},[r.join(","),e]),r.length<=1?null:s`<div class="sf-tool-tabs">
    ${r.map(i=>s`<button key=${i} class="sf-tool-tab ${i===e?"active":""}"
      style="border-bottom-color:${i===e?Zt[i]||"var(--accent)":"transparent"}"
      onClick=${()=>l(i)}>
      <${Ms} tool=${i} size="1em"/> ${$(Tt(i,a))}
    </button>`)}
  </div>`}function Ct({sessions:t,activeId:e,onSelect:l,loading:n,error:a=null}){return n?s`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:a?s`<div class="sf-sess-tabs"><span class="error-state text-xs" style="padding:0">Failed to load sessions${a.message?` (${a.message})`:""}</span></div>`:t.length?s`<div class="sf-sess-tabs">
    ${t.map(o=>{const r=o.exact_input_tokens||o.input_tokens||0,i=o.exact_output_tokens||o.output_tokens||0,d=r+i,v=o.duration_s||(o.ended_at&&o.started_at?o.ended_at-o.started_at:0),u=o.session_id===e,g=!o.ended_at;return s`<button key=${o.session_id}
        title=${o.session_id}
        class="sf-sess-tab ${u?"active":""}"
        onClick=${()=>l(o.session_id)}>
        <span class="sf-stab-time">${xt(o.started_at)}</span>
        <span class="sf-stab-sid">${bs(o.session_id)}</span>
        <span class="sf-stab-dur">${U(v)}</span>
        ${d>0&&s`<span class="sf-stab-tok">${h(d)}t</span>`}
        ${(o.files_modified||0)>0&&s`<span class="sf-stab-files">${o.files_modified}f</span>`}
        ${g&&s`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:s`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function os(t,e){if(!e)return"";let l=e;if(typeof e=="string")try{l=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof l!="object"||l===null)return String(e).slice(0,80);const n=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const o of n)if(l[o]){let r=String(l[o]);return(o==="file_path"||o==="path")&&r.length>60&&(r=ts(r)),r.slice(0,100)}const a=Object.keys(l);return a.length>0?String(l[a[0]]).slice(0,80):""}const Bt={Bash:"#84cc16"};function Rt(t){return Bt[t]?Bt[t]:ss(t)}function be({event:t}){if(t.type==="user_message")return t.redacted?s`<div class="sf-seq-tooltip">
        <div class="sf-tip-label">User Prompt <span style="color:var(--orange)">(redacted)</span></div>
        <div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">
          Claude Code redacts prompts by default in OTel telemetry.
        </div>
        <div class="sf-tip-meta">
          To capture prompt text, restart Claude Code with:<br/>
          <code style="color:var(--accent)">eval $(aictl otel enable)</code><br/>
          This sets <code>OTEL_LOG_USER_PROMPTS=1</code> before launch.
        </div>
        ${t.prompt_length&&s`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">Prompt length: ${t.prompt_length} chars</div>`}
      </div>`:t.message?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">User Prompt</div>
      <div class="sf-tip-body">${$(t.message)}</div>
      ${t.prompt_length&&s`<div class="sf-tip-meta">${t.prompt_length} chars</div>`}
    </div>`:null;if(t.type==="api_call"){const e=t.tokens||{};return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${t.model?" — "+t.model:""}</div>
      ${t.agent_name&&s`<div class="sf-tip-meta">Agent: ${$(t.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${h(e.input||0)} \u00B7 Output: ${h(e.output||0)}
        ${(e.cache_read||0)>0?" · Cache: "+h(e.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${t.duration_ms>0?"Duration: "+N(t.duration_ms):""}
        ${t.ttft_ms>0?" · TTFT: "+N(t.ttft_ms):""}
      </div>
      ${t.is_error&&s`<div class="sf-tip-meta" style="color:var(--red)">Error: ${$(t.error_type||"unknown")}</div>`}
    </div>`}if(t.type==="api_response"){const e=t.tokens||{},l=Number(t.http_status),n=Number.isFinite(l)&&l>=400;return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${t.model?" — "+t.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${h(e.output||0)} tokens
        ${t.duration_ms>0?" · Latency: "+N(t.duration_ms):""}
        ${t.finish_reason?" · "+t.finish_reason:""}
      </div>
      ${(t.error_type||t.http_status)&&s`<div class="sf-tip-meta">
        ${t.error_type?s`<span style="color:var(--red)">${$(String(t.error_type))}</span>`:""}
        ${t.error_type&&t.http_status?" · ":""}
        ${t.http_status?s`<span style="color:${n?"var(--red)":"var(--fg-muted)"}">HTTP ${$(String(t.http_status))}</span>`:""}
      </div>`}
      ${t.response_preview&&s`<div class="sf-tip-body">${$(t.response_preview)}</div>`}
    </div>`}if(t.type==="error")return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${$(t.error_type||"unknown")}</div>
      ${t.error_message&&s`<div class="sf-tip-body">${$(t.error_message)}</div>`}
      ${t.parent_span&&s`<div class="sf-tip-meta">During: ${$(t.parent_span)}</div>`}
    </div>`;if(t.type==="tool_use"){let e=null;if(t.params){let a=t.params;if(typeof a=="string")try{a=JSON.parse(a)}catch{a=null}a&&typeof a=="object"&&(e=Object.entries(a).filter(([,o])=>o!=null&&o!==""))}const l=t.input_preview||"",n=t.result_summary||"";return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${$(t.to||"Tool")}${t.subtype==="result"?" (result)":t.subtype==="decision"?" (decision)":""}</div>
      ${t.decision&&s`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${$(t.decision)}</strong></div>`}
      ${e?s`<div class="sf-tip-params">
            ${e.map(([a,o])=>{const r=String(o),i=r.length>120;return s`<div key=${a} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${$(a)}</span>
                <span class="sf-tip-param-val ${i?"sf-tip-param-long":""}" title=${r}>${$(i?r.slice(0,200)+"...":r)}</span>
              </div>`})}
          </div>`:t.params&&s`<div class="sf-tip-body mono">${$(t.params)}</div>`}
      ${l&&s`<div class="sf-tip-meta mono" style="margin-top:var(--sp-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${l}>input: ${$(l.length>200?l.slice(0,200)+"…":l)}</div>`}
      ${n&&s`<div class="sf-tip-meta mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${n}>result: ${$(n.length>200?n.slice(0,200)+"…":n)}</div>`}
      ${(t.success||t.duration_ms>0||t.result_size)&&s`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${t.success?"Success: "+t.success:""}
        ${t.duration_ms>0?" · "+N(t.duration_ms):""}
        ${t.result_size?" · Result: "+t.result_size+" bytes":""}
      </div>`}
    </div>`}return t.type==="subagent"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${$(t.to||"agent")}</div>
    </div>`:t.type==="hook"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${$(t.hook_name||"")}</div>
    </div>`:null}function ke({event:t,participants:e,hoveredIdx:l,idx:n,onHover:a}){const o=e.findIndex(x=>x.id===t._from),r=e.findIndex(x=>x.id===t._to);if(o<0||r<0)return null;const i=r>o,d=Math.min(o,r),v=Math.max(o,r),u=l===n,g=e.find(x=>x.id===t._to),_={user_message:"var(--green)",api_call:t.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:(g==null?void 0:g.color)||"var(--cat-commands)",subagent:(g==null?void 0:g.color)||"var(--yellow)",hook:"var(--orange)"}[t.type]||"var(--fg2)";let p="",m="";if(t.type==="user_message")t.redacted?p="prompt ("+(t.prompt_length||"?")+" chars)":(p=t.preview||"(prompt)",t.prompt_length&&(m=t.prompt_length+" chars"));else if(t.type==="api_call"){const x=t.tokens||{};p=t.agent_name||tt(t.model)||"API call",m=h((x.input||0)+(x.output||0))+"t",t.ttft_ms>0?m+=" ttft:"+N(t.ttft_ms):t.duration_ms>0&&(m+=" "+N(t.duration_ms)),t.is_error&&(m+=" ⚠")}else if(t.type==="api_response"){const x=t.tokens||{};p="← "+h(x.output||0)+"t",t.response_preview&&(p+=" "+t.response_preview.slice(0,60)),m=tt(t.model)||"",t.finish_reason&&t.finish_reason!=="stop"&&(m+=" ["+t.finish_reason+"]")}else if(t.type==="error")p="⚠ "+(t.error_type||"error"),m=t.error_message?t.error_message.slice(0,60):"";else if(t.type==="tool_use"){const x=t.to||"tool",k=os(x,t.params);p=x+(k?": "+k:""),t.subtype==="result"?(m=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(m+=" "+N(t.duration_ms)),t.result_size&&(m+=" "+t.result_size+"B")):t.subtype==="decision"&&(m=t.decision||"")}else t.type==="subagent"?p=t.to||"subagent":t.type==="hook"&&(p=t.hook_name||"hook");const y=100/e.length,f=(d+.5)*y,S=(v+.5)*y;return s`<div class="sf-seq-row ${u?"hovered":""}"
    onMouseEnter=${()=>a(n)} onMouseLeave=${()=>a(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${t._cumTok>0?h(t._cumTok):""}</span>
      <span class="sf-seq-rttok">${t._rtTok>0?h(t._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${e.map((x,k)=>s`<div key=${k} class="sf-seq-lane"
        style="left:${(k+.5)*y}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${f}%;
        width:${S-f}%;
        border-color:${_};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${i?S:f}%;
        border-${i?"left":"right"}-color:${_};
        transform:translateX(${i?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(f+S)/2}%;
        color:${_};
      "><span class="sf-seq-label-text" title=${p}>${t.type==="user_message"&&t.redacted?s`<${O} name="lock" size="0.85em"/> `:""}${$(p)}</span>
        ${m&&s`<span class="sf-seq-sublabel">${m}</span>`}
      </div>
    </div>
    ${u&&s`<${be} event=${t}/>`}
  </div>`}function we({event:t}){let e="",l="var(--fg2)",n="";return t.type==="session_start"?(e="Session started",l="var(--green)",n="▶"):t.type==="session_end"?(e="Session ended",l="var(--fg3)",n="■"):t.type==="compaction"&&(e="Compaction"+(t.compaction_count?" #"+t.compaction_count:""),l="var(--orange)",n="⟳"),s`<div class="sf-seq-marker" style="border-left-color:${l}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${l}">
      ${n} ${e}
      ${t.type==="compaction"&&t.duration_ms>0?" — "+N(t.duration_ms):""}
      ${t.cwd?s` <span class="text-muted text-xs mono">${$(t.cwd)}</span>`:""}
    </div>
  </div>`}const Te={user_message:{lane:"user",kind:"call"},api_call:{lane:"api",kind:"call"},api_response:{lane:"api",kind:"return"},error:{lane:"api",kind:"return"},tool_use:{lane:"tool",kind:"call"},subagent:{lane:"agent",kind:"call"},hook:{lane:"hook",kind:"recv"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"}},jt={call:"◇",return:"◆",recv:"◌",marker:"■"},Se={user:"var(--accent)",api:"var(--orange)",tool:"var(--cat-commands)",agent:"var(--cat-agent)",hook:"var(--cat-prompt)",session:"var(--green)",compact:"var(--yellow)"};function Ce(t){if(t.type==="user_message")return{label:t.redacted?"🔒 prompt ("+(t.prompt_length||"?")+" chars)":t.preview||"(prompt)",meta:t.prompt_length?t.prompt_length+" chars":"",size:""};if(t.type==="api_call"){const e=t.tokens||{},l=(e.input||0)+(e.output||0),n=t.agent_name||tt(t.model)||"API call";let a=h(l)+"t";return t.ttft_ms>0?a+=" · ttft "+N(t.ttft_ms):t.duration_ms>0&&(a+=" · "+N(t.duration_ms)),t.is_error&&(a+=" ⚠"),{label:n,meta:a,size:""}}if(t.type==="api_response"){const l=(t.tokens||{}).output||0,n="← "+h(l)+"t"+(t.response_preview?" "+t.response_preview.slice(0,80):""),a=[tt(t.model),t.finish_reason&&t.finish_reason!=="stop"?"["+t.finish_reason+"]":""].filter(Boolean).join(" ");return{label:n,meta:a,size:l?h(l)+"t":""}}if(t.type==="error")return{label:"⚠ "+(t.error_type||"error"),meta:(t.error_message||"").slice(0,80),size:""};if(t.type==="tool_use"){const e=t.to||"tool",l=os(e,t.params),n=e+(l?": "+l:"");let a="";t.subtype==="result"?(a=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(a+=" "+N(t.duration_ms))):t.subtype==="decision"&&(a=t.decision||"");const o=t.result_size?t.result_size+"B":"";return{label:n,meta:a,size:o}}return t.type==="subagent"?{label:t.to||"subagent",meta:"",size:""}:t.type==="hook"?{label:t.hook_name||"hook",meta:"",size:""}:t.type==="session_start"?{label:"▶ Session started",meta:t.cwd||"",size:""}:t.type==="session_end"?{label:"■ Session ended",meta:"",size:""}:t.type==="compaction"?{label:"⟳ Compaction"+(t.compaction_count?" #"+t.compaction_count:""),meta:t.duration_ms>0?N(t.duration_ms):"",size:""}:{label:t.type||"(event)",meta:"",size:""}}function Ae(t){return{call:"requested",return:"returned",recv:"tokens",marker:"marker"}[t]||""}function Ee({events:t,selectedIdx:e,onSelect:l}){return!t||t.length===0?null:s`<ul class="sv-list">
    ${t.map((n,a)=>{const o=Te[n.type]||{lane:"tool",kind:"call"},r=Se[o.lane]||"var(--fg2)",i=Ce(n),d=a===e,v=a===t.length-1;return s`<li key=${a} class="sv-li"><button
        type="button"
        class=${"sv-row"+(d?" sv-row--sel":"")}
        onClick=${()=>l&&l(a)}
        aria-current=${d?"true":"false"}>
        <div class="sv-when">
          <div class="sv-when-time">${Y(n.ts)}</div>
          ${(n._cumTok>0||n._rtTok>0)&&s`<div class="sv-when-tok">
            ${n._cumTok>0?h(n._cumTok)+" cum":""}
            ${n._rtTok>0?" · "+h(n._rtTok)+" rt":""}
          </div>`}
        </div>
        <div class="sv-spine">
          <span class="sv-spine-line ${v?"sv-spine-line--last":""}"></span>
          <span class="sv-dot" style=${"border-color:"+r+";color:"+r}>
            ${jt[o.kind]||jt.call}
          </span>
        </div>
        <div class="sv-body">
          <div class="sv-meta-row">
            <span class="sv-lane" style=${"color:"+r}>${o.lane}</span>
            <span class="sv-kind">${Ae(o.kind)}</span>
          </div>
          <div class="sv-label" title=${i.label}>${$(i.label)}</div>
          ${i.meta&&s`<div class="sv-sub">${$(i.meta)}</div>`}
        </div>
        <div class="sv-size">
          ${i.size&&s`<span class="sv-size-chip">${$(i.size)}</span>`}
        </div>
      </button></li>`})}
  </ul>`}function Me(t){const e=t.tokens||{};return t.type==="api_call"?h(e.input||0)+"t in":t.type==="api_response"?h(e.output||0)+"t out":t.type==="tool_use"?t.result_size?t.result_size+"B out":"—":t.type==="user_message"&&t.prompt_length?t.prompt_length+" chars in":"—"}function qt(t){if(t==null||t==="")return"";if(typeof t=="string")try{const e=JSON.parse(t);return JSON.stringify(e,null,2)}catch{return t}try{return JSON.stringify(t,null,2)}catch{return String(t)}}function Pe(t){return t.type==="user_message"?t.message||t.preview||"":t.type==="api_call"?t.request_preview||t.prompt_preview||"":t.type==="tool_use"?t.params||t.input_preview||"":t.type==="hook"&&t.hook_input||""}function Le(t){return t.type==="api_response"?t.response_preview||"":t.type==="api_call"&&t.is_error?t.error_message||"":t.type==="tool_use"?t.result_summary||t.result_preview||"":t.type==="error"?t.error_message||"":t.type==="hook"&&t.hook_output||""}function Oe({event:t,onClose:e}){if(!t)return s`<div class="sv-insp sv-insp--empty">
      <div class="sv-insp-empty-tag">No selection</div>
      <div class="sv-insp-empty-msg">
        Choose any event in the timeline to read its full payload.
      </div>
    </div>`;const l=[["Type",t.type||""],["Started",Y(t.ts)],["Duration",t.duration_ms?N(t.duration_ms):"—"],["Bytes",Me(t)],["Model",tt(t.model||"")||"—"],["Decision",t.decision||(t.success===!1?"failed":t.success===!0?"ok":"—")]],n=qt(Pe(t)),a=qt(Le(t)),o=t.agent_name||t.to||t.hook_name||t.preview||t.type||"Event";return s`<div class="sv-insp" role="complementary" aria-label="Event details">
    <div class="sv-insp-head">
      <div>
        <div class="sv-insp-overline">Event \u00B7 ${t.type||""}</div>
        <div class="sv-insp-title">${$(o)}</div>
      </div>
      ${e&&s`<button class="sv-insp-close" onClick=${e} aria-label="Close inspector">\u00D7</button>`}
    </div>

    <div class="sv-insp-meta">
      ${l.map(([r,i])=>s`<div class="sv-insp-meta-row" key=${r}>
        <span class="sv-insp-meta-k">${r}</span>
        <span class="sv-insp-meta-v">${$(String(i||"—"))}</span>
      </div>`)}
    </div>

    ${n&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Input</span></div>
      <pre class="sv-insp-pre">${$(n)}</pre>
    </div>`}

    ${a&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Output</span></div>
      <pre class="sv-insp-pre">${$(a)}</pre>
    </div>`}
  </div>`}function ze({summary:t}){return!t||!t.event_count?null:s`<div class="sf-summary">
    ${t.total_turns>0&&s`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${t.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${t.total_api_calls||0}</div></div>
    ${t.total_tool_uses>0&&s`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${t.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${h(t.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${h(t.total_input_tokens)}/${h(t.total_output_tokens)}</div></div>
    ${t.compactions>0&&s`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${t.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${U(t.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${t.event_count}</div></div>
  </div>`}function Ie(t,e){const l=new Set,n=[],a=(o,r,i)=>{l.has(o)||(l.add(o),n.push({id:o,label:r||o,color:i||"var(--fg2)"}))};a("user","User","var(--green)"),a("tool",e||"AI Tool",Zt[e]||"var(--accent)");for(const o of t){if((o.type==="api_call"||o.type==="api_response"||o.type==="error")&&a("api","API","var(--accent)"),o.type==="tool_use"){const r=o.to||"tool";a("skill:"+r,r,Rt(r))}if(o.type==="subagent"){const r=o.to||"Subagent";a("subagent:"+r,r,Rt(r))}o.type==="hook"&&a("hook","Hooks","var(--orange)")}return n}const is="aictl-pref-session_flow_mode";function Ne(){try{return localStorage.getItem(is)==="swimlane"?"swimlane":"timeline"}catch{return"timeline"}}function Fe(t){try{localStorage.setItem(is,t)}catch{}}function De({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:l}=J(X),{sessions:n,loading:a,error:o,tools:r,toolSessions:i,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:g}=ut({globalRange:e,enabledTools:l}),[c,_]=b(null),[p,m]=b(!1),[y,f]=b(null),[S,x]=b(null),[k,L]=b(Ne),E=t!=null,P=E?t:u;z(()=>{if(!P){_(null);return}m(!0);const C=st(n,P),F=C!=null&&C.started_at?C.started_at-60:Date.now()/1e3-86400,K=C!=null&&C.ended_at?C.ended_at+60:Date.now()/1e3+60,w=C?pt(C):[P];St(w,F,K).then(D=>{_(D),m(!1)}).catch(()=>{_(null),m(!1)})},[P,n.length]);const{processedTurns:M,participants:I}=H(()=>{const C=(c==null?void 0:c.turns)||[];if(!C.length)return{processedTurns:[],participants:[]};const F=C.map(A=>{const T={...A};return A.type==="user_message"?(T._from="user",T._to="tool"):A.type==="api_call"?(T._from=A.from||"tool",T._to="api"):A.type==="api_response"||A.type==="error"?(T._from="api",T._to="tool"):A.type==="tool_use"?(T._from="tool",T._to="skill:"+(A.to||"tool")):A.type==="subagent"?(T._from="tool",T._to="subagent:"+(A.to||"agent")):A.type==="hook"&&(T._from="tool",T._to="hook"),T});let K=0,w=0;for(const A of F){const T=A.tokens||{},j=(T.input||0)+(T.output||0);A.type==="user_message"&&(w=0),A.type==="api_call"&&(K+=j,w+=j),A._cumTok=K,A._rtTok=w}const D=Ie(F,d);return{processedTurns:F,participants:D}},[c,d]),V=(c==null?void 0:c.summary)||{};z(()=>{x(null)},[P,k]);const W=C=>{L(C),Fe(C)},G=S!=null?M[S]:null;return s`<div class="sf-container">
    ${!E&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}

    ${!E&&s`<${Ct} sessions=${i} activeId=${u}
      onSelect=${g} loading=${a} error=${o}/>`}

    <div class="sf-toolbar">
      <${ze} summary=${V}/>
      <div class="sf-mode-toggle" role="radiogroup" aria-label="Timeline render mode">
        <button type="button" role="radio" aria-checked=${k==="timeline"}
          class=${"sf-mode-btn"+(k==="timeline"?" sf-mode-btn--active":"")}
          onClick=${()=>W("timeline")}>Timeline</button>
        <button type="button" role="radio" aria-checked=${k==="swimlane"}
          class=${"sf-mode-btn"+(k==="swimlane"?" sf-mode-btn--active":"")}
          onClick=${()=>W("swimlane")}>Swim-lane</button>
      </div>
    </div>

    <div class=${"sf-seq-container"+(k==="timeline"?" sf-seq-container--split":"")}>
      ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:M.length===0?s`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:k==="timeline"?s`<div class="sv-pane">
                <${Ee} events=${M}
                  selectedIdx=${S} onSelect=${x}/>
              </div>
              <aside class="sv-aside">
                <${Oe} event=${G}
                  onClose=${()=>x(null)}/>
              </aside>`:s`
              <div class="sf-seq-header">
                <div class="sf-seq-tokens">
                  <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                  <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
                </div>
                <div class="sf-seq-time"></div>
                <div class="sf-seq-arrow-area">
                  ${I.map((C,F)=>{const K=100/I.length;return s`<div key=${C.id} class="sf-seq-participant"
                      style="left:${(F+.5)*K}%;color:${C.color}">
                      <div class="sf-seq-participant-box" style="border-color:${C.color}">${$(C.label)}</div>
                    </div>`})}
                </div>
              </div>
              <div class="sf-seq-body">
                ${M.map((C,F)=>C._from&&C._to?s`<${ke} key=${F} event=${C} participants=${I}
                      hoveredIdx=${y} idx=${F} onHover=${f}/>`:s`<${we} key=${F} event=${C} participants=${I}/>`)}
              </div>
            `}
    </div>
  </div>`}function Be({sessions:t,activeId:e,onSelect:l,loading:n,error:a=null}){return n?s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`:a?s`<div class="error-state" style="padding:var(--sp-3);font-size:var(--fs-sm)">Failed to load sessions${a.message?` (${a.message})`:""}</div>`:t.length?s`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${t.slice(0,20).map(o=>{const r=o.session_id===e,i=o.ended_at?Math.round(o.ended_at-o.started_at):0,d=i>0?N(i*1e3):"⏳ live",v=Y(o.started_at);return s`<button key=${o.session_id}
        class="tr-sess-btn ${r?"tr-sess-active":""}"
        onClick=${()=>l(o.session_id)}
        title=${o.session_id}>
        <span class="tr-sess-time">${v}</span>
        <span class="tr-sess-dur">${d}</span>
        ${o.is_live?s`<span class="tr-sess-live">\u25CF</span>`:null}
      </button>`})}
  </div>`:s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function rt(t,e){return t?t.length>e?t.slice(0,e)+"…":t:""}const Re={tool_use:"wrench",api_call:"globe",api_response:"mail",file_edit:"file-pen",compaction:"archive",subagent:"bot",error:"x"},je={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function qe({action:t,turnTs:e}){const l=Re[t.kind],n=je[t.kind]||"var(--fg2)",a=t.ts-e,o=a>0?"+"+(a<1?a.toFixed(1):Math.round(a))+"s":"",r=t.duration_ms>0?N(t.duration_ms):"",i=t.tokens,d=i?h((i.input||0)+(i.output||0)):"";return s`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${n}">${l?s`<${O} name=${l} size="0.95em"/>`:"•"}</span>
    <span class="tr-action-name" style="color:${n}">${$(t.name||t.kind)}</span>
    ${t.input_summary?s`<span class="tr-action-args">${$(rt(t.input_summary,80))}</span>`:null}
    ${t.output_summary?s`<span class="tr-action-result">${$(rt(t.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${o?s`<span class="tr-action-offset">${o}</span>`:null}
      ${r?s`<span class="tr-action-dur">${r}</span>`:null}
      ${d?s`<span class="tr-action-tok"><${O} name="coins" size="0.9em"/> ${d}</span>`:null}
      ${t.success===!1?s`<span class="tr-action-fail">\u2717</span>`:null}
      ${t.success===!0?s`<span class="tr-action-ok">\u2713</span>`:null}
    </span>
  </div>`}function He(t,e){var a;const l=[],n=o=>{const r=String(o||"").trim();r&&!l.includes(r)&&l.push(r)};n(t.response);for(const o of e)o.kind==="api_response"&&n(((a=o.detail)==null?void 0:a.response)||o.response||o.output_summary);return l.join(`

`)}function Ve({turn:t,index:e,expanded:l,onToggle:n,withheld:a}){const o=t.prompt&&t.prompt.length>0,r=t.actions||[],i=He(t,r),d=i.length>0,v=r.filter(m=>m.kind==="tool_use"),u=r.filter(m=>m.kind==="api_call"),g=r.filter(m=>m.kind==="error"),c=t.tokens||{},_=(c.input||0)+(c.output||0),p=t.wall_ms||t.duration_ms||0;return s`<div class="tr-turn ${l?"tr-turn-expanded":""}">
    <button type="button" class="tr-turn-header" onClick=${n} aria-expanded=${l}>
      <span class="tr-turn-num">${e+1}</span>
      <span class="tr-turn-meta">
        <span class="tr-turn-time">${Y(t.ts)}</span>
        ${t.model?s`<span class="tr-turn-model">${tt(t.model)}</span>`:null}
        ${p>0?s`<span class="tr-turn-dur">${N(p)}</span>`:null}
      </span>
      <span class="tr-turn-stats">
        ${_>0?s`<span class="tr-stat" title="Tokens"><${O} name="coins" size="0.9em"/> ${h(_)}</span>`:null}
        ${v.length>0?s`<span class="tr-stat" title="Tool uses"><${O} name="wrench" size="0.9em"/> ${v.length}</span>`:null}
        ${u.length>0?s`<span class="tr-stat" title="API calls"><${O} name="globe" size="0.9em"/> ${u.length}</span>`:null}
        ${g.length>0?s`<span class="tr-stat tr-stat-err" title="Errors"><${O} name="x" size="0.9em"/> ${g.length}</span>`:null}
      </span>
      <span class="tr-turn-chevron" aria-hidden="true">${l?"▾":"▸"}</span>
    </button>

    ${o?s`<div class="tr-prompt ${l?"tr-prompt-full":""}">
      <div class="tr-prompt-icon"><${O} name="user" size="1em"/></div>
      <div class="tr-prompt-text">${l?t.prompt:rt(t.prompt_preview||t.prompt,120)}</div>
    </div>`:s`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon"><${O} name="user" size="1em"/></div>
      <div class="tr-prompt-text text-muted">${a?"(text not retained)":"(no prompt captured)"}</div>
    </div>`}

    ${d?s`<div class="tr-response ${l?"tr-response-full":""}">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text">${l?i:rt(t.response_preview||i,160)}</div>
    </div>`:l?s`<div class="tr-response tr-response-empty">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text text-muted">(no response captured)</div>
    </div>`:null}

    ${l&&r.length>0?s`<div class="tr-actions">
      ${r.map((m,y)=>s`<${qe} key=${y} action=${m} turnTs=${t.ts}/>`)}
    </div>`:null}

    ${l&&_>0?s`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${c.input||0}" title="Input: ${h(c.input||0)}">
        ${c.input>0?"in "+h(c.input):""}
      </div>
      ${c.cache_read>0?s`<div class="tr-token-seg tr-tok-cache"
        style="flex:${c.cache_read}" title="Cache read: ${h(c.cache_read)}">
        cache ${h(c.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${c.output||0}" title="Output: ${h(c.output||0)}">
        ${c.output>0?"out "+h(c.output):""}
      </div>
    </div>`:null}
  </div>`}function Ue({summary:t,transcript:e}){return t?s`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns"><${O} name="message-square" size="0.9em"/> ${t.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls"><${O} name="globe" size="0.9em"/> ${t.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses"><${O} name="wrench" size="0.9em"/> ${t.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens"><${O} name="coins" size="0.9em"/> ${h(t.total_tokens||0)}</span>
    ${t.compactions>0?s`<span class="tr-summary-item" title="Compactions"><${O} name="archive" size="0.9em"/> ${t.compactions}</span>`:null}
    ${t.errors>0?s`<span class="tr-summary-item tr-stat-err" title="Errors"><${O} name="x" size="0.9em"/> ${t.errors}</span>`:null}
    ${t.subagents>0?s`<span class="tr-summary-item" title="Subagents"><${O} name="bot" size="0.9em"/> ${t.subagents}</span>`:null}
    ${t.duration_s>0?s`<span class="tr-summary-item" title="Duration"><${O} name="clock" size="0.9em"/> ${N(t.duration_s*1e3)}</span>`:null}
    ${e!=null&&e.model?s`<span class="tr-summary-item" title="Model"><${O} name="brain-circuit" size="0.9em"/> ${tt(e.model)}</span>`:null}
    ${e!=null&&e.is_live?s`<span class="tr-summary-live">\u25CF LIVE</span>`:null}
    <span class="tr-summary-source">${t.source||""}</span>
  </div>`:null}function We(t){if(!t||!t.turns||t.turns.length===0)return!1;const e=t.turns[0];return e.type!=null&&e.actions==null}function Ht(t,e){if(!t||!t.turns)return null;const l=t.turns||[],n=[];let a=null;const o=(i,d)=>{!i||!d||(i.response=i.response?i.response+`

`+d:d,i.response_preview=i.response.slice(0,200))},r={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const i of l)if(i.type==="user_message"){if(a&&n.push(a),a={ts:i.ts,end_ts:i.end_ts||i.ts,prompt:i.message||"",prompt_preview:i.preview||(i.message||"").slice(0,200),response:i.response||"",response_preview:i.response_preview||(i.response||"").slice(0,200),model:i.model||"",tokens:i.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:i.api_calls||0,duration_ms:i.duration_ms||0,wall_ms:i.wall_ms||0,actions:[],tool_use_count:0},i.tools&&i.tools.length>0){for(const d of i.tools)a.actions.push({ts:d.ts||i.ts,kind:d.is_agent?"subagent":"tool_use",name:d.name||"",input_summary:d.args_summary||"",duration_ms:d.duration_ms||0});a.tool_use_count=i.tools.length}}else{if(i.type==="session_start"||i.type==="session_end")continue;if(i.type==="compaction")continue;if(a){const d=r[i.type];d&&(a.actions.push({ts:i.ts,kind:d,name:i.model||i.to||i.tool_name||i.hook_name||"",input_summary:i.params||i.decision||"",output_summary:i.response_preview||i.error_message||"",duration_ms:i.duration_ms||0,tokens:i.tokens,success:i.success==="true"?!0:i.success==="false"?!1:void 0,detail:i.response?{response:i.response}:void 0}),d==="api_response"&&o(a,i.response||i.response_preview||""),d==="tool_use"&&a.tool_use_count++,d==="api_call"&&i.tokens&&(a.tokens.input+=i.tokens.input||0,a.tokens.output+=i.tokens.output||0,a.tokens.cache_read+=i.tokens.cache_read||0,a.api_calls++))}else{const d=r[i.type];d&&d!=="api_response"&&(a={ts:i.ts,end_ts:i.ts,prompt:"",prompt_preview:"",response:"",response_preview:"",model:i.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},a.actions.push({ts:i.ts,kind:d,name:i.model||i.to||i.tool_name||"",input_summary:i.params||i.decision||"",output_summary:i.response_preview||i.error_message||"",duration_ms:i.duration_ms||0,tokens:i.tokens,success:i.success==="true"?!0:i.success==="false"?!1:void 0,detail:i.response?{response:i.response}:void 0}),d==="api_response"&&o(a,i.response||i.response_preview||""),d==="tool_use"&&a.tool_use_count++,d==="api_call"&&i.tokens&&(a.tokens.input+=i.tokens.input||0,a.tokens.output+=i.tokens.output||0,a.tokens.cache_read+=i.tokens.cache_read||0,a.api_calls++))}}a&&n.push(a);for(const i of n)if(i.tokens.total=(i.tokens.input||0)+(i.tokens.output||0),i.actions.length>0){const d=i.actions[i.actions.length-1];i.end_ts=Math.max(i.end_ts||0,d.ts+(d.duration_ms||0)/1e3)}return{session_id:e,turns:n,summary:t.summary||{},is_live:!1}}function Ge({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:l}=J(X),{sessions:n,loading:a,error:o,tools:r,toolSessions:i,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:g}=ut({globalRange:e,enabledTools:l}),[c,_]=b(null),[p,m]=b(!1),[y,f]=b(new Set),[S,x]=b(!1),[k,L]=b(!0),E=t!=null,P=E?t:u,M=Q(()=>{if(!P){_(null);return}m(!0);const w=st(n,P),D=w?pt(w):[P];ks(D).then(A=>{We(A)?_(Ht(A,P)):_(A),m(!1)}).catch(()=>{const A=w!=null&&w.started_at?w.started_at-60:Date.now()/1e3-86400,T=w!=null&&w.ended_at?w.ended_at+60:Date.now()/1e3+60;St(D,A,T).then(j=>{_(Ht(j,P)),m(!1)}).catch(()=>{_(null),m(!1)})})},[P,n]);z(M,[M]),z(()=>{if(!k||!(c!=null&&c.is_live))return;const w=setInterval(M,5e3);return()=>clearInterval(w)},[k,c==null?void 0:c.is_live,M]);const I=Q(w=>{f(D=>{const A=new Set(D);return A.has(w)?A.delete(w):A.add(w),A})},[]),V=Q(()=>{const w=(c==null?void 0:c.turns)||[];S?(f(new Set),x(!1)):(f(new Set(w.map((D,A)=>A))),x(!0))},[S,c]),W=n.find(w=>w.session_id===P),G=It(W)||It(c),{data:C}=Ps(()=>ws(),[]),F=((c==null?void 0:c.turns)||[]).filter(w=>w.prompt&&w.prompt.length>0||w.actions&&w.actions.length>0||w.tool_use_count>0||G&&(w.ts||w.tokens)),K=(c==null?void 0:c.summary)||null;return s`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${F.length>0?s`<button class="tc-filter-btn" onClick=${V}
          style="font-size:var(--fs-xs)">
          ${S?"⊡ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${c!=null&&c.is_live?s`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${k}
            onChange=${w=>L(w.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    ${!E&&r.length>1&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}

    ${!E&&s`<${Be} sessions=${i} activeId=${u}
      onSelect=${g} loading=${a} error=${o}/>`}

    <${Ue} summary=${K} transcript=${c}/>

    ${G&&s`<${as} mode=${C==null?void 0:C.capture_mode}/>`}

    <div class="tr-turns">
      ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`:F.length===0?G?null:s`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                No prompt or tool events were captured for this session.
              </p>
            </div>`:F.map((w,D)=>s`<${Ve}
              key=${D} turn=${w} index=${D} withheld=${G}
              expanded=${y.has(D)}
              onToggle=${()=>I(D)}/>`)}
    </div>
  </div>`}const Vt={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function dt(t){return t?Vt[t]?Vt[t]:ss(t):"var(--fg2)"}function wt(t){return t?new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Ut(t){return t<60?Math.round(t)+"s":t<3600?Math.round(t/60)+"m":t<86400?(t/3600).toFixed(1)+"h":(t/86400).toFixed(1)+"d"}function At(t){const e=t.tokens||{};return(e.input||0)+(e.output||0)}function Et(t){const e=t.tokens||{};return(e.cache_read||0)+(e.cache_creation||0)}function Ke(t){return At(t)+Et(t)}function Wt(t,e){return e==="fresh"?At(t):e==="cached"?Et(t):Ke(t)}function ct(t){return t.type==="user_message"?"Prompt":t.type==="api_call"||t.type==="api_response"?t.model||"API":t.type==="tool_use"?t.to||t.name||"Tool":t.type==="subagent"?t.to||"Agent":t.type==="compaction"?"Compaction":t.type==="error"?"Error":t.type==="hook"?t.hook_name||"Hook":t.type||"?"}function Je({bar:t,x:e,y:l}){if(!t)return null;const n=t,a=n.tokens||{},o=ct(n);return s`<div class="tc-tooltip" style="left:${e}px;top:${l}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${dt(o)}"></span>
      ${$(o)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${wt(n.ts)}</span></div>
    ${n.type==="user_message"&&n.message&&s`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${$((n.message||"").slice(0,300))}</span>
      </div>`}
    ${(n.type==="api_call"||n.type==="api_response")&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${n.model||"?"}</span></div>`}
    ${n.type==="tool_use"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${n.to||n.name||"?"}</span></div>
      ${n.params&&s`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${$(String(n.params).slice(0,200))}</span>
      </div>`}`}
    ${n.type==="subagent"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.to||"?"}</span></div>`}
    ${n.duration_ms>0&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${N(n.duration_ms)}</span></div>`}
    ${a.input||a.output||a.cache_read?s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${h(a.input||0)} out:${h(a.output||0)}${a.cache_read?" cache:"+h(a.cache_read):""}${a.cache_creation?" cache_w:"+h(a.cache_creation):""}</span>
      </div>`:null}
    ${n.type==="error"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${n.error_type||""}: ${(n.error_message||"").slice(0,100)}</span></div>`}
    ${n.type==="compaction"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${n.compaction_count||""}</span></div>`}
    ${n.agent_name&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${n.agent_name}</span></div>`}
  </div>`}function Ye({summary:t}){if(!t||!t.total_tokens)return null;const e=[["Prompts",t.total_turns],["API Calls",t.total_api_calls],["Tools",t.total_tool_uses],["Tokens",h(t.total_tokens)],["Duration",U(t.duration_s)]].filter(([,l])=>l);return s`<div class="tc-summary">
    ${e.map(([l,n])=>s`<div class="tc-summary-item">
      <div class="tc-summary-val">${n}</div>
      <div class="tc-summary-label">${l}</div>
    </div>`)}
  </div>`}const ot=110,Xe=16,Gt=ot+Xe,Qe=30;function Ze(t){const e=[];for(let l=0;l<t.length;l++){if(l>0){const n=t[l].ts-t[l-1].ts;n>Qe&&e.push({type:"gap",endTs:t[l-1].ts,startTs:t[l].ts,gap:n})}e.push({type:"bar",bar:t[l]})}return e}function ta({entities:t,selected:e,onToggle:l,onAll:n,onNone:a}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${n}>All</button>
    <button class="tc-filter-btn" onClick=${a}>None</button>
    ${t.map(o=>{const r=e.has(o);return s`<label key=${o} class="tc-filter-check ${r?"active":""}"
        style="--swatch:${dt(o)}">
        <input type="checkbox" checked=${r}
          onChange=${()=>l(o)}/>
        <span class="tc-legend-swatch" style="background:${dt(o)}"></span>
        ${$(o)}
      </label>`})}
  </div>`}function sa({mode:t,onChange:e}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([n,a])=>s`<label key=${n}
      class="tc-filter-check ${t===n?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${t===n}
        onChange=${()=>e(n)}/>
      ${a}
    </label>`)}
  </div>`}function ea({bars:t,tokenMode:e,onHover:l,onLeave:n}){if(!t.length)return s`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
    <small class="empty-state-source">/api/session-flow · turns[]</small>
  </div>`;const a=Ze(t),o=Math.max(1,...t.map(v=>Wt(v,e))),r=[];a.forEach((v,u)=>{v.type==="bar"&&r.push(u)});const i=Math.max(1,Math.floor(r.length/Math.ceil(r.length/20))),d=new Set;return r.forEach((v,u)=>{(u===0||u===r.length-1||u%i===0)&&d.add(v)}),s`<div class="tc-flow">
    ${a.map((v,u)=>{if(v.type==="gap"){const M=wt(v.endTs)+" → "+wt(v.startTs)+"  ("+Ut(v.gap)+" gap)";return s`<div key=${"g"+u} class="tc-flow-slot" style="height:${Gt}px" title=${M}>
          <div class="tc-flow-gap-line" style="height:${ot}px"></div>
          <div class="tc-flow-time">${Ut(v.gap)}</div>
        </div>`}const g=v.bar,c=Wt(g,e),_=o>0?Math.max(.08,Math.log1p(c)/Math.log1p(o)):.08,p=Math.max(6,_*ot),m=ct(g),y=dt(m),f=At(g),S=Et(g),x=f+S;let k,L;e==="cached"?(k=0,L=100):e==="fresh"?(k=100,L=0):x>0?(k=Math.round(f/x*100),L=100-k):(k=100,L=0);const E=L>0,P=d.has(u);return s`<div key=${u} class="tc-flow-slot" style="height:${Gt}px"
        tabindex="0" role="img"
        aria-label=${m+" at "+xt(g.ts)+", "+h(c)+" tokens"}
        onMouseEnter=${M=>l(g,M)}
        onMouseLeave=${n}
        onFocus=${M=>{const I=M.currentTarget.getBoundingClientRect();l(g,{clientX:I.left+I.width/2,clientY:I.top})}}
        onBlur=${n}>
        <div class="tc-flow-bar-area" style="height:${ot}px">
          <div class="tc-flow-fill ${E?"tc-split":""}"
            style="height:${p}px;--bar-color:${y}">
            ${E&&s`
              ${k>0&&s`<div class="tc-fill-fresh" style="height:${k}%"></div>`}
              <div class="tc-fill-cached" style="height:${k>0?L:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${P?xt(g.ts):""}</div>
      </div>`})}
  </div>`}function aa({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:l}=J(X),{sessions:n,loading:a,error:o,tools:r,toolSessions:i,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:g}=ut({globalRange:e,enabledTools:l}),[c,_]=b(null),[p,m]=b(!1),[y,f]=b(null),[S,x]=b(null),[k,L]=b("all"),E=Kt(null),P=t!=null,M=P?t:u;z(()=>{if(!M){_(null);return}m(!0);const T=st(n,M),j=T!=null&&T.started_at?T.started_at-60:Date.now()/1e3-86400,q=T!=null&&T.ended_at?T.ended_at+60:Date.now()/1e3+60,Z=T?pt(T):[M];St(Z,j,q).then(mt=>{_(mt),m(!1),x(null)}).catch(()=>{_(null),m(!1)})},[M,n.length]);const{allBars:I,allEntities:V}=H(()=>{const j=((c==null?void 0:c.turns)||[]).filter(Z=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(Z.type)),q=new Set;for(const Z of j)q.add(ct(Z));return{allBars:j,allEntities:[...q].sort()}},[c]),W=S||new Set(V),G=H(()=>I.filter(T=>W.has(ct(T))),[I,W]),C=Q(T=>{x(j=>{const q=new Set(j||V);return q.has(T)?q.delete(T):q.add(T),q})},[V]),F=Q(()=>x(null),[]),K=Q(()=>x(new Set),[]),w=Q((T,j)=>{var Mt;const q=(Mt=E.current)==null?void 0:Mt.getBoundingClientRect();if(!q)return;const Z=Math.min(j.clientX-q.left+12,q.width-320),mt=j.clientY-q.top+12;f({bar:T,x:Z,y:mt})},[]),D=Q(()=>f(null),[]),A=(c==null?void 0:c.summary)||{};return s`<div class="tc-container" ref=${E}>
    ${!P&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}
    ${!P&&s`<${Ct} sessions=${i} activeId=${u}
      onSelect=${g} loading=${a} error=${o}/>`}
    <${Ye} summary=${A}/>

    ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:I.length===0?s`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
            <small class="empty-state-source">/api/session-flow · turns[] (filtered to user_message, api_call, api_response, tool_use, compaction, subagent, error, hook)</small>
          </div>`:s`
          <div class="tc-controls">
            <${ta} entities=${V} selected=${W}
              onToggle=${C} onAll=${F} onNone=${K}/>
            <${sa} mode=${k} onChange=${L}/>
          </div>
          <${ea} bars=${G} tokenMode=${k}
            onHover=${w} onLeave=${D}/>
          ${y&&s`<${Je} bar=${y.bar} x=${y.x} y=${y.y}/>`}
        `}
  </div>`}function na(t){return t?new Date(t*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}):"-"}function oa(t,e=140){if(t==null)return"";let l;try{l=typeof t=="string"?t:JSON.stringify(t)}catch{l=String(t)}return l.length<=e?l:l.slice(0,e)+"..."}function ia(t){try{return JSON.stringify(t??{},null,2)}catch{return String(t??"")}}function la({sessionId:t,since:e,until:l}){const[n,a]=b(()=>new Set),{data:o,loading:r,error:i}=R(()=>es(t,{since:e,until:l,limit:500}).then(u=>{const g=Array.isArray(u)?u:[];return g.sort((c,_)=>(_.ts||0)-(c.ts||0)),g}),[t,e,l],{enabled:!!t}),d=H(()=>(o||[]).map((u,g)=>{const c=String(u.kind||""),_=/permission|error|fail/i.test(c);return{key:`${u.ts||0}:${u.kind||""}:${u.tool||""}:${g}`,time:na(u.ts),kind:c,tool:u.tool||"-",preview:oa(u.detail),detailText:ia(u.detail),isWarn:_}}),[o]),v=u=>{a(g=>{const c=new Set(g);return c.has(u)?c.delete(u):c.add(u),c})};return t?r?s`<p class="empty-state">Loading events...</p>`:i?s`<p class="error-state">Error: ${(i==null?void 0:i.message)||"Failed to load events"}</p>`:d.length?s`<div class="es-events-wrap">
    <table class="es-events-table" aria-label="Session events">
      <thead>
        <tr>
          <th style="width:90px">Time</th>
          <th style="width:240px">Kind</th>
          <th style="width:120px">Tool</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        ${d.map(u=>s`
          <tr key=${u.key}
            class=${`es-events-row ${u.isWarn?"is-alert":""}`}
            onClick=${()=>v(u.key)}>
            <td class="mono text-xs">
              <button type="button" class="es-events-toggle"
                aria-expanded=${n.has(u.key)}
                aria-label=${"Toggle detail for "+(u.kind||"event")+" at "+u.time}
                onClick=${g=>{g.stopPropagation(),v(u.key)}}>${u.time}</button>
            </td>
            <td class="mono text-xs">${$(u.kind)}</td>
            <td class="text-xs">${$(u.tool)}</td>
            <td class="mono text-xs" title=${u.preview}>${$(u.preview)}</td>
          </tr>
          ${n.has(u.key)&&s`
            <tr key=${u.key+":detail"} class="es-events-detail-row">
              <td colspan="4">
                <pre class="es-events-detail">${$(u.detailText)}</pre>
              </td>
            </tr>
          `}
        `)}
      </tbody>
    </table>
  </div>`:s`<p class="empty-state">No events for this session in the selected range.</p>`:s`<p class="empty-state">Select a session to view events.</p>`}const ra=28;function da(t,e=60){if(!t||!t.length)return[[],[]];const l=new Map;for(const o of t){if(!o||o.ts==null)continue;const r=Math.floor(o.ts/e)*e;l.set(r,(l.get(r)||0)+(o.value??0))}const n=[...l.keys()].sort((o,r)=>o-r),a=n.map(o=>l.get(o));return[n,a]}async function gt(t,e){const l=e.started_at;if(!l)return[[],[]];const n=e.ended_at,a=await Lt(t,{since:l,limit:500,tags:{session_id:e.session_id}});let o=Array.isArray(a)?a:[];if(!o.length&&e.tool){const d=await Lt(t,{since:l,limit:500,tags:{"aictl.tool":e.tool}});o=Array.isArray(d)?d:[]}n&&(o=o.filter(d=>d.ts!=null&&d.ts<=n));const r=o.map(d=>d.ts),i=o.map(d=>d.value??0);return[r,i]}async function ca(t){if(!t.started_at)return[[],[]];const e=await es(t.session_id,{since:t.started_at,until:t.ended_at??void 0,limit:1e3}),l=Array.isArray(e)?e:[],n=[];for(const a of l){if(!a||a.ts==null||!String(a.kind||"").includes("api_request"))continue;const r=a.detail&&typeof a.detail=="object"?a.detail:{},i=Number(r.input_tokens??r["gen_ai.usage.input_tokens"]??0)||0,d=Number(r.output_tokens??r["gen_ai.usage.output_tokens"]??0)||0;n.push({ts:a.ts,value:i+d})}return da(n,60)}function nt({label:t,data:e,color:l,fmtVal:n,loading:a,error:o}){const r=e&&e[0]&&e[0].length>=2;return s`<div class="session-spark" title=${t}>
    <div class="session-spark-label">${t}</div>
    <div class="session-spark-chart">
      ${a?s`<span class="text-muted text-xs">\u2026</span>`:o?s`<span class="text-muted text-xs" title=${o}>\u2014</span>`:r?s`<${Ls} data=${e} color=${l}
                height=${ra} fmtVal=${n}
                ariaLabel=${t+" sparkline"}/>`:s`<span class="text-muted text-xs">no data</span>`}
    </div>
  </div>`}function pa({session:t}){const[e,l]=b({data:null,loading:!0,error:null}),[n,a]=b({data:null,loading:!0,error:null}),[o,r]=b({data:null,loading:!0,error:null}),[i,d]=b({data:null,loading:!0,error:null}),v=t==null?void 0:t.session_id,u=t==null?void 0:t.started_at,g=t==null?void 0:t.ended_at;z(()=>{if(!v)return;let y=!1;return l({data:null,loading:!0,error:null}),a({data:null,loading:!0,error:null}),r({data:null,loading:!0,error:null}),d({data:null,loading:!0,error:null}),gt("process.cpu.utilization",t).then(f=>{y||l({data:f,loading:!1,error:null})}).catch(f=>{y||l({data:null,loading:!1,error:(f==null?void 0:f.message)||"error"})}),gt("process.memory.usage",t).then(f=>{y||a({data:f,loading:!1,error:null})}).catch(f=>{y||a({data:null,loading:!1,error:(f==null?void 0:f.message)||"error"})}),gt("process.disk.io",t).then(f=>{y||r({data:f,loading:!1,error:null})}).catch(f=>{y||r({data:null,loading:!1,error:(f==null?void 0:f.message)||"error"})}),ca(t).then(f=>{y||d({data:f,loading:!1,error:null})}).catch(f=>{y||d({data:null,loading:!1,error:(f==null?void 0:f.message)||"error"})}),()=>{y=!0}},[v,u,g]);const c=H(()=>y=>(y*100).toFixed(0)+"%",[]),_=H(()=>y=>h(y)+"B",[]),p=H(()=>y=>h(y)+"B",[]),m=H(()=>y=>h(y)+"/min",[]);return v?s`<div class="session-sparklines" aria-label="Session sparklines">
    <${nt} label="CPU" data=${e.data} color="var(--blue)"
      loading=${e.loading} error=${e.error} fmtVal=${c}/>
    <${nt} label="Mem" data=${n.data} color="var(--green)"
      loading=${n.loading} error=${n.error} fmtVal=${_}/>
    <${nt} label="I/O" data=${o.data} color="var(--orange)"
      loading=${o.loading} error=${o.error} fmtVal=${p}/>
    <${nt} label="Tok/min" data=${i.data} color="var(--purple, var(--accent))"
      loading=${i.loading} error=${i.error} fmtVal=${m}/>
  </div>`:null}function ht(t){if(!t.length)return 0;const e=[...t].sort((n,a)=>n-a),l=Math.floor(e.length/2);return e.length%2?e[l]:(e[l-1]+e[l])/2}function ua(t,e){if(!e||e<=0)return{dir:"flat",pct:0};const l=(t-e)/e;return Math.abs(l)<.05?{dir:"flat",pct:l}:{dir:l>0?"up":"down",pct:l}}function yt({label:t,value:e,formatted:l,med:n,fmt:a}){const o=ua(e,n),r=o.dir==="flat"?"var(--fg2)":o.dir==="up"?"var(--red)":"var(--green)",i=o.dir==="flat"?"·":o.dir==="up"?"↑":"↓",d=o.dir==="flat"?"~":(o.pct>0?"+":"")+Math.round(o.pct*100)+"%",v=n>0?" · median "+a(n):"";return s`<div class="run-trend-metric"
      title=${t+": current "+a(e)+v}>
    <span class="run-trend-label">${t}</span>
    <span class="run-trend-value">${l}</span>
    <span class="run-trend-delta" style="color:${r}"
        data-dir=${o.dir}
        aria-label=${t+" "+(o.dir==="flat"?"unchanged":o.dir==="up"?"up":"down")+" "+d}>
      ${i} ${d}
    </span>
  </div>`}function va({sessionId:t,project:e,tool:l,currentDurationS:n=0,currentTokens:a=0,currentFileChurn:o=0}){const[r,i]=b(null);if(z(()=>{if(!e||!l){i(null);return}let c=!1;return Yt(e,l,30,20).then(_=>{c||i(Array.isArray(_)?_:[])}).catch(()=>{c||i([])}),()=>{c=!0}},[e,l]),!e||!l||r===null)return null;const d=r.filter(c=>c.session_id!==t).slice(0,5);if(d.length<2)return s`<div class="run-trend-strip run-trend-empty"
        role="group" aria-label="Run trend (not enough history)">
      <span class="run-trend-label">Run trend</span>
      <span class="run-trend-empty-msg">Not enough prior runs for comparison (need ≥2).</span>
    </div>`;const v=ht(d.map(c=>c.duration_s||0)),u=ht(d.map(c=>c.total_tokens||0)),g=ht(d.map(c=>c.file_churn||0));return s`<div class="run-trend-strip"
      role="group"
      aria-label="Run trend vs last ${d.length} runs">
    <span class="run-trend-header" title="Compared against median of last ${d.length} runs">
      vs last ${d.length} runs
    </span>
    <${yt} label="Duration" value=${n}
      formatted=${U(n)} med=${v} fmt=${U}/>
    <${yt} label="Tokens" value=${a}
      formatted=${h(a)+"t"} med=${u}
      fmt=${c=>h(c)+"t"}/>
    <${yt} label="Files" value=${o}
      formatted=${String(o)} med=${g}
      fmt=${c=>String(Math.round(c))}/>
  </div>`}const _t=20;function ma({session:t}){const[e,l]=b(!1),[n,a]=b(null),[o,r]=b(!1),[i,d]=b(null),v=Kt(null),u=t&&t.commit_count?t.commit_count:n?n.commits.length:0;if(z(()=>{if(!e)return;const c=p=>{v.current&&!v.current.contains(p.target)&&l(!1)},_=p=>{p.key==="Escape"&&l(!1)};return document.addEventListener("mousedown",c),document.addEventListener("keydown",_),()=>{document.removeEventListener("mousedown",c),document.removeEventListener("keydown",_)}},[e]),z(()=>{!e||n||o||!t||!t.session_id||(r(!0),Ts(t.session_id).then(c=>{a(c&&c.commits?c:{commits:[],branch:""}),r(!1)}).catch(c=>{d(String(c)),r(!1)}))},[e,n,o,t]),!t||!u||!t.project)return null;const g=u===1?"1 commit":u+" commits";return s`<span ref=${v} class="scb-root" style="position:relative">
    <button type="button"
      class="badge text-xs"
      aria-expanded=${e}
      aria-label="Show ${g} for this session"
      onClick=${()=>l(c=>!c)}
      style="background:var(--bg2);color:var(--fg);border:1px solid var(--bd);
             cursor:pointer;padding:1px 6px;border-radius:3px">
      <span aria-hidden="true" style="margin-right:3px">⎇</span>${$(g)}
    </button>
    ${e&&s`<div class="scb-dropdown" role="group"
      aria-label="Commits attributed to this session"
      style="position:absolute;top:calc(100% + 4px);left:0;z-index:50;
             min-width:280px;max-width:480px;max-height:320px;overflow:auto;
             background:var(--bg1);border:1px solid var(--bd);
             border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.25);
             padding:var(--sp-1)">
      ${o&&s`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading…</div>`}
      ${i&&s`<div class="text-muted text-xs" style="padding:var(--sp-2);color:var(--red)">
        ${$(i)}
      </div>`}
      ${!o&&!i&&n&&fa(n)}
    </div>`}
  </span>`}function fa(t){const e=(t.commits||[]).slice(0,_t),l=t.branch||"";return e.length===0?s`<div class="text-muted text-xs" style="padding:var(--sp-2)">
      No commits attributed.
    </div>`:s`<ul class="scb-list" role="list"
    style="list-style:none;margin:0;padding:0">
    ${e.map(n=>$a(n,l))}
    ${(t.commits||[]).length>_t&&s`<li class="text-muted text-xs"
      style="padding:var(--sp-1) var(--sp-2)">
      …and ${(t.commits||[]).length-_t} more
    </li>`}
  </ul>`}function $a(t,e){const l=e&&!t.current_branch_match,n=l?"opacity:0.55;":"",a=l&&e?"not on "+e:t.author_name?t.author_name+" <"+t.author_email+">":"",o="display:flex;gap:var(--sp-2);align-items:baseline;padding:3px var(--sp-2);font-size:var(--fs-xs);"+n;return s`<li class="scb-row"
    title=${a}
    style=${o}>
    <code class="mono"
      style="color:var(--fg2);flex:0 0 auto">${$(t.short_sha)}</code>
    <span class="text-ellipsis"
      style="flex:1 1 auto;min-width:0">${$(t.subject||"(no subject)")}</span>
    ${l&&s`<span class="text-muted text-xs"
      style="flex:0 0 auto;font-style:italic">not on ${$(e)}</span>`}
  </li>`}const ga=[{id:"overview",label:"Overview",hint:"Metrics, actions, context, memory"},{id:"flow",label:"Flow",hint:"Sequence of messages & tool calls"},{id:"transcript",label:"Transcript",hint:"Readable prompts & replies"},{id:"timeline",label:"Timeline",hint:"Activity bar chart over time"},{id:"events",label:"Events",hint:"Raw session event stream"}];function ha({session:t}){if(!t)return null;const e=Qt(t.tool),l=t.exact_input_tokens||t.input_tokens||0,n=t.exact_output_tokens||t.output_tokens||0,a=l+n,o=t.duration_s||(t.ended_at&&t.started_at?t.ended_at-t.started_at:0),r=!t.ended_at,i=t.project?ts(t.project):"",d=t.started_at?new Date(t.started_at*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"";return s`<div class="explorer-session-header" style="border-left:3px solid ${e}">
    <div class="flex-row gap-md" style="align-items:baseline;flex-wrap:wrap">
      <strong style="font-size:var(--fs-lg)" title=${t.tool}><span style=${"color:"+e} aria-hidden="true">\u25CF </span>${$(Tt(t.tool))}</strong>
      ${i&&s`<span class="text-muted text-xs mono text-ellipsis"
        style="max-width:360px" title=${t.project}>${$(i)}</span>`}
      ${t.git_branch&&s`<span class="badge text-xs"
        style="background:var(--bg2);color:var(--fg2)"
        title="git branch">⎇ ${$(t.git_branch)}</span>`}
      ${t.git_commit&&s`<span class="badge text-xs mono"
        style="background:var(--bg2);color:var(--fg2)"
        title=${t.git_commit}>${$(String(t.git_commit).slice(0,7))}</span>`}
      <${ma} session=${t}/>
      ${d&&s`<span class="text-muted text-xs">${$(d)}</span>`}
      ${o>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">${U(o)}</span>`}
      ${a>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)"
        title="input ${l.toLocaleString()} · output ${n.toLocaleString()}">
        ${h(a)}t
      </span>`}
      ${(t.files_modified||0)>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">
        ${t.files_modified} files
      </span>`}
      ${r&&s`<span class="badge"
        style="background:var(--red);color:var(--on-status);font-size:var(--fs-xs)">● LIVE</span>`}
      <span class="text-muted text-xs mono"
        style="margin-left:auto"
        title=${t.session_id}>${$(t.session_id)}</span>
    </div>
    <${pa} session=${t}/>
  </div>`}function Sa(){const{globalRange:t,enabledTools:e,snap:l}=J(X),[n,a]=b(()=>{try{return localStorage.getItem("aictl-explorer-view")||"overview"}catch{return"overview"}}),[o,r]=b(()=>Os()),{sessions:i,loading:d,error:v,tools:u,toolSessions:g,activeTool:c,setActiveTool:_,activeSessionId:p,setActiveSessionId:m}=ut({globalRange:t,enabledTools:e,requestedSession:o,onRequestApplied:()=>r(null)}),y=x=>{a(x);try{localStorage.setItem("aictl-explorer-view",x)}catch{}};z(()=>{const x=k=>{const L=k==null?void 0:k.detail;L!=null&&L.sessionId&&(r(L),zs())};return document.addEventListener("aictl:select-session",x),()=>document.removeEventListener("aictl:select-session",x)},[]),z(()=>{p&&(Is(p,c),Pt({session:p}))},[p,c]),z(()=>()=>Pt({session:null}),[]);const f=i.find(x=>x.session_id===p),S=!d&&Ot?Ot():0;return!d&&!v&&u.length===0&&Ss(e)?s`<div class="explorer-container">
      <${Ns} enabledTools=${e} snap=${l} what="sessions in this time range"/>
    </div>`:s`<div class="explorer-container">
    <div class="explorer-picker">
      <${vt} tools=${u} activeTool=${c} onSelect=${_}/>
      <${Ct} sessions=${g} activeId=${p}
        onSelect=${m} loading=${d} error=${v}/>
      ${S>0?s`<div class="text-muted text-xs" style="margin-top:var(--sp-1)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${S} short session${S===1?"":"s"} hidden</div>`:null}
    </div>

    ${f&&f.project&&f.tool&&s`<${va}
      sessionId=${f.session_id}
      project=${f.project}
      tool=${f.tool}
      currentDurationS=${f.duration_s||(f.ended_at&&f.started_at?f.ended_at-f.started_at:0)}
      currentTokens=${(f.exact_input_tokens||f.input_tokens||0)+(f.exact_output_tokens||f.output_tokens||0)}
      currentFileChurn=${f.files_modified||0}/>`}

    <${ha} session=${f}/>

    <nav class="explorer-subtabs" aria-label="Session views">
      ${ga.map(x=>s`<button key=${x.id}
        class="tab-btn explorer-subtab-btn"
        aria-current=${n===x.id?"page":null}
        title=${x.hint}
        onClick=${()=>y(x.id)}>${x.label}</button>`)}
    </nav>

    <div class="explorer-content">
      ${p?n==="overview"?f?s`<${xe} session=${f}/>`:s`<div class="loading-state" style="padding:var(--sp-8)">Loading session\u2026</div>`:n==="flow"?s`<${De} key=${"ex-flow-"+p}
                externalSessionId=${p}/>`:n==="transcript"?s`<${Ge} key=${"ex-tr-"+p}
                  externalSessionId=${p}/>`:n==="timeline"?s`<${aa} key=${"ex-tl-"+p}
                    externalSessionId=${p}/>`:s`<${la}
                    key=${"ex-ev-"+p}
                    sessionId=${p}
                    since=${t==null?void 0:t.since}
                    until=${t==null?void 0:t.until}
                  />`:s`<div class="empty-state" style="padding:var(--sp-8);text-align:center">
            <p>${d?"Loading sessions…":"Select a session above to inspect it."}</p>
            ${!d&&u.length===0&&s`<p class="text-muted text-xs"
              style="margin-top:var(--sp-3)">
              No sessions in the current time range. Try widening the range bar above.
            </p>`}
          </div>`}
    </div>
  </div>`}export{ha as SessionHeader,Sa as default};
