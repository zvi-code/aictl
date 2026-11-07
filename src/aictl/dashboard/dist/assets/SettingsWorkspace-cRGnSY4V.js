import{m as n,d as y,k as Tt,T as S,A as ks,y as st,q as O,w as Ft}from"./index-NixqUkgD.js";import{C as Ss,U as P,r as ft,D as et,s as Cs,K as Nt,b3 as Os}from"./useSse-WAQ32Qi7.js";import{I as $t,i as As,S as Ts,T as Fs}from"./ToolScopeEmpty-DM9crnSE.js";import{inferKind as Ns,DASH as ut,isOn as Ls,optionsFor as xs,agentInherits as lt,pinWins as Es,scopeLabel as T,commonModel as ws,SECTION_ORDER as ht,SECTION_TITLES as mt,topicMatrix as Is,plainValue as Dt,isAgentRow as Pt,PURPOSES as Rs,GIT_STATES as Mt,LOCATIONS as Ds,purposeOf as A,SCOPE_LABELS as jt,gitCategory as gt,matchFile as Ps,listOf as w,purposeGroups as Ms,fileGroups as js,LOCATION_LABELS as Gt,tildePath as V,fileMatrix as Gs,LOCATION_SHORT as Lt,PURPOSE_LABELS as B,fileFolders as qs,listParam as Us,gitRisk as Ws,findingGroups as qt,matchFinding as Ut,findingTools as Wt,samePath as H,isLockedEntry as Bt,isUnset as Bs,whyWins as Hs,ruleLabel as Ks,agentDecision as zs,writableScope as Vs,rowFilter as xt,mergeFiles as Js,settingsSummary as Qs,snapOf as Ys,toolEntries as Xs,aictlEntry as Zs,projectRoots as te,absentManaged as se,withFindingIds as ee,labelOf as ne,FILE_PARAMS as le,settingsParams as ae,readSettingsUrl as Et,CLEAR_PARAMS as oe}from"./model-BsH9_Zaq.js";function X(t){return t==null?ut:typeof t=="object"?JSON.stringify(t):String(t)}function ie({value:t,compact:s}){const[e,a]=y(!1),l=Array.isArray(t),o=l?t.map((p,$)=>[$,p]):Object.entries(t||{}),i=o.length;if(!i)return n`<span class="st-none">none</span>`;const d=n`<span class="st-chip st-chip--mono st-items">${i} ${i===1?"item":"items"}</span>`;return s?d:n`<span class="st-itemsbox">
    ${d}
    <button type="button" class="st-link" aria-expanded=${e?"true":"false"}
      onClick=${p=>{p.stopPropagation(),a(!e)}}>${e?"hide":"show"}</button>
    ${e&&n`<ul class="st-itemlist">
      ${o.map(([p,$])=>n`<li key=${p} class="st-mono" title=${l?X($):`${p}: ${X($)}`}>
        ${l?X($):n`<span class="st-itemkey">${p}:</span> ${X($)}`}</li>`)}
    </ul>`}
  </span>`}function nt({row:t,value:s,compact:e=!1}){const a=s!==void 0?s:t.value,l=t.kind||Ns(a),o=!!t.risky;if(l==="flag"||typeof a=="boolean"){if(a==null)return n`<span class="st-none">${ut}</span>`;const p=Ls(a);return n`<span class=${"st-flag"+(p?" is-on":"")+(o?" is-risky":"")}>
      <span class="st-switch" aria-hidden="true"></span><span class="st-flag__text">${p?"on":"off"}</span>
    </span>`}if(a==null||a==="")return n`<span class="st-none">${ut}</span>`;if(l==="list"||l==="map"||typeof a=="object")return n`<${ie} value=${a} compact=${e}/>`;const i=String(a),d=xs({...t,value:a});return d?n`<span class=${"st-select"+(o?" is-risky":"")} title=${"Options: "+d.join(", ")}>${i}</span>`:l==="path"?n`<span class="st-v st-path" title=${i}>${i}</span>`:n`<span class=${"st-v"+(o?" is-risky":"")} title=${i}>${i}</span>`}function M({scope:t,locked:s=!1,label:e=""}){const a=t||"default",l=n`<span class=${"st-chip st-scope st-scope--"+a.replace(/[^a-z-]/gi,"")+(s?" st-scope--locked":"")}
    title=${s?`Set by ${e||a}; cannot be changed here`:void 0}>${a}${s?n`<span class="st-sr"> (locked)</span>`:""}</span>`;return s?n`<span class="st-scopewrap"><${J}/>${l}</span>`:l}function J({label:t=""}){return t?n`<span class="st-lock" role="img" aria-label=${t} title=${t}><${$t} name="lock" size="11"/></span>`:n`<span class="st-lock" aria-hidden="true"><${$t} name="lock" size="11"/></span>`}function F({id:t,big:s=!1}){return n`<span class=${"st-sw"+(s?" st-sw--big":"")} aria-hidden="true"
    style=${{background:Ss[t]||"var(--st-fg2)"}}></span>`}function K({label:t}){return n`<span class="st-dot" role="img" aria-label=${t} title=${t}></span>`}function C({children:t}){return n`<div class="st-nav__h">${t}</div>`}function I({id:t,label:s}){return n`<span class="st-chip st-toolchip"><${F} id=${t}/>${s}</span>`}function z({path:t,line:s,w:e}){if(!t)return n`<span class="st-none">—</span>`;const a=t+(s>0?":"+s:"");return n`<button type="button" class="st-src" title=${a}
    onClick=${l=>{l.stopPropagation(),e.openAt(t,s)}}>
    <b>${P(t)}</b>${s>0?":"+s:""}</button>`}const ce="aictl has no description for this key; the value is shown as found in the file";function Ht(){return n`<span class="st-chip st-chip--muted st-undoc" title=${ce}>undocumented</span>`}const re=4;function pe(t,s){return`Set by ${T(t.scope,s.scopesOf(t.tool))}; cannot be changed here`}function Kt({row:t,w:s}){const e=t.agent,a=lt(t);return n`<span class="st-agentmodel">
    ${t.locked&&n`<${J} label=${pe(t,s)}/>`}
    ${a?n`<span class="st-inherit" title=${t.note||"Runs on the session model"}>inherits</span>`:n`<span class="st-v" title=${String(t.value)}>${String(t.value)}</span>`}
    ${e.model_policy==="required"&&n`<span class="st-badge" title="The agent file requires a model">required</span>`}
    ${Es(t)&&n`<span class="st-badge st-badge--pin" title=${"A settings pin decides the model: "+e.pinned_in}>pinned</span>`}
  </span>`}function zt({tools:t,all:s=!1}){if(!t||!t.length)return n`<span class="st-none" title="The agent file lists no tools">—</span>`;const e=s?t:t.slice(0,re),a=t.length-e.length;return n`<span class="st-tools">
    ${e.map(l=>n`<span key=${l} class="st-chip st-chip--mono" title=${l}>${l}</span>`)}
    ${a>0&&n`<span class="st-chip st-more-tools" title=${t.slice(e.length).join(", ")}>+${a}</span>`}
  </span>`}function Vt({row:t,w:s,withTool:e,withContext:a}){var p;const l=t.agent,o=((p=s.selected)==null?void 0:p.uid)===t.uid,i=()=>s.select({tool:t.tool,row:t.key}),d=$=>Number($)>0?Number($):0;return n`<tr class=${"st-row st-agentrow"+(o?" is-sel":"")} data-key=${t.key} data-tool=${t.tool}
    tabindex="0" onClick=${i}
    onKeyDown=${$=>{($.key==="Enter"||$.key===" ")&&($.preventDefault(),i())}}>
    ${e&&n`<td class="st-c-tool"><span class="st-matrix__toolname"><${F} id=${t.tool}/>${s.labelOf(t.tool)}</span></td>`}
    <td class="st-c-agent">
      <div class="st-label st-mono">${l.name||t.label}</div>
      ${l.description&&n`<div class="st-agentdesc" title=${l.description}>${l.description}</div>`}
    </td>
    <td class="st-c-model"><${Kt} row=${t} w=${s}/></td>
    <td class="st-mono">${l.effort||n`<span class="st-none">—</span>`}</td>
    ${a&&n`<td class="st-mono">${l.context_tier||n`<span class="st-none">—</span>`}</td>`}
    <td><${zt} tools=${l.tools}/></td>
    <td class="st-c-src"><${z} path=${l.defined_in} line=${d(l.defined_line)} w=${s}/></td>
    <td class="st-c-src"><${z} path=${l.pinned_in} line=${d(l.pinned_line)} w=${s}/></td>
  </tr>`}function de({w:t,section:s}){const e=s.shown,a=e.filter(lt).length;return n`<table class="st-table st-agents" data-section="agents">
    <thead><tr>
      <th scope="col" class="st-c-agent">Agent</th><th scope="col">Model</th><th scope="col">Effort</th>
      <th scope="col">Context</th><th scope="col">Tools</th><th scope="col" class="st-c-src">Defined in</th>
      <th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>
      <tr class="st-group"><th scope="colgroup" colspan="7">${s.title}
        <span class="st-group__meta">${e.length}${a?` · ${a} inherit the session model`:""}</span></th></tr>
      ${e.map(l=>n`<${Vt} key=${l.uid} row=${l} w=${t} withContext/>`)}
    </tbody>
  </table>`}const bt={tool:t=>(s,e)=>t.labelOf(s.tool).localeCompare(t.labelOf(e.tool))||Z(s).localeCompare(Z(e)),agent:t=>(s,e)=>Z(s).localeCompare(Z(e))||t.labelOf(s.tool).localeCompare(t.labelOf(e.tool)),model:t=>(s,e)=>wt(s).localeCompare(wt(e))||bt.tool(t)(s,e)};function Z(t){var s;return String(((s=t.agent)==null?void 0:s.name)||t.label||"")}function wt(t){return lt(t)?"￿":String(t.value)}function $e(t,s,e){return[...t].sort((bt[s]||bt.tool)(e))}function dt({id:t,label:s,sort:e,onSort:a}){const l=e===t;return n`<th scope="col" aria-sort=${l?"ascending":"none"}>
    <button type="button" class=${"st-sort"+(l?" is-on":"")} onClick=${()=>a(t)}>
      ${s}<span aria-hidden="true">${l?" ▴":""}</span></button></th>`}function ue({w:t,rows:s,sort:e,onSort:a}){const l=$e(s,e,t);return n`<div class="st-scroll"><table class="st-table st-agents st-agents--all">
    <thead><tr>
      <${dt} id="tool" label="Tool" sort=${e} onSort=${a}/>
      <${dt} id="agent" label="Agent" sort=${e} onSort=${a}/>
      <${dt} id="model" label="Model" sort=${e} onSort=${a}/>
      <th scope="col">Effort</th><th scope="col">Tools</th>
      <th scope="col" class="st-c-src">Defined in</th><th scope="col" class="st-c-src">Pinned in</th>
    </tr></thead>
    <tbody>${l.map(o=>n`<${Vt} key=${o.uid} row=${o} w=${t} withTool/>`)}</tbody>
  </table></div>`}function he(t,s){const e=P(t);if(s.filter(o=>P(o)===e).length<2)return e;const a=String(t).split(/[\\/]/).filter(Boolean);return a.length<2?e:(/^(Users|home)$/.test(a[0])&&a.length===4?"~/":"")+a[a.length-2]+"/"+e}function be({w:t}){const{entries:s,aictl:e,st:a}=t;return n`<nav class="st-nav" aria-label="Tools">
    <${C}>Tools</${C}>
    <ul class="st-nav__list">
      ${s.map(l=>{const o=l.id===t.toolId,i=l.rows.filter(o?t.passTool:t.pass),d=i.some(p=>p.risky);return n`<li key=${l.id}>
          <button type="button" class=${"st-nav__item"+(o?" is-on":"")+(i.length?"":" is-empty")}
            aria-current=${o?"true":void 0} data-tool=${l.id}
            onClick=${()=>t.set({tool:l.id,sec:"",row:"",scope:o?t.st.scope:""})}>
            <${F} id=${l.id}/><span class="st-nav__label">${l.label}</span>
            ${d&&n`<${K} label="A risky setting is on"/>`}
            <span class="st-nav__n">${i.length}</span>
          </button>
          ${o&&n`<ul class="st-nav__subs">
            ${l.sections.map(p=>{const $=p.rows.filter(t.passTool),r=a.sec===p.id,c=p.id==="agents"?ws($):"";return n`<li key=${p.id}><button type="button" class=${"st-nav__sub"+(r?" is-on":"")}
                aria-current=${r?"true":void 0}
                onClick=${()=>t.set({sec:r?"":p.id})}>
                <span class="st-nav__label">${p.title}</span>
                ${$.some(u=>u.risky)&&n`<${K} label="A risky setting is on"/>`}
                <span class="st-nav__n">${$.length}</span>
                ${c&&n`<span class="st-nav__model" title=${"Every agent runs on "+c}>${c}</span>`}
              </button></li>`})}
          </ul>`}
        </li>`})}
      ${e&&n`<li key="aictl">
        <button type="button" class=${"st-nav__item"+(t.toolId==="aictl"?" is-on":"")}
          aria-current=${t.toolId==="aictl"?"true":void 0} data-tool="aictl"
          onClick=${()=>t.set({tool:"aictl",sec:"",row:"",scope:""})}>
          <${F} id="aictl"/><span class="st-nav__label">aictl</span>
          <span class="st-nav__n">${e.collectors.length}</span>
        </button>
      </li>`}
    </ul>
  </nav>`}function fe({row:t,w:s,scopes:e}){var o;const a=((o=s.selected)==null?void 0:o.uid)===t.uid,l=()=>s.select({tool:t.tool,row:t.key});return n`<tr class=${"st-row"+(t.risky?" st-row--risky":"")+(t.unset?" st-row--unset":"")+(a?" is-sel":"")}
    data-key=${t.key} tabindex="0" onClick=${l}
    onKeyDown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),l())}}>
    <td class="st-c-set">
      <div class="st-label">${t.label}${t.undocumented&&n` <${Ht}/>`}</div>
      ${t.risky&&t.tip&&n`<div class="st-risknote">${t.tip}</div>`}
    </td>
    <td class="st-c-val"><${nt} row=${t}/></td>
    <td class="st-c-scope"><${M} scope=${t.scope} locked=${t.locked} label=${T(t.scope,e)}/></td>
    <td class="st-c-src"><${z} path=${t.source} line=${t.line} w=${s}/></td>
    <td class="st-c-what" title=${t.tip||void 0}>${t.tip}</td>
  </tr>`}function me({w:t,entry:s}){const e=s.scopes||[];if(!e.length)return null;const a=s.rows.filter(t.pass);return n`<div class="st-scopes" data-testid="st-scopes">
    <ol class="st-scopes__list" aria-label="Configuration layers, lowest precedence first">
      ${e.map((l,o)=>{const i=a.filter(r=>r.scope===l.id).length,d=t.st.scope===l.id,p=l.path?P(l.path):"",$=[l.label,l.paths.length?l.paths.join(`
`):"",l.exists?"":"not present",l.note,l.changeable?"":"Locked: cannot be changed from this machine"].filter(Boolean).join(`
`);return n`<li key=${l.id} class="st-scopes__item">
          ${o>0&&n`<span class="st-scopes__arrow" aria-hidden="true">→</span>`}
          <button type="button" class=${"st-scopechip"+(d?" is-on":"")+(l.changeable?"":" is-locked")+(l.exists?"":" is-absent")}
            data-scope=${l.id} aria-pressed=${d?"true":"false"} title=${$}
            onClick=${()=>t.set({scope:d?"":l.id})}>
            <span class="st-scopechip__top">
              ${!l.changeable&&n`<${J}/><span class="st-sr">Locked: </span>`}
              <span class="st-scopechip__label">${l.label}</span>
              <span class="st-scopechip__n">${i}<span class="st-sr"> ${i===1?"setting wins":"settings win"} here</span></span>
            </span>
            <span class="st-scopechip__file">${l.exists?p||l.note:"not present"}</span>
          </button>
        </li>`})}
    </ol>
    <p class="st-hint st-scopes__legend">Later layers override earlier ones. Locked layers cannot be changed from this machine.</p>
  </div>`}function ge({w:t,sections:s,scopes:e}){return n`<table class="st-table">
    <thead><tr>
      <th scope="col" class="st-c-set">Setting</th><th scope="col" class="st-c-val">Value</th>
      <th scope="col" class="st-c-scope">Scope</th><th scope="col" class="st-c-src">Set in</th>
      <th scope="col">What it does</th>
    </tr></thead>
    ${s.map(a=>{const l=a.shown.filter(o=>o.risky).length;return n`<tbody key=${a.id} data-section=${a.id}>
        <tr class="st-group"><th scope="colgroup" colspan="5">${a.title}
          <span class="st-group__meta">${a.shown.length}${l?n` · <span class="st-red">${l} risky</span>`:""}${a.hidden?n` · <span class="st-unsetn">+${a.hidden} unset</span>`:""}</span></th></tr>
        ${a.shown.map(o=>n`<${fe} key=${o.uid} row=${o} w=${t} scopes=${e}/>`)}
      </tbody>`})}
  </table>`}function ye(t){const s=[];for(const e of t){const a=e.id==="agents"&&e.shown.every(o=>o.kind==="agent"&&o.agent),l=s[s.length-1];a?s.push({agents:!0,sections:[e]}):l&&!l.agents?l.sections.push(e):s.push({agents:!1,sections:[e]})}return s}function _e({w:t,entry:s}){const e=s.sections.filter(o=>!t.st.sec||o.id===t.st.sec).map(o=>({...o,shown:o.rows.filter(t.passTool),hidden:t.showUnset?0:o.rows.filter(i=>i.unset&&t.passAll(i)&&(!t.st.scope||i.scope===t.st.scope)).length})).filter(o=>o.shown.length||o.hidden),a=s.rows.length,l=t.st.scope?T(t.st.scope,s.scopes):"";return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id=${s.id} big/>
      <h2 class="st-bar__title" id="st-main-title">${s.label}</h2>
      <span class="st-bar__sub">${a} ${a===1?"setting":"settings"} in ${s.files.length} ${s.files.length===1?"file":"files"}${s.risky?n` · <span class="st-red">${s.risky} risky</span>`:""}</span>
      <span class="st-bar__files">
        ${s.files.map(o=>n`<button type="button" key=${o} class="st-chip st-chip--mono st-chip--btn" title=${o}
          onClick=${()=>t.openAt(o)}>${he(o,s.files)}</button>`)}
      </span>
    </div>
    ${s.id==="vscode"&&n`<p class="st-note">chat.* settings, used by every AI tool in VS Code</p>`}
    ${s.hints.map((o,i)=>n`<p key=${i} class="st-note">${o}</p>`)}
    <${me} w=${t} entry=${s}/>
    ${e.length?ye(e).map((o,i)=>o.agents?n`<${de} key=${"a"+i} w=${t} section=${o.sections[0]}/>`:n`<${ge} key=${"g"+i} w=${t} sections=${o.sections} scopes=${s.scopes}/>`):n`<p class="st-empty">${a?l?`No setting shown here is set at the ${l} layer.`:"No setting matches the search or the toggles.":"No settings were read for this tool."}</p>`}
  </section>`}function ve({w:t,aictl:s}){const e=t.q.trim().toLowerCase(),a=s.collectors.filter(o=>!e||[o.name,o.mode,o.status,o.detail].join(" ").toLowerCase().includes(e)),l=s.roots.filter(o=>!e||o.toLowerCase().includes(e));return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <${F} id="aictl" big/>
      <h2 class="st-bar__title" id="st-main-title">aictl</h2>
      <span class="st-bar__sub">monitoring engine · ${s.collectors.length} collectors · ${s.roots.length} monitored roots</span>
    </div>
    ${a.length>0&&n`<table class="st-table">
      <thead><tr><th scope="col" class="st-c-set">Collector</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        <tr class="st-group"><th scope="colgroup" colspan="4">Collectors<span class="st-group__meta">${a.length}</span></th></tr>
        ${a.map(o=>n`<tr key=${o.name} class="st-row st-row--static">
          <td class="st-c-set st-mono">${o.name}</td>
          <td class="st-mono">${o.mode||"—"}</td>
          <td><span class=${"st-status "+(o.status==="active"?"is-ok":"is-warn")}>${o.status}</span></td>
          <td class="st-c-what" title=${o.detail||void 0}>${o.detail}</td>
        </tr>`)}
      </tbody>
    </table>`}
    ${l.length>0&&n`<h3 class="st-subhead">Monitored roots</h3>
      <ul class="st-roots">${l.map((o,i)=>n`<li key=${i} class="st-mono" title=${o}>${o}</li>`)}</ul>`}
    ${!a.length&&!l.length&&n`<p class="st-empty">Nothing matches the search.</p>`}
  </section>`}function Jt(t){if(t.st.sec&&ht.includes(t.st.sec))return t.st.sec;const s=e=>t.entries.some(a=>a.rows.some(l=>l.sec===e));return s("autonomy")?"autonomy":ht.find(s)||"autonomy"}function ke({w:t}){const s=Jt(t);return n`<nav class="st-nav" aria-label="Topics">
    <${C}>Topics</${C}>
    <ul class="st-nav__list">
      ${ht.map(e=>{const a=t.entries.filter(i=>i.rows.some(d=>d.sec===e&&t.pass(d))),l=a.some(i=>i.rows.some(d=>d.sec===e&&d.risky&&t.pass(d))),o=e===s;return n`<li key=${e}><button type="button" class=${"st-nav__item"+(o?" is-on":"")+(a.length?"":" is-empty")}
          aria-current=${o?"true":void 0} data-sec=${e}
          onClick=${()=>t.set({sec:e})}>
          <span class="st-nav__label">${mt[e]}</span>
          ${l&&n`<${K} label="A risky setting is on"/>`}
          <span class="st-nav__n">${a.length} ${a.length===1?"tool":"tools"}</span>
        </button></li>`})}
    </ul>
  </nav>`}function Se({w:t}){const[s,e]=y("tool"),a=t.entries.flatMap(d=>d.rows.filter(p=>p.sec==="agents"&&Pt(p))),l=a.filter(t.pass),o=new Set(l.map(d=>d.tool)).size,i=l.filter(lt).length;return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${mt.agents}</h2>
      <span class="st-bar__sub" data-testid="st-agents-count">${l.length} ${l.length===1?"agent":"agents"} in ${o} ${o===1?"tool":"tools"}, ${i} inherit the session model</span>
    </div>
    ${l.length?n`<${ue} w=${t} rows=${l} sort=${s} onSort=${e}/>
      <p class="st-hint">Click an agent for its model decision, its tools and the files that define it.</p>`:n`<p class="st-empty">${a.length?"No agent matches the search or the toggles.":"No tool reports agents."}</p>`}
  </section>`}function Ce({w:t}){const s=Jt(t);if(s==="agents")return n`<${Se} w=${t}/>`;const{tools:e,rows:a}=Is(t.entries,s,t.pass),l=a.reduce((o,i)=>o+Object.values(i.cells).filter(d=>d.risky).length,0);return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">${mt[s]}</h2>
      <span class="st-bar__sub">every tool, side by side${l?n` · <span class="st-red">${l} risky ${l===1?"value":"values"}</span>`:""}</span>
    </div>
    ${a.length?n`<div class="st-scroll"><table class="st-table st-matrix">
      <thead><tr>
        <th scope="col" class="st-c-set">Setting</th>
        ${e.map(o=>n`<th scope="col" key=${o.id} class="st-matrix__tool" data-tool=${o.id}>
          <span class="st-matrix__toolname"><${F} id=${o.id}/>${o.label}</span></th>`)}
      </tr></thead>
      <tbody>
        ${a.map(o=>n`<tr key=${o.id} class="st-row st-row--static">
          <th scope="row" class="st-c-set" title=${o.keys.join(`
`)}>${o.label}</th>
          ${e.map(i=>{var $;const d=o.cells[i.id];if(!d||d.unset&&!t.showUnset)return n`<td key=${i.id} class="st-cell st-cell--none">—</td>`;const p=(($=t.selected)==null?void 0:$.uid)===d.uid;return n`<td key=${i.id} class=${"st-cell"+(d.risky?" is-risky":"")+(d.unset?" is-unset":"")+(p?" is-sel":"")}>
              <button type="button" class="st-cellbtn" data-key=${d.key}
                aria-label=${`${o.label}, ${i.label}: ${Dt(d.value)}${d.unset?" (not set, default)":""}`}
                onClick=${()=>t.select({tool:i.id,row:d.key})}>
                <${nt} row=${d} compact/>
              </button>
            </td>`})}
        </tr>`)}
      </tbody>
    </table></div>
    <p class="st-hint">A cell is one setting in one tool. Click it for the file, the scope and the override chain.</p>`:n`<p class="st-empty">${e.length?"No setting matches the search or the toggles.":"No tool has settings in this section."}</p>`}
  </section>`}const Oe=8,Qt=86400,tt=8;function yt(t){const s=t.cell?t.cell.split(":"):null;return{loc:w(t.sec),tools:w(t.tool),purpose:w(t.purpose),scope:w(t.fscope),git:w(t.git),recent:!!t.recent,cell:s&&s.length===2?s:null}}function Ae(t,s,e,a){return!(e!=="loc"&&s.loc.length&&!s.loc.includes(t.location)||e!=="tools"&&s.tools.length&&!t.tools.some(l=>s.tools.includes(l))||e!=="purpose"&&s.purpose.length&&!s.purpose.includes(A(t))||e!=="scope"&&s.scope.length&&!s.scope.includes(t.scope)||e!=="git"&&s.git.length&&!s.git.includes(gt(t))||e!=="recent"&&s.recent&&!(t.mtime&&t.mtime>=a-Qt)||e!=="cell"&&s.cell&&(A(t)!==s.cell[0]||t.location!==s.cell[1]))}function at(t,s=null,e=Date.now()/1e3){const a=yt(t.st);return t.files.filter(l=>Ps(l,t.q)&&Ae(l,a,s,e))}function D(t,s,e){const a=w(t.st[s]);t.set({[s]:Us(a.includes(e)?a.filter(l=>l!==e):[...a,e]),row:""})}function W({w:t,title:s,fkey:e,skip:a,options:l,valueOf:o,attr:i,swatch:d}){const p=at(t,a),$=w(t.st[e]),r=l.map(c=>({...c,n:p.filter(u=>o(u).includes(c.id)).length})).filter(c=>c.n||$.includes(c.id)||c.always);return r.length?n`<${C}>${s}</${C}>
    <ul class="st-nav__list" aria-label=${s}>
      ${r.map(c=>{const u=$.includes(c.id);return n`<li key=${c.id}><button type="button" class=${"st-nav__item"+(u?" is-on":"")+(c.n?"":" is-empty")}
          aria-pressed=${u?"true":"false"} ...${{[i]:c.id}} onClick=${()=>D(t,e,c.id)}>
          ${d?n`<${F} id=${c.id}/>`:null}<span class="st-nav__label">${c.label}</span><span class="st-nav__n">${c.n}</span></button></li>`})}
    </ul>`:null}function Te({w:t}){const s=[...new Set(t.files.flatMap(l=>l.tools))],e=[...new Set(t.files.map(l=>l.scope).filter(Boolean))],a=at(t,"recent").filter(l=>l.mtime&&l.mtime>=Date.now()/1e3-Qt).length;return n`<nav class="st-nav" aria-label="File filters">
    <${W} w=${t} title="Locations" fkey="sec" skip="loc" attr="data-loc" options=${Ds.map(l=>({...l,always:!0}))} valueOf=${l=>[l.location]}/>
    <${W} w=${t} title="Purpose" fkey="purpose" skip="purpose" attr="data-purpose" options=${Rs} valueOf=${l=>[A(l)]}/>
    <${W} w=${t} title="Read by" fkey="tool" skip="tools" attr="data-tool" swatch=${!0}
      options=${s.map(l=>({id:l,label:t.labelOf(l)}))} valueOf=${l=>l.tools}/>
    <${W} w=${t} title="Scope" fkey="fscope" skip="scope" attr="data-scope"
      options=${e.map(l=>({id:l,label:jt[l]||l}))} valueOf=${l=>[l.scope]}/>
    <${W} w=${t} title="Git" fkey="git" skip="git" attr="data-git" options=${Mt} valueOf=${l=>[gt(l)]}/>
    <${C}>Changes</${C}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.recent?" is-on":"")} aria-pressed=${t.st.recent?"true":"false"}
        data-recent="1" onClick=${()=>t.set({recent:!t.st.recent,row:""})}>
        <span class="st-nav__label">Changed in the last 24 h</span><span class="st-nav__n">${a}</span></button></li>
    </ul>
  </nav>`}function Fe({w:t}){const s=yt(t.st),e=[...s.loc.map(a=>({k:"sec:"+a,label:"Location: "+(Lt[a]||a),drop:()=>D(t,"sec",a)})),...s.purpose.map(a=>({k:"purpose:"+a,label:"Purpose: "+(B[a]||a),drop:()=>D(t,"purpose",a)})),...s.tools.map(a=>({k:"tool:"+a,label:"Read by: "+t.labelOf(a),drop:()=>D(t,"tool",a)})),...s.scope.map(a=>({k:"fscope:"+a,label:"Scope: "+(jt[a]||a),drop:()=>D(t,"fscope",a)})),...s.git.map(a=>{var l;return{k:"git:"+a,label:"Git: "+(((l=Mt.find(o=>o.id===a))==null?void 0:l.label)||a),drop:()=>D(t,"git",a)}}),...s.recent?[{k:"recent",label:"Changed in the last 24 h",drop:()=>t.set({recent:!1,row:""})}]:[],...s.cell?[{k:"cell",label:(B[s.cell[0]]||s.cell[0])+" in "+(Lt[s.cell[1]]||s.cell[1]),drop:()=>t.set({cell:"",row:""})}]:[]];return e.length?n`<div class="st-fchips" data-testid="st-file-chips">
    ${e.map(a=>n`<button key=${a.k} type="button" class="st-chip st-chip--btn" data-chip=${a.k}
      aria-label=${"Remove the filter "+a.label} onClick=${a.drop}>${a.label} <span aria-hidden="true">×</span></button>`)}
    <button type="button" class="st-link" onClick=${()=>t.set({sec:"",tool:"",purpose:"",fscope:"",git:"",recent:!1,cell:"",row:""})}>Clear filters</button>
  </div>`:null}function Ne({w:t}){const s=Gs(at(t,"cell").filter(e=>!e.is_dir));return s.rows.length?n`<div class="st-scroll"><table class="st-table st-fmatrix" data-testid="st-file-matrix">
    <caption class="st-sr">Files by purpose and location</caption>
    <thead><tr><th scope="col">Purpose</th>${s.cols.map(e=>n`<th key=${e.id} scope="col" class="st-num">${e.label}</th>`)}<th scope="col" class="st-num">All</th></tr></thead>
    <tbody>${s.rows.map(e=>n`<tr key=${e.id}>
      <th scope="row">${e.label}</th>
      ${s.cols.map(a=>{const l=e.cells[a.id]||0,o=e.id+":"+a.id,i=t.st.cell===o;return n`<td key=${a.id} class=${"st-cell st-num"+(i?" is-sel":"")}>${l?n`<button type="button" class="st-cellbtn" data-cell=${o} aria-pressed=${i?"true":"false"}
              aria-label=${l+" "+e.label+" "+(l===1?"file":"files")+" in "+a.label}
              onClick=${()=>t.set({cell:i?"":o,row:""})}>${l}</button>`:n`<span class="st-dim" aria-hidden="true">·</span>`}</td>`})}
      <td class="st-num st-dim">${e.total}</td>
    </tr>`)}</tbody>
  </table></div>`:null}function Le({f:t,w:s}){const e=s.selectedFile&&s.selectedFile.path===t.path,a=()=>s.select({row:t.path}),l=Ws(t);return n`<tr class=${"st-row"+(e?" is-sel":"")+(t.exists===!1?" is-missing":"")}
    data-path=${t.path} tabindex="0" onClick=${a}
    onKeyDown=${o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),a())}}>
    <td class="st-c-file">
      ${t.is_dir?n`<span class="st-fname" title=${t.path}>${t.name}/</span>`:n`<button type="button" class="st-fname st-link" title=${"Open "+t.path}
            onClick=${o=>{o.stopPropagation(),s.openAt(t.path)}}>${t.name}</button>`}
      ${t.exists===!1&&n`<span class="st-hint"> missing</span>`}
    </td>
    <td><span class="st-chip" data-kind=${A(t)}>${t.is_dir?"Folder":B[A(t)]}</span></td>
    <td><${M} scope=${t.scope}/></td>
    <td><span class="st-tools">${t.tools.map(o=>n`<${I} key=${o} id=${o} label=${s.labelOf(o)}/>`)}</span></td>
    <td class="st-mono st-num">${t.settings?t.settings:"—"}</td>
    <td class="st-mono st-num">${!t.is_dir&&t.bytes!=null?ft(t.bytes):"—"}</td>
    <td class=${l?"st-warn":"st-dim"} data-git=${gt(t)||void 0}
      title=${l?"A tool always loads this file, and git does not track it":void 0}>${t.git_state||"—"}</td>
    <td class="st-dim">${t.mtime?et(t.mtime):"—"}</td>
  </tr>`}function xe(t){const s=yt(t.st);if(s.loc.length||s.purpose.length||s.scope.length||s.git.length||s.recent||s.cell)return[];const e=t.q.trim().toLowerCase();return(t.managedAbsent||[]).filter(a=>(!e||[a.path,a.label,a.note].join(`
`).toLowerCase().includes(e))&&(!s.tools.length||a.tools.some(l=>s.tools.includes(l))))}function Ee({w:t,items:s}){const[e,a]=y(!1);return n`<tbody class="st-absent" data-root="managed-absent">
    <tr class="st-group"><th scope="colgroup" colspan=${tt}>
      <button type="button" class="st-fold" aria-expanded=${e?"true":"false"} onClick=${()=>a(!e)}>
        <span aria-hidden="true">${e?"▾":"▸"}</span><span>Managed locations (not present)</span></button>
      <span class="st-group__meta">${s.length} ${s.length===1?"location":"locations"} · where a policy would come from</span>
    </th></tr>
    ${e&&s.map(l=>n`<tr key=${l.path} class="st-row st-row--static st-row--absent" data-path=${l.path}>
      <td class="st-c-file"><span class="st-fname" title=${l.path+(l.note?`
`+l.note:"")}>${V(l.path)}</span>
        <span class="st-hint"> not present</span></td>
      <td class="st-dim">—</td>
      <td><span class="st-scopewrap"><${J} label="Cannot be changed from this machine"/><${M} scope=${l.scope}/></span></td>
      <td><span class="st-tools">${l.tools.map(o=>n`<${I} key=${o} id=${o} label=${t.labelOf(o)}/>`)}</span></td>
      <td class="st-mono st-num">—</td><td class="st-mono st-num">—</td><td class="st-dim">—</td><td class="st-dim">—</td>
    </tr>`)}
  </tbody>`}function we(t,s){const e=t.filter(o=>!o.is_dir),a=t.filter(o=>o.is_dir),l=s==="purpose"?Ms(e).map(o=>({key:"purpose:"+o.id,attrs:{"data-purpose":o.id},title:o.label,mono:!1,root:null,files:o.files})):js(e).map(o=>({key:o.root,attrs:{"data-root":o.root},title:V(o.root),full:o.root,mono:!0,root:o.root,sub:Gt[o.location]||"Other",files:o.files}));return a.length&&l.push({key:"watched",attrs:{"data-root":"watched"},title:"Watched folders",mono:!1,root:null,flat:!0,sub:"folders the monitor reads",files:a}),l}function Ie({g:t,w:s,open:e,setOpen:a,shut:l,setShut:o}){const i=!!l[t.key],d=[...new Set(t.files.flatMap(r=>r.tools))],p=t.files.reduce((r,c)=>r+(c.is_dir?0:Number(c.bytes)||0),0),$=t.flat?[{dir:"",files:t.files}]:qs(t.files);return t.root&&$.sort((r,c)=>(c.dir===t.root)-(r.dir===t.root)),n`<tbody ...${t.attrs}>
    <tr class="st-group"><th scope="colgroup" colspan=${tt}>
      <button type="button" class="st-fold" aria-expanded=${i?"false":"true"}
        onClick=${()=>o({...l,[t.key]:!i})}>
        <span aria-hidden="true">${i?"▸":"▾"}</span>
        <span class=${t.mono?"st-mono":""} title=${t.full||void 0}>${t.title}</span></button>
      <span class="st-group__meta">${t.sub?t.sub+" · ":""}${t.files.length} ${t.files.length===1?"file":"files"}${p?" · "+ft(p):""}</span>
      ${d.length>0&&n`<span class="st-tools st-group__tools">${d.map(r=>n`<${I} key=${r} id=${r} label=${s.labelOf(r)}/>`)}</span>`}
    </th></tr>
    ${!i&&$.map(r=>{const c=t.key+"|"+r.dir,u=e[c]?r.files:r.files.slice(0,Oe),_=r.files.length-u.length;return n`<${Tt} key=${c}>
        ${r.dir&&r.dir!==t.root&&n`<tr class="st-folder" data-dir=${r.dir}><td colspan=${tt}>
          <span class="st-mono st-path" title=${r.dir}>${V(r.dir)}</span><span class="st-dim"> · ${r.files.length}</span></td></tr>`}
        ${u.map(g=>n`<${Le} key=${g.path} f=${g} w=${s}/>`)}
        ${_>0&&n`<tr class="st-morerow"><td colspan=${tt}>
          <button type="button" class="st-link st-more" onClick=${()=>a({...e,[c]:!0})}>▸ ${_} more</button>
        </td></tr>`}
      </${Tt}>`})}
  </tbody>`}const Re=[{value:"location",label:"By location"},{value:"purpose",label:"By purpose"}];function De({w:t}){const[s,e]=y({}),[a,l]=y({}),o=at(t),i=t.st.group==="purpose"?"purpose":"location",d=we(o,i),p=xe(t);return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Files aictl reads</h2>
      <span class="st-bar__sub">${o.length} ${o.length===1?"file":"files"} · grouped by ${i==="purpose"?"what they are for":"where they live"}</span>
      <div class="st-seg st-bar__end" role="group" aria-label="Group the files">
        ${Re.map($=>n`<button key=${$.value} type="button" class="st-seg__btn" aria-pressed=${i===$.value?"true":"false"}
          onClick=${()=>t.set({group:$.value})}>${$.label}</button>`)}
      </div>
    </div>
    ${t.filesStatus!=="ready"&&n`<p class="st-note" role="status">File details are loading</p>`}
    <${Ne} w=${t}/>
    <${Fe} w=${t}/>
    ${d.length||p.length?n`<div class="st-scroll"><table class="st-table st-files">
      <thead><tr>
        <th scope="col" class="st-c-file">File</th><th scope="col">Purpose</th><th scope="col">Scope</th><th scope="col">Read by</th>
        <th scope="col" class="st-num">Settings</th><th scope="col" class="st-num">Size</th><th scope="col">Git</th><th scope="col">Last change</th>
      </tr></thead>
      ${d.map($=>n`<${Ie} key=${$.key} g=${$} w=${t} open=${s} setOpen=${e} shut=${a} setShut=${l}/>`)}
      ${p.length>0&&n`<${Ee} w=${t} items=${p}/>`}
    </table></div>`:n`<p class="st-empty">${t.files.length?"No file matches the search or the filters.":"No settings files were found."}</p>`}
  </section>`}const Pe=5;function Yt(t,s){return t?V(t)+(s>0?":"+s:""):"—"}function Me({w:t}){const s=qt(t.findings.filter(e=>Ut(e,t.q)));return n`<nav class="st-nav" aria-label="Finding rules">
    <${C}>Finding rules</${C}>
    <ul class="st-nav__list">
      <li><button type="button" class=${"st-nav__item"+(t.st.sec?"":" is-on")} aria-current=${t.st.sec?void 0:"true"}
        onClick=${()=>t.set({sec:"",row:""})}>
        <span class="st-dotspace" aria-hidden="true"></span><span class="st-nav__label">All rules</span>
        <span class="st-nav__n">${s.reduce((e,a)=>e+a.count,0)}</span></button></li>
      ${s.map(e=>{const a=t.st.sec===e.rule;return n`<li key=${e.rule}><button type="button" class=${"st-nav__item"+(a?" is-on":"")}
          aria-current=${a?"true":void 0} data-rule=${e.rule}
          onClick=${()=>t.set({sec:a?"":e.rule,row:""})}>
          ${e.alarm?n`<${K} label=${e.severity+" severity"}/>`:n`<span class="st-dotspace" aria-hidden="true"></span>`}
          <span class="st-nav__label">${e.label}</span><span class="st-nav__n">${e.count}</span></button></li>`})}
    </ul>
  </nav>`}function je({f:t,group:s,w:e}){const a=e.selectedFinding&&e.selectedFinding.id===t.id,l=()=>e.select({row:t.id,sec:e.st.sec}),o=s.why&&t.why===s.why?t.action||"":t.why||t.action||"",i=Wt(t).map(e.labelOf).join(", ")||(t.session_id?"session "+t.session_id:"—");return n`<tr class=${"st-row"+(a?" is-sel":"")+(t.severity==="high"||t.severity==="medium"?" st-row--risky":"")}
    data-id=${t.id} tabindex="0" onClick=${l}
    onKeyDown=${d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),l())}}>
    <td class="st-c-tool">${i}</td>
    <td class="st-c-where st-mono" title=${t.path?t.path+(t.line>0?":"+t.line:""):void 0}>
      ${Yt(t.path,t.line)}${t.count>1?n` <span class="st-dim">×${t.count}</span>`:""}</td>
    <td class="st-c-what" title=${[t.why,t.action].filter(Boolean).join(`
`)||void 0}>${o}</td>
    <td class="st-c-act">${t.path&&n`<button type="button" class="st-chip st-chip--btn"
      onClick=${d=>{d.stopPropagation(),e.openAt(t.path,t.line)}}>Show the line</button>`}</td>
  </tr>`}function Ge({w:t}){var $,r;const[s,e]=y({});if(t.auditStatus==="loading"&&!t.audit){const c=t.scan;return n`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note" role="status" aria-busy="true" data-state="scanning">Scanning context sources…${c?" "+(c.step||"")+(c.elapsed_s!=null?", "+Math.round(c.elapsed_s)+" s":""):""}</p>
    </section>`}if(t.auditStatus==="error"&&!t.audit)return n`<section class="st-main" aria-labelledby="st-main-title">
      <div class="st-bar"><h2 class="st-bar__title" id="st-main-title">Findings</h2></div>
      <p class="st-note st-red" role="alert">The context audit failed: ${t.auditError}
        ${t.rescan&&n` <button type="button" class="st-btn" onClick=${()=>t.rescan()}>Retry</button>`}</p>
    </section>`;const a=t.findings.filter(c=>Ut(c,t.q)),l=qt(a).filter(c=>!t.st.sec||c.rule===t.st.sec),o=l.reduce((c,u)=>c+u.count,0),i=t.auditStatus==="loading",d=(($=t.audit)==null?void 0:$.incomplete)||[],p=((r=t.audit)==null?void 0:r.failed_steps)||[];return n`<section class="st-main" aria-labelledby="st-main-title">
    <div class="st-bar">
      <h2 class="st-bar__title" id="st-main-title">Findings</h2>
      <span class="st-bar__sub">${o} in ${l.length} ${l.length===1?"rule":"rules"} · hidden changes, conflicts and settings outside this project</span>
      ${t.rescan&&n`<button type="button" class="st-chip st-chip--btn st-bar__end" disabled=${i}
        onClick=${()=>t.rescan()}>${i?"Scanning…":"Rescan"}</button>`}
    </div>
    ${i&&n`<p class="st-note" role="status" data-state="rescanning">Scanning again…${t.scan?" "+(t.scan.step||"")+(t.scan.elapsed_s!=null?", "+Math.round(t.scan.elapsed_s)+" s":""):""} The last results stay until it ends.</p>`}
    ${t.auditStatus==="error"&&n`<p class="st-note st-red" role="alert">The last scan failed: ${t.auditError}. These are the earlier results.</p>`}
    ${d.length>0&&n`<p class="st-note st-warn">The scan reached its time limit and skipped: ${d.join(", ")}.</p>`}
    ${p.length>0&&n`<p class="st-note st-warn">The scan could not read: ${p.map(c=>c.step+" ("+c.error+")").join(", ")}.</p>`}
    ${l.length?n`<table class="st-table st-findings">
      <thead><tr>
        <th scope="col" class="st-c-tool">Tool</th><th scope="col" class="st-c-where">Where</th>
        <th scope="col">What it does</th><th scope="col" class="st-c-act"><span class="st-sr">Action</span></th>
      </tr></thead>
      ${l.map(c=>{const _=!!s[c.rule]?c.items:c.items.slice(0,Pe),g=c.items.length-_.length;return n`<tbody key=${c.rule} data-rule=${c.rule}>
          <tr class="st-group"><th scope="colgroup" colspan="4">
            ${c.alarm&&n`<${K} label=${c.severity+" severity"}/>`} ${c.label}
            <span class="st-group__meta">${c.count} · ${c.tools.map(t.labelOf).join(", ")||"no tool"}${c.why?" · "+c.why:""}</span>
          </th></tr>
          ${_.map(Q=>n`<${je} key=${Q.id} f=${Q} group=${c} w=${t}/>`)}
          ${g>0&&n`<tr class="st-morerow"><td colspan="4">
            <button type="button" class="st-link st-more" onClick=${()=>e({...s,[c.rule]:!0})}>▸ ${g} more</button>
          </td></tr>`}
        </tbody>`})}
    </table>`:n`<p class="st-empty">${t.findings.length?"No finding matches the search.":"No findings for the selected tools."}</p>`}
  </section>`}function b({title:t,children:s}){return n`<section class="st-insp__sec"><h4 class="st-insp__h">${t}</h4>${s}</section>`}function _t(t,s){return"Open "+P(t)+(s>0?" at line "+s:"")}function Xt(t,s){return s?t.findings.filter(e=>H(e.path,s)):[]}function Zt(t,s){t.set({view:"findings",sec:s.rule||"",row:s.id,tool:""})}function ts({w:t,path:s}){const e=s&&t.recentFiles&&typeof t.recentFiles.get=="function"?t.recentFiles.get(s):null,a=s?t.mtimeOf(s):null,l=[];return e?l.push(`File changed ${et(e.ts)}${e.tool?" by "+t.labelOf(e.tool):""} (file history)`):a&&l.push(`File last changed ${et(a)} (file history)`),n`<div class="st-hint" data-testid="st-history">${l.length?l.join(" · ")+" · no aictl change recorded":"No aictl change recorded"}</div>`}const qe="phase 2: diff preview, backup, change log";function ss(t,s){var a;const e=(a=t.chain)==null?void 0:a[t.wins];return t.locked||Bt(e,s)?"Locked by "+T(t.locked?t.scope:e.scope,s):qe}function Ue(t,s){const e=Vs(s);return`Not set in any file. Default: ${Dt(t.value)}.`+(e?` Set it in ${V(e.path)} (${e.label}).`:"")}function We({w:t,row:s}){if(Pt(s))return n`<${Be} w=${t} row=${s}/>`;const e=t.scopesOf(s.tool),a=t.entries.filter(p=>p.id!==s.tool&&s.source&&p.files.some($=>H($,s.source))).map(p=>p.label),l=s.source?t.files.find(p=>H(p.path,s.source)):null;for(const p of(l==null?void 0:l.tools)||[]){const $=t.labelOf(p);p!==s.tool&&!a.includes($)&&a.push($)}const o=Xt(t,s.source),{chain:i,wins:d}=s;return n`<div class="st-insp__body" data-testid="st-inspector-row">
    <h3 class="st-insp__title">${s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${s.tip&&n`<p class="st-insp__tip">${s.tip}</p>`}
    <div class="st-insp__chips">
      ${s.risky&&n`<span class="st-chip st-chip--risky">risky</span>`}
      <${I} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${M} scope=${s.scope} locked=${s.locked} label=${T(s.scope,e)}/>
      ${s.undocumented&&n`<${Ht}/>`}
      ${a.length>0&&n`<span class="st-chip">also read by ${a.join(", ")}</span>`}
    </div>
    <div class=${"st-insp__value"+(s.unset?" is-unset":"")}><${nt} row=${s}/></div>
    ${s.unset&&n`<p class="st-insp__tip" data-testid="st-unset-text">${Ue(s,e)}</p>`}
    <${b} title="Override chain · what wins and why">
      <ol class="st-chain">
        ${i.map((p,$)=>{const r=$===d,c=Bt(p,e);return n`<li key=${$} class=${"st-chain__lv"+(r?" is-win":"")+(c?" is-locked":"")} aria-current=${r?"true":void 0}>
            <span class="st-chain__sc">${c&&n`<${J} label=${"Locked: "+T(p.scope,e)+" cannot be changed here"}/>`}${p.scope||"default"}</span>
            <span class="st-chain__v">${Bs(p)?n`<span class="st-dim">not set</span>`:n`<${nt} row=${s} value=${p.value} compact/>`}</span>
            <span class="st-chain__src">${p.source?n`<${z} path=${p.source} line=${Number(p.line)>0?Number(p.line):0} w=${t}/>`:n`<span class="st-dim">${p.note||(p.scope==="default"?t.labelOf(s.tool):"—")}</span>`}</span>
            ${r&&n`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${Hs(i,d)}</p>
    </${b}>
    <${b} title="History"><${ts} w=${t} path=${s.source}/></${b}>
    <${b} title="Actions">
      <div class="st-actions">
        ${s.source&&n`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.source,s.line)}>${_t(s.source,s.line)}</button>`}
        ${o.length>0&&n`<button type="button" class="st-btn" onClick=${()=>Zt(t,o[0])}>Show finding</button>`}
      </div>
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change value…</button>
        <span class="st-hint" data-testid="st-change-hint">${ss(s,e)}</span>
      </div>
    </${b}>
  </div>`}function Be({w:t,row:s}){const e=s.agent,a=t.scopesOf(s.tool),{steps:l,wins:o,why:i}=zs(s),d=r=>Number(r)>0?Number(r):0,p=[{label:"Defined in",path:e.defined_in,line:d(e.defined_line),scope:e.scope_defined},{label:"Pinned in",path:e.pinned_in,line:d(e.pinned_line),scope:e.scope_pinned}],$=ss(s,a);return n`<div class="st-insp__body" data-testid="st-inspector-agent">
    <h3 class="st-insp__title">${e.name||s.label}</h3>
    <div class="st-insp__key st-mono">${s.key}</div>
    ${e.description&&n`<p class="st-insp__tip">${e.description}</p>`}
    <div class="st-insp__chips">
      <${I} id=${s.tool} label=${t.labelOf(s.tool)}/>
      <${M} scope=${s.scope} locked=${s.locked} label=${T(s.scope,a)}/>
    </div>
    <div class="st-insp__value"><${Kt} row=${s} w=${t}/></div>
    <${b} title="Model · what decides it">
      <ol class="st-chain">
        ${l.map((r,c)=>{const u=c===o;return n`<li key=${r.id} class=${"st-chain__lv"+(u?" is-win":"")} aria-current=${u?"true":void 0}>
            <span class="st-chain__sc">${r.label}</span>
            <span class="st-chain__v">${r.value===void 0||r.value===null||r.value===""?n`<span class="st-dim">${r.id==="pin"&&r.present?"set":"not set"}</span>`:r.value==="inherits"?n`<span class="st-inherit">inherits</span>`:n`<span class="st-v">${String(r.value)}</span>`}</span>
            <span class="st-chain__src">${r.source?n`<${z} path=${r.source} line=${r.line} w=${t}/>`:n`<span class="st-dim">${r.id==="effective"?o===2?"session model":"":"—"}</span>`}</span>
            ${u&&n`<span class="st-sr"> (wins)</span>`}
          </li>`})}
      </ol>
      <p class="st-hint st-insp__why">${i}</p>
    </${b}>
    <${b} title="Agent">
      <dl class="st-insp__dl">
        <dt>Effort</dt><dd>${e.effort||"—"}</dd>
        <dt>Context</dt><dd>${e.context_tier||"—"}</dd>
        <dt>Target</dt><dd>${e.target||"—"}</dd>
        <dt>Model policy</dt><dd>${e.model_policy||"—"}</dd>
      </dl>
    </${b}>
    <${b} title=${"Tools"+(e.tools.length?" · "+e.tools.length:"")}><${zt} tools=${e.tools} all/></${b}>
    <${b} title="Files">
      <dl class="st-insp__dl st-insp__files">
        ${p.map(r=>n`<dt key=${r.label+"t"}>${r.label}</dt><dd key=${r.label+"d"}>
          ${r.path?n`<span class="st-mono" title=${r.path+(r.line?":"+r.line:"")}>${P(r.path)}${r.line?":"+r.line:""}</span>
            ${r.scope&&n` <span class="st-dim">· ${T(r.scope,a)}</span>`}
            <button type="button" class="st-link" onClick=${()=>t.openAt(r.path,r.line)}
              aria-label=${_t(r.path,r.line)}>Open</button>`:n`<span class="st-dim">—</span>`}
        </dd>`)}
      </dl>
    </${b}>
    <${b} title="History"><${ts} w=${t} path=${e.defined_in||s.source}/></${b}>
    <${b} title="Actions">
      <div class="st-actions">
        <button type="button" class="st-btn st-btn--primary" disabled>Change model…</button>
        <span class="st-hint" data-testid="st-change-hint">${$}</span>
      </div>
    </${b}>
  </div>`}function He({w:t,file:s}){const e=Xt(t,s.path),a=s.rows||[];return n`<div class="st-insp__body" data-testid="st-inspector-file">
    <h3 class="st-insp__title">${s.name}</h3>
    <div class="st-insp__key st-mono">${s.path}</div>
    <div class="st-insp__chips">
      <span class="st-chip">${s.is_dir?"Watched folder":B[A(s)]}</span>
      <${M} scope=${s.scope}/>
      <span class="st-chip">${Gt[s.location]||"Other"}</span>
      ${s.tools.map(l=>n`<${I} key=${l} id=${l} label=${t.labelOf(l)}/>`)}
    </div>
    <${b} title=${"Settings from this file"+(a.length?" · "+a.length:"")}>
      ${a.length?n`<ul class="st-insp__list">
        ${a.map(l=>n`<li key=${l.uid}><button type="button" class="st-link"
          onClick=${()=>t.set({view:"tool",tool:l.tool,sec:"",row:l.key})}>${l.label}</button>
          <span class="st-dim"> · ${t.labelOf(l.tool)}${l.line>0?" · line "+l.line:""}</span></li>`)}
      </ul>`:n`<div class="st-hint">${s.settings?s.settings+" settings":"No settings are read from this file."}</div>`}
    </${b}>
    <${b} title="File">
      <dl class="st-insp__dl">
        <dt>Path</dt><dd class="st-insp__path">${s.path}</dd>
        <dt>Purpose</dt><dd>${s.is_dir?"Watched folder":B[A(s)]}${s.kind&&s.kind!==A(s)?" ("+s.kind+")":""}</dd>
        <dt>Scope</dt><dd>${s.scope||"—"}</dd>
        <dt>Git</dt><dd>${s.git_state||"—"}</dd>
        <dt>Size</dt><dd>${s.bytes!=null&&!s.is_dir?ft(s.bytes):"—"}</dd>
        <dt>Last change</dt><dd>${s.mtime?et(s.mtime):"—"}</dd>
        ${s.mtime?n`<dt>Modified</dt><dd>${new Date(s.mtime*1e3).toLocaleString()}</dd>`:null}
        ${s.loading&&n`<dt>Loading</dt><dd>${s.loading}</dd>`}
        ${s.exists===!1&&n`<dt>State</dt><dd>missing</dd>`}
      </dl>
    </${b}>
    <${b} title="Actions">
      <div class="st-actions">
        ${!s.is_dir&&n`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path)}>Open file</button>`}
        ${e.length>0&&n`<button type="button" class="st-btn" onClick=${()=>Zt(t,e[0])}>Show finding</button>`}
      </div>
    </${b}>
  </div>`}function Ke({w:t,f:s}){return n`<div class="st-insp__body" data-testid="st-inspector-finding">
    <h3 class="st-insp__title">${Ks(s.rule)}</h3>
    <div class="st-insp__key st-mono">${Yt(s.path,s.line)}</div>
    <div class="st-insp__chips">
      <span class=${"st-chip"+(s.severity==="high"||s.severity==="medium"?" st-chip--risky":"")}>${s.severity||"info"}</span>
      ${Wt(s).map(e=>n`<${I} key=${e} id=${e} label=${t.labelOf(e)}/>`)}
      ${s.session_id&&n`<span class="st-chip st-chip--mono">session ${s.session_id}</span>`}
    </div>
    ${s.why&&n`<${b} title="Why it matters"><p class="st-insp__tip">${s.why}</p></${b}>`}
    ${s.action&&n`<${b} title="What to do"><p class="st-insp__tip">${s.action}</p></${b}>`}
    <${b} title="Actions">
      <div class="st-actions">
        ${s.path&&n`<button type="button" class="st-btn" onClick=${()=>t.openAt(s.path,s.line)}>${s.line>0?_t(s.path,s.line):"Show the line"}</button>`}
      </div>
    </${b}>
  </div>`}function ze({w:t}){const{view:s}=t.st;let e=null;return(s==="tool"||s==="topic")&&t.selected?e=n`<${We} w=${t} row=${t.selected}/>`:s==="files"&&t.selectedFile?e=n`<${He} w=${t} file=${t.selectedFile}/>`:s==="findings"&&t.selectedFinding&&(e=n`<${Ke} w=${t} f=${t.selectedFinding}/>`),n`<aside class=${"st-insp"+(t.drawer?" is-open":"")} aria-label="Inspector">
    <button type="button" class="st-insp__close st-btn" onClick=${t.closeDrawer} aria-label="Close the inspector">Close</button>
    ${e||n`<div class="st-insp__body st-insp__body--empty">
      <h3 class="st-insp__title">Nothing selected</h3>
      <p class="st-hint">${s==="files"?"Click a file for its details.":s==="findings"?"Click a finding for its details.":"Click a setting to see where it is set, what wins and why, and what you can do with it."}</p>
    </div>`}
  </aside>`}const Ve=[{value:"tool",label:"By tool"},{value:"topic",label:"By topic"},{value:"files",label:"Files"},{value:"findings",label:"Findings"}],It=new Set(["tool","topic"]);function Rt(){return typeof window<"u"?window.location.search:""}function Je(){const[t,s]=y(()=>Et(Rt())),e=O(a=>s(l=>{const o={...l,...a};if(a.view&&a.view!==l.view&&!(It.has(l.view)&&It.has(a.view)))for(const i of["tool","sec","row"])i in a||(o[i]="");if(a.view&&a.view!==l.view&&!("scope"in a)&&(o.scope=""),a.view&&a.view!==l.view)for(const i of le)i in a||(o[i]=i==="recent"?!1:"");return o}),[]);return st(()=>{Ft(ae(t))},[t]),st(()=>{const a=()=>s(Et(Rt()));return window.addEventListener("popstate",a),()=>{window.removeEventListener("popstate",a),Ft(oe)}},[]),[t,e]}function Qe(){const[t,s]=y({status:"loading",files:null});return st(()=>{let e=!0;return Os().then(a=>{e&&s(Array.isArray(a==null?void 0:a.files)?{status:"ready",files:a.files}:{status:"unavailable",files:null})},()=>{e&&s({status:"unavailable",files:null})}),()=>{e=!1}},[]),t}function Ye(t){const s=t||{},e=s.audit||null;return{status:s.loading?"loading":s.error?"error":e||s.loading===!1?"ready":"loading",audit:e,scan:s.scan||null,error:s.error?String(s.error):null}}function en({source:t={},note:s=""}){var At;const{toolConfigs:e,tools:a,monitor:l,root:o,enabledTools:i=null,recentFiles:d,toolName:p,openFile:$,findings:r}=t,c=S(()=>Ys({toolConfigs:e,tools:a,monitor:l,root:o,enabledTools:i}),[e,a,l,o,i]),[u,_]=Je(),[g,Q]=y(""),[N,es]=y(!1),[L,ns]=y(!1),[ls,ot]=y(!1),vt=ks(null),it=Qe(),x=Ye(r),as=r==null?void 0:r.rescan;st(()=>{const h=f=>{var v;f.key==="/"&&!As(f.target)&&!f.metaKey&&!f.ctrlKey&&!f.altKey?(f.preventDefault(),(v=vt.current)==null||v.focus()):f.key==="Escape"&&ot(!1)};return window.addEventListener("keydown",h),()=>window.removeEventListener("keydown",h)},[]);const m=S(()=>Xs(c),[c]),R=S(()=>Zs(c),[c]),kt=S(()=>te(c),[c]),ct=S(()=>xt({q:g,nonDefault:N,risky:L,unset:u.unset}),[g,N,L,u.unset]),os=S(()=>xt({q:g,nonDefault:N,risky:L,unset:!0}),[g,N,L]),is=O(h=>ct(h)&&(!u.scope||h.scope===u.scope),[ct,u.scope]),cs=S(()=>se(m),[m]),j=S(()=>Js(it.files,m,kt,i),[it.files,m,kt,i]),G=S(()=>Cs(x.audit,i),[x.audit,i]),rt=S(()=>ee((G==null?void 0:G.findings)||[]),[G]),rs=O((h,f=0)=>{!h||!$||$(h,f>0?f:0)},[$]),ps=O(h=>{_(h),ot(!0)},[_]),ds=O(()=>ot(!1),[]),$s=O(h=>{const f=ne(h,c);return f===h&&p?p(h):f},[c,p]),us=O(h=>{var f;return((f=m.find(v=>v.id===h))==null?void 0:f.scopes)||[]},[m]),hs=O(h=>{const f=j.find(v=>H(v.path,h));if(f!=null&&f.mtime)return f.mtime;for(const v of(c==null?void 0:c.tools)||[])for(const E of v.files||[])if(H(E.path,h)&&E.mtime)return E.mtime;return null},[j,c]);if(!c)return n`<p class="loading-state">Loading...</p>`;if(!m.length&&!R&&!Nt(i))return n`<p class="empty-state">No tool configuration detected. Are AI tools installed?</p>`;const pt=m.some(h=>h.id===u.tool)||u.tool==="aictl"&&R?u.tool:((At=m[0])==null?void 0:At.id)||(R?"aictl":""),Y=m.find(h=>h.id===pt)||null,St=(h,f)=>{var v;return f&&((v=m.find(E=>E.id===h))==null?void 0:v.rows.find(E=>E.key===f))||null},bs=u.view==="tool"?Y?St(Y.id,u.row):null:u.view==="topic"?St(u.tool,u.row):null,fs=u.view==="files"&&u.row&&j.find(h=>h.path===u.row)||null,ms=u.view==="findings"&&u.row&&rt.find(h=>h.id===u.row)||null,k={st:u,set:_,select:ps,q:g,pass:ct,passAll:os,passTool:is,showUnset:u.unset,scopesOf:us,managedAbsent:cs,entries:m,aictl:R,toolId:pt,files:j,filesStatus:it.status,findings:rt,audit:G,auditStatus:x.status,auditError:x.error,scan:x.scan,rescan:as,selected:bs,selectedFile:fs,selectedFinding:ms,openAt:rs,labelOf:$s,mtimeOf:hs,recentFiles:d,drawer:ls,closeDrawer:ds},{set:gs,agents:ys,knowsSet:Ct,unset:_s,risky:Ot}=Qs(m),vs=Nt(i)&&!m.some(h=>h.id!=="vscode");let q,U;return u.view==="topic"?(q=n`<${ke} w=${k}/>`,U=n`<${Ce} w=${k}/>`):u.view==="files"?(q=n`<${Te} w=${k}/>`,U=n`<${De} w=${k}/>`):u.view==="findings"?(q=n`<${Me} w=${k}/>`,U=n`<${Ge} w=${k}/>`):(q=n`<${be} w=${k}/>`,U=Y?n`<${_e} w=${k} entry=${Y}/>`:pt==="aictl"&&R?n`<${ve} w=${k} aictl=${R}/>`:n`<section class="st-main"><p class="st-empty">No tool settings to show.</p></section>`),n`<div class="st-ws" data-view=${u.view}>
    <div class="st-head">
      <${Ts} class="st-pivot" options=${Ve} value=${u.view} ariaLabel="Settings view"
        onChange=${h=>_({view:h})}/>
      <label class="st-searchbox">
        <${$t} name="search" size="14"/>
        <input ref=${vt} type="search" class="st-search" value=${g}
          placeholder="Find a setting, value, key or file…" aria-label="Find a setting, value, key or file"
          onInput=${h=>Q(h.currentTarget.value)}/>
        <kbd class="st-kbd" aria-hidden="true">/</kbd>
      </label>
      <button type="button" class=${"st-toggle"+(N?" is-on":"")} aria-pressed=${N?"true":"false"}
        onClick=${()=>es(!N)}>Only non-default</button>
      <button type="button" class=${"st-toggle st-toggle--risky"+(L?" is-on":"")} aria-pressed=${L?"true":"false"}
        onClick=${()=>ns(!L)}>Only risky</button>
      ${Ct&&n`<button type="button" class=${"st-toggle"+(u.unset?" is-on":"")} aria-pressed=${u.unset?"true":"false"}
        onClick=${()=>_({unset:!u.unset})}>Show unset knobs</button>`}
      <div class="st-kpis" data-testid="st-kpis">
        <span><b>${m.length}</b> tools</span>
        <span><b>${j.length}</b> files</span>
        <span><b>${gs}</b> settings</span>
        <span data-kpi="agents"><b>${ys}</b> agents</span>
        ${Ct&&n`<span data-kpi="unset"><b>${_s}</b> unset</span>`}
        <span class=${Ot?"st-red":""}><b>${Ot}</b> risky</span>
        <span><b>${x.status==="loading"&&!x.audit?"…":rt.length}</b> findings</span>
      </div>
    </div>
    ${s&&n`<p class="st-wsnote" data-testid="st-wsnote">${s}</p>`}
    ${vs&&n`<div class="st-scope-empty"><${Fs} enabledTools=${i} snap=${c} what="the settings"/></div>`}
    <div class="st-grid">
      <div class="st-col st-col--nav">${q}</div>
      <div class="st-col st-col--main">${U}</div>
      <${ze} w=${k}/>
    </div>
  </div>`}export{Ye as auditState,en as default};
