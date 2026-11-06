import{x as S,d as m,T as w,m as r,y as L}from"./index-Dnzi7PMf.js";import{L as C,q as $,V as b,b5 as z,B as P}from"./useSse-NYtt3cbk.js";import{S as T,a as W,I as _}from"./app-DvY9Tbml.js";const x=[{id:"prompts",label:"Prompts"},{id:"workflows",label:"Workflows"}],h=t=>t==="command"||t==="commands";function k(t){const i="/"+String(t||"").replace(/\\/g,"/").toLowerCase();return/\/(fixtures?|__fixtures__|__tests__)\//.test(i)}function F(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const a of l.files||[]){const o=a.path||"",n=a.kind||"",c=o.replace(/\\/g,"/").toLowerCase();if((o.endsWith(".prompt.md")||n==="prompt"||h(n)&&(c.includes("/prompts/")||c.includes("/commands/")))&&!k(o)){const u=b(o).replace(/\.prompt\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:u,path:o,kind:n,tool:l.tool,toolLabel:l.label,size:a.size||0,tokens:a.tokens||0,mtime:a.mtime||0})}}const s=new Set;return i.filter(l=>s.has(l.id)?!1:(s.add(l.id),!0))}function I(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const a of l.files||[]){const o=a.path||"",n=a.kind||"";if((o.endsWith(".workflow.md")||n==="workflow"||n==="workflows"||h(n)&&o.toLowerCase().includes("/workflows/"))&&!k(o)){const d=b(o).replace(/\.workflow\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:d,path:o,kind:n,tool:l.tool,toolLabel:l.label,size:a.size||0,tokens:a.tokens||0,mtime:a.mtime||0})}}const s=new Set;return i.filter(l=>s.has(l.id)?!1:(s.add(l.id),!0))}function N({prompt:t,view:i="prompts"}){const[s,l]=m(null),[a,o]=m(!1),n=i==="workflows"?"workflow":"prompt";return L(()=>{if(!t){l(null);return}let c=!0;return o(!0),l(null),z(t.path).then(d=>d.text()).then(d=>{c&&(l(d),o(!1))}).catch(()=>{c&&o(!1)}),()=>{c=!1}},[t==null?void 0:t.path]),t?r`<div class="cprompts-detail-view">
    <div class="c-overline c-overline--wide">${i==="workflows"?"Workflow":"Prompt"}</div>
    <div class="cprompts-detail-title">${t.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${t.toolLabel}</span>
      ${t.size>0&&r`<span> \u00b7 ${$(t.size)}</span>`}
      ${t.tokens>0&&r`<span> \u00b7 ${t.tokens}t</span>`}
      ${t.mtime>0&&r`<span> \u00b7 ${P(t.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${t.path}</div>
    <div class="cprompts-detail-body">
      ${a?r`<div class="cprompts-loading">Loading\u2026</div>`:s===null?r`<div class="cprompts-loading">No content available.</div>`:r`<pre class="cprompts-code">${s}</pre>`}
    </div>
  </div>`:r`<div class="cprompts-detail-empty">
      <div class="c-overline cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a ${n} from the list to view its content.</div>
    </div>`}function V({view:t,hasSnap:i}){const s=t==="prompts";return r`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true"><${_} name=${s?"pen":"settings"} size="1.4em"/></div>
    <div class="cprompts-empty-title">No ${s?"prompts":"workflows"} yet</div>
    <div class="cprompts-empty-body">
      ${s?"Save frequently-used prompts here for one-click re-use across any agent.":"Workflows chain multiple agent steps into a single automated run."}
    </div>
    <div class="cprompts-empty-note">
      ${i?`No ${s?".prompt.md":".workflow.md"} files found in tracked tool workspaces. Create one in your project's ${s?".github/prompts/":".github/workflows/"} directory.`:`This tab lists ${s?".prompt.md":".workflow.md"} files from your workspace.`}
    </div>
  </div>`}function K(){const t=S(T),i=t==null?void 0:t.snap,[s,l]=m("prompts"),[a,o]=m(""),[n,c]=m(null),d=w(()=>F(i),[i]),u=w(()=>I(i),[i]),v=s==="prompts"?d:u,f=w(()=>{if(!a)return v;const e=a.toLowerCase();return v.filter(p=>p.name.toLowerCase().includes(e)||p.path.toLowerCase().includes(e)||p.toolLabel.toLowerCase().includes(e))},[v,a]),y=f.find(e=>e.id===n)??null,g=e=>{l(e),o(""),c(null)};return r`<div class="c-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${x.map(e=>r`<button key=${e.id} type="button"
          class=${"cprompts-seg-btn"+(s===e.id?" is-active":"")}
          onClick=${()=>g(e.id)}
          aria-pressed=${s===e.id?"true":"false"}
        >${e.label}</button>`)}
      </div>

      <div class="c-filter-wrap cprompts-filter-wrap">
        <span class="c-filter-icon" aria-hidden="true">\u2315</span>
        <input class="c-filter-input" type="text"
          placeholder=${"Search "+s+"…"}
          aria-label=${"Filter "+s}
          value=${a}
          onInput=${e=>o(e.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${f.length} ${s}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${f.length===0?C(t==null?void 0:t.enabledTools)&&!a?r`<${W} enabledTools=${t.enabledTools} snap=${i} what=${"the "+s+" list"}/>`:r`<${V} view=${s} hasSnap=${!!i}/>`:f.map(e=>r`<div key=${e.id}
              class=${"cprompts-prompt-row"+(e.id===n?" is-selected":"")}
              onClick=${()=>c(e.id===n?null:e.id)}
              role="button" tabIndex=${0}
              onKeyDown=${p=>p.key==="Enter"&&c(e.id===n?null:e.id)}>
              <div class="cprompts-prompt-name">${e.name}</div>
              <div class="cprompts-prompt-meta">
                ${e.toolLabel}
                ${e.size>0?` · ${$(e.size)}`:""}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${N} prompt=${y} view=${s}/>
      </div>
    </div>
  </div>`}export{K as default,k as isTestFixturePath};
