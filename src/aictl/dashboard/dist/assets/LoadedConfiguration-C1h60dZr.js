import{l as e,n as t}from"./hooks.module-tDeaYiaE.js";import{mt as n}from"./index-Dh5zLRcX.js";function r({records:t=[]}){return e`<p>These are observed launch flags and native runtime reports, not the current file configuration. Launch flags describe the original arguments; they do not prove the currently applied value after runtime changes. Unreported current values remain unknown.</p>
    ${t.length?e`<ul>${t.map(t=>e`<li key=${t.id}>
      <b>${t.tool||`Agent`}${t.session_id?` · `+t.session_id:``}</b>
      ${t.effective_known&&t.evidence?.length?e`<ul>${t.evidence.map(t=>e`<li key=${t.key}>
        ${t.key}: ${[`string`,`number`,`boolean`].includes(typeof t.value)?String(t.value):`unknown`} · ${t.source||`source not reported`}
        · ${Number.isFinite(t.observed_at)?`Observed `+new Date(t.observed_at*1e3).toLocaleString():`Observation time not reported`}
      </li>`)}</ul>`:e`<span> · No effective value reported.</span>`}
      ${t.unknown?.length?e`<p>Unknown: ${t.unknown.join(`, `)}.</p>`:null}
    </li>`)}</ul>`:e`<p>No effective runtime settings have been reported.</p>`}`}function i({sessionId:i}){let{state:a}=n(),o=a.topics?.get(`configuration.loaded`),s=t(()=>[...o?.values()||[]].filter(e=>e.data?.session_id===i||e.data?.native_session_id===i).map(e=>({id:e.id,...e.data})),[o,i]);if(a.mode!==`incremental`)return null;let c=s.some(e=>e.effective_known);return e`<details class="bd-panel bd-ag-top" aria-label="Effective runtime settings">
    <summary class="bd-ph"><h3>Effective runtime settings</h3><span class="bd-psub">${c?`Runtime evidence`:`Unknown until the runtime reports evidence`}</span></summary>
    <div class="bd-pb"><${r} records=${s}/></div>
  </details>`}export{i as n,r as t};