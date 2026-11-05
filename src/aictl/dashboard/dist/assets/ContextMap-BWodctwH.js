import{x as L,S as M,d as O,T as E,m as f,b as d,p as S,e as I,B as _}from"./index-bTWi6ueq.js";const T={instructions:"var(--accent)",config:"var(--yellow)",rules:"var(--orange)",commands:"var(--cat-commands)",skills:"var(--cat-skills)",agent:"var(--cat-agent)",memory:"var(--cat-memory)",prompt:"var(--cat-prompt)",transcript:"var(--fg2)",temp:"var(--cat-temp)",runtime:"var(--cat-runtime)",credentials:"var(--red)",extensions:"var(--cat-extensions)"},A=["project","global","shadow","session","external"],P=["#4dc9f6","#f67019","#f53794","#537bc4","#acc236","#166a8f","#00a950","#8549ba","#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#42d4f4","#fabed4"];function B(m,v){const c=_(m),n=_(v);if(!c)return"(unknown)";if(n&&c.startsWith(n+"/")){const $=c.slice(n.length+1).split("/")[0];return $.startsWith(".")?"(root)":$}return c.includes("/.claude/projects/")?"(shadow)":c.includes("/.claude/")||c.includes("/.config/")||c.includes("/Library/")||c.includes("/AppData/")?"(global)":"(other)"}function D(m){if(!m)return"unknown";const v=_(m).split("/"),c=v.pop()||"unknown",n=c.lastIndexOf("."),$=n>0?c.slice(0,n):c;if(/^(SKILL|skill|index|INDEX|README|readme)$/.test($)){const j=v.pop();if(j)return j}return $}function N(){const{snap:m}=L(M),[v,c]=O(null),n=E(()=>{if(!m)return null;const t=m.tools.filter(s=>s.tool!=="aictl"&&s.tool!=="any");if(!t.length)return null;const r=m.root||"",o={},l={},e={},u={yes:0,"on-demand":0,conditional:0,no:0};let k=0;for(const s of t)for(const i of s.files||[]){const a=i.kind||"other",h=i.scope||"external",z=(i.sent_to_llm||"no").toLowerCase(),x=i.tokens||0,b=B(i.path,r),C=D(i.path);o[a]||(o[a]={tokens:0,files:0,projects:{}}),o[a].tokens+=x,o[a].files+=1,o[a].projects[b]||(o[a].projects[b]={tokens:0,count:0}),o[a].projects[b].tokens+=x,o[a].projects[b].count+=1,e[b]||(e[b]={tokens:0,count:0,cats:{}}),e[b].tokens+=x,e[b].count+=1,e[b].cats[a]||(e[b].cats[a]={tokens:0,count:0,items:{}}),e[b].cats[a].tokens+=x,e[b].cats[a].count+=1,e[b].cats[a].items[C]||(e[b].cats[a].items[C]=0),e[b].cats[a].items[C]+=x,l[h]||(l[h]={tokens:0,files:0}),l[h].tokens+=x,l[h].files+=1,u[z]!==void 0?u[z]+=x:u.no+=x,k+=x}const y=Object.entries(o).sort((s,i)=>i[1].tokens-s[1].tokens),w=A.filter(s=>l[s]).map(s=>[s,l[s]]),p=Object.entries(e).sort((s,i)=>i[1].tokens-s[1].tokens),g=t.map(s=>{const i=s.files||[];return{tool:s.tool,label:s.label,tokens:i.reduce((a,h)=>a+h.tokens,0),files:i.length,sentYes:i.filter(a=>(a.sent_to_llm||"").toLowerCase()==="yes").reduce((a,h)=>a+h.tokens,0)}}).filter(s=>s.tokens>0).sort((s,i)=>i.tokens-s.tokens).slice(0,8);return{cats:y,scopes:w,byPolicy:u,totalTokens:k,perTool:g,byCat:o,byProj:e,projList:p}},[m]);if(!n)return f`<p class="empty-state">No file data available.</p>`;if(!n.totalTokens)return f`<p class="empty-state">No token data collected yet.</p>`;const $=Math.max(...n.cats.map(([,t])=>t.tokens),1),j=(t,r)=>t>0?Math.max(2,Math.log10(t+1)/Math.log10(r+1)*100):0;return f`<div class="diag-card" role="region" aria-label="Context window map">
    <h3 style=${{marginBottom:"var(--sp-5)"}}>Context Window Map</h3>

    <!-- Policy summary -->
    <div class="flex-row flex-wrap gap-md mb-md">
      <span class="badge--accent badge" data-dp="overview.context_map.sent_to_llm" style="background:var(--green);color:var(--on-status)">
        Sent to LLM: ${d(n.byPolicy.yes)} tok</span>
      <span class="badge" data-dp="overview.context_map.on_demand" style="background:var(--yellow);color:var(--on-status)">
        On-demand: ${d(n.byPolicy["on-demand"])} tok</span>
      <span class="badge" data-dp="overview.context_map.conditional" style="background:var(--orange);color:var(--on-status)">
        Conditional: ${d(n.byPolicy.conditional)} tok</span>
      <span class="badge--muted badge" data-dp="overview.context_map.not_sent">
        Not sent: ${d(n.byPolicy.no)} tok</span>
    </div>

    <!-- Top stacked bar: tokens by category -->
    <div class="mb-md">
      <div class="es-section-title">Tokens by Category (${d(n.totalTokens)} total)</div>
      <div class="overflow-hidden" style="display:flex;height:24px;border-radius:4px;background:var(--bg)">
        ${n.cats.map(([t,r])=>{const o=r.tokens/n.totalTokens*100;return o<.5?null:f`<div key=${t} style="width:${o}%;background:${T[t]||"var(--fg2)"};
            position:relative;min-width:2px"
            title="${t}: ${d(r.tokens)} tokens (${r.files} files)">
            ${o>8?f`<span class="text-ellipsis text-bold" style="position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;font-size:var(--fs-2xs);color:var(--on-status);padding:0 2px">${t}</span>`:null}
          </div>`})}
      </div>
    </div>

    <!-- Per-category bars with project sub-segments -->
    <div class="mb-md">
      <div class="text-muted" style="font-size:var(--fs-2xs);margin-bottom:var(--sp-1)">bar length: log scale</div>
      ${n.cats.map(([t,r])=>{const o=Object.entries(r.projects).sort((e,u)=>u[1].tokens-e[1].tokens),l=j(r.tokens,$);return f`<div key=${t} class="flex-row gap-sm" style="margin-bottom:var(--sp-1);font-size:var(--fs-base)">
          <span class="text-bold text-right" style="width:80px;color:${T[t]||"var(--fg2)"};flex-shrink:0">${t}</span>
          <div class="flex-1 overflow-hidden" style="height:16px;background:var(--bg);border-radius:2px">
            <div style="width:${l}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
              ${o.map(([e,u],k)=>{const y=r.tokens>0?u.tokens/r.tokens*100:0;if(y<.5)return null;const w=!v||v===e;return f`<div key=${e} style="width:${y}%;height:100%;
                  background:${T[t]||"var(--fg2)"};
                  opacity:${w?Math.max(.3,1-k*.12):.12};
                  border-right:1px solid var(--bg);
                  display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px;
                  cursor:pointer;transition:opacity 0.15s"
                  title="${e}: ${d(u.tokens)} tok (${u.count} files)"
                  role="button" tabindex="0"
                  aria-pressed=${v===e?"true":"false"}
                  aria-label="${e}: ${d(u.tokens)} tokens (${u.count} files) in ${t}"
                  onClick=${()=>c(v===e?null:e)}
                  onKeyDown=${p=>{(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),c(v===e?null:e))}}>
                  ${y>12&&l>15?f`<span style="font-size:var(--fs-2xs);color:var(--on-status);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:600">${e}</span>`:null}
                </div>`})}
            </div>
          </div>
          <span class="text-right text-muted" style="min-width:55px">${d(r.tokens)} tok</span>
          <span class="text-right text-muted" style="min-width:40px">${r.files} f</span>
        </div>`})}
    </div>

    <!-- Project sub-tabs -->
    <div class="flex-row flex-wrap gap-sm" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:var(--sp-4)">
      ${n.projList.map(([t,r])=>{const o=v===t;return f`<button key=${t}
          style="cursor:pointer;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-sm);
            background:${o?"var(--accent)":"transparent"};
            color:${o?"var(--bg)":"var(--fg2)"};
            border:1px solid ${o?"var(--accent)":"var(--border)"};
            border-radius:4px 4px 0 0;font-weight:${o?600:400};border-bottom:none"
          onClick=${()=>c(o?null:t)}>
          ${t} (${d(r.tokens)})
        </button>`})}
    </div>

    <!-- Tab content: per-category bars with item sub-segments -->
    ${v&&n.byProj[v]?(()=>{const t=n.byProj[v],r=Object.entries(t.cats).sort((l,e)=>e[1].tokens-l[1].tokens),o=Math.max(...r.map(([,l])=>l.tokens),1);return f`<div class="mb-md" style="background:var(--bg2);border-radius:6px;padding:var(--sp-4)">
        <div class="es-section-title">${v} \u2014 ${d(t.tokens)} tokens across ${t.count} files</div>
        ${r.map(([l,e])=>{const u=Object.entries(e.items).sort((p,g)=>g[1]-p[1]),k=u.slice(0,15),y=u.slice(15).reduce((p,[,g])=>p+g,0);y>0&&k.push(["(other)",y]);const w=j(e.tokens,o);return f`<div key=${l} style="margin-bottom:var(--sp-3)">
            <div class="flex-row gap-sm" style="font-size:var(--fs-base)">
              <span class="text-bold text-right" style="width:80px;color:${T[l]||"var(--fg2)"};flex-shrink:0">${l}</span>
              <div class="flex-1 overflow-hidden" style="height:18px;background:var(--bg);border-radius:2px">
                <div style="width:${w}%;height:100%;display:flex;border-radius:2px;overflow:hidden">
                  ${k.map(([p,g],s)=>{const i=e.tokens>0?g/e.tokens*100:0;if(i<.3)return null;const a=P[s%P.length];return f`<div key=${p} style="width:${i}%;height:100%;background:${a};
                      border-right:1px solid var(--bg);
                      display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:1px"
                      title="${p}: ${d(g)} tok">
                      ${i>10&&w>20?f`<span style="font-size:var(--fs-2xs);color:#111;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px;font-weight:700">${p}</span>`:null}
                    </div>`})}
                </div>
              </div>
              <span class="text-right text-muted" style="min-width:55px">${d(e.tokens)} tok</span>
              <span class="text-right text-muted" style="min-width:30px">${e.count}f</span>
            </div>
            <!-- Item legend -->
            <div style="padding-left:88px;display:flex;flex-wrap:wrap;gap:var(--sp-1) var(--sp-3);margin-top:3px">
              ${k.map(([p,g],s)=>f`<span key=${p}
                style="font-size:var(--fs-xs);display:inline-flex;align-items:center;gap:3px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                  background:${P[s%P.length]};flex-shrink:0"></span>
                <span class="text-muted">${p} ${d(g)}</span>
              </span>`)}
            </div>
          </div>`})}
      </div>`})():null}

    <!-- Scope + Per-tool side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-8)">
      <div>
        <div class="es-section-title">By Scope</div>
        ${n.scopes.map(([t,r])=>f`<div key=${t} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span class="text-bold">${t}</span>
          <span class="text-muted">${r.files} files \u00B7 ${d(r.tokens)} tok</span>
        </div>`)}
      </div>
      <div>
        <div class="es-section-title">By Tool</div>
        ${n.perTool.map(t=>f`<div key=${t.tool} class="flex-between"
          style="padding:var(--sp-1) var(--sp-4);font-size:var(--fs-base);background:var(--bg2);border-radius:3px;margin-bottom:var(--sp-1)">
          <span><${S} tool=${t.tool} size="0.95em"/> ${I(t.label)}</span>
          <span class="text-muted">${d(t.sentYes)} sent \u00B7 ${d(t.tokens)} total</span>
        </div>`)}
      </div>
    </div>
  </div>`}export{N as default};
