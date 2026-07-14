import { useState, useContext, useMemo, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { SnapContext } from '../context.js';
import * as api from '../api.js';
import { Icon } from './ui/index.js';
import { fmtSz, fmtAgo } from '../utils.js';

const VIEWS = [
  { id: 'prompts',   label: 'Prompts' },
  { id: 'workflows', label: 'Workflows' },
];

// Collect prompt files from snap.tools[*].files
function collectPrompts(snap) {
  const out = [];
  for (const t of (snap?.tools || [])) {
    for (const f of (t.files || [])) {
      const path = f.path || '';
      const kind = f.kind || '';
      const isPrompt =
        path.endsWith('.prompt.md') ||
        kind === 'prompt' ||
        (kind === 'command' && path.toLowerCase().includes('/prompts/'));
      if (isPrompt) {
        const name = path.split('/').pop().replace(/\.prompt\.md$/, '').replace(/\.md$/, '');
        out.push({
          id: path,
          name,
          path,
          kind,
          tool: t.tool,
          toolLabel: t.label,
          size: f.size || 0,
          tokens: f.tokens || 0,
          mtime: f.mtime || 0,
        });
      }
    }
  }
  // Deduplicate by path
  const seen = new Set();
  return out.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
}

function collectWorkflows(snap) {
  const out = [];
  for (const t of (snap?.tools || [])) {
    for (const f of (t.files || [])) {
      const path = f.path || '';
      const kind = f.kind || '';
      const isWorkflow =
        path.endsWith('.workflow.md') ||
        kind === 'workflow' ||
        kind === 'workflows' ||
        (kind === 'command' && path.toLowerCase().includes('/workflows/'));
      if (isWorkflow) {
        const name = path.split('/').pop().replace(/\.workflow\.md$/, '').replace(/\.md$/, '');
        out.push({
          id: path,
          name,
          path,
          kind,
          tool: t.tool,
          toolLabel: t.label,
          size: f.size || 0,
          tokens: f.tokens || 0,
          mtime: f.mtime || 0,
        });
      }
    }
  }
  const seen = new Set();
  return out.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });
}



