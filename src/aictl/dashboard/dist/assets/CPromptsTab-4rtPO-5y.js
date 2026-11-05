import{x as y,S as g,d as m,T as v,m as r,a as w,aN as $,y as S,aO as L,h as C,I as z}from"./index-DZ1nb8NJ.js";const P=[{id:"prompts",label:"Prompts"},{id:"workflows",label:"Workflows"}];function W(t){const a=[];for(const o of(t==null?void 0:t.tools)||[])for(const i of o.files||[]){const l=i.path||"",n=i.kind||"";if(l.endsWith(".prompt.md")||n==="prompt"||n==="command"&&l.replace(/\\/g,"/").toLowerCase().includes("/prompts/")){const d=$(l).replace(/\.prompt\.md$/,"").replace(/\.md$/,"");a.push({id:l,name:d,path:l,kind:n,tool:o.tool,toolLabel:o.label,size:i.size||0,tokens:i.tokens||0,mtime:i.mtime||0})}}const s=new Set;return a.filter(o=>s.has(o.id)?!1:(s.add(o.id),!0))}function x(t){const a=[];for(const o of(t==null?void 0:t.tools)||[])for(const i of o.files||[]){const l=i.path||"",n=i.kind||"";if(l.endsWith(".workflow.md")||n==="workflow"||n==="workflows"||n==="command"&&l.toLowerCase().includes("/workflows/")){const d=$(l).replace(/\.workflow\.md$/,"").replace(/\.md$/,"");a.push({id:l,name:d,path:l,kind:n,tool:o.tool,toolLabel:o.label,size:i.size||0,tokens:i.tokens||0,mtime:i.mtime||0})}}const s=new Set;return a.filter(o=>s.has(o.id)?!1:(s.add(o.id),!0))}function N({prompt:t,view:a="prompts"}){const[s,o]=m(null),[i,l]=m(!1),n=a==="workflows"?"workflow":"prompt";return S(()=>{if(!t){o(null);return}let c=!0;return l(!0),o(null),L(t.path).then(d=>d.text()).then(d=>{c&&(o(d),l(!1))}).catch(()=>{c&&l(!1)}),()=>{c=!1}},[t==null?void 0:t.path]),t?r`<div class="cprompts-detail-view">
    <div class="c-overline c-overline--wide">${a==="workflows"?"Workflow":"Prompt"}</div>
    <div class="cprompts-detail-title">${t.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${t.toolLabel}</span>
      ${t.size>0&&r`<span> \u00b7 ${w(t.size)}</span>`}
      ${t.tokens>0&&r`<span> \u00b7 ${t.tokens}t</span>`}
      ${t.mtime>0&&r`<span> \u00b7 ${C(t.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${t.path}</div>
    <div class="cprompts-detail-body">
      ${i?r`<div class="cprompts-loading">Loading\u2026</div>`:s===null?r`<div class="cprompts-loading">No content available.</div>`:r`<pre class="cprompts-code">${s}</pre>`}
    </div>
  </div>`:r`<div class="cprompts-detail-empty">
      <div class="c-overline cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a ${n} from the list to view its content.</div>
    </div>`}function I({view:t,hasSnap:a}){const s=t==="prompts";return r`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true"><${z} name=${s?"pen":"settings"} size="1.4em"/></div>
    <div class="cprompts-empty-title">No ${s?"prompts":"workflows"} yet</div>
    <div class="cprompts-empty-body">
      ${s?"Save frequently-used prompts here for one-click re-use across any agent.":"Workflows chain multiple agent steps into a single automated run."}
    </div>
    <div class="cprompts-empty-note">
      ${a?`No ${s?".prompt.md":".workflow.md"} files found in tracked tool workspaces. Create one in your project's ${s?".github/prompts/":".github/workflows/"} directory.`:`This tab lists ${s?".prompt.md":".workflow.md"} files from your workspace.`}
    </div>
  </div>`}function V(){const t=y(g),a=t==null?void 0:t.snap,[s,o]=m("prompts"),[i,l]=m(""),[n,c]=m(null),d=v(()=>W(a),[a]),k=v(()=>x(a),[a]),u=s==="prompts"?d:k,f=v(()=>{if(!i)return u;const e=i.toLowerCase();return u.filter(p=>p.name.toLowerCase().includes(e)||p.path.toLowerCase().includes(e)||p.toolLabel.toLowerCase().includes(e))},[u,i]),b=f.find(e=>e.id===n)??null,h=e=>{o(e),l(""),c(null)};return r`<div class="c-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${P.map(e=>r`<button key=${e.id} type="button"
          class=${"cprompts-seg-btn"+(s===e.id?" is-active":"")}
          onClick=${()=>h(e.id)}
          aria-pressed=${s===e.id?"true":"false"}
        >${e.label}</button>`)}
      </div>

      <div class="c-filter-wrap cprompts-filter-wrap">
        <span class="c-filter-icon" aria-hidden="true">\u2315</span>
        <input class="c-filter-input" type="text"
          placeholder=${"Search "+s+"…"}
          aria-label=${"Filter "+s}
          value=${i}
          onInput=${e=>l(e.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${f.length} ${s}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${f.length===0?r`<${I} view=${s} hasSnap=${!!a}/>`:f.map(e=>r`<div key=${e.id}
              class=${"cprompts-prompt-row"+(e.id===n?" is-selected":"")}
              onClick=${()=>c(e.id===n?null:e.id)}
              role="button" tabIndex=${0}
              onKeyDown=${p=>p.key==="Enter"&&c(e.id===n?null:e.id)}>
              <div class="cprompts-prompt-name">${e.name}</div>
              <div class="cprompts-prompt-meta">
                ${e.toolLabel}
                ${e.size>0?` · ${w(e.size)}`:""}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${N} prompt=${b} view=${s}/>
      </div>
    </div>
  </div>`}export{V as default};
