import{x as J,S as X,d as b,T as H,y as O,a4 as is,a5 as ls,a6 as rs,a7 as st,m as s,e as f,a8 as U,I as L,D as ds,h as ft,a9 as cs,aa as ps,ab as Y,b as x,f as et,ac as us,ad as vs,ae as ms,af as fs,a as $t,ag as $s,ah as gs,C as _t,ai as Kt,aj as hs,ak as ys,al as xs,am as _s,an as bs,ao as ks,ap as Jt,aq as Xt,U as Tt,ar as pt,n as Yt,p as ws,as as bt,at as Ts,a3 as Qt,au as Zt,av as I,aw as tt,ax as St,q as Q,ay as Ss,L as Cs,az as As,A as ts,aA as ss,aB as Pt,R as Es,aC as Ms,aD as Ps,aE as Lt,aF as Ls,aG as Os,aH as Ot}from"./index-D-7_bwBz.js";import{u as R}from"./useAsyncResource-rXacruJh.js";import{c as zs}from"./models-DHnW0Za4.js";function Is(t,e){if(!(e!=null&&e.length))return t;const o=e.filter(i=>i.session_id&&i.tool&&!st(t,i.session_id)).map(i=>({...i,active:!0,live:!0}));return o.length?[...t,...o].sort((i,a)=>(a.started_at||0)-(i.started_at||0)):t}function ut({globalRange:t=null,enabledTools:e=null,requestedSession:o=null,onRequestApplied:i=null}={}){var w,F;const a=(F=(w=J(X))==null?void 0:w.snap)==null?void 0:F.sessions,[n,r]=b([]),l=H(()=>Is(n,a),[n,a]),[d,v]=b(!0),[u,$]=b(null),[c,y]=b(null),[p,m]=b(null);O(()=>{let E=!1;v(!0),$(null);const P=t?Math.min(t.since,Date.now()/1e3-86400):Date.now()/1e3-86400,M=t==null?void 0:t.until;return is(null,{since:P,until:M}).then(z=>{if(E)return;const V=ls(z);V.sort((W,G)=>(G.started_at||0)-(W.started_at||0)),r(V),v(!1)}).catch(z=>{E||($(z),v(!1))}),()=>{E=!0}},[t]);const g=E=>e===null||e.includes(E),h=H(()=>l.filter(E=>g(E.tool)),[l,e]),_=H(()=>rs(h),[h]);O(()=>{(!c&&_.length>0||c&&!_.includes(c)&&_.length>0)&&y(_[0])},[_.join(",")]);const k=H(()=>h.filter(E=>E.tool===c),[h,c]);return O(()=>{k.length>0&&(!p||!st(k,p))&&m(k[0].session_id)},[c,k.length]),O(()=>{if(!(o!=null&&o.sessionId))return;const E=st(l,o.sessionId);E&&(y(E.tool),m(E.session_id),i==null||i())},[o,l]),{sessions:l,loading:d,error:u,tools:_,toolSessions:k,activeTool:c,setActiveTool:y,activeSessionId:p,setActiveSessionId:m}}const at={active:{bg:"var(--green)",label:"Active"},idle:{bg:"var(--yellow)",label:"Idle"},ended:{bg:"var(--fg3)",label:"Ended"},pending:{bg:"var(--fg3)",label:"Pending"},done:{bg:"var(--green)",label:"Done"}};function zt({agent:t,tasks:e,now:o}){const i=at[t.state]||at.active,a=t.ended_at?t.ended_at-t.started_at:o-t.started_at,n=e.filter(r=>r.agent_id===t.agent_id);return s`<div class="tt-agent">
    <div class="flex-row gap-sm" style="align-items:center;min-height:28px">
      <span class="badge text-xs" style="background:${i.bg};color:var(--on-status)">${i.label}</span>
      <strong class="text-sm">${f(t.agent_id)}</strong>
      <span class="text-muted text-xs">${U(a)}</span>
      ${t.task&&s`<span class="text-xs mono text-muted">\u2014 ${f(t.task)}</span>`}
    </div>
    ${n.length>0&&s`<div style="margin-left:var(--sp-4);margin-top:var(--sp-1)">
      ${n.map(r=>{const l=at[r.state]||at.pending;return s`<div key=${r.task_id} class="flex-row gap-sm text-xs" style="padding:2px 0;align-items:center">
          <span class="badge" style="background:${l.bg};color:var(--on-status);font-size:var(--fs-xs);padding:1px 4px">${l.label}</span>
          <span class="mono">${f(r.name||r.task_id)}</span>
        </div>`})}
    </div>`}
  </div>`}function Fs({entityState:t}){if(!t||!t.agents||!t.agents.length)return null;const e=t.agents,o=t.tasks||[],i=Date.now()/1e3,a=e.filter(r=>r.state==="active"),n=e.filter(r=>r.state!=="active");return s`<div class="tt-container">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-3)">
      <strong class="text-sm">Team</strong>
      <span class="text-muted text-xs">${e.length} agent${e.length>1?"s":""}</span>
      ${a.length>0&&s`<span class="badge text-xs" style="background:var(--green);color:var(--on-status)">${a.length} active</span>`}
    </div>
    <div style="border-left:2px solid var(--border);padding-left:var(--sp-3)">
      ${a.map(r=>s`<${zt} key=${r.agent_id} agent=${r} tasks=${o} now=${i}/>`)}
      ${n.map(r=>s`<${zt} key=${r.agent_id} agent=${r} tasks=${o} now=${i}/>`)}
    </div>
  </div>`}function Ns({tasks:t}){if(!t||!t.length)return null;const e=t.filter(n=>n.state==="pending"),o=t.filter(n=>n.state==="active"),i=t.filter(n=>n.state==="done");function a({title:n,items:r,color:l}){return s`<div class="tt-column">
      <div class="tt-column-head" style="border-bottom:2px solid ${l}">
        <strong class="text-sm">${n}</strong>
        <span class="text-muted text-xs">${r.length}</span>
      </div>
      <div class="tt-column-body">
        ${r.length?r.map(d=>s`<div key=${d.task_id} class="tt-task-card">
              <div class="text-sm" style="font-weight:500">${f(d.name||d.task_id)}</div>
              ${d.agent_id&&s`<div class="text-xs text-muted">Agent: ${f(d.agent_id)}</div>`}
            </div>`):s`<p class="text-muted text-xs" style="padding:var(--sp-3)">None</p>`}
      </div>
    </div>`}return s`<div class="tt-board">
    <${a} title="Pending" items=${e} color="var(--fg3)"/>
    <${a} title="Active" items=${o} color="var(--accent)"/>
    <${a} title="Done" items=${i} color="var(--green)"/>
  </div>`}function B({title:t,icon:e,badge:o,defaultOpen:i,children:a}){const[n,r]=b(i||!1);return s`<div class="sd-panel">
    <button class="sd-panel-head" onClick=${()=>r(l=>!l)}
      aria-expanded=${n}>
      <span class="sd-panel-icon"><${L} name=${e} size="1em"/></span>
      <span class="sd-panel-title">${t}</span>
      ${o!=null&&s`<span class="badge text-xs" style="margin-left:var(--sp-2)">${o}</span>`}
      <span class="sd-panel-arrow" aria-hidden="true">${n?"▲":"▼"}</span>
    </button>
    ${n&&s`<div class="sd-panel-body">${a}</div>`}
  </div>`}const Ds={tool_call:"var(--accent)",file_modified:"var(--green)",error:"var(--red)",anomaly:"var(--orange)",session_start:"var(--blue)",session_end:"var(--fg3)","hook:PreToolUse":"var(--accent)","hook:PostToolUse":"var(--accent)","hook:tool_use":"var(--accent)"};function it(t){if(t==null||t==="")return"";if(typeof t=="string")return t;try{return JSON.stringify(t)}catch{return String(t)}}function Bs(t){const e=[],o=new Set,i=6;for(let a=0;a<t.length;a++){if(o.has(a))continue;const n=t[a];if(n.kind==="hook:PreToolUse"){const r=n.detail&&n.detail.tool_name||"";let l=-1;for(let d=a+1;d<Math.min(t.length,a+1+i);d++){const v=t[d];if(o.has(d)||v.kind!=="hook:PostToolUse")continue;const u=v.detail&&v.detail.tool_name||"";if(!(r&&u&&r!==u)){l=d;break}}if(l>=0){const d=t[l];o.add(l);const v=n.detail||{},u=d.detail||{};e.push({...n,kind:"hook:tool_use",ts:n.ts,end_ts:d.ts,detail:{...v,tool_name:v.tool_name||u.tool_name||"",tool_input:v.tool_input!=null?v.tool_input:v.input,result_summary:u.result_summary!=null?u.result_summary:u.tool_response!=null?u.tool_response:u.result}});continue}}e.push(n)}return e}function Rs(t){const e=a=>{const n=a.detail||{};return String(n.path||n.name||n.tool_name||a.kind)},o=a=>{const n=a.detail||{},r=n.tool_input!=null?n.tool_input:n.input,l=n.result_summary!=null?n.result_summary:n.tool_response!=null?n.tool_response:n.result;return it(r)!==""||it(l)!==""},i=[];for(const a of t){const n=i[i.length-1];if(n&&n.kind===a.kind&&e(n)===e(a)&&!o(n)&&!o(a)){const r=(n.repeat_count||1)+1;i[i.length-1]={...n,repeat_count:r,last_ts:a.ts};continue}i.push(a)}return i}function js({sessionId:t}){const[e,o]=b([]),[i,a]=b(!0),[n,r]=b(null),[l,d]=b({});O(()=>{if(!t){o([]),a(!1),r(null);return}let u=!1;return a(!0),r(null),d({}),ds({sessionId:t,limit:200,since:0}).then(c=>{u||(o((Array.isArray(c)?c:[]).reverse()),a(!1))}).catch(c=>{u||(o([]),r(c),a(!1))}),()=>{u=!0}},[t]);const v=H(()=>Rs(Bs(e)),[e]);return i?s`<p class="loading-state">Loading events...</p>`:n?s`<p class="error-state">Failed to load session actions${n.message?` (${n.message})`:""}.</p>`:v.length?s`<div class="sd-events">
    ${v.map(u=>{const $=Ds[u.kind]||"var(--fg3)",c=u.detail||{},y=c.path||c.name||c.tool_name||u.kind,p=c.tool_input!=null?c.tool_input:c.input,m=c.result_summary!=null?c.result_summary:c.tool_response!=null?c.tool_response:c.result,g=it(p),h=it(m),_=g!==""||h!=="",k=`${u.ts}-${u.kind}`,w=!!l[k],F=g?g.slice(0,80)+(g.length>80?"…":""):"",E=h?h.slice(0,80)+(h.length>80?"…":""):"",P=F||E;return s`<div key=${k} class="sd-event-row-wrap">
        <div class="sd-event-row">
          <span class="sd-event-time" title=${u.repeat_count>1?`${ft(u.ts)} → ${ft(u.last_ts)}`:null}>${ft(u.ts)}</span>
          <span class="sd-event-dot" style="background:${$}"></span>
          <span class="sd-event-kind">${u.kind}</span>
          <span class="sd-event-desc mono text-muted">${f(String(y))}</span>
          ${u.repeat_count>1&&s`<span class="badge" title=${`${u.repeat_count} consecutive identical events`}>×${u.repeat_count}</span>`}
        </div>
        ${_&&s`<div class="sd-event-detail">
          <button type="button"
            class="sd-event-toggle"
            aria-expanded=${w?"true":"false"}
            onClick=${()=>d(M=>({...M,[k]:!M[k]}))}
            style="background:none;border:none;padding:0;cursor:pointer;color:var(--fg2);font-size:var(--fs-xs);text-align:left;font-family:inherit">
            <span style="display:inline-block;width:1em">${w?"˅":"›"}</span>
            ${w?s`<span class="text-muted">hide</span>`:s`<span class="mono text-muted" title=${g||h}>${f(P)}</span>`}
          </button>
          ${w&&s`<pre class="mono" style="font-size:var(--fs-xs);max-height:16rem;overflow:auto;white-space:pre-wrap;margin:var(--sp-1) 0 0 1em;padding:var(--sp-2);background:var(--bg2);border-radius:var(--radius-sm)">${f((g?"input: "+g:"")+(g&&h?`

`:"")+(h?"result: "+h:""))}</pre>`}
        </div>`}
      </div>`})}
  </div>`:s`<p class="empty-state">No events recorded for this session.</p>`}function qs(){return`Set capture = "full" under [storage] in ${cs()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function It(t){return(t==null?void 0:t.content_retained)===!1}function Hs(t){return t&&t!=="full"?`Text not retained: capture=${t}`:t==="full"?"Text not retained for this session":"Text not retained: capture mode is not full"}function es({mode:t}){return s`<div class="panel-state panel-state--withheld" role="status">
    <${L} name="file-text" size="14"/>
    <div>
      <div class="panel-state__title">${Hs(t)}</div>
      <div class="panel-state__hint">Prompts and replies for this session were not stored. Counts, timing, models and tool calls are still shown.</div>
      <code class="panel-state__fix">${qs()}</code>
    </div>
  </div>`}const Ft=240,Vs={user:"var(--accent)",assistant:"var(--green)"};function Us({sessionId:t,withheld:e=!1,captureMode:o=null}){const[i,a]=b({}),{data:n,loading:r,error:l}=R(()=>ps(t),[t],{enabled:!!t});O(()=>{a({})},[t]);const d=Array.isArray(n==null?void 0:n.messages)?n.messages:[];return r?s`<p class="loading-state">Loading conversation...</p>`:l?s`<p class="error-state">Failed to load conversation${l.message?` (${l.message})`:""}.</p>`:d.length?s`<div class="sd-conversation">
    ${d.map((v,u)=>{const $=v.role||"unknown",c=Vs[$]||"var(--fg2)",y=String(v.content||""),p=y.length>Ft,m=`${v.ts}-${$}-${u}`,g=!!i[m];return s`<div key=${m} style="padding:var(--sp-2) 0;border-bottom:1px solid var(--bg3)">
        <div class="flex-row gap-sm" style="align-items:center">
          <span class="badge text-xs" style="background:${c};color:var(--on-status)">${$}</span>
          <span class="badge--muted badge text-xs" title=${"Captured via "+(v.source||"unknown")}>${v.source||"?"}</span>
          <span class="text-xs text-muted mono" style="margin-left:auto">${Y(v.ts)}</span>
        </div>
        <div class="mono" style="font-size:var(--fs-sm);margin-top:var(--sp-1);white-space:pre-wrap;word-break:break-word">
          ${g||!p?y:y.slice(0,Ft)+"…"}
        </div>
        ${p&&s`<button type="button"
          aria-expanded=${g?"true":"false"}
          onClick=${()=>a(h=>({...h,[m]:!h[m]}))}
          style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent);font-size:var(--fs-xs);font-family:inherit">
          ${g?"Show less":`Show all ${y.length} chars`}
        </button>`}
      </div>`})}
  </div>`:e?s`<${es} mode=${o}/>`:s`<p class="empty-state">No conversation captured for this session.</p>`}const Nt=[{name:"System prompt",tokens:4200,color:"var(--accent)"},{name:"Environment info",tokens:280,color:"var(--fg2)"}],Ws=95;function as({path:t,session:e,openViewer:o}){if(!t||!e||typeof o!="function")return null;const i=e.started_at,a=e.ended_at;if(!i&&!a)return null;const n=r=>l=>{l.preventDefault(),l.stopPropagation(),o(t,{at:r})};return s`<span class="file-history-btns" aria-label="View file at session start or end">
    ${i&&s`<button type="button" class="file-history-btn"
      title="View at session start"
      aria-label=${"View "+t+" at session start"}
      onClick=${n(i)}>\u25F7 start</button>`}
    ${a&&s`<button type="button" class="file-history-btn"
      title="View at session end"
      aria-label=${"View "+t+" at session end"}
      onClick=${n(a)}>\u25F8 end</button>`}
  </span>`}function Gs({session:t}){const e=J(X),o=e.snap,i=t.files_loaded||[],a=((o==null?void 0:o.tool_configs)||[]).map(p=>p.model).filter(Boolean)[0]||"",n=zs(a),l=(o&&o.agent_memory||[]).reduce((p,m)=>p+(m.tokens||0),0),d=i.length*150,u=Nt.reduce((p,m)=>p+m.tokens,0)+l+d,$=Math.min(u/n*100,100),c=Ws,y=[...Nt,{name:"Memory",tokens:l,color:"var(--cat-memory, var(--orange))"},{name:"Loaded files",tokens:d,color:"var(--green)"}].filter(p=>p.tokens>0);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files in Context</div><div class="value">${i.length}</div></div>
      <div class="es-kv-card"><div class="label">Est. Tokens Used</div><div class="value">${x(u)}</div></div>
      <div class="es-kv-card"><div class="label">Window</div><div class="value">${x(n)}</div></div>
      <div class="es-kv-card"><div class="label">Fill</div><div class="value" style="color:${$>80?"var(--orange)":$>50?"var(--yellow)":"var(--green)"}">${et($)}</div></div>
    </div>

    <div style="margin-bottom:var(--sp-4)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-1)">Context fill gauge</div>
      <div style="position:relative;height:16px;border-radius:4px;background:var(--border);overflow:hidden">
        <div class="flex-row" style="height:100%;position:absolute;inset:0">
          ${y.map(p=>{const m=(p.tokens/n*100).toFixed(1);return s`<div key=${p.name} style="width:${m}%;background:${p.color};min-width:${p.tokens>0?"1px":"0"}"
              title="${p.name}: ~${x(p.tokens)} tokens"></div>`})}
        </div>
        <div style="position:absolute;left:${c}%;top:0;bottom:0;width:1px;background:var(--red);opacity:0.7"
          title="Compaction threshold (${c}%)"></div>
      </div>
      <div class="flex-row flex-wrap gap-sm" style="margin-top:var(--sp-2)">
        ${y.map(p=>s`<span key=${p.name} class="text-xs">
          <span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${p.color};margin-right:2px"></span>
          ${p.name} ${x(p.tokens)}
        </span>`)}
        <span class="text-xs text-red">| compaction at ${c}%</span>
      </div>
    </div>

    ${i.length>0&&s`<div class="mono text-xs" style="max-height:10rem;overflow-y:auto">
      ${i.map(p=>s`<div key=${p} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${f(p)}</span>
        <${as} path=${p} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>`}
    ${!i.length&&s`<p class="empty-state">No context file tracking available yet. Enable hook events for full context visibility.</p>`}
  </div>`}function Ks({mem:t}){const[e,o]=b(!1),i=t.name||(t.file||"").replace(/\\\\/g,"/").split("/").pop()||"entry",a=(t.content||"").slice(0,300);return s`<div class="sd-memory-entry">
    <button type="button" class="flex-row gap-sm"
      aria-expanded=${e}
      onClick=${()=>o(!e)}
      style="align-items:center;width:100%;background:none;border:none;padding:0;
        font:inherit;color:inherit;text-align:left;cursor:pointer">
      <span class="badge text-xs">${t.type||t.source||"file"}</span>
      <strong title=${t.file||t.path||""}>${f(i)}</strong>
      ${t.tokens?s`<span class="text-muted">${x(t.tokens)} tok</span>`:null}
      ${t.lines?s`<span class="text-muted">${t.lines}ln</span>`:null}
      ${t.profile?s`<span class="text-muted">${f(t.profile)}</span>`:null}
      <span class="text-muted" aria-hidden="true" style="margin-left:auto;font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&a?s`<pre class="text-muted" style="margin:var(--sp-2) 0 0;padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre-wrap;word-break:break-word;
      max-height:10rem;overflow-y:auto;font-size:var(--fs-xs);line-height:1.4">${f(t.content)}${t.content&&t.content.length>300,""}</pre>`:null}
  </div>`}function Js({session:t}){const{snap:e}=J(X),o=e&&e.agent_memory||[],i=t.project||"",a=i?o.filter(n=>{const r=n.project||n.tool||"";return!i||r.includes(i.replace(/\\/g,"/").split("/").pop())}):o;return s`<div>
    <${Zs} sessionId=${t.session_id}/>
    ${a.length?s`<div class="mono text-xs" style="max-height:20rem;overflow-y:auto">
          ${a.map((n,r)=>s`<${Ks} key=${r} mem=${n}/>`)}
        </div>`:s`<p class="empty-state">
          No memory entries found${i?" for this project":""}.
          <small class="empty-state-source">/api/snapshot · agent_memory[]</small>
        </p>`}
  </div>`}const Xs={added:"+",modified:"●",removed:"−"},Ys={added:"added",modified:"modified",removed:"removed"};function Qs({file:t}){const[e,o]=b(!1),i=Xs[t.change]||"·";return s`<div class="sd-memdiff-row" data-change=${t.change}>
    <button type="button" class="flex-row gap-sm"
         style="align-items:center;cursor:pointer;padding:var(--sp-1) 0;width:100%;
           background:none;border:none;font:inherit;color:inherit;text-align:left"
         onClick=${()=>o(!e)} aria-expanded=${e}>
      <span class="badge text-xs" title=${Ys[t.change]||t.change}>${i}</span>
      <code class="text-xs" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${f(t.path)}</code>
      <span class="text-xs" style="color:var(--positive, #4caf50)">+${t.added_lines||0}</span>
      <span class="text-xs" style="color:var(--negative, #f44336)">-${t.removed_lines||0}</span>
      <span class="text-muted" aria-hidden="true" style="font-size:var(--fs-2xs)">${e?"▲":"▼"}</span>
    </button>
    ${e&&t.unified_diff?s`<pre class="diff" style="margin:var(--sp-1) 0 var(--sp-2);padding:var(--sp-2) var(--sp-3);
      background:var(--bg);border-radius:3px;white-space:pre;overflow-x:auto;max-height:20rem;overflow-y:auto;
      font-size:var(--fs-xs);line-height:1.4;font-family:var(--font-mono, monospace)">${f(t.unified_diff)}</pre>`:null}
  </div>`}function Zs({sessionId:t}){const{data:e,loading:o}=R(()=>us(t).then(n=>n||{files:[],summary:{}}).catch(()=>({files:[],summary:{}})),[t],{enabled:!!t}),i=e&&e.files||[],a=e&&e.summary||{added:0,modified:0,removed:0};return s`<div class="sd-memdiff" style="margin-bottom:var(--sp-3)">
    <div class="flex-row gap-sm" style="align-items:center;margin-bottom:var(--sp-2)">
      <strong class="text-sm">Memory changes this session</strong>
      ${!o&&i.length?s`<span class="text-muted text-xs">
        ${a.added||0} added \u00B7 ${a.modified||0} modified \u00B7 ${a.removed||0} removed
      </span>`:null}
    </div>
    ${o?s`<p class="text-muted text-xs">Loading\u2026</p>`:i.length?s`<div class="mono text-xs">${i.map((n,r)=>s`<${Qs} key=${n.path+r} file=${n}/>`)}</div>`:s`<p class="empty-state text-xs">
          No memory changes recorded for this session.
          <small class="empty-state-source">/api/session-memory-diff · files[]</small>
        </p>`}
  </div>`}function te({rateLimits:t}){return!t||!Object.keys(t).length?null:s`<div style="margin-top:var(--sp-3)">
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Rate Limits</div>
    <div class="flex-row gap-md flex-wrap">
      ${Object.entries(t).map(([e,o])=>{const i=o.used_pct||o.used_percentage||0,a=i>80?"var(--red)":i>60?"var(--orange)":"var(--green)",n=o.resets_at||"";return s`<div key=${e} style="flex:1;min-width:120px">
          <div class="flex-between text-xs" style="margin-bottom:var(--sp-1)">
            <span>${e} window</span>
            <span style="color:${a};font-weight:600">${et(i)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(i,100)}%;background:${a};border-radius:4px"></div>
          </div>
          ${n&&s`<div class="text-xs text-muted" style="margin-top:2px">resets ${n}</div>`}
        </div>`})}
    </div>
  </div>`}function se({sessionId:t,topN:e=10}){const{data:o,loading:i,error:a}=R(()=>vs(t),[t],{enabled:!!t}),n=H(()=>!o||!Array.isArray(o.counts)?[]:o.counts.slice(0,e),[o,e]);if(i)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading subprocesses\u2026</div>`;if(a)return s`<div class="error-state text-xs" style="padding:0">Failed to load subprocess breakdown${a.message?` (${a.message})`:""}.</div>`;if(!n.length)return s`<div class="text-xs text-muted">No subprocess activity recorded
      (live correlator data only; not available for ended sessions).</div>`;const r=Math.max(1,...n.map(l=>l.count));return s`<div class="subprocess-breakdown" aria-label="Top subprocesses by count">
    <div class="text-xs text-muted mb-sm">Top ${Math.min(e,n.length)} subprocesses
      <span class="text-muted">\u00b7 total ${o.total}</span></div>
    <div class="subprocess-rows">
      ${n.map(l=>{const d=l.count/r*100;return s`<div key=${l.name} class="subprocess-row">
          <span class="subprocess-name mono text-xs" title=${l.name}>${f(l.name)}</span>
          <div class="subprocess-bar-track">
            <div class="subprocess-bar" style=${"width:"+d+"%"}></div>
          </div>
          <span class="subprocess-count text-xs mono">${l.count}</span>
        </div>`})}
    </div>
  </div>`}function ee({session:t}){const e=t.exact_input_tokens||0,o=t.exact_output_tokens||0,{data:i}=R(()=>ms({tool:t.tool,active:!1,limit:20}).then(p=>{if(p.length>1){const m=p.filter(h=>h.duration_s>0).map(h=>h.duration_s);return{avgDuration:m.length?m.reduce((h,_)=>h+_,0)/m.length:0,sampleCount:p.length}}return null}).catch(()=>null),[t.tool],{enabled:!!t.tool}),{data:a}=R(()=>fs(t.session_id).then(p=>p&&!p.error?p:null).catch(()=>null),[t.session_id],{enabled:!!t.session_id}),n=t.duration_s||0,r=i&&i.avgDuration>0?n/i.avgDuration:null,l=(a==null?void 0:a.vscode_lm_usage)||null,d=(a==null?void 0:a.skill_call_breakdown)||{},v=Object.entries(d).sort((p,m)=>m[1]-p[1]),u=(a==null?void 0:a.tool_call_breakdown)||{},$=Object.entries(u).sort((p,m)=>m[1]-p[1]),c=(a==null?void 0:a.agents)||[],y=(a==null?void 0:a.context_state)||null;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${x(e)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${x(o)}</div></div>
      <div class="es-kv-card"><div class="label">Total Tokens</div><div class="value">${x(e+o)}</div></div>
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
      vs average (${i.sampleCount} sessions):
      duration ${r>1.2?s`<span class="text-orange">${r.toFixed(1)}x longer</span>`:r<.8?s`<span class="text-green">${(1/r).toFixed(1)}x shorter</span>`:s`<span>similar</span>`}
    </div>`}
    ${t.entity_state&&s`<${te} rateLimits=${t.entity_state.rate_limits}/>`}
    ${a&&s`<div class="session-agent-report" style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted mb-sm">Skills and subagents
        ${y&&s`<span class="badge" style="margin-left:var(--sp-2);font-size:var(--fs-2xs)"
          title="Deduced context-window state">context: ${y}</span>`}
      </div>
      <div class="es-kv" style="gap:var(--sp-3)">
        <div class="es-kv-card"><div class="label">Skill Calls</div><div class="value">${a.skill_calls||0}</div></div>
        <div class="es-kv-card"><div class="label">Subagents</div><div class="value">${c.length}</div></div>
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
      ${c.length>0&&s`<div class="lm-usage-breakdown" style="margin-top:var(--sp-2)">
        ${c.slice(0,8).map(p=>s`<div key=${p.agent_id} class="lm-usage-row flex-row gap-sm"
          style="align-items:center;padding:var(--sp-1) 0">
          <span class="mono text-xs" style="flex:1" title=${p.task||""}>${p.agent_id||"subagent"}</span>
          <span class="text-xs text-muted">${p.state||""}</span>
        </div>`)}
      </div>`}
    </div>`}
    ${l&&Object.keys(l.by_extension||{}).length>0&&s`
      <div class="lm-usage-breakdown" style="margin-top:var(--sp-3)">
        <div class="text-xs text-muted mb-sm">VS Code Language-Model tokens by extension
          <span class="text-muted">\u00b7 total ${x(l.total_tokens||0)}</span></div>
        <div>
          ${Object.entries(l.by_extension).sort((p,m)=>(m[1].total_tokens||0)-(p[1].total_tokens||0)).map(([p,m])=>{const g=l.total_tokens||1,h=(m.total_tokens||0)/g*100;return s`<div key=${p} class="lm-usage-row flex-row gap-sm"
                style="align-items:center;padding:var(--sp-1) 0">
                <span class="mono text-xs" style="flex:1" title=${p}>${p}</span>
                <div style="width:80px;height:6px;background:var(--bg-alt);border-radius:3px;overflow:hidden">
                  <div style=${"width:"+h.toFixed(1)+"%;height:100%;background:var(--accent)"}></div>
                </div>
                <span class="text-xs mono">${x(m.total_tokens||0)}</span>
                <span class="text-xs text-muted mono">(${m.calls||0})</span>
              </div>`})}
        </div>
      </div>`}
    <div style="margin-top:var(--sp-3)">
      <${se} sessionId=${t.session_id} topN=${10}/>
    </div>
  </div>`}function ae({session:t}){const e=J(X),o=t.files_touched||[],i=t.file_events||0;return o.length?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Files Modified</div><div class="value">${o.length}</div></div>
      <div class="es-kv-card"><div class="label">File Events</div><div class="value">${x(i)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${o.map(a=>s`<div key=${a} class="flex-row gap-sm text-muted"
        style="padding:2px 0;align-items:center">
        <span class="text-ellipsis" style="flex:1;min-width:0">${f(a)}</span>
        <${as} path=${a} session=${t} openViewer=${e.openViewer}/>
      </div>`)}
    </div>
  </div>`:s`<p class="empty-state">No file changes recorded.</p>`}function ne({sessionId:t}){const{data:e,loading:o,error:i}=R(()=>{const r=t?0:Math.floor(Date.now()/1e3)-3600;return $s(r,100,t)},[t]);if(o)return s`<p class="loading-state">Loading API call data...</p>`;if(i)return s`<p class="error-state">Failed to load API calls${i.message?` (${i.message})`:""}.</p>`;if(!e||!e.calls||!e.calls.length)return s`<p class="empty-state">No OTel API call data. Enable with: <code>aictl otel enable</code></p>`;const{calls:a,summary:n}=e;return s`<div>
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
        ${Object.entries(n.by_model).map(([r,l])=>s`
          <span key=${r} class="badge text-xs">${r}: ${l}</span>
        `)}
      </div>
    `}
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${a.slice(0,30).map((r,l)=>{const d=r.status==="error",v=new Date(r.ts*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}),u=Number(r.http_status),$=Number.isFinite(u)&&u>=400;return s`<div key=${l} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span class="text-muted" style="width:60px;flex-shrink:0">${v}</span>
          <span aria-hidden="true" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${d?"var(--red)":"var(--green)"}"></span>
          <span style="width:14px;flex-shrink:0;text-align:center;color:${d?"var(--red)":"var(--green)"}">
            <span aria-hidden="true">${d?"✗":"✓"}</span><span class="sr-only">${d?"error":"ok"}</span>
          </span>
          <span style="width:120px;flex-shrink:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${r.model||"—"}</span>
          ${!d&&s`<span style="width:50px;flex-shrink:0;text-align:right">${r.duration_ms||0}ms</span>`}
          ${!d&&s`<span class="text-muted" style="width:70px;flex-shrink:0;text-align:right">${x(r.input_tokens||0)}in</span>`}
          ${d&&s`<span style="color:var(--red)">${f(r.error||"error")}</span>`}
          ${r.finish_reason&&s`<span class="badge" style="font-size:var(--fs-xs);color:${r.finish_reason==="length"?"var(--orange)":"var(--fg-muted)"}">${f(String(r.finish_reason))}</span>`}
          ${r.error_type&&s`<span class="badge" style="font-size:var(--fs-xs);color:var(--red)">${f(String(r.error_type))}</span>`}
          ${r.http_status&&s`<span class="badge" style="font-size:var(--fs-xs);color:${$?"var(--red)":"var(--fg-muted)"}">${f(String(r.http_status))}</span>`}
        </div>`})}
    </div>
  </div>`}function oe({project:t}){const{data:e,loading:o,error:i}=R(()=>gs(7).then(a=>(Array.isArray(a)?a.find(r=>r.project===t):null)||null),[t],{enabled:!!t});return o?s`<p class="loading-state">Loading project costs...</p>`:i?s`<p class="error-state">Failed to load project costs${i.message?` (${i.message})`:""}.</p>`:e?s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Sessions (7d)</div><div class="value">${e.sessions}</div></div>
      <div class="es-kv-card"><div class="label">Input Tokens</div><div class="value">${x(e.input_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Output Tokens</div><div class="value">${x(e.output_tokens)}</div></div>
      <div class="es-kv-card"><div class="label">Est. Cost</div><div class="value"><${_t} row=${e}/></div></div>
    </div>
    ${e.daily&&e.daily.length>0&&s`<div style="margin-top:var(--sp-3)">
      <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Daily breakdown</div>
      ${e.daily.map(a=>{const n=a.input_tokens+a.output_tokens,r=Math.max(...e.daily.map(v=>v.input_tokens+v.output_tokens),1),l=(n/r*100).toFixed(1),d=new Date(a.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"numeric",day:"numeric"});return s`<div key=${a.date} class="flex-row gap-sm" style="margin-bottom:var(--sp-1)">
          <span class="text-muted" style="width:56px;font-size:var(--fs-xs);flex-shrink:0">${d}</span>
          <div class="flex-1 overflow-hidden" style="height:12px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${l}%;background:var(--green);border-radius:3px"
              title="${x(n)} tokens"></div>
          </div>
          <span class="text-muted" style="width:40px;font-size:var(--fs-xs);flex-shrink:0">${x(n)}</span>
        </div>`})}
    </div>`}
  </div>`:s`<p class="empty-state">No cost data available for this project.</p>`}function ie({project:t,tool:e}){const{data:o,loading:i,error:a}=R(()=>Kt(t,e,30,20).then(d=>Array.isArray(d)?d:[]),[t,e],{enabled:!!(t&&e)});if(i)return s`<p class="loading-state">Loading run history...</p>`;if(a)return s`<p class="error-state">Failed to load run history${a.message?` (${a.message})`:""}.</p>`;if(!o||o.length<2)return s`<p class="empty-state">Not enough session history for trend analysis.</p>`;const n=Math.max(...o.map(d=>d.total_tokens),1),r=o.reduce((d,v)=>d+v.duration_s,0)/o.length,l=o.reduce((d,v)=>d+v.total_tokens,0)/o.length;return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Runs (30d)</div><div class="value">${o.length}</div></div>
      <div class="es-kv-card"><div class="label">Avg Duration</div><div class="value">${U(r)}</div></div>
      <div class="es-kv-card"><div class="label">Avg Tokens</div><div class="value">${x(l)}</div></div>
    </div>
    <div class="mono text-xs" style="max-height:14rem;overflow-y:auto">
      ${o.map(d=>{const v=(d.total_tokens/n*100).toFixed(1),u=new Date(d.ts*1e3).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),$=r>0?d.duration_s/r:1;return s`<div key=${d.ts} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);align-items:center">
          <span class="text-muted" style="width:100px;flex-shrink:0">${u}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;border-radius:3px;background:${$>1.5?"var(--orange)":$<.7?"var(--green)":"var(--accent)"}" title="${x(d.total_tokens)} tok, ${U(d.duration_s)}"></div>
          </div>
          <span style="width:50px;flex-shrink:0;text-align:right">${x(d.total_tokens)}</span>
          <span class="text-muted" style="width:40px;flex-shrink:0;text-align:right">${U(d.duration_s)}</span>
        </div>`})}
    </div>
  </div>`}function le({sessionId:t}){const{data:e,loading:o,error:i}=R(()=>hs(t),[t],{enabled:!!t});if(o)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading MCP usage\u2026</div>`;if(i)return s`<div class="error-state text-xs" style="padding:0">Failed to load MCP usage${i.message?` (${i.message})`:""}.</div>`;const a=e&&Array.isArray(e.servers)?e.servers:[],n=e&&Array.isArray(e.configured_servers)?e.configured_servers:[],r=new Set(a.map(d=>d.server_name)),l=n.filter(d=>!r.has(d));return!a.length&&!n.length?s`<div class="text-xs text-muted">No MCP servers called in this session.</div>`:s`<div class="mcp-usage-panel" aria-label="MCP server usage for session">
    ${a.length>0&&s`
      <div class="text-xs text-muted mb-sm">
        ${a.length} server${a.length===1?"":"s"} called \u00b7
        ${e.total_calls||0} total call${(e.total_calls||0)===1?"":"s"}
      </div>
      <div class="mcp-usage-rows">
        ${a.map(d=>{const v=(d.err_count||0)>0;return s`<div key=${d.server_name} class="mcp-usage-row flex-row gap-sm"
            style="align-items:center;padding:var(--sp-1) 0">
            <span class="mono text-xs" style="flex:1" title=${d.server_name}>${f(d.server_name)}</span>
            <span class="text-xs mono">${d.call_count}</span>
            ${v&&s`<span class="text-xs text-orange" title=${d.err_count+" error(s)"}>!${d.err_count}</span>`}
          </div>`})}
      </div>
    `}
    ${a.length===0&&n.length>0&&s`
      <div class="text-xs text-muted mb-sm">No MCP servers called in this session.</div>
    `}
    ${l.length>0&&s`
      <div class="mcp-usage-unused" style="margin-top:var(--sp-2);opacity:0.55">
        <div class="text-xs text-muted mb-sm">Configured but unused (${l.length})</div>
        <div class="mcp-usage-rows">
          ${l.map(d=>s`<div key=${d} class="mono text-xs"
            style="padding:var(--sp-1) 0">${f(d)}</div>`)}
        </div>
      </div>
    `}
  </div>`}function re({sessionId:t}){const{data:e,loading:o,error:i}=R(()=>ys(t),[t],{enabled:!!t});if(o||!t)return s`<p class="loading-state">Loading cost breakdown\u2026</p>`;if(i)return s`<p class="empty-state">Failed to load cost data.</p>`;if(!e||!e.models||!e.models.length)return s`<p class="empty-state">No per-model cost data recorded for this session.</p>`;const{models:a,totals:n}=e,r=Math.max(...a.map(l=>l.cost_usd||0),1e-9);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Models</div><div class="value">${a.length}</div></div>
      <div class="es-kv-card"><div class="label">Requests</div><div class="value">${n.requests}</div></div>
      <div class="es-kv-card" title="Estimated from token counts and list prices. Not a billed amount."><div class="label">Estimated total</div><div class="value"><${_t} row=${n} digits=${4}/></div></div>
    </div>
    <div style="margin-top:var(--sp-2)">
      ${a.map((l,d)=>{const v=((l.cost_usd||0)/r*100).toFixed(1),u=(l.input_tokens||0)+(l.output_tokens||0);return s`<div key=${d} style="margin-bottom:var(--sp-2)">
          <div class="flex-row gap-sm" style="align-items:baseline;margin-bottom:2px">
            <span class="mono text-xs text-ellipsis" style="flex:1;min-width:0" title=${l.model}>${f(l.model)}</span>
            <span class="text-xs text-muted" style="flex-shrink:0">${l.requests} req \u00b7 ${x(u)} tok</span>
            <span class="text-xs mono" style="flex-shrink:0;width:64px;text-align:right"><${_t} row=${l} digits=${4} showSub=${!1}/></span>
          </div>
          <div class="overflow-hidden" style="height:8px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${v}%;background:var(--accent);border-radius:3px"
              title=${xs(l,4).main}></div>
          </div>
          <div class="text-muted" style="font-size:var(--fs-xs);margin-top:2px">
            ${x(l.input_tokens||0)} in \u00b7 ${x(l.output_tokens||0)} out
            ${l.cache_read_tokens>0?s` \u00b7 ${x(l.cache_read_tokens)} cache-read`:""}
          </div>
        </div>`})}
    </div>
  </div>`}const Dt={lead:"var(--accent)",subagent:"var(--green)",unknown:"var(--fg-muted)"};function de({sessionId:t}){const{data:e,loading:o,error:i}=R(()=>_s(t),[t],{enabled:!!t});if(o||!t)return s`<p class="loading-state">Loading process tree\u2026</p>`;if(i)return s`<p class="empty-state">Failed to load process data.</p>`;if(!e||!e.processes||!e.processes.length)return s`<p class="empty-state">No persisted processes recorded for this session.</p>`;const{processes:a,by_role:n,total:r}=e;return s`<div>
    <div class="flex-row gap-sm flex-wrap mb-sm">
      <span class="badge text-xs">${r} process${r===1?"":"es"}</span>
      ${Object.entries(n).map(([l,d])=>s`
        <span key=${l} class="badge text-xs" style="color:${Dt[l]||"var(--fg-muted)"}">
          ${f(l)}: ${d}
        </span>`)}
    </div>
    <div class="mono text-xs">
      ${a.map((l,d)=>{const v=Dt[l.role]||"var(--fg-muted)",u=l.joined_at?Y(l.joined_at):"—";return s`<div key=${d} class="flex-row gap-sm" style="padding:2px 0;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${v}"></span>
          <span style="width:64px;flex-shrink:0;text-align:right">${l.pid}</span>
          <span style="width:80px;flex-shrink:0;color:${v}">${f(l.role||"unknown")}</span>
          <span class="text-ellipsis" style="flex:1;min-width:0">${f(l.tool||"")}</span>
          <span class="text-muted" style="flex-shrink:0">${u}</span>
        </div>`})}
    </div>
  </div>`}function ce({sessionId:t}){const[e,o]=b({}),i=Array.isArray(t)?t.join("|"):t,{data:a,loading:n,error:r}=R(()=>bs(t),[i],{enabled:!!i});O(()=>{o({})},[i]);const l=p=>o(m=>({...m,[p]:!m[p]}));if(n||!i)return s`<p class="loading-state">Loading tool calls…</p>`;if(r)return s`<p class="empty-state">Failed to load tool-call data.</p>`;if(!a||!a.calls||!a.calls.length)return s`<p class="empty-state">No tool-call data recorded for this session.</p>`;const{calls:d,by_tool:v,total:u,errors:$}=a,c=Object.entries(v).sort((p,m)=>m[1]-p[1]),y=Math.max(...c.map(([,p])=>p),1);return s`<div>
    <div class="es-kv mb-sm" style="gap:var(--sp-3)">
      <div class="es-kv-card"><div class="label">Tool Calls</div><div class="value">${u}</div></div>
      <div class="es-kv-card"><div class="label">Errors</div>
        <div class="value" style="color:${$>0?"var(--red)":"var(--fg)"}">${$}</div>
      </div>
      <div class="es-kv-card"><div class="label">Distinct Tools</div><div class="value">${c.length}</div></div>
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">By tool</div>
    <div style="margin-bottom:var(--sp-3)">
      ${c.map(([p,m])=>{const g=(m/y*100).toFixed(1);return s`<div key=${p} class="flex-row gap-sm" style="align-items:center;margin-bottom:2px">
          <span class="text-xs text-ellipsis" style="width:120px;flex-shrink:0" title=${p}>${f(p)}</span>
          <div class="flex-1 overflow-hidden" style="height:10px;border-radius:3px;background:var(--border)">
            <div style="height:100%;width:${g}%;background:var(--green);border-radius:3px"></div>
          </div>
          <span class="text-muted text-xs" style="width:32px;flex-shrink:0;text-align:right">${m}</span>
        </div>`})}
    </div>
    <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Timeline</div>
    <div class="mono text-xs" style="max-height:12rem;overflow-y:auto">
      ${d.slice(0,60).map((p,m)=>{const g=p.ts?Y(p.ts):"—",h=p.input||"",_=!!e[m];return s`<div key=${m} style="padding:2px 0">
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
              aria-expanded=${_}
              aria-label=${(_?"Collapse":"Expand")+" input for "+p.tool_name}
              title=${_?"Collapse input":"Expand input"}
              onClick=${()=>l(m)}
              style=${"display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:1px 0 3px 74px;"+(_?"white-space:pre-wrap;word-break:break-word":"white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              ${f(h)}${p.input_truncated&&_?"…":""}
            </button>`:null}
        </div>`})}
    </div>
  </div>`}function pe({sessionId:t,onKilled:e}){const[o,i]=b(!1),[a,n]=b(!1),[r,l]=b(null),[d,v]=b(null);async function u(){n(!0),v(null);try{const $=await ks(t,"TERM");l($),i(!1),e&&e($)}catch($){v($.message||"Failed to signal session")}finally{n(!1)}}return r?s`<span class="text-xs" style="color:var(--green)" title=${JSON.stringify(r)}>
      Signaled ${r.signaled.length} pid${r.signaled.length===1?"":"s"}
      ${r.failed.length?s` \u00b7 ${r.failed.length} failed`:""}
    </span>`:o?s`<span class="flex-row gap-sm" style="align-items:center">
    <span class="text-xs" style="color:var(--red)">Confirm kill?</span>
    <button class="badge" style="background:var(--red);color:var(--on-status);cursor:pointer;font-size:var(--fs-xs)"
      disabled=${a} onClick=${u}>${a?"…":"Yes, SIGTERM"}</button>
    <button class="badge" style="cursor:pointer;font-size:var(--fs-xs)" onClick=${()=>i(!1)}>Cancel</button>
    ${d&&s`<span class="text-xs" style="color:var(--red)">${d}</span>`}
  </span>`:s`<button class="badge" style="background:transparent;border:1px solid var(--red);color:var(--red);cursor:pointer;font-size:var(--fs-xs)"
      onClick=${()=>i(!0)} title="Send SIGTERM to this session's process tree">
      Kill
    </button>`}const kt=t=>t==null?"n/a":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:`${(t/1048576).toFixed(1)} MB`,ue=t=>t?new Date(t*1e3).toLocaleString():"n/a",ve=t=>t&&(t.status===404||/\b404\b/.test(t.message||"")),lt="white-space:pre-wrap;overflow-wrap:anywhere";function me({sessionId:t,artifact:e}){const{data:o,loading:i,error:a}=R(()=>Jt(`/api/copilot-sessions/${encodeURIComponent(t)}/artifact?path=${encodeURIComponent(e.path)}`),[t,e.path]);return i?s`<div class="text-xs text-muted loading-state" style="padding:0">Loading file…</div>`:a?s`<div class="error-state text-xs" style="padding:0">Could not read this file${a.message?` (${a.message})`:""}.</div>`:o.binary?s`<div class="text-xs text-muted">Binary file, ${kt(o.size)}. Not shown.</div>`:s`<div>
    ${o.truncated&&s`<div class="text-xs text-muted">First part of ${kt(o.size)} shown.</div>`}
    <pre class="mono text-xs" style="max-height:320px;overflow:auto;background:var(--bg3);padding:var(--sp-2);${lt}">${o.content}</pre>
  </div>`}function fe({sessionId:t,artifact:e}){const[o,i]=b(!1),a=e.readable&&e.path;return s`<li style="padding:var(--sp-1) 0;border-bottom:1px solid var(--border-subtle)">
    <div class="text-xs" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:baseline">
      <span class="text-muted">${e.type}</span>
      ${a?s`<button type="button" class="mono text-xs" aria-expanded=${o} style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0;text-align:left;${lt}" onClick=${()=>i(!o)}>${e.name}</button>`:s`<span class="mono" style=${lt}>${e.name}</span>`}
      <span class="text-muted">${kt(e.size)}</span>
      <span class="text-muted">${ue(e.modified_at)}</span>
      ${e.checkpoint!==void 0&&s`<span class="text-muted">checkpoint ${e.checkpoint}</span>`}
    </div>
    ${o&&s`<${me} sessionId=${t} artifact=${e}/>`}
  </li>`}function $e({sessionId:t}){const{data:e,loading:o,error:i}=R(()=>Jt(`/api/copilot-sessions/${encodeURIComponent(t)}/artifacts`),[t],{enabled:!!t});if(o)return s`<div class="text-xs text-muted loading-state" style="padding:0">Loading session files…</div>`;if(ve(i))return s`<div class="text-xs text-muted">No session folder found for ${t}.</div>`;if(i)return s`<div class="error-state text-xs" style="padding:0">Failed to load session files${i.message?` (${i.message})`:""}.</div>`;const a=e&&Array.isArray(e.artifacts)?e.artifacts:[];return s`<div>
    <div class="mono text-xs" style=${lt} title="Session folder">${e&&e.folder?e.folder:"No folder on disk"}</div>
    ${a.length===0?s`<div class="text-xs text-muted">No files in this session.</div>`:s`<ul style="list-style:none;margin:var(--sp-2) 0 0;padding:0">
          ${a.map(n=>s`<${fe} key=${n.name} sessionId=${t} artifact=${n}/>`)}
        </ul>`}
  </div>`}function ge({session:t,onClose:e}){const o=Xt(t.tool),i=t.files_loaded||[],a=t.files_touched||[],n=t.exact_input_tokens||0,r=t.exact_output_tokens||0,l=t.entity_state||null,d=l&&l.agents&&l.agents.length>0,v=l&&l.tasks&&l.tasks.length>0;return s`<div class="sd-container" style="border-left:3px solid ${o}">
    <div class="sd-header">
      <div class="flex-row gap-sm" style="align-items:center">
        <strong style="font-size:var(--fs-lg)" title=${t.tool}>${f(Tt(t.tool))}</strong>
        ${t.project&&s`<span class="text-muted text-xs mono text-ellipsis" style="max-width:250px"
          title=${t.project}>${f(t.project.replace(/\\/g,"/").split("/").pop())}</span>`}
        <span class="badge" style="background:var(--green);color:var(--on-status);font-size:var(--fs-xs)">
          ${U(t.duration_s)}
        </span>
        ${d&&s`<span class="badge" style="background:var(--accent);color:var(--on-status);font-size:var(--fs-xs)">
          Team (${l.agents.length})
        </span>`}
        ${t.active&&s`<${pe} sessionId=${t.session_id}/>`}
      </div>
      <div class="text-muted text-xs mono" style="margin-top:var(--sp-2)" title=${t.session_id}>
        ${t.session_id}
      </div>
      ${e&&s`<button class="sd-close" onClick=${e} aria-label="Close session detail">\u2715</button>`}
    </div>

    <${B} title="Actions" icon="zap" badge=${null} defaultOpen=${!0}>
      <${js} sessionId=${t.session_id}/>
    <//>
    <${B} title="Conversation" icon="message-square" defaultOpen=${!1}>
      <${Us} sessionId=${t.session_id} withheld=${t.content_retained===!1}/>
    <//>
    ${d&&s`<${B} title="Team" icon="users" badge=${l.agents.length+" agents"} defaultOpen=${!0}>
      <${Fs} entityState=${l}/>
    <//>`}
    ${v&&s`<${B} title="Tasks" icon="clipboard-list" badge=${l.tasks.length} defaultOpen=${!0}>
      <${Ns} tasks=${l.tasks}/>
    <//>`}
    <${B} title="Context" icon="book-open" badge=${i.length||null}>
      <${Gs} session=${t}/>
    <//>
    <${B} title="Memory" icon="brain" defaultOpen=${!1}>
      <${Js} session=${t}/>
    <//>
    <${B} title="Resources" icon="layers" badge=${x(n+r)+" tok"}>
      <${ee} session=${t}/>
    <//>
    <${B} title="Estimated cost by model" icon="banknote" defaultOpen=${!1}>
      <${re} sessionId=${t.session_id}/>
    <//>
    ${String(t.tool||"").startsWith("copilot")&&s`<${B} title="Session files" icon="folder" defaultOpen=${!1}>
      <${$e} sessionId=${t.session_id}/>
    <//>`}
    <${B} title="Tool Calls" icon="wrench" defaultOpen=${!1}>
      <${ce} sessionId=${pt(t)}/>
    <//>
    <${B} title="Process Tree" icon="git-branch" defaultOpen=${!1}>
      <${de} sessionId=${t.session_id}/>
    <//>
    <${B} title="MCP Servers" icon="server" defaultOpen=${!1}>
      <${le} sessionId=${t.session_id}/>
    <//>
    <${B} title="Deliverables" icon="package" badge=${a.length||null}>
      <${ae} session=${t}/>
    <//>
    <${B} title="API Calls" icon="globe" defaultOpen=${!1}>
      <${ne} sessionId=${t.session_id}/>
    <//>
    ${t.project&&s`<${B} title="Estimated project costs" icon="banknote" defaultOpen=${!1}>
      <${oe} project=${t.project}/>
    <//>`}
    ${t.project&&t.tool&&s`<${B} title="Run History" icon="line-chart" defaultOpen=${!1}>
      <${ie} project=${t.project} tool=${t.tool}/>
    <//>`}
  </div>`}function vt({tools:t,activeTool:e,onSelect:o}){var a;const i=(a=J(X))==null?void 0:a.snap;return t.length<=1?null:s`<div class="sf-tool-tabs">
    ${t.map(n=>s`<button key=${n} class="sf-tool-tab ${n===e?"active":""}"
      style="border-bottom-color:${n===e?Yt[n]||"var(--accent)":"transparent"}"
      onClick=${()=>o(n)}>
      <${ws} tool=${n} size="1em"/> ${f(Tt(n,i))}
    </button>`)}
  </div>`}function Ct({sessions:t,activeId:e,onSelect:o,loading:i,error:a=null}){return i?s`<div class="sf-sess-tabs"><span class="text-muted text-xs">Loading sessions...</span></div>`:a?s`<div class="sf-sess-tabs"><span class="error-state text-xs" style="padding:0">Failed to load sessions${a.message?` (${a.message})`:""}</span></div>`:t.length?s`<div class="sf-sess-tabs">
    ${t.map(n=>{const r=n.exact_input_tokens||n.input_tokens||0,l=n.exact_output_tokens||n.output_tokens||0,d=r+l,v=n.duration_s||(n.ended_at&&n.started_at?n.ended_at-n.started_at:0),u=n.session_id===e,$=!n.ended_at;return s`<button key=${n.session_id}
        title=${n.session_id}
        class="sf-sess-tab ${u?"active":""}"
        onClick=${()=>o(n.session_id)}>
        <span class="sf-stab-time">${bt(n.started_at)}</span>
        <span class="sf-stab-sid">${Ts(n.session_id)}</span>
        <span class="sf-stab-dur">${U(v)}</span>
        ${d>0&&s`<span class="sf-stab-tok">${x(d)}t</span>`}
        ${(n.files_modified||0)>0&&s`<span class="sf-stab-files">${n.files_modified}f</span>`}
        ${$&&s`<span class="sf-stab-live">\u25CF</span>`}
      </button>`})}
  </div>`:s`<div class="sf-sess-tabs"><span class="text-muted text-xs">No sessions in range</span></div>`}function ns(t,e){if(!e)return"";let o=e;if(typeof e=="string")try{o=JSON.parse(e)}catch{return e.slice(0,80)}if(typeof o!="object"||o===null)return String(e).slice(0,80);const i=["command","file_path","pattern","query","path","url","prompt","description","old_string","content","skill"];for(const n of i)if(o[n]){let r=String(o[n]);return(n==="file_path"||n==="path")&&r.length>60&&(r=Qt(r)),r.slice(0,100)}const a=Object.keys(o);return a.length>0?String(o[a[0]]).slice(0,80):""}const Bt={Bash:"#84cc16"};function Rt(t){return Bt[t]?Bt[t]:Zt(t)}function he({event:t}){if(t.type==="user_message")return t.redacted?s`<div class="sf-seq-tooltip">
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
        Input: ${x(e.input||0)} \u00B7 Output: ${x(e.output||0)}
        ${(e.cache_read||0)>0?" · Cache: "+x(e.cache_read):""}
      </div>
      <div class="sf-tip-meta">
        ${t.duration_ms>0?"Duration: "+I(t.duration_ms):""}
        ${t.ttft_ms>0?" · TTFT: "+I(t.ttft_ms):""}
      </div>
      ${t.is_error&&s`<div class="sf-tip-meta" style="color:var(--red)">Error: ${f(t.error_type||"unknown")}</div>`}
    </div>`}if(t.type==="api_response"){const e=t.tokens||{},o=Number(t.http_status),i=Number.isFinite(o)&&o>=400;return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">API Response${t.model?" — "+t.model:""}</div>
      <div class="sf-tip-meta">
        Output: ${x(e.output||0)} tokens
        ${t.duration_ms>0?" · Latency: "+I(t.duration_ms):""}
        ${t.finish_reason?" · "+t.finish_reason:""}
      </div>
      ${(t.error_type||t.http_status)&&s`<div class="sf-tip-meta">
        ${t.error_type?s`<span style="color:var(--red)">${f(String(t.error_type))}</span>`:""}
        ${t.error_type&&t.http_status?" · ":""}
        ${t.http_status?s`<span style="color:${i?"var(--red)":"var(--fg-muted)"}">HTTP ${f(String(t.http_status))}</span>`:""}
      </div>`}
      ${t.response_preview&&s`<div class="sf-tip-body">${f(t.response_preview)}</div>`}
    </div>`}if(t.type==="error")return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label" style="color:var(--red)">Error: ${f(t.error_type||"unknown")}</div>
      ${t.error_message&&s`<div class="sf-tip-body">${f(t.error_message)}</div>`}
      ${t.parent_span&&s`<div class="sf-tip-meta">During: ${f(t.parent_span)}</div>`}
    </div>`;if(t.type==="tool_use"){let e=null;if(t.params){let a=t.params;if(typeof a=="string")try{a=JSON.parse(a)}catch{a=null}a&&typeof a=="object"&&(e=Object.entries(a).filter(([,n])=>n!=null&&n!==""))}const o=t.input_preview||"",i=t.result_summary||"";return s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">${f(t.to||"Tool")}${t.subtype==="result"?" (result)":t.subtype==="decision"?" (decision)":""}</div>
      ${t.decision&&s`<div class="sf-tip-meta" style="margin-bottom:var(--sp-2)">Decision: <strong>${f(t.decision)}</strong></div>`}
      ${e?s`<div class="sf-tip-params">
            ${e.map(([a,n])=>{const r=String(n),l=r.length>120;return s`<div key=${a} class="sf-tip-param-row">
                <span class="sf-tip-param-key">${f(a)}</span>
                <span class="sf-tip-param-val ${l?"sf-tip-param-long":""}" title=${r}>${f(l?r.slice(0,200)+"...":r)}</span>
              </div>`})}
          </div>`:t.params&&s`<div class="sf-tip-body mono">${f(t.params)}</div>`}
      ${o&&s`<div class="sf-tip-meta mono" style="margin-top:var(--sp-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${o}>input: ${f(o.length>200?o.slice(0,200)+"…":o)}</div>`}
      ${i&&s`<div class="sf-tip-meta mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${i}>result: ${f(i.length>200?i.slice(0,200)+"…":i)}</div>`}
      ${(t.success||t.duration_ms>0||t.result_size)&&s`<div class="sf-tip-meta" style="margin-top:var(--sp-2)">
        ${t.success?"Success: "+t.success:""}
        ${t.duration_ms>0?" · "+I(t.duration_ms):""}
        ${t.result_size?" · Result: "+t.result_size+" bytes":""}
      </div>`}
    </div>`}return t.type==="subagent"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Subagent: ${f(t.to||"agent")}</div>
    </div>`:t.type==="hook"?s`<div class="sf-seq-tooltip">
      <div class="sf-tip-label">Hook: ${f(t.hook_name||"")}</div>
    </div>`:null}function ye({event:t,participants:e,hoveredIdx:o,idx:i,onHover:a}){const n=e.findIndex(k=>k.id===t._from),r=e.findIndex(k=>k.id===t._to);if(n<0||r<0)return null;const l=r>n,d=Math.min(n,r),v=Math.max(n,r),u=o===i,$=e.find(k=>k.id===t._to),y={user_message:"var(--green)",api_call:t.is_error?"var(--red)":"var(--accent)",api_response:"var(--green)",error:"var(--red)",tool_use:($==null?void 0:$.color)||"var(--cat-commands)",subagent:($==null?void 0:$.color)||"var(--yellow)",hook:"var(--orange)"}[t.type]||"var(--fg2)";let p="",m="";if(t.type==="user_message")t.redacted?p="prompt ("+(t.prompt_length||"?")+" chars)":(p=t.preview||"(prompt)",t.prompt_length&&(m=t.prompt_length+" chars"));else if(t.type==="api_call"){const k=t.tokens||{};p=t.agent_name||tt(t.model)||"API call",m=x((k.input||0)+(k.output||0))+"t",t.ttft_ms>0?m+=" ttft:"+I(t.ttft_ms):t.duration_ms>0&&(m+=" "+I(t.duration_ms)),t.is_error&&(m+=" ⚠")}else if(t.type==="api_response"){const k=t.tokens||{};p="← "+x(k.output||0)+"t",t.response_preview&&(p+=" "+t.response_preview.slice(0,60)),m=tt(t.model)||"",t.finish_reason&&t.finish_reason!=="stop"&&(m+=" ["+t.finish_reason+"]")}else if(t.type==="error")p="⚠ "+(t.error_type||"error"),m=t.error_message?t.error_message.slice(0,60):"";else if(t.type==="tool_use"){const k=t.to||"tool",w=ns(k,t.params);p=k+(w?": "+w:""),t.subtype==="result"?(m=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(m+=" "+I(t.duration_ms)),t.result_size&&(m+=" "+t.result_size+"B")):t.subtype==="decision"&&(m=t.decision||"")}else t.type==="subagent"?p=t.to||"subagent":t.type==="hook"&&(p=t.hook_name||"hook");const g=100/e.length,h=(d+.5)*g,_=(v+.5)*g;return s`<div class="sf-seq-row ${u?"hovered":""}"
    onMouseEnter=${()=>a(i)} onMouseLeave=${()=>a(null)}>
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok">${t._cumTok>0?x(t._cumTok):""}</span>
      <span class="sf-seq-rttok">${t._rtTok>0?x(t._rtTok):""}</span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-arrow-area">
      ${e.map((k,w)=>s`<div key=${w} class="sf-seq-lane"
        style="left:${(w+.5)*g}%"></div>`)}
      <div class="sf-seq-arrow-line" style="
        left:${h}%;
        width:${_-h}%;
        border-color:${y};
      "></div>
      <div class="sf-seq-arrowhead" style="
        left:${l?_:h}%;
        border-${l?"left":"right"}-color:${y};
        transform:translateX(${l?"-100%":"0"});
      "></div>
      <div class="sf-seq-label" style="
        left:${(h+_)/2}%;
        color:${y};
      "><span class="sf-seq-label-text" title=${p}>${t.type==="user_message"&&t.redacted?s`<${L} name="lock" size="0.85em"/> `:""}${f(p)}</span>
        ${m&&s`<span class="sf-seq-sublabel">${m}</span>`}
      </div>
    </div>
    ${u&&s`<${he} event=${t}/>`}
  </div>`}function xe({event:t}){let e="",o="var(--fg2)",i="";return t.type==="session_start"?(e="Session started",o="var(--green)",i="▶"):t.type==="session_end"?(e="Session ended",o="var(--fg3)",i="■"):t.type==="compaction"&&(e="Compaction"+(t.compaction_count?" #"+t.compaction_count:""),o="var(--orange)",i="⟳"),s`<div class="sf-seq-marker" style="border-left-color:${o}">
    <div class="sf-seq-tokens">
      <span class="sf-seq-cumtok"></span><span class="sf-seq-rttok"></span>
    </div>
    <div class="sf-seq-time">${Y(t.ts)}</div>
    <div class="sf-seq-marker-body" style="color:${o}">
      ${i} ${e}
      ${t.type==="compaction"&&t.duration_ms>0?" — "+I(t.duration_ms):""}
      ${t.cwd?s` <span class="text-muted text-xs mono">${f(t.cwd)}</span>`:""}
    </div>
  </div>`}const _e={user_message:{lane:"user",kind:"call"},api_call:{lane:"api",kind:"call"},api_response:{lane:"api",kind:"return"},error:{lane:"api",kind:"return"},tool_use:{lane:"tool",kind:"call"},subagent:{lane:"agent",kind:"call"},hook:{lane:"hook",kind:"recv"},session_start:{lane:"session",kind:"marker"},session_end:{lane:"session",kind:"marker"},compaction:{lane:"compact",kind:"marker"}},jt={call:"◇",return:"◆",recv:"◌",marker:"■"},be={user:"var(--accent)",api:"var(--orange)",tool:"var(--cat-commands)",agent:"var(--cat-agent)",hook:"var(--cat-prompt)",session:"var(--green)",compact:"var(--yellow)"};function ke(t){if(t.type==="user_message")return{label:t.redacted?"🔒 prompt ("+(t.prompt_length||"?")+" chars)":t.preview||"(prompt)",meta:t.prompt_length?t.prompt_length+" chars":"",size:""};if(t.type==="api_call"){const e=t.tokens||{},o=(e.input||0)+(e.output||0),i=t.agent_name||tt(t.model)||"API call";let a=x(o)+"t";return t.ttft_ms>0?a+=" · ttft "+I(t.ttft_ms):t.duration_ms>0&&(a+=" · "+I(t.duration_ms)),t.is_error&&(a+=" ⚠"),{label:i,meta:a,size:""}}if(t.type==="api_response"){const o=(t.tokens||{}).output||0,i="← "+x(o)+"t"+(t.response_preview?" "+t.response_preview.slice(0,80):""),a=[tt(t.model),t.finish_reason&&t.finish_reason!=="stop"?"["+t.finish_reason+"]":""].filter(Boolean).join(" ");return{label:i,meta:a,size:o?x(o)+"t":""}}if(t.type==="error")return{label:"⚠ "+(t.error_type||"error"),meta:(t.error_message||"").slice(0,80),size:""};if(t.type==="tool_use"){const e=t.to||"tool",o=ns(e,t.params),i=e+(o?": "+o:"");let a="";t.subtype==="result"?(a=t.success==="true"||t.success===!0?"✓":"✗",t.duration_ms>0&&(a+=" "+I(t.duration_ms))):t.subtype==="decision"&&(a=t.decision||"");const n=t.result_size?t.result_size+"B":"";return{label:i,meta:a,size:n}}return t.type==="subagent"?{label:t.to||"subagent",meta:"",size:""}:t.type==="hook"?{label:t.hook_name||"hook",meta:"",size:""}:t.type==="session_start"?{label:"▶ Session started",meta:t.cwd||"",size:""}:t.type==="session_end"?{label:"■ Session ended",meta:"",size:""}:t.type==="compaction"?{label:"⟳ Compaction"+(t.compaction_count?" #"+t.compaction_count:""),meta:t.duration_ms>0?I(t.duration_ms):"",size:""}:{label:t.type||"(event)",meta:"",size:""}}function we(t){return{call:"requested",return:"returned",recv:"tokens",marker:"marker"}[t]||""}function Te({events:t,selectedIdx:e,onSelect:o}){return!t||t.length===0?null:s`<ul class="sv-list">
    ${t.map((i,a)=>{const n=_e[i.type]||{lane:"tool",kind:"call"},r=be[n.lane]||"var(--fg2)",l=ke(i),d=a===e,v=a===t.length-1;return s`<li key=${a} class="sv-li"><button
        type="button"
        class=${"sv-row"+(d?" sv-row--sel":"")}
        onClick=${()=>o&&o(a)}
        aria-current=${d?"true":"false"}>
        <div class="sv-when">
          <div class="sv-when-time">${Y(i.ts)}</div>
          ${(i._cumTok>0||i._rtTok>0)&&s`<div class="sv-when-tok">
            ${i._cumTok>0?x(i._cumTok)+" cum":""}
            ${i._rtTok>0?" · "+x(i._rtTok)+" rt":""}
          </div>`}
        </div>
        <div class="sv-spine">
          <span class="sv-spine-line ${v?"sv-spine-line--last":""}"></span>
          <span class="sv-dot" style=${"border-color:"+r+";color:"+r}>
            ${jt[n.kind]||jt.call}
          </span>
        </div>
        <div class="sv-body">
          <div class="sv-meta-row">
            <span class="sv-lane" style=${"color:"+r}>${n.lane}</span>
            <span class="sv-kind">${we(n.kind)}</span>
          </div>
          <div class="sv-label" title=${l.label}>${f(l.label)}</div>
          ${l.meta&&s`<div class="sv-sub">${f(l.meta)}</div>`}
        </div>
        <div class="sv-size">
          ${l.size&&s`<span class="sv-size-chip">${f(l.size)}</span>`}
        </div>
      </button></li>`})}
  </ul>`}function Se(t){const e=t.tokens||{};return t.type==="api_call"?x(e.input||0)+"t in":t.type==="api_response"?x(e.output||0)+"t out":t.type==="tool_use"?t.result_size?t.result_size+"B out":"—":t.type==="user_message"&&t.prompt_length?t.prompt_length+" chars in":"—"}function qt(t){if(t==null||t==="")return"";if(typeof t=="string")try{const e=JSON.parse(t);return JSON.stringify(e,null,2)}catch{return t}try{return JSON.stringify(t,null,2)}catch{return String(t)}}function Ce(t){return t.type==="user_message"?t.message||t.preview||"":t.type==="api_call"?t.request_preview||t.prompt_preview||"":t.type==="tool_use"?t.params||t.input_preview||"":t.type==="hook"&&t.hook_input||""}function Ae(t){return t.type==="api_response"?t.response_preview||"":t.type==="api_call"&&t.is_error?t.error_message||"":t.type==="tool_use"?t.result_summary||t.result_preview||"":t.type==="error"?t.error_message||"":t.type==="hook"&&t.hook_output||""}function Ee({event:t,onClose:e}){if(!t)return s`<div class="sv-insp sv-insp--empty">
      <div class="sv-insp-empty-tag">No selection</div>
      <div class="sv-insp-empty-msg">
        Choose any event in the timeline to read its full payload.
      </div>
    </div>`;const o=[["Type",t.type||""],["Started",Y(t.ts)],["Duration",t.duration_ms?I(t.duration_ms):"—"],["Bytes",Se(t)],["Model",tt(t.model||"")||"—"],["Decision",t.decision||(t.success===!1?"failed":t.success===!0?"ok":"—")]],i=qt(Ce(t)),a=qt(Ae(t)),n=t.agent_name||t.to||t.hook_name||t.preview||t.type||"Event";return s`<div class="sv-insp" role="complementary" aria-label="Event details">
    <div class="sv-insp-head">
      <div>
        <div class="sv-insp-overline">Event \u00B7 ${t.type||""}</div>
        <div class="sv-insp-title">${f(n)}</div>
      </div>
      ${e&&s`<button class="sv-insp-close" onClick=${e} aria-label="Close inspector">\u00D7</button>`}
    </div>

    <div class="sv-insp-meta">
      ${o.map(([r,l])=>s`<div class="sv-insp-meta-row" key=${r}>
        <span class="sv-insp-meta-k">${r}</span>
        <span class="sv-insp-meta-v">${f(String(l||"—"))}</span>
      </div>`)}
    </div>

    ${i&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Input</span></div>
      <pre class="sv-insp-pre">${f(i)}</pre>
    </div>`}

    ${a&&s`<div class="sv-insp-section">
      <div class="sv-insp-rule"><span>Output</span></div>
      <pre class="sv-insp-pre">${f(a)}</pre>
    </div>`}
  </div>`}function Me({summary:t}){return!t||!t.event_count?null:s`<div class="sf-summary">
    ${t.total_turns>0&&s`<div class="sf-summary-stat"><div class="label">Prompts</div><div class="value">${t.total_turns}</div></div>`}
    <div class="sf-summary-stat"><div class="label">API Calls</div><div class="value">${t.total_api_calls||0}</div></div>
    ${t.total_tool_uses>0&&s`<div class="sf-summary-stat"><div class="label">Tools</div><div class="value">${t.total_tool_uses}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Tokens</div><div class="value">${x(t.total_tokens)}</div></div>
    <div class="sf-summary-stat"><div class="label">In/Out</div><div class="value">${x(t.total_input_tokens)}/${x(t.total_output_tokens)}</div></div>
    ${t.compactions>0&&s`<div class="sf-summary-stat"><div class="label">Compactions</div><div class="value" style="color:var(--orange)">${t.compactions}</div></div>`}
    <div class="sf-summary-stat"><div class="label">Duration</div><div class="value">${U(t.duration_s)}</div></div>
    <div class="sf-summary-stat"><div class="label">Events</div><div class="value">${t.event_count}</div></div>
  </div>`}function Pe(t,e){const o=new Set,i=[],a=(n,r,l)=>{o.has(n)||(o.add(n),i.push({id:n,label:r||n,color:l||"var(--fg2)"}))};a("user","User","var(--green)"),a("tool",e||"AI Tool",Yt[e]||"var(--accent)");for(const n of t){if((n.type==="api_call"||n.type==="api_response"||n.type==="error")&&a("api","API","var(--accent)"),n.type==="tool_use"){const r=n.to||"tool";a("skill:"+r,r,Rt(r))}if(n.type==="subagent"){const r=n.to||"Subagent";a("subagent:"+r,r,Rt(r))}n.type==="hook"&&a("hook","Hooks","var(--orange)")}return i}const os="aictl-pref-session_flow_mode";function Le(){try{return localStorage.getItem(os)==="swimlane"?"swimlane":"timeline"}catch{return"timeline"}}function Oe(t){try{localStorage.setItem(os,t)}catch{}}function ze({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:o}=J(X),{sessions:i,loading:a,error:n,tools:r,toolSessions:l,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=ut({globalRange:e,enabledTools:o}),[c,y]=b(null),[p,m]=b(!1),[g,h]=b(null),[_,k]=b(null),[w,F]=b(Le),E=t!=null,P=E?t:u;O(()=>{if(!P){y(null);return}m(!0);const C=st(i,P),N=C!=null&&C.started_at?C.started_at-60:Date.now()/1e3-86400,K=C!=null&&C.ended_at?C.ended_at+60:Date.now()/1e3+60,T=C?pt(C):[P];St(T,N,K).then(D=>{y(D),m(!1)}).catch(()=>{y(null),m(!1)})},[P,i.length]);const{processedTurns:M,participants:z}=H(()=>{const C=(c==null?void 0:c.turns)||[];if(!C.length)return{processedTurns:[],participants:[]};const N=C.map(A=>{const S={...A};return A.type==="user_message"?(S._from="user",S._to="tool"):A.type==="api_call"?(S._from=A.from||"tool",S._to="api"):A.type==="api_response"||A.type==="error"?(S._from="api",S._to="tool"):A.type==="tool_use"?(S._from="tool",S._to="skill:"+(A.to||"tool")):A.type==="subagent"?(S._from="tool",S._to="subagent:"+(A.to||"agent")):A.type==="hook"&&(S._from="tool",S._to="hook"),S});let K=0,T=0;for(const A of N){const S=A.tokens||{},j=(S.input||0)+(S.output||0);A.type==="user_message"&&(T=0),A.type==="api_call"&&(K+=j,T+=j),A._cumTok=K,A._rtTok=T}const D=Pe(N,d);return{processedTurns:N,participants:D}},[c,d]),V=(c==null?void 0:c.summary)||{};O(()=>{k(null)},[P,w]);const W=C=>{F(C),Oe(C)},G=_!=null?M[_]:null;return s`<div class="sf-container">
    ${!E&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}

    ${!E&&s`<${Ct} sessions=${l} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}

    <div class="sf-toolbar">
      <${Me} summary=${V}/>
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
                <${Te} events=${M}
                  selectedIdx=${_} onSelect=${k}/>
              </div>
              <aside class="sv-aside">
                <${Ee} event=${G}
                  onClose=${()=>k(null)}/>
              </aside>`:s`
              <div class="sf-seq-header">
                <div class="sf-seq-tokens">
                  <span class="sf-seq-cumtok" title="Cumulative tokens">cum</span>
                  <span class="sf-seq-rttok" title="Round-trip tokens (resets per user message)">rt</span>
                </div>
                <div class="sf-seq-time"></div>
                <div class="sf-seq-arrow-area">
                  ${z.map((C,N)=>{const K=100/z.length;return s`<div key=${C.id} class="sf-seq-participant"
                      style="left:${(N+.5)*K}%;color:${C.color}">
                      <div class="sf-seq-participant-box" style="border-color:${C.color}">${f(C.label)}</div>
                    </div>`})}
                </div>
              </div>
              <div class="sf-seq-body">
                ${M.map((C,N)=>C._from&&C._to?s`<${ye} key=${N} event=${C} participants=${z}
                      hoveredIdx=${g} idx=${N} onHover=${h}/>`:s`<${xe} key=${N} event=${C} participants=${z}/>`)}
              </div>
            `}
    </div>
  </div>`}function Ie({sessions:t,activeId:e,onSelect:o,loading:i,error:a=null}){return i?s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">Loading sessions\u2026</div>`:a?s`<div class="error-state" style="padding:var(--sp-3);font-size:var(--fs-sm)">Failed to load sessions${a.message?` (${a.message})`:""}</div>`:t.length?s`<div class="tr-session-list"
    style="display:flex;gap:var(--sp-2);overflow-x:auto;padding-bottom:var(--sp-3);margin-bottom:var(--sp-4)">
    ${t.slice(0,20).map(n=>{const r=n.session_id===e,l=n.ended_at?Math.round(n.ended_at-n.started_at):0,d=l>0?I(l*1e3):"⏳ live",v=Y(n.started_at);return s`<button key=${n.session_id}
        class="tr-sess-btn ${r?"tr-sess-active":""}"
        onClick=${()=>o(n.session_id)}
        title=${n.session_id}>
        <span class="tr-sess-time">${v}</span>
        <span class="tr-sess-dur">${d}</span>
        ${n.is_live?s`<span class="tr-sess-live">\u25CF</span>`:null}
      </button>`})}
  </div>`:s`<div class="text-muted" style="padding:var(--sp-3);font-size:var(--fs-sm)">No sessions in range</div>`}function rt(t,e){return t?t.length>e?t.slice(0,e)+"…":t:""}const Fe={tool_use:"wrench",api_call:"globe",api_response:"mail",file_edit:"file-pen",compaction:"archive",subagent:"bot",error:"x"},Ne={tool_use:"var(--accent)",api_call:"var(--green)",api_response:"var(--fg2)",file_edit:"var(--orange)",compaction:"var(--yellow)",subagent:"var(--accent)",error:"var(--red)"};function De({action:t,turnTs:e}){const o=Fe[t.kind],i=Ne[t.kind]||"var(--fg2)",a=t.ts-e,n=a>0?"+"+(a<1?a.toFixed(1):Math.round(a))+"s":"",r=t.duration_ms>0?I(t.duration_ms):"",l=t.tokens,d=l?x((l.input||0)+(l.output||0)):"";return s`<div class="tr-action-row">
    <span class="tr-action-icon" style="color:${i}">${o?s`<${L} name=${o} size="0.95em"/>`:"•"}</span>
    <span class="tr-action-name" style="color:${i}">${f(t.name||t.kind)}</span>
    ${t.input_summary?s`<span class="tr-action-args">${f(rt(t.input_summary,80))}</span>`:null}
    ${t.output_summary?s`<span class="tr-action-result">${f(rt(t.output_summary,60))}</span>`:null}
    <span class="tr-action-meta">
      ${n?s`<span class="tr-action-offset">${n}</span>`:null}
      ${r?s`<span class="tr-action-dur">${r}</span>`:null}
      ${d?s`<span class="tr-action-tok"><${L} name="coins" size="0.9em"/> ${d}</span>`:null}
      ${t.success===!1?s`<span class="tr-action-fail">\u2717</span>`:null}
      ${t.success===!0?s`<span class="tr-action-ok">\u2713</span>`:null}
    </span>
  </div>`}function Be(t,e){var a;const o=[],i=n=>{const r=String(n||"").trim();r&&!o.includes(r)&&o.push(r)};i(t.response);for(const n of e)n.kind==="api_response"&&i(((a=n.detail)==null?void 0:a.response)||n.response||n.output_summary);return o.join(`

`)}function Re({turn:t,index:e,expanded:o,onToggle:i,withheld:a}){const n=t.prompt&&t.prompt.length>0,r=t.actions||[],l=Be(t,r),d=l.length>0,v=r.filter(m=>m.kind==="tool_use"),u=r.filter(m=>m.kind==="api_call"),$=r.filter(m=>m.kind==="error"),c=t.tokens||{},y=(c.input||0)+(c.output||0),p=t.wall_ms||t.duration_ms||0;return s`<div class="tr-turn ${o?"tr-turn-expanded":""}">
    <button type="button" class="tr-turn-header" onClick=${i} aria-expanded=${o}>
      <span class="tr-turn-num">${e+1}</span>
      <span class="tr-turn-meta">
        <span class="tr-turn-time">${Y(t.ts)}</span>
        ${t.model?s`<span class="tr-turn-model">${tt(t.model)}</span>`:null}
        ${p>0?s`<span class="tr-turn-dur">${I(p)}</span>`:null}
      </span>
      <span class="tr-turn-stats">
        ${y>0?s`<span class="tr-stat" title="Tokens"><${L} name="coins" size="0.9em"/> ${x(y)}</span>`:null}
        ${v.length>0?s`<span class="tr-stat" title="Tool uses"><${L} name="wrench" size="0.9em"/> ${v.length}</span>`:null}
        ${u.length>0?s`<span class="tr-stat" title="API calls"><${L} name="globe" size="0.9em"/> ${u.length}</span>`:null}
        ${$.length>0?s`<span class="tr-stat tr-stat-err" title="Errors"><${L} name="x" size="0.9em"/> ${$.length}</span>`:null}
      </span>
      <span class="tr-turn-chevron" aria-hidden="true">${o?"▾":"▸"}</span>
    </button>

    ${n?s`<div class="tr-prompt ${o?"tr-prompt-full":""}">
      <div class="tr-prompt-icon"><${L} name="user" size="1em"/></div>
      <div class="tr-prompt-text">${o?t.prompt:rt(t.prompt_preview||t.prompt,120)}</div>
    </div>`:s`<div class="tr-prompt tr-prompt-empty">
      <div class="tr-prompt-icon"><${L} name="user" size="1em"/></div>
      <div class="tr-prompt-text text-muted">${a?"(text not retained)":"(no prompt captured)"}</div>
    </div>`}

    ${d?s`<div class="tr-response ${o?"tr-response-full":""}">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text">${o?l:rt(t.response_preview||l,160)}</div>
    </div>`:o?s`<div class="tr-response tr-response-empty">
      <div class="tr-response-icon">AI</div>
      <div class="tr-response-text text-muted">(no response captured)</div>
    </div>`:null}

    ${o&&r.length>0?s`<div class="tr-actions">
      ${r.map((m,g)=>s`<${De} key=${g} action=${m} turnTs=${t.ts}/>`)}
    </div>`:null}

    ${o&&y>0?s`<div class="tr-token-bar">
      <div class="tr-token-seg tr-tok-in"
        style="flex:${c.input||0}" title="Input: ${x(c.input||0)}">
        ${c.input>0?"in "+x(c.input):""}
      </div>
      ${c.cache_read>0?s`<div class="tr-token-seg tr-tok-cache"
        style="flex:${c.cache_read}" title="Cache read: ${x(c.cache_read)}">
        cache ${x(c.cache_read)}
      </div>`:null}
      <div class="tr-token-seg tr-tok-out"
        style="flex:${c.output||0}" title="Output: ${x(c.output||0)}">
        ${c.output>0?"out "+x(c.output):""}
      </div>
    </div>`:null}
  </div>`}function je({summary:t,transcript:e}){return t?s`<div class="tr-summary">
    <span class="tr-summary-item" title="Conversation turns"><${L} name="message-square" size="0.9em"/> ${t.total_turns} turns</span>
    <span class="tr-summary-item" title="API calls"><${L} name="globe" size="0.9em"/> ${t.total_api_calls} calls</span>
    <span class="tr-summary-item" title="Tool uses"><${L} name="wrench" size="0.9em"/> ${t.total_tool_uses} tools</span>
    <span class="tr-summary-item" title="Total tokens"><${L} name="coins" size="0.9em"/> ${x(t.total_tokens||0)}</span>
    ${t.compactions>0?s`<span class="tr-summary-item" title="Compactions"><${L} name="archive" size="0.9em"/> ${t.compactions}</span>`:null}
    ${t.errors>0?s`<span class="tr-summary-item tr-stat-err" title="Errors"><${L} name="x" size="0.9em"/> ${t.errors}</span>`:null}
    ${t.subagents>0?s`<span class="tr-summary-item" title="Subagents"><${L} name="bot" size="0.9em"/> ${t.subagents}</span>`:null}
    ${t.duration_s>0?s`<span class="tr-summary-item" title="Duration"><${L} name="clock" size="0.9em"/> ${I(t.duration_s*1e3)}</span>`:null}
    ${e!=null&&e.model?s`<span class="tr-summary-item" title="Model"><${L} name="brain-circuit" size="0.9em"/> ${tt(e.model)}</span>`:null}
    ${e!=null&&e.is_live?s`<span class="tr-summary-live">\u25CF LIVE</span>`:null}
    <span class="tr-summary-source">${t.source||""}</span>
  </div>`:null}function qe(t){if(!t||!t.turns||t.turns.length===0)return!1;const e=t.turns[0];return e.type!=null&&e.actions==null}function Ht(t,e){if(!t||!t.turns)return null;const o=t.turns||[],i=[];let a=null;const n=(l,d)=>{!l||!d||(l.response=l.response?l.response+`

`+d:d,l.response_preview=l.response.slice(0,200))},r={api_call:"api_call",api_response:"api_response",tool_use:"tool_use",subagent:"subagent",error:"error",hook:"tool_use"};for(const l of o)if(l.type==="user_message"){if(a&&i.push(a),a={ts:l.ts,end_ts:l.end_ts||l.ts,prompt:l.message||"",prompt_preview:l.preview||(l.message||"").slice(0,200),response:l.response||"",response_preview:l.response_preview||(l.response||"").slice(0,200),model:l.model||"",tokens:l.tokens||{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:l.api_calls||0,duration_ms:l.duration_ms||0,wall_ms:l.wall_ms||0,actions:[],tool_use_count:0},l.tools&&l.tools.length>0){for(const d of l.tools)a.actions.push({ts:d.ts||l.ts,kind:d.is_agent?"subagent":"tool_use",name:d.name||"",input_summary:d.args_summary||"",duration_ms:d.duration_ms||0});a.tool_use_count=l.tools.length}}else{if(l.type==="session_start"||l.type==="session_end")continue;if(l.type==="compaction")continue;if(a){const d=r[l.type];d&&(a.actions.push({ts:l.ts,kind:d,name:l.model||l.to||l.tool_name||l.hook_name||"",input_summary:l.params||l.decision||"",output_summary:l.response_preview||l.error_message||"",duration_ms:l.duration_ms||0,tokens:l.tokens,success:l.success==="true"?!0:l.success==="false"?!1:void 0,detail:l.response?{response:l.response}:void 0}),d==="api_response"&&n(a,l.response||l.response_preview||""),d==="tool_use"&&a.tool_use_count++,d==="api_call"&&l.tokens&&(a.tokens.input+=l.tokens.input||0,a.tokens.output+=l.tokens.output||0,a.tokens.cache_read+=l.tokens.cache_read||0,a.api_calls++))}else{const d=r[l.type];d&&d!=="api_response"&&(a={ts:l.ts,end_ts:l.ts,prompt:"",prompt_preview:"",response:"",response_preview:"",model:l.model||"",tokens:{input:0,output:0,cache_read:0,cache_creation:0,total:0},api_calls:0,duration_ms:0,wall_ms:0,actions:[],tool_use_count:0},a.actions.push({ts:l.ts,kind:d,name:l.model||l.to||l.tool_name||"",input_summary:l.params||l.decision||"",output_summary:l.response_preview||l.error_message||"",duration_ms:l.duration_ms||0,tokens:l.tokens,success:l.success==="true"?!0:l.success==="false"?!1:void 0,detail:l.response?{response:l.response}:void 0}),d==="api_response"&&n(a,l.response||l.response_preview||""),d==="tool_use"&&a.tool_use_count++,d==="api_call"&&l.tokens&&(a.tokens.input+=l.tokens.input||0,a.tokens.output+=l.tokens.output||0,a.tokens.cache_read+=l.tokens.cache_read||0,a.api_calls++))}}a&&i.push(a);for(const l of i)if(l.tokens.total=(l.tokens.input||0)+(l.tokens.output||0),l.actions.length>0){const d=l.actions[l.actions.length-1];l.end_ts=Math.max(l.end_ts||0,d.ts+(d.duration_ms||0)/1e3)}return{session_id:e,turns:i,summary:t.summary||{},is_live:!1}}function He({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:o}=J(X),{sessions:i,loading:a,error:n,tools:r,toolSessions:l,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=ut({globalRange:e,enabledTools:o}),[c,y]=b(null),[p,m]=b(!1),[g,h]=b(new Set),[_,k]=b(!1),[w,F]=b(!0),E=t!=null,P=E?t:u,M=Q(()=>{if(!P){y(null);return}m(!0);const T=st(i,P),D=T?pt(T):[P];Ss(D).then(A=>{qe(A)?y(Ht(A,P)):y(A),m(!1)}).catch(()=>{const A=T!=null&&T.started_at?T.started_at-60:Date.now()/1e3-86400,S=T!=null&&T.ended_at?T.ended_at+60:Date.now()/1e3+60;St(D,A,S).then(j=>{y(Ht(j,P)),m(!1)}).catch(()=>{y(null),m(!1)})})},[P,i]);O(M,[M]),O(()=>{if(!w||!(c!=null&&c.is_live))return;const T=setInterval(M,5e3);return()=>clearInterval(T)},[w,c==null?void 0:c.is_live,M]);const z=Q(T=>{h(D=>{const A=new Set(D);return A.has(T)?A.delete(T):A.add(T),A})},[]),V=Q(()=>{const T=(c==null?void 0:c.turns)||[];_?(h(new Set),k(!1)):(h(new Set(T.map((D,A)=>A))),k(!0))},[_,c]),W=i.find(T=>T.session_id===P),G=It(W)||It(c),{data:C}=Cs(()=>As(),[]),N=((c==null?void 0:c.turns)||[]).filter(T=>T.prompt&&T.prompt.length>0||T.actions&&T.actions.length>0||T.tool_use_count>0||G&&(T.ts||T.tokens)),K=(c==null?void 0:c.summary)||null;return s`<div class="tr-container">
    <div class="tr-header">
      <h3 class="tr-title">Session Transcript</h3>
      <div class="tr-controls">
        ${N.length>0?s`<button class="tc-filter-btn" onClick=${V}
          style="font-size:var(--fs-xs)">
          ${_?"⊡ Collapse all":"⊞ Expand all"}
        </button>`:null}
        ${c!=null&&c.is_live?s`<label class="tr-auto-refresh"
          style="font-size:var(--fs-xs);display:flex;align-items:center;gap:var(--sp-2)">
          <input type="checkbox" checked=${w}
            onChange=${T=>F(T.target.checked)}/>
          Auto-refresh
        </label>`:null}
      </div>
    </div>

    ${!E&&r.length>1&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}

    ${!E&&s`<${Ie} sessions=${l} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}

    <${je} summary=${K} transcript=${c}/>

    ${G&&s`<${es} mode=${C==null?void 0:C.capture_mode}/>`}

    <div class="tr-turns">
      ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading transcript\u2026</div>`:N.length===0?G?null:s`<div class="empty-state" style="padding:var(--sp-8)">
              <p>No transcript data for this session.</p>
              <p class="text-muted" style="margin-top:var(--sp-3);font-size:var(--fs-xs)">
                No prompt or tool events were captured for this session.
              </p>
            </div>`:N.map((T,D)=>s`<${Re}
              key=${D} turn=${T} index=${D} withheld=${G}
              expanded=${g.has(D)}
              onToggle=${()=>z(D)}/>`)}
    </div>
  </div>`}const Vt={Bash:"#6b7280",Read:"#60a5fa",Edit:"#34d399",Write:"#22d3ee",Grep:"#fbbf24",Glob:"#a78bfa",Agent:"#f472b6",Prompt:"var(--green)",Compaction:"var(--yellow)",Error:"var(--red)"};function dt(t){return t?Vt[t]?Vt[t]:Zt(t):"var(--fg2)"}function wt(t){return t?new Date(t*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}function Ut(t){return t<60?Math.round(t)+"s":t<3600?Math.round(t/60)+"m":t<86400?(t/3600).toFixed(1)+"h":(t/86400).toFixed(1)+"d"}function At(t){const e=t.tokens||{};return(e.input||0)+(e.output||0)}function Et(t){const e=t.tokens||{};return(e.cache_read||0)+(e.cache_creation||0)}function Ve(t){return At(t)+Et(t)}function Wt(t,e){return e==="fresh"?At(t):e==="cached"?Et(t):Ve(t)}function ct(t){return t.type==="user_message"?"Prompt":t.type==="api_call"||t.type==="api_response"?t.model||"API":t.type==="tool_use"?t.to||t.name||"Tool":t.type==="subagent"?t.to||"Agent":t.type==="compaction"?"Compaction":t.type==="error"?"Error":t.type==="hook"?t.hook_name||"Hook":t.type||"?"}function Ue({bar:t,x:e,y:o}){if(!t)return null;const i=t,a=i.tokens||{},n=ct(i);return s`<div class="tc-tooltip" style="left:${e}px;top:${o}px">
    <div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
      <span class="tc-legend-swatch" style="background:${dt(n)}"></span>
      ${f(n)}
    </div>
    <div class="tc-tip-row"><span class="tc-tip-label">Time</span><span>${wt(i.ts)}</span></div>
    ${i.type==="user_message"&&i.message&&s`
      <div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Message</span>
        <span style="white-space:pre-wrap;max-height:120px;overflow:auto;font-size:var(--fs-xs)">${f((i.message||"").slice(0,300))}</span>
      </div>`}
    ${(i.type==="api_call"||i.type==="api_response")&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Model</span><span>${i.model||"?"}</span></div>`}
    ${i.type==="tool_use"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tool</span><span>${i.to||i.name||"?"}</span></div>
      ${i.params&&s`<div class="tc-tip-row" style="flex-direction:column;align-items:flex-start">
        <span class="tc-tip-label">Args</span>
        <span class="mono" style="font-size:var(--fs-xs);max-height:80px;overflow:auto">${f(String(i.params).slice(0,200))}</span>
      </div>`}`}
    ${i.type==="subagent"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${i.to||"?"}</span></div>`}
    ${i.duration_ms>0&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Duration</span><span>${I(i.duration_ms)}</span></div>`}
    ${a.input||a.output||a.cache_read?s`
      <div class="tc-tip-row"><span class="tc-tip-label">Tokens</span>
        <span>in:${x(a.input||0)} out:${x(a.output||0)}${a.cache_read?" cache:"+x(a.cache_read):""}${a.cache_creation?" cache_w:"+x(a.cache_creation):""}</span>
      </div>`:null}
    ${i.type==="error"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Error</span><span style="color:var(--red)">${i.error_type||""}: ${(i.error_message||"").slice(0,100)}</span></div>`}
    ${i.type==="compaction"&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Count</span><span>#${i.compaction_count||""}</span></div>`}
    ${i.agent_name&&s`
      <div class="tc-tip-row"><span class="tc-tip-label">Agent</span><span>${i.agent_name}</span></div>`}
  </div>`}function We({summary:t}){if(!t||!t.total_tokens)return null;const e=[["Prompts",t.total_turns],["API Calls",t.total_api_calls],["Tools",t.total_tool_uses],["Tokens",x(t.total_tokens)],["Duration",U(t.duration_s)]].filter(([,o])=>o);return s`<div class="tc-summary">
    ${e.map(([o,i])=>s`<div class="tc-summary-item">
      <div class="tc-summary-val">${i}</div>
      <div class="tc-summary-label">${o}</div>
    </div>`)}
  </div>`}const ot=110,Ge=16,Gt=ot+Ge,Ke=30;function Je(t){const e=[];for(let o=0;o<t.length;o++){if(o>0){const i=t[o].ts-t[o-1].ts;i>Ke&&e.push({type:"gap",endTs:t[o-1].ts,startTs:t[o].ts,gap:i})}e.push({type:"bar",bar:t[o]})}return e}function Xe({entities:t,selected:e,onToggle:o,onAll:i,onNone:a}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Entities</span>
    <button class="tc-filter-btn" onClick=${i}>All</button>
    <button class="tc-filter-btn" onClick=${a}>None</button>
    ${t.map(n=>{const r=e.has(n);return s`<label key=${n} class="tc-filter-check ${r?"active":""}"
        style="--swatch:${dt(n)}">
        <input type="checkbox" checked=${r}
          onChange=${()=>o(n)}/>
        <span class="tc-legend-swatch" style="background:${dt(n)}"></span>
        ${f(n)}
      </label>`})}
  </div>`}function Ye({mode:t,onChange:e}){return s`<div class="tc-filter">
    <span class="tc-filter-label">Tokens</span>
    ${[["all","All Tokens"],["fresh","Non-Cached"],["cached","Cached Only"]].map(([i,a])=>s`<label key=${i}
      class="tc-filter-check ${t===i?"active":""}">
      <input type="radio" name="tc-tok-mode" checked=${t===i}
        onChange=${()=>e(i)}/>
      ${a}
    </label>`)}
  </div>`}function Qe({bars:t,tokenMode:e,onHover:o,onLeave:i}){if(!t.length)return s`<div class="empty-state" style="padding:var(--sp-8)">
    <p>No matching events.</p>
    <small class="empty-state-source">/api/session-flow · turns[]</small>
  </div>`;const a=Je(t),n=Math.max(1,...t.map(v=>Wt(v,e))),r=[];a.forEach((v,u)=>{v.type==="bar"&&r.push(u)});const l=Math.max(1,Math.floor(r.length/Math.ceil(r.length/20))),d=new Set;return r.forEach((v,u)=>{(u===0||u===r.length-1||u%l===0)&&d.add(v)}),s`<div class="tc-flow">
    ${a.map((v,u)=>{if(v.type==="gap"){const M=wt(v.endTs)+" → "+wt(v.startTs)+"  ("+Ut(v.gap)+" gap)";return s`<div key=${"g"+u} class="tc-flow-slot" style="height:${Gt}px" title=${M}>
          <div class="tc-flow-gap-line" style="height:${ot}px"></div>
          <div class="tc-flow-time">${Ut(v.gap)}</div>
        </div>`}const $=v.bar,c=Wt($,e),y=n>0?Math.max(.08,Math.log1p(c)/Math.log1p(n)):.08,p=Math.max(6,y*ot),m=ct($),g=dt(m),h=At($),_=Et($),k=h+_;let w,F;e==="cached"?(w=0,F=100):e==="fresh"?(w=100,F=0):k>0?(w=Math.round(h/k*100),F=100-w):(w=100,F=0);const E=F>0,P=d.has(u);return s`<div key=${u} class="tc-flow-slot" style="height:${Gt}px"
        tabindex="0" role="img"
        aria-label=${m+" at "+bt($.ts)+", "+x(c)+" tokens"}
        onMouseEnter=${M=>o($,M)}
        onMouseLeave=${i}
        onFocus=${M=>{const z=M.currentTarget.getBoundingClientRect();o($,{clientX:z.left+z.width/2,clientY:z.top})}}
        onBlur=${i}>
        <div class="tc-flow-bar-area" style="height:${ot}px">
          <div class="tc-flow-fill ${E?"tc-split":""}"
            style="height:${p}px;--bar-color:${g}">
            ${E&&s`
              ${w>0&&s`<div class="tc-fill-fresh" style="height:${w}%"></div>`}
              <div class="tc-fill-cached" style="height:${w>0?F:100}%"></div>`}
          </div>
        </div>
        <div class="tc-flow-time">${P?bt($.ts):""}</div>
      </div>`})}
  </div>`}function Ze({externalSessionId:t=null}={}){const{globalRange:e,enabledTools:o}=J(X),{sessions:i,loading:a,error:n,tools:r,toolSessions:l,activeTool:d,setActiveTool:v,activeSessionId:u,setActiveSessionId:$}=ut({globalRange:e,enabledTools:o}),[c,y]=b(null),[p,m]=b(!1),[g,h]=b(null),[_,k]=b(null),[w,F]=b("all"),E=ts(null),P=t!=null,M=P?t:u;O(()=>{if(!M){y(null);return}m(!0);const S=st(i,M),j=S!=null&&S.started_at?S.started_at-60:Date.now()/1e3-86400,q=S!=null&&S.ended_at?S.ended_at+60:Date.now()/1e3+60,Z=S?pt(S):[M];St(Z,j,q).then(mt=>{y(mt),m(!1),k(null)}).catch(()=>{y(null),m(!1)})},[M,i.length]);const{allBars:z,allEntities:V}=H(()=>{const j=((c==null?void 0:c.turns)||[]).filter(Z=>["user_message","api_call","api_response","tool_use","compaction","subagent","error","hook"].includes(Z.type)),q=new Set;for(const Z of j)q.add(ct(Z));return{allBars:j,allEntities:[...q].sort()}},[c]),W=_||new Set(V),G=H(()=>z.filter(S=>W.has(ct(S))),[z,W]),C=Q(S=>{k(j=>{const q=new Set(j||V);return q.has(S)?q.delete(S):q.add(S),q})},[V]),N=Q(()=>k(null),[]),K=Q(()=>k(new Set),[]),T=Q((S,j)=>{var Mt;const q=(Mt=E.current)==null?void 0:Mt.getBoundingClientRect();if(!q)return;const Z=Math.min(j.clientX-q.left+12,q.width-320),mt=j.clientY-q.top+12;h({bar:S,x:Z,y:mt})},[]),D=Q(()=>h(null),[]),A=(c==null?void 0:c.summary)||{};return s`<div class="tc-container" ref=${E}>
    ${!P&&s`<${vt} tools=${r} activeTool=${d} onSelect=${v}/>`}
    ${!P&&s`<${Ct} sessions=${l} activeId=${u}
      onSelect=${$} loading=${a} error=${n}/>`}
    <${We} summary=${A}/>

    ${p?s`<div class="loading-state" style="padding:var(--sp-8)">Loading timeline...</div>`:z.length===0?s`<div class="empty-state" style="padding:var(--sp-8)">
            <p>No timeline data for this session.</p>
            <p class="text-muted text-xs" style="margin-top:var(--sp-3)">
              Ensure OTel is enabled: <code>eval $(aictl otel enable)</code>
            </p>
            <small class="empty-state-source">/api/session-flow · turns[] (filtered to user_message, api_call, api_response, tool_use, compaction, subagent, error, hook)</small>
          </div>`:s`
          <div class="tc-controls">
            <${Xe} entities=${V} selected=${W}
              onToggle=${C} onAll=${N} onNone=${K}/>
            <${Ye} mode=${w} onChange=${F}/>
          </div>
          <${Qe} bars=${G} tokenMode=${w}
            onHover=${T} onLeave=${D}/>
          ${g&&s`<${Ue} bar=${g.bar} x=${g.x} y=${g.y}/>`}
        `}
  </div>`}function ta(t){return t?new Date(t*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}):"-"}function sa(t,e=140){if(t==null)return"";let o;try{o=typeof t=="string"?t:JSON.stringify(t)}catch{o=String(t)}return o.length<=e?o:o.slice(0,e)+"..."}function ea(t){try{return JSON.stringify(t??{},null,2)}catch{return String(t??"")}}function aa({sessionId:t,since:e,until:o}){const[i,a]=b(()=>new Set),{data:n,loading:r,error:l}=R(()=>ss(t,{since:e,until:o,limit:500}).then(u=>{const $=Array.isArray(u)?u:[];return $.sort((c,y)=>(y.ts||0)-(c.ts||0)),$}),[t,e,o],{enabled:!!t}),d=H(()=>(n||[]).map((u,$)=>{const c=String(u.kind||""),y=/permission|error|fail/i.test(c);return{key:`${u.ts||0}:${u.kind||""}:${u.tool||""}:${$}`,time:ta(u.ts),kind:c,tool:u.tool||"-",preview:sa(u.detail),detailText:ea(u.detail),isWarn:y}}),[n]),v=u=>{a($=>{const c=new Set($);return c.has(u)?c.delete(u):c.add(u),c})};return t?r?s`<p class="empty-state">Loading events...</p>`:l?s`<p class="error-state">Error: ${(l==null?void 0:l.message)||"Failed to load events"}</p>`:d.length?s`<div class="es-events-wrap">
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
                aria-expanded=${i.has(u.key)}
                aria-label=${"Toggle detail for "+(u.kind||"event")+" at "+u.time}
                onClick=${$=>{$.stopPropagation(),v(u.key)}}>${u.time}</button>
            </td>
            <td class="mono text-xs">${f(u.kind)}</td>
            <td class="text-xs">${f(u.tool)}</td>
            <td class="mono text-xs" title=${u.preview}>${f(u.preview)}</td>
          </tr>
          ${i.has(u.key)&&s`
            <tr key=${u.key+":detail"} class="es-events-detail-row">
              <td colspan="4">
                <pre class="es-events-detail">${f(u.detailText)}</pre>
              </td>
            </tr>
          `}
        `)}
      </tbody>
    </table>
  </div>`:s`<p class="empty-state">No events for this session in the selected range.</p>`:s`<p class="empty-state">Select a session to view events.</p>`}const na=28;function oa(t,e=60){if(!t||!t.length)return[[],[]];const o=new Map;for(const n of t){if(!n||n.ts==null)continue;const r=Math.floor(n.ts/e)*e;o.set(r,(o.get(r)||0)+(n.value??0))}const i=[...o.keys()].sort((n,r)=>n-r),a=i.map(n=>o.get(n));return[i,a]}async function gt(t,e){const o=e.started_at;if(!o)return[[],[]];const i=e.ended_at,a=await Pt(t,{since:o,limit:500,tags:{session_id:e.session_id}});let n=Array.isArray(a)?a:[];if(!n.length&&e.tool){const d=await Pt(t,{since:o,limit:500,tags:{"aictl.tool":e.tool}});n=Array.isArray(d)?d:[]}i&&(n=n.filter(d=>d.ts!=null&&d.ts<=i));const r=n.map(d=>d.ts),l=n.map(d=>d.value??0);return[r,l]}async function ia(t){if(!t.started_at)return[[],[]];const e=await ss(t.session_id,{since:t.started_at,until:t.ended_at??void 0,limit:1e3}),o=Array.isArray(e)?e:[],i=[];for(const a of o){if(!a||a.ts==null||!String(a.kind||"").includes("api_request"))continue;const r=a.detail&&typeof a.detail=="object"?a.detail:{},l=Number(r.input_tokens??r["gen_ai.usage.input_tokens"]??0)||0,d=Number(r.output_tokens??r["gen_ai.usage.output_tokens"]??0)||0;i.push({ts:a.ts,value:l+d})}return oa(i,60)}function nt({label:t,data:e,color:o,fmtVal:i,loading:a,error:n}){const r=e&&e[0]&&e[0].length>=2;return s`<div class="session-spark" title=${t}>
    <div class="session-spark-label">${t}</div>
    <div class="session-spark-chart">
      ${a?s`<span class="text-muted text-xs">\u2026</span>`:n?s`<span class="text-muted text-xs" title=${n}>\u2014</span>`:r?s`<${Es} data=${e} color=${o}
                height=${na} fmtVal=${i}
                ariaLabel=${t+" sparkline"}/>`:s`<span class="text-muted text-xs">no data</span>`}
    </div>
  </div>`}function la({session:t}){const[e,o]=b({data:null,loading:!0,error:null}),[i,a]=b({data:null,loading:!0,error:null}),[n,r]=b({data:null,loading:!0,error:null}),[l,d]=b({data:null,loading:!0,error:null}),v=t==null?void 0:t.session_id,u=t==null?void 0:t.started_at,$=t==null?void 0:t.ended_at;O(()=>{if(!v)return;let g=!1;return o({data:null,loading:!0,error:null}),a({data:null,loading:!0,error:null}),r({data:null,loading:!0,error:null}),d({data:null,loading:!0,error:null}),gt("process.cpu.utilization",t).then(h=>{g||o({data:h,loading:!1,error:null})}).catch(h=>{g||o({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),gt("process.memory.usage",t).then(h=>{g||a({data:h,loading:!1,error:null})}).catch(h=>{g||a({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),gt("process.disk.io",t).then(h=>{g||r({data:h,loading:!1,error:null})}).catch(h=>{g||r({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),ia(t).then(h=>{g||d({data:h,loading:!1,error:null})}).catch(h=>{g||d({data:null,loading:!1,error:(h==null?void 0:h.message)||"error"})}),()=>{g=!0}},[v,u,$]);const c=H(()=>g=>(g*100).toFixed(0)+"%",[]),y=H(()=>g=>x(g)+"B",[]),p=H(()=>g=>x(g)+"B",[]),m=H(()=>g=>x(g)+"/min",[]);return v?s`<div class="session-sparklines" aria-label="Session sparklines">
    <${nt} label="CPU" data=${e.data} color="var(--blue)"
      loading=${e.loading} error=${e.error} fmtVal=${c}/>
    <${nt} label="Mem" data=${i.data} color="var(--green)"
      loading=${i.loading} error=${i.error} fmtVal=${y}/>
    <${nt} label="I/O" data=${n.data} color="var(--orange)"
      loading=${n.loading} error=${n.error} fmtVal=${p}/>
    <${nt} label="Tok/min" data=${l.data} color="var(--purple, var(--accent))"
      loading=${l.loading} error=${l.error} fmtVal=${m}/>
  </div>`:null}function ht(t){if(!t.length)return 0;const e=[...t].sort((i,a)=>i-a),o=Math.floor(e.length/2);return e.length%2?e[o]:(e[o-1]+e[o])/2}function ra(t,e){if(!e||e<=0)return{dir:"flat",pct:0};const o=(t-e)/e;return Math.abs(o)<.05?{dir:"flat",pct:o}:{dir:o>0?"up":"down",pct:o}}function yt({label:t,value:e,formatted:o,med:i,fmt:a}){const n=ra(e,i),r=n.dir==="flat"?"var(--fg2)":n.dir==="up"?"var(--red)":"var(--green)",l=n.dir==="flat"?"·":n.dir==="up"?"↑":"↓",d=n.dir==="flat"?"~":(n.pct>0?"+":"")+Math.round(n.pct*100)+"%",v=i>0?" · median "+a(i):"";return s`<div class="run-trend-metric"
      title=${t+": current "+a(e)+v}>
    <span class="run-trend-label">${t}</span>
    <span class="run-trend-value">${o}</span>
    <span class="run-trend-delta" style="color:${r}"
        data-dir=${n.dir}
        aria-label=${t+" "+(n.dir==="flat"?"unchanged":n.dir==="up"?"up":"down")+" "+d}>
      ${l} ${d}
    </span>
  </div>`}function da({sessionId:t,project:e,tool:o,currentDurationS:i=0,currentTokens:a=0,currentFileChurn:n=0}){const[r,l]=b(null);if(O(()=>{if(!e||!o){l(null);return}let c=!1;return Kt(e,o,30,20).then(y=>{c||l(Array.isArray(y)?y:[])}).catch(()=>{c||l([])}),()=>{c=!0}},[e,o]),!e||!o||r===null)return null;const d=r.filter(c=>c.session_id!==t).slice(0,5);if(d.length<2)return s`<div class="run-trend-strip run-trend-empty"
        role="group" aria-label="Run trend (not enough history)">
      <span class="run-trend-label">Run trend</span>
      <span class="run-trend-empty-msg">Not enough prior runs for comparison (need ≥2).</span>
    </div>`;const v=ht(d.map(c=>c.duration_s||0)),u=ht(d.map(c=>c.total_tokens||0)),$=ht(d.map(c=>c.file_churn||0));return s`<div class="run-trend-strip"
      role="group"
      aria-label="Run trend vs last ${d.length} runs">
    <span class="run-trend-header" title="Compared against median of last ${d.length} runs">
      vs last ${d.length} runs
    </span>
    <${yt} label="Duration" value=${i}
      formatted=${U(i)} med=${v} fmt=${U}/>
    <${yt} label="Tokens" value=${a}
      formatted=${x(a)+"t"} med=${u}
      fmt=${c=>x(c)+"t"}/>
    <${yt} label="Files" value=${n}
      formatted=${String(n)} med=${$}
      fmt=${c=>String(Math.round(c))}/>
  </div>`}const xt=20;function ca({session:t}){const[e,o]=b(!1),[i,a]=b(null),[n,r]=b(!1),[l,d]=b(null),v=ts(null),u=t&&t.commit_count?t.commit_count:i?i.commits.length:0;if(O(()=>{if(!e)return;const c=p=>{v.current&&!v.current.contains(p.target)&&o(!1)},y=p=>{p.key==="Escape"&&o(!1)};return document.addEventListener("mousedown",c),document.addEventListener("keydown",y),()=>{document.removeEventListener("mousedown",c),document.removeEventListener("keydown",y)}},[e]),O(()=>{!e||i||n||!t||!t.session_id||(r(!0),Ms(t.session_id).then(c=>{a(c&&c.commits?c:{commits:[],branch:""}),r(!1)}).catch(c=>{d(String(c)),r(!1)}))},[e,i,n,t]),!t||!u||!t.project)return null;const $=u===1?"1 commit":u+" commits";return s`<span ref=${v} class="scb-root" style="position:relative">
    <button type="button"
      class="badge text-xs"
      aria-expanded=${e}
      aria-label="Show ${$} for this session"
      onClick=${()=>o(c=>!c)}
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
      ${l&&s`<div class="text-muted text-xs" style="padding:var(--sp-2);color:var(--red)">
        ${f(l)}
      </div>`}
      ${!n&&!l&&i&&pa(i)}
    </div>`}
  </span>`}function pa(t){const e=(t.commits||[]).slice(0,xt),o=t.branch||"";return e.length===0?s`<div class="text-muted text-xs" style="padding:var(--sp-2)">
      No commits attributed.
    </div>`:s`<ul class="scb-list" role="list"
    style="list-style:none;margin:0;padding:0">
    ${e.map(i=>ua(i,o))}
    ${(t.commits||[]).length>xt&&s`<li class="text-muted text-xs"
      style="padding:var(--sp-1) var(--sp-2)">
      …and ${(t.commits||[]).length-xt} more
    </li>`}
  </ul>`}function ua(t,e){const o=e&&!t.current_branch_match,i=o?"opacity:0.55;":"",a=o&&e?"not on "+e:t.author_name?t.author_name+" <"+t.author_email+">":"",n="display:flex;gap:var(--sp-2);align-items:baseline;padding:3px var(--sp-2);font-size:var(--fs-xs);"+i;return s`<li class="scb-row"
    title=${a}
    style=${n}>
    <code class="mono"
      style="color:var(--fg2);flex:0 0 auto">${f(t.short_sha)}</code>
    <span class="text-ellipsis"
      style="flex:1 1 auto;min-width:0">${f(t.subject||"(no subject)")}</span>
    ${o&&s`<span class="text-muted text-xs"
      style="flex:0 0 auto;font-style:italic">not on ${f(e)}</span>`}
  </li>`}const va=[{id:"overview",label:"Overview",hint:"Metrics, actions, context, memory"},{id:"flow",label:"Flow",hint:"Sequence of messages & tool calls"},{id:"transcript",label:"Transcript",hint:"Readable prompts & replies"},{id:"timeline",label:"Timeline",hint:"Activity bar chart over time"},{id:"events",label:"Events",hint:"Raw session event stream"}];function ma({session:t}){if(!t)return null;const e=Xt(t.tool),o=t.exact_input_tokens||t.input_tokens||0,i=t.exact_output_tokens||t.output_tokens||0,a=o+i,n=t.duration_s||(t.ended_at&&t.started_at?t.ended_at-t.started_at:0),r=!t.ended_at,l=t.project?Qt(t.project):"",d=t.started_at?new Date(t.started_at*1e3).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"";return s`<div class="explorer-session-header" style="border-left:3px solid ${e}">
    <div class="flex-row gap-md" style="align-items:baseline;flex-wrap:wrap">
      <strong style="font-size:var(--fs-lg)" title=${t.tool}><span style=${"color:"+e} aria-hidden="true">\u25CF </span>${f(Tt(t.tool))}</strong>
      ${l&&s`<span class="text-muted text-xs mono text-ellipsis"
        style="max-width:360px" title=${t.project}>${f(l)}</span>`}
      ${t.git_branch&&s`<span class="badge text-xs"
        style="background:var(--bg2);color:var(--fg2)"
        title="git branch">⎇ ${f(t.git_branch)}</span>`}
      ${t.git_commit&&s`<span class="badge text-xs mono"
        style="background:var(--bg2);color:var(--fg2)"
        title=${t.git_commit}>${f(String(t.git_commit).slice(0,7))}</span>`}
      <${ca} session=${t}/>
      ${d&&s`<span class="text-muted text-xs">${f(d)}</span>`}
      ${n>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)">${U(n)}</span>`}
      ${a>0&&s`<span class="badge"
        style="background:var(--bg2);color:var(--fg);font-size:var(--fs-xs)"
        title="input ${o.toLocaleString()} · output ${i.toLocaleString()}">
        ${x(a)}t
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
    <${la} session=${t}/>
  </div>`}function ha(){const{globalRange:t,enabledTools:e}=J(X),[o,i]=b(()=>{try{return localStorage.getItem("aictl-explorer-view")||"overview"}catch{return"overview"}}),[a,n]=b(()=>Ps()),{sessions:r,loading:l,error:d,tools:v,toolSessions:u,activeTool:$,setActiveTool:c,activeSessionId:y,setActiveSessionId:p}=ut({globalRange:t,enabledTools:e,requestedSession:a,onRequestApplied:()=>n(null)}),m=_=>{i(_);try{localStorage.setItem("aictl-explorer-view",_)}catch{}};O(()=>{const _=k=>{const w=k==null?void 0:k.detail;w!=null&&w.sessionId&&(n(w),Ls())};return document.addEventListener("aictl:select-session",_),()=>document.removeEventListener("aictl:select-session",_)},[]),O(()=>{y&&(Os(y,$),Lt({session:y}))},[y,$]),O(()=>()=>Lt({session:null}),[]);const g=r.find(_=>_.session_id===y),h=!l&&Ot?Ot():0;return s`<div class="explorer-container">
    <div class="explorer-picker">
      <${vt} tools=${v} activeTool=${$} onSelect=${c}/>
      <${Ct} sessions=${u} activeId=${y}
        onSelect=${p} loading=${l} error=${d}/>
      ${h>0?s`<div class="text-muted text-xs" style="margin-top:var(--sp-1)"
        title="Short sessions with no file activity and under 60s are hidden">
        ${h} short session${h===1?"":"s"} hidden</div>`:null}
    </div>

    ${g&&g.project&&g.tool&&s`<${da}
      sessionId=${g.session_id}
      project=${g.project}
      tool=${g.tool}
      currentDurationS=${g.duration_s||(g.ended_at&&g.started_at?g.ended_at-g.started_at:0)}
      currentTokens=${(g.exact_input_tokens||g.input_tokens||0)+(g.exact_output_tokens||g.output_tokens||0)}
      currentFileChurn=${g.files_modified||0}/>`}

    <${ma} session=${g}/>

    <nav class="explorer-subtabs" aria-label="Session views">
      ${va.map(_=>s`<button key=${_.id}
        class="tab-btn explorer-subtab-btn"
        aria-current=${o===_.id?"page":null}
        title=${_.hint}
        onClick=${()=>m(_.id)}>${_.label}</button>`)}
    </nav>

    <div class="explorer-content">
      ${y?o==="overview"?g?s`<${ge} session=${g}/>`:s`<div class="loading-state" style="padding:var(--sp-8)">Loading session\u2026</div>`:o==="flow"?s`<${ze} key=${"ex-flow-"+y}
                externalSessionId=${y}/>`:o==="transcript"?s`<${He} key=${"ex-tr-"+y}
                  externalSessionId=${y}/>`:o==="timeline"?s`<${Ze} key=${"ex-tl-"+y}
                    externalSessionId=${y}/>`:s`<${aa}
                    key=${"ex-ev-"+y}
                    sessionId=${y}
                    since=${t==null?void 0:t.since}
                    until=${t==null?void 0:t.until}
                  />`:s`<div class="empty-state" style="padding:var(--sp-8);text-align:center">
            <p>${l?"Loading sessions…":"Select a session above to inspect it."}</p>
            ${!l&&v.length===0&&s`<p class="text-muted text-xs"
              style="margin-top:var(--sp-3)">
              No sessions in the current time range. Try widening the range bar above.
            </p>`}
          </div>`}
    </div>
  </div>`}export{ma as SessionHeader,ha as default};