// ─── Prompt detail ───────────────────────────────────────────────
function PromptDetail({ prompt, view = 'prompts' }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const label = view === 'workflows' ? 'workflow' : 'prompt';

  useEffect(() => {
    if (!prompt) { setContent(null); return; }
    let live = true;
    setLoading(true);
    setContent(null);
    api.getFile(prompt.path)
      .then(r => r.text())
      .then(text => { if (live) { setContent(text); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [prompt?.path]);

  if (!prompt) {
    return html`<div class="cprompts-detail-empty">
      <div class="cprompts-detail-empty-label">Nothing selected</div>
      <div>Select a ${label} from the list to view its content.</div>
    </div>`;
  }

  return html`<div class="cprompts-detail-view">
    <div class="cprompts-detail-overline">${view === 'workflows' ? 'Workflow' : 'Prompt'}</div>
    <div class="cprompts-detail-title">${prompt.name}</div>
    <div class="cprompts-detail-meta">
      <span class="cprompts-meta-tool">${prompt.toolLabel}</span>
      ${prompt.size > 0 && html`<span> \u00b7 ${fmtSz(prompt.size)}</span>`}
      ${prompt.tokens > 0 && html`<span> \u00b7 ${prompt.tokens}t</span>`}
      ${prompt.mtime > 0 && html`<span> \u00b7 ${fmtAgo(prompt.mtime)}</span>`}
    </div>
    <div class="cprompts-detail-path">${prompt.path}</div>
    <div class="cprompts-detail-body">
      ${loading
        ? html`<div class="cprompts-loading">Loading\u2026</div>`
        : content === null
          ? html`<div class="cprompts-loading">No content available.</div>`
          : html`<pre class="cprompts-code">${content}</pre>`}
    </div>
  </div>`;
}

// ─── Empty state ─────────────────────────────────────────────────
function EmptyState({ view, hasSnap }) {
  const isPrompts = view === 'prompts';
  return html`<div class="cprompts-empty">
    <div class="cprompts-empty-icon" aria-hidden="true"><${Icon} name=${isPrompts ? 'pen' : 'settings'} size="1.4em"/></div>
    <div class="cprompts-empty-title">No ${isPrompts ? 'prompts' : 'workflows'} yet</div>
    <div class="cprompts-empty-body">
      ${isPrompts
        ? 'Save frequently-used prompts here for one-click re-use across any agent.'
        : 'Workflows chain multiple agent steps into a single automated run.'}
    </div>
    <div class="cprompts-empty-note">
      ${hasSnap
        ? `No ${isPrompts ? '.prompt.md' : '.workflow.md'} files found in tracked tool workspaces. Create one in your project's ${isPrompts ? '.github/prompts/' : '.github/workflows/'} directory.`
        : `This tab lists ${isPrompts ? '.prompt.md' : '.workflow.md'} files from your workspace.`}
    </div>
  </div>`;
}

// ─── CPromptsTab ─────────────────────────────────────────────────
export default function CPromptsTab() {
  const ctx  = useContext(SnapContext);
  const snap = ctx?.snap;

  const [view,     setView]     = useState('prompts');
  const [filter,   setFilter]   = useState('');
  const [selected, setSelected] = useState(null);

  const prompts = useMemo(() => collectPrompts(snap), [snap]);
  const workflows = useMemo(() => collectWorkflows(snap), [snap]);
  const items = view === 'prompts' ? prompts : workflows;

  const filtered = useMemo(() => {
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.toolLabel.toLowerCase().includes(q)
    );
  }, [items, filter]);

  const selectedPrompt = filtered.find(p => p.id === selected) ?? null;

  const handleViewSwitch = (v) => { setView(v); setFilter(''); setSelected(null); };

  return html`<div class="cprompts-shell">
    <!-- Toolbar -->
    <div class="cprompts-toolbar">
      <div class="cprompts-seg" role="group" aria-label="View selector">
        ${VIEWS.map(v => html`<button key=${v.id} type="button"
          class=${'cprompts-seg-btn' + (view === v.id ? ' is-active' : '')}
          onClick=${() => handleViewSwitch(v.id)}
          aria-pressed=${view === v.id ? 'true' : 'false'}
        >${v.label}</button>`)}
      </div>

      <div class="cprompts-filter-wrap">
        <span class="cprompts-filter-icon" aria-hidden="true">\u2315</span>
        <input class="cprompts-filter-input" type="text"
          placeholder=${'Search ' + view + '\u2026'}
          aria-label=${'Filter ' + view}
          value=${filter}
          onInput=${e => setFilter(e.target.value)}/>
      </div>

      <span style="flex:1"></span>
      <span class="cprompts-toolbar-count">${filtered.length} ${view}</span>
    </div>

    <!-- Split pane: list + detail -->
    <div class="cprompts-body">
      <div class="cprompts-list">
        ${filtered.length === 0
          ? html`<${EmptyState} view=${view} hasSnap=${!!snap}/>`
          : filtered.map(p => html`<div key=${p.id}
              class=${'cprompts-prompt-row' + (p.id === selected ? ' is-selected' : '')}
              onClick=${() => setSelected(p.id === selected ? null : p.id)}
              role="button" tabIndex=${0}
              onKeyDown=${e => e.key === 'Enter' && setSelected(p.id === selected ? null : p.id)}>
              <div class="cprompts-prompt-name">${p.name}</div>
              <div class="cprompts-prompt-meta">
                ${p.toolLabel}
                ${p.size > 0 ? ` \u00b7 ${fmtSz(p.size)}` : ''}
              </div>
            </div>`)}
      </div>
      <div class="cprompts-detail">
        <${PromptDetail} prompt=${selectedPrompt} view=${view}/>
      </div>
    </div>
  </div>`;
}
