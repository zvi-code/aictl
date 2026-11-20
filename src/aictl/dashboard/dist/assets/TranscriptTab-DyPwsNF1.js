import{H as e,I as t,R as n,U as r,d as i,f as a}from"./PreactIsland-9I1yQL0i.js";import{S as o,a as s,d as c,f as l,l as u,n as d,o as f,u as p,y as m}from"./DrawerIsland-kkDfWV9z.js";import"./Icon-BTVhfeEw.js";import{v as h,y as g}from"./format-Dr6weXBv.js";function _(){if(typeof navigator>`u`)return!1;let e=navigator.userAgentData?.platform||navigator.platform||navigator.userAgent||``;return/win/i.test(e)&&!/darwin/i.test(e)}function v(){return`Set capture = "full" under [storage] in ${_()?`%APPDATA%\\aictl\\config.toml`:`~/.config/aictl/config.toml`}. It applies to new sessions.`}function y(e){let t=[],n=e=>{let n=String(e||``).trim();n&&!t.includes(n)&&t.push(n)};n(e.response);for(let t of e.actions||[])t.kind===`api_response`&&n(t.detail?.response||t.response||t.output_summary);return t.join(`

`)}function b(e,t){return(e?.turns||[]).filter(e=>e.prompt&&e.prompt.length>0||e.actions&&e.actions.length>0||e.tool_use_count>0||t&&(e.ts||e.tokens))}var x={tool_use:`Tool`,api_call:`Model call`,api_response:`Reply`,file_edit:`Edit`,compaction:`Compaction`,subagent:`Subagent`,error:`Error`,hook:`Hook`},S={tool_use:`var(--s3)`,api_call:`var(--s2)`,api_response:`var(--ink3)`,file_edit:`var(--s4)`,compaction:`var(--warn)`,subagent:`var(--s5)`,error:`var(--crit)`,hook:`var(--s4)`};function C({tokens:e}){let t=e||{},n=[[`Input`,t.input||0,`var(--s1)`],[`Cache read`,t.cache_read||0,`var(--s3)`],[`Output`,t.output||0,`var(--s2)`]].filter(e=>e[1]>0);return n.length?r`<div class="bd-ag-tokbar" role="img" aria-label=${n.map(e=>e[0]+` `+g(e[1])).join(`, `)}>
    ${n.map(([e,t,n])=>r`<span key=${e} style=${{flex:t+` 1 0`,background:n}} title=${e+`: `+g(t)}>${e.toLowerCase()+` `+g(t)}</span>`)}
  </div>`:null}function w({x:e,turnTs:t}){let n=e.ts-t,i=e.tokens?(e.tokens.input||0)+(e.tokens.output||0):0,a=e.success===!1?`Failed`:e.success===!0?`OK`:``;return r`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{color:S[e.kind]||`var(--ink3)`}}>${x[e.kind]||e.kind}</span>
    <span class="bd-ag-actn">${e.name||`n/a`}</span>
    <span class="bd-ag-acta" title=${e.input_summary||``}>${c(e.input_summary,90)}${e.output_summary?r`<em title=${e.output_summary}>${` → `+c(e.output_summary,70)}</em>`:null}</span>
    <span class="bd-ag-actm">${[n>0?`+`+(n<10?n.toFixed(1):Math.round(n))+` s`:``,e.duration_ms>0?h(e.duration_ms):``,i?g(i)+` tokens`:``].filter(Boolean).join(`, `)}${a?r` <b class=${a===`Failed`?`bd-ag-bad`:``}>${a}</b>`:null}</span>
  </li>`}function T({turn:e,n:t,open:n,onToggle:i,withheld:a,replyNote:o,loading:s}){let u=e.actions||[],d=y(e),f=e.tokens||{},p=(f.input||0)+(f.output||0),_=e.wall_ms||e.duration_ms||0,v=e=>u.filter(t=>t.kind===e).length,b=[p?g(p)+` tokens`:``,v(`tool_use`)||e.tool_use_count?(v(`tool_use`)||e.tool_use_count)+` tool calls`:``,v(`subagent`)?v(`subagent`)+` subagents`:``,v(`hook`)?v(`hook`)+` hooks`:``,v(`error`)?v(`error`)+` errors`:``].filter(Boolean).join(`, `),x=e.prompt||``,S=a?`Text not kept.`:`No prompt captured.`;return r`<li class=${`bd-ag-turn`+(n?` bd-open`:``)}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${n?`true`:`false`} onClick=${i}>
      <b>${t}</b><span>${l(e.ts)}</span>${e.model?r`<span class="bd-ag-dim">${e.model}</span>`:null}${_>0?r`<span class="bd-ag-dim">${h(_)}</span>`:null}
      <span class="bd-ag-turns">${b}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${x?r`<div class="bd-ag-text">${n?x:c(e.prompt_preview||x,160)}</div>`:r`<div class="bd-ag-text bd-ag-dim">${S}</div>`}
    </div>
    ${d?r`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${n?r`<div class="bd-ag-reply"><${m} text=${d} path="reply.md" source=${r`<div class="bd-ptext">${d}</div>`}/></div>`:r`<div class="bd-ag-text">${c(e.response_preview||d,200)}</div>`}
    </div>`:n?r`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${a?`Text not kept.`:o||`No reply captured.`}</div></div>`:null}
    <${C} tokens=${f}/>
    ${n&&s?r`<div class="bd-ag-text bd-ag-dim" role="status">Reading the turn...</div>`:null}
    ${n&&u.length?r`<ul class="bd-ag-acts" aria-label=${`Actions of turn `+t}>${u.map((t,n)=>r`<${w} key=${n} x=${t} turnTs=${e.ts}/>`)}</ul>`:null}
  </li>`}function E({a:c,ctx:l}){let{data:m,error:h}=s(e=>i(c.id,{...e,nodeScope:l.nodeScope,nodeId:l.nodeId}),`transcript:`+c.id),[_,y]=n(()=>new Set),[x,S]=n({}),C=m?.capture_mode??l.data?.capture_mode,w=C!=null&&C!==`full`||m?.content_retained===!1,E=t(()=>b(m,w),[m,w]),D=t(()=>E.map(e=>x[e.ts]?{...e,...x[e.ts],detail:!1}:e),[E,x]),O=[..._].map(e=>E[e]).filter(e=>e&&e.detail&&!x[e.ts]).map(e=>e.ts);if(e(()=>{if(!O.length)return;let e=new AbortController;return O.forEach(t=>{a(c.id,t,{signal:e.signal,nodeScope:l.nodeScope,nodeId:l.nodeId}).then(e=>S(n=>({...n,[t]:e.turn||{detail:!1}}))).catch(e=>{e?.name!==`AbortError`&&S(e=>({...e,[t]:{detail:!1}}))})}),()=>e.abort()},[c.id,O.join(`,`),l.nodeScope,l.nodeId]),!m)return r`<${f} a=${c} captureMode=${l.data?.capture_mode}/><${p} error=${h} what="the transcript"/>`;let k=D.length>0&&_.size>=D.length,A=e=>y(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n}),j=m.summary||{},M=m.replies_kept===!1?(m.reply_note||`The reply text is not kept`)+`.`:null;return r`<${u} a=${c}/>
    <${f} a=${c} captureMode=${C}/>
    ${w?r`<div class="bd-banner bd-ag-capture" role="status">${`Text is not kept: the capture mode is `+(C&&C!==`full`?C:`not full`)+` for this session. Counts, times, models and tool calls are still shown. `+v()}</div>`:null}
    <${d} id="agtrs" title="Historical summary" sub=${j.source||``}>
      <${o} stats=${[{label:`Turns`,value:g(j.total_turns??D.length)},{label:`Model calls`,value:g(j.total_api_calls)},{label:`Tool calls`,value:g(j.total_tool_uses)},{label:`Tokens`,value:g(j.total_tokens)},{label:`Errors`,value:g(j.errors)},{label:`Subagents`,value:g(j.subagents)},{label:`Compactions`,value:g(j.compactions)}]}/>
    </${d}>
    <${d} id="agtr" title="Transcript, oldest first" sub="Queryable Kusto history · read on open">
      <div class="bd-ag-bar">
        ${D.length?r`<button type="button" class="bd-btn" onClick=${()=>y(k?new Set:new Set(D.map((e,t)=>t)))}>${k?`Collapse all`:`Expand all`}</button>`:null}
      </div>
      ${M&&!w&&D.length?r`<div class="bd-note" role="status">${M} The prompts, model calls, tool calls and tokens of each turn are shown.</div>`:null}
      ${D.length?r`<ol class="bd-ag-turnl">${D.map((e,t)=>r`<${T} key=${t} turn=${e} n=${t+1} open=${_.has(t)} onToggle=${()=>A(t)} withheld=${w} replyNote=${M} loading=${!!e.detail&&_.has(t)}/>`)}</ol>`:r`<div class="bd-empty">${w?`No turn has times or tokens to show.`:`No turn for this session: aictl has no prompt, model call or tool call of it.`}</div>`}
    </${d}>`}export{E as default};