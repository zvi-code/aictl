import{x as y,S as x,T as f,m as s,a as h,v as $,e as g,h as O}from"./index-Br-2tUvY.js";const A=[{pattern:/ANTHROPIC_API_KEY/i,tool:"Claude / Claude Code",vendor:"anthropic"},{pattern:/OPENAI_API_KEY/i,tool:"OpenAI / Codex",vendor:"openai"},{pattern:/GITHUB_TOKEN|COPILOT/i,tool:"GitHub Copilot",vendor:"github"},{pattern:/GEMINI_API_KEY|GOOGLE_API/i,tool:"Gemini",vendor:"google"},{pattern:/AZURE_OPENAI|AZURE_AI/i,tool:"Azure OpenAI",vendor:"microsoft"},{pattern:/HUGGINGFACE_TOKEN|HF_TOKEN/i,tool:"HuggingFace",vendor:"community"},{pattern:/OLLAMA/i,tool:"Ollama",vendor:"community"}],m=Object.keys($).length?$:{anthropic:"#a78bfa",openai:"#10b981",github:"#60a5fa",google:"#34d399",microsoft:"#60a5fa",community:"#94a3b8"},E={credentials:"Credentials & Keys",config:"Configuration",runtime:"Runtime State",database:"Databases"};function w({f:a}){const i=(a.path||"").replace(/\\/g,"/").split("/").pop(),n=(a.path||"").replace(/\\/g,"/").split("/").slice(0,-1).join("/");return s`<div style="display:flex;align-items:baseline;gap:var(--sp-4);padding:var(--sp-2) var(--sp-4);border-bottom:1px solid var(--bg2)">
    <span class="mono" style="font-size:var(--fs-sm);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${a.path}>${g(i)}</span>
    <span class="text-muted mono" style="font-size:var(--fs-xs);flex:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g(n)}</span>
    ${a.size>0&&s`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${h(a.size)}</span>`}
    ${a.mtime>0&&s`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${O(a.mtime)}</span>`}
  </div>`}function I({snap:a=null}={}){const i=y(x),n=a??(i==null?void 0:i.snap),c=f(()=>{var e;return(e=n==null?void 0:n.tools)==null?void 0:e.find(t=>t.tool==="project-env")},[n]),p=(c==null?void 0:c.files)??[],l=f(()=>{const e={};for(const t of p){const o=t.kind||t.category||"config";(e[o]=e[o]||[]).push(t)}return e},[p]),u=f(()=>{const e=new Set,t=[...l.credentials||[],...l.database||[]];for(const o of t){const d=(o.path||"").toUpperCase();for(const r of A)r.pattern.test(d)&&e.add(r)}return[...e]},[l]);if(!n)return s`<p class="loading-state">Loading...</p>`;const v=p.length,b=p.reduce((e,t)=>e+(t.size||0),0);return s`<div>
    <div class="diag-card" style="margin-bottom:var(--sp-5)">
      <h3>Project Environment
        <span class="badge">${v} file${v!==1?"s":""}</span>
        ${b>0&&s`<span class="badge">${h(b)}</span>`}
      </h3>

      ${v===0&&s`<p class="empty-state">No project environment files found in this directory.</p>`}

      ${u.length>0&&s`<div style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">Configured AI Providers</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3);margin-top:var(--sp-2)">
          ${u.map(e=>s`<span key=${e.tool}
            style="padding:var(--sp-2) var(--sp-4);border-radius:4px;font-size:var(--fs-sm);
                   background:color-mix(in srgb,${m[e.vendor]||"var(--fg2)"} 15%,transparent);
                   border:1px solid color-mix(in srgb,${m[e.vendor]||"var(--fg2)"} 40%,transparent);
                   color:${m[e.vendor]||"var(--fg)"}">
            ✓ ${g(e.tool)}
          </span>`)}
        </div>
      </div>`}

      ${Object.entries(l).sort(([e],[t])=>{const o=["credentials","config","runtime","database"],d=o.indexOf(e),r=o.indexOf(t);return(d<0?99:d)-(r<0?99:r)}).map(([e,t])=>s`<div key=${e} style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">${E[e]||e}
          <span class="badge" style="margin-left:var(--sp-3)">${t.length}</span>
        </div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden;margin-top:var(--sp-2)">
          ${t.map(o=>s`<${w} key=${o.path} f=${o}/>`)}
        </div>
      </div>`)}
    </div>
  </div>`}export{I as default};
