import{d as w,y as B,ab as j,T as O,ac as D,m as a,S as M,f as d,k as F,N as L}from"./index-DEeGwyMD.js";import{TextView as P}from"./TextView-DeHSGfgQ.js";import{useDetail as H,FixedPanel as T}from"./Drawer-DLI3GNjR.js";import{W as K,S as W,i as z,c as V,a as A}from"./common-O_2lGL4h.js";function Y(){var l;if(typeof navigator>"u")return!1;const t=((l=navigator.userAgentData)==null?void 0:l.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(t)&&!/darwin/i.test(t)}function q(){return`Set capture = "full" under [storage] in ${Y()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function G(t){var n;const l=[],s=o=>{const g=String(o||"").trim();g&&!l.includes(g)&&l.push(g)};s(t.response);for(const o of t.actions||[])o.kind==="api_response"&&s(((n=o.detail)==null?void 0:n.response)||o.response||o.output_summary);return l.join(`

`)}function J(t,l){return((t==null?void 0:t.turns)||[]).filter(s=>s.prompt&&s.prompt.length>0||s.actions&&s.actions.length>0||s.tool_use_count>0||l&&(s.ts||s.tokens))}const Q=5e3,U={tool_use:"Tool",api_call:"Model call",api_response:"Reply",file_edit:"Edit",compaction:"Compaction",subagent:"Subagent",error:"Error",hook:"Hook"},X={tool_use:"var(--s3)",api_call:"var(--s2)",api_response:"var(--ink3)",file_edit:"var(--s4)",compaction:"var(--warn)",subagent:"var(--s5)",error:"var(--crit)",hook:"var(--s4)"};function Z({tokens:t}){const l=t||{},s=[["Input",l.input||0,"var(--s1)"],["Cache read",l.cache_read||0,"var(--s3)"],["Output",l.output||0,"var(--s2)"]].filter(n=>n[1]>0);return s.length?a`<div class="bd-ag-tokbar" role="img" aria-label=${s.map(n=>n[0]+" "+d(n[1])).join(", ")}>
    ${s.map(([n,o,g])=>a`<span key=${n} style=${{flex:o+" 1 0",background:g}} title=${n+": "+d(o)}>${n.toLowerCase()+" "+d(o)}</span>`)}
  </div>`:null}function tt({x:t,turnTs:l}){const s=t.ts-l,n=t.tokens?(t.tokens.input||0)+(t.tokens.output||0):0,o=t.success===!1?"Failed":t.success===!0?"OK":"";return a`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{color:X[t.kind]||"var(--ink3)"}}>${U[t.kind]||t.kind}</span>
    <span class="bd-ag-actn">${t.name||L}</span>
    <span class="bd-ag-acta" title=${t.input_summary||""}>${A(t.input_summary,90)}${t.output_summary?a`<em title=${t.output_summary}>${" → "+A(t.output_summary,70)}</em>`:null}</span>
    <span class="bd-ag-actm">${[s>0?"+"+(s<10?s.toFixed(1):Math.round(s))+" s":"",t.duration_ms>0?F(t.duration_ms):"",n?d(n)+" tokens":""].filter(Boolean).join(", ")}${o?a` <b class=${o==="Failed"?"bd-ag-bad":""}>${o}</b>`:null}</span>
  </li>`}function st({turn:t,n:l,open:s,onToggle:n,withheld:o,replyNote:g,loading:S}){const h=t.actions||[],r=G(t),k=t.tokens||{},f=(k.input||0)+(k.output||0),_=t.wall_ms||t.duration_ms||0,c=v=>h.filter(u=>u.kind===v).length,y=[f?d(f)+" tokens":"",c("tool_use")||t.tool_use_count?(c("tool_use")||t.tool_use_count)+" tool calls":"",c("subagent")?c("subagent")+" subagents":"",c("hook")?c("hook")+" hooks":"",c("error")?c("error")+" errors":""].filter(Boolean).join(", "),m=t.prompt||"",$=o?"Text not kept.":"No prompt captured.";return a`<li class=${"bd-ag-turn"+(s?" bd-open":"")}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${s?"true":"false"} onClick=${n}>
      <b>${l}</b><span>${V(t.ts)}</span>${t.model?a`<span class="bd-ag-dim">${t.model}</span>`:null}${_>0?a`<span class="bd-ag-dim">${F(_)}</span>`:null}
      <span class="bd-ag-turns">${y}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${m?a`<div class="bd-ag-text">${s?m:A(t.prompt_preview||m,160)}</div>`:a`<div class="bd-ag-text bd-ag-dim">${$}</div>`}
    </div>
    ${r?a`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${s?a`<div class="bd-ag-reply"><${P} text=${r} path="reply.md" source=${a`<div class="bd-ptext">${r}</div>`}/></div>`:a`<div class="bd-ag-text">${A(t.response_preview||r,200)}</div>`}
    </div>`:s?a`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${o?"Text not kept.":g||"No reply captured."}</div></div>`:null}
    <${Z} tokens=${k}/>
    ${s&&S?a`<div class="bd-ag-text bd-ag-dim" role="status">Reading the turn...</div>`:null}
    ${s&&h.length?a`<ul class="bd-ag-acts" aria-label=${"Actions of turn "+l}>${h.map((v,u)=>a`<${tt} key=${u} x=${v} turnTs=${t.ts}/>`)}</ul>`:null}
  </li>`}function lt({a:t,st:l,ctx:s}){var x;const n=z(l),[o,g]=w(!0),[S,h]=w(0);B(()=>{if(!n||!o)return;const e=setInterval(()=>h(i=>i+1),Q);return()=>clearInterval(e)},[n,o]);const{data:r,error:k}=H(e=>j(t.id,e),"transcript:"+t.id,S),[f,_]=w(()=>new Set),[c,y]=w({}),m=(r==null?void 0:r.capture_mode)??((x=s.data)==null?void 0:x.capture_mode),$=m!=null&&m!=="full"||(r==null?void 0:r.content_retained)===!1,v=O(()=>J(r,$),[r,$]),u=O(()=>v.map(e=>c[e.ts]?{...e,...c[e.ts],detail:!1}:e),[v,c]),N=[...f].map(e=>v[e]).filter(e=>e&&e.detail&&!c[e.ts]).map(e=>e.ts);if(B(()=>{if(!N.length)return;const e=new AbortController;return N.forEach(i=>{D(t.id,i,{signal:e.signal}).then(p=>y(R=>({...R,[i]:p.turn||{detail:!1}}))).catch(p=>{(p==null?void 0:p.name)!=="AbortError"&&y(R=>({...R,[i]:{detail:!1}}))})}),()=>e.abort()},[t.id,N.join(",")]),!r)return a`<${K} error=${k} what="the transcript"/>`;const E=u.length>0&&f.size>=u.length,I=e=>_(i=>{const p=new Set(i);return p.has(e)?p.delete(e):p.add(e),p}),b=r.summary||{},C=r.replies_kept===!1?(r.reply_note||"The reply text is not kept")+".":null;return a`<${W} a=${t}/>
    ${$?a`<div class="bd-banner bd-ag-capture" role="status">${"Text is not kept: the capture mode is "+(m&&m!=="full"?m:"not full")+" for this session. Counts, times, models and tool calls are still shown. "+q()}</div>`:null}
    <${T} id="agtrs" title="Summary" sub=${b.source||""}>
      <${M} stats=${[{label:"Turns",value:d(b.total_turns??u.length)},{label:"Model calls",value:d(b.total_api_calls)},{label:"Tool calls",value:d(b.total_tool_uses)},{label:"Tokens",value:d(b.total_tokens)},{label:"Errors",value:d(b.errors)},{label:"Subagents",value:d(b.subagents)},{label:"Compactions",value:d(b.compactions)}]}/>
    </${T}>
    <${T} id="agtr" title="Transcript, oldest first" sub=${n?o?"Read again every 5 s while the agent runs":"Not refreshing":""}>
      <div class="bd-ag-bar">
        ${u.length?a`<button type="button" class="bd-btn" onClick=${()=>_(E?new Set:new Set(u.map((e,i)=>i)))}>${E?"Collapse all":"Expand all"}</button>`:null}
        ${n?a`<label class="bd-ag-check"><input type="checkbox" checked=${o} onChange=${e=>g(e.currentTarget.checked)}/>Refresh while it runs</label>`:null}
      </div>
      ${C&&!$&&u.length?a`<div class="bd-note" role="status">${C} The prompts, model calls, tool calls and tokens of each turn are shown.</div>`:null}
      ${u.length?a`<ol class="bd-ag-turnl">${u.map((e,i)=>a`<${st} key=${i} turn=${e} n=${i+1} open=${f.has(i)} onToggle=${()=>I(i)} withheld=${$} replyNote=${C} loading=${!!e.detail&&f.has(i)}/>`)}</ol>`:a`<div class="bd-empty">${$?"No turn has times or tokens to show.":"No turn for this session: aictl has no prompt, model call or tool call of it."}</div>`}
    </${T}>`}export{Q as REFRESH_MS,lt as default};
