import{x as O,d as S,T as I,m as c}from"./index-C_ub8iES.js";import{S as A,a as B,T as D}from"./app-Cf1eevD3.js";import{L,r as p,v as N,ao as _}from"./useSse-C2BhVkiD.js";const j={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},W=["project","global","shadow","session","external"],P=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function R(b,k){const n=_(b),m=_(k);if(!n)return"(unknown)";if(m&&n.startsWith(m+"/")){const r=n.slice(m.length+1).split("/")[0];return r.startsWith(".")?"(root)":r}return n.includes("/.claude/projects/")?"(shadow)":n.includes("/.claude/")||n.includes("/.config/")||n.includes("/Library/")||n.includes("/AppData/")?"(global)":"(other)"}function K(b){if(!b)return"unknown";const k=_(b).split("/"),n=k.pop()||"unknown",m=n.lastIndexOf("."),r=m>0?n.slice(0,m):n;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test(r)){const T=k.pop();if(T)return T}return r}function q(){const{snap:b,enabledTools:k=null}=O(A),[n,m]=S(null),r=I(()=>{if(!b)return null;const t=b.tools.filter(s=>s.tool!=="aictl"&&s.tool!=="any");if(!t.length)return null;const i=b.root||"",o={},d={},e={},v={yes:0,"on-demand":0,conditional:0,no:0};let y=0;for(const s of t)for(const l of s.files||[]){const a=l.kind||"other",$=l.scope||"external",E=(l.sent_to_llm||"no").toLowerCase(),x=l.tokens||0,u=R(l.path,i),C=K(l.path);o[a]||(o[a]={tokens:0,files:0,projects:{}}),o[a].tokens+=x,o[a].files+=1,o[a].projects[u]||(o[a].projects[u]={tokens:0,count:0}),o[a].projects[u].tokens+=x,o[a].projects[u].count+=1,e[u]||(e[u]={tokens:0,count:0,cats:{}}),e[u].tokens+=x,e[u].count+=1,e[u].cats[a]||(e[u].cats[a]={tokens:0,count:0,items:{}}),e[u].cats[a].tokens+=x,e[u].cats[a].count+=1,e[u].cats[a].items[C]||(e[u].cats[a].items[C]=0),e[u].cats[a].items[C]+=x,d[$]||(d[$]={tokens:0,files:0}),d[$].tokens+=x,d[$].files+=1,v[E]!==void 0?v[E]+=x:v.no+=x,y+=x}const h=Object.entries(o).sort((s,l)=>l[1].tokens-s[1].tokens),w=W.filter(s=>d[s]).map(s=>[s,d[s]]),f=Object.entries(e).sort((s,l)=>l[1].tokens-s[1].tokens),g=t.map(s=>{const l=s.files||[];return{tool:s.tool,label:s.label,tokens:l.reduce((a,$)=>a+$.tokens,0),files:l.length,sentYes:l.filter(a=>(a.sent_to_llm||"").toLowerCase()==="yes").reduce((a,$)=>a+$.tokens,0)}}).filter(s=>s.tokens>0).sort((s,l)=>l.tokens-s.tokens).slice(0,8);return{cats:h,scopes:w,byPolicy:v,totalTokens:y,perTool:g,byCat:o,byProj:e,projList:f}},[b]),T=c`<${B} enabledTools=${k} snap=${b} what="the context map"/>`;if(!r)return L(k)?T:c`<p class="empty-state">No file data available.</p>`;if(!r.totalTokens)return L(k)?T:c`<p class="empty-state">No token data collected yet.</p>`;const M=Math.max(...r.cats.map(([,t])=>t.tokens),1),z=(t,i)=>t>0?Math.max(2,Math.log10(t+1)/Math.log10(i+1)*100):0;return c`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:"var(--sp-2)"}}>Context Window Map</h3>
    <p class="text-muted text-xs" style=${{marginBottom:"var(--sp-4)"}} data-testid="context-map-basis">
      Token figures estimate file size at about 4 bytes per token. Files marked "Not sent" (transcripts, logs, config) are counted
      in the category totals but are not context.</p>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--on-status)">
        Sent to LLM: ${p(r.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--on-status)">
        On-demand: ${p(r.byPolicy["on-demand"])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--on-status)">
        Conditional: ${p(r.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${p(r.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${p(r.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${r.cats.map(([t,i])=>{const o=i.tokens/r.totalTokens*100;return o<.5?null:c`<div key=${t} style="width:${o}%;background:${j[t]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${t}: ${p(i.tokens)} tokens (${i.files} files)">
            ${o>8?c`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--on-status);padding:0 2px">${t}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      <div class="text-muted" style="font-size:var(--fs-2xs);margin-bottom:var(--sp-1)">bar length: log scale</div>
      ${r.cats.map(([t,i])=>{const o=Object.entries(i.projects).sort((e,v)=>v[1].tokens-e[1].tokens),d=z(i.tokens,M);return c`<div key=${t} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${j[t]||"var(--fg2)"};flex-shrink:0">${t}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${d}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${o.map(([e,v],y)=>{const h=i.tokens>0?v.tokens/i.tokens*100:0;if(h<.5)return null;const w=!n||n===e;return c`<div key=${e} style="width:${h}%;height:100%;
                  background:${j[t]||"var(--fg2)"};
                  opacity:${w?Math.max(.3,1-y*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${e}: ${p(v.tokens)} tok (${v.count} files)"
                  role="button" tabindex="0"
                  aria-pressed=${n===e?"true":"false"}
                  aria-label="${e}: ${p(v.tokens)} tokens (${v.count} files) in ${t}"
                  onClick=${()=>m(n===e?null:e)}
                  onKeyDown=${f=>{(f.key==="Enter"||f.key===" ")&&(f.preventDefault(),m(n===e?null:e))}}>
                  ${h>12&&d>15?c`<span style="font-size:var(--fs-2xs);color:var(--on-status);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${e}</span>`:null}
                </div>`})}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${p(i.tokens)} tok</span>
          <span class="text-right text-muted" style="min-width:40px">${i.files} f</span>
        </div>`})}
    </div>

    <!-- Project sub-tabs -->
    <div class="flex-row flex-wrap gap-sm" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:var(--sp-4)">
      ${r.projList.map(([t,i])=>{const o=n===t;return c`<button key=${t}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${o?"var(--accent)":"transparent"};
            color:${o?"var(--bg)":"var(--fg2)"};
            border:1px solid ${o?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${o?600:400};border-bottom:none"
          onClick=${()=>m(o?null:t)}>
          ${t} (${p(i.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${n&&r.byProj[n]?(()=>{const t=r.byProj[n],i=Object.entries(t.cats).sort((d,e)=>e[1].tokens-d[1].tokens),o=Math.max(...i.map(([,d])=>d.tokens),1);return c`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${n} \u2014 ${p(t.tokens)} tokens across ${t.count} files</div>
        ${i.map(([d,e])=>{const v=Object.entries(e.items).sort((f,g)=>g[1]-f[1]),y=v.slice(0,15),h=v.slice(15).reduce((f,[,g])=>f+g,0);h>0&&y.push(["(other)",h]);const w=z(e.tokens,o);return c`<div key=${d} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${j[d]||"var(--fg2)"};flex-shrink:0">${d}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${w}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${y.map(([f,g],s)=>{const l=e.tokens>0?g/e.tokens*100:0;if(l<.3)return null;const a=P[s%P.length];return c`<div key=${f} style="width:${l}%;height:100%;background:${a};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${f}: ${p(g)} tok">
                      ${l>10&&w>20?c`<span style="font-size:var(--fs-2xs);color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${f}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${p(e.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${e.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${y.map(([f,g],s)=>c`<span key=${f}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${P[s%P.length]};flex-shrink:0"></span>
                <span class="text-muted">${f} ${p(g)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${r.scopes.map(([t,i])=>c`<div key=${t} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${t}</span>
          <span class="text-muted">${i.files} files \u00B7 ${p(i.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${r.perTool.map(t=>c`<div key=${t.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><${D} tool=${t.tool} size="0.95em"/> ${N(t.label)}</span>
          <span class="text-muted">${p(t.sentYes)} sent \u00B7 ${p(t.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}export{q as default};
