import { useContext, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import { fmtSz, fmtAgo, esc, VENDOR_COLORS as _VENDOR_COLORS } from '../utils.js';

// Keys that signal a specific AI tool is configured
const KEY_SIGNALS = [
  { pattern: /ANTHROPIC_API_KEY/i,       tool: 'Claude / Claude Code',  vendor: 'anthropic' },
  { pattern: /OPENAI_API_KEY/i,          tool: 'OpenAI / Codex',        vendor: 'openai'    },
  { pattern: /GITHUB_TOKEN|COPILOT/i,    tool: 'GitHub Copilot',        vendor: 'github'    },
  { pattern: /GEMINI_API_KEY|GOOGLE_API/i, tool: 'Gemini',              vendor: 'google'    },
  { pattern: /AZURE_OPENAI|AZURE_AI/i,   tool: 'Azure OpenAI',          vendor: 'microsoft' },
  { pattern: /HUGGINGFACE_TOKEN|HF_TOKEN/i, tool: 'HuggingFace',        vendor: 'community' },
  { pattern: /OLLAMA/i,                  tool: 'Ollama',                vendor: 'community' },
];

// Fallbacks for vendors not yet in window.VENDOR_COLORS (server-injected)
const VENDOR_COLORS = Object.keys(_VENDOR_COLORS).length ? _VENDOR_COLORS : {
  anthropic: '#a78bfa', openai: '#10b981', github: '#60a5fa',
  google: '#34d399',    microsoft: '#60a5fa', community: '#94a3b8',
};

const CATEGORY_LABELS = {
  credentials: 'Credentials & Keys',
  config:      'Configuration',
  runtime:     'Runtime State',
  database:    'Databases',
};

function FileRow({f}) {
  const name = (f.path||'').replace(/\\/g,'/').split('/').pop();
  const dir  = (f.path||'').replace(/\\/g,'/').split('/').slice(0,-1).join('/');
  return html`<div style="display:flex;align-items:baseline;gap:var(--sp-4);padding:var(--sp-2) var(--sp-4);border-bottom:1px solid var(--bg2)">
    <span class="mono" style="font-size:var(--fs-sm);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title=${f.path}>${esc(name)}</span>
    <span class="text-muted mono" style="font-size:var(--fs-xs);flex:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(dir)}</span>
    ${f.size>0 && html`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${fmtSz(f.size)}</span>`}
    ${f.mtime>0 && html`<span class="text-muted" style="font-size:var(--fs-xs);white-space:nowrap">${fmtAgo(f.mtime)}</span>`}
  </div>`;
}

export default function TabProjectEnv() {
  const {snap: s} = useContext(SnapContext);

  const envTool = useMemo(() => s?.tools?.find(t => t.tool === 'project-env'), [s]);
  const files   = envTool?.files ?? [];

  // Group files by category
  const byCategory = useMemo(() => {
    const groups = {};
    for (const f of files) {
      const cat = f.kind || f.category || 'config';
      (groups[cat] = groups[cat] || []).push(f);
    }
    return groups;
  }, [files]);

  // Detect which AI tools are configured based on filename patterns
  const detectedTools = useMemo(() => {
    const detected = new Set();
    const credFiles = [...(byCategory.credentials || []), ...(byCategory.database || [])];
    for (const f of credFiles) {
      const name = (f.path || '').toUpperCase();
      for (const sig of KEY_SIGNALS) {
        if (sig.pattern.test(name)) detected.add(sig);
      }
    }
    return [...detected];
  }, [byCategory]);

  if (!s) return html`<p class="loading-state">Loading...</p>`;

  const totalFiles = files.length;
  const totalSize  = files.reduce((a, f) => a + (f.size || 0), 0);

  return html`<div>
    <div class="diag-card" style="margin-bottom:var(--sp-5)">
      <h3>Project Environment
        <span class="badge">${totalFiles} file${totalFiles !== 1 ? 's' : ''}</span>
        ${totalSize > 0 && html`<span class="badge">${fmtSz(totalSize)}</span>`}
      </h3>

      ${totalFiles === 0 && html`<p class="empty-state">No project environment files found in this directory.</p>`}

      ${detectedTools.length > 0 && html`<div style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">Configured AI Providers</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3);margin-top:var(--sp-2)">
          ${detectedTools.map(sig => html`<span key=${sig.tool}
            style="padding:var(--sp-2) var(--sp-4);border-radius:4px;font-size:var(--fs-sm);
                   background:color-mix(in srgb,${VENDOR_COLORS[sig.vendor]||'var(--fg2)'} 15%,transparent);
                   border:1px solid color-mix(in srgb,${VENDOR_COLORS[sig.vendor]||'var(--fg2)'} 40%,transparent);
                   color:${VENDOR_COLORS[sig.vendor]||'var(--fg)'}">
            ✓ ${esc(sig.tool)}
          </span>`)}
        </div>
      </div>`}

      ${Object.entries(byCategory).sort(([a],[b]) => {
        const order = ['credentials','config','runtime','database'];
        return (order.indexOf(a)||99) - (order.indexOf(b)||99);
      }).map(([cat, catFiles]) => html`<div key=${cat} style="margin-bottom:var(--sp-5)">
        <div class="es-section-title">${CATEGORY_LABELS[cat] || cat}
          <span class="badge" style="margin-left:var(--sp-3)">${catFiles.length}</span>
        </div>
        <div style="border:1px solid var(--bg2);border-radius:4px;overflow:hidden;margin-top:var(--sp-2)">
          ${catFiles.map(f => html`<${FileRow} key=${f.path} f=${f}/>`)}
        </div>
      </div>`)}
    </div>
  </div>`;
}
