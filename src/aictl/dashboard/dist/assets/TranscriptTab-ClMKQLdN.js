import{c as e,i as t,l as n,n as r}from"./hooks.module-tDeaYiaE.js";import{T as i,w as a}from"./auditScope-6Sl3bH1t.js";import{TextView as o}from"./TextView-CU8nvWv3.js";import"./Icon-y3iKVXqH.js";import{FixedPanel as s,a as c,c as l,n as u,o as d,s as f,useDetail as p}from"./Drawer-DDQjd6Gx.js";import{Rt as m,mt as h,zt as g}from"./root-CEANxTS3.js";function _(){if(typeof navigator>`u`)return!1;let e=navigator.userAgentData?.platform||navigator.platform||navigator.userAgent||``;return/win/i.test(e)&&!/darwin/i.test(e)}function v(){return`Set capture = "full" under [storage] in ${_()?`%APPDATA%\\aictl\\config.toml`:`~/.config/aictl/config.toml`}. It applies to new sessions.`}function y(e){let t=[],n=e=>{let n=String(e||``).trim();n&&!t.includes(n)&&t.push(n)};n(e.response);for(let t of e.actions||[])t.kind===`api_response`&&n(t.detail?.response||t.response||t.output_summary);return t.join(`

`)}function b(e,t){return(e?.turns||[]).filter(e=>e.prompt&&e.prompt.length>0||e.actions&&e.actions.length>0||e.tool_use_count>0||t&&(e.ts||e.tokens))}var x={tool_use:`Tool`,api_call:`Model call`,api_response:`Reply`,file_edit:`Edit`,compaction:`Compaction`,subagent:`Subagent`,error:`Error`,hook:`Hook`},S={tool_use:`var(--s3)`,api_call:`var(--s2)`,api_response:`var(--ink3)`,file_edit:`var(--s4)`,compaction:`var(--warn)`,subagent:`var(--s5)`,error:`var(--crit)`,hook:`var(--s4)`};function C({tokens:e}){let t=e||{},r=[[`Input`,t.input||0,`var(--s1)`],[`Cache read`,t.cache_read||0,`var(--s3)`],[`Output`,t.output||0,`var(--s2)`]].filter(e=>e[1]>0);return r.length?n`<div class="bd-ag-tokbar" role="img" aria-label=${r.map(e=>e[0]+` `+g(e[1])).join(`, `)}>
    ${r.map(([e,t,r])=>n`<span key=${e} style=${{flex:t+` 1 0`,background:r}} title=${e+`: `+g(t)}>${e.toLowerCase()+` `+g(t)}</span>`)}
  </div>`:null}function w({x:e,turnTs:t}){let r=e.ts-t,i=e.tokens?(e.tokens.input||0)+(e.tokens.output||0):0,a=e.success===!1?`Failed`:e.success===!0?`OK`:``;return n`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{color:S[e.kind]||`var(--ink3)`}}>${x[e.kind]||e.kind}</span>
    <span class="bd-ag-actn">${e.name||`n/a`}</span>
    <span class="bd-ag-acta" title=${e.input_summary||``}>${f(e.input_summary,90)}${e.output_summary?n`<em title=${e.output_summary}>${` → `+f(e.output_summary,70)}</em>`:null}</span>
    <span class="bd-ag-actm">${[r>0?`+`+(r<10?r.toFixed(1):Math.round(r))+` s`:``,e.duration_ms>0?m(e.duration_ms):``,i?g(i)+` tokens`:``].filter(Boolean).join(`, `)}${a?n` <b class=${a===`Failed`?`bd-ag-bad`:``}>${a}</b>`:null}</span>
  </li>`}function T({turn:e,n:t,open:r,onToggle:i,withheld:a,replyNote:s,loading:c}){let u=e.actions||[],d=y(e),p=e.tokens||{},h=(p.input||0)+(p.output||0),_=e.wall_ms||e.duration_ms||0,v=e=>u.filter(t=>t.kind===e).length,b=[h?g(h)+` tokens`:``,v(`tool_use`)||e.tool_use_count?(v(`tool_use`)||e.tool_use_count)+` tool calls`:``,v(`subagent`)?v(`subagent`)+` subagents`:``,v(`hook`)?v(`hook`)+` hooks`:``,v(`error`)?v(`error`)+` errors`:``].filter(Boolean).join(`, `),x=e.prompt||``,S=a?`Text not kept.`:`No prompt captured.`;return n`<li class=${`bd-ag-turn`+(r?` bd-open`:``)}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${r?`true`:`false`} onClick=${i}>
      <b>${t}</b><span>${l(e.ts)}</span>${e.model?n`<span class="bd-ag-dim">${e.model}</span>`:null}${_>0?n`<span class="bd-ag-dim">${m(_)}</span>`:null}
      <span class="bd-ag-turns">${b}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${x?n`<div class="bd-ag-text">${r?x:f(e.prompt_preview||x,160)}</div>`:n`<div class="bd-ag-text bd-ag-dim">${S}</div>`}
    </div>
    ${d?n`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${r?n`<div class="bd-ag-reply"><${o} text=${d} path="reply.md" source=${n`<div class="bd-ptext">${d}</div>`}/></div>`:n`<div class="bd-ag-text">${f(e.response_preview||d,200)}</div>`}
    </div>`:r?n`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${a?`Text not kept.`:s||`No reply captured.`}</div></div>`:null}
    <${C} tokens=${p}/>
    ${r&&c?n`<div class="bd-ag-text bd-ag-dim" role="status">Reading the turn...</div>`:null}
    ${r&&u.length?n`<ul class="bd-ag-acts" aria-label=${`Actions of turn `+t}>${u.map((t,r)=>n`<${w} key=${r} x=${t} turnTs=${e.ts}/>`)}</ul>`:null}
  </li>`}function E({a:o,ctx:l}){let{data:f,error:m}=p(e=>a(o.id,{...e,nodeScope:l.nodeScope,nodeId:l.nodeId}),`transcript:`+o.id),[_,y]=t(()=>new Set),[x,S]=t({}),C=f?.capture_mode??l.data?.capture_mode,w=C!=null&&C!==`full`||f?.content_retained===!1,E=r(()=>b(f,w),[f,w]),D=r(()=>E.map(e=>x[e.ts]?{...e,...x[e.ts],detail:!1}:e),[E,x]),O=[..._].map(e=>E[e]).filter(e=>e&&e.detail&&!x[e.ts]).map(e=>e.ts);if(e(()=>{if(!O.length)return;let e=new AbortController;return O.forEach(t=>{i(o.id,t,{signal:e.signal,nodeScope:l.nodeScope,nodeId:l.nodeId}).then(e=>S(n=>({...n,[t]:e.turn||{detail:!1}}))).catch(e=>{e?.name!==`AbortError`&&S(e=>({...e,[t]:{detail:!1}}))})}),()=>e.abort()},[o.id,O.join(`,`),l.nodeScope,l.nodeId]),!f)return n`<${u} a=${o} captureMode=${l.data?.capture_mode}/><${d} error=${m} what="the transcript"/>`;let k=D.length>0&&_.size>=D.length,A=e=>y(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n}),j=f.summary||{},M=f.replies_kept===!1?(f.reply_note||`The reply text is not kept`)+`.`:null;return n`<${c} a=${o}/>
    <${u} a=${o} captureMode=${C}/>
    ${w?n`<div class="bd-banner bd-ag-capture" role="status">${`Text is not kept: the capture mode is `+(C&&C!==`full`?C:`not full`)+` for this session. Counts, times, models and tool calls are still shown. `+v()}</div>`:null}
    <${s} id="agtrs" title="Historical summary" sub=${j.source||``}>
      <${h} stats=${[{label:`Turns`,value:g(j.total_turns??D.length)},{label:`Model calls`,value:g(j.total_api_calls)},{label:`Tool calls`,value:g(j.total_tool_uses)},{label:`Tokens`,value:g(j.total_tokens)},{label:`Errors`,value:g(j.errors)},{label:`Subagents`,value:g(j.subagents)},{label:`Compactions`,value:g(j.compactions)}]}/>
    </${s}>
    <${s} id="agtr" title="Transcript, oldest first" sub="Queryable Kusto history · read on open">
      <div class="bd-ag-bar">
        ${D.length?n`<button type="button" class="bd-btn" onClick=${()=>y(k?new Set:new Set(D.map((e,t)=>t)))}>${k?`Collapse all`:`Expand all`}</button>`:null}
      </div>
      ${M&&!w&&D.length?n`<div class="bd-note" role="status">${M} The prompts, model calls, tool calls and tokens of each turn are shown.</div>`:null}
      ${D.length?n`<ol class="bd-ag-turnl">${D.map((e,t)=>n`<${T} key=${t} turn=${e} n=${t+1} open=${_.has(t)} onToggle=${()=>A(t)} withheld=${w} replyNote=${M} loading=${!!e.detail&&_.has(t)}/>`)}</ol>`:n`<div class="bd-empty">${w?`No turn has times or tokens to show.`:`No turn for this session: aictl has no prompt, model call or tool call of it.`}</div>`}
    </${s}>`}export{E as default};