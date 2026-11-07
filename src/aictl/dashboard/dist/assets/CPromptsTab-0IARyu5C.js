import{x as S,d as m,T as $,m as r,y as L}from"./index-vv_D0zX4.js";import{L as C,q as w,V as b,b5 as T,B as z}from"./useSse-Choi4ZDH.js";import{S as P,a as x,I as W}from"./app-9z-oBkOS.js";import{T as _}from"./TextView-Dhv-JKH_.js";const V=[{id:"prompts",label:"Prompts"},{id:"workflows",label:"Workflows"}],h=t=>t==="command"||t==="commands";function k(t){const i="/"+String(t||"").replace(/\\/g,"/").toLowerCase();return/\/(fixtures?|__fixtures__|__tests__)\//.test(i)}function F(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const a of l.files||[]){const o=a.path||"",n=a.kind||"",c=o.replace(/\\/g,"/").toLowerCase();if((o.endsWith(".prompt.md")||n==="prompt"||h(n)&&(c.includes("/prompts/")||c.includes("/commands/")))&&!k(o)){const u=b(o).replace(/\.prompt\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:u,path:o,kind:n,tool:l.tool,toolLabel:l.label,size:a.size||0,tokens:a.tokens||0,mtime:a.mtime||0})}}const e=new Set;return i.filter(l=>e.has(l.id)?!1:(e.add(l.id),!0))}function I(t){const i=[];for(const l of(t==null?void 0:t.tools)||[])for(const a of l.files||[]){const o=a.path||"",n=a.kind||"";if((o.endsWith(".workflow.md")||n==="workflow"||n==="workflows"||h(n)&&o.toLowerCase().includes("/workflows/"))&&!k(o)){const d=b(o).replace(/\.workflow\.md$/,"").replace(/\.md$/,"");i.push({id:o,name:d,path:o,kind:n,tool:l.tool,toolLabel:l.label,size:a.size||0,tokens:a.tokens||0,mtime:a.mtime||0})}}const e=new Set;return i.filter(l=>e.has(l.id)?!1:(e.add(l.id),!0))}function N({prompt:t,view:i="prompts"}){const[e,l]=m(null),[a,o]=m(!1),n=i==="workflows"?"workflow":"prompt";return L(()=>{if(!t){l(null);return}let c=!0;return o(!0),l(null),T(t.path).then(d=>d.text()).then(d=>{c&&(l(d),o(!1))}).catch(()=>{c&&o(!1)}),()=>{c=!1}},[t==null?void 0:t.path]),t?r`<div class="cprompts-detail-view">
    <div class="c-overline c-overline--wide">${i==="workflows"?"Workflow":"Prompt"}</div>
    <div class="cprompts-detail-title">${t.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${t.toolLabel}</span>
      ${t.size>0&&r`<span> \u00b7 ${w(t.size)}</span>`}
      ${t.tokens>0&&r`<span> \u00b7 ${t.tokens}t</span>`}
      ${t.mtime>0&&r`<span> \u00b7 ${z(t.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${t.path}</div>
    <div class="cprompts-detail-body">
      ${a?r`<div class="cprompts-loading">Loading\u2026</div>`:e===null?r`<div class="cprompts-loading">No content available.</div>`:r`<${_} text=${e} path=${t.path} source=${r`<pre class="cprompts-code">${e}</pre>`}/>`}
    </div>
  </div>`:r`<div class="cprompts-detail-empty">
      <div class="c-overline cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a ${n} from the list to view its content.</div>
    </div>`}function E({view:t,hasSnap:i}){const e=t==="prompts";return r`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true"><${W} name=${e?"pen":"settings"} size="1.4em"/></div>
    <div class="cprompts-empty-title">No ${e?"prompts":"workflows"} yet</div>
    <div class="cprompts-empty-body">
      ${e?"Save frequently-used prompts here for one-click re-use across any agent.":"Workflows chain multiple agent steps into a single automated run."}
    </div>
    <div class="cprompts-empty-note">
      ${i?`No ${e?".prompt.md":".workflow.md"} files found in tracked tool workspaces. Create one in your project's ${e?".github/prompts/":".github/workflows/"} directory.`:`This tab lists ${e?".prompt.md":".workflow.md"} files from your workspace.`}
    </div>
  </div>`}function A(){const t=S(P),i=t==null?void 0:t.snap,[e,l]=m("prompts"),[a,o]=m(""),[n,c]=m(null),d=$(()=>F(i),[i]),u=$(()=>I(i),[i]),v=e==="prompts"?d:u,f=$(()=>{if(!a)return v;const s=a.toLowerCase();return v.filter(p=>p.name.toLowerCase().includes(s)||p.path.toLowerCase().includes(s)||p.toolLabel.toLowerCase().includes(s))},[v,a]),y=f.find(s=>s.id===n)??null,g=s=>{l(s),o(""),c(null)};return r`<div class="c-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${V.map(s=>r`<button key=${s.id} type="button"
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
          value=${a}
          onInput=${s=>o(s.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${f.length} ${e}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${f.length===0?C(t==null?void 0:t.enabledTools)&&!a?r`<${x} enabledTools=${t.enabledTools} snap=${i} what=${"the "+e+" list"}/>`:r`<${E} view=${e} hasSnap=${!!i}/>`:f.map(s=>r`<div key=${s.id}
              class=${"cprompts-prompt-row"+(s.id===n?" is-selected":"")}
              onClick=${()=>c(s.id===n?null:s.id)}
              role="button" tabIndex=${0}
              onKeyDown=${p=>p.key==="Enter"&&c(s.id===n?null:s.id)}>
              <div class="cprompts-prompt-name">${s.name}</div>
              <div class="cprompts-prompt-meta">
                ${s.toolLabel}
                ${s.size>0?` · ${w(s.size)}`:""}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${N} prompt=${y} view=${e}/>
      </div>
    </div>
  </div>`}export{A as default,k as isTestFixturePath};
