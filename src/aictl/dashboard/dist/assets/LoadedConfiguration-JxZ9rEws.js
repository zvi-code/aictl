import{u as p,T as d,m as t}from"./index-DPLzoYP_.js";function f({records:s=[]}){return t`<p>These are observed launch flags and native runtime reports, not the current file configuration. Launch flags describe the original arguments; they do not prove the currently applied value after runtime changes. Unreported current values remain unknown.</p>
    ${s.length?t`<ul>${s.map(e=>{var a,o;return t`<li key=${e.id}>
      <b>${e.tool||"Agent"}${e.session_id?" · "+e.session_id:""}</b>
      ${e.effective_known&&((a=e.evidence)!=null&&a.length)?t`<ul>${e.evidence.map(n=>t`<li key=${n.key}>
        ${n.key}: ${["string","number","boolean"].includes(typeof n.value)?String(n.value):"unknown"} · ${n.source||"source not reported"}
        · ${Number.isFinite(n.observed_at)?"Observed "+new Date(n.observed_at*1e3).toLocaleString():"Observation time not reported"}
      </li>`)}</ul>`:t`<span> · No effective value reported.</span>`}
      ${(o=e.unknown)!=null&&o.length?t`<p>Unknown: ${e.unknown.join(", ")}.</p>`:null}
    </li>`})}</ul>`:t`<p>No effective runtime settings have been reported.</p>`}`}function v({sessionId:s}){var r;const{state:e}=p(),a=(r=e.topics)==null?void 0:r.get("configuration.loaded"),o=d(()=>[...(a==null?void 0:a.values())||[]].filter(i=>{var u,l;return((u=i.data)==null?void 0:u.session_id)===s||((l=i.data)==null?void 0:l.native_session_id)===s}).map(i=>({id:i.id,...i.data})),[a,s]);if(e.mode!=="incremental")return null;const n=o.some(i=>i.effective_known);return t`<details class="bd-panel bd-ag-top" aria-label="Effective runtime settings">
    <summary class="bd-ph"><h3>Effective runtime settings</h3><span class="bd-psub">${n?"Runtime evidence":"Unknown until the runtime reports evidence"}</span></summary>
    <div class="bd-pb"><${f} records=${o}/></div>
  </details>`}export{f as C,v as L};
