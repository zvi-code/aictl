import{x as J,S as X,d as b,T as q,y as O,a4 as as,a5 as ns,a6 as os,a7 as st,m as s,e as f,a8 as U,I as L,D as ls,h as mt,a9 as is,aa as rs,ab as Y,b as y,f as et,ac as cs,ad as ds,ae as ps,af as us,a as ft,ag as vs,ah as ms,C as yt,ai as Wt,aj as fs,ak as $s,al as gs,am as hs,an as _s,ao as ys,ap as Gt,U as kt,aq as dt,n as Kt,p as xs,ar as xt,as as bs,a3 as Jt,at as Xt,au as I,av as tt,aw as wt,q as Q,ax as ks,L as ws,ay as Ts,A as Yt,az as Qt,aA as Et,R as Ss,aB as Cs,aC as As,aD as Mt,aE as Es,aF as Ms,aG as Pt}from"./index-DWqDLmU7.js";import{u as H}from"./useAsyncResource-BCXsD-6K.js";import{c as Ps}from"./models-DHnW0Za4.js";function Ls(t,e){if(!(e!=null&&e.length))return t;const i=e.filter(l=>l.session_id&&l.tool&&!st(t,l.session_id)).map(l=>({...l,active:!0,live:!0}));return i.length?[...t,...i].sort((l,a)=>(a.started_at||0)-(l.started_at||0)):t}function pt({globalRange:t=null,enabledTools:e=null,requestedSession:i=null,onRequestApplied:l=null}={}){var w,D;const a=(D=(w=J(X))==null?void 0:w.snap)==null?void 0:D.sessions,[n,r]=b([]),o=q(()=>Ls(n,a),[n,a]),[c,v]=b(!0),[u,$]=b(null),[d,_]=b(null),[p,m]=b(null);O(()=>{let E=!1;v(!0),$(null);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,M=t==null?void 0:t.until;return as(null,{since:P,until:M}).then(z=>{if(E)return;const V=ns(z);V.sort((W,G)=>(G.started_at||0)-(W.started_at||0)),r(V),v(!1)}).catch(z=>{E||($(z),v(!1))}),()=>{E=!0}},[t]);const g=E=>e===null||e.includes(E),h=q(()=>o.filter(E=>g(E.tool)),[o,e]),x=q(()=>os(h),[h]);O(()=>{(!d&&x.length>0||d&&!x.includes(d)&&x.length>0)&&_(x[0])},[x.join(",")]);const k=q(()=>h.filter(E=>E.tool===d),[h,d]);return O(()=>{k.length>0&&(!p||!st(k,p))&&m(k[0].session_id)},[d,k.length]),O(()=>{if(!(i!=null&&i.sessionId))return;const E=st(o,i.sessionId);E&&(_(E.tool),m(E.session_id),l==null||l())},[i,o]),{sessions:o,loading:c,error:u,tools:x,toolSessions:k,activeTool:d,setActiveTool:_,activeSessionId:p,setActiveSessionId:m}}const at={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function Lt({agent:t,tasks:e,now:i}){const l=at[t.state]||at.active,a=t.ended_at?t.ended_at-t.started_at:i-t.started_at,n=e.filter(r=>r.agent_id===t.agent_id);return s`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${l.bg};color:var(--on-status)">${l.label}</span>
      <strong class="text-sm">${f(t.agent_id)}</strong>
      <span class="text-muted text-xs">${U(a)}</span>
      ${t.task&&s`<span class="text-xs mono text-muted">\u2014 ${f(t.task)}</span>`}
    </div>
    ${n.length>0&&s`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${n.map(r=>{const o=at[r.state]||at.pending;return s`<div key=${r.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${o.bg};color:var(--on-status);font-size:var(--fs-xs);padding:1px 4px">${o.label}</span>
          <span class="mono">${f(r.name||r.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function Os({entityState:t}){if(!t||!t.agents||!t.agents.length)return null;const e=t.agents,i=t.tasks||[],l=Date.now()/1e3,a=e.filter(r=>r.state==="active"),n=e.filter(r=>r.state!=="active");return s`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${e.length} agent${e.length>1?"s":""}</span>
      ${a.length>0&&s`<span class="badge text-xs" style="background:var(--green);color:var(--on-status)">${a.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${a.map(r=>s`<${Lt} key=${r.agent_id} agent=${r} tasks=${i} now=${l}/>`)}
      ${n.map(r=>s`<${Lt} key=${r.agent_id} agent=${r} tasks=${i} now=${l}/>`)}
    </div>
  </div>`}function zs({tasks:t}){if(!t||!t.length)return null;const e=t.filter(n=>n.state==="pending"),i=t.filter(n=>n.state==="active"),l=t.filter(n=>n.state==="done");function a({title:n,items:r,color:o}){return s`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${o}">
        <strong class="text-sm">${n}</strong>
        <span class="text-muted text-xs">${r.length}</span>
      </div>
      <div class="tt-column-body">
        ${r.length?r.map(c=>s`<div key=${c.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${f(c.name||c.task_id)}</div>
              ${c.agent_id&&s`<div class="text-xs text-muted">Agent: ${f(c.agent_id)}</div>`}
            </div>`):s`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return s`<div class="tt-board">
    <${a} title="Pending" items=${e} color="var(--fg3)"/>
    <${a} title="Active" items=${i} color="var(--accent)"/>
    <${a} title="Done" items=${l} color="var(--green)"/>
  </div>`}function B({title:t,icon:e,badge:i,defaultOpen:l,children:a}){const[n,r]=b(l||!1);return s`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>r(o=>!o)}
      aria-expanded=${n}>
      <span class="sd-panel-icon"><${L} name=${e} size="1em"/></span>
      <span class="sd-panel-title">${t}</span>
      ${i!=null&&s`<span class="badge text-xs" style="margin-left:var(--sp-2)">${i}</span>`}
      <span class="sd-panel-arrow" aria-hidden="true">${n?"▲":"▼"}</span>
    </button>
    ${n&&s`<div class="sd-panel-body">${a}</div>`}
  </div>`}const Is={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)","hook:PreToolUse":"var(--accent)","hook:PostToolUse":"var(--accent)","hook:tool_use":"var(--accent)"};function lt(t){if(t==null||t==="")return"";if(typeof t=="string")return t;try{return JSON.stringify(t)}catch{return String(t)}}function Ds(t){const e=[],i=new Set,l=6;for(let a=0;a<t.length;a++){if(i.has(a))continue;const n=t[a];if(n.kind==="hook:PreToolUse"){const r=n.detail&&n.detail.tool_name||"";let o=-1;for(let c=a+1;c<Math.min(t.length,a+1+l);c++){const v=t[c];if(i.has(c)||v.kind!=="hook:PostToolUse")continue;const u=v.detail&&v.detail.tool_name||"";if(!(r&&u&&r!==u)){o=c;break}}if(o>=0){const c=t[o];i.add(o);const v=n.detail||{},u=c.detail||{};e.push({...n,kind:"hook:tool_use",ts:n.ts,end_ts:c.ts,detail:{...v,tool_name:v.tool_name||u.tool_name||"",tool_input:v.tool_input!=null?v.tool_input:v.input,result_summary:u.result_summary!=null?u.result_summary:u.tool_response!=null?u.tool_response:u.result}});continue}}e.push(n)}return e}function Fs(t){const e=a=>{const n=a.detail||{};return String(n.path||n.name||n.tool_name||a.kind)},i=a=>{const n=a.detail||{},r=n.tool_input!=null?n.tool_input:n.input,o=n.result_summary!=null?n.result_summary:n.tool_response!=null?n.tool_response:n.result;return lt(r)!==""||lt(o)!==""},l=[];for(const a of t){const n=l[l.length-1];if(n&&n.kind===a.kind&&e(n)===e(a)&&!i(n)&&!i(a)){const r=(n.repeat_count||1)+1;l[l.length-1]={...n,repeat_count:r,last_ts:a.ts};continue}l.push(a)}return l}function Ns({sessionId:t}){const[e,i]=b([]),[l,a]=b(!0),[n,r]=b(null),[o,c]=b({});O(()=>{if(!t){i([]),a(!1),r(null);return}let u=!1;return a(!0),r(null),c({}),ls({sessionId:t,limit:200,since:0}).then(d=>{u||(i((Array.isArray(d)?d:[]).reverse()),a(!1))}).catch(d=>{u||(i([]),r(d),a(!1))}),()=>{u=!0}},[t]);const v=q(()=>Fs(Ds(e)),[e]);return l?s`<p class="loading-state">Loading events...</p>`:n?s`<p class="error-state">Failed to load session actions${n.message?` (${n.message})`:""}.</p>`:v.length?s`<div class="sd-events">
    ${v.map(u=>{const $=Is[u.kind]||"var(--fg3)",d=u.detail||{},_=d.path||d.name||d.tool_name||u.kind,p=d.tool_input!=null?d.tool_input:d.input,m=d.result_summary!=null?d.result_summary:d.tool_response!=null?d.tool_response:d.result,g=lt(p),h=lt(m),x=g!==""||h!=="",k=`${u.ts}-${u.kind}`,w=!!o[k],D=g?g.slice(0,80)+(g.length>80?"…":""):"",E=h?h.slice(0,80)+(h.length>80?"…":""):"",P=D||E;return s`<div key=${k} class="sd-event-row-wrap">
        <div class="sd-event-row">
          <span class="sd-event-time" title=${u.repeat_count>1?`${mt(u.ts)} → ${mt(u.last_ts)}`:null}>${mt(u.ts)}</span>
          <span class="sd-event-dot" style="background:${$}"></span>
          <span class="sd-event-kind">${u.kind}</span>
          <span class="sd-event-desc mono text-muted">${f(String(_))}</span>
          ${u.repeat_count>1&&s`<span class="badge" title=${`${u.repeat_count} consecutive identical events`}>×${u.repeat_count}</span>`}
        </div>
        ${x&&s`<div class="sd-event-detail">
          <button type="button"
            class="sd-event-toggle"
            aria-expanded=${w?"true":"false"}
            onClick=${()=>c(M=>({...M,[k]:!M[k]}))}
            style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-xs);text-align:left;font-family:inherit">
            <span style="display:inline-block;width:1em">${w?"˅":"›"}</span>
            ${w?s`<span class="text-muted">hide</span>`:s`<span class="mono text-muted" title=${g||h}>${f(P)}</span>`}
          </button>
          ${w&&s`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:var(--sp-1) 0 0 1em;padding:var(--sp-2);background:var(--bg2);border-radius:var(--radius-sm)">${f((g?"input: "+g:"")+(g&&h?`

`:"")+(h?"result: "+h:""))}</pre>`}
        </div>`}
      </div>`})}
  </div>`:s`<p class="empty-state">No events recorded for this session.</p>`}function Bs(){return`Set capture = "full" under [storage] in ${is()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function Ot(t){return(t==null?void 0:t.content_retained)===!1}function Rs(t){return t&&t!=="full"?`Text not retained: capture=${t}`:t==="full"?"Text not retained for this session":"Text not retained: capture mode is not full"}function Zt({mode:t}){return s`<div class="panel-state panel-state--withheld" role="status">
    <${L} name="file-text" size="14"/>
    <div>
      <div class="panel-state__title">${Rs(t)}</div>
      <div class="panel-state__hint">Prompts and replies for this session were not stored. Counts, timing, models and tool calls are still shown.</div>
      <code class="panel-state__fix">${Bs()}</code>
    </div>
  </div>`}const zt=240,js={user:"var(--accent)",assistant:"var(--green)"};function qs({sessionId:t,withheld:e=!1,captureMode:i=null}){const[l,a]=b({}),{data:n,loading:r,error:o}=H(()=>rs(t),[t],{enabled:!!t});O(()=>{a({})},[t]);const c=Array.isArray(n==null?void 0:n.messages)?n.messages:[];return r?s`<p class="loading-state">Loading conversation...</p>`:o?s`<p class="error-state">Failed to load conversation${o.message?` (${o.message})`:""}.</p>`:c.length?s`<div class="sd-conversation">
    ${c.map((v,u)=>{const $=v.role||"unknown",d=js[$]||"var(--fg2)",_=String(v.content||""),p=_.length>zt,m=`${v.ts}-${$}-${u}`,g=!!l[m];return s`<div key=${m} style="padding:var(--sp-2) 0;border-bottom:1px solid var(--bg3)">
        <div class="flex-row gap-sm" style="align-items:center">
          <span class="badge text-xs" style="background:${d};color:var(--on-status)">${$}</span>
          <span class="badge--muted badge text-xs" title=${"Captured via "+(v.source||"unknown")}>${v.source||"?"}</span>
          <span class="text-xs text-muted mono" style="margin-left:auto">${Y(v.ts)}</span>
        </div>
        <div class="mono" style="font-size:var(--fs-sm);margin-top:var(--sp-1);white-space:pre-wrap;word-break:break-word">
          ${g||!p?_:_.slice(0,zt)+"…"}
        </div>
        ${p&&s`<button type="button"
          aria-expanded=${g?"true":"false"}
          onClick=${()=>a(h=>({...h,[m]:!h[m]}))}
          style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent);font-size:var(--fs-xs);font-family:inherit">
          ${g?"Show less":`Show all ${_.length} chars`}
        </button>`}
      </div>`})}
  </div>`:e?s`<${Zt} mode=${i}/>`:s`<p class="empty-state">No conversation captured for this session.</p>`}const It=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Hs=95;function ts({path:t,session:e,openViewer:i}){if(!t||!e||typeof i!="function")return null;const l=e.started_at,a=e.ended_at;if(!l&&!a)return null;const n=r=>o=>{o.preventDefault(),o.stopPropagation(),i(t,{at:r})};return s`<span class="file-history-btns" aria-label="View file at session start or end">
    ${l&&s`<button type="button" class="file-history-btn"
      title="View at session start"
      aria-label=${"View "+t+" at session start"}
      onClick=${n(l)}>\u25F7 start</button>`}
    ${a&&s`<button type="button" class="file-history-btn"
      title="View at session end"
      aria-label=${"View "+t+" at session end"}
      onClick=${n(a)}>\u25F8 end</button>`}
  </span>`}function Vs({session:t}){const e=J(X),i=e.snap,l=t.files_loaded||[],a=((i==null?void 0:i.tool_configs)||[]).map(p=>p.model).filter(Boolean)[0]||"",n=Ps(a),o=(i&&i.agent_memory||[]).reduce((p,m)=>p+(m.tokens||0),0),c=l.length*150,u=It.reduce((p,m)=>p+m.tokens,0)+o+c,$=Math.min(u/n*100,100),d=Hs,_=[...It,{name:"Memory",tokens:o,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:c,color:"var(--green)"}].filter(p=>p.tokens>0);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${l.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${y(u)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${y(n)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${$>80?"var(--orange)":$>50?"var(--yellow)":"var(--green)"}">${et($)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${_.map(p=>{const m=(p.tokens/n*100).toFixed(1);return s`<div key=${p.name} style="width:${m}%;background:${p.color};min-width:${p.tokens>0?"1px":"0"}"
              title="${p.name}: ~${y(p.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${d}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${d}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${_.map(p=>s`<span key=${p.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${p.color};margin-right:2px"></span>
          ${p.name} ${y(p.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${d}%</span>
      </div>
    </div>

    ${l.length>0&&s`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${l.map(p=>s`<div key=${p} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${f(p)}</span>
        <${ts} path=${p} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>`}
    ${!l.length&&s`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Us({mem:t}){const[e,i]=b(!1),l=t.name||(t.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",a=(t.content||"").slice(0,300);return s`<div class="sd-memory-entry">
    <button type="button" class="flex-row gap-sm"
      aria-expanded=${e}
      onClick=${()=>i(!e)}
      style="align-items:center;width:100%;background:none;border:none;padding:0;
        font:inherit;color:inherit;text-align:left;cursor:pointer">
      <span class="badge text-xs">${t.type||t.source||"file"}</span>
      <strong title=${t.file||t.path||""}>${f(l)}</strong>
      ${t.tokens?s`<span class="text-muted">${y(t.tokens)} tok</span>`:null}
      ${t.lines?s`<span class="text-muted">${t.lines}ln</span>`:null}
      ${t.profile?s`<span class="text-muted">${f(t.profile)}</span>`:null}
      <span class="text-muted" aria-hidden="true" style="margin-left:auto;font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&a?s`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${f(t.content)}${t.content&&t.content.length>300,""}</pre>`:null}
  </div>`}function Ws({session:t}){const{snap:e}=J(X),i=e&&e.agent_memory||[],l=t.project||"",a=l?i.filter(n=>{const r=n.project||n.tool||"";return!l||r.includes(l.replace(/\\/g,"/").split("/").pop())}):i;return s`<div>
    <${Xs} sessionId=${t.session_id}/>
    ${a.length?s`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
          ${a.map((n,r)=>s`<${Us} key=${r} mem=${n}/>`)}
        </div>`:s`<p class="empty-state">
          No memory entries found${l?" for this project":""}.
          <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
        </p>`}
  </div>`}const Gs={added:"+",modified:"●",removed:"−"},Ks={added:"added",modified:"modified",removed:"removed"};function Js({file:t}){const[e,i]=b(!1),l=Gs[t.change]||"·";return s`<div class="sd-memdiff-row" data-change=${t.change}>
    <button type="button" class="flex-row gap-sm"
         style="align-items:center;cursor:pointer;padding:var(--sp-1) 0;width:100%;
           background:none;border:none;font:inherit;color:inherit;text-align:left"
         onClick=${()=>i(!e)} aria-expanded=${e}>
      <span class="badge text-xs" title=${Ks[t.change]||t.change}>${l}</span>
      <code class="text-xs" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${f(t.path)}</code>
      <span class="text-xs" style="color:var(--positive, #4caf50)">+${t.added_lines||0}</span>
      <span class="text-xs" style="color:var(--negative, #f44336)">-${t.removed_lines||0}</span>
      <span class="text-muted" aria-hidden="true" style="font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&t.unified_diff?s`<pre class="diff" style="margin:var(--sp-1) 0 var(--sp-2);padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre;overflow-x:auto;max-height:20rem;overflow-y:auto;
      font-size:var(--fs-xs);line-height:1.4;font-family:var(--font-mono, monospace)">${f(t.unified_diff)}</pre>`:null}
  </div>`}function Xs({sessionId:t}){const{data:e,loading:i}=H(()=>cs(t).then(n=>n||{files:[],summary:{}}).catch(()=>({files:[],summary:{}})),[t],{enabled:!!t}),l=e&&e.files||[],a=e&&e.summary||{added:0,modified:0,removed:0};return s`<div class="sd-memdiff" style="margin-bottom:var(--sp-3)">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-2)">
      <strong class="text-sm">Memory changes this session</strong>
      ${!i&&l.length?s`<span class="text-muted text-xs">
        ${a.added||0} added \u00B7 ${a.modified||0} modified \u00B7 ${a.removed||0} removed
      </span>`:null}
    </div>
    ${i?s`<p class="text-muted text-xs">Loading\u2026</p>`:l.length?s`<div class="mono text-xs">${l.map((n,r)=>s`<${Js} key=${n.path+r} file=${n}/>`)}</div>`:s`<p class="empty-state text-xs">
          No memory changes recorded for this session.
          <small class="empty-state-source">/api/session-memory-diff · files[]</small>
        </p>`}
  </div>`}function Ys({rateLimits:t}){return!t||!Object.keys(t).length?null:s`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(t).map(([e,i])=>{const l=i.used_pct||i.used_percentage||0,a=l>80?"var(--red)":l>60?"var(--orange)":"var(--green)",n=i.resets_at||"";return s`<div key=${e} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${e} window</span>
            <span style="color:${a};font-weight:600">${et(l)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(l,100)}%;background:${a};border-radius:4px"></div>
          </div>
          ${n&&s`<div class="text-xs text-muted" style="margin-top:2px">resets ${n}</div>`}
        </div>`})}
    </div>
  </div>`}function Qs({sessionId:t,topN:e=10}){const{data:i,loading:l,error:a}=H(()=>ds(t),[t],{enabled:!!t}),n=q(()=>!i||!Array.isArray(i.counts)?[]:i.counts.slice(0,e),[i,e]);if(l)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading subprocesses\u2026</div>`;if(a)return s`<div class="error-state text-xs" style="padding:0">Failed to load subprocess breakdown${a.message?` (${a.message})`:""}.</div>`;if(!n.length)return s`<div class="text-xs text-muted">No subprocess activity recorded
      (live correlator data only; not available for ended sessions).</div>`;const r=Math.max(1,...n.map(o=>o.count));return s`<div class="subprocess-breakdown" aria-label="Top subprocesses by count">
    <div class="text-xs text-muted mb-sm">Top ${Math.min(e,n.length)} subprocesses
      <span class="text-muted">\u00b7 total ${i.total}</span></div>
    <div class="subprocess-rows">
      ${n.map(o=>{const c=o.count/r*100;return s`<div key=${o.name} class="subprocess-row">
          <span class="subprocess-name mono text-xs" title=${o.name}>${f(o.name)}</span>
          <div class="subprocess-bar-track">
            <div class="subprocess-bar" style=${"width:"+c+"%"}></div>
          </div>
          <span class="subprocess-count text-xs mono">${o.count}</span>
        </div>`})}
    </div>
  </div>`}function Zs({session:t}){const e=t.exact_input_tokens||0,i=t.exact_output_tokens||0,{data:l}=H(()=>ps({tool:t.tool,active:!1,limit:20}).then(p=>{if(p.length>1){const m=p.filter(h=>h.duration_s>0).map(h=>h.duration_s);return{avgDuration:m.length?m.reduce((h,x)=>h+x,0)/m.length:0,sampleCount:p.length}}return null}).catch(()=>null),[t.tool],{enabled:!!t.tool}),{data:a}=H(()=>us(t.session_id).then(p=>p&&!p.error?p:null).catch(()=>null),[t.session_id],{enabled:!!t.session_id}),n=t.duration_s||0,r=l&&l.avgDuration>0?n/l.avgDuration:null,o=(a==null?void 0:a.vscode_lm_usage)||null,c=(a==null?void 0:a.skill_call_breakdown)||{},v=Object.entries(c).sort((p,m)=>m[1]-p[1]),u=(a==null?void 0:a.tool_call_breakdown)||{},$=Object.entries(u).sort((p,m)=>m[1]-p[1]),d=(a==null?void 0:a.agents)||[],_=(a==null?void 0:a.context_state)||null;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${y(e)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${y(i)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${y(e+i)}</div></div>
      <div class="es-kv-card"><div class="label">CPU</div><div class="value">${et(t.cpu_percent||0)}</div></div>
      <div class="es-kv-card"><div class="label">Peak CPU</div><div class="value">${et(t.peak_cpu_percent||0)}</div></div>
    </div>
    <div class="es-kv" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Inbound</div><div class="value">${ft(t.inbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">Outbound</div><div class="value">${ft(t.outbound_bytes||0)}</div></div>
      <div class="es-kv-card"><div class="label">State Writes</div><div class="value">${ft(t.state_bytes_written||0)}</div></div>
      <div class="es-kv-card"><div class="label">PIDs</div><div class="value">${Array.isArray(t.pids)?t.pids.length:t.pids||0}</div></div>
      ${t.cache_hit_ratio!=null&&s`<div class="es-kv-card">
        <div class="label">Cache Hit</div>
        <div class="value" style="color:${t.cache_hit_ratio>=.5?"var(--green)":"var(--fg)"}">${et(t.cache_hit_ratio*100)}</div>
      </div>`}
    </div>
    ${r!=null&&s`<div class="text-xs text-muted" style="margin-top:var(--sp-3)">
      vs average (${l.sampleCount} sessions):
      duration ${r>1.2?s`<span class="text-orange">${r.toFixed(1)}x longer</span>`:r<.8?s`<span class="text-green">${(1/r).toFixed(1)}x shorter</span>`:s`<span>similar</span>`}
    </div>`}
    ${t.entity_state&&s`<${Ys} rateLimits=${t.entity_state.rate_limits}/>`}
    ${a&&s`<div class="session-agent-report" style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted mb-sm">Skills and subagents
        ${_&&s`<span class="badge" style="margin-left:var(--sp-2);font-size:var(--fs-2xs)"
          title="Deduced context-window state">context: ${_}</span>`}
      </div>
      <div class="es-kv" style="gap:var(--sp-3)">
        <div class="es-kv-card"><div class="label">Skill Calls</div><div class="value">${a.skill_calls||0}</div></div>
        <div class="es-kv-card"><div class="label">Subagents</div><div class="value">${d.length}</div></div>
        <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${a.tool_calls||0}</div></div>
        <div class="es-kv-card"><div class="label">Prompts</div><div class="value">${a.prompt_count||0}</div></div>
        <div class="es-kv-card"><div class="label">Tool calls/min</div><div class="value">${a.tool_call_rate!=null?a.tool_call_rate:"—"}</div></div>
      </div>
      ${$.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        <div class="text-xs text-muted">By tool</div>
        ${$.map(([p,m])=>s`<div key=${p} class="lm-usage-row flex-row gap-sm"
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
      ${d.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        ${d.slice(0,8).map(p=>s`<div key=${p.agent_id} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1" title=${p.task||""}>${p.agent_id||"subagent"}</span>
          <span class="text-xs text-muted">${p.state||""}</span>
        </div>`)}
      </div>`}
    </div>`}
    ${o&&Object.keys(o.by_extension||{}).length>0&&s`
      <div class="lm-usage-breakdown" style="margin-top:var(--sp-3)">
        <div class="text-xs text-muted mb-sm">VS Code Language-Model tokens by extension
          <span class="text-muted">\u00b7 total ${y(o.total_tokens||0)}</span></div>
        <div>
          ${Object.entries(o.by_extension).sort((p,m)=>(m[1].total_tokens||0)-(p[1].total_tokens||0)).map(([p,m])=>{const g=o.total_tokens||1,h=(m.total_tokens||0)/g*100;return s`<div key=${p} class="lm-usage-row flex-row gap-sm"
                style="align-items:center;padding:var(--sp-1) 0">
                <span class="mono text-xs" style="flex:1" title=${p}>${p}</span>
                <div style="width:80px;height:6px;background:var(--bg-alt);border-radius:3px;overflow:hidden">
                  <div style=${"width:"+h.toFixed(1)+"%;height:100%;background:var(--accent)"}></div>
                </div>
                <span class="text-xs mono">${y(m.total_tokens||0)}</span>
                <span class="text-xs text-muted mono">(${m.calls||0})</span>
              </div>`})}
        </div>
      </div>`}
    <div style="margin-top:var(--sp-3)">
      <${Qs} sessionId=${t.session_id} topN=${10}/>
    </div>
  </div>`}function te({session:t}){const e=J(X),i=t.files_touched||[],l=t.file_events||0;return i.length?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${i.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${y(l)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${i.map(a=>s`<div key=${a} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${f(a)}</span>
        <${ts} path=${a} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>
  </div>`:s`<p class="empty-state">No file changes recorded.</p>`}function se({sessionId:t}){const{data:e,loading:i,error:l}=H(()=>{const r=t?0:Math.floor(Date.now()/1e3)-3600;return vs(r,100,t)},[t]);if(i)return s`<p class="loading-state">Loading API call data...</p>`;if(l)return s`<p class="error-state">Failed to load API calls${l.message?` (${l.message})`:""}.</p>`;if(!e||!e.calls||!e.calls.length)return s`<p class="empty-state">No OTel API call data. Enable with: <code>aictl otel enable</code></p>`;const{calls:a,summary:n}=e;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">API Calls</div><div class="value">${n.total_calls}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${n.total_errors>0?"var(--red)":"var(--fg)"}">${n.total_errors}</div>
      </div>
      <div class="es-kv-card"><div class="label">Avg Latency</div><div class="value">${n.avg_latency_ms}ms</div></div>
      <div class="es-kv-card"><div class="label">P95 Latency</div><div class="value">${n.p95_latency_ms}ms</div></div>
    </div>
    ${n.by_model&&Object.keys(n.by_model).length>0&&s`
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By model</div>
      <div class="flex-row gap-sm flex-wrap" style="margin-bottom:var(--sp-3)">
        ${Object.entries(n.by_model).map(([r,o])=>s`
          <span key=${r} class="badge text-xs">${r}: ${o}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${a.slice(0,30).map((r,o)=>{const c=r.status==="error",v=new Date(r.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),u=Number(r.http_status),$=Number.isFinite(u)&&u>=400;return s`<div key=${o} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${c?"var(--red)":"var(--green)"}"></span>
          <span style="width:14px;flex-shrink:0;text-align:center;color:${c?"var(--red)":"var(--green)"}">
            <span aria-hidden="true">${c?"✗":"✓"}</span><span class="sr-only">${c?"error":"ok"}</span>
          </span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${r.model||"—"}</span>
          ${!c&&s`<span style="width:50px;flex-shrink:0;text-align:right">${r.duration_ms||0}ms</span>`}
          ${!c&&s`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${y(r.input_tokens||0)}in</span>`}
          ${c&&s`<span style="color:var(--red)">${f(r.error||"error")}</span>`}
          ${r.finish_reason&&s`<span class="badge" style="font-size:var(--fs-xs);color:${r.finish_reason==="length"?"var(--orange)":"var(--fg-muted)"}">${f(String(r.finish_reason))}</span>`}
          ${r.error_type&&s`<span class="badge" style="font-size:var(--fs-xs);color:var(--red)">${f(String(r.error_type))}</span>`}
          ${r.http_status&&s`<span class="badge" style="font-size:var(--fs-xs);color:${$?"var(--red)":"var(--fg-muted)"}">${f(String(r.http_status))}</span>`}
        </div>`})}
    </div>
  </div>`}function ee({project:t}){const{data:e,loading:i,error:l}=H(()=>ms(7).then(a=>(Array.isArray(a)?a.find(r=>r.project===t):null)||null),[t],{enabled:!!t});return i?s`<p class="loading-state">Loading project costs...</p>`:l?s`<p class="error-state">Failed to load project costs${l.message?` (${l.message})`:""}.</p>`:e?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${e.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${y(e.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${y(e.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value"><${yt} row=${e}/></div></div>
    </div>
    ${e.daily&&e.daily.length>0&&s`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${e.daily.map(a=>{const n=a.input_tokens+a.output_tokens,r=Math.max(...e.daily.map(v=>v.input_tokens+v.output_tokens),1),o=(n/r*100).toFixed(1),c=new Date(a.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return s`<div key=${a.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${c}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${o}%;background:var(--green);border-radius:3px"
              title="${y(n)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${y(n)}</span>
        </div>`})}
    </div>`}
  </div>`:s`<p class="empty-state">No cost data available for this project.</p>`}function ae({project:t,tool:e}){const{data:i,loading:l,error:a}=H(()=>Wt(t,e,30,20).then(c=>Array.isArray(c)?c:[]),[t,e],{enabled:!!(t&&e)});if(l)return s`<p class="loading-state">Loading run history...</p>`;if(a)return s`<p class="error-state">Failed to load run history${a.message?` (${a.message})`:""}.</p>`;if(!i||i.length<2)return s`<p class="empty-state">Not enough session history for trend analysis.</p>`;const n=Math.max(...i.map(c=>c.total_tokens),1),r=i.reduce((c,v)=>c+v.duration_s,0)/i.length,o=i.reduce((c,v)=>c+v.total_tokens,0)/i.length;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${i.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${U(r)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${y(o)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${i.map(c=>{const v=(c.total_tokens/n*100).toFixed(1),u=new Date(c.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),$=r>0?c.duration_s/r:1;return s`<div key=${c.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${u}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;border-radius:3px;background:${$>1.5?"var(--orange)":$<.7?"var(--green)":"var(--accent)"}" title="${y(c.total_tokens)} tok, ${U(c.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${y(c.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${U(c.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function ne({sessionId:t}){const{data:e,loading:i,error:l}=H(()=>fs(t),[t],{enabled:!!t});if(i)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading MCP usage\u2026</div>`;if(l)return s`<div class="error-state text-xs" style="padding:0">Failed to load MCP usage${l.message?` (${l.message})`:""}.</div>`;const a=e&&Array.isArray(e.servers)?e.servers:[],n=e&&Array.isArray(e.configured_servers)?e.configured_servers:[],r=new Set(a.map(c=>c.server_name)),o=n.filter(c=>!r.has(c));return!a.length&&!n.length?s`<div class="text-xs text-muted">No MCP servers called in this session.</div>`:s`<div class="mcp-usage-panel" aria-label="MCP server usage for session">
    ${a.length>0&&s`
      <div class="text-xs text-muted mb-sm">
        ${a.length} server${a.length===1?"":"s"} called \u00b7
        ${e.total_calls||0} total call${(e.total_calls||0)===1?"":"s"}
      </div>
      <div class="mcp-usage-rows">
        ${a.map(c=>{const v=(c.err_count||0)>0;return s`<div key=${c.server_name} class="mcp-usage-row flex-row gap-sm"
            style="align-items:center;padding:var(--sp-1) 0">
            <span class="mono text-xs" style="flex:1" title=${c.server_name}>${f(c.server_name)}</span>
            <span class="text-xs mono">${c.call_count}</span>
            ${v&&s`<span class="text-xs text-orange" title=${c.err_count+" error(s)"}>!${c.err_count}</span>`}
          </div>`})}
      </div>
    `}
    ${a.length===0&&n.length>0&&s`
      <div class="text-xs text-muted mb-sm">No MCP servers called in this session.</div>
    `}
    ${o.length>0&&s`
      <div class="mcp-usage-unused" style="margin-top:var(--sp-2);opacity:0.55">
        <div class="text-xs text-muted mb-sm">Configured but unused (${o.length})</div>
        <div class="mcp-usage-rows">
          ${o.map(c=>s`<div key=${c} class="mono text-xs"
            style="padding:var(--sp-1) 0">${f(c)}</div>`)}
        </div>
      </div>
    `}
  </div>`}function oe({sessionId:t}){const{data:e,loading:i,error:l}=H(()=>$s(t),[t],{enabled:!!t});if(i||!t)return s`<p class="loading-state">Loading cost breakdown\u2026</p>`;if(l)return s`<p class="empty-state">Failed to load cost data.</p>`;if(!e||!e.models||!e.models.length)return s`<p class="empty-state">No per-model cost data recorded for this session.</p>`;const{models:a,totals:n}=e,r=Math.max(...a.map(o=>o.cost_usd||0),1e-9);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Models</div><div class="value">${a.length}</div></div>
      <div class="es-kv-card"><div class="label">Requests</div><div class="value">${n.requests}</div></div>
      <div class="es-kv-card" title="Estimated from token counts and list prices. Not a billed amount."><div class="label">Estimated total</div><div class="value"><${yt} row=${n} digits=${4}/></div></div>
    </div>
    <div style="margin-top:var(--sp-2)">
      ${a.map((o,c)=>{const v=((o.cost_usd||0)/r*100).toFixed(1),u=(o.input_tokens||0)+(o.output_tokens||0);return s`<div key=${c} style="margin-bottom:var(--sp-2)">
          <div class="flex-row gap-sm" style="align-items:baseline;margin-bottom:2px">
            <span class="mono text-xs text-ellipsis" style="flex:1;min-width:0" title=${o.model}>${f(o.model)}</span>
            <span class="text-xs text-muted" style="flex-shrink:0">${o.requests} req \u00b7 ${y(u)} tok</span>
            <span class="text-xs mono" style="flex-shrink:0;width:64px;text-align:right"><${yt} row=${o} digits=${4} showSub=${!1}/></span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;background:var(--accent);border-radius:3px"
              title=${gs(o,4).main}></div>
          </div>
          <div class="text-muted" style="font-size:var(--fs-xs);margin-top:2px">
            ${y(o.input_tokens||0)} in \u00b7 ${y(o.output_tokens||0)} out
            ${o.cache_read_tokens>0?s` \u00b7 ${y(o.cache_read_tokens)} cache-read`:""}
          </div>
        </div>`})}
    </div>
  </div>`}const Dt={lead:"var(--accent)",subagent:"var(--green)",unknown:"var(--fg-muted)"};function le({sessionId:t}){const{data:e,loading:i,error:l}=H(()=>hs(t),[t],{enabled:!!t});if(i||!t)return s`<p class="loading-state">Loading process tree\u2026</p>`;if(l)return s`<p class="empty-state">Failed to load process data.</p>`;if(!e||!e.processes||!e.processes.length)return s`<p class="empty-state">No persisted processes recorded for this session.</p>`;const{processes:a,by_role:n,total:r}=e;return s`<div>
    <div class="flex-row gap-sm flex-wrap mb-sm">
      <span class="badge text-xs">${r} process${r===1?"":"es"}</span>
      ${Object.entries(n).map(([o,c])=>s`
        <span key=${o} class="badge text-xs" style="color:${Dt[o]||"var(--fg-muted)"}">
          ${f(o)}: ${c}
        </span>`)}
    </div>
    <div class="mono text-xs">
      ${a.map((o,c)=>{const v=Dt[o.role]||"var(--fg-muted)",u=o.joined_at?Y(o.joined_at):"—";return s`<div key=${c} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${v}"></span>
          <span style="width:64px;flex-shrink:0;text-align:right">${o.pid}</span>
          <span style="width:80px;flex-shrink:0;color:${v}">${f(o.role||"unknown")}</span>
          <span class="text-ellipsis" style="flex:1;min-width:0">${f(o.tool||"")}</span>
          <span class="text-muted" style="flex-shrink:0">${u}</span>
        </div>`})}
    </div>
  </div>`}function ie({sessionId:t}){const[e,i]=b({}),l=Array.isArray(t)?t.join("|"):t,{data:a,loading:n,error:r}=H(()=>_s(t),[l],{enabled:!!l});O(()=>{i({})},[l]);const o=p=>i(m=>({...m,[p]:!m[p]}));if(n||!l)return s`<p class="loading-state">Loading tool calls…</p>`;if(r)return s`<p class="empty-state">Failed to load tool-call data.</p>`;if(!a||!a.calls||!a.calls.length)return s`<p class="empty-state">No tool-call data recorded for this session.</p>`;const{calls:c,by_tool:v,total:u,errors:$}=a,d=Object.entries(v).sort((p,m)=>m[1]-p[1]),_=Math.max(...d.map(([,p])=>p),1);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${u}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${$>0?"var(--red)":"var(--fg)"}">${$}</div>
      </div>
      <div class="es-kv-card"><div class="label">Distinct Tools</div><div class="value">${d.length}</div></div>
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By tool</div>
    <div style="margin-bottom:var(--sp-3)">
      ${d.map(([p,m])=>{const g=(m/_*100).toFixed(1);return s`<div key=${p} class="flex-row gap-sm" style="align-items:center;margin-bottom:2px">
          <span class="text-xs text-ellipsis" style="width:120px;flex-shrink:0" title=${p}>${f(p)}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${g}%;background:var(--green);border-radius:3px"></div>
          </div>
          <span class="text-muted text-xs" style="width:32px;flex-shrink:0;text-align:right">${m}</span>
        </div>`})}
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Timeline</div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${c.slice(0,60).map((p,m)=>{const g=p.ts?Y(p.ts):"—",h=p.input||"",x=!!e[m];return s`<div key=${m} style="padding:2px 0">
          <div class="flex-row gap-sm" style="align-items:center">
            <span class="text-muted" style="width:60px;flex-shrink:0">${g}</span>
            <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${p.is_error?"var(--red)":"var(--green)"}"></span>
            <span style="width:14px;flex-shrink:0;text-align:center;color:${p.is_error?"var(--red)":"var(--green)"}">
              <span aria-hidden="true">${p.is_error?"✗":"✓"}</span><span class="sr-only">${p.is_error?"error":"ok"}</span>
            </span>
            <span class="text-ellipsis" style="width:110px;flex-shrink:0" title=${p.tool_name}>${f(p.tool_name)}</span>
            <span style="width:56px;flex-shrink:0;text-align:right">${p.duration_ms?Math.round(p.duration_ms)+"ms":""}</span>
            <span class="text-muted text-ellipsis" style="flex:1;min-width:0">${f(p.result_summary||"")}</span>
          </div>
          ${h?s`<button type="button"
              class="tcp-input mono text-xs text-muted"
              aria-expanded=${x}
              aria-label=${(x?"Collapse":"Expand")+" input for "+p.tool_name}
              title=${x?"Collapse input":"Expand input"}
              onClick=${()=>o(m)}
              style=${"display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:1px 0 3px 74px;"+(x?"white-space:pre-wrap;word-break:break-word":"white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              ${f(h)}${p.input_truncated&&x?"…":""}
            </button>`:null}
        </div>`})}
    </div>
  </div>`}function re({sessionId:t,onKilled:e}){const[i,l]=b(!1),[a,n]=b(!1),[r,o]=b(null),[c,v]=b(null);async function u(){n(!0),v(null);try{const $=await ys(t,"TERM");o($),l(!1),e&&e($)}catch($){v($.message||"Failed to signal session")}finally{n(!1)}}return r?s`<span class="text-xs" style="color:var(--green)" title=${JSON.stringify(r)}>
      Signaled ${r.signaled.length} pid${r.signaled.length===1?"":"s"}
      ${r.failed.length?s` \u00b7 ${r.failed.length} failed`:""}
    </span>`:i?s`<span class="flex-row gap-sm" style="align-items:center">
    <span class="text-xs" style="color:var(--red)">Confirm kill?</span>
    <button class="badge" style="background:var(--red);color:var(--on-status);cursor:pointer;font-size:var(--fs-xs)"
      disabled=${a} onClick=${u}>${a?"…":"Yes, SIGTERM"}</button>
    <button class="badge" style="cursor:pointer;font-size:var(--fs-xs)" onClick=${()=>l(!1)}>Cancel</button>
    ${c&&s`<span class="text-xs" style="color:var(--red)">${c}</span>`}
  </span>`:s`<button class="badge" style="background:transparent;border:1px solid var(--red);color:var(--red);cursor:pointer;font-size:var(--fs-xs)"
      onClick=${()=>l(!0)} title="Send SIGTERM to this session's process tree">
      Kill
    </button>`}function ce({session:t,onClose:e}){const i=Gt(t.tool),l=t.files_loaded||[],a=t.files_touched||[],n=t.exact_input_tokens||0,r=t.exact_output_tokens||0,o=t.entity_state||null,c=o&&o.agents&&o.agents.length>0,v=o&&o.tasks&&o.tasks.length>0;return s`<div class="sd-container" style="border-left:3px solid ${i}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)" title=${t.tool}>${f(kt(t.tool))}</strong>
        ${t.project&&s`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${t.project}>${f(t.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--on-status);font-size:var(--fs-xs)">
          ${U(t.duration_s)}
        </span>
        ${c&&s`<span class="badge" style="background:var(--accent);color:var(--on-status);font-size:var(--fs-xs)">
          Team (${o.agents.length})
        </span>`}
        ${t.active&&s`<${re} sessionId=${t.session_id}/>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${t.session_id}>
        ${t.session_id}
      </div>
      ${e&&s`<button class="sd-close" onClick=${e} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${B} title="Actions" icon="zap" badge=${null} defaultOpen=${!0}>
      <${Ns} sessionId=${t.session_id}/>
    <//>
    <${B} title="Conversation" icon="message-square" defaultOpen=${!1}>
      <${qs} sessionId=${t.session_id} withheld=${t.content_retained===!1}/>
    <//>
    ${c&&s`<${B} title="Team" icon="users" badge=${o.agents.length+" agents"} defaultOpen=${!0}>
      <${Os} entityState=${o}/>
    <//>`}
    ${v&&s`<${B} title="Tasks" icon="clipboard-list" badge=${o.tasks.length} defaultOpen=${!0}>
      <${zs} tasks=${o.tasks}/>
    <//>`}
    <${B} title="Context" icon="book-open" badge=${l.length||null}>
      <${Vs} session=${t}/>
    <//>
    <${B} title="Memory" icon="brain" defaultOpen=${!1}>
      <${Ws} session=${t}/>
    <//>
    <${B} title="Resources" icon="layers" badge=${y(n+r)+" tok"}>
      <${Zs} session=${t}/>
    <//>
    <${B} title="Estimated cost by model" icon="banknote" defaultOpen=${!1}>
      <${oe} sessionId=${t.session_id}/>
    <//>
    <${B} title="Tool Calls" icon="wrench" defaultOpen=${!1}>
      <${ie} sessionId=${dt(t)}/>
    <//>
    <${B} title="Process Tree" icon="git-branch" defaultOpen=${!1}>
      <${le} sessionId=${t.session_id}/>
    <//>
    <${B} title="MCP Servers" icon="server" defaultOpen=${!1}>
      <${ne} sessionId=${t.session_id}/>
    <//>
    <${B} title="Deliverables" icon="package" badge=${a.length||null}>
      <${te} session=${t}/>
    <//>
    <${B} title="API Calls" icon="globe" defaultOpen=${!1}>
      <${se} sessionId=${t.session_id}/>
    <//>
    ${t.project&&s`<${B} title="Estimated project costs" icon="banknote" defaultOpen=${!1}>
      <${ee} project=${t.project}/>
    <//>`}
    ${t.project&&t.tool&&s`<${B} title="Run History" icon="line-chart" defaultOpen=${!1}>
      <${ae} project=${t.project} tool=${t.tool}/>
    <//>`}
  </div>`}function ut({tools:t,activeTool:e,onSelect:i}){var a;const l=(a=J(X))==null?void 0:a.snap;return t.length<=1?null:s`<div class="sf-tool-tabs">
    ${t.map(n=>s`<button key=${n} class="sf-tool-tab ${n===e?"active":""}"
      style="border-bottom-color:${n===e?Kt[n]||"var(--accent)":"transparent"}"
      onClick=${()=>i(n)}>
      <${xs} tool=${n} size="1em"/> ${f(kt(n,l))}
    </button>`)}
  </div>`}function Tt({sessions:t,activeId:e,onSelect:i,loading:l,error:a=null}){return l?s`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:a?s`<div class="sf-sess-tabs"><span class="error-state text-xs" style="padding:0">Failed to load sessions${a.message?` (${a.message})`:""}</span></div>`:t.length?s`<div class="sf-sess-tabs">
    ${t.map(n=>{const r=n.exact_input_tokens||n.input_tokens||0,o=n.exact_output_tokens||n.output_tokens||0,c=r+o,v=n.duration_s||(n.ended_at&&n.started_at?n.ended_at-n.started_at:0),u=n.session_id===e,$=!n.ended_at;return s`<button key=${n.session_id}
        title=${n.session_id}
        class="sf-sess-tab ${u?"active":""}"
        onClick=${()=>i(n.session_id)}>
        <span class="sf-stab-time">${xt(n.started_at)}</span>
        <span class="sf-stab-sid">${bs(n.session_id)}</span>
        <span class="sf-stab-dur">${U(v)}</span>
        ${c>0&&s`<span class="sf-stab-tok">${y(c)}t</span>`}
        ${(n.files_modified||0)>0&&s`<span class="sf-stab-files">${n.files_modified}f</span>`}
        ${$&&s`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:s`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function ss(t,e){if(!e)return"";let i=e;if(typeof e=="string")try{i=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof i!="object"||i===null)return String(e).slice(0,80);const l=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const n of l)if(i[n]){let r=String(i[n]);return(n==="file_path"||n==="path")&&r.length>60&&(r=Jt(r)),r.slice(0,100)}const a=Object.keys(i);return a.length>0?String(i[a[0]]).slice(0,80):""}const Ft={Bash:"#84cc16"};function Nt(t){return Ft[t]?Ft[t]:Xt(t)}function de({event:t}){if(t.type==="user_message")return t.redacted?s`<div class="sf-seq-tooltip">
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
      <div class="sf-tip-body">${f(t.message)}</div>
      ${t.prompt_length&&s`<div class="sf-tip-meta">${t.prompt_length} chars</div>`}
    </div>`:null;if(t.type==="api_call"){const e=t.tokens||{};return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Call${t.model?" — "+t.model:""}</div>
      ${t.agent_name&&s`<div class="sf-tip-meta">Agent: ${f(t.agent_name)}</div>`}
      <div class="sf-tip-meta">
        Input: ${y(e.input||0)} \u00B7 Output: ${y(e.output||0)}
        ${(e.cache_read||0)>0?" · Cache: "+y(e.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${t.duration_ms>0?"Duration: "+I(t.duration_ms):""}
        ${t.ttft_ms>0?" · TTFT: "+I(t.ttft_ms):""}
      </div>
      ${t.is_error&&s`<div class="sf-tip-meta" style="color:var(--red)">Error: ${f(t.error_type||"unknown")}</div>`}
    </div>`}if(t.type==="api_response"){const e=t.tokens||{},i=Number(t.http_status),l=Number.isFinite(i)&&i>=400;return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${t.model?" — "+t.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${y(e.output||0)} tokens
        ${t.duration_ms>0?" · Latency: "+I(t.duration_ms):""}
        ${t.finish_reason?" · "+t.finish_reason:""}
      </div>
      ${(t.error_type||t.http_status)&&s`<div class="sf-tip-meta">
        ${t.error_type?s`<span style="color:var(--red)">${f(String(t.error_type))}</span>`:""}
        ${t.error_type&&t.http_status?" · ":""}
        ${t.http_status?s`<span style="color:${l?"var(--red)":"var(--fg-muted)"}">HTTP ${f(String(t.http_status))}</span>`:""}
      </div>`}
      ${t.response_preview&&s`<div class="sf-tip-body">${f(t.response_preview)}</div>`}
    </div>`}if(t.type==="error")return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${f(t.error_type||"unknown")}</div>
      ${t.error_message&&s`<div class="sf-tip-body">${f(t.error_message)}</div>`}
      ${t.parent_span&&s`<div class="sf-tip-meta">During: ${f(t.parent_span)}</div>`}
    </div>`;if(t.type==="tool_use"){let e=null;if(t.params){let a=t.params;if(typeof a=="string")try{a=JSON.parse(a)}catch{a=null}a&&typeof a=="object"&&(e=Object.entries(a).filter(([,n])=>n!=null&&n!==""))}const i=t.input_preview||"",l=t.result_summary||"";return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${f(t.to||"Tool")}${t.subtype==="result"?" (result)":t.subtype==="decision"?" (decision)":""}</div>
      ${t.decision&&s`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${f(t.decision)}</strong></div>`}
      ${e?s`<div class="sf-tip-params">
            ${e.map(([a,n])=>{const r=String(n),o=r.length>120;return s`<div key=${a} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${f(a)}</span>
                <span class="sf-tip-param-val ${o?"sf-tip-param-long":""}" title=${r}>${f(o?r.slice(0,200)+"...":r)}</span>
              </div>`})}
          </div>`:t.params&&s`<div class="sf-tip-body mono">${f(t.params)}</div>`}
      ${i&&s`<div class="sf-tip-meta mono" style="margin-top:var(--sp-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${i}>input: ${f(i.length>200?i.slice(0,200)+"…":i)}</div>`}
      ${l&&s`<div class="sf-tip-meta mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${l}>result: ${f(l.length>200?l.slice(0,200)+"…":l)}</div>`}
      ${(t.success||t.duration_ms>0||t.result_size)&&s`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${t.success?"Success: "+t.success:""}
        ${t.duration_ms>0?" · "+I(t.duration_ms):""}
        ${t.result_size?" · Result: "+t.result_size+" bytes":""}
      </div>`}
    </div>`}return t.type==="subagent"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${f(t.to||"agent")}</div>
    </div>`:t.type==="hook"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${f(t.hook_name||"")}</div>
    </div>`:null}function pe({event:t,participants:e,hoveredIdx:i,idx:l,onHover:a}){const n=e.findIndex(k=>k.id===t._from),r=e.findIndex(k=>k.id===t._to);if(n<0||r<0)return null;const o=r>n,c=Math.min(n,r),v=Math.max(n,r),u=i===l,$=e.find(k=>k.id===t._to),_={user_message:"var(--green)",api_call:t.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:($==null?void 0:$.color)||"var(--cat-commands)",subagent:($==null?void 0:$.color)||"var(--yellow)",hook:"var(--orange)"}[t.type]||"var(--fg2)";let p="",m="";if(t.type==="user_message")t.redacted?p="prompt ("+(t.prompt_length||"?")+" chars)":(p=t.preview||"(prompt)",t.prompt_length&&(m=t.prompt_length+" chars"));else if(t.type==="api_call"){const k=t.tokens||{};p=t.agent_name||tt(t.model)||"API call",m=y((k.input||0)+(k.output||0))+"t",t.ttft_ms>0?m+=" ttft:"+I(t.ttft_ms):t.duration_ms>0&&(m+=" "+I(t.duration_ms)),t.is_error&&(m+=" ⚠")}else if(t.type==="api_response"){const k=t.tokens||{};p="← "+y(k.output||0)+"t",t.response_preview&&(p+=" "+t.response_preview.slice(0,60)),m=tt(t.model)||"",t.finish_reason&&t.finish_reason!=="stop"&&(m+=" ["+t.finish_reason+"]")}else if(t.type==="error")p="⚠ "+(t.error_type||"error"),m=t.error_message?t.error_message.slice(0,60):"";else if(t.type==="tool_use"){const k=t.to||"tool",w=ss(k,t.params);p=k+(w?": "+w:""),t.subtype==="result"?(m=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(m+=" "+I(t.duration_ms)),t.result_size&&(m+=" "+t.result_size+"B")):t.subtype==="decision"&&(m=t.decision||"")}else t.type==="subagent"?p=t.to||"subagent":t.type==="hook"&&(p=t.hook_name||"hook");const g=100/e.length,h=(c+.5)*g,x=(v+.5)*g;return s`<div class="sf-seq-row ${u?"hovered":""}"
    onMouseEnter=${()=>a(l)} onMouseLeave=${()=>a(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${t._cumTok>0?y(t._cumTok):""}</span>
      <span class="sf-seq-rttok">${t._rtTok>0?y(t._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${e.map((k,w)=>s`<div key=${w} class="sf-seq-lane"
        style="left:${(w+.5)*g}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${h}%;
        width:${x-h}%;
        border-color:${_};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${o?x:h}%;
        border-${o?"left":"right"}-color:${_};
        transform:translateX(${o?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(h+x)/2}%;
        color:${_};
      "><span class="sf-seq-label-text" title=${p}>${t.type==="user_message"&&t.redacted?s`<${L} name="lock" size="0.85em"/> `:""}${f(p)}</span>
        ${m&&s`<span class="sf-seq-sublabel">${m}</span>`}
      </div>
    </div>
    ${u&&s`<${de} event=${t}/>`}
  </div>`}function ue({event:t}){let e="",i="var(--fg2)",l="";return t.type==="session_start"?(e="Session started",i="var(--green)",l="▶"):t.type==="session_end"?(e="Session ended",i="var(--fg3)",l="■"):t.type==="compaction"&&(e="Compaction"+(t.compaction_count?" #"+t.compaction_count:""),i="var(--orange)",l="⟳"),s`<div class="sf-seq-marker" style="border-left-color:${i}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${i}">
      ${l} ${e}
      ${t.type==="compaction"&&t.duration_ms>0?" — "+I(t.duration_ms):""}
      ${t.cwd?s` <span class="text-muted text-xs mono">${f(t.cwd)}</span>`:""}
    </div>
  </div>`}const ve={user_message:{lane:"user",kind:"call"},api_call:{lane:"api",kind:"call"},api_response:{lane:"api",kind:"return"},error:{lane:"api",kind:"return"},tool_use:{lane:"tool",kind:"call"},subagent:{lane:"agent",kind:"call"},hook:{lane:"hook",kind:"recv"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"}},Bt={call:"◇",return:"◆",recv:"◌",marker:"■"},me={user:"var(--accent)",api:"var(--orange)",tool:"var(--cat-commands)",agent:"var(--cat-agent)",hook:"var(--cat-prompt)",session:"var(--green)",compact:"var(--yellow)"};function fe(t){if(t.type==="user_message")return{label:t.redacted?"🔒 prompt ("+(t.prompt_length||"?")+" chars)":t.preview||"(prompt)",meta:t.prompt_length?t.prompt_length+" chars":"",size:""};if(t.type==="api_call"){const e=t.tokens||{},i=(e.input||0)+(e.output||0),l=t.agent_name||tt(t.model)||"API call";let a=y(i)+"t";return t.ttft_ms>0?a+=" · ttft "+I(t.ttft_ms):t.duration_ms>0&&(a+=" · "+I(t.duration_ms)),t.is_error&&(a+=" ⚠"),{label:l,meta:a,size:""}}if(t.type==="api_response"){const i=(t.tokens||{}).output||0,l="← "+y(i)+"t"+(t.response_preview?" "+t.response_preview.slice(0,80):""),a=[tt(t.model),t.finish_reason&&t.finish_reason!=="stop"?"["+t.finish_reason+"]":""].filter(Boolean).join(" ");return{label:l,meta:a,size:i?y(i)+"t":""}}if(t.type==="error")return{label:"⚠ "+(t.error_type||"error"),meta:(t.error_message||"").slice(0,80),size:""};if(t.type==="tool_use"){const e=t.to||"tool",i=ss(e,t.params),l=e+(i?": "+i:"");let a="";t.subtype==="result"?(a=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(a+=" "+I(t.duration_ms))):t.subtype==="decision"&&(a=t.decision||"");const n=t.result_size?t.result_size+"B":"";return{label:l,meta:a,size:n}}return t.type==="subagent"?{label:t.to||"subagent",meta:"",size:""}:t.type==="hook"?{label:t.hook_name||"hook",meta:"",size:""}:t.type==="session_start"?{label:"▶ Session started",meta:t.cwd||"",size:""}:t.type==="session_end"?{label:"■ Session ended",meta:"",size:""}:t.type==="compaction"?{label:"⟳ Compaction"+(t.compaction_count?" #"+t.compaction_count:""),meta:t.duration_ms>0?I(t.duration_ms):"",size:""}:{label:t.type||"(event)",meta:"",size:""}}function $e(t){return{call:"requested",return:"returned",recv:"tokens",marker:"marker"}[t]||""}function ge({events:t,selectedIdx:e,onSelect:i}){return!t||t.length===0?null:s`<ul class="sv-list">
    ${t.map((l,a)=>{const n=ve[l.type]||{lane:"tool",kind:"call"},r=me[n.lane]||"var(--fg2)",o=fe(l),c=a===e,v=a===t.length-1;return s`<li key=${a} class="sv-li"><button
        type="button"
        class=${"sv-row"+(c?" sv-row--sel":"")}
        onClick=${()=>i&&i(a)}
        aria-current=${c?"true":"false"}>
        <div class="sv-when">
          <div class="sv-when-time">${Y(l.ts)}</div>
          ${(l._cumTok>0||l._rtTok>0)&&s`<div class="sv-when-tok">
            ${l._cumTok>0?y(l._cumTok)+" cum":""}
            ${l._rtTok>0?" · "+y(l._rtTok)+" rt":""}
          </div>`}
        </div>
        <div class="sv-spine">
          <span class="sv-spine-line ${v?"sv-spine-line--last":""}"></span>
          <span class="sv-dot" style=${"border-color:"+r+";color:"+r}>
            ${Bt[n.kind]||Bt.call}
          </span>
        </div>
        <div class="sv-body">
          <div class="sv-meta-row">
            <span class="sv-lane" style=${"color:"+r}>${n.lane}</span>
            <span class="sv-kind">${$e(n.kind)}</span>
          </div>
          <div class="sv-label" title=${o.label}>${f(o.label)}</div>
          ${o.meta&&s`<div class="sv-sub">${f(o.meta)}</div>`}
        </div>
        <div class="sv-size">
          ${o.size&&s`<span class="sv-size-chip">${f(o.size)}</span>`}
        </div>
      </button></li>`})}
  </ul>`}function he(t){const e=t.tokens||{};return t.type==="api_call"?y(e.input||0)+"t in":t.type==="api_response"?y(e.output||0)+"t out":t.type==="tool_use"?t.result_size?t.result_size+"B out":"—":t.type==="user_message"&&t.prompt_length?t.prompt_length+" chars in":"—"}function Rt(t){if(t==null||t==="")return"";if(typeof t=="string")try{const e=JSON.parse(t);return JSON.stringify(e,null,2)}catch{return t}try{return JSON.stringify(t,null,2)}catch{return String(t)}}function _e(t){return t.type==="user_message"?t.message||t.preview||"":t.type==="api_call"?t.request_preview||t.prompt_preview||"":t.type==="tool_use"?t.params||t.input_preview||"":t.type==="hook"&&t.hook_input||""}function ye(t){return t.type==="api_response"?t.response_preview||"":t.type==="api_call"&&t.is_error?t.error_message||"":t.type==="tool_use"?t.result_summary||t.result_preview||"":t.type==="error"?t.error_message||"":t.type==="hook"&&t.hook_output||""}function xe({event:t,onClose:e}){if(!t)return s`<div class="sv-insp sv-insp--empty">
      <div class="sv-insp-empty-tag">No selection</div>
      <div class="sv-insp-empty-msg">
        Choose any event in the timeline to read its full payload.
      </div>
    </div>`;const i=[["Type",t.type||""],["Started",Y(t.ts)],["Duration",t.duration_ms?I(t.duration_ms):"—"],["Bytes",he(t)],["Model",tt(t.model||"")||"—"],["Decision",t.decision||(t.success===!1?"failed":t.success===!0?"ok":"—")]],l=Rt(_e(t)),a=Rt(ye(t)),n=t.agent_name||t.to||t.hook_name||t.preview||t.type||"Event";return s`<div class="sv-insp" role="complementary" aria-label="Event details">
    <div class="sv-insp-head">
      <div>
        <div class="sv-insp-overline">Event \u00B7 ${t.type||""}</div>
        <div class="sv-insp-title">${f(n)}</div>
      </div>
      ${e&&s`<button class="sv-insp-close" onClick=${e} aria-label="Close inspector">\u00D7</button>`}
    </div>

    <div class="sv-insp-meta">
      ${i.map(([r,o])=>s`<div class="sv-insp-meta-row" key=${r}>
        <span class="sv-insp-meta-k">${r}</span>
        <span class="sv-insp-meta-v">${f(String(o||"—"))}</span>
      </div>`)}
    </div>

    ${l&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Input</span></div>
      <pre class="sv-insp-pre">${f(l)}</pre>
    </div>`}

    ${a&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Output</span></div>
      <pre class="sv-insp-pre">${f(a)}</pre>
    </div>`}
  </div>`}function be({summary:t}){return!t||!t.event_count?null:s`<div class="sf-summary">
    ${t.total_turns>0&&s`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${t.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${t.total_api_calls||0}</div></div>
    ${t.total_tool_uses>0&&s`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${t.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${y(t.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${y(t.total_input_tokens)}/${y(t.total_output_tokens)}</div></div>
    ${t.compactions>0&&s`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${t.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${U(t.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${t.event_count}</div></div>
  </div>`}function ke(t,e){const i=new Set,l=[],a=(n,r,o)=>{i.has(n)||(i.add(n),l.push({id:n,label:r||n,color:o||"var(--fg2)"}))};a("user","User","var(--green)"),a("tool",e||"AI Tool",Kt[e]||"var(--accent)");for(const n of t){if((n.type==="api_call"||n.type==="api_response"||n.type==="error")&&a("api","API","var(--accent)"),n.type==="tool_use"){const r=n.to||"tool";a("skill:"+r,r,Nt(r))}if(n.type==="subagent"){const r=n.to||"Subagent";a("subagent:"+r,r,Nt(r))}n.type==="hook"&&a("hook","Hooks","var(--orange)")}return l}const es="aictl-pref-session_flow_mode";function we(){try{return localStorage.getItem(es)==="swimlane"?"swimlane":"timeline"}catch{return"timeline"}}function Te(t){try{localStorage.setItem(es,t)}catch{}}function Se({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:i}=J(X),{sessions:l,loading:a,error:n,tools:r,toolSessions:o,activeTool:c,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=pt({globalRange:e,enabledTools:i}),[d,_]=b(null),[p,m]=b(!1),[g,h]=b(null),[x,k]=b(null),[w,D]=b(we),E=t!=null,P=E?t:u;O(()=>{if(!P){_(null);return}m(!0);const C=st(l,P),F=C!=null&&C.started_at?C.started_at-60:Date.now()/1e3-86400,K=C!=null&&C.ended_at?C.ended_at+60:Date.now()/1e3+60,T=C?dt(C):[P];wt(T,F,K).then(N=>{_(N),m(!1)}).catch(()=>{_(null),m(!1)})},[P,l.length]);const{processedTurns:M,participants:z}=q(()=>{const C=(d==null?void 0:d.turns)||[];if(!C.length)return{processedTurns:[],participants:[]};const F=C.map(A=>{const S={...A};return A.type==="user_message"?(S._from="user",S._to="tool"):A.type==="api_call"?(S._from=A.from||"tool",S._to="api"):A.type==="api_response"||A.type==="error"?(S._from="api",S._to="tool"):A.type==="tool_use"?(S._from="tool",S._to="skill:"+(A.to||"tool")):A.type==="subagent"?(S._from="tool",S._to="subagent:"+(A.to||"agent")):A.type==="hook"&&(S._from="tool",S._to="hook"),S});let K=0,T=0;for(const A of F){const S=A.tokens||{},R=(S.input||0)+(S.output||0);A.type==="user_message"&&(T=0),A.type==="api_call"&&(K+=R,T+=R),A._cumTok=K,A._rtTok=T}const N=ke(F,c);return{processedTurns:F,participants:N}},[d,c]),V=(d==null?void 0:d.summary)||{};O(()=>{k(null)},[P,w]);const W=C=>{D(C),Te(C)},G=x!=null?M[x]:null;return s`<div class="sf-container">
    ${!E&&s`<${ut} tools=${r} activeTool=${c} onSelect=${v}/>`}

    ${!E&&s`<${Tt} sessions=${o} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}

    <div class="sf-toolbar">
      <${be} summary=${V}/>
      <div class="sf-mode-toggle" role="radiogroup" aria-label="Timeline render mode">
        <button type="button" role="radio" aria-checked=${w==="timeline"}
          class=${"sf-mode-btn"+(w==="timeline"?" sf-mode-btn--active":"")}
          onClick=${()=>W("timeline")}>Timeline</button>
        <button type="button" role="radio" aria-checked=${w==="swimlane"}
          class=${"sf-mode-btn"+(w==="swimlane"?" sf-mode-btn--active":"")}
          onClick=${()=>W("swimlane")}>Swim-lane</button>
      </div>
    </div>

    <div class=${"sf-seq-container"+(w==="timeline"?" sf-seq-container--split":"")}>
      ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading session flow...</div>`:M.length===0?s`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No flow data for this session.</p>
              <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
                Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
              </p>
            </div>`:w==="timeline"?s`<div class="sv-pane">
                <${ge} events=${M}
                  selectedIdx=${x} onSelect=${k}/>
              </div>
              <aside class="sv-aside">
                <${xe} event=${G}
                  onClose=${()=>k(null)}/>
              </aside>`:s`
              <div class="sf-seq-header">
                <div class="sf-seq-tokens">
                  <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                  <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
                </div>
                <div class="sf-seq-time"></div>
                <div class="sf-seq-arrow-area">
                  ${z.map((C,F)=>{const K=100/z.length;return s`<div key=${C.id} class="sf-seq-participant"
                      style="left:${(F+.5)*K}%;color:${C.color}">
                      <div class="sf-seq-participant-box" style="border-color:${C.color}">${f(C.label)}</div>
                    </div>`})}
                </div>
              </div>
              <div class="sf-seq-body">
                ${M.map((C,F)=>C._from&&C._to?s`<${pe} key=${F} event=${C} participants=${z}
                      hoveredIdx=${g} idx=${F} onHover=${h}/>`:s`<${ue} key=${F} event=${C} participants=${z}/>`)}
              </div>
            `}
    </div>
  </div>`}function Ce({sessions:t,activeId:e,onSelect:i,loading:l,error:a=null}){return l?s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`:a?s`<div class="error-state" style="padding:var(--sp-3);font-size:var(--fs-sm)">Failed to load sessions${a.message?` (${a.message})`:""}</div>`:t.length?s`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${t.slice(0,20).map(n=>{const r=n.session_id===e,o=n.ended_at?Math.round(n.ended_at-n.started_at):0,c=o>0?I(o*1e3):"⏳ live",v=Y(n.started_at);return s`<button key=${n.session_id}
        class="tr-sess-btn ${r?"tr-sess-active":""}"
        onClick=${()=>i(n.session_id)}
        title=${n.session_id}>
        <span class="tr-sess-time">${v}</span>
        <span class="tr-sess-dur">${c}</span>
        ${n.is_live?s`<span class="tr-sess-live">\u25CF</span>`:null}
      </button>`})}
  </div>`:s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function it(t,e){return t?t.length>e?t.slice(0,e)+"…":t:""}const Ae={tool_use:"wrench",api_call:"globe",api_response:"mail",file_edit:"file-pen",compaction:"archive",subagent:"bot",error:"x"},Ee={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function Me({action:t,turnTs:e}){const i=Ae[t.kind],l=Ee[t.kind]||"var(--fg2)",a=t.ts-e,n=a>0?"+"+(a<1?a.toFixed(1):Math.round(a))+"s":"",r=t.duration_ms>0?I(t.duration_ms):"",o=t.tokens,c=o?y((o.input||0)+(o.output||0)):"";return s`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${l}">${i?s`<${L} name=${i} size="0.95em"/>`:"•"}</span>
    <span class="tr-action-name" style="color:${l}">${f(t.name||t.kind)}</span>
    ${t.input_summary?s`<span class="tr-action-args">${f(it(t.input_summary,80))}</span>`:null}
    ${t.output_summary?s`<span class="tr-action-result">${f(it(t.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${n?s`<span class="tr-action-offset">${n}</span>`:null}
      ${r?s`<span class="tr-action-dur">${r}</span>`:null}
      ${c?s`<span class="tr-action-tok"><${L} name="coins" size="0.9em"/> ${c}</span>`:null}
      ${t.success===!1?s`<span class="tr-action-fail">\u2717</span>`:null}
      ${t.success===!0?s`<span class="tr-action-ok">\u2713</span>`:null}
    </span>
  </div>`}function Pe(t,e){var a;const i=[],l=n=>{const r=String(n||"").trim();r&&!i.includes(r)&&i.push(r)};l(t.response);for(const n of e)n.kind==="api_response"&&l(((a=n.detail)==null?void 0:a.response)||n.response||n.output_summary);return i.join(`

`)}function Le({turn:t,index:e,expanded:i,onToggle:l,withheld:a}){const n=t.prompt&&t.prompt.length>0,r=t.actions||[],o=Pe(t,r),c=o.length>0,v=r.filter(m=>m.kind==="tool_use"),u=r.filter(m=>m.kind==="api_call"),$=r.filter(m=>m.kind==="error"),d=t.tokens||{},_=(d.input||0)+(d.output||0),p=t.wall_ms||t.duration_ms||0;return s`<div class="tr-turn ${i?"tr-turn-expanded":""}">
    <button type="button" class="tr-turn-header" onClick=${l} aria-expanded=${i}>
      <span class="tr-turn-num">${e+1}</span>
      <span class="tr-turn-meta">
        <span class="tr-turn-time">${Y(t.ts)}</span>
        ${t.model?s`<span class="tr-turn-model">${tt(t.model)}</span>`:null}
        ${p>0?s`<span class="tr-turn-dur">${I(p)}</span>`:null}
      </span>
      <span class="tr-turn-stats">
        ${_>0?s`<span class="tr-stat" title="Tokens"><${L} name="coins" size="0.9em"/> ${y(_)}</span>`:null}
        ${v.length>0?s`<span class="tr-stat" title="Tool uses"><${L} name="wrench" size="0.9em"/> ${v.length}</span>`:null}
        ${u.length>0?s`<span class="tr-stat" title="API calls"><${L} name="globe" size="0.9em"/> ${u.length}</span>`:null}
        ${$.length>0?s`<span class="tr-stat tr-stat-err" title="Errors"><${L} name="x" size="0.9em"/> ${$.length}</span>`:null}
      </span>
      <span class="tr-turn-chevron" aria-hidden="true">${i?"▾":"▸"}</span>
    </button>

    ${n?s`<div class="tr-prompt ${i?"tr-prompt-full":""}">
      <div class="tr-prompt-icon"><${L} name="user" size="1em"/></div>
      <div class="tr-prompt-text">${i?t.prompt:it(t.prompt_preview||t.prompt,120)}</div>
    </div>`:s`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon"><${L} name="user" size="1em"/></div>
      <div class="tr-prompt-text text-muted">${a?"(text not retained)":"(no prompt captured)"}</div>
    </div>`}

    ${c?s`<div class="tr-response ${i?"tr-response-full":""}">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text">${i?o:it(t.response_preview||o,160)}</div>
    </div>`:i?s`<div class="tr-response tr-response-empty">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text text-muted">(no response captured)</div>
    </div>`:null}

    ${i&&r.length>0?s`<div class="tr-actions">
      ${r.map((m,g)=>s`<${Me} key=${g} action=${m} turnTs=${t.ts}/>`)}
    </div>`:null}

    ${i&&_>0?s`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${d.input||0}" title="Input: ${y(d.input||0)}">
        ${d.input>0?"in "+y(d.input):""}
      </div>
      ${d.cache_read>0?s`<div class="tr-token-seg tr-tok-cache"
        style="flex:${d.cache_read}" title="Cache read: ${y(d.cache_read)}">
        cache ${y(d.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${d.output||0}" title="Output: ${y(d.output||0)}">
        ${d.output>0?"out "+y(d.output):""}
      </div>
    </div>`:null}
  </div>`}function Oe({summary:t,transcript:e}){return t?s`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns"><${L} name="message-square" size="0.9em"/> ${t.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls"><${L} name="globe" size="0.9em"/> ${t.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses"><${L} name="wrench" size="0.9em"/> ${t.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens"><${L} name="coins" size="0.9em"/> ${y(t.total_tokens||0)}</span>
    ${t.compactions>0?s`<span class="tr-summary-item" title="Compactions"><${L} name="archive" size="0.9em"/> ${t.compactions}</span>`:null}
    ${t.errors>0?s`<span class="tr-summary-item tr-stat-err" title="Errors"><${L} name="x" size="0.9em"/> ${t.errors}</span>`:null}
    ${t.subagents>0?s`<span class="tr-summary-item" title="Subagents"><${L} name="bot" size="0.9em"/> ${t.subagents}</span>`:null}
    ${t.duration_s>0?s`<span class="tr-summary-item" title="Duration"><${L} name="clock" size="0.9em"/> ${I(t.duration_s*1e3)}</span>`:null}
    ${e!=null&&e.model?s`<span class="tr-summary-item" title="Model"><${L} name="brain-circuit" size="0.9em"/> ${tt(e.model)}</span>`:null}
    ${e!=null&&e.is_live?s`<span class="tr-summary-live">\u25CF LIVE</span>`:null}
    <span class="tr-summary-source">${t.source||""}</span>
  </div>`:null}function ze(t){if(!t||!t.turns||t.turns.length===0)return!1;const e=t.turns[0];return e.type!=null&&e.actions==null}function jt(t,e){if(!t||!t.turns)return null;const i=t.turns||[],l=[];let a=null;const n=(o,c)=>{!o||!c||(o.response=o.response?o.response+`

`+c:c,o.response_preview=o.response.slice(0,200))},r={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const o of i)if(o.type==="user_message"){if(a&&l.push(a),a={ts:o.ts,end_ts:o.end_ts||o.ts,prompt:o.message||"",prompt_preview:o.preview||(o.message||"").slice(0,200),response:o.response||"",response_preview:o.response_preview||(o.response||"").slice(0,200),model:o.model||"",tokens:o.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:o.api_calls||0,duration_ms:o.duration_ms||0,wall_ms:o.wall_ms||0,actions:[],tool_use_count:0},o.tools&&o.tools.length>0){for(const c of o.tools)a.actions.push({ts:c.ts||o.ts,kind:c.is_agent?"subagent":"tool_use",name:c.name||"",input_summary:c.args_summary||"",duration_ms:c.duration_ms||0});a.tool_use_count=o.tools.length}}else{if(o.type==="session_start"||o.type==="session_end")continue;if(o.type==="compaction")continue;if(a){const c=r[o.type];c&&(a.actions.push({ts:o.ts,kind:c,name:o.model||o.to||o.tool_name||o.hook_name||"",input_summary:o.params||o.decision||"",output_summary:o.response_preview||o.error_message||"",duration_ms:o.duration_ms||0,tokens:o.tokens,success:o.success==="true"?!0:o.success==="false"?!1:void 0,detail:o.response?{response:o.response}:void 0}),c==="api_response"&&n(a,o.response||o.response_preview||""),c==="tool_use"&&a.tool_use_count++,c==="api_call"&&o.tokens&&(a.tokens.input+=o.tokens.input||0,a.tokens.output+=o.tokens.output||0,a.tokens.cache_read+=o.tokens.cache_read||0,a.api_calls++))}else{const c=r[o.type];c&&c!=="api_response"&&(a={ts:o.ts,end_ts:o.ts,prompt:"",prompt_preview:"",response:"",response_preview:"",model:o.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},a.actions.push({ts:o.ts,kind:c,name:o.model||o.to||o.tool_name||"",input_summary:o.params||o.decision||"",output_summary:o.response_preview||o.error_message||"",duration_ms:o.duration_ms||0,tokens:o.tokens,success:o.success==="true"?!0:o.success==="false"?!1:void 0,detail:o.response?{response:o.response}:void 0}),c==="api_response"&&n(a,o.response||o.response_preview||""),c==="tool_use"&&a.tool_use_count++,c==="api_call"&&o.tokens&&(a.tokens.input+=o.tokens.input||0,a.tokens.output+=o.tokens.output||0,a.tokens.cache_read+=o.tokens.cache_read||0,a.api_calls++))}}a&&l.push(a);for(const o of l)if(o.tokens.total=(o.tokens.input||0)+(o.tokens.output||0),o.actions.length>0){const c=o.actions[o.actions.length-1];o.end_ts=Math.max(o.end_ts||0,c.ts+(c.duration_ms||0)/1e3)}return{session_id:e,turns:l,summary:t.summary||{},is_live:!1}}function Ie({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:i}=J(X),{sessions:l,loading:a,error:n,tools:r,toolSessions:o,activeTool:c,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=pt({globalRange:e,enabledTools:i}),[d,_]=b(null),[p,m]=b(!1),[g,h]=b(new Set),[x,k]=b(!1),[w,D]=b(!0),E=t!=null,P=E?t:u,M=Q(()=>{if(!P){_(null);return}m(!0);const T=st(l,P),N=T?dt(T):[P];ks(N).then(A=>{ze(A)?_(jt(A,P)):_(A),m(!1)}).catch(()=>{const A=T!=null&&T.started_at?T.started_at-60:Date.now()/1e3-86400,S=T!=null&&T.ended_at?T.ended_at+60:Date.now()/1e3+60;wt(N,A,S).then(R=>{_(jt(R,P)),m(!1)}).catch(()=>{_(null),m(!1)})})},[P,l]);O(M,[M]),O(()=>{if(!w||!(d!=null&&d.is_live))return;const T=setInterval(M,5e3);return()=>clearInterval(T)},[w,d==null?void 0:d.is_live,M]);const z=Q(T=>{h(N=>{const A=new Set(N);return A.has(T)?A.delete(T):A.add(T),A})},[]),V=Q(()=>{const T=(d==null?void 0:d.turns)||[];x?(h(new Set),k(!1)):(h(new Set(T.map((N,A)=>A))),k(!0))},[x,d]),W=l.find(T=>T.session_id===P),G=Ot(W)||Ot(d),{data:C}=ws(()=>Ts(),[]),F=((d==null?void 0:d.turns)||[]).filter(T=>T.prompt&&T.prompt.length>0||T.actions&&T.actions.length>0||T.tool_use_count>0||G&&(T.ts||T.tokens)),K=(d==null?void 0:d.summary)||null;return s`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${F.length>0?s`<button class="tc-filter-btn" onClick=${V}
          style="font-size:var(--fs-xs)">
          ${x?"⊡ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${d!=null&&d.is_live?s`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${w}
            onChange=${T=>D(T.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    ${!E&&r.length>1&&s`<${ut} tools=${r} activeTool=${c} onSelect=${v}/>`}

    ${!E&&s`<${Ce} sessions=${o} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}

    <${Oe} summary=${K} transcript=${d}/>

    ${G&&s`<${Zt} mode=${C==null?void 0:C.capture_mode}/>`}

    <div class="tr-turns">
      ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`:F.length===0?G?null:s`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                No prompt or tool events were captured for this session.
              </p>
            </div>`:F.map((T,N)=>s`<${Le}
              key=${N} turn=${T} index=${N} withheld=${G}
              expanded=${g.has(N)}
              onToggle=${()=>z(N)}/>`)}
    </div>
  </div>`}const qt={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function rt(t){return t?qt[t]?qt[t]:Xt(t):"var(--fg2)"}function bt(t){return t?new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Ht(t){return t<60?Math.round(t)+"s":t<3600?Math.round(t/60)+"m":t<86400?(t/3600).toFixed(1)+"h":(t/86400).toFixed(1)+"d"}function St(t){const e=t.tokens||{};return(e.input||0)+(e.output||0)}function Ct(t){const e=t.tokens||{};return(e.cache_read||0)+(e.cache_creation||0)}function De(t){return St(t)+Ct(t)}function Vt(t,e){return e==="fresh"?St(t):e==="cached"?Ct(t):De(t)}function ct(t){return t.type==="user_message"?"Prompt":t.type==="api_call"||t.type==="api_response"?t.model||"API":t.type==="tool_use"?t.to||t.name||"Tool":t.type==="subagent"?t.to||"Agent":t.type==="compaction"?"Compaction":t.type==="error"?"Error":t.type==="hook"?t.hook_name||"Hook":t.type||"?"}function Fe({bar:t,x:e,y:i}){if(!t)return null;const l=t,a=l.tokens||{},n=ct(l);return s`<div class="tc-tooltip" style="left:${e}px;top:${i}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${rt(n)}"></span>
      ${f(n)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${bt(l.ts)}</span></div>
    ${l.type==="user_message"&&l.message&&s`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${f((l.message||"").slice(0,300))}</span>
      </div>`}
    ${(l.type==="api_call"||l.type==="api_response")&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${l.model||"?"}</span></div>`}
    ${l.type==="tool_use"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${l.to||l.name||"?"}</span></div>
      ${l.params&&s`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${f(String(l.params).slice(0,200))}</span>
      </div>`}`}
    ${l.type==="subagent"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${l.to||"?"}</span></div>`}
    ${l.duration_ms>0&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${I(l.duration_ms)}</span></div>`}
    ${a.input||a.output||a.cache_read?s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${y(a.input||0)} out:${y(a.output||0)}${a.cache_read?" cache:"+y(a.cache_read):""}${a.cache_creation?" cache_w:"+y(a.cache_creation):""}</span>
      </div>`:null}
    ${l.type==="error"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${l.error_type||""}: ${(l.error_message||"").slice(0,100)}</span></div>`}
    ${l.type==="compaction"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${l.compaction_count||""}</span></div>`}
    ${l.agent_name&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${l.agent_name}</span></div>`}
  </div>`}function Ne({summary:t}){if(!t||!t.total_tokens)return null;const e=[["Prompts",t.total_turns],["API Calls",t.total_api_calls],["Tools",t.total_tool_uses],["Tokens",y(t.total_tokens)],["Duration",U(t.duration_s)]].filter(([,i])=>i);return s`<div class="tc-summary">
    ${e.map(([i,l])=>s`<div class="tc-summary-item">
      <div class="tc-summary-val">${l}</div>
      <div class="tc-summary-label">${i}</div>
    </div>`)}
  </div>`}const ot=110,Be=16,Ut=ot+Be,Re=30;function je(t){const e=[];for(let i=0;i<t.length;i++){if(i>0){const l=t[i].ts-t[i-1].ts;l>Re&&e.push({type:"gap",endTs:t[i-1].ts,startTs:t[i].ts,gap:l})}e.push({type:"bar",bar:t[i]})}return e}function qe({entities:t,selected:e,onToggle:i,onAll:l,onNone:a}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${l}>All</button>
    <button class="tc-filter-btn" onClick=${a}>None</button>
    ${t.map(n=>{const r=e.has(n);return s`<label key=${n} class="tc-filter-check ${r?"active":""}"
        style="--swatch:${rt(n)}">
        <input type="checkbox" checked=${r}
          onChange=${()=>i(n)}/>
        <span class="tc-legend-swatch" style="background:${rt(n)}"></span>
        ${f(n)}
      </label>`})}
  </div>`}function He({mode:t,onChange:e}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([l,a])=>s`<label key=${l}
      class="tc-filter-check ${t===l?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${t===l}
        onChange=${()=>e(l)}/>
      ${a}
    </label>`)}
  </div>`}function Ve({bars:t,tokenMode:e,onHover:i,onLeave:l}){if(!t.length)return s`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
    <small class="empty-state-source">/api/session-flow · turns[]</small>
  </div>`;const a=je(t),n=Math.max(1,...t.map(v=>Vt(v,e))),r=[];a.forEach((v,u)=>{v.type==="bar"&&r.push(u)});const o=Math.max(1,Math.floor(r.length/Math.ceil(r.length/20))),c=new Set;return r.forEach((v,u)=>{(u===0||u===r.length-1||u%o===0)&&c.add(v)}),s`<div class="tc-flow">
    ${a.map((v,u)=>{if(v.type==="gap"){const M=bt(v.endTs)+" → "+bt(v.startTs)+"  ("+Ht(v.gap)+" gap)";return s`<div key=${"g"+u} class="tc-flow-slot" style="height:${Ut}px" title=${M}>
          <div class="tc-flow-gap-line" style="height:${ot}px"></div>
          <div class="tc-flow-time">${Ht(v.gap)}</div>
        </div>`}const $=v.bar,d=Vt($,e),_=n>0?Math.max(.08,Math.log1p(d)/Math.log1p(n)):.08,p=Math.max(6,_*ot),m=ct($),g=rt(m),h=St($),x=Ct($),k=h+x;let w,D;e==="cached"?(w=0,D=100):e==="fresh"?(w=100,D=0):k>0?(w=Math.round(h/k*100),D=100-w):(w=100,D=0);const E=D>0,P=c.has(u);return s`<div key=${u} class="tc-flow-slot" style="height:${Ut}px"
        tabindex="0" role="img"
        aria-label=${m+" at "+xt($.ts)+", "+y(d)+" tokens"}
        onMouseEnter=${M=>i($,M)}
        onMouseLeave=${l}
        onFocus=${M=>{const z=M.currentTarget.getBoundingClientRect();i($,{clientX:z.left+z.width/2,clientY:z.top})}}
        onBlur=${l}>
        <div class="tc-flow-bar-area" style="height:${ot}px">
          <div class="tc-flow-fill ${E?"tc-split":""}"
            style="height:${p}px;--bar-color:${g}">
            ${E&&s`
              ${w>0&&s`<div class="tc-fill-fresh" style="height:${w}%"></div>`}
              <div class="tc-fill-cached" style="height:${w>0?D:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${P?xt($.ts):""}</div>
      </div>`})}
  </div>`}function Ue({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:i}=J(X),{sessions:l,loading:a,error:n,tools:r,toolSessions:o,activeTool:c,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=pt({globalRange:e,enabledTools:i}),[d,_]=b(null),[p,m]=b(!1),[g,h]=b(null),[x,k]=b(null),[w,D]=b("all"),E=Yt(null),P=t!=null,M=P?t:u;O(()=>{if(!M){_(null);return}m(!0);const S=st(l,M),R=S!=null&&S.started_at?S.started_at-60:Date.now()/1e3-86400,j=S!=null&&S.ended_at?S.ended_at+60:Date.now()/1e3+60,Z=S?dt(S):[M];wt(Z,R,j).then(vt=>{_(vt),m(!1),k(null)}).catch(()=>{_(null),m(!1)})},[M,l.length]);const{allBars:z,allEntities:V}=q(()=>{const R=((d==null?void 0:d.turns)||[]).filter(Z=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(Z.type)),j=new Set;for(const Z of R)j.add(ct(Z));return{allBars:R,allEntities:[...j].sort()}},[d]),W=x||new Set(V),G=q(()=>z.filter(S=>W.has(ct(S))),[z,W]),C=Q(S=>{k(R=>{const j=new Set(R||V);return j.has(S)?j.delete(S):j.add(S),j})},[V]),F=Q(()=>k(null),[]),K=Q(()=>k(new Set),[]),T=Q((S,R)=>{var At;const j=(At=E.current)==null?void 0:At.getBoundingClientRect();if(!j)return;const Z=Math.min(R.clientX-j.left+12,j.width-320),vt=R.clientY-j.top+12;h({bar:S,x:Z,y:vt})},[]),N=Q(()=>h(null),[]),A=(d==null?void 0:d.summary)||{};return s`<div class="tc-container" ref=${E}>
    ${!P&&s`<${ut} tools=${r} activeTool=${c} onSelect=${v}/>`}
    ${!P&&s`<${Tt} sessions=${o} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}
    <${Ne} summary=${A}/>

    ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:z.length===0?s`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
            <small class="empty-state-source">/api/session-flow · turns[] (filtered to user_message, api_call, api_response, tool_use, compaction, subagent, error, hook)</small>
          </div>`:s`
          <div class="tc-controls">
            <${qe} entities=${V} selected=${W}
              onToggle=${C} onAll=${F} onNone=${K}/>
            <${He} mode=${w} onChange=${D}/>
          </div>
          <${Ve} bars=${G} tokenMode=${w}
            onHover=${T} onLeave=${N}/>
          ${g&&s`<${Fe} bar=${g.bar} x=${g.x} y=${g.y}/>`}
        `}
  </div>`}function We(t){return t?new Date(t*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}):"-"}function Ge(t,e=140){if(t==null)return"";let i;try{i=typeof t=="string"?t:JSON.stringify(t)}catch{i=String(t)}return i.length<=e?i:i.slice(0,e)+"..."}function Ke(t){try{return JSON.stringify(t??{},null,2)}catch{return String(t??"")}}function Je({sessionId:t,since:e,until:i}){const[l,a]=b(()=>new Set),{data:n,loading:r,error:o}=H(()=>Qt(t,{since:e,until:i,limit:500}).then(u=>{const $=Array.isArray(u)?u:[];return $.sort((d,_)=>(_.ts||0)-(d.ts||0)),$}),[t,e,i],{enabled:!!t}),c=q(()=>(n||[]).map((u,$)=>{const d=String(u.kind||""),_=/permission|error|fail/i.test(d);return{key:`${u.ts||0}:${u.kind||""}:${u.tool||""}:${$}`,time:We(u.ts),kind:d,tool:u.tool||"-",preview:Ge(u.detail),detailText:Ke(u.detail),isWarn:_}}),[n]),v=u=>{a($=>{const d=new Set($);return d.has(u)?d.delete(u):d.add(u),d})};return t?r?s`<p class="empty-state">Loading events...</p>`:o?s`<p class="error-state">Error: ${(o==null?void 0:o.message)||"Failed to load events"}</p>`:c.length?s`<div class="es-events-wrap">
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
        ${c.map(u=>s`
          <tr key=${u.key}
            class=${`es-events-row ${u.isWarn?"is-alert":""}`}
            onClick=${()=>v(u.key)}>
            <td class="mono text-xs">
              <button type="button" class="es-events-toggle"
                aria-expanded=${l.has(u.key)}
                aria-label=${"Toggle detail for "+(u.kind||"event")+" at "+u.time}
                onClick=${$=>{$.stopPropagation(),v(u.key)}}>${u.time}</button>
            </td>
            <td class="mono text-xs">${f(u.kind)}</td>
            <td class="text-xs">${f(u.tool)}</td>
            <td class="mono text-xs" title=${u.preview}>${f(u.preview)}</td>
          </tr>
          ${l.has(u.key)&&s`
            <tr key=${u.key+":detail"} class="es-events-detail-row">
              <td colspan="4">
                <pre class="es-events-detail">${f(u.detailText)}</pre>
              </td>
            </tr>
          `}
        `)}
      </tbody>
    </table>
  </div>`:s`<p class="empty-state">No events for this session in the selected range.</p>`:s`<p class="empty-state">Select a session to view events.</p>`}const Xe=28;function Ye(t,e=60){if(!t||!t.length)return[[],[]];const i=new Map;for(const n of t){if(!n||n.ts==null)continue;const r=Math.floor(n.ts/e)*e;i.set(r,(i.get(r)||0)+(n.value??0))}const l=[...i.keys()].sort((n,r)=>n-r),a=l.map(n=>i.get(n));return[l,a]}async function $t(t,e){const i=e.started_at;if(!i)return[[],[]];const l=e.ended_at,a=await Et(t,{since:i,limit:500,tags:{session_id:e.session_id}});let n=Array.isArray(a)?a:[];if(!n.length&&e.tool){const c=await Et(t,{since:i,limit:500,tags:{"aictl.tool":e.tool}});n=Array.isArray(c)?c:[]}l&&(n=n.filter(c=>c.ts!=null&&c.ts<=l));const r=n.map(c=>c.ts),o=n.map(c=>c.value??0);return[r,o]}async function Qe(t){if(!t.started_at)return[[],[]];const e=await Qt(t.session_id,{since:t.started_at,until:t.ended_at??void 0,limit:1e3}),i=Array.isArray(e)?e:[],l=[];for(const a of i){if(!a||a.ts==null||!String(a.kind||"").includes("api_request"))continue;const r=a.detail&&typeof a.detail=="object"?a.detail:{},o=Number(r.input_tokens??r["gen_ai.usage.input_tokens"]??0)||0,c=Number(r.output_tokens??r["gen_ai.usage.output_tokens"]??0)||0;l.push({ts:a.ts,value:o+c})}return Ye(l,60)}function nt({label:t,data:e,color:i,fmtVal:l,loading:a,error:n}){const r=e&&e[0]&&e[0].length>=2;return s`<div class="session-spark" title=${t}>
    <div class="session-spark-label">${t}</div>
    <div class="session-spark-chart">
      ${a?s`<span class="text-muted text-xs">\u2026</span>`:n?s`<span class="text-muted text-xs" title=${n}>\u2014</span>`:r?s`<${Ss} data=${e} color=${i}
                height=${Xe} fmtVal=${l}
                ariaLabel=${t+" sparkline"}/>`:s`<span class="text-muted text-xs">no data</span>`}
    </div>
  </div>`}function Ze({session:t}){const[e,i]=b({data:null,loading:!0,error:null}),[l,a]=b({data:null,loading:!0,error:null}),[n,r]=b({data:null,loading:!0,error:null}),[o,c]=b({data:null,loading:!0,error:null}),v=t==null?void 0:t.session_id,u=t==null?void 0:t.started_at,$=t==null?void 0:t.ended_at;O(()=>{if(!v)return;let g=!1;return i({data:null,loading:!0,error:null}),a({data:null,loading:!0,error:null}),r({data:null,loading:!0,error:null}),c({data:null,loading:!0,error:null}),$t("process.cpu.utilization",t).then(h=>{g||i({data:h,loading:!1,error:null})}).catch(h=>{g||i({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),$t("process.memory.usage",t).then(h=>{g||a({data:h,loading:!1,error:null})}).catch(h=>{g||a({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),$t("process.disk.io",t).then(h=>{g||r({data:h,loading:!1,error:null})}).catch(h=>{g||r({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),Qe(t).then(h=>{g||c({data:h,loading:!1,error:null})}).catch(h=>{g||c({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),()=>{g=!0}},[v,u,$]);const d=q(()=>g=>(g*100).toFixed(0)+"%",[]),_=q(()=>g=>y(g)+"B",[]),p=q(()=>g=>y(g)+"B",[]),m=q(()=>g=>y(g)+"/min",[]);return v?s`<div class="session-sparklines" aria-label="Session sparklines">
    <${nt} label="CPU" data=${e.data} color="var(--blue)"
      loading=${e.loading} error=${e.error} fmtVal=${d}/>
    <${nt} label="Mem" data=${l.data} color="var(--green)"
      loading=${l.loading} error=${l.error} fmtVal=${_}/>
    <${nt} label="I/O" data=${n.data} color="var(--orange)"
      loading=${n.loading} error=${n.error} fmtVal=${p}/>
    <${nt} label="Tok/min" data=${o.data} color="var(--purple, var(--accent))"
      loading=${o.loading} error=${o.error} fmtVal=${m}/>
  </div>`:null}function gt(t){if(!t.length)return 0;const e=[...t].sort((l,a)=>l-a),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2}function ta(t,e){if(!e||e<=0)return{dir:"flat",pct:0};const i=(t-e)/e;return Math.abs(i)<.05?{dir:"flat",pct:i}:{dir:i>0?"up":"down",pct:i}}function ht({label:t,value:e,formatted:i,med:l,fmt:a}){const n=ta(e,l),r=n.dir==="flat"?"var(--fg2)":n.dir==="up"?"var(--red)":"var(--green)",o=n.dir==="flat"?"·":n.dir==="up"?"↑":"↓",c=n.dir==="flat"?"~":(n.pct>0?"+":"")+Math.round(n.pct*100)+"%",v=l>0?" · median "+a(l):"";return s`<div class="run-trend-metric"
      title=${t+": current "+a(e)+v}>
    <span class="run-trend-label">${t}</span>
    <span class="run-trend-value">${i}</span>
    <span class="run-trend-delta" style="color:${r}"
        data-dir=${n.dir}
        aria-label=${t+" "+(n.dir==="flat"?"unchanged":n.dir==="up"?"up":"down")+" "+c}>
      ${o} ${c}
    </span>
  </div>`}function sa({sessionId:t,project:e,tool:i,currentDurationS:l=0,currentTokens:a=0,currentFileChurn:n=0}){const[r,o]=b(null);if(O(()=>{if(!e||!i){o(null);return}let d=!1;return Wt(e,i,30,20).then(_=>{d||o(Array.isArray(_)?_:[])}).catch(()=>{d||o([])}),()=>{d=!0}},[e,i]),!e||!i||r===null)return null;const c=r.filter(d=>d.session_id!==t).slice(0,5);if(c.length<2)return s`<div class="run-trend-strip run-trend-empty"
        role="group" aria-label="Run trend (not enough history)">
      <span class="run-trend-label">Run trend</span>
      <span class="run-trend-empty-msg">Not enough prior runs for comparison (need ≥2).</span>
    </div>`;const v=gt(c.map(d=>d.duration_s||0)),u=gt(c.map(d=>d.total_tokens||0)),$=gt(c.map(d=>d.file_churn||0));return s`<div class="run-trend-strip"
      role="group"
      aria-label="Run trend vs last ${c.length} runs">
    <span class="run-trend-header" title="Compared against median of last ${c.length} runs">
      vs last ${c.length} runs
    </span>
    <${ht} label="Duration" value=${l}
      formatted=${U(l)} med=${v} fmt=${U}/>
    <${ht} label="Tokens" value=${a}
      formatted=${y(a)+"t"} med=${u}
      fmt=${d=>y(d)+"t"}/>
    <${ht} label="Files" value=${n}
      formatted=${String(n)} med=${$}
      fmt=${d=>String(Math.round(d))}/>
  </div>`}const _t=20;function ea({session:t}){const[e,i]=b(!1),[l,a]=b(null),[n,r]=b(!1),[o,c]=b(null),v=Yt(null),u=t&&t.commit_count?t.commit_count:l?l.commits.length:0;if(O(()=>{if(!e)return;const d=p=>{v.current&&!v.current.contains(p.target)&&i(!1)},_=p=>{p.key==="Escape"&&i(!1)};return document.addEventListener("mousedown",d),document.addEventListener("keydown",_),()=>{document.removeEventListener("mousedown",d),document.removeEventListener("keydown",_)}},[e]),O(()=>{!e||l||n||!t||!t.session_id||(r(!0),Cs(t.session_id).then(d=>{a(d&&d.commits?d:{commits:[],branch:""}),r(!1)}).catch(d=>{c(String(d)),r(!1)}))},[e,l,n,t]),!t||!u||!t.project)return null;const $=u===1?"1 commit":u+" commits";return s`<span ref=${v} class="scb-root" style="position:relative">
    <button type="button"
      class="badge text-xs"
      aria-expanded=${e}
      aria-label="Show ${$} for this session"
      onClick=${()=>i(d=>!d)}
      style="background:var(--bg2);color:var(--fg);border:1px solid var(--bd);
             cursor:pointer;padding:1px 6px;border-radius:3px">
      <span aria-hidden="true" style="margin-right:3px">⎇</span>${f($)}
    </button>
    ${e&&s`<div class="scb-dropdown" role="group"
      aria-label="Commits attributed to this session"
      style="position:absolute;top:calc(100% + 4px);left:0;z-index:50;
             min-width:280px;max-width:480px;max-height:320px;overflow:auto;
             background:var(--bg1);border:1px solid var(--bd);
             border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.25);
             padding:var(--sp-1)">
      ${n&&s`<div class="text-muted text-xs" style="padding:var(--sp-2)">Loading…</div>`}
      ${o&&s`<div class="text-muted text-xs" style="padding:var(--sp-2);color:var(--red)">
        ${f(o)}
      </div>`}
      ${!n&&!o&&l&&aa(l)}
    </div>`}
  </span>`}function aa(t){const e=(t.commits||[]).slice(0,_t),i=t.branch||"";return e.length===0?s`<div class="text-muted text-xs" style="padding:var(--sp-2)">
      No commits attributed.
    </div>`:s`<ul class="scb-list" role="list"
    style="list-style:none;margin:0;padding:0">
    ${e.map(l=>na(l,i))}
    ${(t.commits||[]).length>_t&&s`<li class="text-muted text-xs"
      style="padding:var(--sp-1) var(--sp-2)">
      …and ${(t.commits||[]).length-_t} more
    </li>`}
  </ul>`}function na(t,e){const i=e&&!t.current_branch_match,l=i?"opacity:0.55;":"",a=i&&e?"not on "+e:t.author_name?t.author_name+" <"+t.author_email+">":"",n="display:flex;gap:var(--sp-2);align-items:baseline;padding:3px var(--sp-2);font-size:var(--fs-xs);"+l;return s`<li class="scb-row"
    title=${a}
    style=${n}>
    <code class="mono"
      style="color:var(--fg2);flex:0 0 auto">${f(t.short_sha)}</code>
    <span class="text-ellipsis"
      style="flex:1 1 auto;min-width:0">${f(t.subject||"(no subject)")}</span>
    ${i&&s`<span class="text-muted text-xs"
      style="flex:0 0 auto;font-style:italic">not on ${f(e)}</span>`}
  </li>`}const oa=[{id:"overview",label:"Overview",hint:"Metrics, actions, context, memory"},{id:"flow",label:"Flow",hint:"Sequence of messages & tool calls"},{id:"transcript",label:"Transcript",hint:"Readable prompts & replies"},{id:"timeline",label:"Timeline",hint:"Activity bar chart over time"},{id:"events",label:"Events",hint:"Raw session event stream"}];function la({session:t}){if(!t)return null;const e=Gt(t.tool),i=t.exact_input_tokens||t.input_tokens||0,l=t.exact_output_tokens||t.output_tokens||0,a=i+l,n=t.duration_s||(t.ended_at&&t.started_at?t.ended_at-t.started_at:0),r=!t.ended_at,o=t.project?Jt(t.project):"",c=t.started_at?new Date(t.started_at*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"";return s`<div class="explorer-session-header" style="border-left:3px solid ${e}">
    <div class="flex-row gap-md" style="align-items:baseline;flex-wrap:wrap">
      <strong style="font-size:var(--fs-lg)" title=${t.tool}><span style=${"color:"+e} aria-hidden="true">\u25CF </span>${f(kt(t.tool))}</strong>
      ${o&&s`<span class="text-muted text-xs mono text-ellipsis"
        style="max-width:360px" title=${t.project}>${f(o)}</span>`}
      ${t.git_branch&&s`<span class="badge text-xs"
        style="background:var(--bg2);color:var(--fg2)"
        title="git branch">⎇ ${f(t.git_branch)}</span>`}
      ${t.git_commit&&s`<span class="badge text-xs mono"
        style="background:var(--bg2);color:var(--fg2)"
        title=${t.git_commit}>${f(String(t.git_commit).slice(0,7))}</span>`}
      <${ea} session=${t}/>
      ${c&&s`<span class="text-muted text-xs">${f(c)}</span>`}
      ${n>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">${U(n)}</span>`}
      ${a>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)"
        title="input ${i.toLocaleString()} · output ${l.toLocaleString()}">
        ${y(a)}t
      </span>`}
      ${(t.files_modified||0)>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">
        ${t.files_modified} files
      </span>`}
      ${r&&s`<span class="badge"
        style="background:var(--red);color:var(--on-status);font-size:var(--fs-xs)">● LIVE</span>`}
      <span class="text-muted text-xs mono"
        style="margin-left:auto"
        title=${t.session_id}>${f(t.session_id)}</span>
    </div>
    <${Ze} session=${t}/>
  </div>`}function da(){const{globalRange:t,enabledTools:e}=J(X),[i,l]=b(()=>{try{return localStorage.getItem("aictl-explorer-view")||"overview"}catch{return"overview"}}),[a,n]=b(()=>As()),{sessions:r,loading:o,error:c,tools:v,toolSessions:u,activeTool:$,setActiveTool:d,activeSessionId:_,setActiveSessionId:p}=pt({globalRange:t,enabledTools:e,requestedSession:a,onRequestApplied:()=>n(null)}),m=x=>{l(x);try{localStorage.setItem("aictl-explorer-view",x)}catch{}};O(()=>{const x=k=>{const w=k==null?void 0:k.detail;w!=null&&w.sessionId&&(n(w),Es())};return document.addEventListener("aictl:select-session",x),()=>document.removeEventListener("aictl:select-session",x)},[]),O(()=>{_&&(Ms(_,$),Mt({session:_}))},[_,$]),O(()=>()=>Mt({session:null}),[]);const g=r.find(x=>x.session_id===_),h=!o&&Pt?Pt():0;return s`<div class="explorer-container">
    <div class="explorer-picker">
      <${ut} tools=${v} activeTool=${$} onSelect=${d}/>
      <${Tt} sessions=${u} activeId=${_}
        onSelect=${p} loading=${o} error=${c}/>
      ${h>0?s`<div class="text-muted text-xs" style="margin-top:var(--sp-1)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${h} short session${h===1?"":"s"} hidden</div>`:null}
    </div>

    ${g&&g.project&&g.tool&&s`<${sa}
      sessionId=${g.session_id}
      project=${g.project}
      tool=${g.tool}
      currentDurationS=${g.duration_s||(g.ended_at&&g.started_at?g.ended_at-g.started_at:0)}
      currentTokens=${(g.exact_input_tokens||g.input_tokens||0)+(g.exact_output_tokens||g.output_tokens||0)}
      currentFileChurn=${g.files_modified||0}/>`}

    <${la} session=${g}/>

    <nav class="explorer-subtabs" aria-label="Session views">
      ${oa.map(x=>s`<button key=${x.id}
        class="tab-btn explorer-subtab-btn"
        aria-current=${i===x.id?"page":null}
        title=${x.hint}
        onClick=${()=>m(x.id)}>${x.label}</button>`)}
    </nav>

    <div class="explorer-content">
      ${_?i==="overview"?g?s`<${ce} session=${g}/>`:s`<div class="loading-state" style="padding:var(--sp-8)">Loading session\u2026</div>`:i==="flow"?s`<${Se} key=${"ex-flow-"+_}
                externalSessionId=${_}/>`:i==="transcript"?s`<${Ie} key=${"ex-tr-"+_}
                  externalSessionId=${_}/>`:i==="timeline"?s`<${Ue} key=${"ex-tl-"+_}
                    externalSessionId=${_}/>`:s`<${Je}
                    key=${"ex-ev-"+_}
                    sessionId=${_}
                    since=${t==null?void 0:t.since}
                    until=${t==null?void 0:t.until}
                  />`:s`<div class="empty-state" style="padding:var(--sp-8);text-align:center">
            <p>${o?"Loading sessions…":"Select a session above to inspect it."}</p>
            ${!o&&v.length===0&&s`<p class="text-muted text-xs"
              style="margin-top:var(--sp-3)">
              No sessions in the current time range. Try widening the range bar above.
            </p>`}
          </div>`}
    </div>
  </div>`}export{la as SessionHeader,da as default};
