import{d as N,y as R,a6 as E,T as O,m as e,S as x,f as i,h as C,N as B}from"./index-hGMajQ-T.js";import{TextView as I}from"./TextView-B_A6zTUX.js";import{useDetail as D,FixedPanel as w}from"./Drawer-DCBthjqy.js";import{W as F,S as M,i as j,c as L,a as T}from"./common-jOPetLbg.js";function P(){var n;if(typeof navigator>"u")return!1;const t=((n=navigator.userAgentData)==null?void 0:n.platform)||navigator.platform||navigator.userAgent||"";return/win/i.test(t)&&!/darwin/i.test(t)}function H(){return`Set capture = "full" under [storage] in ${P()?"%APPDATA%\\aictl\\config.toml":"~/.config/aictl/config.toml"}. It applies to new sessions.`}function K(t){var o;const n=[],s=a=>{const $=String(a||"").trim();$&&!n.includes($)&&n.push($)};s(t.response);for(const a of t.actions||[])a.kind==="api_response"&&s(((o=a.detail)==null?void 0:o.response)||a.response||a.output_summary);return n.join(`

`)}function W(t,n){return((t==null?void 0:t.turns)||[]).filter(s=>s.prompt&&s.prompt.length>0||s.actions&&s.actions.length>0||s.tool_use_count>0||n&&(s.ts||s.tokens))}const z=5e3,V={tool_use:"Tool",api_call:"Model call",api_response:"Reply",file_edit:"Edit",compaction:"Compaction",subagent:"Subagent",error:"Error",hook:"Hook"},Y={tool_use:"var(--s3)",api_call:"var(--s2)",api_response:"var(--ink3)",file_edit:"var(--s4)",compaction:"var(--warn)",subagent:"var(--s5)",error:"var(--crit)",hook:"var(--s4)"};function q({tokens:t}){const n=t||{},s=[["Input",n.input||0,"var(--s1)"],["Cache read",n.cache_read||0,"var(--s3)"],["Output",n.output||0,"var(--s2)"]].filter(o=>o[1]>0);return s.length?e`<div class="bd-ag-tokbar" role="img" aria-label=${s.map(o=>o[0]+" "+i(o[1])).join(", ")}>
    ${s.map(([o,a,$])=>e`<span key=${o} style=${{flex:a+" 1 0",background:$}} title=${o+": "+i(a)}>${o.toLowerCase()+" "+i(a)}</span>`)}
  </div>`:null}function G({x:t,turnTs:n}){const s=t.ts-n,o=t.tokens?(t.tokens.input||0)+(t.tokens.output||0):0,a=t.success===!1?"Failed":t.success===!0?"OK":"";return e`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{color:Y[t.kind]||"var(--ink3)"}}>${V[t.kind]||t.kind}</span>
    <span class="bd-ag-actn">${t.name||B}</span>
    <span class="bd-ag-acta" title=${t.input_summary||""}>${T(t.input_summary,90)}${t.output_summary?e`<em title=${t.output_summary}>${" → "+T(t.output_summary,70)}</em>`:null}</span>
    <span class="bd-ag-actm">${[s>0?"+"+(s<10?s.toFixed(1):Math.round(s))+" s":"",t.duration_ms>0?C(t.duration_ms):"",o?i(o)+" tokens":""].filter(Boolean).join(", ")}${a?e` <b class=${a==="Failed"?"bd-ag-bad":""}>${a}</b>`:null}</span>
  </li>`}function J({turn:t,n,open:s,onToggle:o,withheld:a,replyNote:$}){const v=t.actions||[],b=K(t),l=t.tokens||{},_=(l.input||0)+(l.output||0),h=t.wall_ms||t.duration_ms||0,c=f=>v.filter(k=>k.kind===f).length,g=[_?i(_)+" tokens":"",c("tool_use")||t.tool_use_count?(c("tool_use")||t.tool_use_count)+" tool calls":"",c("subagent")?c("subagent")+" subagents":"",c("hook")?c("hook")+" hooks":"",c("error")?c("error")+" errors":""].filter(Boolean).join(", "),u=t.prompt||"",d=a?"Text not kept.":"No prompt captured.";return e`<li class=${"bd-ag-turn"+(s?" bd-open":"")}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${s?"true":"false"} onClick=${o}>
      <b>${n}</b><span>${L(t.ts)}</span>${t.model?e`<span class="bd-ag-dim">${t.model}</span>`:null}${h>0?e`<span class="bd-ag-dim">${C(h)}</span>`:null}
      <span class="bd-ag-turns">${g}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${u?e`<div class="bd-ag-text">${s?u:T(t.prompt_preview||u,160)}</div>`:e`<div class="bd-ag-text bd-ag-dim">${d}</div>`}
    </div>
    ${b?e`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${s?e`<div class="bd-ag-reply"><${I} text=${b} path="reply.md" source=${e`<div class="bd-ptext">${b}</div>`}/></div>`:e`<div class="bd-ag-text">${T(t.response_preview||b,200)}</div>`}
    </div>`:s?e`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${a?"Text not kept.":$||"No reply captured."}</div></div>`:null}
    <${q} tokens=${l}/>
    ${s&&v.length?e`<ul class="bd-ag-acts" aria-label=${"Actions of turn "+n}>${v.map((f,k)=>e`<${G} key=${k} x=${f} turnTs=${t.ts}/>`)}</ul>`:null}
  </li>`}function tt({a:t,st:n,ctx:s}){var A;const o=j(n),[a,$]=N(!0),[v,b]=N(0);R(()=>{if(!o||!a)return;const r=setInterval(()=>b(p=>p+1),z);return()=>clearInterval(r)},[o,a]);const{data:l,error:_}=D(r=>E(t.id,r),"transcript:"+t.id,v),[h,c]=N(()=>new Set),g=(l==null?void 0:l.capture_mode)??((A=s.data)==null?void 0:A.capture_mode),u=g!=null&&g!=="full"||(l==null?void 0:l.content_retained)===!1,d=O(()=>W(l,u),[l,u]);if(!l)return e`<${F} error=${_} what="the transcript"/>`;const f=d.length>0&&h.size>=d.length,k=r=>c(p=>{const y=new Set(p);return y.has(r)?y.delete(r):y.add(r),y}),m=l.summary||{},S=l.replies_kept===!1?(l.reply_note||"The reply text is not kept")+".":null;return e`<${M} a=${t}/>
    ${u?e`<div class="bd-banner bd-ag-capture" role="status">${"Text is not kept: the capture mode is "+(g&&g!=="full"?g:"not full")+" for this session. Counts, times, models and tool calls are still shown. "+H()}</div>`:null}
    <${w} id="agtrs" title="Summary" sub=${m.source||""}>
      <${x} stats=${[{label:"Turns",value:i(m.total_turns??d.length)},{label:"Model calls",value:i(m.total_api_calls)},{label:"Tool calls",value:i(m.total_tool_uses)},{label:"Tokens",value:i(m.total_tokens)},{label:"Errors",value:i(m.errors)},{label:"Subagents",value:i(m.subagents)},{label:"Compactions",value:i(m.compactions)}]}/>
    </${w}>
    <${w} id="agtr" title="Transcript, oldest first" sub=${o?a?"Read again every 5 s while the agent runs":"Not refreshing":""}>
      <div class="bd-ag-bar">
        ${d.length?e`<button type="button" class="bd-btn" onClick=${()=>c(f?new Set:new Set(d.map((r,p)=>p)))}>${f?"Collapse all":"Expand all"}</button>`:null}
        ${o?e`<label class="bd-ag-check"><input type="checkbox" checked=${a} onChange=${r=>$(r.currentTarget.checked)}/>Refresh while it runs</label>`:null}
      </div>
      ${S&&!u&&d.length?e`<div class="bd-note" role="status">${S} The prompts, model calls, tool calls and tokens of each turn are shown.</div>`:null}
      ${d.length?e`<ol class="bd-ag-turnl">${d.map((r,p)=>e`<${J} key=${p} turn=${r} n=${p+1} open=${h.has(p)} onToggle=${()=>k(p)} withheld=${u} replyNote=${S}/>`)}</ol>`:e`<div class="bd-empty">${u?"No turn has times or tokens to show.":"No turn for this session: aictl has no prompt, model call or tool call of it."}</div>`}
    </${w}>`}export{z as REFRESH_MS,tt as default};
