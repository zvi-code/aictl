import{d as N,y as A,T as E,m as e}from"./index-0APVtqay.js";import{b9 as O}from"./useSse-Dcx1BuKe.js";import{TextView as x}from"./TextView-DKtsDjbG.js";import{c as B}from"./TextNotRetained-C8E2A0cj.js";import{useDetail as F,FixedPanel as w}from"./Drawer-GDv3aOws.js";import{S as I,f as i,b as R,N as M}from"./BoardScreen-Drg0U0tb.js";import{W as j,S as L,i as D,c as H,a as T}from"./common-4hNo9cCp.js";import"./Icon-1my9WQDm.js";import"./platform-F0jTv3XI.js";function K(t){var o;const n=[],s=a=>{const m=String(a||"").trim();m&&!n.includes(m)&&n.push(m)};s(t.response);for(const a of t.actions||[])a.kind==="api_response"&&s(((o=a.detail)==null?void 0:o.response)||a.response||a.output_summary);return n.join(`

`)}function W(t,n){return((t==null?void 0:t.turns)||[]).filter(s=>s.prompt&&s.prompt.length>0||s.actions&&s.actions.length>0||s.tool_use_count>0||n&&(s.ts||s.tokens))}const z=5e3,P={tool_use:"Tool",api_call:"Model call",api_response:"Reply",file_edit:"Edit",compaction:"Compaction",subagent:"Subagent",error:"Error",hook:"Hook"},V={tool_use:"var(--s3)",api_call:"var(--s2)",api_response:"var(--ink3)",file_edit:"var(--s4)",compaction:"var(--warn)",subagent:"var(--s5)",error:"var(--crit)",hook:"var(--s4)"};function Y({tokens:t}){const n=t||{},s=[["Input",n.input||0,"var(--s1)"],["Cache read",n.cache_read||0,"var(--s3)"],["Output",n.output||0,"var(--s2)"]].filter(o=>o[1]>0);return s.length?e`<div class="bd-ag-tokbar" role="img" aria-label=${s.map(o=>o[0]+" "+i(o[1])).join(", ")}>
    ${s.map(([o,a,m])=>e`<span key=${o} style=${{flex:a+" 1 0",background:m}} title=${o+": "+i(a)}>${o.toLowerCase()+" "+i(a)}</span>`)}
  </div>`:null}function q({x:t,turnTs:n}){const s=t.ts-n,o=t.tokens?(t.tokens.input||0)+(t.tokens.output||0):0,a=t.success===!1?"Failed":t.success===!0?"OK":"";return e`<li class="bd-ag-act">
    <span class="bd-ag-actk" style=${{color:V[t.kind]||"var(--ink3)"}}>${P[t.kind]||t.kind}</span>
    <span class="bd-ag-actn">${t.name||M}</span>
    <span class="bd-ag-acta" title=${t.input_summary||""}>${T(t.input_summary,90)}${t.output_summary?e`<em title=${t.output_summary}>${" → "+T(t.output_summary,70)}</em>`:null}</span>
    <span class="bd-ag-actm">${[s>0?"+"+(s<10?s.toFixed(1):Math.round(s))+" s":"",t.duration_ms>0?R(t.duration_ms):"",o?i(o)+" tokens":""].filter(Boolean).join(", ")}${a?e` <b class=${a==="Failed"?"bd-ag-bad":""}>${a}</b>`:null}</span>
  </li>`}function G({turn:t,n,open:s,onToggle:o,withheld:a,replyNote:m}){const h=t.actions||[],g=K(t),l=t.tokens||{},_=(l.input||0)+(l.output||0),f=t.wall_ms||t.duration_ms||0,c=v=>h.filter(k=>k.kind===v).length,b=[_?i(_)+" tokens":"",c("tool_use")||t.tool_use_count?(c("tool_use")||t.tool_use_count)+" tool calls":"",c("subagent")?c("subagent")+" subagents":"",c("hook")?c("hook")+" hooks":"",c("error")?c("error")+" errors":""].filter(Boolean).join(", "),u=t.prompt||"",d=a?"Text not kept.":"No prompt captured.";return e`<li class=${"bd-ag-turn"+(s?" bd-open":"")}>
    <button type="button" class="bd-ag-turnh" aria-expanded=${s?"true":"false"} onClick=${o}>
      <b>${n}</b><span>${H(t.ts)}</span>${t.model?e`<span class="bd-ag-dim">${t.model}</span>`:null}${f>0?e`<span class="bd-ag-dim">${R(f)}</span>`:null}
      <span class="bd-ag-turns">${b}</span>
    </button>
    <div class="bd-ag-msg"><span class="bd-ag-who">You</span>
      ${u?e`<div class="bd-ag-text">${s?u:T(t.prompt_preview||u,160)}</div>`:e`<div class="bd-ag-text bd-ag-dim">${d}</div>`}
    </div>
    ${g?e`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span>
      ${s?e`<div class="bd-ag-reply"><${x} text=${g} path="reply.md" source=${e`<div class="bd-ptext">${g}</div>`}/></div>`:e`<div class="bd-ag-text">${T(t.response_preview||g,200)}</div>`}
    </div>`:s?e`<div class="bd-ag-msg"><span class="bd-ag-who">Reply</span><div class="bd-ag-text bd-ag-dim">${a?"Text not kept.":m||"No reply captured."}</div></div>`:null}
    <${Y} tokens=${l}/>
    ${s&&h.length?e`<ul class="bd-ag-acts" aria-label=${"Actions of turn "+n}>${h.map((v,k)=>e`<${q} key=${k} x=${v} turnTs=${t.ts}/>`)}</ul>`:null}
  </li>`}function ot({a:t,st:n,ctx:s}){var C;const o=D(n),[a,m]=N(!0),[h,g]=N(0);A(()=>{if(!o||!a)return;const r=setInterval(()=>g(p=>p+1),z);return()=>clearInterval(r)},[o,a]);const{data:l,error:_}=F(r=>O(t.id,r),"transcript:"+t.id,h),[f,c]=N(()=>new Set),b=(l==null?void 0:l.capture_mode)??((C=s.data)==null?void 0:C.capture_mode),u=b!=null&&b!=="full"||(l==null?void 0:l.content_retained)===!1,d=E(()=>W(l,u),[l,u]);if(!l)return e`<${j} error=${_} what="the transcript"/>`;const v=d.length>0&&f.size>=d.length,k=r=>c(p=>{const y=new Set(p);return y.has(r)?y.delete(r):y.add(r),y}),$=l.summary||{},S=l.replies_kept===!1?(l.reply_note||"The reply text is not kept")+".":null;return e`<${L} a=${t}/>
    ${u?e`<div class="bd-banner bd-ag-capture" role="status">${"Text is not kept: the capture mode is "+(b&&b!=="full"?b:"not full")+" for this session. Counts, times, models and tool calls are still shown. "+B()}</div>`:null}
    <${w} id="agtrs" title="Summary" sub=${$.source||""}>
      <${I} stats=${[{label:"Turns",value:i($.total_turns??d.length)},{label:"Model calls",value:i($.total_api_calls)},{label:"Tool calls",value:i($.total_tool_uses)},{label:"Tokens",value:i($.total_tokens)},{label:"Errors",value:i($.errors)},{label:"Subagents",value:i($.subagents)},{label:"Compactions",value:i($.compactions)}]}/>
    </${w}>
    <${w} id="agtr" title="Transcript, oldest first" sub=${o?a?"Read again every 5 s while the agent runs":"Not refreshing":""}>
      <div class="bd-ag-bar">
        ${d.length?e`<button type="button" class="bd-btn" onClick=${()=>c(v?new Set:new Set(d.map((r,p)=>p)))}>${v?"Collapse all":"Expand all"}</button>`:null}
        ${o?e`<label class="bd-ag-check"><input type="checkbox" checked=${a} onChange=${r=>m(r.currentTarget.checked)}/>Refresh while it runs</label>`:null}
      </div>
      ${S&&!u&&d.length?e`<div class="bd-note" role="status">${S} The prompts, model calls, tool calls and tokens of each turn are shown.</div>`:null}
      ${d.length?e`<ol class="bd-ag-turnl">${d.map((r,p)=>e`<${G} key=${p} turn=${r} n=${p+1} open=${f.has(p)} onToggle=${()=>k(p)} withheld=${u} replyNote=${S}/>`)}</ol>`:e`<div class="bd-empty">${u?"No turn has times or tokens to show.":"No turn for this session: aictl has no prompt, model call or tool call of it."}</div>`}
    </${w}>`}export{z as REFRESH_MS,ot as default};
