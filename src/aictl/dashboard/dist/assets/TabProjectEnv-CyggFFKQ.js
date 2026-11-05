import{x as h,T as m,m as o}from"./index-dIry8dud.js";import{S as x}from"./app-B2MyVrfP.js";import{q as y,ak as $,v as g,B as O}from"./useSse-BQ6ZdC23.js";const A=[{pattern:/ANTHROPIC_API_KEY/i,tool:"Claude / Claude Code",vendor:"anthropic"},{pattern:/OPENAI_API_KEY/i,tool:"OpenAI / Codex",vendor:"openai"},{pattern:/GITHUB_TOKEN|COPILOT/i,tool:"GitHub Copilot",vendor:"github"},{pattern:/GEMINI_API_KEY|GOOGLE_API/i,tool:"Gemini",vendor:"google"},{pattern:/AZURE_OPENAI|AZURE_AI/i,tool:"Azure OpenAI",vendor:"microsoft"},{pattern:/HUGGINGFACE_TOKEN|HF_TOKEN/i,tool:"HuggingFace",vendor:"community"},{pattern:/OLLAMA/i,tool:"Ollama",vendor:"community"}],f=Object.keys($).length?$:{anthropic:"#a78bfa",openai:"#10b981",github:"#60a5fa",google:"#34d399",microsoft:"#60a5fa",community:"#94a3b8"},E={credentials:"Credentials & Keys",config:"Configuration",runtime:"Runtime State",database:"Databases"};function w({f:a}){const i=(a.path||"").replace(/\\/g,"/").split("/").pop(),n=(a.path||"").replace(/\\/g,"/").split("/").slice(0,-1).join("/");return o`<div style="display:flex;align-items:baseline;gap:var(--sp-4);padding:var(--sp-2) var(--sp-4);border-bottom:1px solid var(--bg2)">
    <span class="mono" style="font-size:var(--fs-sm);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${a.path}>${g(i)}</span>
    <span class="text-muted mono" style="font-size:var(--fs-xs);flex:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g(n)}</span>
    ${a.size>0&&o`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${y(a.size)}</span>`}
    ${a.mtime>0&&o`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${O(a.mtime)}</span>`}
  </div>`}function N({snap:a=null}={}){const i=h(x),n=a??(i==null?void 0:i.snap),c=m(()=>{var t;return(t=n==null?void 0:n.tools)==null?void 0:t.find(e=>e.tool==="project-env")},[n]),p=(c==null?void 0:c.files)??[],l=m(()=>{const t={};for(const e of p){const s=e.kind||e.category||"config";(t[s]=t[s]||[]).push(e)}return t},[p]),u=m(()=>{const t=new Set,e=[...l.credentials||[],...l.database||[]];for(const s of e){const d=(s.path||"").toUpperCase();for(const r of A)r.pattern.test(d)&&t.add(r)}return[...t]},[l]);if(!n)return o`<p class="loading-state">Loading...</p>`;const v=p.length,b=p.reduce((t,e)=>t+(e.size||0),0);return o`<div>
    <div class="diag-card" style="margin-bottom:var(--sp-5)">
      <h3>Project Environment
        <span class="badge">${v} file${v!==1?"s":""}</span>
        ${b>0&&o`<span class="badge">${y(b)}</span>`}
      </h3>

      ${v===0&&o`<p class="empty-state">No project environment files found in this directory.</p>`}

      ${u.length>0&&o`<div style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">Configured AI Providers</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3);margin-top:var(--sp-2)">
          ${u.map(t=>o`<span key=${t.tool}
            style="padding:var(--sp-2) var(--sp-4);border-radius:4px;font-size:var(--fs-sm);
                   background:color-mix(in srgb,${f[t.vendor]||"var(--fg2)"} 15%,transparent);
                   border:1px solid color-mix(in srgb,${f[t.vendor]||"var(--fg2)"} 40%,transparent);
                   color:${f[t.vendor]||"var(--fg)"}">
            ✓ ${g(t.tool)}
          </span>`)}
        </div>
      </div>`}

      ${Object.entries(l).sort(([t],[e])=>{const s=["credentials","config","runtime","database"],d=s.indexOf(t),r=s.indexOf(e);return(d<0?99:d)-(r<0?99:r)}).map(([t,e])=>o`<div key=${t} style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">${E[t]||t}
          <span class="badge" style="margin-left:var(--sp-3)">${e.length}</span>
        </div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden;margin-top:var(--sp-2)">
          ${e.map(s=>o`<${w} key=${s.path} f=${s}/>`)}
        </div>
      </div>`)}
    </div>
  </div>`}export{N as default};
