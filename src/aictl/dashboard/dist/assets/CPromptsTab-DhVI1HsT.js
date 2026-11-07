import{x as S,d as m,T as w,m as n,y as C}from"./index-0APVtqay.js";import{M as L,w as $,W as h,d as T,F as z}from"./useSse-Dcx1BuKe.js";import{S as P}from"./app-DoCkKEKd.js";import{T as W}from"./ToolScopeEmpty-CzCb5Yvm.js";import{I as x}from"./Icon-1my9WQDm.js";import{TextView as _}from"./TextView-DKtsDjbG.js";import"./platform-F0jTv3XI.js";const F=[{id:"prompts",label:"Prompts"},{id:"workflows",label:"Workflows"}],b=t=>t==="command"||t==="commands";function k(t){const i="/"+String(t||"").replace(/\\/g,"/").toLowerCase();return/\/(fixtures?|__fixtures__|__tests__)\//.test(i)}function I(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const r of l.files||[]){const o=r.path||"",a=r.kind||"",c=o.replace(/\\/g,"/").toLowerCase();if((o.endsWith(".prompt.md")||a==="prompt"||b(a)&&(c.includes("/prompts/")||c.includes("/commands/")))&&!k(o)){const u=h(o).replace(/\.prompt\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:u,path:o,kind:a,tool:l.tool,toolLabel:l.label,size:r.size||0,tokens:r.tokens||0,mtime:r.mtime||0})}}const e=new Set;return i.filter(l=>e.has(l.id)?!1:(e.add(l.id),!0))}function N(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const r of l.files||[]){const o=r.path||"",a=r.kind||"";if((o.endsWith(".workflow.md")||a==="workflow"||a==="workflows"||b(a)&&o.toLowerCase().includes("/workflows/"))&&!k(o)){const d=h(o).replace(/\.workflow\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:d,path:o,kind:a,tool:l.tool,toolLabel:l.label,size:r.size||0,tokens:r.tokens||0,mtime:r.mtime||0})}}const e=new Set;return i.filter(l=>e.has(l.id)?!1:(e.add(l.id),!0))}function V({prompt:t,view:i="prompts"}){const[e,l]=m(null),[r,o]=m(!1),a=i==="workflows"?"workflow":"prompt";return C(()=>{if(!t){l(null);return}let c=!0;return o(!0),l(null),T(t.path).then(d=>d.text()).then(d=>{c&&(l(d),o(!1))}).catch(()=>{c&&o(!1)}),()=>{c=!1}},[t==null?void 0:t.path]),t?n`<div class="cprompts-detail-view">
    <div class="c-overline c-overline--wide">${i==="workflows"?"Workflow":"Prompt"}</div>
    <div class="cprompts-detail-title">${t.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${t.toolLabel}</span>
      ${t.size>0&&n`<span> \u00b7 ${$(t.size)}</span>`}
      ${t.tokens>0&&n`<span> \u00b7 ${t.tokens}t</span>`}
      ${t.mtime>0&&n`<span> \u00b7 ${z(t.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${t.path}</div>
    <div class="cprompts-detail-body">
      ${r?n`<div class="cprompts-loading">Loading\u2026</div>`:e===null?n`<div class="cprompts-loading">No content available.</div>`:n`<${_} text=${e} path=${t.path} source=${n`<pre class="cprompts-code">${e}</pre>`}/>`}
    </div>
  </div>`:n`<div class="cprompts-detail-empty">
      <div class="c-overline cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a ${a} from the list to view its content.</div>
    </div>`}function E({view:t,hasSnap:i}){const e=t==="prompts";return n`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true"><${x} name=${e?"pen":"settings"} size="1.4em"/></div>
    <div class="cprompts-empty-title">No ${e?"prompts":"workflows"} yet</div>
    <div class="cprompts-empty-body">
      ${e?"Save frequently-used prompts here for one-click re-use across any agent.":"Workflows chain multiple agent steps into a single automated run."}
    </div>
    <div class="cprompts-empty-note">
      ${i?`No ${e?".prompt.md":".workflow.md"} files found in tracked tool workspaces. Create one in your project's ${e?".github/prompts/":".github/workflows/"} directory.`:`This tab lists ${e?".prompt.md":".workflow.md"} files from your workspace.`}
    </div>
  </div>`}function G(){const t=S(P),i=t==null?void 0:t.snap,[e,l]=m("prompts"),[r,o]=m(""),[a,c]=m(null),d=w(()=>I(i),[i]),u=w(()=>N(i),[i]),v=e==="prompts"?d:u,f=w(()=>{if(!r)return v;const s=r.toLowerCase();return v.filter(p=>p.name.toLowerCase().includes(s)||p.path.toLowerCase().includes(s)||p.toolLabel.toLowerCase().includes(s))},[v,r]),y=f.find(s=>s.id===a)??null,g=s=>{l(s),o(""),c(null)};return n`<div class="c-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${F.map(s=>n`<button key=${s.id} type="button"
          class=${"cprompts-seg-btn"+(e===s.id?" is-active":"")}
          onClick=${()=>g(s.id)}
          aria-pressed=${e===s.id?"true":"false"}
        >${s.label}</button>`)}
      </div>

      <div class="c-filter-wrap cprompts-filter-wrap">
        <span class="c-filter-icon" aria-hidden="true">\u2315</span>
        <input class="c-filter-input" type="text"
          placeholder=${"Search "+e+"…"}
          aria-label=${"Filter "+e}
          value=${r}
          onInput=${s=>o(s.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${f.length} ${e}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${f.length===0?L(t==null?void 0:t.enabledTools)&&!r?n`<${W} enabledTools=${t.enabledTools} snap=${i} what=${"the "+e+" list"}/>`:n`<${E} view=${e} hasSnap=${!!i}/>`:f.map(s=>n`<div key=${s.id}
              class=${"cprompts-prompt-row"+(s.id===a?" is-selected":"")}
              onClick=${()=>c(s.id===a?null:s.id)}
              role="button" tabIndex=${0}
              onKeyDown=${p=>p.key==="Enter"&&c(s.id===a?null:s.id)}>
              <div class="cprompts-prompt-name">${s.name}</div>
              <div class="cprompts-prompt-meta">
                ${s.toolLabel}
                ${s.size>0?` · ${$(s.size)}`:""}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${V} prompt=${y} view=${e}/>
      </div>
    </div>
  </div>`}export{G as default,k as isTestFixturePath};
